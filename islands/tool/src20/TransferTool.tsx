/* ===== TRANSFER CONTENT COMPONENT ===== */
import { useSRC20Form } from "$client/hooks/useSRC20Form.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { ProgressiveEstimationIndicator } from "$components/indicators/ProgressiveEstimationIndicator.tsx";
import {
  inputFieldDropdown,
  inputFieldDropdownHover,
  SRC20InputField,
} from "$form";
import { TransferToolSkeleton } from "$indicators";
import {
  bodyTool,
  containerBackground,
  containerColForm,
  containerGap,
  rowResponsiveForm,
} from "$layout";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import { logger } from "$lib/utils/logger.ts";
import { mapProgressiveFeeDetails } from "$lib/utils/performance/fees/fee-estimation-utils.ts";
import { stripTrailingZeros } from "$lib/utils/ui/formatting/formatUtils.ts";
import { StatusMessages } from "$notification";
import { FeeCalculatorBase } from "$section";
import { titleNeutral } from "$text";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== INTERFACE DEFINITIONS ===== */
interface Balance {
  tick: string;
  amt: string;
}

/* ===== COMPONENT IMPLEMENTATION ===== */
export function SRC20TransferTool(
  { trxType = "olga" }: { trxType?: "olga" | "multisig" } = { trxType: "olga" },
) {
  /* ===== FORM STATE AND HANDLERS ===== */
  const {
    formState,
    setFormState,
    handleChangeFee,
    handleInputChange,
    handleSubmit,
    config,
    isSubmitting,
    submissionMessage,
    apiError,
    handleInputBlur,
  } = useSRC20Form("transfer", trxType);

  /* ===== LOCAL STATE ===== */
  const [tosAgreed, setTosAgreed] = useState(false);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [searchResults, setSearchResults] = useState<Balance[]>([]);
  const [openDrop, setOpenDrop] = useState<boolean>(false);
  const [isSelecting, setIsSelecting] = useState(false);
  // Animation state for dropdown
  const [dropdownAnimation, setDropdownAnimation] = useState<
    "enter" | "exit" | null
  >(null);

  /* ===== REFS ===== */
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const animationTimeoutRef = useRef<number | null>(null);

  /* ===== WALLET CONTEXT ===== */
  const { wallet, isConnected } = walletContext;

  /* ===== PROGRESSIVE FEE ESTIMATION INTEGRATION ===== */
  const {
    getBestEstimate,
    isPreFetching,
    estimateExact, // Phase 3: Exact estimation before transferring
    // Phase-specific results for UI indicators
    phase1,
    phase2,
    phase3,
    currentPhase,
    error: feeEstimationError,
    clearError,
  } = useTransactionConstructionService({
    toolType: "src20-transfer",
    feeRate: isSubmitting ? 0 : formState.fee,
    walletAddress: wallet?.address || "", // Provide empty string instead of undefined
    isConnected: !!wallet && !isSubmitting,
    isSubmitting,
    // SRC-20 transfer specific parameters
    tick: formState.token,
    amt: formState.amt,
    recipientAddress: formState.toAddress,
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

  // Wrapper function for transferring that gets exact fees first - StampingTool pattern
  const handleTransferWithExactFees = async () => {
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
      // Call the original transfer submission
      await handleSubmit();
    } catch (error) {
      console.error("TRANSFERTOOL: Error in exact fee estimation", error);
      // Still proceed with submission even if exact fees fail
      await handleSubmit();
    }
  };

  /* ===== DROPDOWN ANIMATION HANDLER ===== */
  const closeDropdownWithAnimation = () => {
    setDropdownAnimation("exit");
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => {
      setOpenDrop(false);
      setDropdownAnimation(null);
    }, 200); // Match animation duration
  };

  /* ===== CLICK OUTSIDE HANDLER ===== */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
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

  /* ===== TOKEN SELECTION HANDLER ===== */
  const handleDropDown = (ticker: string, _amount: string) => {
    closeDropdownWithAnimation();
    setIsSelecting(true);

    const selectedBalance = balances.find((b) => b.tick === ticker);
    if (selectedBalance) {
      const maxAmount = stripTrailingZeros(selectedBalance.amt);
      setFormState((prev) => ({
        ...prev,
        token: ticker,
        amt: "",
        maxAmount: maxAmount,
      }));

      // Focus amount input after selection
      setTimeout(() => {
        const amountInput = document.querySelector(
          "[data-amount-input]",
        ) as HTMLInputElement;
        if (amountInput) {
          amountInput.placeholder = `Amount (MAX: ${maxAmount})`;
          amountInput.focus();
          setIsSelecting(false);
        }
      }, 100);
    }
  };

  /* ===== TOKEN INPUT HANDLERS ===== */
  const handleTokenFieldFocus = () => {
    if (!formState.token?.trim() && !isSelecting) {
      setSearchResults(balances);
      setOpenDrop(true);
      setDropdownAnimation("enter");
    }
  };

  const handleTokenBlur = () => {
    setTimeout(() => {
      closeDropdownWithAnimation();
      setIsSelecting(false);
    }, 200);
  };

  /* ===== TOKEN SEARCH EFFECT ===== */
  useEffect(() => {
    if (isSelecting) {
      return;
    }

    if (!formState.token?.trim()) {
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      const filteredResults = balances.filter((item) => {
        const regex = new RegExp(formState.token, "i");
        return regex.test(item.tick);
      });

      setSearchResults(filteredResults);
      if (filteredResults.length > 0) {
        setOpenDrop(true);
        setDropdownAnimation("enter");
      } else {
        closeDropdownWithAnimation();
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [formState.token, balances, isSelecting]);

  /* ===== BALANCE FETCHING EFFECT ===== */
  useEffect(() => {
    const getBalances = async () => {
      if (!wallet?.address) return;

      try {
        const response = await fetch(
          `/api/v2/src20/balance/${wallet.address}`,
          {
            headers: {
              "X-API-Version": "2.3",
            },
          },
        );
        const data = await response.json();

        if (data.data && Array.isArray(data.data)) {
          setBalances(data.data);
        }
      } catch (error) {
        logger.error("stamps", {
          message: "Error fetching balances",
          error,
        });
      }
    };

    getBalances();
  }, [wallet?.address]);

  /* ===== AMOUNT INPUT HANDLER ===== */
  const handleAmountChange = (value: string) => {
    const inputAmount = Number(value);
    const maxAmount = Number(formState.maxAmount);

    if (!isNaN(inputAmount) && !isNaN(maxAmount) && inputAmount > maxAmount) {
      handleInputChange(maxAmount.toString(), "amt");
      return;
    }

    handleInputChange(value, "amt");
  };

  /* ===== TOKEN CHANGE HANDLER ===== */
  const handleTokenChange = (value: string) => {
    console.log("Token input event:", {
      type: "change",
      targetValue: value,
    });
    const newValue = value.toUpperCase();
    if (newValue !== formState.token && !isSelecting) {
      handleInputChange(newValue, "token");
      setOpenDrop(true);
      setDropdownAnimation("enter");
    }
  };

  /* ===== COMPONENT RENDER ===== */
  useEffect(() => {
    console.log("Token input ref:", tokenInputRef.current);
  }, []);

  /* ===== CONFIG CHECK ===== */
  if (!config) {
    return (
      <div class={`${bodyTool} ${containerGap}`}>
        <h1 class={`${titleNeutral} mx-auto -mb-2 mobileLg:-mb-4`}>
          TRANSFER
        </h1>
        <TransferToolSkeleton />
      </div>
    );
  }

  return (
    <div class={`${bodyTool} ${containerGap}`}>
      <h1 class={`${titleNeutral} mx-auto -mb-2 mobileLg:-mb-4`}>
        TRANSFER
      </h1>

      {/* ===== FORM  ===== */}
      <form
        class={`${containerBackground} ${containerColForm} relative z-dropdown`}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        aria-label="Transfer SRC20 tokens"
        novalidate
      >
        {/* ===== TOKEN AND AMOUNT INPUTS ===== */}
        <div class={rowResponsiveForm}>
          {/* Token Input with Dropdown */}
          <div
            class={`relative ${
              openDrop && searchResults.length > 0 && !isSelecting
                ? "input-open"
                : ""
            }`}
            ref={dropdownRef}
          >
            <SRC20InputField
              type="text"
              placeholder="Token"
              value={formState.token}
              onChange={handleTokenChange}
              onFocus={handleTokenFieldFocus}
              onBlur={handleTokenBlur}
              isUppercase
              aria-label="Select token"
            />

            {/* Token Dropdown */}
            {(openDrop || dropdownAnimation === "exit") &&
              searchResults.length > 0 && !isSelecting && (
              <ul
                class={`${inputFieldDropdown} max-h-[111px] min-[420px]:max-h-[74px]
                ${
                  dropdownAnimation === "exit"
                    ? "dropdown-exit"
                    : dropdownAnimation === "enter"
                    ? "dropdown-enter"
                    : ""
                }
              `}
                role="listbox"
                aria-label="Available tokens"
              >
                {searchResults.map((result) => (
                  <li
                    key={result.tick}
                    class={`${inputFieldDropdownHover}`}
                    onClick={() => handleDropDown(result.tick, result.amt)}
                    onMouseDown={(e) => e.preventDefault()}
                    role="option"
                    aria-selected={formState.token === result.tick}
                  >
                    {result.tick}
                    <h6 class="text-xs text-color-grey">
                      {stripTrailingZeros(result.amt)}
                    </h6>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Amount Input */}
          <SRC20InputField
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Amount"
            value={formState.amt}
            onChange={handleAmountChange}
            onBlur={() => handleInputBlur("amt")}
            error={formState.amtError}
            data-amount-input
            aria-label="Amount to transfer"
          />
        </div>

        {/* ===== RECIPIENT ADDRESS INPUT ===== */}
        <SRC20InputField
          type="text"
          placeholder="Recipient address"
          value={formState.toAddress}
          onChange={(e) => handleInputChange(e, "toAddress")}
          onBlur={() => handleInputBlur("toAddress")}
          error={formState.toAddressError}
          aria-label="Recipient address"
        />
      </form>

      {/* ===== FEE CALCULATOR ===== */}
      <div class={containerBackground}>
        <FeeCalculatorBase
          fee={formState.fee}
          handleChangeFee={handleChangeFee}
          BTCPrice={formState.BTCPrice}
          isSubmitting={isSubmitting}
          onSubmit={handleTransferWithExactFees}
          buttonName={isConnected ? "TRANSFER" : "CONNECT WALLET"}
          tosAgreed={tosAgreed}
          onTosChange={setTosAgreed}
          type="src20"
          fromPage="src20_transfer"
          bitname=""
          src20TransferDetails={{
            address: formState.toAddress,
            token: formState.token,
            amount: Number(formState.amt) || 0,
          }}
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

        {/* ===== STATUS MESSAGES ===== */}
        <StatusMessages
          submissionMessage={submissionMessage}
          apiError={apiError}
        />
      </div>
    </div>
  );
}
