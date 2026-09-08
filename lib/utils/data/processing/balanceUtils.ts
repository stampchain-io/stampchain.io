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

/* ===== per-provider caching (positive + short negative) ===== */

type BTCBalanceProvider = "mempool" | "blockcypher";

/** TTL for a successful provider lookup — balances can change frequently. */
const BTC_BALANCE_CACHE_TTL_S = 60;

/**
 * TTL for a *failed* provider lookup (`null`: 429 / 5xx / network error /
 * timeout). `dbManager.handleCache` treats `null` as a cache miss, so without
 * this a provider that is currently down was re-queried on EVERY cold request,
 * each one paying up to its full share of the budget (#1198 follow-up) and
 * hammering the rate-limited providers harder. While the marker is live the
 * provider is skipped and the chain falls through to the next one (or
 * degrades) immediately. Kept short so a recovered provider is picked up
 * again within seconds; a legitimate zero balance is a real `BTCBalance`
 * object and is never negative-cached.
 */
export const BTC_BALANCE_NEGATIVE_CACHE_TTL_S = 20;

/** Sentinel stored under the negative key — never a `BTCBalance` shape. */
interface BTCBalanceUnavailableMarker {
  unavailable: true;
  /** Epoch ms of the failure that created the marker (diagnostics only). */
  at: number;
}

function isUnavailableMarker(
  value: unknown,
): value is BTCBalanceUnavailableMarker {
  return typeof value === "object" && value !== null &&
    (value as BTCBalanceUnavailableMarker).unavailable === true;
}

/** Positive entries: `btc_balance:{provider}:{address}` (unchanged). */
function positiveCacheKey(provider: BTCBalanceProvider, address: string) {
  return `btc_balance:${provider}:${address}`;
}

/**
 * Negative entries live in their own namespace so a marker can never be read
 * back as a balance, and vice versa.
 */
export function negativeCacheKey(
  provider: BTCBalanceProvider,
  address: string,
) {
  return `btc_balance:unavailable:${provider}:${address}`;
}

/**
 * The slice of `dbManager` the provider cache needs. Injectable so the cache
 * semantics can be tested against a real (in-memory) `DatabaseManager`
 * instance; production always uses the shared `dbManager` singleton.
 */
export interface BTCBalanceProviderCache {
  handleCache<T>(
    key: string,
    fetchData: () => Promise<T>,
    cacheDuration: number | "never",
  ): Promise<T>;
  getCacheValue<T>(key: string): Promise<T | null>;
  setCacheValue(
    key: string,
    value: unknown,
    ttlSeconds: number | "never",
  ): Promise<void>;
}

/**
 * Cached wrapper shared by both providers. The positive cache is consulted
 * first (`handleCache`, 60s); only on a positive miss is the negative marker
 * checked, so the warm path costs nothing extra. If the provider fails, a
 * short-lived marker is written so the next requests skip it. Every cache
 * operation is best-effort: if the cache layer is missing or unavailable the
 * provider is simply called directly (no caching, negative or positive —
 * exactly the pre-existing fallback behaviour).
 */
export async function getCachedProviderBalance(
  provider: BTCBalanceProvider,
  address: string,
  fetchFresh: () => Promise<BTCBalance | null>,
  cache: BTCBalanceProviderCache | undefined = dbManager,
): Promise<BTCBalance | null> {
  const negativeKey = negativeCacheKey(provider, address);

  const recentlyFailed = async (): Promise<boolean> => {
    try {
      return isUnavailableMarker(await cache?.getCacheValue(negativeKey));
    } catch (error) {
      console.error(`Negative-cache read failed for ${provider}:`, error);
      return false;
    }
  };

  const recordFailure = async (): Promise<void> => {
    const marker: BTCBalanceUnavailableMarker = {
      unavailable: true,
      at: Date.now(),
    };
    try {
      await cache?.setCacheValue(
        negativeKey,
        marker,
        BTC_BALANCE_NEGATIVE_CACHE_TTL_S,
      );
    } catch (error) {
      console.error(`Negative-cache write failed for ${provider}:`, error);
    }
  };

  const fetchUnlessRecentlyFailed = async (): Promise<BTCBalance | null> => {
    if (await recentlyFailed()) {
      console.warn(
        `Skipping ${provider} balance lookup for ${address}: provider failed within the last ${BTC_BALANCE_NEGATIVE_CACHE_TTL_S}s`,
      );
      return null;
    }
    const balance = await fetchFresh();
    if (balance === null) await recordFailure();
    return balance;
  };

  try {
    if (!cache) return await fetchUnlessRecentlyFailed();
    return await cache.handleCache(
      positiveCacheKey(provider, address),
      fetchUnlessRecentlyFailed,
      BTC_BALANCE_CACHE_TTL_S,
    ) as BTCBalance | null;
  } catch (error) {
    console.error(`Cached ${provider} balance fetch error:`, error);
    // Fallback to direct call if caching fails
    return fetchUnlessRecentlyFailed();
  }
}

function getCachedBTCBalanceFromMempool(
  address: string,
  timeoutMs: number,
): Promise<BTCBalance | null> {
  return getCachedProviderBalance(
    "mempool",
    address,
    () => getBTCBalanceFromMempool(address, 0, Date.now() + timeoutMs),
  );
}

function getCachedBTCBalanceFromBlockCypher(
  address: string,
  timeoutMs: number,
): Promise<BTCBalance | null> {
  return getCachedProviderBalance(
    "blockcypher",
    address,
    () => getBTCBalanceFromBlockCypher(address, timeoutMs),
  );
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
