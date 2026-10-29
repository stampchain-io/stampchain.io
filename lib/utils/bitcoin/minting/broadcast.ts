// lib/utils/minting/broadcast.ts
import { Psbt, Transaction } from "bitcoinjs-lib";
import { logger } from "$lib/utils/logger.ts";

// Removed unused interface: BroadcastResponse

const BROADCAST_ENDPOINTS = [
  "https://mempool.space/api/tx",
  "https://blockstream.info/api/tx",
  "https://api.blockcypher.com/v1/btc/main/txs/push",
] as const;

/**
 * The chain the page was served for, from the `data-chain` attribute that
 * routes/_app.tsx renders on <html> only under CHAIN=ecx. Absent means Bitcoin.
 */
export function getPageChain(): "bitcoin" | "ecx" {
  const chain = (globalThis as { document?: Document }).document
    ?.documentElement?.dataset?.chain;
  return chain === "ecx" ? "ecx" : "bitcoin";
}

/**
 * Thrown when an ECX page cannot hand a signed transaction to the server
 * (the server answers 404 because it is not running CHAIN=ecx). Nothing is
 * sent anywhere else: the built-in endpoints above are Bitcoin nodes.
 */
export const ECX_BROWSER_BROADCAST_REFUSED =
  "Broadcasting from the browser is disabled on ECX: the built-in broadcast " +
  "endpoints are Bitcoin nodes. The transaction was signed but not sent.";

/** The server route that gates ECX transactions and sends them to our ECX node. */
export const ECX_BROADCAST_PATH = "/api/v2/ecx/broadcast";

const PSBT_MAGIC_HEX = "70736274ff";

/**
 * A wallet's signed output as a finalized raw transaction hex. Wallets hand
 * back a raw transaction, a finalized PSBT, or a signed but unfinalized PSBT
 * (hex or base64); inputs that are not yet finalized are finalized here.
 */
export function toRawTransactionHex(signed: string): string {
  const trimmed = signed.trim();
  const isHex = /^[0-9a-fA-F]+$/.test(trimmed);
  if (isHex && !trimmed.toLowerCase().startsWith(PSBT_MAGIC_HEX)) {
    Transaction.fromHex(trimmed); // throws when it is not a transaction
    return trimmed.toLowerCase();
  }
  const psbt = isHex ? Psbt.fromHex(trimmed) : Psbt.fromBase64(trimmed);
  psbt.data.inputs.forEach((input, index) => {
    if (!input.finalScriptSig && !input.finalScriptWitness) {
      psbt.finalizeInput(index);
    }
  });
  return psbt.extractTransaction().toHex();
}

/**
 * ECX hand-off: POST the signed transaction to the server, which runs the
 * broadcast gate and sends it to our ECX node. Returns the node's txid.
 * Never contacts a Bitcoin endpoint.
 */
export async function broadcastViaEcxServer(
  signed: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  let txHex: string;
  try {
    txHex = toRawTransactionHex(signed);
  } catch (error) {
    throw new Error(
      `Failed to finalize the signed transaction: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const response = await fetchImpl(ECX_BROADCAST_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHex }),
  });
  if (response.status === 404) {
    throw new Error(ECX_BROWSER_BROADCAST_REFUSED);
  }
  const body = await response.json().catch(() => null) as
    | { txid?: unknown; error?: unknown }
    | null;
  if (!response.ok) {
    const reason = typeof body?.error === "string"
      ? body.error
      : `HTTP ${response.status}`;
    throw new Error(`ECX broadcast failed: ${reason}`);
  }
  if (typeof body?.txid !== "string" || body.txid.length === 0) {
    throw new Error("ECX broadcast failed: the server returned no txid");
  }
  return body.txid;
}

export async function broadcastTransaction(
  signedPsbtHex: string,
): Promise<string> {
  // ECX transactions must never reach the Bitcoin endpoints below: hand them
  // to the server's ECX broadcast route before converting or sending.
  if (getPageChain() === "ecx") {
    return await broadcastViaEcxServer(signedPsbtHex);
  }

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
