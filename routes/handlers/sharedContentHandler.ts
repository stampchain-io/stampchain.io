import { FreshContext } from "$fresh/server.ts";
import { getIdentifierType } from "$lib/utils/data/identifiers/identifierUtils.ts";
import { isCpid, isTxHash } from "$lib/utils/typeGuards.ts";
import { logger } from "$lib/utils/logger.ts";
import { cleanHtmlForRendering } from "$lib/utils/ui/rendering/htmlCleanup.ts";
import { getRecursiveHeaders } from "$lib/utils/security/securityHeaders.ts";
import { WebResponseUtil } from "$lib/utils/api/responses/webResponseUtil.ts";
import { StampController } from "$server/controller/stampController.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";
import type { State } from "$types/ui.d.ts";
import { serverConfig } from "$server/config/config.ts";
// import { getBaseUrl } from "$lib/utils/ui/media/imageUtils.ts";
// import { getMimeType } from "$lib/utils/ui/media/imageUtils.ts";

// Define the state type

export async function handleContentRequest(
  identifier: string,
  ctx: FreshContext<State>,
) {
  logger.debug("content", {
    message: "Content request received",
    identifier,
    path: ctx.url.pathname,
    baseUrl: ctx.state.baseUrl,
    env: serverConfig.DENO_ENV,
  });

  const isFullPath = identifier.includes(".") || ctx.url.pathname.includes(".");

  try {
    // Validate identifier based on path type
    if (!isFullPath) {
      const idType = getIdentifierType(identifier);
      const isValidId = isCpid(identifier) ||
        idType === "tx_hash" ||
        idType === "stamp_hash";

      if (!isValidId) {
        logger.debug("content", {
          message: "Invalid identifier",
          identifier,
          idType,
        });
        return WebResponseUtil.stampNotFound();
      }
    } else {
      // Extract the base identifier without extension
      const [id] = identifier.split(".");
      if (!isTxHash(id)) {
        return WebResponseUtil.stampNotFound();
      }
    }

    // For /content/ routes, we need to determine the proper file extension
    // First, try to get stamp info to determine the correct URL
    const response = await StampController.getStampFile(
      identifier,
      RouteType.STAMP_DETAIL,
      ctx.state.baseUrl,
      isFullPath,
    );

    // Check if this is a redirect response
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get("location");

      // For HTML files, we need to fetch and process the content
      // to avoid Cloudflare's CDN-level Rocket Loader transformation
      if (location && identifier.toLowerCase().endsWith(".html")) {
        try {
          // Fetch the content from the CDN location
          const contentResponse = await fetch(location);
          if (contentResponse.ok) {
            const rawHtml = await contentResponse.text();
            const htmlContent = cleanHtmlForRendering(rawHtml);

            // Use the standardized HTML response method with headers to prevent CDN modifications
            const recursiveHeaders = getRecursiveHeaders();
            return WebResponseUtil.htmlResponse(htmlContent, {
              headers: {
                ...Object.fromEntries(recursiveHeaders),
                // Allow Cloudflare CDN to cache stamp content at the edge.
                // Stamp data is immutable — once inscribed it never changes.
                // Edge caching is critical for recursive stamps where the CF
                // Browser Rendering worker loads sub-resources via iframes;
                // without it every sub-request round-trips to ECS origin.
                // CDN-Cache-Control is required because CF doesn't cache HTML
                // by default even with Cache-Control s-maxage.
                "Cache-Control": "public, max-age=3600, no-transform",
                "CDN-Cache-Control": "public, max-age=86400",
                // Override Vary to only include CF-supported values.
                // Default "X-API-Version" in Vary causes CF to skip caching.
                "Vary": "Accept-Encoding",
                "X-Frame-Options": "SAMEORIGIN",
                "X-Content-Type-Options": "nosniff",
                "X-Content-Transformed": "true",
              },
            });
          }
        } catch (error) {
          logger.error("content", {
            message: "Error fetching HTML content from redirect",
            identifier,
            location,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      // Return the redirect response for non-HTML files
      return response;
    }

    // For direct 200 HTML responses, add edge caching headers.
    // Stamp content is immutable — once inscribed it never changes.
    // CDN-Cache-Control tells Cloudflare to cache HTML at the edge,
    // which is critical for recursive stamp sub-resources loaded via
    // iframes in the CF Browser Rendering worker.
    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.includes("text/html")) {
      const body = await response.text();
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "public, max-age=3600, no-transform");
      headers.set("CDN-Cache-Control", "public, max-age=86400");
      // Override Vary to only include CF-supported values.
      // Default "X-API-Version" in Vary causes CF to skip caching.
      headers.set("Vary", "Accept-Encoding");
      headers.set("X-Frame-Options", "SAMEORIGIN");
      headers.set("X-Content-Type-Options", "nosniff");
      return new Response(body, {
        status: response.status,
        headers,
      });
    }

    return response;
  } catch (error) {
    logger.error("content", {
      message: "Content handler error",
      identifier,
      error: error instanceof Error ? error.message : String(error),
      path: ctx.url.pathname,
    });
    return WebResponseUtil.stampNotFound();
  }
}

// Export is already done in function declaration above

// Add default export for Fresh manifest compatibility - dummy handler
export default function () {
  return WebResponseUtil.success("OK", {
    headers: { "Content-Type": "text/plain" },
  });
}
