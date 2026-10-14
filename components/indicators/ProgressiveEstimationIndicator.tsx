import { containerPill } from "$layout";
import { tooltipButton } from "$notification";
import type { ProgressiveEstimationIndicatorProps } from "$types/ui.d.ts";
/**
 * Progressive Fee Estimation Indicator Component
 *
 * Displays the three-phase fee estimation status:
 * - Phase 1: Instant estimate
 * - Phase 2: Smart UTXO analysis
 * - Phase 3: Exact calculation
 *
 * Also includes error state display with clear functionality
 */

import { VNode } from "preact";

export function ProgressiveEstimationIndicator({
  isConnected,
  isSubmitting,
  isPreFetching,
  currentPhase,
  phase1,
  phase2,
  phase3,
  feeEstimationError,
  clearError,
}: ProgressiveEstimationIndicatorProps): VNode<any> | null {
  // Only show when connected
  if (!isConnected) {
    return null;
  }

  return (
    <div class="flex items-center gap-2 relative">
      {/* Phase Status Summary */}
      {!isSubmitting && !feeEstimationError && (
        <div className="relative group/pill">
          <div
            className={`${containerPill}`}
          >
            {/* Phase indicators */}
            <div className="flex items-center gap-1">
              {/* Phase 1: Instant */}
              <div
                className={`size-1.5 rounded-full tracking-wide ${
                  phase1 ? "bg-color-primary-400" : "bg-color-neutral-700"
                }`}
              />
              {/* Phase 2: Smart */}
              <div
                className={`size-1.5 rounded-full tracking-wide ${
                  phase2
                    ? "bg-color-primary-500"
                    : currentPhase === "smart" || isPreFetching
                    ? "bg-color-primary-500 animate-pulse"
                    : "bg-color-neutral-700"
                }`}
              />
              {/* Phase 3: Exact */}
              <div
                className={`size-1.5 rounded-full tracking-wide ${
                  phase3 ? "bg-color-primary-600" : "bg-color-neutral-700"
                }`}
              />
            </div>

            {/* Current phase text */}
            <span className="hidden min-[420px]:inline mt-[1px] ml-2 font-norma1 text-[8px] text-color-primary-500 tracking-wider">
              {currentPhase === "instant" && "ROUGH"}
              {currentPhase === "smart" && "SMART"}
              {currentPhase === "exact" && "EXACT"}
            </span>

            {/* Mobile-only emoji */}
            <span className="inline min-[420px]:hidden">
              {currentPhase === "instant" && ""}
              {currentPhase === "smart" && ""}
              {currentPhase === "exact" && ""}
            </span>
          </div>
          <div
            className={`${tooltipButton} opacity-0 group-hover/pill:opacity-100 transition-opacity duration-150`}
          >
            {currentPhase === "instant" && "ROUGH ESTIMATE"}
            {currentPhase === "smart" && "SMART UTXO ESTIMATE"}
            {currentPhase === "exact" && "EXACT CALCULATION"}
          </div>
        </div>
      )}

      {/* Phase 2: Smart UTXO-based estimation (background pre-fetching) */}
      {isPreFetching && !isSubmitting && (
        <div className="relative group/pill">
          <div
            className={`flex items-center px-3 py-1.5 ${containerPill}`}
          >
            <div className="relative">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping opacity-20" />
            </div>
            <span className="hidden sm:inline text-xs text-color-neutral-400 font-normal opacity-80">
              Smart UTXO analysis
            </span>
            <span className="inline sm:hidden text-blue-400 text-xs opacity-80">
              💡
            </span>
          </div>
          <div
            className={`${tooltipButton} opacity-0 group-hover/pill:opacity-100 transition-opacity duration-150`}
          >
            SMART UTXO ESTIMATE
          </div>
        </div>
      )}

      {/* Phase 3: Exact estimation (during minting) */}
      {isSubmitting && currentPhase === "exact" && (
        <div className="relative group/pill">
          <div className="flex items-center gap-2 bg-green-900/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-green-500/20">
            <div className="relative">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping opacity-20" />
            </div>
            <span className="hidden sm:inline text-xs text-green-300 font-normal opacity-90">
              Exact fee calculation
            </span>
            <span className="inline sm:hidden text-green-400 text-xs opacity-80">
              🎯
            </span>
          </div>
          <div
            className={`${tooltipButton} opacity-0 group-hover/pill:opacity-100 transition-opacity duration-150`}
          >
            EXACT CALCULATION
          </div>
        </div>
      )}

      {/* Error indicator */}
      {feeEstimationError && (
        <div className="relative group/pill">
          <div className="flex items-center gap-2 bg-red-900/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-red-500/20">
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
            <span className="hidden sm:inline text-xs text-red-300 font-normal opacity-90">
              Estimation error
            </span>
            <span className="inline sm:hidden text-red-400 text-xs opacity-80">
              ⚠️
            </span>
            <button
              type="button"
              onClick={clearError}
              className="text-red-300 hover:text-red-200 text-xs ml-1"
              title="Clear error"
            >
              ×
            </button>
          </div>
          <div
            className={`${tooltipButton} opacity-0 group-hover/pill:opacity-100 transition-opacity duration-150`}
          >
            FEE ESTIMATION ERROR
          </div>
        </div>
      )}
    </div>
  );
}
