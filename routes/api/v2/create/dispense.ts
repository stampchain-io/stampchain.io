// routes/api/v2/dispense.ts
import { TX_CONSTANTS } from "$constants";
import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { logger } from "$lib/utils/logger.ts";
import { buildCpPsbtInputsFromRawTx } from "$lib/utils/bitcoin/psbt/cpRawTxInputs.ts";
import { buildServiceFeeOutputs } from "$lib/utils/bitcoin/psbt/serviceFeeOutputs.ts";
import { getServiceFeeConfig } from "$server/config/config.ts";
import {
  CounterpartyApiManager,
  normalizeFeeRate,
} from "$server/services/counterpartyApiService.ts";
import { CommonUTXOService } from "$server/services/utxo/commonUtxoService.ts";
import { Buffer } from "node:buffer";

interface DispenseInput {
  address: string;
  dispenser: string;
  quantity: number;
  dryRun?: boolean; // Add dryRun support for unified fee estimation system
  options: {
    fee_per_kb?: number;
    satsPerVB?: number;
    allow_unconfirmed_inputs?: boolean;
    validate?: boolean;
    verbose?: boolean;
    [key: string]: any;
  };
}

export const handler: Handlers = {
  async POST(req) {
    const commonUtxoService = new CommonUTXOService();
    try {
      const input: DispenseInput = await req.json();
      // console.log("Received dispense input:", input);

      const {
        address: buyerAddress,
        dispenser,
        quantity: dispenserPaymentAmountSat,
        dryRun, // Extract dryRun parameter
        options: clientOptions,
      } = input;

      // For dryRun, return fee estimates without creating actual PSBT. This is a
      // PURE NUMERIC ESTIMATOR — buildServiceFeeOutputs() returns PSBT outputs
      // (the wrong shape here) and requires CP outputs + codecs, so the existing
      // numeric estimation is intentionally left untouched.
      if (dryRun === true) {
        // Dispense transactions are simple Bitcoin transfers - typically 1 input, 2 outputs
        const estimatedTxSize = 200; // bytes (typical for dispense transaction)
        const feeRate = clientOptions.satsPerVB || 1;
        const estMinerFee = Math.ceil(estimatedTxSize * feeRate);
        const serviceFee = 1000; // Service fee in sats
        const totalCost = dispenserPaymentAmountSat + estMinerFee + serviceFee;

        return ApiResponseUtil.success({
          est_miner_fee: estMinerFee,
          total_dust_value: 0, // No dust for simple Bitcoin transfers
          total_cost: totalCost,
          est_tx_size: estimatedTxSize,
          service_fee: serviceFee,
          dispenser_payment: dispenserPaymentAmountSat,
          feeDetails: {
            total: estMinerFee,
            effectiveFeeRate: feeRate,
            estimatedSize: estimatedTxSize,
          },
          is_estimate: true,
          estimation_method: "dryRun_calculation",
        }, { forceNoCache: true });
      }

      let normalizedFees;
      try {
        const feeArgsInput: { satsPerKB?: number; satsPerVB?: number } = {};
        if (clientOptions.fee_per_kb !== undefined) {
          feeArgsInput.satsPerKB = clientOptions.fee_per_kb;
        }
        if (clientOptions.satsPerVB !== undefined) {
          feeArgsInput.satsPerVB = clientOptions.satsPerVB;
        }

        // normalizeFeeRate itself throws if neither is provided, which is good.
        // We just need to ensure the object passed is clean for exactOptionalPropertyTypes.
        normalizedFees = normalizeFeeRate(feeArgsInput);

        if (!normalizedFees || normalizedFees.normalizedSatsPerVB <= 0) {
          return ApiResponseUtil.badRequest(
            "Invalid fee rate calculated (must result in > 0 sats/vB).",
          );
        }
      } catch (error) {
        return ApiResponseUtil.badRequest(
          error instanceof Error
            ? error.message
            : "Invalid fee rate arguments provided.",
        );
      }

      // Prepare options for CounterpartyApiManager.createDispense
      // Only include options relevant to CounterpartyApiManager.createDispense and use correct param names
      const xcpDispenseCallOpts = {
        // Spread known & safe options from clientOptions if needed by CounterpartyApiManager.createDispense
        allow_unconfirmed_inputs: clientOptions.allow_unconfirmed_inputs ??
          true,
        validate: clientOptions.validate ?? true,
        verbose: clientOptions.verbose ?? true,
        sat_per_vbyte: normalizedFees.normalizedSatsPerVB,
        return_psbt: false, // We need raw tx hex
        // `regular_dust_size` is deprecated and removed.
        // Add other specific options CounterpartyApiManager.createDispense might expect from clientOptions if any.
      };

      try {
        // Call CounterpartyApiManager.createDispense
        const xcpResponse = await CounterpartyApiManager.createDispense(
          buyerAddress, // Source for XCP (often buyer if they pay fees)
          dispenser, // Dispenser ID
          dispenserPaymentAmountSat, // BTC quantity buyer pays TO dispenser
          xcpDispenseCallOpts,
        );

        if (!xcpResponse || xcpResponse.error) {
          console.error(
            "[Dispense Route] Error from CounterpartyApiManager or no response.",
            xcpResponse?.error,
          );
          return ApiResponseUtil.badRequest(
            xcpResponse?.error || "XCP service error during dispense creation.",
            { service: "XCP", dispenser, quantity: dispenserPaymentAmountSat },
          );
        }

        await logger.info("api", {
          message: "XCP Dispense raw response (for logger)",
          data: xcpResponse.result,
        });

        const counterpartyTxHex = xcpResponse.result?.tx_hex ||
          xcpResponse.result?.rawtransaction;

        if (!counterpartyTxHex) {
          console.error(
            "[Dispense Route] counterpartyTxHex is missing from XCP response.",
          );
          return ApiResponseUtil.badRequest(
            "Counterparty did not return raw transaction hex for dispense.",
            { result: xcpResponse.result },
          );
        }

        // Dynamic import of bitcoinjs-lib to exclude from build-time static
        // analysis (same approach as trx/stampattach.ts).
        const {
          address: bjsAddress,
          networks,
          Psbt,
          Transaction,
        } = await import("bitcoinjs-lib");
        const network = networks.bitcoin;

        const cpTx = Transaction.fromHex(counterpartyTxHex);

        const psbt = new Psbt({ network });

        // Counterparty selected & funded the input(s). Use ALL of them, in order,
        // so vin[0] stays the input the CP payload is ARC4-keyed against (#1137).
        const { builtInputs, inputsToSign, totalInputValue } =
          await buildCpPsbtInputsFromRawTx(
            commonUtxoService,
            cpTx.ins,
            buyerAddress,
            [Transaction.SIGHASH_ALL],
          );
        const sumOfUserInputs = totalInputValue;
        for (const { inputData } of builtInputs) {
          psbt.addInput(inputData as any);
        }

        // Trust Counterparty's composed dispense outputs verbatim. CP's dispense
        // rawtx (return_psbt:false) already contains the complete output set:
        //   [0] dispenser-payment (to the dispenser destination)
        //   [1] OP_RETURN (Counterparty dispense data)
        //   [2] change back to the buyer (sourceAddress)
        // CP has already deducted its network fee. We only optionally splice an
        // operator service fee out of CP's change via the shared helper, which
        // locates the change output by matching `buyerAddress` — so the
        // dispenser-payment output (a different address) is preserved untouched.
        // The prior BitcoinTransactionBuilder.buildPsbtFromUserFundedRawHex path
        // discarded CP's outputs, synthesized the dispenser payment, and
        // re-derived a miner fee + change (the #959 double-count class).
        const cpOutputs = cpTx.outs.map((output) => ({
          script: new Uint8Array(output.script),
          value: BigInt(output.value),
        }));

        // Service-fee precedence for dispense is ENV-ONLY (the route has no
        // body/options service-fee override today — preserve that behavior).
        const { serviceFeeSats, serviceFeeAddress } = getServiceFeeConfig();

        const {
          outputs: finalOutputs,
          cpNetworkFee,
          serviceFeeAdded,
          totalFee,
        } = buildServiceFeeOutputs({
          cpOutputs,
          sumOfUserInputs,
          sourceAddress: buyerAddress,
          serviceFeeSats,
          serviceFeeAddress: serviceFeeAddress || undefined,
          dustSize: BigInt(TX_CONSTANTS.DUST_SIZE),
          decodeAddress: (script) => {
            try {
              return bjsAddress.fromOutputScript(Buffer.from(script), network);
            } catch {
              return undefined;
            }
          },
          encodeAddress: (addr) =>
            new Uint8Array(bjsAddress.toOutputScript(addr, network)),
        });

        for (const out of finalOutputs) {
          psbt.addOutput({ script: Buffer.from(out.script), value: out.value });
        }

        // The buyer's change is the (possibly fee-reduced) CP change output that
        // still pays back to the buyer address; 0 if it was dropped as dust.
        let finalBuyerChange = 0n;
        for (let i = finalOutputs.length - 1; i >= 0; i--) {
          let decoded: string | undefined;
          try {
            decoded = bjsAddress.fromOutputScript(
              Buffer.from(finalOutputs[i].script),
              network,
            );
          } catch {
            decoded = undefined;
          }
          if (decoded === buyerAddress) {
            finalBuyerChange = finalOutputs[i].value;
            break;
          }
        }

        logger.info("api", {
          message: "Assembled dispense outputs (trust-CP + service fee)",
          cpNetworkFee: cpNetworkFee.toString(),
          serviceFeeAdded: serviceFeeAdded.toString(),
          totalFee: totalFee.toString(),
          outputCount: finalOutputs.length,
        });

        // Return unsigned PSBT for the wallet to sign (do NOT finalize).
        return ApiResponseUtil.success({
          psbt: psbt.toHex(),
          inputsToSign,
          estimatedFee: Number(totalFee),
          estimatedVsize: cpTx.virtualSize(),
          finalBuyerChange: Number(finalBuyerChange),
        }, { forceNoCache: true });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error
          ? error.message
          : "Unknown error during XCP/PSBT processing";
        logger.error("api", {
          message: "Error in dispense XCP/PSBT stage",
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        });
        return ApiResponseUtil.badRequest(errorMessage, {
          service: "XCP_PSBT_BUILDING",
          details: error instanceof Error ? error.stack : undefined,
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Invalid request format or unexpected error";
      return ApiResponseUtil.badRequest(errorMessage, {
        error: error instanceof Error ? error.stack : "Unknown error info",
      });
    }
  },
};
