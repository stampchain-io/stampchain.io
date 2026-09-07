import { horizonProvider } from "$client/wallet/horizon.ts";
import { leatherProvider } from "$client/wallet/leather.ts";
import { okxProvider } from "$client/wallet/okx.ts";
import { phantomProvider } from "$client/wallet/phantom.ts";
import { tapWalletProvider } from "$client/wallet/tapwallet.ts";
import { unisatProvider } from "$client/wallet/unisat.ts";
import { wonderProvider } from "$client/wallet/wonder.ts";
import { xverseProvider } from "$client/wallet/xverse.ts";
import { logger } from "$lib/utils/logger.ts";
import type { SignPSBTResult, Wallet } from "$types/index.d.ts";
import type { PSBTInputToSign } from "$types/wallet.d.ts";

interface WalletProvider {
  signMessage: (message: string) => Promise<string>;
  signPSBT: (
    psbtHex: string,
    inputsToSign: PSBTInputToSign[],
    enableRBF?: boolean,
    sighashTypes?: number[],
    autoBroadcast?: boolean,
  ) => Promise<SignPSBTResult>;
  broadcastRawTX?: (rawTx: string) => Promise<string>;
  broadcastPSBT?: (psbtHex: string) => Promise<string>;
}

// Add shared error handling
interface JSONRPCError {
  jsonrpc?: string;
  id?: string;
  error?: {
    code?: number;
    message?: string;
  };
}

interface WalletError extends JSONRPCError {
  details?: {
    error?: {
      message?: string;
      code?: number;
    };
  };
  message?: string;
}

// Helper function to parse connection errors
export function parseConnectionError(error: unknown): string {
  // Handle string errors directly
  if (typeof error === "string") {
    return error;
  }

  // Handle Error instances
  if (error instanceof Error) {
    // Check for user rejection patterns
    const message = error.message.toLowerCase();
    if (
      message.includes("user rejected") ||
      message.includes("user denied") ||
      message.includes("user cancelled") ||
      message.includes("rejected by user") ||
      message.includes("cancelled by user") ||
      message === "cancelled"
    ) {
      return "User rejected the connection request.";
    }
    return error.message || "Unknown error";
  }

  // Handle JSON-RPC style errors (error code 4001 = user rejection)
  const jsonRpcError = error as JSONRPCError;
  if (jsonRpcError?.error) {
    if (jsonRpcError.error.code === 4001) {
      return "User rejected the connection request.";
    }
    if (jsonRpcError.error.message) {
      return jsonRpcError.error.message;
    }
  }

  // Cast to our known error structure for other cases
  const walletError = error as WalletError;

  // Check for nested error structures
  if (walletError?.details?.error?.message) {
    return walletError.details.error.message;
  }

  // Check for direct message property
  if (walletError?.message) {
    return walletError.message;
  }

  // Default error
  return "Unknown error";
}

export function handleWalletError(
  error: unknown,
  walletName: string,
): SignPSBTResult {
  logger.error("ui", {
    message: `Error signing PSBT with ${walletName}`,
    error,
    details: error instanceof Error ? error : undefined,
  });

  // Handle string errors directly
  if (typeof error === "string") {
    return {
      signed: false,
      error: error,
    };
  }

  // Handle Error instances
  if (error instanceof Error) {
    return {
      signed: false,
      error: error.message,
    };
  }

  // Handle JSON-RPC style errors first (most common for wallets)
  const jsonRpcError = error as JSONRPCError;
  if (jsonRpcError?.error?.message) {
    return {
      signed: false,
      error: jsonRpcError.error.message,
    };
  }

  // Cast to our known error structure for other cases
  const walletError = error as WalletError;

  // Check for nested error structures
  if (walletError?.details?.error?.message) {
    return {
      signed: false,
      error: walletError.details.error.message,
    };
  }

  // Check for direct message property
  if (walletError?.message) {
    return {
      signed: false,
      error: walletError.message,
    };
  }

  // Default error with wallet context
  return {
    signed: false,
    error: `Unknown error occurred with ${walletName}`,
  };
}

export const getWalletProvider = (
  provider: string | undefined,
): WalletProvider => {
  logger.debug("ui", {
    message: "Getting wallet provider",
    data: {
      provider,
      stack: new Error().stack,
    },
  });
  console.log("Getting wallet provider for:", provider);
  switch (provider) {
    case "leather":
      return leatherProvider;
    case "okx":
      return okxProvider;
    case "unisat":
      return unisatProvider;
    case "tapwallet":
      return tapWalletProvider;
    case "phantom":
      return phantomProvider;
    case "horizon":
      return horizonProvider;
    case "xverse":
      return xverseProvider;
    case "wonder":
      return wonderProvider;
    default:
      throw new Error(`Unsupported wallet provider: ${provider}`);
  }
};

export const signMessage = async (wallet: Wallet, message: string) => {
  console.log("Signing message for wallet:", wallet.provider);
  console.log("Message to sign:", message);
  if (!wallet.provider) throw new Error("No wallet provider specified");
  const provider = getWalletProvider(wallet.provider);
  return await provider.signMessage(message);
};

export const signPSBT = async (
  wallet: Wallet,
  psbtHex: string,
  inputsToSign: PSBTInputToSign[],
  enableRBF = true,
  sighashTypes?: number[],
  autoBroadcast = true,
): Promise<SignPSBTResult> => {
  console.log("Entering signPSBT in walletHelper.ts");
  console.log("Wallet provider:", wallet.provider);
  console.log("PSBT hex length:", psbtHex.length);
  console.log("Number of inputs to sign:", inputsToSign.length);
  console.log("Enable RBF:", enableRBF);

  if (!wallet.provider) {
    console.error("No wallet provider specified");
    return { signed: false, error: "No wallet provider specified" };
  }

  const provider = getWalletProvider(wallet.provider);
  console.log("Got wallet provider:", provider);

  try {
    console.log("Calling provider.signPSBT");
    const inputIndexToSign = inputsToSign.map((input) => ({
      index: input.index,
    }));
    console.log("input Index to Sign", inputIndexToSign);
    const result = await provider.signPSBT(
      psbtHex,
      inputIndexToSign,
      enableRBF,
      sighashTypes,
      autoBroadcast,
    );
    console.log("PSBT signing result:", JSON.stringify(result, null, 2));

    if (!result) {
      return { signed: false, error: "No result from wallet provider" };
    }

    if (result.signed) {
      return {
        signed: true,
        psbt: result.psbt || "",
        txid: result.txid || "",
        error: result.error || "",
      };
    } else if (result.cancelled) {
      return { signed: false, cancelled: true };
    } else {
      // If result contains an error message, use it
      if (result?.error) {
        return {
          signed: false,
          error: result.error,
        };
      }
      return {
        signed: false,
        error: "Failed to sign PSBT",
      };
    }
  } catch (error) {
    console.error("Error in signPSBT:", error);
    console.log("Error details:", JSON.stringify(error, null, 2));

    // Use the handleWalletError function to process the error
    return handleWalletError(error, wallet.provider || "unknown");
  }
};

export const broadcastRawTX = async (wallet: Wallet, rawTx: string) => {
  console.log("Broadcasting raw TX for wallet:", wallet.provider);
  if (!wallet.provider) throw new Error("No wallet provider specified");
  const provider = getWalletProvider(wallet.provider);
  if (!provider.broadcastRawTX) {
    throw new Error(
      `${wallet.provider} does not support broadcasting raw transactions`,
    );
  }
  return await provider.broadcastRawTX(rawTx);
};

export const broadcastPSBT = async (wallet: Wallet, psbtHex: string) => {
  console.log("Broadcasting PSBT for wallet:", wallet.provider);
  if (!wallet.provider) throw new Error("No wallet provider specified");
  const provider = getWalletProvider(wallet.provider);
  if (!provider.broadcastPSBT) {
    throw new Error(`${wallet.provider} does not support broadcasting PSBT`);
  }
  return await provider.broadcastPSBT(psbtHex);
};
