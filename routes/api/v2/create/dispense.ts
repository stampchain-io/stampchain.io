// routes/api/v2/dispense.ts
import { Handlers } from "$fresh/server.ts";
// FeeDetails import removed - not used in this file
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { logger } from "$lib/utils/logger.ts";
import { serverConfig } from "$server/config/config.ts";
import {
  CounterpartyApiManager,
  normalizeFeeRate,
} from "$server/services/counterpartyApiService.ts";
import { BitcoinTransactionBuilder } from "$server/services/transaction/bitcoinTransactionBuilder.ts";

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

      // For dryRun, return fee estimates without creating actual PSBT
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
        console.log(
          "[Dispense Route] Response from CounterpartyApiManager:",
          JSON.stringify(xcpResponse, null, 2),
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
        const dispenserActualPayToAddress = xcpResponse.result?.params
          ?.destination;
        const dispenserPaymentAmount = xcpResponse.result?.params?.quantity; // BTC quantity for dispenser

        // DETAILED LOGGING OF THE COUNTERPARTY TX HEX
        console.log("[Dispense Route] FULL counterpartyTxHex received:");
        console.log(counterpartyTxHex);
        // END DETAILED LOGGING

        console.log(
          `[Dispense Route] Extracted counterpartyTxHex (first 60): ${
            counterpartyTxHex?.substring(0, 60)
          }...`,
        );
        console.log(
          `[Dispense Route] Extracted dispenserActualPayToAddress: ${dispenserActualPayToAddress}`,
        );

        if (!counterpartyTxHex) {
          console.error(
            "[Dispense Route] counterpartyTxHex is missing from XCP response.",
          );
          return ApiResponseUtil.badRequest(
            "Counterparty did not return raw transaction hex for dispense.",
            { result: xcpResponse.result },
          );
        }
        if (!dispenserActualPayToAddress) {
          console.error(
            "[Dispense Route] dispenserActualPayToAddress is missing from XCP response params.",
          );
          return ApiResponseUtil.badRequest(
            "Counterparty response missing dispenser destination address for payment.",
            { result: xcpResponse.result },
          );
        }
        if (dispenserPaymentAmount === undefined) {
          console.error(
            "[Dispense Route] dispenserPaymentAmount is missing from XCP response params.",
          );
          return ApiResponseUtil.badRequest(
            "Counterparty response missing dispenser payment amount.",
            { result: xcpResponse.result },
          );
        }

        const serviceFeeSats = parseInt(
          serverConfig.MINTING_SERVICE_FEE_FIXED_SATS,
          10,
        );
        const serviceFeeAddress = serverConfig.MINTING_SERVICE_FEE_ADDRESS;

        const psbtOptions: {
          dispenserDestinationAddress: string;
          dispenserPaymentAmount: number;
          serviceFeeDetails?: { fee: number; address: string };
        } = {
          dispenserDestinationAddress: dispenserActualPayToAddress,
          dispenserPaymentAmount: Number(dispenserPaymentAmount),
        };

        if (serviceFeeSats > 0 && serviceFeeAddress) {
          psbtOptions.serviceFeeDetails = {
            fee: serviceFeeSats,
            address: serviceFeeAddress,
          };
        }

        console.log(
          "[Dispense Route] About to call BitcoinTransactionBuilder.buildPsbtFromUserFundedRawHex",
        );
        const builtPsbtData = await BitcoinTransactionBuilder
          .buildPsbtFromUserFundedRawHex(
            counterpartyTxHex,
            buyerAddress, // This is the userAddress
            normalizedFees.normalizedSatsPerVB,
            psbtOptions,
          );
        console.log(
          "[Dispense Route] Result from BitcoinTransactionBuilder.buildPsbtFromUserFundedRawHex:",
          JSON.stringify(builtPsbtData, null, 2),
        );

        return ApiResponseUtil.success({
          psbt: builtPsbtData.psbtHex,
          inputsToSign: builtPsbtData.inputsToSign,
          estimatedFee: builtPsbtData.estimatedFee,
          estimatedVsize: builtPsbtData.estimatedVsize,
          finalBuyerChange: builtPsbtData.finalBuyerChange,
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
