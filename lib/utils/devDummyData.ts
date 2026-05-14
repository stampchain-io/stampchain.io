/* ===== DUMMY DATA FOR NO-DB DEVELOPMENT ===== */
/*
 * DEV_DUMMY_MODE (default: false)
 *   false → dummy data only shows when DB is unreachable (catch/fallback path)
 *   true  → dummy data is always shown, bypassing all DB calls entirely
 *
 * Flip to true when developing UI without a database connection.
 */
export const DEV_DUMMY_MODE = true;

/* ===== BASE STAMP: #4258 ===== */
/*
 * Real stamp data embedded here so no DB call is needed.
 * stamp_url points to the Stampchain CDN (separate from DB — usually still up).
 * stamp_base64 holds the raw PNG for any component that renders it directly.
 */
export const DUMMY_STAMP_ART = {
  stamp: 4258,
  cpid: "A6074625865641549156",
  ident: "STAMP" as const,
  stamp_mimetype: "image/png",
  stamp_url:
    "https://stampchain.io/stamps/6c7ff116f4ac8fe76d763946e9d917ca270f3b95c3b3949a478635fa617324ca.png",
  stamp_base64:
    "iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAMAAAAM7l6QAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADBQTFRFsoRvmWJFpHtkhKG21GsYE2YTlYqHg3Rta1dRdWpliUoovYp1sYBsAQEBAAAA3G4WoGdNfQAAAS5JREFUeNp8kwuShCAMRAMyYICE+992OkFF3artKj/Fo0Mjkca/ovWqh35i1XJIf2DNpUiGSi7yB2vOKkFEQTmLPrEaNFWRfc9rAbpod9VqHLUWVmUJ1C9eHhip+DRDSGDr64XLzkIX7lUyn6s75gPHNu2Yv/BQfrgNo94bE64YY++iO9+i7cAIJNQI9xixt7W2suPPZ6PWcHfMb0xQaJBF39fGgBEktN4mbl6cF2aeuIXJ7bveosEu8BoOVjw+sLVJ6dQOOdbngQLbBMuHvQvrqx0E4wbFzPxyjwEsrmDuF05JOlVXsNq34sm5Vfd2AhWWR6+loZtxU5S6OtHcKanRisOABO3oP0M6P4tu26Y1yKQBATBynrdBx8GT41l9yP8mmtRxmNFR/Rgb4yvAAJBiJf+Le3jDAAAAAElFTkSuQmCC",
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

/* ===== DISPENSER FOR DUMMY STAMP ===== */
export const DUMMY_STAMP_ART_DISPENSER = {
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
export function withDummySaleData<T extends Record<string, any>>(
  stamps: T[],
): T[] {
  return stamps.map((s, i) =>
    (i + 1) % 3 === 0
      ? {
        ...s,
        floorPrice: 0.00042,
        lowestPriceDispenser: DUMMY_STAMP_ART_DISPENSER,
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

/** Home page — feeds StampOverviewGallery + SRC20Gallery panels */
export const DUMMY_LANDING_PAGE = {
  carouselStamps: [],
  stamps_art: [DUMMY_STAMP_ART],
  stamps_posh: [DUMMY_STAMP_ART],
  stamps_src721: [DUMMY_STAMP_ART],
  collectionData: [],
};

/** Stamp overview + Explorer — flat stamps array */
const _overviewStamps = withDummySaleData(
  Array.from({ length: 6 }, () => ({ ...DUMMY_STAMP_ART })),
);
export const DUMMY_STAMP_OVERVIEW_PAGE = {
  data: _overviewStamps,
  pagination: { total: 6, page: 1, totalPages: 1 },
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
  stamp: { ...DUMMY_STAMP_ART, floorPrice: 0.00042 },
  total: 1,
  sends: [],
  dispensers: [DUMMY_STAMP_ART_DISPENSER],
  dispenses: [],
  holders: [],
  vaults: [],
  last_block: 0,
  stamps_recent: withDummySaleData(
    Array.from({ length: 6 }, () => ({ ...DUMMY_STAMP_ART })),
  ),
  lowestPriceDispenser: DUMMY_STAMP_ART_DISPENSER,
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
