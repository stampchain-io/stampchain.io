import { FreshContext } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { apiVersionMiddleware } from "$server/middleware/apiVersionMiddleware.ts";
import {
  openapiValidatorMiddleware,
  requestValidatorMiddleware,
} from "$server/middleware/openapiValidator.ts";
import { transformResponseForVersion } from "$server/middleware/schemaTransformer.ts";
import { rateLimitMiddleware } from "$server/middleware/rateLimiter.ts";
import { serverConfig } from "$server/config/config.ts";

/**
 * API-specific middleware
 * Handles API versioning, response transformation, and common API concerns
 *
 * Middleware execution order (CRITICAL):
 * 1. Request validation (OpenAPI)
 * 2. Rate limiting (NEW - protects API from abuse)
 * 3. API version middleware
 * 4. Response transformation
 * 5. Response validation (OpenAPI)
 */

export async function handler(
  req: Request,
  ctx: FreshContext,
) {
  try {
    // Store request in state for middleware
    ctx.state.request = req;

    // Apply request validation first (if enabled)
    if (!serverConfig.OPENAPI_VALIDATION_DISABLED) {
      // Create a context wrapper for the request validator
      const requestValidationContext = {
        request: req,
        response: { status: 200, body: null, headers: new Headers() },
        state: ctx.state,
      };

      // Run request validation
      await requestValidatorMiddleware(
        requestValidationContext as any,
        async () => {
          // No-op - validation happens before continuing
        },
      );

      // If validation set a response status of 400, return the error
      if (
        requestValidationContext.response.status === 400 &&
        requestValidationContext.response.body
      ) {
        const responseBody = requestValidationContext.response.body as any;
        return ApiResponseUtil.badRequest(
          responseBody.message || "Request validation failed",
          responseBody,
        );
      }
    }

    // Apply rate limiting and API version middleware (STEP 2 & 3)
    // Rate limiter handles its own exemptions (health checks, internal APIs, API keys)
    // We combine them into a single middleware chain
    const versionResponse = await rateLimitMiddleware(req, {
      ...ctx,
      next: async () => {
        // Continue to API version middleware
        return await apiVersionMiddleware(ctx, async () => {
          // Continue to next middleware/handler
          const response = await ctx.next();

          // Transform response based on API version
          if (ctx.state.apiVersion && response.ok) {
            try {
              const contentType = response.headers.get("content-type");

              // Only transform JSON responses
              if (contentType?.includes("application/json")) {
                // Clone the response to avoid consuming the body
                const clonedResponse = response.clone();

                // Check if response body is readable
                const reader = clonedResponse.body?.getReader();
                if (!reader) {
                  console.warn(
                    "Response body is not readable, skipping transformation",
                  );
                  return response;
                }
                reader.releaseLock();

                // Parse JSON with error handling
                let data;
                try {
                  data = await clonedResponse.json();
                } catch (jsonError) {
                  console.warn(
                    "Failed to parse response as JSON, skipping transformation:",
                    jsonError,
                  );
                  return response;
                }

                const transformed = transformResponseForVersion(
                  data,
                  ctx.state.apiVersion as string,
                );

                // Create new response with transformed data and all headers
                const newHeaders = new Headers(response.headers);

                // Add version-specific headers
                newHeaders.set("API-Version", ctx.state.apiVersion as string);

                if (
                  ctx.state.versionContext &&
                  typeof ctx.state.versionContext === "object"
                ) {
                  const versionContext = ctx.state.versionContext as {
                    isDeprecated?: boolean;
                    endOfLife?: string;
                  };
                  const { isDeprecated, endOfLife } = versionContext;

                  if (isDeprecated) {
                    newHeaders.set("Deprecation", "true");
                    newHeaders.set("Sunset", endOfLife || "");
                    newHeaders.set(
                      "Link",
                      `<https://stampchain.io/docs/api/migration>; rel="deprecation"`,
                    );
                  }
                }

                return ApiResponseUtil.success(transformed, {
                  status: response.status,
                  headers: Object.fromEntries(newHeaders),
                });
              }
            } catch (error) {
              console.error("Error transforming response:", error);
              // Return original response on error
              return response;
            }
          }

          return response;
        });
      },
    });

    // Apply OpenAPI validation middleware after version transformation
    // This ensures we validate the final response structure
    // Validation is always on unless explicitly disabled
    if (!serverConfig.OPENAPI_VALIDATION_DISABLED) {
      // Create a context wrapper for the OpenAPI validator
      const validationContext = {
        request: req,
        response: versionResponse,
        state: ctx.state,
      };

      await openapiValidatorMiddleware(validationContext as any, async () => {
        // No-op, validation happens on the response
      });
    }

    return versionResponse;
  } catch (error) {
    // Handle timeout/abort errors gracefully
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      console.error("[API Middleware] Request timeout:", {
        url: req.url,
        method: req.method,
        error: error.message,
      });
      return ApiResponseUtil.custom(
        {
          status: "error",
          message: "Request timeout - the operation took too long to complete",
          error: "GATEWAY_TIMEOUT",
        },
        504,
        { forceNoCache: true },
      );
    }

    // Handle other errors
    console.error("[API Middleware] Unhandled error:", error);
    return ApiResponseUtil.internalError(error);
  }
}
