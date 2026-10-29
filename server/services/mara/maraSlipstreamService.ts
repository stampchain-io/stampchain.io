/**
 * MARA Slipstream Service
 * Handles integration with MARA pool's Slipstream API for submitting
 * non-standard transactions with custom dust values (1-332 sats)
 */

import { FetchHttpClient } from "$/server/interfaces/httpClient.ts";
import { createPriceServiceCircuitBreaker } from "$/server/utils/circuitBreaker.ts";
import { logger } from "$lib/utils/logger.ts";
import { getMaraConfig } from "$/server/config/config.ts";
import { assertValidMaraConfig } from "$/server/config/maraConfigValidator.ts";
import type {
  MaraFeeRateResponse,
  MaraSubmissionResponse,
  MaraErrorResponse
} from "./types.ts";

// Types for dependency injection
interface MaraConfigProvider {
  getMaraConfig(): ReturnType<typeof getMaraConfig>;
}

interface MaraConfigValidator {
  assertValidMaraConfig(): ReturnType<typeof assertValidMaraConfig>;
}

// Configuration constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Service for interacting with MARA Slipstream API
 * Provides methods for fetching fee rates and submitting transactions
 */
export class MaraSlipstreamService {
  // Lazy initialization of configuration and HTTP client
  private static _config: ReturnType<typeof assertValidMaraConfig> | null = null;
  private static _httpClient: FetchHttpClient | null = null;

  // Circuit breaker to handle API failures gracefully
  private static circuitBreaker = createPriceServiceCircuitBreaker("MaraSlipstream");

  // Dependency injection for configuration functions (for testing)
  private static _configProvider: MaraConfigProvider = {
    getMaraConfig
  };
  private static _configValidator: MaraConfigValidator = {
    assertValidMaraConfig
  };

  /**
   * Set the configuration provider (for testing)
   */
  static setConfigProvider(provider: MaraConfigProvider): void {
    this._configProvider = provider;
    // Reset cached config when provider changes
    this._config = null;
  }

  /**
   * Set the configuration validator (for testing)
   */
  static setConfigValidator(validator: MaraConfigValidator): void {
    this._configValidator = validator;
    // Reset cached config when validator changes
    this._config = null;
  }

  /**
   * Get MARA configuration, initializing if needed
   * @throws Error if MARA is not properly configured
   */
  private static get config() {
    if (!this._config) {
      this._config = this._configValidator.assertValidMaraConfig();
    }
    return this._config;
  }

  /**
   * Get HTTP client, initializing if needed
   */
  private static get httpClient() {
    if (!this._httpClient) {
      const config = this.config;
      this._httpClient = new FetchHttpClient(
        config.apiTimeout,
        MAX_RETRIES,
        RETRY_DELAY
      );
    }
    return this._httpClient;
  }

  /**
   * Fetch current fee rate from MARA API
   * This rate must be used for transactions to be accepted by the pool
   * 
   * @returns Promise<MaraFeeRateResponse> Current fee rate information
   * @throws Error if API call fails or circuit breaker is open
   */
  static async getFeeRate(): Promise<MaraFeeRateResponse> {
    const config = this.config;
    const endpoint = `${config.apiBaseUrl}/getinfo`;
    const startTime = Date.now();
    
    logger.info("mara", {
      message: "Fetching MARA pool info",
      endpoint
    });

    try {
      // Execute request through circuit breaker for resilience
      const response = await this.circuitBreaker.execute(async () => {
        const result = await this.httpClient.get<MaraFeeRateResponse>(endpoint);
        
        if (!result.ok) {
          const errorData = result.data as unknown as MaraErrorResponse;
          throw new Error(
            `MARA API error: ${result.status} - ${errorData?.error || result.statusText}`
          );
        }

        // Validate response structure
        if (!result.data || 
            typeof result.data.fee_rate !== 'number' ||
            typeof result.data.block_height !== 'number' ||
            typeof result.data.network !== 'string') {
          throw new Error("Invalid response structure from MARA getinfo endpoint");
        }

        // IMPORTANT: MARA's getinfo fee_rate (3 sats/vB) is lower than their actual minimum (6 sats/vB)
        // We enforce the real minimum on the frontend with buffering
        const actualMinimumFeeRate = 1.0; // MARA's real minimum requirement - unnknown
        const enhancedResponse: MaraFeeRateResponse = {
          ...result.data,
          min_fee_rate: Math.max(result.data.fee_rate, actualMinimumFeeRate),
          timestamp: Date.now()
        };

        return enhancedResponse;
      });

      const responseTime = Date.now() - startTime;

      logger.info("mara", {
        message: "Successfully fetched MARA info",
        blockHeight: response.block_height,
        feeRateFromAPI: response.fee_rate,
        enforcedMinFeeRate: response.min_fee_rate,
        network: response.network,
        responseTime
      });

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("mara", {
        message: "Failed to fetch MARA fee rate",
        error: errorMessage,
        endpoint,
        responseTime
      });
      throw error;
    }
  }

  /**
   * Submit a signed transaction to MARA pool
   * Transaction must use the fee rate obtained from getFeeRate()
   * 
   * @param hex - Signed transaction hex string
   * @param priority - Transaction priority (default: "high")
   * @param metadata - Additional metadata for tracking
   * @returns Promise<MaraSubmissionResponse> Submission result
   * @throws Error if submission fails or circuit breaker is open
   */
  static async submitTransaction(
    hex: string,
    priority: "high" | "medium" | "low" = "high"
  ): Promise<MaraSubmissionResponse> {
    const config = this.config;
    const endpoint = `${config.apiBaseUrl}/submit-tx`;
    const startTime = Date.now();
    
    // Validate hex string
    if (!hex || typeof hex !== 'string' || hex.length === 0) {
      throw new Error("Invalid transaction hex provided");
    }

    logger.info("mara", {
      message: "Submitting transaction to MARA pool",
      endpoint,
      hexLength: hex.length,
      priority,
      hexPreview: hex.substring(0, 20) + "..."
    });

    try {
      // Execute request through circuit breaker
      const response = await this.circuitBreaker.execute(async () => {
        // MARA API expects JSON with tx_hex and optional client_code
        // For now, omitting client_code since MARA is rejecting our code
        const requestBody = { 
          tx_hex: hex
          // client_code is optional - omitting for now
        };
        
        // Log the full request being sent
        logger.info("mara", {
          message: "Sending transaction to MARA",
          endpoint,
          requestBodyKeys: Object.keys(requestBody),
          hexLength: requestBody.tx_hex.length,
          hexPreview: requestBody.tx_hex.substring(0, 100) + "..."
        });

        const result = await this.httpClient.post<MaraSubmissionResponse>(
          endpoint,
          requestBody
        );
        
        // Log the raw response regardless of success/failure
        logger.info("mara", {
          message: "MARA API raw response",
          status: result.status,
          statusText: result.statusText,
          ok: result.ok,
          dataType: typeof result.data,
          dataKeys: result.data && typeof result.data === 'object' ? Object.keys(result.data) : null,
          rawData: result.data
        });
        
        if (!result.ok) {
          let errorMessage = `MARA submission error: ${result.status}`;
          
          // Try to extract error message from various response formats
          const errorResponseData = result.data as any;
          if (typeof errorResponseData === 'string' && errorResponseData.trim()) {
            errorMessage += ` - ${errorResponseData}`;
          } else if (errorResponseData && typeof errorResponseData === 'object') {
            // Check various possible error fields
            if (errorResponseData.error) {
              errorMessage += ` - ${errorResponseData.error}`;
            } else if (errorResponseData.message) {
              errorMessage += ` - ${errorResponseData.message}`;
            } else if (errorResponseData.detail) {
              errorMessage += ` - ${errorResponseData.detail}`;
            }
          } else {
            errorMessage += ` - ${result.statusText}`;
          }
          
          // Log detailed error information with raw response for debugging
          logger.error("mara", {
            message: "MARA API returned error response",
            status: result.status,
            statusText: result.statusText,
            responseData: typeof errorResponseData === 'string' && errorResponseData.includes('<!DOCTYPE') 
              ? 'HTML error page' 
              : errorResponseData,
            responseType: typeof errorResponseData,
            endpoint,
            hexLength: hex.length,
            hexPreview: hex.substring(0, 100) + "...",
            requestBody: {
              tx_hex_length: requestBody.tx_hex.length
            },
            rawResponseText: typeof errorResponseData === 'string' ? errorResponseData.substring(0, 500) : undefined
          });
          
          // Special handling for gateway errors
          if (result.status === 502 || result.status === 503 || result.status === 504) {
            throw new Error(`MARA service temporarily unavailable (${result.status})`);
          }
          
          throw new Error(errorMessage);
        }

        // Handle JSON response from MARA
        const responseData = result.data as any; // MARA's actual response format
        
        // Log successful response details
        logger.info("mara", {
          message: "MARA submission response received",
          hasData: !!responseData,
          dataType: typeof responseData,
          dataKeys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : null,
          fullResponse: responseData
        });
        
        // Validate response structure
        if (!responseData || typeof responseData !== 'object') {
          logger.error("mara", {
            message: "Invalid response format",
            expectedType: "object",
            actualType: typeof responseData,
            responseData
          });
          throw new Error(`Invalid submission response format from MARA API: expected object, got ${typeof responseData}`);
        }
        
        // Check for success response - MARA returns txid in message field
        if (!responseData.message || !responseData.status) {
          logger.error("mara", {
            message: "Invalid MARA response structure",
            hasData: !!responseData,
            keys: Object.keys(responseData),
            fullResponse: responseData
          });
          throw new Error(`Invalid MARA response: missing required fields. Got keys: ${Object.keys(responseData).join(', ')}`);
        }

        // Handle error response
        if (responseData.status === 'error') {
          throw new Error(`MARA submission failed: ${responseData.message}`);
        }

        // Extract txid from message field for success responses
        // MARA returns: { "message": "<txid>", "status": "success" }
        const txid = responseData.message;
        
        // Validate txid format (64 character hex string)
        if (!txid || typeof txid !== 'string' || !/^[0-9a-fA-F]{64}$/.test(txid)) {
          logger.error("mara", {
            message: "Invalid txid format in MARA response",
            txid,
            responseData
          });
          throw new Error(`Invalid txid format from MARA: ${txid}`);
        }

        // Transform response to expected format
        const transformedResponse: MaraSubmissionResponse = {
          txid,
          status: 'accepted', // MARA returns "success", we use "accepted"
          submission_time: Date.now(),
          message: `Transaction accepted by MARA pool`
        };

        return transformedResponse;
      });

      const submissionTime = Date.now() - startTime;

      logger.info("mara", {
        message: "Successfully submitted transaction to MARA pool",
        txid: response.txid,
        status: response.status,
        estimatedConfirmation: response.estimated_confirmation,
        poolPriority: response.pool_priority,
        submissionTime
      });

      return response;
    } catch (error) {
      const submissionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Add more detailed error information
      const detailedError = {
        message: "Failed to submit transaction to MARA pool",
        error: errorMessage,
        endpoint,
        hexLength: hex.length,
        submissionTime,
        errorType: (error as any).constructor?.name ?? "unknown",
        stack: error instanceof Error ? error.stack : undefined,
        // Add raw error details for debugging
        rawError: error
      };
      
      logger.error("mara", detailedError);
      
      // Log to console for debugging
      console.error("=== MARA SUBMISSION ERROR ===");
      console.error("Error message:", errorMessage);
      console.error("Endpoint:", endpoint);
      console.error("Hex length:", hex.length);
      console.error("Full error:", error);
      console.error("=============================");
      
      throw error;
    }
  }

  /**
   * Get the current state of the circuit breaker
   * Useful for monitoring and debugging
   * 
   * @returns Circuit breaker metrics
   */
  static getCircuitBreakerMetrics() {
    return this.circuitBreaker.getMetrics();
  }

  /**
   * Reset the circuit breaker (for admin/testing purposes)
   * This will close an open circuit and reset failure counts
   */
  static resetCircuitBreaker(): void {
    logger.warn("mara", {
      message: "Manually resetting MARA circuit breaker"
    });
    this.circuitBreaker.reset();
  }

  /**
   * Check if the service is currently available
   * Returns false if circuit breaker is open
   * 
   * @returns boolean indicating service availability
   */
  static isAvailable(): boolean {
    return this.circuitBreaker.isHealthy();
  }

  /**
   * Check if the service is properly configured
   * @returns boolean indicating if MARA service can be used
   */
  static isConfigured(): boolean {
    try {
      const config = this._configProvider.getMaraConfig();
      return config !== null && config.enabled;
    } catch {
      return false;
    }
  }

  /**
   * Get current MARA configuration (for debugging/monitoring)
   * @returns Current configuration or null if not configured
   */
  static getConfiguration() {
    try {
      return this.config;
    } catch {
      return null;
    }
  }
}