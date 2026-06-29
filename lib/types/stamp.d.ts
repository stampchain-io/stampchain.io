/**
 * Bitcoin Stamps Protocol Type Definitions
 *
 * This module contains all type definitions related to Bitcoin Stamps protocol
 * including stamp data structures, classification types, validation interfaces,
 * and protocol compliance types.
 *
 * @version Bitcoin Stamps Protocol v2.0+
 * @reference https://github.com/mikeinspace/stamps/blob/main/spec.md
 */

import type { StampDispenserActivityLevel } from "$constants";
import type {
  BasicUTXO,
  BlockRow,
  FeeDetails,
  ScriptType,
  SUBPROTOCOLS,
  TransactionInput,
  TransactionOutput,
  UTXO,
} from "$types/base.d.ts";
import type { CacheStatus } from "$types/marketData.d.ts";

import type { CollectionRow } from "$server/types/collection.d.ts";
import type {
  ConnectionPoolStatistics,
  RelationDefinition,
} from "$server/types/database.d.ts";
import type { StandardFeeResponse } from "$types/api.d.ts";
import type { TransactionOptions } from "$types/base.d.ts";
import type { ComposeAttachOptions } from "$types/services.d.ts";
import type { SortKey, SortMetrics } from "$types/sorting.d.ts";
import type { DetailedUTXO } from "$types/transaction.d.ts";
import type { PaginationState } from "$types/ui.d.ts";
import type {
  AlertDashboardData,
  CompilationDashboardData,
  CompilationMetrics,
  CoverageDashboardData,
  CoverageStats,
  CoverageTrend,
  FileCoverageInfo,
  SystemHealthSummary,
  SystemInsight,
  TestResult,
  TrendData,
  TypeRecommendation,
  TypeSafetyReport,
} from "$types/utils.d.ts";
import type { Wallet } from "$types/wallet.d.ts";

// Temporary definition until properly exported from utils.d.ts
interface PerformanceRegression {
  type: string;
  endpoint?: string;
  metric: string;
  baseline: number;
  current: number;
  regression: number;
  severity: "critical" | "warning";
}
// Re-export Collection type for backward compatibility
export type Collection = CollectionRow;

// ============================================================================
// STAMP PROTOCOL ENUMS AND BASIC TYPES
// ============================================================================

// Import stamp type constants
import type {
  HandlerStampType,
  StampEdition,
  StampFilesize,
  StampFiletype,
  StampMarketplace,
  StampRange,
  StampType,
} from "$constants";

/**
 * Bitcoin Stamps protocol subprotocol identifier
 * Maps to the ident field in stamp data
 * @deprecated Use StampType from constants instead
 */
export type STAMP_TYPES = StampType;

// Stamp constants moved to lib/constants/stampConstants.ts

// ============================================================================
// STAMP CLASSIFICATION AND VALIDATION TYPES
// ============================================================================

/**
 * Import and re-export stamp-related enums from constants
 * Following single-source-of-truth pattern
 */
import {
  ProtocolComplianceLevel,
  StampClassification,
  StampErrorCode,
  StampProtocolVersion,
  StampRarity,
  StampStatus,
  StampTransactionType,
  StampValidationStatus,
} from "$constants";

export {
  ProtocolComplianceLevel,
  StampClassification,
  StampErrorCode,
  StampProtocolVersion,
  StampRarity,
  StampStatus,
  StampTransactionType,
  StampValidationStatus,
};

/**
 * Legacy type alias for backward compatibility
 * @deprecated Use StampClassification enum instead
 */
export type CursedTypes = StampClassification;

/**
 * Comprehensive stamp metadata interface
 * Contains all metadata associated with a stamp beyond core blockchain data
 */
export interface StampMetadata {
  // Classification
  classification: StampClassification;
  rarity?: StampRarity;
  status: StampStatus;
  validationStatus: StampValidationStatus;

  // Content metadata
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  collection?: string;

  // Technical metadata
  encoding: string;
  compressionRatio?: number;
  originalSize?: number;
  optimizedSize?: number;

  // Protocol metadata
  protocolVersion: string;
  indexingRules: string[];
  validationRules: string[];

  // Timestamps
  createdAt: Date;
  validatedAt?: Date;
  lastUpdated: Date;
}

/**
 * Stamp protocol compliance interface
 * Defines the compliance status of a stamp with various protocol rules
 */
export interface StampProtocolCompliance {
  // Core protocol compliance
  isValidBase64: boolean;
  followsSizeRules: boolean;
  hasValidMimetype: boolean;
  usesCorrectPrefix: boolean;

  // Indexing compliance
  isProperlyIndexed: boolean;
  hasCorrectTimestamp: boolean;
  hasValidTransaction: boolean;

  // Classification compliance
  meetsClassificationRules: boolean;
  classificationReason?: string;

  // Overall compliance score (0-100)
  complianceScore: number;

  // Detailed compliance report
  complianceDetails: {
    rule: string;
    passed: boolean;
    message?: string;
  }[];
}

/**
 * Stamp validation result interface
 * Contains the result of validating a stamp against protocol rules
 */
export interface StampValidationResult {
  // Validation outcome
  isValid: boolean;
  status: StampValidationStatus;

  // Validation details
  validatedAt: Date;
  validatedBy?: string; // Validator identifier

  // Compliance information
  compliance: StampProtocolCompliance;

  // Validation errors and warnings
  errors: StampValidationError[];
  warnings: StampValidationWarning[];

  // Performance metrics
  validationTime: number; // milliseconds

  // Additional context
  context?: {
    blockHeight: number;
    networkFees: number;
    protocolVersion: string;
  };
}

/**
 * Stamp validation error interface
 */
export interface StampValidationError {
  code: string;
  message: string;
  severity: "critical" | "major" | "minor";
  field?: string;
  expectedValue?: any;
  actualValue?: any;
  suggestion?: string;
}

/**
 * Stamp validation warning interface
 */
export interface StampValidationWarning {
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
  canIgnore: boolean;
}

/**
 * Stamp size validation interface
 * Validates stamp content size according to protocol rules
 */
export interface StampSizeValidation {
  // Size limits
  maxSizeBytes: number;
  actualSizeBytes: number;
  isWithinLimit: boolean;

  // Compression analysis
  originalSize?: number;
  compressionRatio?: number;
  suggestedOptimizations?: string[];

  // Size category
  sizeCategory: StampFilesize;
}

/**
 * Stamp content validation interface
 * Validates stamp content format and encoding
 */
export interface StampContentValidation {
  // Format validation
  isValidFormat: boolean;
  detectedMimeType: string;
  expectedMimeType: string;

  // Encoding validation
  isValidBase64: boolean;
  encodingErrors?: string[];

  // Content analysis
  hasValidHeaders: boolean;
  isCorrupted: boolean;
  contentHash: string;

  // Security checks
  hasVulnerabilities: boolean;
  securityIssues?: string[];
}

/**
 * Extended stamp interface with validation data
 * Combines core stamp data with validation results
 */
export interface ValidatedStamp extends StampRow {
  // Validation results
  validation: StampValidationResult;

  // Enhanced metadata
  metadata: StampMetadata;

  // Size and content validation
  sizeValidation: StampSizeValidation;
  contentValidation: StampContentValidation;

  // Classification details
  classificationDetails: {
    algorithm: string;
    confidence: number;
    factors: string[];
  };
}

/**
 * Stamp collection validation interface
 * For validating groups or collections of stamps
 */
export interface StampCollectionValidation {
  // Collection metadata
  collectionId: string;
  totalStamps: number;
  validStamps: number;
  invalidStamps: number;

  // Validation summary
  overallValid: boolean;
  validationPercentage: number;

  // Individual results
  stampValidations: Map<string, StampValidationResult>;

  // Collection-level issues
  collectionErrors: StampValidationError[];
  collectionWarnings: StampValidationWarning[];

  // Performance metrics
  totalValidationTime: number;
  averageValidationTime: number;
}

// ============================================================================
// BITCOIN TRANSACTION RELATIONSHIP TYPES
// ============================================================================

/**
 * Stamp transaction relationship interface
 * Defines the relationship between a stamp and its Bitcoin transaction
 */
export interface StampTransactionRelationship {
  // Core relationship data
  stampId: string;
  txHash: string;
  blockIndex: number;
  blockTime: Date;

  // Transaction position
  txIndex: number;
  outputIndex?: number; // For stamps embedded in specific outputs

  // Relationship type
  relationshipType: StampTransactionType;

  // Confirmation status
  confirmations: number;
  isConfirmed: boolean;

  // Fee information
  totalFees: number;
  feeRate: number; // satoshis per byte

  // Transaction size and weight
  transactionSize: number;
  transactionWeight?: number;
  virtualSize?: number;
}

/**
 * Types of stamp-transaction relationships - This needs cleanup before implementation
 */

/**
 * Stamp UTXO reference interface
 * References specific UTXOs that contain stamp data
 */
export interface StampUTXOReference {
  // UTXO identification
  utxo: UTXO;

  // Stamp data embedded in this UTXO
  stampData: {
    base64Data: string;
    dataSize: number;
    encoding: string;
  };

  // Output script information
  scriptType: ScriptType;
  scriptData: string;

  // Spending status
  isSpent: boolean;
  spentInTx?: string;
  spentAtHeight?: number;
}

/**
 * Bitcoin transaction parsing context for stamps
 * Contains information needed to parse stamps from Bitcoin transactions
 */
export interface StampTransactionParsingContext {
  // Transaction data
  txHash: string;
  rawTransaction: string;
  blockHeight: number;
  blockTime: Date;

  // Parsing configuration
  protocolVersion: string;
  parsingRules: string[];

  // Input analysis
  inputs: StampTransactionInput[];

  // Output analysis
  outputs: StampTransactionOutput[];

  // Parsing results
  detectedStamps: StampParsingResult[];

  // Validation context
  validationContext: {
    networkFees: number;
    blockReward: number;
    difficultyTarget: number;
  };
}

/**
 * Stamp-specific transaction input interface
 * Extends base transaction input with stamp-specific data
 */
export interface StampTransactionInput extends TransactionInput {
  // Stamp-related data
  containsStampData: boolean;
  stampDataSize?: number;

  // Source information
  sourceAddress?: string;
  sourceStamp?: string; // If this input spends a stamp UTXO

  // Validation
  isValidStampInput: boolean;
  validationErrors?: string[];
}

/**
 * Stamp-specific transaction output interface
 * Extends base transaction output with stamp-specific data
 */
export interface StampTransactionOutput extends TransactionOutput {
  // Stamp-related data
  containsStampData: boolean;
  stampData?: {
    base64Content: string;
    mimeType: string;
    dataSize: number;
  };

  // Destination information
  destinationAddress?: string;

  // Validation
  isValidStampOutput: boolean;
  validationErrors?: string[];
}

/**
 * Result of parsing a transaction for stamp data
 */
export interface StampParsingResult {
  // Parsing outcome
  success: boolean;
  foundStamps: number;

  // Detected stamp data
  stamps: {
    stampNumber?: number;
    cpid: string;
    base64Data: string;
    mimeType: string;
    creator: string;
    locked: boolean;
    divisible: boolean;
    supply: number;
  }[];

  // Parsing errors and warnings
  errors: string[];
  warnings: string[];

  // Performance metrics
  parsingTime: number; // milliseconds

  // Additional context
  parserVersion: string;
  parsingRules: string[];
}

/**
 * Stamp blockchain confirmation tracking
 * Tracks confirmation status and block position of stamps
 */
export interface StampConfirmationTracker {
  // Confirmation data
  txHash: string;
  blockHash: string;
  blockHeight: number;
  blockPosition: number;

  // Confirmation counts
  confirmations: number;
  requiredConfirmations: number;
  isFullyConfirmed: boolean;

  // Timestamps
  firstSeenAt: Date;
  confirmedAt?: Date;

  // Network status
  networkHeight: number;
  isReorgRisk: boolean;

  // Confirmation events
  confirmationEvents: {
    timestamp: Date;
    confirmationCount: number;
    blockHash: string;
    eventType: "confirmed" | "reorg" | "deep_reorg";
  }[];
}

/**
 * Stamp transaction fee analysis
 * Analyzes fee structure and optimization for stamp transactions
 */
export interface StampTransactionFeeAnalysis {
  // Fee breakdown
  totalFees: number;
  baseFee: number;
  stampDataFee: number; // Additional fees for stamp data
  priorityFee?: number;

  // Fee rates
  feeRate: number; // satoshis per byte
  effectiveFeeRate: number; // considering stamp data weight

  // Size analysis
  baseTransactionSize: number;
  stampDataSize: number;
  totalSize: number;

  // Fee optimization
  isOptimalFee: boolean;
  suggestedFeeRate?: number;
  potentialSavings?: number;

  // Market context
  networkFeeRate: number;
  feeRatePercentile: number; // Where this fee ranks in current mempool
}

// ============================================================================
// CORE STAMP DATA INTERFACES
// ============================================================================

/**
 * Core stamp data interface representing a Bitcoin stamp
 * This is the main data structure for stamps in the protocol
 *
 * @interface StampRow
 * @description Contains all essential stamp properties including blockchain data,
 * content information, and optional market data
 */
export interface StampRow {
  // Core stamp identification
  stamp: number | null;
  cpid: string;
  ident: SUBPROTOCOLS;

  // Blockchain data
  block_index: number;
  block_time: Date;
  tx_hash: string;
  tx_index: number;

  // Creator information
  creator: string;
  creator_name: string | null;

  // Stamp properties
  divisible: boolean;
  keyburn: number | null;
  locked: number;
  supply: number;

  // Content data
  stamp_base64: string;
  stamp_mimetype: string;
  stamp_url: string;
  stamp_hash: string;
  file_hash: string;
  file_size_bytes: number | null;

  // Market data (optional)
  floorPrice?: number | "priceless";
  marketCap?: number | "priceless";
  balance?: number | string;
  floorPriceUSD?: number | null;
  marketCapUSD?: number | null;
  recentSalePrice?: number | "priceless";
  unbound_quantity: number;

  // Sale information (optional)
  sale_data?: {
    btc_amount: number;
    block_index: number;
    tx_hash: string;
  };

  // Extended fields (optional)
  asset_longname?: string | null;
  message_index?: number | null;
  src_data?: any | null;
  is_btc_stamp?: number | null;
  is_reissue?: number | null;
  is_valid_base64?: number | null;

  // Activity tracking (marketplace context)
  activity_level?: StampDispenserActivityLevel | null;
}

/**
 * Stamp balance information for wallet displays
 */
export interface StampBalance {
  cpid: string;
  stamp: number;
  stamp_base64: string;
  stamp_url: string;
  stamp_mimetype: string;
  tx_hash: string;
  divisible: 0 | 1;
  supply: number | string;
  locked: 0 | 1 | boolean;
  creator: string;
  creator_name: string | null;
  balance: number | string;
  // Market data pricing fields - added for backward compatibility
  floorPrice?: number | "priceless";
  recentSalePrice?: number | "priceless";
}

/**
 * Extended stamp interface that includes optional market data
 * Used when stamps are fetched with market data from the cache
 */
export interface StampWithOptionalMarketData {
  // All standard stamp fields would be inherited from StampRow
  stamp?: number | null;
  block_index: number;
  cpid: string;
  creator: string;
  divisible: number;
  keyburn?: number | null;
  locked: number;
  stamp_base64: string;
  stamp_mimetype: string;
  stamp_url: string;
  supply?: number | null;
  tx_hash: string;
  tx_index: number;
  ident: string;
  creator_name?: string | null;
  stamp_hash: string;
  file_hash: string;

  // Optional market data fields - contains all pricing/market information
  marketData?: StampMarketData | null;
  marketDataMessage?: string;
  cacheStatus?: CacheStatus;
  cacheAgeMinutes?: number;
}

// ============================================================================
// STAMP FILTERING AND SEARCH INTERFACES
// ============================================================================

/**
 * Comprehensive stamp filtering interface
 * Used for filtering stamps in gallery views and API queries
 */
export interface StampFilters {
  // Market Place filters
  market: Extract<StampMarketplace, "listings" | "sales"> | "";
  dispensers: boolean;
  atomics: boolean;

  // Listings price range
  listings:
    | Extract<
      StampMarketplace,
      "all" | "bargain" | "affordable" | "premium" | "custom"
    >
    | "";
  listingsMin: string;
  listingsMax: string;

  // SALES options
  sales:
    | Extract<StampMarketplace, "recent" | "premium" | "custom" | "volume">
    | "";
  salesMin: string;
  salesMax: string;

  // Volume (for trending sales)
  volume: "24h" | "7d" | "30d" | "";
  volumeMin: string;
  volumeMax: string;

  // Other existing filters
  fileType: StampFiletype[];
  fileSize: StampFilesize | null;
  fileSizeMin: string;
  fileSizeMax: string;
  editions: StampEdition[];
  range: StampRange | null;
  rangeMin: string;
  rangeMax: string;

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

  [key: string]: any; // Keep index signature for flexibility
}

// ============================================================================
// UI COMPONENT INTERFACES
// ============================================================================

/**
 * Display count breakpoints for responsive design
 */
export interface DisplayCountBreakpoints {
  "mobileSm": number; // 360px+
  "mobileMd"?: number; // 568
  "mobileLg": number; // 768px+
  "tablet": number; // 1024px+
  "desktop": number; // 1440px+
}

/**
 * Props interface for stamp gallery components
 */

/**
 * Dispenser interface for stamp dispensers
 */
export interface Dispenser extends DispenserRow {
  /** Simplified UI-friendly properties */
  ui_price: number; // Calculated from satoshirate/btcrate
  ui_quantity: number; // Mapped from give_quantity/give_remaining
  ui_status: "active" | "inactive" | "depleted";
  ui_created_at: string; // Derived from tx_hash or block_index
  dispensed_count?: number;
}

// ============================================================================
// STAMP OPERATION INTERFACES (Legacy)
// ============================================================================

/**
 * @deprecated Legacy interface for stamp transfers
 * Consider migrating to transaction.d.ts for transaction-specific operations
 */
export interface stampTransferData {
  sourceWallet: string;
  destinationWallet: string;
  assetName: string;
  qty: number;
  divisible: boolean;
  satsPerKB: number;
}

/**
 * @deprecated Legacy interface for stamp minting
 * Consider migrating to transaction.d.ts for transaction-specific operations
 */
export interface stampMintData {
  sourceWallet: string;
  destinationWallet?: string;
  assetName?: string;
  base64Data: string;
  qty: number;
  locked: boolean;
  divisible: boolean;
  satsPerKB: number;
  file?: unknown;
}

// ============================================================================
// API RESPONSE INTERFACES - MOVED TO api.d.ts
// ============================================================================

// NOTE: All API response interfaces have been moved to api.d.ts to eliminate duplication
// Import API response types from api.d.ts:
// - PaginatedStampResponseBody
// - PaginatedIdResponseBody
// - PaginatedStampBalanceResponseBody
//
// These types are now centralized in api.d.ts as the single source of truth

// NOTE: StampPageProps moved to api.d.ts to centralize page prop types
// Import from api.d.ts: StampPageProps

// ============================================================================
// STAMP NUMBER VALIDATION AND PROTOCOL TYPES
// ============================================================================

/**
 * Stamp number validation configuration
 * Defines validation rules for stamp numbering
 */
export interface StampNumberValidationConfig {
  // Numbering rules
  minStampNumber: number;
  maxStampNumber?: number;
  allowZero: boolean;
  requireSequential: boolean;

  // Validation strictness
  strictMode: boolean;
  allowGaps: boolean;

  // Protocol-specific rules
  protocolVersion: string;
  validationRules: StampNumberValidationRule[];
}

/**
 * Individual stamp number validation rule
 */
export interface StampNumberValidationRule {
  // Rule identification
  ruleId: string;
  ruleName: string;
  description: string;

  // Rule parameters
  minValue?: number;
  maxValue?: number;
  pattern?: string; // Regex pattern

  // Rule behavior
  isRequired: boolean;
  severity: "error" | "warning" | "info";

  // Custom validation function reference
  validatorFunction?: string;
}

/**
 * Stamp number validation result
 */
export interface StampNumberValidationResult {
  // Basic validation
  isValid: boolean;
  stampNumber: number;

  // Detailed results
  passedRules: string[];
  failedRules: string[];
  warnings: string[];

  // Context
  validatedAt: Date;
  protocolVersion: string;

  // Suggestions
  suggestedCorrections?: number[];
  nextAvailableNumber?: number;
}

// StampProtocolVersion enum moved to constants/stampConstants.ts

// ProtocolComplianceLevel enum moved to constants/stampConstants.ts

/**
 * Comprehensive protocol compliance interface
 * Tracks compliance with Bitcoin Stamps protocol across all aspects
 */
export interface ComprehensiveProtocolCompliance {
  // Overall compliance
  overallLevel: ProtocolComplianceLevel;
  compliancePercentage: number; // 0-100

  // Version compatibility
  protocolVersion: StampProtocolVersion;
  isVersionCompatible: boolean;
  supportedVersions: StampProtocolVersion[];

  // Detailed compliance areas
  numberingCompliance: {
    level: ProtocolComplianceLevel;
    validStampNumbers: number;
    invalidStampNumbers: number;
    gapCount: number;
    duplicateCount: number;
  };

  contentCompliance: {
    level: ProtocolComplianceLevel;
    validContent: number;
    invalidContent: number;
    corruptedContent: number;
  };

  transactionCompliance: {
    level: ProtocolComplianceLevel;
    validTransactions: number;
    invalidTransactions: number;
    malformedTransactions: number;
  };

  // Compliance history
  lastAuditDate: Date;
  complianceHistory: {
    date: Date;
    level: ProtocolComplianceLevel;
    percentage: number;
    notes?: string;
  }[];
}

/**
 * Stamp indexing configuration
 * Defines how stamps should be indexed and organized
 */
export interface StampIndexingConfig {
  // Indexing strategy
  indexingStrategy: "sequential" | "hash-based" | "hybrid";

  // Index fields
  primaryKeys: string[];
  secondaryKeys: string[];

  // Search optimization
  enableFullTextSearch: boolean;
  searchFields: string[];

  // Performance settings
  batchSize: number;
  indexingInterval: number; // milliseconds

  // Storage optimization
  compressionEnabled: boolean;
  retentionPolicy: {
    maxAge: number; // days
    maxCount: number;
    archiveOld: boolean;
  };
}

/**
 * Search optimization types for stamp queries
 */
export interface StampSearchOptimization {
  // Query optimization
  useIndexes: boolean;
  cacheResults: boolean;
  cacheTTL: number; // seconds

  // Performance hints
  expectedResultSize: "small" | "medium" | "large";
  queryComplexity: "simple" | "moderate" | "complex";

  // Search parameters
  searchFields: string[];
  filters: Record<string, any>;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";

  // Pagination
  offset?: number;
  limit?: number;

  // Advanced features
  fuzzySearch?: boolean;
  relevanceScoring?: boolean;
  highlightMatches?: boolean;
}

/**
 * Stamp protocol creation rules
 * Defines rules for creating new stamps according to protocol
 */
export interface StampCreationRules {
  // Content rules
  maxContentSize: number; // bytes
  allowedMimeTypes: string[];
  requiredFields: string[];

  // Numbering rules
  numberingStrategy: "auto" | "manual" | "reserved";
  numberReservation?: {
    reservedRanges: { start: number; end: number }[];
    reservationExpiry: Date;
  };

  // Validation requirements
  requireValidation: boolean;
  validationTimeout: number; // seconds

  // Fee requirements
  minimumFee: number; // satoshis
  feeCalculationMethod: "fixed" | "size-based" | "dynamic";

  // Protocol compliance
  enforceCompliance: boolean;
  complianceLevel: ProtocolComplianceLevel;
}

// ============================================================================
// TYPE GUARDS AND VALIDATION UTILITIES
// ============================================================================

/**
 * Type guard to check if a value is a valid stamp number
 */
export declare function isValidStampNumber(value: unknown): value is number;

/**
 * Type guard to check if a value is a valid CPID
 */
export declare function isValidCPID(value: unknown): value is string;

/**
 * Type guard to check if a stamp has market data
 */
export declare function hasMarketData(stamp: StampRow): stamp is StampRow & {
  floorPrice: number | "priceless";
  marketCap: number | "priceless";
};

/**
 * Type guard to check if a value is a valid stamp classification
 */
export declare function isValidStampClassification(
  value: unknown,
): value is StampClassification;

/**
 * Type guard to check if a stamp is blessed (not cursed)
 */
export declare function isBlessed(
  stamp: { classification?: StampClassification },
): boolean;

/**
 * Type guard to check if a stamp is cursed
 */
export declare function isCursed(
  stamp: { classification?: StampClassification },
): boolean;

/**
 * Type guard to check if a stamp validation result indicates a valid stamp
 */
export declare function isValidStamp(
  result: StampValidationResult,
): result is StampValidationResult & {
  isValid: true;
  compliance: StampProtocolCompliance;
};

/**
 * Type guard to check if a protocol version is supported
 */
export declare function isSupportedProtocolVersion(
  version: string,
): version is StampProtocolVersion;

/**
 * Type guard to check if a compliance level meets minimum requirements
 */
export declare function meetsComplianceRequirements(
  compliance: ProtocolComplianceLevel,
  minimum?: ProtocolComplianceLevel,
): boolean;

/**
 * StampControllerData - Migrated from index.tsx
 */
export interface StampControllerData {
  carouselStamps: StampRow[];
  stamps_src721: StampRow[];
  stamps_art: StampRow[];
  stamps_posh: StampRow[];
  collectionData: Collection[];
}

/**
 * WalletContext - Migrated from wallet.ts
 */
export interface WalletContext {
  readonly wallet: Wallet;
  readonly isConnected: boolean;
  updateWallet: (wallet: Wallet) => void;
  getBasicStampInfo: (address: string) => Promise<any>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<any>;
  signPSBT: (
    wallet: Wallet,
    psbt: string,
    inputsToSign: any[],
    enableRBF?: boolean,
    sighashTypes?: number[],
    autoBroadcast?: boolean,
  ) => Promise<any>;
  broadcastRawTX: (rawTx: string) => Promise<any>;
  broadcastPSBT: (psbtHex: string) => Promise<any>;
  showConnectModal: () => void;
}

/**
 * StampWithSaleData - Migrated from StampCard.tsx
 */
export interface StampWithSaleData extends Omit<StampRow, "stamp_base64"> {
  sale_data?: {
    btc_amount: number;
    block_index: number;
    tx_hash: string;
  };
  stamp_base64?: string;
}

// StampErrorCode enum moved to constants/stampConstants.ts

/**
 * UTXOCache - Migrated from fee-estimation.ts
 */
export interface UTXOCache {
  /** Wallet address this cache belongs to */
  walletAddress: string;
  /** Cached UTXO data */
  utxos: BasicUTXO[];
  /** Cache creation timestamp */
  timestamp: number;
  /** Time-to-live in milliseconds (default: 30 seconds) */
  ttl: number;
  /** Number of times this cache has been accessed */
  accessCount: number;
  /** Last access timestamp for LRU eviction */
  lastAccessed: number;
}

/**
 * ProgressiveFeeEstimationResult - Migrated from fee-estimation.ts
 */
export interface ProgressiveFeeEstimationResult extends FeeDetails {
  /** Which estimation phase produced this result */
  phase: "instant" | "smart" | "exact";
  /** Whether this came from cache */
  cacheHit?: boolean;
  /** Time taken for this estimation in milliseconds */
  estimationTime?: number;
  /** Timestamp when this result was generated */
  timestamp?: number;
  /** Confidence level (0-100) */
  confidence?: number;
  /** Selected UTXOs for this estimation (Phase 2/3 only) */
  selectedUtxos?: BasicUTXO[] | DetailedUTXO[];
  /** Transaction size breakdown */
  sizeBreakdown?: {
    inputs: number;
    outputs: number;
    overhead: number;
    witness: number;
  };
}

/**
 * WalletData - Migrated from index.d.ts
 */
export interface WalletData {
  balance: number;
  usdValue: number;
  address: string;
  btcPrice: number;
  fee: number;
  txCount: number;
  unconfirmedBalance: number;
  unconfirmedTxCount: number;
  stampValue: number;
  dispensers: {
    open: number;
    closed: number;
    total: number;
    items: unknown[]; // Simplified to avoid circular dependencies
  };
}

/**
 * MarketListingSummary - Migrated from marketData.d.ts
 */
export interface MarketListingSummary {
  tick: string;
  floor_price_btc: number | null; // ✅ v2.3 standardized field
  market_cap_btc: number; // ✅ v2.3 standardized field
  volume_7d_btc: number | null; // ✅ v2.3 extended field (was sum_7d)
  volume_3d_btc: number | null; // ✅ v2.3 extended field (was sum_3d)
  volume_24h_btc: number | null; // ✅ v2.3 standardized field (was sum_1d)
  stamp_url: string | null;
  tx_hash: string;
  holder_count: number;
}

/**
 * OpenStampMarketData - Migrated from marketData.d.ts
 */
export interface OpenStampMarketData {
  tokenId: number;
  name: string; // emoji tick
  totalSupply: number;
  holdersCount: number;
  price: string; // in satoshis
  amount24: string;
  volume_24h_btc: string; // ✅ v2.3 standardized field (was volume24, in satoshis)
  volume_24h_change: string; // ✅ v2.3 standardized field (was volume24Change)
  change_24h: string; // ✅ v2.3 standardized field (was change24)
  change_7d: string; // ✅ v2.3 standardized field (was change7d)
}

/**
 * StampScanMarketData - Migrated from marketData.d.ts
 */
export interface StampScanMarketData {
  tick: string; // emoji tick
  floor_price_btc: number | null; // ✅ v2.3 standardized field (was floor_unit_price)
  market_cap_btc: number; // ✅ v2.3 standardized field (was mcap)
  volume_7d_btc: number | null; // ✅ v2.3 extended field (was sum_7d)
  volume_3d_btc: number | null; // ✅ v2.3 extended field (was sum_3d)
  volume_24h_btc: number | null; // ✅ v2.3 standardized field (was sum_1d)
  stamp_url: string | null;
  tx_hash: string;
  holder_count: number;
}

/**
 * MarketListingAggregated - Migrated from marketData.d.ts
 */
export interface MarketListingAggregated {
  tick: string;
  price_btc?: number | null; // ✅ v2.3 field for fungible SRC-20 tokens
  floor_price_btc: number | null; // ✅ v2.3 standardized field (for NFTs, lower of stampscan/openstamp)
  market_cap_btc: number; // ✅ v2.3 standardized field (computed on lower price * totalSupply)
  volume_24h_btc: number; // ✅ v2.3 standardized field (sum of volumes)
  volume_7d_btc?: number; // ✅ v2.3 extended field
  volume_30d_btc?: number; // ✅ v2.3 extended field
  change_24h_percent?: number | undefined; // ✅ v2.3 standardized field (24h price change percentage)
  stamp_url?: string | null;
  tx_hash: string;
  holder_count: number; // use stampscan holder_count value

  // 🔄 BACKWARD COMPATIBILITY: Legacy field names (DEPRECATED - use standardized names above)
  floor_unit_price?: number | null; // @deprecated Use floor_price_btc
  mcap?: number; // @deprecated Use market_cap_btc
  volume24?: number; // @deprecated Use volume_24h_btc
  change_24h?: number | undefined; // @deprecated Use change_24h_percent
  change24?: number | undefined; // @deprecated Use change_24h_percent

  market_data: {
    stampscan: {
      price: number; // floor_price_btc
      volume_24h_btc: number; // ✅ v2.3 standardized field (was volume24)
    };
    openstamp: {
      price: number; // price
      volume_24h_btc: number; // ✅ v2.3 standardized field (was volume24)
    };
  };
}

/**
 * StampMarketDataRow - Migrated from marketData.d.ts
 */
export interface StampMarketDataRow {
  cpid: string;
  floor_price_btc: string | null;
  recent_sale_price_btc: string | null;
  open_dispensers_count: number;
  closed_dispensers_count: number;
  total_dispensers_count: number;
  holder_count: number;
  unique_holder_count: number;
  top_holder_percentage: string;
  holder_distribution_score: string;
  volume_24h_btc: string;
  volume_7d_btc: string;
  volume_30d_btc: string;
  total_volume_btc: string;
  price_source: string | null;
  volume_sources: string | null; // JSON string
  data_quality_score: string;
  confidence_level: string;
  last_updated: Date;
  last_price_update: Date | null;
  update_frequency_minutes: number;
  // New transaction detail fields
  last_sale_tx_hash: string | null;
  last_sale_buyer_address: string | null;
  last_sale_dispenser_address: string | null;
  last_sale_btc_amount: string | null; // BIGINT stored as string (satoshis)
  last_sale_dispenser_tx_hash: string | null;
  last_sale_block_index: number | null;
  // Activity tracking fields
  activity_level: StampDispenserActivityLevel | null;
  last_activity_time: number | null; // Unix timestamp
}

/**
 * CollectionMarketDataRow - Migrated from marketData.d.ts
 */
export interface CollectionMarketDataRow {
  collection_id: string;
  min_floor_price_btc: string | null;
  max_floor_price_btc: string | null;
  avg_floor_price_btc: string | null;
  median_floor_price_btc: string | null;
  total_volume_24h_btc: string;
  stamps_with_prices_count: number;
  min_holder_count: number;
  max_holder_count: number;
  avg_holder_count: string;
  median_holder_count: number;
  total_unique_holders: number;
  avg_distribution_score: string;
  total_stamps_count: number;
  last_updated: Date;
}

/**
 * StampMarketData - Migrated from marketData.d.ts
 */
export interface StampMarketData {
  cpid: string;
  floorPriceBTC: number | null;
  recentSalePriceBTC: number | null;
  lastPriceBTC: number; // Calculated best price (fallback hierarchy: floorPriceBTC > recentSalePriceBTC > defaults)
  walletValueBTC: number; // Total portfolio value (quantity × lastPriceBTC)
  openDispensersCount: number;
  closedDispensersCount: number;
  totalDispensersCount: number;
  holderCount: number;
  uniqueHolderCount: number;
  topHolderPercentage: number;
  holderDistributionScore: number; // 0-100
  volume24hBTC: number;
  volume7dBTC: number;
  volume30dBTC: number;
  totalVolumeBTC: number;
  priceSource: string | null;
  volumeSources: Record<string, number> | null;
  dataQualityScore: number; // 0-10
  confidenceLevel: number; // 0-10
  lastUpdated: Date;
  lastPriceUpdate: Date | null;
  updateFrequencyMinutes: number;
  // New transaction detail fields
  lastSaleTxHash: string | null;
  lastSaleBuyerAddress: string | null;
  lastSaleDispenserAddress: string | null;
  lastSaleBtcAmount: number | null; // Converted from satoshis to BTC
  lastSaleDispenserTxHash: string | null;
  lastSaleBlockIndex: number | null;
  // Activity tracking fields
  activityLevel: StampDispenserActivityLevel | null;
  lastActivityTime: number | null; // Unix timestamp
}

/**
 * CollectionMarketData - Migrated from marketData.d.ts
 * Matches actual collection_market_data table columns
 */
export interface CollectionMarketData {
  collectionId: string;
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
  lastUpdated: Date;
}

/**
 * StampHolderCacheRow - Migrated from marketData.d.ts
 */
export interface StampHolderCacheRow {
  id: number;
  cpid: string;
  address: string;
  quantity: string; // DECIMAL(20,8) stored as string
  percentage: string; // DECIMAL(5,2) stored as string
  rank_position: number;
  last_updated: Date;
}

/**
 * StampHolderCache - Migrated from marketData.d.ts
 */
export interface StampHolderCache {
  id: number;
  cpid: string;
  address: string;
  quantity: number;
  percentage: number;
  rankPosition: number;
  lastUpdated: Date;
}

/**
 * StampWithMarketData - Migrated from marketData.d.ts
 */
export interface StampWithMarketData extends StampRow {
  marketData: StampMarketData | null;
  marketDataMessage?: string;
  cacheStatus?: CacheStatus;
  cacheAgeMinutes?: number;
}

/**
 * CollectionWithMarketData - Migrated from marketData.d.ts
 */
export interface CollectionWithMarketData {
  collection: CollectionRow;
  stamps: StampWithMarketData[];
  aggregatedMarketData: CollectionMarketData | null;
}

/**
 * RecentSaleData - Migrated from marketData.d.ts
 */
export interface RecentSaleData {
  // Stamp information
  cpid: string;
  stamp: number;
  stampUrl: string;
  stampMimetype: string;
  creator: string;
  creatorName?: string;

  // Sale transaction details
  sale: {
    priceBtc: number;
    priceUsd: number;
    timestamp: string;
    timeAgo: string;
    txHash: string;
    buyerAddress: string;
    dispenserAddress?: string;
    btcAmountSatoshis: number;
    blockNumber: number;
    dispenserTxHash?: string;
  };
}

/**
 * StampWithEnhancedSaleData - Migrated from marketData.d.ts
 */
export interface StampWithEnhancedSaleData extends StampRow {
  sale_data?: {
    btc_amount: number;
    block_index: number;
    tx_hash: string;
    buyer_address?: string;
    dispenser_address?: string;
    time_ago?: string;
    btc_amount_satoshis?: number;
    dispenser_tx_hash?: string;
  };
  marketData?: StampMarketData;
  activity_level?: StampDispenserActivityLevel | null;
  last_activity_time?: number;
}

/**
 * Dispenser - Migrated from services.d.ts
 */
export interface DispenserRow {
  tx_hash: string;
  block_index: number;
  source: string;
  cpid: string;
  give_quantity: number;
  give_remaining: number;
  escrow_quantity: number;
  satoshirate: number;
  btcrate: number;
  origin: string;
  confirmed: boolean;
  close_block_index: number | null;
  status: "open" | "closed" | "unknown";
  asset_info?: any;
  dispenser_info?: any;
  stamp?: StampRow | null;
}

/**
 * DispenseEvent - Migrated from services.d.ts
 */
export interface DispenseEvent {
  event_index: number;
  event: "DISPENSE";
  params: {
    asset: string;
    block_index: number;
    btc_amount: number;
    destination: string;
    dispense_index: number;
    dispense_quantity: number;
    dispenser_tx_hash: string;
    source: string;
    tx_hash: string;
    tx_index: number;
  };
  tx_hash: string;
  block_index: number;
  timestamp: string | null;
}

/**
 * QueueMessage - Migrated from services.d.ts
 */
export interface QueueMessage<T = unknown> {
  id: string;
  data: T;
  timestamp: string;
  deliveryCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * StampTransactionOptions - Migrated from toolEndpointAdapter.ts
 */
export interface StampTransactionOptions extends TransactionOptions {
  /** Base64 encoded file data */
  file: string;
  /** Original filename */
  filename: string;
  /** File size in bytes */
  fileSize: number;
  /** Quantity to mint */
  quantity: number;
  /** Whether asset is locked */
  locked: boolean;
  /** Whether asset is divisible */
  divisible: boolean;
  /** Custom output value for MARA mode (optional) */
  outputValue?: number;

  // Optional dispense-specific properties for stamp purchases
  /** Dispenser source address (for purchases) */
  dispenserSource?: string;
  /** Purchase quantity in satoshis (for purchases) */
  purchaseQuantity?: string;
}

/**
 * SendRow - Migrated from transaction.d.ts
 */
export interface SendRow {
  /** Source address of the send */
  source: string;
  /** Destination address of the send */
  destination: string;
  /** Counterparty asset ID (if applicable) */
  cpid?: string | null;
  /** SRC-20 tick name (if applicable) */
  tick?: string | null;
  /** Transaction memo/description */
  memo?: string;
  /** Quantity being sent (string or bigint for precision) */
  quantity: string | bigint;
  /** Transaction hash */
  tx_hash: string;
  /** Block index where transaction was confirmed */
  block_index: number;
  /** Satoshi rate at time of transaction */
  satoshirate?: number | null;
  /** Block timestamp */
  block_time: Date;
}

/**
 * BlockInfo - Migrated from transaction.d.ts
 */
export interface BlockInfo {
  /** Basic block information */
  block_info: BlockRow;
  /** All stamp/asset issuances in this block */
  issuances: StampRow[];
  /** All send transactions in this block */
  sends: SendRow[];
}

export interface StampSaleRow {
  stamp_number: number;
  cpid: string;
  seller: string;
  buyer: string;
  price_btc: number;
  timestamp: Date;
  tx_hash: string;
  block_index: number;
  source_address?: string;
  destination_address?: string;
}

/**
 * MintStampInputData - Migrated from transaction.d.ts
 */
export interface MintStampInputData {
  /** Source wallet address for the mint */
  sourceWallet: string;
  /** Optional custom name for the asset */
  assetName?: string;
  /** Quantity to mint */
  qty: number;
  /** Whether the asset should be locked after minting */
  locked: boolean;
  /** Whether the asset is divisible */
  divisible: boolean;
  /** Filename of the stamp content */
  filename: string;
  /** File content (base64 encoded or file data) */
  file: string;
  /** Fee rate in satoshis per kilobyte */
  satsPerKB: number;
  /** Service fee amount in satoshis */
  service_fee: number;
  /** Address to receive the service fee */
  service_fee_address: string;
}

/**
 * StampHandlerConfig - Migrated from sharedStampHandler.ts
 * @deprecated Use HandlerStampType from constants instead
 */
export type StampHandlerConfig = {
  type: HandlerStampType;
  isIndex: boolean;
};

/**
 * StampData - Migrated from [id].tsx
 */
export interface StampData {
  stamp: StampRow & { name?: string };
  total: number;
  sends: any;
  dispensers: any;
  dispenses: any;
  holders: any[];
  vaults: any;
  last_block: number;
  stamps_recent: any;
  lowestPriceDispenser: any;
  htmlTitle?: string;
  error?: string;
  url: string;
}

/**
 * TestResults - Migrated from test-image.ts
 */
export interface TestResults {
  config?: {
    BASE_URL: string;
    IMAGES_SRC_PATH?: string;
  };
  stampchainTests: TestResult[];
  proxyTests: TestResult[];
  corsTests: {
    get: TestResult;
    post: TestResult;
    options: TestResult;
  };
}

/**
 * ColumnDefinition - Migrated from server.type.test.ts
 */
export interface ColumnDefinition {
  type:
    | "INT"
    | "BIGINT"
    | "TINYINT"
    | "SMALLINT"
    | "MEDIUMINT"
    | "DECIMAL"
    | "NUMERIC"
    | "FLOAT"
    | "DOUBLE"
    | "VARCHAR"
    | "CHAR"
    | "TEXT"
    | "MEDIUMTEXT"
    | "LONGTEXT"
    | "DATE"
    | "TIME"
    | "DATETIME"
    | "TIMESTAMP"
    | "BINARY"
    | "VARBINARY"
    | "BLOB"
    | "MEDIUMBLOB"
    | "LONGBLOB"
    | "JSON"
    | "ENUM"
    | "SET"
    | "BOOLEAN";
  nullable?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  autoIncrement?: boolean;
  default?: unknown;
  length?: number;
  precision?: number;
  scale?: number;
  comment?: string;
  collation?: string;
}

/**
 * Model - Migrated from server.type.test.ts
 */
export interface Model<T> {
  tableName: string;
  primaryKey: string;
  fillable: (keyof T)[];
  guarded: (keyof T)[];
  hidden: (keyof T)[];
  casts: { [K in keyof T]?: "string" | "number" | "boolean" | "date" | "json" };
  timestamps: boolean;
  createdAt?: string;
  updatedAt?: string;
  relations: { [key: string]: RelationDefinition };
}

/**
 * StampTableSchema - Migrated from server.type.test.ts
 */
export interface StampTableSchema {
  stamp_number: number;
  tx_hash: string;
  tx_index: number;
  block_index: number;
  creator: string;
  stamp_base64: string;
  stamp_url: string;
  stamp_mimetype: string;
  is_btc_stamp: boolean;
  supply: number;
  locked: boolean;
  divisible: boolean;
  stamp_hash: string;
  creator_name?: string | null;
  cpid: string;
  keyburn: boolean;
  ident: string;
  is_cursed: boolean;
  is_reissuance: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * TransactionTableSchema - Migrated from server.type.test.ts
 */
export interface TransactionTableSchema {
  id: number;
  tx_hash: string;
  block_index: number;
  block_hash: string;
  timestamp: Date;
  source: string;
  destination?: string | null;
  btc_amount: number;
  fee: number;
  data?: string | null;
  supported: boolean;
  order_index: number;
  tx_index: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * QueryPerformanceMetrics - Migrated from server.type.test.ts
 */
export interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  rowsAffected: number;
  rowsExamined: number;
  indexesUsed: string[];
  warnings: Array<{
    level: "Note" | "Warning" | "Error";
    code: number;
    message: string;
  }>;
  timestamp: Date;
  connectionId: string;
  database: string;
  user: string;
}

/**
 * DatabaseHealthCheck - Migrated from server.type.test.ts
 */
export interface DatabaseHealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  responseTime: number;
  uptime: number;
  connections: ConnectionPoolStatistics;
  performance: {
    queriesPerSecond: number;
    averageQueryTime: number;
    slowQueries: number;
    cacheHitRatio: number;
    bufferPoolUsage: number;
    indexEfficiency: number;
  };
  storage: {
    totalSize: number;
    dataSize: number;
    indexSize: number;
    freeSpace: number;
    growthRate: number;
    fragmentation: number;
  };
  lastCheck: Date;
  checks: Array<{
    name: string;
    status: "healthy" | "degraded" | "unhealthy";
    message: string;
    responseTime: number;
    timestamp: Date;
  }>;
}

/**
 * PerformanceMetrics - Migrated from src20Controller.performance.test.ts
 */
export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpuTime: number;
  timestamp: number;
}

/**
 * StampTestCase - Migrated from createStampTransaction.test.ts
 */
export interface StampTestCase {
  name: string;
  input: {
    sourceWallet: string;
    qty: string;
    locked: boolean;
    filename: string;
    file: string;
    satsPerVB?: number;
    satsPerKB?: number;
    assetName?: string;
    service_fee?: number;
    service_fee_address?: string;
    dryRun?: boolean;
  };
  expectedOutputs: {
    dataOutputCount?: number;
    cpidPrefix?: string;
    errorPattern?: RegExp; // For error test cases
  };
}

/**
 * BTCPriceData - Migrated from btcPriceService.test.ts
 */
export interface BTCPriceData {
  price: number;
  source: "quicknode" | "coingecko" | "binance" | "cached" | "default";
  confidence: "high" | "medium" | "low";
  timestamp: number;
  details?: unknown;
  fallbackUsed?: boolean;
  errors?: string[];
}

/**
 * TestErrorInfo - Migrated from sorting-error-boundaries.test.ts
 */
export interface TestErrorInfo {
  context: string;
  details?: string;
  timestamp: Date;
}

/**
 * StampMarketData - Migrated from stampMarketData.test.ts
 */
export interface StampMarketData {
  cpid: string;
  floor_price_btc: number | null;
  recent_sale_price_btc: number | null;
  holder_count: number;
  volume_24h_btc: number;
  volume_sources: string | null;
  data_quality_score: number;
  last_updated: Date;
}

/**
 * StampWithMarketData - Migrated from stampMarketData.test.ts
 */
export interface StampWithTestMarketData {
  cpid: string;
  marketData: {
    floorPriceBTC: number | null;
    floorPriceUSD: number | null;
    holderCount: number;
    cacheStatus: "fresh" | "stale" | "expired";
  } | null;
  marketDataMessage?: string;
}

/**
 * MockStampOptions - Migrated from stampService.comprehensive.test.ts
 */
export interface MockStampOptions {
  _shouldThrow?: boolean;
  identifier?: string | string[];
  creatorAddress?: string;
  limit?: number;
  page?: number;
  includeMarketData?: boolean;
  type?: string;
}

/**
 * TypeCheckResult - Migrated from realtime-type-checker.ts
 */
export interface TypeCheckResult {
  timestamp: number;
  filePath: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  duration: number;
  memoryUsage: number;
}

/**
 * ValidationParams - Migrated from StampingTool.tsx
 */
export interface ValidationParams {
  file: File | null;
  fileError: string;
  issuanceError: string;
  stampNameError: string;
  isPoshStamp: boolean;
  stampName: string;
  addressError: string | undefined;
}

/**
 * HealthMonitorReport - Migrated from typeSystemHealthMonitor.ts
 */
export interface HealthMonitorReport {
  /** Report generation timestamp */
  timestamp: number;
  /** Overall health status */
  status: "healthy" | "warning" | "critical";
  /** Health score (0-100) */
  healthScore: number;
  /** Individual component reports */
  components: {
    compilation?: CompilationMetrics;
    typeSafety?: TypeSafetyReport;
    coverage?: TypeCoverageAnalysis;
  };
  /** Active alerts count */
  activeAlerts: number;
  /** Performance summary */
  performance: {
    monitoringOverhead: number;
    analysisTime: number;
    lastFullAnalysis: number;
  };
  /** Recommendations for improvement */
  recommendations: string[];
}

/**
 * StampPageData - Migrated from create.tsx
 */
export interface StampPageData {
  latestStamps: StampRow[];
}

/**
 * AssertStampClassification - Migrated from typeAssertions.ts
 */
export type AssertStampClassification<T> = T extends string ? T : never;

/**
 * MARATransactionEstimateConfig - Migrated from maraTransactionSizeEstimator.ts
 */
export interface MARATransactionEstimateConfig {
  // Input configuration
  inputs: Array<{
    type: ScriptType;
    isWitness?: boolean;
  }>;

  // Stamp-specific parameters
  fileSize: number; // Size of the file in bytes
  outputValue: number; // Dust value per P2WSH output (1-333)

  // Service fee configuration
  includeServiceFee: boolean;
  serviceFeeType?: ScriptType;

  // Change output
  includeChangeOutput: boolean;
  changeOutputType?: ScriptType;

  // MARA specific
  isMaraMode: boolean;
  maraFeeRate: number; // sats/vB
}

/**
 * CacheEntry - Migrated from ToolEndpointFeeEstimator.ts
 */
export interface CacheEntry {
  response: StandardFeeResponse;
  timestamp: number;
  expiresAt: number;
}

/**
 * UTXOCache - Migrated from TransactionConstructionService.ts
 */
export interface UTXOCache {
  walletAddress: string;
  utxos: BasicUTXO[];
  timestamp: number;
  ttl: number; // 30 seconds
}

/**
 * StorageData - Migrated from localStorage.ts
 */
export interface StorageData<T extends SortKey = SortKey> {
  version: number;
  timestamp: string;
  sortBy: T;
  direction: "asc" | "desc";
  metrics?: SortMetrics;
  metadata?: {
    userAgent?: string;
    url?: string;
    sessionId?: string;
  };
}

/**
 * TypeSystemAlert - Migrated from typeSystemAlertManager.ts
 */
export interface TypeSystemAlert {
  /** Unique alert identifier */
  id: string;
  /** Alert type */
  type:
    | "compilation_performance"
    | "type_safety"
    | "coverage_degradation"
    | "regression_detected";
  /** Severity level */
  severity: "critical" | "high" | "medium" | "low";
  /** Alert title */
  title: string;
  /** Detailed alert message */
  message: string;
  /** Timestamp when alert was created */
  timestamp: number;
  /** Source data that triggered the alert */
  sourceData:
    | CompilationMetrics
    | TypeSafetyReport
    | TypeCoverageAnalysis
    | PerformanceRegression;
  /** Affected files or components */
  affectedComponents: string[];
  /** Suggested remediation actions */
  remediation: string[];
  /** Alert status */
  status: "active" | "acknowledged" | "resolved" | "suppressed";
  /** Escalation information */
  escalation: {
    level: number;
    lastEscalated: number | null;
    acknowledgedBy?: string;
    resolvedBy?: string;
  };
  /** Notification history */
  notifications: NotificationRecord[];
}

/**
 * NotificationRecord - Migrated from typeSystemAlertManager.ts
 */
export interface NotificationRecord {
  /** Notification timestamp */
  timestamp: number;
  /** Notification target */
  target: string;
  /** Notification method */
  method: "webhook" | "email" | "slack";
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * DashboardData - Migrated from typeSystemDashboard.ts
 */
export interface DashboardData {
  /** Dashboard generation timestamp */
  timestamp: number;
  /** Overall system health summary */
  healthSummary: SystemHealthSummary;
  /** Compilation performance metrics */
  compilationMetrics: CompilationDashboardData;
  /** Type safety metrics */
  typeSafetyMetrics: TypeSafetyReport;
  /** Type coverage metrics */
  coverageMetrics: CoverageDashboardData;
  /** Active alerts */
  activeAlerts: AlertDashboardData;
  /** Historical trends */
  trends: TrendData;
  /** Performance insights and recommendations */
  insights: SystemInsight[];
}

/**
 * TimeSeriesData - Migrated from typeSystemDashboard.ts
 */
export interface TimeSeriesData {
  timestamp: number;
  value: number;
  label?: string;
}

/**
 * FeeAlert - Migrated from monitoring.ts
 */
export interface FeeAlert {
  id: string;
  type:
    | "source_failure"
    | "high_failure_rate"
    | "slow_response"
    | "fallback_usage";
  source: string;
  message: string;
  timestamp: number;
  severity: "low" | "medium" | "high" | "critical";
  resolved: boolean;
}

/**
 * TypeCoverageAnalysis - Migrated from coverageAnalyzer.ts
 */
export interface TypeCoverageAnalysis {
  /** Analysis timestamp */
  timestamp: number;
  /** Overall coverage statistics */
  overall: CoverageStats;
  /** Coverage by directory */
  byDirectory: Record<string, CoverageStats>;
  /** Coverage by file type */
  byFileType: Record<string, CoverageStats>;
  /** Files with lowest coverage */
  lowCoverageFiles: FileCoverageInfo[];
  /** Type annotation recommendations */
  recommendations: TypeRecommendation[];
  /** Trend analysis compared to previous runs */
  trend?: CoverageTrend;
}

/**
 * StampAttachInput - Migrated from stampattach.ts
 */
export interface StampAttachInput {
  address: string;
  identifier: string; // cpid, stamp number, or tx_hash
  quantity: number;
  options:
    & Omit<ComposeAttachOptions, "inputs_set" | "fee_per_kb" | "sat_per_vbyte">
    & {
      fee_per_kb?: number; // Kept for backward compatibility if client sends it
      satsPerVB?: number; // Preferred fee rate input
      service_fee?: number; // Optional service fee amount in sats
      service_fee_address?: string; // Optional service fee address
      allow_unconfirmed_inputs?: boolean; // For sequence number
    };
  inputs_set?: string; // txid:vout format - moved to top level for clarity
  service_fee?: number; // Allow top-level override
  service_fee_address?: string; // Allow top-level override
}

/**
 * Type guard for stamp transaction relationships
 */
export declare function isValidStampTransaction(
  relationship: StampTransactionRelationship,
): relationship is StampTransactionRelationship & {
  isConfirmed: true;
  confirmations: number;
};

// ============================================================================
// STAMP GALLERY AND UI COMPONENT PROPS
// ============================================================================

/**
 * Display variant for StampCard and gallery components.
 * - "image"                         : thumbnail only, no footer
 * - "imagePill"                     : thumbnail + supply overlay pill (bottom-right)
 * - "imageDetailExplorer"           : full footer + BTC icon overlay if listed
 * - "imageDetailMarketplaceListings": full footer + buy button row
 * - "imageDetailMarketplaceSales"   : full footer + sale price + time ago row
 * - "imageDetailHomeSales"          : minimal footer (stamp# + price pill)
 */
export type StampCardVariant =
  | "image"
  | "imagePill"
  | "imageDetailExplorer"
  | "imageDetailMarketplaceListings"
  | "imageDetailMarketplaceSales"
  | "imageDetailHomeSales";

/**
 * Props for StampGallery component
 */
export interface StampGalleryProps {
  title?: string;
  subTitle?: string;
  type?: string;
  stamps: StampRow[];
  layout?: "grid" | "list";
  isRecentSales?: boolean;
  filterBy?: string;
  variant?: StampCardVariant;
  gridClass?: string;
  displayCounts?: any;
  pagination?: any;
  viewAllLink?: string;
  alignRight?: boolean;
  fromPage?: string;
  sortBy?: "ASC" | "DESC";
}

/**
 * Props for StampGalleryWallet component
 */
export interface StampGalleryWalletProps {
  initialData: StampRow[];
  initialPagination: PaginationState;
  address?: string;
  initialSort?: string;
  enablePartialNavigation?: boolean;
  showLoadingSkeleton?: boolean;
  gridClass?: string;
  variant?: StampCardVariant;
}

/**
 * Props for StampOverviewGallery component
 */
export interface StampOverviewGalleryProps {
  stamps_src721?: StampRow[];
  stamps_art?: StampRow[];
  stamps_posh?: StampRow[];
  collectionData?: CollectionRow[];
}

/**
 * Backward compatibility alias
 */
export type StampDetail = StampData;

/**
 * Represents a time range for filtering or analyzing stamp-related data
 */
export type Timeframe =
  | "24h"
  | "24H"
  | "7d"
  | "7D"
  | "30d"
  | "30D"
  | "90d"
  | "90D"
  | "all"
  | "ALL"
  | {
    start: Date | string;
    end: Date | string;
  };
