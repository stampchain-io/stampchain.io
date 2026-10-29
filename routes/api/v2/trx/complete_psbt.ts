import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { readSellerOffer } from "$lib/utils/bitcoin/psbt/tradeOffer.ts";
import { logger } from "$lib/utils/logger.ts";
import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import {
  BitcoinTransactionBuilder,
} from "$server/services/transaction/index.ts";

function clientMessage(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  if (
    /Seller|Buyer|Insufficient|sighash|signed|dust|placeholder|legacy|Invalid|standard address|Sale PSBT/i
      .test(error.message)
  ) {
    return error.message;
  }
  return null;
}

export const handler: Handlers = {
  async POST(req: Request) {
    try {
      const body = await req.json();
      const {
        sellerPsbtHex,
        buyerUtxo,
        buyerAddress,
        feeRate,
        expectedCpid,
        expectedQuantity,
      } = body;

      if (
        !sellerPsbtHex || !buyerUtxo || !buyerAddress || feeRate === undefined
      ) {
        return ApiResponseUtil.badRequest("Missing parameters");
      }
      if (!Number.isFinite(Number(feeRate)) || Number(feeRate) <= 0) {
        return ApiResponseUtil.badRequest("Fee rate must be a positive number");
      }

      const offer = readSellerOffer(sellerPsbtHex);

      const attached = await CounterpartyApiManager.getUtxoBalances(
        offer.assetUtxo,
      );
      if (attached.length === 0) {
        return ApiResponseUtil.badRequest(
          "No Counterparty asset is attached to the seller UTXO",
        );
      }
      if (expectedCpid) {
        const wanted = String(expectedCpid).toUpperCase();
        const match = attached.find((asset) =>
          asset.cpid.toUpperCase() === wanted &&
          (expectedQuantity === undefined ||
            asset.quantity >= Number(expectedQuantity))
        );
        if (!match) {
          return ApiResponseUtil.badRequest(
            `Seller UTXO does not hold ${wanted}`,
          );
        }
      }

      const funding = await CounterpartyApiManager.getUtxoBalances(buyerUtxo);
      if (funding.length > 0) {
        return ApiResponseUtil.badRequest(
          "Funding UTXO holds an attached asset. Choose a spendable UTXO.",
        );
      }

      const completed = await BitcoinTransactionBuilder.completePSBT(
        sellerPsbtHex,
        buyerUtxo,
        buyerAddress,
        Number(feeRate),
      );

      return ApiResponseUtil.success({
        ...completed,
        preview: {
          ...completed.preview,
          assets: attached.map((asset) => ({
            cpid: asset.cpid,
            quantity: asset.quantity,
          })),
        },
      }, { forceNoCache: true });
    } catch (error) {
      const message = clientMessage(error);
      if (message) {
        logger.warn("api", {
          message: "Rejected complete PSBT",
          error: message,
        });
        return ApiResponseUtil.badRequest(message);
      }
      logger.error("api", {
        message: "Error completing PSBT",
        error: error instanceof Error ? error.message : String(error),
      });
      return ApiResponseUtil.internalError(error, "Failed to complete PSBT");
    }
  },
};
