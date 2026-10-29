/* ===== COUNTERPARTY FAIRMINT TOOL MODAL ===== */
import { useConfig } from "$client/hooks/useConfig.ts";
import { useFairmintForm } from "$client/hooks/useFairmintForm.ts";
import { walletContext } from "$client/wallet/wallet.ts";
import { ProgressiveEstimationIndicator } from "$components/indicators/ProgressiveEstimationIndicator.tsx";
import {
  inputField,
  inputFieldDropdown,
  inputFieldDropdownHover,
  SRC20InputField,
} from "$form";
import { ModalTool, openModalTool } from "$islands/modal/tool/ModalTool.tsx";
import { container2, containerColForm, handleModalClose } from "$layout";
import { useInputfieldDropdown } from "$lib/hooks/useInputfieldDropdown.ts";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import type { Fairminter } from "$lib/types/services.d.ts";
import { logger } from "$lib/utils/logger.ts";
import {
  mapProgressiveFeeDetails,
  parseServiceFeeSats,
  withServiceFee,
} from "$lib/utils/performance/fees/fee-estimation-utils.ts";
import { StatusMessages } from "$notification";
import { FeeCalculatorBase } from "$section";
import type { Config } from "$types/base.d.ts";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

/* ===== OPENER ===== */
export function openXCPFairmintTool() {
  openModalTool(<XCPFairmintTool />);
}

function fairmintLabel(fairminter: Fairminter): string {
  const asset = fairminter.asset;
  if (asset.startsWith("A") && fairminter.asset_longname) {
    return fairminter.asset_longname;
  }
  return asset;
}

function matchesFairminter(fairminter: Fairminter, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fairminter.asset.toLowerCase().includes(q) ||
    fairmintLabel(fairminter).toLowerCase().includes(q);
}

/* ===== COMPONENT ===== */
export function XCPFairmintTool() {
  const [fairminters, setFairminters] = useState<Fairminter[]>([]);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [searchResults, setSearchResults] = useState<Fairminter[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const dropdown = useInputfieldDropdown();

  const isInputFocusedRef = useRef(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickedAssetRef = useRef<string | null>(null);

  const { wallet, isConnected, showConnectModal } = walletContext;
  const { config } = useConfig<Config>();

  const {
    formState,
    selectAsset,
    handleInputChange,
    handleSubmit,
    handleChangeFee,
    isSubmitting,
    submissionMessage,
    apiError,
  } = useFairmintForm(fairminters);

  const openFairminters = useMemo(
    () =>
      fairminters.filter((fairminter) =>
        fairminter.asset && fairminter.status === "open"
      ),
    [fairminters],
  );

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
    fileType: "application/json",
    fileSize: formState.jsonSize || 0,
    issuance: parseInt(formState.quantity, 10) || 1,
  });

  const progressiveFeeDetails = getBestEstimate();
  const [exactFeeDetails, setExactFeeDetails] = useState<
    typeof progressiveFeeDetails | null
  >(null);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadFairminters = async () => {
      try {
        const response = await fetch("/api/v2/fairmint");
        if (!response.ok) {
          throw new Error(
            `Failed to fetch fairminters: ${response.status}`,
          );
        }
        const data = await response.json();
        if (!cancelled && Array.isArray(data)) {
          setFairminters(data);
        }
      } catch (error) {
        logger.error("stamps", {
          message: "Error fetching fairminters",
          data: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    };

    loadFairminters();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setExactFeeDetails(null);
  }, [formState.fee]);

  useEffect(() => {
    if (isSelecting) return;

    const query = formState.asset.trim();
    if (!query || pickedAssetRef.current === query) return;

    const delay = setTimeout(() => {
      if (!isInputFocusedRef.current) return;
      const filtered = openFairminters.filter((fairminter) =>
        matchesFairminter(fairminter, query)
      );
      setSearchResults(filtered);
      if (filtered.length > 0) {
        dropdown.open();
      } else {
        dropdown.close();
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [formState.asset, openFairminters, isSelecting]);

  const handleFairmintWithExactFees = async () => {
    if (!isConnected) {
      showConnectModal();
      return;
    }
    try {
      const exactFees = await estimateExact();
      if (exactFees) {
        setExactFeeDetails({
          ...exactFees,
          totalValue: exactFees.totalValue || 0,
        });
      }
      await handleSubmit();
    } catch (error) {
      logger.error("stamps", {
        message: "Error in Fairmint exact fee estimation",
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      await handleSubmit();
    }
  };

  const handleAssetFocus = () => {
    isInputFocusedRef.current = true;
    if (isSelecting) return;
    const filtered = openFairminters.filter((fairminter) =>
      matchesFairminter(fairminter, formState.asset)
    );
    setSearchResults(filtered);
    if (filtered.length > 0) {
      dropdown.open();
    }
  };

  const handleAssetBlur = () => {
    isInputFocusedRef.current = false;
    if (blurTimeoutRef.current !== null) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      blurTimeoutRef.current = null;
      dropdown.close();
      setIsSelecting(false);
    }, 200);
  };

  const handleAssetInput = (value: string) => {
    if (isSelecting) return;
    pickedAssetRef.current = null;
    handleInputChange(
      { target: { value } } as unknown as Event,
      "asset",
    );
  };

  const handlePick = (asset: string) => {
    isInputFocusedRef.current = false;
    setIsSelecting(true);
    pickedAssetRef.current = asset;
    selectAsset(asset);
    dropdown.close();
    setSearchResults([]);
    setTimeout(() => setIsSelecting(false), 100);
  };

  const showList = dropdown.isOpen &&
    searchResults.length > 0 && !isSelecting;

  return (
    <ModalTool title="COUNTERPARTY" subtitle="FAIRMINT">
      <form
        class={`${containerColForm} relative z-dropdown`}
        data-testid="fairmint-tool"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Fairmint a Counterparty asset"
        novalidate
      >
        <div
          class={`relative ${showList ? "input-open" : ""}`}
          ref={dropdown.containerRef}
        >
          <SRC20InputField
            type="text"
            placeholder="Asset"
            value={formState.asset}
            onChange={handleAssetInput}
            onFocus={handleAssetFocus}
            onBlur={handleAssetBlur}
          />

          {showList && (
            <ul
              class={`${inputFieldDropdown} max-h-[174px] ${dropdown.listClass}`}
              role="listbox"
              aria-label="Open fairminters"
            >
              {searchResults.map((fairminter) => (
                <li
                  key={fairminter.tx_hash || fairminter.asset}
                  class={inputFieldDropdownHover}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePick(fairminter.asset)}
                  role="option"
                  aria-selected={formState.asset === fairminter.asset}
                >
                  {fairmintLabel(fairminter)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <input
          type="text"
          inputMode="numeric"
          placeholder="Quantity"
          value={formState.quantity}
          onInput={(e) => handleInputChange(e, "quantity")}
          class={inputField}
          aria-label="Quantity"
        />
      </form>

      <div class={`${container2} p-3 pt-2`} data-testid="fee-calculator">
        <FeeCalculatorBase
          fee={formState.fee}
          handleChangeFee={handleChangeFee}
          type="fairmint"
          fileType="application/json"
          fileSize={formState.jsonSize || 0}
          issuance={parseInt(formState.quantity, 10) || 1}
          BTCPrice={formState.BTCPrice}
          isSubmitting={isSubmitting}
          onSubmit={handleFairmintWithExactFees}
          onCancel={handleModalClose}
          buttonName={isConnected ? "FAIRMINT" : "CONNECT WALLET"}
          tosAgreed={tosAgreed}
          onTosChange={setTosAgreed}
          bitname=""
          feeDetails={withServiceFee(
            mapProgressiveFeeDetails(
              exactFeeDetails || progressiveFeeDetails,
            ),
            parseServiceFeeSats(config?.MINTING_SERVICE_FEE),
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
      </div>

      <StatusMessages
        submissionMessage={submissionMessage}
        apiError={apiError}
      />
    </ModalTool>
  );
}
