import {
  BlockCypherAddressBalanceResponse,
  BTCBalance,
  BTCBalanceInfo,
  BTCBalanceInfoOptions,
} from "$lib/types/index.d.ts";
import { BLOCKCYPHER_API_BASE_URL } from "$constants";
import { formatSatoshisToBTC, formatUSDValue } from "$lib/utils/formatUtils.ts";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  fetchJsonWithTimeout,
  getBTCBalanceFromMempool,
} from "$lib/utils/mempool.ts";
import { dbManager } from "$server/database/databaseManager.ts";

/**
 * Default total budget for the BTC-balance provider chain (all providers,
 * retries and body reads combined). Before this the chain had only per-fetch
 * deadlines, so the worst case was the SUM of every attempt: two providers
 * x 5s, plus the mempool retry loop on non-timeout errors (4 x 5s + 3 x 1s
 * back-off) — 10-23s measured on the aggregate balance endpoint (#1198).
 */
export const DEFAULT_BTC_BALANCE_TIMEOUT_MS = DEFAULT_FETCH_TIMEOUT_MS;

/**
 * Hard ceiling applied by the aggregate `/api/v2/balance/{address}` handler
 * to its BTC leg. The stamps + SRC-20 legs answer in ~0.3-0.4s, so this keeps
 * the whole response comfortably under the 5s regression threshold even when
 * every BTC provider is unresponsive.
 */
export const BTC_BALANCE_LEG_CEILING_MS = 3000;

/**
 * The provider chain is handed `ceiling - grace` so that, when it honours its
 * own deadline, it reports `unavailable` (providers failed within budget)
 * rather than tripping the outer ceiling (`timeout`: something outside the
 * chain's control — e.g. the cache layer — stalled).
 */
const BTC_BALANCE_CEILING_GRACE_MS = 200;

async function getBTCBalanceFromBlockCypher(
  address: string,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<BTCBalance | null> {
  try {
    const result = await fetchJsonWithTimeout<
      BlockCypherAddressBalanceResponse
    >(
      `${BLOCKCYPHER_API_BASE_URL}/v1/btc/main/addrs/${address}/balance`,
      timeoutMs,
    );
    if (!result.ok || !result.data) return null;

    const data = result.data;
    const confirmed = data.balance || 0;
    const unconfirmed = data.unconfirmed_balance || 0;

    return {
      confirmed,
      unconfirmed,
      total: confirmed + unconfirmed,
      txCount: data.n_tx || 0,
      unconfirmedTxCount: data.unconfirmed_n_tx || 0,
    };
  } catch (error) {
    console.error("BlockCypher balance fetch error:", error);
    return null;
  }
}

// Cached wrapper for getBTCBalanceFromMempool with Redis caching
async function getCachedBTCBalanceFromMempool(
  address: string,
  timeoutMs: number,
): Promise<BTCBalance | null> {
  const cacheKey = `btc_balance:mempool:${address}`;
  const cacheDuration = 60; // 60 seconds TTL - balances can change frequently
  const fetchFresh = () =>
    getBTCBalanceFromMempool(address, 0, Date.now() + timeoutMs);

  try {
    return await dbManager.handleCache(
      cacheKey,
      fetchFresh,
      cacheDuration,
    ) as BTCBalance | null;
  } catch (error) {
    console.error("Cached balance fetch error:", error);
    // Fallback to direct call if caching fails
    return fetchFresh();
  }
}

// Cached wrapper for getBTCBalanceFromBlockCypher with Redis caching
async function getCachedBTCBalanceFromBlockCypher(
  address: string,
  timeoutMs: number,
): Promise<BTCBalance | null> {
  const cacheKey = `btc_balance:blockcypher:${address}`;
  const cacheDuration = 60; // 60 seconds TTL

  try {
    return await dbManager.handleCache(
      cacheKey,
      () => getBTCBalanceFromBlockCypher(address, timeoutMs),
      cacheDuration,
    ) as BTCBalance | null;
  } catch (error) {
    console.error("Cached BlockCypher balance fetch error:", error);
    // Fallback to direct call if caching fails
    return getBTCBalanceFromBlockCypher(address, timeoutMs);
  }
}

export async function getBTCBalanceInfo(
  address: string,
  options: BTCBalanceInfoOptions = {},
): Promise<BTCBalanceInfo | null> {
  try {
    const totalBudgetMs = options.timeoutMs ?? DEFAULT_BTC_BALANCE_TIMEOUT_MS;
    const deadlineAt = Date.now() + totalBudgetMs;

    // Use cached versions of balance providers. They run sequentially against
    // ONE shared deadline: each provider gets an equal share of whatever budget
    // is left, so a hung first provider cannot starve the fallback, and a
    // provider that fails fast hands its unused share to the next one.
    const providers = [
      {
        name: "Mempool (cached)",
        fn: (budgetMs: number) =>
          getCachedBTCBalanceFromMempool(address, budgetMs),
      },
      {
        name: "BlockCypher (cached)",
        fn: (budgetMs: number) =>
          getCachedBTCBalanceFromBlockCypher(address, budgetMs),
      },
    ];
    let balance = null;

    for (const [index, provider] of providers.entries()) {
      const remainingMs = deadlineAt - Date.now();
      if (remainingMs <= 0) {
        console.error(
          `BTC balance budget (${totalBudgetMs}ms) exhausted before ${provider.name}`,
        );
        break;
      }
      const providersLeft = providers.length - index;
      const budgetMs = Math.max(1, Math.floor(remainingMs / providersLeft));
      try {
        const result = await provider.fn(budgetMs);
        if (result) {
          balance = result;
          console.log(`Using balance data from ${provider.name}`);
          break;
        }
      } catch (error) {
        console.error(`${provider.name} failed:`, error);
      }
    }

    if (!balance) return null;

    const confirmedBTC = Number(formatSatoshisToBTC(balance.confirmed, {
      includeSymbol: false,
      stripZeros: true,
    }));
    const unconfirmedBTC = Number(formatSatoshisToBTC(balance.unconfirmed, {
      includeSymbol: false,
      stripZeros: true,
    }));

    const info: BTCBalanceInfo = {
      address,
      balance: confirmedBTC,
      txCount: balance.txCount ?? 0,
      unconfirmedBalance: unconfirmedBTC,
      unconfirmedTxCount: balance.unconfirmedTxCount ?? 0,
    };

    if (options.includeUSD) {
      // NEW: Use centralized service approach
      let btcPrice = 0;

      if (typeof window !== "undefined") {
        // Client-side: use the centralized endpoint
        try {
          const response = await fetch("/api/internal/btcPrice");
          if (response.ok) {
            const data = await response.json();
            btcPrice = formatUSDValue(data.data?.price || 0);
          }
        } catch (error) {
          console.warn(
            "Failed to fetch BTC price for balance calculation:",
            error,
          );
        }
      } else {
        // Server-side: use the service directly
        try {
          const { BTCPriceService } = await import(
            "$server/services/price/btcPriceService.ts"
          );
          const btcPriceData = await BTCPriceService.getPrice();
          btcPrice = formatUSDValue(btcPriceData.price);
        } catch (error) {
          console.warn(
            "Failed to fetch BTC price from BTCPriceService for balance calculation:",
            error,
          );
        }
      }

      info.btcPrice = btcPrice;
      info.usdValue = formatUSDValue(confirmedBTC * btcPrice);
    }

    console.log("Address Info:", info);
    return info;
  } catch (error) {
    console.error("Error in getBTCBalanceInfo:", error);
    return null;
  }
}

export type BTCBalanceLegStatus = "ok" | "unavailable" | "timeout";

export interface BTCBalanceLegResult {
  /**
   * `ok`          — a provider answered inside the budget.
   * `unavailable` — every provider failed / timed out inside the budget.
   * `timeout`     — the ceiling fired before the chain returned at all
   *                 (a stall outside the chain's own deadline, e.g. cache).
   */
  status: BTCBalanceLegStatus;
  info: BTCBalanceInfo | null;
}

/**
 * `getBTCBalanceInfo` with a hard wall-clock ceiling. Always resolves — never
 * rejects — within `ceilingMs`, so an aggregate endpoint can render its other
 * legs with the `btc` block degraded instead of stalling or 5xx-ing because
 * a third-party provider is slow. The underlying chain is handed a slightly
 * shorter budget so it normally reports `unavailable` on its own; `timeout`
 * only fires if something the chain does not bound (e.g. Redis) stalls. On
 * `timeout` the in-flight chain is not cancelled: if it eventually succeeds
 * it still warms the provider cache for the next request.
 */
export function getBTCBalanceInfoBounded(
  address: string,
  ceilingMs: number = BTC_BALANCE_LEG_CEILING_MS,
  options: BTCBalanceInfoOptions = {},
): Promise<BTCBalanceLegResult> {
  const chainBudgetMs = Math.max(
    1,
    Math.min(
      ceilingMs - BTC_BALANCE_CEILING_GRACE_MS,
      options.timeoutMs ?? Number.POSITIVE_INFINITY,
    ),
  );

  let timeoutId: number | undefined;
  const ceiling = new Promise<BTCBalanceLegResult>((resolve) => {
    timeoutId = setTimeout(() => {
      console.error(
        `BTC balance leg exceeded ${ceilingMs}ms ceiling for ${address}; responding with degraded btc block`,
      );
      resolve({ status: "timeout", info: null });
    }, ceilingMs);
  });

  const chain = getBTCBalanceInfo(address, {
    ...options,
    timeoutMs: chainBudgetMs,
  })
    .then((info): BTCBalanceLegResult => ({
      status: info ? "ok" : "unavailable",
      info,
    }))
    // getBTCBalanceInfo already swallows errors; this is belt-and-braces so a
    // provider failure can never surface as a 5xx from the aggregate route.
    .catch((error): BTCBalanceLegResult => {
      console.error("BTC balance leg failed:", error);
      return { status: "unavailable", info: null };
    });

  return Promise.race([chain, ceiling]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });
}
