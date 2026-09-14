import type {
  StampEdition,
  StampFilesize,
  StampFiletype,
  StampMarketplace,
  StampRange,
} from "$constants";
import {
  API_STAMP_TYPE_VALUES,
  type HandlerStampType,
  MAX_PAGINATION_LIMIT,
} from "$constants";
import { Handlers } from "$fresh/server.ts";
import type { StampRow } from "$lib/types/stamp.d.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { WebResponseUtil } from "$lib/utils/api/responses/webResponseUtil.ts";
import { getIdentifierType } from "$lib/utils/data/identifiers/identifierUtils.ts";
import { getPaginationParams } from "$lib/utils/data/pagination/paginationUtils.ts";
import { StampController } from "$server/controller/stampController.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";
import { validateSortDirection } from "$server/services/validation/validationService.ts";

type StampHandlerConfig = {
  type: HandlerStampType;
  isIndex: boolean;
};

/**
 * Determines the appropriate cache RouteType based on the path and options
 */
function getCacheType(path: string, isIndex: boolean): RouteType {
  // Index route gets long cache
  if (isIndex) {
    return RouteType.STAMP_LIST;
  }

  // Check path for specific routes
  if (path.includes("/dispenses")) {
    return RouteType.STAMP_DISPENSE;
  }
  if (path.includes("/dispensers")) {
    return RouteType.STAMP_DISPENSER;
  }
  if (path.includes("/sends")) {
    return RouteType.STAMP_SEND;
  }
  if (path.includes("/holders")) {
    return RouteType.BALANCE; // Holders are like balances
  }

  // Individual stamp details get short cache
  return RouteType.STAMP_DETAIL;
}

function getSortParameter(url: URL): string | null {
  const sortBy = url.searchParams.get("sortBy");
  return sortBy;
}

export const createStampHandler = (
  routeConfig: StampHandlerConfig,
): Handlers => ({
  async GET(req: Request, ctx) {
    try {
      const url = new URL(req.url);
      const cacheType = getCacheType(url.pathname, routeConfig.isIndex);
      const requestQuery = url.searchParams.get("q");

      if (routeConfig.isIndex) {
        const pagination = getPaginationParams(url);

        // Check if pagination validation failed
        if (pagination instanceof Response) {
          return pagination;
        }

        const { limit, page } = pagination;
        const effectiveLimit = Math.min(
          limit ?? MAX_PAGINATION_LIMIT,
          MAX_PAGINATION_LIMIT,
        );

        // Get and validate sort parameter using new helper
        const sortParam = getSortParameter(url);
        const sortValidation = validateSortDirection(sortParam);
        if (sortValidation instanceof Response) {
          return sortValidation;
        }

        // Extract filters
        const fileType = url.searchParams.get("filetype")?.split(",")
          .filter(Boolean) as StampFiletype[] | undefined;
        const editions = url.searchParams.get("editions")?.split(",")
          .filter(Boolean) as StampEdition[] | undefined;

        // Extract ident parameter
        const identParam = url.searchParams.get("ident");
        const ident = identParam
          ? identParam.split(",").filter(Boolean) as any
          : undefined;

        // Extract new marketplace filters
        const market = url.searchParams.get("market") as
          | Extract<StampMarketplace, "listings" | "sales">
          | "";
        const dispensers = url.searchParams.get("dispensers") === "true";
        const atomics = url.searchParams.get("atomics") === "true";
        const listings = url.searchParams.get("listings") as
          | Extract<
            StampMarketplace,
            "all" | "bargain" | "affordable" | "premium" | "custom"
          >
          | "";
        const listingsMin = url.searchParams.get("listingsMin") || undefined;
        const listingsMax = url.searchParams.get("listingsMax") || undefined;
        const sales = url.searchParams.get("sales") as
          | Extract<
            StampMarketplace,
            "recent" | "premium" | "custom" | "volume"
          >
          | "";
        const salesMin = url.searchParams.get("salesMin") || undefined;
        const salesMax = url.searchParams.get("salesMax") || undefined;
        const volume = url.searchParams.get("volume") as
          | "24h"
          | "7d"
          | "30d"
          | "";
        const volumeMin = url.searchParams.get("volumeMin") || undefined;
        const volumeMax = url.searchParams.get("volumeMax") || undefined;

        // Extract file size filters
        const fileSize = url.searchParams.get("fileSize") as
          | StampFilesize
          | null;
        const fileSizeMin = url.searchParams.get("fileSizeMin") || undefined;
        const fileSizeMax = url.searchParams.get("fileSizeMax") || undefined;

        // Extract type parameter (NEW: Support for stamp type filtering!)
        const typeParam = url.searchParams.get("type");
        const stampType = typeParam === "all"
          ? "all"
          : (typeParam && API_STAMP_TYPE_VALUES.includes(typeParam as any))
          ? typeParam as
            | "classic"
            | "cursed"
            | "posh"
            | "src20"
          : "classic"; // Default to classic

        // Extract range filters
        const rangePreset = url.searchParams.get("rangePreset") || "";
        const rangeMin = url.searchParams.get("rangeMin") || "";
        const rangeMax = url.searchParams.get("rangeMax") || "";

        let range: StampRange | undefined = undefined;

        // Set range based on preset or custom values
        if (
          rangePreset &&
          ["100", "1000", "5000", "10000"].includes(rangePreset)
        ) {
          range = rangePreset as StampRange;
        } else if (rangeMin || rangeMax) {
          range = "custom";
        }

        // Extract market data filters (Task 42)
        const minHolderCount = url.searchParams.get("minHolderCount") ||
          undefined;
        const maxHolderCount = url.searchParams.get("maxHolderCount") ||
          undefined;
        const minDistributionScore =
          url.searchParams.get("minDistributionScore") || undefined;
        const maxTopHolderPercentage =
          url.searchParams.get("maxTopHolderPercentage") || undefined;
        const minFloorPriceBTC = url.searchParams.get("minFloorPriceBTC") ||
          undefined;
        const maxFloorPriceBTC = url.searchParams.get("maxFloorPriceBTC") ||
          undefined;
        const minVolume24h = url.searchParams.get("minVolume24h") || undefined;
        const minPriceChange24h = url.searchParams.get("minPriceChange24h") ||
          undefined;
        const minDataQualityScore =
          url.searchParams.get("minDataQualityScore") || undefined;
        const maxCacheAgeMinutes = url.searchParams.get("maxCacheAgeMinutes") ||
          undefined;
        const priceSource = url.searchParams.get("priceSource") || undefined;

        // Check for timestamp parameters and validate if present
        const fromTimestamp = url.searchParams.get("from_timestamp");
        const toTimestamp = url.searchParams.get("to_timestamp");

        if (fromTimestamp && isNaN(Date.parse(fromTimestamp))) {
          return ApiResponseUtil.badRequest(
            `Invalid timestamp format: ${fromTimestamp}. Must be a valid date string.`,
            undefined,
            { routeType: cacheType },
          );
        }

        if (toTimestamp && isNaN(Date.parse(toTimestamp))) {
          return ApiResponseUtil.badRequest(
            `Invalid timestamp format: ${toTimestamp}. Must be a valid date string.`,
            undefined,
            { routeType: cacheType },
          );
        }

        // Determine if market data should be included based on API version
        // v2.2: No market data (clean, minimal responses)
        // v2.3+: Include market data with clean nested structure
        const apiVersion = (ctx.state.apiVersion as string) || "2.3";
        const includeMarketData = parseFloat(apiVersion) >= 2.3;

        // Important part: Pass the min/max values directly to the controller
        const result = await StampController.getStamps({
          page,
          limit: effectiveLimit,
          sortBy: sortValidation,
          type: stampType,
          allColumns: false,
          skipTotalCount: false,
          ...(ident && { ident }),
          ...(fileType && { fileType }),
          ...(editions && { editions }),
          ...(market && { market }),
          ...(dispensers !== undefined && { dispensers }),
          ...(atomics !== undefined && { atomics }),
          ...(listings && { listings }),
          ...(listingsMin && { listingsMin }),
          ...(listingsMax && { listingsMax }),
          ...(sales && { sales }),
          ...(salesMin && { salesMin }),
          ...(salesMax && { salesMax }),
          ...(volume && { volume }),
          ...(volumeMin && { volumeMin }),
          ...(volumeMax && { volumeMax }),
          ...(fileSize !== null && { fileSize }),
          ...(fileSizeMin && { fileSizeMin }),
          ...(fileSizeMax && { fileSizeMax }),
          ...(range && { range }),
          ...(rangeMin && { rangeMin }),
          ...(rangeMax && { rangeMax }),
          // Market data filters (Task 42)
          ...(minHolderCount && { minHolderCount }),
          ...(maxHolderCount && { maxHolderCount }),
          ...(minDistributionScore && { minDistributionScore }),
          ...(maxTopHolderPercentage && { maxTopHolderPercentage }),
          ...(minFloorPriceBTC && { minFloorPriceBTC }),
          ...(maxFloorPriceBTC && { maxFloorPriceBTC }),
          ...(minVolume24h && { minVolume24h }),
          ...(minPriceChange24h && { minPriceChange24h }),
          ...(minDataQualityScore && { minDataQualityScore }),
          ...(maxCacheAgeMinutes && { maxCacheAgeMinutes }),
          ...(priceSource && { priceSource }),
          // Version-aware market data inclusion
          includeMarketData,
        });

        // Filter fields based on API version
        if (parseFloat(apiVersion) < 2.3 && result.data) {
          // For v2.2, remove file_size_bytes from responses
          const filterV22Fields = (stamps: StampRow[]) => {
            return stamps.map((stamp) => {
              const { file_size_bytes: _file_size_bytes, ...v22Stamp } = stamp;
              return v22Stamp as StampRow;
            });
          };

          if (Array.isArray(result.data)) {
            result.data = filterV22Fields(result.data);
          }
        }

        // Return the normal result
        return ApiResponseUtil.success(result, { routeType: cacheType });
      } else {
        const { id } = ctx.params;

        // Validate stamp ID format before processing
        const identifierType = getIdentifierType(id);
        if (identifierType === "invalid") {
          return ApiResponseUtil.notFound(
            `Invalid stamp identifier: ${id}. Must be a valid stamp number, transaction hash, or CPID.`,
            undefined,
            { routeType: getCacheType(new URL(req.url).pathname, false) },
          );
        }

        const path = new URL(req.url).pathname;

        if (path.includes("/holders")) {
          const url = new URL(req.url);
          const pagination = getPaginationParams(url);

          if (pagination instanceof Response) {
            return pagination;
          }

          const { limit, page } = pagination;
          const sortParam = getSortParameter(url);
          const sortValidation = validateSortDirection(sortParam);
          if (sortValidation instanceof Response) {
            return sortValidation;
          }

          const holders = await StampController.getStampHolders(
            id,
            page || 1,
            limit || 50,
            cacheType,
          );

          if (!holders || !holders.data?.length) {
            return ApiResponseUtil.notFound("No holders found for this stamp");
          }
          return ApiResponseUtil.success(holders, { routeType: cacheType });
        }

        if (path.includes("/dispensers")) {
          const url = new URL(req.url);
          const pagination = getPaginationParams(url);

          if (pagination instanceof Response) {
            return pagination;
          }

          const { limit, page } = pagination;
          const dispensers = await StampController.getStampDispensers(
            id,
            page || 1,
            limit || 50,
            cacheType,
          );

          if (!dispensers || !dispensers.data?.length) {
            return ApiResponseUtil.notFound(
              "No dispensers found for this stamp",
            );
          }
          return ApiResponseUtil.success(dispensers, { routeType: cacheType });
        }

        if (path.includes("/sends")) {
          const url = new URL(req.url);
          const pagination = getPaginationParams(url);

          if (pagination instanceof Response) {
            return pagination;
          }

          const { limit, page } = pagination;
          const sends = await StampController.getStampSends(
            id,
            page,
            limit,
            cacheType,
          );

          if (!sends || !sends.data?.length) {
            return ApiResponseUtil.notFound("No sends found for this stamp");
          }
          return ApiResponseUtil.success(sends, { routeType: cacheType });
        }

        if (path.includes("/dispenses")) {
          const url = new URL(req.url);
          const pagination = getPaginationParams(url);

          if (pagination instanceof Response) {
            return pagination;
          }

          const { limit, page } = pagination;
          const dispenses = await StampController.getStampDispenses(
            id,
            page || 1,
            limit || 50,
            cacheType,
          );

          if (!dispenses || !dispenses.data?.length) {
            return ApiResponseUtil.notFound(
              "No dispenses found for this stamp",
            );
          }
          return ApiResponseUtil.success(dispenses, { routeType: cacheType });
        }

        // For individual stamp details, we want both core and secondary columns
        const stampData = await StampController.getStampDetailsById(
          id,
          routeConfig.type,
          cacheType,
          undefined, // Use default cache duration
          true, // Explicitly include secondary columns for details
          requestQuery ? requestQuery.includes("search") : false,
        );

        // Check for empty stamp data - handle both array and object cases
        if (!stampData) {
          return ApiResponseUtil.notFound("Stamp not found");
        }

        // When getStampDetailsById returns empty, it might have:
        // 1. data as empty array: []
        // 2. data as empty object: {}
        // 3. data with stamp: undefined (this is what actually happens for invalid IDs)
        const hasNoData = !stampData.data ||
          (Array.isArray(stampData.data) && stampData.data.length === 0) ||
          (typeof stampData.data === "object" &&
            !Array.isArray(stampData.data) &&
            (Object.keys(stampData.data).length === 0 ||
              stampData.data.stamp === undefined));

        if (hasNoData) {
          return ApiResponseUtil.notFound("Stamp not found");
        }

        // Filter fields based on API version for single stamp
        const apiVersion = (ctx.state.apiVersion as string) || "2.3";
        if (parseFloat(apiVersion) < 2.3 && stampData.data?.stamp) {
          // For v2.2, remove file_size_bytes from single stamp response
          const { file_size_bytes: _file_size_bytes, ...v22Stamp } =
            stampData.data.stamp;
          stampData.data.stamp = v22Stamp;
        }

        return ApiResponseUtil.success(
          {
            last_block: stampData.last_block,
            data: stampData.data,
          },
          { routeType: cacheType },
        );
      }
    } catch (error) {
      console.error("Error in stamp handler:", error);
      const errorMessage = routeConfig.isIndex
        ? `Error fetching paginated ${routeConfig.type}`
        : `Error fetching stamp details for ID ${ctx.params.id}`;
      return ApiResponseUtil.internalError(error, errorMessage);
    }
  },
});

// Export is already done in function declaration above

// Add default export for Fresh manifest compatibility - dummy handler
export default function () {
  return WebResponseUtil.success("OK", {
    headers: { "Content-Type": "text/plain" },
  });
}
