/**
 * /token-image serves third-party SVG from the main origin, so it must serve
 * only SRC-20 stamps and always send a sandbox CSP.
 */
import { assert, assertEquals } from "@std/assert";
import { restore, stub } from "@std/testing/mock";

const SRC20 = "a".repeat(64);
const OTHER = "b".repeat(64);
(globalThis as any).__mockDbManager = {
  getCacheValue: () => Promise.resolve(null),
  setCacheValue: () => Promise.resolve(),
  handleCache: (_k: string, f: () => Promise<unknown>) => f(),
  executeQueryWithCache: (_q: string, params: unknown[]) =>
    Promise.resolve({ rows: params[0] === SRC20 ? [{ hit: 1 }] : [] }),
};
const { handler } = await import("$routes/token-image/[txHash].ts");
const call = (txHash: string) =>
  (handler as any).GET(new Request(`http://localhost/token-image/${txHash}`), {
    params: { txHash },
  }) as Promise<Response>;
const opts = { sanitizeOps: false, sanitizeResources: false };

Deno.test({
  ...opts,
  name: "a non-SRC-20 stamp hash is a 404 and never fetched",
  async fn() {
    const calls: string[] = [];
    stub(globalThis, "fetch", (i: string | URL | Request) => {
      calls.push(String(i));
      return Promise.resolve(
        new Response("<svg><script>alert(1)</script></svg>"),
      );
    });
    try {
      const res = await call(OTHER);
      assertEquals(res.status, 404);
      assertEquals(calls.length, 0);
    } finally {
      restore();
    }
  },
});

Deno.test({
  ...opts,
  name: "an SRC-20 SVG is served with a sandbox CSP and a bounded cache",
  async fn() {
    stub(globalThis, "fetch", () =>
      Promise.resolve(
        new Response(
          '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><pre>{"p":"src-20"}</pre></foreignObject></svg>',
        ),
      ));
    try {
      const res = await call(SRC20);
      assertEquals(res.status, 200);
      const csp = res.headers.get("content-security-policy") ?? "";
      assert(csp.startsWith("sandbox"), csp);
      assert(csp.includes("default-src 'none'"), csp);
      const cache = res.headers.get("cache-control") ?? "";
      assert(!cache.includes("immutable"), cache);
      assert(
        !(await res.text()).includes("<pre"),
        "deploy JSON overlay removed",
      );
    } finally {
      restore();
    }
  },
});

Deno.test({
  ...opts,
  name: "a malformed hash is a 404",
  async fn() {
    assertEquals((await call("not-a-hash")).status, 404);
  },
});
