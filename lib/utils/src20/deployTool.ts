/**
 * Pure helpers for the SRC-20 deploy tool. The tool renders on the
 * /tool/src20/deploy page and inside a modal; both use these.
 */

/** Cover images for a deploy must be exactly this many pixels square. */
export const SRC20_DEPLOY_COVER_SIZE = 420;

/** The longest `st:` reference the external image field keeps. */
const ST_REF_MAX_LENGTH = 23;

export interface Point {
  x: number;
  y: number;
}

/** The part of a DOMRect these helpers read. */
export interface RectLike {
  left: number;
  top: number;
  width: number;
}

/** True when a cover image has the size a deploy accepts. */
export function isValidDeployCoverSize(width: number, height: number): boolean {
  return width === SRC20_DEPLOY_COVER_SIZE &&
    height === SRC20_DEPLOY_COVER_SIZE;
}

/**
 * Cut an over-long `st:` reference down to `st:` plus 20 characters.
 * Any other value comes back unchanged.
 */
export function normalizeExternalImageRef(value: string): string {
  if (value.startsWith("st:") && value.length > ST_REF_MAX_LENGTH) {
    return `st:${value.substring(3, ST_REF_MAX_LENGTH)}`;
  }
  return value;
}

/**
 * Convert a viewport point into coordinates relative to `origin`. With no
 * origin the viewport point comes back as is. The modal card is
 * transformed, so its fixed-position tooltips are placed from an anchor.
 */
export function toOriginRelative(
  point: { clientX: number; clientY: number },
  origin?: Pick<RectLike, "left" | "top"> | null,
): Point {
  return {
    x: point.clientX - (origin?.left ?? 0),
    y: point.clientY - (origin?.top ?? 0),
  };
}

/** The top-center of `rect`, relative to `origin`. */
export function topCenterRelative(
  rect: RectLike,
  origin?: Pick<RectLike, "left" | "top"> | null,
): Point {
  return {
    x: rect.left + rect.width / 2 - (origin?.left ?? 0),
    y: rect.top - (origin?.top ?? 0),
  };
}
