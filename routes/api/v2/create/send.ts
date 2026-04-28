// routes/api/v2/create/send.ts
import { TX_CONSTANTS } from "$constants";
import { Handlers } from "$fresh/server.ts";
import type { UTXO as DetailedUTXO } from "$lib/types/index.d.ts";
import type { ScriptTypeInfo } from "$lib/types/transaction.d.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { hex2bin } from "$lib/utils/binary/baseUtils.ts";
import { logger } from "$lib/utils/logger.ts";
import { getScriptTypeInfo } from "$lib/utils/scriptTypeUtils.ts";
import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import { CommonUTXOService } from "$server/services/utxo/commonUtxoService.ts";
import type { SendRequestBody, SendResponse } from "$types/api.d.ts";
import { Buffer } from "node:buffer";

export const handler: Handlers<SendResponse | { error: string }> = {
  async POST(req) {
    try {
      // Dynamic import of bitcoinjs-lib to exclude from build-time static analysis
      const { networks, Psbt, Transaction } = await import("bitcoinjs-lib");

      const body: SendRequestBody = await req.json();
      const commonUtxoService = new CommonUTXOService();

      await logger.debug("api", {
        message: "Received send input (v_reconstruct_from_cp_rawtx)",
        input: JSON.stringify(
          body,
          (_, v) => typeof v === "bigint" ? v.toString() : v,
        ),
      });

      const {
        address,
        destination,
        asset,
        quantity,
        satsPerVB,
        options = {},
        dryRun,
      } = body;
      const isEffectivelyDryRun = dryRun === true;
      const network = networks.bitcoin;

      if (!address) {
        return ApiResponseUtil.badRequest("Missing required field: address");
      }
      if (!destination) {
        return ApiResponseUtil.badRequest(
          "Missing required field: destination",
        );
      }
      if (!asset) {
        return ApiResponseUtil.badRequest("Missing required field: asset");
      }
      if (quantity === undefined || quantity <= 0) {
        return ApiResponseUtil.badRequest("Invalid quantity");
      }
      if (satsPerVB === undefined || satsPerVB <= 0) {
        logger.warn("api", {
          message:
            "satsPerVB is <=0 or undefined, ensure Counterparty API call has appropriate fee settings.",
          satsPerVB,
        });
      }

      // Options for CounterpartyApiManager.createSend to get the raw transaction
      // Counterparty's create_send might require a fee parameter.
      // We pass satsPerVB (converted to fee_per_kb if needed by createSend options) so CP can build its tx.
      // The fee it calculates is implicit in its rawtransaction.
      const xcpCreateSendOptions: any = {
        encoding: options.encoding || "opreturn",
        return_psbt: false, // Explicitly ask for raw tx, not PSBT from CP
        verbose: true,
        // Pass fee info if CounterpartyApiManager.createSend expects it for the CP API call
        // Assuming CounterpartyApiManager.createSend handles conversion if CP API needs fee_per_kb
        fee_per_kb: options.fee_per_kb ||
          (satsPerVB
            ? satsPerVB * (TX_CONSTANTS as any).APPROX_VBYTES_PER_KB / 1000
            : undefined),
      };
      if (options.memo !== undefined) xcpCreateSendOptions.memo = options.memo;
      if (options.memo_is_hex !== undefined) {
        xcpCreateSendOptions.memo_is_hex = options.memo_is_hex;
      }
      // Add any other options CounterpartyApiManager.createSend would pass to Counterparty API

      const cpResponse = await CounterpartyApiManager.createSend(
        address,
        destination,
        asset,
        quantity,
        xcpCreateSendOptions,
      );

      if (
        cpResponse.error || !cpResponse.result ||
        !cpResponse.result.rawtransaction
      ) {
        await logger.error("api", {
          message:
            "[API /send] Error or no rawtransaction from CounterpartyApiManager.createSend",
          error: cpResponse.error,
          result: cpResponse.result,
        });
        throw new Error(
          cpResponse.error?.message || cpResponse.error?.description ||
            cpResponse.error ||
            "Failed to get raw transaction from CounterpartyApiManager.createSend.",
        );
      }

      const rawCpTxHex = cpResponse.result.rawtransaction;
      const cpTx = Transaction.fromHex(rawCpTxHex);

      if (!cpTx.ins || cpTx.ins.length === 0) {
        throw new Error("Counterparty raw transaction has no inputs.");
      }
      // Assuming CP uses one input from the sourceAddress for simplicity in this model
      if (cpTx.ins.length > 1) {
        logger.warn("api", {
          message:
            "Counterparty raw tx has multiple inputs, processing only the first for PSBT.",
          inputCount: cpTx.ins.length,
        });
      }

      const psbt = new Psbt({ network });
      const inputsToSign: {
        index: number;
        address: string;
        sighashTypes?: number[];
      }[] = [];

      // Process the first input (assuming Counterparty picked one from userAddress)
      const cpInput = cpTx.ins[0];
      const inputTxid = Buffer.from(cpInput.hash).reverse().toString("hex");
      const inputVout = cpInput.index;

      // Fetch full UTXO details for this input
      const rawUtxoDetails = await commonUtxoService
        .getSpecificUTXO(inputTxid, inputVout);
      const utxoDetails: DetailedUTXO | null = rawUtxoDetails
        ? {
          ...rawUtxoDetails,
          scriptType: rawUtxoDetails.scriptType as any, // Type cast to handle different ScriptType definitions
        }
        : null;
      if (
        !utxoDetails || !utxoDetails.script || utxoDetails.value === undefined
      ) {
        throw new Error(
          `Failed to fetch UTXO details for input ${inputTxid}:${inputVout} from CP raw tx.`,
        );
      }

      const scriptTypeInfo: ScriptTypeInfo = getScriptTypeInfo(
        utxoDetails.script,
      );
      const psbtInputData: any = {
        hash: inputTxid,
        index: inputVout,
        sequence: cpInput.sequence, // Use sequence from CP's transaction
      };

      if (scriptTypeInfo.isWitness) {
        psbtInputData.witnessUtxo = {
          script: Buffer.from(hex2bin(utxoDetails.script)),
          value: BigInt(utxoDetails.value),
        };
      } else {
        // For non-witness, nonWitnessUtxo is the full previous tx hex
        // If utxoDetails itself contains the rawTxHex for its parent, use it. Otherwise, fetch again.
        const nonWitnessRawTxHex = utxoDetails.rawTxHex ||
          await commonUtxoService.getRawTransactionHex(inputTxid);
        if (!nonWitnessRawTxHex) {
          throw new Error(
            `Failed to get raw tx hex for non-witness input ${inputTxid}`,
          );
        }
        psbtInputData.nonWitnessUtxo = Buffer.from(hex2bin(nonWitnessRawTxHex));
      }
      if (
        scriptTypeInfo.type === "P2SH" &&
        scriptTypeInfo.redeemScriptType?.isWitness
      ) {
        if (utxoDetails.redeemScript) {
          psbtInputData.redeemScript = Buffer.from(
            hex2bin(utxoDetails.redeemScript),
          );
        } else {
          // This case implies P2SH-P2WPKH or P2SH-P2WSH where redeemScript is critical
          // and must be derivable or provided. For now, log a warning if missing.
          logger.warn("api", {
            message:
              `Redeem script missing for P2SH input ${inputTxid}:${inputVout}. PSBT may be incomplete.`,
          });
        }
      }
      psbt.addInput(psbtInputData);
      inputsToSign.push({
        index: 0,
        address: address,
        sighashTypes: [Transaction.SIGHASH_ALL],
      });

      // Add all outputs from Counterparty's transaction
      for (const cpOutput of cpTx.outs) {
        psbt.addOutput({
          script: Buffer.from(cpOutput.script),
          value: BigInt(cpOutput.value),
        });
      }

      // For dryRun, we might return estimated fees based on CP's tx or our own calculation if adjusted.
      // This part needs more thought if we are not doing our own fee calculation yet.
      if (isEffectivelyDryRun) {
        const feeFromCp = cpResponse.result.btc_fee; // CP provides an estimated fee
        logger.info("api", {
          message:
            "Dry run for send. Using fee info from Counterparty response.",
          feeFromCp,
        });
        return ApiResponseUtil.success({
          estimatedFee: feeFromCp ? Number(feeFromCp) : undefined,
        }, { forceNoCache: true });
      }

      const finalPsbtHex = psbt.toHex();

      await logger.debug("api", {
        message: "Successfully reconstructed PSBT for send",
        psbtHexLength: finalPsbtHex.length,
        inputCount: psbt.inputCount,
        outputCount: psbt.txOutputs.length,
        fee: cpResponse.result.btc_fee
          ? cpResponse.result.btc_fee.toString()
          : "Unknown",
      });

      return ApiResponseUtil.success({
        psbtHex: finalPsbtHex,
        inputsToSign,
        estimatedFee: cpResponse.result.btc_fee
          ? Number(cpResponse.result.btc_fee)
          : undefined,
      }, { forceNoCache: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to process send request";
      await logger.error("api", {
        message: "Error processing send request (v_reconstruct_from_cp_rawtx)",
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        requestBody: req.body
          ? JSON.stringify(await req.json().catch(() => ({})))
          : "Could not parse body",
      });
      if (
        errorMessage.toLowerCase().includes("insufficient funds") ||
        errorMessage.includes("utxo selection failed")
      ) {
        return ApiResponseUtil.badRequest(errorMessage);
      }
      return ApiResponseUtil.internalError(errorMessage);
    }
  },
};
