import {
  checkWalletAvailability,
  getGlobalWallets,
  walletContext,
} from "$client/wallet/wallet.ts";
import {
  handleWalletError,
  parseConnectionError,
} from "$client/wallet/walletHelper.ts";
import { extractPrevTxsFromPSBT } from "$lib/utils/bitcoin/psbt/psbtUtils.ts";
import { base64ToHex } from "$lib/utils/data/binary/baseUtils.ts";
import { logger } from "$lib/utils/logger.ts";
import type { BaseToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import type { SignPSBTResult, Wallet } from "$types/index.d.ts";
import { signal } from "@preact/signals";

export const isWonderInstalled = signal<boolean>(false);

export const checkWonder = () => {
  const isAvailable = checkWalletAvailability("wonder");
  isWonderInstalled.value = isAvailable;
  return isAvailable;
};

const getProvider = () => {
  const wallets = getGlobalWallets();
  return wallets.wonderWallet;
};

// requestAccounts resolves { accounts, proof } for a first-time connect
// approval but a bare string[] once the origin already holds a grant, and the
// accountsChanged event always emits the bare array.
const toAccounts = (result: unknown): string[] => {
  const list = Array.isArray(result)
    ? result
    : (result as { accounts?: unknown } | null)?.accounts;
  return Array.isArray(list)
    ? list.filter((account): account is string => typeof account === "string")
    : [];
};

// broadcastTransaction resolves { txid } through the extension provider.
const toTxid = (result: unknown): string => {
  if (typeof result === "string") return result;
  const txid = (result as { txid?: unknown } | null)?.txid;
  return typeof txid === "string" ? txid : "";
};

// Wonder returns a partially signed PSBT as base64; the rest of the app passes
// PSBTs around as hex.
const toPsbtHex = (psbt: string): string =>
  /^[0-9a-fA-F]+$/.test(psbt) ? psbt : base64ToHex(psbt);

const addressTypeFor = (address: string): Wallet["addressType"] => {
  if (address.startsWith("bc1p")) return "p2tr";
  if (address.startsWith("bc1")) return "p2wpkh";
  if (address.startsWith("3")) return "p2sh";
  return "p2pkh";
};

export const connectWonder = async (
  addToast: (message: string, type: BaseToast["type"]) => void,
) => {
  try {
    const wonder = getProvider();
    if (!wonder) {
      logger.error("ui", {
        message: "Wonder Wallet not detected",
        context: "connectWonder",
      });
      addToast(
        "Wonder Wallet not detected.\nPlease install the Wonder Wallet extension.",
        "error",
      );
      return;
    }
    const accounts = toAccounts(await wonder.requestAccounts());
    if (accounts.length === 0) {
      logger.error("ui", {
        message: "Wonder Wallet returned no accounts",
        context: "connectWonder",
      });
      addToast(
        "Wonder Wallet returned no accounts.\nUnlock the wallet and try again.",
        "error",
      );
      return;
    }
    await handleAccountsChanged(accounts);
    logger.info("ui", {
      message: "Successfully connected to Wonder Wallet",
      context: "connectWonder",
    });
    addToast("Connected using Wonder Wallet.", "success");
  } catch (error: unknown) {
    const errorMessage = parseConnectionError(error);
    logger.error("ui", {
      message: "Failed to connect to Wonder Wallet",
      context: "connectWonder",
      error: errorMessage,
    });
    addToast(
      `Failed to connect to Wonder Wallet.\n${errorMessage}`,
      "error",
    );
  }
};

const handleAccountsChanged = async (rawAccounts: unknown) => {
  const accounts = toAccounts(rawAccounts);
  if (accounts.length === 0) {
    walletContext.disconnect();
    return;
  }
  if (walletContext.wallet.address === accounts[0]) {
    return;
  }
  const wonder = getProvider();
  if (!wonder) {
    walletContext.disconnect();
    return;
  }
  const wallet = {} as Wallet;
  wallet.accounts = accounts;
  wallet.address = accounts[0];
  const publicKey = await wonder.getPublicKey();
  wallet.publicKey = typeof publicKey === "string" ? publicKey : "";
  wallet.addressType = addressTypeFor(accounts[0]);
  const balance = await wonder.getBalances();
  const confirmed = balance?.confirmed ?? 0;
  const unconfirmed = balance?.unconfirmed ?? 0;
  wallet.btcBalance = {
    confirmed,
    unconfirmed,
    total: balance?.total ?? confirmed + unconfirmed,
  };
  wallet.network = "mainnet";
  wallet.provider = "wonder";
  wallet.stampBalance = [];
  walletContext.updateWallet(wallet);
};

const registerProviderEvents = (provider: ReturnType<typeof getProvider>) => {
  provider?.on?.("accountsChanged", (accounts: unknown) => {
    void handleAccountsChanged(accounts);
  });
  provider?.on?.("disconnect", () => {
    walletContext.disconnect();
  });
};

// Wonder injects at document_start and announces itself with an event, so the
// provider can still be missing when this module first evaluates.
const wonderAtLoad = getProvider();
if (wonderAtLoad) {
  registerProviderEvents(wonderAtLoad);
} else if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener(
    "wonder-wallet#initialized",
    () => registerProviderEvents(getProvider()),
    { once: true },
  );
}

interface WonderSignOptions {
  autoFinalized: boolean;
  enableRBF: boolean;
  toSignInputs?: {
    index: number;
    address: string;
    sighashTypes?: number[] | undefined;
  }[];
  // Legacy (P2PKH/P2SH) inputs require the full previous transaction. Wonder
  // reads it from opts.prevTxs (keyed by display txid), not from the PSBT's own
  // nonWitnessUtxo, so we hand it across.
  prevTxs?: Record<string, string>;
}

interface WonderSignResult {
  txhex?: string;
  txid?: string;
  psbt?: string;
}

export const signPSBT = async (
  psbtHex: string,
  inputsToSign: { index: number }[],
  enableRBF = true,
  sighashTypes?: number[],
  autoBroadcast = true,
): Promise<SignPSBTResult> => {
  try {
    const wonder = getProvider();
    if (!wonder) {
      return { signed: false, error: "Wonder Wallet not connected" };
    }

    // Wonder is UniSat-style: with autoFinalized it returns the finalized
    // { txhex, txid }; without it, a signed { psbt }. It only signs the inputs
    // it owns, so an input map is optional.
    const options: WonderSignOptions = {
      autoFinalized: autoBroadcast,
      enableRBF,
    };
    if (inputsToSign?.length > 0) {
      options.toSignInputs = inputsToSign.map((input) => ({
        index: input.index,
        address: walletContext.wallet.address,
        sighashTypes,
      }));
    }

    // Legacy inputs can't be signed without their previous transactions. Our
    // PSBTs already embed those as nonWitnessUtxo, so extract them into the
    // prevTxs map Wonder expects. SegWit-only PSBTs yield an empty map (no-op).
    const prevTxs = extractPrevTxsFromPSBT(psbtHex);
    if (Object.keys(prevTxs).length > 0) {
      options.prevTxs = prevTxs;
    }

    const rawResult = await wonder.signPsbt(psbtHex, options);
    const result = rawResult as WonderSignResult | undefined;

    logger.debug("ui", {
      message: "Wonder signPsbt result",
      data: { hasTxhex: !!result?.txhex, hasPsbt: !!result?.psbt },
    });

    if (!result) {
      return { signed: false, error: "No result from Wonder Wallet" };
    }

    // autoBroadcast → the finalized txhex is ready to push to the network.
    if (autoBroadcast && result.txhex) {
      try {
        const txid = toTxid(await wonder.broadcastTransaction(result.txhex));
        if (!txid) {
          throw new Error("Wonder Wallet did not return a txid");
        }
        logger.info("ui", {
          message: "Successfully broadcast transaction",
          data: { txid },
        });
        return { signed: true, txid };
      } catch (_broadcastError) {
        return {
          signed: true,
          psbt: result.txhex,
          error: "Transaction signed but broadcast failed",
        };
      }
    }

    // Not broadcasting (or the wallet returned a signed PSBT to broadcast later).
    if (result.psbt) {
      return { signed: true, psbt: toPsbtHex(result.psbt) };
    }
    if (result.txhex) {
      return { signed: true, psbt: result.txhex };
    }
    return { signed: false, error: "No signed result from Wonder Wallet" };
  } catch (error: unknown) {
    return handleWalletError(error, "Wonder");
  }
};

export const signMessage = async (message: string): Promise<string> => {
  const wonder = getProvider();
  if (!wonder) {
    throw new Error("Wonder Wallet not connected");
  }
  return await wonder.signMessage(message);
};

export const broadcastRawTX = async (rawTx: string): Promise<string> => {
  const wonder = getProvider();
  if (!wonder) {
    throw new Error("Wonder Wallet not connected");
  }
  const txid = toTxid(await wonder.broadcastTransaction(rawTx));
  if (!txid) {
    throw new Error("Wonder Wallet did not return a txid");
  }
  return txid;
};

// Wonder has no push-PSBT method. The retry paths only ever hand back the
// finalized txhex from an autoFinalized sign, so reject anything still carrying
// the PSBT magic bytes rather than letting the extension fail on it.
export const broadcastPSBT = async (psbtHex: string): Promise<string> => {
  if (psbtHex.toLowerCase().startsWith("70736274ff")) {
    throw new Error(
      "Wonder Wallet cannot broadcast an unfinalized PSBT. " +
        "Re-sign the transaction to broadcast it.",
    );
  }
  return await broadcastRawTX(psbtHex);
};

// Export the provider
export const wonderProvider = {
  checkWonder,
  connectWonder,
  signPSBT,
  signMessage,
  broadcastRawTX,
  broadcastPSBT,
};
