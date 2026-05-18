/**
 * 🔌 API Types Domain Module - OpenAPI 3.0+ Compliant
 *
 * This module contains all API-related type definitions including:
 * - HTTP request/response interfaces following OpenAPI 3.0+ standards
 * - API handler context types with full request/response metadata
 * - Paginated response bodies with standardized pagination metadata
 * - Route parameter types with validation constraints
 * - Comprehensive error response types with RFC 7807 compliance
 *
 * Part of the divine type domain migration - extracting API types from globals.d.ts
 * into their celestial organized domain with enhanced OpenAPI compliance.
 *
 * @version 2.0.0
 * @openapi 3.0.3
 * @see globals.d.ts - Source of truth being migrated
 * @author Bitcoin Stamps 🎵
 *
 * Organization:
 * 1. OpenAPI Schema Types - Core OpenAPI specification types
 * 2. Request/Response Types - HTTP request and response structures
 * 3. Public API Endpoints - /api/v2/* route types (49 endpoints)
 * 4. Internal API Endpoints - /api/internal/* route types (23 endpoints)
 * 5. Proxy API Endpoints - /api/proxy/* route types (2 endpoints)
 * 6. Error Response Types - Standardized error handling
 * 7. Type Guards and Utilities - Runtime type checking functions
 */

// ============================================================================
// Type Imports from Other Domain Modules
// ============================================================================

import {
  ApiErrorCode,
  HttpStatusCodes,
  HttpStatusToErrorCode,
  OpenAPITags,
} from "$constants";
import type { BlockRow, SUBPROTOCOLS, UTXO } from "$types/base.d.ts";
import type {
  OffsetPageInfo as Pagination,
  PaginatedResponse,
} from "$types/pagination.d.ts";
import type { PaginationInfo } from "$types/utils.d.ts";

// Re-export the constants for external use
export { ApiErrorCode, HttpStatusCodes, HttpStatusToErrorCode, OpenAPITags };

// Define HttpStatusCode type based on the values from HttpStatusCodes
export type HttpStatusCode =
  typeof HttpStatusCodes[keyof typeof HttpStatusCodes];

import type { StampFilterType } from "$constants";
import type {
  DispenserRow,
  RecentSaleData,
  StampBalance,
  StampFilters,
  StampRow,
} from "./stamp.d.ts";

import type {
  CacheService,
  CollectionRow,
  CollectionWithOptionalMarketData,
  HttpClient,
  LoggerService,
  RouteType,
} from "./services.d.ts";

import type {
  EnrichedSRC20Row,
  MintStatus,
  SRC20Balance,
  Src20Detail,
  SRC20Row,
  SRC20TokenSchema,
} from "./src20.d.ts";

import type { Src101Detail } from "./src101.d.ts";

import type {
  CacheStatus,
  CollectionMarketData,
  SRC20MarketData,
  StampMarketData,
} from "./marketData.d.ts";

import type { MarketDataCacheInfo } from "./utils.d.ts";

import type { SendRow } from "$types/transaction.d.ts";

// ============================================================================
// OpenAPI 3.0+ Schema Types
// ============================================================================

/**
 * OpenAPI 3.0 specification metadata
 * Used for generating API documentation and validation
 */
export interface OpenAPIInfo {
  title: string;
  description?: string;
  version: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

/**
 * OpenAPI server configuration
 */
export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, {
    default: string;
    description?: string;
    enum?: string[];
  }>;
}

/**
 * OpenAPI security scheme types
 */
export type OpenAPISecurityScheme =
  | { type: "apiKey"; in: "header" | "query" | "cookie"; name: string }
  | { type: "http"; scheme: string; bearerFormat?: string }
  | { type: "oauth2"; flows: Record<string, unknown> }
  | { type: "openIdConnect"; openIdConnectUrl: string };

/**
 * OpenAPI parameter definition
 */
export interface OpenAPIParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  schema: OpenAPISchema;
  example?: unknown;
  examples?: Record<string, { value: unknown; summary?: string }>;
}

/**
 * OpenAPI schema definition (subset of JSON Schema)
 */
export interface OpenAPISchema {
  type?:
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "array"
    | "object"
    | "null";
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  example?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  required?: string[];
  properties?: Record<string, OpenAPISchema>;
  additionalProperties?: boolean | OpenAPISchema;
  items?: OpenAPISchema;
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  allOf?: OpenAPISchema[];
  not?: OpenAPISchema;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
}

/**
 * OpenAPI operation (endpoint) definition
 */
export interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: { url: string; description?: string };
  operationId?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: {
    description?: string;
    content: Record<string, { schema: OpenAPISchema }>;
    required?: boolean;
  };
  responses: Record<string, {
    description: string;
    content?: Record<string, { schema: OpenAPISchema }>;
    headers?: Record<string, OpenAPIParameter>;
  }>;
  callbacks?: Record<string, unknown>;
  deprecated?: boolean;
  security?: Array<Record<string, string[]>>;
  servers?: OpenAPIServer[];
}

/**
 * OpenAPI path item
 */
export interface OpenAPIPathItem {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: OpenAPIOperation;
  put?: OpenAPIOperation;
  post?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  trace?: OpenAPIOperation;
  servers?: OpenAPIServer[];
  parameters?: OpenAPIParameter[];
}

/**
 * Complete OpenAPI 3.0 specification document
 */
export interface OpenAPIDocument {
  openapi: "3.0.0" | "3.0.1" | "3.0.2" | "3.0.3";
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  paths: Record<string, OpenAPIPathItem>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
    responses?: Record<string, unknown>;
    parameters?: Record<string, OpenAPIParameter>;
    examples?: Record<string, unknown>;
    requestBodies?: Record<string, unknown>;
    headers?: Record<string, unknown>;
    securitySchemes?: Record<string, OpenAPISecurityScheme>;
    links?: Record<string, unknown>;
    callbacks?: Record<string, unknown>;
  };
  security?: Array<Record<string, string[]>>;
  tags?: Array<{
    name: string;
    description?: string;
    externalDocs?: { url: string; description?: string };
  }>;
  externalDocs?: { url: string; description?: string };
}

// ============================================================================
// Generic Request/Response Types
// ============================================================================

/**
 * Generic API request with OpenAPI metadata
 */
export interface ApiRequest<
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
> {
  params?: TParams;
  query?: TQuery;
  body?: TBody;
  headers: Record<string, string | string[]>;
  method: string;
  url: string;
  path: string;
  cookies?: Record<string, string>;
  user?: unknown;
}

/**
 * Generic API response with OpenAPI metadata
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    timestamp: number;
    version: string;
    requestId?: string;
  };
  pagination?: PaginationInfo;
  links?: Record<string, string>; // HATEOAS links
}

/**
 * API error structure (compatible with RFC 7807)
 */
export interface ApiError {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code: string;
  timestamp: string;
  path?: string;
  method?: string;
  correlationId?: string;
  [key: string]: unknown; // Extension members
}

// ============================================================================
// API Handler Context Types
// ============================================================================

/**
 * IdentHandlerContext is used when the context requires an 'ident' parameter
 * Used by API routes that need to identify specific resources by ident
 */
export interface IdentHandlerContext {
  params: {
    ident: string;
  };
}

/**
 * BlockHandlerContext for block-specific API endpoints
 * Includes both route parameters and URL context
 */
export interface BlockHandlerContext {
  params: {
    block_index: string;
  };
  url: URL;
}

/**
 * AddressTickHandlerContext for address and tick specific operations
 * Used in SRC-20 token operations tied to specific addresses and ticks
 */
export interface AddressTickHandlerContext {
  params: {
    address: string;
    tick: string | number;
  };
}

/**
 * AddressHandlerContext for address-specific API endpoints
 * Used for wallet and address-related operations
 */
export interface AddressHandlerContext {
  params: {
    address: string;
  };
}

/**
 * TickHandlerContext for tick-specific SRC-20 operations
 * Supports optional operation parameter for future mint/transfer/deploy routing
 */
export interface TickHandlerContext {
  params: {
    tick: string;
    op?: string; // future use for mint/transfer deploy is defined in routes
  };
}

// ============================================================================
// API Request Parameter Types
// ============================================================================

/**
 * SRC-20 transaction request parameters for API endpoints
 * Comprehensive parameter set for filtering and querying SRC-20 transactions
 *
 * ✨ V2.3 Enhanced with trending and mint progress capabilities
 */
export interface SRC20TrxRequestParams {
  block_index?: number | null;
  tick?: string | string[] | null;
  op?: string | string[] | null;
  limit?: number;
  page?: number;
  sortBy?: string | {
    field: string; // Field to sort by
    direction: "asc" | "desc"; // Sort direction
  }; // Unified sorting parameter with object support for consistency
  filterBy?: string | string[] | null;
  tx_hash?: string | null;
  address?: string | null;
  includePagination?: boolean; // Replaces noPagination for consistent naming
  singleResult?: boolean;

  // 🚀 NEW V2.3 PARAMETERS FOR TRENDING AND MINT PROGRESS
  mintingStatus?: "all" | "minting" | "minted"; // Simplified filter: all (default), minting (progress < 100%), minted (progress >= 99.9%)
  trendingWindow?: "24h" | "7d" | "30d"; // Time window for trending calculations
  includeProgress?: boolean; // Include progress_percentage, total_minted from market data
  mintVelocityMin?: number; // Minimum mint velocity for trending (mints per hour)
}

/**
 * SRC-20 snapshot request parameters
 * For generating point-in-time snapshots of SRC-20 token states
 */
export interface SRC20SnapshotRequestParams {
  amt?: number;
  block_index?: number | null;
  tick?: string | string[] | null;
  address?: string | null;
  limit?: number;
  page?: number;
  sortBy?: string | {
    field: string; // Field to sort by
    direction: "asc" | "desc"; // Sort direction
  }; // Unified sorting parameter with object support for consistency
  sortField?: string; // Field to sort by (legacy support)
  includePagination?: boolean; // Replaces noPagination for consistent naming
}

// ============================================================================
// API Response Body Types
// ============================================================================

/**
 * Base paginated response structure for stamp-related endpoints
 * Provides common pagination metadata and stamp data array
 */
export interface PaginatedStampResponseBody {
  last_block: number;
  page: number;
  limit: number;
  totalPages: number;
  data: StampRow[];
}

/**
 * Paginated response with identifier information
 * Extends base stamp response with subprotocol identification
 */
export interface PaginatedIdResponseBody extends PaginatedStampResponseBody {
  ident: SUBPROTOCOLS;
}

/**
 * Paginated stamp balance response for wallet operations
 * Returns stamp balance information with pagination support
 */
export interface PaginatedStampBalanceResponseBody {
  last_block: number;
  page: number;
  limit: number;
  totalPages: number;
  data: StampBalance[];
}

/**
 * Paginated SRC-20 response with enriched market data
 * ✨ V2.3 Enhanced: Uses EnrichedSRC20Row for comprehensive token information
 */
export interface PaginatedSrc20ResponseBody {
  last_block: number;
  page: number;
  limit: number;
  totalPages: number;
  data: EnrichedSRC20Row[]; // CHANGED from Src20Detail[] to EnrichedSRC20Row[]
}

/**
 * Paginated tick response with mint status information
 * Provides detailed information about specific SRC-20 ticks including minting progress
 * ✨ V2.4 Enhanced: Added optional market_data field for tick-level market information
 */
export interface PaginatedTickResponseBody {
  last_block: number;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  mint_status: MintStatus;
  data: Src20Detail[];
  market_data?: SRC20MarketData | null; // ✨ V2.4: Optional market data for the tick
}

/**
 * Deploy operation response body
 * Returns information about SRC-20 token deployment with mint status
 */
export interface DeployResponseBody {
  last_block: number;
  mint_status: MintStatus;
  data: Src20Detail;
}

/**
 * Single SRC-20 token response body
 * Returns detailed information about a specific SRC-20 token
 */
export interface Src20ResponseBody {
  last_block: number;
  data: Src20Detail;
}

/**
 * Paginated SRC-20 balance response for wallet operations
 * Returns SRC-20 token balances with pagination support
 */
export interface PaginatedSrc20BalanceResponseBody {
  last_block: number;
  page: number;
  limit: number;
  totalPages: number;
  data: SRC20Balance[] | [];
}

/**
 * Single SRC-20 balance response body
 * Returns balance information for a specific SRC-20 token with optional pagination
 */
export interface Src20BalanceResponseBody {
  last_block: number;
  data: SRC20Balance;
  pagination?: Pagination;
}

/**
 * Block information response with associated transactions
 * Comprehensive block data including issuances and sends
 */
export interface BlockInfoResponseBody {
  block_info: BlockRow;
  issuances: StampRow[];
  sends: SendRow[];
  last_block: number;
}

/**
 * Stamp block response focusing on stamp data
 * Block information with associated stamp transactions
 */
export interface StampBlockResponseBody {
  block_info: BlockRow;
  data: StampRow[];
  last_block: number;
}

/**
 * Paginated dispenser response for marketplace operations
 * Returns dispenser information with pagination metadata
 */
export interface PaginatedDispenserResponseBody {
  page: number;
  limit: number;
  totalPages: number;
  last_block: number;
  dispensers: DispenserRow[];
}

// ============================================================================
// Extracted Inline API Types
// ============================================================================

/**
 * OLGA API - Fee Estimation Request Body
 * Used by the OLGA minting estimation endpoint
 */
export interface EstimateRequest {
  filename: string;
  file: string;
  qty?: number | string;
  satsPerVB?: number | string;
  satsPerKB?: number | string;
  feeRate?: number | string;
  service_fee?: number | string;
  isPoshStamp?: boolean;
}

/**
 * OLGA API - Fee Estimation Response Body
 * Comprehensive fee estimation response from OLGA endpoint
 */
export interface EstimateResponse {
  est_tx_size: number;
  total_dust_value: number;
  est_miner_fee: number;
  total_cost: number;
  fee_breakdown: {
    miner_fee: number;
    dust_value: number;
    service_fee: number;
  };
  file_info: {
    size_bytes: number;
    cip33_addresses_count: number;
  };
  is_estimate: true;
  estimation_method: "dummy_utxos";
  dummy_utxo_value: number;
}

/**
 * OLGA API - Raw Mint Request Body
 * Flexible request body for OLGA minting operations
 */
export interface RawRequestBody {
  sourceWallet?: string;
  assetName?: string;
  qty?: number | string;
  locked?: boolean;
  divisible?: boolean;
  filename?: string;
  file?: string;
  description?: string;
  prefix?: "stamp" | "file" | "glyph";
  dryRun?: boolean;
  satsPerKB?: number | string;
  satsPerVB?: number | string;
  feeRate?: number | string;
  service_fee?: number | string;
  service_fee_address?: string;
  isPoshStamp?: boolean;
  // MARA integration parameters
  outputValue?: number | string;
  maraFeeRate?: number | string;
}

/**
 * OLGA API - Transaction Input Type
 * Represents Bitcoin transaction input for OLGA operations
 */
export interface TransactionInput {
  txid: string;
  vout: number;
  signingIndex: number;
}

/**
 * OLGA API - Stamp Creation Parameters
 * Normalized parameters passed to StampCreationService
 */
export interface CreateStampIssuanceParams {
  sourceWallet: string;
  assetName: string;
  qty: string;
  locked: boolean;
  divisible: boolean;
  filename: string;
  file: string;
  satsPerKB: number;
  satsPerVB: number;
  description: string;
  prefix: "stamp" | "file" | "glyph";
  isDryRun?: boolean;
  service_fee: number;
  service_fee_address: string;
  outputValue?: number;
}

/**
 * OLGA API - Normalized Mint Response
 * Response structure for OLGA minting operations
 */
export interface NormalizedMintResponse {
  hex: string;
  cpid: string;
  est_tx_size: number;
  input_value: number;
  total_dust_value: number;
  est_miner_fee: number;
  change_value: number;
  total_output_value: number;
  txDetails: TransactionInput[];
  is_estimate?: boolean;
  estimation_method?: string;
}

/**
 * Transaction API - PSBT Creation Input
 * Input parameters for creating Bitcoin PSBTs
 */
export interface CreatePSBTInput {
  utxo: string;
  salePrice: number;
  sellerAddress: string;
}

// CreatePSBTResponse definition moved below with complete structure

/**
 * Send API - Send Request Body
 * Request body for Counterparty send operations
 */
export interface SendRequestBody {
  address: string;
  destination: string;
  asset: string;
  quantity: number;
  satsPerVB: number;
  options?: {
    service_fee?: number;
    service_fee_address?: string;
    memo?: string;
    memo_is_hex?: boolean;
    encoding?: string;
    fee_per_kb?: number;
    return_psbt?: boolean;
  };
  dryRun?: boolean;
}

/**
 * Send API - Send Response
 * Response structure for send operations
 */
export interface SendResponse {
  psbtHex?: string;
  inputsToSign?: { index: number; address: string; sighashTypes?: number[] }[];
  estimatedFee?: number;
  estimatedVsize?: number;
}

/**
 * SRC-20 API - Create Response
 * Response structure for SRC-20 token creation operations
 */
export interface SRC20CreateResponse {
  hex?: string;
  est_tx_size?: number;
  input_value?: number;
  total_dust_value?: number;
  est_miner_fee?: number;
  fee?: number;
  change_value?: number;
  inputsToSign?: Array<
    { index: number; address: string; sighashType?: number }
  >;
  sourceAddress?: string;
  changeAddress?: string;
  feeDetails?: any;
  cpid?: string;
}

// ============================================================================
// Composite API Types
// ============================================================================

/**
 * Combined stamps and SRC-20 data structure
 * Used for endpoints that return both stamp and SRC-20 information
 */
export interface StampsAndSrc20 {
  stamps: StampRow[];
  src20: SRC20Balance[];
}

/**
 * Stamp page props for frontend rendering
 * Comprehensive data structure for stamp gallery pages
 */
export type StampPageProps = {
  data: {
    stamps: StampRow[];
    page: number;
    totalPages: number;
    selectedTab: "all" | "classic" | "posh" | "recent_sales";
    sortBy: "ASC" | "DESC";
    filterBy: StampFilterType[];
    filters: StampFilters;
    search: string;
    src20DataCard?: {
      data: import("./src20.d.ts").SRC20Row[];
      total: number;
      page: number;
      totalPages: number;
    } | null;
  };
};

// ============================================================================
// Internal API Types
// ============================================================================

/**
 * Internal API endpoint types for system-internal communication
 * These endpoints are secured and used for internal operations only
 */

// MARA Integration API Types
/**
 * MARA transaction submission request body
 * Used by /api/internal/mara-submit
 */
export interface MaraSubmitRequest {
  /** Signed transaction hex string */
  hex: string;
  /** Optional stamp ID for logging and tracking */
  txid?: string;
  /** Transaction priority level */
  priority?: "high" | "medium" | "low";
}

/**
 * MARA transaction submission response
 * Response from /api/internal/mara-submit
 */
export interface MaraSubmitResponse {
  /** Transaction ID from MARA */
  txid: string;
  /** Submission status */
  status: "accepted" | "pending" | "rejected";
  /** Pool identifier */
  pool: "mara";
  /** Human-readable message */
  message: string;
  /** Estimated blocks until confirmation (optional) */
  estimatedConfirmation?: number;
  /** Pool priority level (optional) */
  poolPriority?: number;
}

/**
 * MARA health check response
 * Response from /api/internal/mara-health
 */
export interface MaraHealthResponse {
  /** Overall health status */
  status: "healthy" | "degraded" | "unhealthy";
  /** Timestamp of health check */
  timestamp: number;
  /** Component health details */
  components: {
    /** MARA integration enabled */
    enabled: boolean;
    /** Service configuration valid */
    configured: boolean;
    /** Circuit breaker healthy */
    circuitBreaker: "healthy" | "degraded" | "open" | "unhealthy";
    /** Recent API performance */
    apiPerformance: "healthy" | "degraded" | "failing";
  };
  /** Health check metrics */
  metrics: {
    /** Recent success rate (last 1 hour) */
    successRate: number;
    /** Average response time (last 1 hour) */
    avgResponseTime: number;
    /** Circuit breaker trips (last 24 hours) */
    circuitBreakerTrips: number;
  };
  /** Health check details */
  details?: string[];
}

/**
 * MARA fee rate response
 * Response from /api/internal/mara-fee-rate
 */
export interface MaraFeeRateResponse {
  /** Current recommended fee rate (sats/vB) */
  feeRate: number;
  /** Fee rate source */
  source: "mara" | "fallback";
  /** Confidence level */
  confidence: "high" | "medium" | "low";
  /** Timestamp of fee rate */
  timestamp: number;
  /** Additional fee rate options */
  tiers?: {
    fast: number;
    medium: number;
    slow: number;
  };
}

// Monitoring & System API Types
/**
 * System monitoring response
 * Response from /api/internal/monitoring
 */
export interface MonitoringResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  pid: number;
  node_version: string;
  environment: string;
}

/**
 * Memory monitoring response
 * Response from /api/internal/monitoring?action=memory
 */
export interface MemoryMonitoringResponse {
  status: "healthy" | "warning" | "critical";
  timestamp: string;
  memory: {
    heap: {
      used: number;
      total: number;
      available: number;
      percentage: number;
    };
    system: {
      rss: number;
      external: number;
    };
  };
  gc?: {
    lastCollection: string;
    collections: number;
  };
}

/**
 * Database monitoring response
 * Response from /api/internal/monitoring?action=database
 */
export interface DatabaseMonitoringResponse {
  connectionPool: {
    totalConnections: number;
    activeConnections: number;
    poolSize: number;
    maxPoolSize: number;
  };
  health: {
    poolUtilization: number;
    hasAvailableConnections: boolean;
    isHealthy: boolean;
  };
  timestamp: string;
}

/**
 * Fee estimation response
 * Response from /api/internal/fees
 */
export interface FeesResponse {
  /** Recommended fee rate (sats/vB) */
  recommendedFee: number;
  /** Current BTC price in USD */
  btcPrice: number;
  /** Data source identifier */
  source: string;
  /** Confidence level of the estimate */
  confidence: "high" | "medium" | "low";
  /** Response timestamp */
  timestamp: number;
  /** Whether fallback data was used */
  fallbackUsed?: boolean;
  /** Any errors encountered */
  errors?: string[];
  /** Emergency fallback indicator */
  emergencyFallback?: boolean;
  /** Additional fee rate tiers */
  tiers?: {
    fast: number;
    medium: number;
    slow: number;
  };
}

/**
 * BTC price response
 * Response from /api/internal/btcPrice
 */
export interface BTCPriceResponse {
  data: {
    /** Current BTC price in USD */
    price: number;
    /** Price data source */
    source: string;
    /** Price confidence level */
    confidence: "high" | "medium" | "low";
    /** Additional price details */
    details?: {
      lastUpdate?: string;
      currency?: string;
      volume24h?: number;
      change24h?: number;
    };
  };
}

/**
 * CSRF token response
 * Response from /api/internal/csrfToken
 */
export interface CSRFTokenResponse {
  /** CSRF protection token */
  token: string;
}

/**
 * Carousel stamps response
 * Response from /api/internal/carousel
 */
export interface CarouselResponse extends Array<StampRow> {}

/**
 * Fee estimate response for internal endpoints
 */
export interface FeeEstimateResponse {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

/**
 * Bitcoin notifications response
 * Response from /api/internal/bitcoinNotifications
 */
export interface BitcoinNotificationsResponse {
  /** Current block height */
  blockHeight: number;
  /** Recent notifications */
  notifications: Array<{
    /** Notification ID */
    id: string;
    /** Notification type */
    type: "block" | "transaction" | "alert";
    /** Notification message */
    message: string;
    /** Timestamp */
    timestamp: number;
    /** Severity level */
    severity: "info" | "warning" | "error";
    /** Additional data */
    data?: Record<string, any>;
  }>;
  /** Notification system status */
  status: "active" | "inactive" | "error";
}

// File Upload API Types
/**
 * SRC-20 background upload request
 * Request body for /api/internal/src20Background
 */
export interface SRC20BackgroundUploadRequest {
  /** Base64 encoded file data */
  fileData: string;
  /** SRC-20 tick identifier */
  tick: string;
  /** CSRF protection token */
  csrfToken?: string;
}

/**
 * SRC-20 background upload response
 * Response from /api/internal/src20Background
 */
export interface SRC20BackgroundUploadResponse {
  /** Upload success status */
  success: boolean;
  /** Result message */
  message: string;
  /** Uploaded file information */
  fileInfo?: {
    /** File name */
    filename: string;
    /** File size in bytes */
    size: number;
    /** File URL */
    url: string;
    /** File type */
    type: string;
  };
  /** Upload timestamp */
  timestamp?: number;
}

// Additional Internal Endpoint Types
/**
 * Creator name cache response
 * Response from /api/internal/creatorName
 */
export interface CreatorNameResponse {
  /** Creator address */
  address: string;
  /** Creator display name */
  name: string;
  /** Cache timestamp */
  timestamp: number;
  /** Cache TTL remaining */
  ttl?: number;
}

/**
 * UTXO query response
 * Response from /api/internal/utxoquery
 */
export interface UTXOQueryResponse {
  /** UTXO list */
  utxos: Array<{
    /** Transaction ID */
    txid: string;
    /** Output index */
    vout: number;
    /** Output value in satoshis */
    value: number;
    /** Script public key */
    scriptPubKey: string;
    /** Confirmation count */
    confirmations: number;
  }>;
  /** Total UTXO value */
  totalValue: number;
  /** Query timestamp */
  timestamp: number;
}

/**
 * Background fee status response
 * Response from /api/internal/background-fee-status
 */
export interface BackgroundFeeStatusResponse {
  /** Fee calculation status */
  status: "calculating" | "ready" | "error";
  /** Current fee estimates */
  fees?: {
    fast: number;
    medium: number;
    slow: number;
  };
  /** Last update timestamp */
  lastUpdate: number;
  /** Error message if applicable */
  error?: string;
}

/**
 * BTC price status response
 * Response from /api/internal/btc-price-status
 */
export interface BTCPriceStatusResponse {
  /** Price fetch status */
  status: "updating" | "ready" | "stale" | "error";
  /** Current price */
  price?: number;
  /** Price source */
  source?: string;
  /** Last update timestamp */
  lastUpdate: number;
  /** Next update timestamp */
  nextUpdate?: number;
  /** Error message if applicable */
  error?: string;
}

/**
 * Debug headers response
 * Response from /api/internal/debug-headers
 */
export interface DebugHeadersResponse {
  /** Request headers */
  headers: Record<string, string>;
  /** Request method */
  method: string;
  /** Request URL */
  url: string;
  /** Client IP */
  clientIP: string;
  /** User agent */
  userAgent: string;
  /** Request timestamp */
  timestamp: number;
}

/**
 * Fee security check response
 * Response from /api/internal/fee-security
 */
export interface FeeSecurityResponse {
  /** Security check status */
  status: "secure" | "warning" | "blocked";
  /** Security checks performed */
  checks: {
    /** Rate limiting status */
    rateLimit: "ok" | "warning" | "exceeded";
    /** Fee threshold check */
    feeThreshold: "ok" | "high" | "excessive";
    /** Source validation */
    sourceValidation: "ok" | "suspicious" | "blocked";
  };
  /** Security messages */
  messages: string[];
  /** Check timestamp */
  timestamp: number;
}

/**
 * Recent stamp sales response
 * Response from /api/internal/stamp-recent-sales
 */
export interface StampRecentSalesResponse {
  /** Recent sales data */
  sales: Array<{
    /** Stamp identifier */
    stamp: number;
    /** Sale price in satoshis */
    price: number;
    /** Sale timestamp */
    timestamp: number;
    /** Transaction hash */
    txHash: string;
    /** Buyer address */
    buyer: string;
    /** Seller address */
    seller: string;
  }>;
  /** Total sales count */
  totalSales: number;
  /** Data timestamp */
  timestamp: number;
}

// Operation Response Types
/**
 * Cache purge response
 * Response from /api/internal/purge-creator-cache
 */
export interface CachePurgeResponse {
  /** Purge operation success */
  success: boolean;
  /** Items purged count */
  itemsPurged: number;
  /** Operation message */
  message: string;
  /** Purge timestamp */
  timestamp: number;
}

/**
 * Connection pool reset response
 * Response from /api/internal/reset-connection-pool
 */
export interface ConnectionPoolResetResponse {
  /** Reset operation success */
  success: boolean;
  /** Pool statistics before reset */
  before: {
    totalConnections: number;
    activeConnections: number;
    poolSize: number;
  };
  /** Pool statistics after reset */
  after: {
    totalConnections: number;
    activeConnections: number;
    poolSize: number;
  };
  /** Reset timestamp */
  timestamp: number;
}

/**
 * Circuit breaker test reset response
 * Response from /api/internal/test-reset-circuit-breakers
 */
export interface CircuitBreakerTestResetResponse {
  /** Reset operation success */
  success: boolean;
  /** Circuit breakers reset */
  breakersReset: string[];
  /** Reset details */
  details: Record<string, {
    /** Previous state */
    previousState: string;
    /** Current state */
    currentState: string;
    /** Reset timestamp */
    resetAt: number;
  }>;
  /** Operation message */
  message: string;
  /** Reset timestamp */
  timestamp: number;
}

// ============================================================================
// ADDITIONAL V2 API ENDPOINTS
// ============================================================================

/**
 * Health check response
 * GET /api/v2/health
 */
export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
  version: string;
  uptime: number;
  checks: {
    database: boolean;
    redis: boolean;
    bitcoin: boolean;
    [key: string]: boolean;
  };
}

/**
 * Version information response
 * GET /api/v2/version
 */
export interface VersionResponse {
  version: string;
  buildDate: string;
  commit: string;
  branch: string;
  environment: string;
}

/**
 * API documentation response
 * GET /api/v2/docs
 */
export interface DocsResponse {
  openapi: string;
  info: OpenAPIInfo;
  servers: OpenAPIServer[];
  paths: Record<string, OpenAPIPathItem>;
}

/**
 * Collection information response
 * GET /api/v2/collections
 * GET /api/v2/collections/by-name/:name
 * GET /api/v2/collections/creator/:creator
 */
export interface CollectionResponse {
  success: boolean;
  data: {
    name: string;
    creator: string;
    description?: string;
    imageUrl?: string;
    stamps: StampRow[];
    totalStamps: number;
    floorPrice?: number;
    volumeTraded?: number;
    createdAt: string;
  };
  pagination?: PaginationInfo;
}

/**
 * Collection data interface with market data and display properties
 * Used in collection controllers and API responses
 */
export interface Collection {
  collection_id: string;
  collection_name: string;
  collection_description: string;
  creators: string[];
  creator_names?: string[]; // Human-readable creator names
  stamp_count: number;
  total_editions: number;
  first_stamp_image?: string | null;
  stamp_images?: string[] | null;
  img: string;
  // Market data from collection_market_data table
  marketData?: {
    floorPriceBTC: number | null;
    avgPriceBTC: number | null;
    totalValueBTC: number;
    volume24hBTC: number;
    volume7dBTC: number;
    volume30dBTC: number;
    totalVolumeBTC: number;
    totalStamps: number;
    uniqueHolders: number;
    listedStamps: number;
    soldStamps24h: number;
    lastUpdated: Date | null;
  };
}

/**
 * SRC-101 token response types
 */
export interface SRC101DeployResponse {
  deployHash: string;
  transactionHash: string;
  tokenName: string;
  maxSupply: number;
  decimals: number;
  deployedAt: string;
}

export interface SRC101TokenResponse {
  deployHash: string;
  tokenId: string;
  owner: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SRC101BalanceResponse {
  address: string;
  tokens: Array<{
    deployHash: string;
    tokenIds: string[];
    balance: number;
  }>;
}

/**
 * OLGA (Optimized Ledger for Global Assets) responses
 */
export interface OlgaEstimateResponse {
  estimatedFee: number;
  estimatedSize: number;
  inputs: number;
  outputs: number;
  feeRate: number;
}

export interface OlgaMintResponse {
  transactionHash: string;
  stampNumber?: number;
  cpid: string;
  status: "pending" | "confirmed" | "failed";
  fee: number;
}

/**
 * Transaction creation responses
 */
export interface CreatePSBTResponse {
  psbt: string;
  fee: number;
  inputCount: number;
  outputCount: number;
  estimatedSize: number;
}

export interface CompletePSBTResponse {
  transactionHash: string;
  rawTransaction: string;
  broadcast: boolean;
  fee: number;
}

/**
 * UTXO and ancestor responses
 */
export interface UTXOAncestorsResponse {
  address: string;
  ancestors: Array<{
    txid: string;
    vout: number;
    value: number;
    height: number;
    ancestorCount: number;
    ancestorSize: number;
    ancestorFees: number;
  }>;
}

/**
 * Changelog and version history
 */
export interface ChangelogResponse {
  versions: Array<{
    version: string;
    date: string;
    changes: {
      added?: string[];
      changed?: string[];
      deprecated?: string[];
      removed?: string[];
      fixed?: string[];
      security?: string[];
    };
  }>;
}

// ============================================================================
// PROXY API ENDPOINTS
// ============================================================================

/**
 * Arweave proxy response
 * GET /api/proxy/arweave/*
 */
export interface ArweaveProxyResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  cached: boolean;
  cacheExpiry?: number;
}

/**
 * Ordinals proxy response
 * GET /api/proxy/ordinals/*
 */
export interface OrdinalsProxyResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  cached: boolean;
  cacheExpiry?: number;
}

// ============================================================================
// STANDARDIZED ERROR RESPONSE TYPES
// ============================================================================

// HttpStatusCodes and HttpStatusCode are imported from $constants

// ApiErrorCode enum is imported from $constants

/**
 * Base error response structure following OpenAPI 3.0+ standards
 */
export interface BaseErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
    timestamp: string;
    path?: string;
    method?: string;
    correlationId?: string;
  };
}

/**
 * Field-level validation error details
 */
export interface FieldError {
  field: string;
  code: string;
  message: string;
  value?: unknown;
  constraints?: Record<string, unknown>;
}

/**
 * Validation error response with field-level details
 */
export interface ValidationErrorResponse extends BaseErrorResponse {
  error: BaseErrorResponse["error"] & {
    code: ApiErrorCode.VALIDATION_FAILED;
    fieldErrors?: FieldError[];
  };
}

/**
 * Rate limit error response with retry information
 */
export interface RateLimitErrorResponse extends BaseErrorResponse {
  error: BaseErrorResponse["error"] & {
    code: ApiErrorCode.RATE_LIMIT_EXCEEDED;
    retryAfter?: number; // seconds
    limit?: number;
    remaining?: number;
    reset?: string; // ISO timestamp
  };
}

/**
 * Authentication error response
 */
export interface AuthenticationErrorResponse extends BaseErrorResponse {
  error: BaseErrorResponse["error"] & {
    code:
      | ApiErrorCode.AUTHENTICATION_REQUIRED
      | ApiErrorCode.INVALID_CREDENTIALS
      | ApiErrorCode.TOKEN_EXPIRED;
    realm?: string;
    authenticationScheme?: string;
  };
}

/**
 * Resource error response
 */
export interface ResourceErrorResponse extends BaseErrorResponse {
  error: BaseErrorResponse["error"] & {
    code:
      | ApiErrorCode.RESOURCE_NOT_FOUND
      | ApiErrorCode.RESOURCE_ALREADY_EXISTS
      | ApiErrorCode.RESOURCE_CONFLICT;
    resourceType?: string;
    resourceId?: string;
  };
}

/**
 * Bitcoin/Blockchain error response
 */
export interface BlockchainErrorResponse extends BaseErrorResponse {
  error: BaseErrorResponse["error"] & {
    code:
      | ApiErrorCode.INVALID_ADDRESS
      | ApiErrorCode.INVALID_TRANSACTION
      | ApiErrorCode.INSUFFICIENT_FUNDS;
    txHash?: string;
    address?: string;
    requiredAmount?: number;
    availableAmount?: number;
  };
}

/**
 * Discriminated union of all error response types
 */
export interface ApiErrorResponse {
  status?: number;
  code?: string;
  timestamp?: string | number;
  [key: string]: any;
}

export type ApiErrorResponseType =
  | ValidationErrorResponse
  | RateLimitErrorResponse
  | AuthenticationErrorResponse
  | ResourceErrorResponse
  | BlockchainErrorResponse
  | BaseErrorResponse;

// HttpStatusToErrorCode mapping is imported from $constants

/**
 * Problem Details object following RFC 7807
 */
export interface ProblemDetails {
  type?: string; // URI reference
  title: string;
  status: HttpStatusCode;
  detail?: string;
  instance?: string; // URI reference
  [key: string]: unknown; // Extension members
}

/**
 * Error response factory type
 */
export type ErrorResponseFactory<
  T extends ApiErrorResponse = ApiErrorResponse,
> = {
  (error: Partial<T["error"]>): T;
};

/**
 * Generic error handler context
 */
export interface ErrorHandlerContext {
  request: {
    method: string;
    path: string;
    headers: Record<string, string>;
    query?: Record<string, unknown>;
    body?: unknown;
  };
  response: {
    statusCode: HttpStatusCode;
    headers: Record<string, string>;
  };
  error: Error | unknown;
}

/**
 * Error transformation function type
 */
export type ErrorTransformer = (
  error: unknown,
  context: ErrorHandlerContext,
) => ApiErrorResponse;

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

/**
 * Type guard for successful API responses
 */
export declare function isSuccessResponse<T>(
  response: ApiResponse<T>,
): response is { success: true; data: T };

/**
 * Type guard for error API responses
 */
export declare function isErrorResponse<T>(
  response: ApiResponse<T>,
): response is { success: false; error: ApiError };

/**
 * Type guard for paginated responses
 */
export declare function isPaginatedResponse<T>(
  response: any,
): response is PaginatedResponse<T>;

/**
 * Type guard for validation error responses
 */
export declare function isValidationError(
  response: ApiErrorResponse,
): response is ValidationErrorResponse;

/**
 * Type guard for rate limit error responses
 */
export declare function isRateLimitError(
  response: ApiErrorResponse,
): response is RateLimitErrorResponse;

/**
 * Type guard for authentication error responses
 */
export declare function isAuthenticationError(
  response: ApiErrorResponse,
): response is AuthenticationErrorResponse;

/**
 * Type guard for resource error responses
 */
export declare function isResourceError(
  response: ApiErrorResponse,
): response is ResourceErrorResponse;

/**
 * Type guard for blockchain error responses
 */
export declare function isBlockchainError(
  response: ApiErrorResponse,
): response is BlockchainErrorResponse;

// ============================================================================
// OPENAPI ENDPOINT REGISTRY
// ============================================================================

/**
 * Complete endpoint registry for stampchain.io API
 * Total: 74 endpoints (49 public v2, 23 internal, 2 proxy)
 */
export interface EndpointRegistry {
  "/api/v2/stamps": {
    GET: PaginatedStampResponseBody;
  };
  "/api/v2/stamps/:id": {
    GET: StampRow;
  };
  "/api/v2/stamps/:id/holders": {
    GET: Array<{ address: string; balance: number }>;
  };
  "/api/v2/stamps/:id/dispensers": {
    GET: PaginatedDispenserResponseBody;
  };
  "/api/v2/stamps/:id/dispenses": {
    GET: Array<{ tx_hash: string; quantity: number; destination: string }>;
  };
  "/api/v2/stamps/:id/sends": {
    GET: Array<SendRow>;
  };
  "/api/v2/stamps/block/:block_index": {
    GET: StampBlockResponseBody;
  };
  "/api/v2/stamps/ident/:ident": {
    GET: PaginatedStampResponseBody;
  };
  "/api/v2/src20": {
    GET: PaginatedSrc20ResponseBody;
  };
  "/api/v2/src20/tick/:tick": {
    GET: Src20ResponseBody;
  };
  "/api/v2/src20/balance/:address": {
    GET: PaginatedSrc20BalanceResponseBody;
  };
  "/api/v2/src20/balance/:address/:tick": {
    GET: Src20BalanceResponseBody;
  };
  "/api/v2/block/:block_index": {
    GET: BlockInfoResponseBody;
  };
  "/api/v2/health": {
    GET: HealthCheckResponse;
  };
  "/api/v2/version": {
    GET: VersionResponse;
  };
  "/api/v2/docs": {
    GET: DocsResponse;
  };
  "/api/v2/collections": {
    GET: CollectionResponse;
  };
  "/api/v2/src101/:deploy_hash": {
    GET: SRC101DeployResponse;
  };
  "/api/v2/src101/:deploy_hash/:tokenid": {
    GET: SRC101TokenResponse;
  };
  "/api/v2/src101/balance/:address": {
    GET: SRC101BalanceResponse;
  };
  "/api/v2/olga/estimate": {
    POST: OlgaEstimateResponse;
  };
  "/api/v2/olga/mint": {
    POST: OlgaMintResponse;
  };
  "/api/v2/trx/create_psbt": {
    POST: CreatePSBTResponse;
  };
  "/api/v2/trx/complete_psbt": {
    POST: CompletePSBTResponse;
  };
  "/api/v2/utxo/ancestors/:address": {
    GET: UTXOAncestorsResponse;
  };
  "/api/v2/versions/changelog": {
    GET: ChangelogResponse;
  };
  "/api/internal/mara-submit": {
    POST: MaraSubmitResponse;
  };
  "/api/internal/mara-health": {
    GET: MaraHealthResponse;
  };
  "/api/internal/mara-fee-rate": {
    GET: MaraFeeRateResponse;
  };
  "/api/internal/monitoring": {
    GET: MonitoringResponse;
  };
  "/api/internal/fees": {
    GET: FeeEstimateResponse;
  };
  "/api/internal/bitcoin-notifications": {
    POST: BitcoinNotificationsResponse;
  };
  "/api/proxy/arweave/*": {
    GET: ArweaveProxyResponse;
  };
  "/api/proxy/ordinals/*": {
    GET: OrdinalsProxyResponse;
  };
}

/**
 * Type helper to extract response type for an endpoint
 */
export type EndpointResponse<
  TPath extends keyof EndpointRegistry,
  TMethod extends keyof EndpointRegistry[TPath],
> = EndpointRegistry[TPath][TMethod];

// OpenAPITags is now imported from $constants

// ============================================================================
// Type Re-exports for Dependencies
// ============================================================================

/**
 * ResponseHeaders - Migrated from _middleware.ts
 */
export interface ResponseHeaders {
  "Timing-Allow-Origin": string;
  "Server-Timing": string;
  "Cache-Control"?: string;
  "Content-Type"?: string;
  "Location"?: string;
}

/**
 * LeatherSignPSBTResponse - Migrated from leather.ts
 */
export interface LeatherSignPSBTResponse {
  error?: string;
  result?: {
    hex?: string; // Signed PSBT in hex format
    txid?: string; // Transaction ID if broadcast
    cancelled?: boolean;
  };
}

/**
 * WithMarketDataResponse - Migrated from api.ts
 */
export interface WithMarketDataResponse<T, M> {
  data: T;
  marketData: M | null;
  marketDataMessage?: string;
  cacheInfo?: MarketDataCacheInfo;
}

/**
 * StampWithMarketDataResponse - Migrated from api.ts
 */
export interface StampWithMarketDataResponse
  extends WithMarketDataResponse<StampRow, StampMarketData> {
  // Additional stamp-specific fields can be added here
}

/**
 * SRC20WithMarketDataResponse - Migrated from api.ts
 */
export interface SRC20WithMarketDataResponse
  extends WithMarketDataResponse<SRC20Row, SRC20MarketData> {
  // Additional SRC-20-specific fields can be added here
}

/**
 * CollectionWithMarketDataResponse - Migrated from api.ts
 */
export interface CollectionWithMarketDataResponse
  extends WithMarketDataResponse<CollectionRow, CollectionMarketData> {
  stamps?: StampWithMarketDataResponse[];
}

/**
 * PaginatedMarketDataResponse - Migrated from api.ts
 */
export interface PaginatedMarketDataResponse<T> extends PaginatedResponse<T> {
  cacheInfo?: MarketDataCacheInfo;
  marketDataAvailable: number; // Count of items with market data
  marketDataUnavailable: number; // Count of items without market data
}

/**
 * BatchMarketDataResponse - Migrated from api.ts
 */
export interface BatchMarketDataResponse<T> {
  items: T[];
  summary: {
    totalItems: number;
    withMarketData: number;
    withoutMarketData: number;
    cacheStatus: CacheStatus;
    lastUpdated: Date;
  };
}

/**
 * MarketDataErrorResponse - Migrated from api.ts
 */
export interface MarketDataErrorResponse {
  error: string;
  code: string;
  assetId?: string;
  assetType?: "stamp" | "src20" | "collection";
  details?: {
    source?: string;
    lastAttempt?: Date;
    nextRetry?: Date;
  };
}

/**
 * MarketDataHealthResponse - Migrated from api.ts
 */
export interface MarketDataHealthResponse {
  cacheHealth: {
    stamp: {
      totalCached: number;
      fresh: number;
      stale: number;
      expired: number;
      lastUpdate: Date | null;
    };
    src20: {
      totalCached: number;
      fresh: number;
      stale: number;
      expired: number;
      lastUpdate: Date | null;
    };
    collection: {
      totalCached: number;
      fresh: number;
      stale: number;
      expired: number;
      lastUpdate: Date | null;
    };
  };
  sources: {
    name: string;
    status: "online" | "offline" | "degraded";
    lastSuccessfulFetch: Date | null;
    averageResponseTime: number;
  }[];
}

/**
 * ApiResponseWithMarketData - Migrated from api.ts
 */
export interface ApiResponseWithMarketData<T> {
  success: boolean;
  data: T;
  lastBlock: number;
  timestamp: Date;
  cacheInfo?: MarketDataCacheInfo;
}

/**
 * ApiErrorWithMarketContext - Migrated from api.ts
 */
export interface ApiErrorWithMarketContext {
  error: string;
  status: number;
  code: string;
  marketDataContext?: {
    assetId: string;
    assetType: "stamp" | "src20" | "collection";
    lastKnownData?: Date;
    suggestion?: string;
  };
}

/**
 * StampMarketDataResponse - Migrated from marketData.d.ts
 */
export interface StampMarketDataResponse {
  stamp: StampRow;
  marketData: StampMarketData | null;
  cacheStatus: CacheStatus;
  message?: string;
}

/**
 * SRC20MarketDataResponse - Migrated from marketData.d.ts
 */
export interface SRC20MarketDataResponse {
  token: SRC20Row;
  marketData: SRC20MarketData | null;
  cacheStatus: CacheStatus;
  message?: string;
}

/**
 * RecentSalesResponse - Migrated from marketData.d.ts
 */
export interface RecentSalesResponse {
  recentSales: RecentSaleData[];
  total: number;
  btcPriceUSD: number;
  metadata: {
    dayRange: number;
    lastUpdated: string;
  };
}

/**
 * PaginatedSrc101ResponseBody - Migrated from src101.d.ts
 */
export interface PaginatedSrc101ResponseBody {
  /** Last processed block */
  last_block: number;
  /** Current page number */
  page: number;
  /** Number of results per page */
  limit: number;
  /** Total number of pages */
  totalPages: number;
  /** Array of SRC-101 details */
  data: Src101Detail[];
}

/**
 * TotalSrc101ResponseBody - Migrated from src101.d.ts
 */
export interface TotalSrc101ResponseBody {
  /** Last processed block */
  last_block: number;
  /** Total count */
  data: number;
}

/**
 * TokenidSrc101ResponseBody - Migrated from src101.d.ts
 */
export interface TokenidSrc101ResponseBody {
  /** Last processed block */
  last_block: number;
  /** Current page number */
  page: number;
  /** Number of results per page */
  limit: number;
  /** Total number of pages */
  totalPages: number;
  /** Token ID data */
  data: string;
}

/**
 * StandardFeeResponse - Migrated from toolEndpointAdapter.ts
 */
export interface StandardFeeResponse {
  /** Transaction size in bytes */
  estimatedSize: number;
  /** Miner fee in satoshis */
  minerFee: number;
  /** Dust value for outputs in satoshis */
  dustValue: number;
  /** Total transaction cost in satoshis (includes miner fee + dust) */
  totalCost: number;
  /** Whether this is an estimate (always true for dryRun) */
  isEstimate: boolean;
  /** Method used for estimation */
  estimationMethod: string;
  /** Applied fee rate in sats/vB */
  feeRate: number;
  /** Optional detailed fee breakdown from the tool */
  feeDetails?: any;
  /** Optional change value in satoshis */
  changeValue?: number;
  /** Optional input value in satoshis */
  inputValue?: number;
}

/**
 * HttpResponse - Migrated from httpClient.ts
 */
export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  ok: boolean;
}

/**
 * HttpRequestConfig - Migrated from httpClient.ts
 */
export interface HttpRequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal; // Allow external abort signals
}

/**
 * PaginatedCollectionResponseBody - Migrated from collection.d.ts
 */
export interface PaginatedCollectionResponseBody {
  page: number;
  limit: number;
  totalPages: number;
  total: number;
  last_block: number;
  data: CollectionRow[];
}

/**
 * PaginatedCollectionWithMarketDataResponseBody - Migrated from collection.d.ts
 */
export interface PaginatedCollectionWithMarketDataResponseBody
  extends PaginatedCollectionResponseBody {
  data: CollectionWithOptionalMarketData[];
  marketDataSummary?: {
    collectionsWithData: number;
    collectionsWithoutData: number;
    cacheStatus: CacheStatus;
  };
}

/**
 * ApiResponseSchema - Migrated from src20Controller.backward-compatibility.test.ts
 */
export interface ApiResponseSchema {
  data: SRC20TokenSchema[];
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
  last_block?: number;
  [key: string]: any; // Allow additional response fields
}

/**
 * LegacyApiConsumer - Migrated from src20Controller.backward-compatibility.test.ts
 */
export interface LegacyApiConsumer {
  name: string;
  expectedFields: string[];
  forbiddenFields?: string[];
  version: string;
  validateResponse: (data: any) => boolean;
}

/**
 * MockResponse - Migrated from fixtureTestHelper.ts
 */
export interface MockResponse {
  rows: any[];
  rowCount: number;
  affectedRows?: number;
}

/**
 * SingleUTXOResponse - Migrated from quicknodeUTXOService.test.ts
 */
export interface SingleUTXOResponse {
  data?: UTXO;
  error?: string;
}

/**
 * UploadResponse - Migrated from DeployTool.tsx
 */
export interface UploadResponse extends APIResponse {
  url?: string;
}

/**
 * MintResponse - Migrated from StampingTool.tsx
 */
export interface MintResponse {
  hex: string;
  cpid: string;
  est_tx_size: number;
  input_value: number;
  total_dust_value: number;
  est_miner_fee: number;
  change_value: number;
  total_output_value: number;
  txDetails: TransactionInput[];
}

/**
 * MintRequest - Migrated from StampingTool.tsx
 */
export interface MintRequest {
  sourceWallet: string | undefined;
  qty: string;
  locked: boolean;
  filename: string;
  file: string;
  satsPerVB: number;
  service_fee: string | null;
  service_fee_address: string | null;
  assetName?: string;
  divisible: boolean;
  isPoshStamp: boolean;
  dryRun?: boolean;
  outputValue?: number; // MARA custom dust value
  maraFeeRate?: number; // MARA-specified fee rate
}

/**
 * CounterpartyApiManagerConfig - Migrated from xcpManagerDI.ts
 */
export interface CounterpartyApiManagerConfig {
  nodes: Array<{
    name: string;
    url: string;
  }>;
  defaultCacheTimeout: number;
  maxRetries: number;
  retryDelay: number;
  requestTimeout: number;
}

/**
 * CounterpartyApiManagerDependencies - Migrated from xcpManagerDI.ts
 */
export interface CounterpartyApiManagerDependencies {
  httpClient: HttpClient;
  cacheService: CacheService;
  logger: LoggerService;
  config: CounterpartyApiManagerConfig;
}

/**
 * MaraSubmissionResponse - Migrated from types.ts
 */
export interface MaraSubmissionResponse {
  /** Transaction ID of the submitted transaction */
  txid: string;

  /** Current status of the submission */
  status: "accepted" | "pending" | "rejected";

  /** Optional message with additional details */
  message?: string;

  /** Estimated blocks until confirmation */
  estimated_confirmation?: number;

  /** Pool priority level assigned */
  pool_priority?: number;

  /** Unix timestamp of submission */
  submission_time: number;

  /** Error code if submission failed */
  error_code?: string;
}

/**
 * MaraErrorResponse - Migrated from types.ts
 */
export interface MaraErrorResponse {
  /** Error message */
  error: string;

  /** HTTP status code */
  status: number;

  /** Optional error code for specific error types */
  code?: string;

  /** Optional additional error details */
  details?: Record<string, any>;
}

/**
 * APIResponse - Migrated from commonPools.ts
 */
export interface APIResponse {
  data?: any;
  status?: number;
  message?: string;
  timestamp?: number;
  reset(): void;
}

/**
 * EstimateSmartFeeResponse - Migrated from quicknodeService.ts
 */
export interface EstimateSmartFeeResponse {
  feerate?: number; // Fee rate in BTC/kB
  blocks?: number; // Number of blocks for which estimate is valid
  errors?: string[]; // Any errors encountered
}

/**
 * QuicknodeRPCRequest - Migrated from quicknodeServiceDI.ts
 */
export interface QuicknodeRPCRequest {
  id: number;
  jsonrpc: string;
  method: string;
  params: any[];
}

/**
 * QuicknodeRPCResponse - Migrated from quicknodeServiceDI.ts
 */
export interface QuicknodeRPCResponse<T = any> {
  id: number;
  jsonrpc: string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * EstimateSmartFeeResponse - Migrated from quicknodeServiceDI.ts
 */
export interface EstimateSmartFeeResponse {
  feerate?: number; // Fee rate in BTC/kB
  blocks?: number; // Number of blocks for which estimate is valid
  errors?: string[]; // Any errors encountered
}

/**
 * SingleUTXOResponse - Migrated from quicknodeUTXOService.ts
 */
export interface SingleUTXOResponse {
  data?: UTXO;
  error?: string;
}

/**
 * ApiResponseOptions - Migrated from apiResponseUtil.ts
 */
export interface ApiResponseOptions {
  status?: number;
  headers?: Record<string, string>;
  routeType?: RouteType;
  forceNoCache?: boolean;
}

/**
 * APIResponse - Migrated from apiResponseUtil.ts
 */
export interface APIResponse {
  success: boolean;
  message?: string;
  status?: number;
  error?: string;
  code?: string;
  details?: unknown;
}

/**
 * ResponseOptions - Migrated from responseUtil.ts
 */
export interface ResponseOptions {
  status?: number;
  headers?: Record<string, string>;
  routeType?: RouteType;
  forceNoCache?: boolean;
  raw?: boolean;
}

/**
 * StampResponseOptions - Migrated from responseUtil.ts
 */
export interface StampResponseOptions extends ResponseOptions {
  binary?: boolean;
  encoding?: string;
}

/**
 * WebResponseOptions - Migrated from webResponseUtil.ts
 */
export interface WebResponseOptions {
  status?: number;
  headers?: Record<string, string>;
  forceNoCache?: boolean;
  routeType?: RouteType;
  raw?: boolean;
}

/**
 * StampResponseOptions - Migrated from webResponseUtil.ts
 */
export interface StampResponseOptions extends WebResponseOptions {
  binary?: boolean;
  encoding?: string;
}

// These types are referenced by API types and need to be imported from their domains
// Import statements would be added here in a real implementation:
// import type { StampRow, StampBalance } from '$types/stamp.d.ts';
// import type { SRC20Balance, EnrichedSRC20Row, Src20Detail } from '$types/src20.d.ts';
// import type { SUBPROTOCOLS, STAMP_FILTER_TYPES, MintStatus } from '$types/base.d.ts';
// import type { BlockRow, SendRow, DispenserRow } from '$types/transaction.d.ts';
// import type { StampFilters } from '$types/stamp.d.ts';
// import type { Pagination } from '$types/pagination.d.ts';
