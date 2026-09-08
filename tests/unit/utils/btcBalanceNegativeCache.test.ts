import { assert, assertEquals } from "@std/assert";
import { spy, stub } from "@std/testing/mock";
import { FakeTime } from "@std/testing/time";
import {
  BTC_BALANCE_NEGATIVE_CACHE_TTL_S,
  type BTCBalanceProviderCache,
  getBTCBalanceInfo,
  getCachedProviderBalance,
  negativeCacheKey,
} from "$lib/utils/data/processing/balanceUtils.ts";
import { DatabaseManager } from "$server/database/databaseManager.ts";
import type { BTCBalance } from "$lib/types/index.d.ts";

// Follow-up to #1246 (task 1217, #1198): `dbManager.handleCache` treats a
// `null` result as a cache miss, so a provider that is currently failing
// (429 / 5xx / timeout) was re-queried on EVERY cold request, each one paying
// up to its share of the budget and hammering the rate-limited providers
// harder. Failed lookups now leave a short-lived negative marker (own key
// namespace, sentinel value) so the provider is skipped within the window.
// A legitimate zero balance is a real `BTCBalance` object and must keep the
// normal positive TTL.
//
// The cache semantics are exercised against a REAL `DatabaseManager` instance
// that is never initialised, so it runs on its in-memory fallback (Redis
// unavailable) — the same code path production takes when Redis is down. The
// module-level `dbManager` singleton is `undefined` under DENO_ENV=test, which
// doubles as the "cache layer missing" case.

/** In-memory-only cache: same class as production, Redis never connected. */
function inMemoryCache(): BTCBalanceProviderCache {
  return new DatabaseManager({
    DB_HOST: "localhost",
    DB_USER: "test",
    DB_PASSWORD: "",
    DB_PORT: 3306,
    DB_NAME: "test",
    DB_MAX_RETRIES: 1,
    ELASTICACHE_ENDPOINT: "",
    DENO_ENV: "test",
  });
}

const ZERO_BALANCE: BTCBalance = {
  confirmed: 0,
  unconfirmed: 0,
  total: 0,
  txCount: 2,
  unconfirmedTxCount: 0,
};

const SOME_BALANCE: BTCBalance = {
  confirmed: 15330,
  unconfirmed: 0,
  total: 15330,
  txCount: 981,
  unconfirmedTxCount: 0,
};

const ADDR = "bc1qzxszplp8v7w0jc89dlrqyct9staqlhwxzy7lkq";

/* ===== failing provider is skipped within the negative window ===== */

Deno.test("a failing provider is skipped within the negative-cache window and retried after it", async () => {
  const cache = inMemoryCache();
  const provider = spy(() => Promise.resolve<BTCBalance | null>(null));
  let time: FakeTime | undefined;
  try {
    assertEquals(
      await getCachedProviderBalance("mempool", ADDR, provider, cache),
      null,
    );
    assertEquals(provider.calls.length, 1);

    // The failure left a negative marker in its own namespace, and NO
    // positive entry (a marker can never be read back as a balance).
    const marker = await cache.getCacheValue<{ unavailable?: boolean }>(
      negativeCacheKey("mempool", ADDR),
    );
    assertEquals(marker?.unavailable, true);
    assertEquals(
      await cache.getCacheValue(`btc_balance:mempool:${ADDR}`),
      null,
    );

    // Inside the window: the provider is not contacted again; the wrapper
    // degrades immediately instead of re-paying the provider budget.
    const started = Date.now();
    assertEquals(
      await getCachedProviderBalance("mempool", ADDR, provider, cache),
      null,
    );
    assertEquals(provider.calls.length, 1);
    assert(Date.now() - started < 100, "negative hit must be near-instant");

    // Past the window: the marker has expired and the provider is probed
    // again (and re-marked, since it still fails).
    time = new FakeTime();
    time.tick((BTC_BALANCE_NEGATIVE_CACHE_TTL_S + 1) * 1000);
    assertEquals(
      await getCachedProviderBalance("mempool", ADDR, provider, cache),
      null,
    );
    assertEquals(provider.calls.length, 2);
    assertEquals(
      (await cache.getCacheValue<{ unavailable?: boolean }>(
        negativeCacheKey("mempool", ADDR),
      ))?.unavailable,
      true,
    );
  } finally {
    time?.restore();
  }
});

Deno.test("a negative marker for one provider does not affect the other provider or another address", async () => {
  const cache = inMemoryCache();
  const failing = spy(() => Promise.resolve<BTCBalance | null>(null));
  const healthy = spy(() => Promise.resolve<BTCBalance | null>(SOME_BALANCE));

  assertEquals(
    await getCachedProviderBalance("mempool", ADDR, failing, cache),
    null,
  );
  // Same address, other provider: still called (the chain's fall-through).
  assertEquals(
    await getCachedProviderBalance("blockcypher", ADDR, healthy, cache),
    SOME_BALANCE,
  );
  // Same provider, other address: still called.
  assertEquals(
    await getCachedProviderBalance("mempool", "other-address", healthy, cache),
    SOME_BALANCE,
  );
  assertEquals(failing.calls.length, 1);
  assertEquals(healthy.calls.length, 2);
});

/* ===== a real zero balance is a positive result ===== */

Deno.test("a legitimate zero balance is cached as a positive with the normal TTL, never negatively", async () => {
  const cache = inMemoryCache();
  const provider = spy(() => Promise.resolve<BTCBalance | null>(ZERO_BALANCE));
  let time: FakeTime | undefined;
  try {
    assertEquals(
      await getCachedProviderBalance("mempool", ADDR, provider, cache),
      ZERO_BALANCE,
    );
    assertEquals(provider.calls.length, 1);

    // Positive entry holds the zero balance; no negative marker exists.
    const positive = await cache.getCacheValue<BTCBalance>(
      `btc_balance:mempool:${ADDR}`,
    );
    assertEquals(positive?.confirmed, 0);
    assertEquals(positive?.txCount, 2);
    assertEquals(
      await cache.getCacheValue(negativeCacheKey("mempool", ADDR)),
      null,
    );

    // Still a cache hit after the NEGATIVE window has passed: the zero
    // balance was stored with the positive (60s) TTL, not the short one.
    time = new FakeTime();
    time.tick((BTC_BALANCE_NEGATIVE_CACHE_TTL_S + 1) * 1000);
    assertEquals(
      await getCachedProviderBalance("mempool", ADDR, provider, cache),
      ZERO_BALANCE,
    );
    assertEquals(provider.calls.length, 1);
  } finally {
    time?.restore();
  }
});

Deno.test("the provider chain reports a zero balance rather than degrading", async () => {
  const fetchStub = stub(
    globalThis,
    "fetch",
    () =>
      Promise.resolve(
        Response.json({
          address: ADDR,
          chain_stats: {
            funded_txo_count: 2,
            funded_txo_sum: 5000,
            spent_txo_count: 2,
            spent_txo_sum: 5000, // everything spent: 0 sats left
            tx_count: 4,
          },
          mempool_stats: {
            funded_txo_count: 0,
            funded_txo_sum: 0,
            spent_txo_count: 0,
            spent_txo_sum: 0,
            tx_count: 0,
          },
        }),
      ),
  );
  try {
    const info = await getBTCBalanceInfo(ADDR, { timeoutMs: 600 });
    assert(info !== null, "zero balance must be reported, not degraded");
    assertEquals(info.balance, 0);
    assertEquals(info.unconfirmedBalance, 0);
    assertEquals(info.txCount, 4);
    assertEquals(fetchStub.calls.length, 1); // mempool answered; no fallback
  } finally {
    fetchStub.restore();
  }
});

/* ===== negative marker is never surfaced as a balance ===== */

Deno.test("a live negative marker is honoured without contacting the provider and is never returned as a balance", async () => {
  const cache = inMemoryCache();
  await cache.setCacheValue(
    negativeCacheKey("mempool", ADDR),
    { unavailable: true, at: Date.now() },
    BTC_BALANCE_NEGATIVE_CACHE_TTL_S,
  );
  const provider = spy(() => Promise.resolve<BTCBalance | null>(SOME_BALANCE));
  const result = await getCachedProviderBalance(
    "mempool",
    ADDR,
    provider,
    cache,
  );
  assertEquals(result, null); // the marker object must not leak out
  assertEquals(provider.calls.length, 0);
});

/* ===== cache layer unavailable: degrade to no caching ===== */

Deno.test("with no cache layer at all, providers are called every time and failures still return null", async () => {
  const failing = spy(() => Promise.resolve<BTCBalance | null>(null));
  const healthy = spy(() => Promise.resolve<BTCBalance | null>(SOME_BALANCE));

  assertEquals(
    await getCachedProviderBalance("mempool", ADDR, failing, undefined),
    null,
  );
  assertEquals(
    await getCachedProviderBalance("mempool", ADDR, failing, undefined),
    null,
  );
  assertEquals(failing.calls.length, 2); // no negative caching without a cache
  assertEquals(
    await getCachedProviderBalance("mempool", ADDR, healthy, undefined),
    SOME_BALANCE,
  );
  assertEquals(healthy.calls.length, 1);
});

Deno.test("with a cache layer that throws on every operation, providers are still called and nothing throws", async () => {
  const broken: BTCBalanceProviderCache = {
    handleCache: () => Promise.reject(new Error("redis down")),
    getCacheValue: () => Promise.reject(new Error("redis down")),
    setCacheValue: () => Promise.reject(new Error("redis down")),
  };
  const failing = spy(() => Promise.resolve<BTCBalance | null>(null));
  const healthy = spy(() => Promise.resolve<BTCBalance | null>(SOME_BALANCE));

  assertEquals(
    await getCachedProviderBalance("blockcypher", ADDR, failing, broken),
    null,
  );
  assertEquals(
    await getCachedProviderBalance("blockcypher", ADDR, failing, broken),
    null,
  );
  assertEquals(failing.calls.length, 2);
  assertEquals(
    await getCachedProviderBalance("blockcypher", ADDR, healthy, broken),
    SOME_BALANCE,
  );
  assertEquals(healthy.calls.length, 1);
});

Deno.test("the provider chain still degrades cleanly when every provider fails and no cache is available", async () => {
  // Under DENO_ENV=test the module-level dbManager singleton is undefined:
  // the real chain must neither throw nor mistake that for a failure.
  const fetchStub = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response("rate limited", { status: 429 })),
  );
  try {
    assertEquals(await getBTCBalanceInfo(ADDR, { timeoutMs: 600 }), null);
    assertEquals(fetchStub.calls.length, 2); // mempool + BlockCypher, no retries
    assertEquals(await getBTCBalanceInfo(ADDR, { timeoutMs: 600 }), null);
    assertEquals(fetchStub.calls.length, 4); // no cache => probed again
  } finally {
    fetchStub.restore();
  }
});
