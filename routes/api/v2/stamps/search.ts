import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import {
  classifySearchInput,
} from "$lib/utils/data/search/searchInputClassifier.ts";
import { StampService } from "$server/services/stampService.ts";

export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const query = url.searchParams.get("q") || "";

      if (!query.trim()) {
        return ApiResponseUtil.success({ data: [] });
      }

      const { type, sanitized } = classifySearchInput(query);

      // deno-lint-ignore no-explicit-any
      const queryOptions: Record<string, any> = {
        limit: 10,
        page: 1,
        skipTotalCount: true,
        cacheDuration: 60,
        excludeSrc20: true,
      };

      switch (type) {
        case "cpid":
          queryOptions.cpidPrefix = sanitized;
          queryOptions.limit = 11;
          queryOptions.sortBy = "ASC";
          queryOptions.sortColumn = "stamp";
          break;

        case "tx_hash":
          queryOptions.txHashPrefix = sanitized;
          queryOptions.limit = 11;
          break;

        case "stamp_number": {
          const num = parseInt(sanitized);
          queryOptions.stampNumberPrefix = {
            exact: num,
            rangeStart: num * 10,
            rangeEnd: num * 10 + 9,
          };
          queryOptions.limit = 11;
          queryOptions.sortColumn = "stamp";
          // Negative stamps: DESC puts -1 before -2 before -10 (closest to 0 first)
          // Positive stamps: ASC puts 1 before 10 before 19 (natural order)
          queryOptions.sortBy = num < 0 ? "DESC" : "ASC";
          break;
        }

        case "address":
          queryOptions.addressPrefix = sanitized;
          queryOptions.limit = 11;
          queryOptions.sortBy = "DESC";
          break;

        case "ticker":
        case "unknown":
        default:
          // Generic LIKE search on cpid, creator, tx_hash
          queryOptions.search = sanitized;
          break;
      }

      // deno-lint-ignore no-explicit-any
      let results: any;
      try {
        results = await StampService.getStamps(queryOptions);
      } catch (_err) {
        // Service throws "NO STAMPS FOUND" when result is null
        return ApiResponseUtil.success({ data: [] });
      }

      // StampService.getStamps returns { stamps: [...], last_block }
      const stamps = results?.stamps || [];

      // Format for dropdown display
      // deno-lint-ignore no-explicit-any
      const formattedResults = stamps.map((stamp: any) => ({
        stamp: stamp.stamp,
        cpid: stamp.cpid,
        preview: stamp.stamp_url,
        mimetype: stamp.stamp_mimetype,
        creator: stamp.creator,
        tx_hash: stamp.tx_hash,
      }));

      return ApiResponseUtil.success({ data: formattedResults });
    } catch (error) {
      console.error("Error in stamp search handler:", error);
      return ApiResponseUtil.internalError(
        error,
        "Error processing stamp search",
      );
    }
  },
};
