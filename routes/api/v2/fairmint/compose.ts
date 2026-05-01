import { Handlers } from "$fresh/server.ts";
import { ResponseUtil } from "$lib/utils/api/responses/responseUtil.ts";
import { serverConfig } from "$server/config/config.ts";
import { GeneralBitcoinTransactionBuilder } from "$server/services/transaction/generalBitcoinTransactionBuilder.ts";
import {
  CounterpartyApiManager,
  normalizeFeeRate,
} from "$server/services/counterpartyApiService.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const body = await req.json();

      const {
        address,
        asset,
        quantity,
        satsPerVB,
        satsPerKB,
        service_fee,
        service_fee_address,
        dryRun,
      } = body;

      if (!address || !asset || !quantity) {
        return ResponseUtil.badRequest(
          "Missing required fields: address, asset, quantity",
        );
      }

      // Normalize fees (same as before)
      const normalizedFees = normalizeFeeRate({
        ...(satsPerKB && { satsPerKB }),
        ...(satsPerVB && { satsPerVB }),
      });

      try {
        // Prepare XCP API options (same as before, but no PSBT-related options)
        const xcpApiOptions = { ...body };
        delete xcpApiOptions.address;
        delete xcpApiOptions.asset;
        delete xcpApiOptions.quantity;
        delete xcpApiOptions.satsPerVB; // Not for XCP API call
        delete xcpApiOptions.service_fee; // Not for XCP API call
        delete xcpApiOptions.service_fee_address; // Not for XCP API call

        // ✅ NEW CLEAN PATTERN: Get raw hex instead of PSBT
        const response = await CounterpartyApiManager.composeFairmint(
          address,
          asset,
          quantity,
          {
            ...xcpApiOptions,
            return_psbt: false, // ✅ CHANGED: Get raw hex, not PSBT
            verbose: true, // ✅ ADDED: Get detailed response
            fee_per_kb: normalizedFees.normalizedSatsPerKB, // XCP API needs fee_per_kb
          },
        );

        // ✅ NEW: Check for raw transaction instead of PSBT
        if (!response?.result?.rawtransaction) {
          if (response?.error) {
            return ResponseUtil.badRequest(response.error);
          }
          throw new Error(
            "Failed to compose fairmint transaction - no raw transaction returned.",
          );
        }

        // ✅ NEW: Use GeneralBitcoinTransactionBuilder instead of deprecated processCounterpartyPSBT
        const serviceFeeInput = service_fee !== undefined
          ? service_fee
          : parseInt(serverConfig.MINTING_SERVICE_FEE_FIXED_SATS, 10);
        const serviceFeeAddrInput = service_fee_address !== undefined
          ? service_fee_address
          : serverConfig.MINTING_SERVICE_FEE_ADDRESS;

        // For dryRun, return fee estimates without generating actual PSBT
        if (dryRun === true) {
          // Fairmint transactions are simpler - typically 1 input, 2 outputs (recipient + change)
          // Estimated transaction size: ~250 bytes for fairmint
          const estimatedTxSize = 250;
          const estMinerFee = Math.ceil(
            estimatedTxSize * normalizedFees.normalizedSatsPerVB,
          );
          const totalDustValue = 546; // Standard P2WPKH dust limit
          const totalCost = estMinerFee + totalDustValue +
            (serviceFeeInput || 0);

          return ResponseUtil.success({
            est_miner_fee: estMinerFee,
            total_dust_value: totalDustValue,
            total_cost: totalCost,
            est_tx_size: estimatedTxSize,
            service_fee: serviceFeeInput || 0,
            feeDetails: {
              total: estMinerFee,
              effectiveFeeRate: normalizedFees.normalizedSatsPerVB,
              estimatedSize: estimatedTxSize,
            },
            is_estimate: true,
            estimation_method: "dryRun_calculation",
          }, { forceNoCache: true });
        }

        const psbtResult = await GeneralBitcoinTransactionBuilder.generatePSBT(
          response.result.rawtransaction, // ✅ Use raw hex from Counterparty
          {
            address,
            satsPerVB: normalizedFees.normalizedSatsPerVB,
            serviceFee: serviceFeeInput > 0 ? serviceFeeInput : undefined,
            serviceFeeAddress: serviceFeeInput > 0
              ? serviceFeeAddrInput
              : undefined,
            operationType: "fairmint", // ✅ Specify operation type
            customOutputs: [], // ✅ No custom outputs needed for fairmint
          },
        );

        // ✅ NEW: Return the same format as the deprecated method
        const processedPSBT = {
          psbtHex: psbtResult.psbt.toHex(),
          inputsToSign: psbtResult.psbt.txInputs.map((_, index) => ({
            index,
            address: address,
            sighashTypes: [1], // SIGHASH_ALL
          })),
          estimatedFee: psbtResult.estMinerFee,
          estimatedVsize: psbtResult.estimatedTxSize,
          totalInputValue: BigInt(psbtResult.totalInputValue),
          totalOutputValue: BigInt(psbtResult.totalOutputValue),
          finalUserChange: BigInt(psbtResult.totalChangeOutput),
        };

        return ResponseUtil.success(processedPSBT, { forceNoCache: true });
      } catch (error) {
        if (
          error instanceof Error && error.message.includes("Insufficient BTC")
        ) {
          return ResponseUtil.badRequest(error.message);
        }
        throw error;
      }
    } catch (error) {
      console.error("Error composing fairmint transaction:", error);
      return ResponseUtil.internalError(
        error,
        "Failed to compose fairmint transaction",
      );
    }
  },
};
