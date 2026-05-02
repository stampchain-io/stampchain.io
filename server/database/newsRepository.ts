import {
  SNN_BROADCASTS_TABLE,
  SRC101_OWNERS_TABLE,
} from "$constants";
import { dbManager } from "$server/database/databaseManager.ts";

export interface SNNBroadcastsParams {
  limit?: number;
  page?: number;
  sort?: "ASC" | "DESC";
  source_address?: string;
}

export class NewsRepository {
  private static db: typeof dbManager = dbManager;

  static setDatabase(database: typeof dbManager): void {
    this.db = database;
  }

  static async getBroadcastCount(
    params: SNNBroadcastsParams,
  ): Promise<number> {
    const queryParams: any[] = [];
    const whereConditions: string[] = [];

    if (params.source_address) {
      whereConditions.push(`source_address = ?`);
      queryParams.push(params.source_address);
    }

    let sqlQuery = `SELECT COUNT(*) AS total FROM ${SNN_BROADCASTS_TABLE}`;

    if (whereConditions.length > 0) {
      sqlQuery += ` WHERE ` + whereConditions.join(" AND ");
    }

    const results = (await this.db.executeQueryWithCache(
      sqlQuery,
      queryParams,
      60, // Short cache for news broadcasts
    ) as any).rows;
    
    return results[0].total;
  }

  static async getBroadcasts(
    params: SNNBroadcastsParams,
  ) {
    const queryParams: any[] = [];
    const whereClauses: string[] = [];

    if (params.source_address) {
      whereClauses.push(`source_address = ?`);
      queryParams.push(params.source_address);
    }

    const limit = params.limit ? Number(params.limit) : 50;
    const page = params.page ? Number(params.page) : 1;
    const offset = limit * (page - 1);
    
    const validOrder = ["ASC", "DESC"].includes((params.sort || "DESC").toUpperCase())
      ? (params.sort || "DESC").toUpperCase()
      : "DESC";

    let sqlQuery = `
      SELECT
        b.tx_hash,
        b.tx_index,
        b.block_index,
        b.block_time,
        b.source_address,
        b.text,
        b.value,
        b.is_locked,
        (
          SELECT s.tokenid_utf8 
          FROM ${SRC101_OWNERS_TABLE} s 
          WHERE s.owner = b.source_address AND s.prim = 1 AND s.expire_timestamp > UNIX_TIMESTAMP()
          ORDER BY s.last_update DESC 
          LIMIT 1
        ) as src101_domain
      FROM
        ${SNN_BROADCASTS_TABLE} b
      ${whereClauses.length > 0 ? "WHERE " + whereClauses.map(w => 'b.' + w).join(" AND ") : ""}
      ORDER BY
        b.tx_index ${validOrder}
      LIMIT ? OFFSET ?;
    `;

    queryParams.push(limit, offset);

    return (await this.db.executeQueryWithCache(
      sqlQuery,
      queryParams,
      60, // Short cache for news broadcasts
    ) as any).rows.map((result: any) => ({
      ...result,
    }));
  }

  // Publisher profile lookup includes associated SRC-101 domain if valid
  static async getPublisher(
    address: string,
  ) {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const sqlQuery = `
      SELECT tokenid_utf8
      FROM ${SRC101_OWNERS_TABLE}
      WHERE owner = ? AND prim = 1 AND expire_timestamp > ?
      ORDER BY last_update DESC
      LIMIT 1
    `;
    
    // Check if the address has an associated SRC-101 primary domain
    const src101Result = await this.db.executeQueryWithCache(
      sqlQuery,
      [address, currentTimestamp],
      60 * 2,
    ) as any;

    const publisherData = {
      address,
      src101_domain: src101Result?.rows?.length > 0 ? src101Result.rows[0].tokenid_utf8 : null,
    };

    return publisherData;
  }
}
