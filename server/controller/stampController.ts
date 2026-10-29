import type { StampEdition, StampFilesize, StampFiletype, StampFilterType, StampMarketplace, StampRange, StampSuffixFilter } from "$constants";
import { BIG_LIMIT, CAROUSEL_STAMP_IDS, STAMP_TYPES as STAMP_TYPE_CONSTANTS, type StampType } from "$constants";
import { filterOptions } from "$lib/utils/data/filtering/filterOptions.ts";
import { CollectionController } from "$server/controller/collectionController.ts";
import { BlockService } from "$server/services/core/blockService.ts";
import { CollectionService } from "$server/services/core/collectionService.ts";
import { BTCPriceService } from "$server/services/price/btcPriceService.ts";
import { StampService } from "$server/services/stampService.ts";
import type { CollectionRow } from "$server/types/collection.d.ts";
import type { SUBPROTOCOLS } from "$types/base.d.ts";
// import { formatSatoshisToBTC } from "$lib/utils/ui/formatting/formatUtils.ts"; // Fixed: Removed unused import
import { normalizeHeaders } from "$lib/utils/api/headers/headerUtils.ts";
import { API_RESPONSE_VERSION, ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { WebResponseUtil } from "$lib/utils/api/responses/webResponseUtil.ts";
import { logger } from "$lib/utils/logger.ts";
import { isCpid } from "$lib/utils/typeGuards.ts";
import { decodeBase64 } from "$lib/utils/ui/formatting/formatUtils.ts";
import { getMimeTypeFromExtension } from "$lib/utils/ui/media/imageUtils.ts";
import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";
import type { PaginatedStampBalanceResponseBody } from "$types/api.d.ts";
import type { StampBalance, StampRow } from "$types/stamp.d.ts";
import type { HolderRow, ProcessedHolder } from "$types/wallet.d.ts";
import type { BlockFloor } from "$lib/utils/chain/ecxView.ts";

export class StampController {
  static async getStamps({
    page = 1,
    limit = BIG_LIMIT,
    sortBy = "DESC",
    type = "all",
    filterBy = [] as StampFilterType[],
    ident,
    collectionId,
    identifier,
    blockIdentifier,
    creatorAddress,
    cacheDuration,
    noPagination = false,
    allColumns = false,
    includeSecondary = true,
    sortColumn = "tx_index",
    suffix,
    groupBy,
    groupBySubquery,
    skipTotalCount = false,
    cacheType = RouteType.STAMP_LIST,
    enrichWithAssetInfo = false,
    url,
    fileType,
    editions,
    range,
    rangeMin,
    rangeMax,
    market,
    dispensers,
    atomics,
    listings,
    listingsMin,
    listingsMax,
    sales,
    salesMin,
    salesMax,
    volume,
    volumeMin,
    volumeMax,
    fileSize,
    fileSizeMin,
    fileSizeMax,
    // Market Data Filters (Task 42)
    minHolderCount,
    maxHolderCount,
    minDistributionScore,
    maxTopHolderPercentage,
    minFloorPriceBTC,
    maxFloorPriceBTC,
    minVolume24h,
    minPriceChange24h,
    minDataQualityScore,
    maxCacheAgeMinutes,
    priceSource,
    collectionStampLimit,
    // Performance optimization - pass pre-fetched BTC price
    btcPrice,
    btcPriceSource,
    includeMarketData = true, // Default to true for backward compatibility
  }: {
    page?: number;
    limit?: number;
    sortBy?: "ASC" | "DESC";
    suffix?: string[];
    ident?: SUBPROTOCOLS[];
    url?: string;
    enrichWithAssetInfo?: boolean;
    skipTotalCount?: boolean;
    collectionId?: string | undefined;
    type?: StampType;
    allColumns?: boolean;
    identifier?: string | number | (string | number)[];
    blockIdentifier?: string | number | BlockFloor;
    creatorAddress?: string;
    noPagination?: boolean;
    cacheDuration?: number;
    includeSecondary?: boolean;
    sortColumn?: string;
    groupBy?: string;
    groupBySubquery?: string | boolean;
    cacheType?: RouteType;
    filterBy?: StampFilterType[];
    fileType?: StampFiletype[];
    editions?: StampEdition[];
    range?: StampRange;
    rangeMin?: string;
    rangeMax?: string;
    market?: Extract<StampMarketplace, "listings" | "sales"> | "";
    dispensers?: boolean;
    atomics?: boolean;
    listings?: Extract<StampMarketplace, "all" | "bargain" | "affordable" | "premium" | "custom"> | "";
    listingsMin?: string;
    listingsMax?: string;
    sales?: Extract<StampMarketplace, "recent" | "premium" | "custom" | "volume"> | "";
    salesMin?: string;
    salesMax?: string;
    volume?: "24h" | "7d" | "30d" | "";
    volumeMin?: string;
    volumeMax?: string;
    fileSize?: StampFilesize | null;
    fileSizeMin?: string;
    fileSizeMax?: string;
    // Market Data Filters (Task 42)
    minHolderCount?: string;
    maxHolderCount?: string;
    minDistributionScore?: string;
    maxTopHolderPercentage?: string;
    minFloorPriceBTC?: string;
    maxFloorPriceBTC?: string;
    minVolume24h?: string;
    minPriceChange24h?: string;
    minDataQualityScore?: string;
    maxCacheAgeMinutes?: string;
    priceSource?: string;
    collectionStampLimit?: number;
    includeMarketData?: boolean;
    // Performance optimization - pre-fetched BTC price
    btcPrice?: number;
    btcPriceSource?: string;
  } = {}) {
    console.log("stamp controller payload", {
      page,
      limit,
      sortBy,
      type,
      filterBy,
      ident,
      collectionId,
      url,
      fileType,
      editions,
      range,
      rangeMin,
      rangeMax,
      market,
      dispensers,
      atomics,
      listings,
      listingsMin,
      listingsMax,
      sales,
      salesMin,
      salesMax,
      volume,
      volumeMin,
      volumeMax,
      fileSize,
      fileSizeMin,
      fileSizeMax
    });

    console.log("About to call repository with range:", range);

    const filterByArray: StampFilterType[] = Array.isArray(filterBy)
      ? filterBy
      : typeof filterBy === "string" && filterBy
        ? (filterBy as string).split(",").filter(Boolean) as StampFilterType[]
        : [];

    // Initialize ident based on type
    let finalIdent: SUBPROTOCOLS[] = ident || [];

    // Validate ident parameter if provided
    const VALID_IDENTS = ["STAMP", "SRC-20", "SRC-721", "SRC-101"];
    if (ident && ident.length > 0) {
      // Check if all provided idents are valid
      const invalidIdents = ident.filter(id => !VALID_IDENTS.includes(id));
      if (invalidIdents.length > 0) {
        // Return empty results for invalid ident values
        return {
          data: [],
          total: 0,
          page: page || 1,
          limit: limit || 50,
          totalPages: 0,
          last_block: await BlockService.getLastBlock()
        };
      }
    }

    if ((!ident || ident.length === 0) && type) {
      if (type === STAMP_TYPE_CONSTANTS.CLASSIC) {
        finalIdent = ["STAMP"];
      } else if (type === STAMP_TYPE_CONSTANTS.POSH) {
        finalIdent = [];
      } else if (type === STAMP_TYPE_CONSTANTS.STAMPS) {
        finalIdent = ["STAMP", "SRC-721"];
      } else if (type === STAMP_TYPE_CONSTANTS.SRC20) {
        finalIdent = ["SRC-20"];
      } else if (type === STAMP_TYPE_CONSTANTS.ALL) {
        finalIdent = []; // We'll handle 'all' in the repository
      } else {
        finalIdent = [];
      }
    }

    let filterSuffix: StampSuffixFilter[] = [];
    if (filterByArray.length > 0) {
      // Extract ident and suffix from filterBy
      const identFromFilter = filterByArray.flatMap((filter) =>
        filter in filterOptions ? filterOptions[filter as keyof typeof filterOptions]?.ident || [] : []
      );
      filterSuffix = filterByArray.flatMap((filter) =>
        filter in filterOptions ? filterOptions[filter as keyof typeof filterOptions]?.suffixFilters || [] : []
      ) as StampSuffixFilter[];

      // Combine ident from type and filterBy, removing duplicates
      if (identFromFilter.length > 0) {
        finalIdent = Array.from(new Set([...finalIdent, ...identFromFilter]));
      }

      // When filterBy is defined, suffix are limited to those in filterOptions
      suffix = filterSuffix;
    } else if (!suffix || suffix.length === 0) {
      // If suffix are not provided, use all possible suffixes
      suffix = []; // No suffix filter applied
    }

    // Handle custom range - StampRange expects string literals, not objects
    let customRange: StampRange | undefined = range;
    if (!range && url) {
      try {
        const urlObj = new URL(url);
        const rangeMinParam = urlObj.searchParams.get("range[stampRange][min]");
        const rangeMaxParam = urlObj.searchParams.get("range[stampRange][max]");

        if (rangeMinParam || rangeMaxParam) {
          console.log("Controller detected custom range params:", { rangeMinParam, rangeMaxParam });
          customRange = "custom"; // Use the custom literal value
          console.log("Controller set range:", customRange);
        }
      } catch (error) {
        console.error("Error parsing URL in controller:", error);
      }
    }

    // Use pre-fetched BTC price if provided, otherwise fetch it
    let btcPriceValue: number;
    let btcPriceSourceValue: string;

    if (btcPrice !== undefined && btcPriceSource !== undefined) {
      btcPriceValue = btcPrice;
      btcPriceSourceValue = btcPriceSource;
      console.log(`[StampController] Using pre-fetched BTC price: $${btcPriceValue} from ${btcPriceSourceValue}`);
    } else {
      const btcPriceData = await BTCPriceService.getPrice();
      btcPriceValue = btcPriceData.price;
      btcPriceSourceValue = btcPriceData.source;
      console.log(`[StampController] Fetched BTC price: $${btcPriceValue} from ${btcPriceSourceValue}`);
    }

    // Use market data inclusion setting from route handler (version-aware)
    const useMarketData = includeMarketData;

    // Determine if this is a detail view (single stamp) or list view
    const isDetailView = identifier && !Array.isArray(identifier);

    // Only include heavy fields like stamp_base64 for detail views
    const shouldIncludeSecondary = isDetailView ? includeSecondary : false;

    // Convert boolean parameters to proper types for service call
    const dispensersParam = typeof dispensers === "boolean" ? dispensers : undefined;
    const atomicsParam = typeof atomics === "boolean" ? atomics : undefined;

    // Convert groupBySubquery to boolean
    const groupBySubqueryParam = typeof groupBySubquery === "string" ? groupBySubquery === "true" : Boolean(groupBySubquery);

    // Always include market data when available
    const stampResult = await StampService.getStamps({
      page,
      limit,
      sortBy,
      type,
      ident: finalIdent,
      suffix: suffix as StampSuffixFilter[],
      allColumns,
      includeSecondary: shouldIncludeSecondary,
      ...(collectionId !== undefined ? { collectionId } : {}),
      ...(identifier !== undefined ? { identifier } : {}),
      ...(blockIdentifier !== undefined ? { blockIdentifier } : {}),
      ...(creatorAddress !== undefined ? { creatorAddress } : {}),
      ...(cacheDuration !== undefined ? { cacheDuration } : {}),
      noPagination,
      sortColumn,
      ...(groupBy !== undefined ? { groupBy } : {}),
      groupBySubquery: groupBySubqueryParam,
      skipTotalCount,
      cacheType,
      filterBy: filterByArray,
      ...(fileType !== undefined ? { fileType } : {}),
      ...(editions !== undefined ? { editions } : {}),
      ...(customRange !== undefined ? { range: customRange } : {}),
      ...(rangeMin !== undefined ? { rangeMin } : {}),
      ...(rangeMax !== undefined ? { rangeMax } : {}),
      ...(market !== undefined ? { market } : {}),
      ...(dispensersParam !== undefined ? { dispensers: dispensersParam } : {}),
      ...(atomicsParam !== undefined ? { atomics: atomicsParam } : {}),
      ...(listings !== undefined ? { listings } : {}),
      ...(listingsMin !== undefined ? { listingsMin } : {}),
      ...(listingsMax !== undefined ? { listingsMax } : {}),
      ...(sales !== undefined ? { sales } : {}),
      ...(salesMin !== undefined ? { salesMin } : {}),
      ...(salesMax !== undefined ? { salesMax } : {}),
      ...(volume !== undefined ? { volume } : {}),
      ...(volumeMin !== undefined ? { volumeMin } : {}),
      ...(volumeMax !== undefined ? { volumeMax } : {}),
      ...(fileSize !== undefined ? { fileSize } : {}),
      ...(fileSizeMin !== undefined ? { fileSizeMin } : {}),
      ...(fileSizeMax !== undefined ? { fileSizeMax } : {}),
      // Market Data Filters (Task 42)
      ...(minHolderCount !== undefined ? { minHolderCount } : {}),
      ...(maxHolderCount !== undefined ? { maxHolderCount } : {}),
      ...(minDistributionScore !== undefined ? { minDistributionScore } : {}),
      ...(maxTopHolderPercentage !== undefined ? { maxTopHolderPercentage } : {}),
      ...(minFloorPriceBTC !== undefined ? { minFloorPriceBTC } : {}),
      ...(maxFloorPriceBTC !== undefined ? { maxFloorPriceBTC } : {}),
      ...(minVolume24h !== undefined ? { minVolume24h } : {}),
      ...(minPriceChange24h !== undefined ? { minPriceChange24h } : {}),
      ...(minDataQualityScore !== undefined ? { minDataQualityScore } : {}),
      ...(maxCacheAgeMinutes !== undefined ? { maxCacheAgeMinutes } : {}),
      ...(priceSource !== undefined ? { priceSource } : {}),
      ...(collectionStampLimit !== undefined ? { collectionStampLimit } : {}),
      includeMarketData: Boolean(useMarketData),
              btcPriceUSD: btcPriceValue
    });

    // Process stamps - only fetch additional asset info for single stamp detail pages
    let processedStamps = stampResult.stamps;
    if (enrichWithAssetInfo && identifier && !Array.isArray(identifier)) {
      // Only enrich with asset info for detail pages
      const stamp = stampResult.stamps[0];
      if (stamp && (stamp.ident === "STAMP" || stamp.ident === "SRC-721")) {
        const asset = await CounterpartyApiManager.getAssetInfo(stamp.cpid);
        processedStamps = [this.enrichStampWithAssetData(stamp, asset)];
      }
    }

    // Get cache status from the first stamp with market data
    let cacheStatus = 'unknown';
    if (useMarketData && processedStamps.length > 0) {
      const firstStampWithData = processedStamps.find((s: any) => s.cacheStatus);
      cacheStatus = firstStampWithData?.cacheStatus || 'unknown';
    }

    // Build response based on query type
    const baseResponse = {
      data: identifier && !Array.isArray(identifier)
        ? { stamp: processedStamps[0] }  // Single stamp response
        : processedStamps,               // Multiple stamps response
      last_block: stampResult.last_block,
      metadata: {
        btcPrice: btcPriceValue,
        cacheStatus: cacheStatus,
        source: btcPriceSourceValue
      }
    };

    // Add pagination data for index/collection routes
    if (!identifier || Array.isArray(identifier)) {
      // Handle both paginated and non-paginated responses
      const paginatedResult = stampResult as any;
      return {
        ...baseResponse,
        page: paginatedResult.page || page,
        limit: paginatedResult.limit || limit,
        totalPages: paginatedResult.totalPages || 0,
        total: skipTotalCount ? undefined : (paginatedResult.total || 0),
      };
    }

    return baseResponse;
  }

  // This becomes a wrapper around getStamps for backward compatibility
  static getStampDetailsById(
    id: string,
    stampType: StampType = "all",
    cacheType: RouteType = RouteType.STAMP_DETAIL,
    cacheDuration?: number,
    includeSecondary: boolean = true,
    _isSearchQuery: boolean = false
  ) {
    const params: any = {
      identifier: id,
      type: stampType,
      cacheType,
      allColumns: false,
      noPagination: true,
      skipTotalCount: true,
      enrichWithAssetInfo: true,
      includeSecondary,
    };

    if (cacheDuration !== undefined) {
      params.cacheDuration = cacheDuration;
    }

    return this.getStamps(params);
  }

  private static enrichStampWithAssetData(stamp: StampRow, asset: any) {
    return {
      ...stamp,
      divisible: asset?.divisible ?? stamp.divisible,
      locked: asset?.locked ?? stamp.locked,
      supply: asset?.supply ?? stamp.supply,
    };
  }

  private static processHolders(holders: HolderRow[]): ProcessedHolder[] {
    // Calculate total quantity first
    const totalQuantity = holders.reduce((sum, holder) => {
      const quantity = holder.divisible ? holder.quantity / 100000000 : holder.quantity;
      return sum + quantity;
    }, 0);

    // Map holders with percentages - use 'amt' to match UI component expectations
    return holders.map((holder: HolderRow) => {
      const quantity = holder.divisible ? holder.quantity / 100000000 : holder.quantity;
      const percentage = totalQuantity > 0 ? (quantity / totalQuantity) * 100 : 0;

      return {
        address: holder.address,
        amt: quantity,  // Use 'amt' to match HoldersPieChart and HoldersTableBase expectations
        percentage: Number(percentage.toFixed(2))  // Round to 2 decimal places
      };
    });
  }

  static async getRecentSales(
    page?: number,
    limit?: number,
    options?: {
      dayRange?: number;
      includeFullDetails?: boolean;
      type?: StampType;
    }
  ) {
    try {
      const result = await StampService.getRecentSales(
        page,
        limit,
        options
      );

      const lastBlock = await BlockService.getLastBlock();
      const totalPages = limit ? Math.ceil(result.total / limit) : 1;

      return {
        page: page || 1,
        limit: limit || result.total,
        total: result.total,
        totalPages,
        last_block: lastBlock,
        data: result.recentSales,
        btcPriceUSD: result.btcPriceUSD,
        metadata: result.metadata,
      };
    } catch (error) {
      logger.error("stamps", {
        message: "Error in getRecentSales",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  static async getStampBalancesByAddress(
    address: string,
    limit: number,
    page: number,
    sortBy: "ASC" | "DESC" = "DESC"
  ): Promise<PaginatedStampBalanceResponseBody> {
    try {
      const { balances: xcpBalances, total: xcpTotal } = await CounterpartyApiManager.getAllXcpBalancesByAddress(
        address,
        false
      );

      console.log(`[StampController] Got ${xcpBalances.length} XCP balances out of ${xcpTotal} total`);

      // Get paginated stamps and total count
      const [{ stamps, total }, lastBlock] = await Promise.all([
        StampService.getStampBalancesByAddress(
          address,
          limit,
          page,
          xcpBalances,
          sortBy
        ),
        BlockService.getLastBlock(),
      ]);

      console.log(`[StampController] Got ${stamps.length} stamps for page ${page}, total stamps: ${total}`);

      // v2.3: Stamps already have clean structure, no additional processing needed
      return {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
        last_block: lastBlock,
        data: stamps,
      };
    } catch (error) {
      console.error("Error in getStampBalancesByAddress:", error);
      throw error;
    }
  }

  static async getMultipleStampCategories(categories: {
    idents: SUBPROTOCOLS[];
    limit: number;
    type: StampType;
    sortBy?: "ASC" | "DESC";
    /** Only stamps in this block or later. */
    blockFloor?: BlockFloor;
  }[]) {
    const results = await Promise.all(
      categories.map(async (category) => {
        const serviceResult = await StampService.getStamps({
          page: 1,
          limit: category.limit,
          sortBy: category.sortBy || "ASC",
          type: category.type,
          ident: category.idents,
          noPagination: false,
          skipTotalCount: true,
          includeSecondary: false,
          ...(category.blockFloor && { blockIdentifier: category.blockFloor }),
        });

        return {
          types: category.idents,
          stamps: serviceResult?.stamps ?? [],
          total: (serviceResult as any)?.total ?? 0,
        };
      }),
    );

    return results;
  }

  /**
   * `blockFloor` limits the stamp galleries (latest creations, posh) to
   * stamps in that block or later: the ECX-native home page. Unset on
   * Bitcoin, where the queries are unchanged.
   */
  static async getHomePageData(
    btcPrice?: number,
    btcPriceSource?: string,
    blockFloor?: BlockFloor,
  ) {
    try {
      console.log("[StampController] getHomePageData started");
      const overallStartTime = Date.now();

      // Critical above-the-fold content first
      console.log("[StampController] Starting parallel fetch of carousel, categories, and collections...");
      const parallelStartTime = Date.now();
      const [carouselData, mainCategories, collections] = await Promise.all([
        this.getStamps({
          identifier: CAROUSEL_STAMP_IDS,
          allColumns: false,
          noPagination: true,
          skipTotalCount: true,
          includeSecondary: false,
          type: "all",
          ...(btcPrice !== undefined && { btcPrice }),
          ...(btcPriceSource !== undefined && { btcPriceSource })
        }),
        this.getMultipleStampCategories([
          { idents: ["STAMP", "SRC-721"], limit: 8, type: "stamps", sortBy: "DESC", ...(blockFloor && { blockFloor }) },
          { idents: ["SRC-721"], limit: 12, type: "stamps", sortBy: "DESC", ...(blockFloor && { blockFloor }) },
          { idents: ["STAMP"], limit: 24, type: "stamps", sortBy: "DESC", ...(blockFloor && { blockFloor }) }, // Art stamps with DESC order
        ]),
        CollectionController.getCollectionStamps({
          limit: 4,
          page: 1,
          sortBy: "DESC"
        })
      ]);
      console.log(`[StampController] Parallel fetch completed in ${Date.now() - parallelStartTime}ms`);

      // Get posh stamps
      console.log("[StampController] Starting posh collection fetch...");
      const poshStartTime = Date.now();
      const poshCollection = await CollectionService.getCollectionByName("posh");
      console.log(`[StampController] Posh collection lookup took ${Date.now() - poshStartTime}ms`);

      let poshStamps = [];
      if (poshCollection) {
        console.log("[StampController] Fetching posh stamps with collection_id:", poshCollection.collection_id);
        const poshStampsStartTime = Date.now();
        const poshResult = await this.getStamps({
          collectionId: poshCollection.collection_id,
          page: 1,
          limit: 16,
          sortBy: "DESC",
          skipTotalCount: true,
          groupBy: 'collection_id',        // Optimize collection query
          groupBySubquery: true,           // Use window function for better performance
          collectionStampLimit: 16,        // Limit stamps per collection
          ...(blockFloor && { blockIdentifier: blockFloor }),
          ...(btcPrice !== undefined && { btcPrice }),
          ...(btcPriceSource !== undefined && { btcPriceSource })
        });
        poshStamps = poshResult.data;
        console.log(`[StampController] Posh stamps fetch took ${Date.now() - poshStampsStartTime}ms, got ${poshStamps.length} stamps`);
      } else {
        console.log("[StampController] No posh collection found");
      }
      // Get stamp URLs for collections more efficiently
      const collectionData = collections?.data ? await (async () => {
        // Get all collection IDs
        const collectionIds = collections.data.map((item: CollectionRow) => item.collection_id);

        // Fetch first stamp for each collection in a single request if possible
        const firstStamps = await Promise.all(
          collectionIds.map(async (collectionId: string) => {
            const result = await this.getStamps({
              collectionId,
              limit: 1,
              sortBy: "DESC",
              skipTotalCount: true,
              // includeMarketData: false // Remove - property doesn't exist in interface
            });
            return result.data?.[0];
          })
        );

        // Map collection data with images
        return collections.data.map((item: CollectionRow, index: number) => ({
          ...item,
          img: firstStamps[index]?.stamp_url || null
        }));
      })() : [];

      const result = {
        carouselStamps: carouselData.data ?? [],
        stamps_src721: mainCategories[1]?.stamps ?? [],
        stamps_art: mainCategories[2]?.stamps ?? [], // Now at index 2
        stamps_posh: poshStamps,
        collectionData: collectionData ?? [],
      };

      console.log(`[StampController] getHomePageData completed in ${Date.now() - overallStartTime}ms`);
      return result;

    } catch (error) {
      logger.error("stamps", {
        message: "Error in getHomePageData",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  static async getCollectionPageData(params: any) {
    try {
      console.log("[StampController] getCollectionPageData started");
      const overallStartTime = Date.now();
      const {sortBy} = params

      // Fetch BTC price once
      const btcPriceData = await BTCPriceService.getPrice();
      const btcPrice = btcPriceData.price;

      console.log("[StampController] Starting SRC-721 stamp categories fetch...");
      const categoriesStartTime = Date.now();
      const [
        stampCategories,
      ] = await Promise.all([
        this.getMultipleStampCategories([
          { idents: ["SRC-721"], limit: 16, type: "stamps", sortBy: sortBy },
        ]),
      ]);
      console.log(`[StampController] Categories fetch completed in ${Date.now() - categoriesStartTime}ms`);
      // Fetch the "posh" collection to get its collection_id
      console.log("[StampController] Starting posh collection fetch for collection page...");
      const poshLookupStartTime = Date.now();
      const poshCollection = await CollectionService.getCollectionByName(
        "posh",
      );
      console.log(`[StampController] Posh collection lookup took ${Date.now() - poshLookupStartTime}ms`);

      let stamps_posh = [];
      if (poshCollection) {
        const poshCollectionId = poshCollection.collection_id;
        console.log("[StampController] Fetching posh stamps with collection_id:", poshCollectionId);
        const poshStampsStartTime = Date.now();
        // Fetch stamps from the "posh" collection with cached market data
        const poshStampsResult = await this.getStamps({
          collectionId: poshCollectionId,
          page: 1,
          limit: 24,
          sortBy: sortBy,
          groupBy: 'collection_id',        // Optimize collection query
          groupBySubquery: true,           // Use window function for better performance
          collectionStampLimit: 24,        // Limit stamps per collection
          // includeMarketData: true, // Use cached market data
          // btcPriceUSD: btcPrice
        });
        stamps_posh = poshStampsResult.data;
        console.log(`[StampController] Posh stamps fetch took ${Date.now() - poshStampsStartTime}ms, got ${stamps_posh.length} stamps`);
      } else {
        logger.warn("stamps", {
          message: "Posh collection not found"
        });
        console.log("[StampController] No posh collection found");
      }

      const result = {
        stamps_src721: stampCategories[0].stamps,
        stamps_posh,
        metadata: {
          btcPrice: btcPrice,
          source: btcPriceData.source
        }
      };

      console.log(`[StampController] getCollectionPageData completed in ${Date.now() - overallStartTime}ms`);
      return result;
    } catch (error) {
      logger.error("stamps", {
        message: "Error in getCollectionPageData",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  static getIdent(type: string) {
    switch (type) {
      case "src721":
        return ["SRC-721"];
      case "classic":
        return ["STAMP"];
      case "src20":
        return ["SRC-20"];
      default:
        return ["STAMP", "SRC-721"];
    }
  }

  private static async proxyContentRouteToStampsRoute(
    identifier: string,
    _stamp_url: string,
    _baseUrl?: string,
    contentType: string = 'application/octet-stream'
  ) {
    // ALWAYS use production CDN for /stamps/ content
    // These files don't exist locally
    const cdnBaseUrl = "https://stampchain.io";
    const proxyPath = `${cdnBaseUrl}/stamps/${identifier}`;

    try {
      // Use raw fetch for binary content to avoid consuming the response body
      const response = await fetch(proxyPath, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'User-Agent': 'stampchain.io-CDN-Proxy'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Convert ReadableStream to string for WebResponseUtil
      // For binary content, we need to handle this properly
      const isTextContent = contentType.includes('text/') ||
                           contentType.includes('javascript') ||
                           contentType.includes('application/json') ||
                           contentType.includes('xml');

      if (isTextContent) {
        const textContent = await response.text();
        return WebResponseUtil.stampResponse(textContent, contentType, {
          binary: false,
          headers: {
            ...Object.fromEntries(response.headers),
            "Vary": "Accept-Encoding, X-API-Version, Origin",
          }
        });
      } else {
        // For binary content, just proxy the response directly
        return new Response(response.body, {
          headers: normalizeHeaders({
            ...Object.fromEntries(response.headers),
            "Content-Type": contentType,
            "X-API-Version": API_RESPONSE_VERSION,
            "Vary": "Accept-Encoding, X-API-Version, Origin",
          }),
        });
      }
    } catch (error) {
      logger.error("content", {
        message: "Error fetching from CDN",
        error: error instanceof Error ? error.message : String(error),
        path: proxyPath,
        identifier,
        contentType
      });
      return WebResponseUtil.stampNotFound();
    }
  }

  static async getStampFile(
    identifier: string,
    _routeType: RouteType,
    baseUrl?: string,
    isFullPath = false
  ) {
    try {
      // If full path, go directly to proxy
      if (isFullPath) {
        return await this.handleFullPathStamp(identifier, baseUrl);
      }

      const result = await StampService.getStampFile(identifier);
      if (!result) return WebResponseUtil.stampNotFound();

      return await this.handleStampContent(result, identifier);
    } catch (error) {
      logger.error("stamps", {
        message: "Error in getStampFile",
        identifier,
        error: error instanceof Error ? error.message : String(error)
      });
      return WebResponseUtil.stampNotFound();
    }
  }

  private static handleFullPathStamp(identifier: string, baseUrl?: string) {
    const [, extension] = identifier.split(".");
    const contentType = getMimeTypeFromExtension(extension || "");

    return this.proxyContentRouteToStampsRoute(
      identifier,
      `${baseUrl}/stamps/${identifier}`,
      baseUrl,
      contentType
    );
  }

  private static handleStampContent(result: any, identifier: string) {
    const mimeType = result.headers["Content-Type"] as string || "application/octet-stream";

    const needsDecoding =
      mimeType.includes('javascript') ||
      mimeType.includes('text/') ||
      mimeType.includes('application/json') ||
      mimeType.includes('xml');

    if (needsDecoding) {
      return this.handleTextContent(result, { mimeType, isSvg: mimeType.includes("svg") }, identifier);
    }

    return this.handleBinaryContent(result, { mimeType, isSvg: mimeType.includes("svg") });
  }

  private static async handleTextContent(result: any, contentInfo: any, identifier: string) {
    try {
      let decodedContent = await decodeBase64(result.body);

      // If it's SVG content, rewrite external references to use our proxy
      if (contentInfo.mimeType.includes('svg') || decodedContent.includes('<svg')) {
        // Rewrite ordinals.com references to use our proxy
        decodedContent = decodedContent.replace(
          /https:\/\/ordinals\.com\/content\/([^"'\s>]+)/g,
          "/api/proxy/ordinals/$1"
        );

        // Rewrite arweave.net references to use our proxy
        decodedContent = decodedContent.replace(
          /https:\/\/arweave\.net\/([^"'\s>]+)/g,
          "/api/proxy/arweave/$1"
        );
      }

      // Apply Cloudflare Rocket Loader fixes to HTML content (including SVG with HTML structure)
      if (contentInfo.mimeType.includes('html') || decodedContent.includes('<html') || decodedContent.includes('<script')) {
        // Step 1: Ensure scripts have correct type and data-cfasync="false"
        decodedContent = decodedContent.replace(
          /(<script[^>]*?)>/g,
          (_match, openingTagInnerContentAndAttributes) => {
            let tag = openingTagInnerContentAndAttributes;
            // Correct type if it's mangled by Cloudflare Rocket Loader
            tag = tag.replace(
              /type\s*=\s*"[a-f0-9]{24}-text\/javascript"/i,
              'type="text/javascript"',
            );
            // Add data-cfasync="false" if not already present
            if (!tag.includes('data-cfasync="false"')) {
              tag += ' data-cfasync="false"';
            }
            return tag + ">";
          },
        );

        // Step 2: Globally correct any remaining mangled script types
        // Cloudflare's Rocket Loader might change type="text/javascript"
        // to type="<hex_value>-text/javascript". This reverts that change.
        decodedContent = decodedContent.replace(
          /type\s*=\s*"[a-f0-9]{24}-text\/javascript"/gi,
          'type="text/javascript"',
        );
      }

      return WebResponseUtil.stampResponse(decodedContent, contentInfo.mimeType, {
        binary: false,
        headers: {
          "CF-No-Transform": String(contentInfo.mimeType.includes('javascript') ||
                            contentInfo.mimeType.includes('text/html')),
          "X-API-Version": API_RESPONSE_VERSION,
          // Disable Cloudflare optimizations for SVG content with inline JavaScript
          "CF-Rocket-Loader": "false",
          "CF-Auto-Minify": "false",
          "CF-ScrapeShield": "false",
          ...(result.headers || {}),
        }
      });
    } catch (error) {
      logger.error("content", {
        message: "Error decoding text content",
        error: error instanceof Error ? error.message : String(error),
        identifier,
      });
      return ApiResponseUtil.internalError(error);
    }
  }

  // @ts-ignore - Unused method kept for future reference
  private static handleBinaryContent(result: any, contentInfo: any) {
    return WebResponseUtil.stampResponse(result.body, contentInfo.mimeType, {
      binary: true,
      headers: Object.fromEntries(normalizeHeaders({
        "X-API-Version": API_RESPONSE_VERSION,
        // Disable Cloudflare's Rocket Loader for all stamp content
        "CF-Rocket-Loader": "false",
        ...(result.headers || {}),
      }))
    });
  }

  static async getDispensersWithStampsByAddress(
    address: string,
    page: number = 1,
    limit: number = 50,
    options = {}
  ) {
    try {
      // Add logging
      console.log("[StampController] Getting dispensers with params:", {
        address,
        page,
        limit,
        options
      });

      // Counterparty's dispenser list (and its `total`) covers every asset
      // the address has ever dispensed, not just Bitcoin Stamps — some
      // entries won't match an indexed stamp below and get dropped. If we
      // paginated via Counterparty's own page/limit first, `total` would
      // overcount vs. what's actually rendered (stampchain.io wallet
      // pagination bug: more page buttons than there's real listing data).
      // So fetch everything up front (capped at 1000, matching the
      // pagination-count "hack" already used elsewhere for this address),
      // filter down to stamp-matched dispensers, THEN paginate in-memory.
      const allDispensersData = await CounterpartyApiManager.getDispensersByAddress(address, {
        verbose: true,
        limit: 1000,
        ...options
      });

      if (!(allDispensersData.dispensers?.length)) {
        return {
          dispensers: [],
          total: 0
        };
      }

      // Get unique CPIDs from dispensers
      const uniqueCpids = [...new Set(allDispensersData.dispensers.map(d => d.cpid))];

      // Fetch stamps data for all CPIDs
      const stampsData = await this.getStamps({
        identifier: uniqueCpids,
        allColumns: false,
        noPagination: true
      });

      // Create a map of stamps by CPID for faster lookup
      const stampsByCpid = new Map(
        stampsData.data?.map((stamp: any) => [stamp.cpid, stamp]) || []
      );

      // Merge stamp data into dispensers, then drop any without a matching
      // indexed stamp — callers (e.g. WalletContent's Listings tab) only
      // ever render dispensers with a `.stamp`, so `total` must reflect
      // this filtered set, not the raw Counterparty count.
      const dispensersWithStamps = allDispensersData.dispensers
        .map(dispenser => ({
          ...dispenser,
          stamp: stampsByCpid.get(dispenser.cpid) || null
        }))
        .filter((dispenser) => dispenser.stamp);

      const total = dispensersWithStamps.length;
      const start = (page - 1) * limit;
      const pageDispensers = dispensersWithStamps.slice(start, start + limit);

      // Add detailed logging for dispenser data
      console.log("[StampController] Dispenser data details:", {
        total,
        dispensersCount: pageDispensers.length,
        page,
        limit,
        hasDispensers: pageDispensers.length > 0,
        firstDispenser: pageDispensers[0]?.cpid,
        lastDispenser: pageDispensers[Math.max(0, pageDispensers.length - 1)]?.cpid
      });

      return {
        dispensers: pageDispensers,
        total
      };
    } catch (error) {
      logger.error("stamps", {
        message: "Error fetching dispensers with stamps",
        error: error instanceof Error ? error.message : String(error),
        address
      });
      throw error;
    }
  }

  static async resolveToCpid(id: string): Promise<string> {
    if (isCpid(id)) {
      return id;
    }
    const result = await StampService.resolveToCpid(id);
    if (!result?.cpid) {
      throw new Error(`Could not resolve identifier ${id} to a cpid`);
    }
    return result.cpid;
  }

  static async getStampHolders(id: string, page: number = 1, limit: number = 50, cacheType: RouteType) {
    try {
      // If not a CPID, resolve it
      const cpid = isCpid(id) ? id : await this.resolveToCpid(id);

      const { holders, total } = await StampService.getStampHolders(
        cpid,
        page,
        limit,
        { cacheType }
      );

      return {
        data: this.processHolders(holders),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error("stamps", {
        message: "Error fetching stamp holders",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  static async getStampSends(
    id: string,
    page: number = 1,
    limit: number = 50,
    cacheType: RouteType
  ) {
    try {
      const cpid = await this.resolveToCpid(id);
      const { sends, total } = await StampService.getStampSends(cpid, page, limit, { cacheType });
      return {
        data: sends,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error("stamps", {
        message: "Error fetching stamp sends",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  static async getStampDispensers(
    id: string,
    page: number,
    limit: number,
    cacheType: RouteType
  ) {
    try {
      const cpid = await this.resolveToCpid(id);
      const { dispensers, total } = await StampService.getStampDispensers(cpid, page, limit, { cacheType });
      return {
        data: dispensers,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error("stamps", {
        message: "Error fetching stamp dispensers",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  static async getAllStampDispensers(
    id: string,
    cacheType: RouteType
  ) {
    try {
      const cpid = await this.resolveToCpid(id);
      const { dispensers, total } = await StampService.getStampDispensers(cpid, 1, 50, { cacheType });
      return {
        data: dispensers,
        total
      };
    } catch (error) {
      logger.error("stamps", {
        message: "Error fetching all stamp dispensers",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  static async getStampDispenses(
    id: string,
    page: number = 1,
    limit: number = 50,
    cacheType: RouteType
  ) {
    try {
      const cpid = await this.resolveToCpid(id);
      const { dispenses, total } = await StampService.getStampDispenses(cpid, page, limit, { cacheType });
      return {
        data: dispenses,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error("stamps", {
        message: "Error fetching stamp dispenses",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  static async getStampsCreatedCount(address: string): Promise<number> {
    try {
      // ✅ FIXED: Use service layer instead of calling repository directly
      const result = await StampService.getStampsCreatedCount(address);
      return result.total || 0;
    } catch (error) {
      logger.error("stamps", {
        message: "Error getting stamps created count",
        error: error instanceof Error ? error.message : String(error),
        address
      });
      return 0;
    }
  }

  /**
   * Calculate total value of stamps in a wallet using cached market data
   * This is a specialized method for the wallet page that won't affect API endpoints
   * OPTIMIZED: Uses StampService.getBulkStampMarketData instead of calling repository directly
   */
  static async calculateWalletStampValues(stamps: StampBalance[]): Promise<{
    stampValues: { [cpid: string]: string | number };
    totalValue: number;
  }> {
    try {
      const stampValues: { [cpid: string]: string | number } = {};
      let totalValue = 0;

      if (!stamps || stamps.length === 0) {
        return { stampValues, totalValue };
      }

      // Get all stamp CPIDs
      const cpids = stamps.map(s => s.cpid);

      // ✅ FIXED: Use service layer instead of calling repository directly
      const marketDataMap = await StampService.getBulkStampMarketData(cpids);

      // Calculate values using cached market data
      stamps.forEach((walletStamp: any) => {
        const marketData = marketDataMap.get(walletStamp.cpid);
        if (marketData) {
          let unitPrice = 0;

          // Use the same pricing hierarchy as the API endpoint
          if (marketData.floorPriceBTC) {
            unitPrice = marketData.floorPriceBTC;
          } else if (marketData.recentSalePriceBTC) {
            unitPrice = marketData.recentSalePriceBTC;
          }

          const totalStampValue = unitPrice * walletStamp.balance;
          stampValues[walletStamp.cpid] = totalStampValue;
          totalValue += totalStampValue;
        } else {
          stampValues[walletStamp.cpid] = 0;
        }
      });

      return { stampValues, totalValue };
    } catch (error) {
      logger.error("stamps", {
        message: "Error calculating wallet stamp values",
        error: error instanceof Error ? error.message : String(error)
      });
      return { stampValues: {}, totalValue: 0 };
    }
  }

  static async getSpecificStamp(identifier: string): Promise<{ stamp: number | undefined, stamp_url: string, stamp_mimetype: string }> {
    return await StampService.getSpecificStamp(identifier);
  }
}
