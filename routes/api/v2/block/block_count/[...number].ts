import { Handlers } from "$fresh/server.ts";
import { BlockController } from "$server/controller/blockController.ts";
import { ResponseUtil } from "$lib/utils/api/responses/responseUtil.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

export const handler: Handlers = {
  async GET(_req, ctx) {
    try {
      const { number } = ctx.params;
      const parsedNumber = number ? parseInt(number) : 100;

      if (
        Number.isNaN(parsedNumber) || parsedNumber < 1 || parsedNumber > 100
      ) {
        return ResponseUtil.badRequest(
          "Invalid number provided. Must be a number between 1 and 100.",
        );
      }

      const lastBlocks = await BlockController.getLastXBlocks(parsedNumber);
      return ResponseUtil.success(lastBlocks, {
        routeType: RouteType.BLOCKCHAIN_DATA,
      });
    } catch (error) {
      console.error("Failed to get last blocks:", error);
      return ResponseUtil.internalError(
        error,
        "Error processing block count request",
      );
    }
  },
};
