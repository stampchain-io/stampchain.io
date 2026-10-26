import { IMMUTABLE_CACHE_DURATION, STAMP_TABLE } from "$constants";
import { dbManager } from "$server/database/databaseManager.ts";

/**
 * True when `txHash` is an SRC-20 stamp. A stamp's ident never changes once
 * indexed, so a positive answer is cached for the immutable duration.
 */
export async function isSrc20StampTx(txHash: string): Promise<boolean> {
  const result = await dbManager.executeQueryWithCache(
    `SELECT 1 AS hit FROM ${STAMP_TABLE} WHERE tx_hash = ? AND ident = 'SRC-20' LIMIT 1`,
    [txHash],
    IMMUTABLE_CACHE_DURATION,
  ) as { rows?: unknown[] } | null;
  return Boolean(result?.rows?.length);
}
