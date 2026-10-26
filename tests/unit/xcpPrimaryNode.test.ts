/**
 * With XCP_PRIMARY_NODE_URL set, our own Counterparty node is tried first and
 * the public node is the fallback. The node's address is private: it must not
 * appear in any error message a route could return to a client.
 */
import { assert, assertEquals } from "@std/assert";
import { restore, stub } from "@std/testing/mock";

const PRIMARY = "http://xcp-primary.test:4000/v2";
Deno.env.set("XCP_PRIMARY_NODE_URL", PRIMARY);
Deno.env.delete("XCP_API_URL");

const store = new Map<string, unknown>();
(globalThis as any).__mockDbManager = {
  getCacheValue: (k: string) => Promise.resolve(store.get(k) ?? null),
  setCacheValue: (k: string, v: unknown) => {
    store.set(k, v);
    return Promise.resolve();
  },
  handleCache: async (k: string, fetch: () => Promise<unknown>) => {
    if (store.has(k)) return store.get(k);
    const v = await fetch();
    store.set(k, v);
    return v;
  },
};

const { XCP_V2_NODES } = await import("$constants");
const {
  CounterpartyApiManager,
  fetchXcpV2WithCache,
  _resetXcpCooldown,
  _xcpLimiterState,
} = await import("$server/services/counterpartyApiService.ts");
const { xcpHttpClient } = await import(
  "$server/services/counterparty/xcpNodeClient.ts"
);
// The node list is fixed at import. Unset the variable so it cannot leak
// into other test files sharing this process.
Deno.env.delete("XCP_PRIMARY_NODE_URL");

let seq = 0;
const unique = (p: string) => `${p}${Date.now()}${seq++}`;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function route(respond: (url: string) => Response | Promise<Response>) {
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

const opts = { sanitizeOps: false, sanitizeResources: false };

Deno.test("node list: primary first, public node kept as fallback", () => {
  assertEquals(XCP_V2_NODES.map((n) => n.name), ["primary", "counterparty.io"]);
  assertEquals(XCP_V2_NODES[0].url, PRIMARY);
  assert((XCP_V2_NODES[0].timeoutMs ?? 0) <= 5000, "primary fails over fast");
});

Deno.test({
  ...opts,
  name: "a healthy primary serves the request; the public node is not called",
  async fn() {
    const calls = route(() => json({ result: [{ asset: "A1" }] }));
    try {
      const r = await fetchXcpV2WithCache<any>(
        `/assets/${unique("A")}/balances`,
        new URLSearchParams(),
      );
      assertEquals(r.result[0].asset, "A1");
      assertEquals(calls.length, 1);
      assert(calls[0].startsWith(PRIMARY));
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  ...opts,
  name: "primary down: the public node answers",
  async fn() {
    const calls = route((url) => {
      if (url.startsWith(PRIMARY)) {
        throw new TypeError("error sending request for url (" + url + ")");
      }
      return json({ result: [{ asset: "A2" }] });
    });
    try {
      const r = await fetchXcpV2WithCache<any>(
        `/assets/${unique("A")}/balances`,
        new URLSearchParams(),
      );
      assertEquals(r.result[0].asset, "A2");
      assertEquals(calls.filter((u) => !u.startsWith(PRIMARY)).length, 1);
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  ...opts,
  name:
    "a definitive 4xx from the primary is not repeated against the public node",
  async fn() {
    const calls = route(() => json({ error: "no assets to detach" }, 400));
    try {
      let message = "";
      try {
        await CounterpartyApiManager.composeDetach(
          `${"ab".repeat(32)}:0`,
          "bc1qtest",
        );
      } catch (e) {
        message = (e as Error).message;
      }
      assertEquals(message, "no assets to detach");
      assertEquals(calls.length, 1);
      assert(calls[0].startsWith(PRIMARY));
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  ...opts,
  name: "a public-node 429 cools down only the public node",
  async fn() {
    const calls = route((url) =>
      url.startsWith(PRIMARY)
        ? json({ result: { ok: true } })
        : new Response("slow down", {
          status: 429,
          headers: { "retry-after": "30" },
        })
    );
    try {
      await xcpHttpClient.get("https://api.counterparty.io:4000/v2/assets/X");
      assert(
        _xcpLimiterState().cooldownMs > 20_000,
        "public cooldown recorded",
      );
      const started = Date.now();
      const r = await xcpHttpClient.get(`${PRIMARY}/assets/X`);
      assertEquals(r.status, 200);
      assert(
        Date.now() - started < 500,
        "primary did not wait on the public cooldown",
      );
      assertEquals(calls.filter((u) => u.startsWith(PRIMARY)).length, 1);
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  ...opts,
  name: "network failures never put a node URL in the error message",
  async fn() {
    route((url) => {
      throw new TypeError(`error sending request for url (${url}): dns error`);
    });
    try {
      let message = "";
      try {
        await CounterpartyApiManager.composeDetach(
          `${"cd".repeat(32)}:0`,
          "bc1qtest",
        );
      } catch (e) {
        message = (e as Error).message;
      }
      assert(message.length > 0);
      assert(!message.includes("xcp-primary.test"), message);
      assert(!message.includes("http"), message);
      const r = await fetchXcpV2WithCache<any>(
        `/assets/${unique("A")}/sends`,
        new URLSearchParams(),
      );
      assert(
        !JSON.stringify(r).includes("xcp-primary.test"),
        JSON.stringify(r),
      );
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});
