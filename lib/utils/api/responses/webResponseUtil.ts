import {
  getBinaryContentHeaders,
  getHtmlHeaders,
  getSecurityHeaders,
  getStampContentHeaders,
} from "$lib/utils/security/securityHeaders.ts";
import { normalizeHeaders } from "$lib/utils/api/headers/headerUtils.ts";
import {
  getCacheConfig,
  RouteType,
} from "$server/services/infrastructure/cacheService.ts";
import { API_RESPONSE_VERSION } from "$lib/utils/api/responses/apiResponseUtil.ts";

export interface WebResponseOptions {
  status?: number;
  headers?: Record<string, string>;
  forceNoCache?: boolean;
  routeType?: RouteType;
  raw?: boolean;
  immutableBinary?: boolean;
}

export interface StampResponseOptions extends WebResponseOptions {
  binary?: boolean;
  encoding?: string;
}

export class WebResponseUtil {
  static success(data: unknown, options: WebResponseOptions = {}): Response {
    const headers = {
      ...getSecurityHeaders({
        forceNoCache: options.forceNoCache ?? false,
        context: "web",
      }),
      "Content-Type": "application/json",
      "X-API-Version": API_RESPONSE_VERSION,
      ...(options.headers || {}),
    };

    if (options.routeType) {
      const { duration, staleWhileRevalidate, staleIfError } = getCacheConfig(
        options.routeType,
      );

      if (!options.forceNoCache && duration > 0) {
        const cacheControl = [
          "public",
          `max-age=${duration}`,
          staleWhileRevalidate
            ? `stale-while-revalidate=${staleWhileRevalidate}`
            : "",
          staleIfError ? `stale-if-error=${staleIfError}` : "",
        ].filter(Boolean).join(", ");

        Object.assign(headers, {
          "Cache-Control": cacheControl,
          "CDN-Cache-Control": cacheControl,
          "Cloudflare-CDN-Cache-Control": cacheControl,
          "Surrogate-Control": `max-age=${duration}`,
          "Edge-Control": `cache-maxage=${duration}`,
          "Vary": "Accept-Encoding, X-API-Version",
        });
      }
    }

    return new Response(JSON.stringify(data), {
      status: options.status || 200,
      headers: normalizeHeaders(headers),
    });
  }

  static stampResponse(
    content: string | null,
    mimeType: string,
    options: StampResponseOptions = {},
  ): Response {
    // Merge through a Headers object (never spread a Headers instance — it
    // has no own enumerable properties, so `{ ...headers }` is `{}`).
    // Caller-supplied headers override the stamp-content defaults.
    const headers = new Headers(getStampContentHeaders(mimeType, options));
    for (const [key, value] of Object.entries(options.headers || {})) {
      headers.set(key, value);
    }
    headers.set("X-API-Version", API_RESPONSE_VERSION);

    // Binary content handling
    if (options.binary && content) {
      try {
        const binaryString = atob(content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        headers.set("Vary", "Accept-Encoding, X-API-Version, Origin");
        headers.set("Content-Length", bytes.length.toString());
        return new Response(bytes, {
          headers: normalizeHeaders(headers),
        });
      } catch (error) {
        console.error("Failed to convert base64 to binary:", error);
        return this.internalError(error, "Failed to process binary content");
      }
    }

    // Text content handling
    const isTextBased = mimeType.includes("text/") ||
      mimeType.includes("javascript") ||
      mimeType.includes("application/json") ||
      mimeType.includes("xml");

    if (isTextBased) {
      headers.set("Vary", "Accept-Encoding, X-API-Version, Origin");
      headers.set("Content-Type", `${mimeType}; charset=utf-8`);
      return new Response(content, {
        headers: normalizeHeaders(headers),
      });
    }

    // Regular content
    return new Response(content, {
      status: options.status || 200,
      headers: normalizeHeaders(headers),
    });
  }

  static stampNotFound(options: WebResponseOptions = {}): Response {
    return new Response(null, {
      status: options.status || 404,
      headers: normalizeHeaders(
        new Headers({
          ...getHtmlHeaders({ forceNoCache: true }),
          "X-API-Version": API_RESPONSE_VERSION,
          "Vary": "Accept-Encoding, X-API-Version, Origin",
          ...(options.headers || {}),
        }),
      ),
    });
  }

  static notFound(
    message = "Not Found",
    options: WebResponseOptions = {},
  ): Response {
    return new Response(JSON.stringify({ error: message }), {
      status: 404,
      headers: normalizeHeaders({
        ...getSecurityHeaders({ forceNoCache: true }),
        "Content-Type": "application/json",
        "X-API-Version": API_RESPONSE_VERSION,
        ...(options.headers || {}),
      }),
    });
  }

  static internalError(
    error: unknown,
    message = "Internal server error",
    options: WebResponseOptions = {},
  ): Response {
    console.error("Internal Error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: normalizeHeaders({
          ...getSecurityHeaders({ forceNoCache: true }),
          "Content-Type": "application/json",
          "X-API-Version": API_RESPONSE_VERSION,
          ...(options.headers || {}),
        }),
      },
    );
  }

  static jsonResponse(
    data: unknown,
    options: WebResponseOptions = {},
  ): Response {
    return new Response(JSON.stringify(data), {
      status: options.status || 200,
      headers: normalizeHeaders(
        new Headers({
          ...getSecurityHeaders({ forceNoCache: false }),
          "Content-Type": "application/json",
          "X-API-Version": API_RESPONSE_VERSION,
          ...(options.headers || {}),
        }),
      ),
    });
  }

  static custom<T>(
    body: T,
    status: number,
    options: WebResponseOptions = {},
  ): Response {
    // For 204 No Content or null body, return response without body
    if (status === 204 || body === null || body === undefined) {
      return new Response(null, {
        status,
        headers: normalizeHeaders({
          ...getSecurityHeaders(options),
          "X-API-Version": API_RESPONSE_VERSION,
          ...(options.headers || {}),
        }),
      });
    }

    const responseBody: BodyInit | null =
      body instanceof ArrayBuffer || body instanceof Uint8Array
        ? body as BodyInit
        : JSON.stringify(body);
    return new Response(
      responseBody,
      {
        status,
        headers: normalizeHeaders({
          ...getSecurityHeaders(options),
          "Content-Type": "application/json",
          "X-API-Version": API_RESPONSE_VERSION,
          ...(options.headers || {}),
        }),
      },
    );
  }

  static badRequest(
    message: string,
    options: WebResponseOptions = {},
  ): Response {
    console.error("Bad Request:", message);
    return new Response(
      JSON.stringify({
        error: message,
        status: "error",
        code: "BAD_REQUEST",
      }),
      {
        status: 400,
        headers: normalizeHeaders({
          ...getSecurityHeaders({ forceNoCache: true }),
          "Content-Type": "application/json",
          "X-API-Version": API_RESPONSE_VERSION,
          ...(options.headers || {}),
        }),
      },
    );
  }

  static redirect(
    location: string,
    status = 302,
    options: WebResponseOptions = {},
  ): Response {
    return new Response(null, {
      status,
      headers: normalizeHeaders({
        ...(options.headers || {}),
        Location: location,
        "X-API-Version": API_RESPONSE_VERSION,
      }),
    });
  }

  static htmlResponse(
    htmlContent: string,
    options: WebResponseOptions = {},
  ): Response {
    return new Response(htmlContent, {
      status: options.status || 200,
      headers: normalizeHeaders({
        ...getHtmlHeaders({ forceNoCache: options.forceNoCache ?? false }),
        "Content-Type": "text/html; charset=utf-8",
        "X-API-Version": API_RESPONSE_VERSION,
        ...(options.headers || {}),
      }),
    });
  }

  /**
   * Re-emit an upstream response with a replaced body and optional header
   * overrides. Headers are merged case-insensitively so an override such as
   * `Vary` or `Cache-Control` replaces the upstream value regardless of key
   * casing. Pass `immutableBinary: true` to keep `Vary` limited to
   * `Accept-Encoding` (plus any caller-supplied values) so Cloudflare can
   * cache the response at the edge.
   */
  static modifiedResponse(
    content: string,
    originalResponse: Response,
    options: WebResponseOptions = {},
  ): Response {
    const merged = new Headers(originalResponse.headers);
    for (const [key, value] of Object.entries(options.headers || {})) {
      merged.set(key, value);
    }
    return new Response(content, {
      status: options.status ?? originalResponse.status,
      statusText: originalResponse.statusText,
      headers: normalizeHeaders(
        merged,
        options.immutableBinary ? { immutableBinary: true } : {},
      ),
    });
  }

  /**
   * XML document response (sitemaps, feeds). Mirrors `htmlResponse` but with
   * an XML content type. Caller-supplied headers override the defaults, so
   * pass explicit `Cache-Control` / CDN cache headers when the document must
   * not inherit the 1-year immutable default from `getSecurityHeaders`.
   */
  static xmlResponse(
    xmlContent: string,
    options: WebResponseOptions = {},
  ): Response {
    return new Response(xmlContent, {
      status: options.status || 200,
      headers: normalizeHeaders({
        ...getSecurityHeaders({
          forceNoCache: options.forceNoCache ?? false,
          context: "web",
        }),
        "Content-Type": "application/xml; charset=utf-8",
        "X-API-Version": API_RESPONSE_VERSION,
        ...(options.headers || {}),
      }),
    });
  }

  static binaryResponse(
    data: Uint8Array | ArrayBuffer,
    mimeType: string,
    options: WebResponseOptions = {},
  ): Response {
    return new Response(data as BodyInit, {
      status: options.status || 200,
      headers: normalizeHeaders(
        {
          ...getBinaryContentHeaders(mimeType, options),
          "Content-Type": mimeType,
          "X-API-Version": API_RESPONSE_VERSION,
          ...(options.headers || {}),
        },
        options.immutableBinary ? { immutableBinary: true } : {},
      ),
    });
  }

}
