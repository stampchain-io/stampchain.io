/* ===== BITCOIN SEND TOOL MODAL ===== */
import { useTransactionForm } from "$client/hooks/useTransactionForm.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { handleModalClose } from "$components/layout/ModalBase.tsx";
import { inputField } from "$form";
import { stackConnectWalletModal } from "$islands/layout/ModalStack.tsx";
import { closeModal } from "$islands/modal/states.ts";
import { ModalTool, openModalTool } from "$islands/modal/tool/ModalTool.tsx";
import { container2, containerPill } from "$layout";
import { coinUnit, showMarketData } from "$lib/utils/chain/clientChain.ts";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import { logger } from "$lib/utils/logger.ts";
import { mapProgressiveFeeDetails } from "$lib/utils/performance/fees/fee-estimation-utils.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { tooltipIcon } from "$notification";
import { FeeCalculatorBase } from "$section";
import type { BTCSendToolProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== OPENER ===== */
export function openBTCSendTool(props: BTCSendToolProps = {}) {
  openModalTool(<BTCSendTool {...props} />);
}

/* ===== HELPERS ===== */
const calculateMaxAmount = (
  feeRate: number,
  balanceAmount: number,
): string | null => {
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

  if (parts.length > 2) {
    sanitized = parts[0] + "." + parts[1];
  }

  if (parts.length === 2 && parts[1].length > 8) {
    sanitized = parts[0] + "." + parts[1].slice(0, 8);
  }

  return sanitized.slice(0, 10);
};

/* ===== COMPONENT ===== */
export function BTCSendTool({
  fee: initialFee,
  balance: balanceProp,
  handleChangeFee,
}: BTCSendToolProps) {
  /* ===== CONTEXT ===== */
  const { wallet } = walletContext;

  /* ===== STATE ===== */
  const [isMaxTooltipVisible, setIsMaxTooltipVisible] = useState(false);
  const [allowMaxTooltip, setAllowMaxTooltip] = useState(true);
  const [maxTooltipText, setMaxTooltipText] = useState("EMPTY YOUR WALLET");
  const [isMaxMode, setIsMaxMode] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [fetchedBalance, setFetchedBalance] = useState<number | null>(null);

  const balance = typeof balanceProp === "number"
    ? balanceProp
    : fetchedBalance;

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
    initialAmount: "",
    ...(initialFee !== undefined && { initialFee }),
  });

  /* ===== PROGRESSIVE FEE ESTIMATION ===== */
  const {
    getBestEstimate,
    isEstimating,
    estimateExact,
    currentPhase,
  } = useTransactionConstructionService({
    toolType: "stamp",
    feeRate: isSubmitting ? 0 : formState.fee,
    walletAddress: wallet?.address || "",
    isConnected: !!wallet?.address && !isSubmitting,
    isSubmitting,
    recipientAddress: formState.recipientAddress,
    amount: formState.amount,
  });

  const progressiveFeeDetails = getBestEstimate();

  const [exactFeeDetails, setExactFeeDetails] = useState<
    typeof progressiveFeeDetails | null
  >(null);

  /* ===== EFFECTS ===== */
  useEffect(() => {
    setExactFeeDetails(null);
  }, [formState.fee]);

  useEffect(() => {
    if (progressiveFeeDetails && !isEstimating) {
      logger.debug("system", {
        message: "BTCSend progressive fee details update",
        data: {
          phase: currentPhase,
          hasExactFees: progressiveFeeDetails.hasExactFees,
          minerFee: progressiveFeeDetails.minerFee,
        },
      });
    }
  }, [progressiveFeeDetails, isEstimating, currentPhase]);

  useEffect(() => {
    if (handleChangeFee) handleChangeFee(formState.fee);
  }, [formState.fee, handleChangeFee]);

  useEffect(() => {
    return () => {
      if (maxTooltipTimeoutRef.current) {
        globalThis.clearTimeout(maxTooltipTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof balanceProp === "number") return;
    const address = wallet?.address;
    if (!address) {
      setFetchedBalance(null);
      return;
    }

    let cancelled = false;
    const loadBalance = async () => {
      try {
        const response = await fetch(
          `/api/v2/balance/${encodeURIComponent(address)}`,
        );
        if (!response.ok) return;
        const data = await response.json();
        const btc = data?.btc?.balance;
        if (!cancelled && typeof btc === "number") {
          setFetchedBalance(btc);
        }
      } catch (error) {
        logger.debug("ui", {
          message: "BTCSendTool balance fetch failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    loadBalance();
    return () => {
      cancelled = true;
    };
  }, [balanceProp, wallet?.address]);

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
    if (formHookError) {
      showToast(formHookError, "error");
      setFormHookError(null);
    }
  }, [formHookError, setFormHookError]);

  /* ===== EVENT HANDLERS ===== */
  const handleSendSubmit = async () => {
    if (!wallet?.address) {
      stackConnectWalletModal();
      return;
    }

    await handleSubmit(async () => {
      try {
        const exactEstimate = await estimateExact();
        if (exactEstimate) {
          setExactFeeDetails(exactEstimate);
          logger.debug("system", {
            message: "BTCSend exact fee estimation completed",
            data: {
              minerFee: exactEstimate.minerFee,
              hasExactFees: exactEstimate.hasExactFees,
            },
          });
        }
      } catch (error) {
        logger.warn("system", {
          message:
            "BTCSend exact fee estimation failed, using progressive estimate",
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
          message: "BTCSend API error",
          detail,
          requestBody,
        });
        throw new Error("Transaction creation failed. Please try again.");
      }

      const responseData = await response.json();
      if (!responseData?.result?.psbt) {
        logger.error("ui", {
          message: "BTCSend API invalid response",
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
                message: "Broadcast did not return valid TXID (BTCSend)",
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
              message: "Error broadcasting signed PSBT (BTCSend)",
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
            message: "Signed but no TXID or PSBT hex (BTCSend)",
            result: signResult,
          });
          throw new Error(
            "Signing reported success, but critical data missing.",
          );
        }
      } else if (signResult.cancelled) {
        showToast("Transaction signing was cancelled.", "warning");
      } else {
        const signError = signResult.error || "Unknown signing error";
        logger.error("ui", {
          message: "PSBT signing failed (BTCSend)",
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
    const maxAmountBTC = balance == null
      ? null
      : calculateMaxAmount(formState.fee, balance);
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

  /* Room for the caret. Right pad only once digits exist, so the
     empty placeholder stays flush with BTC. Letter-spacing is left off:
     on an input it widens the caret. */
  const amountInset = formState.amount ? "pl-0.5 pr-1.5" : "pl-0.5";

  /* ===== RENDER ===== */
  return (
    <ModalTool title="BITCOIN" subtitle="SEND">
      <div class="flex flex-col items-center text-center">
        <div class="flex justify-center items-center w-full">
          <div class="inline-flex items-baseline text-2xl">
            {/* Hidden copy sets the width so digits and BTC stay centered. */}
            <span class="inline-grid">
              <span
                class={`invisible col-start-1 row-start-1 font-extrabold
                  whitespace-pre ${amountInset}`}
                aria-hidden="true"
              >
                {formState.amount || "0"}
              </span>
              <input
                type="text"
                value={formState.amount}
                onInput={handleAmountInput}
                placeholder="0"
                size={1}
                aria-label="Amount to send"
                class={`col-start-1 row-start-1 w-full min-w-0 py-0
                  bg-transparent font-extrabold text-color-neutral-200
                  placeholder:text-color-neutral-500 text-left
                  pointer-events-auto no-outline ${amountInset}`}
                style={{
                  background: "transparent",
                  boxShadow: "none",
                  border: "none",
                  outline: "0px solid transparent",
                  outlineOffset: "0",
                  outlineStyle: "none",
                }}
              />
            </span>
            <span class="font-extralight text-color-neutral-200">
              {coinUnit()}
            </span>
          </div>
        </div>

        {showMarketData() && (
          <div class="-mt-0.5 font-light text-sm text-color-neutral-500">
            {formState.amount && formState.BTCPrice
              ? (parseFloat(formState.amount) * formState.BTCPrice)
                .toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "0.00"} USD
          </div>
        )}

        <div
          class={`relative mt-2.5 mb-0.5 ${containerPill} font-medium text-xs text-color-neutral-400
            hover:text-color-hover cursor-pointer`}
          onClick={handleMaxClick}
          onMouseEnter={handleMaxMouseEnter}
          onMouseLeave={handleMaxMouseLeave}
        >
          MAX
          <div
            class={`${tooltipIcon} ${
              isMaxTooltipVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {maxTooltipText}
          </div>
        </div>
      </div>

      <input
        value={formState.recipientAddress}
        onInput={(e) =>
          setFormState({
            ...formState,
            recipientAddress: (e.target as HTMLInputElement).value,
          })}
        placeholder="Recipient address"
        aria-label="Recipient address"
        class={inputField}
      />

      <div class={`${container2} p-3 pt-2`}>
        <FeeCalculatorBase
          fee={formState.fee}
          handleChangeFee={internalHandleChangeFee}
          BTCPrice={formState.BTCPrice}
          feeDetails={mapProgressiveFeeDetails(
            exactFeeDetails || progressiveFeeDetails,
          )}
          isSubmitting={isSubmitting}
          onSubmit={handleSendSubmit}
          onCancel={handleModalClose}
          buttonName={isSubmitting
            ? "BROADCASTING..."
            : wallet?.address
            ? "SEND"
            : "CONNECT WALLET"}
          tosAgreed={tosAgreed}
          onTosChange={setTosAgreed}
        />
      </div>
    </ModalTool>
  );
}
