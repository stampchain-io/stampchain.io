/**
 * Chain-dependent brand strings, safe to import from islands.
 *
 * This module never reads the environment. The server resolves the chain
 * with `getChainId()` (server/services/chain/chainProfile.ts) and passes it
 * in; islands get it from `getClientChain()` (./clientChain.ts).
 *
 * Bitcoin mode returns every input unchanged, so a Bitcoin deploy renders the
 * same bytes it did before chain labelling existed.
 */
import type { PageMetadata } from "$lib/utils/pageMetadata.ts";
import { isEcxNativeBlock } from "$lib/utils/chain/ecxView.ts";

/** Mirrors `ChainId` in server/services/chain/chainProfile.ts. */
export type BrandChain = "bitcoin" | "ecx";

/* ===== STAMP NUMBERS ===== */
/**
 * What goes in front of an ECX-native stamp's number: "ECX #4242". Stamps
 * created before the fork (block 973728) keep the plain "#" they have on
 * Bitcoin, where they carry the same numbers. Display only; API data and
 * database values keep the bare number.
 */
export const ECX_STAMP_NUMBER_PREFIX = "ECX #";

/** "ECX #" for an ECX-native stamp on ECX; "#" otherwise. */
export function stampNumberPrefix(
  chain: BrandChain = "bitcoin",
  blockIndex?: number | string | null,
): string {
  return chain === "ecx" && isEcxNativeBlock(blockIndex)
    ? ECX_STAMP_NUMBER_PREFIX
    : "#";
}

/** "#4242", or "ECX #4242" for an ECX-native stamp on ECX. */
export function formatStampNumber(
  stamp: number | string | null | undefined,
  chain: BrandChain = "bitcoin",
  blockIndex?: number | string | null,
): string {
  return `${stampNumberPrefix(chain, blockIndex)}${stamp ?? ""}`;
}

/**
 * Page title for a stamp: "Bitcoin Stamp #4242" on Bitcoin. On ECX an
 * ECX-native stamp is "ECX #4242"; an inherited one keeps its plain number
 * under the product name, "eSTAMP #4242".
 */
export function stampTitle(
  stamp: number | string | null | undefined,
  chain: BrandChain = "bitcoin",
  blockIndex?: number | string | null,
): string {
  if (chain === "ecx" && isEcxNativeBlock(blockIndex)) {
    return `${ECX_STAMP_NUMBER_PREFIX}${stamp ?? ""}`;
  }
  return brandText(`Bitcoin Stamp #${stamp ?? ""}`, chain);
}

export interface ChainBrand {
  /** Short chain label shown in the page header; null on Bitcoin. */
  chainLabel: string | null;
  /** Product name, e.g. in `og:site_name`. */
  productName: string;
  /** Header logo text, split where the hover colour changes. */
  logo: { lead: string; tail: string };
  /** Mobile drawer title. */
  drawerTitle: string;
  /** Who runs the site, shown next to the logo; null on Bitcoin. */
  attribution: string | null;
}

const BITCOIN_BRAND: ChainBrand = {
  chainLabel: null,
  productName: "Bitcoin Stamps",
  logo: { lead: "STAMP", tail: "CHAIN" },
  drawerTitle: "STAMPCHAIN",
  attribution: null,
};

/** The ECX product is eSTAMPS, built and run by Stampchain. */
const ECX_BRAND: ChainBrand = {
  chainLabel: "ECX",
  productName: "eSTAMPS",
  logo: { lead: "e", tail: "STAMPS" },
  drawerTitle: "eSTAMPS",
  attribution: "by Stampchain",
};

export function getChainBrand(chain: BrandChain = "bitcoin"): ChainBrand {
  return chain === "ecx" ? ECX_BRAND : BITCOIN_BRAND;
}

/**
 * Extra stylesheet for the chain's presentation, or null. ECX loads the
 * eSTAMPS styles (static/estamps.css, every rule scoped to
 * html[data-chain="ecx"]); Bitcoin loads nothing extra.
 */
export function chainStylesheet(chain: BrandChain = "bitcoin"): string | null {
  return chain === "ecx" ? "/estamps.css" : null;
}

/**
 * Rewrites that turn copy which names Bitcoin as the chain into ECX copy.
 * Order matters: the product name goes first, so "Bitcoin Stamps" never becomes "ECX Stamps" by
 * way of a generic "Bitcoin" rule. "BTC" amounts and historical references
 * ("the Bitcoin Stamps meta-protocol") are left alone; see
 * ECX_UNBRANDED_PATHS.
 */
const ECX_REWRITES: ReadonlyArray<readonly [RegExp, string]> = [
  // "a Bitcoin Stamp" -> "an eSTAMP", "a Bitcoin block" -> "an ECX block":
  // both names start with a vowel sound.
  [/\b([Aa]) Bitcoin Stamp\b/g, "$1n eSTAMP"],
  [
    /\b([Aa]) Bitcoin (block|Block|blockchain|UTXOs|address|NFT)\b/g,
    "$1n ECX $2",
  ],
  [/\bBitcoin Stamps\b/g, "eSTAMPS"],
  [/\bBitcoin Stamp\b/g, "eSTAMP"],
  [/\bBITCOIN STAMPS\b/g, "eSTAMPS"],
  [/\bBitcoin (block|Block|blockchain|UTXOs|address|NFT)\b/g, "ECX $1"],
  [/\b(on|into|to) Bitcoin\b/g, "$1 ECX"],
];

/** Rebrand one string for the chain. Identity on Bitcoin. */
export function brandText(text: string, chain: BrandChain = "bitcoin"): string {
  if (chain !== "ecx") return text;
  return ECX_REWRITES.reduce((s, [re, to]) => s.replace(re, to), text);
}

/**
 * Pages whose copy is about the protocol's Bitcoin history or press, where
 * "ECX Stamps" would be wrong. Their metadata stays as written until product
 * decides how those pages should read on ECX.
 */
export const ECX_UNBRANDED_PATHS: ReadonlySet<string> = new Set([
  "/about",
  "/media",
  "/presskit",
]);

/** Rebrand a page's title and description. Identity on Bitcoin. */
export function brandPageMetadata(
  meta: PageMetadata,
  pathname: string,
  chain: BrandChain = "bitcoin",
): PageMetadata {
  if (chain !== "ecx") return meta;
  const path = pathname.replace(/\/+$/, "") || "/";
  if (ECX_UNBRANDED_PATHS.has(path)) return meta;
  return {
    title: brandText(meta.title, chain),
    description: brandText(meta.description, chain),
  };
}
