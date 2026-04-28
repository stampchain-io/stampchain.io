import { Handlers } from "$fresh/server.ts";
import { Src101Controller } from "$server/controller/src101Controller.ts";
import { ResponseUtil } from "$lib/utils/api/responses/responseUtil.ts";
import { getPaginationParams } from "$lib/utils/data/pagination/paginationUtils.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

export interface SRC101TxParams {
  tick?: string;
  op?: string;
  valid?: number;
  block_index?: string;
  deploy_hash?: string;
  limit?: number;
  page?: number;
}

export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const paginationResult = getPaginationParams(url);
      if (paginationResult instanceof Response) {
        return paginationResult;
      }
      const { limit, page } = paginationResult;
      const block_index = url.searchParams.get("block_index");
      const deploy_hash = url.searchParams.get("deploy_hash");
      const valid = Number(url.searchParams.get("valid"));
      const op = url.searchParams.get("op");

      const queryParams = {
        ...(block_index && { block_index }),
        ...(deploy_hash && { deploy_hash }),
        ...(valid && { valid }),
        ...(op && { op }),
        limit: limit || 1000,
        page: page || 1,
      };

      const result = await Src101Controller.handleSrc101TXFromSRC101Table(
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
