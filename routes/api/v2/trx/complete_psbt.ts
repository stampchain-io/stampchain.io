import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { logger } from "$lib/utils/logger.ts";
import {
  BitcoinTransactionBuilder,
} from "$server/services/transaction/index.ts";

export const handler: Handlers = {
  async POST(req: Request) {
    try {
      const { sellerPsbtHex, buyerUtxo, buyerAddress, feeRate } = await req
        .json();

      if (
        !sellerPsbtHex || !buyerUtxo || !buyerAddress || feeRate === undefined
      ) {
        return ApiResponseUtil.badRequest("Missing parameters");
      }

      // Complete PSBT with specified fee rate

      const completedPsbtHex = await BitcoinTransactionBuilder
        .completePSBT(
          sellerPsbtHex,
          buyerUtxo,
          buyerAddress,
          feeRate,
        );

      return ApiResponseUtil.success({ completedPsbt: completedPsbtHex }, {
        forceNoCache: true,
      });
    } catch (error) {
      logger.error("api", {
        message: "Error completing PSBT",
        error: error instanceof Error ? error.message : String(error),
      });
      return ApiResponseUtil.internalError(error, "Failed to complete PSBT");
    }
  },
};
