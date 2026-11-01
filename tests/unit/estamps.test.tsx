/**
 * eSTAMPS presentation for ECX, and proof that Bitcoin is unchanged.
 *
 * Bitcoin: the pages, components and SQL this change touches match
 * bitcoinEstampsBaseline.json, captured from the code before it. ECX: the
 * eSTAMPS brand, eSTAMP numbers, the ECX-native default view with its
 * empty state and inherited-history switch, the chain banner and the
 * chain-neutral update announcement.
 *
 * Nothing here sets Deno.env (parallel test files share it). The chain is a
 * parameter, client chain state or render data; CHAIN-in-env cases live in
 * ../fixtures/chain/chainEnvCases.tsx.
 */
import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import {
  LINK_STAMP,
  opts,
  renderLinks,
  TIP,
} from "../fixtures/chain/chainCases.tsx";
import {
  captureSql,
  NON_SRC20_IDENTS,
  normalize,
  renderSurfaces,
  sql,
  stamp,
} from "../fixtures/chain/estampsCases.tsx";

const baseline = JSON.parse(
  await Deno.readTextFile(
    new URL("../fixtures/chain/bitcoinEstampsBaseline.json", import.meta.url),
  ),
);
const clientChain = await import("$lib/utils/chain/clientChain.ts");
const brand = await import("$lib/utils/chain/brand.ts");
const view = await import("$lib/utils/chain/ecxView.ts");
const { ecxViewState } = await import("$components/layout/EcxStampView.tsx");
const { ChainBanner, indexStatus } = await import(
  "$components/layout/ChainBanner.tsx"
);
const { HomeHeader } = await import("$components/header/HomeHeader.tsx");
const { default: Home } = await import("../../routes/index.tsx");
const { ExplorerPage } = await import("../../routes/explorer/index.tsx");
const { notificationUpdateMessage, NOTIFICATION_UPDATE_MESSAGE } = await import(
  "$lib/utils/ui/notifications/updateAnnouncement.ts"
);
const { AMOUNT_STAMPS, renderAmountComponents } = await import(
  "../fixtures/chain/amountCases.tsx"
);
const { StampRepository } = await import("$server/database/stampRepository.ts");
const { SRC20Repository } = await import("$server/database/src20Repository.ts");
const { ExplorerFeedRepository } = await import(
  "$server/database/explorerFeedRepository.ts"
);
const { StampController } = await import(
  "$server/controller/stampController.ts"
);

const ECX_CHAIN = {
  CHAIN: "ecx",
  EXPLORER_BASE_URL: "https://explorer.ecash.ninja",
  ECX_FIRST_STAMP: 1_507_458,
} as const;
const FORK = 973_728;
const FLOOR = { from: FORK };
const ESTAMP0 = 1_507_458;

/* ===== BITCOIN: UNCHANGED ===== */
Deno.test({
  ...opts,
  name:
    "bitcoin: home, explorer and gallery renders match the pre-eSTAMPS bytes",
  async fn() {
    clientChain.setClientChain(null);
    assertEquals(await renderSurfaces(), baseline.surfaces);
  },
});

Deno.test({
  ...opts,
  name: "bitcoin: stamp-list SQL matches the pre-eSTAMPS queries and params",
  async fn() {
    assertEquals(await captureSql(), baseline.sql);
  },
});

Deno.test("bitcoin: update announcement, prefixes and brand are unchanged", () => {
  clientChain.setClientChain(null);
  assertEquals(NOTIFICATION_UPDATE_MESSAGE, baseline.notification);
  assertStrictEquals(notificationUpdateMessage(), baseline.notification);
  assertStrictEquals(
    notificationUpdateMessage("bitcoin"),
    baseline.notification,
  );
  // No eSTAMP numbers on Bitcoin, even for stamps past the ECX boundary.
  for (const n of [4242, ESTAMP0, ESTAMP0 + 5]) {
    assertEquals(clientChain.stampPrefix(n), "#");
    assertEquals(clientChain.stampPrefix(n, "Stamp"), "Stamp #");
    assertStrictEquals(clientChain.stampNumberText(n), n);
    assertEquals(clientChain.stampPrefixClass(n), "font-light");
    assertEquals(clientChain.clientEstampNumber(n), null);
    assertEquals(brand.stampNumberPrefix(n), "#");
    assertEquals(brand.formatStampNumber(n), `#${n}`);
    assertEquals(brand.stampTitle(n), `Bitcoin Stamp #${n}`);
    assertEquals(brand.stampTitle(n, "bitcoin"), `Bitcoin Stamp #${n}`);
  }
  assertEquals(brand.getChainBrand("bitcoin").attribution, null);
  // HomeHeader's default and explicit Bitcoin forms are the same markup
  assertEquals(
    renderToString(h(HomeHeader, { chain: "bitcoin" })),
    baseline.surfaces.HomeHeader,
  );
});

/* ===== ECX: STYLES ===== */
Deno.test("ecx: eSTAMPS styles load on ECX only, and only match ECX pages", async () => {
  assertEquals(brand.chainStylesheet(), null);
  assertEquals(brand.chainStylesheet("bitcoin"), null);
  assertEquals(brand.chainStylesheet("ecx"), "/estamps.css");
  const css = await Deno.readTextFile(
    new URL("../../static/estamps.css", import.meta.url),
  );
  // Every selector in every rule (inside @media too) starts with the ECX
  // scope, so the file is inert on a page without data-chain="ecx".
  const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = [...body.matchAll(/([^{}]+)\{[^{}]*\}/g)]
    .map((m) => m[1].replace(/@media[^{]*\{/g, "").trim())
    .filter(Boolean);
  assert(selectors.length > 20, "parsed the rules");
  // Split a selector list at top-level commas only (not inside :is(...)).
  const split = (group: string) => {
    const out: string[] = [];
    let depth = 0, cur = "";
    for (const ch of group) {
      if (ch === "(" || ch === "[") depth++;
      if (ch === ")" || ch === "]") depth--;
      if (ch === "," && depth === 0) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    return [...out, cur];
  };
  for (const group of selectors) {
    for (const sel of split(group)) {
      assert(
        sel.trim().startsWith('html[data-chain="ecx"]'),
        `unscoped selector: ${sel.trim()}`,
      );
    }
  }
});

/* ===== ECX: BRAND AND STAMP NUMBERS ===== */
Deno.test("estampNumber: counts from ECX_FIRST_STAMP, null before it and on Bitcoin", () => {
  assertEquals(brand.ECX_FIRST_STAMP_DEFAULT, ESTAMP0);
  assertEquals(brand.estampNumber(ESTAMP0 - 1, ESTAMP0), null);
  assertEquals(brand.estampNumber(ESTAMP0, ESTAMP0), 0);
  assertEquals(brand.estampNumber(ESTAMP0 + 1, ESTAMP0), 1);
  assertEquals(brand.estampNumber(String(ESTAMP0 + 7), ESTAMP0), 7);
  // Bitcoin: no first eSTAMP
  assertEquals(brand.estampNumber(ESTAMP0, null), null);
  assertEquals(brand.estampNumber(ESTAMP0 + 1, null), null);
  // cursed, unnumbered and junk
  for (const n of [-1, -1849, 0, null, undefined, "", " ", "x", "1e6", 1.5]) {
    assertEquals(brand.estampNumber(n as any, ESTAMP0), null, String(n));
  }
  // another boundary
  assertEquals(brand.estampNumber(10, 10), 0);
  assertEquals(brand.estampNumber(9, 10), null);
});

Deno.test("ecx: ECX-native stamps read eSTAMP #<n>, inherited keep their number", () => {
  // native: eSTAMP #0 is stamp 1507458
  assertEquals(brand.stampNumberPrefix(ESTAMP0, ESTAMP0), "eSTAMP #");
  assertEquals(brand.formatStampNumber(ESTAMP0, ESTAMP0), "eSTAMP #0");
  assertEquals(brand.formatStampNumber(ESTAMP0 + 1, ESTAMP0), "eSTAMP #1");
  assertEquals(
    clientChain.stampPrefix(ESTAMP0, "Stamp", ECX_CHAIN),
    "eSTAMP #",
  );
  assertEquals(
    clientChain.stampPrefix(String(ESTAMP0), "", ECX_CHAIN),
    "eSTAMP #",
  );
  assertEquals(clientChain.stampNumberText(ESTAMP0 + 3, ECX_CHAIN), 3);
  assertEquals(clientChain.clientEstampNumber(ESTAMP0, ECX_CHAIN), 0);
  assertEquals(
    clientChain.stampPrefixClass(ESTAMP0, ECX_CHAIN),
    "font-light estamps-num-prefix",
  );
  assertEquals(brand.stampTitle(ESTAMP0, "ecx", ESTAMP0), "eSTAMP #0");
  assertEquals(brand.stampTitle(ESTAMP0 + 12, "ecx", ESTAMP0), "eSTAMP #12");
  // inherited, cursed and missing numbers: what Bitcoin shows
  for (const n of [ESTAMP0 - 1, 4242, 0, -5, null, undefined]) {
    assertEquals(brand.stampNumberPrefix(n, ESTAMP0), "#");
    assertEquals(clientChain.stampPrefix(n, "", ECX_CHAIN), "#");
    assertEquals(clientChain.stampPrefix(n, "Stamp", ECX_CHAIN), "Stamp #");
    assertStrictEquals(clientChain.stampNumberText(n, ECX_CHAIN), n);
    assertEquals(clientChain.stampPrefixClass(n, ECX_CHAIN), "font-light");
  }
  // An inherited stamp's title is not "eSTAMP #12": that is a native stamp.
  assertEquals(brand.stampTitle(12, "ecx", ESTAMP0), "Stamp #12");
  assertEquals(brand.stampTitle(12, "ecx"), "Stamp #12");
});

// Cards, tables and the detail view, sale rows included: the eSTAMP
// number comes from the stamp number, not from a block.
const NUMBERED = [
  "StampCard.cardVerticalListing",
  "StampCard.cardHorizontalListing",
  "StampCard.cardVerticalDetail",
  "StampCard.recentSale",
  "WalletStampOverview",
  "WalletStampOverviewCompact",
  "StampListings",
  "StampInfo",
  "StampOverviewRow",
  "MarketplaceSales",
  "SalesActivityFeed",
];

async function renderNumbered() {
  return { ...await renderAmountComponents(), ...await renderLinks() };
}

/** Render with every fixture stamp renumbered to `numbers(i)`. */
async function renderWithStampNumbers(numbers: (i: number) => number) {
  const stamps = [...AMOUNT_STAMPS, LINK_STAMP];
  const saved = stamps.map((s) => s.stamp);
  stamps.forEach((s, i) => s.stamp = numbers(i));
  try {
    clientChain.setClientChain(ECX_CHAIN);
    const ecx = await renderNumbered();
    clientChain.setClientChain(null);
    const btc = await renderNumbered();
    return { ecx, btc };
  } finally {
    stamps.forEach((s, i) => s.stamp = saved[i]);
    clientChain.setClientChain(null);
  }
}

Deno.test({
  ...opts,
  name:
    "ecx: native stamps show eSTAMP #<n> in cards, tables and the detail view",
  async fn() {
    // eSTAMP #40 and up: no other number in the fixtures starts with 4x.
    const { ecx, btc } = await renderWithStampNumbers((i) => ESTAMP0 + 40 + i);
    for (const name of NUMBERED) {
      assert(ecx[name].includes("eSTAMP #"), `${name} shows no eSTAMP #`);
      assert(!btc[name].includes("eSTAMP"), `${name}: Bitcoin says eSTAMP`);
      assert(!ecx[name].includes("ECX #"), `${name} still says ECX #`);
    }
    // The number shown is the eSTAMP number, not the stamp number.
    assert(ecx.StampOverviewRow.includes("eSTAMP #</span>43<"));
    assert(!ecx.StampOverviewRow.includes(`>${ESTAMP0 + 43}<`));
    assert(btc.StampOverviewRow.includes(`>#</span>${ESTAMP0 + 43}<`));
    // Links are untouched: they never use the eSTAMP number.
    assert(ecx.StampOverviewRow.includes('href="/stamp/'));
    assert(!ecx.StampOverviewRow.includes('href="/stamp/43"'));
    // The detail view shows the stamp number as secondary text.
    assert(ecx.StampInfo.includes(`>Stamp #${ESTAMP0 + 40}</h6>`));
    assert(!btc.StampInfo.includes(">Stamp #"));
    // In cards the mark is a small label above the number, so long
    // numbers are not cut off; tables keep it inline.
    for (const name of NUMBERED.filter((n) => n.startsWith("StampCard."))) {
      assert(
        ecx[name].includes(
          '<span class="font-light estamps-num-prefix">eSTAMP #</span>',
        ),
        `${name}: eSTAMP # is not the card label`,
      );
    }
    assert(!ecx.StampOverviewRow.includes("estamps-num-prefix"));
  },
});

Deno.test({
  ...opts,
  name: "ecx: inherited stamps keep the plain # and number Bitcoin shows",
  async fn() {
    const { ecx, btc } = await renderWithStampNumbers((i) => ESTAMP0 - 1 - i);
    const marks = (h: string) =>
      [...h.matchAll(
        /<span class="font-light">(#)<\/span>|(Stamp #|STAMP #)/g,
      )]
        .length;
    for (const name of NUMBERED) {
      assert(!ecx[name].includes("eSTAMP #"), `${name}: eSTAMP # on inherited`);
      assert(!ecx[name].includes("estamps-num-prefix"), name);
      assert(marks(btc[name]) > 0, `${name}: no # on Bitcoin, test is vacuous`);
      assertEquals(marks(ecx[name]), marks(btc[name]), name);
    }
    assert(ecx.StampOverviewRow.includes(`>#</span>${ESTAMP0 - 4}<`));
  },
});

/* ===== ECX: NATIVE / INHERITED VIEW ===== */
Deno.test("ecx: view helpers default to ECX-native and keep other params", () => {
  assertEquals(view.ECX_FORK_BLOCK, FORK);
  assertEquals(view.getEcxStampView("/explorer"), "native");
  assertEquals(view.getEcxStampView("/explorer?history=all"), "native");
  assertEquals(
    view.getEcxStampView(new URL("https://x/explorer?history=inherited")),
    "inherited",
  );
  assertEquals(view.ecxBlockFloor("native"), FORK);
  assertEquals(view.ecxBlockFloor("inherited"), undefined);
  const url = new URL("https://x/explorer?section=stamps&page=3&type=classic");
  assertEquals(
    view.ecxViewHref(url, "inherited"),
    "/explorer?section=stamps&type=classic&history=inherited",
  );
  assertEquals(
    view.ecxViewHref(
      new URL("https://x/explorer?history=inherited&page=2"),
      "native",
    ),
    "/explorer",
  );
  // Filters rebuilt from scratch keep the inherited view; Bitcoin and the
  // native view get their query back untouched.
  assertEquals(
    view.keepEcxHistory("tokenOp=mint&view=cardRow", "?history=inherited"),
    "tokenOp=mint&view=cardRow&history=inherited",
  );
  assertEquals(
    view.keepEcxHistory("", "history=inherited"),
    "history=inherited",
  );
  const q = "fileType=png&sortBy=DESC";
  assertStrictEquals(view.keepEcxHistory(q, "?sortBy=DESC"), q);
  assertStrictEquals(view.keepEcxHistory(q, new URLSearchParams()), q);
  assertStrictEquals(
    view.keepEcxHistory("history=inherited", "history=inherited"),
    "history=inherited",
  );
  assert(view.isBlockFloor(FLOOR));
  assert(!view.isBlockFloor(973728) && !view.isBlockFloor("973728"));
  const state = ecxViewState(url, "native");
  assertEquals(state.filtered, true, "type=classic is a filter");
  assertEquals(
    ecxViewState(new URL("https://x/explorer?section=stamps&page=2"), "native")
      .filtered,
    false,
  );
});

Deno.test({
  ...opts,
  name:
    "ecx: the native view adds block_index >= 973728 to every stamp-list query",
  async fn() {
    const stampFragment = StampRepository.buildFeedFragment({
      type: "all",
      ident: NON_SRC20_IDENTS as any,
      blockFloor: FLOOR,
    });
    assert(stampFragment.subquery.includes("st.block_index >= ?"));
    assert(stampFragment.params.includes(FORK));
    const tokenFragment = SRC20Repository.buildFeedFragment({
      blockFloor: FLOOR,
    });
    assert(tokenFragment.subquery.includes("src20.block_index >= ?"));
    assertEquals(tokenFragment.params, [FORK]);

    sql.length = 0;
    await ExplorerFeedRepository.getFeedPage({
      page: 1,
      limit: 60,
      type: "all",
      ident: NON_SRC20_IDENTS as any,
      blockFloor: FLOOR,
    });
    const feed = sql.splice(0);
    assertEquals(feed.length, 2);
    for (const q of feed) {
      assert(q.query.includes("st.block_index >= ?"), q.query);
      assert(q.query.includes("src20.block_index >= ?"), q.query);
    }

    await StampController.getStamps({
      page: 1,
      limit: 60,
      sortBy: "DESC",
      type: "all",
      ident: NON_SRC20_IDENTS as any,
      blockIdentifier: FLOOR,
      btcPrice: 1,
      btcPriceSource: "test",
    });
    const list = sql.splice(0).filter((q) =>
      /FROM\s+StampTableV4/.test(q.query)
    );
    assert(list.length >= 2, "data and count queries");
    for (const q of list) {
      assert(q.query.includes("st.block_index >= ?"), q.query);
      assert(q.params.includes(FORK));
    }

    // Exact-block lookups are untouched by the new form.
    await StampController.getStamps({
      blockIdentifier: 973800,
      btcPrice: 1,
      btcPriceSource: "test",
    });
    const exact = sql.splice(0).filter((q) =>
      /FROM\s+StampTableV4/.test(q.query)
    );
    assert(exact.every((q) => !q.query.includes("st.block_index >= ?")));
    assert(exact.some((q) => q.query.includes("st.block_index = ?")));

    await StampController.getHomePageData(1, "test", FLOOR).catch(() => null);
    const home = sql.splice(0).filter((q) =>
      /FROM\s+StampTableV4/.test(q.query) && !q.query.includes("st.stamp IN")
    );
    assert(home.length >= 3, "the three gallery categories");
    for (const q of home) assert(q.query.includes("st.block_index >= ?"));
  },
});

/** The view option marked as the current page. */
const currentOption = (html: string) =>
  html.match(/<a [^>]*aria-current="page"[^>]*>([^<]*)<\/a>/)?.[1];

const explorerData = (stamps: unknown[], ecxView: unknown) => ({
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
  ecxView,
});

Deno.test({
  ...opts,
  name: "ecx: an empty native explorer says so and offers inherited history",
  fn() {
    const url = new URL("https://ecx.stampchain.io/explorer?section=stamps");
    const native = ecxViewState(url, "native");
    clientChain.setClientChain(ECX_CHAIN);
    try {
      const empty = renderToString(
        h(ExplorerPage as any, { data: explorerData([], native), url }),
      );
      assert(empty.includes('aria-label="Stamp history"'));
      assertEquals(currentOption(empty), "ECX-NATIVE");
      assert(empty.includes("NO ECX-NATIVE STAMPS YET"));
      assert(
        empty.includes(
          "ECX-native stamps start at block 973,728, the first ECX block. None have been indexed yet.",
        ),
      );
      assert(
        empty.includes(
          'href="/explorer?section=stamps&amp;history=inherited" class="estamps-button">VIEW INHERITED HISTORY',
        ),
      );

      const inherited = renderToString(
        h(ExplorerPage as any, {
          data: explorerData([stamp], ecxViewState(url, "inherited")),
          url,
        }),
      );
      assertEquals(currentOption(inherited), "INHERITED HISTORY");
      assert(!inherited.includes("NO ECX-NATIVE STAMPS"));
      assert(inherited.includes('href="/explorer?section=stamps"'));

      const filtered = renderToString(
        h(ExplorerPage as any, {
          data: explorerData(
            [],
            ecxViewState(new URL(url.href + "&type=classic"), "native"),
          ),
          url,
        }),
      );
      assert(filtered.includes("NO ECX-NATIVE STAMPS MATCH"));
    } finally {
      clientChain.setClientChain(null);
    }
  },
});

Deno.test({
  ...opts,
  name: "ecx: home shows eSTAMPS by Stampchain, and an honest empty gallery",
  fn() {
    const url = new URL("https://ecx.stampchain.io/");
    clientChain.setClientChain(ECX_CHAIN);
    try {
      const empty = normalize(renderToString(
        h(Home as any, { data: { ecxView: ecxViewState(url, "native") }, url }),
      ));
      assert(empty.includes('<span class="estamps-hero__e">e</span>STAMPS'));
      assert(
        empty.includes('<span class="estamps-hero__by">by Stampchain</span>'),
      );
      assert(empty.includes("ECX-native stamps start at block 973,728."));
      assert(!empty.includes("BECAUSE SATS DON'T EXIST"));
      assert(empty.includes("NO ECX-NATIVE STAMPS YET"));
      assert(empty.includes('href="/?history=inherited"'));
      assert(!empty.includes("LATEST CREATIONS"));

      const inherited = normalize(renderToString(
        h(Home as any, {
          data: {
            stamps_art: [stamp],
            ecxView: ecxViewState(url, "inherited"),
          },
          url,
        }),
      ));
      assert(!inherited.includes("NO ECX-NATIVE STAMPS"));
      assert(inherited.includes("LATEST CREATIONS"));
      assertEquals(currentOption(inherited), "INHERITED HISTORY");
      assert(!/ECX Stamps/.test(empty + inherited));
      // "Bitcoin Stamps" only as Stampchain's protocol history.
      assert(
        empty.includes(
          "eSTAMPS is built and run by Stampchain, the team behind the Bitcoin Stamps protocol.",
        ),
      );
      assert(!empty.includes("trade Bitcoin Stamps"));
    } finally {
      clientChain.setClientChain(null);
    }
  },
});

/* ===== ECX: CHAIN BANNER ===== */
Deno.test("ecx: banner separates indexed block, fork block and readiness", () => {
  const banner = (props: Record<string, unknown>) =>
    renderToString(
      h(ChainBanner, {
        label: "ECX",
        height: 973_800,
        blockHash: TIP.block_hash,
        chain: ECX_CHAIN,
        forkBlock: FORK,
        ...props,
      } as any),
    );
  const live = banner({ transactionsOpen: false });
  assert(live.includes('INDEXED BLOCK <span class="font-mono">973,800</span>'));
  assert(live.includes('FORK BLOCK <span class="font-mono">973,728</span>'));
  assert(live.includes("TRANSACTIONS NOT OPEN YET"));
  assert(live.includes('data-chain-status="indexing"'));
  assert(!live.includes("BEFORE FORK BLOCK"));
  assert(banner({ transactionsOpen: true }).includes(">TRANSACTIONS OPEN<"));
  assert(!banner({}).includes("TRANSACTIONS"), "unknown readiness is omitted");

  const down = banner({ height: null, blockHash: null });
  assert(down.includes("INDEXED BLOCK UNAVAILABLE"));
  assert(down.includes('data-chain-status="unavailable"'));
  assert(down.includes("FORK BLOCK"), "the fork block is not a tip claim");
  assert(!down.includes("data-chain-height"));
  assert(!/INDEXED BLOCK <span/.test(down));

  const early = banner({ height: 973_000 });
  assert(early.includes("BEFORE FORK BLOCK"));
  assert(early.includes('data-chain-status="before-fork"'));

  assertEquals(indexStatus(null, FORK), "unavailable");
  assertEquals(indexStatus(FORK - 1, FORK), "before-fork");
  assertEquals(indexStatus(FORK, FORK), "indexing");
  assertEquals(indexStatus(FORK, undefined), null);
});

/* ===== ECX: UPDATE ANNOUNCEMENT ===== */
Deno.test("ecx: update announcement names neither Bitcoin nor a price", () => {
  const ecx = notificationUpdateMessage("ecx");
  assert(!/bitcoin|price/i.test(ecx), ecx);
  assert(/transaction fees and current block display/.test(ecx));
  clientChain.setClientChain(ECX_CHAIN);
  try {
    assertStrictEquals(notificationUpdateMessage(), ecx);
  } finally {
    clientChain.setClientChain(null);
  }
  assert(/bitcoin block and price/.test(notificationUpdateMessage("bitcoin")));
});
