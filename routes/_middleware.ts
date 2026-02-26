import { FreshContext } from "$fresh/server.ts";
import { WebResponseUtil } from "$utils/api/responses/webResponseUtil.ts";
import { serverConfig } from "$server/config/config.ts";

// Route configuration constants
const ROUTE_CONFIG = {
  DIRECT_ROUTES: [
    "/content/",
    "/s/",
    "/api/",
    "/internal/",
    "/test/",
    "/sitemap.xml",
  ],
  CACHED_ROUTES: [
    "/",
    "/presskit",
    "/termsofservice",
    "/privacy",
    "/about",
  ],
  API_ROUTES: ["/api/", "/s/", "/content/"],
};

// Cache duration constants (in seconds)
const CACHE_DURATION = {
  YEAR: 31536000,
  DAY: 86400,
  HOUR: 3600,
  MINUTE: 60,
} as const;

// Response headers interface for type safety
interface ResponseHeaders {
  "Timing-Allow-Origin": string;
  "Server-Timing": string;
  "Cache-Control"?: string;
  "Content-Type"?: string;
  "Location"?: string;
}

function getBaseUrl(req: Request): string {
  // Development mode
  if (serverConfig.IS_DEVELOPMENT) {
    return serverConfig.DEV_BASE_URL;
  }

  // Production mode - ECS-aware base URL detection
  const url = new URL(req.url);

  // Check for ECS/ALB forwarded headers first
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host") ||
    req.headers.get("host");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Fallback to explicit production URL if available
  if (serverConfig.PROD_BASE_URL) {
    return serverConfig.PROD_BASE_URL;
  }

  // Final fallback to request origin
  return url.origin;
}

export async function handler(
  req: Request,
  ctx: FreshContext,
) {
  const startTime = performance.now();
  const url = new URL(req.url);
  ctx.state.route = url.pathname;
  ctx.state.baseUrl = getBaseUrl(req);

  // Early return for API routes
  if (
    ROUTE_CONFIG.API_ROUTES.some((prefix) => url.pathname.startsWith(prefix))
  ) {
    return ctx.next();
  }

  // Base cache headers with proper typing
  const cacheHeaders: Partial<ResponseHeaders> = {
    "Timing-Allow-Origin": "*",
    "Server-Timing": `start;dur=${performance.now() - startTime}`,
  };

  // Handle permanent redirects
  if (url.pathname === "/home") {
    return WebResponseUtil.redirect("/", 308, {
      headers: {
        "Cache-Control": `public, max-age=${CACHE_DURATION.YEAR}`,
      },
    });
  }

  // CSS files get longest cache and specific content type
  if (url.pathname.endsWith(".css")) {
    ctx.state.responseInit = {
      headers: {
        ...cacheHeaders,
        "Cache-Control": `public, max-age=${CACHE_DURATION.YEAR}`,
        "Content-Type": "text/css",
      },
    };
  }

  // Font-specific caching
  if (url.pathname.includes("fonts.")) {
    ctx.state.responseInit = {
      headers: {
        ...cacheHeaders,
        "Cache-Control": `public, max-age=${CACHE_DURATION.YEAR}`,
      },
    };
  }

  // Root and other static routes
  if (ROUTE_CONFIG.CACHED_ROUTES.includes(url.pathname)) {
    ctx.state.responseInit = {
      headers: {
        ...cacheHeaders,
        "Cache-Control": `public, max-age=${CACHE_DURATION.HOUR}`,
      },
    };
  }

  // Direct route check
  if (
    ROUTE_CONFIG.DIRECT_ROUTES.some((prefix) => url.pathname.startsWith(prefix))
  ) {
    ctx.state.skipAppLayout = true;
  }

  // Process request and add final timing
  const response = await ctx.next();
  const endTime = performance.now();
  const existingTiming = response.headers.get("Server-Timing") || "";

  response.headers.set(
    "Server-Timing",
    `${existingTiming}, total;dur=${endTime - startTime}`,
  );

  // For HTML responses, reorder meta tags to appear before modulepreload links
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("text/html") && response.ok) {
    try {
      const html = await response.text();

      // Only process if it looks like a full HTML document
      if (html.includes("<head>") && html.includes("</head>")) {
        // Extract all meta tags that should appear early
        const metaTagRegex =
          /<meta\s+(?:charset|name="viewport"|property="og:|name="twitter:|name="description")[^>]*>/gi;
        const metaTags = html.match(metaTagRegex) || [];

        // Remove extracted meta tags from their original position
        let modifiedHtml = html;
        metaTags.forEach((tag) => {
          modifiedHtml = modifiedHtml.replace(tag, "");
        });

        // Insert meta tags right after <head>
        const headIndex = modifiedHtml.indexOf("<head>");
        if (headIndex !== -1) {
          const insertPosition = headIndex + 6; // Length of "<head>"
          modifiedHtml = modifiedHtml.slice(0, insertPosition) +
            "\n" + metaTags.join("\n") + "\n" +
            modifiedHtml.slice(insertPosition);
        }

        // Return modified response
        return WebResponseUtil.modifiedResponse(modifiedHtml, response);
      }
    } catch (error) {
      console.error("Error reordering meta tags:", error);
      // Return original response if processing fails
    }
  }

  return response;
}
