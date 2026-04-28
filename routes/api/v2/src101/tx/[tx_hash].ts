import { Handlers } from "$fresh/server.ts";
import { Src101Controller } from "$server/controller/src101Controller.ts";
import { ResponseUtil } from "$lib/utils/api/responses/responseUtil.ts";
import { getPaginationParams } from "$lib/utils/data/pagination/paginationUtils.ts";
import {
  DEFAULT_PAGINATION,
  validateRequiredParams,
} from "$server/services/validation/routeValidationService.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    try {
      const { tx_hash } = ctx.params;

      // Validate required parameters
      const paramsValidation = validateRequiredParams({ tx_hash });
      if (!paramsValidation.isValid) {
        return paramsValidation.error!;
      }

      const url = new URL(req.url);
      const pagination = getPaginationParams(url);

      // Check if pagination validation failed
      if (pagination instanceof Response) {
        return pagination;
      }

      const { limit, page } = pagination;

      const queryParams = {
        tx_hash,
        limit: limit || DEFAULT_PAGINATION.limit,
        page: page || DEFAULT_PAGINATION.page,
      };
      const result = await Src101Controller.handleValidSrc101TxRequest(
        queryParams,
      );

      if (!result || Object.keys(result).length === 0) {
        console.log("Empty result received:", result);
        return ResponseUtil.notFound("No data found");
      }

      return ResponseUtil.success(result, {
        routeType: RouteType.BLOCKCHAIN_DATA,
      });
    } catch (error) {
      console.error("Error in index handler:", error);
      return ResponseUtil.internalError(
        error,
        "Error processing src101 valid tx request",
      );
    }
  },
};
