import { Handlers } from "$fresh/server.ts";
import type { AddressHandlerContext } from "$types/base.d.ts";

import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { getPaginationParams } from "$lib/utils/data/pagination/paginationUtils.ts";
import { StampController } from "$server/controller/stampController.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";
import {
  DEFAULT_PAGINATION,
  validateRequiredParams,
} from "$server/services/validation/routeValidationService.ts";

/**
 * GET /api/v2/stamps/dispensers/[address]
 *
 * All Counterparty dispensers opened by a wallet address, each enriched with
 * its stamp metadata. Wraps StampController.getDispensersWithStampsByAddress
 * (already backing the SSR wallet/dashboard pages), exposing it as a public
 * JSON API (GitHub #215). The same data path also feeds the #675 dispenser
 * stats. Read-only; sources live from the Counterparty node endpoint
 * /addresses/{address}/dispensers.
 *
 * Query params: page, limit (standard pagination); optional status
 * ("open" | "closed", omit for all) and sort (passed through to Counterparty).
 */
export const handler: Handlers<AddressHandlerContext> = {
  async GET(req: Request, ctx) {
    try {
      const { address } = ctx.params;

      const paramsValidation = validateRequiredParams({ address });
      if (!paramsValidation.isValid) {
        return paramsValidation.error!;
      }

      const url = new URL(req.url);
      const pagination = getPaginationParams(url);
      if (pagination instanceof Response) {
        return pagination;
      }
      const { page, limit } = pagination;
      const resolvedPage = page || DEFAULT_PAGINATION.page;
      const resolvedLimit = limit || DEFAULT_PAGINATION.limit;

      // Only forward filters Counterparty understands; omit when not supplied.
      const options: { status?: string; sort?: string } = {};
      const status = url.searchParams.get("status");
      if (status) options.status = status;
      const sort = url.searchParams.get("sort");
      if (sort) options.sort = sort;

      const { dispensers, total } = await StampController
        .getDispensersWithStampsByAddress(
          address,
          resolvedPage,
          resolvedLimit,
          options,
        );

      return ApiResponseUtil.success(
        {
          data: dispensers,
          page: resolvedPage,
          limit: resolvedLimit,
          total,
          totalPages: Math.ceil(total / resolvedLimit),
        },
        { routeType: RouteType.STAMP_DISPENSER },
      );
    } catch (error) {
      console.error("[AddressDispensers] Error:", error);
      return ApiResponseUtil.internalError(
        error,
        "Failed to fetch dispensers for address",
      );
    }
  },
};
