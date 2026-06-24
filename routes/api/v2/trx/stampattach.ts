import { TX_CONSTANTS } from "$constants";
import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { logger } from "$lib/utils/logger.ts";
import {
  buildCpPsbtInput,
  buildCpPsbtInputsFromRawTx,
} from "$lib/utils/bitcoin/psbt/cpRawTxInputs.ts";
import { buildServiceFeeOutputs } from "$lib/utils/bitcoin/psbt/serviceFeeOutputs.ts";
import { serverConfig } from "$server/config/config.ts"; // Import serverConfig
import { StampController } from "$server/controller/stampController.ts";
import {
  ComposeAttachOptions,
  CounterpartyApiManager,
  normalizeFeeRate,
} from "$server/services/counterpartyApiService.ts";
import { CommonUTXOService } from "$server/services/utxo/commonUtxoService.ts";
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
        const built = await buildCpPsbtInput(commonUtxoService, {
          txid,
          vout,
          sequence,
        });
        sumOfUserInputs = built.value;
        psbt.addInput(built.inputData as any);
        inputsToSign.push({
          index: 0,
          address: address,
          sighashTypes: [Transaction.SIGHASH_ALL],
        });
      } else {
        // Counterparty chose the input(s) — use ALL of them, in order, so vin[0]
        // stays the input the CP payload is ARC4-keyed against (#1137). The prior
        // code processed only cpTx.ins[0] and dropped the rest, underfunding
        // attaches whenever CP funded the source from several UTXOs.
        const { builtInputs, inputsToSign: cpInputsToSign, totalInputValue } =
          await buildCpPsbtInputsFromRawTx(
            commonUtxoService,
            cpTx.ins,
            address,
            [Transaction.SIGHASH_ALL],
          );
        sumOfUserInputs = totalInputValue;
        for (const { inputData } of builtInputs) {
          psbt.addInput(inputData as any);
        }
        inputsToSign.push(...cpInputsToSign);
      }

      // Trust Counterparty's composed outputs: CP has already deducted its
      // network fee and computed the change back to the source. We add them
      // as-is (same approach as create/send, #1137) and only optionally splice
      // an operator service fee out of CP's change via the shared helper. The
      // prior code copied CP's change AND re-derived its own network fee + a
      // second change output, double-counting the fee (change = cpFee - ourFee
      // -> a constant ~279 sat deficit on every wallet, #959).
      const cpOutputs = cpTx.outs.map((output) => ({
        script: new Uint8Array(output.script),
        value: BigInt(output.value),
      }));

      const feeService = body.service_fee ?? options?.service_fee ??
        parseInt(serverConfig.MINTING_SERVICE_FEE_FIXED_SATS, 10);
      const feeServiceAddress = body.service_fee_address ??
        options?.service_fee_address ??
        serverConfig.MINTING_SERVICE_FEE_ADDRESS;

      const { outputs: finalOutputs, cpNetworkFee, serviceFeeAdded, totalFee } =
        buildServiceFeeOutputs({
          cpOutputs,
          sumOfUserInputs,
          sourceAddress: address,
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

      logger.info("api", {
        message: "Assembled stampattach outputs (trust-CP + service fee)",
        cpNetworkFee: cpNetworkFee.toString(),
        serviceFeeAdded: serviceFeeAdded.toString(),
        totalFee: totalFee.toString(),
        outputCount: finalOutputs.length,
      });

      // Return unsigned PSBT for the wallet to sign (do NOT finalize —
      // finalizeAllInputs() requires signatures which the wallet provides).
      const finalPsbtHex = psbt.toHex();
      return ApiResponseUtil.success({
        psbtHex: finalPsbtHex,
        inputsToSign,
        estimatedFee: Number(totalFee),
        estimatedVsize: cpTx.virtualSize(),
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
