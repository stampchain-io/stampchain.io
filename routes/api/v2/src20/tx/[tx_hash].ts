import type { SRC20TrxRequestParams } from "$types/api.d.ts";
import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$utils/api/responses/apiResponseUtil.ts";
import { SRC20Service } from "$server/services/src20/index.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

export const handler: Handlers = {
  async GET(_req, ctx) {
    const { tx_hash } = ctx.params;
    // Transaction hash uniquely identifies a transaction - no pagination or sorting needed
    const params: SRC20TrxRequestParams = {
      tx_hash,
      singleResult: true, // Always return single result for transaction endpoint
    };

    try {
      const result = await SRC20Service.QueryService.fetchBasicSrc20Data(
        params,
      );

      // Check if result is empty (no transaction found)
      // For single transactions, we expect data to be an object, not an array or null
      if (
        !result.data ||
        result.data === null ||
        (Array.isArray(result.data) && result.data.length === 0)
      ) {
        return ApiResponseUtil.notFound(
          `Transaction not found: ${tx_hash}`,
        );
      }

      return ApiResponseUtil.success(result, {
        routeType: RouteType.BLOCKCHAIN_DATA,
      });
    } catch (error) {
      return ApiResponseUtil.internalError(error, "Error processing request");
    }
  },
};
