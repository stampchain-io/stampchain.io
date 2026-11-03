import type { Handlers } from "$fresh/server.ts";
import { MAX_CREATOR_SEARCH_QUERY_LENGTH } from "$lib/types/creator.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { CreatorService } from "$server/services/creator/creatorService.ts";

export const handler: Handlers = {
  async GET(req) {
    const query = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    if (query.length > MAX_CREATOR_SEARCH_QUERY_LENGTH) {
      return ApiResponseUtil.badRequest(
        `Search query must be ${MAX_CREATOR_SEARCH_QUERY_LENGTH} characters or fewer`,
        undefined,
        { forceNoCache: true },
      );
    }

    try {
      const data = query ? await CreatorService.searchCreators(query) : [];
      return ApiResponseUtil.success({ data }, {
        headers: { "Cache-Control": "public, max-age=60" },
      });
    } catch (error) {
      return ApiResponseUtil.internalError(error, "Error searching users");
    }
  },
};
