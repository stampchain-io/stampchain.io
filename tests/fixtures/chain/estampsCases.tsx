/**
 * Inputs for the eSTAMPS presentation tests (tests/unit/estamps.test.tsx).
 * bitcoinEstampsBaseline.json was rendered from exactly these inputs by the
 * code before the eSTAMPS change, with CHAIN unset and TZ=UTC, by
 * ./captureBitcoinEstampsBaseline.ts. Bitcoin output must keep matching it.
 *
 * Importing this module installs the DB stub (via ./chainCases.tsx) and
 * records every query sent to it, so the SQL behind the explorer and home
 * stamp lists can be compared too.
 */
import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { TX } from "./chainCases.tsx";

export const sql: Array<{ query: string; params: unknown[] }> = [];
const mock = (globalThis as any).__mockDbManager;
const run = mock.executeQueryWithCache;
mock.executeQueryWithCache = (query: string, params: unknown[] = []) => {
  sql.push({ query, params: [...params] });
  if (/MAX\(block_index\)\s+AS last_block/.test(query)) {
    return Promise.resolve({ rows: [{ last_block: 973_800 }] });
  }
  return run(query, params);
};
mock.executeQuery = mock.executeQueryWithCache;

export const ADDR = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
export const stamp: any = {
  stamp: 4242,
  cpid: "A4242",
  tx_hash: TX,
  tx_index: 10,
  block_index: 973800,
  creator: ADDR,
  supply: 1,
  divisible: false,
  locked: 1,
  ident: "STAMP",
  stamp_mimetype: "image/png",
  stamp_url: "https://stampchain.io/stamps/abc.png",
  block_time: "2026-10-27T12:00:00Z",
};

export const NON_SRC20_IDENTS = ["STAMP", "SRC-721", "SRC-101"];

/** Per-run values (Fresh build id, random selector ids) made stable. */
export const normalize = (html: string) =>
  html.replace(/__frsh_c=[0-9a-f]+/g, "__frsh_c=BUILD")
    .replace(/selector-[a-z0-9]{6,12}\b/g, "selector-ID");

/** Renders of the pages and components the eSTAMPS change touches. */
export async function renderSurfaces(): Promise<Record<string, string>> {
  const { HomeHeader } = await import("$components/header/HomeHeader.tsx");
  const { default: Home } = await import("../../../routes/index.tsx");
  const { ExplorerPage } = await import("../../../routes/explorer/index.tsx");
  const { StampGalleryHome } = await import(
    "$islands/section/gallery/StampGalleryHome.tsx"
  );
  const { default: BlockTransactions } = await import(
    "$islands/content/blockContent/BlockTransactions.tsx"
  ).catch(() => ({ default: null as any }));
  const explorerData = (stamps: unknown[]) => ({
    stamps,
    page: 1,
    totalPages: 1,
    total: stamps.length,
    sortBy: "DESC",
    selectedTab: "all",
    filterBy: [],
    src20DataCard: { data: [], total: 0, page: 1, totalPages: 1 },
    section: "all",
    cardView: "cardVertical",
  });
  const url = new URL("https://stampchain.io/explorer");
  const out: Record<string, string> = {
    HomeHeader: renderToString(h(HomeHeader, {})),
    Home: renderToString(
      h(Home as any, { data: { stamps_art: [stamp] }, url }),
    ),
    HomeEmpty: renderToString(h(Home as any, { data: {}, url })),
    StampGalleryHome: renderToString(
      h(StampGalleryHome, { stamps_art: [stamp] }),
    ),
    Explorer: renderToString(
      h(ExplorerPage as any, { data: explorerData([stamp]), url }),
    ),
    ExplorerEmpty: renderToString(
      h(ExplorerPage as any, { data: explorerData([]), url }),
    ),
  };
  for (const k of Object.keys(out)) out[k] = normalize(out[k]);
  if (BlockTransactions) {
    out.BlockTransactions = renderToString(
      h(BlockTransactions, { stamps: [stamp], src20s: [] } as any),
    );
  }
  return out;
}

/** SQL the stamp-list data paths send, in order, for fixed inputs. */
export async function captureSql(): Promise<
  Record<string, Array<{ query: string; params: unknown[] }>>
> {
  const { StampRepository } = await import(
    "$server/database/stampRepository.ts"
  );
  const { SRC20Repository } = await import(
    "$server/database/src20Repository.ts"
  );
  const { ExplorerFeedRepository } = await import(
    "$server/database/explorerFeedRepository.ts"
  );
  const { StampController } = await import(
    "$server/controller/stampController.ts"
  );
  const take = async (fn: () => Promise<unknown>) => {
    sql.length = 0;
    // The stub answers most queries with no rows, which some callers treat
    // as an error part-way through. The SQL sent up to that point is still
    // deterministic, so keep it and note where the path stopped.
    const error = await fn().then(() => null, (e) => String(e?.message ?? e));
    const sent = sql.splice(0);
    return error ? [...sent, { query: "<stopped>", params: [error] }] : sent;
  };
  const stampFragment = StampRepository.buildFeedFragment({
    type: "all",
    ident: NON_SRC20_IDENTS as any,
  });
  const tokenFragment = SRC20Repository.buildFeedFragment({});
  return {
    stampFeedFragment: [{
      query: stampFragment.subquery,
      params: stampFragment.params,
    }],
    tokenFeedFragment: [{
      query: tokenFragment.subquery,
      params: tokenFragment.params,
    }],
    explorerFeed: await take(() =>
      ExplorerFeedRepository.getFeedPage({
        page: 1,
        limit: 60,
        type: "all",
        ident: NON_SRC20_IDENTS as any,
      })
    ),
    explorerStamps: await take(() =>
      StampController.getStamps({
        page: 1,
        limit: 60,
        sortBy: "DESC",
        type: "all",
        ident: NON_SRC20_IDENTS as any,
        btcPrice: 1,
        btcPriceSource: "test",
      })
    ),
    homePage: await take(() => StampController.getHomePageData(1, "test")),
  };
}

/** The update announcement text, read from the island's source. */
export async function notificationSource(): Promise<string> {
  const src = await Deno.readTextFile(
    new URL("../../../islands/Toast/NotificationUpdate.tsx", import.meta.url),
  );
  return src.match(/NOTIFICATION_UPDATE_MESSAGE = `([^`]*)`/)?.[1] ?? "";
}
