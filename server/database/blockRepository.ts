// deno-lint-ignore-file no-explicit-any

import { IMMUTABLE_CACHE_DURATION, STAMP_TABLE } from "$constants";
import { dbManager } from "$server/database/databaseManager.ts";

const BLOCK_FIELDS =
  `block_index, block_time, block_hash, previous_block_hash, ledger_hash, txlist_hash, messages_hash`;

export class BlockRepository {
  // Dependency injection support
  private static db: typeof dbManager = dbManager;

  static setDatabase(database: typeof dbManager): void {
    this.db = database;
  }

  /**
   * Retrieves block information by block index or hash using the provided database client.
   * @param client - The database client to use for the query.
   * @param blockIdentifier - The block index or hash to retrieve information for.
   * @returns A promise that resolves to the block information.
   */
  static async getBlockInfoFromDb(
    blockIdentifier: number | string,
  ) {
    const isIndex = typeof blockIdentifier === "number" ||
      /^\d+$/.test(blockIdentifier);
    const field = isIndex ? "block_index" : "block_hash";
    const queryValue = isIndex ? Number(blockIdentifier) : blockIdentifier;

    return await this.db.executeQueryWithCache(
      `
      SELECT ${BLOCK_FIELDS}
      FROM blocks
      WHERE ${field} = ?;
      `,
      [queryValue],
      IMMUTABLE_CACHE_DURATION,
    );
  }
  /**
   * Retrieves the last block index from the database using the provided client.
   *
   * @param client - The database client to use for the query.
   * @returns A promise that resolves to the last block index.
   */
  static async getLastBlockFromDb() {
    return await this.db.executeQueryWithCache(
      `
      SELECT MAX(block_index)
      AS last_block
      FROM blocks;
      `,
      [],
      30, // 30 seconds - current block height changes every ~10 minutes
    );
  }

  /**
   * Height and hash of the newest indexed block, for the chain label on
   * pages and API responses. Same 30 s cache as getLastBlockFromDb.
   */
  static async getLastBlockWithHashFromDb() {
    return await this.db.executeQueryWithCache(
      `
      SELECT block_index, block_hash
      FROM blocks
      ORDER BY block_index DESC
      LIMIT 1;
      `,
      [],
      30,
    );
  }

  static async getLastXBlocksFromDb(num = 10) {
    try {
      const result = await this.db.executeQueryWithCache(
        `
        SELECT ${BLOCK_FIELDS}
        FROM blocks
        ORDER BY block_index DESC
        LIMIT ?;
        `,
        [num],
        IMMUTABLE_CACHE_DURATION, // Blocks are immutable once confirmed - cache forever
      ) || { rows: [] };

      const blocks = (result as any).rows;
      const blockIndexes = blocks.map((block: any) => block.block_index);

      const tx_counts_result = await this.db.executeQueryWithCache(
        `
        SELECT block_index, COUNT(*) AS tx_count
        FROM ${STAMP_TABLE}
        WHERE block_index IN (${blockIndexes.join(",")})
        GROUP BY block_index
        `,
        [],
        60,
      ) as { block_index: number; tx_count: number }[];

      const tx_counts = (tx_counts_result as any).rows;

      const tx_count_map = new Map(
        tx_counts.map((item: any) => [item.block_index, item.tx_count]),
      );

      const populated = blocks.map((block: any) => ({
        ...block,
        tx_count: tx_count_map.get(block.block_index) || 0,
      }));

      return populated.reverse();
    } catch (error) {
      console.error("Error in getLastXBlocks:", error);
      throw error;
    }
  }
  /**
   * Retrieves related blocks with the specified client.
   *
   * @param client - The database client.
   * @param blockIdentifier - The block index (number) or block hash (string).
   * @returns A promise that resolves to an array of related blocks.
   */
  static async getRelatedBlocksWithStampsFromDb(
    blockIdentifier: number | string,
  ) {
    let block_index: number;

    if (typeof blockIdentifier === "number" || /^\d+$/.test(blockIdentifier)) {
      block_index = Number(blockIdentifier);
    } else {
      block_index = await this._getBlockIndexByHash(
        String(blockIdentifier),
      );
    }

    const [blocks, stamps] = await Promise.all([
      this.db.executeQueryWithCache(
        `
      SELECT ${BLOCK_FIELDS}
      FROM blocks
      WHERE block_index >= ? - 2
      AND block_index <= ? + 2
      ORDER BY block_index DESC;
      `,
        [block_index, block_index],
        IMMUTABLE_CACHE_DURATION, // Blocks are immutable once confirmed - cache forever
      ),
      this.db.executeQueryWithCache(
        `
      SELECT block_index, COUNT(*) AS stampcount
      FROM ${STAMP_TABLE}
      WHERE block_index >= ? - 2
      AND block_index <= ? + 2
      GROUP BY block_index;
      `,
        [block_index, block_index],
        IMMUTABLE_CACHE_DURATION,
      ),
    ]);

    const stampMap = new Map(
      (stamps as any).rows.map((row: any) => [row.block_index, row.stampcount]),
    );

    const result = (blocks as any).rows.map((block: any) => ({
      ...block,
      issuances: stampMap.get(block.block_index) ?? 0,
      sends: 0, // FIXME: need to add the send data
    }));

    return result.reverse();
  }

  /**
   * Retrieves the block index by its hash using the provided database client.
   * @param client - The database client to use for the query.
   * @param block_hash - The hash of the block to retrieve the index for.
   * @returns The block index if found, otherwise undefined.
   */
  static async _getBlockIndexByHash(block_hash: string) {
    const result = await this.db.executeQueryWithCache(
      `
      SELECT block_index
      FROM blocks
      WHERE block_hash = ?
      LIMIT 1;
      `,
      [block_hash],
      IMMUTABLE_CACHE_DURATION,
    );
    return (result as number[])[0];
  }
}
