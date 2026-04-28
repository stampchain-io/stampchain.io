import { Handlers } from "$fresh/server.ts";
import type { AddressHandlerContext } from "$types/base.d.ts";
import { Src101Controller } from "$server/controller/src101Controller.ts";
import { ResponseUtil } from "$lib/utils/api/responses/responseUtil.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

export const handler: Handlers<AddressHandlerContext> = {
  async GET(_req, ctx) {
    const { deploy_hash } = ctx.params;

    // Validate deploy_hash parameter
    if (!deploy_hash || typeof deploy_hash !== "string") {
      return ResponseUtil.badRequest("Deploy hash is required");
    }

    // Basic validation for deploy hash format (should be alphanumeric)
    if (!/^[a-fA-F0-9]+$/.test(deploy_hash) || deploy_hash.length < 8) {
      return ResponseUtil.badRequest(
        `Invalid deploy hash format: ${deploy_hash}. Must be a valid hexadecimal hash.`,
      );
    }

    try {
      const result = await Src101Controller.handleSrc101DeployDetailsRequest(
        deploy_hash,
      );

      if (!result || Object.keys(result).length === 0) {
        console.log("Empty result received:", result);
        return ResponseUtil.notFound("No data found");
      }

      return ResponseUtil.success(result, {
        routeType: RouteType.BLOCKCHAIN_DATA,
      });
    } catch (error) {
      console.error(
        "Error in [deploy_hash]/address/[address_btc] handler:",
        error,
      );
      return ResponseUtil.internalError(
        error,
        "Error processing src101 deploy details request",
      );
    }
  },
};
