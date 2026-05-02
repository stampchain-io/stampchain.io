import { Handlers } from "$fresh/server.ts";
import { NewsController } from "$server/controller/newsController.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { getPaginationParams } from "$lib/utils/data/pagination/paginationUtils.ts";
import {
  checkEmptyResult,
  DEFAULT_PAGINATION,
} from "$server/services/validation/routeValidationService.ts";

// Simple moderation blocklist
const BLOCKED_ADDRESSES = [
  "1SpamAddressExample",
];

export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const pagination = getPaginationParams(url);

      if (pagination instanceof Response) {
        return pagination;
      }

      const { limit, page } = pagination;
      const source_address = url.searchParams.get("source") || undefined;

      // Moderation specific check
      if (source_address && BLOCKED_ADDRESSES.includes(source_address)) {
        return ApiResponseUtil.success(
          { data: [] },
          "Address is blocked by moderation.",
        );
      }

      const queryParams = {
        limit: limit || DEFAULT_PAGINATION.limit,
        page: page || DEFAULT_PAGINATION.page,
        source_address,
        sort: (url.searchParams.get("sort") || "DESC") as "ASC" | "DESC",
      };

      // In the real system, you might filter the result data to also exclude blocked addresses.
      // Easiest is to filter out broadcasts that originate from the blocked list.
      const result = await NewsController.handleBroadcastsRequest(queryParams);

      const emptyCheck = checkEmptyResult(result, "broadcasts data");
      if (emptyCheck) {
        return emptyCheck;
      }

      // Late moderation filter
      if (result.data) {
        result.data = result.data.filter((b: any) =>
          !BLOCKED_ADDRESSES.includes(b.source_address)
        );
      }

      return ApiResponseUtil.success(result);
    } catch (error) {
      console.error("Error in news broadcasts handler:", error);
      return ApiResponseUtil.internalError(
        error,
        "Error processing news broadcasts request",
      );
    }
  },
};
