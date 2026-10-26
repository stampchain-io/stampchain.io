/* ===== BITCOIN DONATE TOOL MODAL ===== */
import { useTransactionForm } from "$client/hooks/useTransactionForm.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { handleModalClose } from "$components/layout/ModalBase.tsx";
import { StampImage } from "$content";
import { RangeSlider } from "$islands/button/RangeSlider.tsx";
import { stackConnectWalletModal } from "$islands/layout/ModalStack.tsx";
import { closeModal } from "$islands/modal/states.ts";
import { ModalTool, openModalTool } from "$islands/modal/tool/ModalTool.tsx";
import { container2 } from "$layout";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import { logger } from "$lib/utils/logger.ts";
import { mapProgressiveFeeDetails } from "$lib/utils/performance/fees/fee-estimation-utils.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { tooltipImage } from "$notification";
import { FeeCalculatorBase } from "$section";
import { labelXs } from "$text";
import type { BTCDonateToolProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== OPENER ===== */
export function openBTCDonateTool(props: BTCDonateToolProps = {}) {
  openModalTool(<BTCDonateTool {...props} />);
}

/* ===== HELPERS ===== */
const amountToSliderPos = (amount: number) =>
  amount <= 20 ? (amount / 20) * 66.67 : 66.67 + ((amount - 20) / 480) * 33.33;

const sliderPosToAmount = (pos: number) => {
  if (pos <= 66.67) {
    return Math.round((pos / 66.67) * 20);
  }
  const value = 20 + ((pos - 66.67) / 33.33) * 480;
  return Math.min(500, Math.round(value));
};

/* ===== COMPONENT ===== */
export function BTCDonateTool({
  stamp,
  fee: initialFee,
  handleChangeFee,
  dispenser,
}: BTCDonateToolProps) {
  /* ===== CONTEXT ===== */
  const { wallet } = walletContext;

  /* ===== STATE ===== */
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isAmountTooltipVisible, setIsAmountTooltipVisible] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);

  /* ===== REFS ===== */
  const amountTooltipTimeoutRef = useRef<number | null>(null);
  const tooltipOriginRef = useRef<HTMLDivElement>(null);

  /* ===== FORM HANDLING ===== */
  const {
    formState,
    handleChangeFee: internalHandleChangeFee,
    handleSubmit,
    isSubmitting,
    error: formHookError,
    setError: setFormHookError,
  } = useTransactionForm({
    type: "buy",
    ...(initialFee !== undefined && { initialFee }),
  });

  /* ===== PROGRESSIVE FEE ESTIMATION ===== */
  const {
    getBestEstimate,
    isEstimating,
    estimateExact,
    currentPhase,
    error: feeEstimationError,
  } = useTransactionConstructionService({
    toolType: "stamp",
    feeRate: isSubmitting ? 0 : formState.fee,
    walletAddress: wallet?.address || "",
    isConnected: !!wallet?.address && !isSubmitting,
    isSubmitting,
    recipientAddress: dispenser?.source || "",
    amount: totalPrice ? (totalPrice / 100000000).toFixed(8) : "0",
    ...(dispenser && {
      dispenserSource: dispenser.source,
      purchaseQuantity: totalPrice.toString(),
    }),
  });

  const progressiveFeeDetails = getBestEstimate();

  const [exactFeeDetails, setExactFeeDetails] = useState<
    typeof progressiveFeeDetails | null
  >(null);

  const donationBtc = (totalPrice / 100000000).toFixed(8);

  /* ===== EFFECTS ===== */
  useEffect(() => {
    setExactFeeDetails(null);
  }, [formState.fee]);

  useEffect(() => {
    if (progressiveFeeDetails && !isEstimating) {
      logger.debug("stamps", {
        message: "Donate progressive fee details update",
        data: {
          phase: currentPhase,
          hasExactFees: progressiveFeeDetails.hasExactFees,
          minerFee: progressiveFeeDetails.minerFee,
          totalValue: progressiveFeeDetails.totalValue,
        },
      });
    }
  }, [progressiveFeeDetails, isEstimating, currentPhase]);

  useEffect(() => {
    if (handleChangeFee && formState.fee !== undefined) {
      handleChangeFee(formState.fee);
    }
  }, [formState.fee, handleChangeFee]);

  useEffect(() => {
    if (dispenser) {
      setTotalPrice(quantity * dispenser.satoshirate);
    }
  }, [dispenser, quantity]);

  useEffect(() => {
    return () => {
      if (amountTooltipTimeoutRef.current) {
        globalThis.clearTimeout(amountTooltipTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (formHookError) {
      showToast(formHookError, "error");
      setFormHookError(null);
    }
  }, [formHookError, setFormHookError]);

  useEffect(() => {
    if (feeEstimationError) {
      logger.debug("system", {
        message: "Fee estimation error in BTCDonateTool",
        error: feeEstimationError,
      });
    }
  }, [feeEstimationError]);

  /* ===== EVENT HANDLERS ===== */
  /* The modal card is transformed, so viewport coordinates are converted
     to coordinates relative to the tooltip's origin anchor. */
  const toTooltipPosition = (e: { clientX: number; clientY: number }) => {
    const origin = tooltipOriginRef.current?.getBoundingClientRect();
    return {
      x: e.clientX - (origin?.left ?? 0),
      y: e.clientY - (origin?.top ?? 0),
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    setTooltipPosition(toTooltipPosition(e));
  };

  useEffect(() => {
    if (!isAmountTooltipVisible) return;

    const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
      setTooltipPosition(toTooltipPosition(e));
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    return () =>
      document.removeEventListener("mousemove", handleGlobalMouseMove);
  }, [isAmountTooltipVisible]);

  const handleAmountMouseEnter = () => {
    if (amountTooltipTimeoutRef.current) {
      globalThis.clearTimeout(amountTooltipTimeoutRef.current);
    }

    amountTooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setIsAmountTooltipVisible(true);
    }, 1500);
  };

  const handleAmountMouseLeave = () => {
    if (amountTooltipTimeoutRef.current) {
      globalThis.clearTimeout(amountTooltipTimeoutRef.current);
    }
    setIsAmountTooltipVisible(false);
  };

  const handleMouseDown = () => {
    if (amountTooltipTimeoutRef.current) {
      globalThis.clearTimeout(amountTooltipTimeoutRef.current);
    }
    setIsAmountTooltipVisible(false);
  };

  /* ===== TRANSACTION HANDLING ===== */
  const handleDonateClick = async () => {
    if (!wallet?.address) {
      stackConnectWalletModal();
      return;
    }

    await handleSubmit(async () => {
      try {
        const exactEstimate = await estimateExact();
        if (exactEstimate) {
          setExactFeeDetails(exactEstimate);
          logger.debug("stamps", {
            message: "Donate exact fee estimation completed",
            data: {
              minerFee: exactEstimate.minerFee,
              totalValue: exactEstimate.totalValue,
              hasExactFees: exactEstimate.hasExactFees,
            },
          });
        }
      } catch (error) {
        logger.warn("stamps", {
          message:
            "Donate exact fee estimation failed, using progressive estimate",
          error: error instanceof Error ? error.message : String(error),
        });
      }

      const options = {
        return_psbt: true,
        fee_per_kb: formState.fee * 1000,
      };

      const response = await fetch("/api/v2/create/dispense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: wallet.address,
          dispenser: dispenser.source,
          quantity: totalPrice,
          options,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Failed to parse error from server.",
        }));
        const detailedError = errorData.error ||
          "Failed to create dispense transaction (unknown server error).";
        logger.error("ui", {
          message: "API error creating dispense transaction",
          details: detailedError,
          status: response.status,
        });
        throw new Error("Failed to prepare transaction. Please try again.");
      }

      const responseData = await response.json();
      if (!responseData?.psbt || !responseData?.inputsToSign) {
        logger.error("ui", {
          message: "Invalid API response: Missing PSBT or inputsToSign",
          data: responseData,
        });
        throw new Error("Received invalid transaction data from server.");
      }

      const signResult = await walletContext.signPSBT(
        wallet,
        responseData.psbt,
        responseData.inputsToSign,
        true,
      );

      if (signResult.signed) {
        if (signResult.txid) {
          showToast(
            `Broadcasted.\n${signResult.txid.substring(0, 10)}`,
            "success",
            false,
          );
          closeModal();
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
              closeModal();
            } else {
              logger.error("ui", {
                message: "Broadcast did not return a valid TXID after signing",
                broadcastResult: broadcastTxid,
                psbtHex: signResult.psbt,
              });
              throw new Error(
                "Broadcast failed after signing. Please check transaction status.",
              );
            }
          } catch (broadcastError: unknown) {
            const beMsg = broadcastError instanceof Error
              ? broadcastError.message
              : String(broadcastError);
            logger.error("ui", {
              message: "Error broadcasting signed PSBT",
              error: beMsg,
              psbtHex: signResult.psbt,
            });
            throw new Error(
              `Broadcast failed: ${beMsg.substring(0, 50)}${
                beMsg.length > 50 ? "..." : ""
              }`,
            );
          }
        } else {
          logger.error("ui", {
            message: "Signed but no TXID or PSBT hex returned to modal",
            signResult,
          });
          throw new Error(
            "Signing reported success, but critical data missing.",
          );
        }
      } else if (!signResult.cancelled) {
        const signErrorMsg = signResult.error || "Unknown signing error";
        logger.error("ui", {
          message: "PSBT Signing failed",
          error: signErrorMsg,
          details: signResult,
        });
        throw new Error(
          `Signing failed: ${signErrorMsg.substring(0, 50)}${
            signErrorMsg.length > 50 ? "..." : ""
          }`,
        );
      } else {
        showToast("Transaction signing was cancelled.", "warning");
      }
    });
  };

  /* ===== RENDER ===== */
  return (
    <ModalTool title="DONATE" subtitle="TO THE DEV FUND">
      <div class="flex justify-center items-center w-full">
        <div class="inline-flex items-center gap-1 text-2xl">
          <span class="font-extrabold text-color-neutral-200">
            {donationBtc}
          </span>
          <span class="font-extralight text-color-neutral-200">
            BTC
          </span>
        </div>
      </div>

      <div class="flex flex-col w-full gap-0.5">
        <h6 class={labelXs}>
          DONATION AMOUNT
        </h6>
        <div class="w-full">
          <RangeSlider
            value={quantity}
            onChange={(newQuantity) => {
              setQuantity(Math.max(1, newQuantity));
            }}
            valueToPosition={amountToSliderPos}
            positionToValue={sliderPosToAmount}
            onMouseEnter={handleAmountMouseEnter}
            onMouseLeave={handleAmountMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          />
        </div>
      </div>

      {stamp && (
        <div class="flex flex-row gap-5">
          <div class="flex flex-col w-[42px] shrink-0">
            <StampImage
              stamp={stamp}
              containerClassName="!p-0.5 !rounded-xl"
              flag={false}
            />
          </div>

          <div class="flex flex-col w-full min-w-0 justify-center">
            <div class="flex flex-col items-start -space-y-0.5">
              <h6 class={labelXs}>
                RECEIVE
              </h6>
              <h6 class="font-light text-sm text-color-neutral-200 tracking-wider">
                <span class="font-bold">{quantity * 1000}</span> USDSTAMPS
              </h6>
            </div>
          </div>
        </div>
      )}

      <div class={`${container2} p-3 pt-2`}>
        <FeeCalculatorBase
          fee={formState.fee || 1}
          handleChangeFee={internalHandleChangeFee}
          type="buy"
          tosAgreed={tosAgreed}
          onTosChange={setTosAgreed}
          amount={totalPrice}
          price={0}
          edition={quantity * 1000}
          fromPage="donate"
          BTCPrice={formState.BTCPrice || 0}
          isSubmitting={isSubmitting}
          onSubmit={handleDonateClick}
          onCancel={handleModalClose}
          buttonName={wallet?.address ? "DONATE" : "CONNECT WALLET"}
          feeDetails={(() => {
            const baseFeeDetails = mapProgressiveFeeDetails(
              exactFeeDetails || progressiveFeeDetails,
            );

            if (
              baseFeeDetails && totalPrice > 0 &&
              baseFeeDetails.minerFee !== undefined
            ) {
              const correctedTotalValue = baseFeeDetails.minerFee + totalPrice;

              return {
                ...baseFeeDetails,
                dustValue: 0,
                totalValue: correctedTotalValue,
                itemPrice: totalPrice,
                includesDonationAmount: true,
              };
            }

            return baseFeeDetails;
          })()}
        />
      </div>

      {
        /* Zero-size anchor pinned to the modal card's top-left corner.
          The slider tooltip is positioned from it so the scrolling content
          area does not clip it. */
      }
      <div
        ref={tooltipOriginRef}
        class="fixed top-0 left-0 w-0 h-0 pointer-events-none z-tooltip"
      >
        <div
          class={`${tooltipImage} ${
            isAmountTooltipVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: "translate(-50%, calc(-100% - 6px))",
          }}
        >
          SELECT AMOUNT
        </div>
      </div>
    </ModalTool>
  );
}
