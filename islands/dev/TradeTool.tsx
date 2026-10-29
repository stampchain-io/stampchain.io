/*
 * Attach a stamp to a new UTXO, then build a seller PSBT the buyer completes.
 *
 * Fee display is the attach response's estimatedFee. The stamp-mint fee
 * estimator prices a different transaction, so it is not used here. The buyer
 * swap preview lands with the PSBT layout rebuild.
 */
import { walletContext } from "$client/wallet/wallet.ts";
import { logger } from "$lib/utils/logger.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { useCallback, useEffect, useState } from "preact/hooks";

import { Button } from "$button";
import { InputField } from "$form";
import { bodyTool, containerBackground, containerGap } from "$layout";
import type { UTXO, XcpBalance } from "$lib/types/index.d.ts";
import { btcToSats, normalizeFeeRate } from "$lib/utils/fees.ts";
import { walletCanSignSaleOffer } from "$lib/utils/bitcoin/psbt/saleWallets.ts";
import { StatusMessages } from "$notification";
import { subtitleNeutral, titleNeutral } from "$text";
import type { ComposeAttachOptions } from "$types/services.d.ts";
import type { PSBTInputToSign } from "$types/wallet.d.ts";

/* ===== CONSTANTS ===== */
const SIGHASH_SINGLE = 0x03;
const SIGHASH_ANYONECANPAY = 0x80;
const SIGHASH_SINGLE_ANYONECANPAY = SIGHASH_SINGLE | SIGHASH_ANYONECANPAY; // 131
const MAX_FEE_RATE_VB = 500;
const MIN_UTXO_VALUE = 546;

/* ===== TYPES ===== */
interface StatusMessageType {
  message: string;
  txid?: string;
}

interface SalePreviewView {
  sellerAddress: string;
  salePriceSats: number;
  assetUtxo: string;
  assetValueSats: number;
  buyerFeeSats: number;
  changeSats: number;
  assets: Array<{ cpid: string; quantity: number }>;
}

interface AttachResponse {
  psbtHex?: string;
  inputsToSign?: PSBTInputToSign[];
  estimatedFee?: number;
  attachDestinationVout?: number;
  error?: string;
}

/* ===== HELPERS ===== */
function formatSaleHint(salePrice: string, btcPrice: number): string | null {
  if (!salePrice.trim()) return null;
  let sats: number;
  try {
    sats = btcToSats(Number(salePrice));
  } catch {
    return null;
  }
  const satsLabel = `${sats.toLocaleString("en-US")} sats`;
  if (!(btcPrice > 0)) return satsLabel;
  const usd = (sats / 1e8) * btcPrice;
  const usdLabel = usd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: usd >= 100 ? 0 : 2,
  });
  return `${satsLabel} · ${usdLabel}`;
}

function shortUtxo(utxo: string): string {
  const [txid, vout] = utxo.split(":");
  if (!txid || vout === undefined) return utxo;
  return `${txid.slice(0, 8)}...:${vout}`;
}

/* ===== COMPONENT ===== */
export function StampTradeTool() {
  /* ===== STATE ===== */
  const [attachAssets, setAttachAssets] = useState<XcpBalance[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [maxQuantity, setMaxQuantity] = useState<number | null>(null);
  const [fundingUtxos, setFundingUtxos] = useState<UTXO[]>([]);
  const [isLoadingUtxos, setIsLoadingUtxos] = useState(false);
  const [offerAssets, setOfferAssets] = useState<XcpBalance[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [attachEstimatedFee, setAttachEstimatedFee] = useState<number | null>(
    null,
  );
  const [attachedAssetUtxo, setAttachedAssetUtxo] = useState<string | null>(
    null,
  );
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
    feeRate: "",
    expectedCpid: "",
  });
  const [swapPreview, setSwapPreview] = useState<SalePreviewView | null>(null);
  const [completedPsbt, setCompletedPsbt] = useState<string | null>(null);
  const [swapInputs, setSwapInputs] = useState<PSBTInputToSign[]>([]);

  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [attachSubmitting, setAttachSubmitting] = useState(false);
  const [swapSubmitting, setSwapSubmitting] = useState(false);
  const [createMessage, setCreateMessage] = useState<StatusMessageType | null>(
    null,
  );
  const [attachMessage, setAttachMessage] = useState<StatusMessageType | null>(
    null,
  );
  const [swapMessage, setSwapMessage] = useState<StatusMessageType | null>(
    null,
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  const saleHint = formatSaleHint(
    tradeFormState.salePrice,
    tradeFormState.BTCPrice,
  );

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

  /* ===== EVENT HANDLERS ===== */
  const handleTradeInputChange = (e: Event, field: string) => {
    const value = (e.target as HTMLInputElement).value;
    setTradeFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleAttachInputChange = (e: Event, field: string) => {
    const value = (e.target as HTMLInputElement).value;
    setAttachFormState((prev) => ({ ...prev, [field]: value }));
    if (field === "cpid") setMaxQuantity(null);
  };

  const handleBuyerInputChange = (e: Event, field: string) => {
    const value = (e.target as HTMLInputElement).value;
    setBuyerFormState((prev) => ({ ...prev, [field]: value }));
    setSwapPreview(null);
    setCompletedPsbt(null);
  };

  /* ===== PSBT HANDLERS ===== */
  const handleCreatePSBT = async () => {
    if (!isConnected) {
      showConnectModal();
      return;
    }

    setCreateSubmitting(true);
    setCreateMessage({ message: "Please wait..." });
    setCreateError(null);

    try {
      const { utxo, salePrice } = tradeFormState;

      if (!utxo || !salePrice) {
        const message = "Please fill in all fields with valid values.";
        showToast(message, "error", false);
        setCreateError(message);
        setCreateSubmitting(false);
        return;
      }

      try {
        btcToSats(Number(salePrice));
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Invalid sale price";
        showToast(message, "error", false);
        setCreateError(message);
        setCreateSubmitting(false);
        return;
      }

      const response = await fetch("/api/v2/trx/create_psbt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utxo,
          salePrice: Number(salePrice),
          sellerAddress: address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const message = `Error creating PSBT.\n${errorData.error}`;
        showToast(message, "error");
        setCreateError(errorData.error || "Error creating PSBT");
        setCreateSubmitting(false);
        return;
      }

      const data = await response.json();
      const psbtHex = data.psbt;
      const inputsToSign: PSBTInputToSign[] = data.inputsToSign ?? [{
        index: 1,
        sighashTypes: [SIGHASH_SINGLE_ANYONECANPAY],
      }];

      if (!walletCanSignSaleOffer(wallet.provider)) {
        const message =
          "This wallet cannot sign a partial sale. Use Unisat, OKX, Phantom, Leather, Wonder, or TapWallet.";
        showToast(message, "error", false);
        setCreateError(message);
        setCreateSubmitting(false);
        return;
      }

      console.log("Received PSBT hex:", psbtHex);

      const walletResult = await walletContext.signPSBT(
        wallet,
        psbtHex,
        inputsToSign,
        true,
        [SIGHASH_SINGLE_ANYONECANPAY],
        false,
      );

      if (walletResult.signed) {
        showToast(
          "PSBT signed successfully!\nShare the signed PSBT with the buyer.",
          "success",
          false,
        );
        setCreateMessage({
          message: "PSBT signed successfully. Here's the signed PSBT hex:",
        });
        setTradeFormState((prev) => ({ ...prev, psbtHex: walletResult.psbt }));
      } else if (walletResult.cancelled) {
        showToast("PSBT signing cancelled by user.", "warning");
        setCreateMessage({
          message: "PSBT signing cancelled by user.",
        });
      } else {
        showToast(`PSBT signing failed.\n${walletResult.error}`, "error");
        setCreateMessage({
          message: `PSBT signing failed.\n${walletResult.error}`,
        });
        setCreateError(walletResult.error || "PSBT signing failed");
      }
    } catch (error) {
      console.error("Error creating or signing PSBT:", error);
      setCreateError(
        "An unexpected error occurred during PSBT creation or signing.",
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleUtxoAttach = async () => {
    if (!isConnected) {
      showConnectModal();
      return;
    }

    setAttachSubmitting(true);
    setAttachMessage({ message: "Please wait..." });
    setAttachError(null);
    setAttachedAssetUtxo(null);

    try {
      const { cpid, quantity, feeRateVB, utxo } = attachFormState;

      if (!cpid || !quantity || !feeRateVB || !utxo || !address) {
        setAttachError("Please fill in all fields with valid values.");
        setAttachSubmitting(false);
        return;
      }

      if (!/^\d+$/.test(quantity) || parseInt(quantity, 10) < 1) {
        setAttachError("Quantity must be a whole number of at least 1.");
        setAttachSubmitting(false);
        return;
      }

      const parsedQuantity = parseInt(quantity, 10);
      if (maxQuantity !== null && parsedQuantity > maxQuantity) {
        setAttachError(
          `Quantity cannot exceed the available balance of ${maxQuantity}.`,
        );
        setAttachSubmitting(false);
        return;
      }

      let normalizedFees;
      try {
        normalizedFees = normalizeFeeRate({
          satsPerVB: Number(feeRateVB),
        });
      } catch (error) {
        setAttachError(
          error instanceof Error ? error.message : "Invalid fee rate",
        );
        setAttachSubmitting(false);
        return;
      }

      if (normalizedFees.normalizedSatsPerVB > MAX_FEE_RATE_VB) {
        setAttachError(`Fee rate should not exceed ${MAX_FEE_RATE_VB} sat/vB`);
        setAttachSubmitting(false);
        return;
      }

      const requestBody: {
        address: string;
        identifier: string;
        quantity: number;
        inputs_set: string;
        options: Partial<ComposeAttachOptions>;
      } = {
        address,
        identifier: cpid,
        quantity: parsedQuantity,
        inputs_set: utxo,
        options: {
          fee_per_kb: normalizedFees.normalizedSatsPerKB,
          return_psbt: true,
          extended_tx_info: true,
          regular_dust_size: 588,
        },
      };

      const response = await fetch("/api/v2/trx/stampattach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setAttachError(`Error creating PSBT: ${errorData.error}`);
        setAttachSubmitting(false);
        return;
      }

      const data: AttachResponse = await response.json();
      const psbtHex = data.psbtHex;
      if (!psbtHex) {
        setAttachError("Attach response did not include a PSBT.");
        setAttachSubmitting(false);
        return;
      }
      if (typeof data.estimatedFee === "number") {
        setAttachEstimatedFee(data.estimatedFee);
      }

      const inputsToSign: PSBTInputToSign[] = (data.inputsToSign ?? []).map((
        input,
      ) => ({
        index: input.index,
        ...(input.address ? { address: input.address } : {}),
        ...(input.sighashTypes ? { sighashTypes: input.sighashTypes } : {}),
      }));

      console.log("Received PSBT hex:", psbtHex);

      const walletResult = await walletContext.signPSBT(
        wallet,
        psbtHex,
        inputsToSign,
        true,
        undefined,
        true,
      );

      if (walletResult.signed) {
        const destinationVout = data.attachDestinationVout;
        if (walletResult.txid && Number.isInteger(destinationVout)) {
          const assetUtxo = `${walletResult.txid}:${destinationVout}`;
          setAttachedAssetUtxo(assetUtxo);
          setAttachMessage({
            message:
              "Attach broadcast. The stamp sits on the new UTXO after it confirms and is indexed.",
            txid: walletResult.txid,
          });
        } else {
          setAttachMessage({
            message: walletResult.txid
              ? "Transaction signed and broadcast successfully!"
              : "Transaction signed. Broadcast did not return a txid.",
            ...(walletResult.txid ? { txid: walletResult.txid } : {}),
          });
        }
        setAttachFormState((prev) => ({
          ...prev,
          psbtHex: walletResult.psbt || psbtHex,
        }));
      } else if (walletResult.cancelled) {
        setAttachMessage({
          message: "PSBT signing cancelled by user.",
        });
      } else {
        setAttachMessage({
          message: `PSBT signing failed: ${walletResult.error}`,
        });
        setAttachError(walletResult.error || "PSBT signing failed");
      }
    } catch (error: unknown) {
      console.error("Error creating or signing PSBT:", error);
      setAttachError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setAttachSubmitting(false);
    }
  };

  const handleReviewSwap = async () => {
    if (!isConnected) {
      showConnectModal();
      return;
    }

    setSwapSubmitting(true);
    setSwapMessage({ message: "Checking the sale..." });
    setSwapError(null);
    setSwapPreview(null);
    setCompletedPsbt(null);

    try {
      const { sellerPsbtHex, buyerUtxo, feeRate, expectedCpid } =
        buyerFormState;

      if (!sellerPsbtHex.trim()) {
        setSwapError("Seller PSBT Hex is required.");
        setSwapSubmitting(false);
        return;
      }
      if (!buyerUtxo.trim()) {
        setSwapError("Your UTXO is required.");
        setSwapSubmitting(false);
        return;
      }
      if (!feeRate || isNaN(Number(feeRate)) || Number(feeRate) <= 0) {
        setSwapError("Fee Rate must be a positive number.");
        setSwapSubmitting(false);
        return;
      }

      const response = await fetch("/api/v2/trx/complete_psbt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerPsbtHex,
          buyerUtxo,
          buyerAddress: address,
          feeRate: Number(feeRate),
          ...(expectedCpid.trim() ? { expectedCpid: expectedCpid.trim() } : {}),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not review the swap");
      }
      if (!data.completedPsbt || !data.preview) {
        throw new Error("Received an incomplete swap from the server");
      }

      setCompletedPsbt(data.completedPsbt);
      setSwapInputs(data.inputsToSign ?? [{ index: 0 }]);
      setSwapPreview(data.preview);
      setSwapMessage(null);
    } catch (error: unknown) {
      console.error("Complete swap error:", error);
      setSwapError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
      setSwapMessage(null);
    } finally {
      setSwapSubmitting(false);
    }
  };

  const handleConfirmSwap = async () => {
    if (!completedPsbt) return;
    if (!isConnected) {
      showConnectModal();
      return;
    }

    setSwapSubmitting(true);
    setSwapError(null);
    setSwapMessage({ message: "Waiting for your wallet..." });

    try {
      const signResult = await walletContext.signPSBT(
        wallet,
        completedPsbt,
        swapInputs,
        true,
        [1],
        true,
      );

      if (!signResult.signed) {
        throw new Error(signResult.error || "Failed to sign PSBT");
      }

      setSwapMessage({
        message: "Swap signed and broadcast.",
        ...(signResult.txid ? { txid: signResult.txid } : {}),
      });
      setSwapPreview(null);
      setCompletedPsbt(null);
    } catch (error: unknown) {
      console.error("Confirm swap error:", error);
      setSwapError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
      setSwapMessage(null);
    } finally {
      setSwapSubmitting(false);
    }
  };

  /* ===== QUERY HANDLERS ===== */
  const handleQueryUtxos = useCallback(async () => {
    if (!isConnected) {
      showConnectModal();
      return;
    }

    setIsLoadingUtxos(true);
    setAttachError(null);

    try {
      console.log("Querying spendable UTXOs for address:", address);
      const response = await fetch(
        `/api/internal/utxoquery?address=${address}&spendableOnly=true`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch UTXOs");
      }

      const data = await response.json();
      console.log("Raw response data:", data);

      if (!data || !data.utxos) {
        console.error("Invalid response structure:", data);
        throw new Error("Invalid response format from server");
      }

      if (!Array.isArray(data.utxos)) {
        console.error("UTXOs is not an array:", data.utxos);
        throw new Error("Server returned invalid UTXO format");
      }

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
        setAttachError(`No UTXOs found with value >= ${MIN_UTXO_VALUE} sats`);
        return;
      }

      setFundingUtxos(filteredAndSortedUtxos);
      console.log(
        `Successfully set ${filteredAndSortedUtxos.length} spendable UTXOs`,
      );
    } catch (error) {
      console.error("Error fetching UTXOs:", error);
      setAttachError(
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
      setAttachError("No wallet address available");
      return;
    }

    setIsLoadingAssets(true);
    setAttachError(null);

    try {
      console.log("Querying unattached assets for address:", address);
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

      const unattached = (data.stampBalance as XcpBalance[]).filter((asset) =>
        !asset.utxo
      );
      const sortedAssets = [...unattached].sort((a, b) =>
        a.cpid.localeCompare(b.cpid)
      );

      console.log(`Received ${sortedAssets.length} unattached assets`);

      if (sortedAssets.length === 0) {
        setAttachError(
          data.stampBalance.length > 0
            ? "Every stamp on this address is already attached. Use Create PSBT to sell one."
            : "No assets found for this address",
        );
        setAttachAssets([]);
        return;
      }

      setAttachAssets(sortedAssets);
      console.log(`Successfully set ${sortedAssets.length} assets`);
    } catch (error) {
      console.error("Error fetching assets:", error);
      setAttachError(
        error instanceof Error ? error.message : "Failed to fetch assets",
      );
    } finally {
      setIsLoadingAssets(false);
    }
  }, [address, isConnected]);

  const handleQueryOffers = useCallback(async () => {
    if (!isConnected) {
      showConnectModal();
      return;
    }

    if (!address) {
      setCreateError("No wallet address available");
      return;
    }

    setIsLoadingOffers(true);
    setCreateError(null);

    try {
      const response = await fetch(
        `/api/v2/balance/getStampsBalance?address=${
          encodeURIComponent(address)
        }&utxoOnly=true`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch attached stamps");
      }

      const data = await response.json();
      if (!data.stampBalance || !Array.isArray(data.stampBalance)) {
        throw new Error("Invalid response format from server");
      }

      const attached = (data.stampBalance as XcpBalance[])
        .filter((asset) => asset.utxo)
        .sort((a, b) => a.cpid.localeCompare(b.cpid));

      if (attached.length === 0) {
        setOfferAssets([]);
        setCreateError(
          "No stamps are attached to a UTXO yet. Attach one first.",
        );
        return;
      }

      setOfferAssets(attached);
    } catch (error) {
      console.error("Error fetching attached stamps:", error);
      setCreateError(
        error instanceof Error
          ? error.message
          : "Failed to fetch attached stamps",
      );
    } finally {
      setIsLoadingOffers(false);
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
      quantity: "",
    }));
    setMaxQuantity(asset.quantity);
  };

  const handleOfferSelection = (asset: XcpBalance) => {
    setTradeFormState((prev) => ({ ...prev, utxo: asset.utxo }));
  };

  const useAttachedUtxo = () => {
    if (!attachedAssetUtxo) return;
    setTradeFormState((prev) => ({ ...prev, utxo: attachedAssetUtxo }));
  };

  /* ===== RENDER ===== */
  return (
    <div class={`${bodyTool} ${containerGap}`}>
      <h1 class={`${titleNeutral} mx-auto -mb-2 mobileLg:-mb-4`}>
        TRADE
      </h1>

      {/* ===== CREATE PSBT FORM ===== */}
      <div class={containerBackground}>
        <h2 class={`${subtitleNeutral} mx-auto`}>SELLER</h2>
        <h3 class=" font-bold text-xl text-color-grey-semilight mb-2">
          CREATE PSBT
        </h3>

        <div class="flex flex-col gap-5">
          <div class="flex flex-col gap-5">
            <div class="flex gap-5 items-start">
              <div class="flex-grow">
                <InputField
                  type="text"
                  placeholder="Asset UTXO (txid:vout)"
                  value={tradeFormState.utxo}
                  onChange={(e) => handleTradeInputChange(e, "utxo")}
                />
              </div>
              <Button
                variant="outline"
                color="neutral"
                onClick={handleQueryOffers}
                disabled={createSubmitting || isLoadingOffers}
              >
                {isLoadingOffers ? "LOADING..." : "QUERY"}
              </Button>
            </div>

            {offerAssets.length > 0 && (
              <div class="max-h-40 overflow-y-auto bg-gray-800 rounded-2xl p-3">
                <h4 class="text-sm font-medium mb-2">Attached stamps:</h4>
                {offerAssets.map((asset) => (
                  <div
                    key={`${asset.cpid}:${asset.utxo}`}
                    class="flex justify-between items-center p-2 hover:bg-gray-700 cursor-pointer rounded"
                    onClick={() => handleOfferSelection(asset)}
                  >
                    <span class="text-sm">
                      {asset.cpid}
                      <span class="text-xs text-gray-400 ml-2">
                        {shortUtxo(asset.utxo)}
                      </span>
                    </span>
                    <span class="text-xs text-gray-400">
                      {asset.quantity} attached
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <InputField
            type="number"
            placeholder="Sale Price (BTC)"
            value={tradeFormState.salePrice}
            onChange={(e) => handleTradeInputChange(e, "salePrice")}
            step="0.00000001"
            min="0"
          />
          {saleHint && (
            <p class="text-xs text-color-grey-light -mt-3">{saleHint}</p>
          )}
        </div>

        <div class="flex justify-end mt-5">
          <Button
            variant="flat"
            color="neutral"
            onClick={handleCreatePSBT}
            disabled={createSubmitting}
          >
            {createSubmitting ? "PROCESSING" : "CREATE PSBT"}
          </Button>
        </div>

        <StatusMessages
          submissionMessage={createMessage}
          apiError={createError}
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
          ATTACH TO A NEW UTXO
        </h3>
        <p class="text-sm text-color-grey-light mb-4">
          The funding UTXO pays for the attach. The stamp is credited to a new
          output, not to that UTXO.
        </p>

        {attachEstimatedFee !== null && (
          <p class="text-sm text-color-grey-light mb-4">
            Estimated fee: {attachEstimatedFee.toLocaleString("en-US")} sats
          </p>
        )}

        <div class="flex flex-col gap-5">
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
                color="neutral"
                onClick={handleQueryAssets}
                disabled={attachSubmitting || isLoadingAssets}
              >
                {isLoadingAssets ? "LOADING..." : "QUERY"}
              </Button>
            </div>

            {attachAssets.length > 0 && (
              <div class="max-h-40 overflow-y-auto bg-gray-800 rounded-2xl p-3">
                <h4 class="text-sm font-medium mb-2">Unattached stamps:</h4>
                {attachAssets.map((asset) => (
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
          {maxQuantity !== null && (
            <p class="text-xs text-color-grey-light -mt-3">
              {maxQuantity.toLocaleString("en-US")} available
            </p>
          )}

          <InputField
            type="number"
            placeholder="Fee Rate (sat/vB)"
            value={attachFormState.feeRateVB}
            onChange={(e) => handleAttachInputChange(e, "feeRateVB")}
            step="1"
            min="1"
          />

          <div class="flex flex-col gap-5">
            <div class="flex gap-5 items-start">
              <div class="flex-grow">
                <InputField
                  type="text"
                  placeholder="Funding UTXO (txid:vout)"
                  value={attachFormState.utxo}
                  onChange={(e) => handleAttachInputChange(e, "utxo")}
                />
              </div>
              <Button
                variant="outline"
                color="neutral"
                onClick={handleQueryUtxos}
                disabled={attachSubmitting || isLoadingUtxos}
              >
                {isLoadingUtxos ? "LOADING..." : "QUERY"}
              </Button>
            </div>

            {fundingUtxos.length > 0 && (
              <div class="max-h-40 overflow-y-auto bg-gray-800 rounded-2xl p-3">
                <h4 class="text-sm font-medium mb-2">Spendable UTXOs:</h4>
                {fundingUtxos.map((utxo) => (
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
            color="neutral"
            onClick={handleUtxoAttach}
            disabled={attachSubmitting}
          >
            {attachSubmitting ? "PROCESSING" : "ATTACH UTXO"}
          </Button>
        </div>

        <StatusMessages
          submissionMessage={attachMessage}
          apiError={attachError}
          walletError={null}
        />

        {attachedAssetUtxo && (
          <div class={`${containerBackground} break-words mt-6`}>
            <h2 class="text-xl font-bold mb-2">New asset UTXO</h2>
            <p class="text-sm font-mono break-all">{attachedAssetUtxo}</p>
            <p class="mt-2 text-sm">
              Use this in Create PSBT after the attach confirms and the stamp
              shows as attached to it.
            </p>
            <div class="flex justify-end mt-4">
              <Button
                variant="outline"
                color="neutral"
                onClick={useAttachedUtxo}
              >
                USE IN CREATE PSBT
              </Button>
            </div>
          </div>
        )}

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
      <div class={containerBackground}>
        <h2 class={`${subtitleNeutral} mx-auto`}>BUYER</h2>
        <h3 class=" font-bold text-xl text-color-grey-semilight mb-2">
          COMPLETE SWAP
        </h3>

        <div class="flex flex-col gap-5">
          <InputField
            type="text"
            placeholder="Seller's signed PSBT (Hex)"
            value={buyerFormState.sellerPsbtHex}
            onChange={(e) => handleBuyerInputChange(e, "sellerPsbtHex")}
          />
          <InputField
            type="text"
            placeholder="Funding UTXO (txid:vout)"
            value={buyerFormState.buyerUtxo}
            onChange={(e) => handleBuyerInputChange(e, "buyerUtxo")}
          />
          <InputField
            type="number"
            placeholder="Fee Rate (sat/vB)"
            value={buyerFormState.feeRate}
            onChange={(e) => handleBuyerInputChange(e, "feeRate")}
            min="1"
          />
          <InputField
            type="text"
            placeholder="Expected stamp (CPID, optional)"
            value={buyerFormState.expectedCpid}
            onChange={(e) => handleBuyerInputChange(e, "expectedCpid")}
          />
        </div>
        <div class="flex justify-end mt-5">
          <Button
            variant="flat"
            color="neutral"
            onClick={handleReviewSwap}
            disabled={swapSubmitting}
          >
            {swapSubmitting ? "CHECKING" : "REVIEW SWAP"}
          </Button>
        </div>

        {swapPreview && (
          <div class="mt-5 text-sm text-color-grey-light flex flex-col gap-2">
            <p>
              Pay {(swapPreview.salePriceSats / 1e8).toLocaleString("en-US", {
                maximumFractionDigits: 8,
              })} BTC
              {tradeFormState.BTCPrice > 0 &&
                ` · ${
                  ((swapPreview.salePriceSats / 1e8) * tradeFormState.BTCPrice)
                    .toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 2,
                    })
                }`} to {swapPreview.sellerAddress}
            </p>
            <p class="break-all">
              Stamp UTXO {swapPreview.assetUtxo} (
              {swapPreview.assetValueSats.toLocaleString("en-US")}{" "}
              sats) moves to you.
            </p>
            <p>
              {swapPreview.assets.map((asset) =>
                `${asset.cpid} × ${asset.quantity.toLocaleString("en-US")}`
              ).join(", ")}
            </p>
            <p>
              Fee {swapPreview.buyerFeeSats.toLocaleString("en-US")} sats
              {swapPreview.changeSats > 0 &&
                `, change ${
                  swapPreview.changeSats.toLocaleString("en-US")
                } sats`}
            </p>
            <div class="flex justify-end mt-2">
              <Button
                variant="flat"
                color="neutral"
                onClick={handleConfirmSwap}
                disabled={swapSubmitting || !completedPsbt}
              >
                {swapSubmitting ? "SIGNING" : "CONFIRM AND SIGN"}
              </Button>
            </div>
          </div>
        )}

        <StatusMessages
          submissionMessage={swapMessage}
          apiError={swapError}
          walletError={null}
        />
      </div>
    </div>
  );
}
