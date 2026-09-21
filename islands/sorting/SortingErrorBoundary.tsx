/**
 * @file SortingErrorBoundary.tsx
 * @description Comprehensive error boundary for sorting operations with retry logic
 * @author AI Agent
 * @since 2024-01-07
 */

import { ErrorDisplay } from "$islands/error/ErrorDisplay.tsx";
import { transitionColors } from "$layout";
import type { SortingErrorBoundaryProps } from "$types/src20.d.ts";
import type {
  ErrorInfo,
  SortingErrorBoundaryState,
  SortingErrorFallbackProps,
} from "$types/ui.d.ts";
import { Component } from "preact";

// ===== TYPES =====

// ===== ERROR BOUNDARY COMPONENT =====

export class SortingErrorBoundary extends Component<
  SortingErrorBoundaryProps,
  SortingErrorBoundaryState
> {
  private retryTimer?: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(props: SortingErrorBoundaryProps) {
    super(props);

    this.maxRetries = props.maxRetries ?? 3;
    this.retryDelay = props.retryDelay ?? 1000; // 1 second base delay

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0,
    };
  }

  static override getDerivedStateFromError(): Partial<
    SortingErrorBoundaryState
  > {
    return {
      hasError: true,
      lastErrorTime: Date.now(),
    };
  }

  override componentDidCatch(
    error: Error,
    errorInfo: ErrorInfo,
  ) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Call external error handler
    const errorDetails = `
Stack: ${error.stack || "No stack trace"}
Component Stack: ${errorInfo.componentStack || "No component stack"}
Props: ${JSON.stringify(this.props, null, 2)}
Timestamp: ${new Date().toISOString()}
    `.trim();

    this.props.onError?.(error, errorDetails);

    // Log error for debugging
    console.error("[SortingErrorBoundary] Caught error:", {
      error,
      errorInfo,
      context: this.props.context,
      retryCount: this.state.retryCount,
    });
  }

  // ===== ERROR CATEGORIZATION REMOVED - Using simplified error boundary =====

  // ===== RETRY LOGIC =====

  private handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      console.warn("[SortingErrorBoundary] Max retries exceeded");
      return;
    }

    // Calculate exponential backoff delay
    const delay = this.retryDelay * Math.pow(2, this.state.retryCount);

    console.log(
      `[SortingErrorBoundary] Retrying in ${delay}ms (attempt ${
        this.state.retryCount + 1
      }/${this.maxRetries})`,
    );

    this.retryTimer = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        retryCount: this.state.retryCount + 1,
        lastErrorTime: 0,
      });
    }, delay);
  };

  private handleReset = () => {
    this.clearRetryTimer();
  };

  private clearRetryTimer() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      delete this.retryTimer;
    }

    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
      lastErrorTime: 0,
    });
  }

  // ===== LIFECYCLE =====

  override componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  // ===== RENDER =====

  render() {
    const { children, fallback, className = "", testId } = this.props;
    const { hasError, error } = this.state;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return (
          <div
            className={`sorting-error-boundary ${className}`}
            data-testid={testId}
          >
            {fallback}
          </div>
        );
      }

      // Use built-in error fallback
      return (
        <div
          className={`sorting-error-boundary ${className}`}
          data-testid={testId}
        >
          <SortingErrorFallback
            error={error}
            onRetry={this.handleRetry}
            onReset={this.handleReset}
            context={this.props.context || "general"}
            retryCount={this.state.retryCount}
            maxRetries={this.maxRetries}
          />
        </div>
      );
    }

    return children;
  }
}

// ===== ERROR FALLBACK COMPONENT =====

function SortingErrorFallback({
  error,
  onRetry,
  onReset,
  context,
  retryCount,
  maxRetries,
}: SortingErrorFallbackProps) {
  if (!error) {
    // Return empty fragment if no error - this handles the optional error case gracefully
    return null;
  }

  const canRetry = (retryCount ?? 0) < (maxRetries ?? 3) &&
    "retryable" in error &&
    error.retryable;

  return (
    <div className="sorting-error-fallback p-4">
      <ErrorDisplay
        error={error}
        {...(canRetry ? { onRetry } : {})}
        {...(onReset ? { onDismiss: onReset } : {})}
        showDetails
        compact={false}
        className="mb-4"
      />

      {/* Context-specific guidance */}
      <div className="text-sm text-gray-400 mb-4">
        <div className="font-semibold mb-1">Context: {context} sorting</div>
        <div>Retry attempts: {retryCount ?? 0} / {maxRetries ?? 3}</div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-center">
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={`px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm ${transitionColors}`}
          >
            Retry ({(maxRetries ?? 3) - (retryCount ?? 0)} left)
          </button>
        )}

        <button
          type="button"
          onClick={onReset}
          className={`px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-2xl text-sm ${transitionColors}`}
        >
          Reset
        </button>
      </div>

      {/* Recovery suggestions */}
      {"action" in error && error.action && (
        <div className="mt-4 p-3 bg-gray-800 rounded-2xl text-xs">
          <div className="font-semibold text-gray-300 mb-1">
            Suggested action:
          </div>
          <div className="text-gray-400">
            {getActionMessage(error.action || "")}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== UTILITY FUNCTIONS =====

function getActionMessage(action: string): string {
  switch (action) {
    case "retry":
      return "This appears to be a temporary issue. Try again in a moment.";
    case "refresh-page":
      return "Refresh the page to reload the sorting component.";
    case "check-connection":
      return "Check your internet connection and try again.";
    case "clear-cache":
      return "Clear your browser cache and reload the page.";
    default:
      return "Please try again or contact support if the issue persists.";
  }
}

// ===== EXPORTS =====

export default SortingErrorBoundary;
