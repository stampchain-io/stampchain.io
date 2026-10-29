/**
 * ECX post-fork follow-ups: canonical origin, the ECX-native switch on the
 * SRC-20 transaction list, and "ECX #" on sale rows. Each case also checks
 * that Bitcoin output stays as it was.
 *
 * Nothing here sets Deno.env; the chain is a parameter or client chain state.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { opts } from "../fixtures/chain/chainCases.tsx";
import { sql, stamp } from "../fixtures/chain/estampsCases.tsx";

const { siteOrigin, BITCOIN_SITE_ORIGIN } = await import(
  "$server/services/chain/chainProfile.ts"
);
const { MetaTags } = await import("$components/layout/MetaTags.tsx");
const { ecxViewState, EcxNativeEmpty, EcxStampViewToggle } = await import(
  "$components/layout/EcxStampView.tsx"
);
const { MarketplaceSalesRow } = await import(
  "$components/table/marketplaceTable/StampSales.tsx"
);
const { SRC20Repository } = await import("$server/database/src20Repository.ts");
const clientChain = await import("$lib/utils/chain/clientChain.ts");

const env = (vars: Record<string, string>) => ({
  get: (k: string) => vars[k],
});
const ECX_CHAIN = {
  CHAIN: "ecx",
  EXPLORER_BASE_URL: "https://explorer.ecash.ninja",
} as const;

/* ===== SITE ORIGIN ===== */
Deno.test("siteOrigin: Bitcoin is always stampchain.io", () => {
  assertEquals(siteOrigin(env({})), BITCOIN_SITE_ORIGIN);
  assertEquals(
    siteOrigin(env({ CHAIN: "bitcoin", APP_DOMAIN: "ecx.stampchain.io" })),
    "https://stampchain.io",
  );
});

Deno.test("siteOrigin: ECX uses APP_DOMAIN, with a default", () => {
  assertEquals(
    siteOrigin(env({ CHAIN: "ecx", APP_DOMAIN: "ecx.stampchain.io" })),
    "https://ecx.stampchain.io",
  );
  assertEquals(
    siteOrigin(env({ CHAIN: "ecx", APP_DOMAIN: "https://ecx.example/ " })),
    "https://ecx.example",
  );
  assertEquals(siteOrigin(env({ CHAIN: "ecx" })), "https://ecx.stampchain.io");
});

Deno.test("MetaTags: default origin keeps the Bitcoin head", () => {
  const html = renderToString(
    h(MetaTags, { canonicalUrl: "https://stampchain.io/faq" }),
  );
  assertStringIncludes(html, 'href="https://stampchain.io/llms.txt"');
  assertStringIncludes(html, '"url":"https://stampchain.io"');
  assertStringIncludes(
    html,
    '"target":"https://stampchain.io/stamp/{search_term_string}"',
  );
});

Deno.test("MetaTags: ECX origin moves canonical and site links", () => {
  const origin = "https://ecx.stampchain.io";
  const html = renderToString(
    h(MetaTags, {
      canonicalUrl: `${origin}/stamp/1507458`,
      origin,
      chain: "ecx",
    }),
  );
  assertStringIncludes(
    html,
    '<link rel="canonical" href="https://ecx.stampchain.io/stamp/1507458"',
  );
  assertStringIncludes(html, `href="${origin}/llms.txt"`);
  assertStringIncludes(html, `"target":"${origin}/stamp/{search_term_string}"`);
  // The Organization block still names Stampchain at its own site.
  assertStringIncludes(html, '"@type":"Organization","name":"Stampchain"');
});

/* ===== SRC-20 LIST VIEW ===== */
Deno.test("ecx tokens: switch and empty state name SRC-20 transactions", () => {
  const url = new URL("https://x/explorer?section=tokens");
  const state = ecxViewState(url, "native", "tokens");
  assertEquals(state.subject, "tokens");
  assertStringIncludes(
    renderToString(h(EcxStampViewToggle, { state })),
    "SRC-20 transactions created on ECX",
  );
  const empty = renderToString(h(EcxNativeEmpty, { state }));
  assertStringIncludes(empty, "NO ECX-NATIVE SRC-20 TRANSACTIONS YET");
  assert(!empty.includes("STAMPS YET"));
  // Stamp lists keep their wording.
  const stamps = ecxViewState(new URL("https://x/explorer"), "native");
  assertEquals(stamps.subject, "stamps");
  assertStringIncludes(
    renderToString(h(EcxNativeEmpty, { state: stamps })),
    "NO ECX-NATIVE STAMPS YET",
  );
});

Deno.test({
  ...opts,
  name: "src20 queries: blockFrom adds a block floor; absent adds nothing",
  async fn() {
    const run = async (params: Record<string, unknown>) => {
      sql.length = 0;
      await SRC20Repository.getValidSrc20TxFromDb(params as any).catch(
        () => null,
      );
      await SRC20Repository.getTotalCountValidSrc20TxFromDb(params as any)
        .catch(() => null);
      return sql.splice(0);
    };
    const without = await run({ limit: 10, page: 1, sortBy: "BLOCK_DESC" });
    for (const q of without) {
      assert(!q.query.includes("block_index >= ?"), q.query);
    }
    const withFloor = await run({
      limit: 10,
      page: 1,
      sortBy: "BLOCK_DESC",
      blockFrom: 973728,
    });
    assertEquals(withFloor.length, 2);
    for (const q of withFloor) {
      assertStringIncludes(q.query, "src20.block_index >= ?");
      assert(q.params.includes(973728), JSON.stringify(q.params));
    }
  },
});

/* ===== SALE ROWS ===== */
const saleRow = (extra: Record<string, unknown> = {}) => ({
  ...stamp,
  stamp: 1507458,
  block_index: 974100, // the sale's block
  sale_data: {
    btc_amount: 0.001,
    block_index: 974100,
    tx_hash: "ab".repeat(32),
  },
  ...extra,
});

Deno.test({
  ...opts,
  name: "sales table: ECX shows ECX # from the creation block",
  fn() {
    clientChain.setClientChain(ECX_CHAIN);
    try {
      const native = renderToString(
        h(
          "table",
          null,
          h(MarketplaceSalesRow, {
            stamp: saleRow({ stamp_block_index: 973731 }) as any,
          }),
        ),
      );
      assertStringIncludes(native, "ECX #");
      const inherited = renderToString(
        h(
          "table",
          null,
          h(MarketplaceSalesRow, {
            stamp: saleRow({ stamp_block_index: 800000 }) as any,
          }),
        ),
      );
      assert(!inherited.includes("ECX #"));
      // No creation block: unknown reads as inherited, never as native.
      const unknown = renderToString(
        h("table", null, h(MarketplaceSalesRow, { stamp: saleRow() as any })),
      );
      assert(!unknown.includes("ECX #"));
    } finally {
      clientChain.setClientChain(null);
    }
  },
});

Deno.test({
  ...opts,
  name: "sales table: Bitcoin ignores stamp_block_index",
  fn() {
    clientChain.setClientChain(null);
    const html = renderToString(
      h(
        "table",
        null,
        h(MarketplaceSalesRow, {
          stamp: saleRow({ stamp_block_index: 973731 }) as any,
        }),
      ),
    );
    assert(!html.includes("ECX #"));
  },
});
