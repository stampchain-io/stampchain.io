/* ===== SRC101 BITNAME REGISTRATION COMPONENT ===== */
/* Single implementation for the /tool/src101/mint page and the register
   modal (islands/modal/tool/SRC101RegisterTool.tsx wraps it in ModalTool). */
import { Button, ButtonProcessing } from "$button";
import { useSRC101Form } from "$client/hooks/userSRC101Form.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { ProgressiveEstimationIndicator } from "$components/indicators/ProgressiveEstimationIndicator.tsx";
import { ROOT_DOMAINS } from "$constants";
import { inputFieldDropdown, inputFieldDropdownHover } from "$form";
import { RegisterToolSkeleton } from "$indicators";
import { InputField } from "$islands/form/InputField.tsx";
import { openSRC101DetailTool } from "$islands/modal/tool/SRC101DetailTool.tsx";
import {
  bodyTool,
  container2,
  container2Hover,
  containerBackground,
  containerColForm,
  containerGap,
  handleModalClose,
  shadowGlowPurpleSm,
  transitionAll,
} from "$layout";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import { logger } from "$lib/utils/logger.ts";
import { mapProgressiveFeeDetails } from "$lib/utils/performance/fees/fee-estimation-utils.ts";
import {
  bitnameAvailabilityMessage,
  buildBitnameAvailabilityUrl,
  interpretBitnameAvailability,
} from "$lib/utils/src101/bitnameAvailability.ts";
import { StatusMessages, tooltipButton, tooltipImage } from "$notification";
import { FeeCalculatorBase } from "$section";
import { titleNeutral } from "$text";
import type { ROOT_DOMAIN_TYPES } from "$types/base.d.ts";
import type { SRC101Balance } from "$types/src101.d.ts";
import type { SRC101RegisterToolProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== COMPONENT INTERFACE ===== */
export type SRC101RegisterToolVariant = "page" | "modal";

export interface SRC101RegisterToolViewProps extends SRC101RegisterToolProps {
  /** "page" renders the full tool page; "modal" renders the body for ModalTool. */
  variant?: SRC101RegisterToolVariant;
}

/* ===== MAIN COMPONENT IMPLEMENTATION ===== */
export function SRC101RegisterTool({
  trxType = "olga",
  variant = "page",
}: SRC101RegisterToolViewProps) {
  const isModal = variant === "modal";

  /* ===== FORM AND CONFIG HOOKS ===== */
  const {
    formState,
    handleChangeFee,
    handleInputChange,
    handleSubmit,
    config,
    isSubmitting,
    submissionMessage,
    apiError,
  } = useSRC101Form("mint", trxType);

  /* ===== STATE MANAGEMENT ===== */
  const [tosAgreed, setTosAgreed] = useState<boolean>(false);
  const { isConnected, wallet, showConnectModal } = walletContext;
  const [isExist, setIsExist] = useState(true);
  const [checkStatus, setCheckStatus] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [openTldDropdown, setOpenTldDropdown] = useState<boolean>(false);
  const tldDropdownRef = useRef<HTMLDivElement>(null);
  // Modal only: fixed anchor the TLD tooltip is positioned from
  const tooltipOriginRef = useRef<HTMLDivElement>(null);
  const [isTldTooltipVisible, setIsTldTooltipVisible] = useState(false);
  const [allowTldTooltip, setAllowTldTooltip] = useState(true);
  const [tldTooltipPosition, setTldTooltipPosition] = useState({
    x: 0,
    y: 0,
  });
  const tldTooltipTimeoutRef = useRef<number | null>(null);
  // Animation state for dropdown
  const [dropdownAnimation, setDropdownAnimation] = useState<
    "enter" | "exit" | null
  >(null);
  const animationTimeoutRef = useRef<number | null>(null);

  /* ===== PROGRESSIVE FEE ESTIMATION ===== */
  const {
    getBestEstimate,
    isPreFetching,
    estimateExact, // Phase 3: Exact estimation before registering
    // Phase-specific results for UI indicators
    phase1,
    phase2,
    phase3,
    currentPhase,
    error: feeEstimationError,
    clearError,
  } = useTransactionConstructionService({
    toolType: "src101-create",
    feeRate: isSubmitting ? 0 : formState.fee,
    walletAddress: wallet?.address || "", // Provide empty string instead of undefined
    isConnected: !!wallet && !isSubmitting,
    isSubmitting,
    // SRC-101 specific parameters
    bitname: formState.toAddress ? formState.toAddress + formState.root : "",
  });

  // Get the best available fee estimate
  const progressiveFeeDetails = getBestEstimate();

  // Local state for exact fee details (updated when Phase 3 completes) - StampingTool pattern
  const [exactFeeDetails, setExactFeeDetails] = useState<
    typeof progressiveFeeDetails | null
  >(null);

  // Reset exactFeeDetails when fee rate changes to allow slider updates - StampingTool pattern
  useEffect(() => {
    setExactFeeDetails(null);
  }, [formState.fee]);

  /* No wallet yet: open connect-wallet (stacked above the modal, or in the
     base slot on the page) instead of submitting without one. */
  const connectIfNeeded = () => {
    if (isConnected) return false;
    showConnectModal();
    return true;
  };

  // Wrapper function for registering that gets exact fees first - StampingTool pattern
  const handleRegisterWithExactFees = async () => {
    if (connectIfNeeded()) return;
    try {
      // Get exact fees before final submission
      const exactFees = await estimateExact();
      if (exactFees) {
        // Calculate net spend amount (matches wallet display)
        const netSpendAmount = exactFees.totalValue || 0;
        setExactFeeDetails({
          ...exactFees,
          totalValue: netSpendAmount, // Matches wallet
        });
      }
      await handleSubmit();
    } catch (error) {
      logger.error("stamps", {
        message: "Error in SRC101 register exact fee estimation",
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      // Still proceed with submission even if exact fees fail
      await handleSubmit();
    }
  };

  /* ===== CLICK OUTSIDE HANDLER ===== */
  /* Only listen while the list is open, so a click elsewhere (e.g. the
     AVAILABILITY button) never re-opens the closed list on top of it. */
  useEffect(() => {
    if (!openTldDropdown) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        tldDropdownRef.current &&
        !tldDropdownRef.current.contains(event.target as Node)
      ) {
        closeDropdownWithAnimation();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openTldDropdown]);

  /* ===== ANIMATION AND TOOLTIP CLEANUP ===== */
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (tldTooltipTimeoutRef.current) {
        globalThis.clearTimeout(tldTooltipTimeoutRef.current);
      }
    };
  }, []);

  /* ===== TLD HANDLERS ===== */
  const closeDropdownWithAnimation = () => {
    setDropdownAnimation("exit");
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => {
      setOpenTldDropdown(false);
      setDropdownAnimation(null);
    }, 200); // Match animation duration
  };

  const handleTldSelect = (tld: ROOT_DOMAIN_TYPES) => {
    closeDropdownWithAnimation();
    handleInputChange(
      {
        target: { value: tld },
      } as Event & { target: { value: string } },
      "root",
    );
  };

  /* ===== TOOLTIP HANDLERS ===== */
  /* The modal card is transformed, so in the modal the tooltip is
     positioned from a fixed anchor instead of inside the field. */
  const placeTldTooltip = () => {
    const tld = tldDropdownRef.current?.getBoundingClientRect();
    const origin = tooltipOriginRef.current?.getBoundingClientRect();
    if (!tld) return;
    setTldTooltipPosition({
      x: tld.left + tld.width / 2 - (origin?.left ?? 0),
      y: tld.top - (origin?.top ?? 0),
    });
  };

  const handleTldMouseEnter = () => {
    if (!allowTldTooltip) return;
    if (isModal) placeTldTooltip();
    if (tldTooltipTimeoutRef.current) {
      globalThis.clearTimeout(tldTooltipTimeoutRef.current);
    }
    tldTooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setIsTldTooltipVisible(true);
    }, 1500);
  };

  const handleTldMouseLeave = () => {
    if (tldTooltipTimeoutRef.current) {
      globalThis.clearTimeout(tldTooltipTimeoutRef.current);
    }
    setIsTldTooltipVisible(false);
    setAllowTldTooltip(true);
  };

  /* ===== CONFIG CHECK ===== */
  // The page shows a skeleton until config loads; the modal renders at once.
  if (!isModal && !config) {
    return (
      <div class={`${bodyTool} ${containerGap}`}>
        <h1 class={`${titleNeutral} mx-auto -mb-2 mobileLg:-mb-4`}>
          REGISTER
        </h1>
        <RegisterToolSkeleton />
      </div>
    );
  }

  /* ===== MODAL HANDLERS ===== */
  const handleOpenDetailModal = (data: SRC101Balance) => {
    openSRC101DetailTool({
      img: data.img,
      name: data.tokenid_utf8,
      root: formState.root,
      owner: data.owner,
    });
  };

  /* ===== AVAILABILITY CHECK ===== */
  const checkAvailability = async (): Promise<boolean> => {
    if (isChecking) return false;
    setCheckStatus(false);
    setIsChecking(true);
    try {
      const res = await fetch(
        buildBitnameAvailabilityUrl(formState.toAddress ?? ""),
      );
      const jsonData = await res.json();
      setCheckStatus(true);
      const result = interpretBitnameAvailability<SRC101Balance>(
        res.status,
        jsonData,
      );
      if (result.kind === "registered") {
        setIsExist(true);
        handleOpenDetailModal(result.match);
        return false;
      }
      if (result.kind === "available") {
        setIsExist(false);
        return true;
      }
      return false;
    } catch (_error: unknown) {
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  /* ===== SUBMISSION HANDLERS ===== */
  const handleTransferSubmit = async (): Promise<void> => {
    try {
      if (!formState.toAddress) return;
      const available = await checkAvailability();
      if (available) await handleRegisterWithExactFees();
    } catch (error) {
      console.error("Transfer error:", (error as Error).message);
    }
  };

  const availabilityMessage = formState.toAddress && checkStatus
    ? bitnameAvailabilityMessage(
      formState.toAddress,
      formState.root,
      isExist,
      variant,
    )
    : "";

  const dropdownAnimationClass = dropdownAnimation === "exit"
    ? isModal ? "dropdown-exit pointer-events-none" : "dropdown-exit"
    : dropdownAnimation === "enter"
    ? "dropdown-enter"
    : "";

  /* ===== FORM ===== */
  const form = (
    <form
      class={isModal
        ? `${containerColForm} relative z-dropdown`
        : `${containerBackground} gap-5 relative z-dropdown`}
      onSubmit={(e) => {
        e.preventDefault();
        handleTransferSubmit();
      }}
      aria-label="Bitname registration form"
      novalidate
    >
      <div class={isModal ? "flex gap-3 min-w-0" : "flex gap-5"}>
        {/* Bitname Input Field */}
        {isModal
          ? (
            <div class="flex-1 min-w-0">
              <InputField
                type="text"
                placeholder="bitname"
                value={formState.toAddress || ""}
                onChange={(e) => handleInputChange(e, "toAddress")}
                class="placeholder:!lowercase"
                autoComplete="off"
              />
            </div>
          )
          : (
            <InputField
              type="text"
              placeholder="bitname"
              id="search-dropdown"
              value={formState.toAddress || ""}
              onChange={(e) => handleInputChange(e, "toAddress")}
              class="flex-1 placeholder:!lowercase"
              required
              autoComplete="off"
              aria-label="Bitname input"
            />
          )}

        {/* TLD Dropdown */}
        <div
          class={isModal ? "relative w-[64px] shrink-0" : "relative w-[64px]"}
          ref={tldDropdownRef}
        >
          <div
            class={isModal
              ? `h-8 px-3 ${container2Hover} ${shadowGlowPurpleSm}
                font-normal text-xs text-color-neutral-200 text-right
                cursor-pointer flex items-center justify-end ${
                openTldDropdown ? "input-open-bottom" : ""
              }`
              : `h-10 px-4 border border-color-border/75 rounded-2xl
                !bg-color-background/60 ${container2Hover}
                font-semibold text-sm text-color-grey text-right backdrop-blur-sm hover:text-color-grey-light tracking-wider ${transitionAll} !duration-200 focus-visible:!outline-none cursor-pointer flex items-center justify-end ${
                openTldDropdown ? "input-open-bottom" : ""
              }`}
            onClick={() => {
              if (openTldDropdown) {
                closeDropdownWithAnimation();
              } else {
                setOpenTldDropdown(true);
                setDropdownAnimation("enter");
              }
              setAllowTldTooltip(false);
              setIsTldTooltipVisible(false);
            }}
            onMouseEnter={handleTldMouseEnter}
            onMouseLeave={handleTldMouseLeave}
            aria-label="Select top level domain"
          >
            {!isModal && (
              <div
                class={`${tooltipButton} tracking-normal ${
                  isTldTooltipVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                SELECT TOP LEVEL DOMAIN
              </div>
            )}
            {formState.root}
          </div>
          {(openTldDropdown || dropdownAnimation === "exit") && (
            <ul
              class={isModal
                ? `${inputFieldDropdown} max-h-[112px] ${dropdownAnimationClass}`
                : `${inputFieldDropdown} !left-0 max-h-[110px] !w-[64px] ${dropdownAnimationClass}`}
            >
              {ROOT_DOMAINS.map((tld) => (
                <li
                  key={tld}
                  class={isModal
                    ? "flex justify-end px-3 py-1.5 text-xs lowercase hover:bg-black/30"
                    : `${inputFieldDropdownHover} !px-[14px] !text-xs !lowercase !justify-end`}
                  onClick={() => handleTldSelect(tld)}
                  onMouseDown={(e) => e.preventDefault()}
                  role="option"
                  aria-selected={formState.root === tld}
                >
                  {tld}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Status and Availability Check Section */}
      {isModal
        ? (
          <div class="flex items-center justify-between gap-3">
            <h6 class="min-w-0 font-medium text-xs text-color-neutral-400">
              {availabilityMessage}
            </h6>
            <ButtonProcessing
              type="button"
              variant="outline"
              color="neutral"
              size="md"
              class="shrink-0"
              isSubmitting={isChecking}
              loadingText="CHECKING"
              onClick={checkAvailability}
              aria-label="Check bitname availability"
            >
              AVAILABILITY
            </ButtonProcessing>
          </div>
        )
        : (
          <div class="flex flex-row justify-between w-full">
            <div class="flex flex-col justify-center items-start">
              <h6 class="font-medium text-sm text-color-grey">
                {availabilityMessage}
              </h6>
            </div>
            <div class="flex flex-col items-end">
              <Button
                type="button"
                variant="outline"
                color="neutral"
                onClick={checkAvailability}
                aria-label="Check bitname availability"
              >
                AVAILABILITY
              </Button>
            </div>
          </div>
        )}
    </form>
  );

  /* ===== FEE CALCULATOR AND STATUS MESSAGES ===== */
  const fees = (
    <div class={isModal ? `${container2} p-3 pt-2` : containerBackground}>
      <FeeCalculatorBase
        fee={formState.fee}
        handleChangeFee={handleChangeFee}
        type="src101"
        fromPage="src101_bitname"
        fileType="application/json"
        fileSize={formState.jsonSize || 0}
        BTCPrice={formState.BTCPrice}
        isSubmitting={isSubmitting}
        onSubmit={handleRegisterWithExactFees}
        {...(isModal ? { onCancel: handleModalClose } : {})}
        buttonName={isConnected ? "REGISTER" : "CONNECT WALLET"}
        tosAgreed={tosAgreed}
        onTosChange={setTosAgreed}
        bitname={formState.toAddress + formState.root}
        feeDetails={mapProgressiveFeeDetails(
          exactFeeDetails || progressiveFeeDetails,
        )}
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

      <StatusMessages
        submissionMessage={submissionMessage}
        apiError={apiError}
      />
    </div>
  );

  /* ===== COMPONENT RENDER ===== */
  if (isModal) {
    return (
      <>
        {form}
        {fees}
        <div
          ref={tooltipOriginRef}
          class="fixed top-0 left-0 w-0 h-0 pointer-events-none z-tooltip"
        >
          <div
            class={`${tooltipImage} ${
              isTldTooltipVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{
              left: `${tldTooltipPosition.x}px`,
              top: `${tldTooltipPosition.y}px`,
              transform: "translate(-50%, calc(-100% - 6px))",
            }}
          >
            SELECT TOP LEVEL DOMAIN
          </div>
        </div>
      </>
    );
  }

  return (
    <div class={`${bodyTool} ${containerGap}`}>
      <h1 class={`${titleNeutral} mx-auto -mb-2 mobileLg:-mb-4`}>
        REGISTER
      </h1>
      {form}
      {fees}
    </div>
  );
}
