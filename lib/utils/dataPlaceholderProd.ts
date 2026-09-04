import type { StampRow } from "$types/stamp.d.ts";

/* ===== PRODUCTION FALLBACK DATA + DEV PREVIEW FLAG ===== */
/*
 * DATA_PLACEHOLDER_DEV (default: false)
 *   false → the constants below are used only when a real DB/service call
 *           fails (catch/fallback path)
 *   true  → routes render the rich dataset from dataPlaceholderDev.ts
 *           (dynamically imported), bypassing all DB calls entirely
 *
 * Flip to true when developing UI without a database connection.
 *
 * Everything in this file is small, dependency-free, and always loaded —
 * safe to statically import from any route. The rich dev-only dataset
 * lives in dataPlaceholderDev.ts and must only ever be reached via a
 * dynamic `await import(...)` gated behind this flag (enforced by
 * scripts/check-boundary.sh).
 *
 * The shapes below restore the app's original error/empty-state fallback
 * behavior from before dummy data was introduced (see git commit 97041105
 * and its parent) — genuine empty arrays / zero counts / explicit error
 * strings, not fake stamp or token content.
 */
export const DATA_PLACEHOLDER_DEV = true;

/* ===== HOME PAGE (routes/index.tsx) ===== */
export const DATA_PLACEHOLDER_PROD_HOME = {
  carouselStamps: [],
  stamps_art: [],
  stamps_src721: [],
  stamps_posh: [],
  collectionData: [],
  error: "Service temporarily unavailable",
  src20Data: {
    minted: { data: [], total: 0, page: 1, totalPages: 0 },
    minting: { data: [], total: 0, page: 1, totalPages: 0 },
  },
};

/* ===== STAMP OVERVIEW (routes/stamp/index.tsx, routes/marketplace/index.tsx) ===== */
export const DATA_PLACEHOLDER_PROD_STAMP_OVERVIEW_PAGE = {
  stamps: [] as StampRow[],
  pagination: { total: 0 },
  recentSales: [],
  page: 1,
  page_size: 60,
  sortBy: "DESC" as const,
  selectedTab: "all" as const,
  totalPages: 0,
};

/* ===== EXPLORER OVERVIEW (routes/explorer/index.tsx) ===== */
export const DATA_PLACEHOLDER_PROD_EXPLORER_OVERVIEW_PAGE = {
  error: "Error: Internal server error",
};

/* ===== SRC-20 OVERVIEW (routes/src20/index.tsx) ===== */
export const DATA_PLACEHOLDER_PROD_TOKEN_OVERVIEW_PAGE = {
  data: [],
  total: 0,
  page: 1,
  totalPages: 0,
};

/* ===== STAMP DETAIL (routes/stamp/[id].tsx) ===== */
export const DATA_PLACEHOLDER_PROD_STAMP_DETAIL_PAGE = {
  stamp: {} as StampRow,
  total: 0,
  sends: [],
  dispensers: [],
  dispenses: [],
  holders: [],
  vaults: [],
  last_block: 0,
  stamps_recent: [],
  lowestPriceDispenser: null,
  collectionInfo: null,
};

/* ===== SRC-20 DETAIL (routes/src20/[tick].tsx) ===== */
/*
 * Matches the original shape exactly — SRC20DetailPage's existing
 * `if ("error" in props.data)` branch renders this directly.
 */
export const DATA_PLACEHOLDER_PROD_TOKEN_DETAIL_PAGE = {
  error: "Internal server error",
};
