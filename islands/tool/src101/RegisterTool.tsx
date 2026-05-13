/* ===== SRC101 BITNAME REGISTRATION COMPONENT ===== */
import { Button } from "$button";
import { useSRC101Form } from "$client/hooks/userSRC101Form.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { ProgressiveEstimationIndicator } from "$components/indicators/ProgressiveEstimationIndicator.tsx";
import { ROOT_DOMAINS } from "$constants";
import { inputFieldDropdown, inputFieldDropdownHover } from "$form";
import { RegisterToolSkeleton } from "$indicators";
import { InputField } from "$islands/form/InputField.tsx";
import DetailSRC101Modal from "$islands/modal/DetailSRC101Modal.tsx";
import { openModal } from "$islands/modal/states.ts";
import {
  bodyTool,
  containerBackground,
  containerGap,
  container2Hover,
  transitionAll,
} from "$layout";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import { logger } from "$lib/utils/logger.ts";
import { mapProgressiveFeeDetails } from "$lib/utils/performance/fees/fee-estimation-utils.ts";
import { StatusMessages, tooltipButton } from "$notification";
import { FeeCalculatorBase } from "$section";
import { titleNeutralLD } from "$text";
import type { ROOT_DOMAIN_TYPES } from "$types/base.d.ts";
import type { SRC101Balance } from "$types/src101.d.ts";
import type { SRC101RegisterToolProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== COMPONENT INTERFACE ===== */

/* ===== MAIN COMPONENT IMPLEMENTATION ===== */
export function SRC101RegisterTool({
  trxType = "olga",
}: SRC101RegisterToolProps) {
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
  const { isConnected, wallet } = walletContext;
  const [isExist, setIsExist] = useState(true);
  const [checkStatus, setCheckStatus] = useState(false);
  const [_modalData, setModalData] = useState<SRC101Balance | null>(null);
  const [openTldDropdown, setOpenTldDropdown] = useState<boolean>(false);
  const [isSelectingTld, setIsSelectingTld] = useState(false);
  const tldDropdownRef = useRef<HTMLDivElement>(null);
  const [isTldTooltipVisible, setIsTldTooltipVisible] = useState(false);
  const [allowTldTooltip, setAllowTldTooltip] = useState(true);
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
    // Clear exact fee details when fee rate changes so slider updates work
    setExactFeeDetails(null);
  }, [formState.fee]);

  // Wrapper function for registering that gets exact fees first - StampingTool pattern
  const handleRegisterWithExactFees = async () => {
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
      // Call the original register submission
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
  useEffect(() => {
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
  }, []);

  /* ===== ANIMATION CLEANUP ===== */
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  /* ===== TOOLTIP CLEANUP ===== */
  useEffect(() => {
    return () => {
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
    setIsSelectingTld(true);
    handleInputChange(
      {
        target: { value: tld },
      } as Event & { target: { value: string } },
      "root",
    );
    setIsSelectingTld(false);
  };

  /* ===== TOOLTIP HANDLERS ===== */
  const handleTldMouseEnter = () => {
    if (allowTldTooltip) {
      if (tldTooltipTimeoutRef.current) {
        globalThis.clearTimeout(tldTooltipTimeoutRef.current);
      }
      tldTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsTldTooltipVisible(true);
      }, 1500);
    }
  };

  const handleTldMouseLeave = () => {
    if (tldTooltipTimeoutRef.current) {
      globalThis.clearTimeout(tldTooltipTimeoutRef.current);
    }
    setIsTldTooltipVisible(false);
    setAllowTldTooltip(true);
  };

  /* ===== CONFIG CHECK ===== */
  if (!config) {
    return (
      <div class={`${bodyTool} ${containerGap}`}>
        <h1 class={`${titleNeutralLD} mx-auto -mb-2 mobileLg:-mb-4`}>
          REGISTER
        </h1>
        <RegisterToolSkeleton />
      </div>
    );
  }

  /* ===== MODAL HANDLERS ===== */
  const handleOpenDetailModal = (data: SRC101Balance) => {
    const modalContent = (
      <DetailSRC101Modal
        img={data.img}
        name={data.tokenid_utf8}
        owner={data.owner}
      />
    );
    openModal(modalContent, "zoomInOut");
  };

  /* ===== SUBMISSION HANDLERS ===== */
  const handleTransferSubmit = async (): Promise<void> => {
    try {
      if (!formState.toAddress) return;
      const checkStatus = await checkAvailability();
      if (checkStatus) {
        await handleRegisterWithExactFees();
      }
    } catch (error) {
      console.error("Transfer error:", (error as Error).message);
    }
  };

  /* ===== AVAILABILITY CHECK ===== */
  const checkAvailability = async (): Promise<boolean> => {
    setCheckStatus(false);
    try {
      // Encode only the domain name without TLD to match DB storage format
      // The mint operation stores btoa(toAddress), not btoa(toAddress + root)
      const url =
        `/api/v2/src101/77fb147b72a551cf1e2f0b37dccf9982a1c25623a7fe8b4d5efaac566cf63fed/${
          btoa(formState.toAddress?.toLowerCase())
        }`;
      const res = await fetch(url);
      const jsonData = await res.json();
      setCheckStatus(true);
      if (res.status === 200) {
        if (jsonData?.data.length) {
          setIsExist(true);
          handleOpenDetailModal(jsonData.data[0]);
          return false;
        } else {
          setIsExist(false);
          setModalData(null);
          return true;
        }
      }
      return false;
    } catch (_error: unknown) {
      return false;
    }
  };

  /* ===== COMPONENT RENDER ===== */
  return (
    <div class={`${bodyTool} ${containerGap}`}>
      <h1 class={`${titleNeutralLD} mx-auto -mb-2 mobileLg:-mb-4`}>
        REGISTER
      </h1>

      <form
        class={`${containerBackground} gap-5 relative z-dropdown`}
        onSubmit={(e) => {
          e.preventDefault();
          handleTransferSubmit();
        }}
        aria-label="Bitname registration form"
        novalidate
      >
        <div class="flex gap-5">
          {/* Bitname Input Field */}
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

          {/* TLD Dropdown InputField - styled like container2/Hover */}
          <div class="relative w-[64px]" ref={tldDropdownRef}>
            <div
              class={`h-10 px-4 border border-color-border/75 rounded-2xl
                !bg-color-background/60 ${container2Hover}
                font-semibold text-sm text-color-grey text-right backdrop-blur-sm hover:text-color-grey-light tracking-wider ${transitionAll} !duration-200 focus-visible:!outline-none cursor-pointer flex items-center justify-end ${
                openTldDropdown && !isSelectingTld ? "input-open-bottom" : ""
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
              <div
                class={`${tooltipButton} tracking-normal ${
                  isTldTooltipVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                SELECT TOP LEVEL DOMAIN
              </div>
              {formState.root}
            </div>
            {(openTldDropdown || dropdownAnimation === "exit") && (
              <ul
                class={`${inputFieldDropdown} !left-0 max-h-[110px] !w-[64px]
                ${
                  dropdownAnimation === "exit"
                    ? "dropdown-exit"
                    : dropdownAnimation === "enter"
                    ? "dropdown-enter"
                    : ""
                }
              `}
              >
                {ROOT_DOMAINS.map((tld) => (
                  <li
                    key={tld}
                    class={`${inputFieldDropdownHover} !px-[14px] !text-xs !lowercase !justify-end`}
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
        <div class="flex flex-row justify-between w-full">
          <div class="flex flex-col justify-center items-start">
            {/* message - default:noDisplay / display on user input & onClick - either already registered or available */}
            <h6 class="font-medium text-sm text-color-grey">
              {formState.toAddress && checkStatus
                ? isExist
                  ? `${
                    formState.toAddress.toLowerCase() + formState.root
                  } is already registered`
                  : `${
                    formState.toAddress.toLowerCase() + formState.root
                  } is available`
                : ""}
            </h6>
          </div>
          <div class="flex flex-col items-end">
            <Button
              type="button"
              variant="outline"
              color="grey"
              size="mdR"
              onClick={checkAvailability}
              aria-label="Check bitname availability"
            >
              AVAILABILITY
            </Button>
          </div>
        </div>
      </form>

      {/* ===== FEE CALCULATOR AND STATUS MESSAGES ===== */}
      <div class={containerBackground}>
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
    </div>
  );
}
