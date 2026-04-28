import type { PaginatedTickResponseBody } from "$types/api.d.ts";
// Unused imports removed: BlockHandlerContext, IdentHandlerContext, TickHandlerContext, SRC20TrxRequestParams
import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { isValidSrc20Tick } from "$lib/utils/typeGuards.ts";
import { getPaginationParams } from "$lib/utils/data/pagination/paginationUtils.ts";
import { Src20Controller } from "$server/controller/src20Controller.ts";
import {
  DEFAULT_PAGINATION,
  validateRequiredParams,
  validateSortParam,
} from "$server/services/validation/routeValidationService.ts";
import { BigFloat } from "bigfloat/mod.ts";
import { MarketDataRepository } from "$server/database/marketDataRepository.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    try {
      const { tick } = ctx.params;

      // Validate required parameters
      const paramsValidation = validateRequiredParams({ tick });
      if (!paramsValidation.isValid) {
        return paramsValidation.error!;
      }

      // Decode the tick parameter first
      const decodedTick = decodeURIComponent(String(tick));

      // Validate SRC20 tick format
      if (!isValidSrc20Tick(decodedTick)) {
        return ApiResponseUtil.badRequest(
          `Invalid SRC20 tick format: ${decodedTick}. Must be 1-5 characters, alphanumeric and special characters allowed.`,
        );
      }

      const url = new URL(req.url);
      const pagination = getPaginationParams(url);

      // Check if pagination validation failed
      if (pagination instanceof Response) {
        return pagination;
      }

      const { limit, page } = pagination;
      const opParam = url.searchParams.get("op") || undefined;

      // 🚀 NEW V2.3 PARAMETER
      const includeProgress =
        url.searchParams.get("includeProgress") === "true";

      // Validate sort parameter
      const sortValidation = validateSortParam(url, "sortBy");
      if (!sortValidation.isValid) {
        return sortValidation.error!;
      }

      // Ensure required pagination values
      const params = {
        tick: decodedTick,
        limit: limit || DEFAULT_PAGINATION.limit,
        page: page || DEFAULT_PAGINATION.page,
        ...(opParam && { op: opParam }),
        ...(sortValidation.data && { sortBy: sortValidation.data }),
        // 🚀 NEW V2.3 PARAMETER
        ...(includeProgress && { includeProgress }),
      };

      // Fetch data using controller
      const { src20_txs, total, lastBlock, mint_status } = await Src20Controller
        .getTickData(params);

      // Prepare pagination variables
      const totalPages = Math.ceil(total / (limit || DEFAULT_PAGINATION.limit));

      // Map data, ensuring all necessary fields are included
      const data = src20_txs.rows.map((tx: any) => ({
        ...tx,
        max: tx.max ? new BigFloat(tx.max).toString() : null,
        lim: tx.lim ? new BigFloat(tx.lim).toString() : null,
        amt: tx.amt ? new BigFloat(tx.amt).toString() : null,
      }));

      // Handle mint_status conversion
      const formattedMintStatus = mint_status
        ? {
          max_supply: mint_status.max_supply?.toString() ?? "0",
          total_minted: mint_status.total_minted?.toString() ?? "0",
          total_mints: mint_status.total_mints ?? 0,
          progress: mint_status.progress ?? "0",
          decimals: mint_status.decimals ?? 0,
          limit: mint_status.limit
            ? (typeof mint_status.limit === "string"
              ? mint_status.limit
              : String(mint_status.limit))
            : "0",
          tx_hash: mint_status.tx_hash ?? "", // Add required tx_hash field
        }
        : {
          max_supply: "0",
          total_minted: "0",
          total_mints: 0,
          progress: "0",
          decimals: 0,
          limit: "0",
          tx_hash: "", // Add required tx_hash field for default case
        };

      // Fetch market data for the tick
      const market_data = await MarketDataRepository.getSRC20MarketData(
        decodedTick,
      );

      // Construct response body
      const body: PaginatedTickResponseBody = {
        page: page || DEFAULT_PAGINATION.page,
        limit: limit || DEFAULT_PAGINATION.limit,
        total,
        totalPages,
        last_block: lastBlock,
        mint_status: formattedMintStatus,
        data,
        market_data, // Add market data field (null if not found)
      };

      return ApiResponseUtil.success(body, {
        routeType: RouteType.BLOCKCHAIN_DATA,
      });
    } catch (error) {
      console.error(error);
      return ApiResponseUtil.internalError(error, "Error processing request");
    }
  },
};
