import { Handlers } from "$fresh/server.ts";
import { Src101Controller } from "$server/controller/src101Controller.ts";
import { ResponseUtil } from "$lib/utils/api/responses/responseUtil.ts";
import { getPaginationParams } from "$lib/utils/data/pagination/paginationUtils.ts";
import {
  checkEmptyResult,
  DEFAULT_PAGINATION,
  validateRequiredParams,
  validateSortParam,
} from "$server/services/validation/routeValidationService.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

export const handler: Handlers = {
  async GET(req, ctx) {
    try {
      const { deploy_hash, tokenid } = ctx.params;

      // Validate required parameters
      const paramsValidation = validateRequiredParams({ deploy_hash, tokenid });
      if (!paramsValidation.isValid) {
        return paramsValidation.error!;
      }

      // Validate deploy_hash format (should be alphanumeric hash)
      if (!/^[a-fA-F0-9]+$/.test(deploy_hash) || deploy_hash.length < 8) {
        return ResponseUtil.badRequest(
          `Invalid deploy hash format: ${deploy_hash}. Must be a valid hexadecimal hash.`,
        );
      }

      // Validate tokenid format (base64 encoded: alphanumeric + /+=)
      if (!/^[a-zA-Z0-9+/=-]+$/.test(tokenid)) {
        return ResponseUtil.badRequest(
          `Invalid token ID format: ${tokenid}. Must be valid base64.`,
        );
      }

      const url = new URL(req.url);
      const pagination = getPaginationParams(url);

      // Check if pagination validation failed
      if (pagination instanceof Response) {
        return pagination;
      }

      const { limit, page } = pagination;

      // Validate sort parameter
      const sortValidation = validateSortParam(url);
      if (!sortValidation.isValid) {
        return sortValidation.error!;
      }

      // Support optional expire filter: ?expire=0 (active only), ?expire=1 (expired only)
      // No expire param returns all records (needed for availability checks)
      const expireParam = url.searchParams.get("expire");
      const expire = expireParam !== null ? Number(expireParam) : undefined;

      const queryParams = {
        deploy_hash,
        tokenid,
        limit: limit || DEFAULT_PAGINATION.limit,
        page: page || DEFAULT_PAGINATION.page,
        ...(sortValidation.data && { sort: sortValidation.data }),
        ...(expire !== undefined && { expire }),
      };

      const result = await Src101Controller.handleSrc101OwnerRequest(
        queryParams,
      );

      // Check for empty result
      const emptyCheck = checkEmptyResult(result, "owner data");
      if (emptyCheck) {
        return emptyCheck;
      }

      return ResponseUtil.success(result, {
        routeType: RouteType.BLOCKCHAIN_DATA,
      });
    } catch (error) {
      console.error("Error in [deploy_hash]/[tokenid] handler:", error);
      return ResponseUtil.internalError(
        error,
        "Error processing src101 tokenid request",
      );
    }
  },
};
