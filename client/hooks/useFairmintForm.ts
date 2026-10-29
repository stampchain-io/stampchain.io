import { useConfig } from "$client/hooks/useConfig.ts";
import {
  showConnectWalletModal,
  walletContext,
} from "$client/wallet/wallet.ts";
import { useFees } from "$fees";
import type { Config } from "$types/base.d.ts";
import { debounce } from "$lib/utils/performance/debounce.ts";
import { logger } from "$lib/utils/logger.ts";
import { estimateFee } from "$lib/utils/minting/feeCalculations.ts";
import { handleUnknownError } from "$lib/utils/errorHandling.ts";
import { decodeBase64 } from "@std/encoding/base64";
import { encodeHex } from "@std/encoding/hex";
import axiod from "axiod";
import { useEffect, useState } from "preact/hooks";
import type { FairmintFormState } from "$types/ui.d.ts";

export function useFairmintForm(fairminters: any[]) {
  const { config, isLoading: configLoading } = useConfig<Config>();
  const {
    fees,
    loading: feeLoading,
    fetchFees,
    feeSource,
    isUsingFallback,
    lastGoodDataAge,
    forceRefresh,
  } = useFees();
  const [isLoading, setIsLoading] = useState(configLoading || feeLoading);

  const [formState, setFormState] = useState<FairmintFormState>({
    asset: "",
    quantity: "",
    fee: 0,
    BTCPrice: 0,
    jsonSize: 0,
    utxoAncestors: [],
    isLoading: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<
    {
      message: string;
      txid?: string;
    } | null
  >(null);
  const [apiError, setApiError] = useState("");

  const { wallet } = walletContext;
  const address = wallet.address;

  // Progressive fee estimation for fairmint
  const estimateFairmintFeesDebounced = debounce(async (
    asset: string,
    quantity: string,
    fee: number,
    walletAddress?: string,
  ) => {
    if (!asset || !quantity || fee <= 0) return;

    try {
      // Phase 1: Immediate client-side fee estimation
      // Fairmint transactions typically have:
      // 1. Recipient output (546 sats dust limit)
      // 2. Change output (variable, back to sender)
      const outputs = [
        { type: "P2WPKH", value: 546, script: "" }, // Recipient output
        { type: "P2WPKH", value: 0, script: "" }, // Change output
      ];

      const immediateEstimate = estimateFee(outputs, fee, 1);
      const dustValue = 546; // Standard P2WPKH dust limit
      const totalEstimate = immediateEstimate + dustValue;

      // Set immediate estimates with hasExactFees: false
      setFormState((prev) => ({
        ...prev,
        psbtFeeDetails: {
          minerFee: immediateEstimate,
          estMinerFee: immediateEstimate, // backward compatibility
          totalDustValue: dustValue,
          totalFee: totalEstimate,
          hasExactFees: false, // Mark as estimate
          feeRate: fee,
        },
        isLoading: true, // Show that we're upgrading to exact fees
      }));

      logger.debug("ui", {
        message: "Fairmint immediate fee estimate",
        data: {
          asset,
          quantity,
          fee,
          immediateEstimate,
          dustValue,
          totalEstimate,
          isEstimate: true,
        },
      });

      // Phase 2: Upgrade to exact fees via API with dryRun
      if (!config) return; // Need config for API call

      const shouldUseDryRun = !walletAddress; // Use dryRun if no wallet connected

      const response = await axiod.post("/api/v2/fairmint/compose", {
        address: walletAddress || "bc1qtest", // Dummy address for dryRun
        asset,
        quantity,
        options: {
          fee_per_kb: fee * 1000,
        },
        service_fee: config?.MINTING_SERVICE_FEE,
        service_fee_address: config?.MINTING_SERVICE_FEE_ADDRESS,
        dryRun: shouldUseDryRun, // Dynamic based on wallet state
      });

      if (response.data) {
        logger.debug("ui", {
          message: "Fairmint API fee response",
          data: {
            asset,
            quantity,
            shouldUseDryRun,
            hasExactFees: !shouldUseDryRun,
            response: response.data,
          },
        });

        setFormState((prev) => ({
          ...prev,
          psbtFeeDetails: {
            minerFee: Number(response.data.est_miner_fee) ||
              Number(response.data.estimatedFee) || 0,
            estMinerFee: Number(response.data.est_miner_fee) ||
              Number(response.data.estimatedFee) || 0, // backward compatibility
            totalDustValue: Number(response.data.total_dust_value) || 546,
            totalFee: (Number(response.data.est_miner_fee) ||
              Number(response.data.estimatedFee) || 0) +
              (Number(response.data.total_dust_value) || 546),
            hasExactFees: !shouldUseDryRun, // Exact fees when dryRun=false, estimates when dryRun=true
            feeRate: fee,
          },
          isLoading: false, // Clear loading state after exact fees are loaded
        }));
      }
    } catch (unknownError) {
      const error = handleUnknownError(
        unknownError,
        "Failed to estimate fairmint fees",
      );
      logger.error("ui", {
        message: "Failed to estimate fairmint fees",
        error: error.message,
        errorDetails: {
          name: error.name,
          stack: error.stack,
        },
      });

      // On error, preserve estimates and clear loading state
      setFormState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, 750);

  useEffect(() => {
    setIsLoading(configLoading || feeLoading);
  }, [configLoading, feeLoading]);

  // Trigger progressive fee estimation when form values change
  useEffect(() => {
    if (formState.asset && formState.quantity && formState.fee > 0) {
      estimateFairmintFeesDebounced(
        formState.asset,
        formState.quantity,
        formState.fee,
        address,
      );
    }

    return () => {
      estimateFairmintFeesDebounced.cancel();
    };
  }, [
    formState.asset,
    formState.quantity,
    formState.fee,
    address,
    config,
    estimateFairmintFeesDebounced,
  ]);

  useEffect(() => {
    if (fees && !feeLoading) {
      logger.debug("ui", {
        message: "useFairmintForm: Updating fee from fee signal",
        data: fees,
        feeSource,
        isUsingFallback,
        lastGoodDataAge,
      });

      const recommendedFee = Math.round(fees.recommendedFee);

      // Apply component-level fallbacks if needed
      let finalFee = recommendedFee;

      // If fee is invalid or too low, use conservative fallback
      if (recommendedFee <= 0) {
        finalFee = 10; // Conservative 10 sats/vB fallback
        logger.warn("ui", {
          message: "useFairmintForm: Using conservative fee fallback",
          originalFee: recommendedFee,
          fallbackFee: finalFee,
          feeSource: feeSource.source,
        });
      }

      setFormState((prev) => ({ ...prev, fee: finalFee }));

      // Log fallback usage for monitoring
      if (isUsingFallback) {
        logger.info("ui", {
          message: "useFairmintForm: Using fallback fee data",
          source: feeSource.source,
          confidence: feeSource.confidence,
          dataAge: lastGoodDataAge,
          fee: finalFee,
        });
      }
    } else if (!feeLoading && !fees) {
      // Complete fallback when no fee data is available
      logger.warn("ui", {
        message:
          "useFairmintForm: No fee data available, using conservative fallback",
      });

      setFormState((prev) => ({
        ...prev,
        fee: prev.fee > 0 ? prev.fee : 10, // Keep existing or use 10 sats/vB
      }));
    }
  }, [fees, feeLoading, feeSource, isUsingFallback, lastGoodDataAge]);

  const selectAsset = (asset: string) => {
    const selectedFairminter = fairminters.find(
      (fm) => fm.asset === asset,
    );
    setFormState((prev) => ({
      ...prev,
      asset,
      quantity: selectedFairminter
        ? String(selectedFairminter.max_mint_per_tx ?? prev.quantity)
        : prev.quantity,
    }));
  };

  const handleAssetChange = (e: Event) => {
    selectAsset((e.target as HTMLSelectElement).value);
  };

  const handleInputChange = (e: Event, field: string) => {
    const value = (e.target as HTMLInputElement).value;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangeFee = (newFee: number) => {
    setFormState((prev) => ({ ...prev, fee: newFee }));
  };

  const handleSubmit = async () => {
    if (!walletContext.isConnected) {
      showConnectWalletModal.value = true;
      return;
    }

    if (!config) {
      logger.error("ui", {
        message: "Configuration not loaded",
        context: "useFairmintForm",
      });
      setApiError("Configuration not loaded");
      return;
    }

    if (!formState.asset || !formState.quantity || formState.fee <= 0) {
      logger.warn("ui", {
        message: "Invalid form state",
        context: "useFairmintForm",
        formState,
      });
      setApiError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionMessage(null);
    setApiError("");

    try {
      logger.debug("ui", {
        message: "Submitting fairmint request",
        context: "useFairmintForm",
        payload: {
          address,
          asset: formState.asset,
          quantity: formState.quantity,
          fee_per_kb: formState.fee * 1000,
        },
      });

      // For submission, we always need the actual PSBT (dryRun: false)
      const response = await axiod.post("/api/v2/fairmint/compose", {
        address,
        asset: formState.asset,
        quantity: formState.quantity,
        options: {
          fee_per_kb: formState.fee * 1000,
        },
        service_fee: config?.MINTING_SERVICE_FEE,
        service_fee_address: config?.MINTING_SERVICE_FEE_ADDRESS,
        dryRun: false, // Always false for actual submission
      });

      logger.debug("ui", {
        message: "Received API response from /api/v2/fairmint/compose",
        context: "useFairmintForm",
        response: response.data,
      });

      // Update psbtFeeDetails with exact values from submission
      if (response.data) {
        setFormState((prev) => ({
          ...prev,
          psbtFeeDetails: {
            minerFee: Number(response.data.est_miner_fee) ||
              Number(response.data.estimatedFee) || 0,
            estMinerFee: Number(response.data.est_miner_fee) ||
              Number(response.data.estimatedFee) || 0, // backward compatibility
            totalDustValue: Number(response.data.total_dust_value) || 546,
            totalFee: (Number(response.data.est_miner_fee) ||
              Number(response.data.estimatedFee) || 0) +
              (Number(response.data.total_dust_value) || 546),
            hasExactFees: true, // Always exact for submission
            feeRate: formState.fee,
          },
        }));
      }

      const psbtBase64 = response.data?.psbtHex || response.data?.psbt;

      if (!psbtBase64 || typeof psbtBase64 !== "string") {
        throw new Error("Invalid response from server: PSBT not found.");
      }

      // Convert the PSBT from Base64 to Uint8Array
      const psbtUint8Array = decodeBase64(psbtBase64);
      // Convert Uint8Array to Hex String
      const psbtHex = encodeHex(psbtUint8Array);

      logger.debug("ui", {
        message: "Processing PSBT",
        context: "useFairmintForm",
        psbtHex,
      });

      const { signed, txid, error } = await walletContext.signPSBT(
        wallet,
        psbtHex,
        [],
        true,
      );

      if (signed) {
        logger.info("ui", {
          message: "Transaction successfully broadcasted",
          context: "useFairmintForm",
          txid,
        });
        setSubmissionMessage({ message: " Broadcasted.", txid });
      } else {
        logger.error("ui", {
          message: "Transaction signing failed",
          context: "useFairmintForm",
          error,
        });
        setSubmissionMessage({ message: `Failed: ${error}` });
      }
    } catch (unknownError) {
      const error = handleUnknownError(unknownError, "Error during submission");
      logger.error("ui", {
        message: "Error during submission",
        context: "useFairmintForm",
        error: error.message,
        errorDetails: {
          name: error.name,
          stack: error.stack,
        },
      });
      setApiError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const feeEstimationParams = {
    type: "fairmint",
    inputType: "P2WPKH",
    outputTypes: ["P2WPKH"],
    feeRate: formState.fee,
  };

  return {
    formState,
    selectAsset,
    handleAssetChange,
    handleInputChange,
    handleSubmit,
    handleChangeFee,
    fetchFees,
    forceRefresh,
    isLoading,
    isSubmitting,
    submissionMessage,
    apiError,
    feeEstimationParams,
    // Fee source information for UI feedback
    feeSource,
    isUsingFallback,
    lastGoodDataAge,
  };
}
