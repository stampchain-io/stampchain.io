/* ===== SEND BTC MODAL COMPONENT ===== */
import { useTransactionForm } from "$client/hooks/useTransactionForm.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { inputField } from "$form";
import { closeModal } from "$islands/modal/states.ts";
import { ModalBase } from "$layout";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import { logger } from "$lib/utils/logger.ts";
import { mapProgressiveFeeDetails } from "$lib/utils/performance/fees/fee-estimation-utils.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { tooltipIcon } from "$notification";
import { FeeCalculatorBase } from "$section";
import type { SendBTCModalProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
function SendBTCModal({
  fee: initialFee,
  balance,
  handleChangeFee,
  onClose: _onClose = () => {},
  ...baseProps
}: SendBTCModalProps) {
  /* ===== CONTEXT ===== */
  const { wallet } = walletContext;

  /* ===== STATE ===== */
  const [_isSendingMax, _setIsSendingMax] = useState(false);
  const [isMaxTooltipVisible, setIsMaxTooltipVisible] = useState(false);
  const [allowMaxTooltip, setAllowMaxTooltip] = useState(true);
  const [maxTooltipText, setMaxTooltipText] = useState("EMPTY YOUR WALLET");
  const [isMaxMode, setIsMaxMode] = useState(false);
  const [_windowWidth, setWindowWidth] = useState(globalThis.innerWidth);
  const [tosAgreed, setTosAgreed] = useState(false);

  /* ===== REFS ===== */
  const maxTooltipTimeoutRef = useRef<number | null>(null);

  /* ===== FORM HANDLING ===== */
  const {
    formState,
    setFormState,
    handleChangeFee: internalHandleChangeFee,
    handleSubmit,
    isSubmitting,
    error: formHookError,
    setError: setFormHookError,
  } = useTransactionForm({
    type: "send",
    initialFee,
  });

  /* ===== PROGRESSIVE FEE ESTIMATION INTEGRATION ===== */
  const {
    getBestEstimate,
    isEstimating,
    estimateExact,
    currentPhase,
  } = useTransactionConstructionService({
    toolType: "stamp", // Using "stamp" for basic BTC sends (no data)
    feeRate: isSubmitting ? 0 : formState.fee,
    walletAddress: wallet?.address || "",
    isConnected: !!wallet && !isSubmitting,
    isSubmitting,
    // BTC send specific parameters
    recipientAddress: formState.recipientAddress,
    amount: formState.amount,
  });

  // Get the best available fee estimate
  const progressiveFeeDetails = getBestEstimate();

  // Local state for exact fee details (updated when Phase 3 completes)
  const [exactFeeDetails, setExactFeeDetails] = useState<
    typeof progressiveFeeDetails | null
  >(null);

  // Reset exactFeeDetails when fee rate changes to allow slider updates
  useEffect(() => {
    setExactFeeDetails(null);
  }, [formState.fee]);

  /* ===== FEE DETAILS SYNCHRONIZATION ===== */
  useEffect(() => {
    if (progressiveFeeDetails && !isEstimating) {
      logger.debug("system", {
        message: "SendBTC progressive fee details update",
        data: {
          phase: currentPhase,
          hasExactFees: progressiveFeeDetails.hasExactFees,
          minerFee: progressiveFeeDetails.minerFee,
        },
      });
    }
  }, [progressiveFeeDetails, isEstimating, currentPhase]);

  /* ===== EFFECTS ===== */
  useEffect(() => {
    handleChangeFee(formState.fee);
  }, [formState.fee]);

  useEffect(() => {
    return () => {
      if (maxTooltipTimeoutRef.current) {
        globalThis.clearTimeout(maxTooltipTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMaxMode || balance == null) return;
    try {
      const maxAmountBTC = calculateMaxAmount(formState.fee, balance);
      if (!maxAmountBTC) {
        setFormHookError("Insufficient balance to cover network fees");
        return;
      }
      setFormState((prev) => ({ ...prev, amount: maxAmountBTC }));
    } catch (error) {
      const errorMsg = error instanceof Error
        ? error.message
        : "Failed to calculate max amount";
      setFormHookError(errorMsg);
    }
  }, [formState.fee, balance, isMaxMode, setFormState, setFormHookError]);

  useEffect(() => {
    if (!isMaxMode) {
      setMaxTooltipText("EMPTY YOUR WALLET");
      setIsMaxTooltipVisible(false);
      setAllowMaxTooltip(true);
    }
  }, [isMaxMode, formState.fee]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(globalThis.innerWidth);
    globalThis.addEventListener("resize", handleResize);
    return () => globalThis.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (formHookError) {
      showToast(formHookError, "error");
      setFormHookError(null);
    }
  }, [formHookError, setFormHookError]);

  /* ===== HELPER FUNCTIONS ===== */
  const calculateMaxAmount = (feeRate: number, balanceAmount: number) => {
    const estimatedVSize = 141;
    const feeInSatoshis = Math.ceil(feeRate * estimatedVSize);
    const feeInBTC = feeInSatoshis / 100000000;
    return balanceAmount > feeInBTC
      ? (balanceAmount - feeInBTC).toFixed(8)
      : null;
  };

  const sanitizeAmountInput = (value: string) => {
    let sanitized = value.replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");

    // Ensure only one decimal point
    if (parts.length > 2) {
      sanitized = parts[0] + "." + parts[1];
    }

    // Limit decimal places to 8
    if (parts.length === 2 && parts[1].length > 8) {
      sanitized = parts[0] + "." + parts[1].slice(0, 8);
    }

    // Limit total length to 10 characters
    return sanitized.slice(0, 10);
  };

  /* ===== EVENT HANDLERS ===== */
  const handleCloseModal = () => {
    logger.debug("ui", { message: "Modal closing", component: "SendBTCModal" });
    closeModal();
  };

  const handleSendSubmit = async () => {
    await handleSubmit(async () => {
      // Get exact fee estimation before submitting
      try {
        const exactEstimate = await estimateExact();
        if (exactEstimate) {
          setExactFeeDetails(exactEstimate);
          logger.debug("system", {
            message: "SendBTC exact fee estimation completed",
            data: {
              minerFee: exactEstimate.minerFee,
              hasExactFees: exactEstimate.hasExactFees,
            },
          });
        }
      } catch (error) {
        logger.warn("system", {
          message:
            "SendBTC exact fee estimation failed, using progressive estimate",
          error: error instanceof Error ? error.message : String(error),
        });
      }

      const options = {
        return_psbt: true,
        fee_per_kb: formState.fee * 1000,
      };

      const requestBody = {
        address: wallet.address,
        toAddress: formState.recipientAddress,
        amount: formState.amount,
        options,
      };

      const response = await fetch("/api/v2/create/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Failed to parse server error.",
        }));
        const detail = errorData.error || "Failed to create send transaction.";
        logger.error("ui", {
          message: "SendBTC API error",
          detail,
          requestBody,
        });
        throw new Error("Transaction creation failed. Please try again.");
      }

      const responseData = await response.json();
      if (!responseData?.result?.psbt) {
        logger.error("ui", {
          message: "SendBTC API invalid response",
          responseData,
        });
        throw new Error("Received invalid transaction data from server.");
      }

      const signResult = await walletContext.signPSBT(
        wallet,
        responseData.result.psbt,
        [],
        true,
      );

      if (signResult.signed) {
        if (signResult.txid) {
          showToast(
            `Transaction sent!\nTXID: ${signResult.txid.substring(0, 10)}`,
            "success",
            false,
          );
          setTimeout(closeModal, 1000);
        } else if (signResult.psbt) {
          try {
            showToast("Transaction signed.\nBroadcasting...", "info");
            const broadcastTxid = await walletContext.broadcastPSBT(
              signResult.psbt,
            );
            if (broadcastTxid && typeof broadcastTxid === "string") {
              showToast(
                `Broadcasted.\n${broadcastTxid.substring(0, 10)}...`,
                "success",
                false,
              );
              setTimeout(closeModal, 1000);
            } else {
              logger.error("ui", {
                message: "Broadcast did not return valid TXID (SendBTC)",
                broadcastResult: broadcastTxid,
                psbt: signResult.psbt,
              });
              throw new Error(
                "Broadcast failed after signing. Check status or try again.",
              );
            }
          } catch (broadcastError: unknown) {
            const beMsg = broadcastError instanceof Error
              ? broadcastError.message
              : String(broadcastError);
            logger.error("ui", {
              message: "Error broadcasting signed PSBT (SendBTC)",
              error: beMsg,
              psbt: signResult.psbt,
            });
            throw new Error(
              `Broadcast error: ${beMsg.substring(0, 50)}${
                beMsg.length > 50 ? "..." : ""
              }`,
            );
          }
        } else {
          logger.error("ui", {
            message: "Signed but no TXID or PSBT hex (SendBTC)",
            result: signResult,
          });
          throw new Error(
            "Signing reported success, but critical data missing.",
          );
        }
      } else if (signResult.cancelled) {
        showToast("Transaction signing was cancelled.", "info");
      } else {
        const signError = signResult.error || "Unknown signing error";
        logger.error("ui", {
          message: "PSBT signing failed (SendBTC)",
          error: signError,
        });
        throw new Error(
          `Signing failed: ${signError.substring(0, 50)}${
            signError.length > 50 ? "..." : ""
          }`,
        );
      }
    });
  };

  const handleMaxClick = () => {
    if (balance == null || formState.fee == null) {
      showToast(
        "Balance or fee rate not available to calculate max amount.",
        "info",
      );
      return;
    }
    try {
      const maxAmountBTC = calculateMaxAmount(formState.fee, balance);
      if (!maxAmountBTC) {
        showToast(
          "Insufficient balance to cover network fees.",
          "error",
          false,
        );
        return;
      }
      setIsMaxMode(true);
      setFormState((prev) => ({
        ...prev,
        amount: maxAmountBTC,
        amountError: "",
      }));
      setMaxTooltipText("WALLET EMPTIED");
      setIsMaxTooltipVisible(true);
      setAllowMaxTooltip(true);
      if (maxTooltipTimeoutRef.current) {
        clearTimeout(maxTooltipTimeoutRef.current);
      }
      maxTooltipTimeoutRef.current = setTimeout(
        () => setIsMaxTooltipVisible(false),
        1500,
      );
    } catch (error) {
      const errorMsg = error instanceof Error
        ? error.message
        : "Failed to calculate max amount.";
      showToast(errorMsg, "error");
    }
  };

  const handleMaxMouseEnter = () => {
    if (allowMaxTooltip) {
      setMaxTooltipText(isMaxMode ? "WALLET EMPTIED" : "EMPTY YOUR WALLET");
      if (maxTooltipTimeoutRef.current) {
        clearTimeout(maxTooltipTimeoutRef.current);
      }
      maxTooltipTimeoutRef.current = setTimeout(
        () => setIsMaxTooltipVisible(true),
        1500,
      );
    }
  };

  const handleMaxMouseLeave = () => {
    if (maxTooltipTimeoutRef.current) {
      clearTimeout(maxTooltipTimeoutRef.current);
    }
    setIsMaxTooltipVisible(false);
    setAllowMaxTooltip(true);
  };

  const handleAmountInput = (e: Event) => {
    const inputValue = (e.target as HTMLInputElement).value;
    const maxAmountBTC = calculateMaxAmount(formState.fee, balance ?? 0);
    if (maxAmountBTC && inputValue !== maxAmountBTC) {
      setIsMaxMode(false);
      setAllowMaxTooltip(true);
    }
    if (formState.amount === "0." && inputValue === "0") {
      setFormState((prev) => ({ ...prev, amount: "" }));
      return;
    }
    if (inputValue === "0" || inputValue === ".") {
      setFormState((prev) => ({ ...prev, amount: "0." }));
      return;
    }
    const sanitizedValue = sanitizeAmountInput(inputValue);
    setFormState((prev) => ({
      ...prev,
      amount: sanitizedValue,
      amountError: "",
    }));
  };

  /* ===== RENDER ===== */
  return (
    <ModalBase
      onClose={handleCloseModal}
      {...baseProps}
      title={baseProps.title || "SEND"}
    >
      {/* ===== AMOUNT INPUT SECTION ===== */}
      <div class="flex flex-col gap-6 -mt-3">
        <div class="flex flex-col items-center text-center">
          <div class="flex justify-center items-baseline w-full">
            <div
              class="inline-flex items-baseline gap-3"
              style={{ background: "transparent", border: "none" }}
            >
              <input
                type="text"
                value={formState.amount}
                onInput={handleAmountInput}
                placeholder="0"
                class="bg-transparent text-[30px] mobileLg:text-[42px] text-color-grey-light placeholder:text-color-grey font-black text-right -ms-0 mobileLg:-ms-0 pointer-events-auto no-outline"
                style={{
                  width: (() => {
                    const value = formState.amount || "";
                    const isSmallScreen =
                      globalThis.matchMedia("(max-width: 767px)").matches;
                    const { one, other } = isSmallScreen
                      ? { one: 14, other: 19 }
                      : { one: 19, other: 27 };
                    const baseWidth = !value
                      ? other
                      : value.split("").reduce((total, char) => {
                        return total +
                          (char === "1" || char === "." ? one : other);
                      }, 0);
                    return `${baseWidth}px`;
                  })(),
                  background: "transparent",
                  boxShadow: "none",
                  border: "none",
                  outline: "0px solid transparent",
                  outlineOffset: "0",
                  outlineStyle: "none",
                }}
              />
              <span class="text-[30px] mobileLg:text-[42px] text-color-grey-light font-extralight">
                BTC
              </span>
            </div>
          </div>

          {/* ===== USD CONVERSION ===== */}
          <div class="text-sm mobileLg:text-base text-color-grey-semidark font-light">
            {formState.amount && formState.BTCPrice
              ? (parseFloat(formState.amount) * formState.BTCPrice)
                .toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "0.00"} USD
          </div>

          {/* ===== MAX BUTTON ===== */}
          <div
            className="relative text-base mobileLg:text-lg text-color-grey font-medium hover:text-color-grey-light mt-2 cursor-pointer"
            onClick={handleMaxClick}
            onMouseEnter={handleMaxMouseEnter}
            onMouseLeave={handleMaxMouseLeave}
          >
            MAX
            <div
              className={`${tooltipIcon} ${
                isMaxTooltipVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {maxTooltipText}
            </div>
          </div>
        </div>

        {/* ===== RECIPIENT ADDRESS INPUT ===== */}
        <input
          value={formState.recipientAddress}
          onInput={(e) =>
            setFormState({
              ...formState,
              recipientAddress: (e.target as HTMLInputElement).value,
            })}
          placeholder="Recipient address"
          class={inputField}
        />
      </div>

      {/* ===== FEE CALCULATOR ===== */}
      <FeeCalculatorBase
        fee={formState.fee}
        handleChangeFee={internalHandleChangeFee}
        BTCPrice={formState.BTCPrice}
        feeDetails={mapProgressiveFeeDetails(
          exactFeeDetails || progressiveFeeDetails,
        )}
        isSubmitting={isSubmitting}
        onSubmit={handleSendSubmit}
        onCancel={handleCloseModal}
        buttonName={isSubmitting ? "BROADCASTING..." : "SEND"}
        tosAgreed={tosAgreed}
        onTosChange={setTosAgreed}
        className="mt-auto"
      />
    </ModalBase>
  );
}

export default SendBTCModal;
