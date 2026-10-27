/**
 * Chain labelling: pages, API responses and brand strings under CHAIN=ecx,
 * and proof that Bitcoin mode is unchanged.
 *
 * Nothing here sets Deno.env: parallel test files share one environment.
 * Helpers take the chain as a parameter; the cases that need CHAIN in the
 * environment (routes/_middleware.ts, routes/_app.tsx) run in child
 * processes, see tests/fixtures/chain/chainEnvCases.tsx.
 */
import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import {
  ADDR,
  db,
  opts,
  renderLinks,
  TIP,
  TX,
} from "../fixtures/chain/chainCases.tsx";

const { MetaTags } = await import("$components/layout/MetaTags.tsx");
const { getPageMetadata } = await import("$lib/utils/pageMetadata.ts");
const { brandPageMetadata, brandText, getChainBrand } = await import(
  "$lib/utils/chain/brand.ts"
);
const clientChain = await import("$lib/utils/chain/clientChain.ts");
const { ApiResponseUtil } = await import(
  "$lib/utils/api/responses/apiResponseUtil.ts"
);
const label = await import("$server/services/chain/chainLabel.ts");
const { Header } = await import("$islands/header/Header.tsx");
const { ChainBanner } = await import("$components/layout/ChainBanner.tsx");
const fmt = await import("$lib/utils/ui/formatting/formatUtils.ts");
const { formatAmounts, renderAmountComponents } = await import(
  "../fixtures/chain/amountCases.tsx"
);
const amountBaseline = JSON.parse(
  await Deno.readTextFile(
    new URL("../fixtures/chain/bitcoinAmountsBaseline.json", import.meta.url),
  ),
);
const ECX_EXPLORER = "https://explorer.ecash.ninja";
const ECX_CHAIN = { CHAIN: "ecx", EXPLORER_BASE_URL: ECX_EXPLORER } as const;

/* ===== ENV-DEPENDENT CASES, ONE CLEAN CHILD PROCESS PER CHAIN ===== */
const CHILD = new URL("../fixtures/chain/chainEnvCases.tsx", import.meta.url);
const TESTS_DIR = new URL("..", import.meta.url);
const PASS_THROUGH = ["HOME", "PATH", "DENO_DIR", "XDG_CACHE_HOME", "TZ"];

async function runChild(chain: string | undefined) {
  const env: Record<string, string> = {
    DENO_ENV: "test",
    SKIP_REDIS_CONNECTION: "true",
    NO_COLOR: "1",
    ECX_EXPLORER_URL: "https://ecx.example/",
  };
  for (const k of PASS_THROUGH) {
    const v = Deno.env.get(k);
    if (v !== undefined) env[k] = v;
  }
  if (chain !== undefined) env.CHAIN = chain;
  const { code, stdout, stderr } = await new Deno.Command(Deno.execPath(), {
    args: ["test", "--allow-all", "--no-check", CHILD.pathname],
    cwd: TESTS_DIR.pathname,
    env,
    clearEnv: true,
  }).output();
  const out = new TextDecoder().decode(stdout) +
    new TextDecoder().decode(stderr);
  return { code, out };
}

for (const chain of [undefined, "bitcoin", "ecx"]) {
  Deno.test({
    ...opts,
    name: `env cases in a clean child process (CHAIN ${chain ?? "unset"})`,
    async fn() {
      const { code, out } = await runChild(chain);
      assertEquals(code, 0, out);
      const passed = out.match(/ok \| (\d+) passed \| 0 failed/);
      assert(passed && Number(passed[1]) === 3, out);
    },
  });
}

/* ===== BITCOIN: HELPERS ARE THE IDENTITY ===== */
Deno.test("bitcoin: brand helpers keep today's strings", () => {
  const brand = getChainBrand("bitcoin");
  assertEquals(brand.productName, "Bitcoin Stamps");
  assertEquals(brand.logo, { lead: "STAMP", tail: "CHAIN" });
  assertEquals(brand.drawerTitle, "STAMPCHAIN");
  assertEquals(brand.chainLabel, null);
  assertEquals(getChainBrand(), brand);
  const s = "Buy a Bitcoin Stamp on Bitcoin";
  assertStrictEquals(brandText(s), s);
  assertStrictEquals(brandText(s, "bitcoin"), s);
  const meta = getPageMetadata("/marketplace");
  assertStrictEquals(brandPageMetadata(meta, "/marketplace", "bitcoin"), meta);
});

Deno.test("bitcoin: explorer helpers return the URLs the site used before", () => {
  clientChain.setClientChain(null);
  assertEquals(clientChain.getClientChainId(), "bitcoin");
  assertEquals(clientChain.txExplorerUrl(TX), `https://mempool.space/tx/${TX}`);
  assertEquals(
    clientChain.txExplorerUrl(TX, "blockchain.com"),
    `https://www.blockchain.com/explorer/transactions/btc/${TX}`,
  );
  assertEquals(
    clientChain.addressExplorerUrl(ADDR),
    `https://mempool.space/address/${ADDR}`,
  );
  assertEquals(clientChain.explorerHomeUrl(), "https://mempool.space/");
});

Deno.test({
  ...opts,
  name:
    "bitcoin: the central builder's responses are returned as-is, no DB lookup",
  async fn() {
    const before = db.queries;
    for (
      const res of [
        ApiResponseUtil.success({ ok: true }),
        ApiResponseUtil.badRequest("nope"),
        ApiResponseUtil.notFound("missing"),
      ]
    ) {
      const headersBefore = [...res.headers.entries()];
      assertStrictEquals(await label.withChainHeaders(res, "bitcoin"), res);
      assertEquals([...res.headers.entries()], headersBefore);
      assert(!res.headers.has("X-Chain"));
    }
    assertEquals(await label.getChainLabel("bitcoin"), null);
    assertEquals(label.getClientChainInfo("bitcoin"), null);
    assertEquals(db.queries, before);
  },
});

/* ===== ECX ===== */
Deno.test("ecx: brand helpers say ECX Stamps", () => {
  const brand = getChainBrand("ecx");
  assertEquals(brand.productName, "ECX Stamps");
  assertEquals(brand.chainLabel, "ECX");
  assertEquals(brand.drawerTitle, "ECX STAMPS");
  assertEquals(brandText("Bitcoin Stamps", "ecx"), "ECX Stamps");
  assertEquals(brandText("Bitcoin Stamp #12", "ecx"), "ECX Stamp #12");
  assertEquals(
    brandText("Stamp artwork into Bitcoin. Bitcoin block 5 on Bitcoin", "ecx"),
    "Stamp artwork into ECX. ECX block 5 on ECX",
  );
  assertEquals(
    brandText("How to Buy a Bitcoin Stamp, A Bitcoin address", "ecx"),
    "How to Buy an ECX Stamp, An ECX address",
  );
  // wallets and BTC amounts are product decisions, not rebranded
  assertEquals(
    brandText("Connect a Bitcoin wallet", "ecx"),
    "Connect a Bitcoin wallet",
  );
  assertEquals(brandText("priced in BTC", "ecx"), "priced in BTC");

  assertEquals(
    brandPageMetadata(getPageMetadata("/"), "/", "ecx").title,
    "ECX Stamps: Unprunable UTXO Art | Stampchain",
  );
  assertEquals(
    brandPageMetadata(getPageMetadata("/block/973800"), "/block/973800", "ecx")
      .title,
    "ECX Block 973800 | Stamps and SRC-20",
  );
  // protocol-history pages are left for a product decision
  assertEquals(
    brandPageMetadata(getPageMetadata("/about"), "/about", "ecx"),
    getPageMetadata("/about"),
  );
});

Deno.test("ecx: MetaTags carry the ECX brand in title, OG and site name", () => {
  const html = renderToString(
    h(MetaTags, {
      ...brandPageMetadata(getPageMetadata("/"), "/", "ecx"),
      chain: "ecx",
    }),
  );
  assert(
    html.includes(
      "<title>ECX Stamps: Unprunable UTXO Art | Stampchain</title>",
    ),
  );
  assert(html.includes('property="og:title" content="ECX Stamps: Unprunable'));
  assert(html.includes('property="og:site_name" content="ECX Stamps"'));
  assert(html.includes('content="stampchain.io — ECX Stamps block explorer"'));
  assert(html.includes('"name":"ECX Stamps"'));
  assert(html.includes("transactions on the ECX blockchain"));
  assert(!/Bitcoin Stamps/.test(html));
  assertEquals(
    renderToString(h(MetaTags, { chain: "ecx" })).match(/<title>(.*?)<\/title>/)
      ?.[1],
    "ECX Stamps",
  );
});

Deno.test({
  ...opts,
  name: "ecx: header label data has chain, height and hash, memoised",
  async fn() {
    label.resetChainLabelCache();
    const before = db.queries;
    const a = await label.getChainLabel("ecx");
    const b = await label.getChainLabel("ecx");
    assertEquals(a, {
      chain: "ecx",
      label: "ECX",
      height: 973_800,
      blockHash: TIP.block_hash,
    });
    assertEquals(b, a);
    assertEquals(db.queries - before, 1, "second call must hit the memo");
    assertEquals(
      label.getClientChainInfo("ecx", { get: () => " https://ecx.example " }),
      { CHAIN: "ecx", EXPLORER_BASE_URL: "https://ecx.example" },
    );
    // unset: the default ECX explorer; set to "": no explorer, links hidden
    assertEquals(label.getClientChainInfo("ecx", { get: () => undefined }), {
      CHAIN: "ecx",
      EXPLORER_BASE_URL: ECX_EXPLORER,
    });
    assertEquals(label.ECX_DEFAULT_EXPLORER_URL, ECX_EXPLORER);
    assertEquals(label.getClientChainInfo("ecx", { get: () => "" }), {
      CHAIN: "ecx",
      EXPLORER_BASE_URL: "",
    });
  },
});

Deno.test({
  ...opts,
  name:
    "ecx: responses from the central builder carry X-Chain, height and hash",
  async fn() {
    label.resetChainLabelCache();
    for (
      const res of [
        ApiResponseUtil.success({ ok: true }),
        ApiResponseUtil.notFound("missing"),
        ApiResponseUtil.badRequest("nope"),
      ]
    ) {
      const out = await label.withChainHeaders(res, "ecx");
      assertEquals(out.headers.get("X-Chain"), "ecx");
      assertEquals(out.headers.get("X-Chain-Height"), "973800");
      assertEquals(out.headers.get("X-Chain-Block-Hash"), TIP.block_hash);
      assertEquals(out.headers.get("Content-Type"), "application/json");
    }
    // Immutable headers (Response.redirect) are re-wrapped, status kept.
    const redirect = await label.withChainHeaders(
      Response.redirect("https://example.com/", 302),
      "ecx",
    );
    assertEquals(redirect.status, 302);
    assertEquals(redirect.headers.get("X-Chain"), "ecx");
    assertEquals(redirect.headers.get("Location"), "https://example.com/");
  },
});

Deno.test({
  ...opts,
  name: "ecx: a failed tip lookup still labels the chain and is not memoised",
  async fn() {
    label.resetChainLabelCache();
    db.fail = true;
    try {
      const out = await label.withChainHeaders(
        ApiResponseUtil.success({}),
        "ecx",
      );
      assertEquals(out.headers.get("X-Chain"), "ecx");
      assert(!out.headers.has("X-Chain-Height"));
      assert(!out.headers.has("X-Chain-Block-Hash"));
    } finally {
      db.fail = false;
    }
    assertEquals((await label.getChainLabel("ecx"))?.height, 973_800);
  },
});

Deno.test({
  ...opts,
  name:
    "ecx: Header island takes the chain as a prop and publishes it for islands",
  fn() {
    clientChain.setClientChain(null);
    try {
      const html = renderToString(
        h(Header, { chain: { CHAIN: "ecx", EXPLORER_BASE_URL: "" } }),
      );
      assert(html.includes("ECX</span> STAMPS"));
      assert(!html.includes("STAMP</span>CHAIN"));
      assertEquals(clientChain.getClientChainId(), "ecx");
    } finally {
      clientChain.setClientChain(null);
    }
  },
});

Deno.test({
  ...opts,
  name: "ecx: explorer links use the configured explorer, or are dropped",
  async fn() {
    try {
      clientChain.setClientChain({ CHAIN: "ecx", EXPLORER_BASE_URL: "" });
      assertEquals(clientChain.txExplorerUrl(TX), null);
      assertEquals(clientChain.addressExplorerUrl(ADDR), null);
      assertEquals(clientChain.explorerHomeUrl(), null);
      for (const [name, html] of Object.entries(await renderLinks())) {
        assert(
          !/mempool\.space|blockchain\.com/.test(html),
          `${name} still links to a Bitcoin explorer`,
        );
      }

      clientChain.setClientChain({
        CHAIN: "ecx",
        EXPLORER_BASE_URL: "https://ecx.example/",
      });
      assertEquals(
        clientChain.txExplorerUrl(TX, "blockchain.com"),
        `https://ecx.example/tx/${TX}`,
      );
      assertEquals(
        clientChain.addressExplorerUrl(ADDR),
        `https://ecx.example/address/${ADDR}`,
      );
      const links = await renderLinks();
      assert(
        links.StampTransfers.includes(`href="https://ecx.example/tx/${TX}"`),
      );
      assert(
        links.SalesActivityFeed.includes(
          `href="https://ecx.example/address/${ADDR}"`,
        ),
      );
    } finally {
      clientChain.setClientChain(null);
    }
  },
});

/* ===== AMOUNTS AND MARKET DATA ===== */
// Components whose output shows an on-chain amount (and so a unit).
const AMOUNT_CASES = [
  "StatPrice",
  "StatPriceActivity",
  "StatPriceNoUsd",
  "FeeCalculatorStampBuy",
  "FeeCalculatorDonate",
  "StampCard.cardVerticalListing",
  "StampCard.cardHorizontalListing",
  "StampCard.cardHorizontalListingCompact",
  "StampCard.cardVerticalDetail",
  "StampCard.recentSale",
  "WalletHeader",
  "RangeSliderDualPrice",
  "StampSalesDetail",
  "StampListings",
  "StampListingsOpen",
  "StampInfo",
  "WalletDashboardDetails",
  "WalletDashboardContent",
];
const BTC_UNIT = /BTC|₿/;
// USD values, the coin toggle and market statistics, as rendered on Bitcoin.
const MARKET = [
  /\bUSDT?\b/,
  /\$\d/,
  /currency-toggle/,
  /FLOOR PRICE/,
  /MARKET ?CAP/,
  /VOLUME/,
  /CHANGE/,
  /AVERAGE PRICE/,
  />VALUE</,
  /\d SATS/, // SRC-20 unit prices
  /[+-]?\d+\.\d\d%/, // 24h change
  />0\.05 /, // the fixture collection's floor price (tooltip-only label)
];
// Cases that render market data on Bitcoin, so the ECX check is not vacuous.
const MARKET_CASES = [
  "StatPrice",
  "StatPriceActivity",
  "FeeCalculatorStampBuy",
  "FeeCalculatorDonate",
  "BlockchainStats",
  "StampCard.cardVerticalListing",
  "StampCard.recentSale",
  "SRC20Overview",
  "SRC20OverviewCompact",
  "SRC20DetailHeader",
  "SRC20CardHorizontal",
  "SRC20Card.cardSquareBalance",
  "SRC20Card.cardVerticalBalance",
  "WalletSRC20Overview",
  "WalletSRC20OverviewCompact",
  "WalletStampOverview",
  "WalletStampOverviewCompact",
  "CollectionCard",
  "CollectionCardHorizontal",
  "CollectionDetailHeader",
  "WalletHeader",
  "StampInfo",
  "WalletDashboardDetails",
];

Deno.test({
  ...opts,
  name: "bitcoin: amount helpers and market-data components match main's bytes",
  async fn() {
    clientChain.setClientChain(null);
    assertEquals(clientChain.coinUnit(), "BTC");
    assertEquals(clientChain.coinSymbol(), "₿");
    assertEquals(clientChain.showMarketData(), true);
    const cols = ["TOKEN", "PRICE", "VALUE"];
    assertStrictEquals(clientChain.withoutMarketColumns(cols, cols), cols);
    assertEquals(
      clientChain.blockExplorerUrl(TIP.block_hash),
      `https://mempool.space/block/${TIP.block_hash}`,
    );
    assertEquals(await formatAmounts(), amountBaseline.helpers);
    const rendered = await renderAmountComponents();
    assertEquals(Object.keys(rendered), Object.keys(amountBaseline.components));
    for (const [name, html] of Object.entries(rendered)) {
      assertEquals(html, amountBaseline.components[name], name);
    }
  },
});

Deno.test({
  ...opts,
  name: "ecx: amounts say ECX, through the shared helpers",
  async fn() {
    clientChain.setClientChain(ECX_CHAIN);
    try {
      assertEquals(clientChain.coinUnit(), "ECX");
      assertEquals(clientChain.coinSymbol(), "ECX");
      assertEquals(clientChain.coinUnit("bitcoin"), "BTC");
      assertEquals(fmt.formatBTCAmount(0.5), "0.5 ECX");
      assertEquals(fmt.formatSatoshisToBTC(150_000_000), "1.5 ECX");
      assertEquals(fmt.formatBTC(0.5, { includeSymbol: true }), "0.5 ECX");
      assertEquals(fmt.formatBTCAmount(1, { unit: "BTC" }), "1 BTC");
      // Only the unit changes: every helper output is Bitcoin's with ECX.
      const helpers = await formatAmounts();
      for (const [k, btc] of Object.entries(amountBaseline.helpers)) {
        assertEquals(helpers[k], (btc as string).replace(/ BTC$/, " ECX"), k);
      }

      const html = await renderAmountComponents();
      for (const name of AMOUNT_CASES) {
        assert(html[name].includes("ECX"), `${name} shows no ECX amount`);
        assert(
          BTC_UNIT.test(amountBaseline.components[name]),
          `${name}: Bitcoin baseline shows no BTC, test is vacuous`,
        );
      }
      for (const [name, out] of Object.entries(html)) {
        assert(!BTC_UNIT.test(out), `${name} still says BTC or ₿`);
      }
      assert(html.StatPrice.includes('<span class="font-light">ECX</span>'));
      assert(html.FeeCalculatorStampBuy.includes(">ECX</span>"));
      assert(html.RangeSliderDualPrice.includes(" ECX"));
      assert(html["StampCard.cardVerticalDetail"].includes('aria-label="ECX"'));
    } finally {
      clientChain.setClientChain(null);
    }
  },
});

Deno.test({
  ...opts,
  name: "ecx: market data and USD values are absent, the rest stays",
  async fn() {
    clientChain.setClientChain(ECX_CHAIN);
    try {
      assertEquals(clientChain.showMarketData(), false);
      const cols = ["TOKEN", "PRICE", "CHANGE", "VOLUME", "MARKETCAP", "VALUE"];
      assertEquals(clientChain.withoutMarketColumns(cols, cols), ["TOKEN"]);
      const html = await renderAmountComponents();
      for (const name of MARKET_CASES) {
        assert(
          MARKET.some((re) => re.test(amountBaseline.components[name])),
          `${name}: Bitcoin baseline shows no market data, test is vacuous`,
        );
      }
      for (const [name, out] of Object.entries(html)) {
        for (const re of MARKET) {
          // The dashboard's dispenser card totals price x escrow: an on-chain
          // amount labelled VALUE, not a market valuation.
          if (name === "WalletDashboardContent" && String(re) === "/>VALUE</") {
            continue;
          }
          assert(!re.test(out), `${name} still renders ${re}`);
        }
      }
      // The non-market columns and data stay.
      const ths = (s: string) =>
        [...s.matchAll(/<th[^>]*>(?:<span[^>]*>)?([A-Z #]+)/g)].map((m) =>
          m[1].trim()
        );
      assertEquals(ths(html.SRC20Overview), [
        "TOKEN",
        "HOLDERS",
        "CREATOR",
        "DEPLOY",
        "TRADE",
      ]);
      assertEquals(ths(html.WalletSRC20Overview), [
        "TOKEN",
        "CREATOR",
        "SUPPLY",
        "BALANCE",
      ]);
      assertEquals(ths(html.WalletStampOverview), [
        "IMAGE",
        "STAMP #",
        "CPID",
        "CREATOR",
        "BALANCE",
      ]);
      assertEquals(
        (html.SRC20Overview.match(/<col /g) ?? []).length,
        5,
        "colgroup follows the headers",
      );
      assert(html.SRC20DetailHeader.includes("SUPPLY"));
      assert(html.CollectionDetailHeader.includes("HOLDERS"));
      assert(html.WalletHeader.includes("0.01234"));
      assert(html.BlockchainStats.includes("TX FEES"));
    } finally {
      clientChain.setClientChain(null);
    }
  },
});

Deno.test({
  ...opts,
  name: "ecx: explorer links default to explorer.ecash.ninja with its paths",
  async fn() {
    const info = label.getClientChainInfo("ecx", { get: () => undefined });
    assertEquals(info, ECX_CHAIN);
    clientChain.setClientChain(info);
    try {
      assertEquals(clientChain.txExplorerUrl(TX), `${ECX_EXPLORER}/tx/${TX}`);
      assertEquals(
        clientChain.txExplorerUrl(TX, "blockchain.com"),
        `${ECX_EXPLORER}/tx/${TX}`,
      );
      assertEquals(
        clientChain.addressExplorerUrl(ADDR),
        `${ECX_EXPLORER}/address/${ADDR}`,
      );
      assertEquals(
        clientChain.blockExplorerUrl(TIP.block_hash),
        `${ECX_EXPLORER}/block/${TIP.block_hash}`,
      );
      assertEquals(
        clientChain.blockExplorerUrl(973_800),
        `${ECX_EXPLORER}/block/973800`,
      );
      assertEquals(clientChain.explorerHomeUrl(), `${ECX_EXPLORER}/`);
      const links = await renderLinks();
      assert(links.StampTransfers.includes(`href="${ECX_EXPLORER}/tx/${TX}"`));
      assert(
        links.StampOverviewRow.includes(`href="${ECX_EXPLORER}/tx/${TX}"`),
      );
      assert(
        links.SalesActivityFeed.includes(
          `href="${ECX_EXPLORER}/address/${ADDR}"`,
        ),
      );
      for (const [name, html] of Object.entries(links)) {
        assert(
          !/mempool\.space|blockchain\.com/.test(html),
          `${name} still links to a Bitcoin explorer`,
        );
      }
    } finally {
      clientChain.setClientChain(null);
    }

    // The banner renders before the Header island, so it takes the chain.
    const banner = (chain: typeof ECX_CHAIN | null) =>
      renderToString(
        h(ChainBanner, {
          label: "ECX",
          height: 973_800,
          blockHash: TIP.block_hash,
          chain,
        }),
      );
    assert(
      banner(ECX_CHAIN).includes(
        `href="${ECX_EXPLORER}/block/${TIP.block_hash}"`,
      ),
    );
    assert(
      !banner({ CHAIN: "ecx", EXPLORER_BASE_URL: "" } as any).includes(
        "href=",
      ),
    );
    assert(banner(null).includes(`>${TIP.block_hash}</span>`));
  },
});
