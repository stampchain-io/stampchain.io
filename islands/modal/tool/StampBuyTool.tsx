/* ===== STAMP BUY TOOL MODAL ===== */
import { useTransactionForm } from "$client/hooks/useTransactionForm.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { handleModalClose } from "$components/layout/ModalBase.tsx";
import {
  inputFieldGrow,
  inputFieldGrowDigits,
  inputFieldGrowStyle,
} from "$form";
import { UserProfileIcon } from "$icon";
import { StampImage } from "$islands/content/stampDetailContent/StampImage.tsx";
import { InputField } from "$islands/form/InputField.tsx";
import { stackConnectWalletModal } from "$islands/layout/ModalStack.tsx";
import { closeModal } from "$islands/modal/states.ts";
import { openToolModal, ToolModal } from "$islands/modal/tool/ToolModal.tsx";
import { container2 } from "$layout";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import { handleUnknownError } from "$lib/utils/errorHandling.ts";
import { logger } from "$lib/utils/logger.ts";
import { mapProgressiveFeeDetails } from "$lib/utils/performance/fees/fee-estimation-utils.ts";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { FeeCalculatorBase } from "$section";
import { labelSm, labelXs, valueSm } from "$text";
import type { BuyStampModalProps } from "$types/ui.d.ts";
import { useEffect, useState } from "preact/hooks";
/* ===== OPENER ===== */
export function openStampBuyTool(props: BuyStampModalProps) {
  openToolModal(<StampBuyTool {...props} />);
}

/* ===== COMPONENT ===== */
export function StampBuyTool({
  stamp,
  fee: initialFee,
  handleChangeFee,
  dispenser,
}: BuyStampModalProps) {
  /* ===== CONTEXT ===== */
  const { wallet } = walletContext;

  /* ===== STATE ===== */
  const [tosAgreed, setTosAgreed] = useState(false);
  const [editions, setEditions] = useState("1");
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

  const creatorDisplay = stamp?.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp?.creator || "", 8);

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
      const count = parseInt(editions, 10) || 1;
      const priced = maxQty > 0 ? Math.min(count, maxQty) : count;
      setTotalPrice(priced * dispenser.satoshirate);
    }
  }, [dispenser, editions]);

  useEffect(() => {
    logger.debug("ui", {
      message: "StampBuyTool mounted",
      component: "StampBuyTool",
    });
    return () => {
      logger.debug("ui", {
        message: "StampBuyTool unmounting",
        component: "StampBuyTool",
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
        message: "Fee estimation error in StampBuyTool",
        error: feeEstimationError,
      });
    }
  }, [feeEstimationError]);

  /* ===== EVENT HANDLERS ===== */
  const editionCount = parseInt(editions, 10) || 1;
  const pricedQuantity = maxQuantity > 0
    ? Math.min(editionCount, maxQuantity)
    : editionCount;

  const handleQuantityChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const digits = inputFieldGrowDigits(input);
    const next = digits === "" ? "1" : digits;
    if (input.value !== next) input.value = next;
    setEditions(next);
  };

  /* ===== TRANSACTION HANDLING ===== */
  const handleBuyClick = async () => {
    if (!wallet || !wallet.address) {
      stackConnectWalletModal();
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
        showToast("Transaction signing was cancelled.", "warning");
      }
    });
  };

  /* ===== RENDER ===== */
  return (
    <ToolModal title="STAMP" subtitle="BUY">
      {/* ===== STAMP DETAILS SECTION ===== */}
      {stamp && (
        <div className="flex flex-col gap-3">
          <div className={`flex flex-row gap-5`}>
            <div className="flex flex-col w-[92px] aspect-square shrink-0">
              <StampImage
                stamp={stamp}
                containerClassName="!p-0.5"
                flag={false}
              />
            </div>
            <div
              className={`flex flex-col justify-center`}
            >
              <h5 className="font-extrabold text-2xl
   text-color-neutral-200 group-hover:text-color-hover
   tracking-wide">
                <span className="font-light">
                  #
                </span>
                {stamp.stamp}
              </h5>

              {stamp.cpid && (
                <h6 class={`${labelSm} truncate`}>
                  {stamp.cpid}
                </h6>
              )}

              <UserProfileIcon
                size="md"
                weight="bold"
                className="stroke-color-neutral-200"
                wrapperClassName="mt-1"
              >
                <span className="font-normal text-sm text-color-neutral-200">
                  {creatorDisplay}
                </span>
              </UserProfileIcon>
            </div>
          </div>

          {/* ===== QUANTITY SELECTION ===== */}
          <div class="flex items-center justify-between gap-3 pt-2">
            <div class="flex flex-col items-start -space-y-0.5">
              <h5 class={`${valueSm} !text-color-neutral-200`}>
                EDITIONS
              </h5>
              <h6 class={labelXs}>
                MAX {maxQuantity}
              </h6>
            </div>
            <div
              class={inputFieldGrow}
              style={inputFieldGrowStyle(editions.length)}
            >
              <InputField
                type="text"
                inputMode="numeric"
                value={editions}
                onChange={handleQuantityChange}
                textAlign="center"
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== FEE CALCULATOR ===== */}
      <div class={`${container2} p-3 pt-2`}>
        <FeeCalculatorBase
          fee={formState.fee || 1}
          handleChangeFee={(newFee: number) => {
            logger.debug("ui", {
              message: "Fee changing",
              newFee,
              component: "StampBuyTool",
            });
            internalHandleChangeFee(newFee);
          }}
          type="buy"
          tosAgreed={tosAgreed}
          onTosChange={setTosAgreed}
          amount={totalPrice}
          price={dispenser ? (dispenser.satoshirate / 100000000) : displayPrice}
          edition={pricedQuantity}
          fromPage="stamp_buy"
          BTCPrice={formState.BTCPrice || 0}
          isSubmitting={isSubmitting}
          onSubmit={() => {
            logger.debug("ui", {
              message: "Submit clicked",
              component: "StampBuyTool",
            });
            handleBuyClick();
          }}
          onCancel={() => {
            handleModalClose();
          }}
          buttonName="BUY"
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
      </div>
    </ToolModal>
  );
}
