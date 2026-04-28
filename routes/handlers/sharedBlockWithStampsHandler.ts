import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { WebResponseUtil } from "$lib/utils/api/responses/webResponseUtil.ts";
import { BlockController } from "$server/controller/blockController.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

const sharedBlockWithStampsHandler: Handlers = {
  async GET(_req, ctx) {
    const { block_index } = ctx.params;
    const type = ctx.url.pathname.includes("/stamps/") ? "stamps" : "cursed";

    try {
      const response = await BlockController.getSharedBlockWithStamps(
        block_index,
        type,
      );
      return ApiResponseUtil.success(response, {
        routeType: RouteType.STAMP_LIST,
      });
    } catch (error) {
      console.error(`Error in ${type}/block handler:`, error);
      return ApiResponseUtil.internalError(
        error,
        `Block: ${block_index} not found`,
      );
    }
  },
};

export const handler = sharedBlockWithStampsHandler;

// Add default export for Fresh manifest compatibility - dummy handler
export default function () {
  return WebResponseUtil.success("OK", {
    headers: { "Content-Type": "text/plain" },
  });
}
