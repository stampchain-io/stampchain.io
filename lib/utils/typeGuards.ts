/**
 * Centralized Type Guards Module for BTC Stamps Explorer
 *
 * This module consolidates all production-quality type guards for:
 * - Bitcoin protocol validation (addresses, transactions, UTXOs)
 * - SRC-20 token protocol validation
 * - Bitcoin Stamps protocol validation
 * - Error type discrimination
 *
 * Performance optimizations:
 * - Regex patterns compiled once and cached
 * - Early returns for invalid inputs
 * - Minimal object property access
 * - Type predicates for optimal TypeScript narrowing
 *
 * @module typeGuards
 * @version 1.0.0
 */

// Import types
import type {
  APIError,
  AuthenticationError,
  AuthorizationError,
  BitcoinError,
  NetworkError,
  SRC20Error,
  StampError,
  ValidationError,
} from "../types/errors.d.ts";
import type { Wallet, WalletConnectionResult } from "../types/wallet.d.ts";
import type { WalletProviderKey } from "../constants/walletProviders.ts";
import type { FeeAlert, FeeEstimate } from "../types/fee.d.ts";
import type { PaginatedResponse } from "../types/pagination.d.ts";
import { StampClassification } from "$constants";

// ============================================================================
// CONSTANTS & REGEX PATTERNS
// ============================================================================

/**
 * Bitcoin address validation patterns
 * Compiled once for performance
 */
const BITCOIN_ADDRESS_PATTERNS = {
  P2PKH: /^1[a-km-zA-HJ-NP-Z1-9]{25,33}$/,
  P2SH: /^3[a-km-zA-HJ-NP-Z1-9]{25,33}$/,
  P2WPKH: /^bc1q[a-z0-9]{38,58}$/,
  P2TR: /^bc1p[a-z0-9]{58}$/,
} as const;

/**
 * Bitcoin script patterns for hex validation
 */
const BITCOIN_SCRIPT_PATTERNS = {
  P2PKH: /^76a914[a-fA-F0-9]{40}88ac$/,
  P2SH: /^a914[a-fA-F0-9]{40}87$/,
  P2WPKH: /^0014[a-fA-F0-9]{40}$/,
  P2WSH: /^0020[a-fA-F0-9]{64}$/,
  P2TR: /^5120[a-fA-F0-9]{64}$/,
} as const;

/**
 * Transaction hash pattern
 */
const TX_HASH_PATTERN = /^[a-fA-F0-9]{64}$/;

/**
 * SRC-20 ticker pattern (1-5 alphanumeric characters)
 */
const SRC20_TICKER_PATTERN = /^[a-zA-Z0-9]{1,5}$/;

/**
 * SRC-101 slug pattern (alphanumeric with hyphens)
 */
const SRC101_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Stamp hash pattern (12-20 mixed case characters)
 */
const STAMP_HASH_PATTERN = /^[a-zA-Z0-9]{12,20}$/;

/**
 * CPID range constants
 */
const CPID_MIN = 26612428013343742n;
const CPID_MAX = 184467440737095520000n;

// ============================================================================
// BITCOIN PROTOCOL TYPE GUARDS
// ============================================================================

/**
 * Validates Pay-to-Public-Key-Hash (P2PKH) Bitcoin address
 * @param address - Address string to validate
 * @returns Type predicate for P2PKH address
 */
export function isP2PKHAddress(address: string): address is string {
  return typeof address === "string" &&
    BITCOIN_ADDRESS_PATTERNS.P2PKH.test(address);
}

/**
 * Validates Pay-to-Script-Hash (P2SH) Bitcoin address
 * @param address - Address string to validate
 * @returns Type predicate for P2SH address
 */
export function isP2SHAddress(address: string): address is string {
  return typeof address === "string" &&
    BITCOIN_ADDRESS_PATTERNS.P2SH.test(address);
}

/**
 * Validates Pay-to-Witness-Public-Key-Hash (P2WPKH) Bitcoin address
 * @param address - Address string to validate
 * @returns Type predicate for P2WPKH address
 */
export function isP2WPKHAddress(address: string): address is string {
  return typeof address === "string" &&
    BITCOIN_ADDRESS_PATTERNS.P2WPKH.test(address);
}

/**
 * Validates Pay-to-Taproot (P2TR) Bitcoin address
 * @param address - Address string to validate
 * @returns Type predicate for P2TR address
 */
export function isP2TRAddress(address: string): address is string {
  return typeof address === "string" &&
    BITCOIN_ADDRESS_PATTERNS.P2TR.test(address);
}

/**
 * Validates any supported Bitcoin address format
 * @param address - Address string to validate
 * @returns Type predicate for valid Bitcoin address
 */
export function isValidBitcoinAddress(address: string): address is string {
  return (
    isP2PKHAddress(address) ||
    isP2SHAddress(address) ||
    isP2WPKHAddress(address) ||
    isP2TRAddress(address)
  );
}

/**
 * Validates Bitcoin transaction hash
 * @param value - Value to validate
 * @returns Type predicate for transaction hash
 */
export function isTxHash(value: string): value is string {
  return typeof value === "string" && value.length === 64 &&
    TX_HASH_PATTERN.test(value);
}

/**
 * Type definition for UTXO structure
 */
interface UTXO {
  txid: string;
  vout: number;
  value: number;
  script: string;
}

/**
 * Validates UTXO structure
 * @param value - Value to validate
 * @returns Type predicate for UTXO
 */
export function isValidUTXO(value: unknown): value is UTXO {
  if (!value || typeof value !== "object") return false;

  const utxo = value as Record<string, unknown>;

  return (
    typeof utxo.txid === "string" &&
    isTxHash(utxo.txid) &&
    typeof utxo.vout === "number" &&
    utxo.vout >= 0 &&
    Number.isInteger(utxo.vout) &&
    typeof utxo.value === "number" &&
    utxo.value >= 0 &&
    typeof utxo.script === "string" &&
    utxo.script.length > 0
  );
}

/**
 * Type definition for transaction input
 */
interface TransactionInput {
  type: string;
  isWitness: boolean;
  size: number;
}

/**
 * Validates transaction input structure
 * @param value - Value to validate
 * @returns Type predicate for transaction input
 */
export function isValidTransactionInput(
  value: unknown,
): value is TransactionInput {
  if (!value || typeof value !== "object") return false;

  const input = value as Record<string, unknown>;

  return (
    typeof input.type === "string" &&
    input.type.length > 0 &&
    typeof input.isWitness === "boolean" &&
    typeof input.size === "number" &&
    input.size > 0 &&
    Number.isInteger(input.size)
  );
}

/**
 * Type definition for transaction output
 */
interface TransactionOutput {
  type: string;
  value: number;
  isWitness: boolean;
  size: number;
}

/**
 * Validates transaction output structure
 * @param value - Value to validate
 * @returns Type predicate for transaction output
 */
export function isValidTransactionOutput(
  value: unknown,
): value is TransactionOutput {
  if (!value || typeof value !== "object") return false;

  const output = value as Record<string, unknown>;

  return (
    typeof output.type === "string" &&
    output.type.length > 0 &&
    typeof output.value === "number" &&
    output.value >= 0 &&
    typeof output.isWitness === "boolean" &&
    typeof output.size === "number" &&
    output.size > 0 &&
    Number.isInteger(output.size)
  );
}

// ============================================================================
// BITCOIN SCRIPT TYPE GUARDS
// ============================================================================

/**
 * Checks if hex script is P2PKH
 * @param script - Hex script string
 * @returns Type predicate for P2PKH script
 */
export function isP2PKHScript(script: string): boolean {
  return typeof script === "string" &&
    BITCOIN_SCRIPT_PATTERNS.P2PKH.test(script);
}

/**
 * Checks if hex script is P2SH
 * @param script - Hex script string
 * @returns Type predicate for P2SH script
 */
export function isP2SHScript(script: string): boolean {
  return typeof script === "string" &&
    BITCOIN_SCRIPT_PATTERNS.P2SH.test(script);
}

/**
 * Checks if hex script is P2WPKH
 * @param script - Hex script string
 * @returns Type predicate for P2WPKH script
 */
export function isP2WPKHScript(script: string): boolean {
  return typeof script === "string" &&
    BITCOIN_SCRIPT_PATTERNS.P2WPKH.test(script);
}

/**
 * Checks if hex script is P2WSH
 * @param script - Hex script string
 * @returns Type predicate for P2WSH script
 */
export function isP2WSHScript(script: string): boolean {
  return typeof script === "string" &&
    BITCOIN_SCRIPT_PATTERNS.P2WSH.test(script);
}

/**
 * Checks if hex script is P2TR
 * @param script - Hex script string
 * @returns Type predicate for P2TR script
 */
export function isP2TRScript(script: string): boolean {
  return typeof script === "string" &&
    BITCOIN_SCRIPT_PATTERNS.P2TR.test(script);
}

// ============================================================================
// SRC-20 PROTOCOL TYPE GUARDS
// ============================================================================

/**
 * Validates SRC-20 ticker format (basic alphanumeric)
 * @param ticker - Ticker string to validate
 * @returns Type predicate for valid ticker
 */
export function isValidSRC20Ticker(ticker: string): boolean {
  return typeof ticker === "string" && SRC20_TICKER_PATTERN.test(ticker);
}

/**
 * Unicode-aware SRC-20 ticker validation
 * Supports emojis and international characters
 * @param value - Value to validate
 * @returns Type predicate for valid ticker
 */
export function isValidSrc20Tick(value: unknown): boolean {
  if (typeof value !== "string") return false;

  // Check length in terms of Unicode code points (not UTF-16 code units)
  const length = [...value].length;
  if (length < 1 || length > 5) {
    return false;
  }

  // Allow alphanumeric, common symbols, and any Unicode characters (including emojis)
  // This regex allows any Unicode character except control characters
  return /^[\p{L}\p{N}\p{S}\p{P}\p{Sm}\p{Sc}\p{Sk}\p{So}!@#$%^&*()_+\-=\[\]{}|;':",./<>?]+$/u
    .test(value);
}

/**
 * Type definition for SRC-20 deploy operation
 */
interface SRC20Deploy {
  p: "src-20";
  op: "deploy";
  tick: string;
  max: string;
  lim?: string;
  dec?: string;
}

/**
 * Validates SRC-20 deploy operation
 * @param value - Value to validate
 * @returns Type predicate for deploy operation
 */
export function isValidSRC20Deploy(value: unknown): value is SRC20Deploy {
  if (!value || typeof value !== "object") return false;

  const deploy = value as Record<string, unknown>;

  return (
    deploy.p === "src-20" &&
    deploy.op === "deploy" &&
    typeof deploy.tick === "string" &&
    isValidSRC20Ticker(deploy.tick) &&
    typeof deploy.max === "string" &&
    /^\d+$/.test(deploy.max) &&
    (deploy.lim === undefined ||
      (typeof deploy.lim === "string" && /^\d+$/.test(deploy.lim))) &&
    (deploy.dec === undefined ||
      (typeof deploy.dec === "string" && /^\d+$/.test(deploy.dec)))
  );
}

/**
 * Type definition for SRC-20 mint operation
 */
interface SRC20Mint {
  p: "src-20";
  op: "mint";
  tick: string;
  amt: string;
}

/**
 * Validates SRC-20 mint operation
 * @param value - Value to validate
 * @returns Type predicate for mint operation
 */
export function isValidSRC20Mint(value: unknown): value is SRC20Mint {
  if (!value || typeof value !== "object") return false;

  const mint = value as Record<string, unknown>;

  return (
    mint.p === "src-20" &&
    mint.op === "mint" &&
    typeof mint.tick === "string" &&
    isValidSRC20Ticker(mint.tick) &&
    typeof mint.amt === "string" &&
    /^\d+$/.test(mint.amt) &&
    BigInt(mint.amt) > 0n
  );
}

/**
 * Type definition for SRC-20 transfer operation
 */
interface SRC20Transfer {
  p: "src-20";
  op: "transfer";
  tick: string;
  amt: string;
}

/**
 * Validates SRC-20 transfer operation
 * @param value - Value to validate
 * @returns Type predicate for transfer operation
 */
export function isValidSRC20Transfer(value: unknown): value is SRC20Transfer {
  if (!value || typeof value !== "object") return false;

  const transfer = value as Record<string, unknown>;

  return (
    transfer.p === "src-20" &&
    transfer.op === "transfer" &&
    typeof transfer.tick === "string" &&
    isValidSRC20Ticker(transfer.tick) &&
    typeof transfer.amt === "string" &&
    /^\d+$/.test(transfer.amt) &&
    BigInt(transfer.amt) > 0n
  );
}

/**
 * Validates any SRC-20 operation type
 * @param value - Value to validate
 * @returns Type predicate for SRC-20 operation
 */
export function isSRC20Operation(
  value: unknown,
): value is SRC20Deploy | SRC20Mint | SRC20Transfer {
  return isValidSRC20Deploy(value) || isValidSRC20Mint(value) ||
    isValidSRC20Transfer(value);
}

/**
 * Basic SRC-20 data structure check
 * @param value - Value to validate
 * @returns Type predicate for SRC-20 data
 */
export function isSRC20Data(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  const data = value as Record<string, unknown>;

  return (
    "p" in data &&
    data.p === "src-20" &&
    "op" in data &&
    typeof data.op === "string" &&
    "tick" in data &&
    typeof data.tick === "string"
  );
}

/**
 * Advanced SRC-20 deployment validation with metadata
 * @param deployment - Deployment data to validate
 * @returns Type predicate with detailed validation
 */
export function validateSRC20Deployment(deployment: unknown): {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isValidSRC20Deploy(deployment)) {
    errors.push("Invalid SRC-20 deploy structure");
    return { valid: false, errors };
  }

  const deploy = deployment as SRC20Deploy;

  // Validate max supply
  const maxSupply = BigInt(deploy.max);
  if (maxSupply <= 0n) {
    errors.push("Max supply must be greater than 0");
  }
  if (maxSupply > 21000000000000000n) { // 21 quadrillion
    warnings.push("Max supply exceeds typical Bitcoin-inspired limits");
  }

  // Validate limit
  if (deploy.lim) {
    const limit = BigInt(deploy.lim);
    if (limit <= 0n) {
      errors.push("Mint limit must be greater than 0");
    }
    if (limit > maxSupply) {
      errors.push("Mint limit cannot exceed max supply");
    }
  }

  // Validate decimals
  if (deploy.dec) {
    const decimals = parseInt(deploy.dec);
    if (decimals < 0 || decimals > 18) {
      errors.push("Decimals must be between 0 and 18");
    }
  }

  // Validate ticker
  if (deploy.tick.toUpperCase() === "BTC") {
    warnings.push("Ticker 'BTC' may cause confusion with Bitcoin");
  }

  return {
    valid: errors.length === 0,
    ...(errors.length > 0 && { errors }),
    ...(warnings.length > 0 && { warnings }),
  };
}

// ============================================================================
// SRC-101 PROTOCOL TYPE GUARDS
// ============================================================================

/**
 * Validates SRC-101 slug format
 * @param slug - Slug string to validate
 * @returns Type predicate for valid slug
 */
export function isValidSRC101Slug(slug: string): boolean {
  return typeof slug === "string" && SRC101_SLUG_PATTERN.test(slug) &&
    slug.length <= 50;
}

/**
 * Type definition for SRC-101 deploy operation
 */
interface SRC101Deploy {
  p: "src-101";
  op: "deploy";
  name: string;
  slug: string;
  supply?: string;
  traits?: Record<string, unknown>;
}

/**
 * Validates SRC-101 deploy operation
 * @param value - Value to validate
 * @returns Type predicate for SRC-101 deploy
 */
export function isValidSRC101Deploy(value: unknown): value is SRC101Deploy {
  if (!value || typeof value !== "object") return false;

  const deploy = value as Record<string, unknown>;

  return (
    deploy.p === "src-101" &&
    deploy.op === "deploy" &&
    typeof deploy.name === "string" &&
    deploy.name.length > 0 &&
    deploy.name.length <= 100 &&
    typeof deploy.slug === "string" &&
    isValidSRC101Slug(deploy.slug) &&
    (deploy.supply === undefined ||
      (typeof deploy.supply === "string" && /^\d+$/.test(deploy.supply))) &&
    (deploy.traits === undefined ||
      (deploy.traits !== null && typeof deploy.traits === "object"))
  );
}

// ============================================================================
// STAMP PROTOCOL TYPE GUARDS
// ============================================================================

/**
 * Validates stamp number (positive integers or null for cursed)
 * @param num - Number to validate
 * @returns Type predicate for valid stamp number
 */
export function isValidStampNumber(num: unknown): num is number | null {
  return num === null ||
    (typeof num === "number" && num > 0 && Number.isInteger(num));
}

/**
 * Enhanced stamp number validation (includes negative for cursed stamps)
 * Accepts both numbers and string representations of numbers
 * @param value - Value to validate
 * @returns Type predicate for stamp number
 */
export function isStampNumber(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isInteger(value);
  }
  if (typeof value === "string") {
    const num = Number(value);
    return !isNaN(num) && Number.isInteger(num);
  }
  return false;
}

/**
 * Validates stamp hash format
 * Must be 12-20 characters, alphanumeric, with both uppercase and lowercase
 * @param value - Value to validate
 * @returns Type predicate for stamp hash
 */
export function isStampHash(value: unknown): boolean {
  return typeof value === "string" &&
    STAMP_HASH_PATTERN.test(value) &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value);
}

/**
 * Validates Counterparty ID (CPID) format
 * @param cpid - CPID string to validate
 * @returns Type predicate for valid CPID
 */
export function isValidCPID(cpid: string): boolean {
  if (typeof cpid !== "string") return false;

  // Check if it's a valid number string
  if (!/^\d+$/.test(cpid)) return false;

  try {
    const cpidBigInt = BigInt(cpid);
    return cpidBigInt >= CPID_MIN && cpidBigInt <= CPID_MAX;
  } catch {
    return false;
  }
}

/**
 * Enhanced CPID validation supporting both numeric and alphabetic formats
 * @param value - Value to validate
 * @returns Type predicate for CPID
 */
export function isCpid(value: unknown): boolean {
  if (typeof value !== "string") return false;

  // Handle A-prefixed numeric CPIDs
  if (value.startsWith("A")) {
    try {
      const numericPart = BigInt(value.slice(1));
      const min = BigInt(26n ** 12n + 1n);
      const max = BigInt(2n ** 64n - 1n);
      return numericPart >= min && numericPart <= max;
    } catch {
      return false;
    }
  }

  // Handle alphabetic CPIDs (B-Z followed by up to 12 more letters)
  if (/^[B-Z][A-Z]{0,12}$/.test(value)) {
    return true;
  }

  return false;
}

/**
 * Stamp classification types
 */
/**
 * Validates stamp classification
 * @param classification - Classification to validate
 * @returns Type predicate for valid classification
 */
export function isValidStampClassification(
  classification: unknown,
): classification is StampClassification {
  return classification === StampClassification.CURSED ||
    classification === StampClassification.CLASSIC ||
    classification === StampClassification.POSH;
}

/**
 * Allowed MIME types for stamps
 */
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "text/html",
  "text/plain",
] as const;

/**
 * Validates stamp MIME type
 * @param mimeType - MIME type to validate
 * @returns Type predicate for allowed MIME type
 */
export function isValidStampMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as any);
}

/**
 * Validates base64 stamp data
 * @param data - Data to validate
 * @returns Type predicate for valid base64 data
 */
export function isValidBase64StampData(data: string): boolean {
  if (typeof data !== "string") return false;

  // Check if valid base64
  try {
    const decoded = atob(data);
    // Check size limit (e.g., 100KB)
    return decoded.length <= 100 * 1024;
  } catch {
    return false;
  }
}

/**
 * Type definition for stamp row data
 */
interface StampRow {
  stamp: number | null;
  cpid: string;
  creator: string;
  divisible: boolean;
  locked: boolean;
  supply: number;
  stamp_mimetype?: string;
  stamp_base64?: string;
}

/**
 * Validates stamp row structure
 * @param value - Value to validate
 * @returns Type predicate for stamp row
 */
export function isValidStampRow(value: unknown): value is StampRow {
  if (!value || typeof value !== "object") return false;

  const row = value as Record<string, unknown>;

  return (
    isValidStampNumber(row.stamp) &&
    typeof row.cpid === "string" &&
    isValidCPID(row.cpid) &&
    typeof row.creator === "string" &&
    isValidBitcoinAddress(row.creator) &&
    typeof row.divisible === "boolean" &&
    typeof row.locked === "boolean" &&
    typeof row.supply === "number" &&
    row.supply >= 0 &&
    Number.isInteger(row.supply) &&
    (row.stamp_mimetype === undefined ||
      (typeof row.stamp_mimetype === "string" &&
        isValidStampMimeType(row.stamp_mimetype))) &&
    (row.stamp_base64 === undefined ||
      (typeof row.stamp_base64 === "string" &&
        isValidBase64StampData(row.stamp_base64)))
  );
}

/**
 * Basic stamp data validation
 * @param value - Value to validate
 * @returns Type predicate for stamp data
 */
export function isStampData(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  const data = value as Record<string, unknown>;

  return (
    "stamp" in data &&
    "cpid" in data &&
    "creator" in data
  );
}

// ============================================================================
// ERROR TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if error is a generic application error
 * @param error - Error to check
 * @returns Type predicate for application error structure
 */
export function isApplicationError(error: unknown): error is Error & {
  code: string;
  timestamp: string;
  correlationId: string;
} {
  return error instanceof Error && "code" in error && "timestamp" in error &&
    "correlationId" in error;
}

/**
 * Type guard to check if error is a ValidationError
 * @param error - Error to check
 * @returns Type predicate for ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof Error && "code" in error &&
    (error as any).code?.startsWith("VALIDATION_");
}

/**
 * Type guard to check if error is an APIError
 * @param error - Error to check
 * @returns Type predicate for APIError
 */
export function isAPIError(error: unknown): error is APIError {
  return error instanceof Error && "code" in error &&
    (error as any).code?.startsWith("API_");
}

/**
 * Type guard to check if error is a BitcoinError
 * @param error - Error to check
 * @returns Type predicate for BitcoinError
 */
export function isBitcoinError(error: unknown): error is BitcoinError {
  return error instanceof Error && "code" in error &&
    (error as any).code?.startsWith("BITCOIN_");
}

/**
 * Type guard to check if error is an SRC20Error
 * @param error - Error to check
 * @returns Type predicate for SRC20Error
 */
export function isSRC20Error(error: unknown): error is SRC20Error {
  return error instanceof Error && "code" in error &&
    (error as any).code?.startsWith("SRC20_");
}

/**
 * Type guard to check if error is a StampError
 * @param error - Error to check
 * @returns Type predicate for StampError
 */
export function isStampError(error: unknown): error is StampError {
  return error instanceof Error && "code" in error &&
    (error as any).code?.startsWith("STAMP_");
}

/**
 * Type guard to check if error is a NetworkError
 * @param error - Error to check
 * @returns Type predicate for NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof Error && "code" in error &&
    (error as any).code?.startsWith("NETWORK_");
}

/**
 * Type guard to check if error is an AuthenticationError
 * @param error - Error to check
 * @returns Type predicate for AuthenticationError
 */
export function isAuthenticationError(
  error: unknown,
): error is AuthenticationError {
  return error instanceof Error && "code" in error &&
    (error as any).code?.startsWith("AUTH_") &&
    "userId" in error;
}

/**
 * Type guard to check if error is an AuthorizationError
 * @param error - Error to check
 * @returns Type predicate for AuthorizationError
 */
export function isAuthorizationError(
  error: unknown,
): error is AuthorizationError {
  return error instanceof Error && "code" in error &&
    (error as any).code?.startsWith("AUTH_") &&
    "resource" in error;
}

// ============================================================================
// UTILITY TYPE GUARDS
// ============================================================================

/**
 * Checks if a value is a non-null object
 * @param value - Value to check
 * @returns Type predicate for object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Checks if a value is a non-empty string (after trimming whitespace)
 * @param value - Value to check
 * @returns Type predicate for non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Checks if a value is a positive integer
 * @param value - Value to check
 * @returns Type predicate for positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/**
 * Checks if a value is a non-negative number
 * @param value - Value to check
 * @returns Type predicate for non-negative number
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && value >= 0;
}

/**
 * Checks if a value is a valid number (not NaN or Infinity)
 * @param value - Value to check
 * @returns Type predicate for valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

// ============================================================================
// ARRAY SAFETY UTILITIES
// ============================================================================

/**
 * Type guard for non-empty arrays
 * @param arr - Value to check (can be any type)
 * @returns Type predicate for non-empty array
 */
export function isNonEmptyArray<T = unknown>(arr: unknown): arr is [T, ...T[]] {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * Safely access first element of an array
 * @param arr - Array to access
 * @returns First element or undefined
 */
export function safeFirst<T>(arr: T[] | undefined | null): T | undefined {
  return isNonEmptyArray<T>(arr) ? arr[0] : undefined;
}

/**
 * Safely access last element of an array
 * @param arr - Array to access
 * @returns Last element or undefined
 */
export function safeLast<T>(arr: T[] | undefined | null): T | undefined {
  return isNonEmptyArray<T>(arr) ? arr[arr.length - 1] : undefined;
}

/**
 * Filter and narrow array to non-null values
 * @param arr - Array to filter
 * @returns Filtered array with non-null values
 */
export function filterNonNull<T>(arr: (T | null | undefined)[]): T[] {
  return arr.filter((item): item is T => item != null);
}

/**
 * Safely access array element by index
 * @param arr - Array to access
 * @param index - Index to access
 * @param defaultValue - Default value if out of bounds or array is null/undefined
 * @returns Element at index or default value if out of bounds
 */
export function safeArrayAccess<T, D = T>(
  arr: T[] | undefined | null,
  index: number,
  defaultValue?: D,
): T | D | undefined {
  if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
    return defaultValue;
  }
  return arr[index];
}

/**
 * Type guard for defined values
 * @param value - Value to check
 * @returns Type predicate for defined value
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Type guard for non-null values (allows undefined)
 * @param value - Value to check
 * @returns Type predicate for non-null value
 */
export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

// ============================================================================
// SAFE CONVERSION UTILITIES
// ============================================================================

/**
 * Safely convert value to number with fallback
 * @param value - Value to convert
 * @param defaultValue - Default value if conversion fails
 * @returns Converted number or default value
 */
export function safeNumberConvert(
  value: unknown,
  defaultValue: number = 0,
): number {
  if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }

  return defaultValue;
}

/**
 * Safely convert value to string with fallback
 * @param value - Value to convert
 * @param defaultValue - Default value if conversion fails
 * @returns Converted string or default value
 */
export function safeStringConvert(
  value: unknown,
  defaultValue: string = "",
): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return defaultValue;
  }

  try {
    return String(value);
  } catch {
    return defaultValue;
  }
}

// ============================================================================
// WALLET STATE TYPE GUARDS
// ============================================================================

/**
 * Validates wallet provider key
 * @param provider - Provider string to validate
 * @returns Type predicate for valid wallet provider
 */
export function isValidWalletProvider(
  provider: unknown,
): provider is WalletProviderKey {
  return (
    typeof provider === "string" &&
    ["unisat", "xverse", "hiro", "leather", "horizon"].includes(provider)
  );
}

/**
 * Validates connected wallet state
 * @param wallet - Wallet object to validate
 * @returns Type predicate for connected wallet
 */
export function isConnectedWallet(wallet: unknown): wallet is Wallet {
  if (!wallet || typeof wallet !== "object") return false;

  const w = wallet as Record<string, unknown>;

  return (
    typeof w.address === "string" &&
    isValidBitcoinAddress(w.address) &&
    typeof w.publicKey === "string" &&
    w.publicKey.length > 0 &&
    typeof w.provider === "string" &&
    isValidWalletProvider(w.provider) &&
    (w.balance === undefined || typeof w.balance === "number")
  );
}

/**
 * Validates wallet connection result
 * @param value - Value to validate
 * @returns Type predicate for wallet connection result
 */
export function isWalletConnectionResult(
  value: unknown,
): value is WalletConnectionResult {
  if (!value || typeof value !== "object") return false;

  const result = value as Record<string, unknown>;

  // Check for success case
  if (result.success === true) {
    return (
      typeof result.address === "string" &&
      isValidBitcoinAddress(result.address) &&
      typeof result.publicKey === "string" &&
      result.publicKey.length > 0 &&
      (result.provider === undefined ||
        isValidWalletProvider(result.provider))
    );
  }

  // Check for error case
  if (result.success === false) {
    return (
      result.error !== undefined &&
      typeof result.error === "object" &&
      result.error !== null &&
      "code" in result.error &&
      "message" in result.error
    );
  }

  // Must have success property
  return false;
}

/**
 * Validates basic wallet state (minimal check)
 * @param value - Value to validate
 * @returns Type predicate for basic wallet state
 */
export function isValidWalletState(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  const state = value as Record<string, unknown>;

  return (
    typeof state.address === "string" &&
    state.address.length > 0 &&
    (state.connected === undefined || typeof state.connected === "boolean") &&
    (state.provider === undefined || isValidWalletProvider(state.provider))
  );
}

// ============================================================================
// FEE CALCULATION TYPE GUARDS
// ============================================================================

/**
 * Validates fee rate is within acceptable bounds
 * @param rate - Fee rate in sat/vB
 * @returns Type predicate for valid fee rate
 */
export function isValidFeeRate(rate: unknown): rate is number {
  return (
    typeof rate === "number" &&
    !isNaN(rate) &&
    isFinite(rate) &&
    rate >= 1 &&
    rate <= 1000
  );
}

/**
 * Validates fee estimate structure
 * @param value - Value to validate
 * @returns Type predicate for fee estimate
 */
export function isValidFeeEstimate(value: unknown): value is FeeEstimate {
  if (!value || typeof value !== "object") return false;

  const estimate = value as Record<string, unknown>;

  return (
    typeof estimate.recommendedFee === "number" &&
    isValidFeeRate(estimate.recommendedFee) &&
    (estimate.effectiveFeeRate === undefined ||
      (typeof estimate.effectiveFeeRate === "number" &&
        isValidFeeRate(estimate.effectiveFeeRate))) &&
    (estimate.feeRateSatsPerVB === undefined ||
      (typeof estimate.feeRateSatsPerVB === "number" &&
        isValidFeeRate(estimate.feeRateSatsPerVB))) &&
    (estimate.minFeeRate === undefined ||
      (typeof estimate.minFeeRate === "number" &&
        isValidFeeRate(estimate.minFeeRate))) &&
    (estimate.maxFeeRate === undefined ||
      (typeof estimate.maxFeeRate === "number" &&
        isValidFeeRate(estimate.maxFeeRate)))
  );
}

/**
 * Validates fee alert structure
 * @param value - Value to validate
 * @returns Type predicate for fee alert
 */
export function isFeeAlert(value: unknown): value is FeeAlert {
  if (!value || typeof value !== "object") return false;

  const alert = value as Record<string, unknown>;

  return (
    typeof alert.type === "string" &&
    ["warning", "critical", "info"].includes(alert.type) &&
    typeof alert.message === "string" &&
    alert.message.length > 0 &&
    typeof alert.currentFee === "number" &&
    isValidFeeRate(alert.currentFee) &&
    typeof alert.recommendedFee === "number" &&
    isValidFeeRate(alert.recommendedFee) &&
    (alert.threshold === undefined ||
      (typeof alert.threshold === "number" && alert.threshold > 0))
  );
}

// ============================================================================
// API RESPONSE TYPE GUARDS
// ============================================================================

/**
 * Validates paginated response structure
 * @param response - Response to validate
 * @returns Type predicate for paginated response
 */
export function isPaginatedResponse<T>(
  response: unknown,
): response is PaginatedResponse<T> {
  if (!response || typeof response !== "object") return false;

  const paginated = response as Record<string, unknown>;

  return (
    Array.isArray(paginated.data) &&
    typeof paginated.page === "number" &&
    paginated.page > 0 &&
    typeof paginated.limit === "number" &&
    paginated.limit > 0 &&
    typeof paginated.total === "number" &&
    paginated.total >= 0 &&
    typeof paginated.totalPages === "number" &&
    paginated.totalPages >= 0 &&
    (paginated.hasMore === undefined ||
      typeof paginated.hasMore === "boolean") &&
    (paginated.cursor === undefined || typeof paginated.cursor === "string")
  );
}

/**
 * Validates generic API response structure
 * @param response - Response to validate
 * @returns Type predicate for API response with data
 */
export function isValidApiResponse<T>(
  response: unknown,
): response is { success: boolean; data?: T; error?: unknown } {
  if (!response || typeof response !== "object") return false;

  const apiResponse = response as Record<string, unknown>;

  return (
    typeof apiResponse.success === "boolean" &&
    (apiResponse.success === false ||
      (apiResponse.success === true && "data" in apiResponse))
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export constants for external use
export {
  ALLOWED_MIME_TYPES,
  BITCOIN_ADDRESS_PATTERNS,
  BITCOIN_SCRIPT_PATTERNS,
  CPID_MAX,
  CPID_MIN,
  SRC101_SLUG_PATTERN,
  SRC20_TICKER_PATTERN,
  STAMP_HASH_PATTERN,
  TX_HASH_PATTERN,
};

// Export type definitions for external use
export type {
  FeeAlert,
  FeeEstimate,
  PaginatedResponse,
  SRC101Deploy,
  SRC20Deploy,
  SRC20Mint,
  SRC20Transfer,
  StampClassification,
  StampRow,
  TransactionInput,
  TransactionOutput,
  UTXO,
  Wallet,
  WalletConnectionResult,
  WalletProviderKey,
};

// Re-export constant type guards from types directory
export {
  getStampTypeDisplay,
  getStampTypeOptions,
  isValidAPIErrorCode,
  isValidBitcoinErrorCode,
  isValidErrorCode,
  isValidSRC20ErrorCode,
  isValidStampEdition,
  isValidStampErrorCode,
  isValidStampFiletype,
  isValidStampFilterType,
  isValidStampMarketplace,
  isValidStampType,
  isValidValidationErrorCode,
  parseStampType,
  validateConstants,
  validateStampFilterType,
  validateStampType,
} from "$types/constants.ts";
