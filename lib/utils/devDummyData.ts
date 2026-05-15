/* ===== DUMMY DATA FOR NO-DB DEVELOPMENT ===== */
/*
 * DEV_DUMMY_MODE (default: false)
 *   false → dummy data only shows when DB is unreachable (catch/fallback path)
 *   true  → dummy data is always shown, bypassing all DB calls entirely
 *
 * Flip to true when developing UI without a database connection.
 */
export const DEV_DUMMY_MODE = true;

/* ===== BASE STAMP: #4258 (CLASSIC) ===== */
/*
 * Real stamp data embedded here so no DB call is needed.
 * stamp_url points to the Stampchain CDN (separate from DB — usually still up).
 * stamp_base64 holds the raw PNG for any component that renders it directly.
 */
export const DUMMY_STAMP_CLASSIC = {
  stamp: 4258,
  cpid: "A6074625865641549156",
  ident: "STAMP" as const,
  stamp_mimetype: "image/png",
  stamp_url:
    "https://stampchain.io/stamps/6c7ff116f4ac8fe76d763946e9d917ca270f3b95c3b3949a478635fa617324ca.png",
  stamp_base64:
    "iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAMAAAAM7l6QAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADBQTFRFsoRvmWJFpHtkhKG21GsYE2YTlYqHg3Rta1dRdWpliUoovYp1sYBsAQEBAAAA3G4WoGdNfQAAAS5JREFUeNp8kwuShCAMRAMyYICE+992OkFF3antKj/Fo0Mjkca/ovWqh35i1XJIf2DNpUiGSi7yB2vOKkFEQTmLPrEaNFWRfc9rAbpod9VqHLUWVmUJ1C9eHhip+DRDSGDr64XLzkIX7lUyn6s75gPHNu2Yv/BQfrgNo94bE64YY++iO9+i7cAIJNQI9xixt7W2suPPZ6PWcHfMb0xQaJBF39fGgBEktN4mbl6cF2aeuIXJ7bveosEu8BoOVjw+sLVJ6dQOOdbngQLbBMuHvQvrqx0E4wbFzPxyjwEsrmDuF05JOlVXsNq34sm5Vfd2AhWWR6+loZtxU5S6OtHcKanRisOABO3oP0M6P4tu26Y1yKQBATBynrdBx8GT41l9yP8mmtRxmNFR/Rgb4yvAAJBiJf+Le3jDAAAAAElFTkSuQmCC",
  block_index: 783718,
  tx_hash: "6c7ff116f4ac8fe76d763946e9d917ca270f3b95c3b3949a478635fa617324ca",
  tx_index: 0,
  block_time: new Date("2023-04-10T00:00:00.000Z"),
  creator: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
  creator_name: null,
  supply: 1,
  unbound_quantity: 1,
  divisible: false,
  keyburn: 1,
  locked: 1,
  stamp_hash: "A6074625865641549156",
  file_hash: "",
  file_size_bytes: 420,
  floorPrice: "priceless" as const,
  floorPriceUSD: null,
  marketData: null,
};

/* ===== DISPENSER: #4258 @ 0.00042 BTC ===== */
export const DUMMY_STAMP_CLASSIC_DISPENSER = {
  tx_hash: "aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222",
  source: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
  cpid: "A6074625865641549156",
  give_quantity: 1,
  escrow_quantity: 1,
  satoshirate: 42000, // 0.00042 BTC in satoshis
  status: 0, // 0 = open
  give_remaining: 1,
  oracle_price: null,
  oracle_price_last_updated: null,
};

/* ===== BASE STAMP: KEVINA (POSH) ===== */
/*
 * POSH stamps have a named cpid (not starting with "A") and a negative stamp number.
 * ident stays "STAMP" — it's the cpid format that distinguishes POSH.
 */
export const DUMMY_STAMP_POSH = {
  stamp: -1829,
  cpid: "KEVINA",
  ident: "STAMP" as const,
  stamp_mimetype: "image/png",
  stamp_url:
    "https://stampchain.io/stamps/32257e9db4f9d979f8a5d0a703a630c7056ce5a5cae8cba9f69ea168c0562e39.png",
  stamp_base64:
    "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",
  block_index: 926896,
  tx_hash: "32257e9db4f9d979f8a5d0a703a630c7056ce5a5cae8cba9f69ea168c0562e39",
  tx_index: 0,
  block_time: new Date("2025-12-07T00:00:00.000Z"),
  creator: "bc1qr9nkqgzc6vzxjslqgxck3z480yq85aa98wu3fa",
  creator_name: "sats.btc",
  supply: 104,
  unbound_quantity: 104,
  divisible: false,
  keyburn: null,
  locked: 1,
  stamp_hash: "KEVINA",
  file_hash: "",
  file_size_bytes: 1843, // 1.8 KB
  floorPrice: "priceless" as const,
  floorPriceUSD: null,
  marketData: null,
};

/* ===== DISPENSER: KEVINA @ 0.0069 BTC ===== */
export const DUMMY_STAMP_POSH_DISPENSER = {
  tx_hash: "bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222cccc3333",
  source: "bc1qr9nkqgzc6vzxjslqgxck3z480yq85aa98wu3fa",
  cpid: "KEVINA",
  give_quantity: 1,
  escrow_quantity: 10,
  satoshirate: 690000, // 0.0069 BTC in satoshis
  status: 0, // 0 = open
  give_remaining: 10,
  oracle_price: null,
  oracle_price_last_updated: null,
};

/* ===== BASE STAMP: SRC-721 ===== */
/*
 * SRC-721 stamps are recursive stamps with ident "SRC-721".
 */
export const DUMMY_STAMP_SRC721 = {
  stamp: 1383566,
  cpid: "A863311966656466479",
  ident: "SRC-721" as const,
  stamp_mimetype: "xml/svg",
  stamp_url:
    "https://stampchain.io/stamps/b74313d300902c0cdf88dc101fb8f4c9ab7ad89c978edd30ca4ee7987cccdedd.svg",
  stamp_base64:
    "iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAj0lEQVR4nO3VyQ2AIBQE0OmeUI1l/DamDG4ajXpAkUUMCBzmAAk8diB6mksEA5aalhrAGbvsSrY9RgAWg6NqGAmoD0csTPKSFBw5YN8AXu3xE+gbRB9wtnvMEjCtTpVSW1z1az6BjTG3J/yoz/ZkshaYzR8u8cBa685mzG5gWL9Q+zNmAii/hSWw3YBlX+oFrQtX5n6ExHgAAAAASUVORK5CYII=",
  block_index: 933541,
  tx_hash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
  tx_index: 0,
  block_time: new Date("2023-06-01T00:00:00.000Z"),
  creator: "bc1qefhvcqwuz6g6qy6nck5dq2el2r37pky73tqxkc",
  creator_name: "Master Onchain",
  supply: 1,
  unbound_quantity: 1,
  divisible: false,
  keyburn: null,
  locked: 1,
  stamp_hash: "A863311966656466479",
  file_hash: "",
  file_size_bytes: 2700,
  floorPrice: "priceless" as const,
  floorPriceUSD: null,
  marketData: null,
};

/* ===== DISPENSER: SRC-721 @ 0.000021 BTC ===== */
export const DUMMY_STAMP_SRC721_DISPENSER = {
  tx_hash: "cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222cccc3333dddd4444",
  source: "bc1qefhvcqwuz6g6qy6nck5dq2el2r37pky73tqxkc",
  cpid: "A863311966656466479",
  give_quantity: 1,
  escrow_quantity: 1,
  satoshirate: 2100, // 0.000021 BTC in satoshis
  status: 0, // 0 = open
  give_remaining: 1,
  oracle_price: null,
  oracle_price_last_updated: null,
};

/* ===== HELPER: reject after ms milliseconds ===== */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`DB timeout after ${ms}ms`)), ms)
    ),
  ]);
}

/* ===== HELPER: mark every 3rd stamp as for sale ===== */
/* Pass a custom dispenser to override the default (e.g. DUMMY_POSH_DISPENSER). */
export function withDummySaleData<T extends Record<string, any>>(
  stamps: T[],
  dispenser: Record<string, any> = DUMMY_STAMP_CLASSIC_DISPENSER,
): T[] {
  return stamps.map((s, i) =>
    (i + 1) % 3 === 0
      ? {
        ...s,
        floorPrice: dispenser.satoshirate / 100000000,
        lowestPriceDispenser: dispenser,
      }
      : s
  );
}

/* ===== BASE TOKEN: KEVIN ===== */
export const DUMMY_TOKEN_SRC20 = {
  p: "SRC-20",
  tick: "KEVIN",
  tick_hash: "kevin0000000000000000000000000000000000000000000000000000000000",
  op: "DEPLOY",
  creator: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
  creator_name: null,
  tx_hash: "kevin1111111111111111111111111111111111111111111111111111111111",
  block_index: 800000,
  block_time: new Date("2024-01-01T00:00:00.000Z"),
  destination: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
  status: "valid",
  row_num: 1,
  fee_rate_sat_vb: null,
  fee: null,
  max: "21000000",
  lim: "100000",
  deci: 18,
  holders: 42069,
  deploy_img: null,
  stamp_url: null,
  market_data: {
    price_btc: 0.0000042,
    market_cap_btc: 88.38,
    volume_24h_btc: 12.5,
    price_change_24h: 6.9,
    source_type: "last_traded" as const,
  },
};

/* ===== PAGE-LEVEL DUMMY SHAPES ===== */

/* Tiny helper — n copies of a base object (each spread so they're distinct) */
const rep = <T extends Record<string, unknown>>(base: T, n: number): T[] =>
  Array.from({ length: n }, () => ({ ...base }));

/* Sale entries cycling [CLASSIC, POSH, SRC721] with staggered time labels */
const _saleBase = [
  {
    stamp: DUMMY_STAMP_CLASSIC,
    dispenser: DUMMY_STAMP_CLASSIC_DISPENSER,
    price: 0.00042,
    sats: 42000,
    buyer: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  },
  {
    stamp: DUMMY_STAMP_POSH,
    dispenser: DUMMY_STAMP_POSH_DISPENSER,
    price: 0.0069,
    sats: 690000,
    buyer: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  },
  {
    stamp: DUMMY_STAMP_SRC721,
    dispenser: DUMMY_STAMP_SRC721_DISPENSER,
    price: 0.000021,
    sats: 2100,
    buyer: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
  },
] as const;

const _timeLabels = [
  "12 min ago",
  "43 min ago",
  "1 hr ago",
  "2 hrs ago",
  "3 hrs ago",
  "5 hrs ago",
  "8 hrs ago",
];

/** Recent Sales — 7 entries cycling CLASSIC → POSH → SRC721, all HOT */
export const DUMMY_RECENT_SALES = _timeLabels.map((timeLabel, i) => {
  const { stamp, dispenser, price, sats, buyer } =
    _saleBase[i % _saleBase.length];
  return {
    ...stamp,
    floorPrice: price,
    activity_level: "HOT" as const,
    last_activity_time: Date.now() - i * 3600000,
    sale_data: {
      btc_amount: price,
      btc_amount_satoshis: sats,
      block_index: stamp.block_index,
      tx_hash: dispenser.tx_hash,
      buyer_address: buyer,
      dispenser_address: stamp.creator,
      dispenser_tx_hash: dispenser.tx_hash,
      time_ago: timeLabel,
    },
  };
});

/**
 * Home page — feeds StampOverviewGallery + SRC20Gallery panels.
 * Counts match the desktop displayCounts in StampOverviewGallery:
 *   stamps_art   → 24 (desktop: 24, 6 cols × 4 rows)
 *   stamps_posh  → 14 (desktop: 14, 7 cols × 2 rows)
 *   stamps_src721→ 12 (desktop: 12, 6 cols × 2 rows)
 * Every 3rd POSH stamp is marked for sale via withDummySaleData.
 */
export const DUMMY_LANDING_PAGE = {
  carouselStamps: [],
  stamps_art: rep(DUMMY_STAMP_CLASSIC, 24),
  stamps_posh: withDummySaleData(
    rep(DUMMY_STAMP_POSH, 14),
    DUMMY_STAMP_POSH_DISPENSER,
  ),
  stamps_src721: rep(DUMMY_STAMP_SRC721, 12),
  collectionData: [],
};

/**
 * Stamp overview — 24 stamps cycling [CLASSIC, POSH, SRC-721] × 8.
 * Every 3rd entry (SRC-721) is marked for sale @ 0.000021 BTC.
 * Tab filtering in the route handler trims this list to the right type.
 * Desktop grid: 6 cols × 4 rows = 24 visible stamps.
 */
const _overviewStamps = withDummySaleData(
  Array.from({ length: 24 }, (_, i) => {
    const bases = [DUMMY_STAMP_CLASSIC, DUMMY_STAMP_POSH, DUMMY_STAMP_SRC721];
    return { ...bases[i % 3] };
  }),
  DUMMY_STAMP_SRC721_DISPENSER,
);
export const DUMMY_STAMP_OVERVIEW_PAGE = {
  data: _overviewStamps,
  pagination: { total: 24, page: 1, totalPages: 1 },
};

/** SRC-20 overview — paginated token list */
export const DUMMY_TOKEN_OVERVIEW_PAGE = {
  data: [DUMMY_TOKEN_SRC20],
  total: 1,
  page: 1,
  totalPages: 1,
};

/** Stamp detail page */
export const DUMMY_STAMP_DETAIL_PAGE = {
  stamp: { ...DUMMY_STAMP_CLASSIC, floorPrice: 0.00042 },
  total: 1,
  sends: [],
  dispensers: [DUMMY_STAMP_CLASSIC_DISPENSER],
  dispenses: [],
  holders: [],
  vaults: [],
  last_block: 0,
  stamps_recent: withDummySaleData(
    Array.from({ length: 6 }, () => ({ ...DUMMY_STAMP_CLASSIC })),
  ),
  lowestPriceDispenser: DUMMY_STAMP_CLASSIC_DISPENSER,
  collectionInfo: null,
  initialCounts: { dispensers: 1, sales: 0, transfers: 0 },
  url: "",
};

/** SRC-20 token detail page */
export const DUMMY_TOKEN_DETAIL_PAGE = {
  deployment: DUMMY_TOKEN_SRC20,
  mint_status: {
    max_supply: 21000000,
    total_minted: 21000000,
    total_mints: 21000,
    progress: "100.00",
    limit: 100000,
    decimals: 18,
  },
  total_holders: 42069,
  total_mints: 21000,
  total_transfers: 8800,
  holders: [],
  last_block: 0,
  highcharts: [],
  initialCounts: { totalTransfers: 8800, totalMints: 21000 },
};
