// was previously // lib/utils/minting/src20/tx.ts

import * as bitcoin from "bitcoinjs-lib";
// Conditionally import tiny-secp256k1
let ecc: any = null;
const isBuildMode = Deno.args.includes("build");
const isDevelopment = serverConfig.IS_DEVELOPMENT;
const useStubs = serverConfig.USE_CRYPTO_STUBS;

if (isBuildMode) {
  // In build mode, always use stub implementation
  console.log("[BUILD] Using stub implementation for tiny-secp256k1");
  ecc = {
    privateKeyVerify: () => true,
    publicKeyCreate: () => new Uint8Array(33),
    publicKeyVerify: () => true,
    ecdsaSign: () => ({ signature: new Uint8Array(64), recid: 0 }),
    ecdsaVerify: () => true,
    ecdsaRecover: () => new Uint8Array(65),
    isPoint: () => true
  };
} else {
  // In runtime mode, try to load the real implementation
  try {
    ecc = await import("tiny-secp256k1");
    console.log("Successfully loaded tiny-secp256k1 (real implementation)");
    bitcoin.initEccLib(ecc);
  } catch (e) {
    // If loading fails, check if we should use stubs or throw error
    if (isDevelopment || useStubs) {
      console.warn("Failed to load tiny-secp256k1, using stub implementation:", e);
      console.warn("⚠️  Bitcoin transactions will NOT work properly with stubs!");
      console.warn("⚠️  To test real transactions, ensure tiny-secp256k1 loads correctly.");
      // Provide stub implementation for development
      ecc = {
        privateKeyVerify: () => true,
        publicKeyCreate: () => new Uint8Array(33),
        publicKeyVerify: () => true,
        ecdsaSign: () => ({ signature: new Uint8Array(64), recid: 0 }),
        ecdsaVerify: () => true,
        ecdsaRecover: () => new Uint8Array(65),
        isPoint: () => true
      };
      bitcoin.initEccLib(ecc);
    } else {
      // In production, this is a fatal error
      console.error("FATAL: Failed to load tiny-secp256k1 in production:", e);
      throw new Error("Failed to initialize cryptographic library for Bitcoin operations");
    }
  }
}

import { estimateMintingTransactionSize } from "$lib/utils/bitcoin/minting/transactionSizes.ts";
import { arc4 } from "$lib/utils/bitcoin/minting/transactionUtils.ts";
import { bin2hex, hex2bin } from "$lib/utils/data/binary/baseUtils.ts";
import { logger } from "$lib/utils/logger.ts";
import { serverConfig } from "$server/config/config.ts";
import { SRC20CompressionService } from "$server/services/src20/compression/compressionService.ts";
// Canonical UTXO selector (same path stamp issuance + the general builder use):
// selects on basic UTXOs then batch-fetches scripts ONLY for the selected
// inputs (and hard-errors if a script is missing). Replaces the old
// getFullUTXOsWithDetails (which fetched every UTXO's script up front then
// discarded them) + raw OptimalUTXOSelection.selectUTXOs path.
import { BitcoinUtxoManager } from "$server/services/transaction/bitcoinUtxoManager.ts";
import { CommonUTXOService } from "$server/services/utxo/commonUtxoService.ts";
import { assertMultisigPayloadDecodesFromInput } from "$lib/utils/bitcoin/minting/src20MultisigGuard.ts";
import type { IPrepareSRC20TX } from "$server/types/services/src20.d.ts";
import type { PSBTInput, VOUT } from "$types/src20.d.ts";
import { crypto } from "@std/crypto";
import * as msgpack from "msgpack";
// import { Psbt } from "npm:bitcoinjs-lib";

export class SRC20MultisigPSBTService {
  private static readonly RECIPIENT_DUST = BigInt(789);
  private static readonly MULTISIG_DUST = BigInt(809);
  private static readonly CHANGE_DUST = BigInt(1000);
  private static readonly THIRD_PUBKEY = "020202020202020202020202020202020202020202020202020202020202020202";
  private static commonUtxoService = new CommonUTXOService();
  // Canonical UTXO selector shared with stamp issuance and the general builder.
  private static utxoService = new BitcoinUtxoManager();

  static async preparePSBT({
    network,
    changeAddress,
    toAddress,
    feeRate,
    transferString,
    enableRBF = true,
  }: IPrepareSRC20TX) {
    try {
      logger.info("src20", { message: "Starting preparePSBT for Multisig SRC20" });
      const psbtNetwork = network === "testnet"
        ? bitcoin.networks.testnet
        : bitcoin.networks.bitcoin;
      logger.debug("src20", { message: "Using network", network: psbtNetwork });

      const psbt = new bitcoin.Psbt({ network: psbtNetwork });

      // Prepare initial vouts with recipient output
      const vouts: VOUT[] = [
        { address: toAddress, value: Number(this.RECIPIENT_DUST) },
      ];

      // Convert initial vouts to the format expected by the selector
      const initialOutputsForSelection = vouts.map(vout => ({
        value: vout.value,
        script: "",
        ...(vout.address && { address: vout.address })
      }));

      // Select funding UTXOs via the canonical BitcoinUtxoManager — the same
      // path stamp issuance + the general builder use. It selects on basic
      // UTXOs then batch-fetches scripts ONLY for the selected inputs (and
      // hard-errors if a script is missing), returning inputs that already HAVE
      // their scripts. CRITICAL: the selector preserves input order, so
      // inputs[0] stays the ARC4 key input and is added to the PSBT first.
      const selectionResult = await this.utxoService.selectUTXOsForTransaction(
        changeAddress,
        initialOutputsForSelection,
        feeRate,
        0, // sigops_rate
        1.5, // rbfBuffer
        { filterStampUTXOs: true, includeAncestors: true },
      );

      const { inputs, fee } = selectionResult;

      if (inputs.length === 0) {
        throw new Error("Unable to select suitable UTXOs for the transaction");
      }

      // Prepare and encrypt data using first input's txid
      const stampPrefixBytes = new TextEncoder().encode("stamp:");

      const transferData = JSON.parse(transferString);
      const msgpackData = msgpack.encode(transferData);
      const { compressedData, compressed } = await SRC20CompressionService
        .compressWithCheck(msgpackData);

      const transferDataBytes = compressed ? compressedData : new TextEncoder().encode(JSON.stringify(transferData));

      // Add stamp prefix and length prefix
      const dataWithPrefix = new Uint8Array([...stampPrefixBytes, ...transferDataBytes]);
      let dataLength = dataWithPrefix.length;
      while (dataLength > 0 && dataWithPrefix[dataLength - 1] === 0) dataLength--;

      const lengthPrefix = new Uint8Array([(dataLength >> 8) & 0xff, dataLength & 0xff]);
      let payloadBytes = new Uint8Array([...lengthPrefix, ...dataWithPrefix]);

      // Pad data
      const padLength = (62 - (payloadBytes.length % 62)) % 62;
      if (padLength > 0) {
        payloadBytes = new Uint8Array([...payloadBytes, ...new Uint8Array(padLength)]);
      }

      // Encrypt data using first input's txid (inputs[0] == vin[0] == ARC4 key)
      const txidBytes = hex2bin(inputs[0].txid);
      const encryptedDataBytes = arc4(txidBytes, payloadBytes);

      // Create multisig outputs
      const chunks: Uint8Array[] = [];
      for (let i = 0; i < encryptedDataBytes.length; i += 62) {
        chunks.push(encryptedDataBytes.slice(i, i + 62));
      }

      // Collect the multisig data-output scripts (in output order) so we can run
      // the fail-closed ARC4 guard after the PSBT inputs are added.
      const multisigScriptHexes: string[] = [];

      // Add multisig outputs
      for (const chunk of chunks) {
        const pubkey_seg1 = bin2hex(chunk.slice(0, 31));
        const pubkey_seg2 = bin2hex(chunk.slice(31, 62));
        let pubkey1: string, pubkey2: string;

        do {
          const randomBytes = new Uint8Array(1);
          crypto.getRandomValues(randomBytes);
          const first_byte = randomBytes[0] & 1 ? "02" : "03";
          const second_byte = randomBytes[0].toString(16).padStart(2, "0");
          pubkey1 = first_byte + pubkey_seg1 + second_byte;
        } while (!this.isValidPubkey(pubkey1));

        do {
          const randomBytes = new Uint8Array(1);
          crypto.getRandomValues(randomBytes);
          const first_byte = randomBytes[0] & 1 ? "02" : "03";
          const second_byte = randomBytes[0].toString(16).padStart(2, "0");
          pubkey2 = first_byte + pubkey_seg2 + second_byte;
        } while (!this.isValidPubkey(pubkey2));

        const script = `5121${pubkey1}21${pubkey2}21${this.THIRD_PUBKEY}53ae`;
        multisigScriptHexes.push(script);
        vouts.push({
          script: new Uint8Array(hex2bin(script)),
          value: Number(this.MULTISIG_DUST),
        });
      }

      // Add service fee if enabled
      if (parseInt(serverConfig.MINTING_SERVICE_FEE_ENABLED || "0", 10) === 1) {
        const feeAddress = serverConfig.MINTING_SERVICE_FEE_ADDRESS || "";
        const feeAmount = parseInt(serverConfig.MINTING_SERVICE_FEE_FIXED_SATS || "0", 10);
        vouts.push({ address: feeAddress, value: feeAmount });
      }

      // Add inputs to PSBT — in the SAME order the selector returned them, so
      // vin[0] == inputs[0] == the ARC4 key input. No BIP-69 / reordering sort
      // exists between the arc4 call above and this loop.
      for (const input of inputs) {
        if (!input.script) {
          logger.error("src20", { message: "Input UTXO is missing script for Multisig.", input });
          throw new Error(`Input UTXO ${input.txid}:${input.vout} is missing script (scriptPubKey).`);
        }
        const isWitnessUtxo = input.scriptType?.startsWith("witness") ||
                              input.scriptType?.toUpperCase().includes("P2W") ||
                              (input.scriptType === "P2SH");

        const psbtInput: PSBTInput = {
          hash: input.txid,
          index: input.vout,
          sequence: enableRBF ? 0xfffffffd : 0xffffffff,
        };

        if (isWitnessUtxo) {
          psbtInput.witnessUtxo = {
            script: new Uint8Array(hex2bin(input.script)),
            value: BigInt(input.value),
          };
        } else {
          const rawTxHex = await SRC20MultisigPSBTService.commonUtxoService.getRawTransactionHex(input.txid);
          if (!rawTxHex) {
            logger.error("src20", { message: "Failed to fetch raw tx hex for non-witness input in Multisig", txid: input.txid });
            throw new Error(`Failed to fetch raw transaction for non-witness input ${input.txid}`);
          }
          psbtInput.nonWitnessUtxo = new Uint8Array(hex2bin(rawTxHex));
        }

        psbt.addInput(psbtInput as any);
      }

      // Fail-closed ARC4 guard: the SRC-20 payload is ARC4-encrypted with
      // inputs[0].txid and carried in the bare-multisig data outputs. inputs[0]
      // is vin[0] (added to the PSBT in array order above). Reassemble the
      // payload from those outputs, decrypt with vin[0], and assert the
      // length-prefixed "stamp:" plaintext. Abort rather than emit a tx the
      // btc_stamps indexer (which keys ARC4 off vin[0]) would silently drop.
      assertMultisigPayloadDecodesFromInput(
        multisigScriptHexes,
        inputs[0].txid,
        "SRC-20",
      );

      // Calculate total input and output values
      const totalInputValue = inputs.reduce((sum: any, input: any) =>
        BigInt(sum) + BigInt(input.value), BigInt(0));

      // Calculate total output value before change
      const outputsBeforeChange = vouts.reduce((sum: any, vout: any) =>
        BigInt(sum) + BigInt(vout.value), BigInt(0));

      // Calculate fee
      const estimatedFee = BigInt(fee);

      // Calculate change correctly
      const changeAmount = totalInputValue - outputsBeforeChange - estimatedFee;

      // Add all outputs to PSBT
      vouts.forEach((vout) => {
        if ("address" in vout && vout.address) {
          psbt.addOutput({
            address: vout.address,
            value: BigInt(vout.value)
          });
        } else if ("script" in vout && vout.script) {
          psbt.addOutput({
            script: new Uint8Array(vout.script),
            value: BigInt(vout.value)
          });
        }
      });

      // Add change output if it's above dust
      if (changeAmount > this.CHANGE_DUST) {
        psbt.addOutput({
          address: changeAddress,
          value: changeAmount
        });
      }

      logger.debug("src20", {
        message: "Final transaction details for Multisig PSBT",
        inputs: inputs.map((utxo: any) => ({
          ...utxo,
          value: BigInt(utxo.value).toString()
        })),
        outputs: vouts.map(vout => ({
          ...vout,
          value: BigInt(vout.value).toString()
        })),
        change: changeAmount.toString(),
        fee: BigInt(fee).toString()
      });

      return {
        psbtHex: psbt.toHex(),
        psbtBase64: psbt.toBase64(),
        fee: fee.toString(),
        change: changeAmount.toString(),
        inputsToSign: inputs.map((_: any, index: any) => ({ index })),
        estimatedTxSize: estimateMintingTransactionSize({
          inputs: inputs.map(_input => ({ type: "P2WPKH" as any })),
          outputs: vouts.map(() => ({ type: "P2WSH" as any })),
          includeChangeOutput: true,
          changeOutputType: "P2WPKH"
        }),
      };
    } catch (error) {
      logger.error("src20", { message: "Error in preparePSBT for Multisig SRC20", error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private static isValidPubkey(pubkey: string): boolean {
    try {
      const pubkeyBytes = hex2bin(pubkey);
      return ecc.isPoint(pubkeyBytes);
    } catch {
      return false;
    }
  }
}
