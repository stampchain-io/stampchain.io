/* ===== SRC-101 REGISTER TOOL MODAL ===== */
import { ButtonProcessing } from "$button";
import { useSRC101Form } from "$client/hooks/userSRC101Form.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { ProgressiveEstimationIndicator } from "$components/indicators/ProgressiveEstimationIndicator.tsx";
import { ROOT_DOMAINS } from "$constants";
import { inputFieldDropdown, inputFieldDropdownHover } from "$form";
import { InputField } from "$islands/form/InputField.tsx";
import { SRC101RegisterInfo } from "$islands/modal/info/SRC101RegisterInfo.tsx";
import { ModalTool, openModalTool } from "$islands/modal/tool/ModalTool.tsx";
import { openSRC101DetailTool } from "$islands/modal/tool/SRC101DetailTool.tsx";
import {
  container2,
  container2Hover,
  containerColForm,
  handleModalClose,
  shadowGlowPurpleSm,
} from "$layout";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import { logger } from "$lib/utils/logger.ts";
import { mapProgressiveFeeDetails } from "$lib/utils/performance/fees/fee-estimation-utils.ts";
import { StatusMessages, tooltipImage } from "$notification";
import { FeeCalculatorBase } from "$section";
import type { ROOT_DOMAIN_TYPES } from "$types/base.d.ts";
import type { SRC101Balance } from "$types/src101.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== OPENER ===== */
export function openSRC101RegisterTool() {
  openModalTool(<SRC101RegisterTool />);
}

/* ===== COMPONENT ===== */
export function SRC101RegisterTool(
  { trxType = "olga" }: { trxType?: "olga" | "multisig" } = {
    trxType: "olga",
  },
) {
  const {
    formState,
    handleChangeFee,
    handleInputChange,
    handleSubmit,
    isSubmitting,
    submissionMessage,
    apiError,
  } = useSRC101Form("mint", trxType);

  const [tosAgreed, setTosAgreed] = useState(false);
  const { isConnected, wallet, showConnectModal } = walletContext;
  const [isExist, setIsExist] = useState(true);
  const [checkStatus, setCheckStatus] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [openTldDropdown, setOpenTldDropdown] = useState(false);
  const tldDropdownRef = useRef<HTMLDivElement>(null);
  const tooltipOriginRef = useRef<HTMLDivElement>(null);
  const [isTldTooltipVisible, setIsTldTooltipVisible] = useState(false);
  const [allowTldTooltip, setAllowTldTooltip] = useState(true);
  const [tldTooltipPosition, setTldTooltipPosition] = useState({
    x: 0,
    y: 0,
  });
  const tldTooltipTimeoutRef = useRef<number | null>(null);
  const [dropdownAnimation, setDropdownAnimation] = useState<
    "enter" | "exit" | null
  >(null);
  const animationTimeoutRef = useRef<number | null>(null);

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
    toolType: "src101-create",
    feeRate: isSubmitting ? 0 : formState.fee,
    walletAddress: wallet?.address || "",
    isConnected: !!wallet && !isSubmitting,
    isSubmitting,
    bitname: formState.toAddress ? formState.toAddress + formState.root : "",
  });

  const progressiveFeeDetails = getBestEstimate();
  const [exactFeeDetails, setExactFeeDetails] = useState<
    typeof progressiveFeeDetails | null
  >(null);

  useEffect(() => {
    setExactFeeDetails(null);
  }, [formState.fee]);

  const connectIfNeeded = () => {
    if (isConnected) return false;
    showConnectModal();
    return true;
  };

  const handleRegisterWithExactFees = async () => {
    if (connectIfNeeded()) return;
    try {
      const exactFees = await estimateExact();
      if (exactFees) {
        const netSpendAmount = exactFees.totalValue || 0;
        setExactFeeDetails({
          ...exactFees,
          totalValue: netSpendAmount,
        });
      }
      await handleSubmit();
    } catch (error) {
      logger.error("stamps", {
        message: "Error in SRC101 register exact fee estimation",
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      await handleSubmit();
    }
  };

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

  const closeDropdownWithAnimation = () => {
    setDropdownAnimation("exit");
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => {
      setOpenTldDropdown(false);
      setDropdownAnimation(null);
    }, 200);
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

  /* The modal card is transformed, so the tooltip is positioned from a
     fixed anchor instead of inside the scrolling field. */
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
    placeTldTooltip();
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

  const handleOpenDetailModal = (data: SRC101Balance) => {
    openSRC101DetailTool({
      img: data.img,
      name: data.tokenid_utf8,
      root: formState.root,
      owner: data.owner,
    });
  };

  const checkAvailability = async (): Promise<boolean> => {
    if (isChecking) return false;
    setCheckStatus(false);
    setIsChecking(true);
    try {
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
        }
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

  const handleTransferSubmit = async (): Promise<void> => {
    try {
      if (!formState.toAddress) return;
      const available = await checkAvailability();
      if (available) await handleRegisterWithExactFees();
    } catch (error) {
      console.error("Transfer error:", (error as Error).message);
    }
  };

  const bitname = (formState.toAddress?.toLowerCase() ?? "") + formState.root;

  return (
    <ModalTool
      title="SRC-101"
      subtitle="BITNAME REGISTRATION"
      info={<SRC101RegisterInfo />}
    >
      <form
        class={`${containerColForm} relative z-dropdown`}
        onSubmit={(e) => {
          e.preventDefault();
          handleTransferSubmit();
        }}
        aria-label="Bitname registration form"
        novalidate
      >
        <div class="flex gap-3 min-w-0">
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

          <div class="relative w-[64px] shrink-0" ref={tldDropdownRef}>
            <div
              class={`h-8 px-3 ${container2Hover} ${shadowGlowPurpleSm}
                font-normal text-xs text-color-neutral-200 text-right
                cursor-pointer flex items-center justify-end ${
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
              {formState.root}
            </div>
            {(openTldDropdown || dropdownAnimation === "exit") && (
              <ul
                class={`${inputFieldDropdown} max-h-[146px] ${
                  dropdownAnimation === "exit"
                    ? "dropdown-exit pointer-events-none"
                    : dropdownAnimation === "enter"
                    ? "dropdown-enter"
                    : ""
                }`}
              >
                {ROOT_DOMAINS.map((tld) => (
                  <li
                    key={tld}
                    class={`${inputFieldDropdownHover} !justify-end !lowercase`}
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

        <div class="flex items-center justify-between gap-3">
          <h6 class="min-w-0 font-medium text-xs text-color-neutral-400">
            {formState.toAddress && checkStatus
              ? isExist ? `${bitname} is registered` : `${bitname} is available`
              : ""}
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
      </form>

      <div class={`${container2} p-3 pt-2`}>
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
          onCancel={handleModalClose}
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
    </ModalTool>
  );
}
