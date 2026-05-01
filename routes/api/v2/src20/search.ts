import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { SRC20Service } from "$server/services/src20/index.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const query = url.searchParams.get("q") || "";
      const mintableOnly = url.searchParams.get("mintable_only") === "true";

      const results = await SRC20Service.QueryService.searchSrc20Data(
        query,
        mintableOnly,
      );

      return ApiResponseUtil.success({ data: results }, {
        routeType: RouteType.DYNAMIC,
      });
    } catch (error) {
      console.error("Error in search handler:", error);
      return ApiResponseUtil.internalError(
        error,
        "Error processing search request",
      );
    }
  },
};
