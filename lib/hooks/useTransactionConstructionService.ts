/**
 * useTransactionConstructionService - World-class transaction construction hook
 *
 * Uses the new TransactionConstructionService class to provide:
 * • Phase 1: Instant mathematical estimates (0ms)
 * • Phase 2: Smart UTXO-based estimates (100-300ms)
 * • Phase 3: Exact API-based estimates (300-1000ms)
 *
 * @example
 * ```tsx
 * const {
 *   phase1, phase2, phase3,
 *   isEstimating, estimateExact
 * } = useTransactionConstructionService({
 *   toolType: "stamp",
 *   feeRate: 10,
 *   walletAddress: "bc1q...",
 *   file: base64Data
 * });
 * ```
 */

import { debounce } from "$lib/utils/performance/debounce.ts";
import { logger } from "$lib/utils/logger.ts";
import {
  type EstimationOptions,
  type FeeEstimationResult as TransactionFeeEstimationResult,
  transactionConstructionService,
} from "$lib/utils/minting/TransactionConstructionService.ts";
import { useCallback, useEffect, useMemo, useReducer } from "preact/hooks";
import type { FeeEstimatorState } from "$types/ui.d.ts";

// Hook state interface

// Hook actions
type FeeEstimatorAction =
  | { type: "START_ESTIMATION"; phase: "instant" | "smart" | "exact" } // Updated: "cached" -> "smart"
  | {
    type: "ESTIMATION_SUCCESS";
    phase: "instant" | "smart" | "exact"; // Updated: "cached" -> "smart"
    result: TransactionFeeEstimationResult;
  }
  | { type: "ESTIMATION_ERROR"; error: string }
  | { type: "START_PREFETCH" }
  | { type: "STOP_PREFETCH" }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" };

// Initial state
const initialState: FeeEstimatorState = {
  phase1: null,
  phase2: null,
  phase3: null,
  currentPhase: "instant",
  isEstimating: false,
  isPreFetching: false,
  error: null,
  lastUpdate: 0,
};

// Reducer function
function feeEstimatorReducer(
  state: FeeEstimatorState,
  action: FeeEstimatorAction,
): FeeEstimatorState {
  switch (action.type) {
    case "START_ESTIMATION":
      return {
        ...state,
        isEstimating: true,
        error: null,
        currentPhase: action.phase,
      };

    case "ESTIMATION_SUCCESS":
      return {
        ...state,
        [
          `phase${
            action.phase === "instant"
              ? "1"
              : action.phase === "smart"
              ? "2"
              : "3"
          }`
        ]: action.result, // Updated: "cached" -> "smart"
        isEstimating: false,
        currentPhase: action.phase,
        lastUpdate: Date.now(),
      };

    case "ESTIMATION_ERROR":
      return {
        ...state,
        isEstimating: false,
        error: action.error,
      };

    case "START_PREFETCH":
      return {
        ...state,
        isPreFetching: true,
      };

    case "STOP_PREFETCH":
      return {
        ...state,
        isPreFetching: false,
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

/**
 * Progressive fee estimation hook with 3-phase approach
 */
export function useTransactionConstructionService(options: EstimationOptions) {
  const [state, dispatch] = useReducer(feeEstimatorReducer, initialState);

  // Memoize options to prevent unnecessary re-renders
  // 🔧 FIX: Only include defined properties to avoid TypeScript strict optional property issues
  const memoizedOptions = useMemo((): EstimationOptions => {
    const baseOptions: EstimationOptions = {
      toolType: options.toolType,
      feeRate: options.feeRate,
      isConnected: options.isConnected,
      walletAddress: options.walletAddress,
      isSubmitting: options.isSubmitting,
    };

    // Add optional properties only if they're defined
    if (options.file !== undefined) {
      baseOptions.file = options.file;
    }
    if (options.filename !== undefined) {
      baseOptions.filename = options.filename;
    }
    if (options.fileSize !== undefined) {
      baseOptions.fileSize = options.fileSize;
    }
    if (options.quantity !== undefined) {
      baseOptions.quantity = options.quantity;
    }
    if (options.locked !== undefined) {
      baseOptions.locked = options.locked;
    }
    if (options.divisible !== undefined) {
      baseOptions.divisible = options.divisible;
    }
    if (options.tick !== undefined) {
      baseOptions.tick = options.tick;
    }
    if (options.max !== undefined) {
      baseOptions.max = options.max;
    }
    if (options.lim !== undefined) {
      baseOptions.lim = options.lim;
    }
    if (options.dec !== undefined) {
      baseOptions.dec = options.dec;
    }
    if (options.amt !== undefined) {
      baseOptions.amt = options.amt;
    }
    if (options.destinationAddress !== undefined) {
      baseOptions.destinationAddress = options.destinationAddress;
    }
    if (options.op !== undefined) {
      baseOptions.op = options.op;
    }
    if (options.root !== undefined) {
      baseOptions.root = options.root;
    }
    if (options.name !== undefined) {
      baseOptions.name = options.name;
    }
    if (options.data !== undefined) {
      baseOptions.data = options.data;
    }

    return baseOptions;
  }, [
    options.toolType,
    options.walletAddress,
    options.feeRate,
    options.isConnected,
    options.isSubmitting,
    options.file,
    options.filename,
    options.fileSize,
    options.quantity,
    options.locked,
    options.divisible,
    options.tick,
    options.max,
    options.lim,
    options.dec,
    options.amt,
    options.destinationAddress,
    options.op,
    options.root,
    options.name,
    options.data,
  ]);

  // Phase 1: Instant estimation (runs immediately on options change)
  useEffect(() => {
    let isCancelled = false;

    const runPhase1 = async () => {
      try {
        dispatch({ type: "START_ESTIMATION", phase: "instant" });

        const result = await transactionConstructionService.estimateInstant(
          memoizedOptions,
        );

        if (!isCancelled) {
          dispatch({ type: "ESTIMATION_SUCCESS", phase: "instant", result });
        }
      } catch (error) {
        if (!isCancelled) {
          const errorMsg = error instanceof Error
            ? error.message
            : String(error);
          // Don't surface wallet-connection errors — missing wallet is an
          // expected state on tool pages, not an error worth displaying.
          if (!/wallet.*connect|connect.*required/i.test(errorMsg)) {
            dispatch({ type: "ESTIMATION_ERROR", error: errorMsg });
          }
        }
      }
    };

    runPhase1();

    return () => {
      isCancelled = true;
    };
  }, [
    memoizedOptions.toolType,
    memoizedOptions.feeRate,
    memoizedOptions.file,
    memoizedOptions.filename,
    memoizedOptions.quantity,
    memoizedOptions.fileSize,
  ]);

  // Phase 2: Smart tool endpoint estimation (runs when wallet is connected and not submitting)
  useEffect(() => {
    let isCancelled = false;

    // 🚀 UPDATED: Match the new estimateSmart logic - only skip during active submission
    // Phase 2 can now run even without wallet connection using dummy addresses
    if (memoizedOptions.isSubmitting) {
      return;
    }

    const runPhase2 = async () => {
      try {
        dispatch({ type: "START_ESTIMATION", phase: "smart" }); // Updated: "cached" -> "smart"

        // 🚀 NEW: Use estimateSmart instead of estimateCached
        const result = await transactionConstructionService.estimateSmart(
          memoizedOptions,
        );

        if (!isCancelled) {
          dispatch({ type: "ESTIMATION_SUCCESS", phase: "smart", result }); // Updated: "cached" -> "smart"
        }
      } catch (error) {
        if (!isCancelled) {
          logger.warn("system", { // 🔧 FIX: Use valid logger namespace
            message: "Phase 2 estimation failed, using Phase 1 result",
            error: error instanceof Error ? error.message : String(error),
          });
          // Don't dispatch error - Phase 1 result is still valid
        }
      }
    };

    // Debounce Phase 2 to avoid excessive API calls
    const debouncedPhase2 = debounce(runPhase2, 500);
    debouncedPhase2();

    return () => {
      isCancelled = true;
    };
  }, [
    memoizedOptions.walletAddress,
    memoizedOptions.isConnected,
    memoizedOptions.isSubmitting,
    memoizedOptions.feeRate,
    memoizedOptions.file,
    memoizedOptions.filename,
    memoizedOptions.quantity,
    memoizedOptions.fileSize,
  ]);

  // Phase 3: Exact estimation (manual trigger only)
  const estimateExact = useCallback(
    async (): Promise<TransactionFeeEstimationResult> => {
      try {
        dispatch({ type: "START_ESTIMATION", phase: "exact" });

        const result = await transactionConstructionService.estimateExact(
          memoizedOptions,
        );

        dispatch({ type: "ESTIMATION_SUCCESS", phase: "exact", result });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        // Don't surface wallet-connection errors — missing wallet is an
        // expected state on tool pages, not an error worth displaying.
        if (!/wallet.*connect|connect.*required/i.test(errorMessage)) {
          dispatch({ type: "ESTIMATION_ERROR", error: errorMessage });
        }
        throw error;
      }
    },
    [memoizedOptions],
  );

  // Background pre-fetching for Phase 3 (optional optimization)
  const startPreFetch = useCallback(() => {
    if (
      !memoizedOptions.walletAddress ||
      !memoizedOptions.isConnected ||
      state.isPreFetching
    ) {
      return;
    }

    dispatch({ type: "START_PREFETCH" });

    // Pre-fetch detailed UTXO data in background
    // This is now less relevant since we use tool endpoints, but kept for compatibility
    setTimeout(() => {
      dispatch({ type: "STOP_PREFETCH" });
    }, 2000);
  }, [
    memoizedOptions.walletAddress,
    memoizedOptions.isConnected,
    state.isPreFetching,
  ]);

  // Utility functions
  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const clearCache = useCallback(() => {
    // 🚀 UPDATED: Use clearCaches instead of clearCache
    transactionConstructionService.clearCaches();
  }, []);

  // Get the best available estimate
  const getBestEstimate = useCallback(
    (): TransactionFeeEstimationResult | null => {
      // Prefer Phase 2 (smart) over Phase 1 (instant) over Phase 3 (exact)
      // Phase 3 is only used when explicitly requested
      return state.phase2 || state.phase1 || null;
    },
    [state.phase1, state.phase2],
  );

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return transactionConstructionService.getCacheStats();
  }, []);

  return {
    // State
    phase1: state.phase1,
    phase2: state.phase2,
    phase3: state.phase3,
    currentPhase: state.currentPhase,
    isEstimating: state.isEstimating,
    isPreFetching: state.isPreFetching,
    error: state.error,
    lastUpdate: state.lastUpdate,

    // Actions
    estimateExact,
    startPreFetch,
    clearError,
    reset,
    clearCache,

    // Utilities
    getBestEstimate,
    getCacheStats,

    // Computed values
    hasError: !!state.error,
    hasPhase1: !!state.phase1,
    hasPhase2: !!state.phase2,
    hasPhase3: !!state.phase3,
    isReady: !!state.phase1, // At least Phase 1 is complete
    isConnectedAndReady: !!state.phase2, // Phase 2 is complete (requires connection)
  };
}
