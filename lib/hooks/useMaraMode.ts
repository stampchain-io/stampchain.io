/* ===== MARA MODE HOOK ===== */
/*
 * Opt-in MARA Slipstream support for the stamp create pages. Lifted from
 * StampingTool: URL-driven activation (?outputValue=1..329), MARA fee-rate
 * fetching, availability checks and signed-transaction submission with retry.
 */
import type { StampMintRequest } from "$lib/utils/stamps/mintHelpers.ts";
import { useSSRSafeNavigation } from "$lib/hooks/useSSRSafeNavigation.ts";
import {
  ensureRawTransactionFormat,
  extractRawTransactionFromPSBT,
} from "$lib/utils/bitcoin/psbt/psbtUtils.ts";
import { logger } from "$lib/utils/logger.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import {
  getSearchParams,
  isBrowser,
} from "$utils/navigation/freshNavigationUtils.ts";
import axiod from "axiod";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */
export interface StampSubmissionMessage {
  message: string;
  txid?: string;
}

export interface UseMaraModeOptions {
  /** When false the hook is inert (no URL parsing, no network calls). */
  enabled: boolean;
  /** Update the fee slider (used for the buffered MARA fee rate). */
  setFee: (fee: number) => void;
  setApiError: (message: string) => void;
  setSubmissionMessage: (message: StampSubmissionMessage | null) => void;
}

/** MARA requires at least 6 sats/vB; a small buffer is added on top. */
const MARA_MIN_FEE_RATE = 6.0;
const MARA_FEE_BUFFER = 0.1;
const MARA_MAX_SUBMIT_RETRIES = 3;
const MARA_RETRY_BASE_DELAY_MS = 1000;

/** True for errors that mean the MARA service itself is unavailable. */
export function isMaraUnavailableError(message: string): boolean {
  return message.includes("circuit breaker") ||
    message.includes("Circuit breaker") ||
    message.includes("OPEN") ||
    message.includes("temporarily unavailable") ||
    message.includes("Failed to fetch") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504");
}

/* ===== HOOK ===== */
export function useMaraMode(options: UseMaraModeOptions) {
  const { enabled, setFee, setApiError, setSubmissionMessage } = options;
  const { deleteSearchParam, isClient } = useSSRSafeNavigation();

  const [outputValue, setOutputValue] = useState<number | null>(null);
  const [maraMode, setMaraMode] = useState(false);
  const [maraFeeRate, setMaraFeeRate] = useState<number | null>(null);
  const [maraError, setMaraError] = useState("");
  const [isLoadingMaraFee, setIsLoadingMaraFee] = useState(false);
  const [maraUnavailable, setMaraUnavailable] = useState(false);
  const [showMaraWarning, setShowMaraWarning] = useState(false);
  const [showMaraUnavailableModal, setShowMaraUnavailableModal] = useState(
    false,
  );
  const [pendingMintPayload, setPendingMintPayload] = useState<
    StampMintRequest | null
  >(null);
  const [debugTransactionHex, setDebugTransactionHex] = useState("");
  const [debugTxid, setDebugTxid] = useState("");

  /* ===== AVAILABILITY ===== */
  const checkMaraAvailability = async () => {
    try {
      await axiod.get("/api/internal/mara-fee-rate");
      setMaraUnavailable(false);
      return true;
    } catch (error) {
      logger.warn("stamps", {
        message: "MARA service appears unavailable",
        error: (error as Error)?.message,
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

    if (isClient) {
      deleteSearchParam("outputValue");
    }

    logger.info("stamps", {
      message: "Switched from MARA mode to standard stamping",
    });
    showToast("Switched to standard stamping (333 sat outputs).", "info");
  };

  /* ===== FEE RATE ===== */
  const fetchMaraFeeRate = async () => {
    setIsLoadingMaraFee(true);
    try {
      const response = await axiod.get("/api/internal/mara-fee-rate");

      if (response.data && typeof response.data.fee_rate === "number") {
        const bufferedFeeRate =
          Math.max(response.data.fee_rate, MARA_MIN_FEE_RATE) +
          MARA_FEE_BUFFER;
        setMaraFeeRate(bufferedFeeRate);
        setFee(bufferedFeeRate);
        setMaraError("");

        logger.info("stamps", {
          message: "MARA fee rate fetched successfully",
          originalFeeRate: response.data.fee_rate,
          bufferedFeeRate,
          minFeeRate: response.data.min_fee_rate,
        });
        return response.data.fee_rate;
      }
      throw new Error("Invalid fee rate response");
    } catch (error) {
      const errorMessage: string =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ||
        (error as Error)?.message ||
        "Failed to fetch MARA fee rate";

      setMaraError(errorMessage);
      logger.error("stamps", {
        message: "Failed to fetch MARA fee rate",
        error: errorMessage,
      });

      if (isMaraUnavailableError(errorMessage)) {
        setMaraUnavailable(true);
        setApiError(
          "MARA service is temporarily unavailable. You can switch to standard mode or try again later.",
        );
        setShowMaraUnavailableModal(true);
      } else {
        setMaraMode(false);
        setOutputValue(null);
      }
      throw error;
    } finally {
      setIsLoadingMaraFee(false);
    }
  };

  /* ===== TRANSACTION SUBMISSION WITH RETRY ===== */
  const submitToMara = async (
    signedHex: string,
    retryCount = 0,
  ): Promise<{ txid: string; status: string }> => {
    // Convert PSBT to raw transaction format (preferPSBT=false: extract raw tx)
    const txResult = ensureRawTransactionFormat(signedHex, false);
    const transactionHex = txResult.hex;

    logger.info("mara-submission", {
      message: "Submitting transaction to MARA",
      format: txResult.isPSBT ? "converted-from-psbt" : "raw-transaction",
      wasConverted: txResult.wasConverted,
      hexLength: transactionHex.length,
      outputValue,
      maraFeeRate,
      attempt: retryCount + 1,
      maxAttempts: MARA_MAX_SUBMIT_RETRIES + 1,
    });

    if (txResult.isPSBT && !txResult.wasConverted) {
      logger.warn("stamps", {
        message: "Failed to extract raw transaction from PSBT",
        error: txResult.error,
      });
    }

    try {
      const response = await axiod.post("/api/internal/mara-submit", {
        hex: transactionHex,
        priority: "high",
      });

      if (response.data && response.data.txid) {
        const status: string = response.data.status;
        const txidShort = response.data.txid.substring(0, 10);

        logger.info("stamps", {
          message: "Successfully submitted to MARA pool",
          txid: response.data.txid,
          status,
          attempts: retryCount + 1,
        });

        setDebugTxid(response.data.txid);

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
        const statusUrl =
          `https://slipstream.mara.com/status?txid=${response.data.txid}`;
        setSubmissionMessage({
          message:
            `Transaction submitted to MARA pool successfully! View status at: ${statusUrl}`,
          txid: response.data.txid,
        });
        return response.data;
      }
      throw new Error("Invalid response from MARA submission");
    } catch (error) {
      const err = error as {
        message?: string;
        response?: { status?: number; data?: { error?: string } };
      };
      const errorMessage: string = err?.response?.data?.error ||
        err?.message ||
        "Failed to submit transaction to MARA pool";

      const isRetryableError = errorMessage.includes("network") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("502") ||
        errorMessage.includes("503") ||
        errorMessage.includes("504") ||
        (err?.response?.status ?? 0) >= 500;

      if (retryCount < MARA_MAX_SUBMIT_RETRIES && isRetryableError) {
        const delay = MARA_RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
        logger.warn("stamps", {
          message: `MARA submission failed, retrying in ${delay}ms`,
          error: errorMessage,
          attempt: retryCount + 1,
          nextRetryIn: delay,
        });
        showToast(
          `MARA submission failed, retrying... (${
            retryCount + 1
          }/${MARA_MAX_SUBMIT_RETRIES})`,
          "info",
          true,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return submitToMara(signedHex, retryCount + 1);
      }

      logger.error("stamps", {
        message: "MARA submission failed after all retry attempts",
        error: errorMessage,
        totalAttempts: retryCount + 1,
        isRetryableError,
      });
      throw new Error(errorMessage);
    }
  };

  /** Store the signed hex for the debug display; returns it (raw if possible). */
  const prepareDebugHex = (psbt: string): string => {
    const rawTx = extractRawTransactionFromPSBT(psbt);
    const hexToDisplay = rawTx || psbt;
    setDebugTransactionHex(hexToDisplay);
    setDebugTxid("");
    logger.info("stamps", {
      message: "MARA mode: Transaction prepared",
      psbtLength: psbt.length,
      rawTxLength: rawTx ? rawTx.length : 0,
      hasRawTx: !!rawTx,
    });
    return hexToDisplay;
  };

  /* ===== URL PARAMETER PARSING (mount only) ===== */
  // Latest callbacks, so the mount-only effect never captures stale closures.
  const fetchRef = useRef(fetchMaraFeeRate);
  fetchRef.current = fetchMaraFeeRate;
  const availabilityRef = useRef(checkMaraAvailability);
  availabilityRef.current = checkMaraAvailability;

  useEffect(() => {
    if (!enabled || !isBrowser()) return;

    const params = getSearchParams();
    const outputValueParam = params.get("outputValue");

    // Circuit breaker reset flag: the health endpoint can trigger a reset
    if (params.get("resetMara") === "1") {
      axiod.get("/api/internal/mara-health").catch(() => {
        // Ignore errors - just trying to check status
      });
      logger.info("stamps", {
        message: "Attempting to reset MARA circuit breaker via health check",
      });
    }

    if (!outputValueParam) return;
    const value = parseInt(outputValueParam, 10);

    // MARA range is 1-329; 330+ uses the standard wallet auto-broadcast flow
    if (!isNaN(value) && value >= 1 && value < 330) {
      setOutputValue(value);
      setMaraMode(true);
      logger.info("stamps", {
        message: "MARA mode activated via URL parameter",
        outputValue: value,
      });

      fetchRef.current().catch((error) => {
        const errorMessage: string = error?.message || "";
        logger.warn("stamps", {
          message: "Failed to fetch MARA fee rate",
          error: errorMessage,
        });
        if (isMaraUnavailableError(errorMessage)) {
          // Keep MARA mode but surface the unavailable state
          setMaraError("MARA service is temporarily unavailable");
          availabilityRef.current();
        } else {
          setMaraMode(false);
          setOutputValue(null);
          setMaraError("MARA integration is not available");
        }
      });
    } else if (!isNaN(value) && value >= 330) {
      logger.info("stamps", {
        message: "OutputValue >= 330, using standard mode",
        value: outputValueParam,
        parsed: value,
      });
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
  }, [enabled]);

  /* ===== UNAVAILABLE MODAL HANDLERS ===== */
  const retryAfterUnavailable = async () => {
    setShowMaraUnavailableModal(false);
    setMaraUnavailable(false);
    setApiError("");
    setMaraError("");
    try {
      await fetchMaraFeeRate();
    } catch (_error) {
      // Error handling is already in fetchMaraFeeRate
    }
  };

  return {
    maraMode,
    outputValue,
    maraFeeRate,
    maraError,
    isLoadingMaraFee,
    maraUnavailable,
    showMaraWarning,
    showMaraUnavailableModal,
    pendingMintPayload,
    debugTransactionHex,
    debugTxid,
    setMaraUnavailable,
    setShowMaraWarning,
    setShowMaraUnavailableModal,
    setPendingMintPayload,
    setDebugTxid,
    checkMaraAvailability,
    switchToStandardMode,
    fetchMaraFeeRate,
    submitToMara,
    prepareDebugHex,
    retryAfterUnavailable,
  };
}

export type MaraModeController = ReturnType<typeof useMaraMode>;
