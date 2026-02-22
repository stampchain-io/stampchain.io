import { Button, ButtonProcessing } from "$button";
import { ToggleSwitchButton } from "$components/button/ToggleSwitchButton.tsx";
import { MaraModeBadge } from "$components/indicators/MaraModeIndicator.tsx";
import { FeeSkeletonLoader } from "$components/indicators/ProgressIndicator.tsx";
import { handleModalClose } from "$components/layout/ModalBase.tsx";
import { useFees } from "$fees";
import { Icon } from "$icon";
import { RangeSlider } from "$islands/button/RangeSlider.tsx";
import type { ExtendedBaseFeeCalculatorProps } from "$lib/types/base.d.ts";
import { estimateTransactionSizeForType } from "$lib/utils/bitcoin/transactions/transactionSizeEstimator.ts";
import { logger } from "$lib/utils/logger.ts";
import {
  formatSatoshisToBTC,
  formatSatoshisToUSD,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { tooltipButton, tooltipImage } from "$notification";
import { labelXs, textXs } from "$text";
import { useEffect, useRef, useState } from "preact/hooks";

export function FeeCalculatorBase({
  fee,
  handleChangeFee,
  BTCPrice, // Don't provide default value
  isSubmitting,
  onSubmit,
  onCancel,
  buttonName,
  className = "",
  showCoinToggle = true,
  tosAgreed = false,
  onTosChange = () => {},
  feeDetails,
  mintDetails,
  isModal = false,
  disabled = false,
  cancelText = "CANCEL",
  confirmText,
  type,
  fileType,
  fileSize,
  issuance,
  bitname,
  amount: _amount = 0, // Aliased to prevent accidental rendering
  receive = 0,
  fromPage = "",
  price: _price = 0,
  edition = 0,
  ticker = "",
  limit = 0,
  supply = 0,
  src20TransferDetails = {
    address: "",
    token: "",
    amount: 0,
  },
  stampTransferDetails = {
    address: "",
    stamp: "",
    editions: 0,
  },
  dec,
  maraMode = false,
  maraFeeRate = null,
  isLoadingMaraFee = false,
  progressIndicator,
  cpid,
}: ExtendedBaseFeeCalculatorProps) {
  const { fees } = useFees();
  const [visible, setVisible] = useState(false);
  const [coinType, setCoinType] = useState("BTC");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isFeeTooltipVisible, setIsFeeTooltipVisible] = useState(false);
  const feeTooltipTimeoutRef = useRef<number | null>(null);
  const [isCurrencyTooltipVisible, setIsCurrencyTooltipVisible] = useState(
    false,
  );
  const [currencyTooltipText, setCurrencyTooltipText] = useState("BTC");
  const currencyTooltipTimeoutRef = useRef<number | null>(null);
  const [allowCurrencyTooltip, setAllowCurrencyTooltip] = useState(true);
  const [canHoverSelected, setCanHoverSelected] = useState(true);
  const [allowHover, setAllowHover] = useState(true);
  const [isTxSizeTooltipVisible, setIsTxSizeTooltipVisible] = useState(false);
  const txSizeTooltipTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    logger.debug("ui", {
      message: "FeeCalculatorBase mounted",
      component: "FeeCalculatorBase",
    });

    return () => {
      logger.debug("ui", {
        message: "FeeCalculatorBase unmounting",
        component: "FeeCalculatorBase",
      });
      if (feeTooltipTimeoutRef.current) {
        globalThis.clearTimeout(feeTooltipTimeoutRef.current);
      }
      if (currencyTooltipTimeoutRef.current) {
        globalThis.clearTimeout(currencyTooltipTimeoutRef.current);
      }
      if (txSizeTooltipTimeoutRef.current) {
        globalThis.clearTimeout(txSizeTooltipTimeoutRef.current);
      }
    };
  }, []);

  // Debug: Log when feeDetails prop changes
  useEffect(() => {
    // This effect helps track fee details updates for debugging
    // Can be removed in production if not needed
  }, [feeDetails]);

  const handleCoinToggle = () => {
    logger.debug("stamps", {
      message: "Changing display currency",
      data: {
        from: coinType,
        to: coinType === "BTC" ? "USDT" : "BTC",
      },
    });
    setCoinType(coinType === "BTC" ? "USDT" : "BTC");
    setIsCurrencyTooltipVisible(false);
    setAllowCurrencyTooltip(false);
  };

  const handleMouseMove = (e: MouseEvent) => {
    setTooltipPosition({
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleFeeMouseEnter = () => {
    if (feeTooltipTimeoutRef.current) {
      globalThis.clearTimeout(feeTooltipTimeoutRef.current);
    }

    feeTooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setIsFeeTooltipVisible(true);
    }, 1500);
  };

  const handleFeeMouseLeave = () => {
    if (feeTooltipTimeoutRef.current) {
      globalThis.clearTimeout(feeTooltipTimeoutRef.current);
    }
    setIsFeeTooltipVisible(false);
  };

  // Add mousedown handler to hide tooltip
  const handleMouseDown = () => {
    if (feeTooltipTimeoutRef.current) {
      globalThis.clearTimeout(feeTooltipTimeoutRef.current);
    }
    setIsFeeTooltipVisible(false);
  };

  const handleCurrencyMouseEnter = () => {
    if (allowCurrencyTooltip) {
      setCurrencyTooltipText(coinType === "BTC" ? "USDT" : "BTC");

      if (currencyTooltipTimeoutRef.current) {
        globalThis.clearTimeout(currencyTooltipTimeoutRef.current);
      }

      currencyTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsCurrencyTooltipVisible(true);
      }, 1500);
    }
  };

  const handleCurrencyMouseLeave = () => {
    if (currencyTooltipTimeoutRef.current) {
      globalThis.clearTimeout(currencyTooltipTimeoutRef.current);
    }
    setIsCurrencyTooltipVisible(false);
    setAllowCurrencyTooltip(true);
  };

  const handleTxSizeMouseEnter = () => {
    if (txSizeTooltipTimeoutRef.current) {
      globalThis.clearTimeout(txSizeTooltipTimeoutRef.current);
    }

    txSizeTooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setIsTxSizeTooltipVisible(true);
    }, 1500);
  };

  const handleTxSizeMouseLeave = () => {
    if (txSizeTooltipTimeoutRef.current) {
      globalThis.clearTimeout(txSizeTooltipTimeoutRef.current);
    }
    setIsTxSizeTooltipVisible(false);
  };

  const handleTxSizeMouseDown = () => {
    if (txSizeTooltipTimeoutRef.current) {
      globalThis.clearTimeout(txSizeTooltipTimeoutRef.current);
    }
    setIsTxSizeTooltipVisible(false);
  };

  // Helper functions to convert between slider position and fee value
  // New structure: 0.1-5.0 (0.1 increments) takes 25% of slider, 5-10 (0.5 increments) takes 15%, 10-264 (1.0 increments) takes 60%
  const feeToSliderPos = (fee: number) => {
    if (fee <= 5) {
      // 0.1 to 5.0 sat/vB maps to 0-25% of slider
      return ((fee - 0.1) / 4.9) * 25;
    } else if (fee <= 10) {
      // 5.0 to 10.0 sat/vB maps to 25-40% of slider
      return 25 + ((fee - 5) / 5) * 15;
    } else {
      // 10.0 to 264 sat/vB maps to 40-100% of slider
      return 40 + ((fee - 10) / 254) * 60;
    }
  };

  const sliderPosToFee = (pos: number) => {
    if (pos <= 25) {
      // 0-25% of slider: 0.1 to 5.0 sat/vB with 0.1 increments
      const value = 0.1 + (pos / 25) * 4.9;
      return Math.round(value * 10) / 10; // Round to 1 decimal place
    } else if (pos <= 40) {
      // 25-40% of slider: 5.0 to 10.0 sat/vB with 0.5 increments
      const value = 5 + ((pos - 25) / 15) * 5;
      return Math.round(value * 2) / 2; // Round to 0.5 increments
    } else {
      // 40-100% of slider: 10 to 264 sat/vB with 1.0 increments
      const value = 10 + ((pos - 40) / 60) * 254;
      return Math.min(264, Math.round(value)); // Round to whole number
    }
  };

  // Ensure a stable handler function for the slider to satisfy exactOptionalPropertyTypes
  const onSliderChange = (value: number) => {
    if (handleChangeFee) {
      handleChangeFee(value);
    }
  };

  // Fee selector component
  const renderFeeSelector = () => {
    if (isLoadingMaraFee) {
      return (
        <div class={`flex flex-col ${isModal ? "w-2/3" : "w-[85%]"}`}>
          <FeeSkeletonLoader />
        </div>
      );
    }

    return (
      <div class={`flex flex-col ${isModal ? "w-2/3" : "w-[85%]"}`}>
        <div class="flex items-center gap-2">
          {maraMode && (
            <div
              className="relative cursor-help"
              title="MARA Pool: Direct mining pool submission for non-standard transactions"
            >
              <MaraModeBadge />
            </div>
          )}
        </div>
        <h6 class="font-light text-xs text-color-grey cursor-default select-none text-nowrap">
          <span class="text-color-grey-semidark pr-2">
            {maraMode ? "MARA REQUIRED" : "RECOMMENDED"}
          </span>
          <span
            class={`font-medium ${maraMode ? "text-color-grey-light" : ""}`}
          >
            {maraMode && maraFeeRate !== null
              ? maraFeeRate
              : fees?.recommendedFee
              ? fees.recommendedFee
              : <span class="animate-pulse">XX</span>}
          </span>{" "}
          SAT/vB
        </h6>
        <h6 class="font-light text-base text-color-grey-light mb-1.5 cursor-default select-none">
          <span class="text-color-grey-semidark pr-2.5">FEE</span>
          <span
            class={`font-bold ${maraMode ? "text-color-grey-light" : ""}`}
          >
            {fee === 0 ? <span class="animate-pulse">XX</span> : fee}
          </span>{" "}
          SAT/vB
        </h6>
        <div class="relative">
          <div className={`${maraMode ? "opacity-50 cursor-not-allowed" : ""}`}>
            <RangeSlider
              value={fee ?? 0}
              onChange={onSliderChange}
              valueToPosition={feeToSliderPos}
              positionToValue={sliderPosToFee}
              onMouseEnter={handleFeeMouseEnter}
              onMouseLeave={handleFeeMouseLeave}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              disabled={maraMode}
            />
          </div>

          <div
            className={`${tooltipImage} ${
              isFeeTooltipVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y - 6}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            SELECT FEE
          </div>
        </div>
      </div>
    );
  };

  // Estimate details component
  const renderDetails = () => {
    return (
      <div
        className={`transition-all duration-400 ease-in-out overflow-hidden ${
          visible ? "max-h-[220px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div class="gap-1 mt-1.5">
          {/* File Type - Only show for stamp type */}
          {type === "stamp" && (
            <h6 class={textXs}>
              <span class={labelXs}>FILE</span>&nbsp;&nbsp;
              {fileType
                ? fileType.toUpperCase()
                : <span class="animate-pulse">***</span>}
            </h6>
          )}

          {/* CPID - Only show for stamp type */}
          {type === "stamp" && (
            <h6 class={textXs}>
              <span class={labelXs}>CPID</span>&nbsp;&nbsp;
              {cpid ? cpid : <span class="animate-pulse">AUTO GENERATED</span>}
            </h6>
          )}

          {/* Editions - Only show for stamp type */}
          {type === "stamp" && (
            <h6 class={textXs}>
              <span class={labelXs}>
                EDITIONS
              </span>&nbsp;&nbsp;
              {issuance ? issuance : <span class="animate-pulse">***</span>}
            </h6>
          )}

          {/* File Size */}
          {type === "stamp" && (
            <h6 class={textXs}>
              <span class={labelXs}>SIZE</span>&nbsp;&nbsp;
              {fileSize ? fileSize : <span class="animate-pulse">***</span>}
              {" "}
              <span class="font-light">BYTES</span>
            </h6>
          )}

          {/* Transaction Size */}
          {(type === "stamp" || type === "src20" || type === "src101" ||
            type === "send") && (
            <h6
              class={`${textXs} cursor-help`}
              onMouseEnter={handleTxSizeMouseEnter}
              onMouseLeave={handleTxSizeMouseLeave}
              onMouseDown={handleTxSizeMouseDown}
              onMouseMove={handleMouseMove}
            >
              <span class={labelXs}>TX SIZE</span>&nbsp;&nbsp;
              <span class="text-color-grey-light pr-1">~</span>
              {(() => {
                const transactionType = type === "send"
                  ? "send"
                  : type === "src20"
                  ? "src20"
                  : type === "src101"
                  ? "src101"
                  : "stamp";
                const estimatedSize = estimateTransactionSizeForType(
                  transactionType,
                  fileSize,
                );
                return estimatedSize;
              })()} <span class="font-light">vBYTES</span>
            </h6>
          )}

          {/* Sats Per Byte */}
          <h6 class={textXs}>
            <span class={labelXs}>SATS PER BYTE</span>&nbsp;&nbsp;{fee}
          </h6>

          {/* Miner Fee */}
          <h6 class={textXs}>
            <span class={labelXs}>
              MINER FEE
            </span>&nbsp;&nbsp;
            {feeDetails?.minerFee
              ? (
                <>
                  {!feeDetails.hasExactFees && (
                    <span class="text-color-grey-light pr-1">~</span>
                  )}
                  {coinType === "BTC"
                    ? formatSatoshisToBTC(feeDetails.minerFee, {
                      includeSymbol: false,
                    })
                    : formatSatoshisToUSD(feeDetails.minerFee, BTCPrice)}{" "}
                  <span class="font-light">{coinType}</span>
                </>
              )
              : (
                <>
                  <span class="animate-pulse">0.00000000</span>{" "}
                  <span class="font-light">{coinType}</span>
                </>
              )}
          </h6>

          {/* Service Fee - Display if available in feeDetails */}
          {/* #region agent log */}
          {(() => {
            console.log("[DEBUG-e6a2b1] HypA serviceFee:", {
              serviceFee: feeDetails?.serviceFee,
              exprResult: feeDetails?.serviceFee && feeDetails.serviceFee > 0,
              exprType:
                typeof (feeDetails?.serviceFee && feeDetails.serviceFee > 0),
              maraMode,
            });
            return null;
          })()}
          {/* #endregion */}
          {!!feeDetails?.serviceFee && feeDetails.serviceFee > 0 && (
            <h6 class={textXs}>
              <span class={labelXs}>
                SERVICE FEE
              </span>&nbsp;&nbsp;
              {coinType === "BTC"
                ? formatSatoshisToBTC(feeDetails.serviceFee, {
                  includeSymbol: false,
                })
                : formatSatoshisToUSD(feeDetails.serviceFee, BTCPrice)}{" "}
              <span class="font-light">{coinType}</span>
            </h6>
          )}

          {/* Dust Value */}
          {!!feeDetails?.dustValue && feeDetails?.dustValue > 0 && (
            <h6 class={textXs}>
              <span class={labelXs}>
                DUST
              </span>&nbsp;&nbsp;
              {feeDetails?.dustValue
                ? (
                  <>
                    {coinType === "BTC"
                      ? formatSatoshisToBTC(feeDetails.dustValue, {
                        includeSymbol: false,
                      })
                      : formatSatoshisToUSD(
                        feeDetails.dustValue,
                        BTCPrice,
                      )} <span class="font-light">{coinType}</span>
                  </>
                )
                : <span class="animate-pulse">0.00000000</span>}
            </h6>
          )}

          {/* Bitname TLD */}
          {!!bitname && bitname.split(".")[1] && (
            <h6 class={textXs}>
              <span class={labelXs}>TLD</span>&nbsp;&nbsp;
              {`.${bitname.split(".")[1]}`}
            </h6>
          )}

          {/* Bitname domain */}
          {fromPage === "src101_bitname" && (
            <h6 class={textXs}>
              <span class={labelXs}>NAME</span>&nbsp;&nbsp;
              {bitname?.split(".")[0]
                ? (
                  bitname?.split(".")[0]
                )
                : <span class="animate-pulse">*******</span>}
            </h6>
          )}

          {/* Donate amount */}
          {fromPage === "donate" && (
            <h6 class={textXs}>
              <span class={labelXs}>
                DONATION AMOUNT
              </span>&nbsp;&nbsp;
              {feeDetails?.itemPrice !== undefined
                ? (
                  <>
                    {coinType === "BTC"
                      ? formatSatoshisToBTC(feeDetails.itemPrice ?? 0, {
                        includeSymbol: false,
                      })
                      : formatSatoshisToUSD(
                        feeDetails.itemPrice ?? 0,
                        BTCPrice,
                      )} <span class="font-light">{coinType}</span>
                  </>
                )
                : (
                  <>
                    <span class="animate-pulse">0.00000000</span>{" "}
                    <span class="font-light">{coinType}</span>
                  </>
                )}
            </h6>
          )}

          {/* Receive amount on donate */}
          {fromPage === "donate" && (
            <h6 class={textXs}>
              <span class={labelXs}>
                RECEIVE
              </span>&nbsp;&nbsp;
              {receive ? receive : <span class="animate-pulse">******</span>}
              {" "}
              USDSTAMPS
            </h6>
          )}

          {/** Stamp Buy Modal */}
          {fromPage === "stamp_buy" && (
            <h6 class={textXs}>
              <span class={labelXs}>
                STAMP PRICE
              </span>&nbsp;&nbsp;
              {feeDetails?.itemPrice !== undefined
                ? (
                  <>
                    {coinType === "BTC"
                      ? formatSatoshisToBTC(feeDetails.itemPrice ?? 0, {
                        includeSymbol: false,
                      })
                      : formatSatoshisToUSD(
                        feeDetails.itemPrice ?? 0,
                        BTCPrice,
                      )} <span class="font-light">{coinType}</span>
                  </>
                )
                : (
                  <>
                    <span class="animate-pulse">0.00000000</span>{" "}
                    <span class="font-light">{coinType}</span>
                  </>
                )}
            </h6>
          )}

          {/** Stamp Buy Modal */}
          {fromPage === "stamp_buy" && (
            <h6 class={textXs}>
              <span class={labelXs}>
                EDITIONS
              </span>&nbsp;&nbsp;
              {edition ? edition : <span class="animate-pulse">***</span>}
            </h6>
          )}

          {/** SRC20 DEPLOY */}
          {fromPage === "src20_deploy" && (
            <h6 class={textXs}>
              <span class={labelXs}>
                TICKER
              </span>&nbsp;&nbsp;
              {ticker ? ticker : <span class="animate-pulse">*****</span>}
            </h6>
          )}
          {fromPage === "src20_deploy" && (
            <h6 class={textXs}>
              <span class={labelXs}>
                SUPPLY
              </span>&nbsp;&nbsp;
              {supply ? supply : <span class="animate-pulse">0</span>}
            </h6>
          )}
          {fromPage === "src20_deploy" && (
            <h6 class={textXs}>
              <span class={labelXs}>
                LIMIT
              </span>&nbsp;&nbsp;
              {limit ? limit : <span class="animate-pulse">0</span>}
            </h6>
          )}
          {fromPage === "src20_deploy" && (
            <h6 class={textXs}>
              <span class={labelXs}>
                DECIMALS
              </span>&nbsp;&nbsp;
              {dec !== undefined ? dec : <span class="animate-pulse">0</span>}
            </h6>
          )}

          {/* SRC20 Transfer Details */}
          {fromPage === "src20_transfer" && (
            <>
              <h6 class={textXs}>
                <span class={labelXs}>RECIPIENT ADDY</span>&nbsp;&nbsp;
                {src20TransferDetails?.address || (
                  <span class="animate-pulse">************</span>
                )}
              </h6>
              <h6 class={textXs}>
                <span class={labelXs}>TOKEN TICKER</span>&nbsp;&nbsp;
                {src20TransferDetails?.token || (
                  <span class="animate-pulse">*****</span>
                )}
              </h6>
              <h6 class={textXs}>
                <span class={labelXs}>AMOUNT</span>&nbsp;&nbsp;
                {src20TransferDetails?.amount || (
                  <span class="animate-pulse">0</span>
                )}
              </h6>
            </>
          )}

          {/* Stamp Transfer Details */}
          {fromPage === "stamp_transfer" && (
            <>
              <h6 class={textXs}>
                <span class={labelXs}>STAMP</span>&nbsp;&nbsp;
                {stampTransferDetails?.stamp || (
                  <span class="animate-pulse">*******</span>
                )}
              </h6>
              <h6 class={textXs}>
                <span class={labelXs}>EDITIONS</span>&nbsp;&nbsp;
                {stampTransferDetails?.editions || (
                  <span class="animate-pulse">***</span>
                )}
              </h6>
              <h6 class={textXs}>
                <span class={labelXs}>RECIPIENT ADDY</span>&nbsp;&nbsp;
                {stampTransferDetails?.address || (
                  <span class="animate-pulse">************</span>
                )}
              </h6>
            </>
          )}

          {/* Mint Details */}
          {fromPage === "src20_mint" && (
            <h6 class={textXs}>
              <span class={labelXs}>
                TOKEN TICKER
              </span>&nbsp;&nbsp;
              {mintDetails?.token
                ? mintDetails.token
                : <span class="animate-pulse">*****</span>}
            </h6>
          )}

          {fromPage === "src20_mint" && (
            <h6 class={textXs}>
              <span class={labelXs}>
                AMOUNT
              </span>&nbsp;&nbsp;
              {mintDetails?.amount !== undefined && mintDetails.amount > 0
                ? mintDetails.amount
                : <span class="animate-pulse">0</span>}
            </h6>
          )}

          {/* TOTAL */}
          <h6 class={textXs}>
            <span class={`${labelXs} font-normal`}>
              TOTAL
            </span>&nbsp;&nbsp;
            {feeDetails?.totalValue
              ? (
                <>
                  {!feeDetails.hasExactFees && (
                    <span class="text-color-grey-light pr-1">~</span>
                  )}
                  {coinType === "BTC"
                    ? formatSatoshisToBTC(feeDetails.totalValue, {
                      includeSymbol: false,
                    })
                    : formatSatoshisToUSD(feeDetails.totalValue, BTCPrice)}
                </>
              )
              : <span class="animate-pulse">0.00000000</span>}{" "}
            <span class="font-light">{coinType}</span>
          </h6>
        </div>
      </div>
    );
  };

  const handleCheckboxMouseEnter = () => {
    if (allowHover) {
      setCanHoverSelected(true);
    }
  };

  const handleCheckboxMouseLeave = () => {
    setCanHoverSelected(true);
    setAllowHover(true);
  };

  return (
    <div class={className}>
      <div class="flex">
        {renderFeeSelector()}
        {showCoinToggle && (
          <div
            className={`flex gap-1 items-start justify-end ${
              isModal ? "w-1/3" : "w-[15%]"
            }`}
          >
            <div className="relative">
              <ToggleSwitchButton
                isActive={coinType === "USDT"}
                onToggle={handleCoinToggle}
                toggleButtonId="currency-toggle"
                activeSymbol="$"
                inactiveSymbol="₿"
                onMouseEnter={handleCurrencyMouseEnter}
                onMouseLeave={handleCurrencyMouseLeave}
              />
              <div
                className={`${tooltipButton} ${
                  isCurrencyTooltipVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                {currencyTooltipText}
              </div>
            </div>
          </div>
        )}
      </div>

      <div class="mt-6 flex flex-col-reverse justify-start min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
        <h6 class="text-lg text-color-grey-light font-light cursor-default select-none">
          <span class="text-color-grey-semidark">ESTIMATE</span>
          {feeDetails?.totalValue !== undefined
            ? (
              <>
                {!feeDetails.hasExactFees && (
                  <span class="text-color-grey-light pl-2.5 pr-1.5">~</span>
                )}
                {(() => {
                  // Add MARA service fee if in MARA mode
                  const maraServiceFee = maraMode ? 42000 : 0;
                  const totalWithMaraFee = feeDetails.totalValue +
                    maraServiceFee;

                  return coinType === "BTC"
                    ? (
                      <>
                        <span class="font-bold">
                          {formatSatoshisToBTC(totalWithMaraFee, {
                            includeSymbol: false,
                          })}
                        </span>{" "}
                        <span class="font-light">BTC</span>
                      </>
                    )
                    : (
                      <>
                        <span class="font-bold">
                          {BTCPrice !== undefined
                            ? (totalWithMaraFee / 1e8 * BTCPrice).toFixed(2)
                            : "N/A"}
                        </span>{" "}
                        <span class="font-light">{coinType}</span>
                      </>
                    );
                })()}
              </>
            )
            : (
              <>
                <span class="font-bold animate-pulse">0.00000000</span>{" "}
                <span class="font-light">{coinType}</span>
              </>
            )}
        </h6>

        {progressIndicator && (
          <div className="flex items-center justify-start mb-0.5 min-[420px]:justify-end min-[420px]:mb-0 w-auto">
            {progressIndicator}
          </div>
        )}
      </div>

      <div
        onClick={() => setVisible(!visible)}
        className="flex items-center font-normal text-xs text-color-grey-semidark hover:text-color-grey-light uppercase transition-colors duration-200 gap-1.5 cursor-pointer group"
      >
        DETAILS
        <Icon
          type="icon"
          name="caretUp"
          weight="bold"
          size="xxxs"
          color="custom"
          className={` stroke-color-grey-semidark group-hover:stroke-color-grey-light transition-all duration-200 transform ${
            visible ? "scale-y-[-1]" : ""
          }`}
        />
      </div>

      {renderDetails()}

      <div class="flex flex-col items-end gap-4 pt-10">
        <div class="relative flex items-center">
          <input
            type="checkbox"
            id="tosAgreed"
            checked={tosAgreed}
            onChange={(e) => {
              const target = e.target as HTMLInputElement;
              onTosChange(target.checked);
              setAllowHover(false);
              setCanHoverSelected(false);
            }}
            className="absolute w-0 h-0 opacity-0"
          />
          <label
            htmlFor="tosAgreed"
            className="flex items-center cursor-pointer group"
            onMouseEnter={handleCheckboxMouseEnter}
            onMouseLeave={handleCheckboxMouseLeave}
          >
            <div
              className={`
                w-4 h-4 tablet:w-3 tablet:h-3 mr-3 tablet:mr-2
                flex items-center justify-center
                rounded-[3px]
                transition-all duration-200 ease-in-out
                border
                relative
                overflow-hidden
                ${
                tosAgreed
                  ? canHoverSelected
                    ? "bg-color-grey-dark/15 border-color-grey-dark/20  group-hover:border-color-grey-light/20"
                    : "bg-color-grey-dark/15 border-color-grey-dark/20"
                  : canHoverSelected
                  ? "bg-color-grey-dark/15 border-color-grey-light/20 group-hover:border-color-grey-dark/40"
                  : "bg-color-grey-dark/15 border-color-grey-light/20"
              }
              `}
            >
              <div
                className={`
                  absolute inset-[1px] rounded-[2px]
                  transform transition-all duration-200 ease-in-out
                  ${tosAgreed ? "scale-100" : "scale-0"}
                  ${
                  canHoverSelected
                    ? "bg-color-grey-semidark group-hover:bg-color-grey-light"
                    : "bg-color-grey-semidark"
                }
                `}
              />
            </div>
            <span
              className={`
                text-xs font-medium select-none
                transition-colors duration-200
                ${
                tosAgreed ? "text-color-grey-semidark" : "text-color-grey-light"
              }
                ${
                tosAgreed
                  ? canHoverSelected ? "group-hover:text-color-grey-light" : ""
                  : canHoverSelected
                  ? "group-hover:text-color-grey-semidark"
                  : ""
              }
              `}
            >
              AGREE TO THE{" "}
              <span class="text-color-grey-semidark">
                <span class="tablet:hidden">
                  <a
                    href="/termsofservice"
                    className={`
                      transition-colors duration-200
                      ${
                      tosAgreed
                        ? "text-color-grey-semidark"
                        : "text-color-grey-semidark"
                    }
                      hover:text-color-grey-light
                    `}
                  >
                    TERMS
                  </a>
                </span>
                <span class="hidden tablet:inline">
                  <a
                    href="/termsofservice"
                    className={`
                      transition-colors duration-200
                      ${
                      tosAgreed
                        ? "text-color-grey-semidark"
                        : "text-color-grey-semidark"
                    }
                      hover:text-color-grey-light
                    `}
                  >
                    TERMS OF SERVICE
                  </a>
                </span>
              </span>
            </span>
          </label>
        </div>

        <div class="flex items-center justify-end gap-5">
          {/* Buttons on the right */}
          <div class="flex justify-end gap-5">
            {onCancel && (
              <Button
                variant="outline"
                color="grey"
                size="mdR"
                onClick={() => {
                  logger.debug("ui", {
                    message: "Cancel clicked",
                    component: "FeeCalculatorBase",
                  });
                  handleModalClose();
                  onCancel();
                }}
                disabled={!!isSubmitting}
              >
                {cancelText}
              </Button>
            )}
            <ButtonProcessing
              variant="flat"
              color="grey"
              size="mdR"
              isSubmitting={!!isSubmitting}
              onClick={() => {
                console.log(
                  "FEE_CALCULATOR_BASE: Internal button onClick fired! About to call props.onSubmit.",
                );
                if (onSubmit) {
                  onSubmit();
                }
              }}
              disabled={!!(disabled || !tosAgreed)}
            >
              {confirmText || buttonName}
            </ButtonProcessing>
          </div>
        </div>
      </div>

      {/* Transaction Size Tooltip */}
      <div
        className={`${tooltipImage} ${
          isTxSizeTooltipVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y - 6}px`,
          transform: "translate(-50%, -100%)",
          maxWidth: "280px",
          whiteSpace: "normal",
          textAlign: "center",
          fontSize: "11px",
          lineHeight: "1.3",
        }}
      >
        <div class="font-medium mb-1">TRANSACTION SIZE (vBYTES)</div>
        <div class="font-light">
          Virtual bytes measure Bitcoin transaction size for fee calculation.
          Larger files create bigger transactions that cost more to broadcast.
        </div>
      </div>
    </div>
  );
}
