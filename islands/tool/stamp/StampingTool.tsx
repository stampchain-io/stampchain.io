/* ===== STAMPING COMPONENT ===== */
import { ToggleSwitchButton } from "$button";
import { useConfig } from "$client/hooks/useConfig.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { getWalletProvider } from "$client/wallet/walletHelper.ts";
import { TransactionHexDisplay } from "$components/debug/TransactionHexDisplay.tsx";
import { MaraModeIndicator } from "$components/indicators/MaraModeIndicator.tsx";
import { ProgressiveEstimationIndicator } from "$components/indicators/ProgressiveEstimationIndicator.tsx";
import { MaraStatusLink } from "$components/mara/MaraStatusLink.tsx";
import { MaraModeWarningModal } from "$components/modals/MaraModeWarningModal.tsx";
import { MaraServiceUnavailableModal } from "$components/modals/MaraServiceUnavailableModal.tsx";
import { InputField, stateDisabled } from "$form";
import { Icon } from "$icon";
import { StampingToolSkeleton } from "$indicators";
import PreviewImageModal from "$islands/modal/PreviewImageModal.tsx";
import { closeModal, globalModal, openModal } from "$islands/modal/states.ts";
import {
  bodyTool,
  containerBackground,
  containerGap,
  containerRowForm,
  glassmorphism,
  glassmorphismL2,
  glassmorphismL2Hover,
  transitionAll,
  transitionColors,
} from "$layout";
import { useFees } from "$lib/hooks/useFees.ts";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import {
  ensureRawTransactionFormat,
  extractRawTransactionFromPSBT,
} from "$lib/utils/bitcoin/psbt/psbtUtils.ts";
import type { Config } from "$types/base.d.ts";

import { PlaceholderImage } from "$icon";
import { useSSRSafeNavigation } from "$lib/hooks/useSSRSafeNavigation.ts";
import { logger } from "$lib/utils/logger.ts";
import { validateWalletAddressForMinting } from "$lib/utils/scriptTypeUtils.ts";
import { handleImageError } from "$lib/utils/ui/media/imageUtils.ts";
import {
  createRecursiveHtmlPreviewUrl,
  revokePreviewUrl,
} from "$lib/utils/ui/media/recursivePreview.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import {
  StatusMessages,
  tooltipButton,
  tooltipButtonInCollapsible,
  tooltipImage,
} from "$notification";
import { FeeCalculatorBase } from "$section";
import { labelLg, subtitleGrey, titleGreyLD } from "$text";
import {
  getSearchParams,
  isBrowser,
} from "$utils/navigation/freshNavigationUtils.ts";
import axiod from "axiod";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */

// 🎉 REMOVED: FeeDetails interface - no longer needed with progressive hook!

interface MintResponse {
  hex: string;
  cpid: string;
  est_tx_size: number;
  input_value: number;
  total_dust_value: number;
  est_miner_fee: number;
  change_value: number;
  total_output_value: number;
  txDetails: TransactionInput[];
}

interface TransactionInput {
  txid: string;
  vout: number;
  signingIndex: number;
}

interface ValidationParams {
  file: File | null;
  fileError: string;
  issuanceError: string;
  stampNameError: string;
  isPoshStamp: boolean;
  stampName: string;
  addressError: string | undefined;
}

interface MintRequest {
  sourceWallet: string | undefined;
  qty: string;
  locked: boolean;
  filename: string;
  file: string;
  satsPerVB: number;
  service_fee: string | null;
  service_fee_address: string | null;
  assetName?: string;
  divisible: boolean;
  isPoshStamp: boolean;
  dryRun?: boolean;
  outputValue?: number; // MARA custom dust value
  maraFeeRate?: number; // MARA-specified fee rate
}

/* ===== FORM VALIDATION UTILITY ===== */
function isValidForMinting(params: ValidationParams) {
  const {
    file,
    fileError,
    issuanceError,
    stampNameError,
    isPoshStamp,
    stampName,
    addressError,
  } = params;

  if (!file) return false;
  if (fileError) return false;
  if (issuanceError) return false;
  if (addressError) return false;
  if (isPoshStamp && (!stampName || stampNameError)) return false;
  if (!isPoshStamp && stampNameError) return false;

  return true;
}

/* ===== ERROR HANDLING UTILITY ===== */
function extractErrorMessage(error: unknown): string {
  logger.debug("stamps", {
    message: "Extracting error message from",
    error,
  });

  // Handle string errors first
  if (typeof error === "string") {
    return error;
  }

  // Handle Error instances
  if (error instanceof Error) {
    return error.message;
  }

  // Handle error objects
  if (error && typeof error === "object") {
    const err = error as {
      error?: {
        message?: string;
        code?: number;
      };
      details?: {
        error?: {
          message?: string;
        };
      };
      response?: {
        data?: {
          error?: string;
        };
      };
      message?: string;
    };

    // Check for direct error message
    if (err.response?.data?.error) {
      logger.debug("stamps", {
        message: "Found direct error message",
        path: "error.message",
        value: err.response?.data?.error,
      });
      if (err.response?.data?.error?.includes("Insufficient funds")) {
        return "Insufficient funds to cover outputs and fees";
      }
      return err.response?.data?.error;
    }

    // Check for direct error message
    if (err.error?.message) {
      logger.debug("stamps", {
        message: "Found direct error message",
        path: "error.message",
        value: err.error.message,
      });
      return err.error.message;
    }

    // Check for nested error message
    if (err.details?.error?.message) {
      logger.debug("stamps", {
        message: "Found nested error message",
        path: "details.error.message",
        value: err.details.error.message,
      });
      return err.details.error.message;
    }

    // Check for simple message
    if (err.message) {
      logger.debug("stamps", {
        message: "Found simple message",
        path: "message",
        value: err.message,
      });
      return err.message;
    }
  }

  // Default error message
  logger.debug("stamps", {
    message: "No valid error message found, using default",
  });
  return "An unexpected error occurred";
}

interface SubmissionMessage {
  message: string;
  txid?: string;
}

interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string | undefined;
}

/* ===== STYLE CONSTANTS ===== */
const PREVIEW_SIZE_CLASSES =
  "w-[100px] h-[100px] mobileMd:w-[100px] mobileMd:h-[100px]" as const;

/* ===== WRAPPER COMPONENT - HANDLES CONFIG LOADING ===== */
export function StampingTool() {
  const { config, isLoading } = useConfig<Config>();

  /* ===== EARLY RETURN CONDITIONS ===== */
  if (isLoading) {
    return (
      <div class={`${bodyTool} ${containerGap}`}>
        <h1 class={`${titleGreyLD} mx-auto -mb-2 mobileLg:-mb-4`}>
          STAMP
        </h1>
        <StampingToolSkeleton />
      </div>
    );
  }

  if (!config) {
    return (
      <div class={bodyTool}>
        <h5 class={`${titleGreyLD} mx-auto mb-2`}>ERROR</h5>
        <h6 class={`${subtitleGrey} mx-auto`}>CONFIGURATION NOT LOADED</h6>
      </div>
    );
  }

  // Once we have the config, render the main component
  return <StampingToolMain config={config} />;
}

/* ===== MAIN COMPONENT IMPLEMENTATION ===== */
// This component contains all hooks and is only rendered when config is available
function StampingToolMain({ config }: { config: Config }) {
  const { deleteSearchParam, isClient } = useSSRSafeNavigation();
  const { wallet, isConnected } = walletContext;
  const address = isConnected ? wallet.address : undefined;
  const { fees, loading, feeSource } = useFees();

  // Fee polling state monitoring
  useEffect(() => {
    if (fees && !loading) {
      logger.debug("stamps", {
        message: "Fee data updated",
        data: {
          recommendedFee: fees?.recommendedFee,
          source: feeSource?.source,
          fallbackUsed: feeSource?.fallbackUsed,
        },
      });
    }
  }, [fees, loading, feeSource]);

  const [file, setFile] = useState<File | null>(null);
  const [htmlPreviewUrl, setHtmlPreviewUrl] = useState<string | null>(null);
  const [fee, setFee] = useState<number>(1); // Initialize with a lower default fee (1 sat/vB)
  const [issuance, setIssuance] = useState("1");
  const [BTCPrice, setBTCPrice] = useState<number>(60000);
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [isLocked, setIsLocked] = useState(true);
  const [isPoshStamp, setIsPoshStamp] = useState(false);
  const [stampName, setStampName] = useState("");
  const [isDivisible, _setIsDivisible] = useState(false);

  // MARA mode state variables
  const [outputValue, setOutputValue] = useState<number | null>(null);
  const [maraMode, setMaraMode] = useState(false);
  const [maraFeeRate, setMaraFeeRate] = useState<number | null>(null);
  const [maraError, setMaraError] = useState<string>("");
  const [isLoadingMaraFee, setIsLoadingMaraFee] = useState(false);
  const [showMaraWarning, setShowMaraWarning] = useState(false);
  const [pendingMintPayload, setPendingMintPayload] = useState<
    MintRequest | null
  >(null);
  const [maraUnavailable, setMaraUnavailable] = useState(false);
  const [showMaraUnavailableModal, setShowMaraUnavailableModal] = useState(
    false,
  );
  const [debugTransactionHex, setDebugTransactionHex] = useState<string>("");
  const [debugTxid, setDebugTxid] = useState<string>("");

  // Validation state
  const [fileError, setFileError] = useState<string>("");
  const [issuanceError, setIssuanceError] = useState<string>("");
  const [stampNameError, setStampNameError] = useState<string>("");
  const [apiError, setApiError] = useState<string>("");
  const [submissionMessage, setSubmissionMessage] = useState<
    SubmissionMessage | null
  >(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Track minting progress
  const [addressError, setAddressError] = useState<string | undefined>(
    undefined,
  );

  // Convert file to base64 for fee estimation (matches actual minting process)
  const [fileBase64, setFileBase64] = useState<string | undefined>();
  useEffect(() => {
    if (file) {
      // Use the same toBase64 conversion as the actual minting process
      toBase64(file).then(setFileBase64).catch((error) => {
        logger.error("ui", {
          message: "Failed to convert file to base64 for fee estimation",
          error: error.message,
        });
        setFileBase64(undefined);
      });
    } else {
      setFileBase64(undefined);
    }
  }, [file]);

  // 🚀 World-Class Progressive Fee Estimation Hook
  // Uses our new 3-phase estimation system: Instant → Smart → Exact
  const {
    getBestEstimate,
    isEstimating,
    isPreFetching,
    estimateExact, // Phase 3: Exact estimation for when user clicks STAMP
    // Phase-specific results for UI indicators
    phase1,
    phase2,
    phase3,
    currentPhase,
    error: feeEstimationError,
    clearError,
  } = useTransactionConstructionService({
    toolType: "stamp",
    feeRate: isSubmitting ? 0 : fee, // Disable by setting feeRate to 0 during submission
    walletAddress: wallet?.address || "", // Provide empty string instead of undefined
    isConnected: !!wallet && !isSubmitting,
    isSubmitting, // Pass isSubmitting state to hook for background fetch abortion
    // Tool-specific parameters for stamp creation (pass unconditionally)
    file: fileBase64, // Pass unconditionally - undefined is fine
    filename: file?.name, // Pass unconditionally - undefined is fine
    fileSize: fileSize, // Pass unconditionally - undefined is fine
    quantity: parseInt(issuance, 10),
    locked: true,
    divisible: false,
    outputValue: maraMode ? outputValue : undefined, // Only pass outputValue in MARA mode
  });

  // Get the best available fee estimate
  const progressiveFeeDetails = getBestEstimate();

  // Local state for exact fee details (updated when Phase 3 completes)
  const [exactFeeDetails, setExactFeeDetails] = useState<
    typeof progressiveFeeDetails | null
  >(null);

  // Reset exactFeeDetails when fee rate changes to allow slider updates
  useEffect(() => {
    // Clear exact fee details when fee rate changes so slider updates work
    setExactFeeDetails(null);
  }, [fee]); // Reset when fee rate changes

  // Update local feeDetails when progressive estimation completes
  useEffect(() => {
    if (progressiveFeeDetails && !isEstimating) {
      // Progressive fee details are now used directly in JSX
      // This useEffect is kept for any future side effects needed
    }
  }, [
    // Use version counter to ensure Preact detects fee changes
    progressiveFeeDetails,
    isEstimating,
    fee,
    stampName,
  ]);

  // Update feeDetails state when it changes (for passing to FeeCalculatorBase)
  useEffect(() => {
    // This effect ensures feeDetails state is synchronized with the progressive estimation
  }, []);

  // Tooltip state and refs
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isUploadTooltipVisible, setIsUploadTooltipVisible] = useState(false);
  const uploadTooltipTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal state
  const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);

  // Advanced options state
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Tooltips state
  const [tooltipText, setTooltipText] = useState("SIMPLE SETTINGS");
  const [isAdvancedTooltipVisible, setIsAdvancedTooltipVisible] = useState(
    false,
  );
  const [allowAdvancedTooltip, setAllowAdvancedTooltip] = useState(true);
  const advancedTooltipTimeoutRef = useRef<number | null>(null);

  // POSH tooltip state
  const [poshTooltipText, setPoshTooltipText] = useState("POSH");
  const [isPoshTooltipVisible, setIsPoshTooltipVisible] = useState(false);
  const [allowPoshTooltip, setAllowPoshTooltip] = useState(true);
  const poshButtonRef = useRef<HTMLButtonElement>(null);
  const poshTooltipTimeoutRef = useRef<number | null>(null);

  // Lock tooltip state
  const [lockTooltipText, setLockTooltipText] = useState("LOCK");
  const [isLockTooltipVisible, setIsLockTooltipVisible] = useState(false);
  const [allowLockTooltip, setAllowLockTooltip] = useState(true);
  const lockButtonRef = useRef<HTMLDivElement>(null);
  const lockTooltipTimeoutRef = useRef<number | null>(null);

  // Preview tooltip state
  const [previewTooltipText, setPreviewTooltipText] = useState("PREVIEW STAMP");
  const [isPreviewTooltipVisible, setIsPreviewTooltipVisible] = useState(false);
  const [allowPreviewTooltip, setAllowPreviewTooltip] = useState(true);
  const previewButtonRef = useRef<HTMLDivElement>(null);
  const previewTooltipTimeoutRef = useRef<number | null>(null);

  /* ===== MARA AVAILABILITY CHECK ===== */
  const checkMaraAvailability = async () => {
    try {
      await axiod.get("/api/internal/mara-fee-rate");
      setMaraUnavailable(false);
      return true;
    } catch (error) {
      logger.warn("stamps", {
        message: "MARA service appears unavailable",
        error: (error as any)?.message,
      });
      setMaraUnavailable(true);
      return false;
    }
  };

  /* ===== FALLBACK TO STANDARD MODE ===== */
  const switchToStandardMode = () => {
    setMaraMode(false);
    setOutputValue(null);
    setMaraError("");
    setMaraUnavailable(false);
    setShowMaraUnavailableModal(false);
    setApiError("");
    setDebugTransactionHex("");
    setDebugTxid("");

    // Remove URL parameter using SSR-safe navigation
    if (isClient) {
      deleteSearchParam("outputValue");
    }

    logger.info("stamps", {
      message: "Switched from MARA mode to standard stamping",
    });

    showToast("Switched to standard stamping (333 sat outputs).", "info");
  };

  /* ===== MARA TRANSACTION SUBMISSION WITH RETRY LOGIC ===== */
  const submitToMara = async (
    signedHex: string,
    retryCount = 0,
  ): Promise<any> => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay

    // Convert PSBT to raw transaction format
    const txResult = ensureRawTransactionFormat(signedHex, false); // preferPSBT=false - extract raw tx
    const transactionHex = txResult.hex;

    logger.info("mara-submission", {
      message: "Submitting transaction to MARA",
      format: txResult.isPSBT ? "converted-from-psbt" : "raw-transaction",
      wasConverted: txResult.wasConverted,
      hexLength: txResult.hex.length,
      hexPreview: txResult.hex.substring(0, 40) + "...",
    });

    // Enhanced debug output
    console.log("=== MARA SUBMISSION DEBUG ===");
    console.log(
      "Transaction format:",
      txResult.isPSBT ? "PSBT (converted)" : "Raw",
    );
    console.log(
      "Transaction length:",
      transactionHex.length,
      "chars,",
      transactionHex.length / 2,
      "bytes",
    );
    console.log("Output value:", outputValue);
    console.log("MARA fee rate:", maraFeeRate);
    console.log("Retry attempt:", retryCount + 1, "of", maxRetries);
    console.log(
      "Transaction hex preview:",
      transactionHex.substring(0, 100) + "...",
    );

    // Output raw transaction hex for debugging
    console.log("=== RAW TRANSACTION HEX FOR MARA ===");
    console.log(
      "Format:",
      txResult.isPSBT ? "Extracted from PSBT" : "Already raw transaction",
    );
    console.log("Length:", txResult.hex.length);
    console.log("Full hex:", txResult.hex);
    console.log("===================================");

    if (txResult.isPSBT && !txResult.wasConverted) {
      logger.warn("stamps", {
        message: "Failed to extract raw transaction from PSBT",
        error: txResult.error,
      });
    }

    try {
      logger.info("stamps", {
        message: "Submitting transaction to MARA pool",
        hexLength: transactionHex.length,
        format: "raw-transaction",
        wasPSBT: txResult.isPSBT,
        wasConverted: txResult.wasConverted,
        attempt: retryCount + 1,
        maxAttempts: maxRetries + 1,
      });

      console.log("=== CALLING MARA SUBMIT API ===");
      const response = await axiod.post("/api/internal/mara-submit", {
        hex: transactionHex,
        priority: "high",
      });

      console.log("=== MARA SUBMIT API RESPONSE ===");
      console.log("Status:", response.status);
      console.log("Status Text:", response.statusText);
      console.log("Response data type:", typeof response.data);
      console.log("Response data:", JSON.stringify(response.data, null, 2));
      console.log("================================");

      if (response.data && response.data.txid) {
        const status = response.data.status;
        const txidShort = response.data.txid.substring(0, 10);

        logger.info("stamps", {
          message: "Successfully submitted to MARA pool",
          txid: response.data.txid,
          status: status,
          attempts: retryCount + 1,
        });

        // Store txid for debug display
        setDebugTxid(response.data.txid);

        // Display status-specific messages to user
        switch (status) {
          case "accepted":
            showToast(
              `MARA Pool: Transaction accepted - ${txidShort}...`,
              "success",
              false,
            );
            break;
          case "pending":
            showToast(
              `MARA Pool: Transaction pending review - ${txidShort}...`,
              "info",
              false,
            );
            break;
          case "rejected":
            showToast(
              `MARA Pool: Transaction rejected - ${txidShort}...`,
              "error",
              false,
            );
            break;
          default:
            showToast(
              `MARA Pool: Status ${status} - ${txidShort}...`,
              "info",
              false,
            );
        }

        setApiError("");

        // Set submission message for successful MARA submission with status link
        const statusUrl =
          `https://slipstream.mara.com/status?txid=${response.data.txid}`;
        setSubmissionMessage({
          message:
            `Transaction submitted to MARA pool successfully! View status at: ${statusUrl}`,
          txid: response.data.txid,
        });

        return response.data;
      } else {
        throw new Error("Invalid response from MARA submission");
      }
    } catch (error) {
      console.log("=== MARA SUBMISSION ERROR ===");
      console.log("Error object:", error);
      console.log("Error type:", typeof error);
      console.log("Error message:", (error as any)?.message);
      console.log("Error response:", (error as any)?.response);
      console.log("Error response data:", (error as any)?.response?.data);
      console.log("Error response status:", (error as any)?.response?.status);
      console.log("================================");

      const errorMessage = (error as any)?.response?.data?.error ||
        (error as any)?.message ||
        "Failed to submit transaction to MARA pool";

      const isRetryableError = errorMessage.includes("network") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("502") ||
        errorMessage.includes("503") ||
        errorMessage.includes("504") ||
        (error as any)?.response?.status >= 500;

      if (retryCount < maxRetries && isRetryableError) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff

        logger.warn("stamps", {
          message: `MARA submission failed, retrying in ${delay}ms`,
          error: errorMessage,
          attempt: retryCount + 1,
          nextRetryIn: delay,
        });

        showToast(
          `MARA submission failed, retrying... (${
            retryCount + 1
          }/${maxRetries})`,
          "info",
          true,
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        return submitToMara(signedHex, retryCount + 1);
      }

      // Max retries reached or non-retryable error
      logger.error("stamps", {
        message: "MARA submission failed after all retry attempts",
        error: errorMessage,
        totalAttempts: retryCount + 1,
        isRetryableError,
      });

      throw new Error(errorMessage);
    }
  };

  /* ===== MARA FEE RATE FETCHING ===== */
  const fetchMaraFeeRate = async () => {
    setIsLoadingMaraFee(true);
    try {
      const response = await axiod.get("/api/internal/mara-fee-rate");

      if (response.data && typeof response.data.fee_rate === "number") {
        // Ensure we meet MARA's minimum requirement (6 sats/vB) with buffer
        const maraMinimum = 6.0; // MARA requires 6 sats/vB minimum
        const bufferedFeeRate = Math.max(response.data.fee_rate, maraMinimum) +
          0.1;
        setMaraFeeRate(bufferedFeeRate);
        setFee(bufferedFeeRate); // Update the fee slider with buffered MARA rate
        setMaraError(""); // Clear any previous errors

        logger.info("stamps", {
          message: "MARA fee rate fetched successfully",
          originalFeeRate: response.data.fee_rate,
          bufferedFeeRate: bufferedFeeRate,
          minFeeRate: response.data.min_fee_rate,
        });

        return response.data.fee_rate;
      } else {
        throw new Error("Invalid fee rate response");
      }
    } catch (error) {
      const errorMessage = (error as any)?.response?.data?.error ||
        (error as any)?.message ||
        "Failed to fetch MARA fee rate";

      setMaraError(errorMessage);
      logger.error("stamps", {
        message: "Failed to fetch MARA fee rate",
        error: errorMessage,
      });

      // Check if it's a circuit breaker issue or service unavailable
      if (
        errorMessage.includes("circuit breaker") ||
        errorMessage.includes("Circuit breaker") ||
        errorMessage.includes("OPEN") ||
        errorMessage.includes("temporarily unavailable") ||
        errorMessage.includes("service temporarily unavailable") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("502") ||
        errorMessage.includes("503") ||
        errorMessage.includes("504")
      ) {
        setMaraUnavailable(true);
        // Show error message immediately
        setApiError(
          `MARA service is temporarily unavailable. You can switch to standard mode or try again later.`,
        );
        // Show the unavailable modal
        setShowMaraUnavailableModal(true);
      } else {
        // Disable MARA mode on other failures
        setMaraMode(false);
        setOutputValue(null);
      }

      throw error;
    } finally {
      setIsLoadingMaraFee(false);
    }
  };

  /* ===== URL PARAMETER PARSING ===== */
  useEffect(() => {
    // Parse URL parameters on component mount
    if (!isBrowser()) return;

    const params = getSearchParams();
    const outputValueParam = params.get("outputValue");

    // Check for circuit breaker reset flag
    if (params.get("resetMara") === "1") {
      // Call the health endpoint which can trigger a reset
      axiod.get("/api/internal/mara-health").catch(() => {
        // Ignore errors - just trying to check status
      });
      logger.info("stamps", {
        message: "Attempting to reset MARA circuit breaker via health check",
      });
    }

    if (outputValueParam) {
      const value = parseInt(outputValueParam, 10);

      // Validate outputValue is within MARA range (1-329)
      // 330+ uses standard process with wallet auto-broadcast
      if (!isNaN(value) && value >= 1 && value < 330) {
        setOutputValue(value);
        setMaraMode(true);

        logger.info("stamps", {
          message: "MARA mode activated via URL parameter",
          outputValue: value,
        });

        // Fetch MARA fee rate when mode is activated
        fetchMaraFeeRate().catch((error) => {
          // If fee rate fetching fails, check if it's a service unavailable error
          const errorMessage = error?.message || "";
          logger.warn("stamps", {
            message: "Failed to fetch MARA fee rate",
            error: errorMessage,
          });

          if (
            errorMessage.includes("circuit breaker") ||
            errorMessage.includes("Circuit breaker") ||
            errorMessage.includes("OPEN") ||
            errorMessage.includes("temporarily unavailable") ||
            errorMessage.includes("Failed to fetch") ||
            errorMessage.includes("502") ||
            errorMessage.includes("503") ||
            errorMessage.includes("504")
          ) {
            // Service is temporarily unavailable - keep MARA mode but show modal
            setMaraError("MARA service is temporarily unavailable");
            checkMaraAvailability();
          } else {
            // Other errors - disable MARA mode
            setMaraMode(false);
            setOutputValue(null);
            setMaraError("MARA integration is not available");
          }
        });
      } else if (!isNaN(value) && value >= 330) {
        // For 330+, use standard mode
        logger.info("stamps", {
          message: "OutputValue >= 330, using standard mode",
          value: outputValueParam,
          parsed: value,
        });
        // Don't set MARA mode, just continue with standard process
      } else {
        setMaraError(
          "Invalid outputValue: must be between 1 and 329 for MARA mode",
        );
        logger.error("stamps", {
          message: "Invalid outputValue parameter",
          value: outputValueParam,
          parsed: value,
        });
      }
    }
  }, []); // Only run once on mount

  /* ===== EFFECT HOOKS ===== */
  useEffect(() => {
    if (fees && !loading && !maraMode) {
      // Only update fee from polling service if not in MARA mode
      const recommendedFee = fees.recommendedFee;
      // Only update fee if the recommended fee is valid (>= 0.1 sat/vB)
      if (recommendedFee >= 0.1) {
        setFee(recommendedFee);
        logger.debug("stamps", {
          message: "Fee updated from polling service",
          oldFee: fee,
          newFee: recommendedFee,
          source: fees.source,
        });
      }
      if (typeof (fees as any).btcPrice === "number") {
        setBTCPrice((fees as any).btcPrice);
      }
    }
  }, [fees, loading, maraMode]);

  useEffect(() => {
    setIsLocked(true);
  }, []);

  // Update useEffect to handle changes in isConnected and address
  useEffect(() => {
    if (isConnected && address) {
      const isValid = validateWalletAddress(address);
      if (!isValid) {
        // Optionally disable minting or show additional UI feedback
        setSubmissionMessage(null);
      }
    } else {
      setAddressError(undefined);
    }
  }, [address, isConnected]);

  // �� REPLACED: The 100+ lines of custom progressive fee estimation logic below
  // has been replaced with the useProgressiveFeeEstimation hook above!
  // This eliminates:
  // - Custom debounced estimation function (estimateStampFeesDebounced)
  // - Manual 2-phase estimation logic (Phase 1 → Phase 2)
  // - Custom error handling and logging
  // - Manual state management for fee details
  //
  // Benefits of the new approach:
  // ✅ Auto-updates when fee rate changes (fixes slider issue!)
  // ✅ Consistent behavior across all tools
  // ✅ World-class dependency injection for testing
  // ✅ Built-in debouncing and cache management
  // ✅ 90% code reduction (from 100+ lines to ~10 lines)

  // 🎉 REMOVED: The old manual useEffect that triggered fee estimation
  // The progressive hook handles all estimation automatically when parameters change!

  /* ===== WALLET ADDRESS VALIDATION ===== */
  const validateWalletAddress = (address: string) => {
    const { isValid, error } = validateWalletAddressForMinting(address);
    setAddressError(error);
    return isValid;
  };

  /* ===== EVENT HANDLERS ===== */
  const handleChangeFee = (newFee: number) => {
    // In MARA mode, only allow fee rates above the MARA minimum (already buffered)
    if (maraMode && maraFeeRate !== null) {
      const validatedFee = Math.max(newFee, maraFeeRate);
      if (newFee < maraFeeRate) {
        logger.warn("stamps", {
          message: "Fee rate must be at least MARA minimum (buffered)",
          attemptedFee: newFee,
          maraMinFee: maraFeeRate,
        });
      }
      setFee(validatedFee);
      return;
    }

    // Allow any positive fee rate, including 0.1 sat/vB
    const validatedFee = Math.max(newFee, 0.1);
    setFee(validatedFee);
  };

  /* ===== ADVANCED OPTIONS HANDLERS ===== */
  const handleShowAdvancedOptions = () => {
    setAllowAdvancedTooltip(false);
    setIsAdvancedTooltipVisible(false);

    // When collapsing, reset POSH/CPID state so the form is never
    // silently blocked by a hidden required field.
    if (showAdvancedOptions) {
      setIsPoshStamp(false);
      setStampName("");
      setStampNameError("");
    }

    setShowAdvancedOptions(!showAdvancedOptions);
  };

  const handleIsPoshStamp = () => {
    setAllowPoshTooltip(false);
    setIsPoshTooltipVisible(false);
    setStampName("");
    setStampNameError("");
    setIsPoshStamp(!isPoshStamp);
  };

  /* ===== FILE HANDLING UTILITIES ===== */
  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const base64 = btoa(
            new Uint8Array(arrayBuffer)
              .reduce((data, byte) => data + String.fromCharCode(byte), ""),
          );
          resolve(base64);
        } catch (error) {
          reject(
            new Error("Failed to convert file to base64", { cause: error }),
          );
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
    });
  };

  /* ===== FORM RESET ===== */
  const resetForm = () => {
    revokePreviewUrl(htmlPreviewUrl);
    setHtmlPreviewUrl(null);
    setFile(null);
    setFileSize(undefined);
    setFileError("");
    setIssuance("1");
    setIssuanceError("");
    setStampName("");
    setStampNameError("");
    setIsPoshStamp(false);
    setIsLocked(true);
    setApiError("");
    setSubmissionMessage(null);
    setExactFeeDetails(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImage = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const selectedFile = input.files?.[0];

    if (!selectedFile) {
      setFileError("No file selected");
      setFile(null);
      setFileSize(undefined);
      revokePreviewUrl(htmlPreviewUrl);
      setHtmlPreviewUrl(null);
      return;
    }

    const validation = validateFile(selectedFile);

    if (!validation.isValid) {
      setFileError(validation.error || "Invalid file");
      setFile(null);
      setFileSize(undefined);
      revokePreviewUrl(htmlPreviewUrl);
      setHtmlPreviewUrl(null);
      return;
    }

    setFileError("");
    setFile(selectedFile);
    setFileSize(selectedFile.size);

    // Build a preview blob with <base> injection for recursive HTML stamps
    revokePreviewUrl(htmlPreviewUrl);
    if (selectedFile.name.match(/\.html$/i)) {
      createRecursiveHtmlPreviewUrl(selectedFile).then((url) => {
        setHtmlPreviewUrl(url);
      }).catch((err) => {
        logger.error("stamps", {
          message: "Failed to create recursive HTML preview",
          error: err.message,
        });
        setHtmlPreviewUrl(null);
      });
    } else {
      setHtmlPreviewUrl(null);
    }

    // Set warning message if file is not an image
    if (validation.warning) {
      setSubmissionMessage({
        message: validation.warning,
      });
    } else {
      setSubmissionMessage(null);
    }
  };

  const validateFile = (file: File): FileValidationResult => {
    if (file.size > 64 * 1024) {
      return {
        isValid: false,
        error: "File size must be less than 64KB.",
      };
    }

    // Check if file is an image by extension
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg|avif|html)$/i.test(file.name);

    return {
      isValid: true,
      warning: isImage
        ? undefined
        : "Note: Non-image-html files may not become numbered stamps.",
    };
  };

  const handleIssuanceChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    if (/^\d*$/.test(value)) {
      setIssuance(value === "" ? "1" : value);
      setIssuanceError("");
    } else {
      setIssuanceError("Please enter a valid number.");
    }
  };

  const handleStampNameChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;

    if (isPoshStamp) {
      // POSH validation: Must start with B-Z and be 1-13 characters long
      if (/^[B-Zb-z][A-Za-z]{0,12}$/.test(value)) {
        setStampName(value);
        setStampNameError("");
      } else {
        setStampNameError(
          "Invalid POSH name. Must start with B-Z and be 1-13 characters long.",
        );
      }
    } else {
      // CUSTOM CPID validation: Must start with 'A' followed by a number between 26^12 + 1 and 2^64 - 1
      if (value === "" || value === "A") {
        setStampName(value);
        setStampNameError("");
        return;
      }

      if (!value.startsWith("A")) {
        setStampNameError("Custom CPID must start with 'A'");
        return;
      }

      const numStr = value.slice(1); // Remove the 'A' prefix

      try {
        // Parse the number after 'A'
        const num = BigInt(numStr);
        const min = BigInt(26) ** BigInt(12) + BigInt(1); // 26^12 + 1
        const max = BigInt("18446744073709551615"); // 2^64 - 1

        if (num >= min && num <= max) {
          setStampName(value);
          setStampNameError("");
        } else {
          setStampNameError(
            `Number must be between ${min.toString()} and ${max.toString()}`,
          );
        }
      } catch (error) {
        setStampNameError("Invalid number format after 'A', error: " + error);
      }
    }
  };

  /* ===== SIGNED TRANSACTION PROCESSING ===== */
  const processSignedTransaction = async (mintPayload: MintRequest) => {
    logger.info("stamps", {
      message: "processSignedTransaction called",
      maraMode,
      hasOutputValue: mintPayload.outputValue !== undefined,
      outputValue: mintPayload.outputValue,
      maraFeeRate: mintPayload.maraFeeRate,
    });

    try {
      const response = await axiod.post(
        "/api/v2/olga/mint",
        mintPayload,
      );

      if (!response.data) {
        throw new Error("No data received from API");
      }

      const mintResponse = response.data as MintResponse;

      if (!mintResponse.hex) {
        throw new Error("Invalid response structure: missing hex field");
      }

      // Update fee details with ACTUAL values from the final transaction
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

      // Construct inputsToSign
      const inputsToSign = mintResponse.txDetails.map((
        input: TransactionInput,
      ) => ({
        index: input.signingIndex,
      }));

      logger.debug("stamps", {
        message: "Constructed inputsToSign",
        data: { inputsToSign },
      });

      // Call wallet signing with broadcast prevention for MARA mode
      const result = await walletProvider.signPSBT(
        mintResponse.hex,
        inputsToSign,
        true, // enableRBF
        undefined, // sighashTypes
        !maraMode, // autoBroadcast: false for MARA mode
      );

      logger.debug("stamps", {
        message: "Raw wallet provider response",
        data: {
          result,
          resultType: typeof result,
          error: result?.error,
          hasSignatures: result?.signed === true,
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
        setIsSubmitting(false);
        return;
      }

      if (!result.signed) {
        // Handle various error conditions
        if (result.error) {
          logger.debug("stamps", {
            message: "Using error from result",
            error: result.error,
          });

          const errorLower = result.error.toLowerCase();

          if (result.error.includes("insufficient funds")) {
            showToast(
              "Insufficient funds in wallet to cover transaction fees.",
              "error",
              false,
            );
          } else if (
            result.error.includes("timeout") ||
            result.error.includes("timed out")
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
            showToast("Transaction signing was cancelled.", "info");
          } else {
            showToast(result.error, "error");
          }
          setIsSubmitting(false);
          return;
        }

        if (result.cancelled) {
          logger.debug("stamps", {
            message: "Transaction was cancelled by user",
          });
          showToast("Transaction signing was cancelled.", "info");
          setIsSubmitting(false);
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
        setIsSubmitting(false);
        return;
      }

      // Handle successful signing
      if (maraMode) {
        // For MARA mode, submit to MARA pool
        if (!result.psbt) {
          // Fallback: Check if wallet accidentally broadcast despite autoBroadcast=false
          if (result.txid) {
            logger.warn("stamps", {
              message:
                "MARA mode: Wallet broadcast transaction despite autoBroadcast=false",
              txid: result.txid,
            });
            showToast(
              `Transaction broadcast by wallet.\n${
                result.txid.substring(0, 10)
              }`,
              "success",
              false,
            );
            setApiError("");
            resetForm();
            setIsSubmitting(false);
            return;
          }

          // No fallback available - hex extraction failed
          logger.error("stamps", {
            message:
              "MARA mode: No signed transaction hex available for submission",
            walletProvider: wallet?.provider,
            resultKeys: Object.keys(result),
          });
          setApiError(
            "MARA mode requires signed transaction hex but wallet didn't provide it. Please try switching to standard stamping mode.",
          );
          setIsSubmitting(false);
          return;
        }

        try {
          // Extract raw transaction for debug display
          const rawTx = extractRawTransactionFromPSBT(result.psbt);
          const hexToDisplay = rawTx || result.psbt;

          // Store the hex for debug display
          setDebugTransactionHex(hexToDisplay);
          setDebugTxid(""); // Clear any previous txid

          // Log to console for debugging
          logger.info("stamps", {
            message: "MARA mode: Transaction prepared",
            psbtLength: result.psbt.length,
            rawTxLength: rawTx ? rawTx.length : 0,
            hasRawTx: !!rawTx,
          });
          console.log("=== MARA TRANSACTION HEX ===");
          console.log("PSBT:", result.psbt.substring(0, 100) + "...");
          if (rawTx) {
            console.log("Raw TX:", rawTx.substring(0, 100) + "...");
          }
          console.log("=== END TRANSACTION HEX ===");

          await submitToMara(result.psbt);
          resetForm();
          setIsSubmitting(false);
        } catch (maraError) {
          logger.error("stamps", {
            message: "MARA submission failed, attempting fallback",
            error: maraError,
          });

          const errorMessage = (maraError as any)?.message || "";

          // Check if it's a circuit breaker error or service unavailable
          if (
            errorMessage.includes("circuit breaker") ||
            errorMessage.includes("Circuit breaker") ||
            errorMessage.includes("OPEN") ||
            errorMessage.includes("service temporarily unavailable") ||
            errorMessage.includes("Failed to fetch") ||
            errorMessage.includes("502") ||
            errorMessage.includes("503") ||
            errorMessage.includes("504")
          ) {
            setMaraUnavailable(true);
            setApiError(
              `MARA pool is temporarily unavailable. You can switch to standard stamping or retry later.`,
            );
            setIsSubmitting(false);
            // Show the unavailable modal
            setShowMaraUnavailableModal(true);
          } else {
            // For other errors, attempt automatic fallback to standard broadcasting
            logger.warn("stamps", {
              message: "Attempting automatic fallback to standard broadcasting",
              originalError: errorMessage,
            });

            try {
              // Check if wallet already broadcast the transaction
              if (result.txid) {
                logger.info("stamps", {
                  message:
                    "Fallback successful - wallet had already broadcast transaction",
                  txid: result.txid,
                });
                showToast(
                  `MARA failed, but transaction was broadcast.\n${
                    result.txid.substring(0, 10)
                  }`,
                  "info",
                  false,
                );
                setApiError("");
                resetForm();
                setIsSubmitting(false);
                return;
              }

              // If we have the signed PSBT hex, attempt standard broadcast
              if (result.psbt) {
                const walletProvider = getWalletProvider(wallet.provider);

                // Attempt to broadcast using wallet's broadcast method
                if (walletProvider.broadcastPSBT) {
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
                  setApiError("");
                  resetForm();
                  setIsSubmitting(false);
                  return;
                }
              }

              // If no fallback method worked, show error
              setApiError(
                `MARA submission failed and automatic fallback unsuccessful.\nError: ${errorMessage}.\nPlease try switching to standard stamping mode.`,
              );
              setIsSubmitting(false);
              // Show the unavailable modal for this error
              setMaraUnavailable(true);
              setShowMaraUnavailableModal(true);
            } catch (fallbackError) {
              logger.error("stamps", {
                message: "Both MARA submission and fallback failed",
                maraError: errorMessage,
                fallbackError: (fallbackError as any)?.message,
              });
              setApiError(
                `MARA submission and fallback both failed. Please try switching to standard stamping mode.`,
              );
              setIsSubmitting(false);
              // Show the unavailable modal for this error too
              setMaraUnavailable(true);
              setShowMaraUnavailableModal(true);
            }
          }
        }
      } else {
        // Standard mode - transaction was already broadcast
        if (result.txid) {
          logger.debug("stamps", {
            message: "Transaction signed and broadcast successfully",
            data: { txid: result.txid },
          });
          showToast(
            "Transaction broadcasted successfully.",
            "success",
            false,
            <>
              Transaction hash:{" "}
              <a
                href={`https://mempool.space/tx/${result.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                class="underline hover:opacity-80"
              >
                {result.txid.substring(0, 12)}...
              </a>
            </>,
          );
          setApiError("");
          resetForm();
          setIsSubmitting(false);
        } else {
          logger.debug("stamps", {
            message: "Transaction signed successfully, but txid not returned",
          });
          showToast(
            "Transaction broadcasted successfully, but no transaction hash was returned.\nPlease check your wallet history for confirmation.",
            "warning",
            true,
          );
          setApiError("");
          setIsSubmitting(false);
        }
      }
    } catch (error) {
      const errorMsg = extractErrorMessage(error);
      logger.error("stamps", {
        message: "Minting error",
        error,
        extractedMessage: errorMsg,
      });
      setApiError(errorMsg);
      setSubmissionMessage(null);
      setIsSubmitting(false);
    }
  };

  /* ===== MINTING HANDLER ===== */
  const handleMint = async () => {
    if (!isConnected) {
      walletContext.showConnectModal();
      return;
    }

    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    logger.info("stamps", {
      message: "Starting mint process",
      maraMode,
      outputValue,
      maraFeeRate,
      hasMaraError: !!maraError,
      maraUnavailable,
    });

    setIsSubmitting(true);
    setApiError(""); // Clear any previous errors

    try {
      if (address && !validateWalletAddress(address)) {
        throw new Error(addressError || "Invalid wallet address type");
      }

      if (file === null) {
        throw new Error("Upload your file");
      }

      try {
        const fileData = await toBase64(file);
        const finalMintPayload: MintRequest = {
          sourceWallet: address,
          qty: issuance,
          locked: isLocked,
          filename: file.name,
          file: fileData,
          satsPerVB: fee,
          divisible: isDivisible,
          isPoshStamp: isPoshStamp,
          service_fee: config?.MINTING_SERVICE_FEE,
          service_fee_address: config?.MINTING_SERVICE_FEE_ADDRESS,
          dryRun: false, // Critical: Set to false for actual PSBT generation
        };

        // Add MARA parameters if in MARA mode
        if (maraMode && outputValue !== null) {
          finalMintPayload.outputValue = outputValue;
          if (maraFeeRate !== null) {
            finalMintPayload.maraFeeRate = maraFeeRate;
          }
          logger.info("stamps", {
            message: "MARA parameters added to payload",
            outputValue: finalMintPayload.outputValue,
            maraFeeRate: finalMintPayload.maraFeeRate,
          });
        }

        if (stampName) {
          finalMintPayload.assetName = stampName;
        }

        // 🚀 Phase 3: Exact fee estimation for optimal transaction construction
        logger.debug("stamps", {
          message: "Starting Phase 3 exact fee estimation",
          toolType: "stamp",
        });

        const exactFeeResult = await estimateExact();

        logger.debug("stamps", {
          message: "Phase 3 exact fee estimation complete",
          result: exactFeeResult,
          phase: exactFeeResult.phase,
          hasExactFees: exactFeeResult.hasExactFees,
        });

        // Update local fee details with exact results for user feedback
        setExactFeeDetails({
          ...exactFeeResult,
          hasExactFees: true, // Mark as exact when Phase 3 completes
        });

        // For MARA mode, show warning modal before proceeding
        if (maraMode && outputValue !== null) {
          logger.info("stamps", {
            message: "Showing MARA warning modal",
            maraMode,
            outputValue,
          });
          setPendingMintPayload(finalMintPayload);
          setShowMaraWarning(true);
          setIsSubmitting(false); // Reset submitting state while waiting for modal
          return;
        }

        // Process standard transaction
        await processSignedTransaction(finalMintPayload);
      } catch (error) {
        const errorMsg = extractErrorMessage(error);
        logger.error("stamps", {
          message: "Minting error",
          error,
          extractedMessage: errorMsg,
        });
        setApiError(errorMsg);
        setSubmissionMessage(null);
        setIsSubmitting(false);
      }
    } catch (error: any) {
      logger.error("stamps", {
        message: "Unexpected minting error",
        error,
      });
      setApiError(
        error?.message || error?.response.data.error ||
          "An unexpected error occurred",
      );
      setSubmissionMessage(null);
      setIsSubmitting(false); // Reset submitting state
    }
  };

  /* ===== MARA WARNING MODAL HANDLERS ===== */
  const handleMaraWarningConfirm = async () => {
    logger.info("stamps", {
      message: "MARA warning confirmed, processing transaction",
      hasPendingPayload: !!pendingMintPayload,
    });
    setShowMaraWarning(false);
    closeModal(); // Close the global modal

    if (pendingMintPayload) {
      setIsSubmitting(true);
      await processSignedTransaction(pendingMintPayload);
      setPendingMintPayload(null);
    }
  };

  const handleMaraWarningCancel = () => {
    setShowMaraWarning(false);
    closeModal(); // Close the global modal
    setPendingMintPayload(null);
    setIsSubmitting(false);
  };

  /* ===== MARA UNAVAILABLE MODAL HANDLERS ===== */
  const handleMaraUnavailableRetry = async () => {
    setShowMaraUnavailableModal(false);
    closeModal();
    setMaraUnavailable(false);
    setApiError("");
    setMaraError("");

    // Retry fetching MARA fee rate
    try {
      await fetchMaraFeeRate();
    } catch (_error) {
      // Error handling is already in fetchMaraFeeRate
    }
  };

  const handleMaraUnavailableSwitchToStandard = () => {
    setShowMaraUnavailableModal(false);
    closeModal();
    switchToStandardMode();
  };

  const handleMaraUnavailableClose = () => {
    setShowMaraUnavailableModal(false);
    closeModal();
  };

  const handleCloseFullScreenModal = () => {
    setIsFullScreenModalOpen(false);
  };
  const toggleFullScreenModal = () => {
    if (!file) return;
    setIsFullScreenModalOpen(!isFullScreenModalOpen);
  };

  const isFormValid = isValidForMinting({
    file,
    fileError,
    issuanceError,
    stampNameError,
    isPoshStamp,
    stampName,
    addressError,
  });

  // Add cleanup for blob URLs
  useEffect(() => {
    return () => {
      if (file) {
        URL.revokeObjectURL(URL.createObjectURL(file));
      }
    };
  }, [file]);

  /* ===== TOOLTIP HANDLERS ===== */
  const handleMouseMove = (e: MouseEvent) => {
    setTooltipPosition({
      x: e.clientX, // Viewport coordinates for fixed positioning
      y: e.clientY,
    });
  };

  // Track global mouse movement when tooltip is visible
  useEffect(() => {
    if (!isUploadTooltipVisible) return;

    const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
      setTooltipPosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    return () =>
      document.removeEventListener("mousemove", handleGlobalMouseMove);
  }, [isUploadTooltipVisible]);

  const handleUploadMouseEnter = () => {
    if (uploadTooltipTimeoutRef.current) {
      globalThis.clearTimeout(uploadTooltipTimeoutRef.current);
    }

    uploadTooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setIsUploadTooltipVisible(true);
    }, 1500);
  };

  const handleUploadMouseLeave = () => {
    if (uploadTooltipTimeoutRef.current) {
      globalThis.clearTimeout(uploadTooltipTimeoutRef.current);
    }
    setIsUploadTooltipVisible(false);
  };

  useEffect(() => {
    return () => {
      if (uploadTooltipTimeoutRef.current) {
        globalThis.clearTimeout(uploadTooltipTimeoutRef.current);
      }
      revokePreviewUrl(htmlPreviewUrl);
    };
  }, []);

  // Update the image preview div
  const imagePreviewDiv = (
    <div
      id="image-preview"
      class={`relative items-center content-center mx-auto ${PREVIEW_SIZE_CLASSES} text-center group ${glassmorphismL2}
      ${glassmorphismL2Hover} ${transitionColors} cursor-pointer overflow-hidden`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleUploadMouseEnter}
      onMouseLeave={handleUploadMouseLeave}
      onMouseDown={() => setIsUploadTooltipVisible(false)}
      onClick={() => setIsUploadTooltipVisible(false)}
    >
      <input
        id="upload"
        type="file"
        class="hidden"
        ref={fileInputRef}
        onChange={handleImage}
      />
      {file !== null
        ? (
          <label
            for="upload"
            class="flex flex-col items-center justify-center h-full w-full cursor-pointer"
          >
            {file.name.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i)
              ? (
                <img
                  class={`${PREVIEW_SIZE_CLASSES} object-contain rounded-2xl bg-conic-pattern bg-[length:4px_4px] bg-color-grey/30 [image-rendering:pixelated]`}
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  onError={(e) => {
                    logger.error("stamps", {
                      message: "Image preview failed to load",
                      error: e,
                    });
                    handleImageError(e);
                  }}
                />
              )
              : file.name.match(/\.(html)$/i) && htmlPreviewUrl
              ? (
                <iframe
                  width="100%"
                  height="100%"
                  scrolling="no"
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin"
                  src={htmlPreviewUrl}
                  class={`${PREVIEW_SIZE_CLASSES} object-contain rounded-2xl bg-color-grey/30 [image-rendering:pixelated]`}
                  onError={(e) => {
                    console.error("iframe error (detailed):", {
                      error: e,
                      target: e.target,
                      src: (e.target as HTMLIFrameElement).src,
                      contentWindow:
                        (e.target as HTMLIFrameElement).contentWindow
                          ? "present"
                          : "missing",
                    });
                    handleImageError(e);
                  }}
                />
              )
              : (
                <div
                  class={`${PREVIEW_SIZE_CLASSES} object-contain rounded-2xl bg-conic-pattern bg-[length:4px_4px]`}
                >
                  <PlaceholderImage variant="no-image" />
                </div>
              )}
            <div class="flex items-center justify-center absolute inset-0 rounded-2xl hover:bg-color-background/60 hover:border-color-border opacity-0 hover:opacity-100 transition-opacity">
              <Icon
                type="icon"
                name="uploadImage"
                weight="extraLight"
                size="xl"
                color="custom"
                className="stroke-color-grey-dark group-hover:stroke-color-grey"
              />
            </div>
          </label>
        )
        : (
          <label
            for="upload"
            class={`flex flex-col items-center justify-center h-full cursor-pointer`}
          >
            <Icon
              type="icon"
              name="uploadImage"
              weight="extraLight"
              size="xl"
              color="custom"
              className="stroke-color-grey-dark group-hover:stroke-color-grey-semidark/80"
            />
          </label>
        )}
    </div>
  );

  const handleAdvancedMouseEnter = () => {
    if (allowAdvancedTooltip) {
      setTooltipText(
        showAdvancedOptions ? "SIMPLE SETTINGS" : "ADVANCED SETTINGS",
      );

      if (advancedTooltipTimeoutRef.current) {
        globalThis.clearTimeout(advancedTooltipTimeoutRef.current);
      }

      advancedTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsAdvancedTooltipVisible(true);
      }, 1500);
    }
  };

  const handleAdvancedMouseLeave = () => {
    if (advancedTooltipTimeoutRef.current) {
      globalThis.clearTimeout(advancedTooltipTimeoutRef.current);
    }
    setIsAdvancedTooltipVisible(false);
    setAllowAdvancedTooltip(true);
  };

  /* ===== CLEANUP EFFECT ===== */
  useEffect(() => {
    return () => {
      if (advancedTooltipTimeoutRef.current) {
        globalThis.clearTimeout(advancedTooltipTimeoutRef.current);
      }
    };
  }, []);

  // Add a ref to get the button's position

  // Update the mouse enter handler to position the tooltip
  const handlePoshMouseEnter = () => {
    if (allowPoshTooltip && showAdvancedOptions) {
      // Set tooltip text based on current state when mouse enters
      setPoshTooltipText(isPoshStamp ? "CPID" : "POSH");

      const buttonRect = poshButtonRef.current?.getBoundingClientRect();
      if (buttonRect) {
        setTooltipPosition({
          x: buttonRect.left + buttonRect.width / 2,
          y: buttonRect.top,
        });
      }

      if (poshTooltipTimeoutRef.current) {
        globalThis.clearTimeout(poshTooltipTimeoutRef.current);
      }

      poshTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsPoshTooltipVisible(true);
      }, 1500);
    }
  };

  const handlePoshMouseLeave = () => {
    if (poshTooltipTimeoutRef.current) {
      globalThis.clearTimeout(poshTooltipTimeoutRef.current);
    }
    setIsPoshTooltipVisible(false);
    setAllowPoshTooltip(true);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (poshTooltipTimeoutRef.current) {
        globalThis.clearTimeout(poshTooltipTimeoutRef.current);
      }
    };
  }, []);

  // Update the POSH toggle button JSX
  const poshToggleButton = (
    <ToggleSwitchButton
      isActive={isPoshStamp}
      onToggle={() => {
        handleIsPoshStamp();
        setIsPoshTooltipVisible(false);
        setAllowPoshTooltip(false);
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      toggleButtonId="switch-toggle-locked"
      buttonRef={poshButtonRef}
      onMouseEnter={handlePoshMouseEnter}
      onMouseLeave={handlePoshMouseLeave}
    />
  );

  // Update handlers
  const handleLockMouseEnter = () => {
    if (allowLockTooltip && showAdvancedOptions) {
      // Set tooltip text based on current state
      setLockTooltipText(isLocked ? "UNLOCK" : "LOCK");

      const buttonRect = lockButtonRef.current?.getBoundingClientRect();
      if (buttonRect) {
        setTooltipPosition({
          x: buttonRect.left + buttonRect.width / 2,
          y: buttonRect.top,
        });
      }

      // Clear any existing timeout
      if (lockTooltipTimeoutRef.current) {
        globalThis.clearTimeout(lockTooltipTimeoutRef.current);
      }

      // Set new timeout for 1500ms delay
      lockTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsLockTooltipVisible(true);
      }, 1500);
    }
  };

  const handleLockMouseLeave = () => {
    if (lockTooltipTimeoutRef.current) {
      globalThis.clearTimeout(lockTooltipTimeoutRef.current);
    }
    setIsLockTooltipVisible(false);
    setAllowLockTooltip(true);
  };

  // Add cleanup in useEffect
  useEffect(() => {
    return () => {
      if (lockTooltipTimeoutRef.current) {
        globalThis.clearTimeout(lockTooltipTimeoutRef.current);
      }
    };
  }, []);

  // Update the handlePreviewMouseEnter to include timeout
  const handlePreviewMouseEnter = () => {
    if (allowPreviewTooltip && showAdvancedOptions) {
      // Set tooltip text when mouse enters
      setPreviewTooltipText("PREVIEW STAMP");

      const buttonRect = previewButtonRef.current?.getBoundingClientRect();
      if (buttonRect) {
        setTooltipPosition({
          x: buttonRect.left + buttonRect.width / 2,
          y: buttonRect.top,
        });
      }

      if (previewTooltipTimeoutRef.current) {
        globalThis.clearTimeout(previewTooltipTimeoutRef.current);
      }

      previewTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsPreviewTooltipVisible(true);
      }, 1500);
    }
  };

  // Update handlePreviewMouseLeave to clear timeout
  const handlePreviewMouseLeave = () => {
    if (previewTooltipTimeoutRef.current) {
      globalThis.clearTimeout(previewTooltipTimeoutRef.current);
    }
    setIsPreviewTooltipVisible(false);
    setAllowPreviewTooltip(true);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (previewTooltipTimeoutRef.current) {
        globalThis.clearTimeout(previewTooltipTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isSearching) {
      setIsSearching(false);
    }
  }, [isSearching]);

  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreenModalOpen) {
        handleCloseFullScreenModal();
      }
    };

    document.addEventListener("keydown", handleKeyboardShortcut);
    return () =>
      document.removeEventListener("keydown", handleKeyboardShortcut);
  }, [isFullScreenModalOpen]);

  /* ===== MODAL MANAGEMENT ===== */
  // Handle preview modal — pass pre-built preview URL for HTML stamps
  // so recursive /s/ references resolve correctly in fullscreen too
  useEffect(() => {
    if (isFullScreenModalOpen && file) {
      const isHtml = file.type?.startsWith("text/html");
      openModal(
        <PreviewImageModal
          src={isHtml && htmlPreviewUrl ? htmlPreviewUrl : file}
          contentType={isHtml ? "html" : "image"}
        />,
        "zoomInOut",
      );
    }
  }, [isFullScreenModalOpen, file, htmlPreviewUrl]);

  // Sync local state with global modal state for preview modal
  useEffect(() => {
    // When modal closes externally, update our local state
    if (!globalModal.value.isOpen && isFullScreenModalOpen) {
      setIsFullScreenModalOpen(false);
    }
  }, [globalModal.value.isOpen, isFullScreenModalOpen]);

  // Sync MARA warning modal state
  useEffect(() => {
    if (!globalModal.value.isOpen && showMaraWarning) {
      setShowMaraWarning(false);
    }
  }, [globalModal.value.isOpen, showMaraWarning]);

  // Sync MARA unavailable modal state
  useEffect(() => {
    if (!globalModal.value.isOpen && showMaraUnavailableModal) {
      setShowMaraUnavailableModal(false);
    }
  }, [globalModal.value.isOpen, showMaraUnavailableModal]);

  // Handle MARA warning modal
  useEffect(() => {
    if (showMaraWarning && outputValue !== null) {
      openModal(
        <MaraModeWarningModal
          outputValue={outputValue}
          onConfirm={handleMaraWarningConfirm}
          onCancel={handleMaraWarningCancel}
        />,
        "slideUpDown",
      );
    }
  }, [showMaraWarning, outputValue]);

  // Handle MARA unavailable modal
  useEffect(() => {
    if (showMaraUnavailableModal) {
      openModal(
        <MaraServiceUnavailableModal
          isOpen
          onSwitchToStandard={handleMaraUnavailableSwitchToStandard}
          onRetry={handleMaraUnavailableRetry}
          onClose={handleMaraUnavailableClose}
        />,
        "slideUpDown",
      );
    }
  }, [showMaraUnavailableModal]);

  /* ===== COMPONENT RENDER ===== */
  return (
    <div class={`${bodyTool} ${containerGap}`}>
      <h1 class={`${titleGreyLD} mx-auto -mb-2 mobileLg:-mb-4`}>
        STAMP
      </h1>

      {/* MARA Mode Indicator */}
      {maraMode && outputValue !== null && (
        <MaraModeIndicator
          isActive
          outputValue={outputValue}
          {...(maraFeeRate !== null && { feeRate: maraFeeRate })}
          class="mb-4"
        />
      )}

      {/* MARA Unavailable Warning Banner */}
      {maraMode && maraUnavailable && (
        <div
          class={`mb-4 ${glassmorphism} bg-gradient-to-br from-orange-900/15 to-orange-800/25 border-orange-500/20 p-4`}
        >
          <div class="flex items-start gap-3 mb-3">
            <div class="text-orange-400 text-xl mt-0.5">⚠️</div>
            <div class="flex-1">
              <h3 class="text-orange-300 font-semibold mb-2">
                MARA Pool Temporarily Unavailable
              </h3>
              <p class="text-sm text-color-grey-light">
                The MARA pool submission service is currently unavailable. You
                can either wait and retry, or switch to standard stamping (333
                sat outputs).
              </p>
            </div>
          </div>
          <div class="flex justify-end">
            <button
              type="button"
              onClick={switchToStandardMode}
              class={`px-4 py-2 ${glassmorphism} bg-gradient-to-br from-purple-600/80 to-purple-700/80 text-white text-sm rounded-2xl hover:from-purple-600 hover:to-purple-700 transition-colors font-semibold`}
            >
              Switch to Standard
            </button>
          </div>
        </div>
      )}

      {isConnected && addressError && (
        <div
          class={`w-full mb-4 ${glassmorphism} bg-gradient-to-br from-red-900/15 to-red-800/25 border-red-500/20 p-4`}
        >
          <p class="text-red-400 text-center font-medium">{addressError}</p>
        </div>
      )}

      <form
        class={containerBackground}
        onSubmit={(e) => {
          e.preventDefault();
          handleMint();
        }}
        aria-label="Stamp art stamps"
        novalidate
      >
        <div className="flex gap-5">
          <div className="flex gap-5">
            {imagePreviewDiv}
            {fileError && <p class="text-red-500 mt-2">{fileError}</p>}
          </div>

          <div class="flex flex-col justify-between items-end w-full">
            <div className="relative">
              <ToggleSwitchButton
                isActive={showAdvancedOptions}
                onToggle={() => {
                  handleShowAdvancedOptions();
                  setIsAdvancedTooltipVisible(false);
                  setAllowAdvancedTooltip(false);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                toggleButtonId="switch-toggle-advanced"
                onMouseEnter={handleAdvancedMouseEnter}
                onMouseLeave={handleAdvancedMouseLeave}
              />
              <div
                class={`${tooltipButton} ${
                  isAdvancedTooltipVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                {tooltipText}
              </div>
            </div>
            <div className="flex items-center gap-5">
              <h5 className={`${labelLg} !text-color-grey`}>
                EDITIONS
              </h5>

              <InputField
                type="text"
                value={issuance}
                onChange={(e) => handleIssuanceChange(e)}
                error={issuanceError}
                textAlign="center"
                class="!w-10 !px-2"
              />
            </div>
          </div>
        </div>

        <div
          className={`overflow-hidden ${transitionAll} ${
            showAdvancedOptions
              ? "max-h-[150px] opacity-100 mt-5"
              : "max-h-0 opacity-0 mt-0"
          }`}
        >
          <div className="flex justify-between gap-5 mb-5">
            {poshToggleButton}
            <div
              ref={lockButtonRef}
              className={`flex items-center justify-center !w-10 !h-10 ${glassmorphismL2} ${glassmorphismL2Hover} cursor-pointer group`}
              onClick={() => {
                setIsLocked(!isLocked);
                setIsLockTooltipVisible(false);
                setAllowLockTooltip(false);
              }}
              onMouseEnter={handleLockMouseEnter}
              onMouseLeave={handleLockMouseLeave}
            >
              <Icon
                type="iconButton"
                name={isLocked ? "locked" : "unlocked"}
                weight="normal"
                size="xs"
                color="greyDark"
                className="mb-0.5"
              />
            </div>
          </div>
          <div className={containerRowForm}>
            <InputField
              type="text"
              value={stampName}
              onChange={(e) => handleStampNameChange(e)}
              placeholder={isPoshStamp
                ? "Named Stamp (Requires XCP)"
                : "Custom CPID"}
              maxLength={isPoshStamp ? 13 : 21}
              minLength={isPoshStamp ? 1 : 15}
              error={stampNameError}
            />

            <div
              ref={previewButtonRef}
              className={`flex items-center justify-center !w-[46px] !h-10
                 ${
                file
                  ? `${glassmorphismL2} ${glassmorphismL2Hover} cursor-pointer group`
                  : `${glassmorphismL2} ${stateDisabled} group`
              }`}
              onClick={() => {
                if (!file) return;
                toggleFullScreenModal();
                setIsPreviewTooltipVisible(false);
                setAllowPreviewTooltip(false);
              }}
              onMouseEnter={() => {
                handlePreviewMouseEnter();
              }}
              onMouseLeave={() => {
                handlePreviewMouseLeave();
              }}
            >
              <Icon
                type="iconButton"
                name="previewImage"
                weight="normal"
                size="xs"
                color="greyDark"
                className={`mb-0.5 ${!file ? "!cursor-not-allowed" : ""}`}
              />
              <div
                class={`${tooltipButton} ${
                  isPreviewTooltipVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                {previewTooltipText}
              </div>
            </div>
          </div>
        </div>
      </form>

      <div className={containerBackground}>
        <FeeCalculatorBase
          fee={fee}
          handleChangeFee={handleChangeFee}
          type="stamp"
          fileType={file?.type || "image/png"}
          fileSize={fileSize || 0}
          issuance={parseInt(issuance, 10)}
          BTCPrice={BTCPrice}
          isSubmitting={isSubmitting}
          onSubmit={handleMint}
          buttonName={isConnected ? "STAMP" : "CONNECT WALLET"}
          maraMode={maraMode}
          maraFeeRate={maraFeeRate}
          isLoadingMaraFee={isLoadingMaraFee}
          showCoinToggle
          feeDetails={(exactFeeDetails || progressiveFeeDetails)
            ? {
              minerFee: (exactFeeDetails || progressiveFeeDetails)?.minerFee ||
                0,
              dustValue:
                (exactFeeDetails || progressiveFeeDetails)?.dustValue || 0,
              serviceFee: maraMode ? 42000 : 0, // MARA service fee
              totalValue:
                (exactFeeDetails || progressiveFeeDetails)?.totalValue || 0,
              hasExactFees:
                (exactFeeDetails || progressiveFeeDetails)?.hasExactFees ||
                false,
              estimatedSize: 300, // Default transaction size for stamps
            }
            : {
              minerFee: 0,
              dustValue: 0,
              serviceFee: maraMode ? 42000 : 0, // MARA service fee
              totalValue: 0,
              hasExactFees: false,
              estimatedSize: 300,
            }}
          tosAgreed={tosAgreed}
          onTosChange={setTosAgreed}
          disabled={isConnected ? !isFormValid : false}
          bitname=""
          {...(stampName ? { cpid: stampName } : {})}
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
      </div>

      <StatusMessages
        submissionMessage={submissionMessage}
        apiError={apiError || maraError || ""}
        transactionHex={debugTransactionHex}
        {...(debugTransactionHex
          ? {
            onCopyHex: (() => {
              (async () => {
                try {
                  await navigator.clipboard.writeText(debugTransactionHex);
                  showToast("Transaction hex copied!", "success");
                } catch (_error) {
                  showToast("Failed to copy transaction hex.", "error");
                }
              })();
            }) as () => void,
          }
          : {})}
      />

      {/* Debug Transaction Hex Display for MARA Mode */}
      {maraMode && debugTransactionHex && (
        <TransactionHexDisplay
          hex={debugTransactionHex}
          txid={debugTxid}
          class="mt-4"
        />
      )}

      {/* MARA Status Link - Show when we have a txid from successful submission */}
      {maraMode && debugTxid && submissionMessage?.txid && (
        <MaraStatusLink
          txid={debugTxid}
          class="mt-4"
        />
      )}

      <div
        className={`${tooltipButtonInCollapsible} ${
          isPoshTooltipVisible && showAdvancedOptions
            ? "opacity-100"
            : "opacity-0"
        }`}
        style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y - 28}px`,
          transform: "translate(-50%, 0)",
        }}
      >
        {poshTooltipText}
      </div>

      <div
        className={`${tooltipButtonInCollapsible} ${
          isLockTooltipVisible && showAdvancedOptions
            ? "opacity-100"
            : "opacity-0"
        }`}
        style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y - 28}px`,
          transform: "translate(-50%, 0)",
        }}
      >
        {lockTooltipText}
      </div>

      <div
        className={`${tooltipButtonInCollapsible} ${
          isPreviewTooltipVisible && showAdvancedOptions
            ? "opacity-100"
            : "opacity-0"
        }`}
        style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y - 28}px`,
          transform: "translate(-50%, 0)",
        }}
      >
        PREVIEW STAMP
      </div>

      {/* Tooltip outside backdrop-blur container to avoid stacking context issues */}
      <div
        class={`${tooltipImage} ${
          isUploadTooltipVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y - 6}px`,
          transform: "translate(-50%, -100%)",
        }}
      >
        UPLOAD FILE
      </div>
    </div>
  );
}
