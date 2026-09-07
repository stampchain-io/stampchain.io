import { stackConnectWalletModal } from "$islands/layout/ModalStack.tsx";
import { openModal } from "$islands/modal/states.ts";
import { logger } from "$lib/utils/logger.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import type { WalletContext } from "$types/ui.d.ts";
import { signal } from "@preact/signals";

import type { Wallet } from "$types/index.d.ts";
import {
  broadcastPSBT,
  broadcastRawTX,
  signMessage,
  signPSBT,
} from "./walletHelper.ts";

// Add this at the very top of the file, before any imports
declare global {
  interface Window {
    __DEBUG?: {
      namespaces: string;
      enabled: boolean;
    };
  }
}

// Injected extension providers on window. Named separately from the
// WalletProviders alias (WalletProviderKey string union) in $types.
export interface GlobalWalletProviders {
  LeatherProvider?: any;
  okxwallet?: any;
  unisat?: any;
  tapwallet?: any;
  phantom?: any;
  HorizonWalletProvider?: any;
  XverseProviders?: { BitcoinProvider?: any };
  wonderWallet?: any;
}

// Initialize wallet state
export const initialWallet: Wallet = {
  accounts: [],
  address: "",
  btcBalance: {
    confirmed: 0,
    unconfirmed: 0,
    total: 0,
  },
  stampBalance: [],
  // Required properties for wallet interface
  publicKey: "",
  addressType: "p2wpkh",
  network: "mainnet",
  provider: "unisat",
};

let initialWalletState;
let initialConnected = false;
try {
  const savedWallet = localStorage.getItem("wallet");
  if (savedWallet) {
    const parsedWallet = JSON.parse(savedWallet);
    // Only consider connected if wallet has a non-empty address
    initialConnected = !!parsedWallet.address &&
      parsedWallet.address.length > 0;
    initialWalletState = parsedWallet;

    // If wallet data is invalid (no address or empty address), reset to initial state
    if (!parsedWallet.address || parsedWallet.address.length === 0) {
      console.warn(
        "Saved wallet has no valid address, resetting to initial state",
      );
      localStorage.removeItem("wallet");
      initialWalletState = initialWallet;
    }
  } else {
    initialWalletState = initialWallet;
  }
} catch (error) {
  console.error("Error reading the wallet state:", error);
  initialWalletState = initialWallet;
  localStorage.removeItem("wallet");
}

export const walletSignal = signal<Wallet>(initialWalletState);
export const isConnectedSignal = signal<boolean>(initialConnected);
export const showConnectWalletModal = signal<boolean>(false);

export const updateWallet = (wallet: Wallet) => {
  walletSignal.value = wallet;
  localStorage.setItem("wallet", JSON.stringify(wallet));
  isConnectedSignal.value = true;
};

export const disconnect = () => {
  walletSignal.value = initialWallet;
  isConnectedSignal.value = false;
  localStorage.removeItem("wallet");
  showToast("Wallet has been disconnected.", "success");
};

export const getBasicStampInfo = async (address: string) => {
  const response = await fetch(
    `/api/v2/balance/getStampsBalance?address=${encodeURIComponent(address)}`,
    { method: "GET" },
  );
  const { stampBalance } = await response.json();
  return { stampBalance };
};

// Wallet context with all functionality
export const walletContext: WalletContext = {
  get wallet() {
    return walletSignal.value;
  },
  get isConnected() {
    // Double-check that wallet has a non-empty address to be considered connected
    return isConnectedSignal.value && !!walletSignal.value.address &&
      walletSignal.value.address.length > 0;
  },
  updateWallet,
  disconnect,
  getBasicStampInfo,
  signMessage: async (message: string) => {
    return await signMessage(walletContext.wallet, message);
  },
  signPSBT: async (
    wallet: Wallet,
    psbt: string,
    inputsToSign: import("$types/wallet.d.ts").PSBTInputToSign[],
    enableRBF = true,
    sighashTypes?: number[],
    autoBroadcast = true,
  ) => {
    return await signPSBT(
      wallet,
      psbt,
      inputsToSign,
      enableRBF,
      sighashTypes,
      autoBroadcast,
    );
  },
  broadcastRawTX: async (rawTx: string) => {
    return await broadcastRawTX(walletContext.wallet, rawTx);
  },
  broadcastPSBT: async (psbtHex: string) => {
    return await broadcastPSBT(walletContext.wallet, psbtHex);
  },
  showConnectModal: () => {
    const { modalContent } = stackConnectWalletModal();
    openModal(modalContent, "slideUpDown");
  },
};

// Add SES error suppression for wallet extensions
if (typeof globalThis !== "undefined" && "addEventListener" in globalThis) {
  globalThis.addEventListener("error", (event) => {
    // Suppress SES errors from wallet extensions
    if (
      event.error &&
      (event.error.message?.includes("SES_UNCAUGHT_EXCEPTION") ||
        event.filename?.includes("lockdown-install.js"))
    ) {
      event.preventDefault();
      console.debug("wallet", {
        message: "Suppressed SES error from wallet extension",
        error: event.error?.message,
        filename: event.filename,
      });
    }
  });

  globalThis.addEventListener("unhandledrejection", (event) => {
    // Suppress SES promise rejections from wallet extensions
    if (
      event.reason &&
      (event.reason.message?.includes("SES_UNCAUGHT_EXCEPTION") ||
        event.reason.stack?.includes("lockdown-install.js"))
    ) {
      event.preventDefault();
      console.debug("wallet", {
        message: "Suppressed SES promise rejection from wallet extension",
        reason: event.reason?.message,
      });
    }
  });
}

// Provider checking functions
export function getGlobalWallets(): GlobalWalletProviders {
  // Skip provider checks if we're not in a browser context
  if (typeof globalThis === "undefined" || !("document" in globalThis)) {
    return {};
  }

  try {
    // Only log wallet availability on client-side
    const global = globalThis as unknown as {
      LeatherProvider?: unknown;
      okxwallet?: { bitcoin?: unknown };
      unisat?: unknown;
      tapwallet?: unknown;
      phantom?: { bitcoin?: { isPhantom?: boolean } };
      HorizonWalletProvider?: unknown;
      wonderWallet?: unknown;
    };

    logger.debug("ui", {
      message: "Checking wallet providers (client-side)",
      data: {
        hasLeather: Boolean(global.LeatherProvider),
        hasOKX: Boolean(global.okxwallet?.bitcoin),
        hasUnisat: Boolean(global.unisat),
        hasTapWallet: Boolean(global.tapwallet),
        hasPhantom: Boolean(global.phantom?.bitcoin?.isPhantom),
        hasHorizon: Boolean(global.HorizonWalletProvider),
        hasWonder: Boolean(global.wonderWallet),
        timestamp: new Date().toISOString(),
      },
    });

    return {
      LeatherProvider: global.LeatherProvider,
      okxwallet: global.okxwallet,
      unisat: global.unisat,
      tapwallet: global.tapwallet,
      phantom: global.phantom,
      HorizonWalletProvider: global.HorizonWalletProvider,
      wonderWallet: global.wonderWallet,
    };
  } catch (_error) {
    // Silently handle wallet detection errors to prevent console spam
    // This can happen when browser extensions are not properly loaded
    return {};
  }
}

// Update wallet availability checks
export function checkWalletAvailability(provider: string): boolean {
  // Skip checks if we're not in a browser context
  if (typeof globalThis === "undefined" || !("document" in globalThis)) {
    return false;
  }

  const wallets = getGlobalWallets();

  switch (provider) {
    case "leather":
      return !!wallets.LeatherProvider;
    case "okx":
      return !!wallets.okxwallet?.bitcoin;
    case "unisat":
      return !!wallets.unisat;
    case "tapwallet":
      return !!wallets.tapwallet;
    case "phantom":
      return !!wallets.phantom?.bitcoin?.isPhantom;
    case "horizon":
      return !!wallets.HorizonWalletProvider;
    case "xverse":
      return !!wallets.XverseProviders?.BitcoinProvider;
    case "wonder":
      return !!wallets.wonderWallet;
    default:
      return false;
  }
}
