import { assertEquals } from "@std/assert";
import type { HttpClient } from "$server/interfaces/httpClient.ts";
import {
  parseCoinGeckoXcpPrice,
  type XcpBtcPrice,
  XcpPriceService,
} from "$server/services/price/xcpPriceService.ts";

Deno.test("parseCoinGeckoXcpPrice reads BTC price and 24h change", () => {
  assertEquals(
    parseCoinGeckoXcpPrice({
      counterparty: { btc: 0.000021, btc_24h_change: -3.25 },
    }),
    { priceBtc: 0.000021, change24hPercent: -3.25 },
  );
});

Deno.test("parseCoinGeckoXcpPrice rejects a missing or non-positive price", () => {
  assertEquals(parseCoinGeckoXcpPrice(null), null);
  assertEquals(parseCoinGeckoXcpPrice({}), null);
  assertEquals(
    parseCoinGeckoXcpPrice({ counterparty: { btc: 0, btc_24h_change: 1 } }),
    null,
  );
  assertEquals(
    parseCoinGeckoXcpPrice({
      counterparty: { btc: 0.00002, btc_24h_change: "n/a" },
    }),
    { priceBtc: 0.00002, change24hPercent: null },
  );
});

function cacheDouble() {
  const store = new Map<string, unknown>();
  return {
    store,
    cache: {
      getCacheValue: <T>(key: string): Promise<T | null> =>
        Promise.resolve((store.get(key) as T | undefined) ?? null),
      setCacheValue: (
        key: string,
        value: unknown,
        _ttlSeconds: number | "never",
      ): Promise<void> => {
        store.set(key, value);
        return Promise.resolve();
      },
    },
  };
}

function httpDouble(
  get: HttpClient["get"],
): HttpClient {
  return { get } as HttpClient;
}

Deno.test("XcpPriceService uses CoinGecko and returns null on failure", async () => {
  const { store, cache } = cacheDouble();
  const urls: string[] = [];
  XcpPriceService.setCache(cache);
  XcpPriceService.setHttpClient(httpDouble((url) => {
    urls.push(url);
    return Promise.resolve({
      data: { counterparty: { btc: 0.000021, btc_24h_change: 1.5 } },
      status: 200,
      statusText: "OK",
      headers: {},
      ok: true,
    });
  }));

  const priced = await XcpPriceService.getPrice();
  assertEquals(priced?.priceBtc, 0.000021);
  assertEquals(priced?.change24hPercent, 1.5);
  assertEquals(urls.length, 1);
  assertEquals(urls[0]?.includes("ids=counterparty"), true);
  assertEquals(urls[0]?.includes("vs_currencies=btc"), true);
  assertEquals(urls[0]?.includes("include_24hr_change=true"), true);

  const cached = store.get("xcp_btc_price") as XcpBtcPrice;
  assertEquals(cached.priceBtc, 0.000021);

  const again = await XcpPriceService.getPrice();
  assertEquals(again?.priceBtc, 0.000021);
  assertEquals(urls.length, 1);

  store.clear();
  XcpPriceService.setHttpClient(httpDouble(() =>
    Promise.resolve({
      data: null,
      status: 429,
      statusText: "Too Many Requests",
      headers: {},
      ok: false,
    })
  ));
  assertEquals(await XcpPriceService.getPrice(), null);
  assertEquals(store.size, 0);

  XcpPriceService.setHttpClient(
    httpDouble(() => Promise.reject(new Error("network down"))),
  );
  assertEquals(await XcpPriceService.getPrice(), null);
  assertEquals(store.size, 0);
});
