/**
 * Logging Constants for BTC Stamps Explorer
 * Defines namespaces and configuration for the logging system
 */

/**
 * Available logging namespaces for categorizing log messages
 * Used with DEBUG environment variable for selective logging
 */
export const LOG_NAMESPACES = {
  // Core namespaces
  API: "api",
  DATABASE: "database",
  SERVICE: "service",
  TRANSACTION: "transaction",
  VALIDATION: "validation",
  ERROR: "error",
  DEBUG: "debug",
  STAMPS: "stamps",
  UI: "ui",
  PERFORMANCE: "performance",
  NETWORK: "network",
  AUTH: "auth",
  CONTENT: "content",

  // System and infrastructure
  SYSTEM: "system",
  CACHE: "cache",
  CONFIG: "config",
  SECURITY: "security",
  SQL: "sql",
  NOTIFICATION: "notification",

  // Bitcoin and transaction specific
  BROADCAST: "broadcast",
  PSBT: "psbt",
  PSBT_SERVICE: "psbt-service",

  // Token protocols
  SRC20: "src20",
  SRC20_DEPLOY: "src20-deploy",
  SRC20_MINT: "src20-mint",
  SRC20_TRANSFER: "src20-transfer",
  SRC20_OPERATION_SERVICE: "src20-operation-service",
  SRC20_UTILITY: "src20-utility",
  SRC101: "src101",
  SRC101_OPERATION_SERVICE: "src101-operation-service",
  SRC101_PSBT_SERVICE: "src101-psbt-service",

  // API endpoints
  API_SRC20_CREATE: "api-src20-create",
  API_SRC101_CREATE: "api-src101-create",

  // Services
  STAMP_CREATE: "stamp-create",
  TOOL_ENDPOINT_ESTIMATOR: "tool-endpoint-estimator",
  TRANSACTION_UTXO_SERVICE: "transaction-utxo-service",
  COMMON_UTXO_SERVICE: "common-utxo-service",
  UTXO_ANCESTORS: "utxo-ancestors",
  FEE_MONITORING: "fee-monitoring",

  // Middleware
  MIDDLEWARE: "middleware",
  OPENAPI_VALIDATION: "openapi-validation",
  REQUEST_VALIDATION: "request-validation",
} as const;

/**
 * Type for valid log namespaces
 */
export type LogNamespace = typeof LOG_NAMESPACES[keyof typeof LOG_NAMESPACES];

/**
 * Default log file configuration
 */
export const LOG_CONFIG = {
  DEFAULT_LOG_PATH: "./logs/app.log",
  MAX_LOG_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  LOG_FILE_ROTATION_COUNT: 5,
} as const;

/**
 * Log levels for filtering
 */
export const LOG_LEVELS = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
} as const;

export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];
