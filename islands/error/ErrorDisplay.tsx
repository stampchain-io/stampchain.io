/* ===== ERROR DISPLAY COMPONENT ===== */
import { Icon } from "$icon";
import { transitionColors } from "$layout";
import {
  ErrorHandlingUtils,
  ErrorInfo,
  ErrorSeverity,
  ErrorType,
} from "$lib/utils/errorHandling.ts";
import type { ErrorDisplayProps } from "$types/ui.d.ts";

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  compact = false,
  showDetails = false,
  className = "",
}: ErrorDisplayProps) {
  // Convert error to ErrorInfo format for consistent handling
  const errorInfo: ErrorInfo = (() => {
    if (typeof error === "string" || error instanceof Error) {
      return ErrorHandlingUtils.createErrorInfo(error);
    } else if (error && "severity" in error && "code" in error) {
      // Handle ErrorHandlingInfo type
      const errorHandlingInfo = error as any;
      return {
        type: ErrorType.UNKNOWN_ERROR,
        severity: errorHandlingInfo.severity === "error"
          ? ErrorSeverity.HIGH
          : errorHandlingInfo.severity === "warning"
          ? ErrorSeverity.MEDIUM
          : ErrorSeverity.LOW,
        message: errorHandlingInfo.message,
        name: errorHandlingInfo.code,
        timestamp: new Date(),
        recoverable: true,
        retryable: errorHandlingInfo.severity !== "error",
        action: "retry",
      };
    } else if (error) {
      return error as ErrorInfo;
    } else {
      return {
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.LOW,
        message: "Unknown error occurred",
        name: "UnknownError",
        timestamp: new Date(),
        recoverable: true,
        retryable: false,
      };
    }
  })();

  const userMessage = ErrorHandlingUtils.getUserFriendlyMessage(errorInfo);

  // Get styling based on error severity
  const getSeverityStyles = () => {
    switch (errorInfo.severity) {
      case ErrorSeverity.LOW:
        return {
          container: "bg-yellow-900/20 border-yellow-500/30 text-yellow-100",
          icon: "text-yellow-400",
          iconName: "alert-triangle" as const,
        };
      case ErrorSeverity.MEDIUM:
        return {
          container: "bg-orange-900/20 border-orange-500/30 text-orange-100",
          icon: "text-orange-400",
          iconName: "alert-circle" as const,
        };
      case ErrorSeverity.HIGH:
        return {
          container: "bg-red-900/20 border-red-500/30 text-red-100",
          icon: "text-red-400",
          iconName: "x-circle" as const,
        };
      case ErrorSeverity.CRITICAL:
        return {
          container: "bg-red-900/40 border-red-400/50 text-red-50",
          icon: "text-red-300",
          iconName: "x-circle" as const,
        };
      default:
        return {
          container: "bg-gray-900/20 border-gray-500/30 text-gray-100",
          icon: "text-gray-400",
          iconName: "info" as const,
        };
    }
  };

  const styles = getSeverityStyles();

  if (compact) {
    return (
      <div
        class={`flex items-center gap-2 p-2 rounded border ${styles.container} ${className}`}
      >
        <Icon
          name={styles.iconName}
          size="sm"
          type="icon"
          weight="normal"
          color="custom"
          className={styles.icon}
        />
        <span class="text-sm flex-1">{userMessage}</span>

        {errorInfo.retryable && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            class={`text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded ${transitionColors}`}
          >
            Retry
          </button>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            class={`text-gray-400 hover:text-white ${transitionColors}`}
          >
            <Icon
              name="x"
              size="xs"
              type="icon"
              weight="normal"
              color="custom"
            />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      class={`p-4 rounded-2xl border ${styles.container} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div class="flex items-start gap-3">
        <Icon
          name={styles.iconName}
          size="lg"
          type="icon"
          weight="normal"
          color="custom"
          className={`${styles.icon} flex-shrink-0 mt-1`}
        />

        <div class="flex-1 min-w-0">
          <div class="font-semibold mb-1">
            {errorInfo.severity === ErrorSeverity.CRITICAL
              ? "Critical Error"
              : errorInfo.severity === ErrorSeverity.HIGH
              ? "Error"
              : errorInfo.severity === ErrorSeverity.MEDIUM
              ? "Warning"
              : "Notice"}
          </div>

          <div class="text-sm mb-3">
            {userMessage}
          </div>

          {showDetails && errorInfo.details && (
            <details class="mb-3">
              <summary class="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                Technical Details
              </summary>
              <pre class="text-xs mt-2 p-2 bg-black/20 rounded overflow-auto">
                {errorInfo.details}
              </pre>
            </details>
          )}

          <div class="flex items-center gap-2 text-xs text-gray-400">
            <span>Type: {errorInfo.type}</span>
            <span>•</span>
            <span>Time: {errorInfo.timestamp.toLocaleTimeString()}</span>
            {errorInfo.recoverable && (
              <>
                <span>•</span>
                <span class="text-green-400">Recoverable</span>
              </>
            )}
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          {errorInfo.retryable && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              class={`px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded ${transitionColors}`}
            >
              Try Again
            </button>
          )}

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              class={`p-1 text-gray-400 hover:text-white ${transitionColors}`}
              aria-label="Dismiss error"
            >
              <Icon
                name="x"
                size="sm"
                type="icon"
                weight="normal"
                color="custom"
              />
            </button>
          )}
        </div>
      </div>

      {/* Action suggestions */}
      {errorInfo.action && (
        <div class="mt-3 pt-3 border-t border-gray-600/30">
          <div class="text-xs text-gray-300">
            Suggested action: {getActionMessage(errorInfo.action)}
          </div>
        </div>
      )}
    </div>
  );
}

function getActionMessage(action: string): string {
  switch (action) {
    case "retry":
      return "Try the operation again";
    case "login":
      return "Please log in to continue";
    case "correct_input":
      return "Please check your input and try again";
    case "go_back":
      return "Go back and try a different approach";
    case "refresh_page":
      return "Refresh the page and try again";
    default:
      return action;
  }
}

/* ===== SPECIALIZED ERROR COMPONENTS ===== */

export function NetworkErrorDisplay({ onRetry }: { onRetry?: () => void }) {
  const error: ErrorInfo = {
    type: ErrorType.NETWORK_ERROR,
    severity: ErrorSeverity.HIGH,
    message: "Unable to load sales data",
    name: "NetworkError",
    timestamp: new Date(),
    recoverable: true,
    retryable: true,
    action: "retry",
  };

  return <ErrorDisplay error={error} {...(onRetry && { onRetry })} />;
}

export function LoadingTimeoutDisplay({ onRetry }: { onRetry?: () => void }) {
  const error: ErrorInfo = {
    type: ErrorType.TIMEOUT_ERROR,
    severity: ErrorSeverity.MEDIUM,
    message: "Loading is taking longer than expected",
    name: "TimeoutError",
    timestamp: new Date(),
    recoverable: true,
    retryable: true,
    action: "retry",
  };

  return <ErrorDisplay error={error} {...(onRetry && { onRetry })} compact />;
}

export function DataNotFoundDisplay() {
  const error: ErrorInfo = {
    type: ErrorType.DATA_ERROR,
    severity: ErrorSeverity.LOW,
    message: "No recent sales data available",
    name: "DataError",
    timestamp: new Date(),
    recoverable: true,
    retryable: false,
  };

  return <ErrorDisplay error={error} compact />;
}
