/**
 * The stamp-UTXO filter must read the whole balance listing from ONE node.
 * Cursors are node-local: continuing page 2 on a different node than page 1
 * can skip rows, and a skipped row is a stamp UTXO spent as a fee input.
 */
import { assert, assertEquals } from "@std/assert";
import { restore, stub } from "@std/testing/mock";

const PRIMARY = "http://xcp-primary.test:4000/v2";
Deno.env.set("XCP_PRIMARY_NODE_URL", PRIMARY);
Deno.env.delete("XCP_API_URL");
(globalThis as any).__mockDbManager ??= {
  getCacheValue: () => Promise.resolve(null),
  setCacheValue: () => Promise.resolve(),
  handleCache: (_k: string, f: () => Promise<unknown>) => f(),
};
const { CounterpartyApiManager, _resetXcpCooldown } = await import(
  "$server/services/counterpartyApiService.ts"
);
// The node list is fixed at import. Unset the variable so it cannot leak
// into other test files sharing this process.
Deno.env.delete("XCP_PRIMARY_NODE_URL");

const ADDRESS = "bc1qtestaddressforlistingfailover0000000000";
const txid = (n: number) => n.toString(16).padStart(64, "0");
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const page = (from: number, count: number, next: string | null) =>
  json({
    result: Array.from({ length: count }, (_, i) => ({
      asset: `A${from + i}`,
      quantity: 1,
      utxo: `${txid(from + i)}:0`,
    })),
    next_cursor: next,
  });
const opts = { sanitizeOps: false, sanitizeResources: false };

Deno.test({
  ...opts,
  name:
    "primary fails on page 2: the listing restarts from page 1 on the next node",
  async fn() {
    const calls: string[] = [];
    stub(globalThis, "fetch", (input: string | URL | Request) => {
      const url = new URL(String(input instanceof Request ? input.url : input));
      calls.push(
        `${url.origin} cursor=${url.searchParams.get("cursor") ?? "-"}`,
      );
      const onPrimary = url.href.startsWith(PRIMARY);
      const cursor = url.searchParams.get("cursor");
      if (onPrimary) {
        // Page 1 succeeds, page 2 is down.
        return Promise.resolve(
          cursor ? json({ error: "down" }, 503) : page(0, 3, "p-cursor"),
        );
      }
      // The public node's cursors differ from the primary's; a continued
      // listing would send "p-cursor", which this node does not know.
      if (cursor === "p-cursor") return Promise.resolve(page(100, 1, null));
      return Promise.resolve(
        cursor === "q2" ? page(3, 2, null) : page(0, 3, "q2"),
      );
    });
    try {
      const utxos = await CounterpartyApiManager.getUtxoAttachedBalanceUtxos(
        ADDRESS,
      );
      assertEquals(utxos.size, 5, [...utxos].join(","));
      for (const n of [0, 1, 2, 3, 4]) {
        assert(utxos.has(`${txid(n)}:0`), `row ${n}`);
      }
      assert(
        !utxos.has(`${txid(100)}:0`),
        "the primary's cursor was sent to the public node",
      );
      assert(
        !calls.some((c) =>
          !c.startsWith("http://xcp-primary") && c.endsWith("p-cursor")
        ),
      );
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});

Deno.test({
  ...opts,
  name: "every node failing still refuses the build",
  async fn() {
    stub(
      globalThis,
      "fetch",
      () => Promise.resolve(json({ error: "down" }, 503)),
    );
    try {
      let name = "";
      try {
        await CounterpartyApiManager.getUtxoAttachedBalanceUtxos(ADDRESS);
      } catch (e) {
        name = (e as Error).name;
      }
      assertEquals(name, "UpstreamUnavailableError");
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});
