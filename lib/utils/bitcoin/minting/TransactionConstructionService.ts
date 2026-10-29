/**
 * TransactionConstructionService - World-class progressive transaction construction system
 *
 * Implements a 3-phase approach:
 * Phase 1: Instant mathematical estimates (no API calls)
 * Phase 2: Smart tool endpoint estimates with dryRun=true (NEW: Direct tool integration)
 * Phase 3: Exact transaction construction (on user action only)
 *
 * @author stampchain.io
 * @version 2.0.0 - Now with direct tool endpoint integration
 */

import type {
  AnyTransactionOptions,
  SRC101TransactionOptions,
  SRC20TransactionOptions,
  StampTransactionOptions,
  ToolType,
} from "$lib/types/toolEndpointAdapter.ts";
import type { BasicUTXO } from "$lib/types/base.d.ts";
import { logger } from "$lib/utils/logger.ts";
import {
  toolEndpointFeeEstimator,
} from "$lib/utils/bitcoin/minting/ToolEndpointFeeEstimator.ts";

// Core interfaces for the fee estimation system

export interface DetailedUTXO extends BasicUTXO {
  script: string;
  witnessData?: string;
  ancestorDetails?: {
    size: number;
    fee: number;
    count: number;
  };
}

export interface UTXOCache {
  walletAddress: string;
  utxos: BasicUTXO[];
  timestamp: number;
  ttl: number; // 30 seconds
}

export interface FeeEstimationResult {
  phase: "instant" | "smart" | "exact"; // Updated: "cached" -> "smart" to reflect new tool endpoint approach
  minerFee: number;
  totalValue: number;
  dustValue: number;
  hasExactFees: boolean;
  cacheHit?: boolean;
  estimationTime?: number;
  estimationMethod?: string; // NEW: Track which estimation method was used
}

export interface EstimationOptions {
  toolType:
    | "stamp"
    | "src20-mint"
    | "src20-deploy"
    | "src20-transfer"
    | "src101-create";
  walletAddress: string | undefined;
  feeRate: number;
  isConnected: boolean;
  isSubmitting: boolean | undefined;
  // Tool-specific parameters
  [key: string]: any | undefined;
}

/**
 * UTXOCacheManager - Intelligent UTXO caching with TTL and LRU eviction
 * NOTE: This is now primarily used for Phase 3 (exact estimation) since Phase 2 uses tool endpoints
 */
export class UTXOCacheManager {
  private cache = new Map<string, UTXOCache>();
  private readonly maxCacheSize = 100; // Max cached wallets
  private readonly defaultTTL = 30000; // 30 seconds

  /**
   * Get cached UTXOs for a wallet address
   */
  get(walletAddress: string): BasicUTXO[] | null {
    const cached = this.cache.get(walletAddress);

    if (!cached) {
      return null;
    }

    // Check TTL expiration
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(walletAddress);
      logger.debug("system", {
        message: "UTXO cache expired",
        walletAddress,
        age: Date.now() - cached.timestamp,
      });
      return null;
    }

    logger.debug("system", {
      message: "UTXO cache hit",
      walletAddress,
      utxoCount: cached.utxos.length,
    });

    return cached.utxos;
  }

  /**
   * Set cached UTXOs for a wallet address
   */
  set(walletAddress: string, utxos: BasicUTXO[], ttl?: number): void {
    // Implement LRU eviction
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(walletAddress, {
      walletAddress,
      utxos,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });

    logger.debug("system", {
      message: "UTXO cache updated",
      walletAddress,
      utxoCount: utxos.length,
    });
  }

  /**
   * Clear cache for a specific wallet or all wallets
   */
  clear(walletAddress?: string): void {
    if (walletAddress) {
      this.cache.delete(walletAddress);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }
}

/**
 * TransactionConstructionService - Core transaction construction engine
 *
 * Provides progressive fee estimation with 3-phase approach for optimal user experience.
 */
export class TransactionConstructionService {
  private utxoCache = new UTXOCacheManager();

  /**
   * Phase 1: Instant mathematical estimation (no API calls)
   * Fast fallback calculation using transaction size estimates
   */
  estimateInstant(
    options: EstimationOptions,
  ): Promise<FeeEstimationResult> {
    const startTime = performance.now();

    try {
      // 🔧 FIX: Validate fee rate to prevent negative calculations
      const validatedFeeRate = Math.max(options.feeRate, 0.1); // Minimum 0.1 sat/vB

      const txSize = this.calculateTransactionSize(options);
      const minerFee = Math.max(Math.ceil(txSize * validatedFeeRate), 1); // Minimum 1 sat
      const dustValue = this.calculateDustValue(options);

      const result: FeeEstimationResult = {
        phase: "instant",
        minerFee,
        totalValue: minerFee + dustValue,
        dustValue,
        hasExactFees: false,
        estimationTime: performance.now() - startTime,
        cacheHit: false,
        estimationMethod: "mathematical_calculation",
      };

      logger.debug("system", {
        message: "Phase 1 (instant) estimation completed",
        toolType: options.toolType,
        feeRate: validatedFeeRate,
        txSize,
        minerFee,
        dustValue,
        totalValue: result.totalValue,
        estimationTime: result.estimationTime,
      });

      return Promise.resolve(result);
    } catch (error) {
      logger.error("system", {
        message: "Phase 1 estimation failed",
        error: String(error),
        toolType: options.toolType,
      });
      throw error;
    }
  }

  /**
   * Phase 2: Smart tool endpoint estimation with dryRun=true
   * NEW: Direct tool endpoint integration - eliminates redundant UTXO queries!
   */
  async estimateSmart(
    options: EstimationOptions,
  ): Promise<FeeEstimationResult> {
    const startTime = performance.now();

    // 🚀 UPDATED: Phase 2 can now run even without wallet connection for dryRun estimation
    // The endpoints handle dummy addresses internally when dryRun=true
    if (options.isSubmitting) {
      // Only skip if actively submitting - otherwise proceed with dummy address estimation
      return this.estimateInstant(options);
    }

    try {
      // 🚀 NEW: Build tool-specific transaction options (now supports dummy addresses)
      const toolOptions = this.buildToolTransactionOptions(options);

      // 🚀 NEW: Call tool endpoint directly with dryRun=true
      const toolResponse = await toolEndpointFeeEstimator.estimateFees(
        this.mapToToolType(options.toolType),
        toolOptions,
      );

      // Convert tool response to our standard format
      const result: FeeEstimationResult = {
        phase: "smart",
        minerFee: toolResponse.minerFee,
        totalValue: toolResponse.totalCost,
        dustValue: toolResponse.dustValue,
        hasExactFees: false, // Still an estimate, but much more accurate
        cacheHit: false, // Tool endpoint responses are cached internally
        estimationTime: performance.now() - startTime,
        estimationMethod: toolResponse.estimationMethod,
      };

      logger.debug("system", {
        message: "Phase 2 complete - smart tool endpoint estimation",
        toolType: options.toolType,
        estimationMethod: toolResponse.estimationMethod,
        estimatedSize: toolResponse.estimatedSize,
        feeRate: toolResponse.feeRate,
        estimationTime: result.estimationTime,
        hasWalletAddress: !!options.walletAddress,
        usedDummyAddress: !options.walletAddress,
      });

      return result;
    } catch (error) {
      logger.warn("system", {
        message: "Phase 2 failed, falling back to instant",
        error: error instanceof Error ? error.message : String(error),
        toolType: options.toolType,
        hasWalletAddress: !!options.walletAddress,
      });

      // Graceful fallback to Phase 1
      return this.estimateInstant(options);
    }
  }

  /**
   * Phase 3: Exact transaction construction
   * Only called when user clicks action button (STAMP/MINT/etc)
   */
  async estimateExact(
    options: EstimationOptions,
  ): Promise<FeeEstimationResult> {
    const startTime = performance.now();

    if (!options.walletAddress || !options.isConnected) {
      throw new Error("Wallet connection required for exact estimation");
    }

    try {
      // 🚀 FIXED: Phase 3 should use real wallet address and dryRun=false for exact calculation
      const toolOptions = this.buildToolTransactionOptions(options, false);

      const toolResponse = await toolEndpointFeeEstimator.estimateFees(
        this.mapToToolType(options.toolType),
        toolOptions,
      );

      const result: FeeEstimationResult = {
        phase: "exact",
        minerFee: toolResponse.minerFee,
        totalValue: toolResponse.totalCost,
        dustValue: toolResponse.dustValue,
        hasExactFees: true, // This is as exact as we can get without actually creating the transaction
        cacheHit: false,
        estimationTime: performance.now() - startTime,
        estimationMethod: toolResponse.estimationMethod,
      };

      logger.debug("system", {
        message:
          "Phase 3 complete - exact tool endpoint estimation with real UTXOs",
        toolType: options.toolType,
        estimationMethod: toolResponse.estimationMethod,
        estimatedSize: toolResponse.estimatedSize,
        estimationTime: result.estimationTime,
        usedRealWallet: true,
        dryRun: false,
      });

      return result;
    } catch (error) {
      logger.error("system", {
        message: "Phase 3 estimation failed",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 🚀 NEW: Build tool-specific transaction options from generic EstimationOptions
   */
  private buildToolTransactionOptions(
    options: EstimationOptions,
    dryRun: boolean = true,
  ): AnyTransactionOptions {
    // Use dummy address when wallet is not connected - endpoints handle this for dryRun=true
    const baseOptions = {
      walletAddress: options.walletAddress ||
        "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", // Standard dummy P2WPKH address
      feeRate: options.feeRate, // Keep as sats/vB - tool adapters handle conversion as needed
      dryRun, // Now configurable based on phase
    };

    switch (options.toolType) {
      case "stamp": {
        // Provide meaningful defaults for all required stamp fields
        const stampOptions: StampTransactionOptions = {
          ...baseOptions,
          file: options.file ||
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", // 1x1 transparent PNG
          filename: options.filename || "dummy-stamp.png",
          fileSize: options.fileSize || options.file?.length || 69, // Size of dummy PNG
          quantity: options.quantity || 1,
          locked: options.locked ?? true,
          divisible: options.divisible ?? false,
        };

        return stampOptions;
      }

      case "src20-deploy": {
        return {
          ...baseOptions,
          op: "DEPLOY" as const,
          tick: options.tick || "TEST",
          max: options.max || "1000",
          lim: options.lim || "100",
          dec: typeof options.dec === "string"
            ? parseInt(options.dec, 10)
            : (options.dec ?? 0),
        } as SRC20TransactionOptions;
      }

      case "src20-mint": {
        return {
          ...baseOptions,
          op: "MINT" as const,
          tick: options.tick || "TEST",
          amt: options.amt || "1",
        } as SRC20TransactionOptions;
      }

      case "src20-transfer": {
        return {
          ...baseOptions,
          op: "TRANSFER" as const,
          tick: options.tick || "TEST",
          amt: options.amt || "1",
          destinationAddress: options.destinationAddress ||
            baseOptions.walletAddress,
        } as SRC20TransactionOptions;
      }

      case "src101-create": {
        return {
          ...baseOptions,
          op: options.op || "deploy",
          root: options.root || "test.btc",
          name: options.name,
          amt: options.amt,
          destinationAddress: options.destinationAddress,
        } as SRC101TransactionOptions;
      }

      default: {
        throw new Error(`Unsupported tool type: ${options.toolType}`);
      }
    }
  }

  /**
   * 🚀 NEW: Map internal tool type to adapter tool type
   */
  private mapToToolType(toolType: string): ToolType {
    switch (toolType) {
      case "stamp":
        return "stamp";
      case "src20-mint":
      case "src20-deploy":
      case "src20-transfer":
        return "src20";
      case "src101-create":
        return "src101";
      default:
        throw new Error(`Cannot map tool type: ${toolType}`);
    }
  }

  /**
   * Calculate estimated transaction size based on tool type and parameters
   */
  private calculateTransactionSize(options: EstimationOptions): number {
    const baseSize = 250; // Base transaction overhead

    switch (options.toolType) {
      case "stamp": {
        // Dynamic size calculation based on file size
        const fileSize = options.fileSize || options.file?.length || 0;
        const outputCount = Math.max(Math.ceil(fileSize / 32), 1);
        return baseSize + (outputCount * 43); // 43 bytes per OP_RETURN output
      }

      case "src20-mint":
      case "src20-deploy":
      case "src20-transfer": {
        const dataSize = options.data?.length || 50; // Typical SRC-20 data size
        const chunks = Math.ceil(dataSize / 32) || 1;
        return baseSize + (chunks * 64); // 64 bytes per P2WSH output
      }

      case "src101-create": {
        return baseSize + 100; // Fixed overhead for SRC-101
      }

      default: {
        return baseSize;
      }
    }
  }

  /**
   * Calculate dust value based on tool type and parameters
   */
  private calculateDustValue(options: EstimationOptions): number {
    switch (options.toolType) {
      case "stamp": {
        // Dynamic dust calculation based on file size
        const fileSize = options.fileSize || options.file?.length || 0;
        const outputCount = Math.max(Math.ceil(fileSize / 32), 1);
        // Each OP_RETURN output needs dust value
        return outputCount * 333; // DUST_SIZE per OP_RETURN output
      }

      case "src20-mint":
      case "src20-deploy":
      case "src20-transfer": {
        const chunks = Math.ceil((options.data?.length || 0) / 32) || 1;
        return chunks * 333; // SRC20_DUST per P2WSH output
      }

      default: {
        return 0; // No dust for operations that don't need multiple outputs
      }
    }
  }

  /**
   * Clear all caches (useful for testing or manual cache management)
   */
  clearCaches(): void {
    this.utxoCache.clear();
    toolEndpointFeeEstimator.clearCache();

    logger.debug("system", {
      message: "All fee estimation caches cleared",
    });
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    utxoCache: { size: number; maxSize: number };
    toolEndpointCache: any;
  } {
    return {
      utxoCache: this.utxoCache.getStats(),
      toolEndpointCache: toolEndpointFeeEstimator.getCacheStats(),
    };
  }
}

/**
 * Singleton instance for use throughout the application
 */
export const transactionConstructionService =
  new TransactionConstructionService();

/**
 * Convenience functions that delegate to the singleton instance
 */
export function estimateInstant(
  options: EstimationOptions,
): Promise<FeeEstimationResult> {
  return transactionConstructionService.estimateInstant(options);
}
export function estimateSmart(
  options: EstimationOptions,
): Promise<FeeEstimationResult> {
  return transactionConstructionService.estimateSmart(options);
}
export function estimateExact(
  options: EstimationOptions,
): Promise<FeeEstimationResult> {
  return transactionConstructionService.estimateExact(options);
}
