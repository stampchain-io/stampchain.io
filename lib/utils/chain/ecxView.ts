/**
 * ECX-native vs inherited history, for the stamp lists on ECX pages.
 *
 * ECX split from Bitcoin at block 973728. Everything indexed below that
 * height is shared Bitcoin history that ECX inherited; stamps at or above it
 * were created on ECX. ECX pages list ECX-native stamps by default, and
 * `?history=inherited` shows everything.
 *
 * Safe to import from islands: no environment reads. Bitcoin never calls
 * these helpers, so its URLs and queries are unchanged.
 */

/** First ECX block. Mirrors the note in server/services/chain/chainProfile.ts. */
export const ECX_FORK_BLOCK = 973_728;

/**
 * True when a stamp's creation block is at or after the fork: an ECX-native
 * stamp. Unknown or unparseable blocks count as inherited, so they keep the
 * plain "#" Bitcoin shows for the same number.
 */
export function isEcxNativeBlock(
  blockIndex: number | string | null | undefined,
): boolean {
  const n = typeof blockIndex === "string" ? Number(blockIndex) : blockIndex;
  return typeof n === "number" && Number.isFinite(n) && n >= ECX_FORK_BLOCK;
}

/** Query parameter that switches an ECX stamp list to all history. */
export const ECX_HISTORY_PARAM = "history";
export const ECX_HISTORY_INHERITED = "inherited";

export type EcxStampView = "native" | "inherited";

/** The view a request asks for. Anything but "inherited" is native. */
export function getEcxStampView(url: URL | string): EcxStampView {
  const u = typeof url === "string" ? new URL(url, "http://local") : url;
  return u.searchParams.get(ECX_HISTORY_PARAM) === ECX_HISTORY_INHERITED
    ? "inherited"
    : "native";
}

/**
 * Lowest block a stamp list should include for the view, or undefined for
 * no floor. Pass it to the stamp queries as `blockIdentifier: { from }`.
 */
export function ecxBlockFloor(view: EcxStampView): number | undefined {
  return view === "native" ? ECX_FORK_BLOCK : undefined;
}

/**
 * Same page, other view: keeps every other query parameter and drops
 * `page`, since page N of one view is not page N of the other.
 */
export function ecxViewHref(url: URL | string, view: EcxStampView): string {
  const u = new URL(
    typeof url === "string" ? url : url.href,
    "http://local",
  );
  u.searchParams.delete("page");
  if (view === "inherited") {
    u.searchParams.set(ECX_HISTORY_PARAM, ECX_HISTORY_INHERITED);
  } else {
    u.searchParams.delete(ECX_HISTORY_PARAM);
  }
  const query = u.searchParams.toString();
  return `${u.pathname}${query ? `?${query}` : ""}`;
}

/** A block floor for the stamp queries: stamps in block `from` or later. */
export interface BlockFloor {
  from: number;
}

export function isBlockFloor(value: unknown): value is BlockFloor {
  return typeof value === "object" && value !== null &&
    Number.isInteger((value as BlockFloor).from);
}

/**
 * Carry the inherited-history view into a query string built from scratch
 * (the filter drawer rebuilds its query from the filter state). Returns
 * `query` unchanged unless `current` asks for inherited history, so it is
 * the identity on Bitcoin, where the parameter never appears.
 */
export function keepEcxHistory(
  query: string,
  current: URLSearchParams | string,
): string {
  const now = typeof current === "string"
    ? new URLSearchParams(current)
    : current;
  if (now.get(ECX_HISTORY_PARAM) !== ECX_HISTORY_INHERITED) return query;
  const next = new URLSearchParams(query);
  if (next.get(ECX_HISTORY_PARAM) === ECX_HISTORY_INHERITED) return query;
  next.set(ECX_HISTORY_PARAM, ECX_HISTORY_INHERITED);
  return next.toString();
}
