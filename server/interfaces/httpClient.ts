/**
 * HTTP Client Interface for Dependency Injection
 * Abstracts HTTP operations for better testability and resource management
 */

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  ok: boolean;
}

export interface HttpRequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal; // Allow external abort signals
  /**
   * Longest this request may sleep before a retry. A retryable status whose
   * required wait (Retry-After, or the 5 s rate-limit floor for 429) exceeds
   * it is returned to the caller instead of retried, so a caller with
   * fallbacks moves on to its next provider. Unset: no cap.
   */
  maxBackoffMs?: number;
}

export interface HttpClient {
  /**
   * Perform an HTTP request
   */
  request<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;

  /**
   * GET request
   */
  get<T = any>(url: string, config?: Omit<HttpRequestConfig, "method">): Promise<HttpResponse<T>>;

  /**
   * POST request
   */
  post<T = any>(url: string, data?: any, config?: Omit<HttpRequestConfig, "method" | "body">): Promise<HttpResponse<T>>;

  /**
   * PUT request
   */
  put<T = any>(url: string, data?: any, config?: Omit<HttpRequestConfig, "method" | "body">): Promise<HttpResponse<T>>;

  /**
   * DELETE request
   */
  delete<T = any>(url: string, config?: Omit<HttpRequestConfig, "method">): Promise<HttpResponse<T>>;

  /**
   * PATCH request
   */
  patch<T = any>(url: string, data?: any, config?: Omit<HttpRequestConfig, "method" | "body">): Promise<HttpResponse<T>>;

  /**
   * Get metrics about the HTTP client performance
   */
  getMetrics?(): {
    poolSize: number;
    activeRequests: number;
    totalRequests: number;
    totalErrors: number;
  };

  /**
   * Clear the internal pool of resources
   */
  clearPool?(): void;
}

/**
 * Concrete implementation of HttpClient using fetch
 */
export class FetchHttpClient implements HttpClient {
  private defaultTimeout: number;
  private defaultRetries: number;
  private defaultRetryDelay: number;
  private maxConcurrentRequests: number;
  private activeRequests: Set<Promise<any>>;
  private abortControllerPool: AbortController[];
  private maxPoolSize: number;
  private totalRequests: number;
  private totalErrors: number;
  private activeTimeouts: Set<number>; // Track active timeout IDs
  private defaultMaxBackoffMs: number | undefined;

  constructor(
    defaultTimeout: number = 30000,
    defaultRetries: number = 3,
    defaultRetryDelay: number = 1000,
    maxConcurrentRequests: number = 10,
    maxPoolSize: number = 20,
    defaultMaxBackoffMs?: number,
  ) {
    this.defaultMaxBackoffMs = defaultMaxBackoffMs;
    this.defaultTimeout = defaultTimeout;
    this.defaultRetries = defaultRetries;
    this.defaultRetryDelay = defaultRetryDelay;
    this.maxConcurrentRequests = maxConcurrentRequests;
    this.activeRequests = new Set();
    this.abortControllerPool = [];
    this.maxPoolSize = maxPoolSize;
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.activeTimeouts = new Set(); // Initialize timeout tracking
  }

  /**
   * Get an AbortController from the pool or create a new one
   */
  private getAbortController(): AbortController {
    const controller = this.abortControllerPool.pop() || new AbortController();
    return controller;
  }

  /**
   * Return an AbortController to the pool for reuse
   */
  private returnAbortController(controller: AbortController): void {
    // Only return non-aborted controllers to the pool
    if (!controller.signal.aborted && this.abortControllerPool.length < this.maxPoolSize) {
      this.abortControllerPool.push(controller);
    }
  }

  /**
   * Wait for available request slot if we're at max concurrent requests
   */
  private async waitForAvailableSlot(): Promise<void> {
    if (this.activeRequests.size >= this.maxConcurrentRequests) {
      // Wait for any request to complete
      await Promise.race(this.activeRequests);
    }
  }

  /**
   * Create a simple AbortSignal that doesn't cause memory leaks
   * This version uses a single controller and avoids multiple listeners
   */
  private createSimpleAbortSignal(externalSignal?: AbortSignal, timeoutMs?: number): AbortSignal {
    // If no external signal or timeout, return a never-aborted signal
    if (!externalSignal && !timeoutMs) {
      return new AbortController().signal;
    }

    // If only external signal, return it directly
    if (externalSignal && !timeoutMs) {
      return externalSignal;
    }

    // If only timeout, create a timeout controller
    if (!externalSignal && timeoutMs) {
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => {
        if (!timeoutController.signal.aborted) {
          timeoutController.abort();
        }
        // Remove from active timeouts when it fires
        this.activeTimeouts.delete(timeoutId);
      }, timeoutMs);

      // Track the timeout ID
      this.activeTimeouts.add(timeoutId);

      return timeoutController.signal;
    }

    // If both external signal and timeout, we need to combine them
    // But we'll do it in a way that doesn't create multiple listeners
    const combinedController = new AbortController();

    // Check if external signal is already aborted
    if (externalSignal!.aborted) {
      combinedController.abort();
      return combinedController.signal;
    }

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!combinedController.signal.aborted) {
        combinedController.abort();
      }
      // Remove from active timeouts when it fires
      this.activeTimeouts.delete(timeoutId);
    }, timeoutMs!);

    // Track the timeout ID
    this.activeTimeouts.add(timeoutId);

    // Listen to external signal - but only add ONE listener
    const abortHandler = () => {
      clearTimeout(timeoutId);
      this.activeTimeouts.delete(timeoutId); // Remove from tracking
      if (!combinedController.signal.aborted) {
        combinedController.abort();
      }
    };

    externalSignal!.addEventListener('abort', abortHandler, { once: true });

    return combinedController.signal;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'fetch failed',
      'network error',
      'timeout',
      'connection reset',
      'connection error',
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      '429',           // Rate limit
      'rate limit',    // Rate limit text
      'too many requests', // Common rate limit message
      '503',           // Service unavailable (often temporary)
      '502',           // Bad gateway (often temporary)
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryable => errorMessage.includes(retryable));
  }

  /**
   * Check if a status code indicates rate limiting
   */
  private isRateLimitStatus(status: number): boolean {
    return status === 429;
  }

  /**
   * Check if a status code is retryable (temporary server errors)
   */
  private isRetryableStatus(status: number): boolean {
    return status === 429 || status === 502 || status === 503 || status === 504;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async request<T = any>(url: string, config: HttpRequestConfig = {}): Promise<HttpResponse<T>> {
    // Increment total requests counter
    this.totalRequests++;

    const {
      method = "GET",
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      signal: externalSignal,
      maxBackoffMs = this.defaultMaxBackoffMs,
    } = config;

    // Check if fetch is available (important for test environments)
    if (typeof fetch === "undefined") {
      throw new Error("fetch is not available in this environment. Make sure fetch is polyfilled or mocked in tests.");
    }

    // Wait for available request slot
    await this.waitForAvailableSlot();

    let lastError: Error | undefined;

    // Create the request promise and add it to active requests
    const requestPromise = (async (): Promise<HttpResponse<T>> => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        let requestController: AbortController | undefined;

        try {
          // Get AbortController for this attempt
          requestController = this.getAbortController();

          // Create a simple abort signal that combines external signal and timeout
          const abortSignal = this.createSimpleAbortSignal(externalSignal, timeout);

          const requestHeaders = { ...headers };

          if (body && method !== "GET") {
            if (!requestHeaders["Content-Type"]) {
              requestHeaders["Content-Type"] = "application/json";
            }
          }

          const fetchConfig: RequestInit = {
            method,
            headers: requestHeaders,
            signal: abortSignal,
          };

          if (body && method !== "GET") {
            fetchConfig.body = typeof body === "string" ? body : JSON.stringify(body);
          }

          const response = await fetch(url, fetchConfig);

          // Parse response data
          // Read as text first to avoid "Body already consumed" error
          const textData = await response.text();
          let data: T;
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            try {
              data = JSON.parse(textData);
            } catch (_jsonError) {
              // If JSON parsing fails, return as text
              console.error("Failed to parse JSON response:", _jsonError);
              data = textData as T;
            }
          } else {
            data = textData as T;
          }

          // Convert headers to plain object
          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          const result: HttpResponse<T> = {
            data,
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            ok: response.ok,
          };

          // Check for rate limiting or retryable status codes
          if (this.isRetryableStatus(response.status) && attempt < retries) {
            // Return controller to pool before retry
            if (requestController) {
              this.returnAbortController(requestController);
            }

            // Calculate backoff delay - use Retry-After header if available
            let backoffDelay = retryDelay * Math.pow(2, attempt);
            const retryAfter = response.headers.get("retry-after");
            if (retryAfter) {
              const retryAfterSeconds = parseInt(retryAfter, 10);
              if (!isNaN(retryAfterSeconds)) {
                backoffDelay = Math.max(backoffDelay, retryAfterSeconds * 1000);
              }
            }

            // For rate limits, use longer backoff
            if (this.isRateLimitStatus(response.status)) {
              backoffDelay = Math.max(backoffDelay, 5000); // Minimum 5s for rate limits
            }

            // A capped caller does not wait out a long backoff: hand the
            // response back so it can try its next provider instead.
            if (maxBackoffMs !== undefined && backoffDelay > maxBackoffMs) {
              console.warn(`[HttpClient] Status ${response.status} needs a ${backoffDelay}ms backoff (cap ${maxBackoffMs}ms), not retrying`, {
                url,
                method,
              });
              return result;
            }

            if (this.isRateLimitStatus(response.status)) {
              console.warn(`[HttpClient] Rate limited (429), waiting ${backoffDelay}ms before retry ${attempt + 1}/${retries}`, {
                url,
                method,
              });
            } else {
              console.warn(`[HttpClient] Retryable status ${response.status}, waiting ${backoffDelay}ms before retry ${attempt + 1}/${retries}`, {
                url,
                method,
              });
            }

            await this.sleep(backoffDelay);
            continue; // Retry the request
          }

          // Success - return controller to pool
          if (requestController) {
            this.returnAbortController(requestController);
          }

          return result;
        } catch (error: any) {
          // Increment total errors counter on error
          this.totalErrors++;

          // Return controller to pool on error
          if (requestController) {
            this.returnAbortController(requestController);
          }

          lastError = error;

          // If it's an abort error, don't retry. Log minimal info in dev.
          if (error.name === "AbortError") {
            try {
              if (typeof Deno !== "undefined" && Deno?.env?.get("DENO_ENV") !== "production") {
                console.warn("[HttpClient] Request aborted due to timeout", {
                  url,
                  method,
                  timeoutMs: timeout,
                });
              }
            } catch (_e) {
              // no-op logging failure
            }
            // Convert AbortError to a standard Error with more context
            const timeoutError = new Error(`Request timeout after ${timeout}ms: ${method} ${url}`);
            timeoutError.name = "TimeoutError";
            throw timeoutError;
          }

          // If it's not retryable or we've exhausted retries, throw
          if (!this.isRetryableError(error) || attempt === retries) {
            throw error;
          }

          // Wait before retrying
          if (attempt < retries) {
            const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
            await this.sleep(
              maxBackoffMs !== undefined ? Math.min(delay, maxBackoffMs) : delay,
            );
          }
        }
      }

      throw lastError || new Error("Unknown error occurred");
    })();

    // Add to active requests
    this.activeRequests.add(requestPromise);

    // Clean up from active requests when done
    requestPromise.finally(() => {
      this.activeRequests.delete(requestPromise);
    }).catch(() => {
      // requestPromise's rejection is already handled by the caller via the
      // returned promise below; this only exists to prevent an unhandled
      // rejection on the derived .finally() promise.
    });

    return requestPromise;
  }

  get<T = any>(url: string, config: Omit<HttpRequestConfig, "method"> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...config, method: "GET" });
  }

  post<T = any>(url: string, data?: any, config: Omit<HttpRequestConfig, "method" | "body"> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...config, method: "POST", body: data });
  }

  put<T = any>(url: string, data?: any, config: Omit<HttpRequestConfig, "method" | "body"> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...config, method: "PUT", body: data });
  }

  delete<T = any>(url: string, config: Omit<HttpRequestConfig, "method"> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...config, method: "DELETE" });
  }

  patch<T = any>(url: string, data?: any, config: Omit<HttpRequestConfig, "method" | "body"> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...config, method: "PATCH", body: data });
  }

  /**
   * Get metrics about the HTTP client performance
   */
  getMetrics() {
    return {
      poolSize: this.abortControllerPool.length,
      activeRequests: this.activeRequests.size,
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      maxConcurrentRequests: this.maxConcurrentRequests,
      maxPoolSize: this.maxPoolSize,
    };
  }

  /**
   * Clear the internal pool of resources
   */
  clearPool(): void {
    // Clear the AbortController pool
    this.abortControllerPool.forEach(controller => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    });
    this.abortControllerPool = [];

    // Clear all active timeouts
    this.activeTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.activeTimeouts.clear();
  }
}
