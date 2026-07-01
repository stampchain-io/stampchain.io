import { TX_CONSTANTS } from "$constants";
import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { buildCpPsbtInputsFromRawTx } from "$lib/utils/bitcoin/psbt/cpRawTxInputs.ts";
import { buildServiceFeeOutputs } from "$lib/utils/bitcoin/psbt/serviceFeeOutputs.ts";
import { getServiceFeeConfig } from "$server/config/config.ts";
import type { ComposeDetachOptions } from "$server/services/counterparty/xcpManagerDI.ts";
import {
  CounterpartyApiManager,
  normalizeFeeRate,
} from "$server/services/counterpartyApiService.ts";
import { CommonUTXOService } from "$server/services/utxo/commonUtxoService.ts";
import { Buffer } from "node:buffer";

export const handler: Handlers = {
  async POST(req) {
    const commonUtxoService = new CommonUTXOService();
    try {
      // Dynamic import of bitcoinjs-lib to exclude from build-time static
      // analysis (same approach as stampattach.ts).
      const {
        address: bjsAddress,
        networks,
        Psbt,
        Transaction,
      } = await import("bitcoinjs-lib");
      const network = networks.bitcoin;

      const body = await req.json();
      const { utxo, destination, options = {} } = body;

      // Validate required parameters
      if (!utxo) {
        return ApiResponseUtil.badRequest("Missing required parameter: utxo");
      }

      // Parse UTXO format
      const [txid, voutStr] = utxo.split(":");
      const vout = parseInt(voutStr, 10);

      if (!txid || isNaN(vout)) {
        return ApiResponseUtil.badRequest(
          "Invalid UTXO format. Expected format: 'txid:vout'",
        );
      }

      // Normalize fees
      let normalizedFees;
      try {
        normalizedFees = normalizeFeeRate({
          ...(options.fee_per_kb && { satsPerKB: options.fee_per_kb }),
          ...(options.satsPerVB && { satsPerVB: options.satsPerVB }),
        });
      } catch (error) {
        return ApiResponseUtil.badRequest(
          error instanceof Error ? error.message : "Invalid fee rate",
        );
      }

      try {
        // Prepare XCP API options
        const xcpApiOptions = { ...options };
        delete xcpApiOptions.satsPerVB; // Not for XCP API
        delete xcpApiOptions.service_fee; // Not for XCP API
        delete xcpApiOptions.service_fee_address; // Not for XCP API

        // Get the raw composed transaction from Counterparty (not a PSBT): CP
        // selects the input(s) from the supplied utxo and computes its own
        // network fee + change back to the source.
        const response = await CounterpartyApiManager.composeDetach(
          utxo,
          destination || "",
          {
            ...xcpApiOptions,
            fee_per_kb: normalizedFees.normalizedSatsPerKB,
            return_psbt: false, // Get raw hex, not PSBT
            verbose: true, // Get detailed response
          } as ComposeDetachOptions,
        );

        // Check for raw transaction (not a PSBT)
        if (!response?.result?.rawtransaction) {
          if (response?.error) {
            // Check for specific error messages and return appropriate status codes
            const errorMessage = response.error.toLowerCase();
            if (
              errorMessage.includes("no assets to detach") ||
              errorMessage.includes("no assets found") ||
              errorMessage.includes("assets not found")
            ) {
              return ApiResponseUtil.badRequest("No assets to detach");
            }
            if (
              errorMessage.includes("insufficient") &&
              (errorMessage.includes("btc") || errorMessage.includes("funds"))
            ) {
              return ApiResponseUtil.badRequest("Insufficient funds");
            }
            return ApiResponseUtil.badRequest(response.error);
          }
          throw new Error(
            "Failed to compose detach transaction - no raw transaction returned.",
          );
        }

        // Source/change address for the detach. Counterparty sends change back
        // to the owner of the spent UTXO; the existing route uses `destination`
        // for this (resolving the actual UTXO-owner address is out of scope —
        // preserved behavior, including the original TODO below).
        const sourceAddress = destination || "";
        if (!sourceAddress) {
          // TODO(@stampchain): We need a reliable way to get the source address
          // of the UTXO if destination is not provided for change. This is a
          // critical point for detach if change needs to go back to the
          // original owner.
        }

        // Parse Counterparty's composed raw transaction.
        const cpTx = Transaction.fromHex(response.result.rawtransaction);

        // Reconstruct PSBT inputs from ALL of CP's inputs, in order, so vin[0]
        // stays the input the CP payload is ARC4-keyed against (#1137). Detach
        // has no user-supplied inputs_set — CP chose the input(s).
        const { builtInputs, inputsToSign, totalInputValue } =
          await buildCpPsbtInputsFromRawTx(
            commonUtxoService,
            cpTx.ins,
            sourceAddress,
            [Transaction.SIGHASH_ALL],
          );
        const sumOfUserInputs = totalInputValue;

        const psbt = new Psbt({ network });
        for (const { inputData } of builtInputs) {
          psbt.addInput(inputData as any);
        }

        // Trust Counterparty's composed outputs verbatim: CP has already
        // deducted its network fee and computed the change. We add them as-is
        // and only optionally splice an operator service fee out of CP's change
        // via the shared helper. The prior code re-derived its own network fee
        // and added a second change output, double-counting the fee (a constant
        // ~279-sat deficit on every wallet, #959).
        const cpOutputs = cpTx.outs.map((output) => ({
          script: new Uint8Array(output.script),
          value: BigInt(output.value),
        }));

        // Service-fee precedence (see getServiceFeeConfig() in
        // server/config/config.ts and the matching block in stampattach.ts):
        //   1. request body field  (body.service_fee)
        //   2. options field       (options.service_fee)
        //   3. env default         (MINTING_SERVICE_FEE_FIXED_SATS / _ADDRESS,
        //                           via getServiceFeeConfig)
        const { serviceFeeSats: envFeeSats, serviceFeeAddress: envFeeAddress } =
          getServiceFeeConfig();
        const feeService = body.service_fee ?? options?.service_fee ??
          Number(envFeeSats);
        const feeServiceAddress = body.service_fee_address ??
          options?.service_fee_address ??
          envFeeAddress;

        const { outputs: finalOutputs, totalFee } = buildServiceFeeOutputs({
          cpOutputs,
          sumOfUserInputs,
          sourceAddress,
          serviceFeeSats: BigInt(feeService > 0 ? feeService : 0),
          serviceFeeAddress: feeServiceAddress,
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

        // Return the unsigned PSBT for the wallet to sign (do NOT finalize).
        return ApiResponseUtil.success({
          psbtHex: psbt.toHex(),
          inputsToSign,
          estimatedFee: Number(totalFee),
          estimatedVsize: cpTx.virtualSize(),
        }, { forceNoCache: true });
      } catch (error) {
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          // Handle specific error cases with appropriate messages
          if (
            errorMessage.includes("insufficient btc") ||
            errorMessage.includes("insufficient funds")
          ) {
            return ApiResponseUtil.badRequest("Insufficient funds");
          }
          if (errorMessage.includes("no assets")) {
            return ApiResponseUtil.badRequest("No assets to detach");
          }
          // For other known errors, return as bad request
          if (
            errorMessage.includes("invalid") ||
            errorMessage.includes("not found")
          ) {
            return ApiResponseUtil.badRequest(error.message);
          }
        }
        throw error;
      }
    } catch (error) {
      console.error("Error composing detach transaction:", error);
      // Don't expose internal errors, return generic message
      return ApiResponseUtil.internalError(
        error,
        "Failed to process stamp detach request",
      );
    }
  },
};
