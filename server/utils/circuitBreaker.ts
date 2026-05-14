import { CircuitState } from "$lib/constants/serviceConstants.ts";
import type { CircuitBreakerState } from "$types/ui.d.ts";

export { CircuitState };
/**
 * Universal Circuit Breaker Pattern Implementation
 *
 * Protects operations from cascading failures by:
 * - Opening circuit after threshold failures
 * - Providing fallback responses when open
 * - Automatically testing recovery
 * - Closing circuit after successful recovery
 * - Supporting permanent disable states (e.g., HTTP 451)
 * - Monitoring recent failures over time windows
 */


export interface CircuitBreakerOptions {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;      // Number of successes to close circuit
  timeout: number;              // Time to wait before attempting reset (ms)
  requestTimeout?: number;      // Individual request timeout (ms)
  monitoringPeriod?: number;    // Period to track recent failures (ms)
  fallbackFn?: () => Promise<any>; // Optional fallback function
  name?: string;                // Name for logging
}


export interface CircuitBreakerMetrics {
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: string;
  lastSuccessTime?: string;
  lastStateChange: string;
  requestCount: number;
  totalFailures: number;
  totalSuccesses: number;
  averageResponseTime: number;
  isHealthy: boolean;
  isPermanentlyDisabled: boolean;
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly circuitState: CircuitState,
    public readonly metrics: CircuitBreakerMetrics
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private lastStateChange = new Date();
  private requestCount = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private totalResponseTime = 0;
  private recentFailures: number[] = [];
  private permanentDisableReason?: string;
  private readonly name: string;

  constructor(private readonly options: CircuitBreakerOptions) {
    this.name = options.name || 'CircuitBreaker';
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>, fallbackData?: T): Promise<T> {
    const startTime = Date.now();
    this.requestCount++;

    // Check if permanently disabled
    if (this.state === CircuitState.PERMANENTLY_OPEN) {
      const error = new CircuitBreakerError(
        `Circuit breaker is PERMANENTLY DISABLED for ${this.name}. Reason: ${this.permanentDisableReason || 'Unknown'}`,
        this.state,
        this.getMetrics()
      );
      error.name = "CircuitBreakerPermanentlyOpenError";
      throw error;
    }

    // Clean old failures and update state
    this.updateStateBasedOnRecentFailures();

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        // Circuit is open and timeout hasn't expired
        console.warn(`[${this.name}] Circuit is OPEN, using fallback`);

        if (fallbackData !== undefined) {
          return fallbackData;
        }

        if (this.options.fallbackFn) {
          return this.options.fallbackFn() as Promise<T>;
        }

        const timeUntilRetry = this.options.timeout - (Date.now() - (this.lastFailureTime?.getTime() || 0));
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN for ${this.name}. Will retry in ${Math.ceil(timeUntilRetry / 1000)}s`,
          this.state,
          this.getMetrics()
        );
      }
    }

    try {
      // Execute with optional timeout
      const result = this.options.requestTimeout
        ? await this.executeWithTimeout(operation)
        : await operation();

      const responseTime = Date.now() - startTime;
      this.onSuccess(responseTime);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.onFailure(error, responseTime);

      if (fallbackData !== undefined) {
        console.log(`[${this.name}] Operation failed, using fallback data`);
        return fallbackData;
      }

      throw error;
    }
  }

  /**
   * Execute operation with timeout (if configured)
   */
  private executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.options.requestTimeout}ms`));
      }, this.options.requestTimeout!);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle successful operation
   */
  private onSuccess(responseTime: number): void {
    this.failureCount = 0;
    this.successCount++;
    this.lastSuccessTime = new Date();
    this.totalSuccesses++;
    this.totalResponseTime += responseTime;

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successCount >= this.options.successThreshold) {
        console.log(`[${this.name}] Recovery successful, closing circuit`);
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: unknown, responseTime: number): void {
    this.lastFailureTime = new Date();
    this.failureCount++;
    this.totalFailures++;
    this.totalResponseTime += responseTime;

    // Track recent failures if monitoring period is configured
    if (this.options.monitoringPeriod) {
      this.recentFailures.push(Date.now());
      const cutoff = Date.now() - this.options.monitoringPeriod;
      this.recentFailures = this.recentFailures.filter(time => time > cutoff);
    }

    console.warn(`[${this.name}] Failure recorded (${this.failureCount}/${this.options.failureThreshold}):`,
                 error instanceof Error ? error.message : String(error));

    // Check for permanent failure conditions (e.g., 451 Legal Restriction)
    if (error instanceof Error && error.message.includes("unavailable for legal reasons (451)")) {
      this.permanentlyDisable(error.message);
      return;
    }

    if (this.state === CircuitState.HALF_OPEN) {
      // Single failure in half-open state reopens circuit
      console.log(`[${this.name}] Recovery test failed, reopening circuit`);
      this.transitionTo(CircuitState.OPEN);
    } else if (
      this.state === CircuitState.CLOSED &&
      this.shouldOpenCircuit()
    ) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Check if circuit should open based on failure threshold
   */
  private shouldOpenCircuit(): boolean {
    if (this.options.monitoringPeriod) {
      // Use recent failures within monitoring period
      return this.recentFailures.length >= this.options.failureThreshold;
    } else {
      // Use total failure count
      return this.failureCount >= this.options.failureThreshold;
    }
  }

  /**
   * Update state based on recent failures (cleanup old failures)
   */
  private updateStateBasedOnRecentFailures(): void {
    if (this.options.monitoringPeriod) {
      const cutoff = Date.now() - this.options.monitoringPeriod;
      this.recentFailures = this.recentFailures.filter(time => time > cutoff);
    }
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;

    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.options.timeout;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date();

    // Reset counters on state change
    if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
    }

    console.log(
      `[${this.name}] Circuit breaker state changed: ${oldState} → ${newState}`
    );

    // Log additional context for debugging
    if (newState === CircuitState.OPEN) {
      const failureSource = this.options.monitoringPeriod
        ? `${this.recentFailures.length} failures in ${this.options.monitoringPeriod}ms`
        : `${this.failureCount} consecutive failures`;
      console.warn(`[${this.name}] Circuit opened after ${failureSource}`);
    } else if (newState === CircuitState.CLOSED) {
      console.log(
        `[${this.name}] Circuit closed after ${this.successCount} successful operations`
      );
    }
  }

  /**
   * Permanently disable the circuit breaker
   */
  private permanentlyDisable(reason: string): void {
    this.state = CircuitState.PERMANENTLY_OPEN;
    this.permanentDisableReason = reason;
    this.lastStateChange = new Date();
    console.error(`[${this.name}] Circuit PERMANENTLY DISABLED: ${reason}`);
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    const state: CircuitBreakerState = {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastStateChange: this.lastStateChange,
      requestCount: this.requestCount,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      averageResponseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0,
      recentFailures: [...this.recentFailures],
    };

    // Only add optional properties if they have values
    if (this.lastFailureTime) {
      state.lastFailureTime = this.lastFailureTime;
    }
    if (this.lastSuccessTime) {
      state.lastSuccessTime = this.lastSuccessTime;
    }
    if (this.permanentDisableReason) {
      state.permanentDisableReason = this.permanentDisableReason;
    }

    return state;
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics(): CircuitBreakerMetrics {
    const metrics: CircuitBreakerMetrics = {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastStateChange: this.lastStateChange.toISOString(),
      requestCount: this.requestCount,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      averageResponseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0,
      isHealthy: this.state === CircuitState.CLOSED,
      isPermanentlyDisabled: this.state === CircuitState.PERMANENTLY_OPEN
    };

    // Only add optional properties if they have values
    if (this.lastFailureTime) {
      metrics.lastFailureTime = this.lastFailureTime.toISOString();
    }
    if (this.lastSuccessTime) {
      metrics.lastSuccessTime = this.lastSuccessTime.toISOString();
    }

    return metrics;
  }

  /**
   * Force reset the circuit breaker (for testing/admin)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.recentFailures = [];
    delete this.lastFailureTime;
    delete this.permanentDisableReason;
    this.lastStateChange = new Date();
    console.log(`[${this.name}] Circuit breaker manually reset`);
  }

  /**
   * Check if circuit is currently open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit is healthy (closed state)
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Check if permanently disabled
   */
  isPermanentlyDisabled(): boolean {
    return this.state === CircuitState.PERMANENTLY_OPEN;
  }

  /**
   * Get exponential backoff delay for retries
   */
  getBackoffDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }
}

// Factory functions for common use cases
export function createDatabaseCircuitBreaker(
  name: string = 'Database',
  isDevelopment: boolean = false
): CircuitBreaker {
  return new CircuitBreaker({
    name,
    failureThreshold: isDevelopment ? 10 : 5,    // More tolerant in dev
    successThreshold: isDevelopment ? 2 : 3,      // Easier recovery in dev
    timeout: isDevelopment ? 60000 : 30000,       // 60s in dev, 30s in prod
    requestTimeout: isDevelopment ? 15000 : 10000, // Request timeout
    fallbackFn: () => {
      console.warn(`[${name}] Using circuit breaker fallback - returning null`);
      return Promise.resolve(null); // Signal to use cache or default response
    }
  });
}

export function createPriceServiceCircuitBreaker(name: string): CircuitBreaker {
  return new CircuitBreaker({
    name,
    failureThreshold: 3,        // Open after 3 failures
    successThreshold: 2,        // Need 2 successes to close from HALF_OPEN
    timeout: 30000,            // Wait 30s before trying HALF_OPEN
    requestTimeout: 5000,      // 5s timeout per request
    monitoringPeriod: 60000,   // Track failures over 1 minute
  });
}

export function createApiCircuitBreaker(
  name: string,
  timeoutDuration: number = 10000
): CircuitBreaker {
  return new CircuitBreaker({
    name,
    failureThreshold: 3,        // Open after 3 failures
    successThreshold: 1,        // Single success to close from HALF_OPEN
    timeout: 30000,            // Try again after 30 seconds
    requestTimeout: timeoutDuration,
    monitoringPeriod: 60000,   // Monitor over 1 minute
  });
}

/**
 * Circuit breaker for QuickNode Bitcoin RPC. Tuned for fast-fail so a dead
 * endpoint does not extend request latency past the upstream proxy (Cloudflare)
 * 100s budget. Public-API fallbacks in CommonUTXOService/utxoUtils run after the
 * breaker rejects.
 */
export function createQuickNodeCircuitBreaker(name: string = 'QuickNode-RPC'): CircuitBreaker {
  return new CircuitBreaker({
    name,
    failureThreshold: 3,        // Open after 3 failures within monitoringPeriod
    successThreshold: 2,        // Need 2 successes to close from HALF_OPEN
    timeout: 60000,             // Probe for recovery every 60s
    requestTimeout: 5000,       // 5s per RPC (Bitcoin Core RPCs normally <500ms)
    monitoringPeriod: 120000,   // Track failures over 2 minutes
  });
}
