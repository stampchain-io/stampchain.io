/**
 * SRC-20 Error Handling Utilities
 *
 * Provides comprehensive error handling for SRC-20 operations across
 * MintTool, DeployTool, and TransferTool components.
 *
 * Features:
 * - Custom error classes for SRC-20 specific validation failures
 * - User-friendly error message extraction
 * - Actionable suggestions for common errors
 * - Correlation ID tracking for debugging
 *
 * @author stampchain.io
 * @version 1.0.0
 */

import { transitionColors } from "$layout";
import { logger } from "$lib/utils/logger.ts";

// ===== CUSTOM ERROR CLASSES =====

/**
 * Base error class for all SRC-20 operations
 */
export class SRC20Error extends Error {
  public readonly code: string;
  public readonly operation: "mint" | "deploy" | "transfer";
  public readonly correlationId: string;
  public readonly timestamp: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    operation: "mint" | "deploy" | "transfer",
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SRC20Error";
    this.code = code;
    this.operation = operation;
    this.correlationId = generateCorrelationId();
    this.timestamp = Date.now();
    if (context !== undefined) {
      this.context = context;
    }

    // Log error with correlation ID
    logger.error("src20", {
      message: `SRC20 ${operation} error`,
      error: this.message,
      code: this.code,
      correlationId: this.correlationId,
      context: this.context,
    });
  }
}

/**
 * Error thrown when token validation fails
 */
export class InvalidTokenError extends SRC20Error {
  constructor(
    tick: string,
    reason: string,
    operation: "mint" | "deploy" | "transfer",
  ) {
    super(
      `Invalid token "${tick}": ${reason}`,
      "INVALID_TOKEN",
      operation,
      { tick, reason },
    );
    this.name = "InvalidTokenError";
  }
}

/**
 * Error thrown when user has insufficient balance
 */
export class InsufficientBalanceError extends SRC20Error {
  constructor(
    tick: string,
    requested: string,
    available: string,
    operation: "mint" | "transfer",
  ) {
    super(
      `Insufficient balance for ${tick}: requested ${requested}, available ${available}`,
      "INSUFFICIENT_BALANCE",
      operation,
      { tick, requested, available },
    );
    this.name = "InsufficientBalanceError";
  }
}

/**
 * Error thrown when deployment validation fails
 */
export class DeploymentError extends SRC20Error {
  constructor(tick: string, reason: string) {
    super(
      `Deployment failed for "${tick}": ${reason}`,
      "DEPLOYMENT_ERROR",
      "deploy",
      { tick, reason },
    );
    this.name = "DeploymentError";
  }
}

/**
 * Error thrown when mint limit is exceeded
 */
export class MintLimitExceededError extends SRC20Error {
  constructor(tick: string, requested: string, limit: string) {
    super(
      `Mint amount exceeds limit for ${tick}: requested ${requested}, limit ${limit}`,
      "MINT_LIMIT_EXCEEDED",
      "mint",
      { tick, requested, limit },
    );
    this.name = "MintLimitExceededError";
  }
}

/**
 * Error thrown when token is already deployed
 */
export class TokenAlreadyExistsError extends SRC20Error {
  constructor(tick: string) {
    super(
      `Token "${tick}" already exists`,
      "TOKEN_ALREADY_EXISTS",
      "deploy",
      { tick },
    );
    this.name = "TokenAlreadyExistsError";
  }
}

// ===== ERROR MESSAGE EXTRACTION =====

/**
 * Extract user-friendly error message from various error types
 */
export function extractSRC20ErrorMessage(
  error: unknown,
  operation: "mint" | "deploy" | "transfer",
): string {
  // Handle SRC20Error instances
  if (error instanceof SRC20Error) {
    return getSuggestionForError(error);
  }

  // Handle API response errors
  if (isApiError(error)) {
    const apiMessage = error.response?.data?.message || error.message;
    return enhanceApiErrorMessage(apiMessage, operation);
  }

  // Handle generic errors
  if (error instanceof Error) {
    return enhanceGenericErrorMessage(error.message, operation);
  }

  // Fallback
  return `An unexpected error occurred during ${operation} operation. Please try again.`;
}

/**
 * Get actionable suggestions for specific error types
 */
function getSuggestionForError(error: SRC20Error): string {
  switch (error.code) {
    case "INVALID_TOKEN":
      return `${error.message}. Please check that the token ticker is valid (3-5 uppercase letters).`;

    case "INSUFFICIENT_BALANCE":
      return `${error.message}. Please reduce the amount or acquire more tokens.`;

    case "DEPLOYMENT_ERROR":
      return `${error.message}. Please check your deployment parameters and try again.`;

    case "MINT_LIMIT_EXCEEDED":
      return `${error.message}. Please reduce the mint amount to within the limit.`;

    case "TOKEN_ALREADY_EXISTS":
      return `${error.message}. Please choose a different ticker or use the existing token.`;

    default:
      return error.message;
  }
}

/**
 * Enhance API error messages with SRC-20 specific context
 */
function enhanceApiErrorMessage(
  message: string,
  operation: "mint" | "deploy" | "transfer",
): string {
  const lowerMessage = message.toLowerCase();

  // Insufficient funds
  if (
    lowerMessage.includes("insufficient funds") ||
    lowerMessage.includes("not enough")
  ) {
    return `Insufficient funds for ${operation} operation and transaction fees. Please add more BTC to your wallet.`;
  }

  // Invalid ticker
  if (
    lowerMessage.includes("invalid tick") || lowerMessage.includes("ticker")
  ) {
    return `Invalid token ticker format. Token tickers must be 3-5 uppercase letters.`;
  }

  // Token not found
  if (
    lowerMessage.includes("not found") || lowerMessage.includes("not exist")
  ) {
    return `Token not found. Please verify the token exists before attempting to ${operation}.`;
  }

  // Already exists
  if (
    lowerMessage.includes("already exists") ||
    lowerMessage.includes("duplicate")
  ) {
    return `This token ticker is already in use. Please choose a different one.`;
  }

  // Rate limiting
  if (
    lowerMessage.includes("rate limit") || lowerMessage.includes("too many")
  ) {
    return `Too many requests. Please wait a moment before trying again.`;
  }

  // Network issues
  if (lowerMessage.includes("network") || lowerMessage.includes("timeout")) {
    return `Network connection issue. Please check your connection and try again.`;
  }

  return message;
}

/**
 * Enhance generic error messages
 */
function enhanceGenericErrorMessage(
  message: string,
  operation: "mint" | "deploy" | "transfer",
): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
    return `Network error during ${operation}. Please check your connection and try again.`;
  }

  if (lowerMessage.includes("timeout")) {
    return `The ${operation} operation timed out. Please try again.`;
  }

  if (lowerMessage.includes("validation")) {
    return `Validation error during ${operation}. Please check your input parameters.`;
  }

  return `Error during ${operation}: ${message}`;
}

// ===== VALIDATION UTILITIES =====

/**
 * Validate SRC-20 token ticker format
 */
export function validateTicker(
  tick: string,
): { valid: boolean; error?: string } {
  if (!tick) {
    return { valid: false, error: "Token ticker is required" };
  }

  if (tick.length < 3 || tick.length > 5) {
    return { valid: false, error: "Token ticker must be 3-5 characters" };
  }

  if (!/^[A-Z]+$/.test(tick)) {
    return {
      valid: false,
      error: "Token ticker must contain only uppercase letters",
    };
  }

  return { valid: true };
}

/**
 * Validate amount for minting/transfer
 */
export function validateAmount(
  amount: string,
  maxAmount?: string,
  operation: "mint" | "transfer" = "transfer",
): { valid: boolean; error?: string } {
  if (!amount || amount === "0") {
    return { valid: false, error: `${operation} amount is required` };
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, error: `Invalid ${operation} amount` };
  }

  if (maxAmount) {
    const numMax = Number(maxAmount);
    if (numAmount > numMax) {
      return {
        valid: false,
        error: `Amount exceeds maximum: ${maxAmount}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate deployment parameters
 */
export function validateDeploymentParams(params: {
  tick: string;
  max: string;
  lim: string;
  dec: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate ticker
  const tickerValidation = validateTicker(params.tick);
  if (!tickerValidation.valid && tickerValidation.error) {
    errors.push(tickerValidation.error);
  }

  // Validate max supply
  const maxSupply = Number(params.max);
  if (isNaN(maxSupply) || maxSupply <= 0) {
    errors.push("Invalid max supply");
  }

  // Validate mint limit
  const mintLimit = Number(params.lim);
  if (isNaN(mintLimit) || mintLimit <= 0) {
    errors.push("Invalid mint limit");
  }

  if (mintLimit > maxSupply) {
    errors.push("Mint limit cannot exceed max supply");
  }

  // Validate decimals
  const decimals = Number(params.dec);
  if (isNaN(decimals) || decimals < 0 || decimals > 18) {
    errors.push("Decimals must be between 0 and 18");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ===== HELPER UTILITIES =====

/**
 * Generate correlation ID for error tracking
 */
function generateCorrelationId(): string {
  return `src20-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Type guard for API errors
 */
function isApiError(error: unknown): error is {
  response?: { data?: { message?: string } };
  message: string;
} {
  return typeof error === "object" &&
    error !== null &&
    "message" in error;
}

/**
 * Create error boundary fallback component
 */
export function SRC20ErrorFallback({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}) {
  const errorMessage = error instanceof SRC20Error
    ? getSuggestionForError(error)
    : "An unexpected error occurred. Please try again.";

  return (
    <div class="p-6 bg-red-50 border border-red-200 rounded-2xl">
      <h3 class="text-lg font-semibold text-red-800 mb-2">
        Something went wrong
      </h3>
      <p class="text-red-600 mb-4">{errorMessage}</p>
      {error instanceof SRC20Error && (
        <p class="text-xs text-red-500 mb-4">
          Error ID: {error.correlationId}
        </p>
      )}
      <button
        type="button"
        onClick={resetError}
        class={`px-4 py-2 bg-red-600 text-white rounded-2xl hover:bg-red-700 ${transitionColors}`}
      >
        Try Again
      </button>
    </div>
  );
}
