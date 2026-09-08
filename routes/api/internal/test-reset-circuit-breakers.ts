import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { CircuitBreakerService } from "$server/services/infrastructure/circuitBreaker.ts";
import { InternalRouteGuard } from "$server/services/security/internalRouteGuard.ts";

// Operational endpoint: resetting every circuit breaker re-opens traffic to
// upstreams that tripped for a reason, and the metrics expose upstream health.
// Both methods require the internal API key, like the sibling monitoring and
// debug-headers routes; this handler shipped without any guard.
export const handler: Handlers = {
  POST(req) {
    const accessError = InternalRouteGuard.requireAPIKey(req);
    if (accessError) return accessError;
    try {
      // Reset all circuit breakers
      CircuitBreakerService.resetAllBreakers();

      return ApiResponseUtil.success({
        message: "All circuit breakers reset successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ApiResponseUtil.internalError(
        error,
        "Failed to reset circuit breakers",
      );
    }
  },

  GET(req) {
    const accessError = InternalRouteGuard.requireAPIKey(req);
    if (accessError) return accessError;
    try {
      // Get all circuit breaker metrics
      const metrics = CircuitBreakerService.getAllMetrics();

      return ApiResponseUtil.success({
        circuitBreakers: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return ApiResponseUtil.internalError(
        error,
        "Failed to get circuit breaker metrics",
      );
    }
  },
};
