/**
 * PSBT (Partially Signed Bitcoin Transaction) Utilities
 *
 * Helper functions for working with PSBTs, including extraction of raw transactions
 * for submission to services that don't accept PSBT format.
 */

import * as bitcoin from "bitcoinjs-lib";
import { logger } from "$lib/utils/logger.ts";

/**
 * Extracts a raw transaction hex from a fully signed PSBT
 *
 * @param psbtHex - The PSBT in hex format
 * @returns The raw transaction hex if successful, null if extraction fails
 *
 * @example
 * ```ts
 * const psbtHex = "70736274ff..."; // PSBT hex from wallet
 * const rawTx = extractRawTransactionFromPSBT(psbtHex);
 * if (rawTx) {
 *   // Submit rawTx to services that expect raw transaction format
 *   await submitTransaction(rawTx);
 * }
 * ```
 */
export function extractRawTransactionFromPSBT(psbtHex: string): string | null {
  try {
    const psbt = bitcoin.Psbt.fromHex(psbtHex);

    // Check if all inputs are finalized
    const allFinalized = psbt.data.inputs.every((input) =>
      input.finalScriptSig !== undefined ||
      input.finalScriptWitness !== undefined
    );

    if (!allFinalized) {
      logger.info("psbt", {
        message: "PSBT signed but not finalized, attempting to finalize",
        inputCount: psbt.data.inputs.length,
        signedCount: psbt.data.inputs.filter((input) =>
          input.partialSig && input.partialSig.length > 0
        ).length,
      });

      // Try to finalize the PSBT
      try {
        psbt.finalizeAllInputs();
        logger.info("psbt", {
          message: "Successfully finalized PSBT",
        });
      } catch (finalizeError) {
        logger.error("psbt", {
          message: "Failed to finalize PSBT",
          error: finalizeError instanceof Error
            ? finalizeError.message
            : String(finalizeError),
        });
        return null;
      }
    }

    // Extract the raw transaction
    const tx = psbt.extractTransaction();
    const rawTxHex = tx.toHex();

    logger.info("psbt", {
      message: "Successfully extracted raw transaction from PSBT",
      psbtLength: psbtHex.length,
      rawTxLength: rawTxHex.length,
      inputCount: tx.ins.length,
      outputCount: tx.outs.length,
    });

    return rawTxHex;
  } catch (error) {
    logger.error("psbt", {
      message: "Failed to extract raw transaction from PSBT",
      error: error instanceof Error ? error.message : String(error),
      psbtPreview: psbtHex.substring(0, 20) + "...",
    });
    return null;
  }
}

/**
 * Extracts the previous transactions embedded on a PSBT's inputs as
 * `nonWitnessUtxo`, keyed by their (display) txid.
 *
 * Legacy (non-witness / P2PKH, P2SH) inputs require the full previous
 * transaction to be signed. stampchain's transaction builders already embed it
 * as `nonWitnessUtxo` on each such input, but wallets that want it as a separate
 * `prevTxs` map (e.g. Wonder Wallet's `signPsbt({ prevTxs })`) can't read it off
 * the PSBT directly. This pulls it out so it can be handed to them, with no
 * extra round-trip. SegWit inputs carry `witnessUtxo` instead and are skipped.
 *
 * @param psbtHex - The PSBT in hex format
 * @returns A map of `{ [txid]: rawTxHex }` for every non-witness input; empty
 *          when the PSBT is SegWit-only or cannot be parsed.
 */
export function extractPrevTxsFromPSBT(
  psbtHex: string,
): Record<string, string> {
  const prevTxs: Record<string, string> = {};
  try {
    const psbt = bitcoin.Psbt.fromHex(psbtHex);
    for (const input of psbt.data.inputs) {
      if (!input.nonWitnessUtxo) continue;
      const prevTx = bitcoin.Transaction.fromBuffer(input.nonWitnessUtxo);
      // getId() is the display (big-endian) txid, which is the key wallets and
      // block explorers use.
      prevTxs[prevTx.getId()] = prevTx.toHex();
    }
  } catch (error) {
    logger.warn("psbt", {
      message: "Failed to extract prevTxs from PSBT",
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return prevTxs;
}

/**
 * Checks if a hex string is a PSBT by looking for magic bytes
 *
 * @param hex - The hex string to check
 * @returns true if the hex appears to be a PSBT
 */
export function isPSBTHex(hex: string): boolean {
  // PSBT magic bytes: 0x70736274 (ASCII for "psbt")
  return hex.toLowerCase().startsWith("70736274");
}

/**
 * Validates that a PSBT is fully signed and ready for extraction
 *
 * @param psbtHex - The PSBT in hex format
 * @returns Object with validation status and details
 */
export function validatePSBTForExtraction(psbtHex: string): {
  isValid: boolean;
  isFullySigned: boolean;
  inputCount: number;
  signedCount: number;
  error?: string;
} {
  try {
    const psbt = bitcoin.Psbt.fromHex(psbtHex);

    const signedInputs = psbt.data.inputs.filter((input) =>
      input.finalScriptSig !== undefined ||
      input.finalScriptWitness !== undefined
    );

    const isFullySigned = signedInputs.length === psbt.data.inputs.length;

    return {
      isValid: true,
      isFullySigned,
      inputCount: psbt.data.inputs.length,
      signedCount: signedInputs.length,
    };
  } catch (error) {
    return {
      isValid: false,
      isFullySigned: false,
      inputCount: 0,
      signedCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extracts transaction ID from a PSBT or raw transaction hex
 *
 * @param hex - Either a PSBT or raw transaction hex
 * @returns The transaction ID if extraction is successful, null otherwise
 */
export function extractTxidFromHex(hex: string): string | null {
  try {
    let tx: bitcoin.Transaction;

    if (isPSBTHex(hex)) {
      const psbt = bitcoin.Psbt.fromHex(hex);
      // For PSBT, we need it to be finalized to get the actual txid
      const validation = validatePSBTForExtraction(hex);
      if (!validation.isFullySigned) {
        logger.warn("psbt", {
          message: "Cannot extract txid from unsigned PSBT",
        });
        return null;
      }
      tx = psbt.extractTransaction();
    } else {
      // Assume it's a raw transaction
      tx = bitcoin.Transaction.fromHex(hex);
    }

    return tx.getId();
  } catch (error) {
    logger.error("psbt", {
      message: "Failed to extract txid from hex",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Finalizes a PSBT if needed and returns the finalized version
 *
 * @param psbtHex - The PSBT in hex format
 * @returns The finalized PSBT hex if successful, null if finalization fails
 */
export function finalizePSBT(psbtHex: string): string | null {
  try {
    const psbt = bitcoin.Psbt.fromHex(psbtHex);

    // Check if already finalized
    const allFinalized = psbt.data.inputs.every((input) =>
      input.finalScriptSig !== undefined ||
      input.finalScriptWitness !== undefined
    );

    if (!allFinalized) {
      logger.info("psbt", {
        message: "Finalizing PSBT",
        inputCount: psbt.data.inputs.length,
      });

      psbt.finalizeAllInputs();
    }

    return psbt.toHex();
  } catch (error) {
    logger.error("psbt", {
      message: "Failed to finalize PSBT",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Converts a PSBT to raw transaction format if possible
 * Falls back to original hex if not a PSBT or extraction fails
 *
 * @param hex - Either a PSBT or raw transaction hex
 * @param preferPSBT - If true, returns finalized PSBT instead of raw tx
 * @returns Object with the appropriate hex and metadata
 */
export function ensureRawTransactionFormat(
  hex: string,
  preferPSBT: boolean = false,
): {
  hex: string;
  wasConverted: boolean;
  isPSBT: boolean;
  isFinalized?: boolean;
  error?: string;
} {
  if (!isPSBTHex(hex)) {
    return {
      hex,
      wasConverted: false,
      isPSBT: false,
    };
  }

  // If preferPSBT is true, try to return finalized PSBT
  if (preferPSBT) {
    const finalizedPSBT = finalizePSBT(hex);
    if (finalizedPSBT) {
      return {
        hex: finalizedPSBT,
        wasConverted: true,
        isPSBT: true,
        isFinalized: true,
      };
    }
  }

  // Otherwise extract raw transaction
  const rawTx = extractRawTransactionFromPSBT(hex);

  if (rawTx) {
    return {
      hex: rawTx,
      wasConverted: true,
      isPSBT: true,
    };
  }

  // Extraction failed, return original
  return {
    hex,
    wasConverted: false,
    isPSBT: true,
    error: "Failed to extract raw transaction from PSBT",
  };
}
