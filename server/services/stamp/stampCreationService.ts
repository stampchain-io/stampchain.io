// was previously // lib/utils/minting/stamp.ts

import { base64ToHex } from "$lib/utils/data/binary/baseUtils.ts";
import { FileToAddressUtils } from "$lib/utils/bitcoin/encoding/fileToAddressUtils.ts";
import { estimateMintingTransactionSize } from "$lib/utils/bitcoin/minting/transactionSizes.ts";
import { estimateMARATransactionSize } from "$lib/utils/bitcoin/minting/maraTransactionSizeEstimator.ts";
import { arc4, extractOutputs } from "$lib/utils/bitcoin/minting/transactionUtils.ts";
import { getScriptTypeInfo, validateWalletAddressForMinting } from "$lib/utils/bitcoin/scripts/scriptTypeUtils.ts";
import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import { formatPsbtForLogging } from "$server/services/transaction/bitcoinTransactionBuilder.ts";
import type { ScriptType } from "$types/base.d.ts";
import * as bitcoin from "bitcoinjs-lib";
import { Buffer } from "node:buffer";
// Removed unused fee calculation imports
import { TX_CONSTANTS } from "$constants";
import { hex2bin } from "$lib/utils/data/binary/baseUtils.ts";
import { logger } from "$lib/utils/logger.ts";
import { normalizeFeeRate } from "$server/services/counterpartyApiService.ts";
import { BitcoinUtxoManager } from "$server/services/transaction/bitcoinUtxoManager.ts";
import { CommonUTXOService } from "$server/services/utxo/commonUtxoService.ts";
import type { UTXO } from "$types/base.d.ts";

export class StampCreationService {
  private static commonUtxoService = new CommonUTXOService();
  private static utxoService = new BitcoinUtxoManager(); // Add BitcoinUtxoManager instance

  /**
   * 🚀 REMOVED: getFullUTXOsWithDetails method - replaced with optimal BitcoinUtxoManager pattern
   * OLD INEFFICIENT PATTERN: Fetch full details for ALL UTXOs before selection
   * NEW OPTIMAL PATTERN: Fetch basic UTXOs → Select optimal → Fetch full details for selected only
   */

  static async createStampIssuance({
    sourceWallet,
    assetName,
    qty,
    locked = true,
    divisible = false,
    filename,
    file,
    satsPerVB,
    service_fee = 0,
    service_fee_address = "",
    prefix = "stamp",
    isDryRun = false,
    outputValue
  }: {
    sourceWallet: string;
    assetName?: string;
    qty: string;
    locked?: boolean;
    divisible?: boolean;
    filename: string;
    file: string;
    satsPerVB?: number;
    service_fee?: number;
    service_fee_address?: string;
    prefix?: "stamp" | "file" | "glyph";
    isDryRun?: boolean;
    outputValue?: number;
  }) {
    // Validate and normalize fee rate
    const { normalizedSatsPerVB } = normalizeFeeRate({
      ...(satsPerVB !== undefined && { satsPerVB }),
    });

    // Validate outputValue if provided (must be 1-332 or exactly 333)
    const dustValue = outputValue !== undefined ? outputValue : TX_CONSTANTS.DUST_SIZE;
    if (outputValue !== undefined) {
      if (!((outputValue >= 1 && outputValue <= 332) || outputValue === 333)) {
        throw new Error(`Invalid outputValue: ${outputValue}. Must be 1-332 or exactly 333.`);
      }
    }

    logger.info("stamp-create", {
      message: "Starting createStampIssuance with params",
      sourceWallet,
      assetName,
      qty,
      locked,
      divisible,
      filename,
      fileSize: Math.ceil((file.length * 3) / 4),
      providedSatsPerVB: satsPerVB,
      normalizedSatsPerVB,
      service_fee,
      service_fee_address,
      prefix,
      isDryRun,
      outputValue,
      dustValue
    });

    try {
      // Validate source wallet
      const sourceWalletValidation = validateWalletAddressForMinting(sourceWallet);
      if (!sourceWalletValidation.isValid) {
        throw new Error(`Invalid source wallet: ${sourceWalletValidation.error}`);
      }

      // Validate service fee address if present
      if (service_fee > 0 && service_fee_address) {
        const feeAddressValidation = validateWalletAddressForMinting(service_fee_address);
        if (!feeAddressValidation.isValid) {
          throw new Error(`Invalid service fee address: ${feeAddressValidation.error}`);
        }
      }

      logger.info("stamp-create", { message: "Starting createStampIssuance" });

      // Convert qty from string to number if needed
      const qtyNumber = typeof qty === 'string' ? parseInt(qty, 10) : qty;

      const hex_file = base64ToHex(file);
      const cip33Addresses = FileToAddressUtils.fileToAddresses(hex_file) as string[];
      const fileSize = Math.ceil((file.length * 3) / 4);
      logger.debug("stamp-create", { message: "File and CIP33 details", fileSize, cip33AddressCount: cip33Addresses.length, hex_length: hex_file.length });

      // Select the funding UTXOs BEFORE composing so the exact set (and its
      // raw-value-descending order) can be pinned to Counterparty via inputs_set.
      // CP derives the ARC4 OP_RETURN key from the largest-by-value entry, so
      // pinning the same set + order here keeps vin[0] aligned with that key.
      // (Dry runs skip this — they never touch the real CP composer.)
      let orderedInputs: UTXO[] | undefined;
      let inputsSet: string | undefined;
      if (!isDryRun) {
        const selected = await this.selectIssuanceInputs(
          sourceWallet,
          cip33Addresses,
          dustValue,
          service_fee,
          service_fee_address,
          normalizedSatsPerVB,
        );
        // Match CP's sort key exactly: raw value descending, with a deterministic
        // (txid, vout) tiebreak so equal-value ties resolve identically on both
        // sides (CP's value sort is stable over the order we send it).
        orderedInputs = [...selected].sort(
          (a, b) =>
            (b.value - a.value) ||
            a.txid.localeCompare(b.txid) ||
            (a.vout - b.vout),
        );
        inputsSet = orderedInputs
          .map((u) => `${u.txid}:${u.vout}:${u.value}:${u.script}`)
          .join(",");
      }

      const result = await this.createIssuanceTransaction({
        sourceWallet,
        assetName: assetName || "", // Provide default empty string for undefined assetName
        qty: qtyNumber,
        locked,
        divisible,
        description: "stamp:",
        satsPerKB: Math.floor(normalizedSatsPerVB * 1000), // Convert sats/vB to sats/kB and ensure integer
        isDryRun: isDryRun || false,
        file, // Pass file data for accurate size calculation
        service_fee,
        outputValue: dustValue, // Pass the dust value for accurate fee estimation
        ...(inputsSet
          ? { inputs_set: inputsSet, use_all_inputs_set: true }
          : {}),
      });

      if (!result.tx_hex) {
        throw new Error("Transaction creation failed: No transaction hex returned");
      }

      const hex = result.tx_hex;

      const psbtDetails = await this.generatePSBT(
        hex,
        sourceWallet,
        normalizedSatsPerVB,
        service_fee,
        service_fee_address,
        cip33Addresses,
        fileSize,
        isDryRun || false,
        dustValue,
        orderedInputs,
      );

      if (isDryRun) {
        return {
          est_tx_size: psbtDetails.estimatedTxSize,
          input_value: psbtDetails.totalInputValue,
          total_dust_value: psbtDetails.totalDustValue,
          est_miner_fee: psbtDetails.estMinerFee,
          change_value: psbtDetails.totalChangeOutput,
          total_output_value: psbtDetails.totalOutputValue,
        };
      } else {
        return {
          hex: psbtDetails.psbt.toHex(),
          est_tx_size: psbtDetails.estimatedTxSize,
          input_value: psbtDetails.totalInputValue,
          total_dust_value: psbtDetails.totalDustValue,
          est_miner_fee: psbtDetails.estMinerFee,
          change_value: psbtDetails.totalChangeOutput,
          total_output_value: psbtDetails.totalOutputValue,
        };
      }
    } catch (error) {
      logger.error("stamp-create", { message: "Detailed mint error", error: error instanceof Error ? error.message : String(error) });
      // Enhance error messages for common issues
      if (error instanceof Error && error.message.includes('invalid base58')) {
        throw new Error('Invalid address format. Please use a supported Bitcoin address format (P2PKH, P2WPKH, or P2SH).');
      }
      throw error;
    }
  }

  /**
   * Select the funding UTXOs for an issuance with full details (script, value)
   * so the exact set can be pinned to Counterparty via inputs_set. Runs BEFORE
   * composition; fee sizing uses a max-length OP_RETURN placeholder because the
   * real Counterparty issuance OP_RETURN is a deterministic length.
   */
  private static async selectIssuanceInputs(
    address: string,
    cip33Addresses: string[],
    dustValue: number,
    service_fee: number,
    recipient_fee: string,
    satsPerVB: number,
  ): Promise<UTXO[]> {
    // Representative OP_RETURN output for fee sizing: OP_RETURN + OP_PUSHDATA1 +
    // 80 data bytes (upper bound for a Counterparty issuance message).
    const placeholderOpReturn = "6a4c50" + "00".repeat(80);
    const outputsForSelection = [
      { value: 0, script: placeholderOpReturn },
      ...cip33Addresses.map((addr) => ({ value: dustValue, script: "", address: addr })),
      ...(service_fee > 0 && recipient_fee
        ? [{ value: service_fee, script: "", address: recipient_fee }]
        : []),
    ];

    const { inputs } = await this.utxoService.selectUTXOsForTransaction(
      address,
      outputsForSelection,
      satsPerVB,
      0, // sigops_rate
      1.5, // rbfBuffer
      {
        filterStampUTXOs: true, // Filter out stamp-bearing UTXOs
        includeAncestors: true, // Fetch full details (script) for selected UTXOs
      },
    );

    for (const input of inputs) {
      if (!input.script) {
        throw new Error(
          `Pre-selected UTXO ${input.txid}:${input.vout} is missing its ` +
            `scriptPubKey; cannot pin it to Counterparty inputs_set.`,
        );
      }
    }
    return inputs;
  }

  private static async generatePSBT(
    tx: string,
    address: string,
    satsPerVB: number,
    service_fee: number,
    recipient_fee: string,
    cip33Addresses: string[],
    fileSize: number,
    isDryRun: boolean,
    dustValue: number = TX_CONSTANTS.DUST_SIZE,
    // Inputs pre-selected by createStampIssuance and pinned to CP via inputs_set,
    // already ordered raw-value descending (CP's ARC4-key sort order). When
    // provided, these are used verbatim instead of running an independent
    // selection here, so vin[0] stays equal to the UTXO CP keyed the OP_RETURN to.
    preSelectedInputs?: UTXO[]
  ) {
    let totalOutputValue = 0;
    let psbt;
    let vouts: Array<{ value: number; address?: string; script?: Uint8Array }> = [];
    const estMinerFee = 0;
    let totalDustValue = 0;
    let actualEstimatedSize = 0;
    let actualExactFeeNeeded = 0;

    try {
      logger.debug("stamp-create", { message: "Starting PSBT generation with params", address, satsPerVB, service_fee, recipient_fee, cip33AddressCount: cip33Addresses.length, fileSize });

      // For dryRun, return realistic PSBT data with multiple dummy UTXOs
      if (isDryRun) {
        logger.info("stamp-create", { message: "DryRun mode: generating realistic dummy UTXOs", address, fileSize, cip33AddressCount: cip33Addresses.length });

        // Import dummy UTXO generator
        const { generateRealisticDummyUTXOs, estimateInputCount } = await import("$lib/utils/bitcoin/utxo/dummyUtxoGenerator.ts");

        // Calculate dust value for CIP33 addresses
        totalDustValue = cip33Addresses.length * dustValue;

        // Calculate total output value needed
        const totalOutputsNeeded = totalDustValue + service_fee;

        // Estimate number of inputs needed based on typical UTXO sizes
        const estimatedInputs = estimateInputCount(
          totalOutputsNeeded,
          50000, // Average UTXO size of 0.0005 BTC
          satsPerVB
        );

        // Generate realistic dummy UTXOs
        const dummyUTXOs = generateRealisticDummyUTXOs({
          targetAmount: totalOutputsNeeded,
          averageUTXOSize: 50000,
          includeSmallUTXOs: true,
          includeDustUTXOs: true,
          scriptType: "P2WPKH"
        });

        // Use only the UTXOs we need (to simulate UTXO selection)
        const selectedUTXOs = dummyUTXOs.slice(0, Math.min(estimatedInputs, dummyUTXOs.length));
        const totalInputValue = selectedUTXOs.reduce((sum, utxo) => sum + utxo.value, 0);

        // Calculate accurate estimated size based on realistic inputs
        // Use MARA estimator for MARA mode (outputValue < 330)
        const isMaraMode = dustValue < 330;
        
        let dryRunEstimatedSize: number;
        if (isMaraMode) {
          // Use MARA-specific estimator for accurate calculation
          const maraEstimate = estimateMARATransactionSize({
            inputs: selectedUTXOs.map(() => ({
              type: "P2WPKH" as ScriptType,
              isWitness: true
            })),
            fileSize,
            outputValue: dustValue,
            includeServiceFee: service_fee > 0,
            serviceFeeType: "P2WPKH" as ScriptType,
            includeChangeOutput: true,
            changeOutputType: "P2WPKH" as ScriptType,
            isMaraMode: true,
            maraFeeRate: satsPerVB
          });
          dryRunEstimatedSize = maraEstimate.estimatedSize;
          
          logger.info("stamp-create", {
            message: "MARA mode dry run estimation",
            maraEstimate,
            dustValue,
            chunkCount: maraEstimate.chunkCount
          });
        } else {
          // Use standard estimator for non-MARA mode
          dryRunEstimatedSize = estimateMintingTransactionSize({
            inputs: selectedUTXOs.map(() => ({
              type: "P2WPKH" as ScriptType,
              isWitness: true
            })),
            outputs: [
              { type: "OP_RETURN" as ScriptType }, // OP_RETURN
              ...cip33Addresses.map(() => ({
                type: "P2WSH" as ScriptType
              })),
              ...(service_fee > 0 ? [{ type: "P2WPKH" as ScriptType }] : []) // service fee if applicable
            ],
            includeChangeOutput: true,
            changeOutputType: "P2WPKH" as ScriptType
          });
        }

        const estimatedFee = Math.ceil(dryRunEstimatedSize * satsPerVB);
        totalOutputValue = totalDustValue + service_fee;
        const changeValue = totalInputValue - totalOutputValue - estimatedFee;

        logger.info("stamp-create", {
          message: "Realistic dryRun estimation",
          selectedInputs: selectedUTXOs.length,
          totalInputValue,
          totalOutputValue,
          estimatedFee,
          changeValue,
          txSize: dryRunEstimatedSize
        });

        return {
          psbt: new bitcoin.Psbt({ network: bitcoin.networks.bitcoin }), // Empty PSBT for dryRun
          inputs: selectedUTXOs.map(utxo => ({
            txid: utxo.txid,
            vout: utxo.vout,
            value: utxo.value,
            address: utxo.address || address,
            script: "mock_script"
          })),
          vouts: [], // Empty for dryRun
          totalOutputValue,
          totalInputValue,
          estimatedTxSize: dryRunEstimatedSize,
          estMinerFee: estimatedFee,
          totalDustValue,
          actualExactFeeNeeded: estimatedFee,
          totalChangeOutput: Math.max(0, changeValue),
          feeRate: satsPerVB
        };
      }

      psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });

      // Parse the transaction - handle potential issues with XCP transactions
      let txObj;
      try {
        txObj = bitcoin.Transaction.fromHex(tx);
      } catch (error) {
        // XCP transactions sometimes have witness data or other issues
        // For stamp minting, we only care about the outputs, so we can
        // create a minimal transaction with just the OP_RETURN data
        if (error instanceof Error &&
            (error.message.includes('superfluous witness data') ||
             error.message.includes('Offset is outside the bounds'))) {
          logger.warn("stamp-create", {
            message: "Transaction parsing failed, using minimal transaction",
            error: error.message
          });

          // Create a minimal transaction with just an OP_RETURN output
          // This is sufficient for stamp minting as we'll be creating
          // a completely new transaction anyway
          txObj = new bitcoin.Transaction();
          txObj.version = 2;

          // Add a dummy OP_RETURN output (XCP issuance data)
          const opReturnScript = bitcoin.script.compile([
            bitcoin.opcodes.OP_RETURN,
            Buffer.from('CNTRPRTY', 'utf8')
          ]);
          txObj.addOutput(opReturnScript, BigInt(0));
        } else {
          throw error;
        }
      }

      const rawOutputs = extractOutputs(txObj, address);
      // Convert Output[] to expected format for selectUTXOsForTransaction
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

      logger.debug("stamp-create", { message: "Initial vouts from transaction", count: vouts.length, values: vouts.map(v => v.value) });

      // Calculate size first
      const estimatedSize = estimateMintingTransactionSize({
        inputs: [{
          type: "P2WPKH" as ScriptType,
          isWitness: true
        }],
        outputs: [
          { type: "P2PKH" as ScriptType },
          ...cip33Addresses.map(() => ({
            type: "P2WSH" as ScriptType
          })),
          { type: "P2WPKH" as ScriptType }
        ],
        includeChangeOutput: true,
        changeOutputType: "P2WPKH" as ScriptType
      });

      // Add detailed size logging
      logger.debug("stamp-create", { message: "Transaction size details", estimatedSize, inputBreakdown: {
        txid: 32,
        vout: 4,
        sequence: 4,
        witnessData: 108,
      }, outputBreakdown: {
        opReturn: 45,
        p2wshOutputs: cip33Addresses.length * 43,
        changeOutput: 31,
      }, totalRaw: 32 + 4 + 4 + 108 + 45 + (cip33Addresses.length * 43) + 31 });

      // Calculate exact fee needed
      const exactFeeNeeded = Math.ceil(estimatedSize * satsPerVB);

      logger.debug("stamp-create", { message: "Size and fee calculation", estimatedSize, requestedFeeRate: satsPerVB, exactFeeNeeded, expectedFeePerVbyte: exactFeeNeeded / estimatedSize });

      // Add data outputs
      for (let i = 0; i < cip33Addresses.length; i++) {
        vouts.push({
          value: dustValue,
          address: cip33Addresses[i],
        });
        totalOutputValue += dustValue;
        totalDustValue += dustValue;
      }

      logger.debug("stamp-create", { message: "After adding data outputs", totalOutputValue, totalDustValue, outputCount: vouts.length, dustValues: vouts.map(v => v.value) });

      if (service_fee > 0 && recipient_fee) {
        vouts.push({
          value: service_fee,
          address: recipient_fee,
        });
        totalOutputValue += service_fee;
        logger.debug("stamp-create", { message: "Added service fee output", service_fee, newTotalOutputValue: totalOutputValue });
      }

      // Convert vouts to the expected Output format
      const outputsForSelection = vouts.map(vout => ({
        value: vout.value,
        script: vout.script ? Buffer.from(vout.script).toString('hex') : "",
        ...(vout.address && { address: vout.address })
      }));

      // 🚀 OPTIMIZATION: Use optimal UTXO selection pattern instead of fetching all details upfront
      logger.debug("stamp-create", {
        message: "Using optimal UTXO selection pattern",
        outputsForSelection: outputsForSelection.length,
        satsPerVB: satsPerVB
      });

      // Use the inputs pre-selected (and pinned to CP via inputs_set) when
      // available. Re-selecting here would derive an independent set/order and
      // desynchronize vin[0] from the UTXO CP used to derive the ARC4 OP_RETURN
      // key — the exact failure mode that makes stamp issuances unindexable.
      let inputs: UTXO[];
      let initialChange = 0;
      if (preSelectedInputs && preSelectedInputs.length > 0) {
        inputs = preSelectedInputs;
        logger.debug("stamp-create", {
          message: "Using pre-selected inputs pinned to CP inputs_set",
          inputCount: inputs.length,
          vin0: inputs[0] ? `${inputs[0].txid}:${inputs[0].vout}` : undefined,
        });
      } else {
        // Use BitcoinUtxoManager for optimal UTXO selection with full details
        const selectionResult = await this.utxoService.selectUTXOsForTransaction(
          address,
          outputsForSelection,
          satsPerVB,
          0, // sigops_rate
          1.5, // rbfBuffer
          {
            filterStampUTXOs: true, // Filter out stamp-bearing UTXOs
            includeAncestors: true,  // Get full details for selected UTXOs only
          }
        );
        inputs = selectionResult.inputs;
        initialChange = selectionResult.change;
      }
      const totalInputValue = inputs.reduce((sum: number, input: UTXO) => sum + (input.value ?? 0), 0);

      logger.debug("stamp-create", {
        message: "Optimal UTXO selection completed",
        inputCount: inputs.length,
        totalInputValue,
        initialChange,
        inputDetails: inputs.map((input: UTXO) => ({
          value: input.value,
          hasAncestor: !!input.ancestor,
          ancestorFees: input.ancestor?.fees,
          ancestorVsize: input.ancestor?.vsize
        }))
      });

      // Recalculate the exact fee with the actual number of inputs selected
      // Use MARA estimator for MARA mode (outputValue < 330)
      const isMaraMode = dustValue < 330;
      
      if (isMaraMode) {
        // Use MARA-specific estimator for accurate calculation
        const maraEstimate = estimateMARATransactionSize({
          inputs: inputs.map((input: UTXO) => ({
            type: (input.scriptType || "P2WPKH") as ScriptType,
            isWitness: true
          })),
          fileSize,
          outputValue: dustValue,
          includeServiceFee: service_fee > 0,
          serviceFeeType: "P2WPKH" as ScriptType,
          includeChangeOutput: true,
          changeOutputType: "P2WPKH" as ScriptType,
          isMaraMode: true,
          maraFeeRate: satsPerVB
        });
        actualEstimatedSize = maraEstimate.estimatedSize;
        
        logger.info("stamp-create", {
          message: "MARA mode actual estimation with selected inputs",
          maraEstimate,
          dustValue,
          inputCount: inputs.length
        });
      } else {
        // Use standard estimator for non-MARA mode
        actualEstimatedSize = estimateMintingTransactionSize({
          inputs: inputs.map((input: UTXO) => ({
            type: (input.scriptType || "P2WPKH") as ScriptType,
            isWitness: true
          })),
          outputs: [
            { type: "OP_RETURN" as ScriptType }, // OP_RETURN
            ...cip33Addresses.map(() => ({
              type: "P2WSH" as ScriptType
            })),
            { type: "P2WPKH" as ScriptType } // service fee
          ],
          includeChangeOutput: true,
          changeOutputType: "P2WPKH" as ScriptType
        });
      }

      actualExactFeeNeeded = Math.ceil(actualEstimatedSize * satsPerVB);

      logger.debug("stamp-create", { message: "Recalculated size and fee with actual inputs",
        originalEstimatedSize: estimatedSize,
        actualEstimatedSize,
        originalFee: exactFeeNeeded,
        actualFee: actualExactFeeNeeded,
        inputCount: inputs.length
      });

      // Calculate adjusted change
      const adjustedChange = totalInputValue - totalOutputValue - actualExactFeeNeeded;

      logger.debug("stamp-create", { message: "Change calculation", totalInputValue, totalOutputValue, actualExactFeeNeeded, adjustedChange, difference: totalInputValue - (totalOutputValue + adjustedChange + actualExactFeeNeeded) });

      // Ensure adjustedChange is not negative
      if (adjustedChange < 0) {
        logger.error("stamp-create", { message: "Adjusted change is negative, indicating insufficient funds." });
        throw new Error("Insufficient funds to cover outputs and fees.");
      }

      // Add change output if adjustedChange is positive
      if (adjustedChange > 0) {
        vouts.push({
          value: adjustedChange,
          address: address,
        });
        logger.debug("stamp-create", { message: "Added change output", adjustedChange, finalVoutCount: vouts.length, allVoutValues: vouts.map(v => v.value) });
      }

      logger.debug("stamp-create", { message: "Preparing to add outputs to PSBT", outputCount: vouts.length, outputs: vouts.map(out => ({
        hasScript: "script" in out,
        hasAddress: "address" in out,
        value: out.value,
        scriptType: "script" in out ?
          `Uint8Array: ${out.script instanceof Uint8Array}` :
          'N/A'
      })) });

      // Add outputs to PSBT
      for (const out of vouts) {
        try {
          if ("script" in out && out.script) {
            // For script-based outputs
            psbt.addOutput({
              script: out.script,
              value: BigInt(out.value),
            });
          } else if ("address" in out && out.address) {
            // For address-based outputs
            psbt.addOutput({
              address: out.address,
              value: BigInt(out.value),
            });
          } else {
            logger.error("stamp-create", { message: "Invalid output", output: out });
            throw new Error("Invalid output format");
          }
        } catch (error) {
          logger.error("stamp-create", { message: "Error adding output to PSBT", output: out, error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      }

      logger.debug("stamp-create", { message: "Preparing to add inputs to PSBT", inputCount: inputs.length });
      // Add inputs to PSBT
      for (const input of inputs) {
        if (!input.script) {
          logger.error("stamp-create", { message: "Input UTXO is missing script", input });
          throw new Error(`Input UTXO ${input.txid}:${input.vout} is missing script (scriptPubKey).`);
        }

        const scriptTypeInfo = getScriptTypeInfo(input.script);
        const isWitnessInput = scriptTypeInfo.isWitness ||
                              (scriptTypeInfo.type === "P2SH" && scriptTypeInfo.redeemScriptType?.isWitness) ||
                              input.scriptType?.startsWith("witness") ||
                              input.scriptType?.toUpperCase().includes("P2W");

        const psbtInputDataForStamp: any = {
          hash: input.txid,
          index: input.vout,
          sequence: 0xfffffffd,
        };

        if (isWitnessInput) {
          psbtInputDataForStamp.witnessUtxo = {
            script: new Uint8Array(hex2bin(input.script)),
            value: BigInt(input.value),
          };
        } else {
          const rawTxHex = await StampCreationService.commonUtxoService.getRawTransactionHex(input.txid);
          if (!rawTxHex) {
            logger.error("stamp-create", { message: "Failed to fetch raw transaction hex for non-witness input", txid: input.txid });
            throw new Error(`Failed to fetch raw transaction for non-witness input ${input.txid}`);
          }
          psbtInputDataForStamp.nonWitnessUtxo = new Uint8Array(hex2bin(rawTxHex));
        }

        // Log before adding input
        const currentInputIndexForLog = psbt.inputCount;
        console.log(`[StampCreationService] Preparing Minter Input #${currentInputIndexForLog} (from UTXO ${input.txid}:${input.vout})`);
        console.log(`[StampCreationService] Minter Input Data for addInput:`, JSON.stringify(psbtInputDataForStamp, (_k,v) => typeof v === 'bigint' ? v.toString() : v));

        psbt.addInput(psbtInputDataForStamp as any);

        // Log psbt.data.inputs[currentInputIndexForLog] AFTER adding
        const addedInputData = psbt.data.inputs[currentInputIndexForLog];
        console.log(`[StampCreationService] Minter Input #${currentInputIndexForLog} state in psbt.data.inputs AFTER addInput:`);
        console.log(addedInputData ? JSON.stringify({
            hasWitnessUtxo: !!addedInputData.witnessUtxo,
            witnessUtxoValue: addedInputData.witnessUtxo?.value.toString(),
            witnessUtxoScriptLen: addedInputData.witnessUtxo?.script.length,
            hasNonWitnessUtxo: !!addedInputData.nonWitnessUtxo,
            nonWitnessUtxoLen: addedInputData.nonWitnessUtxo?.length,
            hasRedeemScript: !!addedInputData.redeemScript,
            redeemScriptLen: addedInputData.redeemScript?.length,
            hasWitnessScript: !!addedInputData.witnessScript,
            witnessScriptLen: addedInputData.witnessScript?.length,
            sighashType: addedInputData.sighashType,
            sequence: psbt.txInputs[currentInputIndexForLog]?.sequence
        }, (_k,v) => typeof v === 'bigint' ? v.toString() : v) : "Added input data not found (ERROR)");
      }

      // Recalculate finalTotalOutputValue to include change output
      const finalTotalOutputValue = totalOutputValue + (adjustedChange > 0 ? adjustedChange : 0);

      // Verify final fee rate (after including change output)
      const actualFee = totalInputValue - finalTotalOutputValue;
      const actualFeeRate = actualFee / actualEstimatedSize;

      logger.debug("stamp-create", { message: "Final fee verification", requestedFeeRate: satsPerVB, actualFeeRate, difference: Math.abs(actualFeeRate - satsPerVB), totalInputValue, finalTotalOutputValue, actualFee, actualEstimatedSize, effectiveFeePerVbyte: actualFee / actualEstimatedSize });

      // Final transaction summary
      logger.info("stamp-create", { message: "Final transaction structure for PSBT", inputCount: inputs.length, outputCount: vouts.length, totalIn: totalInputValue, totalOut: finalTotalOutputValue, fee: actualFee, feeRate: actualFee / actualEstimatedSize, size: actualEstimatedSize, outputs: vouts.map((v, i) => ({
        index: i,
        value: v.value,
        type: v.address === address ? 'change' : 'data',
        address: v.address
      })), psbtDetails: formatPsbtForLogging(psbt) });

      // ---------------------------------------------------------------------
      // Fail-closed ARC4 key guard.
      // The Counterparty indexer derives the ARC4 key ONLY from
      // vin[0].previous_output.txid (display byte order) and drops the whole
      // transaction as "invalid OP_RETURN script" if the decrypted payload does
      // not start with the CNTRPRTY prefix. inputs[0] is vin[0] because inputs
      // are added to the PSBT in array order above. Verify here, before the PSBT
      // ever leaves this service, that the OP_RETURN CP encrypted is recoverable
      // from vin[0]. If not, abort rather than emit an unindexable issuance.
      // ---------------------------------------------------------------------
      if (!isDryRun && inputs.length > 0) {
        const opReturnVout = vouts.find(
          (v) => v.script instanceof Uint8Array && v.script[0] === 0x6a,
        );
        if (!opReturnVout || !(opReturnVout.script instanceof Uint8Array)) {
          throw new Error(
            "ARC4 key guard: no OP_RETURN output found in the composed transaction",
          );
        }
        const decompiled = bitcoin.script.decompile(
          Buffer.from(opReturnVout.script),
        );
        const encryptedPayload = decompiled && decompiled.length > 0
          ? decompiled[decompiled.length - 1]
          : null;
        if (!encryptedPayload || !Buffer.isBuffer(encryptedPayload)) {
          throw new Error(
            "ARC4 key guard: OP_RETURN output has no data payload to verify",
          );
        }
        // Indexer key = vin[0].prev_txid in display (big-endian) byte order.
        // input.txid is already the display-order hex string.
        const arc4Key = new Uint8Array(hex2bin(inputs[0].txid));
        const decrypted = arc4(arc4Key, new Uint8Array(encryptedPayload));
        const prefix = Buffer.from(decrypted.subarray(0, 8)).toString("utf8");
        if (prefix !== "CNTRPRTY") {
          throw new Error(
            `ARC4 key mismatch: OP_RETURN is not decryptable from vin[0] ` +
              `(${inputs[0].txid}:${inputs[0].vout}). Aborting to avoid ` +
              `broadcasting an unindexable stamp issuance — the UTXO Counterparty ` +
              `keyed the OP_RETURN against is not at input index 0.`,
          );
        }
        logger.info("stamp-create", {
          message: "ARC4 key guard passed: OP_RETURN decodes from vin[0]",
          vin0: `${inputs[0].txid}:${inputs[0].vout}`,
        });
      }

      return {
        psbt,
        satsPerVB,
        estimatedTxSize: actualEstimatedSize,
        totalInputValue,
        totalOutputValue: finalTotalOutputValue,
        totalChangeOutput: adjustedChange,
        totalDustValue,
        estMinerFee: actualExactFeeNeeded,
        changeAddress: address,
      };
    } catch (error) {
      logger.error("stamp-create", { message: "PSBT Generation Error in StampCreationService", error: error instanceof Error ? error.message : String(error), address, fileSize, satsPerVB, totalOutputValue, cip33AddressCount: cip33Addresses.length, vouts: vouts.length, estimatedFee: estMinerFee });
      throw error;
    }
  }

  static async createIssuanceTransaction({
    sourceWallet,
    assetName,
    qty,
    locked = true,
    divisible = false,
    description,
    satsPerKB,
    isDryRun,
    file,
    service_fee,
    outputValue,
    inputs_set,
    use_all_inputs_set,
  }: {
    sourceWallet: string;
    assetName: string;
    qty: number;
    locked?: boolean;
    divisible?: boolean;
    description: string;
    satsPerKB: number;
    isDryRun?: boolean;
    file: string;
    service_fee: number;
    outputValue?: number;
    // Pin the exact UTXO set CP composes against (see IssuanceOptions.inputs_set).
    // CP keys the ARC4 OP_RETURN off the largest-by-raw-value entry, so the
    // caller MUST place that same UTXO at vin[0] of the final transaction.
    inputs_set?: string;
    use_all_inputs_set?: boolean;
  }) {
    try {
      // Add wallet validation
      const walletValidation = validateWalletAddressForMinting(sourceWallet);
      if (!walletValidation.isValid) {
        throw new Error(`Invalid source wallet address: ${walletValidation.error}`);
      }

      logger.info("stamp-create", { message: "Starting createIssuanceTransaction with params", sourceWallet, assetName, qty, locked, divisible, description, satsPerKB, isDryRun: isDryRun, isDryRunType: typeof isDryRun, outputValue });

      // For dryRun, return mock transaction data to avoid UTXO lookup
      if (isDryRun === true) {
        logger.info("stamp-create", { message: "DryRun mode: calculating accurate transaction size", sourceWallet, isDryRunValue: isDryRun });

        // Calculate accurate transaction size based on actual parameters
        // This is much more accurate than the XCP API call and significantly faster!

        // Calculate exact file size and CIP33 chunks from actual file data
        const actualFileSize = Math.ceil((file.length * 3) / 4); // Convert base64 to bytes
        const cip33ChunkCount = Math.ceil(actualFileSize / 32); // Each chunk is ~32 bytes

        // Calculate transaction structure:
        // 1. Base transaction overhead: ~10 bytes
        let estimatedSize = 10;

        // 2. Inputs (assume 1 P2WPKH input for estimation)
        estimatedSize += 68; // P2WPKH input size

        // 3. Outputs:
        estimatedSize += 43; // OP_RETURN output (Counterparty issuance)
        estimatedSize += cip33ChunkCount * 43; // P2WSH data outputs for file chunks
        estimatedSize += 31; // Change output (P2WPKH)

        // 4. Service fee output (if applicable)
        if (service_fee > 0) {
          estimatedSize += 31; // Service fee output
        }

        const estimatedFee = Math.ceil(estimatedSize * (satsPerKB / 1000));
        const dustValue = outputValue !== undefined ? outputValue : TX_CONSTANTS.DUST_SIZE;
        const totalDustValue = cip33ChunkCount * dustValue; // Each P2WSH output has dust

        logger.info("stamp-create", {
          message: "DryRun size calculation",
          actualFileSize,
          cip33ChunkCount,
          estimatedSize,
          satsPerKB,
          estimatedFee,
          totalDustValue,
          dustValue,
          outputValue,
          hasServiceFee: service_fee > 0,
          breakdown: {
            base: 10,
            inputs: 68,
            opReturn: 43,
            dataOutputs: cip33ChunkCount * 43,
            change: 31,
            serviceFee: service_fee > 0 ? 31 : 0
          }
        });

        return {
          tx_hex: "mock_transaction_hex_for_fee_estimation",
          tx_size: estimatedSize,
          fee_rate: satsPerKB,
          total_fee: estimatedFee,
          total_dust_value: totalDustValue,
          inputs: [],
          outputs: [],
          estimated_chunks: cip33ChunkCount,
          estimation_method: "client_side_calculation_exact"
        };
      }

      // Use the new V2 API call
      const response = await CounterpartyApiManager.createIssuance(
        sourceWallet,
        assetName,
        qty,
        {
          divisible,
          lock: locked,
          description,
          fee_per_kb: satsPerKB,
          allow_unconfirmed_inputs: true,
          return_psbt: false, // Request hex instead of PSBT
          verbose: true,
          encoding: 'opreturn',
          // Pin the exact UTXO set so CP derives the ARC4 OP_RETURN key from a
          // UTXO we control. use_all_inputs_set forces CP to consume every entry
          // (default is "grow from 1"), guaranteeing the largest-by-value UTXO —
          // which CP sorts to vin[0] and keys ARC4 against — is the one we pin to
          // index 0 of the broadcast transaction. Without this the OP_RETURN is
          // keyed off an input that may not be vin[0], and the stamp is dropped
          // by the Counterparty indexer as an invalid OP_RETURN script.
          ...(inputs_set
            ? {
              inputs_set,
              use_all_inputs_set: use_all_inputs_set ?? true,
              disable_utxo_locks: true,
            }
            : {}),
        }
      );

      // Handle specific error cases
      if (response.error) {
        if (response.error.message?.includes('invalid base58')) {
          throw new Error(`Invalid wallet address format: ${sourceWallet}. Only P2PKH (1), P2WPKH (bc1q), and P2SH (3) addresses are supported.`);
        }

        throw new Error(`API Error: ${response.error || 'Unknown error'}`);
      }

      // Check for nested result and rawtransaction
      if (!response.result?.rawtransaction) {
        logger.error("stamp-create", { message: "API Response", response }); // Log the full response for debugging
        throw new Error('Transaction creation failed: No transaction data returned from API');
      }

      // Return with tx_hex for compatibility with existing code
      return {
        tx_hex: response.result.rawtransaction
      };
    } catch (error) {
      logger.error("stamp-create", { message: "Detailed createIssuanceTransaction error", error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}
