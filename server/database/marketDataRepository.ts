import { DEFAULT_CACHE_DURATION, MAX_PAGINATION_LIMIT } from "$constants";
import type {
  CacheStatus,
  CollectionMarketData,
  SRC20MarketData,
  SRC20MarketDataRow,
  StampHolderCache,
  StampHolderCacheRow,
  StampMarketData,
  StampMarketDataRow,
  StampWithMarketData,
} from "$types/marketData.d.ts";
import type { DispenserRow, StampFilters, StampRow } from "$types/stamp.d.ts";
// Local utility functions for market data parsing
function getCacheStatus(cacheAgeMinutes?: number): any {
  if (!cacheAgeMinutes) return "UNKNOWN";
  if (cacheAgeMinutes <= 5) return "FRESH";
  if (cacheAgeMinutes <= 15) return "STALE_OK";
  if (cacheAgeMinutes <= 60) return "STALE";
  return "EXPIRED";
}

function parseBTCDecimal(value: any): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(parsed) ? 0 : parsed;
}

function parseExchangeSources(sources: any): string[] {
  if (!sources) return [];
  if (Array.isArray(sources)) return sources;
  if (typeof sources === 'string') {
    try {
      return JSON.parse(sources);
    } catch {
      return [sources];
    }
  }
  return [];
}

/**
 * Builds the DispenserRow-shaped `lowestPriceDispenser` from the
 * lowest_dispenser_* columns (btc_stamps#939), or `null` if the stamp has
 * no open dispenser (or the columns aren't populated yet). satoshirate /
 * give_quantity / give_remaining / escrow_quantity are BIGINT columns that
 * come back as strings, same as last_sale_btc_amount elsewhere in this
 * file — parsed here as raw satoshi integers (not divided by 1e8), matching
 * DispenserRow.satoshirate's existing convention across the app (see
 * StampBuyTool.tsx, which divides by 1e8 itself when displaying BTC).
 *
 * Fields the indexer doesn't store per #939's proposal (block_index,
 * confirmed, close_block_index, status) are filled with sensible defaults
 * for an open dispenser, since this is only ever "the lowest-price OPEN
 * dispenser" by definition.
 */
function parseLowestPriceDispenser(
  row: StampMarketDataRow,
): DispenserRow | null {
  if (!row.lowest_dispenser_tx_hash) return null;

  const satoshirate = parseInt(row.lowest_dispenser_satoshirate || "0", 10) ||
    0;

  return {
    tx_hash: row.lowest_dispenser_tx_hash,
    block_index: 0,
    source: row.lowest_dispenser_source || "",
    cpid: row.cpid,
    give_quantity: parseInt(row.lowest_dispenser_give_quantity || "0", 10) ||
      0,
    give_remaining:
      parseInt(row.lowest_dispenser_give_remaining || "0", 10) || 0,
    escrow_quantity:
      parseInt(row.lowest_dispenser_escrow_quantity || "0", 10) || 0,
    satoshirate,
    btcrate: satoshirate / 100000000,
    origin: row.lowest_dispenser_origin || row.lowest_dispenser_source || "",
    confirmed: true,
    close_block_index: null,
    status: "open",
  };
}

function parseVolumeSources(sources: any): any {
  if (!sources) return {};
  if (typeof sources === 'object' && sources !== null && !Array.isArray(sources)) {
    return sources;
  }
  if (Array.isArray(sources)) {
    // Convert array to Record if needed
    const result: Record<string, number> = {};
    sources.forEach((source, index) => {
      result[source] = index;
    });
    return result;
  }
  if (typeof sources === 'string') {
    try {
      const parsed = JSON.parse(sources);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

import { dbManager } from "$server/database/databaseManager.ts";

// Lowest-price open dispenser columns proposed in btc_stamps#939 ("Store
// lowest-price open dispenser in stamp_market_data") — not yet added by the
// indexer. Referencing a column that genuinely doesn't exist in a MySQL
// SELECT is a hard query error (not a soft null), so probe for these once
// per process and only include them in the SELECTs below once they're
// actually there. The moment the indexer ships the migration, this flips
// to true (next process restart, or immediately on a cold cache) with zero
// code changes needed anywhere else in this repo — see
// parseStampMarketDataRow, StampService.enrichStampWithMarketData, and
// useLowestPriceDispenser (lib/hooks/) for the rest of the forward-compat
// chain.
const LOWEST_DISPENSER_COLUMNS = [
  "lowest_dispenser_tx_hash",
  "lowest_dispenser_source",
  "lowest_dispenser_origin",
  "lowest_dispenser_satoshirate",
  "lowest_dispenser_give_quantity",
  "lowest_dispenser_give_remaining",
  "lowest_dispenser_escrow_quantity",
] as const;

let lowestDispenserColumnsAvailable: Promise<boolean> | null = null;

async function checkLowestDispenserColumnsAvailable(
  db: typeof dbManager,
): Promise<boolean> {
  try {
    const result = await db.executeQuery<{ rows?: Array<{ col_count: number }> }>(
      `SELECT COUNT(*) as col_count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'stamp_market_data'
         AND COLUMN_NAME = 'lowest_dispenser_tx_hash'`,
      [],
    );
    return (result?.rows?.[0]?.col_count ?? 0) > 0;
  } catch {
    // Fail closed (act as if unavailable) rather than let a probe error
    // take down every caller of the three market data SELECTs below.
    return false;
  }
}

/**
 * Returns the SQL fragment selecting the 7 lowest_dispenser_* columns
 * (with an optional `prefix`, e.g. "smd." for the getStampsWithMarketData
 * JOIN), or an empty string if the columns don't exist on this schema yet.
 * The availability check itself is memoized for the life of the process.
 */
async function getLowestDispenserColumnsSql(
  db: typeof dbManager,
  prefix = "",
): Promise<string> {
  if (!lowestDispenserColumnsAvailable) {
    lowestDispenserColumnsAvailable = checkLowestDispenserColumnsAvailable(db);
  }
  const available = await lowestDispenserColumnsAvailable;
  if (!available) return "";
  return LOWEST_DISPENSER_COLUMNS.map((col) => `${prefix}${col},`).join(
    "\n        ",
  ) + "\n       ";
}

/**
 * Repository for accessing market data from cache tables.
 * Provides methods to retrieve market data for stamps, SRC-20 tokens,
 * collections, and holder information with proper cache freshness calculations.
 */
export class MarketDataRepository {
  // Dependency injection support
  private static db: typeof dbManager = dbManager;

  static setDatabase(database: typeof dbManager): void {
    this.db = database;
  }

  /**
   * Get market data for a single stamp by CPID
   * @param cpid - The CPID of the stamp
   * @returns StampMarketData or null if not found/no market data
   */
  static async getStampMarketData(cpid: string): Promise<StampMarketData | null> {
    const lowestDispenserColumnsSql = await getLowestDispenserColumnsSql(
      this.db,
    );
    const query = `
      SELECT
        cpid,
        floor_price_btc,
        recent_sale_price_btc,
        open_dispensers_count,
        closed_dispensers_count,
        total_dispensers_count,
        holder_count,
        unique_holder_count,
        top_holder_percentage,
        holder_distribution_score,
        volume_24h_btc,
        volume_7d_btc,
        volume_30d_btc,
        total_volume_btc,
        price_source,
        volume_sources,
        data_quality_score,
        confidence_level,
        last_updated,
        last_price_update,
        update_frequency_minutes,
        last_sale_tx_hash,
        last_sale_buyer_address,
        last_sale_dispenser_address,
        last_sale_btc_amount,
        last_sale_dispenser_tx_hash,
        last_sale_block_index,
        activity_level,
        last_activity_time,
        ${lowestDispenserColumnsSql}
        TIMESTAMPDIFF(MINUTE, last_updated, UTC_TIMESTAMP()) as cache_age_minutes
      FROM stamp_market_data
      WHERE cpid = ?
      LIMIT 1
    `;

    try {
      const result = await this.db.executeQueryWithCache(
        query,
        [cpid],
        DEFAULT_CACHE_DURATION
      ) as { rows?: Array<StampMarketDataRow & { cache_age_minutes: number }> };

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      // Parse the row data into the application format
      return this.parseStampMarketDataRow(row);
    } catch (error) {
      console.error(`Error fetching market data for stamp ${cpid}:`, error);
      return null;
    }
  }

  /**
   * Get stamps with their market data using JOIN queries
   * @param options - Query options including filters, pagination, and sorting
   * @returns Array of stamps with their market data
   */
  static async getStampsWithMarketData(options: {
    collectionId?: string;
    offset?: number;
    limit?: number;
    filters?: StampFilters;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<StampWithMarketData[]> {
    const {
      collectionId,
      offset = 0,
      limit = MAX_PAGINATION_LIMIT,
      filters,
      sortBy = 'block_index',
      sortOrder = 'DESC'
    } = options;

    const lowestDispenserColumnsSql = await getLowestDispenserColumnsSql(
      this.db,
      "smd.",
    );

    // Build the query with LEFT JOIN to include stamps without market data
    let query = `
      SELECT
        st.*,
        cr.creator AS creator_name,
        smd.floor_price_btc,
        smd.recent_sale_price_btc,
        smd.open_dispensers_count,
        smd.closed_dispensers_count,
        smd.total_dispensers_count,
        smd.holder_count,
        smd.unique_holder_count,
        smd.top_holder_percentage,
        smd.holder_distribution_score,
        smd.volume_24h_btc,
        smd.volume_7d_btc,
        smd.volume_30d_btc,
        smd.total_volume_btc,
        smd.price_source,
        smd.volume_sources,
        smd.data_quality_score,
        smd.confidence_level,
        smd.last_updated as market_data_last_updated,
        smd.last_price_update,
        smd.update_frequency_minutes,
        ${lowestDispenserColumnsSql}
        TIMESTAMPDIFF(MINUTE, smd.last_updated, UTC_TIMESTAMP()) as cache_age_minutes
      FROM stamps st
      LEFT JOIN creator cr ON st.creator = cr.address
      LEFT JOIN stamp_market_data smd ON st.cpid = smd.cpid
    `;

    const whereConditions: string[] = [];
    const queryParams: (string | number)[] = [];

    // Add collection filter if provided
    if (collectionId) {
      query += ` JOIN collection_stamps cs ON st.stamp = cs.stamp`;
      whereConditions.push("cs.collection_id = UNHEX(?)");
      queryParams.push(collectionId);
    }

    // Add any additional filters here (could extend to use StampFilters)
    if (filters) {
      // This would need to be implemented based on the StampFilters interface
      // For now, we'll leave it as a placeholder
    }

    // Build WHERE clause
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add sorting and pagination
    query += ` ORDER BY st.${sortBy} ${sortOrder}`;
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    try {
      const result = await this.db.executeQueryWithCache(
        query,
        queryParams,
        DEFAULT_CACHE_DURATION
      ) as { rows?: Array<any> };

      if (!result.rows) {
        return [];
      }

      // Map the results to StampWithMarketData format
      return result.rows.map((row: any) => {
        const stamp: StampRow = {
          stamp: row.stamp,
          block_index: row.block_index,
          cpid: row.cpid,
          creator: row.creator,
          creator_name: row.creator_name,
          divisible: row.divisible,
          keyburn: row.keyburn,
          locked: row.locked,
          stamp_url: row.stamp_url,
          stamp_mimetype: row.stamp_mimetype,
          supply: row.supply,
          block_time: row.block_time,
          tx_hash: row.tx_hash,
          tx_index: row.tx_index || 0, // Add missing tx_index field
          ident: row.ident,
          stamp_hash: row.stamp_hash,
          file_hash: row.file_hash,
          stamp_base64: row.stamp_base64,
          unbound_quantity: row.unbound_quantity || 0,
          file_size_bytes: row.file_size_bytes || null,
          // These are optional fields that may not be in the DB result
        };

        let marketData: StampMarketData | null = null;
        let cacheStatus: CacheStatus | undefined;
        let cacheAgeMinutes: number | undefined;

        // Check if market data exists
        if (row.market_data_last_updated) {
          const marketDataRow: StampMarketDataRow & { cache_age_minutes: number } = {
            cpid: row.cpid,
            floor_price_btc: row.floor_price_btc,
            recent_sale_price_btc: row.recent_sale_price_btc,
            open_dispensers_count: row.open_dispensers_count,
            closed_dispensers_count: row.closed_dispensers_count,
            total_dispensers_count: row.total_dispensers_count,
            holder_count: row.holder_count,
            unique_holder_count: row.unique_holder_count,
            top_holder_percentage: row.top_holder_percentage,
            holder_distribution_score: row.holder_distribution_score,
            volume_24h_btc: row.volume_24h_btc,
            volume_7d_btc: row.volume_7d_btc,
            volume_30d_btc: row.volume_30d_btc,
            total_volume_btc: row.total_volume_btc,
            price_source: row.price_source,
            volume_sources: row.volume_sources,
            data_quality_score: row.data_quality_score,
            confidence_level: row.confidence_level,
            last_updated: row.market_data_last_updated,
            last_price_update: row.last_price_update,
            update_frequency_minutes: row.update_frequency_minutes,
            last_sale_tx_hash: row.last_sale_tx_hash,
            last_sale_buyer_address: row.last_sale_buyer_address,
            last_sale_dispenser_address: row.last_sale_dispenser_address,
            last_sale_btc_amount: row.last_sale_btc_amount,
            last_sale_dispenser_tx_hash: row.last_sale_dispenser_tx_hash,
            last_sale_block_index: row.last_sale_block_index,
            activity_level: row.activity_level,
            last_activity_time: row.last_activity_time,
            // Selected as smd.lowest_dispenser_* above (only present once
            // btc_stamps#939 ships) — row.* picks them up under their bare
            // column names same as every other smd.* field here.
            lowest_dispenser_tx_hash: row.lowest_dispenser_tx_hash,
            lowest_dispenser_source: row.lowest_dispenser_source,
            lowest_dispenser_origin: row.lowest_dispenser_origin,
            lowest_dispenser_satoshirate: row.lowest_dispenser_satoshirate,
            lowest_dispenser_give_quantity: row.lowest_dispenser_give_quantity,
            lowest_dispenser_give_remaining:
              row.lowest_dispenser_give_remaining,
            lowest_dispenser_escrow_quantity:
              row.lowest_dispenser_escrow_quantity,
            cache_age_minutes: row.cache_age_minutes
          };

          marketData = this.parseStampMarketDataRow(marketDataRow);

          cacheAgeMinutes = row.cache_age_minutes;
          cacheStatus = getCacheStatus(cacheAgeMinutes) as any;
        }

        const stampWithMarketData: StampWithMarketData = {
          ...stamp,
          marketData,
          ...(cacheStatus !== undefined && { cacheStatus }),
          ...(cacheAgeMinutes !== undefined && { cacheAgeMinutes }),
        };

        // Add a message if no market data is available
        if (!marketData) {
          stampWithMarketData.marketDataMessage = "No market data available for this stamp";
        }

        return stampWithMarketData;
      });
    } catch (error) {
      console.error("Error fetching stamps with market data:", error);
      return [];
    }
  }

  /**
   * Get SRC-20 token market data by tick
   * @param tick - The tick symbol of the SRC-20 token
   * @returns SRC20MarketData or null if not found
   */
  static async getSRC20MarketData(tick: string): Promise<SRC20MarketData | null> {
    const query = `
      SELECT
        tick,
        price_btc,
        price_usd,
        floor_price_btc,
        market_cap_btc,
        market_cap_usd,
        volume_24h_btc,
        volume_7d_btc,
        volume_30d_btc,
        total_volume_btc,
        holder_count,
        circulating_supply,
        price_change_24h_percent,
        price_change_7d_percent,
        price_change_30d_percent,
        primary_exchange,
        exchange_sources,
        data_quality_score,
        last_updated,
        TIMESTAMPDIFF(MINUTE, last_updated, UTC_TIMESTAMP()) as cache_age_minutes
      FROM src20_market_data
      WHERE tick = ?
      LIMIT 1
    `;

    try {
      const result = await this.db.executeQueryWithCache(
        query,
        [tick],
        DEFAULT_CACHE_DURATION
      ) as { rows?: Array<SRC20MarketDataRow & { cache_age_minutes: number }> };

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      // Parse the row data into the application format
      return this.parseSRC20MarketDataRow(row);
    } catch (error) {
      console.error(`Error fetching market data for SRC-20 token ${tick}:`, error);
      return null;
    }
  }

  /**
   * Get market data for multiple SRC-20 tokens in a single batch query
   * This eliminates the connection storm by using a single database connection
   * @param ticks - Array of ticks to fetch market data for
   * @returns Map of tick to SRC20MarketData for O(1) lookups
   */
  static async getSRC20MarketDataBatch(ticks: string[]): Promise<Map<string, SRC20MarketData>> {
    if (!ticks || ticks.length === 0) {
      return new Map();
    }

    // Create placeholders for the IN clause
    const placeholders = ticks.map(() => '?').join(',');

    const query = `
      SELECT
        tick,
        price_btc,
        price_usd,
        floor_price_btc,
        market_cap_btc,
        market_cap_usd,
        volume_24h_btc,
        volume_7d_btc,
        volume_30d_btc,
        total_volume_btc,
        holder_count,
        circulating_supply,
        price_change_24h_percent,
        price_change_7d_percent,
        price_change_30d_percent,
        primary_exchange,
        exchange_sources,
        data_quality_score,
        last_updated,
        TIMESTAMPDIFF(MINUTE, last_updated, UTC_TIMESTAMP()) as cache_age_minutes
      FROM src20_market_data
      WHERE tick IN (${placeholders})
    `;

    try {
      const result = await this.db.executeQueryWithCache(
        query,
        ticks,
        DEFAULT_CACHE_DURATION
      ) as { rows?: Array<SRC20MarketDataRow & { cache_age_minutes: number }> };

      const marketDataMap = new Map<string, SRC20MarketData>();

      if (result.rows && result.rows.length > 0) {
        for (const row of result.rows) {
          const marketData = this.parseSRC20MarketDataRow(row);
          if (marketData) {
            marketDataMap.set(marketData.tick, marketData);
          }
        }
      }

      console.log(`[getSRC20MarketDataBatch] Fetched ${marketDataMap.size} market data entries for ${ticks.length} requested ticks`);
      return marketDataMap;
    } catch (error) {
      console.error(`Error fetching batch market data for SRC-20 tokens:`, error);
      return new Map();
    }
  }

  /**
   * Get aggregated market data for a collection
   * @param collectionId - The collection ID (hex string)
   * @returns CollectionMarketData or null if not found
   */
  static async getCollectionMarketData(collectionId: string): Promise<CollectionMarketData | null> {
    // Actual table columns: collection_id (BINARY(16)), floor_price_btc, avg_price_btc,
    // total_value_btc, volume_24h_btc, volume_7d_btc, volume_30d_btc, total_volume_btc,
    // total_stamps, unique_holders, listed_stamps, sold_stamps_24h, last_updated, created_at
    const query = `
      SELECT
        HEX(collection_id) as collection_id_hex,
        floor_price_btc,
        avg_price_btc,
        total_value_btc,
        volume_24h_btc,
        volume_7d_btc,
        volume_30d_btc,
        total_volume_btc,
        total_stamps,
        unique_holders,
        listed_stamps,
        sold_stamps_24h,
        last_updated,
        TIMESTAMPDIFF(MINUTE, last_updated, UTC_TIMESTAMP()) as cache_age_minutes
      FROM collection_market_data
      WHERE collection_id = UNHEX(?)
      LIMIT 1
    `;

    try {
      const result = await this.db.executeQueryWithCache(
        query,
        [collectionId],
        DEFAULT_CACHE_DURATION
      ) as { rows?: Array<any> };

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      return this.parseCollectionMarketDataRow(result.rows[0]);
    } catch (error) {
      console.error(`Error fetching market data for collection ${collectionId}:`, error);
      return null;
    }
  }

  /**
   * Get cached holder data for a stamp
   * @param cpid - The CPID of the stamp
   * @returns Array of holder cache entries
   */
  static async getStampHoldersFromCache(cpid: string): Promise<StampHolderCache[]> {
    const query = `
      SELECT
        id,
        cpid,
        address,
        quantity,
        percentage,
        rank_position,
        last_updated
      FROM stamp_holder_cache
      WHERE cpid = ?
      ORDER BY rank_position ASC
    `;

    try {
      const result = await this.db.executeQueryWithCache(
        query,
        [cpid],
        DEFAULT_CACHE_DURATION
      ) as { rows?: Array<StampHolderCacheRow> };

      if (!result.rows) {
        return [];
      }

      // Parse each row into StampHolderCache format
      return result.rows.map((row: StampHolderCacheRow) => ({
        id: row.id,
        cpid: row.cpid,
        address: row.address,
        quantity: parseBTCDecimal(row.quantity) || 0,
        percentage: parseFloat(row.percentage) || 0,
        rankPosition: row.rank_position,
        lastUpdated: new Date(row.last_updated),
      }));
    } catch (error) {
      console.error(`Error fetching holder cache for stamp ${cpid}:`, error);
      return [];
    }
  }

  /**
   * Bulk fetch market data for multiple stamps
   * @param cpids - Array of CPIDs to fetch
   * @returns Map of CPID to StampMarketData
   */
  static async getBulkStampMarketData(cpids: string[]): Promise<Map<string, StampMarketData>> {
    if (cpids.length === 0) {
      return new Map();
    }

    // Build placeholders for the IN clause
    const placeholders = cpids.map(() => '?').join(',');

    const lowestDispenserColumnsSql = await getLowestDispenserColumnsSql(
      this.db,
    );

    const query = `
      SELECT
        cpid,
        floor_price_btc,
        recent_sale_price_btc,
        open_dispensers_count,
        closed_dispensers_count,
        total_dispensers_count,
        holder_count,
        unique_holder_count,
        top_holder_percentage,
        holder_distribution_score,
        volume_24h_btc,
        volume_7d_btc,
        volume_30d_btc,
        total_volume_btc,
        price_source,
        volume_sources,
        data_quality_score,
        confidence_level,
        last_updated,
        last_price_update,
        update_frequency_minutes,
        last_sale_tx_hash,
        last_sale_buyer_address,
        last_sale_dispenser_address,
        last_sale_btc_amount,
        last_sale_dispenser_tx_hash,
        last_sale_block_index,
        activity_level,
        last_activity_time,
        ${lowestDispenserColumnsSql}
        TIMESTAMPDIFF(MINUTE, last_updated, UTC_TIMESTAMP()) as cache_age_minutes
      FROM stamp_market_data
      WHERE cpid IN (${placeholders})
    `;

    try {
      const result = await this.db.executeQueryWithCache(
        query,
        cpids,
        DEFAULT_CACHE_DURATION
      ) as { rows?: Array<StampMarketDataRow & { cache_age_minutes: number }> };

      const marketDataMap = new Map<string, StampMarketData>();

      if (result.rows) {
        for (const row of result.rows) {
          const marketData = this.parseStampMarketDataRow(row);
          if (marketData) {
            marketDataMap.set(marketData.cpid, marketData);
          }
        }
      }

      return marketDataMap;
    } catch (error) {
      console.error("Error fetching bulk market data:", error);
      return new Map();
    }
  }

  /**
   * Parse a stamp market data row from the database into the application format
   * @param row - Database row
   * @returns Parsed StampMarketData
   */
  private static parseStampMarketDataRow(row: StampMarketDataRow & { cache_age_minutes?: number }): StampMarketData | null {
    try {
      return {
        cpid: row.cpid,
        floorPriceBTC: parseBTCDecimal(row.floor_price_btc),
        recentSalePriceBTC: parseBTCDecimal(row.recent_sale_price_btc),
        // Calculate best price using fallback hierarchy
        lastPriceBTC: parseBTCDecimal(row.floor_price_btc) ||
                      parseBTCDecimal(row.recent_sale_price_btc) ||
                      0,
        // Default wallet value (not relevant for this context without quantity)
        walletValueBTC: 0,
        openDispensersCount: row.open_dispensers_count || 0,
        closedDispensersCount: row.closed_dispensers_count || 0,
        totalDispensersCount: row.total_dispensers_count || 0,
        holderCount: row.holder_count || 0,
        uniqueHolderCount: row.unique_holder_count || 0,
        topHolderPercentage: parseFloat(row.top_holder_percentage) || 0,
        holderDistributionScore: parseFloat(row.holder_distribution_score) || 0,
        volume24hBTC: parseBTCDecimal(row.volume_24h_btc) || 0,
        volume7dBTC: parseBTCDecimal(row.volume_7d_btc) || 0,
        volume30dBTC: parseBTCDecimal(row.volume_30d_btc) || 0,
        totalVolumeBTC: parseBTCDecimal(row.total_volume_btc) || 0,
        priceSource: row.price_source,
        volumeSources: parseVolumeSources(row.volume_sources),
        dataQualityScore: parseFloat(row.data_quality_score) || 0,
        confidenceLevel: parseFloat(row.confidence_level) || 0,
        lastUpdated: new Date(row.last_updated),
        lastPriceUpdate: row.last_price_update ? new Date(row.last_price_update) : null,
        updateFrequencyMinutes: row.update_frequency_minutes || 60,
        // Transaction detail fields
        lastSaleTxHash: row.last_sale_tx_hash,
        lastSaleBuyerAddress: row.last_sale_buyer_address,
        lastSaleDispenserAddress: row.last_sale_dispenser_address,
        lastSaleBtcAmount: row.last_sale_btc_amount ? parseBTCDecimal(row.last_sale_btc_amount) : null,
        lastSaleDispenserTxHash: row.last_sale_dispenser_tx_hash,
        lastSaleBlockIndex: row.last_sale_block_index,
        // Activity tracking fields
        activityLevel: row.activity_level,
        lastActivityTime: row.last_activity_time,
        // btc_stamps#939 forward-compat — see parseLowestPriceDispenser.
        lowestPriceDispenser: parseLowestPriceDispenser(row),
      };
    } catch (error) {
      console.error("Error parsing stamp market data row:", error);
      return null;
    }
  }

  /**
   * Parse a SRC20 market data row from the database into the application format
   * @param row - Database row
   * @returns Parsed SRC20MarketData
   */
  private static parseSRC20MarketDataRow(row: SRC20MarketDataRow & { cache_age_minutes?: number }): SRC20MarketData | null {
    try {
      return {
        tick: row.tick,
        priceBTC: parseBTCDecimal(row.price_btc),
        priceUSD: parseBTCDecimal(row.price_usd),
        floorPriceBTC: parseBTCDecimal(row.floor_price_btc),
        marketCapBTC: parseBTCDecimal(row.market_cap_btc) || 0,
        marketCapUSD: parseBTCDecimal(row.market_cap_usd) || 0,
        volume24hBTC: parseBTCDecimal(row.volume_24h_btc) || 0,
        volume7dBTC: parseBTCDecimal(row.volume_7d_btc) || 0,
        volume30dBTC: parseBTCDecimal(row.volume_30d_btc) || 0,
        totalVolumeBTC: parseBTCDecimal(row.total_volume_btc) || 0,
        holderCount: row.holder_count || 0,
        circulatingSupply: row.circulating_supply || "0",
        priceChange24hPercent: parseFloat(row.price_change_24h_percent) || 0,
        priceChange7dPercent: parseFloat(row.price_change_7d_percent) || 0,
        priceChange30dPercent: parseFloat(row.price_change_30d_percent) || 0,
        primaryExchange: row.primary_exchange,
        exchangeSources: parseExchangeSources(row.exchange_sources),
        dataQualityScore: parseFloat(row.data_quality_score) || 0,
        lastUpdated: new Date(row.last_updated),
      };
    } catch (error) {
      console.error("Error parsing SRC20 market data row:", error);
      return null;
    }
  }

  /**
   * Parse a collection market data row from the database into the application format
   * @param row - Database row
   * @returns Parsed CollectionMarketData
   */
  private static parseCollectionMarketDataRow(row: any): CollectionMarketData | null {
    try {
      const floorPrice = parseBTCDecimal(row.floor_price_btc);
      return {
        collectionId: row.collection_id_hex ?? row.collection_id,
        floorPriceBTC: floorPrice,
        avgPriceBTC: parseBTCDecimal(row.avg_price_btc),
        totalValueBTC: parseBTCDecimal(row.total_value_btc) || 0,
        volume24hBTC: parseBTCDecimal(row.volume_24h_btc) || 0,
        volume7dBTC: parseBTCDecimal(row.volume_7d_btc) || 0,
        volume30dBTC: parseBTCDecimal(row.volume_30d_btc) || 0,
        totalVolumeBTC: parseBTCDecimal(row.total_volume_btc) || 0,
        totalStamps: row.total_stamps ?? 0,
        uniqueHolders: row.unique_holders ?? 0,
        listedStamps: row.listed_stamps ?? 0,
        soldStamps24h: row.sold_stamps_24h ?? 0,
        lastUpdated: new Date(row.last_updated),
      };
    } catch (error) {
      console.error("Error parsing collection market data row:", error);
      return null;
    }
  }

  /**
   * Get all SRC20 market data from cache, sorted by market cap
   * @param limit - Maximum number of results
   * @returns Array of SRC20MarketData sorted by market cap descending
   */
  static async getAllSRC20MarketData(limit: number = 1000): Promise<SRC20MarketData[]> {
    const query = `
      SELECT
        tick,
        price_btc,
        price_usd,
        floor_price_btc,
        market_cap_btc,
        market_cap_usd,
        volume_24h_btc,
        volume_7d_btc,
        volume_30d_btc,
        total_volume_btc,
        holder_count,
        circulating_supply,
        price_change_24h_percent,
        price_change_7d_percent,
        price_change_30d_percent,
        primary_exchange,
        exchange_sources,
        data_quality_score,
        last_updated,
        TIMESTAMPDIFF(MINUTE, last_updated, UTC_TIMESTAMP()) as cache_age_minutes
      FROM src20_market_data

      ORDER BY CAST(market_cap_btc AS DECIMAL(20,8)) DESC
      LIMIT ?
    `;

    const result = await this.db.executeQueryWithCache(
      query,
      [limit],
      DEFAULT_CACHE_DURATION
    ) as { rows?: Array<SRC20MarketDataRow & { cache_age_minutes: number }> };

    if (!result || !result.rows || result.rows.length === 0) {
      return [];
    }

    return result.rows
      .map((row) =>
        this.parseSRC20MarketDataRow(row)
      )
      .filter((data): data is SRC20MarketData => data !== null);
  }

  /**
   * Get paginated SRC-20 market data with sorting and filtering
   * @param options - Pagination and sorting options
   * @returns Paginated SRC20MarketData with total count
   */
  static async getPaginatedSRC20MarketData(options: {
    limit: number;
    page: number;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  }): Promise<{
    data: SRC20MarketData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      limit,
      page,
      sortBy = "market_cap_usd",
      sortOrder = "DESC",
    } = options;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Validate and map sort field to database column
    const sortFieldMap: Record<string, string> = {
      market_cap_usd: "CAST(market_cap_usd AS DECIMAL(20,8))",
      volume_24h_btc: "CAST(volume_24h_btc AS DECIMAL(16,8))",
      price_change_24h_percent: "CAST(price_change_24h_percent AS DECIMAL(10,2))",
    };

    const sortColumn = sortFieldMap[sortBy] || sortFieldMap.market_cap_usd;

    // Query to get total count (with filtering)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM src20_market_data
      WHERE price_btc > 0
    `;

    // Query to get paginated data
    const dataQuery = `
      SELECT
        tick,
        price_btc,
        price_usd,
        floor_price_btc,
        market_cap_btc,
        market_cap_usd,
        volume_24h_btc,
        volume_7d_btc,
        volume_30d_btc,
        total_volume_btc,
        holder_count,
        circulating_supply,
        price_change_24h_percent,
        price_change_7d_percent,
        price_change_30d_percent,
        primary_exchange,
        exchange_sources,
        data_quality_score,
        last_updated,
        TIMESTAMPDIFF(MINUTE, last_updated, UTC_TIMESTAMP()) as cache_age_minutes
      FROM src20_market_data
      WHERE price_btc > 0
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    try {
      // Execute both queries in parallel
      const [countResult, dataResult] = await Promise.all([
        this.db.executeQueryWithCache(
          countQuery,
          [],
          DEFAULT_CACHE_DURATION
        ) as Promise<{ rows?: Array<{ total: number }> }>,
        this.db.executeQueryWithCache(
          dataQuery,
          [limit, offset],
          DEFAULT_CACHE_DURATION
        ) as Promise<{ rows?: Array<SRC20MarketDataRow & { cache_age_minutes: number }> }>,
      ]);

      // Extract total count
      const total = countResult.rows?.[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      // Parse the data rows
      const data = (dataResult.rows || [])
        .map((row) => this.parseSRC20MarketDataRow(row))
        .filter((marketData): marketData is SRC20MarketData => marketData !== null);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.error("Error fetching paginated SRC-20 market data:", error);
      // Return empty result on error
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  }
}
