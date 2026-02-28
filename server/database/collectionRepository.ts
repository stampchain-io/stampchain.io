import { SMALL_LIMIT, STAMP_TABLE } from "$constants";
import type { CollectionRow, CollectionWithCreators } from "$server/types/collection.d.ts";
import { dbManager } from "$server/database/databaseManager.ts";

// Local utility function for BTC decimal parsing
function parseBTCDecimal(value: any): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "string" ? parseFloat(value) : Number(value);
  return isNaN(parsed) ? null : parsed;
}

// Local utility function for integer parsing that preserves null
function parseIntOrNull(value: any): number | null {
  if (value === null || value === undefined) return null;
  const parsed = parseInt(value);
  return isNaN(parsed) ? null : parsed;
}

export class CollectionRepository {
  // Dependency injection support
  private static db: typeof dbManager = dbManager;

  static setDatabase(database: typeof dbManager): void {
    this.db = database;
  }

  static async getCollectionDetails(
    options: {
      limit?: number;
      page?: number;
      creator?: string;
      sortBy?: string;
      minStampCount?: number;
    },
  ) {
    const {
      limit = SMALL_LIMIT,
      page = 1,
      creator,
      sortBy = "DESC",
      minStampCount,
    } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        HEX(c.collection_id) as collection_id,
        c.collection_name,
        c.collection_description,
        GROUP_CONCAT(DISTINCT cc.creator_address) as creators,
        GROUP_CONCAT(DISTINCT cs.stamp) as stamp_numbers,
        COUNT(DISTINCT cs.stamp) as stamp_count,
        SUM(
          CASE
            WHEN st.divisible = 1 THEN st.supply / 100000000
            WHEN st.supply > 100000 THEN 100000
            ELSE st.supply
          END
        ) as total_editions
      FROM collections c
      LEFT JOIN collection_creators cc ON c.collection_id = cc.collection_id
      LEFT JOIN collection_stamps cs ON c.collection_id = cs.collection_id
      LEFT JOIN ${STAMP_TABLE} st ON cs.stamp = st.stamp
    `;

    const queryParams: any[] = [];

    if (creator) {
      query += ` WHERE cc.creator_address = ?`;
      queryParams.push(creator);
    }

    query += `
      GROUP BY c.collection_id, c.collection_name, c.collection_description
    `;

    // Add HAVING clause for minimum stamp count filter
    if (minStampCount !== undefined && minStampCount > 0) {
      query += ` HAVING COUNT(DISTINCT cs.stamp) >= ?`;
      queryParams.push(minStampCount);
    }

    query += `
      ORDER BY c.collection_name ${sortBy}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);

    const result = await this.db.executeQueryWithCache(
      query,
      queryParams,
      60 * 5, // 5 minutes cache in seconds
    ) as {
      rows: import("../../server/types/collection.d.ts").CollectionRow[];
      [key: string]: any;
    };

    return {
      ...result,
      rows: result.rows.map((row: any) => ({
        ...row,
        creators: row.creators ? row.creators.split(",") : [],
        stamps: row.stamp_numbers
          ? row.stamp_numbers.split(",").map(Number)
          : [],
      })),
    };
  }

  static async getTotalCollectionsByCreatorFromDb(
    creator?: string,
    minStampCount?: number,
  ) {
    let query: string;
    const queryParams: any[] = [];

    if (minStampCount !== undefined && minStampCount > 0) {
      // Use subquery to count collections with minimum stamp count
      query = `
        SELECT COUNT(*) as total FROM (
          SELECT c.collection_id
          FROM collections c
          LEFT JOIN collection_creators cc ON c.collection_id = cc.collection_id
          LEFT JOIN collection_stamps cs ON c.collection_id = cs.collection_id
      `;

      if (creator) {
        query += ` WHERE cc.creator_address = ?`;
        queryParams.push(creator);
      }

      query += `
          GROUP BY c.collection_id
          HAVING COUNT(DISTINCT cs.stamp) >= ?
        ) as filtered_collections
      `;
      queryParams.push(minStampCount);
    } else {
      // Original query for all collections
      query =
        `SELECT COUNT(DISTINCT c.collection_id) as total FROM collections c`;

      if (creator) {
        query +=
          ` JOIN collection_creators cc ON c.collection_id = cc.collection_id WHERE cc.creator_address = ?`;
        queryParams.push(creator);
      }
    }

    const result = await this.db.executeQueryWithCache(
      query,
      queryParams,
      60 * 30, // 30 minutes cache in seconds
    ) as { rows: [{ total: number }] };

    return result.rows[0].total;
  }

  static async getCollectionByName(
    collectionName: string,
  ): Promise<CollectionRow | null> {
    const query = `
      SELECT
        HEX(c.collection_id) as collection_id,
        c.collection_name,
        c.collection_description,
        GROUP_CONCAT(DISTINCT cc.creator_address) as creators,
        COUNT(DISTINCT cs.stamp) as stamp_count,
        SUM(
          CASE
            WHEN st.divisible = 1 THEN st.supply / 100000000
            WHEN st.supply > 100000 THEN 100000
            ELSE st.supply
          END
        ) as total_editions
      FROM collections c
      LEFT JOIN collection_creators cc ON c.collection_id = cc.collection_id
      LEFT JOIN collection_stamps cs ON c.collection_id = cs.collection_id
      LEFT JOIN ${STAMP_TABLE} st ON cs.stamp = st.stamp
      WHERE c.collection_name = ?
      GROUP BY c.collection_id, c.collection_name
    `;

    const result = await this.db.executeQueryWithCache(
      query,
      [collectionName],
      60 * 10, // Cache for 10 minutes instead of never
    ) as { rows: CollectionRow[] };

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  static async getCollectionByStamp(
    stampNumber: number,
  ): Promise<{
    collection_id: string;
    collection_name: string;
    collection_description: string;
  } | null> {
    const query = `
      SELECT collection_name, collection_description, HEX(c.collection_id) as collection_id
      FROM collections c
      JOIN collection_stamps cs ON c.collection_id = cs.collection_id
      WHERE cs.stamp = ?
    `;

    try {
      const result = await this.db.executeQueryWithCache(
        query,
        [stampNumber],
        60 * 5, // 5 minutes cache in seconds
      ) as { rows: Array<{ collection_id: string; collection_name: string; collection_description: string }> };

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      console.debug(
        `getCollectionByStamp: stamp=${stampNumber} -> collection="${row.collection_name}" (${row.collection_id})`,
      );
      return {
        collection_id: row.collection_id,
        collection_name: row.collection_name,
        collection_description: row.collection_description,
      };
    } catch (error) {
      console.error(
        `getCollectionByStamp: error fetching collection for stamp=${stampNumber}:`,
        error,
      );
      throw error;
    }
  }

  static async getCollectionById(
    collectionId: string,
    options: {
      includeMarketData?: boolean;
      stampLimit?: number;
      stampPage?: number;
    } = {},
  ): Promise<CollectionWithCreators | null> {
    const {
      includeMarketData = true,
      stampLimit = 50,
      stampPage = 1,
    } = options;

    const stampOffset = (stampPage - 1) * stampLimit;

    // Core collection query (no market data JOIN - fetched separately)
    const query = `
      SELECT
        HEX(c.collection_id) as collection_id,
        c.collection_name,
        c.collection_description,
        GROUP_CONCAT(DISTINCT cc.creator_address) as creators,
        GROUP_CONCAT(DISTINCT cr.creator) as creator_names,
        COUNT(DISTINCT cs.stamp) as stamp_count,
        SUM(
          CASE
            WHEN st.divisible = 1 THEN st.supply / 100000000
            WHEN st.supply > 100000 THEN 100000
            ELSE st.supply
          END
        ) as total_editions
      FROM collections c
      LEFT JOIN collection_creators cc ON c.collection_id = cc.collection_id
      LEFT JOIN creator cr ON cc.creator_address = cr.address
      LEFT JOIN collection_stamps cs ON c.collection_id = cs.collection_id
      LEFT JOIN ${STAMP_TABLE} st ON cs.stamp = st.stamp
      WHERE c.collection_id = UNHEX(?)
      GROUP BY c.collection_id, c.collection_name, c.collection_description
    `;

    const result = await this.db.executeQueryWithCache(
      query,
      [collectionId],
      60 * 5, // Cache for 5 minutes
    ) as { rows: any[] };

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Get stamps for this collection with pagination
    const stampsQuery = `
      SELECT cs.stamp
      FROM collection_stamps cs
      WHERE cs.collection_id = UNHEX(?)
      ORDER BY cs.stamp DESC
      LIMIT ? OFFSET ?
    `;

    const stampsResult = await this.db.executeQueryWithCache(
      stampsQuery,
      [collectionId, stampLimit, stampOffset],
      60 * 5, // Cache for 5 minutes
    ) as { rows: Array<{ stamp: number }> };

    const stamps = stampsResult.rows.map((r) => r.stamp);

    // Fetch market data separately - collection_market_data.collection_id is BINARY(16),
    // so we use UNHEX() to convert the hex string parameter for matching.
    // Actual table columns: collection_id, floor_price_btc, avg_price_btc, total_value_btc,
    // volume_24h_btc, volume_7d_btc, volume_30d_btc, total_volume_btc, total_stamps,
    // unique_holders, listed_stamps, sold_stamps_24h, last_updated, created_at
    let marketData = null;
    if (includeMarketData) {
      try {
        const marketQuery = `
          SELECT
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
            last_updated
          FROM collection_market_data
          WHERE collection_id = UNHEX(?)
          LIMIT 1
        `;

        const marketResult = await this.db.executeQueryWithCache(
          marketQuery,
          [collectionId],
          60 * 5, // Cache for 5 minutes
        ) as { rows: any[] };

        if (marketResult.rows && marketResult.rows.length > 0) {
          const md = marketResult.rows[0];
          const floorPrice = parseBTCDecimal(md.floor_price_btc);
          marketData = {
            floorPriceBTC: floorPrice,
            avgPriceBTC: parseBTCDecimal(md.avg_price_btc),
            totalValueBTC: parseBTCDecimal(md.total_value_btc) ?? 0,
            volume24hBTC: parseBTCDecimal(md.volume_24h_btc) ?? 0,
            volume7dBTC: parseBTCDecimal(md.volume_7d_btc) ?? 0,
            volume30dBTC: parseBTCDecimal(md.volume_30d_btc) ?? 0,
            totalVolumeBTC: parseBTCDecimal(md.total_volume_btc) ?? 0,
            totalStamps: parseIntOrNull(md.total_stamps) ?? 0,
            uniqueHolders: parseIntOrNull(md.unique_holders) ?? 0,
            listedStamps: parseIntOrNull(md.listed_stamps) ?? 0,
            soldStamps24h: parseIntOrNull(md.sold_stamps_24h) ?? 0,
            lastUpdated: md.last_updated ? new Date(md.last_updated) : null,
          };
        }
      } catch (error) {
        console.error("Error fetching market data for collection:", collectionId, error);
      }
    }

    return {
      collection_id: row.collection_id,
      collection_name: row.collection_name,
      collection_description: row.collection_description,
      creators: row.creators ? row.creators.split(",") : [],
      creator_names: row.creator_names
        ? row.creator_names.split(",").filter((name: string) => name && name !== "null")
        : [],
      stamp_count: typeof row.stamp_count === "string"
        ? parseInt(row.stamp_count)
        : row.stamp_count,
      total_editions: typeof row.total_editions === "string"
        ? parseInt(row.total_editions)
        : row.total_editions,
      stamps,
      img: row.img || "",
      marketData,
    } as CollectionWithCreators;
  }

  static async getCollectionNames(
    options: {
      limit?: number;
      page?: number;
      creator?: string;
    },
  ) {
    const { limit = SMALL_LIMIT, page = 1, creator } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        collection_name
      FROM collections c
      LEFT JOIN collection_creators cc ON c.collection_id = cc.collection_id
    `;

    const queryParams: any[] = [];

    if (creator) {
      query += ` WHERE cc.creator_address = ?`;
      queryParams.push(creator);
    }

    query += `
      GROUP BY c.collection_id, c.collection_name, c.collection_description
      ORDER BY c.collection_name
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);

    return await this.db.executeQueryWithCache(
      query,
      queryParams,
      60 * 5, // 5 minutes cache in seconds
    );
  }

  static async getCollectionDetailsWithMarketData(
    options: {
      limit?: number;
      page?: number;
      creator?: string;
      sortBy?: string;
      minStampCount?: number;
      includeMarketData?: boolean;
    },
  ): Promise<{
    rows: import("../../server/types/collection.d.ts").CollectionRow[];
    [key: string]: any;
  }> {
    const {
      limit = SMALL_LIMIT,
      page = 1,
      creator,
      sortBy = "DESC",
      minStampCount,
      includeMarketData = false,
    } = options;
    const offset = (page - 1) * limit;

    // Core collection query (no market data JOIN - fetched separately)
    const query = `
      SELECT
        HEX(c.collection_id) as collection_id,
        c.collection_name,
        c.collection_description,
        GROUP_CONCAT(DISTINCT cc.creator_address) as creators,
        GROUP_CONCAT(DISTINCT cr.creator) as creator_names,
        GROUP_CONCAT(DISTINCT cs.stamp) as stamp_numbers,
        COUNT(DISTINCT cs.stamp) as stamp_count,
        SUM(
          CASE
            WHEN st.divisible = 1 THEN st.supply / 100000000
            WHEN st.supply > 100000 THEN 100000
            ELSE st.supply
          END
        ) as total_editions
      FROM collections c
      LEFT JOIN collection_creators cc ON c.collection_id = cc.collection_id
      LEFT JOIN creator cr ON cc.creator_address = cr.address
      LEFT JOIN collection_stamps cs ON c.collection_id = cs.collection_id
      LEFT JOIN ${STAMP_TABLE} st ON cs.stamp = st.stamp
      ${creator ? "WHERE cc.creator_address = ?" : ""}
      GROUP BY c.collection_id, c.collection_name, c.collection_description
      ${minStampCount !== undefined && minStampCount > 0 ? "HAVING COUNT(DISTINCT cs.stamp) >= ?" : ""}
      ORDER BY c.collection_name ${sortBy}
      LIMIT ? OFFSET ?
    `;

    const queryParams: any[] = [];
    if (creator) queryParams.push(creator);
    if (minStampCount !== undefined && minStampCount > 0) queryParams.push(minStampCount);
    queryParams.push(limit, offset);

    const result = await this.db.executeQueryWithCache(
      query,
      queryParams,
      60 * 5, // 5 minutes cache in seconds
    ) as {
      rows: import("../../server/types/collection.d.ts").CollectionRow[];
      [key: string]: any;
    };

    // Build a map of market data keyed by collection_id (hex string)
    // collection_market_data.collection_id is BINARY(16), so use UNHEX() for matching
    // and HEX() in SELECT to get hex strings for the map key.
    let marketDataMap: Map<string, any> | null = null;
    if (includeMarketData && result.rows && result.rows.length > 0) {
      try {
        const collectionIds = result.rows.map((r: any) => r.collection_id);
        const placeholders = collectionIds.map(() => "UNHEX(?)").join(",");
        const marketQuery = `
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
            last_updated
          FROM collection_market_data
          WHERE collection_id IN (${placeholders})
        `;

        const marketResult = await this.db.executeQueryWithCache(
          marketQuery,
          collectionIds,
          60 * 5,
        ) as { rows: any[] };

        if (marketResult.rows && marketResult.rows.length > 0) {
          marketDataMap = new Map();
          for (const md of marketResult.rows) {
            const hexId = md.collection_id_hex;
            const floorPrice = parseBTCDecimal(md.floor_price_btc);
            marketDataMap.set(hexId, {
              floorPriceBTC: floorPrice,
              avgPriceBTC: parseBTCDecimal(md.avg_price_btc),
              totalValueBTC: parseBTCDecimal(md.total_value_btc) ?? 0,
              volume24hBTC: parseBTCDecimal(md.volume_24h_btc) ?? 0,
              volume7dBTC: parseBTCDecimal(md.volume_7d_btc) ?? 0,
              volume30dBTC: parseBTCDecimal(md.volume_30d_btc) ?? 0,
              totalVolumeBTC: parseBTCDecimal(md.total_volume_btc) ?? 0,
              totalStamps: parseIntOrNull(md.total_stamps) ?? 0,
              uniqueHolders: parseIntOrNull(md.unique_holders) ?? 0,
              listedStamps: parseIntOrNull(md.listed_stamps) ?? 0,
              soldStamps24h: parseIntOrNull(md.sold_stamps_24h) ?? 0,
              lastUpdated: md.last_updated ? new Date(md.last_updated) : null,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching batch market data:", error);
      }
    }

    // Transform rows with market data attached
    (result as any).rows = (result as any).rows.map((row: any) => ({
      ...row,
      creators: row.creators ? row.creators.split(",") : [],
      stamps: row.stamp_numbers
        ? row.stamp_numbers.split(",").map(Number)
        : [],
      stamp_count: typeof row.stamp_count === "string"
        ? parseInt(row.stamp_count)
        : row.stamp_count,
      total_editions: typeof row.total_editions === "string"
        ? parseInt(row.total_editions)
        : row.total_editions,
      ...(includeMarketData
        ? { marketData: marketDataMap?.get(row.collection_id) ?? null }
        : {}),
    }));

    return result;
  }
}
