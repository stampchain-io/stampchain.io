// routes/api/v2/create/send.ts
import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { logger } from "$lib/utils/logger.ts";
import {
  CounterpartyApiManager,
  normalizeFeeRate,
} from "$server/services/counterpartyApiService.ts";
import { getProductionFeeService } from "$server/services/fee/feeServiceFactory.ts";
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

      // Resolve fee_per_kb (sat/kB) with a clear precedence:
      //   1. explicit options.fee_per_kb (caller-supplied, already sat/kB)
      //   2. explicit satsPerVB (what the frontend sends after its own fee
      //      selection) — converted via the canonical normalizeFeeRate helper.
      //      The prior code multiplied by the nonexistent
      //      TX_CONSTANTS.APPROX_VBYTES_PER_KB, yielding NaN → 500 (#1151).
      //   3. neither supplied → fetch the live mempool recommended rate as a
      //      dynamic default so direct API callers (not just the website, which
      //      always sends an explicit rate) build at a current network fee
      //      instead of relying on Counterparty's internal default.
      let resolvedFeePerKb: number | undefined = options.fee_per_kb;
      if (resolvedFeePerKb === undefined) {
        if (satsPerVB && satsPerVB > 0) {
          resolvedFeePerKb =
            normalizeFeeRate({ satsPerVB }).normalizedSatsPerKB;
        } else {
          try {
            const feeData = await getProductionFeeService().getFeeData();
            if (feeData?.recommendedFee && feeData.recommendedFee > 0) {
              resolvedFeePerKb = normalizeFeeRate({
                satsPerVB: feeData.recommendedFee,
              }).normalizedSatsPerKB;
              logger.info("api", {
                message: "send: applied dynamic mempool fee default",
                recommendedFee: feeData.recommendedFee,
                source: feeData.source,
              });
            }
          } catch (feeErr) {
            // Mempool/FeeService unavailable — leave fee_per_kb undefined and let
            // Counterparty fall back to its own default (prior behaviour).
            logger.warn("api", {
              message:
                "send: dynamic mempool fee default unavailable, deferring to Counterparty default",
              error: feeErr instanceof Error ? feeErr.message : String(feeErr),
            });
          }
        }
      }

      // Options for CounterpartyApiManager.createSend to get the raw transaction
      // Counterparty's create_send might require a fee parameter.
      // We pass satsPerVB (converted to fee_per_kb if needed by createSend options) so CP can build its tx.
      // The fee it calculates is implicit in its rawtransaction.
      const xcpCreateSendOptions: any = {
        encoding: options.encoding || "opreturn",
        return_psbt: false, // Explicitly ask for raw tx, not PSBT from CP
        verbose: true,
        fee_per_kb: resolvedFeePerKb,
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

      // Reconstruct PSBT inputs from ALL of Counterparty's chosen inputs, in
      // order, so vin[0] stays the input the CP payload is ARC4-keyed against
      // (#1137). The prior code processed only cpTx.ins[0] and dropped the rest,
      // underfunding sends whenever CP funded the source from several UTXOs.
      const { buildCpPsbtInputsFromRawTx } = await import(
        "$lib/utils/bitcoin/psbt/cpRawTxInputs.ts"
      );
      const { builtInputs, inputsToSign } = await buildCpPsbtInputsFromRawTx(
        commonUtxoService,
        cpTx.ins,
        address,
        [Transaction.SIGHASH_ALL],
      );

      const psbt = new Psbt({ network });
      for (const { inputData } of builtInputs) {
        psbt.addInput(inputData as any);
      }

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
