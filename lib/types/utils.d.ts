// Type imports for potential future use - keeping for reference
import { Buffer } from "buffer";

export type Falsy = false | 0 | "" | null | undefined;

/**
 * Type guard to check if a value is defined (not null or undefined)
 */
export declare function isDefined<T>(value: T | null | undefined): value is T;

/**
 * Type guard to check if a value is a valid number
 */
export declare function isValidNumber(value: unknown): value is number;

/**
 * Type guard to check if a value is a non-empty string
 */
export declare function isNonEmptyString(value: unknown): value is string;

/**
 * Safe number conversion with default value
 */
/**
 * Safe number conversion with default value and BigInt support
 */
export declare function safeNumberConvert(
  value: unknown,
  defaultValue?: number,
): number;

/**
 * Safe BigInt conversion with fallback
 */
/**
 * Safely convert a value to BigInt with configurable error handling
 * @param value Value to convert
 * @param options Configuration for conversion
 * @returns Converted BigInt value
 */
export declare function safeBigIntConvert(
  value: unknown,
  options?: {
    defaultValue?: bigint;
    throwOnInvalid?: boolean;
    fallbackToDefault?: boolean;
  },
): bigint;

/**
 * Type guard to check if a value is a valid BigInt
 * @param value Value to check
 * @returns Boolean indicating whether the value is a valid BigInt
 */
export declare function isValidBigInt(value: unknown): value is bigint;

/**
 * Utility function to create a BigInt conversion strategy
 * @param strategy Configuration for BigInt conversion
 * @returns A function that converts values to BigInt according to the strategy
 */
export declare function createBigIntConverter(strategy: {
  defaultValue?: bigint;
  throwOnInvalid?: boolean;
  fallbackToDefault?: boolean;
}): (value: unknown) => bigint;

/**
 * Safe string conversion with default value
 */
export declare function safeStringConvert(
  value: unknown,
  defaultValue?: string,
): string;

/**
 * Create a type-safe state updater wrapper
 * Supports literal types, function updaters, and direct value assignments
 */
export type StateUpdater<T> = T | ((prev: T) => T);

/**
 * Create a type-safe state updater wrapper
 * @template T The type of the state
 * @param setter The state setter function
 * @returns A function that accepts either a direct value or a function to update the state
 */
export declare function createStateUpdater<T>(
  setter: (value: T) => void,
): (value: StateUpdater<T>) => void;

/**
 * Type guard to check if a value is a state updater function
 * @template T The type of the state
 * @param value The value to check
 * @returns Whether the value is a state updater function
 */
export declare function isStateUpdaterFunction<T>(
  value: StateUpdater<T>,
): value is (prev: T) => T;

export interface TypeSafetyReport {
  totalTypes: number;
  coveragePercentage: number;
  safetyScore: number;
  criticalIssues: string[];
}

export interface TypeCoverageAnalysis {
  filesCovered: number;
  totalFiles: number;
  uncoveredFiles: string[];
  complexityRating: "low" | "medium" | "high";
}

export interface TypeSystemAlert {
  type: "warning" | "error" | "info";
  message: string;
  affectedFiles?: string[];
  suggestedFix?: string;
}

export interface CompilationMetrics {
  totalLines: number;
  typeAnnotationCoverage: number;
  errorCount: number;
  warningCount: number;
  compilationTime: number; // in milliseconds
}

// Missing type exports for ui.d.ts
export type AlignmentType = "left" | "center" | "right" | "justify";

export interface CompilerConfiguration {
  target: string;
  module: string;
  strict: boolean;
  skipLibCheck: boolean;
  [key: string]: unknown;
}

export interface FileCompilationMetrics {
  filePath: string;
  compilationTime: number;
  errorCount: number;
  warningCount: number;
  linesOfCode: number;
}

export interface MixedTypes {
  stringProp: string;
  numberProp: number;
  booleanProp: boolean;
  optionalProp?: string;
}

export type PickByValue<T, ValueType> = Pick<
  T,
  {
    [Key in keyof T]: T[Key] extends ValueType ? Key : never;
  }[keyof T]
>;

export type OmitByValue<T, ValueType> = Omit<
  T,
  {
    [Key in keyof T]: T[Key] extends ValueType ? Key : never;
  }[keyof T]
>;

export interface BaseToast {
  type: "success" | "error" | "warning" | "info";
  message: string;
  autoDismiss?: boolean;
  body?: import("preact").ComponentChildren;
}

export interface ProgressiveFeeEstimationResult {
  phase: "instant" | "smart" | "exact";
  feeRate: number;
  estimatedFee: number;
  confidence: number;
  timestamp: number;
}

export interface UTXOFromBlockCypher {
  tx_hash: string;
  block_height: number;
  tx_input_n: number;
  tx_output_n: number;
  value: number;
  ref_balance: number;
  spent: boolean;
  confirmations: number;
  confirmed: Date;
  double_spend: boolean;
  script: string;
  size: number;
}

/**
 * Utility type to create a branded/nominal type
 * Allows creating unique types that can't be implicitly assigned
 */
export type Brand<K, T> = K & { __brand: T };

/**
 * Deeply make all properties of a type optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deeply make all properties of a type required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Non-empty array type ensuring at least one element
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Convert a union type to an intersection type
 */
export type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I
    : never;

/**
 * Pagination information type
 */
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}

/**
 * Market data cache information
 */
export interface MarketDataCacheInfo {
  lastUpdated: number;
  cacheHits: number;
  cacheMisses: number;
  cacheSize: number;
}

/**
 * Optional configuration type
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Sorting configuration type
 */
export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

/**
 * Filter configuration type
 */
export interface FilterConfig {
  field: string;
  value: any;
  operator: "eq" | "ne" | "gt" | "lt" | "contains";
}

/**
 * Make all properties in a type pretty-printed/well-displayed in IDE
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
};

/**
 * Buffer-like type for compatibility with various buffer representations
 */
export type BufferLike = ArrayBuffer | Buffer | Uint8Array | ArrayLike<number>;

/**
 * BTC balance information options
 */
export interface BTCBalanceInfoOptions {
  includeUnconfirmed?: boolean;
  minConfirmations?: number;
  address?: string;
  includeUSD?: boolean;
}

/**
 * Date utility types and interfaces
 */
export interface DateUtils {
  formatDate(date: Date): string;
  parseDate(dateString: string): Date;
  isValidDate(date: any): boolean;
  getTimestamp(): number;
}

/**
 * Mock PSBT input for testing
 */
export interface MockPSBTInput {
  hash: string;
  index: number;
  witnessUtxo?: {
    script: Buffer;
    value: number;
  };
  nonWitnessUtxo?: Buffer;
}

/**
 * Number utility types and interfaces
 */
export interface NumberUtils {
  formatNumber(num: number): string;
  parseNumber(str: string): number;
  isValidNumber(value: any): boolean;
  clamp(value: number, min: number, max: number): number;
}

/**
 * Get all keys of T that are optional (have undefined in their type)
 */
export type PartialKeys<T> = {
  [K in keyof T]-?: Record<PropertyKey, never> extends Pick<T, K> ? K : never;
}[keyof T];

/**
 * Get all keys of T that are required (don't have undefined in their type)
 */
export type RequiredKeys<T> = {
  [K in keyof T]-?: Record<PropertyKey, never> extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * String utility types and interfaces
 */
export interface StringUtils {
  capitalize(str: string): string;
  slugify(str: string): string;
  truncate(str: string, length: number): string;
  isValidEmail(email: string): boolean;
}

/**
 * Type guard function type
 */
export type TypeGuard<T> = (value: any) => value is T;

/**
 * Validation function type
 */
export type ValidationFunction<T> = (value: T) => boolean | string;

/**
 * Domain validation result
 */
export interface DomainValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Activity level enumeration
 */
export type ActivityLevel = "low" | "medium" | "high" | "critical";

/**
 * Alert dashboard data interface
 */
export interface AlertDashboardData {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  criticalAlerts: number;
  recentAlerts: Array<{
    id: string;
    message: string;
    severity: ActivityLevel;
    timestamp: number;
  }>;
}

/**
 * Compilation dashboard data interface
 */
export interface CompilationDashboardData {
  totalFiles: number;
  compiledFiles: number;
  errorCount: number;
  warningCount: number;
  compilationTime: number;
  lastCompilation: number;
}

/**
 * Coverage dashboard data interface
 */
export interface CoverageDashboardData {
  totalLines: number;
  coveredLines: number;
  coveragePercentage: number;
  uncoveredFiles: string[];
  testFiles: number;
}

/**
 * Coverage statistics interface
 */
export interface CoverageStats {
  totalFiles: number;
  coveredFiles: number;
  percentage: number;
  lastUpdated: number;
}

/**
 * Coverage trend data
 */
export interface CoverageTrend {
  timestamp: number;
  coverage: number;
  fileCount: number;
  direction: "up" | "down" | "stable";
}

/**
 * File coverage information
 */
export interface FileCoverageInfo {
  filePath: string;
  coverage: number;
  lines: number;
  coveredLines: number;
  uncoveredLines: number[];
}

/**
 * Import pattern analysis result
 */
export interface ImportPatternAnalysis {
  totalImports: number;
  uniqueModules: number;
  circularDependencies: string[];
  unusedImports: string[];
  missingTypes: string[];
}

/**
 * System health summary
 */
export interface SystemHealthSummary {
  overall: ActivityLevel;
  typeSystem: ActivityLevel;
  compilation: ActivityLevel;
  testing: ActivityLevel;
  lastCheck: number;
}

/**
 * System insight data
 */
export interface SystemInsight {
  type: "performance" | "error" | "warning" | "suggestion";
  message: string;
  impact: ActivityLevel;
  actionable: boolean;
  fixSuggestion?: string;
}

/**
 * Test result interface
 */
export interface TestResult {
  name: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  error?: string;
}

/**
 * Trend data interface
 */
export interface TrendData {
  timestamp: number;
  value: number;
  label?: string;
}

/**
 * Type coverage statistics
 */
export interface TypeCoverageStats {
  totalTypes: number;
  annotatedTypes: number;
  inferredTypes: number;
  anyTypes: number;
  coveragePercentage: number;
}

/**
 * Type recommendation interface
 */
export interface TypeRecommendation {
  file: string;
  line: number;
  column: number;
  currentType: string;
  suggestedType: string;
  confidence: number;
  reason: string;
}

/**
 * Type safety regression interface
 */
export interface TypeSafetyRegression {
  file: string;
  previousVersion: string;
  currentVersion: string;
  regressionType: "type-loss" | "any-increase" | "error-increase";
  severity: ActivityLevel;
}

/**
 * Type safety violation interface
 */
export interface TypeSafetyViolation {
  file: string;
  line: number;
  violationType: "any-usage" | "type-assertion" | "missing-annotation";
  message: string;
  severity: ActivityLevel;
}

/**
 * Base transaction interface
 */
export interface BaseTransaction {
  id: string;
  timestamp: number;
  type: string;
  status: "pending" | "confirmed" | "failed";
}

/**
 * Database query result interface
 */
export interface DatabaseQueryResult<T = any> {
  data: T[];
  totalCount: number;
  pageInfo?: PaginationInfo;
  executionTime: number;
}

/**
 * Generic API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

/**
 * Bitcoin address format types
 */
export type BitcoinAddressFormat = "p2pkh" | "p2sh" | "bech32" | "taproot";

/**
 * Deep merge utility type
 */
export type DeepMerge<T, U> = {
  [K in keyof T | keyof U]: K extends keyof U
    ? K extends keyof T
      ? T[K] extends object ? U[K] extends object ? DeepMerge<T[K], U[K]>
        : U[K]
      : U[K]
    : U[K]
    : K extends keyof T ? T[K]
    : never;
};

/**
 * Fee estimate interface
 */
export interface FeeEstimate {
  feeRate: number;
  totalFee: number;
  confidence: number;
  estimatedBlocks: number;
}

/**
 * Transaction input interface
 */
export interface TransactionInput {
  txid: string;
  vout: number;
  scriptSig?: string;
  sequence?: number;
  witness?: string[];
}

/**
 * Address format mapping
 */
export interface AddressFormatMap {
  [key: string]: BitcoinAddressFormat;
}

/**
 * Address type guard function
 */
export type AddressTypeGuard = (address: string) => BitcoinAddressFormat | null;

/**
 * Address validation result
 */
export interface AddressValidationResult {
  isValid: boolean;
  format?: BitcoinAddressFormat;
  network?: "mainnet" | "testnet";
  error?: string;
}

/**
 * API error interface
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

/**
 * Extract array element type
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Type assertion utility
 */
export type AssertType<T, U extends T> = U;

/**
 * Async callback type
 */
export type AsyncCallback = () => Promise<void>;

/**
 * Async callback with parameter type
 */
export type AsyncCallbackWithParam<T> = (param: T) => Promise<void>;

/**
 * Balance options interface
 */
export interface BalanceOptions {
  includeUnconfirmed?: boolean;
  minConfirmations?: number;
  currency?: "BTC" | "sats";
}

/**
 * Binary data type
 */
export type BinaryData = ArrayBuffer | Uint8Array | Buffer;

/**
 * Bitcoin network type
 */
export type BitcoinNetwork = "mainnet" | "testnet" | "regtest";

/**
 * Callback type
 */
export type Callback = () => void;

/**
 * Callback with parameter type
 */
export type CallbackWithParam<T> = (param: T) => void;

/**
 * Type casting utility
 */
export type Cast<T, U> = T extends U ? T : U;

/**
 * Deep readonly utility type
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Discriminated union helper
 */
export type DiscriminatedUnion<T, K extends keyof T> = T extends any
  ? { [P in K]: T[P] } & T
  : never;

/**
 * Environment configuration interface
 */
export interface EnvironmentConfig {
  NODE_ENV: "development" | "production" | "test";
  [key: string]: string | undefined;
}

/**
 * Event handler type
 */
export type EventHandler<T = Event> = (event: T) => void;

/**
 * Exhaustive check utility
 */
export type ExhaustiveCheck<T extends never> = T;

/**
 * Fee calculation options interface
 */
export interface FeeCalculationOptions {
  priority: "low" | "medium" | "high";
  includeChange?: boolean;
  customFeeRate?: number;
}

/**
 * Filter operator type
 */
export type FilterOperator =
  | "eq"
  | "ne"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "contains"
  | "startsWith"
  | "endsWith";

/**
 * Get first element of tuple
 */
export type Head<T extends readonly any[]> = T extends
  readonly [infer H, ...any[]] ? H : never;

/**
 * Check if type is any
 */
export type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Check if type is never
 */
export type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Check if type is unknown
 */
export type IsUnknown<T> = IsAny<T> extends true ? false
  : unknown extends T ? true
  : false;

/**
 * Get keys of T that have type U
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Get last element of tuple
 */
export type Last<T extends readonly any[]> = T extends
  readonly [...any[], infer L] ? L : never;

/**
 * Maybe type (T or undefined)
 */
export type Maybe<T> = T | undefined;

/**
 * Make readonly properties mutable
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Nullable type (T or null)
 */
export type Nullable<T> = T | null;

/**
 * Convert nullable properties to optional
 */
export type NullableToOptional<T> = {
  [K in keyof T]: null extends T[K] ? T[K] | undefined : T[K];
};

/**
 * Make specific keys partial
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Pick only required properties
 */
export type PickRequired<T> = Pick<T, RequiredKeys<T>>;

/**
 * Extract resolved value from Promise
 */
export type PromiseValue<T> = T extends Promise<infer U> ? U : T;

/**
 * Query parameters interface
 */
export interface QueryParams {
  [key: string]: string | string[] | undefined;
}

/**
 * Extract return type from function
 */
export type ReturnTypeOf<T> = T extends (...args: any[]) => infer R ? R : never;

/**
 * Safe property access type
 */
export type SafeGet<T, K extends keyof T> = T[K] extends undefined ? never
  : T[K];

/**
 * Bitcoin script types
 */
export type ScriptType =
  | "p2pk"
  | "p2pkh"
  | "p2sh"
  | "p2wpkh"
  | "p2wsh"
  | "p2tr";

/**
 * Sort order type
 */
export type SortOrder = "asc" | "desc";

/**
 * Get all elements except the first from tuple
 */
export type Tail<T extends readonly any[]> = T extends
  readonly [any, ...infer R] ? R : [];

/**
 * UTXO selection strategy type
 */
export type UTXOSelectionStrategy =
  | "fifo"
  | "lifo"
  | "largest"
  | "smallest"
  | "optimal";

/**
 * Extract values from object type
 */
export type ValuesOf<T> = T[keyof T];

/**
 * Baseline statistics interface
 */
export interface BaselineStatistics {
  mean: number;
  median: number;
  standardDeviation: number;
  min: number;
  max: number;
  count: number;
}
