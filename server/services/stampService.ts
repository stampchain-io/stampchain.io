import type {
    StampEdition,
    StampFilesize,
    StampFiletype,
    StampFilterType,
    StampMarketplace,
    StampRange,
    StampSuffixFilter
} from "$constants";
import { type StampType } from "$constants";
import { StampRepository } from "$server/database/index.ts";
import { BlockService } from "$server/services/core/blockService.ts";
import { CounterpartyApiManager, CounterpartyDispenserService } from "$server/services/counterpartyApiService.ts";
import type { SUBPROTOCOLS } from "$types/base.d.ts";

import { logger, LogNamespace } from "$lib/utils/logger.ts";
import { MarketDataRepository } from "$server/database/marketDataRepository.ts";
import { CreatorService } from "$server/services/creator/creatorService.ts";
import { getCacheConfig, RouteType } from "$server/services/infrastructure/cacheService.ts";
import { BTCPriceService } from "$server/services/price/btcPriceService.ts";
import type { StampMarketData, XcpBalance } from "$types/index.d.ts";

interface StampServiceOptions {
  cacheType: RouteType;
}

interface StampFileResult {
  status: number;
  body: string;
  stamp_url: string;
  tx_hash: string;
  headers: {
    "Content-Type": string;
    [key: string]: string;
  };
}

export class StampService {
  static async getStampDetailsById(
    id: string | number,
    stampType: StampType = "all",
    cacheType?: RouteType,
    cacheDuration?: number | "never",
    includeSecondary: boolean = true
  ) {
    try {
      // Get stamp details using getStamps with proper caching
      const stampResult = await this.getStamps({
        identifier: id,
        allColumns: false,
        noPagination: true,
        type: stampType,
        skipTotalCount: true,
        ...(cacheType && { cacheType }),
        ...(cacheDuration !== undefined && { cacheDuration }),
        includeSecondary
      });

      if (!stampResult) {
        throw new Error(`Error: Stamp ${id} not found`);
      }

      const stamp = this.extractStamp(stampResult);

      // For non-STAMP/SRC-721, return basic info
      if (stamp.ident !== "STAMP" && stamp.ident !== "SRC-721") {
        return {
          stamp,
          last_block: stampResult.last_block,
        };
      }

      // Get asset details from XCP
      const asset = await CounterpartyApiManager.getAssetInfo(stamp.cpid);

      return {
        stamp,
        asset,
        last_block: stampResult.last_block,
      };
    } catch (error: any) {
      console.error("Error in getStampDetailsById:", error);
      return null;
    }
  }

  private static extractStamp(stampResult: any) {
    console.log(
      "Extracting stamp from result:",
      JSON.stringify(stampResult, null, 2),
    );

    // Access 'stampResult.stamps' instead of 'stampResult.rows'
    if (Array.isArray(stampResult.stamps)) {
      if (stampResult.stamps.length === 0) {
        console.error("Stamp not found: empty stamps array");
        throw new Error(`Error: Stamp not found`);
      }
      return stampResult.stamps[0];
    }
    // Handle single stamp result
    else if (stampResult.stamp) {
      return stampResult.stamp;
    }
    // Handle direct result
    else {
      return stampResult;
    }
  }

  static async getStamps(options: {
    page?: number;
    limit?: number;
    sortBy?: "ASC" | "DESC";
    type?: StampType;
    ident?: SUBPROTOCOLS | SUBPROTOCOLS[];
    identifier?: string | number | (string | number)[];
    blockIdentifier?: number | string;
    allColumns?: boolean;
    includeSecondary?: boolean;
    noPagination?: boolean;
    cacheDuration?: number | "never";
    collectionId?: string | string[];
    sortColumn?: string;
    groupBy?: string;
    groupBySubquery?: boolean;
    skipTotalCount?: boolean;
    cacheType?: RouteType;
    creatorAddress?: string;
    filterBy?: StampFilterType[];
    suffix?: StampSuffixFilter[];
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
    url?: string;
    includeMarketData?: boolean;
    btcPriceUSD?: number;
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
    search?: string;
    stampNumberPrefix?: string;
  }) {
    // Extract range parameters from URL if not already set
    let range = options.range;
    let rangeMin = options.rangeMin;
    let rangeMax = options.rangeMax;

    if (!range && options.url) {
      try {
        const url = new URL(options.url);
        const urlRangeMin = url.searchParams.get("range[stampRange][min]");
        const urlRangeMax = url.searchParams.get("range[stampRange][max]");

        if (urlRangeMin || urlRangeMax) {
          console.log("Service extracting range params:", { urlRangeMin, urlRangeMax });
          // Set range to "custom" and pass min/max separately
          range = "custom" as StampRange;
          rangeMin = urlRangeMin || rangeMin;
          rangeMax = urlRangeMax || rangeMax;
          console.log("Service set range to custom with:", { range, rangeMin, rangeMax });
        }
      } catch (error: any) {
        console.error("Error extracting range from URL:", error);
      }
    }

    const queryOptions = {
      ...options,
      // Add collection query defaults if needed
      ...(options.collectionId && (!options.groupBy || !options.groupBySubquery) ? {
        groupBy: "collection_id",
        groupBySubquery: true
      } : {}),
    };

    if (options.url) {
      const url = new URL(options.url);
      console.log("All URL params in service:", Object.fromEntries(url.searchParams.entries()));
      console.log("Range params:", {
        min: url.searchParams.get("range[stampRange][min]"),
        max: url.searchParams.get("range[stampRange][max]")
      });
    }

    console.log("About to call repository with range:", range);

    const [result, lastBlock] = await Promise.all([
      StampRepository.getStamps({
        ...queryOptions,
        ...(options.includeSecondary !== undefined && { includeSecondary: options.includeSecondary }),
        ...(options.cacheType && { cacheType: options.cacheType }),
        ...(options.cacheDuration !== undefined && { cacheDuration: options.cacheDuration }),
        ...(options.fileType !== undefined && { fileType: options.fileType }),
        ...(options.editions !== undefined && { editions: options.editions }),
        ...(range !== undefined && { range: range }),
        ...(rangeMin !== undefined && { rangeMin: rangeMin }),
        ...(rangeMax !== undefined && { rangeMax: rangeMax }),
        ...(options.market !== undefined && { market: options.market }),
        ...(options.dispensers !== undefined && { dispensers: options.dispensers }),
        ...(options.atomics !== undefined && { atomics: options.atomics }),
        ...(options.listings !== undefined && { listings: options.listings }),
        ...(options.listingsMin !== undefined && { listingsMin: options.listingsMin }),
        ...(options.listingsMax !== undefined && { listingsMax: options.listingsMax }),
        ...(options.sales !== undefined && { sales: options.sales }),
        ...(options.salesMin !== undefined && { salesMin: options.salesMin }),
        ...(options.salesMax !== undefined && { salesMax: options.salesMax }),
        ...(options.volume !== undefined && { volume: options.volume }),
        ...(options.volumeMin !== undefined && { volumeMin: options.volumeMin }),
        ...(options.volumeMax !== undefined && { volumeMax: options.volumeMax }),
        ...(options.fileSize !== undefined && { fileSize: options.fileSize }),
        ...(options.fileSizeMin !== undefined && { fileSizeMin: options.fileSizeMin }),
        ...(options.fileSizeMax !== undefined && { fileSizeMax: options.fileSizeMax }),
        // Pass market data filters conditionally
        ...(options.minHolderCount !== undefined && { minHolderCount: options.minHolderCount }),
        ...(options.maxHolderCount !== undefined && { maxHolderCount: options.maxHolderCount }),
        ...(options.minDistributionScore !== undefined && { minDistributionScore: options.minDistributionScore }),
        ...(options.maxTopHolderPercentage !== undefined && { maxTopHolderPercentage: options.maxTopHolderPercentage }),
        ...(options.minFloorPriceBTC !== undefined && { minFloorPriceBTC: options.minFloorPriceBTC }),
        ...(options.maxFloorPriceBTC !== undefined && { maxFloorPriceBTC: options.maxFloorPriceBTC }),
        ...(options.minVolume24h !== undefined && { minVolume24h: options.minVolume24h }),
        ...(options.minPriceChange24h !== undefined && { minPriceChange24h: options.minPriceChange24h }),
        ...(options.minDataQualityScore !== undefined && { minDataQualityScore: options.minDataQualityScore }),
        ...(options.maxCacheAgeMinutes !== undefined && { maxCacheAgeMinutes: options.maxCacheAgeMinutes }),
        ...(options.priceSource !== undefined && { priceSource: options.priceSource }),
        ...(options.collectionStampLimit !== undefined && { collectionStampLimit: options.collectionStampLimit }),
      }),
      BlockService.getLastBlock(),
    ]);

    if (!result) {
      throw new Error("NO STAMPS FOUND");
    }

    // Get initial results - marketplace filtering is now handled in the repository
    const initialResult = result;

    // Enrich with market data if requested and we have stamps
    let processedStamps = initialResult.stamps;
    if (options.includeMarketData && processedStamps.length > 0) {
      // Get market data for all stamps in a single query
      const cpids = processedStamps.map((stamp: any) => stamp.cpid).filter(Boolean);
      const marketDataMap = await MarketDataRepository.getBulkStampMarketData(cpids);

      // Enrich each stamp with its market data
      processedStamps = processedStamps.map((stamp: any) => {
        if (!stamp.cpid || (stamp.ident !== "STAMP" && stamp.ident !== "SRC-721")) {
          return stamp;
        }

        const marketData = marketDataMap.get(stamp.cpid) || null;
        return this.enrichStampWithMarketData(stamp, marketData as StampMarketData | null, options.btcPriceUSD || 0);
      });
    }

    // Enrich stamps with enhanced creator names using 3-tier fallback
    processedStamps = await CreatorService.enrichStampsWithCreatorNames(processedStamps);

    // Build base response
    const response = {
      stamps: processedStamps,
      last_block: lastBlock,
    };

    // Add pagination info for collection queries and index routes
    if ((options.collectionId && options.groupBy === "collection_id") || !options.skipTotalCount) {
      return {
        ...response,
        page: initialResult.page,
        limit: initialResult.page_size,      // Map page_size → limit
        totalPages: initialResult.pages,     // Map pages → totalPages
        total: initialResult.total,
      };
    }

    return response;
  }

  static async getStampFile(id: string): Promise<StampFileResult | null> {
    const result = await StampRepository.getStampFile(id);
    if (!result) return null;

    await logger.debug("content" as LogNamespace, {
      message: "StampService processing file",
      id,
      originalUrl: result.stamp_url,
      mimeType: result.stamp_mimetype,
    });

    return {
      status: 200,
      body: result.stamp_base64 || "",
      stamp_url: result.stamp_url,
      tx_hash: result.tx_hash,
      headers: {
        "Content-Type": result.stamp_mimetype
      }
    };
  }

  static async getStampBalancesByAddress(
    address: string,
    limit: number,
    page: number,
    xcpBalances: XcpBalance[],
    sortBy: "ASC" | "DESC" = "DESC"
  ) {
    try {
      // Get stamps and total count in parallel using the passed XCP balances
      const [stamps, totalResult] = await Promise.all([
        StampRepository.getStampBalancesByAddress(address, limit, page, xcpBalances, sortBy),
        StampRepository.getCountStampBalancesByAddressFromDb(address, xcpBalances)
      ]);

      const total = (totalResult as any).rows[0]?.total || 0;

      return { stamps, total };
    } catch (error: any) {
      console.error("Error in getStampBalancesByAddress:", error);
      return { stamps: [], total: 0 };
    }
  }

  static async getAllCPIDs() {
    return await StampRepository.getALLCPIDs();
  }

  static mapDispensesWithRates(dispenses: any, dispensers: any) {
    const dispenserRates = new Map(
      dispensers?.map((d: any) => [d.tx_hash, d.satoshirate]) ?? [],
    );
    return dispenses?.map((dispense: any) => ({
      ...dispense,
      satoshirate: dispenserRates.get(dispense.dispenser_tx_hash) || 0,
    })) ?? [];
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
    // Use local market data instead of fetching all dispense events
    const pageNum = page || 1;
    const pageLimit = limit || 50;
    const dayRange = options?.dayRange || 30;

    // Query stamps with recent sales from market data cache
    const result = await StampRepository.getRecentlyActiveSold({
      page: pageNum,
      limit: pageLimit,
      includeMarketData: true,
      type: options?.type || "all"
    });

    // Log warning if no sales found - indicates stamp_sales_history table is empty
    if (result.stamps.length === 0) {
      console.warn(`[RECENT SALES] No sales data found in stamp_sales_history table. This indicates the table is not being populated.`);
      console.warn(`[RECENT SALES] Check if background process for populating stamp_sales_history is running.`);
    }

    // Get current BTC price for USD conversion
    const btcPriceData = await BTCPriceService.getPrice();
    const btcPriceUSD = btcPriceData.price;

    // Transform the data to match schema (EnhancedStampSale format)
    const recentSales = result.stamps.map((stamp: any, index: number) => {
      // Debug: Check stamp data before transformation
      if (!stamp.stamp_url) {
        console.warn(`[Service] Stamp ${index} missing stamp_url. Stamp data:`, {
          stamp: stamp.stamp,
          cpid: stamp.cpid,
          stamp_url: stamp.stamp_url,
          has_stamp_url: 'stamp_url' in stamp,
          stamp_url_type: typeof stamp.stamp_url,
        });
      }
      const marketData = stamp.marketData;
      if (!marketData) return null;

      // Calculate time ago
      const saleTime = new Date(marketData.lastPriceUpdate);
      const timeAgo = this.getTimeAgo(saleTime);

      // Use enhanced transaction detail fields if available, fall back to existing data
      const btcAmount = marketData.lastSaleBtcAmount || marketData.recentSalePriceBTC || 0;
      const txHash = marketData.lastSaleTxHash || stamp.tx_hash;
      const blockIndex = marketData.lastSaleBlockIndex || stamp.block_index;
      const buyerAddress = marketData.lastSaleBuyerAddress || null;
      const dispenserAddress = marketData.lastSaleDispenserAddress || null;

      // Return EnhancedStampSale format (schema-compliant)
      return {
        // Core transaction info
        tx_hash: txHash,
        block_index: blockIndex,
        timestamp: saleTime.toISOString(),

        // Stamp info
        cpid: stamp.cpid,
        stamp_number: stamp.stamp,
        stamp: stamp.stamp, // v2.2 compatibility

        // Transaction participants
        source: dispenserAddress || stamp.creator, // Seller (dispenser owner)
        destination: buyerAddress || null, // Buyer
        buyer_address: buyerAddress, // v2.2 compatibility
        dispenser_address: dispenserAddress, // v2.2 compatibility

        // Dispenser info
        dispenser_tx_hash: marketData.lastSaleDispenserTxHash || null,
        dispense_quantity: marketData.lastSaleQuantity || 1, // Use actual quantity from sales history

        // Price info
        btc_amount: btcAmount,
        btc_rate: btcAmount, // BTC rate is same as amount for stamps
        satoshi_rate: btcAmount * 100000000, // Convert to satoshis
        btc_amount_satoshis: Math.round(btcAmount * 100000000),

        // USD price calculations
        usd_price: btcAmount * btcPriceUSD,
        btc_price_usd: btcPriceUSD,

        // v2.2 compatibility fields
        lastSalePrice: btcAmount,
        lastSalePriceUSD: btcAmount * btcPriceUSD,
        lastSaleDate: saleTime.toISOString(),
        time_ago: timeAgo,

        // Enhanced transaction details (when fullDetails=true)
        transaction_details: options?.includeFullDetails ? {
          size: null,
          weight: null,
          fee: null,
          fee_rate: null,
          input_count: null,
          output_count: null,
          confirmations: null,
          block_time: Math.floor(saleTime.getTime() / 1000),
          block_hash: null
        } : null,

        // Additional stamp metadata for compatibility
        stamp_url: stamp.stamp_url,
        stamp_mimetype: stamp.stamp_mimetype,
        creator: stamp.creator,
        creator_name: stamp.creator_name,

        // Activity tracking
        activity_level: marketData.activityLevel || null,
        last_activity_time: marketData.lastActivityTime || null,
      };
    }).filter((sale: any) => sale !== null);

    return {
      recentSales,
      total: result.total,
      btcPriceUSD,
      metadata: {
        dayRange,
        fullDetails: options?.includeFullDetails || false,
        totalSales: recentSales.length,
        totalVolumeBTC: recentSales.reduce((sum: number, sale: any) => sum + sale.btc_amount, 0),
        totalVolumeUSD: recentSales.reduce((sum: number, sale: any) => sum + (sale.usd_price || 0), 0),
        averagePriceBTC: recentSales.length > 0 ? recentSales.reduce((sum: number, sale: any) => sum + sale.btc_amount, 0) / recentSales.length : 0,
        averagePriceUSD: recentSales.length > 0 ? recentSales.reduce((sum: number, sale: any) => sum + (sale.usd_price || 0), 0) / recentSales.length : 0,
        uniqueStamps: new Set(recentSales.map((sale: any) => sale.stamp_number)).size,
        uniqueBuyers: new Set(recentSales.map((sale: any) => sale.destination).filter(Boolean)).size,
        uniqueSellers: new Set(recentSales.map((sale: any) => sale.source).filter(Boolean)).size,
        queryTime: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    };
  }

  /**
   * Calculate time ago string from date
   */
  private static getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  static async getCreatorNameByAddress(
    address: string,
  ): Promise<string | null> {
    return await StampRepository.getCreatorNameByAddress(address);
  }

  static async updateCreatorName(
    address: string,
    newName: string,
  ): Promise<boolean> {
    return await StampRepository.updateCreatorName(address, newName);
  }

  static async getStampHolders(
    cpid: string,
    page: number,
    limit: number,
    options: StampServiceOptions
  ) {
    const { duration } = getCacheConfig(options.cacheType);
    return await CounterpartyApiManager.getAllXcpHoldersByCpid(cpid, page, limit, duration);
  }

  static async getStampSends(
    cpid: string,
    page: number,
    limit: number,
    options: StampServiceOptions
  ) {
    const { duration } = getCacheConfig(options.cacheType);
    return await CounterpartyApiManager.getXcpSendsByCPID(cpid, page, limit, duration);
  }

  static async getStampDispensers(
    cpid: string,
    page?: number,
    limit?: number,
    options?: StampServiceOptions
  ) {
    const { duration } = getCacheConfig(options?.cacheType || RouteType.STAMP_DISPENSER);
    if (page !== undefined && limit !== undefined) {
      return await CounterpartyDispenserService.getDispensersByCpid(cpid, page, limit, duration);
    }
    return await CounterpartyDispenserService.getDispensersByCpid(cpid);
  }

  static async getStampDispenses(
    cpid: string,
    page: number,
    limit: number,
    options: StampServiceOptions
  ) {
    const { duration } = getCacheConfig(options.cacheType);
    return await CounterpartyDispenserService.getDispensesByCpid(cpid, page, limit, duration);
  }

  // New lightweight method to just get cpid
  static async resolveToCpid(id: string) {
    try {
      const result = await StampRepository.getStamps({
        identifier: id,
        allColumns: false,
        noPagination: true,
        skipTotalCount: true,
        // Only select minimal required fields
        selectColumns: ['cpid', 'ident'],
        // Important: Don't filter by type to allow cursed stamps
        type: "all"
      });

      if (!result?.stamps?.[0]) {
        throw new Error(`Error: Stamp ${id} not found`);
      }

      return result.stamps[0];
    } catch (error: any) {
      console.error(`Error resolving CPID for ${id}:`, error);
      throw error;
    }
  }

  static async countTotalStamps(): Promise<{ isValid: boolean; count: number }> {
    return await StampRepository.countTotalStamps();
  }

  static async getSpecificStamp(identifier: string): Promise<{ stamp: number | undefined, stamp_url: string, stamp_mimetype: string }> {
    return await StampRepository.getSpecificStamp(identifier);
  }

  /**
   * Enrich a stamp with market data
   * @param stamp - The stamp to enrich
   * @param marketData - The market data to add
   * @param btcPriceUSD - Current BTC price in USD
   * @returns Stamp enriched with market data
   */
  private static enrichStampWithMarketData(
    stamp: any,
    marketData: StampMarketData | null,
    btcPriceUSD: number
  ): any {
    // If no market data, return stamp with default values
    if (!marketData) {
      return {
        ...stamp,
        market_data: null,
        marketDataMessage: "No market data available for this stamp"
      };
    }

    // Floor price is now handled directly in market_data structure

    // Determine recent sale price for backward compatibility
    let recentSalePrice: number | "priceless" = "priceless";
    if (marketData.recentSalePriceBTC !== null && marketData.recentSalePriceBTC > 0) {
      recentSalePrice = marketData.recentSalePriceBTC;
    }

    // VALIDATION: Ensure recentSalePrice mirrors marketData.recentSalePriceBTC exactly
    const isValidMirroring = (
      (recentSalePrice === "priceless" && (marketData.recentSalePriceBTC === null || marketData.recentSalePriceBTC <= 0)) ||
      (typeof recentSalePrice === "number" && recentSalePrice === marketData.recentSalePriceBTC)
    );

    if (!isValidMirroring) {
      logger.error("stamps", {
        message: "recentSalePrice validation failed - field does not mirror marketData.recentSalePriceBTC",
        cpid: stamp.cpid,
        stamp: stamp.stamp,
        recentSalePrice,
        marketDataRecentSalePriceBTC: marketData.recentSalePriceBTC,
        validationDetails: {
          recentSalePriceType: typeof recentSalePrice,
          recentSalePriceValue: recentSalePrice,
          marketDataType: typeof marketData.recentSalePriceBTC,
          marketDataValue: marketData.recentSalePriceBTC,
          marketDataIsNull: marketData.recentSalePriceBTC === null,
          marketDataIsZero: marketData.recentSalePriceBTC === 0
        }
      });
    }

    return {
      ...stamp,
      // v2.3+: market_data contains all market information (consistent snake_case)
      market_data: marketData ? {
        // Convert camelCase to snake_case for API consistency
        floor_price_btc: marketData.floorPriceBTC || null,
        floor_price_usd: marketData.floorPriceBTC ? marketData.floorPriceBTC * btcPriceUSD : null,
        recent_sale_price_btc: marketData.recentSalePriceBTC || null,
        recent_sale_price_usd: marketData.recentSalePriceBTC ? marketData.recentSalePriceBTC * btcPriceUSD : null,
        volume_24h_btc: marketData.volume24hBTC || 0,
        volume_24h_usd: marketData.volume24hBTC ? marketData.volume24hBTC * btcPriceUSD : null,
        volume_7d_btc: marketData.volume7dBTC || 0,
        volume_7d_usd: marketData.volume7dBTC ? marketData.volume7dBTC * btcPriceUSD : null,
        volume_30d_btc: marketData.volume30dBTC || 0,
        volume_30d_usd: marketData.volume30dBTC ? marketData.volume30dBTC * btcPriceUSD : null,
        holder_count: marketData.holderCount || 0,
        data_quality_score: marketData.dataQualityScore || 7,
        price_source: marketData.priceSource || "unknown",
        last_price_update: marketData.lastPriceUpdate || null,
        cache_status: marketData.lastUpdated ?
          this.getCacheStatus(marketData.lastUpdated) : undefined,
        dispensers: {
          open_count: marketData.openDispensersCount || 0,
          closed_count: marketData.closedDispensersCount || 0,
          total_count: marketData.totalDispensersCount || 0
        }
      } : null,
      // Backward compatibility: marketData in camelCase for existing frontend components
      marketData: marketData ? {
        floorPriceBTC: marketData.floorPriceBTC || null,
        recentSalePriceBTC: marketData.recentSalePriceBTC || null,
        volume24hBTC: marketData.volume24hBTC || 0,
        volume7dBTC: marketData.volume7dBTC || 0,
        volume30dBTC: marketData.volume30dBTC || 0,
        holderCount: marketData.holderCount || 0,
        dataQualityScore: marketData.dataQualityScore || 7,
        priceSource: marketData.priceSource || "unknown",
        lastPriceUpdate: marketData.lastPriceUpdate || null,
        lastUpdated: marketData.lastUpdated,
        openDispensersCount: marketData.openDispensersCount || 0,
        closedDispensersCount: marketData.closedDispensersCount || 0,
        totalDispensersCount: marketData.totalDispensersCount || 0
      } : null,
      marketDataMessage: marketData ? undefined : "No market data available for this stamp"
    };
  }

  /**
   * Get cache status based on last update time
   */
  private static getCacheStatus(lastUpdated: Date): string {
    const ageMinutes = (Date.now() - lastUpdated.getTime()) / (1000 * 60);
    if (ageMinutes < 5) return 'fresh';
    if (ageMinutes < 30) return 'recent';
    if (ageMinutes < 60) return 'stale';
    return 'outdated';
  }

  /**
   * Get stamps with market data using efficient JOIN queries
   */
  static async getStampsWithMarketData(options: {
    collectionId?: string;
    offset?: number;
    limit?: number;
    filters?: any;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    btcPriceUSD: number;
  }): Promise<any[]> {
    // Use the repository method that includes JOIN with market data
    const stampsWithMarketData = await MarketDataRepository.getStampsWithMarketData({
      ...(options.collectionId && { collectionId: options.collectionId }),
      ...(options.offset !== undefined && { offset: options.offset }),
      ...(options.limit !== undefined && { limit: options.limit }),
      ...(options.filters && { filters: options.filters }),
      ...(options.sortBy && { sortBy: options.sortBy }),
      ...(options.sortOrder && { sortOrder: options.sortOrder })
    });

    // Enrich each stamp with USD calculations and cache status
    return stampsWithMarketData.map(stampData => {
      const { marketData, cacheStatus: _cacheStatus, cacheAgeMinutes: _cacheAgeMinutes, ...stamp } = stampData;
      return this.enrichStampWithMarketData(stamp, marketData as StampMarketData | null, options.btcPriceUSD);
    });
  }

  /**
   * Get the count of stamps created by a specific address
   */
  static async getStampsCreatedCount(address: string): Promise<{ total: number }> {
    try {
      return await StampRepository.getStampsCreatedCount(address);
    } catch (error) {
      logger.error("stamps", {
        message: "Error getting stamps created count",
        error: error instanceof Error ? error.message : String(error),
        address
      });
      return { total: 0 };
    }
  }

  /**
   * Get bulk stamp market data for multiple CPIDs
   */
  static async getBulkStampMarketData(cpids: string[]): Promise<Map<string, StampMarketData>> {
    try {
      const result = await MarketDataRepository.getBulkStampMarketData(cpids);
      // Cast to compatible type - both StampMarketData types are compatible at runtime
      return result as Map<string, StampMarketData>;
    } catch (error) {
      logger.error("stamps", {
        message: "Error getting bulk stamp market data",
        error: error instanceof Error ? error.message : String(error),
        cpids: cpids.slice(0, 10) // Log first 10 CPIDs only for debugging
      });
      return new Map();
    }
  }
}
