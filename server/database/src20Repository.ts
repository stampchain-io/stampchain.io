
import {
  BALANCE_CACHE_DURATION,
  BLOCKCHAIN_SYNC_CACHE_DURATION,
  IMMUTABLE_CACHE_DURATION,
  SRC20_BALANCE_TABLE,
  SRC20_TABLE,
  STAMP_TABLE
} from "$constants";
import type { SRC20BalanceRequestParams } from "$lib/types/src20.d.ts";
import { emojiToUnicodeEscape, unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import { bigFloatToString } from "$lib/utils/ui/formatting/formatUtils.ts";
import { serverConfig } from "$server/config/config.ts";
import { dbManager } from "$server/database/databaseManager.ts";
import type { SRC20SnapshotRequestParams, SRC20TrxRequestParams } from "$types/src20.d.ts";
import { BigFloat } from "bigfloat/mod.ts";

export class SRC20Repository {
  // Dependency injection support
  private static db: typeof dbManager = dbManager;

  static setDatabase(database: typeof dbManager): void {
    this.db = database;
  }

  /**
   * Ensures a tick is in unicode escape format for DB operations
   * Accepts either emoji or unicode escape format and returns unicode escape
   */
  private static ensureUnicodeEscape(tick: string): string {
    if (!tick) return tick;
    // If it starts with \U and has valid format, assume it's already unicode escape
    if (tick.startsWith('\\U') && /^\\U[0-9A-F]{8}$/.test(tick)) {
      return tick;
    }
    return emojiToUnicodeEscape(tick);
  }

  /**
   * Converts DB response ticks to emoji format
   * @param data Object or array containing tick field(s)
   */
  private static convertResponseToEmoji<T extends { tick: string | null | undefined }>(data: T[]): T[] {
    return data.map(item => ({
      ...item,
      tick: item.tick ? unicodeEscapeToEmoji(item.tick) : item.tick
    }));
  }

  /**
   * Converts a single DB response row to emoji format
   * @param row Object containing tick field
   */
  private static convertSingleResponseToEmoji<T extends { tick: string | null | undefined }>(row: T | null): T | null {
    if (!row) return null;
    return {
      ...row,
      tick: row.tick ? unicodeEscapeToEmoji(row.tick) : row.tick
    };
  }

  static async getTotalCountValidSrc20TxFromDb(
    params: SRC20TrxRequestParams,
    excludeFullyMinted: boolean = false,
    onlyFullyMinted: boolean = false,
  ) {
    const {
      tick = null,
      op = null,
      block_index = null,
      tx_hash = null,
      address = null,
    } = params;

    const queryParams = [];
    const whereConditions = [];

    if (tick !== null) {
      if (Array.isArray(tick)) {
        whereConditions.push(
          `tick IN (${tick.map(() => "?").join(", ")})`,
        );
        queryParams.push(...tick.map(t => this.ensureUnicodeEscape(t)));
      } else {
        whereConditions.push(`tick = ?`);
        queryParams.push(this.ensureUnicodeEscape(tick));
      }
    }

    if (op !== null) {
      if (Array.isArray(op)) {
        whereConditions.push(`op IN (${op.map(() => "?").join(", ")})`);
        queryParams.push(...op.map(o => this.ensureUnicodeEscape(o)));
      } else {
        whereConditions.push(`op = ?`);
        queryParams.push(this.ensureUnicodeEscape(op));
      }
    }

    if (block_index !== null) {
      whereConditions.push(`block_index = ?`);
      queryParams.push(block_index);
    }

    if (address !== null) {
      whereConditions.push(`address = ?`);
      queryParams.push(address);
    }

    if (tx_hash !== null) {
      whereConditions.push(`tx_hash = ?`);
      queryParams.push(tx_hash);
    }

    // 🚀 OPTIMIZED: Use pre-computed market data instead of expensive correlated subquery
    let fromClause = `FROM ${SRC20_TABLE} src20`;

    if (excludeFullyMinted) {
      // Use LEFT JOIN with src20_market_data for much better performance
      fromClause = `FROM ${SRC20_TABLE} src20
        LEFT JOIN src20_market_data smd ON smd.tick = src20.tick`;
      whereConditions.push(`COALESCE(smd.progress_percentage, 0) < 100`);
    }

    // 🚀 CRITICAL: Add filter for onlyFullyMinted
    if (onlyFullyMinted) {
      // Use LEFT JOIN with src20_market_data for filtering
      fromClause = `FROM ${SRC20_TABLE} src20
        LEFT JOIN src20_market_data smd ON smd.tick = src20.tick`;
      whereConditions.push(`COALESCE(smd.progress_percentage, 0) >= 99.9`);
    }

    let sqlQuery = `
          SELECT COUNT(*) AS total
          ${fromClause}
      `;

    if (whereConditions.length > 0) {
      sqlQuery += ` WHERE ` + whereConditions.join(" AND ");
    }

    return await this.db.executeQueryWithCache(
      sqlQuery,
      queryParams,
      BALANCE_CACHE_DURATION,
    );
  }

  static async getValidSrc20TxFromDb(
    params: SRC20TrxRequestParams,
    excludeFullyMinted: boolean = false,
    onlyFullyMinted: boolean = false,
  ) {
    const {
      block_index,
      tick,
      op,
      limit = 50, // Default limit
      page = 1, // Default page
      sortBy = "ASC",
      filterBy: _filterBy,
      tx_hash,
      address,
    } = params;

    const queryParams = [];
    const whereClauses = [];

    if (block_index != null) {
      whereClauses.push(`src20.block_index = ?`);
      queryParams.push(block_index);
    }

    if (tick != null) {
      if (Array.isArray(tick)) {
        whereClauses.push(`src20.tick IN (${tick.map(() => "?").join(", ")})`);
        queryParams.push(...tick.map(t => this.ensureUnicodeEscape(t || "")));
      } else {
        whereClauses.push(`src20.tick = ?`);
        queryParams.push(this.ensureUnicodeEscape(tick || ""));
      }
    }

    if (op != null) {
      if (Array.isArray(op)) {
        whereClauses.push(`src20.op IN (${op.map(() => "?").join(", ")})`);
        queryParams.push(...op.map(o => this.ensureUnicodeEscape(o || "")));
      } else {
        whereClauses.push(`src20.op = ?`);
        queryParams.push(this.ensureUnicodeEscape(op || ""));
      }
    }

    if (tx_hash != null) {
      whereClauses.push(`src20.tx_hash = ?`);
      queryParams.push(tx_hash);
    }

    if (address != null) {
      whereClauses.push(`(src20.creator = ? OR src20.destination = ?)`);
      queryParams.push(address, address);
    }

    if (excludeFullyMinted) {
      // Filter out tokens that are fully minted (progress = 100%)
      whereClauses.push(`COALESCE(smd.progress_percentage, 0) < 100`);
      // needsMarketData will be set to true later in the sorting section
    }

    // 🚀 CRITICAL: Add WHERE clause for onlyFullyMinted filter
    if (onlyFullyMinted) {
      // Filter for tokens that are fully minted (progress = 100%)
      whereClauses.push(`COALESCE(smd.progress_percentage, 0) = 100`);
      // needsMarketData will be set to true later in the sorting section
    }

    // Enforce limit and pagination
    const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0
      ? Number(limit)
      : 50; // Default limit if invalid
    const safePage = Number.isFinite(Number(page)) && Number(page) > 0
      ? Math.max(1, Number(page))
      : 1;
    const offset = safeLimit * (safePage - 1);

    // Handle comprehensive sorting with proper architecture and type safety
    let finalOrderBy = `src20.block_index ASC`;
    let needsMarketData = false;

    // 🚀 AUTO-INCLUDE: DEPLOY operations always include market data
    if (op === "DEPLOY") {
      needsMarketData = true;
    }

    // 🚀 PERFORMANCE: Check if we need market data for excludeFullyMinted filter
    if (excludeFullyMinted) {
      needsMarketData = true;
    }

    // 🚀 PERFORMANCE: Check if we need market data for onlyFullyMinted filter
    if (onlyFullyMinted) {
      needsMarketData = true;
    }

    if (sortBy) {
      const normalizedSortBy = typeof sortBy === 'string' ? sortBy.toUpperCase() : `${sortBy.field}_${sortBy.direction}`.toUpperCase();

      // HOLDERS sorting (requires holder count calculation)
      if (normalizedSortBy === "HOLDERS_DESC") {
        finalOrderBy = `COALESCE(smd.holder_count, 0) DESC`;
        needsMarketData = true; // ✅ FIXED: HOLDERS sorting needs market data
      } else if (normalizedSortBy === "HOLDERS_ASC") {
        finalOrderBy = `COALESCE(smd.holder_count, 0) ASC`;
        needsMarketData = true; // ✅ FIXED: HOLDERS sorting needs market data

      // MARKET DATA sorting (requires market data JOIN)
      } else if (normalizedSortBy === "MARKET_CAP_DESC") {
        finalOrderBy = `smd.market_cap_btc DESC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "MARKET_CAP_ASC") {
        finalOrderBy = `smd.market_cap_btc ASC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "VALUE_DESC" || normalizedSortBy === "PRICE_DESC") {
        finalOrderBy = `smd.floor_price_btc DESC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "VALUE_ASC" || normalizedSortBy === "PRICE_ASC") {
        finalOrderBy = `smd.floor_price_btc ASC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "VOLUME_24H_DESC") {
        finalOrderBy = `smd.volume_24h_btc DESC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "VOLUME_24H_ASC") {
        finalOrderBy = `smd.volume_24h_btc ASC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "VOLUME_7D_DESC") {
        finalOrderBy = `smd.volume_7d_btc DESC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "VOLUME_7D_ASC") {
        finalOrderBy = `smd.volume_7d_btc ASC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "VOLUME_30D_DESC") {
        finalOrderBy = `smd.volume_30d_btc DESC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "VOLUME_30D_ASC") {
        finalOrderBy = `smd.volume_30d_btc ASC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "CHANGE_24H_DESC") {
        finalOrderBy = `smd.price_change_24h_percent DESC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "CHANGE_24H_ASC") {
        finalOrderBy = `smd.price_change_24h_percent ASC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "CHANGE_7D_DESC") {
        finalOrderBy = `smd.price_change_7d_percent DESC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "CHANGE_7D_ASC") {
        finalOrderBy = `smd.price_change_7d_percent ASC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "CHANGE_30D_DESC") {
        finalOrderBy = `smd.price_change_30d_percent DESC`;
        needsMarketData = true;
      } else if (normalizedSortBy === "CHANGE_30D_ASC") {
        finalOrderBy = `smd.price_change_30d_percent ASC`;
        needsMarketData = true;

      // TOKEN METRICS sorting (no additional JOINs needed)
      } else if (normalizedSortBy === "SUPPLY_DESC") {
        finalOrderBy = `CAST(src20.max AS UNSIGNED) DESC`;
        needsMarketData = false;
      } else if (normalizedSortBy === "SUPPLY_ASC") {
        finalOrderBy = `CAST(src20.max AS UNSIGNED) ASC`;
        needsMarketData = false;
      } else if (normalizedSortBy === "LIMIT_DESC") {
        finalOrderBy = `CAST(src20.lim AS UNSIGNED) DESC`;
        needsMarketData = false;
      } else if (normalizedSortBy === "LIMIT_ASC") {
        finalOrderBy = `CAST(src20.lim AS UNSIGNED) ASC`;
        needsMarketData = false;
      } else if (normalizedSortBy === "DECIMALS_DESC") {
        finalOrderBy = `CAST(src20.deci AS UNSIGNED) DESC`;
        needsMarketData = false;
      } else if (normalizedSortBy === "DECIMALS_ASC") {
        finalOrderBy = `CAST(src20.deci AS UNSIGNED) ASC`;
        needsMarketData = false;
      } else if (normalizedSortBy === "PROGRESS_DESC") {
        finalOrderBy = `COALESCE(smd.progress_percentage, 0) DESC`;
        needsMarketData = false;
      } else if (normalizedSortBy === "PROGRESS_ASC") {
        finalOrderBy = `COALESCE(smd.progress_percentage, 0) ASC`;
        needsMarketData = false;

      // BASIC/ALPHABETICAL sorting (no additional JOINs needed)
      } else if (normalizedSortBy === "DEPLOY_DESC" || normalizedSortBy === "BLOCK_DESC") {
        finalOrderBy = `src20.block_index DESC`;
        // Don't override needsMarketData if already set by operation type (e.g., op=DEPLOY)
      } else if (normalizedSortBy === "DEPLOY_ASC" || normalizedSortBy === "BLOCK_ASC") {
        finalOrderBy = `src20.block_index ASC`;
        // Don't override needsMarketData if already set by operation type (e.g., op=DEPLOY)
      } else if (normalizedSortBy === "TICK_DESC") {
        finalOrderBy = `src20.tick DESC`;
        // Don't override needsMarketData if already set by operation type (e.g., op=DEPLOY)
      } else if (normalizedSortBy === "TICK_ASC") {
        finalOrderBy = `src20.tick ASC`;
        // Don't override needsMarketData if already set by operation type (e.g., op=DEPLOY)
      } else if (normalizedSortBy === "CREATOR_DESC") {
        // Sort by creator name if available, fallback to creator address
        finalOrderBy = `COALESCE(creator_info.creator, src20.creator) DESC`;
        // Don't override needsMarketData if already set by operation type (e.g., op=DEPLOY)
      } else if (normalizedSortBy === "CREATOR_ASC") {
        // Sort by creator name if available, fallback to creator address
        finalOrderBy = `COALESCE(creator_info.creator, src20.creator) ASC`;
        // Don't override needsMarketData if already set by operation type (e.g., op=DEPLOY)
      } else if (normalizedSortBy === "RECENT_DESC") {
        finalOrderBy = `src20.block_time DESC`;
        // Don't override needsMarketData if already set by operation type (e.g., op=DEPLOY)
      } else if (normalizedSortBy === "RECENT_ASC") {
        finalOrderBy = `src20.block_time ASC`;
        // Don't override needsMarketData if already set by operation type (e.g., op=DEPLOY)

      // LEGACY sorting (maintain backward compatibility)
      } else if (["ASC", "DESC"].includes(normalizedSortBy)) {
        finalOrderBy = `src20.block_index ${normalizedSortBy}`;
      } else {
        // Invalid sortBy parameter - default to ASC
        finalOrderBy = `src20.block_index ASC`;
      }
    }

    const limitOffsetClause = `LIMIT ? OFFSET ?`;
    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    queryParams.push(safeLimit, offset);

    // Determine if we need fee fields (only for transaction-specific queries)
    const needsFeeFields = tx_hash != null || block_index != null;
    const feeFieldsSelect = needsFeeFields ? `,
            txns.fee_rate_sat_vb,
            txns.fee` : "";
    const feeFieldsJoin = needsFeeFields ? `
          LEFT JOIN transactions txns ON src20.tx_hash = txns.tx_hash` : "";
    // feeFieldsOutput removed - no longer needed in simplified query

    try {
      // 🚀 SIMPLIFIED QUERY: Remove expensive CTE and ROW_NUMBER() for better performance
      const query = `
        SELECT
          src20.tx_hash,
          src20.block_index,
          src20.p,
          src20.op,
          src20.tick,
          src20.creator,
          src20.amt,
          src20.deci,
          src20.lim,
          src20.max,
          src20.destination,
          src20.block_time,
          creator_info.creator as creator_name,
          destination_info.creator as destination_name,
          COALESCE(smd.holder_count, 0) as holders,
          COALESCE(smd.progress_percentage, 0) as progress,
          COALESCE(smd.total_minted, 0) as minted_amt,
          COALESCE(smd.total_mints, 0) as total_mints,
          st.stamp,
          -- Add deploy_tx for image URL generation
          CASE
            WHEN src20.op = 'DEPLOY' THEN src20.tx_hash
            ELSE (
              SELECT deploy.tx_hash
              FROM ${SRC20_TABLE} deploy
              WHERE deploy.tick = src20.tick AND deploy.op = 'DEPLOY'
              LIMIT 1
            )
          END as deploy_tx${needsMarketData ? `,
          smd.market_cap_btc,
          smd.price_btc,
          smd.volume_24h_btc,
          smd.price_change_24h_percent,
          smd.price_source_type` : ''}${feeFieldsSelect}
        FROM ${SRC20_TABLE} src20
        LEFT JOIN creator creator_info ON src20.creator = creator_info.address
        LEFT JOIN creator destination_info ON src20.destination = destination_info.address
        LEFT JOIN src20_market_data smd ON smd.tick = src20.tick
        LEFT JOIN ${STAMP_TABLE} st ON st.tx_hash = src20.tx_hash${feeFieldsJoin}
        ${whereClause}
        ORDER BY ${finalOrderBy}
        ${limitOffsetClause}
      `;

      // 🚀 SIMPLIFIED PARAMS: No offset parameter needed since ROW_NUMBER() was removed
      const fullQueryParams = [...queryParams];

      console.log("DEBUG: Executing SQL query in getValidSrc20TxFromDb:", query);
      console.log("DEBUG: Query parameters:", fullQueryParams);

      const results = await this.db.executeQueryWithCache(
        query,
        fullQueryParams,
        IMMUTABLE_CACHE_DURATION, // SRC20 transactions are immutable - invalidated on block reorg
      ) as any;

      // Convert response ticks to emoji format
      return {
        ...results,
        rows: this.convertResponseToEmoji(results.rows)
      };
    } catch (error) {
      console.error("Error in getValidSrc20TxFromDb:", error);
      throw error;
    }
  }

  static async getSrc20BalanceFromDb(
    params: Partial<SRC20BalanceRequestParams & SRC20SnapshotRequestParams>,
  ) {
    const {
      address,
      tick,
      limit,
      page,
      sortBy = "DESC",
      sortField = "amt",
    } = params;
    const queryParams = [];
    const whereClauses = [];
    whereClauses.push(`amt > 0`);

    if (address) {
      whereClauses.push(`address = ?`);
      queryParams.push(address);
    }

    if (tick) {
      if (Array.isArray(tick)) {
        const tickPlaceholders = tick.map(() => "?").join(", ");
        whereClauses.push(
          `tick IN (${tickPlaceholders})`,
        );
        queryParams.push(...tick.map(t => this.ensureUnicodeEscape(t)));
      } else {
        whereClauses.push(`tick = ?`);
        queryParams.push(this.ensureUnicodeEscape(tick));
      }
    }

    // Assign default values and validate limit and page
    const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0
      ? Number(limit)
      : 50; // Default limit
    const safePage = Number.isFinite(Number(page)) && Number(page) > 0
      ? Math.max(1, Number(page))
      : 1;
    const offset = safeLimit * (safePage - 1);

    const limitOffsetClause = "LIMIT ? OFFSET ?";
    queryParams.push(safeLimit, offset);

    const sortString = typeof sortBy === 'string' ? sortBy : sortBy.direction;
    const validOrder = ["ASC", "DESC"].includes(sortString.toUpperCase())
      ? sortString.toUpperCase()
      : "DESC";

    const validSortField = ["amt", "last_update"].includes(sortField)
      ? sortField
      : "amt";

    const sqlQuery = `
      SELECT address, p, tick, amt, block_time, last_update
      FROM ${SRC20_BALANCE_TABLE}
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""}
      ORDER BY ${validSortField} ${validOrder}
      ${limitOffsetClause}
    `;

    const results = await this.db.executeQueryWithCache(
      sqlQuery,
      queryParams,
      BLOCKCHAIN_SYNC_CACHE_DURATION,
    ) as any;

    // Retrieve transaction hashes for the ticks
    const ticksToQuery = results.rows
      ? results.rows.map((result: { tick: string }) => result.tick)
      : [];
    const tx_hashes_response = await SRC20Repository.getValidSrc20TxFromDb(
      {
        tick: ticksToQuery.length > 0 ? ticksToQuery : undefined,
        op: "DEPLOY",
      },
    );
    const tx_hashes_map = tx_hashes_response.rows.reduce(
      (map: Record<string, string>, row: { tick: string; tx_hash: string }) => {
        map[row.tick] = row.tx_hash;
        return map;
      },
      {},
    );

    // Add transaction hash and deploy image URL to each result
    const resultsWithDeployImg = results.rows.map((
      result: { tick: string },
    ) => ({
      ...result,
      deploy_tx: tx_hashes_map[result.tick],
      deploy_img: tx_hashes_map[result.tick]
        ? `https://stampchain.io/stamps/${tx_hashes_map[result.tick]}.svg`
        : null,
    }));

    return resultsWithDeployImg;
  }

  static async getTotalSrc20BalanceCount(
    params: Partial<SRC20BalanceRequestParams & SRC20SnapshotRequestParams>,
  ): Promise<number> {
    const { address, tick, amt = 0 } = params;
    const queryParams = [];
    const whereConditions = [];

    if (address) {
      whereConditions.push(`address = ?`);
      queryParams.push(address);
    }

    if (tick) {
      if (Array.isArray(tick)) {
        const tickPlaceholders = tick.map(() => "?").join(", ");
        whereConditions.push(
          `tick IN (${tickPlaceholders})`,
        );
        queryParams.push(...tick.map(t => this.ensureUnicodeEscape(t)));
      } else {
        whereConditions.push(`tick = ?`);
        queryParams.push(this.ensureUnicodeEscape(tick));
      }
    }

    // Always include amt condition, as in the original method
    whereConditions.push(`amt > ?`);
    queryParams.push(amt);

    const sqlQuery = `
          SELECT COUNT(*) AS total
          FROM ${SRC20_BALANCE_TABLE}
          ${
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""
    }
        `;

    const result = await this.db.executeQueryWithCache(
      sqlQuery,
      queryParams,
      BALANCE_CACHE_DURATION,
    );

    return (result as any).rows[0].total;
  }

  static async fetchSrc20MintProgress(tick: string) {
    const unicodeTick = this.ensureUnicodeEscape(tick);
    const query = `
      SELECT
        dep.max,
        dep.deci,
        dep.lim,
        dep.tx_hash,
        dep.tick,
        COALESCE(stats.total_minted, 0) as total_minted,
        COALESCE(stats.holders_count, 0) as holders_count,
        (SELECT COUNT(*) FROM ${SRC20_TABLE} WHERE tick = dep.tick AND op = 'MINT') AS total_mints,
        st.stamp_url
      FROM ${SRC20_TABLE} AS dep
      LEFT JOIN src20_token_stats stats ON stats.tick = dep.tick
      LEFT JOIN ${STAMP_TABLE} st ON st.tx_hash = dep.tx_hash
      WHERE
        dep.tick = ? AND
        dep.op = 'DEPLOY'
      LIMIT 1;
    `;

    const data = await this.db.executeQueryWithCache(
      query,
      [unicodeTick],
      BLOCKCHAIN_SYNC_CACHE_DURATION,
    );

    if ((data as any).rows.length === 0) {
      return null;
    }

    const row = (data as any).rows[0];
    const max_supply = new BigFloat(row["max"]);
    const limit = new BigFloat(row["lim"]);
    const decimals = parseInt(row["deci"]);
    const total_mints = parseInt(row["total_mints"] ?? 0);
    const total_minted = new BigFloat(row["total_minted"] ?? 0);
    const progress = bigFloatToString(total_minted.div(max_supply).mul(100), 3);

    return this.convertSingleResponseToEmoji({
      max_supply: max_supply.toString(),
      total_minted: total_minted.toString(),
      limit: limit.toString(),
      total_mints: total_mints,
      progress,
      decimals,
      holders: row["holders_count"],
      tx_hash: row["tx_hash"],
      tick: row["tick"],
      stamp_url: row["stamp_url"],
    });
  }

  static async fetchTrendingActiveMintingTokens(
    transactionCount: number = 1000,
  ): Promise<{ rows: import("$lib/types/src20.d.ts").SRC20Row[]; total: number }> {
    // Reduce transaction count for better performance in production
    const optimizedTransactionCount = Math.min(transactionCount, 300);

    const query = `
      WITH latest_mint_transactions AS (
        SELECT tx_index, tick
        FROM ${SRC20_TABLE}
        WHERE op = 'MINT'
        ORDER BY tx_index DESC
        LIMIT ?
      ),
      mint_counts AS (
        SELECT tick, COUNT(*) as mint_count,
               (COUNT(*) * 100.0 / ?) as top_mints_percentage
        FROM latest_mint_transactions
        GROUP BY tick
        HAVING COUNT(*) >= 2
      )
      SELECT
        'data' as type,
        mc.tick,
        mc.mint_count,
        mc.top_mints_percentage,
        src20_deploy.tx_hash,
        src20_deploy.block_index,
        src20_deploy.p,
        src20_deploy.op,
        src20_deploy.creator,
        src20_deploy.amt,
        src20_deploy.deci,
        src20_deploy.lim,
        src20_deploy.max,
        src20_deploy.destination,
        src20_deploy.block_time,
        creator_info.creator as creator_name,
        COALESCE(stats.holders_count, 0) as holders,
        COALESCE(stats.total_minted, 0) as total_minted
      FROM mint_counts mc
      JOIN ${SRC20_TABLE} src20_deploy
        ON mc.tick = src20_deploy.tick AND src20_deploy.op = 'DEPLOY'
      LEFT JOIN creator creator_info ON src20_deploy.creator = creator_info.address
      LEFT JOIN src20_token_stats stats ON stats.tick = mc.tick
      WHERE COALESCE(stats.total_minted, 0) < src20_deploy.max
      ORDER BY mc.mint_count DESC
      LIMIT 25;
    `;
    const queryParams = [
      optimizedTransactionCount, // Number of recent mint transactions to consider
      optimizedTransactionCount, // For top_mints_percentage calculation
    ];

    try {
      const results = await this.db.executeQueryWithCache(
        query,
        queryParams,
        BLOCKCHAIN_SYNC_CACHE_DURATION,
      );

      return {
        rows: this.convertResponseToEmoji((results as any).rows.map((row: any) => ({
          tx_hash: row.tx_hash,
          block_index: row.block_index,
          p: row.p,
          op: row.op,
          tick: row.tick,
          creator: row.creator,
          creator_name: row.creator_name,
          amt: row.amt,
          deci: row.deci,
          lim: row.lim,
          max: row.max,
          destination: row.destination,
          block_time: row.block_time,
          holders: row.holders,
          total_minted: row.total_minted,
          total_mints: row.total_mints,
          progress: row.progress,
          mint_velocity: row.mint_velocity,
          trending_score: row.trending_score
        }))),
        total: (results as any).rows.length
      };
    } catch (error) {
      console.error("Error in fetchTrendingActiveMintingTokens:", error);

      // Fallback to simpler query if the optimized one fails
      const fallbackQuery = `
        SELECT
          'data' as type,
          src20_deploy.tx_hash,
          src20_deploy.block_index,
          src20_deploy.p,
          src20_deploy.op,
          src20_deploy.tick,
          src20_deploy.creator,
          src20_deploy.amt,
          src20_deploy.deci,
          src20_deploy.lim,
          src20_deploy.max,
          src20_deploy.destination,
          src20_deploy.block_time,
          creator_info.creator as creator_name,
          COALESCE(stats.holders_count, 0) as holders,
          COALESCE(stats.total_minted, 0) as total_minted,
          0 as total_mints,
          0 as progress,
          0 as mint_velocity,
          0 as trending_score
        FROM ${SRC20_TABLE} src20_deploy
        LEFT JOIN creator creator_info ON src20_deploy.creator = creator_info.address
        LEFT JOIN src20_token_stats stats ON stats.tick = src20_deploy.tick
        WHERE src20_deploy.op = 'DEPLOY'
          AND COALESCE(stats.total_minted, 0) < src20_deploy.max
        ORDER BY src20_deploy.block_index DESC
        LIMIT 15;
      `;

      const fallbackResults = await this.db.executeQueryWithCache(
        fallbackQuery,
        [],
        BLOCKCHAIN_SYNC_CACHE_DURATION,
      );

      return {
        rows: this.convertResponseToEmoji((fallbackResults as any).rows.map((row: any) => ({
          tx_hash: row.tx_hash,
          block_index: row.block_index,
          p: row.p,
          op: row.op,
          tick: row.tick,
          creator: row.creator,
          creator_name: row.creator_name,
          amt: row.amt,
          deci: row.deci,
          lim: row.lim,
          max: row.max,
          destination: row.destination,
          block_time: row.block_time,
          holders: row.holders,
          total_minted: row.total_minted,
          total_mints: row.total_mints,
          progress: row.progress,
          mint_velocity: row.mint_velocity,
          trending_score: row.trending_score
        }))),
        total: (fallbackResults as any).rows.length
      };
    }
  }

  static async getDeploymentAndCountsForTick(tick: string) {
    const unicodeTick = this.ensureUnicodeEscape(tick);
    const query = `
      SELECT
        dep.*,
        creator_info.creator AS creator_name,
        (SELECT COUNT(*) FROM ${SRC20_TABLE} WHERE tick = ? AND op = 'MINT') AS total_mints,
        (SELECT COUNT(*) FROM ${SRC20_TABLE} WHERE tick = ? AND op = 'TRANSFER') AS total_transfers
      FROM ${SRC20_TABLE} dep
      LEFT JOIN
        creator creator_info ON dep.destination = creator_info.address
      WHERE dep.tick = ? AND dep.op = 'DEPLOY'
      LIMIT 1
    `;
    const params = [unicodeTick, unicodeTick, unicodeTick];
    const result = await this.db.executeQueryWithCache(
      query,
      params,
      BLOCKCHAIN_SYNC_CACHE_DURATION,
    );

    if (!(result as any).rows || (result as any).rows.length === 0) {
      return null;
    }

    const row = (result as any).rows[0];

    // ✅ ENHANCED IMAGE FIELDS: Add stamp_url and deploy_img for SRC-20 detail pages
    const baseUrl = serverConfig.IS_DEVELOPMENT
      ? serverConfig.DEV_BASE_URL
      : "https://stampchain.io";

    const deployment = this.convertSingleResponseToEmoji({
      tick: row.tick,
      tx_hash: row.tx_hash,
      block_index: row.block_index,
      p: row.p,
      op: row.op,
      creator: row.creator,
      creator_name: row.creator_name,
      amt: row.amt,
      deci: row.deci,
      lim: row.lim,
      max: row.max,
      destination: row.destination,
      block_time: row.block_time,
      // ✅ Add enhanced image fields
      stamp_url: row.tx_hash ? `${baseUrl}/stamps/${row.tx_hash}.svg` : null,
      deploy_img: row.tx_hash ? `${baseUrl}/stamps/${row.tx_hash}.svg` : null,
    });

    return {
      deployment,
      total_mints: row.total_mints,
      total_transfers: row.total_transfers,
    };
  }

  static async getCountsForTick(tick: string) {
    const unicodeTick = this.ensureUnicodeEscape(tick);
    const query = `
      SELECT
        (SELECT COUNT(*) FROM ${SRC20_TABLE} WHERE tick = ? AND op = 'MINT') AS total_mints,
        (SELECT COUNT(*) FROM ${SRC20_TABLE} WHERE tick = ? AND op = 'TRANSFER') AS total_transfers
    `;
    const params = [unicodeTick, unicodeTick];
    const result = await this.db.executeQueryWithCache(
      query,
      params,
      BLOCKCHAIN_SYNC_CACHE_DURATION,
    );

    if (!(result as any).rows || (result as any).rows.length === 0) {
      return { total_mints: 0, total_transfers: 0 };
    }

    return {
      total_mints: (result as any).rows[0].total_mints,
      total_transfers: (result as any).rows[0].total_transfers,
    };
  }

  static async searchValidSrc20TxFromDb(
    query: string,
    searchType:
      | "ticker"
      | "address"
      | "tx_hash"
      | "cpid"
      | "stamp_number"
      | "unknown" = "ticker",
    mintableOnly = false,
  ) {
    // Input already sanitized by service layer via searchInputClassifier
    if (!query || query.length === 0) {
      return [];
    }

    // Address search: query balance table (tokens held by address)
    if (searchType === "address") {
      return this.searchSrc20ByHolder(query);
    }

    const mintableFilter = mintableOnly
      ? "AND COALESCE(smd.progress_percentage, 0) < 100"
      : "";

    // Build WHERE clause based on search type
    let whereClause: string;
    switch (searchType) {
      case "tx_hash":
        whereClause = "src20.tx_hash LIKE ?";
        break;
      case "ticker":
      default:
        // For ticker (or unknown), search all fields
        whereClause = `(src20.tick LIKE ? OR
        src20.tx_hash LIKE ? OR
        src20.creator LIKE ? OR
        src20.destination LIKE ?)`;
        break;
    }

    const sqlQuery = `
    SELECT DISTINCT
        src20.tick,
        src20.tx_hash,
        src20.max AS max_supply,
        src20.lim AS lim,
        src20.deci AS decimals,
        COALESCE(smd.total_mints, 0) AS total_mints,
        COALESCE(smd.total_minted, 0) AS total_minted,
        COALESCE(smd.progress_percentage, 0) AS progress,
        COALESCE(smd.holder_count, 0) AS holders
    FROM ${SRC20_TABLE} src20
    LEFT JOIN src20_market_data smd ON smd.tick = src20.tick
    WHERE
        ${whereClause}
        AND src20.max IS NOT NULL
        AND src20.op = 'DEPLOY'
        ${mintableFilter}
    ORDER BY
        CASE
            WHEN src20.tick LIKE ? THEN 0
            ELSE 1
        END,
        src20.tick
    LIMIT 10;
    `;

    // Build query params based on search type
    const searchParam = `%${query}%`;
    const startSearchParam = `${query}%`;

    let queryParams: string[];
    switch (searchType) {
      case "tx_hash":
        // WHERE (1 prefix) + ORDER BY (1)
        queryParams = [startSearchParam, startSearchParam];
        break;
      case "ticker":
      default:
        // WHERE (4) + ORDER BY (1)
        queryParams = [
          searchParam,
          searchParam,
          searchParam,
          searchParam,
          startSearchParam,
        ];
        break;
    }

    try {
      const result = await this.db.executeQueryWithCache(
        sqlQuery,
        queryParams,
        BLOCKCHAIN_SYNC_CACHE_DURATION,
      );

      return this.convertResponseToEmoji(
        // deno-lint-ignore no-explicit-any
        (result as any).rows.map((row: any) => {
          return {
            tick: row.tick,
            tx_hash: row.tx_hash,
            progress: parseFloat(row.progress || "0"),
            total_minted: row.total_minted,
            max_supply: row.max_supply,
            holders: row.holders,
            total_mints: row.total_mints,
          };
        }).filter(Boolean),
      );
    } catch (error) {
      console.error("Error executing SRC20 search query:", error);
      return [];
    }
  }

  /**
   * Search for SRC-20 tokens held by an address (from balance table).
   * Returns tokens the address owns, not tokens the address deployed.
   */
  private static async searchSrc20ByHolder(addressQuery: string) {
    const startSearchParam = `${addressQuery}%`;

    const sqlQuery = `
    SELECT DISTINCT
        bal.tick,
        deploy.tx_hash,
        deploy.max AS max_supply,
        COALESCE(smd.total_mints, 0) AS total_mints,
        COALESCE(smd.total_minted, 0) AS total_minted,
        COALESCE(smd.progress_percentage, 0) AS progress,
        COALESCE(smd.holder_count, 0) AS holders
    FROM ${SRC20_BALANCE_TABLE} bal
    JOIN ${SRC20_TABLE} deploy
        ON deploy.tick = bal.tick AND deploy.op = 'DEPLOY'
    LEFT JOIN src20_market_data smd ON smd.tick = bal.tick
    WHERE
        bal.address LIKE ?
        AND bal.amt > 0
    ORDER BY CAST(bal.amt AS DECIMAL(38,18)) DESC
    LIMIT 10;
    `;

    try {
      const result = await this.db.executeQueryWithCache(
        sqlQuery,
        [startSearchParam],
        BLOCKCHAIN_SYNC_CACHE_DURATION,
      );

      return this.convertResponseToEmoji(
        // deno-lint-ignore no-explicit-any
        (result as any).rows.map((row: any) => {
          return {
            tick: row.tick,
            tx_hash: row.tx_hash,
            progress: parseFloat(row.progress || "0"),
            total_minted: row.total_minted,
            max_supply: row.max_supply,
            holders: row.holders,
            total_mints: row.total_mints,
          };
        }).filter(Boolean),
      );
    } catch (error) {
      console.error("Error executing SRC20 holder search:", error);
      return [];
    }
  }

  static async checkSrc20Deployments(): Promise<{ isValid: boolean; count: number }> {
    try {
      const result = await this.getTotalCountValidSrc20TxFromDb({
        op: "DEPLOY"
      });

      // If we can't get a count or it's 0, that indicates a database problem
      if (!(result as any)?.rows?.[0]?.total) {
        throw new Error("No SRC-20 deployments found in database");
      }
      const count = (result as any).rows[0].total;
      return {
        isValid: true,
        count
      };
    } catch (error) {
      console.error("SRC20 deployment check failed:", error);
      return {
        isValid: false,
        count: 0
      };
    }
  }

  // 🚀 NEW V2.3 OPTIMIZED TRENDING METHODS USING src20_market_data

  /**
   * Optimized trending active minting tokens using pre-populated src20_market_data fields
   * Eliminates expensive CTEs by leveraging progress_percentage and total_minted fields
   */
  static async fetchTrendingActiveMintingTokensOptimized(
    trendingWindow: '24h' | '7d' | '30d' = '24h',
    mintVelocityMin?: number,
    limit: number = 25
  ): Promise<{ rows: import("$lib/types/src20.d.ts").SRC20Row[]; total: number }> {
    // Convert trending window to hours for velocity calculation
    const windowHours = trendingWindow === '24h' ? 24 : trendingWindow === '7d' ? 168 : 720;

    const query = `
      SELECT
        'data' as type,
        src20_deploy.tick,
        src20_deploy.tx_hash,
        src20_deploy.block_index,
        src20_deploy.p,
        src20_deploy.op,
        src20_deploy.creator,
        src20_deploy.amt,
        src20_deploy.deci,
        src20_deploy.lim,
        src20_deploy.max,
        src20_deploy.destination,
        src20_deploy.block_time,
        creator_info.creator as creator_name,

        -- 🚀 USE PRE-POPULATED MARKET DATA FIELDS
        COALESCE(smd.holder_count, 0) as holders,
        COALESCE(smd.total_minted, 0) as total_minted,
        COALESCE(smd.progress_percentage, 0) as progress,
        COALESCE(smd.total_mints, 0) as total_mints,

        -- 🚀 CALCULATE MINT VELOCITY FROM PROGRESS DATA
        CASE
          WHEN smd.progress_percentage > 0 AND smd.progress_percentage < 100 THEN
            -- Estimate mint velocity based on progress rate
            ROUND(
              (smd.total_mints * (100 - smd.progress_percentage) / 100) / ${windowHours},
              2
            )
          ELSE 0
        END as mint_velocity,

        -- 🚀 TRENDING SCORE BASED ON MINT ACTIVITY AND PROGRESS
        CASE
          WHEN smd.progress_percentage BETWEEN 10 AND 90 THEN
            -- Active minting phase gets highest score
            (smd.total_mints * 0.6) + ((100 - smd.progress_percentage) * 0.4)
          WHEN smd.progress_percentage < 10 THEN
            -- New tokens get moderate score
            (smd.total_mints * 0.8) + (smd.progress_percentage * 0.2)
          ELSE
            -- Nearly complete tokens get lower score
            smd.total_mints * 0.3
        END as trending_score

      FROM ${SRC20_TABLE} src20_deploy
      LEFT JOIN creator creator_info ON src20_deploy.creator = creator_info.address
      LEFT JOIN src20_market_data smd ON smd.tick = src20_deploy.tick
      WHERE
        src20_deploy.op = 'DEPLOY'
        AND COALESCE(smd.progress_percentage, 0) < 100  -- Only mintable tokens
        ${mintVelocityMin ? `AND (
          CASE
            WHEN smd.progress_percentage > 0 AND smd.progress_percentage < 100 THEN
              ROUND((smd.total_mints * (100 - smd.progress_percentage) / 100) / ${windowHours}, 2)
            ELSE 0
          END
        ) >= ?` : ''}
      ORDER BY trending_score DESC, smd.total_mints DESC
      LIMIT ?;
    `;

    const queryParams = mintVelocityMin ? [mintVelocityMin, limit] : [limit];

    try {
      const results = await this.db.executeQueryWithCache(
        query,
        queryParams,
        BLOCKCHAIN_SYNC_CACHE_DURATION,
      );

      return {
        rows: this.convertResponseToEmoji((results as any).rows),
        total: (results as any).rows.length
      };
    } catch (error) {
      console.error("Error in fetchTrendingActiveMintingTokensOptimized:", error);

      // Fallback to existing method
      return this.fetchTrendingActiveMintingTokens();
    }
  }

  /**
   * Optimized mint progress using pre-populated src20_market_data fields
   * Eliminates expensive SUM() calculations by using cached progress_percentage
   */
  static async fetchSrc20MintProgressOptimized(tick: string): Promise<any> {
    const unicodeTick = this.ensureUnicodeEscape(tick);

    const query = `
      SELECT
        src20_deploy.tx_hash,
        src20_deploy.tick,
        src20_deploy.max,
        src20_deploy.lim,
        src20_deploy.deci,

        -- 🚀 USE PRE-POPULATED MARKET DATA FIELDS
        COALESCE(smd.total_minted, 0) as total_minted,
        COALESCE(smd.holder_count, 0) as holders_count,
        COALESCE(smd.total_mints, 0) as total_mints,
        COALESCE(smd.progress_percentage, 0) as progress

      FROM ${SRC20_TABLE} AS src20_deploy
      LEFT JOIN src20_market_data smd ON smd.tick = src20_deploy.tick
      WHERE
        src20_deploy.tick = ? AND
        src20_deploy.op = 'DEPLOY'
      LIMIT 1;
    `;

    const data = await this.db.executeQueryWithCache(
      query,
      [unicodeTick],
      BLOCKCHAIN_SYNC_CACHE_DURATION,
    );

    if ((data as any).rows.length === 0) {
      return null;
    }

    const row = (data as any).rows[0];

    return this.convertSingleResponseToEmoji({
      max_supply: row["max"].toString(),
      total_minted: row["total_minted"].toString(),
      limit: row["lim"].toString(),
      total_mints: row["total_mints"],
      progress: row["progress"].toString(),
      decimals: parseInt(row["deci"]),
      holders: row["holders_count"],
      tx_hash: row["tx_hash"],
      tick: row["tick"],
    });
  }

  // End of optimized trending methods

  // 🚀 OPTIMIZED COUNT METHOD USING PRE-COMPUTED MARKET DATA
  static async getTotalCountValidSrc20TxFromDbOptimized(
    params: SRC20TrxRequestParams,
    excludeFullyMinted: boolean = false,
  ) {
    const {
      tick = null,
      op = null,
      block_index = null,
      tx_hash = null,
      address = null,
    } = params;

    const queryParams = [];
    const whereConditions = [];

    if (tick !== null) {
      if (Array.isArray(tick)) {
        whereConditions.push(
          `src20.tick IN (${tick.map(() => "?").join(", ")})`,
        );
        queryParams.push(...tick.map(t => this.ensureUnicodeEscape(t)));
      } else {
        whereConditions.push(`src20.tick = ?`);
        queryParams.push(this.ensureUnicodeEscape(tick));
      }
    }

    if (op !== null) {
      if (Array.isArray(op)) {
        whereConditions.push(`src20.op IN (${op.map(() => "?").join(", ")})`);
        queryParams.push(...op.map(o => this.ensureUnicodeEscape(o)));
      } else {
        whereConditions.push(`src20.op = ?`);
        queryParams.push(this.ensureUnicodeEscape(op));
      }
    }

    if (block_index !== null) {
      whereConditions.push(`src20.block_index = ?`);
      queryParams.push(block_index);
    }

    if (address !== null) {
      whereConditions.push(`src20.address = ?`);
      queryParams.push(address);
    }

    if (tx_hash !== null) {
      whereConditions.push(`src20.tx_hash = ?`);
      queryParams.push(tx_hash);
    }

    // 🚀 OPTIMIZED FULLY MINTED EXCLUSION USING PRE-COMPUTED DATA
    if (excludeFullyMinted) {
      // Use pre-computed progress_percentage from src20_market_data table
      whereConditions.push(`COALESCE(smd.progress_percentage, 0) < 100`);
    }

    let sqlQuery = `
          SELECT COUNT(*) AS total
          FROM ${SRC20_TABLE} src20
      `;

    // Add JOIN only when excluding fully minted tokens
    if (excludeFullyMinted) {
      sqlQuery += `
          LEFT JOIN src20_market_data smd ON smd.tick = src20.tick
      `;
    }

    if (whereConditions.length > 0) {
      sqlQuery += ` WHERE ` + whereConditions.join(" AND ");
    }

    return await this.db.executeQueryWithCache(
      sqlQuery,
      queryParams,
      BLOCKCHAIN_SYNC_CACHE_DURATION,
    );
  }

}
