import { Handlers } from "$fresh/server.ts";
import { Src101Controller } from "$server/controller/src101Controller.ts";
import { ResponseUtil } from "$lib/utils/api/responses/responseUtil.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

export const handler: Handlers = {
  async GET(_req, ctx) {
    const { deploy_hash } = ctx.params;

    try {
      const result = await Src101Controller.handleSrc101TotalCountRequest(
        deploy_hash,
      );

      if (!result || Object.keys(result).length === 0) {
        console.log("Empty result received:", result);
        return ResponseUtil.notFound("No data found");
      }

      return ResponseUtil.success(result, {
        routeType: RouteType.BLOCKCHAIN_DATA,
      });
    } catch (error) {
      console.error("Error in [deploy_hash]/total handler:", error);
      return ResponseUtil.internalError(
        error,
        "Error processing src101 totalCount request",
      );
    }
  },
};
