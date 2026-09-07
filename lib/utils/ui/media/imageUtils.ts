/// <reference lib="dom" />
import type { SRC20Row } from "$types/src20.d.ts";
import type { StampRow } from "$types/stamp.d.ts";

/**
 * Get the base URL for the current environment
 * Used for constructing fully qualified URLs
 */
export const getBaseUrl = (): string => {
  // Client-side: Check if we're on localhost for development
  if (typeof window !== "undefined") {
    try {
      // @ts-ignore - globalThis.location exists in browser
      if (globalThis.location && globalThis.location.hostname === "localhost") {
        return ""; // Use relative URLs on localhost
      }
    } catch {
      // Ignore errors if location is not available
    }
  }

  // Default to production CDN for production
  return "https://stampchain.io";
};

/**
 * Get the CDN URL - always returns production CDN
 * Used for assets that only exist on the CDN
 */
export const getCdnUrl = (): string => {
  return "https://stampchain.io";
};

/**
 * Construct a fully qualified stamp URL from a transaction hash
 * Used for SRC-20 stamps and fallbacks
 */
export const constructStampUrl = (
  txHash: string,
  extension = "svg",
): string => {
  // Always use CDN for /stamps/ assets
  const cdnUrl = getCdnUrl();
  return `${cdnUrl}/stamps/${txHash}.${extension}`;
};

// Extended MIME types including all supported formats for stamps and web assets
// Core stamp MIME types are also available in $constants/MIME_TYPES
export const mimeTypes: { [key: string]: string } = {
  // Common stamp content formats
  "jpg": "image/jpeg",
  "jpeg": "image/jpeg",
  "png": "image/png",
  "gif": "image/gif",
  "svg": "image/svg+xml",
  "svgz": "image/svg+xml",
  "webp": "image/webp",
  "avif": "image/avif",
  "ico": "image/x-icon",
  "bmp": "image/bmp",
  "tiff": "image/tiff",
  "tif": "image/tiff",
  "html": "text/html",
  "htm": "text/html",
  "txt": "text/plain",
  "md": "text/markdown",
  "mp3": "audio/mpeg",
  "wav": "audio/wav",
  "mp4": "video/mp4",
  "webm": "video/webm",
  "ogg": "audio/ogg",
  "ogv": "video/ogg",
  // Additional web asset formats
  "csv": "text/csv",
  "js": "application/javascript",
  "mjs": "application/javascript",
  "cjs": "application/javascript",
  "json": "application/json",
  "map": "application/json",
  "jsonld": "application/ld+json",
  "gz": "application/gzip",
  "gzip": "application/gzip",
  "zip": "application/zip",
  "bz": "application/x-bzip",
  "bz2": "application/x-bzip2",
  "7z": "application/x-7z-compressed",
  "css": "text/css",
  "less": "text/less",
  "sass": "text/sass",
  "scss": "text/scss",
  "xml": "application/xml",
  "wasm": "application/wasm",
  "woff": "font/woff",
  "woff2": "font/woff2",
  "ttf": "font/ttf",
  "otf": "font/otf",
  "eot": "application/vnd.ms-fontobject",
  "avi": "video/x-msvideo",
  "mpeg": "video/mpeg",
};

export const mimeTypeToSuffix = Object.entries(mimeTypes).reduce(
  (acc, [suffix, mimeType]) => {
    acc[mimeType] = suffix;
    return acc;
  },
  {} as { [key: string]: string },
);

/**
 * Get the preview PNG URL for a stamp (rendered server-side via Chrome/ImageScript).
 * Used in grid/listing views where a static preview is preferred over live HTML/SVG.
 *
 * By default, if rendering fails the endpoint 302s to the generic Stampchain
 * logo (appropriate for social-share og:image tags). Pass
 * `placeholderOnFail: true` for in-app thumbnails so the endpoint 404s
 * instead — that fails the `<img>` load, letting the caller swap in the
 * local "no image" placeholder icon rather than the unrelated logo.
 */
export const getStampPreviewUrl = (
  stamp: StampRow,
  options?: { placeholderOnFail?: boolean },
): string => {
  const base = `/api/v2/stamp/${stamp.stamp}/preview`;
  return options?.placeholderOnFail ? `${base}?placeholderOnFail=true` : base;
};

// "Library file" mimetypes (recursive stamps that are really CSS/JS/GZIP/
// JSON, not an image) can never be decoded as a raster image, even though
// they have a real, reachable `stamp_url` — e.g. "cursed" stamps are often
// plain .js files that build their content via the DOM. Handing one of
// these to an `<img src>` doesn't reliably fire `onerror` in every browser
// (cross-origin script/JSON responses can be blocked before a normal
// image-decode error is raised), so callers that can't run their own
// onError fallback (SSR-only table rows) would be left with a native
// broken-image icon forever. Excluded here so every caller gets `undefined`
// (→ "no image" placeholder) up front instead of depending on a runtime
// load failure. NOTE: audio/* and text/plain are intentionally NOT excluded
// — StampCard/wallet table rows reuse this same `src` for the <audio> source
// and for fetching text content (StampTextContent), so it must stay a real
// URL for those mimetypes.
const NON_RENDERABLE_IMAGE_MIMETYPES = new Set([
  "text/css",
  "text/javascript",
  "application/javascript",
  "application/gzip",
  "application/json",
  "text/json",
]);

export const getStampImageSrc = (stamp: StampRow): string | undefined => {
  const baseUrl = getBaseUrl();
  if (!stamp.stamp_url) {
    return undefined;
  }
  if (
    stamp.stamp_mimetype &&
    NON_RENDERABLE_IMAGE_MIMETYPES.has(stamp.stamp_mimetype)
  ) {
    return undefined;
  }

  // SRC-20 stamps have JSON metadata but also have SVG images
  // The SVG is at /stamps/txhash.svg (managed by Cloudflare CDN)
  if (stamp.ident === "SRC-20" && stamp.stamp_url.includes("json")) {
    // Extract the transaction hash from the JSON URL and construct SVG URL
    const urlParts = stamp.stamp_url.split("/stamps/");
    if (urlParts.length > 1) {
      const filename = urlParts[1].replace(".json", ".svg");
      // Always use CDN for /stamps/ assets
      const cdnUrl = getCdnUrl();
      return `${cdnUrl}/stamps/${filename}`;
    }
    return undefined;
  }

  // For JSON stamps (including SRC-101), just show placeholder
  // We can't fetch JSON synchronously, and these are data stamps anyway
  if (stamp.stamp_url.includes("json")) {
    return undefined;
  }

  // Extract filename from full URL if present
  const urlParts = stamp.stamp_url.split("/stamps/");
  const filename = urlParts.length > 1 ? urlParts[1] : stamp.stamp_url;

  // For HTML stamps, use the /content/ endpoint which processes recursive content
  // The /content/ endpoint will handle HTML cleaning and recursive image loading
  if (stamp.stamp_mimetype === "text/html" || filename.endsWith(".html")) {
    // Strip the .html extension for the /content/ endpoint
    const htmlFilename = filename.replace(/\.html?$/i, "");
    return `${baseUrl}/content/${htmlFilename}`;
  }

  // For all other stamps, use the CDN
  const cdnUrl = getCdnUrl();
  return `${cdnUrl}/stamps/${filename}`;
};

export const getSRC20ImageSrc = (src20: SRC20Row): string | undefined => {
  // Deploy-derived image takes priority: it's the token's canonical icon,
  // and it's the *only* image available for balance-style rows that don't
  // carry their own transaction hash (see SRC20Repository.getSrc20BalanceFromDb).
  // It's already a fully-qualified URL built server-side, so no further
  // munging is needed. Mirrors the `deploy_img || getSRC20ImageSrc(...)`
  // fallback previously duplicated across SRC20Overview/SRC20Minting* —
  // centralizing it here means every consumer (including SRC20Card) gets
  // it for free.
  if (src20.deploy_img) {
    return src20.deploy_img;
  }

  // If there's no stamp_url either, return undefined
  if (!src20.stamp_url) {
    return undefined;
  }

  // SRC-20 stamps have JSON metadata but also have SVG images
  // The SVG is at /stamps/txhash.svg (managed by Cloudflare CDN)
  if (src20.stamp_url.includes("json")) {
    // Extract the transaction hash from the JSON URL and construct SVG URL
    const urlParts = src20.stamp_url.split("/stamps/");
    if (urlParts.length > 1) {
      const filename = urlParts[1].replace(".json", ".svg");
      // Always use CDN for /stamps/ assets
      const cdnUrl = getCdnUrl();
      return `${cdnUrl}/stamps/${filename}`;
    }
    return undefined;
  }

  // For non-JSON stamps, use the stamp_url directly with CDN
  const urlParts = src20.stamp_url.split("/stamps/");
  const filename = urlParts.length > 1 ? urlParts[1] : src20.stamp_url;

  const cdnUrl = getCdnUrl();
  return `${cdnUrl}/stamps/${filename}`;
};

export const getMimeTypeFromExtension = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const normalizedExt = ext.replace(/^\./, "");
  return mimeTypes[normalizedExt] || "application/octet-stream";
};

/**
 * Fetches and returns JSON data for SRC-101 stamps
 * Returns empty object if not an SRC-101 stamp
 */
export async function getSRC101Data(
  stamp: { ident?: string; stamp_url?: string },
): Promise<Record<string, any>> {
  // Only process SRC-101 stamps
  if (stamp.ident !== "SRC-101" || !stamp.stamp_url) {
    return {};
  }

  try {
    const response = await fetch(stamp.stamp_url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    // Re-throw to allow caller to handle
    throw error;
  }
}

export function showFallback(_element: HTMLElement) {
  // Fallback is now handled by PlaceholderImage component
  // This function is kept for backward compatibility but does nothing
  console.warn(
    "showFallback is deprecated - use PlaceholderImage component instead",
  );
}

export function handleImageError(e: Event) {
  if (e.currentTarget instanceof HTMLImageElement) {
    // Use transparent pixel data URI to prevent infinite error loops
    // (setting src="" resolves to the page URL, which isn't an image → re-triggers error)
    e.currentTarget.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.currentTarget.alt = "Content not available";
  } else if (e.currentTarget instanceof HTMLIFrameElement) {
    // Hide the iframe - parent component should handle placeholder
    e.currentTarget.style.display = "none";
  }
}

// Trusted domains for external references in SVGs
const TRUSTED_DOMAINS = [
  "ordinals.com",
  "arweave.net",
];

/**
 * Check if a URL is from a trusted domain
 */
export function isTrustedDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return TRUSTED_DOMAINS.some((domain) => urlObj.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

/**
 * Validate and sanitize SVG content
 * Returns undefined if SVG is invalid or contains untrusted external references
 */
export function validateSVG(svgContent: string): string | undefined {
  // Check for script tags (case insensitive)
  if (/<script[\s>]/i.test(svgContent)) {
    return undefined;
  }

  // Check for event handlers
  const eventHandlers = /on\w+\s*=/i;
  if (eventHandlers.test(svgContent)) {
    return undefined;
  }

  // Check for javascript: protocol
  if (/javascript:/i.test(svgContent)) {
    return undefined;
  }

  // Check for external references
  const externalRefs =
    /(?:href|src|xlink:href)\s*=\s*["']?(https?:\/\/[^"'\s>]+)/gi;
  let match;
  while ((match = externalRefs.exec(svgContent)) !== null) {
    const url = match[1];
    if (!isTrustedDomain(url)) {
      return undefined;
    }
  }

  return svgContent;
}

/**
 * Rewrite external references in SVG to use proxy
 */
export function rewriteSVGReferences(svgContent: string): string {
  return svgContent
    .replace(
      /https:\/\/ordinals\.com\/content\/([^"'\s>]+)/g,
      "/api/proxy/ordinals/$1",
    )
    .replace(
      /https:\/\/arweave\.net\/([^"'\s>]+)/g,
      "/api/proxy/arweave/$1",
    );
}

/**
 * Process SVG content for safe display
 * Returns processed SVG or undefined if invalid
 */
export function processSVG(svgContent: string): string | undefined {
  // First validate the SVG
  const validated = validateSVG(svgContent);
  if (!validated) {
    return undefined;
  }

  // Rewrite external references to use proxy
  let processed = rewriteSVGReferences(validated);

  // Ensure SVG fills container by removing fixed dimensions
  if (processed.includes("<svg")) {
    // Remove width and height attributes
    processed = processed
      .replace(/<svg([^>]*)\s+width="([^"]*)"([^>]*)/, "<svg$1$3")
      .replace(/<svg([^>]*)\s+height="([^"]*)"([^>]*)/, "<svg$1$3");

    // Add viewBox if not present
    if (!processed.includes("viewBox")) {
      processed = processed.replace(
        /<svg([^>]*)>/,
        '<svg$1 viewBox="0 0 460 500">',
      );
    }

    // Add responsive styling
    processed = processed.replace(
      /<svg([^>]*)>/,
      '<svg$1 style="max-width: 100%; max-height: 100%; width: auto; height: auto; display: block;">',
    );
  }

  return processed;
}
