import { Handlers } from "$fresh/server.ts";
import { logger } from "$lib/utils/logger.ts";
import { ResponseUtil } from "$lib/utils/api/responses/responseUtil.ts";
import { BitcoinUtxoManager } from "$server/services/transaction/bitcoinUtxoManager.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

interface UTXOWithAncestors {
  ancestorCount?: number;
  ancestorFees?: number;
  ancestorSize?: number;
}

interface AncestorData {
  fees: number;
  vsize: number;
  weight: number;
}

export const handler: Handlers = {
  async GET(_req, ctx) {
    const { address } = ctx.params;

    try {
      logger.info("utxo-ancestors", {
        message: `Getting UTXO ancestors for address: ${address}`,
      });

      // Get UTXOs with ancestor information
      const utxoService = new BitcoinUtxoManager();
      const utxos = await utxoService.getAddressUTXOs(address, {
        includeAncestors: true,
        filterStampUTXOs: true,
      });

      // Extract ancestor information from UTXOs
      const ancestors: AncestorData[] = (utxos as UTXOWithAncestors[])
        .filter((utxo) => utxo.ancestorCount && utxo.ancestorCount > 0)
        .map((utxo) => ({
          fees: utxo.ancestorFees || 0,
          vsize: utxo.ancestorSize || 0,
          weight: (utxo.ancestorSize || 0) * 4,
        }));

      logger.debug("stamps", {
        message: "UTXO ancestors fetched",
        address,
        ancestorCount: ancestors.length,
      });

      return ResponseUtil.success({ ancestors }, {
        routeType: RouteType.DYNAMIC,
      });
    } catch (error) {
      logger.error("stamps", {
        message: "Error fetching UTXO ancestors",
        error: error instanceof Error ? error.message : String(error),
      });
      return ResponseUtil.internalError(error);
    }
  },
};
