// Shared helper for reconstructing PSBT inputs from a Counterparty-composed
// rawtransaction, used by the send and stamp-attach routes.
//
// Background (#1137): both routes previously processed ONLY `cpTx.ins[0]` and
// logged a warning that dropped any remaining inputs. If Counterparty funds the
// source address from several UTXOs (small-UTXO wallets), the resulting
// single-input PSBT is underfunded and the broadcast fails. This helper
// iterates ALL of the rawtransaction's inputs IN ORDER.
//
// Order preservation is REQUIRED: the Counterparty payload (OP_RETURN / bare
// multisig) is ARC4-keyed against `vin[0]`, so vin[0] must stay the input
// Counterparty composed first. We never sort or drop inputs.
//
// The fetcher is typed structurally (not as the concrete CommonUTXOService) so
// this lib/ helper stays decoupled from server/ and is trivially mockable in
// unit tests.

import { Buffer } from "node:buffer";
import { hex2bin } from "$lib/utils/binary/baseUtils.ts";
import { getScriptTypeInfo } from "$lib/utils/scriptTypeUtils.ts";

/** Minimal UTXO-detail shape the input builder needs. */
export interface CpInputUtxoDetails {
  script?: string;
  value?: number | bigint;
  rawTxHex?: string;
  redeemScript?: string;
}

/**
 * Structural fetcher interface. CommonUTXOService satisfies this; tests pass a
 * lightweight mock. Keeps lib/ from importing server/.
 */
export interface CpUtxoFetcher {
  getSpecificUTXO(
    txid: string,
    vout: number,
  ): Promise<CpInputUtxoDetails | null>;
  getRawTransactionHex(txid: string): Promise<string | null>;
}

/** PSBT input payload (the object passed to psbt.addInput) plus its value. */
export interface BuiltPsbtInput {
  inputData: {
    hash: string;
    index: number;
    sequence?: number;
    witnessUtxo?: { script: Buffer; value: bigint };
    nonWitnessUtxo?: Buffer;
    redeemScript?: Buffer;
  };
  value: bigint;
}

/** A previous-output reference plus the sequence to use for it. */
export interface CpPrevout {
  txid: string;
  vout: number;
  sequence?: number;
}

export interface InputToSign {
  index: number;
  address: string;
  sighashTypes?: number[];
}

/**
 * Build PSBT input data for a single previous output, fetching its script
 * details. Fails closed (throws) if the UTXO cannot be resolved — silently
 * dropping an input would underfund the transaction.
 */
export async function buildCpPsbtInput(
  fetcher: CpUtxoFetcher,
  prevout: CpPrevout,
): Promise<BuiltPsbtInput> {
  const { txid, vout, sequence } = prevout;
  const utxo = await fetcher.getSpecificUTXO(txid, vout);
  if (!utxo || !utxo.script || utxo.value === undefined) {
    throw new Error(
      `Failed to fetch UTXO details for input ${txid}:${vout} from CP raw tx.`,
    );
  }

  const scriptTypeInfo = getScriptTypeInfo(utxo.script);
  const inputData: BuiltPsbtInput["inputData"] = {
    hash: txid,
    index: vout,
    ...(sequence !== undefined ? { sequence } : {}),
  };

  if (scriptTypeInfo.isWitness) {
    inputData.witnessUtxo = {
      script: Buffer.from(hex2bin(utxo.script)),
      value: BigInt(utxo.value),
    };
  } else {
    // Non-witness inputs require the full previous transaction.
    const rawTxHex = utxo.rawTxHex ?? await fetcher.getRawTransactionHex(txid);
    if (!rawTxHex) {
      throw new Error(
        `Failed to get raw tx hex for non-witness input ${txid}.`,
      );
    }
    inputData.nonWitnessUtxo = Buffer.from(hex2bin(rawTxHex));
  }

  // Attach the redeem script for any P2SH input that carries one (covers
  // P2SH-P2WPKH / P2SH-P2WSH and bare P2SH). Harmless when absent.
  if (scriptTypeInfo.type === "P2SH" && utxo.redeemScript) {
    inputData.redeemScript = Buffer.from(hex2bin(utxo.redeemScript));
  }

  return { inputData, value: BigInt(utxo.value) };
}

/**
 * Build PSBT inputs for ALL inputs of a Counterparty-composed rawtransaction,
 * in their original order (vin[0] stays the ARC4 key — see file header).
 *
 * Returns the input payloads (for psbt.addInput, in order), the inputsToSign
 * descriptors (index i per input), and the summed input value (for fee/change
 * accounting by callers that fund their own change).
 */
export async function buildCpPsbtInputsFromRawTx(
  fetcher: CpUtxoFetcher,
  cpTxIns: ReadonlyArray<{ hash: Uint8Array; index: number; sequence: number }>,
  signerAddress: string,
  sighashTypes: number[],
): Promise<{
  builtInputs: BuiltPsbtInput[];
  inputsToSign: InputToSign[];
  totalInputValue: bigint;
}> {
  if (!cpTxIns || cpTxIns.length === 0) {
    throw new Error("Counterparty raw transaction has no inputs.");
  }

  const builtInputs: BuiltPsbtInput[] = [];
  const inputsToSign: InputToSign[] = [];
  let totalInputValue = BigInt(0);

  for (let i = 0; i < cpTxIns.length; i++) {
    const cpIn = cpTxIns[i];
    const txid = Buffer.from(cpIn.hash).reverse().toString("hex");
    const built = await buildCpPsbtInput(fetcher, {
      txid,
      vout: cpIn.index,
      sequence: cpIn.sequence,
    });
    builtInputs.push(built);
    totalInputValue += built.value;
    inputsToSign.push({ index: i, address: signerAddress, sighashTypes });
  }

  return { builtInputs, inputsToSign, totalInputValue };
}
