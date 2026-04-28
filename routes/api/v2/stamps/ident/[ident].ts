import type { SUBPROTOCOLS } from "$types/base.d.ts";
import type { IdentHandlerContext } from "$types/base.d.ts";
import type { PaginatedIdResponseBody } from "$types/api.d.ts";
// Unused imports removed: BlockHandlerContext, TickHandlerContext, PaginatedTickResponseBody, SRC20TrxRequestParams
import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { getPaginationParams } from "$lib/utils/data/pagination/paginationUtils.ts";
import { PROTOCOL_IDENTIFIERS } from "$lib/utils/data/protocols/protocol.ts";
import { StampController } from "$server/controller/stampController.ts";
import {
  checkEmptyResult,
  DEFAULT_PAGINATION,
  validateRequiredParams,
  validateSortParam,
} from "$server/services/validation/routeValidationService.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";
export const handler: Handlers<IdentHandlerContext> = {
  async GET(req, ctx) {
    const { ident } = ctx.params;

    // Validate required parameters
    const paramsValidation = validateRequiredParams({ ident });
    if (!paramsValidation.isValid) {
      return paramsValidation.error!;
    }

    // Validate protocol identifier
    if (!PROTOCOL_IDENTIFIERS.includes(ident.toUpperCase())) {
      return ApiResponseUtil.notFound(
        `Error: ident: ${ident} not found, use ${PROTOCOL_IDENTIFIERS}`,
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

    try {
      const result = await StampController.getStamps({
        page: page || DEFAULT_PAGINATION.page,
        limit: limit || DEFAULT_PAGINATION.limit,
        ...(sortValidation.data &&
          { sortBy: sortValidation.data as "ASC" | "DESC" }),
        type: "stamps",
        ident: [ident.toUpperCase() as SUBPROTOCOLS],
      });

      // Check for empty result
      const emptyCheck = checkEmptyResult(result, "stamp data");
      if (emptyCheck) {
        return emptyCheck;
      }

      const body: PaginatedIdResponseBody = {
        page: (result as any).page || DEFAULT_PAGINATION.page,
        limit: (result as any).page_size || DEFAULT_PAGINATION.limit,
        totalPages: (result as any).pages,
        last_block: result.last_block,
        ident: ident.toUpperCase() as SUBPROTOCOLS,
        data: (result as any).stamps,
      };

      return ApiResponseUtil.success(body, { routeType: RouteType.STAMP_LIST });
    } catch (error) {
      console.error(`Error in stamps/ident handler:`, error);
      return ApiResponseUtil.internalError(
        error,
        `Error: stamps with ident: ${ident} not found`,
      );
    }
  },
};
