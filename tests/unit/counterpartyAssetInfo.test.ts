/**
 * Asset lookups against the public Counterparty node.
 *
 * Production saw ~150 HTTP 429s an hour: getAssetInfo had no cache, a stamp
 * detail page called it twice per view, the node list held the same URL
 * twice, and nothing capped concurrency, so crawlers fanned out hundreds of
 * simultaneous lookups. These tests pin the fixes.
 */
import { assertEquals, assertRejects } from "@std/assert";
import { restore, stub } from "@std/testing/mock";
import { XCP_V2_NODES } from "$constants";

// In test mode databaseManager only exports a singleton when a mock is
// registered before the first import. A plain TTL-less map is enough here.
const store = new Map<string, unknown>();
(globalThis as any).__mockDbManager = {
  getCacheValue: (k: string) =>
    Promise.resolve(store.has(k) ? store.get(k) : null),
  setCacheValue: (k: string, v: unknown) => {
    store.set(k, v);
    return Promise.resolve();
  },
  // Mirrors the real handleCache: whatever the fetcher returns is stored.
  handleCache: async (k: string, fetch: () => Promise<unknown>) => {
    if (store.has(k)) return store.get(k);
    const value = await fetch();
    store.set(k, value);
    return value;
  },
};
const {
  _resetXcpCooldown,
  _setAssetInfoDeadlineMs,
  _xcpLimiterState,
  CounterpartyApiManager,
  fetchXcpV2WithCache,
} = await import(
  "$server/services/counterpartyApiService.ts"
);
const { StampValidationService } = await import(
  "$server/services/stamp/stampValidationService.ts"
);

let seq = 0;
const unique = (p: string) => `${p}${Date.now()}${seq++}`;
const asset = (name: string, supply = 100) =>
  new Response(
    JSON.stringify({
      result: { asset: name, supply, divisible: false, locked: true },
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );

function countingFetch(respond: (url: string) => Response | Promise<Response>) {
  const calls: string[] = [];
  stub(globalThis, "fetch", (input: string | URL | Request) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : input.url;
    calls.push(url);
    return Promise.resolve(respond(url));
  });
  return calls;
}

Deno.test({
  name: "the node list has no duplicate URLs",
  fn() {
    const urls = XCP_V2_NODES.map((n) => n.url);
    assertEquals(new Set(urls).size, urls.length);
  },
});

Deno.test({
  name: "getAssetInfo: a found asset is fetched once, then served from cache",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const name = unique("A");
    const calls = countingFetch(() => asset(name));
    try {
      const a = await CounterpartyApiManager.getAssetInfo(name);
      const b = await CounterpartyApiManager.getAssetInfo(name);
      assertEquals(a.asset, name);
      assertEquals(b.asset, name);
      assertEquals(calls.length, 1);
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  name: "getAssetInfo: concurrent callers share one request",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const name = unique("A");
    const calls = countingFetch(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return asset(name);
    });
    try {
      const results = await Promise.all(
        Array.from(
          { length: 5 },
          () => CounterpartyApiManager.getAssetInfo(name),
        ),
      );
      assertEquals(results.every((r) => r.asset === name), true);
      assertEquals(calls.length, 1);
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  name: "getAssetInfo: 404 is null and cached; a 429 is null and NOT cached",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const missing = unique("A");
    const limited = unique("A");
    let limitedHits = 0;
    const calls = countingFetch((url) => {
      if (url.includes(missing)) {
        return new Response("{}", {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }
      limitedHits++;
      return limitedHits <= 3
        ? new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "0" },
        })
        : asset(limited);
    });
    // The client retries 429s with backoff (~10s here); this test is about
    // what gets cached, so take the render deadline out of the picture.
    const previous = _setAssetInfoDeadlineMs(60_000);
    try {
      assertEquals(await CounterpartyApiManager.getAssetInfo(missing), null);
      assertEquals(await CounterpartyApiManager.getAssetInfo(missing), null);
      assertEquals(calls.filter((u) => u.includes(missing)).length, 1);

      assertEquals(await CounterpartyApiManager.getAssetInfo(limited), null);
      const retried = await CounterpartyApiManager.getAssetInfo(limited);
      assertEquals(retried.asset, limited);
    } finally {
      _setAssetInfoDeadlineMs(previous);
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  name: "Counterparty requests never exceed the concurrency cap",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    let active = 0;
    let peak = 0;
    countingFetch(async (url) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 15));
      active--;
      return asset(url.split("/assets/")[1].split("?")[0]);
    });
    try {
      const names = Array.from({ length: 24 }, () => unique("A"));
      await Promise.all(
        names.map((n) => CounterpartyApiManager.getAssetInfo(n)),
      );
      const { max, inFlight, waiting } = _xcpLimiterState();
      assertEquals(peak <= max, true, `peak ${peak} exceeded cap ${max}`);
      assertEquals(
        peak > 1,
        true,
        "requests should still run in parallel up to the cap",
      );
      assertEquals(inFlight, 0);
      assertEquals(waiting, 0);
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  name:
    "name availability: free, taken, and unknown are distinct; unknown never reads as free",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const free = unique("B").replace(/[0-9]/g, "Q").slice(0, 12);
    const taken = unique("C").replace(/[0-9]/g, "Q").slice(0, 12);
    countingFetch((url) => {
      if (url.includes(free)) {
        return new Response("{}", {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes(taken)) return asset(taken);
      return new Response("rate limited", {
        status: 429,
        headers: { "retry-after": "0" },
      });
    });
    try {
      assertEquals(
        await StampValidationService.checkAssetAvailability(free),
        true,
      );
      assertEquals(
        await StampValidationService.checkAssetAvailability(taken),
        false,
      );
      await assertRejects(
        () => StampValidationService.checkAssetAvailability("ZZZLIMITED"),
        Error,
        "Could not confirm the asset name",
      );
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  name:
    "getAssetInfo: a slow node cannot hold a page past the deadline; the late answer fills the cache",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const name = unique("A");
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const calls = countingFetch(async () => {
      await gate;
      return asset(name);
    });
    const previous = _setAssetInfoDeadlineMs(50);
    try {
      const started = Date.now();
      assertEquals(await CounterpartyApiManager.getAssetInfo(name), null);
      const waited = Date.now() - started;
      assertEquals(
        waited < 1000,
        true,
        `waited ${waited}ms past a 50ms deadline`,
      );

      release();
      await new Promise((r) => setTimeout(r, 20));
      const later = await CounterpartyApiManager.getAssetInfo(name);
      assertEquals(later.asset, name);
      assertEquals(calls.length, 1);
    } finally {
      _setAssetInfoDeadlineMs(previous);
      _resetXcpCooldown();
      restore();
    }
  },
});

const limited = () =>
  new Response("<title>429</title>", {
    status: 429,
    headers: { "retry-after": "1" },
  });
const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

Deno.test({
  name:
    "a 429 costs one retry after a shared cooldown, not the client's hidden retries",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const name = unique("A");
    let n = 0;
    const calls = countingFetch(() => (++n === 1 ? limited() : asset(name)));
    const previous = _setAssetInfoDeadlineMs(60_000);
    try {
      const started = Date.now();
      const result = await CounterpartyApiManager.getAssetInfo(name);
      const waited = Date.now() - started;
      assertEquals(result.asset, name);
      assertEquals(calls.length, 2, "exactly one retry");
      assertEquals(
        waited >= 900 && waited < 4000,
        true,
        `waited ${waited}ms for a 1s Retry-After`,
      );
    } finally {
      _setAssetInfoDeadlineMs(previous);
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  name: "a 429 makes every other caller wait out the cooldown too",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const first = unique("A");
    const second = unique("A");
    const starts: Record<string, number[]> = { [first]: [], [second]: [] };
    let firstSeen = false;
    countingFetch((url) => {
      const who = url.includes(first) ? first : second;
      starts[who].push(Date.now());
      if (who === first && !firstSeen) {
        firstSeen = true;
        return limited();
      }
      return asset(who);
    });
    const previous = _setAssetInfoDeadlineMs(60_000);
    try {
      await CounterpartyApiManager.getAssetInfo(first).then(() => {});
      const t0 = Date.now();
      await CounterpartyApiManager.getAssetInfo(second);
      assertEquals(starts[second].length, 1);
      assertEquals(starts[second][0] >= t0, true);
      assertEquals(starts[first].length, 2);
      const gap = starts[first][1] - starts[first][0];
      assertEquals(
        gap >= 900,
        true,
        `retry came ${gap}ms after the 429, before the 1s cooldown`,
      );
    } finally {
      _setAssetInfoDeadlineMs(previous);
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  name:
    "fetchXcpV2WithCache: a failed fetch is not cached; the next call refetches",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const endpoint = `/assets/${unique("A")}/holders`;
    let n = 0;
    const calls = countingFetch(() =>
      ++n <= 1
        ? new Response("down", { status: 500 })
        : okJson({ result: [{ address: "bc1q" }] })
    );
    try {
      const failed = await fetchXcpV2WithCache<any>(
        endpoint,
        new URLSearchParams(),
        300,
      );
      assertEquals(failed.result, []);
      const recovered = await fetchXcpV2WithCache<any>(
        endpoint,
        new URLSearchParams(),
        300,
      );
      assertEquals(recovered.result.length, 1);
      const cached = await fetchXcpV2WithCache<any>(
        endpoint,
        new URLSearchParams(),
        300,
      );
      assertEquals(cached.result.length, 1);
      assertEquals(
        calls.length,
        2,
        "the failure was not cached and the success was",
      );
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  name: "a 503 with retry_after_seconds in the body triggers the shared cooldown",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const name = unique("A");
    let n = 0;
    const calls = countingFetch(() =>
      ++n === 1
        ? new Response(
          JSON.stringify({ error: "counterparty_temporarily_unavailable", retry_after_seconds: 1 }),
          { status: 503, headers: { "content-type": "application/json" } },
        )
        : asset(name)
    );
    const previous = _setAssetInfoDeadlineMs(60_000);
    try {
      const started = Date.now();
      const result = await CounterpartyApiManager.getAssetInfo(name);
      const waited = Date.now() - started;
      assertEquals(result.asset, name);
      assertEquals(calls.length, 2);
      assertEquals(waited >= 900, true, `retried after ${waited}ms, before the 1s hint`);
    } finally {
      _setAssetInfoDeadlineMs(previous);
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  name: "a 503 asking for a long cooldown fails fast instead of stalling the caller",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const calls = countingFetch(() =>
      new Response(
        JSON.stringify({ error: "counterparty_temporarily_unavailable", retry_after_seconds: 10 }),
        { status: 503, headers: { "content-type": "application/json" } },
      )
    );
    try {
      const started = Date.now();
      const response = await fetchXcpV2WithCache(
        `/addresses/${unique("bc1q")}/compose/attach`,
        new URLSearchParams(),
      );
      const waited = Date.now() - started;
      assertEquals(calls.length, 1, "no retry inside a 10s cooldown");
      assertEquals(waited < 2000, true, `caller stalled ${waited}ms`);
      assertEquals(Boolean(response.error) || !response.result, true);
      assertEquals(_xcpLimiterState().cooldownMs > 5000, true, "cooldown still recorded for everyone");

      // A second caller inside the cooldown waits at most the cap, not 10s.
      const second = Date.now();
      await fetchXcpV2WithCache(`/addresses/${unique("bc1q")}/compose/attach`, new URLSearchParams());
      const secondWaited = Date.now() - second;
      assertEquals(secondWaited < 3000, true, `second caller stalled ${secondWaited}ms`);
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});
