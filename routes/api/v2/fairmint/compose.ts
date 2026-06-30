import { TX_CONSTANTS } from "$constants";
import { Handlers } from "$fresh/server.ts";
import { ResponseUtil } from "$lib/utils/api/responses/responseUtil.ts";
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

export const handler: Handlers = {
  async POST(req) {
    const commonUtxoService = new CommonUTXOService();
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

      // `quantity` is required for PAID fairminters but must be OMITTED for free
      // ones (CP rejects it with "quantity is not allowed for free fairminters").
      // It is validated conditionally below, after we know the fairminter's price.
      if (!address || !asset) {
        return ResponseUtil.badRequest(
          "Missing required fields: address, asset",
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

        // Free fairminters reject `quantity`; paid ones require it. Decide based
        // on the fairminter's price.
        const fairminter = await CounterpartyApiManager.getAssetFairminter(
          asset,
        );
        const isFreeFairminter = fairminter !== null && fairminter.price === 0;
        if (
          !isFreeFairminter &&
          (quantity === undefined || quantity === null || quantity === "")
        ) {
          return ResponseUtil.badRequest(
            "quantity is required for paid fairminters",
          );
        }
        const effectiveQuantity = isFreeFairminter
          ? undefined
          : Number(quantity);

        // Get raw hex from Counterparty (return_psbt:false) so we can reconstruct
        // the PSBT ourselves and trust CP's composed outputs verbatim.
        const response = await CounterpartyApiManager.composeFairmint(
          address,
          asset,
          effectiveQuantity,
          {
            ...xcpApiOptions,
            return_psbt: false, // Get raw hex, not PSBT
            verbose: true, // Get detailed response
            fee_per_kb: normalizedFees.normalizedSatsPerKB, // XCP API needs fee_per_kb
          },
        );

        if (!response?.result?.rawtransaction) {
          if (response?.error) {
            return ResponseUtil.badRequest(response.error);
          }
          throw new Error(
            "Failed to compose fairmint transaction - no raw transaction returned.",
          );
        }

        // Service-fee precedence (mirror trx/stampattach.ts):
        //   1. request body field  (body.service_fee)
        //   2. env default         (MINTING_SERVICE_FEE_FIXED_SATS via getServiceFeeConfig)
        // Fairmint has no separate `options` layer, so body overrides env directly.
        const { serviceFeeSats: envFeeSats, serviceFeeAddress: envFeeAddress } =
          getServiceFeeConfig();
        const serviceFeeInput = service_fee !== undefined
          ? service_fee
          : Number(envFeeSats);
        const serviceFeeAddrInput = service_fee_address !== undefined
          ? service_fee_address
          : envFeeAddress;

        // For dryRun, return fee estimates without generating actual PSBT. The
        // dryRun path is a PURE NUMERIC ESTIMATOR — buildServiceFeeOutputs()
        // returns PSBT outputs (the wrong shape here) and requires CP outputs +
        // codecs, so we keep the existing numeric estimation untouched.
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

        // Dynamic import of bitcoinjs-lib to exclude from build-time static
        // analysis (same approach as trx/stampattach.ts).
        const {
          address: bjsAddress,
          networks,
          Psbt,
          Transaction,
        } = await import("bitcoinjs-lib");
        const network = networks.bitcoin;

        const rawCpTxHex = response.result.rawtransaction;
        const cpTx = Transaction.fromHex(rawCpTxHex);

        const psbt = new Psbt({ network });

        // Counterparty chose the input(s) — use ALL of them, in order, so vin[0]
        // stays the input the CP payload is ARC4-keyed against (#1137). Sum the
        // user inputs for fee accounting.
        const { builtInputs, inputsToSign, totalInputValue } =
          await buildCpPsbtInputsFromRawTx(
            commonUtxoService,
            cpTx.ins,
            address,
            [Transaction.SIGHASH_ALL],
          );
        const sumOfUserInputs = totalInputValue;
        for (const { inputData } of builtInputs) {
          psbt.addInput(inputData as any);
        }

        // Trust Counterparty's composed outputs verbatim: CP has already deducted
        // its network fee and computed the change back to the source. We only
        // optionally splice an operator service fee out of CP's change via the
        // shared helper. The prior GeneralBitcoinTransactionBuilder path added the
        // service fee as an extra output AND re-derived its own miner fee + change,
        // double-counting the fee (the same #959 class the helper eliminates).
        const cpOutputs = cpTx.outs.map((output) => ({
          script: new Uint8Array(output.script),
          value: BigInt(output.value),
        }));

        const {
          outputs: finalOutputs,
          cpNetworkFee,
          serviceFeeAdded,
          totalFee,
        } = buildServiceFeeOutputs({
          cpOutputs,
          sumOfUserInputs,
          sourceAddress: address,
          serviceFeeSats: BigInt(serviceFeeInput > 0 ? serviceFeeInput : 0),
          serviceFeeAddress: serviceFeeAddrInput,
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

        const totalOutputValue = finalOutputs.reduce(
          (sum, o) => sum + o.value,
          0n,
        );

        // The user's change is the (possibly fee-reduced) CP change output that
        // still pays back to the source address; 0 if it was dropped as dust.
        let finalUserChange = 0n;
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
          if (decoded === address) {
            finalUserChange = finalOutputs[i].value;
            break;
          }
        }

        logger.info("api", {
          message: "Assembled fairmint outputs (trust-CP + service fee)",
          cpNetworkFee: cpNetworkFee.toString(),
          serviceFeeAdded: serviceFeeAdded.toString(),
          totalFee: totalFee.toString(),
          outputCount: finalOutputs.length,
        });

        // Return unsigned PSBT for the wallet to sign (do NOT finalize). Preserve
        // the response shape the previous builder path produced.
        const processedPSBT = {
          psbtHex: psbt.toHex(),
          inputsToSign,
          estimatedFee: Number(totalFee),
          estimatedVsize: cpTx.virtualSize(),
          totalInputValue: sumOfUserInputs,
          totalOutputValue,
          finalUserChange,
        };

        return ResponseUtil.success(processedPSBT, { forceNoCache: true });
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes("Insufficient BTC") ||
            error.message.toLowerCase().includes("insufficient funds"))
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
