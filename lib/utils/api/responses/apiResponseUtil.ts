import { normalizeHeaders } from "$lib/utils/api/headers/headerUtils.ts";
import { getSecurityHeaders } from "$lib/utils/security/securityHeaders.ts";
import {
  getCacheConfig,
  RouteType,
} from "$server/services/infrastructure/cacheService.ts";
import { serverConfig } from "$server/config/config.ts";

// Import types for internal use and re-export for server code
import type { ApiErrorResponse, APIResponse } from "$lib/types/api.ts";
export type { ApiErrorResponse, APIResponse };

// Server-specific version with RouteType enum
export interface ApiResponseOptions {
  status?: number;
  headers?: Record<string, string>;
  routeType?: RouteType;
  forceNoCache?: boolean;
}

export const API_RESPONSE_VERSION = "v2.2.7";

//  // Future structure
//  lib/utils/
//  ├── apiResponseUtil.ts    // API-specific responses (server-side utility class)
//  ├── webResponseUtil.ts    // Web/frontend responses
//  ├── securityHeaders.ts    // Shared security headers
//  └── headerUtils.ts        // Shared header utilities
//
//  lib/types/
//  └── api.ts                // Type definitions (client-safe, no Deno dependencies)

export class ApiResponseUtil {
  /**
   * Default cache duration (seconds) for API responses that don't specify
   * a routeType. Conservative 5-minute TTL prevents stale data while still
   * offloading repetitive identical requests from origin.
   */
  private static readonly DEFAULT_API_CACHE_SECONDS = 300;

  private static createHeaders(options: ApiResponseOptions = {}): Headers {
    const shouldCache = !(options.forceNoCache ?? false);

    const headers: Record<string, string> = {
      ...getSecurityHeaders({
        forceNoCache: !shouldCache,
        context: "api",
      }),
      "Content-Type": "application/json",
      "X-API-Version": API_RESPONSE_VERSION,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-Permitted-Cross-Domain-Policies": "none",
      ...(options.headers || {}),
    };

    // Skip cache header generation if caller supplied an explicit Cache-Control
    const hasExplicitCacheControl = options.headers &&
      Object.keys(options.headers).some((k) =>
        k.toLowerCase() === "cache-control"
      );

    if (shouldCache && !hasExplicitCacheControl) {
      let cacheControl: string;

      if (options.routeType) {
        const { duration, staleWhileRevalidate, staleIfError } = getCacheConfig(
          options.routeType,
        );

        if (duration > 0) {
          cacheControl = [
            "public",
            `max-age=${duration}`,
            staleWhileRevalidate
              ? `stale-while-revalidate=${staleWhileRevalidate}`
              : "",
            staleIfError ? `stale-if-error=${staleIfError}` : "",
          ].filter(Boolean).join(", ");
        } else {
          cacheControl = "";
        }
      } else {
        // No routeType specified: apply conservative default (5 min)
        // instead of the 1-year immutable from securityHeaders.
        cacheControl =
          `public, max-age=${this.DEFAULT_API_CACHE_SECONDS}, stale-while-revalidate=60`;
      }

      if (cacheControl) {
        Object.assign(headers, {
          "Cache-Control": cacheControl,
          "CDN-Cache-Control": cacheControl,
          "Cloudflare-CDN-Cache-Control": cacheControl,
          "Surrogate-Control": `max-age=${
            cacheControl.match(/max-age=(\d+)/)?.[1] ||
            this.DEFAULT_API_CACHE_SECONDS
          }`,
          "Edge-Control": `cache-maxage=${
            cacheControl.match(/max-age=(\d+)/)?.[1] ||
            this.DEFAULT_API_CACHE_SECONDS
          }`,
        });
      }
    }

    return new Headers(headers);
  }

  private static createErrorResponse(
    message: string,
    code: string,
    details?: unknown,
  ): ApiErrorResponse {
    return {
      error: message,
      status: "error",
      code,
      ...(details ? { details } : {}),
    };
  }

  private static serializeWithBigInt(data: unknown): string {
    // Fast path: if no BigInts, use regular JSON.stringify
    if (!this.hasBigInt(data)) {
      return JSON.stringify(data);
    }

    // Only use reviver when BigInts are present
    return JSON.stringify(data, (_key, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    });
  }

  private static hasBigInt(obj: unknown): boolean {
    if (typeof obj === "bigint") return true;
    if (obj === null || typeof obj !== "object") return false;
    if (Array.isArray(obj)) {
      return obj.some((item) => this.hasBigInt(item));
    }
    for (const value of Object.values(obj)) {
      if (this.hasBigInt(value)) return true;
    }
    return false;
  }

  static success(data: unknown, options: ApiResponseOptions = {}): Response {
    return new Response(
      this.serializeWithBigInt(data),
      {
        status: options.status || 200,
        headers: normalizeHeaders(this.createHeaders(options)),
      },
    );
  }

  static created(
    data: unknown,
    options: ApiResponseOptions = {},
  ): Response {
    return new Response(
      this.serializeWithBigInt(data),
      {
        status: 201,
        headers: normalizeHeaders(this.createHeaders(options)),
      },
    );
  }

  static noContent(options: ApiResponseOptions = {}): Response {
    return new Response(null, {
      status: 204,
      headers: normalizeHeaders(this.createHeaders(options)),
    });
  }

  static badRequest(
    message: string,
    details?: unknown,
    options: ApiResponseOptions = {},
  ): Response {
    console.error("Bad Request:", message, details || "");
    return new Response(
      JSON.stringify(this.createErrorResponse(message, "BAD_REQUEST", details)),
      {
        status: 400,
        headers: normalizeHeaders(this.createHeaders(options)),
      },
    );
  }

  static unauthorized(
    message = "Unauthorized",
    details?: unknown,
    options: ApiResponseOptions = {},
  ): Response {
    console.error("Unauthorized:", message, details || "");
    return new Response(
      JSON.stringify(
        this.createErrorResponse(message, "UNAUTHORIZED", details),
      ),
      {
        status: 401,
        headers: normalizeHeaders(this.createHeaders(options)),
      },
    );
  }

  static forbidden(
    message = "Forbidden",
    details?: unknown,
    options: ApiResponseOptions = {},
  ): Response {
    console.error("Forbidden:", message, details || "");
    return new Response(
      JSON.stringify(this.createErrorResponse(message, "FORBIDDEN", details)),
      {
        status: 403,
        headers: normalizeHeaders(this.createHeaders(options)),
      },
    );
  }

  static notFound(
    message = "Resource not found",
    details?: unknown,
    options: ApiResponseOptions = {},
  ): Response {
    return new Response(
      JSON.stringify(this.createErrorResponse(message, "NOT_FOUND", details)),
      {
        status: 404,
        headers: normalizeHeaders(this.createHeaders(options)),
      },
    );
  }

  static methodNotAllowed(
    message = "Method not allowed",
    details?: unknown,
    options: ApiResponseOptions = {},
  ): Response {
    return new Response(
      JSON.stringify(
        this.createErrorResponse(message, "METHOD_NOT_ALLOWED", details),
      ),
      {
        status: 405,
        headers: normalizeHeaders(this.createHeaders(options)),
      },
    );
  }

  static conflict(
    message: string,
    details?: unknown,
    options: ApiResponseOptions = {},
  ): Response {
    console.error("Conflict:", message, details || "");
    return new Response(
      JSON.stringify(this.createErrorResponse(message, "CONFLICT", details)),
      {
        status: 409,
        headers: normalizeHeaders(this.createHeaders(options)),
      },
    );
  }

  static tooManyRequests(
    message = "Too many requests",
    details?: unknown,
    options: ApiResponseOptions = {},
  ): Response {
    console.warn("Rate limit exceeded:", message, details || "");
    return new Response(
      JSON.stringify(
        this.createErrorResponse(message, "TOO_MANY_REQUESTS", details),
      ),
      {
        status: 429,
        headers: normalizeHeaders(this.createHeaders(options)),
      },
    );
  }

  static internalError(
    error: unknown,
    message: string = "Internal server error",
    options: ApiResponseOptions = {},
  ): Response {
    console.error("Internal Error:", error);

    // Check if we're in development mode (server-side only)
    const isDevelopment = typeof window === "undefined" &&
      typeof Deno !== "undefined" &&
      serverConfig.IS_DEVELOPMENT;

    return new Response(
      JSON.stringify(
        this.createErrorResponse(message, "INTERNAL_ERROR", {
          ...(isDevelopment ? { error } : {}),
        }),
      ),
      {
        status: 500,
        headers: normalizeHeaders(this.createHeaders(options)),
      },
    );
  }

  static serviceUnavailable(
    message = "Service temporarily unavailable",
    details?: unknown,
    options: ApiResponseOptions = {},
  ): Response {
    console.error("Service Unavailable:", message, details || "");
    return new Response(
      JSON.stringify(
        this.createErrorResponse(message, "SERVICE_UNAVAILABLE", details),
      ),
      {
        status: 503,
        headers: normalizeHeaders(this.createHeaders(options)),
      },
    );
  }

  static gone(
    message = "Resource no longer available",
    details?: unknown,
    options: ApiResponseOptions = {},
  ): Response {
    console.warn("Resource Gone:", message, details || "");
    return new Response(
      JSON.stringify(
        this.createErrorResponse(message, "GONE", details),
      ),
      {
        status: 410,
        headers: normalizeHeaders(this.createHeaders(options)),
      },
    );
  }

  // Helper method for custom responses
  static custom<T>(
    body: T,
    status: number,
    options: ApiResponseOptions = {},
  ): Response {
    const responseBody: BodyInit | null =
      body instanceof ArrayBuffer || body instanceof Uint8Array
        ? body as BodyInit
        : this.serializeWithBigInt(body);
    return new Response(
      responseBody,
      {
        status,
        headers: normalizeHeaders(this.createHeaders(options)),
      },
    );
  }
}
