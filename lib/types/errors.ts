/**
 * Error Types Implementation for BTC Stamps Explorer
 *
 * Provides concrete implementations of error classes and utilities.
 */

// Import ValidationErrorCode for use within this file
import { transitionColors } from "$components/layout/styles.ts";
import { ValidationErrorCode } from "$constants";
import { serverConfig } from "$server/config/config.ts";

// Re-export all type definitions
export * from "./errors.d.ts";

// Re-export runtime constants from $constants
export {
  APIErrorCode,
  BitcoinErrorCode,
  ErrorSeverity,
  HTTP_STATUS_TO_ERROR_CODE,
  SRC20ErrorCode,
  StampErrorCode,
  ValidationErrorCode,
} from "$constants";

// Import types for local use
import type {
  ApplicationError,
  FieldValidationError,
  LegacyErrorInfo,
  ValidationErrorCollection,
} from "$types/errors.d.ts";

// ===== ERROR CLASS IMPLEMENTATIONS =====

/**
 * Base error class implementation
 */
export class BaseError extends Error {
  public readonly code: string;
  public readonly statusCode: number | undefined;
  public readonly details: unknown | undefined;
  public readonly timestamp: number;
  public readonly correlationId: string;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = Date.now();
    this.correlationId = this.generateCorrelationId();

    // Maintain proper stack trace (V8 specific)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  private generateCorrelationId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      stack: this.stack,
    };
  }
}

/**
 * Validation error implementation
 */
export class ValidationError extends BaseError {
  public readonly field: string | undefined;
  public readonly rule: string | undefined;
  public readonly path: string[] | undefined;

  constructor(
    message: string,
    field?: string,
    rule?: string,
    path?: string[],
    details?: unknown,
  ) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.field = field;
    this.rule = rule;
    this.path = path;
  }
}

/**
 * API error implementation
 */
export class APIError extends BaseError {
  public readonly method: string | undefined;
  public readonly url: string | undefined;
  public readonly responseBody: unknown | undefined;

  constructor(
    message: string,
    statusCode: number = 500,
    method?: string,
    url?: string,
    responseBody?: unknown,
  ) {
    const code = APIError.getErrorCodeFromStatus(statusCode);
    super(message, code, statusCode, { method, url, responseBody });
    this.method = method;
    this.url = url;
    this.responseBody = responseBody;
  }

  private static getErrorCodeFromStatus(status: number): string {
    if (status >= 400 && status < 500) return "API_CLIENT_ERROR";
    if (status >= 500 && status < 600) return "API_SERVER_ERROR";
    return "API_ERROR";
  }
}

/**
 * Bitcoin error implementation
 */
export class BitcoinError extends BaseError {
  public readonly operation: string | undefined;
  public readonly txHash: string | undefined;
  public readonly address: string | undefined;

  constructor(
    message: string,
    operation?: string,
    txHash?: string,
    address?: string,
    details?: unknown,
  ) {
    super(message, "BITCOIN_ERROR", 422, details);
    this.operation = operation;
    this.txHash = txHash;
    this.address = address;
  }
}

/**
 * SRC-20 error implementation
 */
export class SRC20Error extends BaseError {
  public readonly operation: "mint" | "deploy" | "transfer";
  public readonly tick: string | undefined;
  public readonly amount: string | undefined;

  constructor(
    message: string,
    operation: "mint" | "deploy" | "transfer",
    tick?: string,
    amount?: string,
    details?: unknown,
  ) {
    super(message, "SRC20_ERROR", 422, details);
    this.operation = operation;
    this.tick = tick;
    this.amount = amount;
  }
}

/**
 * Stamp error implementation
 */
export class StampError extends BaseError {
  public readonly stampId: number | undefined;
  public readonly cpid: string | undefined;
  public readonly creator: string | undefined;

  constructor(
    message: string,
    stampId?: number,
    cpid?: string,
    creator?: string,
    details?: unknown,
  ) {
    super(message, "STAMP_ERROR", 422, details);
    this.stampId = stampId;
    this.cpid = cpid;
    this.creator = creator;
  }
}

/**
 * Database error implementation
 */
export class DatabaseError extends BaseError {
  public readonly query: string | undefined;
  public readonly table: string | undefined;
  public readonly operation: string | undefined;

  constructor(
    message: string,
    query?: string,
    table?: string,
    operation?: string,
    details?: unknown,
  ) {
    super(message, "DATABASE_ERROR", 500, details);
    this.query = query;
    this.table = table;
    this.operation = operation;
  }
}

/**
 * Network error implementation
 */
export class NetworkError extends BaseError {
  public readonly url: string | undefined;
  public readonly timeout: number | undefined;

  constructor(
    message: string,
    url?: string,
    timeout?: number,
    details?: unknown,
  ) {
    super(message, "NETWORK_ERROR", 503, details);
    this.url = url;
    this.timeout = timeout;
  }
}

/**
 * Authentication error implementation
 */
export class AuthenticationError extends BaseError {
  public readonly userId: string | undefined;
  public readonly provider: string | undefined;

  constructor(
    message: string,
    userId?: string,
    provider?: string,
    details?: unknown,
  ) {
    super(message, "AUTH_ERROR", 401, details);
    this.userId = userId;
    this.provider = provider;
  }
}

/**
 * Authorization error implementation
 */
export class AuthorizationError extends BaseError {
  public readonly resource: string | undefined;
  public readonly action: string | undefined;
  public readonly userId: string | undefined;

  constructor(
    message: string,
    resource?: string,
    action?: string,
    userId?: string,
    details?: unknown,
  ) {
    super(message, "AUTHORIZATION_ERROR", 403, details);
    this.resource = resource;
    this.action = action;
    this.userId = userId;
  }
}

/**
 * Configuration error implementation
 */
export class ConfigurationError extends BaseError {
  public readonly configKey: string | undefined;
  public readonly expectedType: string | undefined;

  constructor(
    message: string,
    configKey?: string,
    expectedType?: string,
    details?: unknown,
  ) {
    super(message, "CONFIG_ERROR", 500, details);
    this.configKey = configKey;
    this.expectedType = expectedType;
  }
}

// HTTP_STATUS_TO_ERROR_CODE mapping is now imported from $constants

// ===== TYPE GUARD IMPLEMENTATIONS =====

/**
 * Type guard to check if error is an ApplicationError
 */
export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof BaseError;
}

/**
 * Type guard to check if error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if error is an APIError
 */
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

/**
 * Type guard to check if error is a BitcoinError
 */
export function isBitcoinError(error: unknown): error is BitcoinError {
  return error instanceof BitcoinError;
}

/**
 * Type guard to check if error is an SRC20Error
 */
export function isSRC20Error(error: unknown): error is SRC20Error {
  return error instanceof SRC20Error;
}

/**
 * Type guard to check if error is a StampError
 */
export function isStampError(error: unknown): error is StampError {
  return error instanceof StampError;
}

/**
 * Type guard to check if error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Type guard to check if error is an AuthenticationError
 */
export function isAuthenticationError(
  error: unknown,
): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard to check if error is an AuthorizationError
 */
export function isAuthorizationError(
  error: unknown,
): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

// ===== ERROR UTILITY FUNCTIONS =====

/**
 * Create a validation error collection utility
 */
export function createValidationErrorCollection(
  errors: FieldValidationError[] = [],
): ValidationErrorCollection {
  return {
    errors,
    hasErrors: errors.length > 0,
    getErrorsForField(field: string) {
      return errors.filter((error) => error.field === field);
    },
    getFirstError() {
      return errors.length > 0 ? errors[0] : null;
    },
    getAllMessages() {
      return errors.map((error) => error.message);
    },
  };
}

/**
 * Convert legacy error info to ApplicationError
 */
export function fromLegacyErrorInfo(
  legacyError: LegacyErrorInfo,
): BaseError {
  const { type, message, details } = legacyError;

  switch (type) {
    case "network":
      return new NetworkError(message, undefined, undefined, details);
    case "api":
      return new APIError(message, 500, undefined, undefined, details);
    case "data":
    case "validation":
      return new ValidationError(
        message,
        undefined,
        undefined,
        undefined,
        details,
      );
    case "timeout":
      return new NetworkError(message, undefined, 30000, details);
    case "auth":
      return new AuthenticationError(message, undefined, undefined, details);
    default:
      return new BaseError(message, "UNKNOWN_ERROR", 500, details);
  }
}

/**
 * Extract error message for user display
 */
export function getUserFriendlyMessage(
  error: Error | ApplicationError | unknown,
): string {
  if (error instanceof ValidationError) {
    return error.field
      ? `Invalid ${error.field}: ${error.message}`
      : error.message;
  }

  if (error instanceof APIError) {
    if (error.statusCode === 404) {
      return "The requested resource was not found.";
    }
    if (error.statusCode === 401) return "Authentication required.";
    if (error.statusCode === 403) return "Access denied.";
    if (error.statusCode === 429) {
      return "Too many requests. Please try again later.";
    }
    if (error.statusCode && error.statusCode >= 500) {
      return "Server error. Please try again.";
    }
    return error.message;
  }

  if (error instanceof NetworkError) {
    return "Network connection error. Please check your connection and try again.";
  }

  if (error instanceof BitcoinError) {
    return `Bitcoin transaction error: ${error.message}`;
  }

  if (error instanceof SRC20Error) {
    return `SRC-20 ${error.operation} error: ${error.message}`;
  }

  if (error instanceof StampError) {
    return `Stamp error: ${error.message}`;
  }

  // Handle Error objects and unknown types
  if (error instanceof Error) {
    return error.message;
  }

  // Handle unknown error types
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "An unexpected error occurred.";
}

/**
 * Determine if error should be reported to monitoring
 */
export function shouldReportError(
  error: Error | ApplicationError | unknown,
): boolean {
  // Don't report validation errors
  if (error instanceof ValidationError) return false;

  // Don't report 4xx client errors except 429 (rate limiting)
  if (error instanceof APIError && error.statusCode) {
    if (
      error.statusCode >= 400 && error.statusCode < 500 &&
      error.statusCode !== 429
    ) {
      return false;
    }
  }

  // Report all server errors, network errors, and other critical errors
  return true;
}

/**
 * Get recovery action for error
 */
export function getRecoveryAction(error: any): string {
  if (error instanceof ValidationError) return "go_back";
  if (error instanceof AuthenticationError) return "login";
  if (error instanceof NetworkError) return "retry";
  if (error instanceof APIError) {
    if (error.statusCode === 404) return "go_back";
    if (error.statusCode === 401) return "login";
    if (error.statusCode === 429) return "retry";
    if (error.statusCode && error.statusCode >= 500) return "retry";
  }
  return "refresh";
}

/**
 * Create error from HTTP response
 */
export function createErrorFromResponse(
  response: Response,
  context?: string,
): Promise<APIError> {
  return response.text().then((body) => {
    let responseBody: unknown;
    try {
      responseBody = JSON.parse(body);
    } catch {
      responseBody = body;
    }

    const message = context
      ? `${context}: ${response.statusText || "HTTP Error"}`
      : response.statusText || "HTTP Error";

    return new APIError(
      message,
      response.status,
      "GET", // Could be improved to get actual method
      response.url,
      responseBody,
    );
  });
}

// ===== VALIDATION UTILITIES =====

/**
 * Create a field validation error
 */
export function createFieldValidationError(
  field: string,
  code: ValidationErrorCode,
  message: string,
  value?: unknown,
  path?: string[],
  rule?: string,
  params?: Record<string, unknown>,
): FieldValidationError {
  const error: FieldValidationError = {
    field,
    code,
    message,
  };

  if (value !== undefined) error.value = value;
  if (path !== undefined) error.path = path;
  if (rule !== undefined) error.rule = rule;
  if (params !== undefined) error.params = params;

  return error;
}

/**
 * Validate required field
 */
export function validateRequired(
  field: string,
  value: unknown,
  path?: string[],
): FieldValidationError | null {
  if (value === undefined || value === null || value === "") {
    return createFieldValidationError(
      field,
      ValidationErrorCode.REQUIRED_FIELD,
      `${field} is required`,
      value,
      path,
      "required",
    );
  }
  return null;
}

/**
 * Validate string length
 */
export function validateLength(
  field: string,
  value: string,
  min?: number,
  max?: number,
  path?: string[],
): FieldValidationError | null {
  if (typeof value !== "string") {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_TYPE,
      `${field} must be a string`,
      value,
      path,
      "type",
    );
  }

  if (min !== undefined && value.length < min) {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_LENGTH,
      `${field} must be at least ${min} characters long`,
      value,
      path,
      "minLength",
      { min },
    );
  }

  if (max !== undefined && value.length > max) {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_LENGTH,
      `${field} must be at most ${max} characters long`,
      value,
      path,
      "maxLength",
      { max },
    );
  }

  return null;
}

/**
 * Validate email format
 */
export function validateEmail(
  field: string,
  value: string,
  path?: string[],
): FieldValidationError | null {
  if (typeof value !== "string") {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_TYPE,
      `${field} must be a string`,
      value,
      path,
      "type",
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_EMAIL,
      `${field} must be a valid email address`,
      value,
      path,
      "email",
    );
  }

  return null;
}

/**
 * Validate URL format
 */
export function validateUrl(
  field: string,
  value: string,
  path?: string[],
): FieldValidationError | null {
  if (typeof value !== "string") {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_TYPE,
      `${field} must be a string`,
      value,
      path,
      "type",
    );
  }

  try {
    new URL(value);
    return null;
  } catch {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_URL,
      `${field} must be a valid URL`,
      value,
      path,
      "url",
    );
  }
}

/**
 * Validate number range
 */
export function validateRange(
  field: string,
  value: number,
  min?: number,
  max?: number,
  path?: string[],
): FieldValidationError | null {
  if (typeof value !== "number" || isNaN(value)) {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_TYPE,
      `${field} must be a number`,
      value,
      path,
      "type",
    );
  }

  if (min !== undefined && value < min) {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_RANGE,
      `${field} must be at least ${min}`,
      value,
      path,
      "min",
      { min },
    );
  }

  if (max !== undefined && value > max) {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_RANGE,
      `${field} must be at most ${max}`,
      value,
      path,
      "max",
      { max },
    );
  }

  return null;
}

/**
 * Validate pattern match
 */
export function validatePattern(
  field: string,
  value: string,
  pattern: RegExp,
  path?: string[],
): FieldValidationError | null {
  if (typeof value !== "string") {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_TYPE,
      `${field} must be a string`,
      value,
      path,
      "type",
    );
  }

  if (!pattern.test(value)) {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_PATTERN,
      `${field} does not match the required pattern`,
      value,
      path,
      "pattern",
      { pattern: pattern.source },
    );
  }

  return null;
}

/**
 * Validate Bitcoin address
 */
export function validateBitcoinAddress(
  field: string,
  value: string,
  path?: string[],
): FieldValidationError | null {
  if (typeof value !== "string") {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_TYPE,
      `${field} must be a string`,
      value,
      path,
      "type",
    );
  }

  // Basic Bitcoin address validation patterns
  const legacyPattern = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  const bech32Pattern = /^(bc1|tb1)[a-z0-9]{39,59}$/;

  if (!legacyPattern.test(value) && !bech32Pattern.test(value)) {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_FORMAT,
      `${field} must be a valid Bitcoin address`,
      value,
      path,
      "bitcoinAddress",
    );
  }

  return null;
}

/**
 * Validate SRC-20 ticker format
 */
export function validateSRC20Ticker(
  field: string,
  value: string,
  path?: string[],
): FieldValidationError | null {
  if (typeof value !== "string") {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_TYPE,
      `${field} must be a string`,
      value,
      path,
      "type",
    );
  }

  if (value.length < 3 || value.length > 5) {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_LENGTH,
      `${field} must be 3-5 characters long`,
      value,
      path,
      "tickerLength",
    );
  }

  if (!/^[A-Z]+$/.test(value)) {
    return createFieldValidationError(
      field,
      ValidationErrorCode.INVALID_FORMAT,
      `${field} must contain only uppercase letters`,
      value,
      path,
      "tickerFormat",
    );
  }

  return null;
}

/**
 * Create API error response
 */
export function createApiErrorResponse(
  error: string,
  code: string,
  details?: unknown,
  correlationId?: string,
  path?: string,
  method?: string,
): any {
  return {
    error,
    status: "error" as const,
    code,
    details,
    timestamp: Date.now(),
    correlationId: correlationId ||
      `api-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    path,
    method,
  };
}

/**
 * Create API success response
 */
export function createApiSuccessResponse<T>(
  data: T,
  message?: string,
  correlationId?: string,
): any {
  return {
    data,
    status: "success" as const,
    message,
    timestamp: Date.now(),
    correlationId: correlationId ||
      `api-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
  };
}

// ===== REACT ERROR HANDLING PATTERNS =====

/**
 * Generate unique error ID for error boundary tracking
 */
export function generateErrorId(): string {
  return `err-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Create error boundary state for React components
 */
export function createErrorBoundaryState(
  error: Error | null = null,
  errorInfo: any = null,
): any {
  return {
    hasError: error !== null,
    error,
    errorInfo,
    errorId: error ? generateErrorId() : null,
  };
}

/**
 * Reset error boundary state
 */
export function resetErrorBoundaryState(): any {
  return createErrorBoundaryState(null, null);
}

/**
 * Extract component stack from React error info
 */
export function extractComponentStack(errorInfo: any): string {
  if (!errorInfo) return "";

  // Handle React error info structure
  if (typeof errorInfo === "object") {
    if ("componentStack" in errorInfo) {
      return errorInfo.componentStack || "";
    }
    if ("stack" in errorInfo) {
      return errorInfo.stack || "";
    }
  }

  // Fallback to string representation
  if (typeof errorInfo === "string") {
    return errorInfo;
  }

  return JSON.stringify(errorInfo, null, 2);
}

/**
 * Create error context value for React context providers
 */
export function createErrorContext({
  reportError = () => {},
  clearError = () => {},
  hasError = false,
  error = null,
  retry = () => {},
}: {
  reportError?: (error: Error, context?: string) => void;
  clearError?: () => void;
  hasError?: boolean;
  error?: Error | null;
  retry?: () => void;
} = {}): any {
  return {
    reportError,
    clearError,
    hasError,
    error,
    retry,
  };
}

/**
 * Default error fallback component props factory
 */
export function createErrorFallbackProps(
  error: Error,
  errorInfo: any,
  resetError: () => void,
  errorId?: string,
): any {
  return {
    error,
    errorInfo,
    resetError,
    errorId: errorId || generateErrorId(),
  };
}

/**
 * Error boundary helper for capturing and formatting React errors
 */
export function captureReactError(
  error: Error,
  errorInfo: any,
  componentName?: string,
): {
  capturedError: BaseError;
  errorBoundaryState: any;
  shouldReport: boolean;
} {
  // Create enhanced error with React context
  const capturedError = new BaseError(
    `React component error: ${error.message}`,
    "REACT_ERROR",
    500,
    {
      originalError: error.name,
      originalMessage: error.message,
      componentStack: extractComponentStack(errorInfo),
      componentName: componentName || "Unknown",
    },
  );

  // Create error boundary state
  const errorBoundaryState = createErrorBoundaryState(error, errorInfo);

  // Determine if error should be reported
  const shouldReport = shouldReportError(capturedError);

  return {
    capturedError,
    errorBoundaryState,
    shouldReport,
  };
}

/**
 * React error recovery utility
 */
export function createErrorRecovery({
  onRetry,
  onReset,
  onRedirect,
  maxRetries = 3,
}: {
  onRetry?: () => void | Promise<void>;
  onReset?: () => void;
  onRedirect?: (path: string) => void;
  maxRetries?: number;
} = {}): {
  retry: () => void;
  reset: () => void;
  redirect: (path: string) => void;
  canRetry: (retryCount: number) => boolean;
} {
  return {
    retry: () => {
      if (onRetry) {
        const result = onRetry();
        if (result instanceof Promise) {
          result.catch((err) => console.error("Error recovery failed:", err));
        }
      }
    },
    reset: () => {
      if (onReset) {
        onReset();
      }
    },
    redirect: (path: string) => {
      if (onRedirect) {
        onRedirect(path);
      }
    },
    canRetry: (retryCount: number) => retryCount < maxRetries,
  };
}

/**
 * Error reporting utility for React components
 */
export function createErrorReporter({
  onReport,
  includeUserAgent = true,
  includeTimestamp = true,
  includeUrl = true,
}: {
  onReport?: (
    error: ApplicationError,
    context?: string,
    metadata?: Record<string, unknown>,
  ) => void;
  includeUserAgent?: boolean;
  includeTimestamp?: boolean;
  includeUrl?: boolean;
} = {}): (error: Error, context?: string) => void {
  return (error: Error, context?: string) => {
    // Convert to ApplicationError if needed
    const appError: ApplicationError = isApplicationError(error)
      ? error
      : new BaseError(error.message, "REACT_ERROR", 500, {
        originalError: error,
      }) as unknown as ApplicationError;

    // Collect metadata
    const metadata: Record<string, unknown> = {};

    if (includeTimestamp) {
      metadata.timestamp = Date.now();
    }

    if (includeUserAgent && typeof navigator !== "undefined") {
      metadata.userAgent = navigator.userAgent;
    }

    if (
      includeUrl && typeof globalThis !== "undefined" &&
      "location" in globalThis
    ) {
      const location = (globalThis as any).location;
      if (location) {
        metadata.url = location.href;
        metadata.pathname = location.pathname;
      }
    }

    // Report the error
    if (onReport) {
      onReport(appError, context, metadata);
    } else {
      // Default reporting - just log to console in development
      // Only on server-side (islands/client code should not access Deno)
      if (typeof window === "undefined") {
        try {
          if (
            typeof Deno !== "undefined" &&
            serverConfig.IS_DEVELOPMENT
          ) {
            console.error("React Error:", {
              error: appError,
              context,
              metadata,
            });
          }
        } catch {
          // Silently ignore permission errors for environment access
        }
      }
    }
  };
}

/**
 * Hook-like error state management utility
 */
export function createErrorState(initialError: Error | null = null): {
  error: Error | null;
  hasError: boolean;
  setError: (error: Error | null) => void;
  clearError: () => void;
  resetError: () => void;
} {
  let currentError = initialError;
  const listeners: Array<() => void> = [];

  const notifyListeners = () => {
    listeners.forEach((listener) => listener());
  };

  return {
    get error() {
      return currentError;
    },
    get hasError() {
      return currentError !== null;
    },
    setError: (error: Error | null) => {
      currentError = error;
      notifyListeners();
    },
    clearError: () => {
      currentError = null;
      notifyListeners();
    },
    resetError: () => {
      currentError = null;
      notifyListeners();
    },
  };
}

/**
 * Error boundary configuration factory
 */
export function createErrorBoundaryConfig({
  isolate = false,
  resetKeys = [],
  resetOnPropsChange = false,
  fallbackComponent = null,
  onError = () => {},
  enableErrorReporting = true,
}: {
  isolate?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  fallbackComponent?: any;
  onError?: (error: Error, errorInfo: any) => void;
  enableErrorReporting?: boolean;
} = {}): any {
  return {
    isolate,
    resetKeys,
    resetOnPropsChange,
    fallback: fallbackComponent,
    onError: (error: Error, errorInfo: any) => {
      // Custom error handling
      onError(error, errorInfo);

      // Optional error reporting
      if (enableErrorReporting) {
        const reporter = createErrorReporter();
        reporter(error, "ErrorBoundary");
      }
    },
  };
}

/**
 * Default error fallback component factory
 */
export function createDefaultErrorFallback({
  title = "Something went wrong",
  showErrorDetails = false,
  showRetryButton = true,
  showErrorId = true,
  customStyles = {},
}: {
  title?: string;
  showErrorDetails?: boolean;
  showRetryButton?: boolean;
  showErrorId?: boolean;
  customStyles?: Record<string, string>;
} = {}) {
  return (props: any) => {
    const { error, resetError, errorId } = props;
    const errorMessage = getUserFriendlyMessage(error);

    const defaultStyles = {
      container:
        "p-5 bg-red-50 border border-red-200 rounded-3xl max-w-md mx-auto",
      title: "text-lg font-semibold text-red-800 mb-2",
      message: "text-red-600 mb-4",
      details: "text-xs text-red-500 mb-4 font-mono bg-red-100 p-2 rounded-2xl",
      errorId: "text-xs text-red-500 mb-4",
      button:
        `px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 ${transitionColors}`,
      ...customStyles,
    };

    return {
      type: "div",
      props: {
        className: defaultStyles.container,
        children: [
          {
            type: "h3",
            props: {
              className: defaultStyles.title,
              children: title,
            },
          },
          {
            type: "p",
            props: {
              className: defaultStyles.message,
              children: errorMessage,
            },
          },
          showErrorDetails && error.stack
            ? {
              type: "pre",
              props: {
                className: defaultStyles.details,
                children: error.stack,
              },
            }
            : null,
          showErrorId && errorId
            ? {
              type: "p",
              props: {
                className: defaultStyles.errorId,
                children: `Error ID: ${errorId}`,
              },
            }
            : null,
          showRetryButton
            ? {
              type: "button",
              props: {
                className: defaultStyles.button,
                onClick: resetError,
                children: "Try Again",
              },
            }
            : null,
        ].filter(Boolean),
      },
    };
  };
}
