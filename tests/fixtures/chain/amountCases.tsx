/**
 * Inputs for the amount and market-data cases of the chain labelling tests.
 * bitcoinAmountsBaseline.json was rendered from exactly these inputs by main
 * at 956b9aa08 (before ECX amounts and market-data hiding existed), with
 * CHAIN unset and TZ=UTC, by ./captureBitcoinAmounts.ts.
 *
 * This module imports components by path only and uses no chain helper, so
 * the same file runs against the pre-change code for the capture.
 */
import { h } from "preact";
import { renderToString } from "preact-render-to-string";

const ADDR = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
const TX = "cd".repeat(32);

/* ===== PURE HELPERS ===== */
export async function formatAmounts(): Promise<Record<string, string>> {
  const f = await import("$lib/utils/ui/formatting/formatUtils.ts");
  const out: Record<string, string> = {};
  for (const v of [0, 0.00000546, 0.0012, 0.5, 1.25, 1234.5]) {
    out[`formatBTCAmount(${v})`] = f.formatBTCAmount(v);
    out[`formatBTCAmount(${v},noSymbol)`] = f.formatBTCAmount(v, {
      includeSymbol: false,
    });
    out[`formatBTCAmount(${v},4dp,keepZeros)`] = f.formatBTCAmount(v, {
      decimals: 4,
      stripZeros: false,
    });
    out[`formatBTC(${v})`] = f.formatBTC(v);
    out[`formatBTC(${v},symbol)`] = f.formatBTC(v, { includeSymbol: true });
    out[`formatMarketCap(${v})`] = f.formatMarketCap(v);
  }
  for (const s of [0, 546, 120000, 150000000, 0.5]) {
    out[`formatSatoshisToBTC(${s})`] = f.formatSatoshisToBTC(s);
    out[`formatSatoshisToBTC(${s},noSymbol)`] = f.formatSatoshisToBTC(s, {
      includeSymbol: false,
    });
    out[`formatSatoshisToUSD(${s})`] = f.formatSatoshisToUSD(s, 65000);
  }
  out["formatBTC(null)"] = f.formatBTC(null);
  return out;
}

/* ===== COMPONENT INPUTS ===== */
const marketStamp: any = {
  stamp: 4258,
  cpid: "A4258",
  tx_hash: TX,
  block_index: 973800,
  creator: ADDR,
  creator_name: null,
  supply: 100,
  divisible: false,
  locked: 1,
  ident: "STAMP",
  stamp_mimetype: "image/png",
  stamp_url: "",
  file_size_bytes: 1024,
  block_time: "2026-10-27T12:00:00Z",
  balance: 2,
  floorPrice: 0.0042,
  marketData: {
    floorPriceBTC: 0.0042,
    recentSalePriceBTC: 0.0039,
    activityLevel: "WARM",
  },
  market_data: {
    floor_price_btc: 0.0042,
    floor_price_usd: 273,
    recent_sale_price_usd: 253.5,
    wallet_value_btc: 0.0084,
    market_cap_btc: 0.42,
  },
};
const saleStamp: any = {
  ...marketStamp,
  sale_data: {
    tx_hash: TX,
    buyer_address: ADDR,
    dispenser_address: ADDR,
    block_index: 973800,
    btc_amount: 0.0039,
    usd_price: 253.5,
    time_ago: "1m",
  },
};
const listedStamp: any = {
  ...marketStamp,
  marketData: { ...marketStamp.marketData, openDispensersCount: 2 },
};
const src20Row: any = {
  tx_hash: TX,
  block_index: 973800,
  tick: "KEVIN",
  op: "DEPLOY",
  p: "SRC-20",
  amt: "12500",
  max: "1000000",
  lim: "1000",
  deci: 18,
  creator: ADDR,
  creator_name: null,
  destination: ADDR,
  block_time: "2026-10-27T12:00:00Z",
  holders: 321,
  progress: "100",
  market_data: {
    price_btc: 0.00000123,
    floor_price_btc: 0.0000012,
    market_cap_btc: 1.23,
    volume_24h_btc: 0.0456,
    change_24h_percent: 4.2,
    holder_count: 321,
    price_source_type: "last_traded",
  },
};
const collection: any = {
  collection_id: "C1",
  collection_name: "KEVIN",
  collection_description: "Kevin",
  creators: [ADDR],
  creator_names: [],
  stamp_count: 21,
  total_editions: 21,
  stamps: [4258],
  img: "",
  first_stamp_image: "",
  marketData: {
    floorPriceBTC: 0.05,
    avgPriceBTC: 0.07,
    totalValueBTC: 2.1,
    volume24hBTC: 0.3,
    volume7dBTC: 1.1,
    volume30dBTC: 3.3,
    totalVolumeBTC: 30.5,
    marketCapBTC: 1.05,
    holderCount: 12,
    uniqueHolderCount: 12,
    listedStamps: 3,
    soldStamps24h: 1,
  },
};
const walletData: any = {
  address: ADDR,
  balance: 0.01234,
  usdValue: 802.1,
  btcPrice: 65000,
  fee: 0,
  txCount: 3,
  unconfirmedBalance: 0,
  unconfirmedTxCount: 0,
  stampValue: 0.0084,
  src20Value: 0.015,
  dispensers: { open: 1, closed: 0, total: 1, items: [] },
  src101: { names: [] },
};
const feeDetails = {
  minerFee: 1234,
  serviceFee: 1000,
  dustValue: 546,
  itemPrice: 420000,
  totalValue: 422780,
  hasExactFees: true,
};

const dispenser: any = {
  tx_hash: TX,
  source: ADDR,
  origin: ADDR,
  cpid: "A4258",
  give_quantity: 1,
  give_remaining: 3,
  escrow_quantity: 5,
  satoshirate: 420000,
  btcrate: 0.0042,
  status: "open",
  block_index: 973800,
  close_block_index: null,
  confirmed: true,
};

type Case = [string, string, string, unknown];
const COMPONENT_CASES: Case[] = [
  ["StatPrice", "../../../components/layout/StatStyles.tsx", "StatPrice", {
    priceBTC: "0.0042",
    priceUSD: "273.00",
  }],
  [
    "StatPriceActivity",
    "../../../components/layout/StatStyles.tsx",
    "StatPrice",
    { priceBTC: "0.0042", priceUSD: "273.00", activityLevel: "HOT" },
  ],
  [
    "StatPriceNoUsd",
    "../../../components/layout/StatStyles.tsx",
    "StatPrice",
    { priceBTC: "0.0084", align: "right" },
  ],
  [
    "FeeCalculatorStampBuy",
    "../../../islands/section/FeeCalculatorBase.tsx",
    "FeeCalculatorBase",
    {
      fee: 5,
      handleChangeFee: () => {},
      BTCPrice: 65000,
      fromPage: "stamp_buy",
      edition: 1,
      feeDetails,
      buttonName: "BUY",
      onSubmit: () => {},
      onCancel: () => {},
    },
  ],
  [
    "FeeCalculatorDonate",
    "../../../islands/section/FeeCalculatorBase.tsx",
    "FeeCalculatorBase",
    {
      fee: 5,
      handleChangeFee: () => {},
      BTCPrice: 65000,
      fromPage: "donate",
      receive: 10,
      feeDetails,
      buttonName: "DONATE",
      onSubmit: () => {},
      onCancel: () => {},
    },
  ],
  [
    "BlockchainStats",
    "../../../islands/section/BlockchainStats.tsx",
    "BlockchainStats",
    {},
  ],
  ...[
    "cardVerticalListing",
    "cardHorizontalListing",
    "cardHorizontalListingCompact",
    "cardVerticalDetail",
  ].map((variant): Case => [
    `StampCard.${variant}`,
    "../../../islands/card/StampCard.tsx",
    "StampCard",
    { stamp: listedStamp, variant },
  ]),
  ["StampCard.recentSale", "../../../islands/card/StampCard.tsx", "StampCard", {
    stamp: saleStamp,
    isRecentSale: true,
    variant: "cardVerticalSale",
  }],
  [
    "SRC20Overview",
    "../../../components/table/src20OverviewTable/SRC20Overview.tsx",
    "SRC20Overview",
    { data: [src20Row], timeframe: "24H" },
  ],
  [
    "SRC20OverviewCompact",
    "../../../components/table/src20OverviewTable/SRC20OverviewCompact.tsx",
    "SRC20OverviewCompact",
    { data: [src20Row], timeframe: "24H" },
  ],
  [
    "SRC20DetailHeader",
    "../../../islands/header/SRC20DetailHeader.tsx",
    "SRC20DetailHeader",
    {
      deployment: src20Row,
      marketInfo: {
        floor_price_btc: 0.0000012,
        volume_24h_btc: 0.0456,
        market_cap_btc: 1.23,
        change_24h: 4.2,
        holder_count: 321,
      },
      _mintStatus: { progress: "100", total_minted: "1000000", total_mints: 1000 },
    },
  ],
  ["SRC20CardHorizontal", "../../../islands/card/SRC20Card.tsx", "SRC20Card", {
    src20: src20Row,
    variant: "cardHorizontal",
  }],
  ["SRC20CardVertical", "../../../islands/card/SRC20Card.tsx", "SRC20Card", {
    src20: src20Row,
  }],
  ...["cardSquareBalance", "cardVerticalBalance"].map((variant): Case => [
    `SRC20Card.${variant}`,
    "../../../islands/card/SRC20Card.tsx",
    "SRC20Card",
    { src20: src20Row, variant },
  ]),
  [
    "WalletSRC20Overview",
    "../../../components/table/walletTable/WalletSRC20Overview.tsx",
    "WalletSRC20OverviewTable",
    { src20s: [src20Row] },
  ],
  [
    "WalletSRC20OverviewCompact",
    "../../../components/table/walletTable/WalletSRC20OverviewCompact.tsx",
    "WalletSRC20OverviewTableCompact",
    { src20s: [src20Row] },
  ],
  [
    "WalletStampOverview",
    "../../../components/table/walletTable/WalletStampOverview.tsx",
    "WalletStampOverviewTable",
    { stamps: [marketStamp] },
  ],
  [
    "WalletStampOverviewCompact",
    "../../../components/table/walletTable/WalletStampOverviewCompact.tsx",
    "WalletStampOverviewTableCompact",
    { stamps: [marketStamp] },
  ],
  ["CollectionCard", "../../../components/card/CollectionCard.tsx", "CollectionCard", {
    collection,
  }],
  [
    "CollectionCardHorizontal",
    "../../../components/card/CollectionCard.tsx",
    "CollectionCardHorizontal",
    { collection },
  ],
  [
    "CollectionDetailHeader",
    "../../../islands/header/CollectionDetailHeader.tsx",
    "CollectionDetailHeader",
    { collection, stamps: [marketStamp] },
  ],
  ["WalletHeader", "../../../islands/header/WalletHeader.tsx", "default", {
    walletData,
    stampsTotal: 3,
    src20Total: 1,
    stampsCreated: 1,
    setShowItem: () => {},
  }],
  [
    "RangeSliderDualPrice",
    "../../../islands/button/RangeSliderDual.tsx",
    "RangeSliderDual",
    { variant: "price", initialMin: 0.001, initialMax: 0.5 },
  ],
  [
    "StampSalesDetail",
    "../../../components/table/stampDetailsTable/StampSales.tsx",
    "StampSalesTable",
    {
      dispenses: [{
        source: ADDR,
        destination: ADDR,
        dispense_quantity: 1,
        satoshirate: 420000,
        btc_amount: 0.0042,
        tx_hash: TX,
        block_index: 973800,
        block_time: "2026-10-27T12:00:00Z",
      }],
    },
  ],
  [
    "StampListings",
    "../../../components/table/marketplaceTable/StampListings.tsx",
    "StampListingsTable",
    { stamps: [marketStamp] },
  ],
  [
    "StampListingsOpen",
    "../../../components/table/stampDetailsTable/StampListingsOpen.tsx",
    "StampListingsOpenTable",
    { dispensers: [dispenser], onSelectDispenser: () => {} },
  ],
  [
    "StampInfo",
    "../../../islands/content/stampDetailContent/StampInfo.tsx",
    "StampInfo",
    {
      stamp: { ...marketStamp, dispensers: [dispenser] },
      lowestPriceDispenser: dispenser,
      btcPriceUSD: 65000,
      collectionInfo: null,
    },
  ],
  [
    "WalletDashboardDetails",
    "../../../islands/content/WalletDashboardDetails.tsx",
    "default",
    {
      walletData,
      stampsTotal: 3,
      src20Total: 1,
      stampsCreated: 1,
      setShowItem: () => {},
    },
  ],
  [
    "WalletDashboardContent",
    "../../../islands/content/WalletDashboardContent.tsx",
    "default",
    {
      address: ADDR,
      stamps: { data: [], pagination: { page: 1, totalPages: 1, total: 0 } },
      src20: { data: [], pagination: { page: 1, totalPages: 1, total: 0 } },
      dispensers: {
        data: [{ ...dispenser, stamp: marketStamp }],
        pagination: { page: 1, totalPages: 1, total: 1 },
      },
    },
  ],
];

export async function renderAmountComponents(): Promise<
  Record<string, string>
> {
  const out: Record<string, string> = {};
  for (const [name, mod, exp, props] of COMPONENT_CASES) {
    const m = await import(mod);
    out[name] = renderToString(h(m[exp], props as any));
  }
  return out;
}
