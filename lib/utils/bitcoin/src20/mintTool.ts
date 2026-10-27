/* ===== SRC-20 MINT TOOL HELPERS ===== */
/* Pure helpers shared by the mint tool page and modal. */

/**
 * URL of the mint data endpoint for a tick. The tick is URI-encoded because
 * SRC-20 ticks may contain characters that are not URL-safe (emoji, "#",
 * "?", "/"); the route decodes it with decodeURIComponent.
 */
export function buildMintDataUrl(tick: string): string {
  return `/api/v2/src20/tick/${encodeURIComponent(tick)}/mintData`;
}

/**
 * Mint progress for display: truncated (not rounded) to at most two
 * decimals. Anything that does not start with a number shows as "0".
 */
export function formatMintProgress(progress: unknown): string {
  if (progress === null || progress === undefined) return "0";
  return String(progress).match(/^-?\d+(?:\.\d{0,2})?/)?.[0] ?? "0";
}

/** CSS width of the progress bar fill. Non-numeric progress gives "0%". */
export function mintProgressWidth(progress: unknown): string {
  const n = Number(progress);
  return `${isNaN(n) ? 0 : n}%`;
}
