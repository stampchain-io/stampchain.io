import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { SALE_SIGHASH } from "$lib/utils/bitcoin/psbt/tradeOffer.ts";
import { btcToSats } from "$lib/utils/fees.ts";
import { logger } from "$lib/utils/logger.ts";
import {
  createBitcoinTransactionBuilder,
} from "$server/services/transaction/index.ts";
import type { CreatePSBTInput, CreatePSBTResponse } from "$types/api.d.ts";
import { Psbt } from "bitcoinjs-lib";

function clientMessage(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  if (
    /does not belong|Invalid utxo|Invalid vout|Network mismatch|Sale price|legacy UTXO|not found/i
      .test(error.message)
  ) {
    return error.message;
  }
  return null;
}

export const handler: Handlers = {
  async POST(req: Request) {
    try {
      const rawBody = await req.text();
      const input: CreatePSBTInput = JSON.parse(rawBody);

      const { utxo, salePrice, sellerAddress } = input;

      if (!utxo || !salePrice || !sellerAddress) {
        return ApiResponseUtil.badRequest("Missing parameters");
      }

      try {
        btcToSats(salePrice);
      } catch (error) {
        return ApiResponseUtil.badRequest(
          error instanceof Error ? error.message : "Invalid salePrice value",
        );
      }

      const builder = createBitcoinTransactionBuilder();
      let owns = false;
      try {
        owns = await builder.validateUTXOOwnership(utxo, sellerAddress);
      } catch (error) {
        return ApiResponseUtil.badRequest(
          error instanceof Error
            ? error.message
            : "UTXO does not belong to the provided address",
        );
      }
      if (!owns) {
        return ApiResponseUtil.badRequest(
          "UTXO does not belong to the provided address",
        );
      }

      const psbtHex = await builder.createPSBT(utxo, salePrice, sellerAddress);
      const parsed = Psbt.fromHex(psbtHex);
      const salePriceSats = Number(parsed.txOutputs[1]?.value ?? 0);

      const response: CreatePSBTResponse = {
        psbt: psbtHex,
        fee: 0,
        inputCount: parsed.inputCount,
        outputCount: parsed.txOutputs.length,
        estimatedSize: Math.ceil(psbtHex.length / 2),
        inputsToSign: [{
          index: 1,
          address: sellerAddress,
          sighashTypes: [SALE_SIGHASH],
        }],
        salePriceSats,
      };

      return ApiResponseUtil.success(response, { forceNoCache: true });
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.error("api", {
          message: "Invalid JSON in create PSBT request",
          error: error.message,
        });
        return ApiResponseUtil.badRequest("Invalid JSON in request body");
      }
      const message = clientMessage(error);
      if (message) return ApiResponseUtil.badRequest(message);
      logger.error("api", {
        message: "Error creating PSBT",
        error: error instanceof Error ? error.message : String(error),
      });
      return ApiResponseUtil.internalError(error, "Failed to create PSBT");
    }
  },
};
