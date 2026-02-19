/* ===== SEND TOOL COMPONENT ===== */
import { useTransactionForm } from "$client/hooks/useTransactionForm.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { ProgressiveEstimationIndicator } from "$components/indicators/ProgressiveEstimationIndicator.tsx";
import { inputField, inputFieldDropdown, inputFieldSquare } from "$form";
import { Icon, PlaceholderImage } from "$icon";
import { SendToolSkeleton } from "$indicators";
import {
  bodyTool,
  containerBackground,
  containerColForm,
  containerGap,
  containerRowForm,
  imagePreviewTool,
  loaderSpinGrey,
  rowForm,
} from "$layout";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import {
  getStampImageSrc,
  handleImageError,
  processSVG,
} from "$lib/utils/ui/media/imageUtils.ts";
import { FeeCalculatorBase } from "$section";
import { labelLg, labelSm, titleGreyLD } from "$text";
import type { StampRow } from "$types/stamp.d.ts";
import { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== COMPONENT ===== */
export function StampSendTool() {
  console.log("SENDTOOL: Component rendering - TOP LEVEL");

  /* ===== CONTEXT ===== */
  const { wallet } = walletContext;

  /* ===== STATE ===== */
  const [maxQuantity, setMaxQuantity] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [selectedStamp, setSelectedStamp] = useState<StampRow | null>(null);
  const [stamps, setStamps] = useState<{
    data: StampRow[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    data: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  });
  const [tosAgreed, setTosAgreed] = useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isLoadingStamps, setIsLoadingStamps] = useState(true);
  const [validatedSVGNode, setValidatedSVGNode] = useState<
    JSX.Element | null
  >(null);

  /* ===== DROPDOWN STATE ===== */
  const [openDrop, setOpenDrop] = useState(false);
  const [dropdownAnimation, setDropdownAnimation] = useState<
    "enter" | "exit" | null
  >(null);

  /* ===== REFS ===== */
  const dropdownRef = useRef<HTMLDivElement>(null);
  const animationTimeoutRef = useRef<number | null>(null);

  /* ===== FORM HANDLING ===== */
  const {
    formState,
    setFormState,
    handleChangeFee: internalHandleChangeFee,
    handleSubmit,
    isSubmitting,
    error,
    setError,
    successMessage,
    setSuccessMessage,
  } = useTransactionForm({
    type: "transfer",
    initialFee: 1,
  });

  /* ===== 🚀 PROGRESSIVE FEE ESTIMATION INTEGRATION ===== */
  const {
    getBestEstimate,
    isPreFetching,
    estimateExact,
    phase1,
    phase2,
    phase3,
    currentPhase,
    error: feeEstimationError,
    clearError,
  } = useTransactionConstructionService({
    toolType: "stamp",
    feeRate: isSubmitting ? 0 : formState.fee,
    walletAddress: wallet?.address || "",
    isConnected: !!wallet && !isSubmitting,
    isSubmitting,
    asset: selectedStamp?.cpid || "",
    transferQuantity: quantity,
    recipientAddress: formState.recipientAddress || "",
  });

  const progressiveFeeDetails = getBestEstimate();

  const [exactFeeDetails, setExactFeeDetails] = useState<
    typeof progressiveFeeDetails | null
  >(null);

  /* ===== DROPDOWN ANIMATION HANDLER ===== */
  const closeDropdownWithAnimation = () => {
    setDropdownAnimation("exit");
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => {
      setOpenDrop(false);
      setDropdownAnimation(null);
    }, 200);
  };

  /* ===== ANIMATION CLEANUP ===== */
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  /* ===== CLICK-OUTSIDE HANDLER ===== */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        closeDropdownWithAnimation();
      }
    };

    if (openDrop) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDrop]);

  useEffect(() => {
    setExactFeeDetails(null);
  }, [formState.fee]);

  const handleSendWithExactFees = async () => {
    try {
      const exactFees = await estimateExact();
      if (exactFees) {
        const netSpendAmount = exactFees.totalValue || 0;
        setExactFeeDetails({
          ...exactFees,
          totalValue: netSpendAmount,
        });
      }
      await handleTransferSubmit();
    } catch (error) {
      console.error("SENDTOOL: Error in exact fee estimation", error);
      await handleTransferSubmit();
    }
  };

  /* ===== EFFECTS ===== */
  useEffect(() => {
    const fetchStamps = async () => {
      try {
        if (!wallet?.address) {
          setIsLoadingStamps(false);
          return;
        }

        setIsLoadingStamps(true);
        const endpoint = `/api/v2/stamps/balance/${wallet.address}`;
        const response = await fetch(endpoint);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch stamps: ${errorText}`);
        }

        const data = await response.json();
        setStamps({
          data: data.data || [],
          pagination: {
            page: 1,
            limit: 10,
            total: data.total || 0,
            totalPages: Math.ceil((data.total || 0) / 10),
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError(String(error));
        }
      } finally {
        setIsLoadingStamps(false);
      }
    };

    fetchStamps();
  }, [wallet?.address]);

  useEffect(() => {
    if (selectedStamp) {
      setIsImageLoading(true);
      setMaxQuantity(selectedStamp.unbound_quantity);
    } else {
      setIsImageLoading(false);
    }
  }, [selectedStamp?.tx_hash]);

  /* ===== SVG VALIDATION EFFECT ===== */
  useEffect(() => {
    if (selectedStamp?.stamp_mimetype !== "image/svg+xml") {
      setValidatedSVGNode(null);
      return;
    }
    const src = getStampImageSrc(selectedStamp);
    if (!src) {
      setValidatedSVGNode(<PlaceholderImage variant="no-image" />);
      setIsImageLoading(false);
      return;
    }
    (async () => {
      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const svgContent = await response.text();
        const processed = processSVG(svgContent);
        if (processed) {
          setValidatedSVGNode(
            <div
              class="w-full h-full flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: processed }}
            />,
          );
        } else {
          setValidatedSVGNode(<PlaceholderImage variant="error" />);
        }
      } catch {
        setValidatedSVGNode(<PlaceholderImage variant="error" />);
      } finally {
        setIsImageLoading(false);
      }
    })();
  }, [selectedStamp?.tx_hash]);

  useEffect(() => {
    console.log("Values updated:", {
      recipientAddress: formState.recipientAddress,
      stamp: selectedStamp?.stamp,
      quantity: quantity,
    });
  }, [formState.recipientAddress, selectedStamp?.stamp, quantity]);

  /* ===== EVENT HANDLERS ===== */
  const handleStampSelect = (value: string) => {
    const selectedItem = stamps.data.find(
      (item) => item?.stamp?.toString() === value,
    );

    if (selectedItem) {
      console.log(
        "[SendTool] handleStampSelect: New item selected from dropdown",
        {
          stamp_id: selectedItem.stamp,
          tx_hash: selectedItem.tx_hash,
        },
      );

      setIsImageLoading(true);
      setSelectedStamp({ ...selectedItem });

      setFormState((prev) => ({
        ...prev,
        stampId: selectedItem.stamp,
        cpid: selectedItem.cpid,
      }));

      closeDropdownWithAnimation();
    }
  };

  const handleQuantityChange = (e: Event) => {
    e.preventDefault();

    const input = e.target as HTMLInputElement;
    if (!input.value || input.value === "0") {
      input.value = "1";
    }
    setQuantity(parseInt(input.value));
  };

  const handleTransferSubmit = async () => {
    console.log("SENDTOOL: handleTransferSubmit Fired!");
    try {
      console.log("SENDTOOL: Starting send submit", {
        selectedStamp,
        formState,
        quantity,
      });

      await handleSubmit(async () => {
        console.log("SENDTOOL: handleSubmit's actualSubmitCallback Fired!");
        if (!selectedStamp) {
          console.error("SENDTOOL: Send failed - no stamp selected");
          throw new Error("Please select a stamp to send.");
        }
        if (!wallet?.address) {
          console.error("SENDTOOL: Send failed - no wallet connected");
          throw new Error("No wallet connected.");
        }
        if (
          !formState.recipientAddress ||
          typeof formState.recipientAddress !== "string" ||
          !formState.recipientAddress.trim()
        ) {
          console.error(
            "SENDTOOL: Invalid or empty formState.recipientAddress",
            formState.recipientAddress,
          );
          throw new Error(
            "Recipient address is required and must be a valid string.",
          );
        }
        console.log(
          "SENDTOOL: Value of formState.recipientAddress BEFORE creating requestBody:",
          formState.recipientAddress,
        );
        if (!quantity || quantity <= 0) {
          console.error("SENDTOOL: Send failed - invalid quantity", {
            quantity,
          });
          throw new Error("Invalid quantity specified.");
        }

        const feeRateKB = formState.fee * 1000;

        const requestBody = {
          address: wallet.address,
          destination: formState.recipientAddress,
          asset: selectedStamp.cpid,
          quantity: quantity,
          satsPerVB: formState.fee,
          options: {
            return_psbt: true,
            fee_per_kb: feeRateKB,
            allow_unconfirmed_inputs: true,
          },
        };

        console.log(
          "SENDTOOL: Preparing stamp send request (SendTool)",
          {
            satsPerVB_being_sent: formState.fee,
            requestBody_being_sent: requestBody,
            endpoint: "/api/v2/create/send",
          },
        );
        console.log(
          "SENDTOOL: About to fetch /api/v2/create/send. Body (stringified):",
          JSON.stringify(requestBody),
        );

        const response = await fetch("/api/v2/create/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        console.log(
          "SENDTOOL: Response received from /api/v2/create/send. Status:",
          response.status,
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: "Failed to parse error from server on non-ok response",
          }));
          console.error("SENDTOOL: Error from /api/v2/create/send", {
            status: response.status,
            errorData,
          });
          throw new Error(errorData.error || "API call failed");
        }
        const responseData = await response.json();
        console.log("SENDTOOL: Response JSON parsed:", responseData);

        if (!responseData?.psbtHex || !responseData?.inputsToSign) {
          console.error(
            "SENDTOOL: Invalid response structure from /api/v2/create/send",
            { responseData },
          );
          throw new Error(
            "Invalid response from server: Missing psbtHex or inputsToSign.",
          );
        }

        console.log("SENDTOOL: About to call walletContext.signPSBT", {
          psbtHex: responseData.psbtHex,
          inputsToSign: responseData.inputsToSign,
        });
        const signResult = await walletContext.signPSBT(
          wallet,
          responseData.psbtHex,
          responseData.inputsToSign,
          true,
        );
        console.log("SENDTOOL: signPSBT result:", signResult);

        if (signResult.signed && signResult.txid) {
          console.log(
            "SENDTOOL: Send successful! TXID:",
            signResult.txid,
          );
          setSuccessMessage(`Send successful! TXID: ${signResult.txid}`);
        } else if (signResult.cancelled) {
          console.warn(
            "SENDTOOL: Stamp send signing was cancelled by user",
          );
          throw new Error("Transaction signing was cancelled.");
        } else {
          console.error(
            "SENDTOOL: Failed to sign PSBT for stamp send",
            { error: signResult.error },
          );
          throw new Error(`Failed to sign transaction: ${signResult.error}`);
        }
      });
    } catch (error) {
      console.error(
        "SENDTOOL: Error in handleTransferSubmit outer scope:",
        error,
      );
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      setError(errorMessage);
    }
  };

  /* ===== RENDER HELPERS ===== */
  const isLibraryFile = selectedStamp?.stamp_mimetype === "text/css" ||
    selectedStamp?.stamp_mimetype === "text/javascript" ||
    selectedStamp?.stamp_mimetype === "application/javascript" ||
    selectedStamp?.stamp_mimetype === "application/gzip";

  const renderStampContent = () => {
    if (!selectedStamp) {
      return (
        <Icon
          type="icon"
          name="previewImage"
          weight="extraLight"
          size="xl"
          color="custom"
          className="stroke-color-grey-dark"
        />
      );
    }

    const src = getStampImageSrc(selectedStamp);

    if (selectedStamp.stamp_mimetype === "text/html") {
      return (
        <div class="relative aspect-square w-full">
          <iframe
            src={src}
            width="100%"
            height="100%"
            sandbox="allow-scripts allow-same-origin"
            class="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-2xl"
            style={{ border: "none", backgroundColor: "transparent" }}
          />
        </div>
      );
    }

    if (selectedStamp.stamp_mimetype === "image/svg+xml") {
      return validatedSVGNode || (
        <div class="relative w-full h-full flex items-center justify-center">
          <div class={loaderSpinGrey} />
        </div>
      );
    }

    if (selectedStamp.stamp_mimetype === "text/plain") {
      return <PlaceholderImage variant="no-image" />;
    }

    if (selectedStamp.stamp_mimetype?.startsWith("audio/")) {
      return <PlaceholderImage variant="audio" />;
    }

    if (isLibraryFile) {
      return <PlaceholderImage variant="library" />;
    }

    if (!src) {
      return <PlaceholderImage variant="no-image" />;
    }

    return (
      <div class="relative w-full h-full">
        <img
          key={`stamp-${selectedStamp.tx_hash}`}
          src={src}
          alt={`Stamp #${selectedStamp.stamp}`}
          class={`w-full h-full object-contain pixelart transition-opacity duration-300 ${
            isImageLoading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => setIsImageLoading(false)}
          onError={handleImageError}
        />

        {isImageLoading && (
          <div class="absolute inset-0 flex items-center justify-center">
            <div class={loaderSpinGrey} />
          </div>
        )}
      </div>
    );
  };

  /* ===== EARLY RETURN FOR LOADING STATE ===== */
  if (isLoadingStamps) {
    return (
      <div class={`${bodyTool} ${containerGap}`}>
        <h1 class={`${titleGreyLD} mx-auto -mb-2 mobileLg:-mb-4`}>
          SEND
        </h1>
        <SendToolSkeleton />
      </div>
    );
  }

  /* ===== RENDER ===== */
  return (
    <div class={`${bodyTool} ${containerGap}`}>
      <h1 class={`${titleGreyLD} mx-auto -mb-2 mobileLg:-mb-4`}>
        SEND
      </h1>

      {/* ===== STAMP SELECTION SECTION ===== */}
      <form
        class={`${containerBackground} relative`}
        onSubmit={(e) => {
          e.preventDefault();
        }}
        aria-label="Send stamp"
        novalidate
      >
        <div class={`${containerRowForm} mb-5`}>
          <div class={imagePreviewTool}>
            {renderStampContent()}
          </div>

          <div class={containerColForm}>
            {/* ===== STAMP DROPDOWN ===== */}
            <div
              class={`relative ${
                openDrop && stamps.data.length > 0 ? "input-open" : ""
              }`}
              ref={dropdownRef}
            >
              {/* Trigger */}
              <div
                class={`${inputField} flex items-center gap-3 select-none ${
                  !wallet?.address || stamps.data.length === 0
                    ? "cursor-default"
                    : "cursor-pointer"
                }`}
                onClick={() => {
                  if (openDrop) {
                    closeDropdownWithAnimation();
                  } else {
                    setOpenDrop(true);
                    setDropdownAnimation("enter");
                  }
                }}
              >
                {selectedStamp
                  ? (
                    <span class="font-medium text-color-grey-light">
                      #{selectedStamp.stamp}
                    </span>
                  )
                  : !wallet?.address
                  ? (
                    <span class="font-light text-color-grey-semidark uppercase">
                      Connect your wallet
                    </span>
                  )
                  : stamps.data.length === 0
                  ? (
                    <span class="font-light text-color-grey-semidark uppercase">
                      No stamps in wallet
                    </span>
                  )
                  : (
                    <span class="font-light text-color-grey-semidark uppercase">
                      Select stamp
                    </span>
                  )}
              </div>

              {/* Dropdown list */}
              {(openDrop || dropdownAnimation === "exit") &&
                stamps.data.length > 0 && (
                <ul
                  class={`${inputFieldDropdown} max-h-[134px] ${
                    dropdownAnimation === "exit"
                      ? "dropdown-exit"
                      : dropdownAnimation === "enter"
                      ? "dropdown-enter"
                      : ""
                  }`}
                >
                  {stamps.data.map((stamp) => (
                    <li
                      key={stamp.tx_hash}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleStampSelect(stamp.stamp?.toString() ?? "");
                      }}
                      class="flex items-center gap-5 px-2 py-2 border-b-[1px] border-color-border last:border-b-0 hover:bg-color-background/60 hover:border-color-border transition-colors duration-200 cursor-pointer"
                    >
                      <img
                        src={`/api/v2/stamp/${stamp.stamp}/preview`}
                        alt=""
                        class="w-7 h-7 rounded object-contain pixelart flex-shrink-0"
                        onError={handleImageError}
                      />
                      <div class="flex items-center justify-between flex-1 min-w-0">
                        <span class="text-sm font-medium text-color-grey-light">
                          #{stamp.stamp}
                        </span>
                        <span class="hidden min-[480px]:block text-xs font-normal text-color-grey">
                          {stamp.unbound_quantity} EDITIONS
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div class="flex w-full justify-end items-center -my-[3px] gap-5">
              <div class="flex flex-col justify-start -space-y-0.5">
                <h5 class={`${labelLg} !text-color-grey`}>
                  EDITIONS
                </h5>
                <h6 class={labelSm}>
                  MAX {maxQuantity}
                </h6>
              </div>
              <input
                type="number"
                min="1"
                max={maxQuantity}
                value={quantity}
                onChange={handleQuantityChange}
                class={inputFieldSquare}
                aria-label="Number of editions to send"
              />
            </div>
          </div>
        </div>
        <div class={rowForm}>
          <input
            value={formState.recipientAddress}
            onInput={(e: JSX.TargetedEvent<HTMLInputElement>) => {
              const newValue = e.currentTarget.value;
              console.log(
                "SENDTOOL: Recipient Address Input onInput. New value:",
                newValue,
              );
              setFormState((prev) => ({
                ...prev,
                recipientAddress: newValue,
              }));
            }}
            placeholder="Recipient address"
            class={inputField}
            aria-label="Recipient address"
          />
        </div>
      </form>

      {/* ===== FEE CALCULATOR SECTION ===== */}
      <div class={containerBackground}>
        <FeeCalculatorBase
          fee={formState.fee}
          handleChangeFee={internalHandleChangeFee}
          type="transfer"
          BTCPrice={formState.BTCPrice}
          isSubmitting={isSubmitting}
          onSubmit={() => {
            console.log(
              "FEE_CALCULATOR_SUBMIT (SendTool): onSubmit triggered!",
            );
            handleSendWithExactFees();
          }}
          buttonName={wallet?.address ? "SEND" : "CONNECT WALLET"}
          tosAgreed={tosAgreed}
          onTosChange={setTosAgreed}
          fromPage="stamp_transfer"
          bitname=""
          stampTransferDetails={{
            address: formState.recipientAddress || "",
            stamp: selectedStamp?.stamp?.toString() || "",
            editions: quantity || 0,
          }}
          feeDetails={(exactFeeDetails || progressiveFeeDetails)
            ? {
              minerFee: (exactFeeDetails || progressiveFeeDetails)?.minerFee ||
                0,
              dustValue: 0,
              totalValue:
                (exactFeeDetails || progressiveFeeDetails)?.totalValue || 0,
              hasExactFees:
                (exactFeeDetails || progressiveFeeDetails)?.hasExactFees ||
                false,
              estimatedSize: 300,
            }
            : {
              minerFee: 0,
              dustValue: 0,
              totalValue: 0,
              hasExactFees: false,
              estimatedSize: 300,
            }}
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

      {/* ===== STATUS MESSAGES ===== */}
      {error && (
        <div class="text-red-500 text-center mt-4 font-medium">
          {error}
        </div>
      )}
      {successMessage && (
        <div class="text-green-500 text-center mt-4 font-medium">
          {successMessage}
        </div>
      )}
    </div>
  );
}
