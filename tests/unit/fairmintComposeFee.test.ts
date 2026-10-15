/**
 * A fairmint compose request without a fee rate is the caller's mistake and
 * must be answered 400, not the opaque 500 production returned.
 */
import { assertEquals } from "@std/assert";

(globalThis as any).__mockDbManager ??= {
  getCacheValue: () => Promise.resolve(null),
  setCacheValue: () => Promise.resolve(),
  handleCache: (_k: string, fetch: () => Promise<unknown>) => fetch(),
};
const { handler } = await import("$routes/api/v2/fairmint/compose.ts");

Deno.test({
  name: "fairmint compose: a missing fee rate is a 400",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const req = new Request("http://localhost/api/v2/fairmint/compose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address: "bc1qzxszplp8v7w0jc89dlrqyct9staqlhwxzy7lkq",
        asset: "TESTFAIRMINT",
        quantity: 1,
      }),
    });
    const res = await (handler as any).POST(req, {} as any);
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(
      String(body.error).includes("satsPerVB"),
      true,
      JSON.stringify(body),
    );
  },
});

Deno.test({
  name:
    "fairmint compose: no open fairminter is a 400 after one lookup, no compose call",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const { restore, stub } = await import("@std/testing/mock");
    const calls: string[] = [];
    stub(globalThis, "fetch", (input: string | URL | Request) => {
      calls.push(String(input instanceof Request ? input.url : input));
      return Promise.resolve(
        new Response(JSON.stringify({ result: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    });
    try {
      const req = new Request("http://localhost/api/v2/fairmint/compose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: "bc1qzxszplp8v7w0jc89dlrqyct9staqlhwxzy7lkq",
          asset: "TESTFAIRMINT",
          quantity: 1,
          satsPerVB: 10,
        }),
      });
      const res = await (handler as any).POST(req, {} as any);
      assertEquals(res.status, 400);
      assertEquals(
        (await res.json()).error,
        "No open fairminter for asset: TESTFAIRMINT",
      );
      assertEquals(calls.length, 1, calls.join("\n"));
      assertEquals(calls[0].includes("/fairminters"), true);
    } finally {
      restore();
    }
  },
});

Deno.test({
  name:
    "fairmint compose dryRun: a string service fee is added, not concatenated",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const { restore, stub } = await import("@std/testing/mock");
    stub(globalThis, "fetch", (input: string | URL | Request) => {
      const url = String(input instanceof Request ? input.url : input);
      const result = url.includes("/compose/")
        ? { rawtransaction: "00" } // the dry run returns before decoding it
        : [{ price: 0, status: "open" }];
      return Promise.resolve(
        new Response(JSON.stringify({ result }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    });
    try {
      const req = new Request("http://localhost/api/v2/fairmint/compose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: "bc1qzxszplp8v7w0jc89dlrqyct9staqlhwxzy7lkq",
          asset: "FREEMINT",
          satsPerVB: 2,
          service_fee: "2500",
          dryRun: true,
        }),
      });
      const res = await (handler as any).POST(req, {} as any);
      const body = await res.json();
      assertEquals(res.status, 200, JSON.stringify(body));
      assertEquals(body.service_fee, 2500);
      assertEquals(
        body.total_cost,
        body.est_miner_fee + body.total_dust_value + 2500,
      );
    } finally {
      restore();
    }
  },
});
