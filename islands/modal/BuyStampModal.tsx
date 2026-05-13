/* ===== BUY STAMP MODAL COMPONENT ===== */
import { useTransactionForm } from "$client/hooks/useTransactionForm.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { handleModalClose } from "$components/layout/ModalBase.tsx";
import { StampImage } from "$content";
import { inputFieldSquare, inputFieldSquareWrapper } from "$form";
import { stackConnectWalletModal } from "$islands/layout/ModalStack.tsx";
import { closeModal, openModal } from "$islands/modal/states.ts";
import { ModalBase } from "$layout";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import { handleUnknownError } from "$lib/utils/errorHandling.ts";
import { logger } from "$lib/utils/logger.ts";
import { mapProgressiveFeeDetails } from "$lib/utils/performance/fees/fee-estimation-utils.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { FeeCalculatorBase } from "$section";
import { labelLg, labelSm } from "$text";
import type { BuyStampModalProps } from "$types/ui.d.ts";
import { useEffect, useState } from "preact/hooks";

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
const BuyStampModal = ({
  stamp,
  fee: initialFee,
  handleChangeFee,
  dispenser,
}: BuyStampModalProps) => {
  /* ===== CONTEXT ===== */
  const { wallet } = walletContext;

  /* ===== STATE ===== */
  const [tosAgreed, setTosAgreed] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [maxQuantity, setMaxQuantity] = useState(1);
  const [_pricePerUnit, setPricePerUnit] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  /* ===== COMPUTED VALUES ===== */
  // v2.3 API: Use marketData for pricing with legacy fallback
  const stampWithMarketData = stamp as any;
  const marketData = stampWithMarketData?.marketData;

  const displayPrice = dispenser
    ? parseInt(dispenser.satoshirate.toString(), 10) / 100000000
    : (marketData?.lastPriceBTC ||
      (stamp && typeof stamp.floorPrice === "number" ? stamp.floorPrice : 0));

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

  /* ===== 🚀 UNIFIED FEE ESTIMATION SYSTEM ===== */
  // Use the unified fee estimation system with stamp toolType for purchases
  const {
    getBestEstimate,
    isEstimating,
    estimateExact,
    currentPhase,
    error: feeEstimationError,
  } = useTransactionConstructionService({
    toolType: "stamp", // Buy stamp uses stamp toolType for dispense transactions
    feeRate: isSubmitting ? 0 : formState.fee,
    walletAddress: wallet?.address || "", // Provide empty string instead of undefined
    isConnected: !!wallet && !isSubmitting,
    isSubmitting,
    // Purchase-specific parameters - include the value being sent to dispenser
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
        message: "BuyStamp progressive fee details update",
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
  useEffect(() => {
    if (handleChangeFee && formState.fee !== undefined) {
      handleChangeFee(formState.fee);
    }
  }, [formState.fee, handleChangeFee]);

  useEffect(() => {
    if (dispenser) {
      const maxQty = Math.floor(
        dispenser.give_remaining / dispenser.give_quantity,
      );
      setMaxQuantity(maxQty);
      setPricePerUnit(dispenser.satoshirate);
      setTotalPrice(quantity * dispenser.satoshirate);
    }
  }, [dispenser, quantity]);

  useEffect(() => {
    logger.debug("ui", {
      message: "BuyStampModal mounted",
      component: "BuyStampModal",
    });
    return () => {
      logger.debug("ui", {
        message: "BuyStampModal unmounting",
        component: "BuyStampModal",
      });
    };
  }, []);

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
        message: "Fee estimation error in BuyStampModal",
        error: feeEstimationError,
      });
    }
  }, [feeEstimationError]);

  /* ===== EVENT HANDLERS ===== */
  const handleQuantityChange = (e: Event) => {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    if (value > maxQuantity) {
      setQuantity(maxQuantity);
    } else if (value < 1 || isNaN(value)) {
      setQuantity(1);
    } else {
      setQuantity(value);
    }
  };

  /* ===== TRANSACTION HANDLING ===== */
  const handleBuyClick = async () => {
    if (!wallet || !wallet.address) {
      const { modalContent } = stackConnectWalletModal(() => {
        openModal(
          <BuyStampModal
            stamp={stamp}
            fee={initialFee ?? 1}
            handleChangeFee={handleChangeFee ?? (() => {})}
            dispenser={dispenser}
          />,
          "slideUpDown",
        );
      });
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
            message: "BuyStamp exact fee estimation completed",
            data: {
              minerFee: exactEstimate.minerFee,
              totalValue: exactEstimate.totalValue,
              hasExactFees: exactEstimate.hasExactFees,
            },
          });
        }
      } catch (unknownError) {
        const originalMessage =
          unknownError && typeof unknownError === "object" &&
            "message" in unknownError
            ? (unknownError as Error).message
            : String(unknownError);
        const error = handleUnknownError(
          unknownError,
          `BuyStamp exact fee estimation failed: ${originalMessage}`,
        );
        logger.warn("stamps", {
          message:
            "BuyStamp exact fee estimation failed, using progressive estimate",
          error: error.message,
          errorDetails: {
            name: error.name,
            stack: error.stack,
          },
        });
      }

      const feeRateKB = formState.fee * 1000;
      const options = { return_psbt: true, fee_per_kb: feeRateKB };

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
                ` Broadcasted.\n${broadcastTxid.substring(0, 10)}`,
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
                "Broadcast failed after signing.\nPlease check transaction status.",
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
              `Broadcast failed.\n${beMsg.substring(0, 50)}${
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
        showToast("Transaction signing was cancelled.", "info");
      }
    });
  };

  /* ===== RENDER ===== */
  return (
    <ModalBase
      onClose={() => {
        logger.debug("ui", {
          message: "Modal closing",
          component: "BuyStampModal",
        });
        closeModal();
      }}
      title="BUY"
    >
      {/* ===== STAMP DETAILS SECTION ===== */}
      {stamp && (
        <div className="flex flex-row gap-5">
          <div className="flex flex-col w-[156px] mobileLg:w-[164px]">
            <StampImage
              stamp={stamp}
              containerClassName="!p-1"
              flag={false}
            />
          </div>
          <div className="flex flex-col w-full">
            <h5 className="font-extrabold text-3xl bg-gradient-to-l color-neutral-gradient pt-1">
              <span className="font-light text-color-grey-light">
                #
              </span>
              {stamp.stamp}
            </h5>

            {/* ===== QUANTITY SELECTION ===== */}
            <div className="flex flex-row pt-3 w-full justify-between items-center">
              <div className="flex flex-col items-start -space-y-0.5">
                <h5 class={`${labelLg} !text-color-grey`}>
                  EDITIONS
                </h5>
                <h6 class={labelSm}>
                  MAX {maxQuantity}
                </h6>
              </div>
              <div className="flex flex-col items-end">
                <div className={inputFieldSquareWrapper}>
                  <input
                    type="number"
                    min="1"
                    max={maxQuantity}
                    value={quantity}
                    onChange={handleQuantityChange}
                    className={inputFieldSquare}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 🎯 PROGRESSIVE FEE STATUS INDICATOR ===== */}
      {/* Using simplified fee display approach */}

      {/* ===== FEE CALCULATOR ===== */}
      <FeeCalculatorBase
        fee={formState.fee || 1}
        handleChangeFee={(newFee: number) => {
          logger.debug("ui", {
            message: "Fee changing",
            newFee,
            component: "BuyStampModal",
          });
          internalHandleChangeFee(newFee);
        }}
        type="buy"
        tosAgreed={tosAgreed}
        onTosChange={setTosAgreed}
        amount={totalPrice}
        price={dispenser ? (dispenser.satoshirate / 100000000) : displayPrice}
        edition={quantity}
        fromPage="stamp_buy"
        BTCPrice={formState.BTCPrice || 0}
        isSubmitting={isSubmitting}
        onSubmit={() => {
          logger.debug("ui", {
            message: "Submit clicked",
            component: "BuyStampModal",
          });
          handleBuyClick();
        }}
        onCancel={() => {
          handleModalClose();
        }}
        buttonName="BUY"
        className="pt-9 mobileLg:pt-12"
        // ===== 🚀 PROGRESSIVE FEE DETAILS INTEGRATION =====
        feeDetails={(() => {
          const baseFeeDetails = mapProgressiveFeeDetails(
            exactFeeDetails || progressiveFeeDetails,
          );

          // For buy transactions, add the purchase amount to totalValue
          // and remove dust since dispense uses OP_RETURN (no dust needed)
          if (
            baseFeeDetails && totalPrice > 0 &&
            baseFeeDetails.minerFee !== undefined
          ) {
            // Recalculate totalValue: minerFee only (no dust) + purchase amount
            const correctedTotalValue = baseFeeDetails.minerFee + totalPrice;

            return {
              ...baseFeeDetails,
              dustValue: 0, // Dispense transactions use OP_RETURN, no dust needed
              totalValue: correctedTotalValue,
              itemPrice: totalPrice, // Add the stamp price for display in details
              // Add a custom field to indicate this includes purchase amount
              includesPurchaseAmount: true,
            };
          }

          return baseFeeDetails;
        })()}
      />
    </ModalBase>
  );
};

export default BuyStampModal;
