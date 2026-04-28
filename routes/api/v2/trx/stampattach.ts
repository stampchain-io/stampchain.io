import { TX_CONSTANTS } from "$constants";
import { Handlers } from "$fresh/server.ts";
import type {
  InputTypeForSizeEstimation,
  OutputTypeForSizeEstimation,
  ScriptTypeInfo,
} from "$lib/types/transaction.d.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { hex2bin } from "$lib/utils/data/binary/baseUtils.ts";
import { logger } from "$lib/utils/logger.ts";
import { estimateMintingTransactionSize } from "$lib/utils/bitcoin/minting/transactionSizes.ts";
import { getScriptTypeInfo } from "$lib/utils/bitcoin/scripts/scriptTypeUtils.ts";
import { serverConfig } from "$server/config/config.ts"; // Import serverConfig
import { StampController } from "$server/controller/stampController.ts";
import {
  ComposeAttachOptions,
  CounterpartyApiManager,
  normalizeFeeRate,
} from "$server/services/counterpartyApiService.ts";
import { CommonUTXOService } from "$server/services/utxo/commonUtxoService.ts";
import type { UTXO as ServiceUTXO } from "$types/index.d.ts";
import { Buffer } from "node:buffer";

// Update interface to accept either fee rate type and service fee
interface StampAttachInput {
  address: string;
  identifier: string; // cpid, stamp number, or tx_hash
  quantity: number;
  options:
    & Omit<ComposeAttachOptions, "inputs_set" | "fee_per_kb" | "sat_per_vbyte">
    & {
      fee_per_kb?: number; // Kept for backward compatibility if client sends it
      satsPerVB?: number; // Preferred fee rate input
      service_fee?: number; // Optional service fee amount in sats
      service_fee_address?: string; // Optional service fee address
      allow_unconfirmed_inputs?: boolean; // For sequence number
    };
  inputs_set?: string; // txid:vout format - moved to top level for clarity
  service_fee?: number; // Allow top-level override
  service_fee_address?: string; // Allow top-level override
}

export const handler: Handlers = {
  async POST(req: Request) {
    const commonUtxoService = new CommonUTXOService();
    try {
      // Dynamic import of bitcoinjs-lib to exclude from build-time static analysis
      const {
        address: bjsAddress,
        networks,
        Psbt,
        Transaction,
      } = await import("bitcoinjs-lib");

      const body: StampAttachInput = await req.json();
      logger.info("api", {
        message: "Received stamp attach input",
        input: body,
      });

      const { address, identifier, quantity, inputs_set, options } = body;
      const network = networks.bitcoin; // Or determine from address

      // Prepare args for normalizeFeeRate carefully due to exactOptionalPropertyTypes
      const feeArgs: { satsPerKB?: number; satsPerVB?: number } = {};
      if (options.fee_per_kb !== undefined) {
        feeArgs.satsPerKB = options.fee_per_kb;
      }
      if (options.satsPerVB !== undefined) {
        feeArgs.satsPerVB = options.satsPerVB;
      }
      const normalizedFees = normalizeFeeRate(feeArgs);

      if (!normalizedFees || normalizedFees.normalizedSatsPerVB <= 0) {
        return ApiResponseUtil.badRequest("Invalid fee rate.");
      }

      if (inputs_set && !inputs_set.match(/^[a-fA-F0-9]{64}:\d+$/)) {
        return ApiResponseUtil.badRequest("Invalid inputs_set format.");
      }

      const cpid = await StampController.resolveToCpid(identifier);

      const xcpApiCallOptions: any = {
        ...(options || {}),
        return_psbt: false, // Explicitly ask for raw tx from XCP Manager
        verbose: true,
        // Pass a fee_per_kb if CP API needs it for composition, even if we recalculate later.
        // Using the normalized one, CounterpartyApiManager.composeAttach expects fee_per_kb.
        fee_per_kb: normalizedFees.normalizedSatsPerKB,
      };
      // Remove options that should not be passed directly or are handled differently now
      delete xcpApiCallOptions.satsPerVB;
      delete xcpApiCallOptions.service_fee;
      delete xcpApiCallOptions.service_fee_address;

      const cpResult = await CounterpartyApiManager.composeAttach(
        address,
        cpid,
        quantity,
        xcpApiCallOptions,
      );

      if (!cpResult || !cpResult.rawtransaction) {
        throw new Error(
          cpResult?.error?.message || cpResult?.error?.description ||
            cpResult?.error ||
            "Failed to compose attach raw transaction from XCP.",
        );
      }
      const rawCpTxHex = cpResult.rawtransaction;
      const cpTx = Transaction.fromHex(rawCpTxHex);

      logger.info("api", {
        message: "Received rawtransaction from composeAttach",
        txHexLength: rawCpTxHex.length,
      });

      const psbt = new Psbt({ network });
      const inputsToSign: {
        index: number;
        address: string;
        sighashTypes?: number[];
      }[] = [];
      let sumOfUserInputs = BigInt(0);

      const sequence = options?.allow_unconfirmed_inputs === false
        ? 0xffffffff
        : 0xfffffffd; // RBF if true/undefined

      if (inputs_set) { // User specified the input UTXO
        const [txid, voutStr] = inputs_set.split(":");
        const vout = parseInt(voutStr, 10);
        const utxoDetails: ServiceUTXO | null = await commonUtxoService
          .getSpecificUTXO(txid, vout);
        if (
          !utxoDetails || !utxoDetails.script || utxoDetails.value === undefined
        ) {
          throw new Error(
            `Specified input UTXO ${inputs_set} not found or invalid.`,
          );
        }
        sumOfUserInputs = BigInt(utxoDetails.value);
        const scriptTypeInfo: ScriptTypeInfo = getScriptTypeInfo(
          utxoDetails.script,
        );
        const inputData: any = {
          hash: txid,
          index: vout,
          sequence,
        };
        if (scriptTypeInfo.isWitness) {
          inputData.witnessUtxo = {
            script: Buffer.from(hex2bin(utxoDetails.script)),
            value: BigInt(utxoDetails.value),
          };
        } else {
          const rawTx = (utxoDetails as any).rawTxHex ||
            await commonUtxoService.getRawTransactionHex(txid);
          if (!rawTx) {
            throw new Error(`Raw tx not found for non-witness input ${txid}`);
          }
          inputData.nonWitnessUtxo = Buffer.from(hex2bin(rawTx));
        }
        if (
          scriptTypeInfo.type === "P2SH" &&
          (utxoDetails as any).redeemScript
        ) {
          inputData.redeemScript = Buffer.from(
            hex2bin((utxoDetails as any).redeemScript),
          );
        }
        psbt.addInput(inputData);
        inputsToSign.push({
          index: 0,
          address: address,
          sighashTypes: [Transaction.SIGHASH_ALL],
        });
      } else { // Counterparty chose the input(s) - assume one for now from cpTx.ins[0]
        if (!cpTx.ins || cpTx.ins.length === 0) {
          throw new Error("CP rawtransaction has no inputs.");
        }
        const cpInput = cpTx.ins[0];
        const inputTxid = Buffer.from(cpInput.hash).reverse().toString("hex");
        const inputVout = cpInput.index;
        const utxoDetails: ServiceUTXO | null = await commonUtxoService
          .getSpecificUTXO(
            inputTxid,
            inputVout,
          );
        if (
          !utxoDetails || !utxoDetails.script || utxoDetails.value === undefined
        ) {
          throw new Error(
            `Input UTXO ${inputTxid}:${inputVout} from CP raw tx not found or invalid.`,
          );
        }
        sumOfUserInputs = BigInt(utxoDetails.value);
        const scriptTypeInfo: ScriptTypeInfo = getScriptTypeInfo(
          utxoDetails.script,
        );
        const inputData: any = {
          hash: inputTxid,
          index: inputVout,
          sequence: cpInput.sequence,
        };
        if (scriptTypeInfo.isWitness) {
          inputData.witnessUtxo = {
            script: Buffer.from(hex2bin(utxoDetails.script)),
            value: BigInt(utxoDetails.value),
          };
        } else {
          const rawTx = (utxoDetails as any).rawTxHex ||
            await commonUtxoService.getRawTransactionHex(inputTxid);
          if (!rawTx) {
            throw new Error(
              `Raw tx not found for non-witness input ${inputTxid}`,
            );
          }
          inputData.nonWitnessUtxo = Buffer.from(hex2bin(rawTx));
        }
        if (
          scriptTypeInfo.type === "P2SH" &&
          (utxoDetails as any).redeemScript
        ) {
          inputData.redeemScript = Buffer.from(
            hex2bin((utxoDetails as any).redeemScript),
          );
        }
        psbt.addInput(inputData);
        inputsToSign.push({
          index: 0,
          address: address,
          sighashTypes: [Transaction.SIGHASH_ALL],
        });
      }

      let cpOutputsTotalValue = BigInt(0);
      const essentialCpOutputs: { script: Buffer; value: bigint }[] = [];
      for (const output of cpTx.outs) {
        try {
          bjsAddress.fromOutputScript(
            output.script,
            network,
          );
        } catch (_e: any) { /* Not a simple address output, _e is now used */ }
        essentialCpOutputs.push({
          script: Buffer.from(output.script),
          value: BigInt(output.value),
        });
        cpOutputsTotalValue += BigInt(output.value);
      }
      essentialCpOutputs.forEach((out) => psbt.addOutput(out));

      let totalValueToOutputsExcludingChange = cpOutputsTotalValue;
      const feeService = body.service_fee ?? options?.service_fee ??
        parseInt(serverConfig.MINTING_SERVICE_FEE_FIXED_SATS, 10);
      const feeServiceAddress = body.service_fee_address ??
        options?.service_fee_address ??
        serverConfig.MINTING_SERVICE_FEE_ADDRESS;
      let actualServiceFeeAdded = BigInt(0);

      if (feeService > 0 && feeServiceAddress) {
        psbt.addOutput({
          address: feeServiceAddress,
          value: BigInt(feeService),
        });
        totalValueToOutputsExcludingChange += BigInt(feeService);
        actualServiceFeeAdded = BigInt(feeService);
        logger.info("api", {
          message: "Added service fee output",
          fee: feeService,
          to: feeServiceAddress,
        });
      }

      // Estimate size and calculate final network fee and change
      const tempPsbtForSize = psbt.clone();
      tempPsbtForSize.addOutput({
        address: address,
        value: BigInt(TX_CONSTANTS.DUST_SIZE),
      });

      const inputsForSizeEst: InputTypeForSizeEstimation[] = psbt.data.inputs
        .map((input, idx) => {
          let scriptHex = "";
          if (input.witnessUtxo?.script) {
            scriptHex = input.witnessUtxo.script.toString();
          } else if (input.nonWitnessUtxo) {
            try {
              scriptHex = Buffer.from(
                Transaction.fromBuffer(input.nonWitnessUtxo)
                  .outs[psbt.txInputs[idx].index].script,
              ).toString("hex");
            } catch (e: any) {
              logger.warn("api", {
                message:
                  `Error parsing nonWitnessUtxo for size est input ${idx}: ${e.message}`,
              });
            }
          }
          const scriptInfo: ScriptTypeInfo = getScriptTypeInfo(scriptHex || "");

          const estInput: InputTypeForSizeEstimation = {
            type: scriptInfo.type,
            isWitness: scriptInfo.isWitness,
          };
          if (scriptInfo.redeemScriptType?.type !== undefined) {
            estInput.redeemScriptType = scriptInfo.redeemScriptType.type;
          }
          return estInput;
        });

      const outputsForSizeEst: OutputTypeForSizeEstimation[] = tempPsbtForSize
        .txOutputs.map((out) => {
          const scriptInfo: ScriptTypeInfo = getScriptTypeInfo(
            Buffer.from(out.script).toString("hex"),
          );
          return { type: scriptInfo.type };
        });

      const estimatedVsize = estimateMintingTransactionSize({
        inputs: inputsForSizeEst,
        outputs: outputsForSizeEst,
        includeChangeOutput: false,
      });
      const networkFee = BigInt(
        Math.ceil(estimatedVsize * normalizedFees.normalizedSatsPerVB),
      );
      const finalUserChangeConst = sumOfUserInputs -
        totalValueToOutputsExcludingChange - networkFee;
      const finalUserChangeValue = finalUserChangeConst;

      if (actualServiceFeeAdded > BigInt(0)) {
        let cpChangeOutputIndex = -1;
        for (let i = psbt.txOutputs.length - 1; i >= 0; i--) {
          let outputAddr;
          try {
            outputAddr = bjsAddress.fromOutputScript(
              psbt.txOutputs[i].script,
              network,
            );
          } catch (_e: any) { // Intentionally empty
          }
          if (outputAddr === address && outputAddr !== feeServiceAddress) {
            cpChangeOutputIndex = i;
            break;
          }
        }
        if (
          cpChangeOutputIndex !== -1 &&
          psbt.txOutputs[cpChangeOutputIndex].value !== actualServiceFeeAdded
        ) {
          logger.info("api", {
            message:
              `Removing potential CP change output at index ${cpChangeOutputIndex} before adding new change.`,
          });
          psbt.txOutputs.splice(cpChangeOutputIndex, 1);
          if (psbt.data.globalMap.unsignedTx) {
            (psbt.data.globalMap.unsignedTx as any).outs.splice(
              cpChangeOutputIndex,
              1,
            );
          }
        } else {
          while (psbt.txOutputs.length > 0) psbt.txOutputs.pop();
          if (psbt.data.globalMap.unsignedTx) {
            (psbt.data.globalMap.unsignedTx as any).outs = [];
          }
          essentialCpOutputs.forEach((out) => psbt.addOutput(out));
          if (feeService > 0 && feeServiceAddress) {
            psbt.addOutput({
              address: feeServiceAddress,
              value: BigInt(feeService),
            });
          }
        }
      }
      if (finalUserChangeValue >= BigInt(TX_CONSTANTS.DUST_SIZE)) {
        psbt.addOutput({ address: address, value: finalUserChangeValue });
      } else if (
        finalUserChangeValue > BigInt(0) &&
        finalUserChangeValue < BigInt(TX_CONSTANTS.DUST_SIZE)
      ) {
        logger.info("api", {
          message: "Change is dust, adding to fee for stampattach",
          change: finalUserChangeValue.toString(),
        });
      } else if (finalUserChangeValue < BigInt(0)) {
        throw new Error(
          `Insufficient funds after all calculations for attach. Deficit: ${-finalUserChangeValue}`,
        );
      }
      // Return unsigned PSBT for the wallet to sign (do NOT finalize —
      // finalizeAllInputs() requires signatures which the wallet provides)
      const finalPsbtHex = psbt.toHex();
      return ApiResponseUtil.success({
        psbtHex: finalPsbtHex,
        inputsToSign,
        estimatedFee: Number(
          networkFee +
            (finalUserChangeValue < BigInt(TX_CONSTANTS.DUST_SIZE) &&
                finalUserChangeValue > 0
              ? finalUserChangeValue
              : BigInt(0)),
        ),
        estimatedVsize: Number(estimatedVsize),
      }, { forceNoCache: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to process stamp attach request";
      logger.error("api", {
        message: "Error processing stamp attach request",
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (
        errorMessage.toLowerCase().includes("insufficient funds") ||
        errorMessage.includes("utxo selection failed")
      ) {
        return ApiResponseUtil.badRequest(errorMessage);
      }
      return ApiResponseUtil.internalError(error, errorMessage);
    }
  },
};
