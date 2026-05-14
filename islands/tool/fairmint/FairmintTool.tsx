/* ===== FAIRMINT CONTENT COMPONENT ===== */
import { useFairmintForm } from "$client/hooks/useFairmintForm.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { ProgressiveEstimationIndicator } from "$components/indicators/ProgressiveEstimationIndicator.tsx";
import {
  bodyTool,
  containerBackground,
  containerColForm,
  containerGap,
  transitionAll,
} from "$layout";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import { logger } from "$lib/utils/logger.ts";
import { mapProgressiveFeeDetails } from "$lib/utils/performance/fees/fee-estimation-utils.ts";
import { StatusMessages } from "$notification";
import { FeeCalculatorBase } from "$section";
import { titleNeutral } from "$text";
import type { FairmintToolProps } from "$types/ui.d.ts";
import { useEffect, useState } from "preact/hooks";

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
export function FairmintTool({ fairminters }: FairmintToolProps) {
  /* ===== STATE ===== */
  const {
    formState,
    handleAssetChange,
    handleInputChange,
    handleSubmit,
    handleChangeFee,
    isLoading,
    isSubmitting,
    submissionMessage,
    apiError,
  } = useFairmintForm(fairminters || []);

  const [tosAgreed, setTosAgreed] = useState(false);
  const { wallet } = walletContext;

  /* ===== PROGRESSIVE FEE ESTIMATION ===== */
  const {
    getBestEstimate,
    isEstimating,
    isPreFetching,
    estimateExact, // Phase 3: Exact estimation for when user clicks FAIRMINT
    // Phase-specific results for UI indicators
    phase1,
    phase2,
    phase3,
    currentPhase,
    error: feeEstimationError,
    clearError,
  } = useTransactionConstructionService({
    toolType: "stamp", // Fairmint uses stamp toolType for minting
    feeRate: isSubmitting ? 0 : formState.fee,
    walletAddress: wallet?.address || "", // Provide empty string instead of undefined
    isConnected: !!wallet && !isSubmitting,
    isSubmitting,
    // Fairmint specific parameters - using defaults
    fileType: "application/json", // Fairmint uses JSON
    fileSize: formState.jsonSize || 0,
    issuance: parseInt(formState.quantity, 10) || 1,
  });

  // Get the best available fee estimate
  const progressiveFeeDetails = getBestEstimate();

  // Local state for exact fee details (updated when Phase 3 completes) - StampingTool pattern
  const [exactFeeDetails, setExactFeeDetails] = useState<
    typeof progressiveFeeDetails | null
  >(null);

  // Reset exactFeeDetails when fee rate changes to allow slider updates - StampingTool pattern
  useEffect(() => {
    // Clear exact fee details when fee rate changes so slider updates work
    setExactFeeDetails(null);
  }, [formState.fee]);

  // Wrapper function for fairminting that gets exact fees first - StampingTool pattern
  const handleFairmintWithExactFees = async () => {
    try {
      // Get exact fees before final submission
      const exactFees = await estimateExact();
      if (exactFees) {
        // Calculate net spend amount (matches wallet display)
        const netSpendAmount = exactFees.totalValue || 0;
        setExactFeeDetails({
          ...exactFees,
          totalValue: netSpendAmount, // Matches wallet
        });
      }
      // Call the original fairmint submission
      await handleSubmit();
    } catch (error) {
      logger.error("stamps", {
        message: "Error in Fairmint exact fee estimation",
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      // Still proceed with submission even if exact fees fail
      await handleSubmit();
    }
  };

  /* ===== HELPERS ===== */
  // Check if the fairminters array is empty
  const hasFairminters = fairminters && fairminters.length > 0;

  /* ===== RENDER ===== */
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div class={`${bodyTool} ${containerGap}`} data-testid="fairmint-tool">
      <h1 class={`${titleNeutral} mx-auto -mb-2 mobileLg:-mb-4`}>
        FAIRMINT
      </h1>

      <form class={containerBackground}>
        {/* ===== TOKEN SELECTION ===== */}
        <div class={containerColForm}>
          {hasFairminters
            ? (
              // Render the select dropdown if fairminters are available
              <select
                class="h-10 p-3 rounded-2xl bg-color-grey text-black placeholder:text-black placeholder:font-light"
                value={formState.asset}
                onChange={handleAssetChange}
              >
                <option value="">SELECT A TOKEN</option>
                {fairminters
                  .filter(
                    (fairminter: any) =>
                      fairminter.asset && fairminter.status === "open",
                  )
                  .map((fairminter: any) => {
                    const asset = fairminter.asset;
                    const displayName = asset.startsWith("A")
                      ? fairminter.asset_longname || asset
                      : asset;
                    return (
                      <option value={asset} key={asset}>
                        {displayName}
                      </option>
                    );
                  })}
              </select>
            )
            : (
              // Render an input field if no fairminters are available
              <input
                type="text"
                placeholder="ENTER ASSET"
                class="h-10 p-3 rounded-2xl bg-color-grey text-black placeholder:text-black placeholder:font-light"
                value={formState.asset}
                onChange={(e) => handleInputChange(e, "asset")}
              />
            )}

          <input
            type="number"
            placeholder="QUANTITY"
            class="h-10 p-3 rounded-2xl bg-color-grey text-black placeholder:text-black placeholder:font-light"
            value={formState.quantity}
            onChange={(e) => handleInputChange(e, "quantity")}
          />
        </div>
      </form>

      {/* ===== FEE CALCULATOR ===== */}
      <div class={containerBackground} data-testid="fee-calculator">
        {/* ===== PHASE INDICATOR ===== */}
        {currentPhase && wallet && !isSubmitting && (
          <div
            data-phase={currentPhase}
            data-testid="fee-phase-indicator"
            class="flex items-center gap-2 mb-3"
            style={{
              transitionDuration: "0.3s", // Removed ANIMATION_TIMINGS.normal
              transitionTimingFunction: "ease-in-out", // Removed EASING_FUNCTIONS.easeInOut
            }}
          >
            {/* Phase dots */}
            <div class="flex items-center gap-1">
              <div
                class={`w-1.5 h-1.5 rounded-full ${transitionAll} ${
                  phase1 ? "opacity-100" : "opacity-30"
                }`}
                style={{
                  backgroundColor: phase1
                    ? "#007BFF" // Changed from FEE_INDICATOR_COLORS.instant
                    : "#6C757D", // Changed from FEE_INDICATOR_COLORS.loading
                }}
                title="Phase 1: Instant estimate"
              />
              <div
                class={`w-1.5 h-1.5 rounded-full ${transitionAll} ${
                  phase2 ? "opacity-100" : "opacity-30"
                } ${isPreFetching ? "animate-pulse" : ""}`}
                style={{
                  backgroundColor: phase2
                    ? "#28A745" // Changed from FEE_INDICATOR_COLORS.cached
                    : "#6C757D", // Changed from FEE_INDICATOR_COLORS.loading
                }}
                title="Phase 2: Smart UTXO estimate"
              />
              <div
                class={`w-1.5 h-1.5 rounded-full ${transitionAll} ${
                  phase3 ? "opacity-100" : "opacity-30"
                } ${isEstimating ? "animate-pulse" : ""}`}
                style={{
                  backgroundColor: phase3
                    ? "#DC3545" // Changed from FEE_INDICATOR_COLORS.exact
                    : "#6C757D", // Changed from FEE_INDICATOR_COLORS.loading
                }}
                title="Phase 3: Exact calculation"
              />
            </div>

            {/* Phase text */}
            <span class="text-xs text-color-grey-light font-normal opacity-80">
              {currentPhase === "instant" && "⚡ Instant"}
              {currentPhase === "smart" && "💡 Smart"}
              {currentPhase === "exact" && "🎯 Exact"}
            </span>
          </div>
        )}

        <FeeCalculatorBase
          fee={formState.fee}
          handleChangeFee={handleChangeFee}
          type="fairmint"
          fileType="application/json"
          fileSize={formState.jsonSize || 0}
          BTCPrice={formState.BTCPrice}
          isSubmitting={isSubmitting}
          onSubmit={handleFairmintWithExactFees}
          buttonName="FAIRMINT"
          tosAgreed={tosAgreed}
          onTosChange={setTosAgreed}
          feeDetails={mapProgressiveFeeDetails(
            exactFeeDetails || progressiveFeeDetails,
          )}
          bitname=""
          progressIndicator={
            <ProgressiveEstimationIndicator
              isConnected={!!wallet && !isSubmitting}
              isSubmitting={isSubmitting}
              isPreFetching={isPreFetching}
              currentPhase={currentPhase}
              phase1={!!phase1}
              phase2={!!phase2}
              phase3={!!phase3}
              feeEstimationError={feeEstimationError}
              clearError={clearError}
            />
          }
        />

        {/* ===== STATUS MESSAGES ===== */}
        <StatusMessages
          submissionMessage={submissionMessage}
          apiError={apiError}
        />
      </div>
    </div>
  );
}
