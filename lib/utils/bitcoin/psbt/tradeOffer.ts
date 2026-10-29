/**
 * UTXO atomic-swap PSBTs.
 *
 * Counterparty moves every asset on a spent UTXO to the first non-OP_RETURN
 * output. SIGHASH_SINGLE locks input n to output n, so the seller's payment
 * cannot be output 0. The offer leaves a placeholder slot at index 0. The
 * buyer replaces that slot with their funding input and their receive output,
 * and the seller's signed input stays at index 1.
 */
import { estimateFee } from "$lib/utils/bitcoin/minting/feeCalculations.ts";
import { Buffer } from "node:buffer";
import { address as bjsAddress, networks, Psbt } from "bitcoinjs-lib";

export const SALE_SIGHASH = 0x03 | 0x80; // SIGHASH_SINGLE | ANYONECANPAY
export const SIGHASH_ALL = 0x01;
/** Dust placeholder the buyer replaces. Not the stamp and not the payment. */
export const PLACEHOLDER_SATS = 546n;
const PLACEHOLDER_TXID = "11".repeat(32);
const MIN_OUTPUT_SATS = 546;

export interface SellerOfferShape {
  assetUtxo: string;
  assetValueSats: number | null;
  salePriceSats: number;
  sellerAddress: string;
}

export interface CompletedSale {
  completedPsbt: string;
  inputsToSign: Array<{
    index: number;
    address: string;
    sighashTypes: number[];
  }>;
  preview: SalePreview;
}

export interface SalePreview {
  sellerAddress: string;
  salePriceSats: number;
  assetUtxo: string;
  assetValueSats: number;
  buyerFeeSats: number;
  changeSats: number;
  buyerInputSats: number;
}

interface PsbtBuilder {
  addInput: (input: any) => unknown;
  addOutput: (output: any) => unknown;
}

export function addSellerOffer(
  psbt: PsbtBuilder,
  args: {
    assetTxid: string;
    assetVout: number;
    assetValue: bigint;
    assetScript: Uint8Array;
    assetRawTx?: Uint8Array;
    isWitness: boolean;
    sellerAddress: string;
    salePriceSats: bigint;
  },
): void {
  // Slot 0 is unsigned. The buyer overwrites this input and output 0.
  psbt.addInput({
    hash: PLACEHOLDER_TXID,
    index: 0,
    sequence: 0xfffffffd,
    witnessUtxo: {
      script: Buffer.from("0014" + "00".repeat(20), "hex"),
      value: PLACEHOLDER_SATS,
    },
  });

  const assetInput: any = {
    hash: args.assetTxid,
    index: args.assetVout,
    sequence: 0xfffffffd,
    sighashType: SALE_SIGHASH,
  };
  if (args.isWitness) {
    assetInput.witnessUtxo = {
      script: args.assetScript,
      value: args.assetValue,
    };
  } else {
    if (!args.assetRawTx) {
      throw new Error("Missing raw transaction for a legacy UTXO");
    }
    assetInput.nonWitnessUtxo = args.assetRawTx;
  }
  psbt.addInput(assetInput);

  psbt.addOutput({
    address: args.sellerAddress,
    value: PLACEHOLDER_SATS,
  });
  psbt.addOutput({
    address: args.sellerAddress,
    value: args.salePriceSats,
  });
}

function txidOf(hash: Uint8Array): string {
  return Buffer.from(hash).reverse().toString("hex");
}

function inputIsSignedWithSaleSighash(input: {
  sighashType?: number;
  partialSig?: Array<{ signature: Uint8Array }>;
  tapKeySig?: Uint8Array;
  tapScriptSig?: unknown[];
  finalScriptWitness?: Uint8Array;
  finalScriptSig?: Uint8Array;
}): void {
  const partial = input.partialSig?.[0]?.signature;
  const partialSighash = partial ? partial[partial.length - 1] : undefined;
  const marked = input.sighashType === SALE_SIGHASH ||
    partialSighash === SALE_SIGHASH;
  if (!marked) {
    throw new Error(
      "Seller input must be signed with SIGHASH_SINGLE|ANYONECANPAY",
    );
  }
  const signed = (input.partialSig && input.partialSig.length > 0) ||
    input.tapKeySig !== undefined ||
    (input.tapScriptSig && input.tapScriptSig.length > 0) ||
    input.finalScriptWitness !== undefined ||
    input.finalScriptSig !== undefined;
  if (!signed) {
    throw new Error("Seller has not signed the sale input");
  }
}

export function readSellerOffer(
  psbtHex: string,
  network: typeof networks.bitcoin = networks.bitcoin,
): SellerOfferShape {
  const psbt = Psbt.fromHex(psbtHex, { network });
  if (psbt.txInputs.length < 2 || psbt.txOutputs.length < 2) {
    throw new Error("Sale PSBT is missing the placeholder slot");
  }
  inputIsSignedWithSaleSighash(psbt.data.inputs[1]);

  const payment = psbt.txOutputs[1];
  const salePriceSats = Number(payment.value);
  if (!Number.isSafeInteger(salePriceSats) || salePriceSats < MIN_OUTPUT_SATS) {
    throw new Error("Seller payment is below the dust limit");
  }

  let sellerAddress: string;
  try {
    sellerAddress = bjsAddress.fromOutputScript(
      Buffer.from(payment.script),
      network,
    );
  } catch {
    throw new Error("Seller payment output is not a standard address");
  }

  const assetIn = psbt.txInputs[1];
  const assetUtxo = `${txidOf(assetIn.hash)}:${assetIn.index}`;
  const witnessValue = psbt.data.inputs[1].witnessUtxo?.value;
  const assetValueSats = witnessValue === undefined
    ? null
    : Number(witnessValue);

  return { assetUtxo, assetValueSats, salePriceSats, sellerAddress };
}

export interface BuyerFunding {
  txid: string;
  vout: number;
  value: number;
  scriptHex: string;
  rawTxHex?: string;
  isWitness: boolean;
}

/**
 * Build the broadcastable PSBT. Output 0 pays the asset sats to the buyer,
 * which is the output Counterparty credits. Output 1 is the seller's signed
 * payment, copied byte for byte.
 */
export function assembleCompletedSale(
  sellerPsbtHex: string,
  buyer: BuyerFunding,
  buyerAddress: string,
  feeRate: number,
  assetValueSats: number,
  network: typeof networks.bitcoin = networks.bitcoin,
): CompletedSale {
  const seller = Psbt.fromHex(sellerPsbtHex, { network });
  readSellerOffer(sellerPsbtHex, network);

  const payment = seller.txOutputs[1];
  const salePriceSats = Number(payment.value);
  if (assetValueSats < MIN_OUTPUT_SATS) {
    throw new Error("Stamp UTXO is below the dust limit");
  }

  const fee = estimateFee(
    [
      { address: buyerAddress, value: assetValueSats },
      {
        script: Buffer.from(payment.script).toString("hex"),
        value: salePriceSats,
      },
    ],
    feeRate,
    2,
  );

  let change = buyer.value - salePriceSats - fee;
  let buyerFee = fee;
  if (change < 0) {
    throw new Error(
      "Insufficient funds to cover the sale price and fee",
    );
  }
  if (change > 0 && change < MIN_OUTPUT_SATS) {
    buyerFee += change;
    change = 0;
  }

  const next = new Psbt({ network });
  const buyerInput: any = {
    hash: buyer.txid,
    index: buyer.vout,
    sequence: 0xfffffffd,
  };
  if (buyer.isWitness) {
    buyerInput.witnessUtxo = {
      script: Buffer.from(buyer.scriptHex, "hex"),
      value: BigInt(buyer.value),
    };
  } else {
    if (!buyer.rawTxHex) {
      throw new Error("Missing raw transaction for a legacy funding UTXO");
    }
    buyerInput.nonWitnessUtxo = Buffer.from(buyer.rawTxHex, "hex");
  }
  next.addInput(buyerInput);

  const signed = seller.data.inputs[1];
  const prev = seller.txInputs[1];
  const sellerInput: any = {
    hash: txidOf(prev.hash),
    index: prev.index,
    sequence: prev.sequence,
    sighashType: SALE_SIGHASH,
  };
  if (signed.witnessUtxo) {
    sellerInput.witnessUtxo = {
      script: Uint8Array.from(signed.witnessUtxo.script),
      value: BigInt(signed.witnessUtxo.value),
    };
  }
  if (signed.nonWitnessUtxo) {
    sellerInput.nonWitnessUtxo = Uint8Array.from(signed.nonWitnessUtxo);
  }
  next.addInput(sellerInput);

  next.addOutput({
    address: buyerAddress,
    value: BigInt(assetValueSats),
  });
  next.addOutput({
    script: Uint8Array.from(payment.script),
    value: BigInt(payment.value),
  });
  if (change > 0) {
    next.addOutput({
      address: buyerAddress,
      value: BigInt(change),
    });
  }

  if (signed.partialSig?.length) {
    next.updateInput(1, {
      partialSig: signed.partialSig.map((sig) => ({
        pubkey: Uint8Array.from(sig.pubkey),
        signature: Uint8Array.from(sig.signature),
      })),
    });
  }
  if (signed.tapKeySig) {
    next.updateInput(1, { tapKeySig: Uint8Array.from(signed.tapKeySig) });
  }

  const assetIn = seller.txInputs[1];
  return {
    completedPsbt: next.toHex(),
    inputsToSign: [{
      index: 0,
      address: buyerAddress,
      sighashTypes: [SIGHASH_ALL],
    }],
    preview: {
      sellerAddress: bjsAddress.fromOutputScript(
        Buffer.from(payment.script),
        network,
      ),
      salePriceSats,
      assetUtxo: `${txidOf(assetIn.hash)}:${assetIn.index}`,
      assetValueSats,
      buyerFeeSats: buyerFee,
      changeSats: change,
      buyerInputSats: buyer.value,
    },
  };
}
