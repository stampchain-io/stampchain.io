import type { ROOT_DOMAIN_TYPES } from "$types/base.d.ts";

/* ===== BREAKPOINTS ===== */
export const BREAKPOINTS = {
  desktop: 1440,
  tablet: 1024,
  mobileLg: 768,
  mobileMd: 568,
  mobileSm: 360,
};

/* ===== FEE CONSTANTS ===== */
export const MIN_FEE_RATE_SATS_PER_VB = 0.1; // Minimum allowed fee rate in sats/vB

/* ===== CAROUSEL STAMPS ===== */
// Update constants.test.ts to reflect these defs
export const CAROUSEL_STAMP_IDS = [
  1185908,
  1121162,
  1040705,
  932199,
  897330,
];

/* ===== TOP LEVEL DOMAINS - FOR BITNAME ===== */
export const ROOT_DOMAINS: ROOT_DOMAIN_TYPES[] = [
  ".btc",
  ".sats",
  ".xbt",
  ".x",
  ".pink",
];

/* ===== HIDDEN COLLECTIONS ===== */
// Known test/placeholder collections excluded from the Collections overview
// (matched case-insensitively against collection_name). Enforced server-side
// in CollectionRepository so totals stay in sync with rendered results.
export const HIDDEN_COLLECTION_NAMES = [
  "testtt",
  "valtius",
  "posh",
  "hnft pepe cash",
  "alpha_pxllabs",
  "chain legends by masteronchain",
  "infinity seed",
  "recursivefake",
];
