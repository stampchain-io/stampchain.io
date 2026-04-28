import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { VERSION_CONFIG } from "$server/middleware/apiVersionMiddleware.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

/**
 * Simple API Version Endpoint
 *
 * GET /api/v2/version - Returns the current API version string
 *
 * This endpoint provides a simple version identifier for the API,
 * matching the OpenAPI schema expectation of a single version string.
 * For comprehensive version information, use /api/v2/versions instead.
 */

export const handler: Handlers = {
  GET(_req, ctx) {
    // Get the current API version from context or default
    const currentVersion: string =
      (typeof ctx.state.apiVersion === "string"
        ? ctx.state.apiVersion
        : null) ||
      VERSION_CONFIG.defaultVersion;

    // Return simple version response matching schema expectation
    const response = {
      version: currentVersion,
    };

    return ApiResponseUtil.success(response, { routeType: RouteType.STATIC });
  },
};
