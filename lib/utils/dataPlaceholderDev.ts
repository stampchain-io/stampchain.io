/* ===== DEV-ONLY PREVIEW DATASET ===== */
/*
 * This file is loaded ONLY via dynamic `await import(...)` from route
 * handlers, gated behind the `DATA_PLACEHOLDER_DEV` flag exported from
 * `dataPlaceholderProd.ts`. Never import this file statically — that would
 * pull the whole dataset (including base64 images) into every build,
 * defeating the point of the split. `scripts/check-boundary.sh` enforces
 * this at CI time.
 *
 * For the tiny, always-loaded production error/empty-state fallbacks, see
 * `dataPlaceholderProd.ts` instead.
 *
 * ===== ROUTES WITH DUMMY DATA (as of 2026-08-23) =====
 *   /                          routes/index.tsx
 *   /stamp/[id]                routes/stamp/[id].tsx
 *   /marketplace               routes/marketplace/index.tsx
 *   /explorer                  routes/explorer/index.tsx
 *   /src20                     routes/src20/index.tsx
 *   /src20/[tick]              routes/src20/[tick].tsx
 *   /wallet/[address]          routes/wallet/[address].tsx
 *   /dashboard/[address]       routes/dashboard/[address].tsx
 *
 * ===== ROUTES STILL MISSING DUMMY DATA (still hit the DB/API even when
 * DATA_PLACEHOLDER_DEV is true) =====
 *   /collection                routes/collection/index.tsx
 *   /collection/[id]           routes/collection/[id].tsx
 *   /block                     routes/block/index.tsx
 *   /block/[block_index]       routes/block/[block_index].tsx
 *   /upload                    routes/upload/index.tsx
 *   /tool/stamp/create         routes/tool/stamp/create.tsx
 *   /tool/fairmint             routes/tool/fairmint/index.tsx
 *   /tool/src20/[action]       routes/tool/src20/[action].tsx (only when
 *                               `?tick=` is set — mint/deploy/transfer forms
 *                               otherwise work fine without a DB call)
 *
 * When adding dummy data for one of the routes above, follow the pattern
 * used by the wallet/dashboard routes: export a small set of static
 * fixtures here, add a `getDummy*Page()` assembler function, then gate a
 * dynamic `await import(...)` behind `DATA_PLACEHOLDER_DEV` in the route's
 * handler (before the real DB/service calls).
 */

/* ===== BASE STAMP: #4258 (CLASSIC) ===== */
/*
 * Real stamp data embedded here so no DB call is needed.
 * stamp_url points to the Stampchain CDN (separate from DB — usually still up).
 * stamp_base64 holds the raw PNG for any component that renders it directly.
 */
export const DATA_PLACEHOLDER_DEV_STAMP_CLASSIC = {
  stamp: 4258,
  cpid: "A6074625865641549156",
  ident: "STAMP" as const,
  stamp_mimetype: "image/png",
  stamp_url:
    "https://stampchain.io/stamps/6c7ff116f4ac8fe76d763946e9d917ca270f3b95c3b3949a478635fa617324ca.png",
  stamp_base64:
    "iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAMAAAAM7l6QAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAADBQTFRFsoRvmWJFpHtkhKG21GsYE2YTlYqHg3Rta1dRdWpliUoovYp1sYBsAQEBAAAA3G4WoGdNfQAAAS5JREFUeNp8kwuShCAMRAMyYICE+992OkFF3antKj/Fo0Mjkca/ovWqh35i1XJIf2DNpUiGSi7yB2vOKkFEQTmLPrEaNFWRfc9rAbpod9VqHLUWVmUJ1C9eHhip+DRDSGDr64XLzkIX7lUyn6s75gPHNu2Yv/BQfrgNo94bE64YY++iO9+i7cAIJNQI9xixt7W2suPPZ6PWcHfMb0xQaJBF39fGgBEktN4mbl6cF2aeuIXJ7bveosEu8BoOVjw+sLVJ6dQOOdbngQLbBMuHvQvrqx0E4wbFzPxyjwEsrmDuF05JOlVXsNq34sm5Vfd2AhWWR6+loZtxU5S6OtHcKanRisOABO3oP0M6P4tu26Y1yKQBATBynrdBx8GT41l9yP8mmtRxmNFR/Rgb4yvAAJBiJf+Le3jDAAAAAElFTkSuQmCC",
  block_index: 826000,
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
  marketData: null,
};

/* ===== DISPENSER: #4258 @ 0.00042 BTC ===== */
export const DATA_PLACEHOLDER_DEV_STAMP_CLASSIC_DISPENSER = {
  tx_hash: "aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222",
  source: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
  origin: "bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h",
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
export const DATA_PLACEHOLDER_DEV_STAMP_POSH = {
  stamp: -1829,
  cpid: "KEVINA",
  ident: "STAMP" as const,
  stamp_mimetype: "image/jpeg",
  stamp_url:
    "https://stampchain.io/stamps/32257e9db4f9d979f8a5d0a703a630c7056ce5a5cae8cba9f69ea168c0562e39.png",
  stamp_base64:
    "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",
  block_index: 813000,
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
  marketData: null,
};

/* ===== DISPENSER: KEVINA @ 0.0069 BTC ===== */
export const DATA_PLACEHOLDER_DEV_STAMP_POSH_DISPENSER = {
  tx_hash: "bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222cccc3333",
  source: "bc1qr9nkqgzc6vzxjslqgxck3z480yq85aa98wu3fa",
  origin: "1BpEi6DfDAUFd153wiGrvkiKW1BCTe4pEc",
  cpid: "KEVINA",
  give_quantity: 1,
  escrow_quantity: 10,
  satoshirate: 690000, // 0.0069 BTC in satoshis
  status: 0, // 0 = open
  give_remaining: 10,
  oracle_price: null,
  oracle_price_last_updated: null,
};

/* ===== DISPENSER: KEVINA @ 0.0085 BTC (2nd listing for detail page) ===== */
export const DATA_PLACEHOLDER_DEV_STAMP_POSH_DISPENSER_2 = {
  tx_hash: "dddd4444eeee5555ffff6666aaaa1111bbbb2222cccc3333dddd4444eeee5555",
  source: "1BpEi6DfDAUFd153wiGrvkiKW1BCTe4pEc",
  origin: "bc1qr9nkqgzc6vzxjslqgxck3z480yq85aa98wu3fa",
  cpid: "KEVINA",
  give_quantity: 1,
  escrow_quantity: 5,
  satoshirate: 850000, // 0.0085 BTC in satoshis
  status: 0, // 0 = open
  give_remaining: 5,
  oracle_price: null,
  oracle_price_last_updated: null,
};

/* ===== BASE STAMP: SRC-721 ===== */
/*
 * SRC-721 stamps are recursive stamps with ident "SRC-721".
 */
export const DATA_PLACEHOLDER_DEV_STAMP_SRC721 = {
  stamp: 1383566,
  cpid: "A863311966656466479",
  ident: "SRC-721" as const,
  stamp_mimetype: "xml/svg",
  stamp_url:
    "https://stampchain.io/stamps/b74313d300902c0cdf88dc101fb8f4c9ab7ad89c978edd30ca4ee7987cccdedd.svg",
  stamp_base64:
    "iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAj0lEQVR4nO3VyQ2AIBQE0OmeUI1l/DamDG4ajXpAkUUMCBzmAAk8diB6mksEA5aalhrAGbvsSrY9RgAWg6NqGAmoD0csTPKSFBw5YN8AXu3xE+gbRB9wtnvMEjCtTpVSW1z1az6BjTG3J/yoz/ZkshaYzR8u8cBa685mzG5gWL9Q+zNmAii/hSWw3YBlX+oFrQtX5n6ExHgAAAAASUVORK5CYII=",
  block_index: 839000,
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
  marketData: null,
};

/* ===== DISPENSER: SRC-721 @ 0.000021 BTC ===== */
export const DATA_PLACEHOLDER_DEV_STAMP_SRC721_DISPENSER = {
  tx_hash: "cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222cccc3333dddd4444",
  source: "bc1qefhvcqwuz6g6qy6nck5dq2el2r37pky73tqxkc",
  origin: "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf4a",
  cpid: "A863311966656466479",
  give_quantity: 1,
  escrow_quantity: 1,
  satoshirate: 2100, // 0.000021 BTC in satoshis
  status: 0, // 0 = open
  give_remaining: 1,
  oracle_price: null,
  oracle_price_last_updated: null,
};

/* Approximate BTC/USD rate used throughout dummy data */
const _BTC_PRICE_USD = 62_000;

/* 6-entry cycle: each type once without price, once with listing price */
const _stampBases = [
  DATA_PLACEHOLDER_DEV_STAMP_CLASSIC,
  {
    ...DATA_PLACEHOLDER_DEV_STAMP_CLASSIC,
    floorPrice: 0.00042,
    marketData: { floorPriceBTC: 0.00042, recentSalePriceBTC: null },
    // v2.3 API shape: StampCard reads USD prices from `market_data`
    // (snake_case) — there is no root-level fallback anymore.
    market_data: { floor_price_usd: 0.00042 * _BTC_PRICE_USD },
    lowestPriceDispenser: DATA_PLACEHOLDER_DEV_STAMP_CLASSIC_DISPENSER,
  },
  DATA_PLACEHOLDER_DEV_STAMP_POSH,
  {
    ...DATA_PLACEHOLDER_DEV_STAMP_POSH,
    floorPrice: 0.0069,
    marketData: { floorPriceBTC: 0.0069, recentSalePriceBTC: null },
    market_data: { floor_price_usd: 0.0069 * _BTC_PRICE_USD },
    lowestPriceDispenser: DATA_PLACEHOLDER_DEV_STAMP_POSH_DISPENSER,
  },
  DATA_PLACEHOLDER_DEV_STAMP_SRC721,
  {
    ...DATA_PLACEHOLDER_DEV_STAMP_SRC721,
    floorPrice: 0.000021,
    marketData: { floorPriceBTC: 0.000021, recentSalePriceBTC: null },
    market_data: { floor_price_usd: 0.000021 * _BTC_PRICE_USD },
    lowestPriceDispenser: DATA_PLACEHOLDER_DEV_STAMP_SRC721_DISPENSER,
  },
];

/* ===== HELPER: mark every 3rd stamp as listed (listings view) ===== */
/* Pass a custom dispenser to override the default (e.g. DATA_PLACEHOLDER_DEV_POSH_DISPENSER). */
export function withDummyListingsData<T extends Record<string, any>>(
  stamps: T[],
  dispenser: Record<string, any> = DATA_PLACEHOLDER_DEV_STAMP_CLASSIC_DISPENSER,
): T[] {
  return stamps.map((s, i) =>
    (i + 1) % 3 === 0
      ? {
        ...s,
        floorPrice: dispenser.satoshirate / 100000000,
        marketData: {
          floorPriceBTC: dispenser.satoshirate / 100000000,
          recentSalePriceBTC: null,
        },
        // v2.3 API shape: StampCard reads USD prices from `market_data`
        // (snake_case) — there is no root-level fallback anymore.
        market_data: {
          floor_price_usd: (dispenser.satoshirate / 100000000) *
            _BTC_PRICE_USD,
        },
        lowestPriceDispenser: dispenser,
      }
      : s
  );
}

/* ===== HELPER: add stub sale_data to every stamp (sales view) ===== */
export function withDummySalesData<T extends Record<string, any>>(
  stamps: T[],
): T[] {
  const BTC_AMOUNT = 0.00069;
  return stamps.map((s) => {
    const btcAmount = (s as any).sale_data?.btc_amount ?? BTC_AMOUNT;
    return {
      ...s,
      // v2.3 API shape: StampCard's sale card reads the USD sale price from
      // `market_data.recent_sale_price_usd` (snake_case) — there is no
      // root-level fallback anymore.
      market_data: {
        ...(s as any).market_data,
        recent_sale_price_usd: (s as any).market_data
          ?.recent_sale_price_usd ?? btcAmount * _BTC_PRICE_USD,
      },
      sale_data: (s as any).sale_data ?? {
        btc_amount: BTC_AMOUNT,
        block_index: 958500,
        tx_hash: (s as any).tx_hash,
        dispenser_address: (s as any).creator,
        buyer_address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf0Na",
        sale_time: Math.floor((Date.now() - 4 * 3_600_000) / 1000), // 4 hours ago
        time_ago: "2h ago",
        dispense_quantity: 1,
      },
    };
  });
}

/* ===== HELPER: add cycling activity levels to any stamp array ===== */
const _ACTIVITY_CYCLE = ["HOT", "WARM", "COOL", "DORMANT", "COLD"] as const;

/**
 * Applies cycling activity levels and a staggered last_activity_time.
 * Pass a custom `levels` array to restrict which levels are cycled.
 * Note: activity_level reflects sales recency only, not dispenser state —
 * a stamp can be "COLD" (no sales yet) while still having an open dispenser,
 * so listings views should NOT exclude "COLD" from the cycle.
 */
export function withDummyActivityLevels<T extends Record<string, unknown>>(
  stamps: T[],
  levels: readonly string[] = _ACTIVITY_CYCLE,
): T[] {
  return stamps.map((s, i) => ({
    ...s,
    activity_level: levels[i % levels.length],
    last_activity_time: Date.now() - i * 3_600_000,
  }));
}

/* ===== HELPER: Fisher-Yates shuffle (runs once at module load) ===== */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ===== SRC-20 TOKENS ===== */

/* ----- KEVIN: fully minted, active market ----- */
export const DATA_PLACEHOLDER_DEV_TOKEN_KEVIN = {
  p: "SRC-20",
  tick: "KEVIN",
  tick_hash: "kevin0000000000000000000000000000000000000000000000000000000000",
  op: "DEPLOY",
  creator: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
  creator_name: null,
  tx_hash: "kevin1111111111111111111111111111111111111111111111111111111111",
  block_index: 800000,
  block_time: new Date("2024-01-15T00:00:00.000Z"),
  destination: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
  status: "valid",
  row_num: 1,
  fee_rate_sat_vb: null,
  fee: null,
  stamp: 1450686,
  max: "21000000",
  lim: "100000",
  deci: 18,
  holders: 42069,
  deploy_img: null,
  stamp_url: null,
  deploy_tx: "kevin1111111111111111111111111111111111111111111111111111111111",
  progress: "100.00",
  top_mints_percentage: null,
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.",
  email: "mailto:hello@kevin-token.example",
  web: "https://kevin-token.example",
  tg: "https://t.me/kevin_token",
  x: "https://x.com/kevin_token",
  mint_progress: {
    max_supply: "21000000",
    total_minted: "21000000",
    limit: "100000",
    total_mints: 21000,
    progress: "100.00",
    decimals: 18,
    tx_hash: "kevin1111111111111111111111111111111111111111111111111111111111",
    tick: "KEVIN",
  },
  market_data: {
    price_btc: 0.0000042,
    change_24h_percent: 6.9,
    volume_24h_btc: 12.5,
    market_cap_btc: 88.38,
    holder_count: 42069,
    source_type: "last_traded" as const,
  },
};

/* ----- STAMP: fully minted, bearish market ----- */
export const DATA_PLACEHOLDER_DEV_TOKEN_STAMP = {
  p: "SRC-20",
  tick: "STAMP",
  tick_hash: "stamp000000000000000000000000000000000000000000000000000000000",
  op: "DEPLOY",
  creator: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
  creator_name: "stamper.btc",
  tx_hash: "stamp111111111111111111111111111111111111111111111111111111111",
  block_index: 810000,
  block_time: new Date("2024-03-01T00:00:00.000Z"),
  destination: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
  status: "valid",
  row_num: 2,
  fee_rate_sat_vb: null,
  fee: null,
  stamp: 1383566,
  max: "100000000",
  lim: "1000000",
  deci: 8,
  holders: 8841,
  deploy_img: null,
  stamp_url: null,
  deploy_tx: "stamp111111111111111111111111111111111111111111111111111111111",
  progress: "100.00",
  top_mints_percentage: null,
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim.",
  email: "mailto:hello@stamp-token.example",
  web: "https://stamp-token.example",
  tg: "https://t.me/stamp_token",
  x: "https://x.com/stamp_token",
  mint_progress: {
    max_supply: "100000000",
    total_minted: "100000000",
    limit: "1000000",
    total_mints: 4200,
    progress: "100.00",
    decimals: 8,
    tx_hash: "stamp111111111111111111111111111111111111111111111111111111111",
    tick: "STAMP",
  },
  market_data: {
    price_btc: 0.00000069,
    change_24h_percent: -3.2,
    volume_24h_btc: 2.1,
    market_cap_btc: 6.9,
    holder_count: 8841,
    source_type: "last_traded" as const,
  },
};

/* ----- PEPE: minting in progress (~72%) ----- */
export const DATA_PLACEHOLDER_DEV_TOKEN_PEPE = {
  p: "SRC-20",
  tick: "PEPE",
  tick_hash: "pepe0000000000000000000000000000000000000000000000000000000000",
  op: "DEPLOY",
  creator: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  creator_name: null,
  tx_hash: "pepe1111111111111111111111111111111111111111111111111111111111",
  block_index: 825000,
  block_time: new Date("2024-06-10T00:00:00.000Z"),
  destination: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  status: "valid",
  row_num: 3,
  fee_rate_sat_vb: null,
  fee: null,
  stamp: 1496420,
  max: "69000000",
  lim: "690000",
  deci: 18,
  holders: 2847,
  deploy_img: null,
  stamp_url: null,
  deploy_tx: "pepe1111111111111111111111111111111111111111111111111111111111",
  progress: "72.00",
  top_mints_percentage: 23.5,
  description:
    "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis.",
  email: "mailto:hello@pepe-token.example",
  web: "https://pepe-token.example",
  tg: "https://t.me/pepe_token",
  x: "https://x.com/pepe_token",
  mint_progress: {
    max_supply: "69000000",
    total_minted: "49680000",
    limit: "690000",
    total_mints: 72,
    progress: "72.00",
    decimals: 18,
    tx_hash: "pepe1111111111111111111111111111111111111111111111111111111111",
    tick: "PEPE",
  },
  market_data: null,
};

/* ----- BOBO: early minting stage (~18%) ----- */
export const DATA_PLACEHOLDER_DEV_TOKEN_BOBO = {
  p: "SRC-20",
  tick: "BOBO",
  tick_hash: "bobo0000000000000000000000000000000000000000000000000000000000",
  op: "DEPLOY",
  creator: "bc1q9d3xa5gg45q2j39szuqn9k7pt3lmnah37mqad5",
  creator_name: null,
  tx_hash: "bobo1111111111111111111111111111111111111111111111111111111111",
  block_index: 840000,
  block_time: new Date("2024-09-20T00:00:00.000Z"),
  destination: "bc1q9d3xa5gg45q2j39szuqn9k7pt3lmnah37mqad5",
  status: "valid",
  row_num: 4,
  fee_rate_sat_vb: null,
  fee: null,
  stamp: 1512345,
  max: "42000000",
  lim: "420000",
  deci: 18,
  holders: 420,
  deploy_img: null,
  stamp_url: null,
  deploy_tx: "bobo1111111111111111111111111111111111111111111111111111111111",
  progress: "18.00",
  top_mints_percentage: 8.2,
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim.",
  email: "mailto:hello@bobo-token.example",
  web: "https://bobo-token.example",
  tg: "https://t.me/bobo_token",
  x: "https://x.com/bobo_token",
  mint_progress: {
    max_supply: "42000000",
    total_minted: "7560000",
    limit: "420000",
    total_mints: 18,
    progress: "18.00",
    decimals: 18,
    tx_hash: "bobo1111111111111111111111111111111111111111111111111111111111",
    tick: "BOBO",
  },
  market_data: null,
};

/* Backward-compat alias — old code that imports DATA_PLACEHOLDER_DEV_TOKEN_SRC20 keeps working */
export const DATA_PLACEHOLDER_DEV_TOKEN_SRC20 =
  DATA_PLACEHOLDER_DEV_TOKEN_KEVIN;

/* ===== SRC-20 TRANSACTION DATA ===== */
/*
 * Shapes match Src20Detail from lib/types/src20.d.ts.
 * block_time is a string here (as the type specifies for detail views).
 * amt uses string representation for serialisation safety.
 */

export const DATA_PLACEHOLDER_DEV_SRC20_DEPLOYS = [
  {
    tx_hash: "kevin1111111111111111111111111111111111111111111111111111111111",
    block_index: 800000,
    p: "SRC-20",
    op: "DEPLOY",
    tick: "KEVIN",
    creator: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
    creator_name: null,
    amt: null,
    deci: 18,
    lim: "100000",
    max: "21000000",
    destination: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
    block_time: "2024-01-15T00:00:00.000Z",
    destination_name: "",
  },
  {
    tx_hash: "stamp111111111111111111111111111111111111111111111111111111111",
    block_index: 810000,
    p: "SRC-20",
    op: "DEPLOY",
    tick: "STAMP",
    creator: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    creator_name: "stamper.btc",
    amt: null,
    deci: 8,
    lim: "10000000",
    max: "100000000",
    destination: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    block_time: "2024-03-01T00:00:00.000Z",
    destination_name: "stamper.btc",
  },
  {
    tx_hash: "pepe1111111111111111111111111111111111111111111111111111111111",
    block_index: 825000,
    p: "SRC-20",
    op: "DEPLOY",
    tick: "PEPE",
    creator: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    creator_name: null,
    amt: null,
    deci: 18,
    lim: "6900000",
    max: "69000000",
    destination: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    block_time: "2024-06-10T00:00:00.000Z",
    destination_name: "",
  },
  {
    tx_hash: "bobo1111111111111111111111111111111111111111111111111111111111",
    block_index: 840000,
    p: "SRC-20",
    op: "DEPLOY",
    tick: "BOBO",
    creator: "bc1q9d3xa5gg45q2j39szuqn9k7pt3lmnah37mqad5",
    creator_name: null,
    amt: null,
    deci: 18,
    lim: "4200000",
    max: "42000000",
    destination: "bc1q9d3xa5gg45q2j39szuqn9k7pt3lmnah37mqad5",
    block_time: "2024-09-20T00:00:00.000Z",
    destination_name: "",
  },
];

export const DATA_PLACEHOLDER_DEV_SRC20_MINTS = [
  {
    tx_hash: "kevinmint111111111111111111111111111111111111111111111111111111",
    block_index: 800100,
    p: "SRC-20",
    op: "MINT",
    tick: "KEVIN",
    creator: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    creator_name: null,
    amt: "100000",
    deci: 18,
    lim: "100000",
    max: "21000000",
    destination: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    block_time: "2024-01-16T04:20:00.000Z",
    destination_name: "",
  },
  {
    tx_hash: "kevinmint222222222222222222222222222222222222222222222222222222",
    block_index: 800420,
    p: "SRC-20",
    op: "MINT",
    tick: "KEVIN",
    creator: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    creator_name: null,
    amt: "100000",
    deci: 18,
    lim: "100000",
    max: "21000000",
    destination: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    block_time: "2024-01-18T10:00:00.000Z",
    destination_name: "",
  },
  {
    tx_hash: "stampmint11111111111111111111111111111111111111111111111111111",
    block_index: 810500,
    p: "SRC-20",
    op: "MINT",
    tick: "STAMP",
    creator: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    creator_name: "stamper.btc",
    amt: "1000000",
    deci: 8,
    lim: "1000000",
    max: "100000000",
    destination: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    block_time: "2024-03-05T08:00:00.000Z",
    destination_name: "stamper.btc",
  },
  {
    tx_hash: "pepemint1111111111111111111111111111111111111111111111111111111",
    block_index: 825100,
    p: "SRC-20",
    op: "MINT",
    tick: "PEPE",
    creator: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    creator_name: "stamper.btc",
    amt: "690000",
    deci: 18,
    lim: "690000",
    max: "69000000",
    destination: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    block_time: "2024-06-11T12:00:00.000Z",
    destination_name: "stamper.btc",
  },
  {
    tx_hash: "pepemint2222222222222222222222222222222222222222222222222222222",
    block_index: 825200,
    p: "SRC-20",
    op: "MINT",
    tick: "PEPE",
    creator: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    creator_name: null,
    amt: "690000",
    deci: 18,
    lim: "690000",
    max: "69000000",
    destination: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    block_time: "2024-06-12T18:00:00.000Z",
    destination_name: "",
  },
  {
    tx_hash: "bobomint1111111111111111111111111111111111111111111111111111111",
    block_index: 840200,
    p: "SRC-20",
    op: "MINT",
    tick: "BOBO",
    creator: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
    creator_name: null,
    amt: "420000",
    deci: 18,
    lim: "420000",
    max: "42000000",
    destination: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
    block_time: "2024-09-21T06:00:00.000Z",
    destination_name: "",
  },
];

export const DATA_PLACEHOLDER_DEV_SRC20_TRANSFERS = [
  {
    tx_hash: "kevintx1111111111111111111111111111111111111111111111111111111",
    block_index: 801000,
    p: "SRC-20",
    op: "TRANSFER",
    tick: "KEVIN",
    creator: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    creator_name: null,
    amt: "50000",
    deci: 18,
    lim: "100000",
    max: "21000000",
    destination: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
    block_time: "2024-02-01T09:00:00.000Z",
    destination_name: "",
  },
  {
    tx_hash: "kevintx2222222222222222222222222222222222222222222222222222222",
    block_index: 805000,
    p: "SRC-20",
    op: "TRANSFER",
    tick: "KEVIN",
    creator: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    creator_name: null,
    amt: "25000",
    deci: 18,
    lim: "100000",
    max: "21000000",
    destination: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    block_time: "2024-02-20T15:30:00.000Z",
    destination_name: "stamper.btc",
  },
  {
    tx_hash: "stamptx1111111111111111111111111111111111111111111111111111111",
    block_index: 812000,
    p: "SRC-20",
    op: "TRANSFER",
    tick: "STAMP",
    creator: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    creator_name: "stamper.btc",
    amt: "500000",
    deci: 8,
    lim: "1000000",
    max: "100000000",
    destination: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    block_time: "2024-03-10T11:00:00.000Z",
    destination_name: "",
  },
  {
    tx_hash: "stamptx2222222222222222222222222222222222222222222222222222222",
    block_index: 820000,
    p: "SRC-20",
    op: "TRANSFER",
    tick: "STAMP",
    creator: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    creator_name: null,
    amt: "200000",
    deci: 8,
    lim: "1000000",
    max: "100000000",
    destination: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
    block_time: "2024-04-05T20:00:00.000Z",
    destination_name: "",
  },
];

/* ===== PAGE-LEVEL DUMMY SHAPES ===== */

/* Sale entries cycling [CLASSIC, POSH, SRC721] with staggered time labels */
const _saleBase = [
  {
    stamp: DATA_PLACEHOLDER_DEV_STAMP_CLASSIC,
    dispenser: DATA_PLACEHOLDER_DEV_STAMP_CLASSIC_DISPENSER,
    price: 0.00042,
    sats: 42000,
    buyer: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  },
  {
    stamp: DATA_PLACEHOLDER_DEV_STAMP_POSH,
    dispenser: DATA_PLACEHOLDER_DEV_STAMP_POSH_DISPENSER,
    price: 0.0069,
    sats: 690000,
    buyer: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  },
  {
    stamp: DATA_PLACEHOLDER_DEV_STAMP_SRC721,
    dispenser: DATA_PLACEHOLDER_DEV_STAMP_SRC721_DISPENSER,
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

/** Recent Sales — 7 entries cycling CLASSIC → POSH → SRC721 with all 5 activity levels */
export const DATA_PLACEHOLDER_DEV_RECENT_SALES = _timeLabels.map(
  (timeLabel, i) => {
    const { stamp, dispenser, price, sats, buyer } =
      _saleBase[i % _saleBase.length];
    return {
      ...stamp,
      activity_level: _ACTIVITY_CYCLE[i % _ACTIVITY_CYCLE.length],
      last_activity_time: Date.now() - i * 3_600_000,
      // v2.3 API shape: StampCard's sale card reads the USD sale price from
      // `market_data.recent_sale_price_usd` (snake_case) — there is no
      // root-level fallback anymore.
      market_data: { recent_sale_price_usd: price * _BTC_PRICE_USD },
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
  },
);

/**
 * New Listings — 10 entries cycling CLASSIC → POSH → SRC721, all currently
 * listed (i.e. carrying an open dispenser + floorPriceBTC) so every card
 * renders with a price and BUY button, matching a real "listings" query.
 * Activity levels cycle through all five states, including "COLD" — a
 * listed stamp can still have zero sales, which is common in production.
 * Count matches the desktop displayCounts in StampListingsGallery:
 *   newListingsData → 10 (desktop: 10, 5 cols × 2 rows)
 */
const _listingBase = [_stampBases[1], _stampBases[3], _stampBases[5]];
export const DATA_PLACEHOLDER_DEV_NEW_LISTINGS = withDummyActivityLevels(
  Array.from(
    { length: 10 },
    (_, i) => ({ ..._listingBase[i % _listingBase.length] }),
  ),
);

/**
 * Home page — feeds StampGalleryHome + SRC20Gallery panels.
 * Counts match the desktop displayCounts in StampGalleryHome:
 *   stamps_art   → 24 (desktop: 24, 6 cols × 4 rows)
 *   stamps_posh  → 14 (desktop: 14, 7 cols × 2 rows)
 *   stamps_src721→ 12 (desktop: 12, 6 cols × 2 rows)
 * Every 3rd POSH stamp is marked for sale via withDummyListingsData.
 */
export const DATA_PLACEHOLDER_DEV_LANDING_PAGE = {
  carouselStamps: [],
  stamps_art: shuffle(
    Array.from(
      { length: 24 },
      (_, i) => ({ ..._stampBases[i % _stampBases.length] }),
    ),
  ),
  stamps_posh: withDummyListingsData(
    Array.from({ length: 14 }, () => ({ ...DATA_PLACEHOLDER_DEV_STAMP_POSH })),
    DATA_PLACEHOLDER_DEV_STAMP_POSH_DISPENSER,
  ),
  stamps_src721: Array.from(
    { length: 12 },
    () => ({ ...DATA_PLACEHOLDER_DEV_STAMP_SRC721 }),
  ),
  collectionData: [],
};

/**
 * Stamp overview — 24 stamps cycling [CLASSIC, POSH, SRC-721] × 8.
 * Every 3rd entry (SRC-721) is marked for sale @ 0.000021 BTC.
 * Desktop grid: 6 cols × 4 rows = 24 visible stamps.
 */
const _overviewStamps = shuffle(
  Array.from(
    { length: 24 },
    (_, i) => ({ ..._stampBases[i % _stampBases.length] }),
  ),
);
export const DATA_PLACEHOLDER_DEV_STAMP_OVERVIEW_PAGE = {
  data: _overviewStamps,
  pagination: { total: 24, page: 1, totalPages: 1 },
};

/**
 * SRC-20 explorer overview — 4 tokens: 2 fully minted (KEVIN, STAMP),
 * 2 still minting (PEPE at 72%, BOBO at 18%).
 * Used in both the explorer page and /src20 overview in dev preview mode.
 */
export const DATA_PLACEHOLDER_DEV_EXPLORER_OVERVIEW_PAGE = {
  data: shuffle([
    /* ===== KEVIN ===== */
    DATA_PLACEHOLDER_DEV_TOKEN_KEVIN,
    {
      ...DATA_PLACEHOLDER_DEV_TOKEN_KEVIN,
      op: "MINT",
      amt: "100000",
      tx_hash:
        "kevin2222222222222222222222222222222222222222222222222222222222",
      block_index: 800100,
      block_time: new Date("2024-01-16T04:20:00.000Z"),
      creator: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      creator_name: null,
      destination: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      destination_name: null,
    },
    {
      ...DATA_PLACEHOLDER_DEV_TOKEN_KEVIN,
      op: "TRANSFER",
      amt: "50000",
      tx_hash:
        "kevin3333333333333333333333333333333333333333333333333333333333",
      block_index: 801000,
      block_time: new Date("2024-02-01T09:00:00.000Z"),
      creator: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      creator_name: null,
      destination: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
      destination_name: null,
    },
    /* ===== STAMP ===== */
    DATA_PLACEHOLDER_DEV_TOKEN_STAMP,
    {
      ...DATA_PLACEHOLDER_DEV_TOKEN_STAMP,
      op: "MINT",
      amt: "1000000",
      tx_hash: "stamp222222222222222222222222222222222222222222222222222222222",
      block_index: 810500,
      block_time: new Date("2024-03-05T08:00:00.000Z"),
      creator: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      creator_name: "stamper.btc",
      destination: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      destination_name: "stamper.btc",
    },
    {
      ...DATA_PLACEHOLDER_DEV_TOKEN_STAMP,
      op: "TRANSFER",
      amt: "500000",
      tx_hash: "stamp333333333333333333333333333333333333333333333333333333333",
      block_index: 812000,
      block_time: new Date("2024-03-10T11:00:00.000Z"),
      creator: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      creator_name: "stamper.btc",
      destination: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      destination_name: null,
    },
    /* ===== PEPE ===== */
    DATA_PLACEHOLDER_DEV_TOKEN_PEPE,
    {
      ...DATA_PLACEHOLDER_DEV_TOKEN_PEPE,
      op: "MINT",
      amt: "690000",
      tx_hash:
        "pepe22222222222222222222222222222222222222222222222222222222222",
      block_index: 825100,
      block_time: new Date("2024-06-11T12:00:00.000Z"),
      creator: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      creator_name: "stamper.btc",
      destination: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      destination_name: "stamper.btc",
    },
    {
      ...DATA_PLACEHOLDER_DEV_TOKEN_PEPE,
      op: "TRANSFER",
      amt: "345000",
      tx_hash:
        "pepe33333333333333333333333333333333333333333333333333333333333",
      block_index: 826000,
      block_time: new Date("2024-06-15T08:00:00.000Z"),
      creator: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      creator_name: "stamper.btc",
      destination: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      destination_name: null,
    },
    /* ===== BOBO ===== */
    DATA_PLACEHOLDER_DEV_TOKEN_BOBO,
    {
      ...DATA_PLACEHOLDER_DEV_TOKEN_BOBO,
      op: "MINT",
      amt: "420000",
      tx_hash:
        "bobo22222222222222222222222222222222222222222222222222222222222",
      block_index: 840200,
      block_time: new Date("2024-09-21T06:00:00.000Z"),
      creator: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
      creator_name: null,
      destination: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
      destination_name: null,
    },
    {
      ...DATA_PLACEHOLDER_DEV_TOKEN_BOBO,
      op: "TRANSFER",
      amt: "210000",
      tx_hash:
        "bobo33333333333333333333333333333333333333333333333333333333333",
      block_index: 841000,
      block_time: new Date("2024-10-01T12:00:00.000Z"),
      creator: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
      creator_name: null,
      destination: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      destination_name: null,
    },
  ]),
  total: 12,
  page: 1,
  totalPages: 1,
};

/** Backward-compat alias — routes/index.tsx and routes/src20/index.tsx keep working */
export const DATA_PLACEHOLDER_DEV_TOKEN_OVERVIEW_PAGE =
  DATA_PLACEHOLDER_DEV_EXPLORER_OVERVIEW_PAGE;

/**
 * Explorer "all" section unified feed — merges the (already filtered)
 * dummy stamps + SRC-20 rows into a single block_index-descending list,
 * mirroring `ExplorerFeedRepository`'s `ORDER BY block_index DESC, tx_index
 * DESC` so the DATA_PLACEHOLDER_DEV preview exercises the same `mixedItems`
 * rendering path as production (see routes/explorer/index.tsx) instead of
 * falling back to ExplorerContent's client-side merge.
 */
export function getDummyExplorerFeedItems(
  stamps: Record<string, unknown>[],
  tokens: Record<string, unknown>[],
): (
  | { kind: "stamp"; item: Record<string, unknown> }
  | { kind: "src20"; item: Record<string, unknown> }
)[] {
  const stampItems = stamps.map((item) => ({ kind: "stamp" as const, item }));
  const tokenItems = tokens.map((item) => ({ kind: "src20" as const, item }));
  return [...stampItems, ...tokenItems].sort((a, b) => {
    const blockDiff = Number(b.item.block_index) - Number(a.item.block_index);
    if (blockDiff !== 0) return blockDiff;
    return Number(b.item.tx_index ?? 0) - Number(a.item.tx_index ?? 0);
  });
}

/**
 * Home page SRC-20 tables — DEPLOY rows only, split by mint status.
 * Matches live filters: onlyFullyMinted vs excludeFullyMinted, limit 5.
 * TOP TICKERS → KEVIN/STAMP; TRENDING MINTS → PEPE/BOBO.
 */
function _repeatToFive<T extends { tx_hash: string }>(rows: T[]): T[] {
  const result: T[] = [];
  for (let i = 0; i < 5; i++) {
    const base = rows[i % rows.length];
    result.push({ ...base, tx_hash: `${base.tx_hash}-dup${i}` });
  }
  return result;
}

const _homeSrc20Minted = _repeatToFive(
  [DATA_PLACEHOLDER_DEV_TOKEN_KEVIN, DATA_PLACEHOLDER_DEV_TOKEN_STAMP].filter(
    (row) => parseFloat(row.progress) >= 100,
  ),
);
const _homeSrc20Minting = _repeatToFive(
  [DATA_PLACEHOLDER_DEV_TOKEN_PEPE, DATA_PLACEHOLDER_DEV_TOKEN_BOBO].filter(
    (row) => parseFloat(row.progress) < 100,
  ),
);

export const DATA_PLACEHOLDER_DEV_HOME_SRC20_MINTED = {
  data: _homeSrc20Minted,
  total: _homeSrc20Minted.length,
  page: 1,
  totalPages: 1,
};

export const DATA_PLACEHOLDER_DEV_HOME_SRC20_MINTING = {
  data: _homeSrc20Minting,
  total: _homeSrc20Minting.length,
  page: 1,
  totalPages: 1,
};

/** Stamp detail page (CLASSIC #4258 — 1 open dispenser) */
export const DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE_CLASSIC = {
  stamp: {
    ...DATA_PLACEHOLDER_DEV_STAMP_CLASSIC,
    floorPrice: 0.00042,
    market_data: { floor_price_usd: 0.00042 * _BTC_PRICE_USD },
    activity_level: "HOT" as const,
  },
  total: 1,
  sends: [],
  dispensers: [DATA_PLACEHOLDER_DEV_STAMP_CLASSIC_DISPENSER],
  dispenses: [],
  holders: [],
  vaults: [],
  last_block: 0,
  stamps_recent: withDummyListingsData(
    Array.from(
      { length: 6 },
      () => ({ ...DATA_PLACEHOLDER_DEV_STAMP_CLASSIC }),
    ),
  ),
  lowestPriceDispenser: DATA_PLACEHOLDER_DEV_STAMP_CLASSIC_DISPENSER,
  collectionInfo: null,
  initialCounts: { dispensers: 1, sales: 0, transfers: 0 },
  url: "",
};

/** Stamp detail page (KEVINA/POSH — 2 open dispensers so listings UI shows) */
export const DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE_POSH = {
  stamp: {
    ...DATA_PLACEHOLDER_DEV_STAMP_POSH,
    floorPrice: 0.0069,
    marketData: {
      floorPriceBTC: 0.0069,
      recentSalePriceBTC: null,
    },
    market_data: { floor_price_usd: 0.0069 * _BTC_PRICE_USD },
    activity_level: "HOT" as const,
  },
  total: 1,
  sends: [],
  dispensers: [
    DATA_PLACEHOLDER_DEV_STAMP_POSH_DISPENSER,
    DATA_PLACEHOLDER_DEV_STAMP_POSH_DISPENSER_2,
  ],
  dispenses: [],
  holders: [],
  vaults: [],
  last_block: 0,
  stamps_recent: withDummyListingsData(
    Array.from({ length: 6 }, () => ({ ...DATA_PLACEHOLDER_DEV_STAMP_POSH })),
    DATA_PLACEHOLDER_DEV_STAMP_POSH_DISPENSER,
  ),
  lowestPriceDispenser: DATA_PLACEHOLDER_DEV_STAMP_POSH_DISPENSER,
  collectionInfo: null,
  initialCounts: { dispensers: 2, sales: 0, transfers: 0 },
  url: "",
};

/** Default dummy detail page (kept for backward-compat imports). */
export const DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE =
  DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE_CLASSIC;

/*
 * Lookup by tx_hash (and stamp number, as a string) so the [id].tsx dev
 * handler can render the dummy page that actually matches the requested
 * stamp instead of always showing the same one regardless of the URL.
 */
const _DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGES_BY_KEY: Record<
  string,
  | typeof DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE_CLASSIC
  | typeof DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE_POSH
> = {
  [DATA_PLACEHOLDER_DEV_STAMP_CLASSIC.tx_hash]:
    DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE_CLASSIC,
  [String(DATA_PLACEHOLDER_DEV_STAMP_CLASSIC.stamp)]:
    DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE_CLASSIC,
  [DATA_PLACEHOLDER_DEV_STAMP_CLASSIC.cpid]:
    DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE_CLASSIC,
  [DATA_PLACEHOLDER_DEV_STAMP_POSH.tx_hash]:
    DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE_POSH,
  [String(DATA_PLACEHOLDER_DEV_STAMP_POSH.stamp)]:
    DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE_POSH,
  [DATA_PLACEHOLDER_DEV_STAMP_POSH.cpid]:
    DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE_POSH,
};

/** Resolve the dummy stamp detail page matching the requested id/tx_hash/cpid. */
export function getDummyStampDetailPage(
  id: string | undefined,
):
  | typeof DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE_CLASSIC
  | typeof DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE_POSH {
  if (id && _DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGES_BY_KEY[id]) {
    return _DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGES_BY_KEY[id];
  }
  return DATA_PLACEHOLDER_DEV_STAMP_DETAIL_PAGE_CLASSIC;
}

/** Holders for KEVIN — fully minted, wide distribution across 8 addresses. */
export const DATA_PLACEHOLDER_DEV_TOKEN_KEVIN_HOLDERS = [
  {
    address: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
    amt: "4200000",
    percentage: "20.00",
  },
  {
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    amt: "3150000",
    percentage: "15.00",
  },
  {
    address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    amt: "2730000",
    percentage: "13.00",
  },
  {
    address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    amt: "2100000",
    percentage: "10.00",
  },
  {
    address: "bc1q9d3xa5gg45q2j39szuqn9k7pt3lmnah37mqad5",
    amt: "1680000",
    percentage: "8.00",
  },
  {
    address: "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
    amt: "1260000",
    percentage: "6.00",
  },
  {
    address: "bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h",
    amt: "840000",
    percentage: "4.00",
  },
  { address: null, amt: "5040000", percentage: "24.00" },
];

/** Holders for PEPE — minting in progress, fewer/smaller holders so far. */
export const DATA_PLACEHOLDER_DEV_TOKEN_PEPE_HOLDERS = [
  {
    address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    amt: "8280000",
    percentage: "16.67",
  },
  {
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    amt: "6900000",
    percentage: "13.89",
  },
  {
    address: "1GZsmqM5PFBytkC81JxcSWDU5QzNwaCs2M",
    amt: "4830000",
    percentage: "9.72",
  },
  {
    address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    amt: "3450000",
    percentage: "6.94",
  },
  {
    address: "bc1q9d3xa5gg45q2j39szuqn9k7pt3lmnah37mqad5",
    amt: "2070000",
    percentage: "4.17",
  },
];

/** SRC-20 token detail page (KEVIN — fully minted, active market) */
export const DATA_PLACEHOLDER_DEV_TOKEN_DETAIL_PAGE_KEVIN = {
  deployment: DATA_PLACEHOLDER_DEV_TOKEN_KEVIN,
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
  total_transfers: 2,
  holders: DATA_PLACEHOLDER_DEV_TOKEN_KEVIN_HOLDERS,
  last_block: 0,
  highcharts: [],
  sends: DATA_PLACEHOLDER_DEV_SRC20_TRANSFERS.filter((t) => t.tick === "KEVIN"),
  mints: DATA_PLACEHOLDER_DEV_SRC20_MINTS.filter((m) => m.tick === "KEVIN"),
  initialCounts: { totalTransfers: 2, totalMints: 21000 },
  marketInfo: {
    tick: "KEVIN",
    floor_price_btc: DATA_PLACEHOLDER_DEV_TOKEN_KEVIN.market_data.price_btc,
    market_cap_btc: DATA_PLACEHOLDER_DEV_TOKEN_KEVIN.market_data.market_cap_btc,
    volume_24h_btc: DATA_PLACEHOLDER_DEV_TOKEN_KEVIN.market_data.volume_24h_btc,
    change_24h: DATA_PLACEHOLDER_DEV_TOKEN_KEVIN.market_data.change_24h_percent,
    stamp_url: null,
    tx_hash: DATA_PLACEHOLDER_DEV_TOKEN_KEVIN.tx_hash,
    holder_count: DATA_PLACEHOLDER_DEV_TOKEN_KEVIN.market_data.holder_count,
  },
};

/** SRC-20 token detail page (PEPE — minting in progress, ~72%) */
export const DATA_PLACEHOLDER_DEV_TOKEN_DETAIL_PAGE_PEPE = {
  deployment: DATA_PLACEHOLDER_DEV_TOKEN_PEPE,
  mint_status: {
    max_supply: 69000000,
    total_minted: 49680000,
    total_mints: 72,
    progress: "72.00",
    limit: 690000,
    decimals: 18,
  },
  total_holders: 2847,
  total_mints: 72,
  total_transfers: 0,
  holders: DATA_PLACEHOLDER_DEV_TOKEN_PEPE_HOLDERS,
  last_block: 0,
  highcharts: [],
  sends: DATA_PLACEHOLDER_DEV_SRC20_TRANSFERS.filter((t) => t.tick === "PEPE"),
  mints: DATA_PLACEHOLDER_DEV_SRC20_MINTS.filter((m) => m.tick === "PEPE"),
  initialCounts: { totalTransfers: 0, totalMints: 72 },
  // Minting tokens have no secondary-market trades yet, so marketInfo is
  // intentionally omitted (matches the header's "N/A"/"0 SATS" fallback).
};

/** Default dummy token detail page (kept for backward-compat imports). */
export const DATA_PLACEHOLDER_DEV_TOKEN_DETAIL_PAGE =
  DATA_PLACEHOLDER_DEV_TOKEN_DETAIL_PAGE_KEVIN;

/*
 * Lookup by tick so the [tick].tsx dev handler can render the dummy page
 * that actually matches the requested token instead of always showing the
 * same one regardless of the URL.
 */
const _DATA_PLACEHOLDER_DEV_TOKEN_DETAIL_PAGES_BY_TICK: Record<
  string,
  | typeof DATA_PLACEHOLDER_DEV_TOKEN_DETAIL_PAGE_KEVIN
  | typeof DATA_PLACEHOLDER_DEV_TOKEN_DETAIL_PAGE_PEPE
> = {
  [DATA_PLACEHOLDER_DEV_TOKEN_KEVIN.tick]:
    DATA_PLACEHOLDER_DEV_TOKEN_DETAIL_PAGE_KEVIN,
  [DATA_PLACEHOLDER_DEV_TOKEN_PEPE.tick]:
    DATA_PLACEHOLDER_DEV_TOKEN_DETAIL_PAGE_PEPE,
};

/** Resolve the dummy token detail page matching the requested tick. */
export function getDummyTokenDetailPage(
  tick: string | undefined,
):
  | typeof DATA_PLACEHOLDER_DEV_TOKEN_DETAIL_PAGE_KEVIN
  | typeof DATA_PLACEHOLDER_DEV_TOKEN_DETAIL_PAGE_PEPE {
  const key = tick?.toUpperCase();
  if (key && _DATA_PLACEHOLDER_DEV_TOKEN_DETAIL_PAGES_BY_TICK[key]) {
    return _DATA_PLACEHOLDER_DEV_TOKEN_DETAIL_PAGES_BY_TICK[key];
  }
  return DATA_PLACEHOLDER_DEV_TOKEN_DETAIL_PAGE_KEVIN;
}

/* ===== WALLET PAGE (routes/wallet/[address].tsx) ===== */

/** Demo address used across all wallet dummy data below. */
export const DATA_PLACEHOLDER_DEV_WALLET_ADDRESS =
  "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

/** "Balance" stamps — 14 stamps cycling [CLASSIC, POSH, SRC-721], each holding a small quantity. */
export const DATA_PLACEHOLDER_DEV_WALLET_STAMPS_BALANCE = Array.from(
  { length: 14 },
  (_, i) => ({
    ..._stampBases[i % _stampBases.length],
    balance: (i % 3) + 1,
  }),
);

/** "Created" stamps — 6 stamps (CLASSIC/SRC-721) authored by this address. */
export const DATA_PLACEHOLDER_DEV_WALLET_STAMPS_CREATED = Array.from(
  { length: 6 },
  (_, i) => ({
    ...(i % 2 === 0
      ? DATA_PLACEHOLDER_DEV_STAMP_CLASSIC
      : DATA_PLACEHOLDER_DEV_STAMP_SRC721),
    balance: 1,
  }),
);

/**
 * "Listings" dispensers — 2 open (CLASSIC, POSH) + 1 closed (SRC-721), each
 * carrying a nested `stamp` (matches `DispenserRow.stamp` from
 * `getDispensersWithStampsByAddress`) so the listings gallery has an image
 * and price to render.
 */
export const DATA_PLACEHOLDER_DEV_WALLET_DISPENSERS = [
  {
    ...DATA_PLACEHOLDER_DEV_STAMP_CLASSIC_DISPENSER,
    btcrate: DATA_PLACEHOLDER_DEV_STAMP_CLASSIC_DISPENSER.satoshirate /
      100000000,
    confirmed: true,
    close_block_index: null,
    status: "open" as const,
    stamp: DATA_PLACEHOLDER_DEV_STAMP_CLASSIC,
  },
  {
    ...DATA_PLACEHOLDER_DEV_STAMP_POSH_DISPENSER,
    btcrate: DATA_PLACEHOLDER_DEV_STAMP_POSH_DISPENSER.satoshirate / 100000000,
    confirmed: true,
    close_block_index: null,
    status: "open" as const,
    stamp: DATA_PLACEHOLDER_DEV_STAMP_POSH,
  },
  {
    ...DATA_PLACEHOLDER_DEV_STAMP_SRC721_DISPENSER,
    give_remaining: 0,
    btcrate: DATA_PLACEHOLDER_DEV_STAMP_SRC721_DISPENSER.satoshirate /
      100000000,
    confirmed: true,
    close_block_index: 841500,
    status: "closed" as const,
    stamp: DATA_PLACEHOLDER_DEV_STAMP_SRC721,
  },
];

/** "Balance" tokens — 4 tokens held by this address, each with an `amt` owned. */
export const DATA_PLACEHOLDER_DEV_WALLET_TOKENS_BALANCE = [
  { ...DATA_PLACEHOLDER_DEV_TOKEN_KEVIN, amt: "250000" },
  { ...DATA_PLACEHOLDER_DEV_TOKEN_STAMP, amt: "1000000" },
  { ...DATA_PLACEHOLDER_DEV_TOKEN_PEPE, amt: "69000" },
  { ...DATA_PLACEHOLDER_DEV_TOKEN_BOBO, amt: "42000" },
];

/** "Created" tokens — 2 of the 4 tokens deployed by this address. */
export const DATA_PLACEHOLDER_DEV_WALLET_TOKENS_CREATED = [
  DATA_PLACEHOLDER_DEV_TOKEN_KEVIN,
  DATA_PLACEHOLDER_DEV_TOKEN_PEPE,
];

/** "Collections" — 1 collection created by this address. */
export const DATA_PLACEHOLDER_DEV_WALLET_COLLECTIONS = [
  {
    collection_id: "dummy-collection-1",
    collection_name: "Dummy Collection",
    collection_description: "A sample collection for UI preview.",
    creators: [DATA_PLACEHOLDER_DEV_WALLET_ADDRESS],
    stamp_count: 6,
    total_editions: 6,
    stamps: [
      DATA_PLACEHOLDER_DEV_STAMP_CLASSIC,
      DATA_PLACEHOLDER_DEV_STAMP_SRC721,
    ],
    img: DATA_PLACEHOLDER_DEV_STAMP_CLASSIC.stamp_url,
  },
];

/** Wallet overview info (top profile card) for the dev preview address. */
export const DATA_PLACEHOLDER_DEV_WALLET_INFO = {
  balance: 0.1337,
  usdValue: 0.1337 * _BTC_PRICE_USD,
  address: DATA_PLACEHOLDER_DEV_WALLET_ADDRESS,
  btcPrice: _BTC_PRICE_USD,
  fee: 0,
  creatorName: "stamper.btc",
  txCount: 128,
  unconfirmedBalance: 0,
  unconfirmedTxCount: 0,
  stampValue: 0.00042 * 5 + 0.0069 * 5 + 0.000021 * 4,
  src20Value: 0.05,
  marketDataStatus: {
    stampsMarketData: "available" as const,
    src20MarketData: "available" as const,
    overallStatus: "full" as const,
  },
  dispensers: { open: 2, closed: 1, total: 3 },
  src101: { names: ["dummy.btc"], total: 1 },
};

/**
 * Assembles the full `WalletProfilePageProps` shape for the wallet page's
 * dev-preview branch — mirrors the real handler's response, but reads from
 * the static arrays above instead of hitting the DB/Counterparty API.
 */
export function getDummyWalletPage(
  address: string,
  params: {
    section: "all" | "stamps" | "tokens";
    tab: "balance" | "created" | "listings" | "collections";
    view: "cardVertical" | "cardSquare" | "cardRow";
    stampsPage: number;
    tokensPage: number;
  },
) {
  const { section, tab, view, stampsPage, tokensPage } = params;
  const tokensTab = tab === "created" ? "created" : "balance";

  let stampsData: Record<string, unknown>[] =
    DATA_PLACEHOLDER_DEV_WALLET_STAMPS_BALANCE;
  if (tab === "created") {
    stampsData = DATA_PLACEHOLDER_DEV_WALLET_STAMPS_CREATED;
  } else if (tab === "listings") {
    stampsData = DATA_PLACEHOLDER_DEV_WALLET_DISPENSERS;
  } else if (tab === "collections") {
    stampsData = DATA_PLACEHOLDER_DEV_WALLET_COLLECTIONS;
  }

  const tokensData = tokensTab === "created"
    ? DATA_PLACEHOLDER_DEV_WALLET_TOKENS_CREATED
    : DATA_PLACEHOLDER_DEV_WALLET_TOKENS_BALANCE;

  return {
    address,
    walletData: { ...DATA_PLACEHOLDER_DEV_WALLET_INFO, address },
    stampsTotal: DATA_PLACEHOLDER_DEV_WALLET_STAMPS_BALANCE.length,
    src20Total: DATA_PLACEHOLDER_DEV_WALLET_TOKENS_BALANCE.length,
    stampsCreated: DATA_PLACEHOLDER_DEV_WALLET_STAMPS_CREATED.length,
    anchor: "",

    section,
    tab,
    view,

    stampsData,
    stampsPagination: {
      page: stampsPage,
      limit: stampsData.length,
      total: stampsData.length,
      totalPages: 1,
    },

    tokensData,
    tokensPagination: {
      page: tokensPage,
      limit: tokensData.length,
      total: tokensData.length,
      totalPages: 1,
    },
  };
}

/* ===== WALLET DASHBOARD PAGE (routes/dashboard/[address].tsx) ===== */
/*
 * Legacy nested `data.data.{stamps,src20,dispensers}` shape — distinct from
 * `getDummyWalletPage` above since this route was never migrated to the
 * flatter per-container response shape.
 */
export function getDummyWalletDashboardPage(
  address: string,
  params: {
    stampsParams: { page: number; limit: number };
    src20Params: { page: number; limit: number };
    dispensersParams: { page: number; limit: number };
    stampsSortBy: "ASC" | "DESC";
    src20SortBy: "ASC" | "DESC";
    dispensersSortBy: "ASC" | "DESC";
  },
) {
  const { stampsParams, src20Params, dispensersParams } = params;

  const stamps = DATA_PLACEHOLDER_DEV_WALLET_STAMPS_BALANCE;
  const src20 = DATA_PLACEHOLDER_DEV_WALLET_TOKENS_BALANCE;
  const dispensers = DATA_PLACEHOLDER_DEV_WALLET_DISPENSERS.map((d) => ({
    ...d,
    dispenses: [],
  }));

  return {
    data: {
      data: {
        stamps: {
          data: stamps,
          pagination: {
            page: stampsParams.page,
            limit: stampsParams.limit,
            total: stamps.length,
            totalPages: 1,
          },
        },
        src20: {
          data: src20,
          pagination: {
            page: src20Params.page,
            limit: src20Params.limit,
            total: src20.length,
            totalPages: 1,
          },
        },
        dispensers: {
          data: dispensers,
          pagination: {
            page: dispensersParams.page,
            limit: dispensersParams.limit,
            total: dispensers.length,
            totalPages: 1,
          },
        },
      },
      address,
      walletData: { ...DATA_PLACEHOLDER_DEV_WALLET_INFO, address },
      stampsTotal: stamps.length,
      src20Total: src20.length,
      stampsCreated: DATA_PLACEHOLDER_DEV_WALLET_STAMPS_CREATED.length,
      anchor: "",
    },
    stampsSortBy: params.stampsSortBy,
    src20SortBy: params.src20SortBy,
    dispensersSortBy: params.dispensersSortBy,
  };
}
