/* ===== DATABASE CONSTANTS ===== */

/**
 * Database table names and related configuration constants
 */

/* ===== TABLE NAMES ===== */
/** Main stamps table */
export const STAMP_TABLE = "StampTableV4";

/** Blocks table */
export const BLOCK_TABLE = "blocks";

/** SRC20 valid tokens table */
export const SRC20_TABLE = "SRC20Valid";

/** SRC20 token balances table */
export const SRC20_BALANCE_TABLE = "balances";

/** SRC101 valid tokens table */
export const SRC101_TABLE = "SRC101Valid";

/** SRC101 all tokens table (including invalid) */
export const SRC101_ALL_TABLE = "SRC101";

/** SRC101 token owners table */
export const SRC101_OWNERS_TABLE = "owners";

/** SRC101 token recipients table */
export const SRC101_RECIPIENTS_TABLE = "recipients";

/** SRC101 price tracking table */
export const SRC101_PRICE_TABLE = "src101price";

/* ===== SNN TABLES ===== */
/** SNN Counterparty broadcasts table */
export const SNN_BROADCASTS_TABLE = "snn_broadcasts";

/* ===== CACHE AND PERFORMANCE CONSTANTS ===== */
/** Default cache duration in seconds (12 hours) */
export const DEFAULT_CACHE_DURATION = 60 * 60 * 12;

/** Blockchain-synchronized cache duration in seconds (10 minutes - average block time) */
export const BLOCKCHAIN_SYNC_CACHE_DURATION = 60 * 10;

/** Balance cache duration in seconds (5 minutes - balances change with blocks, not seconds) */
export const BALANCE_CACHE_DURATION = 60 * 5; // Increased from 30 seconds to 5 minutes

/** Short-lived cache for rapidly changing data (30 seconds) */
export const SHORT_CACHE_DURATION = 30;

/**
 * Long-term cache for immutable blockchain data (2 hours)
 * Balances performance with automatic stale data cleanup
 * Used for confirmed transactions, stamps, and other immutable blockchain state
 *
 * NOTE: Can be changed to "never" (permanent) once webhook integration is active
 * Webhook endpoint exists at /api/internal/bitcoinNotifications but indexer
 * does not currently call it. Future indexer team can add webhook support.
 */
export const IMMUTABLE_CACHE_DURATION = 60 * 60 * 2; // 2 hours

/** Multiplier for converting KB to vBytes */
export const SATS_PER_KB_MULTIPLIER = 1000; // 1 KB = 1000 vBytes

/* ===== PAGINATION AND LIMITS ===== */
/** Large result set limit */
export const BIG_LIMIT = 200;

/** Small result set limit */
export const SMALL_LIMIT = 20;

/** Default pagination limit */
export const DEFAULT_LIMIT = 50;

/** Default page size for paginated results */
export const DEFAULT_PAGE_SIZE = 50;

/** Maximum allowed pagination limit */
export const MAX_PAGINATION_LIMIT = 1000;

/* ===== RATE LIMITING ===== */
/** Maximum requests allowed per rate limit window */
export const RATE_LIMIT_REQUESTS = 100;

/** Rate limit window duration in milliseconds (1 minute) */
export const RATE_LIMIT_WINDOW = 60 * 1000;

/* ===== BITCOIN CONSTANTS ===== */
/** Satoshis per Bitcoin */
export const SATOSHIS_PER_BTC = 100000000;

/** Maximum retry attempts for XCP operations */
export const MAX_XCP_RETRIES = 5;
