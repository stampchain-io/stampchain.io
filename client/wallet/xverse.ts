/**
 * Xverse Wallet Integration for stampchain.io
 *
 * Provides Bitcoin wallet connectivity via the Xverse browser extension using the
 * sats-connect v2 compatible API exposed through window.XverseProviders.BitcoinProvider.
 *
 * Capabilities:
 *   - Provider detection (checkXverse)
 *   - Wallet connection with payment (P2WPKH) and ordinals (P2TR) addresses (connectXverse)
 *   - Message signing via ECDSA, or BIP-322 for the ordinals address (signMessage)
 *   - PSBT signing with automatic hex/base64 conversion (signPSBT)
 *
 * PSBT format: stampchain.io uses hex internally; Xverse requires base64.
 * All PSBT conversions are handled transparently by this module.
 */

import { walletContext } from "$client/wallet/wallet.ts";
import { parseConnectionError } from "$client/wallet/walletHelper.ts";
import {
  resolveXverseSigningAddress,
  xverseSigningProtocolFor,
} from "$client/wallet/xverseSigning.ts";
import { getBTCBalanceInfo } from "$lib/utils/data/processing/balanceUtils.ts";
import { logger } from "$lib/utils/logger.ts";
import type { BaseToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import type { SignPSBTResult, Wallet } from "$types/index.d.ts";
import type { PSBTInputToSign, XverseWalletAPI } from "$types/wallet.d.ts";
import { signal } from "@preact/signals";

type AddToastFunction = (message: string, type: BaseToast["type"]) => void;

// ============================================================================
// Detection Signal
// ============================================================================

export const isXverseInstalled = signal<boolean>(false);

// ============================================================================
// Provider Detection
// ============================================================================

/**
 * Check if the Xverse Bitcoin provider is available in the browser.
 * Updates the isXverseInstalled signal and returns the boolean result.
 */
export const checkXverse = (): boolean => {
  if (typeof globalThis === "undefined" || !("document" in globalThis)) {
    isXverseInstalled.value = false;
    return false;
  }

  const isAvailable = !!(globalThis as unknown as {
    XverseProviders?: { BitcoinProvider?: XverseWalletAPI };
  })
    .XverseProviders?.BitcoinProvider;

  isXverseInstalled.value = isAvailable;
  return isAvailable;
};

/**
 * Safely get the Xverse BitcoinProvider from the global window object.
 */
const getXverseProvider = (): XverseWalletAPI | undefined => {
  if (typeof globalThis === "undefined" || !("document" in globalThis)) {
    return undefined;
  }

  return (globalThis as unknown as {
    XverseProviders?: { BitcoinProvider?: XverseWalletAPI };
  }).XverseProviders?.BitcoinProvider;
};

// ============================================================================
// Connection
// ============================================================================

/**
 * Connect to the Xverse wallet and extract both payment and ordinals addresses.
 * Shows a toast notification on success or failure.
 */
export const connectXverse = async (addToast: AddToastFunction) => {
  try {
    const provider = getXverseProvider();

    if (!provider) {
      logger.warn("ui", {
        message: "Xverse wallet not detected",
      });
      addToast(
        "Xverse wallet not detected.\nPlease install the Xverse extension.",
        "error",
      );
      return;
    }

    logger.debug("ui", {
      message: "Connecting to Xverse wallet",
    });

    const response = await provider.getAddresses({
      purposes: ["payment", "ordinals"],
      message: "stampchain.io needs your Bitcoin addresses for transactions.",
    });

    const { addresses } = response;

    if (!addresses || addresses.length === 0) {
      throw new Error("No addresses received from Xverse wallet");
    }

    await handleConnect(addresses);

    logger.info("ui", {
      message: "Successfully connected to Xverse wallet",
    });
    addToast("Successfully connected to Xverse wallet.", "success");
  } catch (error) {
    // Check for user rejection
    if (isUserRejection(error)) {
      logger.info("ui", {
        message: "User rejected Xverse wallet connection",
      });
      addToast("Xverse connection cancelled by user.", "info");
      return;
    }

    const errorMessage = parseConnectionError(error);
    logger.error("ui", {
      message: "Error connecting to Xverse wallet",
      error: errorMessage,
      details: error,
    });
    addToast(
      `Failed to connect to Xverse wallet.\n${errorMessage}`,
      "error",
    );
  }
};

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Build the Wallet object from Xverse addresses and persist it via walletContext.
 *
 * Xverse returns:
 *   - purpose: 'payment', addressType: 'p2wpkh' -> Native SegWit (bc1q...)
 *   - purpose: 'ordinals', addressType: 'p2tr'  -> Taproot (bc1p...)
 *
 * We use the payment address as the primary wallet address and the ordinals
 * address as a secondary account entry.
 */
const handleConnect = async (
  addresses: Array<{
    address: string;
    publicKey: string;
    purpose: "payment" | "ordinals" | "stacks";
    addressType: "p2wpkh" | "p2tr" | "p2sh" | "p2pkh";
  }>,
) => {
  // Extract payment (P2WPKH) address - used for BTC sends and stamps
  const paymentAddr = addresses.find(
    (addr) => addr.purpose === "payment" && addr.addressType === "p2wpkh",
  );

  // Extract ordinals (P2TR) address - used for inscriptions/ordinals
  const ordinalsAddr = addresses.find(
    (addr) => addr.purpose === "ordinals" && addr.addressType === "p2tr",
  );

  if (!paymentAddr) {
    throw new Error("No payment (P2WPKH) address found from Xverse wallet");
  }

  if (!ordinalsAddr) {
    throw new Error("No ordinals (P2TR) address found from Xverse wallet");
  }

  logger.debug("ui", {
    message: "Xverse addresses extracted",
    data: {
      paymentAddress: paymentAddr.address,
      ordinalsAddress: ordinalsAddr.address,
    },
  });

  // Fetch BTC balance for the payment address
  const addressInfo = await getBTCBalanceInfo(paymentAddr.address);

  const wallet = {} as Wallet;
  // Primary payment address (P2WPKH, bc1q...) — used for BTC transfers, stamps, and balance
  wallet.address = paymentAddr.address;
  // Ordinals/inscriptions address (P2TR, bc1p...) — stored separately for ordinals operations
  wallet.ordinalsAddress = ordinalsAddr.address;
  // accounts array preserves both addresses for backward compatibility
  wallet.accounts = [paymentAddr.address, ordinalsAddr.address];
  wallet.publicKey = paymentAddr.publicKey;
  wallet.addressType = "p2wpkh";

  wallet.btcBalance = {
    confirmed: addressInfo?.balance ?? 0,
    unconfirmed: addressInfo?.unconfirmedBalance ?? 0,
    total: (addressInfo?.balance ?? 0) + (addressInfo?.unconfirmedBalance ?? 0),
  };

  wallet.network = "mainnet";
  wallet.provider = "xverse";
  wallet.stampBalance = [];

  walletContext.updateWallet(wallet);
};

// ============================================================================
// PSBT Hex/Base64 Conversion Utilities
// ============================================================================

/**
 * Convert a hex-encoded PSBT string to base64.
 * Xverse requires PSBTs in base64 format, while stampchain.io uses hex internally.
 */
export const hexToBase64 = (hex: string): string => {
  const bytes = hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16));
  return btoa(String.fromCharCode(...bytes));
};

/**
 * Convert a base64-encoded PSBT string back to hex.
 * Used to convert Xverse's base64 response back to stampchain.io's hex standard.
 */
export const base64ToHex = (base64: string): string => {
  const binary = atob(base64);
  return Array.from(binary)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
};

// ============================================================================
// PSBT Signing
// ============================================================================

/**
 * Sign a PSBT with the Xverse wallet.
 *
 * Conversion flow:
 *   psbtHex (stampchain standard) -> base64 -> Xverse signPsbt() -> base64 -> psbtHex
 *
 * Xverse signInputs format: Record<address, inputIndices[]>
 */
export const signPSBT = async (
  psbtHex: string,
  inputsToSign: PSBTInputToSign[],
  _enableRBF = true,
  _sighashTypes?: number[],
  autoBroadcast = true,
): Promise<SignPSBTResult> => {
  const provider = getXverseProvider();

  if (!provider) {
    logger.warn("ui", {
      message: "Xverse wallet not detected for PSBT signing",
    });
    return { signed: false, error: "Xverse wallet not detected" };
  }

  // Get current wallet address from walletContext
  const walletAddress = walletContext.wallet.address;

  if (!walletAddress) {
    logger.warn("ui", {
      message: "Xverse wallet not connected for PSBT signing",
    });
    return { signed: false, error: "Xverse wallet not connected" };
  }

  try {
    logger.debug("ui", {
      message: "Signing PSBT with Xverse",
      data: {
        psbtHexLength: psbtHex.length,
        inputsToSign,
        autoBroadcast,
      },
    });

    // Convert hex PSBT to base64 (Xverse requirement)
    const psbtBase64 = hexToBase64(psbtHex);

    // Map inputsToSign array to Xverse's Record<address, inputIndices[]> format
    const signInputs: Record<string, number[]> = {};
    for (const input of inputsToSign) {
      const addr = input.address || walletAddress;
      if (!signInputs[addr]) signInputs[addr] = [];
      signInputs[addr].push(input.index);
    }

    // Build sign options for Xverse API
    // Xverse's runtime API uses: { psbt: base64, signInputs: Record<addr, indices[]>, broadcast: bool }
    const signOptions = {
      psbt: psbtBase64,
      signInputs,
      broadcast: autoBroadcast,
    };

    // Call Xverse signPsbt via the request method (runtime API)
    const response = await provider.request("signPsbt", signOptions);

    if (!response || !response.result) {
      logger.error("ui", {
        message: "No result from Xverse signPsbt",
        data: { response },
      });
      return { signed: false, error: "No result from Xverse wallet" };
    }

    // Extract signed PSBT from response (base64 format from Xverse)
    const signedBase64 = response.result.psbt;

    if (!signedBase64) {
      logger.error("ui", {
        message: "Xverse signPsbt response missing psbt field",
        data: { response },
      });
      return {
        signed: false,
        error: "Xverse signing failed: missing psbt in response",
      };
    }

    // Convert signed PSBT back to hex (stampchain.io standard)
    const signedHex = base64ToHex(signedBase64);

    logger.debug("ui", {
      message: "Successfully signed PSBT with Xverse",
      data: { signedHexLength: signedHex.length },
    });

    const result: SignPSBTResult = { psbt: signedHex, signed: true };

    // Include txid if Xverse broadcasted the transaction
    if (response.result.txid) {
      result.txid = response.result.txid;
    }

    return result;
  } catch (error: any) {
    logger.error("ui", {
      message: "Error signing PSBT with Xverse",
      error: error instanceof Error ? error.message : String(error),
      details: error,
    });

    // Handle user rejection: Xverse RpcErrorCode.USER_REJECTION = -32000
    if (
      error?.code === -32000 ||
      error?.code === 4001 ||
      (typeof error?.error === "object" &&
        (error.error?.code === -32000 || error.error?.code === 4001))
    ) {
      return { signed: false, cancelled: true };
    }

    // Handle invalid parameters
    if (error?.code === -32602) {
      return {
        signed: false,
        error: "Invalid PSBT or signing parameters",
      };
    }

    // Generic error with context
    const message = error instanceof Error ? error.message : String(error);
    return {
      signed: false,
      error: `Xverse signing failed: ${message}`,
    };
  }
};

// ============================================================================
// Message Signing
// ============================================================================

/**
 * Sign an arbitrary message with the connected Xverse wallet.
 *
 * Signs with the payment address (ECDSA) by default. When `address` is the
 * wallet's ordinals address the message is signed with that address using
 * BIP-322 instead, so owner actions on resources keyed by the ordinals
 * address can be verified against that address.
 *
 * Error codes:
 *   - USER_REJECTION (-32000 / 4001): re-thrown as-is for caller to handle
 *   - INVALID_PARAMS (-32602): re-thrown as-is for caller to handle
 *
 * @param message - Arbitrary UTF-8 message string to sign
 * @param address - Optional address that must sign; must be one of the
 *   connected wallet's addresses
 * @returns Base64-encoded signature string
 * @throws {Error} "Xverse wallet not installed" if extension is absent
 * @throws {Error} "Wallet not connected" if no address is in walletContext
 * @throws {Error} if `address` is not controlled by the connected wallet
 * @throws {Error} "Unexpected response format from Xverse signMessage" for unknown responses
 */
export const signMessage = async (
  message: string,
  address?: string,
): Promise<string> => {
  const provider = getXverseProvider();
  if (!provider) {
    throw new Error("Xverse wallet not installed");
  }

  const wallet = walletContext.wallet;
  if (!wallet.address) {
    throw new Error("Wallet not connected");
  }

  const signingAddress = resolveXverseSigningAddress(wallet, address);
  const protocol = xverseSigningProtocolFor(signingAddress);

  try {
    logger.debug("ui", {
      message: "Signing message with Xverse",
      data: { messageLength: message.length, protocol },
    });

    const response = await provider.signMessage({
      address: signingAddress,
      message,
      protocol,
    });

    if (typeof response === "string") {
      return response;
    }
    if (typeof response === "object" && response !== null) {
      const r = response as { signature?: string; messageSignature?: string };
      const sig = r.signature || r.messageSignature;
      if (sig) return sig;
    }

    throw new Error("Unexpected response format from Xverse signMessage");
  } catch (error: any) {
    logger.error("ui", {
      message: "Error in Xverse signMessage",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

// ============================================================================
// Provider Object (WalletProvider interface compatible)
// ============================================================================

/**
 * Xverse wallet provider object implementing the WalletProvider interface
 * required by walletHelper.ts getWalletProvider().
 *
 * All methods are references to the standalone exported functions above,
 * ensuring that consumers can import either the provider object or individual
 * functions directly.
 *
 * Compatible with WalletProvider interface:
 *   - signMessage(message: string, address?: string): Promise<string>
 *   - signPSBT(psbtHex, inputsToSign, enableRBF?, sighashTypes?, autoBroadcast?): Promise<SignPSBTResult>
 *   - broadcastRawTX?(rawTx: string): Promise<string>  [not supported]
 *   - broadcastPSBT?(psbtHex: string): Promise<string>  [not supported]
 */
export const xverseProvider = {
  checkXverse,
  connectXverse,
  signMessage,
  signPSBT,

  broadcastRawTX: (_rawTx: string): Promise<string> => {
    return Promise.reject(
      new Error(
        "broadcastRawTX not supported by Xverse wallet - use external broadcast service",
      ),
    );
  },

  broadcastPSBT: (_psbtHex: string): Promise<string> => {
    return Promise.reject(
      new Error(
        "broadcastPSBT not supported by Xverse wallet - use external broadcast service",
      ),
    );
  },
};

/**
 * Check if an error represents a user rejection (e.g., user dismissed the
 * Xverse popup). Xverse uses RpcErrorCode.USER_REJECTION (-32000) or similar.
 */
const isUserRejection = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const err = error as Record<string, unknown>;

  // Xverse RpcErrorCode.USER_REJECTION = -32000
  if (err.code === -32000 || err.code === 4001) {
    return true;
  }

  // Check nested error structure
  if (typeof err.error === "object" && err.error !== null) {
    const inner = err.error as Record<string, unknown>;
    if (inner.code === -32000 || inner.code === 4001) {
      return true;
    }
  }

  // Check message for user rejection keywords
  const message = typeof err.message === "string" ? err.message : "";
  if (
    message.toLowerCase().includes("user rejected") ||
    message.toLowerCase().includes("user cancelled") ||
    message.toLowerCase().includes("user canceled") ||
    message.toLowerCase().includes("user denied")
  ) {
    return true;
  }

  return false;
};
