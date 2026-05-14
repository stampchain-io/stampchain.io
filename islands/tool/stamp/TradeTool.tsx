/* ===== TRADE CONTENT COMPONENT ===== */
/*
 * 🚨 MIGRATION NEEDED: This component needs to be aligned with the unified fee estimation system.
 *
 * Current State: Uses 3 separate useTransactionConstructionService instances for attach/detach/dispense operations
 * Required Changes:
 * 1. Remove '_' prefixes from unused variables in all 3 estimator instances
 * 2. Add exact fee handling wrappers (handleAttachWithExactFees, handleDetachWithExactFees, handleDispenseWithExactFees)
 * 3. Add exactFeeDetails state management for each operation
 * 4. Update FeeCalculatorBase props to use mapProgressiveFeeDetails(exactFeeDetails || progressiveFeeDetails)
 * 5. Add 3-phase indicators for each operation
 * 6. Add error handling for feeEstimationError and clearError
 *
 * Reference: See StampingTool.tsx, SendTool.tsx, MintTool.tsx for the unified pattern
 * Priority: LOW - Component is not actively used in production
 */
import { walletContext } from "$client/wallet/wallet.ts";
import { useTransactionConstructionService } from "$lib/hooks/useTransactionConstructionService.ts";
import { logger } from "$lib/utils/logger.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { useCallback, useEffect, useState } from "preact/hooks";

import { Button } from "$button";
import { InputField } from "$form";
import { bodyTool, containerBackground, containerGap } from "$layout";
import type { UTXO, XcpBalance } from "$lib/types/index.d.ts";
import { normalizeFeeRate } from "$lib/utils/fees.ts";
import { StatusMessages } from "$notification";
import { subtitleNeutral, titleNeutral } from "$text";
import type { ComposeAttachOptions } from "$types/services.d.ts";

/* ===== CONSTANTS ===== */
const SIGHASH_SINGLE = 0x03;
const SIGHASH_ANYONECANPAY = 0x80;
const SIGHASH_SINGLE_ANYONECANPAY = SIGHASH_SINGLE | SIGHASH_ANYONECANPAY; // 131
const MAX_FEE_RATE_VB = 500; // maximum sat/vB
const MIN_UTXO_VALUE = 546; // Minimum UTXO value in satoshis

/* ===== TYPES ===== */
interface InputToSign {
  index: number;
}

interface StatusMessageType {
  message: string;
  txid?: string;
}

/* ===== COMPONENT ===== */
export function StampTradeTool() {
  /* ===== STATE ===== */
  const [availableAssets, setAvailableAssets] = useState<XcpBalance[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [_maxQuantity, setMaxQuantity] = useState<number | null>(null);
  const [availableUtxos, setAvailableUtxos] = useState<UTXO[]>([]);
  const [isLoadingUtxos, setIsLoadingUtxos] = useState(false);
  const { wallet, isConnected, showConnectModal } = walletContext;
  const address = wallet.address;

  const [tradeFormState, setTradeFormState] = useState({
    utxo: "",
    salePrice: "",
    BTCPrice: 0,
    psbtHex: "",
  });

  const [attachFormState, setAttachFormState] = useState({
    cpid: "",
    quantity: "",
    feeRateVB: "",
    utxo: "",
    psbtHex: "",
  });

  const [buyerFormState, setBuyerFormState] = useState({
    sellerPsbtHex: "",
    buyerUtxo: "",
    salePrice: "",
    feeRate: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<
    StatusMessageType | null
  >(null);
  const [apiError, setApiError] = useState<string | null>(null);

  /* ===== 🚀 PROGRESSIVE FEE ESTIMATION - CREATE PSBT ===== */
  const {
    getBestEstimate: getCreatePsbtBestEstimate,
    isEstimating: _createPsbtIsEstimating,
    isPreFetching: createPsbtIsPreFetching,
    estimateExact: _createPsbtEstimateExact,
    // Phase-specific results
    phase1: createPsbtPhase1,
    phase2: _createPsbtPhase2,
    phase3: createPsbtPhase3,
    currentPhase: _createPsbtPhase,
    error: createPsbtFeeError,
    clearError: _createPsbtClearError,
  } = useTransactionConstructionService({
    toolType: "stamp", // Trade operations use stamp toolType
    feeRate: isSubmitting ? 0 : 1, // Default to 1 sat/vB for trades
    walletAddress: wallet?.address || "", // Provide empty string instead of undefined
    isConnected: !!wallet && !isSubmitting,
    isSubmitting,
    // Trade-specific parameters for PSBT creation
    ...(tradeFormState.utxo && { utxoString: tradeFormState.utxo }),
    ...(tradeFormState.salePrice && {
      saleAmount: parseFloat(tradeFormState.salePrice) * 100000000, // Convert BTC to sats
    }),
  });

  // Get the best available fee estimate
  const createPsbtFeeDetails = getCreatePsbtBestEstimate();

  /* ===== 🚀 PROGRESSIVE FEE ESTIMATION - UTXO ATTACH ===== */
  const {
    getBestEstimate: getAttachBestEstimate,
    isEstimating: _attachIsEstimating,
    isPreFetching: attachIsPreFetching,
    estimateExact: _attachEstimateExact,
    // Phase-specific results
    phase1: attachPhase1,
    phase2: _attachPhase2,
    phase3: attachPhase3,
    currentPhase: _attachPhase,
    error: attachFeeError,
    clearError: _attachClearError,
  } = useTransactionConstructionService({
    toolType: "stamp", // Attach operations use stamp toolType
    feeRate: attachFormState.feeRateVB
      ? parseInt(attachFormState.feeRateVB)
      : 0,
    walletAddress: wallet?.address || "", // Provide empty string instead of undefined
    isConnected: !!wallet && !isSubmitting,
    isSubmitting,
    // Attach-specific parameters
    ...(attachFormState.cpid && { asset: attachFormState.cpid }),
    ...(attachFormState.quantity &&
      { quantity: parseInt(attachFormState.quantity) }),
    ...(attachFormState.utxo && { utxoString: attachFormState.utxo }),
  });

  // Get the best available fee estimate
  const attachFeeDetails = getAttachBestEstimate();

  /* ===== 🚀 PROGRESSIVE FEE ESTIMATION - COMPLETE SWAP ===== */
  const {
    getBestEstimate: getSwapBestEstimate,
    isEstimating: _swapIsEstimating,
    isPreFetching: swapIsPreFetching,
    estimateExact: _swapEstimateExact,
    // Phase-specific results
    phase1: swapPhase1,
    phase2: _swapPhase2,
    phase3: swapPhase3,
    currentPhase: _swapPhase,
    error: swapFeeError,
    clearError: _swapClearError,
  } = useTransactionConstructionService({
    toolType: "stamp", // Swap completion uses stamp toolType
    feeRate: buyerFormState.feeRate ? parseInt(buyerFormState.feeRate) : 0,
    walletAddress: wallet?.address || "", // Provide empty string instead of undefined
    isConnected: !!wallet && !isSubmitting,
    isSubmitting,
    // Swap-specific parameters
    ...(buyerFormState.buyerUtxo && { utxoString: buyerFormState.buyerUtxo }),
    ...(buyerFormState.sellerPsbtHex && {
      psbtSize: buyerFormState.sellerPsbtHex.length / 2, // Hex to bytes
    }),
  });

  // Get the best available fee estimate
  const swapFeeDetails = getSwapBestEstimate();

  /* ===== EFFECTS ===== */
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch("/api/internal/btcPrice");
        if (response.ok) {
          const data = await response.json();
          const price = data.data?.price || 0;
          setTradeFormState((prev) => ({ ...prev, BTCPrice: price }));
        } else {
          console.warn("Failed to fetch BTC price");
          setTradeFormState((prev) => ({ ...prev, BTCPrice: 0 }));
        }
      } catch (error) {
        console.error("Error fetching BTC price:", error);
        setTradeFormState((prev) => ({ ...prev, BTCPrice: 0 }));
      }
    };
    fetchPrice();
  }, []);

  // Component mount/unmount logging
  useEffect(() => {
    logger.debug("ui", {
      message: "TradeTool mounted",
      component: "TradeTool",
    });
    return () => {
      logger.debug("ui", {
        message: "TradeTool unmounting",
        component: "TradeTool",
      });
    };
  }, []);

  // Handle fee estimation errors for Create PSBT
  useEffect(() => {
    if (createPsbtFeeError) {
      logger.debug("system", {
        message: "Fee estimation error in TradeTool - Create PSBT",
        error: createPsbtFeeError,
      });
    }
  }, [createPsbtFeeError]);

  // Handle fee estimation errors for UTXO Attach
  useEffect(() => {
    if (attachFeeError) {
      logger.debug("system", {
        message: "Fee estimation error in TradeTool - UTXO Attach",
        error: attachFeeError,
      });
    }
  }, [attachFeeError]);

  // Handle fee estimation errors for Complete Swap
  useEffect(() => {
    if (swapFeeError) {
      logger.debug("system", {
        message: "Fee estimation error in TradeTool - Complete Swap",
        error: swapFeeError,
      });
    }
  }, [swapFeeError]);

  /* ===== EVENT HANDLERS ===== */
  const handleTradeInputChange = (e: Event, field: string) => {
    const value = (e.target as HTMLInputElement).value;
    setTradeFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleAttachInputChange = (e: Event, field: string) => {
    const value = (e.target as HTMLInputElement).value;
    setAttachFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleBuyerInputChange = (e: Event, field: string) => {
    const value = (e.target as HTMLInputElement).value;
    setBuyerFormState((prev) => ({ ...prev, [field]: value }));
  };

  /* ===== PSBT HANDLERS ===== */
  const handleCreatePSBT = async () => {
    if (!isConnected) {
      showConnectModal();
      return;
    }

    setIsSubmitting(true);
    setSubmissionMessage({ message: "Please wait..." });
    setApiError(null);

    try {
      const { utxo, salePrice } = tradeFormState;

      // Validate inputs
      if (!utxo || !salePrice) {
        showToast(
          "Please fill in all fields with valid values.",
          "error",
          false,
        );
        setIsSubmitting(false);
        return;
      }

      // Create PSBT by calling the backend API
      const response = await fetch("/api/v2/trx/create_psbt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utxo,
          salePrice: parseFloat(salePrice),
          sellerAddress: address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showToast(`Error creating PSBT.\n${errorData.error}`, "error");
        setIsSubmitting(false);
        return;
      }

      const data = await response.json();
      const psbtHex = data.psbt; // PSBT is now in hex format

      console.log("Received PSBT hex:", psbtHex);

      // Sign PSBT using wallet connect
      const walletResult = await walletContext.signPSBT(
        wallet,
        psbtHex,
        [{ index: 0 }], // Inputs to sign (seller's input at index 0)
        true, // Enable RBF
        [SIGHASH_SINGLE_ANYONECANPAY],
        false, // Set autoBroadcast to false
      );

      if (walletResult.signed) {
        showToast(
          "PSBT signed successfully!\nShare the signed PSBT with the buyer.",
          "success",
          false,
        );
        setSubmissionMessage({
          message: "PSBT signed successfully. Here's the signed PSBT hex:",
        });
        setTradeFormState((prev) => ({ ...prev, psbtHex: walletResult.psbt }));
      } else if (walletResult.cancelled) {
        showToast("PSBT signing cancelled by user.", "info");
        setSubmissionMessage({
          message: "PSBT signing cancelled by user.",
        });
      } else {
        showToast(`PSBT signing failed.\n${walletResult.error}`, "error");
        setSubmissionMessage({
          message: `PSBT signing failed.\n${walletResult.error}`,
        });
      }
    } catch (error) {
      console.error("Error creating or signing PSBT:", error);
      setApiError(
        "An unexpected error occurred during PSBT creation or signing.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUtxoAttach = async () => {
    if (!isConnected) {
      showConnectModal();
      return;
    }

    setIsSubmitting(true);
    setSubmissionMessage({ message: "Please wait..." });
    setApiError(null);

    try {
      const { cpid, quantity, feeRateVB, utxo } = attachFormState;

      // Validate required inputs first
      if (!cpid || !quantity || !feeRateVB || !utxo || !address) {
        setApiError("Please fill in all fields with valid values.");
        setIsSubmitting(false);
        return;
      }

      // Normalize fee rate first - this includes validation
      let normalizedFees;
      try {
        normalizedFees = normalizeFeeRate({
          satsPerVB: Number(feeRateVB),
        });
      } catch (error) {
        setApiError(
          error instanceof Error ? error.message : "Invalid fee rate",
        );
        setIsSubmitting(false);
        return;
      }

      // Additional fee rate bounds checking if needed
      if (normalizedFees.normalizedSatsPerVB > MAX_FEE_RATE_VB) {
        setApiError(`Fee rate should not exceed ${MAX_FEE_RATE_VB} sat/vB`);
        setIsSubmitting(false);
        return;
      }

      // Prepare the request body for new endpoint
      const requestBody: {
        address: string;
        identifier: string;
        quantity: number;
        inputs_set: string;
        options: Partial<ComposeAttachOptions>;
      } = {
        address,
        identifier: cpid,
        quantity: parseInt(quantity, 10),
        inputs_set: utxo,
        options: {
          fee_per_kb: normalizedFees.normalizedSatsPerKB,
          return_psbt: true,
          extended_tx_info: true,
          regular_dust_size: 588,
        },
      };

      // Call the new endpoint
      const response = await fetch("/api/v2/trx/stampattach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setApiError(`Error creating PSBT: ${errorData.error}`);
        setIsSubmitting(false);
        return;
      }

      const data = await response.json();
      const psbtHex = data.psbt;
      const inputsToSign: InputToSign[] = data.inputsToSign.map((
        input: { index: number },
      ) => ({
        index: input.index,
      }));

      console.log("Received PSBT hex:", psbtHex);

      // Sign PSBT using wallet connect
      const walletResult = await walletContext.signPSBT(
        wallet,
        psbtHex,
        inputsToSign,
        true, // Enable RBF
        undefined, // Omit sighashTypes to use default
        true, // Set autoBroadcast to true
      );

      if (walletResult.signed) {
        setSubmissionMessage({
          message: "Transaction signed and broadcast successfully!",
        });
        setAttachFormState((prev) => ({ ...prev, psbtHex: walletResult.psbt }));
      } else if (walletResult.cancelled) {
        setSubmissionMessage({
          message: "PSBT signing cancelled by user.",
        });
      } else {
        setSubmissionMessage({
          message: `PSBT signing failed: ${walletResult.error}`,
        });
      }
    } catch (error: unknown) {
      console.error("Error creating or signing PSBT:", error);
      setApiError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSwap = async () => {
    if (!isConnected) {
      showConnectModal();
      return;
    }

    setIsSubmitting(true);
    setSubmissionMessage({ message: "Please wait..." });
    setApiError("");

    try {
      const { sellerPsbtHex, buyerUtxo, feeRate } = buyerFormState;

      // Field validation
      if (!sellerPsbtHex.trim()) {
        setApiError("Seller PSBT Hex is required.");
        setIsSubmitting(false);
        return;
      }

      if (!buyerUtxo.trim()) {
        setApiError("Your UTXO is required.");
        setIsSubmitting(false);
        return;
      }

      if (!feeRate || isNaN(Number(feeRate)) || Number(feeRate) <= 0) {
        setApiError("Fee Rate must be a positive number.");
        setIsSubmitting(false);
        return;
      }

      const parsedFeeRate = Number(feeRate);

      // Call the API to complete the PSBT
      const response = await fetch("/api/v2/trx/complete_psbt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerPsbtHex,
          buyerUtxo,
          buyerAddress: address,
          feeRate: parsedFeeRate,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error: ${text}`);
      }

      const data = await response.json();
      const completedPsbt = data.completedPsbt;

      if (!completedPsbt) {
        throw new Error("Received empty PSBT from server");
      }

      // Sign the completed PSBT with the wallet
      const signResult = await walletContext.signPSBT(
        wallet,
        completedPsbt,
        [{ index: 1 }], // Buyer's input is at index 1
        true, // Enable RBF
        [SIGHASH_SINGLE_ANYONECANPAY], // Use the same sighash as seller
        true, // autoBroadcast
      );

      if (!signResult.signed) {
        console.error("Sign result:", signResult);
        throw new Error(signResult.error || "Failed to sign PSBT");
      }

      setSubmissionMessage({
        message: "Swap completed and broadcast successfully!",
      });
    } catch (error: unknown) {
      console.error("Complete swap error:", error);
      setApiError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===== QUERY HANDLERS ===== */
  const handleQueryUtxos = useCallback(async () => {
    if (!isConnected) {
      showConnectModal();
      return;
    }

    setIsLoadingUtxos(true);
    setApiError(null);

    try {
      console.log("Querying UTXOs for address:", address);
      const response = await fetch(
        `/api/internal/utxoquery?address=${address}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch UTXOs");
      }

      const data = await response.json();
      console.log("Raw response data:", data);

      // Validate the response structure
      if (!data || !data.utxos) {
        console.error("Invalid response structure:", data);
        throw new Error("Invalid response format from server");
      }

      // Ensure we have an array of UTXOs
      if (!Array.isArray(data.utxos)) {
        console.error("UTXOs is not an array:", data.utxos);
        throw new Error("Server returned invalid UTXO format");
      }

      // Filter UTXOs >= 546 sats and sort them
      const filteredAndSortedUtxos = [...data.utxos]
        .filter((utxo: UTXO) =>
          utxo.value !== undefined && utxo.value >= MIN_UTXO_VALUE
        )
        .sort((a: UTXO, b: UTXO) => a.value - b.value);

      console.log(`Received ${data.utxos.length} total UTXOs`);
      console.log(
        `Filtered to ${filteredAndSortedUtxos.length} spendable UTXOs (>= ${MIN_UTXO_VALUE} sats)`,
      );

      if (filteredAndSortedUtxos.length === 0) {
        setApiError(`No UTXOs found with value >= ${MIN_UTXO_VALUE} sats`);
        return;
      }

      setAvailableUtxos(filteredAndSortedUtxos);
      console.log(
        `Successfully set ${filteredAndSortedUtxos.length} spendable UTXOs`,
      );
    } catch (error) {
      console.error("Error fetching UTXOs:", error);
      setApiError(
        error instanceof Error ? error.message : "Failed to fetch UTXOs",
      );
    } finally {
      setIsLoadingUtxos(false);
    }
  }, [address, isConnected]);

  const handleQueryAssets = useCallback(async () => {
    if (!isConnected) {
      showConnectModal();
      return;
    }

    if (!address) {
      setApiError("No wallet address available");
      return;
    }

    setIsLoadingAssets(true);
    setApiError(null);

    try {
      console.log("Querying assets for address:", address);
      const response = await fetch(
        `/api/v2/balance/getStampsBalance?address=${
          encodeURIComponent(address)
        }`,
        { method: "GET" },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch assets");
      }

      const data = await response.json();
      console.log("Raw asset response data:", data);

      if (!data.stampBalance || !Array.isArray(data.stampBalance)) {
        throw new Error("Invalid response format from server");
      }

      // Sort assets by CPID
      const sortedAssets = [...data.stampBalance].sort((a, b) =>
        a.cpid.localeCompare(b.cpid)
      );

      console.log(`Received ${sortedAssets.length} assets`);

      if (sortedAssets.length === 0) {
        setApiError("No assets found for this address");
        return;
      }

      setAvailableAssets(sortedAssets);
      console.log(`Successfully set ${sortedAssets.length} assets`);
    } catch (error) {
      console.error("Error fetching assets:", error);
      setApiError(
        error instanceof Error ? error.message : "Failed to fetch assets",
      );
    } finally {
      setIsLoadingAssets(false);
    }
  }, [address, isConnected]);

  /* ===== SELECTION HANDLERS ===== */
  const handleUtxoSelection = (utxo: UTXO) => {
    const utxoString = `${utxo.txid}:${utxo.vout}`;
    setAttachFormState((prev) => ({ ...prev, utxo: utxoString }));
  };

  const handleAssetSelection = (asset: XcpBalance) => {
    setAttachFormState((prev) => ({
      ...prev,
      cpid: asset.cpid,
      quantity: "", // Clear the quantity field instead of auto-filling
    }));
    setMaxQuantity(asset.quantity);
  };

  /* ===== RENDER ===== */
  return (
    <div class={`${bodyTool} ${containerGap}`}>
      {/* ===== SELLER SECTION ===== */}
      <h1 class={`${titleNeutral} mx-auto -mb-2 mobileLg:-mb-4`}>
        TRADE
      </h1>

      {/* ===== CREATE PSBT FORM ===== */}
      <div class={containerBackground}>
        <h2 class={`${subtitleNeutral} mx-auto`}>SELLER</h2>
        <h3 class=" font-bold text-xl text-color-grey-semilight mb-2">
          CREATE PSBT
        </h3>

        {/* ===== 🎯 INLINE FEE STATUS DISPLAY - CREATE PSBT ===== */}
        {createPsbtFeeDetails && (
          <div className="mb-4 p-3 bg-color-grey-semidark/50 rounded-2xl border border-color-grey-light/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-color-grey-light">
                Estimated Fees:
              </span>
              {/* Phase indicators following StampingTool pattern */}
              <div className="flex items-center gap-1">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    createPsbtPhase1 ? "bg-green-400" : "bg-color-grey-light/30"
                  }`}
                  title="Phase 1: Instant estimate"
                >
                </div>
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    createPsbtIsPreFetching
                      ? "bg-blue-400 animate-pulse"
                      : "bg-color-grey-light/30"
                  }`}
                  title="Phase 2: Smart UTXO estimate"
                >
                </div>
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    createPsbtPhase3 ? "bg-green-400" : "bg-color-grey-light/30"
                  }`}
                  title="Phase 3: Exact estimate"
                >
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-color-grey-light">Miner Fee:</span>
                <span className="ml-2 text-white">
                  {createPsbtFeeDetails.minerFee} sats
                </span>
              </div>
              <div>
                <span className="text-color-grey-light">Total Value:</span>
                <span className="ml-2 text-white">
                  {createPsbtFeeDetails.totalValue} sats
                </span>
              </div>
            </div>
            {createPsbtIsPreFetching && (
              <div className="mt-2 text-xs text-blue-400 animate-pulse">
                💡 Smart UTXO analysis in progress...
              </div>
            )}
          </div>
        )}

        <div class="flex flex-col gap-5">
          <InputField
            type="text"
            placeholder="UTXO (e.g., txid:vout)"
            value={tradeFormState.utxo}
            onChange={(e) => handleTradeInputChange(e, "utxo")}
          />

          <InputField
            type="number"
            placeholder="Sale Price (BTC)"
            value={tradeFormState.salePrice}
            onChange={(e) => handleTradeInputChange(e, "salePrice")}
            step="0.00000001"
            min="0"
          />
        </div>

        <div class="flex justify-end mt-5">
          <Button
            variant="flat"
            color="grey"
            size="mdR"
            onClick={handleCreatePSBT}
            disabled={isSubmitting}
          >
            {isSubmitting ? "PROCESSING" : "CREATE PSBT"}
          </Button>
        </div>

        <StatusMessages
          submissionMessage={submissionMessage}
          apiError={apiError}
          walletError={null}
        />

        {tradeFormState.psbtHex && (
          <div class={`${containerBackground} break-words mt-6`}>
            <h2 class="text-xl font-bold mb-2">Signed PSBT (Hex):</h2>
            <textarea
              class="w-full h-40 p-2 bg-gray-800 text-white rounded-2xl"
              readOnly
              value={tradeFormState.psbtHex}
            />
            <p class="mt-2">
              Share this signed PSBT with the buyer to complete the transaction.
            </p>
          </div>
        )}
      </div>

      {/* ===== UTXO ATTACH FORM ===== */}
      <div class={containerBackground}>
        <h2 class={`${subtitleNeutral} mx-auto`}>SELLER</h2>
        <h3 class=" font-bold text-xl text-color-grey-semilight mb-2">
          ATTACH TO UTXO
        </h3>

        {/* ===== 🎯 INLINE FEE STATUS DISPLAY - UTXO ATTACH ===== */}
        {attachFeeDetails && (
          <div className="mb-4 p-3 bg-color-grey-semidark/50 rounded-2xl border border-color-grey-light/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-color-grey-light">
                Estimated Fees:
              </span>
              {/* Phase indicators following StampingTool pattern */}
              <div className="flex items-center gap-1">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    attachPhase1 ? "bg-green-400" : "bg-color-grey-light/30"
                  }`}
                  title="Phase 1: Instant estimate"
                >
                </div>
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    attachIsPreFetching
                      ? "bg-blue-400 animate-pulse"
                      : "bg-color-grey-light/30"
                  }`}
                  title="Phase 2: Smart UTXO estimate"
                >
                </div>
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    attachPhase3 ? "bg-green-400" : "bg-color-grey-light/30"
                  }`}
                  title="Phase 3: Exact estimate"
                >
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-color-grey-light">Miner Fee:</span>
                <span className="ml-2 text-white">
                  {attachFeeDetails.minerFee} sats
                </span>
              </div>
              <div>
                <span className="text-color-grey-light">Total Value:</span>
                <span className="ml-2 text-white">
                  {attachFeeDetails.totalValue} sats
                </span>
              </div>
            </div>
            {attachIsPreFetching && (
              <div className="mt-2 text-xs text-blue-400 animate-pulse">
                💡 Smart UTXO analysis in progress...
              </div>
            )}
          </div>
        )}

        <div class="flex flex-col gap-5">
          {/* Asset (CPID) section with query button */}
          <div class="flex flex-col gap-5">
            <div class="flex gap-5 items-start">
              <div class="flex-grow">
                <InputField
                  type="text"
                  placeholder="Asset (CPID)"
                  value={attachFormState.cpid}
                  onChange={(e) => handleAttachInputChange(e, "cpid")}
                />
              </div>
              <Button
                variant="outline"
                color="grey"
                size="sm"
                onClick={handleQueryAssets}
                disabled={isSubmitting || isLoadingAssets}
              >
                {isLoadingAssets ? "LOADING..." : "QUERY"}
              </Button>
            </div>

            {/* Asset selection results */}
            {availableAssets.length > 0 && (
              <div class="max-h-40 overflow-y-auto bg-gray-800 rounded-2xl p-3">
                <h4 class="text-sm font-medium mb-2">Available Assets:</h4>
                {availableAssets.map((asset) => (
                  <div
                    key={asset.cpid}
                    class="flex justify-between items-center p-2 hover:bg-gray-700 cursor-pointer rounded"
                    onClick={() => handleAssetSelection(asset)}
                  >
                    <span class="text-sm">{asset.cpid}</span>
                    <span class="text-xs text-gray-400">
                      {asset.quantity} available
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <InputField
            type="number"
            placeholder="Quantity"
            value={attachFormState.quantity}
            onChange={(e) => handleAttachInputChange(e, "quantity")}
            min="1"
          />

          <InputField
            type="number"
            placeholder="Fee Rate (sat/vB)"
            value={attachFormState.feeRateVB}
            onChange={(e) => handleAttachInputChange(e, "feeRateVB")}
            step="1"
            min="1"
          />

          {/* UTXO section with query button */}
          <div class="flex flex-col gap-5">
            <div class="flex gap-5 items-start">
              <div class="flex-grow">
                <InputField
                  type="text"
                  placeholder="UTXO (e.g., txid:vout)"
                  value={attachFormState.utxo}
                  onChange={(e) => handleAttachInputChange(e, "utxo")}
                />
              </div>
              <Button
                variant="outline"
                color="grey"
                size="sm"
                onClick={handleQueryUtxos}
                disabled={isSubmitting || isLoadingUtxos}
              >
                {isLoadingUtxos ? "LOADING..." : "QUERY"}
              </Button>
            </div>

            {/* UTXO selection results */}
            {availableUtxos.length > 0 && (
              <div class="max-h-40 overflow-y-auto bg-gray-800 rounded-2xl p-3">
                <h4 class="text-sm font-medium mb-2">Available UTXOs:</h4>
                {availableUtxos.map((utxo) => (
                  <div
                    key={`${utxo.txid}:${utxo.vout}`}
                    class="flex justify-between items-center p-2 hover:bg-gray-700 cursor-pointer rounded"
                    onClick={() => handleUtxoSelection(utxo)}
                  >
                    <span class="text-xs font-mono">
                      {utxo.txid.substring(0, 8)}...:{utxo.vout}
                    </span>
                    <span class="text-xs text-gray-400">
                      {utxo.value} sats
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div class="flex justify-end mt-5">
          <Button
            variant="flat"
            color="grey"
            size="mdR"
            onClick={handleUtxoAttach}
            disabled={isSubmitting}
          >
            {isSubmitting ? "PROCESSING" : "ATTACH UTXO"}
          </Button>
        </div>

        <StatusMessages
          submissionMessage={submissionMessage}
          apiError={apiError}
          walletError={null}
        />

        {attachFormState.psbtHex && (
          <div class={`${containerBackground} break-words mt-6`}>
            <h2 class="text-xl font-bold mb-2">Signed PSBT (Hex):</h2>
            <textarea
              class="w-full h-40 p-2 bg-gray-800 text-white rounded-2xl"
              readOnly
              value={attachFormState.psbtHex}
            />
          </div>
        )}
      </div>

      {/* ===== BUYER SECTION ===== */}
      {/* ===== COMPLETE SWAP FORM ===== */}
      <div class={containerBackground}>
        <h2 class={`${subtitleNeutral} mx-auto`}>BUYER</h2>
        <h3 class=" font-bold text-xl text-color-grey-semilight mb-2">
          COMPLETE SWAP
        </h3>

        {/* ===== 🎯 INLINE FEE STATUS DISPLAY - COMPLETE SWAP ===== */}
        {swapFeeDetails && (
          <div className="mb-4 p-3 bg-color-grey-semidark/50 rounded-2xl border border-color-grey-light/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-color-grey-light">
                Estimated Fees:
              </span>
              {/* Phase indicators following StampingTool pattern */}
              <div className="flex items-center gap-1">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    swapPhase1 ? "bg-green-400" : "bg-color-grey-light/30"
                  }`}
                  title="Phase 1: Instant estimate"
                >
                </div>
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    swapIsPreFetching
                      ? "bg-blue-400 animate-pulse"
                      : "bg-color-grey-light/30"
                  }`}
                  title="Phase 2: Smart UTXO estimate"
                >
                </div>
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    swapPhase3 ? "bg-green-400" : "bg-color-grey-light/30"
                  }`}
                  title="Phase 3: Exact estimate"
                >
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-color-grey-light">Miner Fee:</span>
                <span className="ml-2 text-white">
                  {swapFeeDetails.minerFee} sats
                </span>
              </div>
              <div>
                <span className="text-color-grey-light">Total Value:</span>
                <span className="ml-2 text-white">
                  {swapFeeDetails.totalValue} sats
                </span>
              </div>
            </div>
            {swapIsPreFetching && (
              <div className="mt-2 text-xs text-blue-400 animate-pulse">
                💡 Smart UTXO analysis in progress...
              </div>
            )}
          </div>
        )}

        <div class="flex flex-col gap-5">
          <InputField
            type="text"
            placeholder="Seller's PSBT (Hex)"
            value={buyerFormState.sellerPsbtHex}
            onChange={(e) => handleBuyerInputChange(e, "sellerPsbtHex")}
          />
          <InputField
            type="text"
            placeholder="Your UTXO (e.g., txid:vout)"
            value={buyerFormState.buyerUtxo}
            onChange={(e) => handleBuyerInputChange(e, "buyerUtxo")}
          />
          {/* Add this input field in the buyer section */}
          <InputField
            type="number"
            placeholder="Fee Rate (sat/vB)"
            value={buyerFormState.feeRate}
            onChange={(e) => handleBuyerInputChange(e, "feeRate")}
            min="1"
          />
        </div>
        <div class="flex justify-end mt-5">
          <Button
            variant="flat"
            color="grey"
            size="mdR"
            onClick={handleCompleteSwap}
            disabled={isSubmitting}
          >
            {isSubmitting ? "PROCESSING" : "COMPLETE SWAP"}
          </Button>
        </div>
      </div>
    </div>
  );
}
