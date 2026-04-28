import type { BlockHandlerContext } from "$types/base.d.ts";
import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { getPaginationParams } from "$lib/utils/data/pagination/paginationUtils.ts";
import { SRC20Service } from "$server/services/src20/index.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

export const handler: Handlers<BlockHandlerContext> = {
  async GET(req, ctx) {
    const { block_index } = ctx.params;
    const url = new URL(req.url);

    // Extract pagination parameters
    const pagination = getPaginationParams(url);
    if (pagination instanceof Response) {
      return pagination;
    }
    const { limit, page } = pagination;

    // Extract other query parameters
    const tick = url.searchParams.get("tick");
    const sort = url.searchParams.get("sort");
    const op = url.searchParams.get("op");

    try {
      const result = await SRC20Service.QueryService.fetchBasicSrc20Data({
        block_index: Number(block_index),
        ...(tick && { tick }),
        ...(limit && { limit }),
        ...(page && { page }),
        ...(sort && { sort }),
        ...(op && { op }),
      });
      return ApiResponseUtil.success(result, {
        routeType: RouteType.BLOCKCHAIN_DATA,
      });
    } catch (error) {
      return ApiResponseUtil.internalError(error, "Error processing request");
    }
  },
};
