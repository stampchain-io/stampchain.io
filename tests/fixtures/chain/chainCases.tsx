/**
 * Shared inputs for the chain labelling tests (tests/unit/chainLabelling.test.tsx
 * and its env-isolated child, ./chainEnvCases.tsx). bitcoinBaseline.json was
 * rendered from exactly these inputs by the code before chain labelling
 * existed (main at 37d0d9ab7, after #1306), with CHAIN unset and TZ=UTC,
 * by ./captureBitcoinBaseline.ts.
 *
 * Importing this module installs the DB stub, so import it before anything
 * that captures dbManager.
 */
import { h } from "preact";
import { renderToString } from "preact-render-to-string";

export const TIP = {
  block_index: 973_800,
  block_hash: "00".repeat(4) + "ab".repeat(28),
};
export const db = { fail: false, queries: 0 };
(globalThis as any).__mockDbManager = {
  getCacheValue: () => Promise.resolve(null),
  setCacheValue: () => Promise.resolve(),
  handleCache: (_k: string, f: () => Promise<unknown>) => f(),
  executeQueryWithCache: (query: string) => {
    db.queries++;
    if (db.fail) return Promise.reject(new Error("db down"));
    if (/SELECT block_index, block_hash\s+FROM blocks/.test(query)) {
      return Promise.resolve({ rows: [TIP] });
    }
    return Promise.resolve({ rows: [] });
  },
};

export const baseline = JSON.parse(
  await Deno.readTextFile(new URL("./bitcoinBaseline.json", import.meta.url)),
);
export const opts = { sanitizeOps: false, sanitizeResources: false };

export const Page = () => h("p", null, "body");
export const renderApp = (
  App: unknown,
  path: string,
  state: Record<string, unknown> = {},
) =>
  renderToString(
    h(App as any, {
      Component: Page,
      state,
      url: new URL("https://stampchain.io" + path),
    }),
  );

export const TX = "ab".repeat(32);
export const ADDR = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
export const LINK_STAMP: any = {
  stamp: 1,
  cpid: "A123",
  tx_hash: TX,
  block_index: 973800,
  creator: ADDR,
  supply: 1,
  divisible: false,
  locked: 1,
  ident: "STAMP",
  stamp_mimetype: "image/png",
  block_time: "2026-10-27T12:00:00Z",
  stamp_url: "",
  sale_data: {
    tx_hash: TX,
    buyer_address: ADDR,
    dispenser_address: ADDR,
    block_index: 973800,
    btc_amount: 0.001,
    time_ago: "1m",
  },
};
const src20: any = {
  tx_hash: TX,
  block_index: 973800,
  tick: "KEVIN",
  op: "DEPLOY",
  amt: "1",
  creator: ADDR,
  destination: ADDR,
  block_time: "2026-10-27T12:00:00Z",
};
const send = {
  source: ADDR,
  destination: ADDR,
  quantity: 1,
  tx_hash: TX,
  block_time: 1761566400000,
  block_index: 973800,
  amt: "1",
  tick: "KEVIN",
  creator_name: null,
  destination_name: null,
  address: ADDR,
};
const LINK_CASES: Array<[string, string, string, unknown]> = [
  [
    "StatusMessages",
    "../../../islands/tool/StatusMessages.tsx",
    "StatusMessages",
    {
      submissionMessage: { message: "done", txid: TX },
    },
  ],
  [
    "StampOverviewRow",
    "../../../components/table/explorerTable/StampOverview.tsx",
    "StampOverviewTable",
    { stamps: [LINK_STAMP] },
  ],
  [
    "SRC20OverviewRow",
    "../../../components/table/explorerTable/SRC20Overview.tsx",
    "SRC20OverviewTable",
    { src20s: [src20] },
  ],
  [
    "MarketplaceSales",
    "../../../components/table/marketplaceTable/StampSales.tsx",
    "MarketplaceSalesTable",
    { stamps: [LINK_STAMP] },
  ],
  [
    "StampTransfers",
    "../../../components/table/stampDetailsTable/StampTransfers.tsx",
    "StampTransfersTable",
    { sends: [send] },
  ],
  [
    "SRC20Transfers",
    "../../../components/table/src20DetailsTable/SRC20Transfers.tsx",
    "SRC20TransfersTable",
    { sends: [send] },
  ],
  [
    "SRC20Mints",
    "../../../components/table/src20DetailsTable/SRC20Mints.tsx",
    "SRC20MintsTable",
    { mints: [send] },
  ],
  [
    "StampListingsAll",
    "../../../components/table/stampDetailsTable/StampListingsAll.tsx",
    "StampListingsAllTable",
    {
      listings: [{
        tx_hash: TX,
        source: ADDR,
        give_quantity: 1,
        give_remaining: 0,
        escrow_quantity: 1,
        satoshirate: 1000,
        close_block_index: 973801,
        block_index: 973800,
      }],
    },
  ],
  [
    "SalesActivityFeed",
    "../../../islands/section/feed/SalesActivityFeed.tsx",
    "default",
    { sales: [LINK_STAMP] },
  ],
  [
    "SRC101RegisterInfo",
    "../../../islands/modal/info/SRC101RegisterInfo.tsx",
    "SRC101RegisterInfo",
    {},
  ],
  [
    "SRC101RegisterHowto",
    "../../../islands/section/howto/SRC101RegisterHowto.tsx",
    "SRC101RegisterHowto",
    {},
  ],
];
export async function renderLinks(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [name, mod, exp, props] of LINK_CASES) {
    const m = await import(mod);
    out[name] = renderToString(h(m[exp], props as any));
  }
  return out;
}
