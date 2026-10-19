import { dbManager } from "$/server/database/databaseManager.ts";
import {
  FetchHttpClient,
  type HttpClient,
} from "$/server/interfaces/httpClient.ts";
import { COINGECKO_API_BASE_URL } from "$constants";
import {
  getCacheConfig,
  RouteType,
} from "$server/services/infrastructure/cacheService.ts";

export interface XcpBtcPrice {
  priceBtc: number;
  change24hPercent: number | null;
  timestamp: number;
}

interface XcpPriceCache {
  getCacheValue<T>(key: string): Promise<T | null>;
  setCacheValue(
    key: string,
    value: unknown,
    ttlSeconds: number | "never",
  ): Promise<void>;
}

const CACHE_KEY = "xcp_btc_price";
const PRICE_URL =
  `${COINGECKO_API_BASE_URL}/simple/price?ids=counterparty&vs_currencies=btc&include_24hr_change=true`;

/**
 * Reads CoinGecko's simple-price payload for XCP quoted in BTC.
 * Returns null when the price is missing or not a positive number.
 */
export function parseCoinGeckoXcpPrice(
  data: unknown,
): Omit<XcpBtcPrice, "timestamp"> | null {
  if (!data || typeof data !== "object") return null;
  const counterparty = (data as {
    counterparty?: { btc?: unknown; btc_24h_change?: unknown };
  }).counterparty;
  if (!counterparty) return null;

  const priceBtc = Number(counterparty.btc);
  if (!Number.isFinite(priceBtc) || priceBtc <= 0) return null;

  const changeRaw = counterparty.btc_24h_change;
  const change = changeRaw == null ? null : Number(changeRaw);
  return {
    priceBtc,
    change24hPercent: change != null && Number.isFinite(change)
      ? change
      : null,
  };
}

export class XcpPriceService {
  private static cache: XcpPriceCache = dbManager;
  private static http: HttpClient = new FetchHttpClient(10000, 2, 1000);

  static setCache(cache: XcpPriceCache): void {
    this.cache = cache;
  }

  static setHttpClient(client: HttpClient): void {
    this.http = client;
  }

  /** Cached XCP/BTC price, or null when CoinGecko does not answer. */
  static async getPrice(): Promise<XcpBtcPrice | null> {
    const ttl = getCacheConfig(RouteType.PRICE).duration;

    try {
      const cached = await XcpPriceService.cache.getCacheValue<XcpBtcPrice>(
        CACHE_KEY,
      );
      if (cached && XcpPriceService.isFresh(cached, ttl)) return cached;
    } catch (error) {
      console.error("[XcpPriceService] Cache read failed:", error);
    }

    try {
      const fresh = await XcpPriceService.fetchFromCoinGecko();
      if (!fresh) return null;

      const priced: XcpBtcPrice = { ...fresh, timestamp: Date.now() };
      try {
        await XcpPriceService.cache.setCacheValue(CACHE_KEY, priced, ttl);
      } catch (error) {
        console.error("[XcpPriceService] Cache write failed:", error);
      }
      return priced;
    } catch (error) {
      console.error("[XcpPriceService] Failed to get XCP price:", error);
      return null;
    }
  }

  private static isFresh(data: XcpBtcPrice, ttlSeconds: number): boolean {
    if (!Number.isFinite(data.priceBtc) || data.priceBtc <= 0) return false;
    if (!Number.isFinite(data.timestamp)) return false;
    return Date.now() - data.timestamp < ttlSeconds * 1000;
  }

  private static async fetchFromCoinGecko(): Promise<
    Omit<XcpBtcPrice, "timestamp"> | null
  > {
    const response = await XcpPriceService.http.get(PRICE_URL);
    if (response.status !== 200) {
      console.error(
        `[XcpPriceService] CoinGecko returned ${response.status}`,
      );
      return null;
    }
    return parseCoinGeckoXcpPrice(response.data);
  }
}
