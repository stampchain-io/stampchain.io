/* ===== DONATE STAMP MODAL COMPONENT ===== */
import { useTransactionForm } from "$client/hooks/useTransactionForm.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import type { DonateStampModalProps } from "$types/ui.d.ts";
// Using simplified fee display approach
import { handleModalClose } from "$components/layout/ModalBase.tsx";
import { StampImage } from "$content";
import { RangeSlider } from "$islands/button/RangeSlider.tsx";
import { stackConnectWalletModal } from "$islands/layout/ModalStack.tsx";
import { closeModal, openModal } from "$islands/modal/states.ts";
import { ModalBase } from "$layout";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import { logger } from "$lib/utils/logger.ts";
import { mapProgressiveFeeDetails } from "$lib/utils/performance/fees/fee-estimation-utils.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { tooltipImage } from "$notification";
import { FeeCalculatorBase } from "$section";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
const DonateStampModal = ({
  stamp,
  fee: initialFee,
  handleChangeFee,
  dispenser,
}: DonateStampModalProps) => {
  /* ===== CONTEXT ===== */
  const { wallet } = walletContext;

  /* ===== STATE ===== */
  const [quantity, setQuantity] = useState(1);
  // const [maxQuantity, setMaxQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isAmountTooltipVisible, setIsAmountTooltipVisible] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);

  /* ===== REFS ===== */
  const amountTooltipTimeoutRef = useRef<number | null>(null);

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

  /* ===== 🚀 PROGRESSIVE FEE ESTIMATION INTEGRATION ===== */
  const {
    getBestEstimate,
    isEstimating,
    estimateExact,
    currentPhase,
    error: feeEstimationError,
  } = useTransactionConstructionService({
    toolType: "stamp", // Donate uses stamp toolType for dispense transactions
    feeRate: isSubmitting ? 0 : formState.fee,
    walletAddress: wallet?.address || "", // Provide empty string instead of undefined
    isConnected: !!wallet && !isSubmitting,
    isSubmitting,
    // Donation-specific parameters - include the value being sent to dispenser
    recipientAddress: dispenser?.source || "",
    amount: totalPrice ? (totalPrice / 100000000).toFixed(8) : "0", // Convert satoshis to BTC string
    // Additional dispenser info for context
    ...(dispenser && {
      dispenserSource: dispenser.source,
      purchaseQuantity: totalPrice.toString(),
    }),
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

  /* ===== FEE DETAILS SYNCHRONIZATION ===== */
  useEffect(() => {
    if (progressiveFeeDetails && !isEstimating) {
      logger.debug("stamps", {
        message: "DonateStamp progressive fee details update",
        data: {
          phase: currentPhase,
          hasExactFees: progressiveFeeDetails.hasExactFees,
          minerFee: progressiveFeeDetails.minerFee,
          totalValue: progressiveFeeDetails.totalValue,
        },
      });
    }
  }, [progressiveFeeDetails, isEstimating, currentPhase]);

  /* ===== EFFECTS ===== */
  // Sync fee state with parent
  useEffect(() => {
    if (handleChangeFee && formState.fee !== undefined) {
      handleChangeFee(formState.fee);
    }
  }, [formState.fee, handleChangeFee]);

  // Update total price when dispenser or quantity changes
  useEffect(() => {
    if (dispenser) {
      // const maxQty = Math.floor(
      //   dispenser.give_remaining / dispenser.give_quantity,
      // );
      // setMaxQuantity(maxQty);
      setTotalPrice(quantity * dispenser.satoshirate);
    }
  }, [dispenser, quantity]);

  // Cleanup tooltip timeout
  useEffect(() => {
    return () => {
      if (amountTooltipTimeoutRef.current) {
        globalThis.clearTimeout(amountTooltipTimeoutRef.current);
      }
    };
  }, []);

  // Debug logging
  useEffect(() => {
    logger.debug("ui", {
      message: "DonateStampModal mounted",
      component: "DonateStampModal",
    });

    return () => {
      logger.debug("ui", {
        message: "DonateStampModal unmounting",
        component: "DonateStampModal",
      });
    };
  }, []);

  // Handle form errors with toast notifications
  useEffect(() => {
    if (formHookError) {
      showToast(formHookError, "error");
      setFormHookError(null);
    }
  }, [formHookError, setFormHookError]);

  // Handle fee estimation errors
  useEffect(() => {
    if (feeEstimationError) {
      logger.debug("system", {
        message: "Fee estimation error in DonateStampModal",
        error: feeEstimationError,
      });
    }
  }, [feeEstimationError]);

  /* ===== EVENT HANDLERS ===== */
  const handleMouseMove = (e: MouseEvent) => {
    setTooltipPosition({
      x: e.clientX,
      y: e.clientY,
    });
  };

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
  const handleBuyClick = async () => {
    // Check if wallet is connected first
    if (!wallet || !wallet.address) {
      const { modalContent } = stackConnectWalletModal(() => {
        // Open the Donate Stamp Modal
        openModal(
          <DonateStampModal
            stamp={stamp}
            fee={initialFee ?? 1}
            handleChangeFee={handleChangeFee ?? (() => {})}
            dispenser={dispenser}
          />,
          "slideUpDown",
        );
      });

      // Open the Connect Wallet Modal
      openModal(modalContent, "slideUpDown");
      return;
    }

    await handleSubmit(async () => {
      // Get exact fee estimation before submitting - StampingTool pattern
      try {
        const exactEstimate = await estimateExact();
        if (exactEstimate) {
          setExactFeeDetails(exactEstimate);
          logger.debug("stamps", {
            message: "DonateStamp exact fee estimation completed",
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
            "DonateStamp exact fee estimation failed, using progressive estimate",
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Convert fee rate from sat/vB to sat/kB
      const feeRateKB = formState.fee * 1000;

      const options = {
        return_psbt: true,
        fee_per_kb: feeRateKB,
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
        true, // Enable RBF
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
                ` Broadcasted.\n${broadcastTxid.substring(0, 10)}...`,
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

  /* ===== HELPER FUNCTIONS ===== */
  const amountToSliderPos = (amount: number) =>
    amount <= 20
      ? (amount / 20) * 66.67
      : 66.67 + ((amount - 20) / 480) * 33.33;

  const sliderPosToAmount = (pos: number) => {
    if (pos <= 66.67) {
      return Math.round((pos / 66.67) * 20); // 1-20 with 1.0 steps
    }
    const value = 20 + ((pos - 66.67) / 33.33) * 480;
    return Math.min(500, Math.round(value)); // 20-500 with 1.0 steps
  };

  /* ===== RENDER ===== */
  return (
    <ModalBase
      onClose={() => {
        logger.debug("ui", {
          message: "Modal closing",
          component: "DonateStampModal",
        });
        closeModal();
      }}
      title="DONATE"
    >
      {/* ===== PRICE DISPLAY ===== */}
      <div className="mb-6">
        <h6 className="font-extrabold text-3xl text-color-neutral-200 text-center">
          {(totalPrice / 100000000).toFixed(8)}{" "}
          <span className="font-extralight">BTC</span>
        </h6>
      </div>

      {/* Using simplified fee display approach */}

      {/* ===== STAMP DETAILS ===== */}
      {stamp && (
        <div className="flex flex-row gap-6">
          <div className="flex flex-col w-[156px] mobileLg:w-[164px]">
            <StampImage
              stamp={stamp}
              className=""
              flag={false}
            />
          </div>

          {/* ===== QUANTITY SELECTION ===== */}
          <div className="flex flex-col w-full">
            <div className="flex flex-col items-start pt-0.5 -space-y-0.5">
              <h6 className="font-light text-sm text-color-neutral-400">
                RECEIVE
              </h6>
              <h6 className="font-light text-lg text-color-neutral-200">
                <span className="font-bold">{quantity * 1000}</span> USDSTAMPS
                {quantity * 1000 > 1 ? "" : ""}
              </h6>
            </div>

            {/* ===== AMOUNT SLIDER ===== */}
            <div className="mt-[18px]">
              <div className="relative w-full">
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
                <div
                  className={`${tooltipImage} ${
                    isAmountTooltipVisible ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y - 6}px`,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  SELECT AMOUNT
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== FEE CALCULATOR ===== */}
      <FeeCalculatorBase
        fee={formState.fee || 1}
        handleChangeFee={(newFee: number) => {
          logger.debug("ui", {
            message: "Fee changing",
            newFee,
            component: "DonateStampModal",
          });
          internalHandleChangeFee(newFee);
        }}
        type="buy"
        tosAgreed={tosAgreed}
        onTosChange={setTosAgreed}
        amount={totalPrice}
        price={0} // Donation has no price
        edition={quantity * 1000} // USDSTAMPS received
        fromPage="donate"
        BTCPrice={formState.BTCPrice || 0}
        isSubmitting={isSubmitting}
        onSubmit={() => {
          logger.debug("ui", {
            message: "Submit clicked",
            component: "DonateStampModal",
          });
          handleBuyClick();
        }}
        onCancel={() => {
          handleModalClose();
        }}
        buttonName={wallet?.address ? "DONATE" : "CONNECT WALLET"}
        className="pt-9 mobileLg:pt-12"
        // ===== 🚀 PROGRESSIVE FEE DETAILS INTEGRATION =====
        feeDetails={(() => {
          const baseFeeDetails = mapProgressiveFeeDetails(
            exactFeeDetails || progressiveFeeDetails,
          );

          // For donate transactions, add the donation amount to totalValue
          // and remove dust since dispense uses OP_RETURN (no dust needed)
          if (
            baseFeeDetails && totalPrice > 0 &&
            baseFeeDetails.minerFee !== undefined
          ) {
            // Recalculate totalValue: minerFee only (no dust) + donation amount
            const correctedTotalValue = baseFeeDetails.minerFee + totalPrice;

            return {
              ...baseFeeDetails,
              dustValue: 0, // Dispense transactions use OP_RETURN, no dust needed
              totalValue: correctedTotalValue,
              itemPrice: totalPrice, // Add the donation amount for display in details
              // Add a custom field to indicate this includes donation amount
              includesDonationAmount: true,
            };
          }

          return baseFeeDetails;
        })()}
      />
    </ModalBase>
  );
};

export default DonateStampModal;
