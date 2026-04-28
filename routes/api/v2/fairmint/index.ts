import { Handlers } from "$fresh/server.ts";
import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import { ResponseUtil } from "$lib/utils/api/responses/responseUtil.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

export const handler: Handlers = {
  async GET(_req, _ctx) {
    try {
      const fairminters = await CounterpartyApiManager.getFairminters();
      return ResponseUtil.success(fairminters, {
        routeType: RouteType.BLOCKCHAIN_DATA,
      });
    } catch (error) {
      console.error("Error fetching fairminters:", error);
      return ResponseUtil.internalError(error, "Failed to fetch fairminters");
    }
  },
};
