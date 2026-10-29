// lib/utils/minting/broadcast.ts
import { Psbt } from "bitcoinjs-lib";
import { logger } from "$lib/utils/logger.ts";

// Removed unused interface: BroadcastResponse

const BROADCAST_ENDPOINTS = [
  "https://mempool.space/api/tx",
  "https://blockstream.info/api/tx",
  "https://api.blockcypher.com/v1/btc/main/txs/push",
] as const;

export async function broadcastTransaction(
  signedPsbtHex: string,
): Promise<string> {
  // We need a special case for build mode, but this never runs in production
  if (Deno.args.includes("build")) {
    logger.warn("broadcast", {
      message: "Running in build mode - broadcast functionality disabled",
    });
    return "BUILD_MODE_DUMMY_TXID";
  }

  // Regular implementation that works at runtime
  let rawTxHex: string;

  // Simple check to detect if this might already be a raw transaction
  const isPossiblyRawTx = /^[0-9a-f]+$/i.test(signedPsbtHex) &&
    !signedPsbtHex.includes("70736274");
  if (isPossiblyRawTx) {
    logger.debug("broadcast", {
      message:
        "Input appears to be a raw transaction, skipping PSBT conversion",
    });
    rawTxHex = signedPsbtHex;
  } else {
    try {
      // Use directly imported Psbt from bitcoinjs-lib
      const psbt = Psbt.fromHex(signedPsbtHex);

      // Validate that the PSBT is signed
      if (!psbt.validateSignaturesOfAllInputs(() => true)) {
        throw new Error("PSBT is not fully signed");
      }

      // Finalize and extract
      psbt.finalizeAllInputs();
      rawTxHex = psbt.extractTransaction().toHex();

      logger.debug("broadcast", {
        message: "Converted PSBT to raw transaction",
        data: { rawTxLength: rawTxHex.length },
      });
    } catch (error) {
      logger.error("broadcast", {
        message: "Failed to convert PSBT to raw transaction",
        error,
      });
      throw new Error(
        `Failed to convert PSBT: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  let lastError: Error | null = null;

  for (const endpoint of BROADCAST_ENDPOINTS) {
    try {
      logger.debug("broadcast", {
        message: `Attempting to broadcast via ${endpoint}`,
        data: { endpoint },
      });

      const payload = endpoint.includes("blockcypher")
        ? JSON.stringify({ tx: rawTxHex })
        : rawTxHex;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": endpoint.includes("blockcypher")
            ? "application/json"
            : "text/plain",
        },
        body: payload,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Broadcasting failed: ${error}`);
      }

      let txid: string;
      if (endpoint.includes("blockcypher")) {
        const json = await response.json();
        txid = json.tx.hash;
      } else {
        txid = await response.text();
      }

      logger.debug("broadcast", {
        message: "Transaction broadcast successful",
        data: { endpoint, txid },
      });

      return txid;
    } catch (error) {
      logger.error("broadcast", {
        message: `Broadcast attempt failed for ${endpoint}`,
        error,
      });
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  const errorMessage = `All broadcast attempts failed. Last error: ${
    lastError?.message || "Unknown error"
  }`;
  logger.error("broadcast", {
    message: errorMessage,
    error: lastError,
  });
  throw new Error(errorMessage);
}
