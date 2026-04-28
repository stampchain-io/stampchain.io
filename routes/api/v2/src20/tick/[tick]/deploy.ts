// All handler context and response type imports removed - not used in this file
import { Src20Controller } from "$server/controller/src20Controller.ts";
//  // Temporarily replaced
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { FreshContext } from "$fresh/server.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

// Define params shape explicitly for this route
interface DeployRouteParams {
  tick: string;
}

// If you had custom state for TickHandlerContext, define it here or use a shared state type.
// For now, using `unknown` for state if not specifically needed by this handler.
export const handler = async (
  req: Request,
  ctx: FreshContext<unknown, unknown, DeployRouteParams>, // Using FreshContext with explicit params and unknown state/data
): Promise<Response> => {
  try {
    const tick = decodeURIComponent(ctx.params.tick); // ctx.params.tick is string
    // If 'op' was needed from query params: const op = ctx.url.searchParams.get("op");

    const body = await Src20Controller.handleDeploymentRequest(tick, req);
    return ApiResponseUtil.success(body, {
      routeType: RouteType.BLOCKCHAIN_DATA,
    });
  } catch (error) {
    console.error("Error in deploy handler:", error);
    return ApiResponseUtil.internalError(error, "Internal server error");
  }
};
