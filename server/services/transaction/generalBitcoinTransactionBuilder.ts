/**
 * General Bitcoin Transaction Builder - Clean Architecture for All Counterparty Operations
 *
 * Extracted from the proven StampCreationService.generatePSBT() pattern
 * Works with raw hex from Counterparty (return_psbt: false)
 *
 * Supports: Mint, Fairmint, Detach, Dispense, and future operations
 */

import { TX_CONSTANTS } from "$constants";
import { hex2bin } from "$lib/utils/data/binary/baseUtils.ts";
import { logger } from "$lib/utils/logger.ts";
import { estimateMintingTransactionSize } from "$lib/utils/bitcoin/minting/transactionSizes.ts";
import { extractOutputs } from "$lib/utils/bitcoin/minting/transactionUtils.ts";
import { opReturnDecodesFromInput } from "$lib/utils/bitcoin/minting/counterpartyInputs.ts";
import { getScriptTypeInfo } from "$lib/utils/bitcoin/scripts/scriptTypeUtils.ts";
import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import { CommonUTXOService } from "$server/services/utxo/commonUtxoService.ts";
import { OptimalUTXOSelection } from "$server/services/utxo/optimalUtxoSelection.ts";
import type { ScriptType, UTXO } from "$types/base.d.ts";
import { toBasicUTXOs, safeUTXOValue } from "$lib/utils/bitcoin/utxo/utxoTypeUtils.ts";
import * as bitcoin from "bitcoinjs-lib";
import { Buffer } from "node:buffer";

export interface BitcoinTransactionGenerationOptions {
  address: string;
  satsPerVB: number;
  serviceFee?: number;
  serviceFeeAddress?: string;
  operationType: 'mint' | 'fairmint' | 'detach' | 'dispense' | 'generic';
  // For mint operations
  cip33Addresses?: string[];
  fileSize?: number;
  // For generic operations
  customOutputs?: Array<{ value: number; address: string }>;
}

export interface BitcoinTransactionGenerationResult {
  psbt: bitcoin.Psbt;
  estimatedTxSize: number;
  totalInputValue: number;
  totalOutputValue: number;
  totalChangeOutput: number;
  totalDustValue: number;
  estMinerFee: number;
  changeAddress: string;
}

export class GeneralBitcoinTransactionBuilder {
  private static commonUtxoService = new CommonUTXOService();

  /**
   * Universal PSBT generator for all Counterparty operations
   * Uses the proven mint pattern but adapted for any operation type
   */
  static async generatePSBT(
    counterpartyRawHex: string,
    options: BitcoinTransactionGenerationOptions
  ): Promise<BitcoinTransactionGenerationResult> {
    const {
      address,
      satsPerVB,
      serviceFee = 0,
      serviceFeeAddress,
      operationType,
      cip33Addresses = [],
      customOutputs = []
    } = options;

    logger.debug("api", {
      message: "Starting universal PSBT generation",
      operationType,
      address,
      satsPerVB,
      serviceFee,
      customOutputsCount: customOutputs.length,
      cip33AddressCount: cip33Addresses.length
    });

    let totalOutputValue = 0;
    let totalDustValue = 0;
    let psbt: bitcoin.Psbt;
    let vouts: Array<{ value: number; address?: string; script?: Uint8Array }> = [];

    try {
      psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });

      // Parse the Counterparty raw transaction
      let txObj;
      try {
        txObj = bitcoin.Transaction.fromHex(counterpartyRawHex);
      } catch (error) {
        // Handle XCP transaction parsing issues (same as mint pattern)
        if (error instanceof Error &&
            (error.message.includes('superfluous witness data') ||
             error.message.includes('Offset is outside the bounds'))) {
          logger.warn("api", {
            message: "Transaction parsing failed, using minimal transaction",
            error: error.message,
            operationType
          });

          txObj = new bitcoin.Transaction();
          txObj.version = 2;
          const opReturnScript = bitcoin.script.compile([
            bitcoin.opcodes.OP_RETURN,
            Buffer.from('CNTRPRTY', 'utf8')
          ]);
          txObj.addOutput(opReturnScript, BigInt(0));
        } else {
          throw error;
        }
      }

      // Extract outputs from the Counterparty transaction
      const rawOutputs = extractOutputs(txObj, address);
      vouts = rawOutputs.map(output => {
        const scriptString = (output as any).script;
        const scriptBuffer = typeof scriptString === 'string'
          ? new Uint8Array(Buffer.from(scriptString, 'hex'))
          : undefined;

        return {
          value: output.value,
          address: (output as any).address,
          ...(scriptBuffer && { script: scriptBuffer }),
        };
      });

      logger.debug("api", {
        message: "Extracted outputs from Counterparty transaction",
        outputCount: vouts.length,
        operationType
      });

      // Add operation-specific outputs
      if (operationType === 'mint' && cip33Addresses.length > 0) {
        // Add CIP33 data outputs for minting
        for (let i = 0; i < cip33Addresses.length; i++) {
          const dustValue = TX_CONSTANTS.DUST_SIZE;
          vouts.push({
            value: dustValue,
            address: cip33Addresses[i],
          });
          totalOutputValue += dustValue;
          totalDustValue += dustValue;
        }
      } else if (customOutputs.length > 0) {
        // Add custom outputs for other operations
        for (const customOutput of customOutputs) {
          vouts.push({
            value: customOutput.value,
            address: customOutput.address,
          });
          totalOutputValue += customOutput.value;
        }
      }

      // Add service fee output
      if (serviceFee > 0 && serviceFeeAddress) {
        vouts.push({
          value: serviceFee,
          address: serviceFeeAddress,
        });
        totalOutputValue += serviceFee;
        logger.debug("api", {
          message: "Added service fee output",
          serviceFee,
          operationType
        });
      }

      // Get UTXOs for funding
      const fullUTXOs = await this.getFullUTXOsWithDetails(address, true, []);

      if (fullUTXOs.length === 0) {
        throw new Error(`No UTXOs available for ${operationType} operation`);
      }

      // Convert vouts for UTXO selection
      const outputsForSelection = vouts.map(vout => ({
        value: vout.value,
        script: vout.script ? Buffer.from(vout.script).toString('hex') : "",
        ...(vout.address && { address: vout.address })
      }));

      // Convert UTXOs to BasicUTXOs for the selection algorithm
      const importedBasicUTXOs = toBasicUTXOs(fullUTXOs);

      if (importedBasicUTXOs.length === 0) {
        throw new Error(`No valid UTXOs available for ${operationType} operation`);
      }

      // Convert to the local BasicUTXO interface expected by OptimalUTXOSelection
      const basicUTXOs = importedBasicUTXOs.map(utxo => {
        const localBasicUTXO: any = {
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
          script: undefined,
          scriptType: undefined,
          scriptDesc: undefined,
          confirmations: undefined
        };
        
        // Only include address if it exists and is not undefined
        if (utxo.address !== undefined) {
          localBasicUTXO.address = utxo.address;
        }
        
        return localBasicUTXO;
      });

      // Select optimal UTXOs
      const selectionResult = OptimalUTXOSelection.selectUTXOs(
        basicUTXOs,
        outputsForSelection,
        satsPerVB,
        {
          avoidChange: true,
          consolidationMode: false,
          dustThreshold: 1000
        }
      );

      // Pin Counterparty's vin[0] (the ARC4 OP_RETURN key input) at PSBT index 0.
      // CP encrypts the OP_RETURN against the txid of ITS first input, and the
      // indexer derives the ARC4 key ONLY from vin[0]. extractOutputs() above
      // discarded CP's inputs and we re-selected our own, so we must re-attach
      // CP's vin[0] at index 0 or the issuance is silently dropped by the indexer
      // (same failure mode as the pre-fix stamp issuance bug). Funding UTXOs are
      // appended after it.
      let inputs: UTXO[] = [...selectionResult.inputs];
      const cpVin0 = (txObj.ins && txObj.ins.length > 0)
        ? {
          txid: Buffer.from(txObj.ins[0].hash).reverse().toString("hex"),
          vout: txObj.ins[0].index,
        }
        : undefined;
      if (cpVin0) {
        const idx = inputs.findIndex(
          (i) => i.txid === cpVin0.txid && i.vout === cpVin0.vout,
        );
        if (idx > 0) {
          // Selected but not first — move it to index 0.
          const [pin] = inputs.splice(idx, 1);
          inputs = [pin, ...inputs];
        } else if (idx === -1) {
          // Not in our selection — fetch its details and prepend (adds funding).
          const pinUtxo = await this.commonUtxoService.getSpecificUTXO(
            cpVin0.txid,
            cpVin0.vout,
            { includeAncestorDetails: true },
          );
          if (!pinUtxo || !pinUtxo.script || pinUtxo.value === undefined) {
            throw new Error(
              `Failed to fetch Counterparty vin[0] UTXO ${cpVin0.txid}:${cpVin0.vout} ` +
                `required for ARC4 key alignment of ${operationType}.`,
            );
          }
          inputs = [pinUtxo, ...inputs];
        }
        // idx === 0: already first — nothing to do.
      }
      const totalInputValue = inputs.reduce((sum: number, input: UTXO) => sum + safeUTXOValue(input), 0);

      // Recalculate with actual inputs
      const actualEstimatedSize = estimateMintingTransactionSize({
        inputs: inputs.map((input: UTXO) => ({
          type: (input.scriptType || "P2WPKH") as ScriptType,
          isWitness: true
        })),
        outputs: [
          { type: "OP_RETURN" as ScriptType },
          ...vouts.slice(1).map(() => ({ type: "P2WPKH" as ScriptType })),
        ],
        includeChangeOutput: true,
        changeOutputType: "P2WPKH" as ScriptType
      });

      const actualFeeNeeded = Math.ceil(actualEstimatedSize * satsPerVB);
      const adjustedChange = totalInputValue - totalOutputValue - actualFeeNeeded;

      if (adjustedChange < 0) {
        throw new Error(`Insufficient funds for ${operationType} operation`);
      }

      // Add change output if positive
      if (adjustedChange > 0) {
        vouts.push({
          value: adjustedChange,
          address: address,
        });
      }

      // Add outputs to PSBT
      for (const out of vouts) {
        try {
          if ("script" in out && out.script) {
            psbt.addOutput({
              script: out.script,
              value: BigInt(out.value),
            });
          } else if ("address" in out && out.address) {
            psbt.addOutput({
              address: out.address,
              value: BigInt(out.value),
            });
          } else {
            throw new Error("Invalid output format");
          }
        } catch (error) {
          logger.error("api", {
            message: "Error adding output to PSBT",
            output: out,
            operationType,
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      }

      // Add inputs to PSBT
      for (const input of inputs) {
        if (!input.script) {
          throw new Error(`Input UTXO ${input.txid}:${input.vout} is missing script`);
        }

        const scriptTypeInfo = getScriptTypeInfo(input.script);
        const isWitnessInput = scriptTypeInfo.isWitness ||
                              (scriptTypeInfo.type === "P2SH" && scriptTypeInfo.redeemScriptType?.isWitness) ||
                              input.scriptType?.startsWith("witness") ||
                              input.scriptType?.toUpperCase().includes("P2W");

        const psbtInputData: any = {
          hash: input.txid,
          index: input.vout,
          sequence: 0xfffffffd,
        };

        if (isWitnessInput) {
          psbtInputData.witnessUtxo = {
            script: new Uint8Array(hex2bin(input.script)),
            value: BigInt(safeUTXOValue(input)),
          };
        } else {
          const rawTxHex = await this.commonUtxoService.getRawTransactionHex(input.txid);
          if (!rawTxHex) {
            throw new Error(`Failed to fetch raw transaction for ${input.txid}`);
          }
          psbtInputData.nonWitnessUtxo = new Uint8Array(hex2bin(rawTxHex));
        }

        psbt.addInput(psbtInputData as any);
      }

      const finalTotalOutputValue = totalOutputValue + (adjustedChange > 0 ? adjustedChange : 0);
      const actualFee = totalInputValue - finalTotalOutputValue;
      const actualFeeRate = actualFee / actualEstimatedSize;

      logger.info("api", {
        message: `${operationType} PSBT generation complete`,
        inputCount: inputs.length,
        outputCount: vouts.length,
        totalInputValue,
        totalOutputValue: finalTotalOutputValue,
        fee: actualFee,
        feeRate: actualFeeRate,
        size: actualEstimatedSize
      });

      // Fail-closed ARC4 guard: if the Counterparty transaction carries an
      // (ARC4-encrypted) OP_RETURN, it MUST decode from vin[0]. inputs[0] is
      // vin[0] (added to the PSBT in array order above, with CP's vin[0] pinned
      // first). Abort rather than emit an unindexable ${operationType}.
      if (inputs.length > 0) {
        const opReturnVout = vouts.find(
          (v) => v.script instanceof Uint8Array && v.script[0] === 0x6a,
        );
        if (opReturnVout && opReturnVout.script instanceof Uint8Array) {
          const opReturnHex = Buffer.from(opReturnVout.script).toString("hex");
          if (!opReturnDecodesFromInput(opReturnHex, inputs[0].txid)) {
            throw new Error(
              `ARC4 key mismatch for ${operationType}: OP_RETURN does not decode ` +
                `from vin[0] (${inputs[0].txid}). Aborting to avoid broadcasting an ` +
                `unindexable Counterparty transaction.`,
            );
          }
        }
      }

      return {
        psbt,
        estimatedTxSize: actualEstimatedSize,
        totalInputValue,
        totalOutputValue: finalTotalOutputValue,
        totalChangeOutput: adjustedChange,
        totalDustValue,
        estMinerFee: actualFeeNeeded,
        changeAddress: address,
      };

    } catch (error) {
      logger.error("api", {
        message: `${operationType} PSBT generation error`,
        error: error instanceof Error ? error.message : String(error),
        address,
        satsPerVB
      });
      throw error;
    }
  }

  /**
   * Get full UTXO details (copied from StampCreationService pattern)
   */
  private static async getFullUTXOsWithDetails(
    address: string,
    filterStampUTXOs: boolean = true,
    excludeUtxos: Array<{ txid: string; vout: number }> = []
  ): Promise<UTXO[]> {
    let basicUtxos = await this.commonUtxoService.getSpendableUTXOs(address, undefined, {
      includeAncestorDetails: true,
      confirmedOnly: false
    });

    // Apply exclusions
    if (excludeUtxos.length > 0) {
      const excludeSet = new Set(excludeUtxos.map(u => `${u.txid}:${u.vout}`));
      basicUtxos = basicUtxos.filter(utxo => !excludeSet.has(`${utxo.txid}:${utxo.vout}`));
    }

    // Filter stamp UTXOs if requested
    if (filterStampUTXOs) {
      try {
        const stampBalances = await CounterpartyApiManager.getXcpBalancesByAddress(address, undefined, true);
        const utxosToExcludeFromStamps = new Set<string>();
        for (const balance of stampBalances.balances) {
          if (balance.utxo) {
            utxosToExcludeFromStamps.add(balance.utxo);
          }
        }
        basicUtxos = basicUtxos.filter(
          (utxo) => !utxosToExcludeFromStamps.has(`${utxo.txid}:${utxo.vout}`),
        );
      } catch (error) {
        logger.error("api", {
          message: "Error filtering stamp UTXOs",
          address,
          error: (error as any).message
        });
      }
    }

    // Get full details for all UTXOs
    const fullUTXOs: UTXO[] = [];
    for (const basicUtxo of basicUtxos) {
      try {
        const fullUtxo = await this.commonUtxoService.getSpecificUTXO(
          basicUtxo.txid,
          basicUtxo.vout,
          { includeAncestorDetails: true }
        );

        if (fullUtxo && fullUtxo.script && fullUtxo.value !== undefined && fullUtxo.value > 0) {
          fullUTXOs.push(fullUtxo);
        }
      } catch (error) {
        logger.warn("api", {
          message: "Skipping UTXO due to fetch error",
          txid: basicUtxo.txid,
          vout: basicUtxo.vout,
          error: (error as any).message
        });
      }
    }

    return fullUTXOs;
  }
}
