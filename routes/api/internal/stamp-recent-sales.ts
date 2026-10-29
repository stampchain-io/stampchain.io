import { STAMP_TYPE_VALUES } from "$constants";
import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { getPaginationParams } from "$lib/utils/data/pagination/paginationUtils.ts";
import { logger } from "$lib/utils/logger.ts";
import { BlockService } from "$server/services/core/blockService.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";
import { InternalApiFrontendGuard } from "$server/services/security/internalApiFrontendGuard.ts";
import { StampService } from "$server/services/stampService.ts";
import {
  checkEmptyResult,
  DEFAULT_PAGINATION,
} from "$server/services/validation/routeValidationService.ts";

/**
 * Internal API endpoint for recent stamp sales with cleaned structure
 * - Removes duplicate fields (stamp_number, lastSalePrice, lastSalePriceUSD)
 * - Standardizes all field names to snake_case
 * - Maintains same underlying data source and functionality
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);

      // Security check for internal endpoints
      const originError = await InternalApiFrontendGuard.requireInternalAccess(
        req,
      );
      if (originError) {
        logger.warn("stamps", {
          message: "Origin validation failed for internal stamp recent_sales",
          origin: url.origin,
        });
        return originError;
      }

      const pagination = getPaginationParams(url);

      // Check if pagination validation failed
      if (pagination instanceof Response) {
        return pagination;
      }

      const { limit, page } = pagination;

      // Parse additional query parameters for enhanced functionality
      const parsedDayRange = parseInt(
        url.searchParams.get("dayRange") || "30",
      );
      const dayRange = isNaN(parsedDayRange) || parsedDayRange <= 0
        ? 30
        : parsedDayRange;
      const includeFullDetails = url.searchParams.get("fullDetails") === "true";
      const type = url.searchParams.get("type") as
        | "all"
        | "classic"
        | "cursed"
        | "posh"
        | "stamps"
        | "src20" || "all";

      // Validate type parameter
      // Note: src20 is available for completeness but not used in frontend navigation
      // (SRC-20 tokens are handled separately in the app)
      const stampType = STAMP_TYPE_VALUES.includes(type as any) ? type : "all";

      // Use existing StampService.getRecentSales method as data source
      const result = await StampService.getRecentSales(
        page || DEFAULT_PAGINATION.page,
        limit || DEFAULT_PAGINATION.limit,
        {
          dayRange,
          includeFullDetails,
          type: stampType,
        },
      );

      // Check for empty result
      const emptyCheck = checkEmptyResult(result, "recent sales data");
      if (emptyCheck) {
        return emptyCheck;
      }

      // Transform data to new clean structure
      const cleanedSales = result.recentSales.map(
        (sale: any, index: number) => {
          // Debug: Log stamp_url values to identify corruption point
          if (!sale.stamp_url) {
            console.warn(
              `[API] Sale ${index} missing stamp_url. Raw sale data:`,
              {
                stamp: sale.stamp,
                stamp_url: sale.stamp_url,
                stamp_mimetype: sale.stamp_mimetype,
                has_stamp_url: "stamp_url" in sale,
                stamp_url_type: typeof sale.stamp_url,
              },
            );
          }

          return {
            // Core stamp fields (from StampRow interface)
            tx_hash: sale.tx_hash,
            cpid: sale.cpid,
            stamp: sale.stamp,
            block_index: sale.block_index,
            // ECX only: the stamp's creation block (block_index is the sale's).
            ...(sale.stamp_block_index !== undefined &&
              { stamp_block_index: sale.stamp_block_index }),
            timestamp: sale.timestamp,
            stamp_url: sale.stamp_url,
            stamp_mimetype: sale.stamp_mimetype,
            creator: sale.creator,
            creator_name: sale.creator_name,
            source: sale.source,
            destination: sale.destination,
            activity_level: sale.activity_level,
            last_activity_time: sale.last_activity_time,

            // Sale data nested structure (matches StampWithEnhancedSaleData.sale_data interface)
            sale_data: {
              btc_amount: sale.btc_amount,
              block_index: sale.block_index,
              tx_hash: sale.tx_hash,
              buyer_address: sale.buyer_address,
              dispenser_address: sale.dispenser_address,
              time_ago: sale.time_ago,
              btc_amount_satoshis: sale.btc_amount_satoshis,
              dispenser_tx_hash: sale.dispenser_tx_hash,
              dispense_quantity: sale.dispense_quantity,
            },

            // Top-level sale detail fields (expected by comprehensive tests)
            dispenser_address: sale.dispenser_address ?? "",
            time_ago: sale.time_ago ?? "",
            btc_amount_satoshis: sale.btc_amount_satoshis ?? 0,
            transaction_hash: sale.tx_hash ?? "",

            // Newman test compatibility fields - use snake_case
            last_sale_price: sale.btc_amount, // Map to btc_amount for Newman tests
            last_sale_price_usd: sale.usd_price, // Map to usd_price for Newman tests
            buyer_address: sale.buyer_address ?? "", // Top-level buyer_address for Newman tests

            // Additional fields for backward compatibility and enhanced data
            usd_amount: sale.usd_price, // Renamed from usd_price for consistency
            btc_price_usd: sale.btc_price_usd,
            last_sale_date: sale.lastSaleDate ?? "",
            btc_rate: sale.btc_rate,
            satoshi_rate: sale.satoshi_rate,
            dispense_quantity: sale.dispense_quantity,
            transaction_details: sale.transaction_details,
          };
        },
      );

      // Get last block for response consistency
      const lastBlock = await BlockService.getLastBlock();

      // Build clean response structure
      const cleanResponse = {
        page: page || DEFAULT_PAGINATION.page,
        limit: limit || DEFAULT_PAGINATION.limit,
        total: result.total,
        total_pages: limit ? Math.ceil(result.total / limit) : 1,
        last_block: lastBlock,
        data: cleanedSales,
        btc_price_usd: result.btcPriceUSD, // Use snake_case convention
        metadata: {
          day_range: result.metadata.dayRange, // Use snake_case convention
          full_details: result.metadata.fullDetails, // Use snake_case convention
          total_sales: result.metadata.totalSales, // Use snake_case convention
          total_volume_btc: result.metadata.totalVolumeBTC, // Use snake_case convention
          total_volume_usd: result.metadata.totalVolumeUSD, // Use snake_case convention
          average_price_btc: result.metadata.averagePriceBTC, // Use snake_case convention
          average_price_usd: result.metadata.averagePriceUSD, // Use snake_case convention
          unique_stamps: result.metadata.uniqueStamps, // Use snake_case convention
          unique_buyers: result.metadata.uniqueBuyers, // Use snake_case convention
          unique_sellers: result.metadata.uniqueSellers, // Use snake_case convention
          query_time: result.metadata.queryTime, // Use snake_case convention
          last_updated: result.metadata.lastUpdated, // Use snake_case convention
        },
      };

      // Return with long cache duration - will use append strategy on new blocks
      return ApiResponseUtil.success(cleanResponse, {
        routeType: RouteType.STATIC, // 24 hour cache, but appended on new blocks
      });
    } catch (error) {
      logger.error("stamps", {
        message: "Error in internal stamp recent_sales endpoint",
        error: error instanceof Error ? error.message : String(error),
      });

      return ApiResponseUtil.internalError(
        error,
        "Error processing internal recent sales request",
      );
    }
  },
};
