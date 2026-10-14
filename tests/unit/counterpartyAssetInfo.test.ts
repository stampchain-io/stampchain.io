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
  getCacheValue: (k: string) => Promise.resolve(store.has(k) ? store.get(k) : null),
  setCacheValue: (k: string, v: unknown) => {
    store.set(k, v);
    return Promise.resolve();
  },
  handleCache: (_k: string, fetch: () => Promise<unknown>) => fetch(),
};
const { _setAssetInfoDeadlineMs, _xcpLimiterState, CounterpartyApiManager } = await import(
  "$server/services/counterpartyApiService.ts"
);
const { StampValidationService } = await import(
  "$server/services/stamp/stampValidationService.ts"
);

let seq = 0;
const unique = (p: string) => `${p}${Date.now()}${seq++}`;
const asset = (name: string, supply = 100) =>
  new Response(JSON.stringify({ result: { asset: name, supply, divisible: false, locked: true } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

function countingFetch(respond: (url: string) => Response | Promise<Response>) {
  const calls: string[] = [];
  stub(globalThis, "fetch", (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
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
        Array.from({ length: 5 }, () => CounterpartyApiManager.getAssetInfo(name)),
      );
      assertEquals(results.every((r) => r.asset === name), true);
      assertEquals(calls.length, 1);
    } finally {
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
      if (url.includes(missing)) return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
      limitedHits++;
      return limitedHits <= 3
        ? new Response("rate limited", { status: 429, headers: { "retry-after": "0" } })
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
      await Promise.all(names.map((n) => CounterpartyApiManager.getAssetInfo(n)));
      const { max, inFlight, waiting } = _xcpLimiterState();
      assertEquals(peak <= max, true, `peak ${peak} exceeded cap ${max}`);
      assertEquals(peak > 1, true, "requests should still run in parallel up to the cap");
      assertEquals(inFlight, 0);
      assertEquals(waiting, 0);
    } finally {
      restore();
    }
  },
});

Deno.test({
  name: "name availability: free, taken, and unknown are distinct; unknown never reads as free",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const free = unique("B").replace(/[0-9]/g, "Q").slice(0, 12);
    const taken = unique("C").replace(/[0-9]/g, "Q").slice(0, 12);
    countingFetch((url) => {
      if (url.includes(free)) return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
      if (url.includes(taken)) return asset(taken);
      return new Response("rate limited", { status: 429, headers: { "retry-after": "0" } });
    });
    try {
      assertEquals(await StampValidationService.checkAssetAvailability(free), true);
      assertEquals(await StampValidationService.checkAssetAvailability(taken), false);
      await assertRejects(
        () => StampValidationService.checkAssetAvailability("ZZZLIMITED"),
        Error,
        "Could not confirm the asset name",
      );
    } finally {
      restore();
    }
  },
});

Deno.test({
  name: "getAssetInfo: a slow node cannot hold a page past the deadline; the late answer fills the cache",
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
      assertEquals(waited < 1000, true, `waited ${waited}ms past a 50ms deadline`);

      release();
      await new Promise((r) => setTimeout(r, 20));
      const later = await CounterpartyApiManager.getAssetInfo(name);
      assertEquals(later.asset, name);
      assertEquals(calls.length, 1);
    } finally {
      _setAssetInfoDeadlineMs(previous);
      restore();
    }
  },
});
