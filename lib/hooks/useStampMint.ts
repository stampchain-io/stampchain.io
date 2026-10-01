/* ===== STAMP MINT HOOK ===== */
/*
 * Shared mint pipeline for the Classic, Posh and Recursive create pages:
 * editions / lock / CPID state, fee sync, progressive fee estimation and the
 * mint -> sign -> broadcast flow. The caller supplies the file payload.
 */
import { useConfig } from "$client/hooks/useConfig.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { getWalletProvider } from "$client/wallet/walletHelper.ts";
import { useFees } from "$lib/hooks/useFees.ts";
import {
  isMaraUnavailableError,
  type StampSubmissionMessage,
  useMaraMode,
} from "$lib/hooks/useMaraMode.ts";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import { logger } from "$lib/utils/logger.ts";
import { validateWalletAddressForMinting } from "$lib/utils/scriptTypeUtils.ts";
import {
  buildMintRequest,
  extractErrorMessage,
  isStampFormValid,
  parseEditions,
  type StampMintPayload,
  type StampMintRequest,
  type StampMintVariant,
  validateCustomCpid,
  validateEditionsInput,
  validatePoshName,
} from "$lib/utils/stamps/mintHelpers.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import type { NormalizedMintResponse } from "$types/api.d.ts";
import type { Config } from "$types/base.d.ts";
import axiod from "axiod";
import { Fragment, h } from "preact";
import { useEffect, useState } from "preact/hooks";

/* ===== TYPES ===== */
export interface UseStampMintOptions {
  variant: StampMintVariant;
  /** File content to mint; null until the caller has something valid. */
  payload: StampMintPayload | null;
  /** Enable MARA Slipstream mode (activated via `?outputValue=`). */
  enableMara?: boolean;
  /** Caller-specific reason minting is blocked (e.g. payload too large). */
  extraBlockReason?: string | null;
  /** Skip network fee estimation (e.g. while the caller is still editing). */
  pauseEstimation?: boolean;
  /** Called once a mint was broadcast/submitted, after mint state reset. */
  onSuccess?: () => void;
}

const DEFAULT_FEE_RATE = 1;
const MIN_FEE_RATE = 0.1;
const DEFAULT_BTC_PRICE = 60000;

/* ===== HOOK ===== */
export function useStampMint(options: UseStampMintOptions) {
  const {
    variant,
    payload,
    enableMara = false,
    extraBlockReason = null,
    pauseEstimation = false,
    onSuccess,
  } = options;

  const { config, isLoading: isConfigLoading } = useConfig<Config>();
  const { wallet, isConnected } = walletContext;
  const address = isConnected ? wallet.address : undefined;
  const { fees, loading: feesLoading } = useFees();

  /* ===== FORM STATE ===== */
  const [fee, setFee] = useState<number>(DEFAULT_FEE_RATE);
  const [BTCPrice, setBTCPrice] = useState<number>(DEFAULT_BTC_PRICE);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [issuance, setIssuance] = useState("1");
  const [issuanceError, setIssuanceError] = useState("");
  const [isLocked, setIsLocked] = useState(true);
  const [stampName, setStampName] = useState("");
  const [stampNameError, setStampNameError] = useState("");
  const [includeCustomCpid, setIncludeCustomCpid] = useState(false);

  /* ===== SUBMISSION STATE ===== */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [submissionMessage, setSubmissionMessage] = useState<
    StampSubmissionMessage | null
  >(null);
  const [addressError, setAddressError] = useState<string | undefined>(
    undefined,
  );

  /* ===== MARA ===== */
  const mara = useMaraMode({
    enabled: enableMara,
    setFee,
    setApiError,
    setSubmissionMessage,
  });
  const { maraMode, outputValue, maraFeeRate } = mara;

  /* ===== FEE ESTIMATION ===== */
  const estimation = useTransactionConstructionService({
    toolType: "stamp",
    feeRate: isSubmitting ? 0 : fee, // Disable by setting feeRate to 0 during submission
    walletAddress: wallet?.address || "",
    isConnected: !!wallet && !isSubmitting,
    isSubmitting: isSubmitting || pauseEstimation,
    ...(payload
      ? {
        file: payload.file,
        filename: payload.filename,
        fileSize: payload.fileSize,
      }
      : {}),
    quantity: Number.isFinite(parseEditions(issuance))
      ? parseEditions(issuance)
      : 1,
    locked: isLocked,
    divisible: false,
    ...(maraMode && outputValue !== null ? { outputValue } : {}),
  });

  const progressiveFeeDetails = estimation.getBestEstimate();
  const [exactFeeDetails, setExactFeeDetails] = useState<
    typeof progressiveFeeDetails
  >(null);
  const displayedFeeDetails = exactFeeDetails || progressiveFeeDetails;

  // Reset exact details when inputs change so slider updates apply
  useEffect(() => {
    setExactFeeDetails(null);
  }, [fee, issuance, isLocked, payload?.file]);

  // Follow the network fee unless MARA dictates the rate
  useEffect(() => {
    if (fees && !feesLoading && !maraMode) {
      const recommended = fees.recommendedFee;
      if (recommended != null && recommended >= MIN_FEE_RATE) {
        setFee(recommended);
      }
    }
    if (typeof fees?.btcPrice === "number" && fees.btcPrice > 0) {
      setBTCPrice(fees.btcPrice);
    }
  }, [fees, feesLoading, maraMode]);

  // Validate the connected wallet address type for minting
  useEffect(() => {
    if (isConnected && address) {
      const { error } = validateWalletAddressForMinting(address);
      setAddressError(error);
      if (error) setSubmissionMessage(null);
    } else {
      setAddressError(undefined);
    }
  }, [address, isConnected]);

  /* ===== VALIDITY ===== */
  const isFormValid = isStampFormValid({
    variant,
    hasPayload: !!payload,
    issuance,
    issuanceError,
    stampName,
    stampNameError,
    includeCustomCpid,
    addressError,
    extraBlockReason,
  });

  /* ===== INPUT HANDLERS ===== */
  const handleChangeFee = (newFee: number) => {
    // In MARA mode only allow fee rates at/above the (buffered) MARA minimum
    if (maraMode && maraFeeRate !== null) {
      if (newFee < maraFeeRate) {
        logger.warn("stamps", {
          message: "Fee rate must be at least MARA minimum (buffered)",
          attemptedFee: newFee,
          maraMinFee: maraFeeRate,
        });
      }
      setFee(Math.max(newFee, maraFeeRate));
      return;
    }
    setFee(Math.max(newFee, MIN_FEE_RATE));
  };

  const handleIssuanceChange = (e: Event) => {
    const result = validateEditionsInput((e.target as HTMLInputElement).value);
    if (result.accept) setIssuance(result.value);
    setIssuanceError(result.error);
  };

  const handleStampNameChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    const result = variant === "posh"
      ? validatePoshName(value)
      : validateCustomCpid(value);
    if (result.accept) setStampName(value);
    setStampNameError(result.error);
  };

  const toggleCustomCpid = () => {
    const next = !includeCustomCpid;
    setIncludeCustomCpid(next);
    if (!next) {
      setStampName("");
      setStampNameError("");
    }
  };

  /* ===== RESET ===== */
  const resetMint = () => {
    setIssuance("1");
    setIssuanceError("");
    setIsLocked(true);
    setStampName("");
    setStampNameError("");
    setIncludeCustomCpid(false);
    setTosAgreed(false);
    setApiError("");
    setSubmissionMessage(null);
    setExactFeeDetails(null);
    if (!maraMode) {
      const recommended = fees?.recommendedFee;
      setFee(
        recommended != null && recommended >= MIN_FEE_RATE
          ? recommended
          : DEFAULT_FEE_RATE,
      );
    }
  };

  const finishSuccess = () => {
    resetMint();
    onSuccess?.();
  };

  const reportMintError = (error: unknown) => {
    const errorMsg = extractErrorMessage(error);
    logger.error("stamps", {
      message: "Minting error",
      error,
      extractedMessage: errorMsg,
    });
    setApiError(errorMsg);
    setSubmissionMessage(null);
  };

  /* ===== SIGNED TRANSACTION PROCESSING ===== */
  const processSignedTransaction = async (mintPayload: StampMintRequest) => {
    logger.info("stamps", {
      message: "processSignedTransaction called",
      variant,
      maraMode,
      hasOutputValue: mintPayload.outputValue !== undefined,
      outputValue: mintPayload.outputValue,
      maraFeeRate: mintPayload.maraFeeRate,
    });

    const response = await axiod.post("/api/v2/olga/mint", mintPayload);
    if (!response.data) {
      throw new Error("No data received from API");
    }
    const mintResponse = response.data as NormalizedMintResponse;
    if (!mintResponse.hex) {
      throw new Error("Invalid response structure: missing hex field");
    }

    // Show the ACTUAL values from the final transaction
    const netSpendAmount = (mintResponse.input_value || 0) -
      (mintResponse.change_value || 0);
    setExactFeeDetails({
      phase: "exact",
      minerFee: mintResponse.est_miner_fee || 0,
      dustValue: mintResponse.total_dust_value || 0,
      totalValue: netSpendAmount,
      hasExactFees: true,
      estimationMethod: "final_transaction",
    });

    const walletProvider = getWalletProvider(wallet.provider);
    const inputsToSign = mintResponse.txDetails.map((input) => ({
      index: input.signingIndex,
    }));

    // MARA mode must not auto-broadcast: the signed tx goes to the MARA pool
    const result = await walletProvider.signPSBT(
      mintResponse.hex,
      inputsToSign,
      true, // enableRBF
      undefined, // sighashTypes
      !maraMode, // autoBroadcast
    );

    logger.debug("stamps", {
      message: "Raw wallet provider response",
      data: {
        resultType: typeof result,
        error: result?.error,
        signed: result?.signed === true,
        cancelled: result?.cancelled === true,
        txid: result?.txid,
        maraMode,
      },
    });

    if (!result) {
      logger.error("stamps", {
        message: "Wallet provider returned null or undefined response",
      });
      setApiError("Wallet provider error: No response received");
      return;
    }

    if (!result.signed) {
      if (result.error) {
        const errorLower = result.error.toLowerCase();
        if (errorLower.includes("insufficient funds")) {
          showToast(
            "Insufficient funds in wallet to cover transaction fees.",
            "error",
            false,
          );
        } else if (
          errorLower.includes("timeout") || errorLower.includes("timed out")
        ) {
          showToast(
            "Wallet connection timed out. Please try again.",
            "error",
            false,
          );
        } else if (
          errorLower.includes("rejected") ||
          errorLower.includes("declined") ||
          errorLower.includes("cancelled") ||
          errorLower.includes("user denied")
        ) {
          showToast("Transaction signing was cancelled.", "warning");
        } else {
          showToast(result.error, "error");
        }
        return;
      }

      if (result.cancelled) {
        showToast("Transaction signing was cancelled.", "warning");
        return;
      }

      logger.error("stamps", {
        message: "Unknown PSBT signing failure",
        data: { result },
      });
      showToast(
        "Failed to sign transaction.\nPlease check wallet connection and try again.",
        "error",
        false,
      );
      return;
    }

    /* ----- MARA: submit the signed tx to the pool ----- */
    if (maraMode) {
      if (!result.psbt) {
        // Wallet may have broadcast despite autoBroadcast=false
        if (result.txid) {
          logger.warn("stamps", {
            message:
              "MARA mode: Wallet broadcast transaction despite autoBroadcast=false",
            txid: result.txid,
          });
          showToast(
            `Transaction broadcast by wallet.\n${result.txid.substring(0, 10)}`,
            "success",
            false,
          );
          finishSuccess();
          return;
        }
        logger.error("stamps", {
          message:
            "MARA mode: No signed transaction hex available for submission",
          walletProvider: wallet?.provider,
          resultKeys: Object.keys(result),
        });
        setApiError(
          "MARA mode requires signed transaction hex but wallet didn't provide it. Please try switching to standard stamping mode.",
        );
        return;
      }

      try {
        mara.prepareDebugHex(result.psbt);
        await mara.submitToMara(result.psbt);
        finishSuccess();
      } catch (maraError) {
        const errorMessage = (maraError as Error)?.message || "";
        logger.error("stamps", {
          message: "MARA submission failed, attempting fallback",
          error: errorMessage,
        });

        if (isMaraUnavailableError(errorMessage)) {
          mara.setMaraUnavailable(true);
          setApiError(
            "MARA pool is temporarily unavailable. You can switch to standard stamping or retry later.",
          );
          mara.setShowMaraUnavailableModal(true);
          return;
        }

        // Other errors: attempt automatic fallback to standard broadcasting
        try {
          if (result.txid) {
            showToast(
              `MARA failed, but transaction was broadcast.\n${
                result.txid.substring(0, 10)
              }`,
              "info",
              false,
            );
            finishSuccess();
            return;
          }
          if (result.psbt && walletProvider.broadcastPSBT) {
            const fallbackTxid = await walletProvider.broadcastPSBT(
              result.psbt,
            );
            logger.info("stamps", {
              message: "Fallback broadcast successful",
              txid: fallbackTxid,
              method: "wallet_broadcast_psbt",
            });
            showToast(
              `MARA failed, broadcasted via wallet.\n${
                fallbackTxid.substring(0, 10)
              }`,
              "info",
              false,
            );
            finishSuccess();
            return;
          }
          setApiError(
            `MARA submission failed and automatic fallback unsuccessful.\nError: ${errorMessage}.\nPlease try switching to standard stamping mode.`,
          );
        } catch (fallbackError) {
          logger.error("stamps", {
            message: "Both MARA submission and fallback failed",
            maraError: errorMessage,
            fallbackError: (fallbackError as Error)?.message,
          });
          setApiError(
            "MARA submission and fallback both failed. Please try switching to standard stamping mode.",
          );
        }
        mara.setMaraUnavailable(true);
        mara.setShowMaraUnavailableModal(true);
      }
      return;
    }

    /* ----- Standard: the wallet already broadcast ----- */
    if (result.txid) {
      const txid = result.txid;
      showToast(
        "Transaction broadcasted successfully.",
        "success",
        false,
        h(
          Fragment,
          null,
          "Transaction hash: ",
          h("a", {
            href: `https://mempool.space/tx/${txid}`,
            target: "_blank",
            rel: "noopener noreferrer",
            class: "underline hover:opacity-80",
          }, `${txid.substring(0, 12)}...`),
        ),
      );
    } else {
      showToast(
        "Transaction broadcasted successfully, but no transaction hash was returned.\nPlease check your wallet history for confirmation.",
        "warning",
        true,
      );
    }
    // Broadcast happened either way: reset so it cannot be stamped twice
    finishSuccess();
  };

  /* ===== MINT ENTRY POINT ===== */
  const mint = async () => {
    if (!isConnected) {
      walletContext.showConnectModal();
      return;
    }
    if (isSubmitting) return;

    if (!payload) {
      setApiError(extraBlockReason || "Upload your file");
      return;
    }
    if (!isFormValid) {
      setApiError(
        extraBlockReason ||
          "Please fix the highlighted fields before stamping.",
      );
      return;
    }
    if (!config) {
      showToast("Configuration not loaded yet. Please try again.", "warning");
      return;
    }

    logger.info("stamps", {
      message: "Starting mint process",
      variant,
      maraMode,
      outputValue,
      maraFeeRate,
      hasMaraError: !!mara.maraError,
      maraUnavailable: mara.maraUnavailable,
    });

    setIsSubmitting(true);
    setApiError("");

    try {
      if (!address) {
        throw new Error("Wallet address not available");
      }
      const { isValid, error: walletAddressError } =
        validateWalletAddressForMinting(address);
      setAddressError(walletAddressError);
      if (!isValid) {
        throw new Error(walletAddressError || "Invalid wallet address type");
      }

      const mintRequest = buildMintRequest({
        variant,
        sourceWallet: address,
        payload,
        issuance,
        isLocked,
        satsPerVB: fee,
        stampName,
        includeCustomCpid,
        serviceFee: config.MINTING_SERVICE_FEE,
        serviceFeeAddress: config.MINTING_SERVICE_FEE_ADDRESS,
        ...(maraMode && outputValue !== null
          ? { mara: { outputValue, feeRate: maraFeeRate } }
          : {}),
      });

      // Phase 3: exact fee estimation before building the final transaction
      const exactFeeResult = await estimation.estimateExact();
      setExactFeeDetails({ ...exactFeeResult, hasExactFees: true });

      // MARA: require explicit confirmation before proceeding
      if (maraMode && outputValue !== null) {
        mara.setPendingMintPayload(mintRequest);
        mara.setShowMaraWarning(true);
        return;
      }

      await processSignedTransaction(mintRequest);
    } catch (error) {
      reportMintError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===== MARA WARNING MODAL HANDLERS ===== */
  const confirmMaraWarning = async () => {
    const pending = mara.pendingMintPayload;
    mara.setShowMaraWarning(false);
    if (!pending) return;

    setIsSubmitting(true);
    try {
      await processSignedTransaction(pending);
    } catch (error) {
      reportMintError(error);
    } finally {
      mara.setPendingMintPayload(null);
      setIsSubmitting(false);
    }
  };

  const cancelMaraWarning = () => {
    mara.setShowMaraWarning(false);
    mara.setPendingMintPayload(null);
    setIsSubmitting(false);
  };

  return {
    variant,
    config,
    isConfigLoading,
    isConnected,
    wallet,
    address,

    // form state
    fee,
    handleChangeFee,
    BTCPrice,
    tosAgreed,
    setTosAgreed,
    issuance,
    issuanceError,
    handleIssuanceChange,
    isLocked,
    setIsLocked,
    stampName,
    stampNameError,
    handleStampNameChange,
    includeCustomCpid,
    toggleCustomCpid,
    isFormValid,

    // submission state
    isSubmitting,
    apiError,
    setApiError,
    submissionMessage,
    setSubmissionMessage,
    addressError,
    mint,
    resetMint,

    // fees
    feeDetails: displayedFeeDetails,
    estimation: {
      isConnected: !!wallet && !isSubmitting,
      isSubmitting,
      isPreFetching: estimation.isPreFetching,
      currentPhase: estimation.currentPhase,
      phase1: !!estimation.phase1,
      phase2: !!estimation.phase2,
      phase3: !!estimation.phase3,
      feeEstimationError: estimation.error,
      clearError: estimation.clearError,
    },

    // MARA
    mara,
    confirmMaraWarning,
    cancelMaraWarning,
  };
}

export type StampMintController = ReturnType<typeof useStampMint>;
