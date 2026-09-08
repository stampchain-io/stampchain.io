// Cache for security headers to improve performance
const securityHeaderCache = new Map<string, Record<string, string>>();

export const getSecurityHeaders = (
  options: { forceNoCache?: boolean; context?: "api" | "web" | "recursive" } =
    {},
) => {
  const { forceNoCache, context = "web" } = options;

  // Create cache key from options
  const cacheKey = `${context}-${forceNoCache ? "no-cache" : "cache"}`;

  // Return cached headers if available
  const cached = securityHeaderCache.get(cacheKey);
  if (cached) {
    return { ...cached }; // Return a copy to prevent mutation
  }
  const cacheControl = forceNoCache
    ? "no-store, must-revalidate"
    : "public, max-age=31536000, immutable";

  // Base trusted domains
  const trustedDomains = [
    "'self'",
    "*.stampchain.io",
    "*.bitcoinstamps.xyz",
    "*.cloudflare.com",
    "*.esm.sh",
  ];

  // Context-specific CSP policies
  const cspPolicies = {
    api: {
      // Most restrictive CSP for API endpoints
      defaultSrc: ["'none'"], // Block all resources by default
      connectSrc: ["'self'"], // Allow same-origin XHR/fetch
      // Remove unnecessary directives for APIs:
      // - No need for frameSrc (APIs aren't framed)
      // - No need for frameAncestors (APIs aren't embedded)
      // - No need for imgSrc (APIs don't serve images directly)
      // - No need for scriptSrc (APIs don't need client-side scripts)
      // - No need for styleSrc (APIs don't need CSS)
    },
    web: {
      defaultSrc: [...trustedDomains], // Allow resources from trusted domains
      scriptSrc: [ // Script execution sources
        ...trustedDomains,
        "'unsafe-inline'", // Allow inline scripts (needed for Fresh)
        "'unsafe-eval'", // Allow dynamic code evaluation
      ],
      connectSrc: [...trustedDomains], // API/fetch destinations
      styleSrc: [ // Style sources
        "*", // Allow styles from any domain
        "'unsafe-inline'", // Allow inline styles (needed for Tailwind)
      ],
      imgSrc: [ // Image sources
        "*", // Allow images from any domain
        "data:", // Allow data: URIs for images
        "blob:", // Allow blob: URIs for dynamic images
      ],
      fontSrc: [ // Font sources
        "*", // Allow fonts from any domain
        "data:", // Allow data: URIs for fonts
        "blob:", // Allow blob: URIs for dynamic fonts
      ],
      frameAncestors: ["'self'"], // Only allow embedding in same origin
      frameSrc: ["'self'"], // Only allow iframes from same origin
      workerSrc: [ // Web Worker sources
        "'self'", // Allow workers from same origin
        "blob:", // Allow blob: URIs for dynamic workers
      ],
    },
    recursive: {
      // Permissive policy for recursive stamps that need to render arbitrary content
      defaultSrc: [ // Allow all sources by default
        "*", // Any domain
        "'unsafe-inline'", // Inline resources
        "'unsafe-eval'", // Dynamic code
        "data:", // Data URIs
        "blob:", // Blob URIs
      ],
      scriptSrc: [ // Maximum script flexibility
        "*",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "data:",
        "blob:",
      ],
      styleSrc: ["*", "'unsafe-inline'"], // Allow any styles
      imgSrc: ["*", "data:", "blob:"], // Allow any images
      fontSrc: ["*", "data:", "blob:"], // Allow any fonts
      connectSrc: ["*", "data:", "blob:"], // Allow any connections
      frameAncestors: ["*"], // Allow embedding anywhere
      frameSrc: ["*"], // Allow any iframes
      workerSrc: ["*", "blob:"], // Allow any workers
    },
  };

  const selectedPolicy = cspPolicies[context];
  const cspHeader = Object.entries(selectedPolicy)
    .map(([key, values]) => {
      const directive = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      return `${directive} ${values.join(" ")}`;
    })
    .join("; ");

  const headers = {
    "Content-Security-Policy": cspHeader,
    "Cache-Control": cacheControl,
    "CDN-Cache-Control": cacheControl,
    "Cloudflare-CDN-Cache-Control": cacheControl,
    "Surrogate-Control": forceNoCache ? "no-store" : "max-age=31536000",
    "Edge-Control": forceNoCache ? "no-store" : "cache-maxage=31536000",
    // CORS headers based on context
    ...(context === "recursive" && {
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
      "Cross-Origin-Opener-Policy": "same-origin",
    }),
    "Vary": "Accept-Encoding, Accept, Origin",
  };

  // Cache the headers for future use
  securityHeaderCache.set(cacheKey, headers);

  return { ...headers }; // first call must not hand out the cached object
};

/**
 * Plain-record header producers.
 *
 * These MUST return plain objects, never `Headers` instances: every consumer
 * merges them with object spread (`{ ...getHtmlHeaders(), ... }`), and a
 * `Headers` instance has no own enumerable properties, so spreading one
 * silently yields `{}` and drops every header it was meant to contribute.
 * `normalizeHeaders` is applied once, by the response helper, at
 * `new Response(...)` time.
 */
export const getHtmlHeaders = (
  options?: { forceNoCache?: boolean },
): Record<string, string> => ({
  ...getSecurityHeaders({ ...options, context: "web" }),
  "Content-Type": "text/html; charset=utf-8",
});

export const getRecursiveHeaders = (
  options?: { forceNoCache?: boolean },
): Record<string, string> =>
  getSecurityHeaders({ ...options, context: "recursive" });

export const getBinaryContentHeaders = (
  mimeType: string,
  options?: { forceNoCache?: boolean },
): Record<string, string> => ({
  ...getSecurityHeaders({ ...options, context: "recursive" }),
  "Content-Type": mimeType,
});

/**
 * CSP for user-generated HTML stamp content served from `/content/` and `/s/`.
 *
 * Stamp HTML is fully author-controlled and is served from the site origin,
 * so no source-list directive can constrain it without breaking real stamps:
 * the on-chain corpus uses inline `<script>`/`<style>`/`on*=` handlers,
 * `blob:` workers, `localStorage`, and loads scripts, images and iframes
 * from arbitrary hosts (ordinals.com, arweave.net, cdn.jsdelivr.net,
 * *.vercel.app, ...). The site "web" policy from `getSecurityHeaders` would
 * block several of those, and CSP `sandbox` would change origin semantics
 * (localStorage, same-origin fetch) for every stamp.
 *
 * The one directive that is both enforceable and already the live behaviour
 * is embedding: `frame-ancestors 'self'` mirrors the `X-Frame-Options:
 * SAMEORIGIN` that `/content/` and `/s/` HTML responses already send, and
 * CSP3 gives `frame-ancestors` precedence when both are present, so the two
 * agree. Resource loading is deliberately left unrestricted. Isolating stamp
 * content on its own origin (or a `sandbox` policy) is a separate decision.
 */
export const STAMP_CONTENT_CSP = "frame-ancestors 'self'";

/**
 * Headers for stamp content (any MIME type) served by `WebResponseUtil.stampResponse`.
 *
 * Stamp content is immutable once inscribed, so the browser cache policy is
 * the long-lived immutable one unless `forceNoCache` is set. Callers that
 * need a different edge policy (e.g. the HTML paths in
 * `routes/handlers/sharedContentHandler.ts`) override `Cache-Control` /
 * `CDN-Cache-Control` explicitly. HTML additionally gets the embedding
 * policy above plus `nosniff`; non-HTML types get no CSP so that SVG/JS
 * stamps keep their current unrestricted behaviour (extending
 * `frame-ancestors` to SVG documents would newly block third-party
 * `<iframe>`/`<object>` embeds and is out of scope here).
 */
export const getStampContentHeaders = (
  mimeType: string,
  options: { forceNoCache?: boolean } = {},
): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": mimeType,
    "Cache-Control": options.forceNoCache
      ? "no-store, must-revalidate"
      : "public, max-age=31536000, immutable",
  };
  if (mimeType.toLowerCase().includes("html")) {
    headers["Content-Security-Policy"] = STAMP_CONTENT_CSP;
    headers["X-Frame-Options"] = "SAMEORIGIN";
    headers["X-Content-Type-Options"] = "nosniff";
  }
  return { ...headers }; // first call must not hand out the cached object
};
