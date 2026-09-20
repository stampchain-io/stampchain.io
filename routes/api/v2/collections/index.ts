import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { getPaginationParams } from "$lib/utils/data/pagination/paginationUtils.ts";
import { CollectionController } from "$server/controller/collectionController.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

export const handler: Handlers = {
  async GET(req, _ctx) {
    try {
      const url = new URL(req.url);
      const pagination = getPaginationParams(url);

      // Check if pagination validation failed
      if (pagination instanceof Response) {
        return pagination;
      }

      const { limit, page } = pagination;
      const sortBy = url.searchParams.get("sortBy")?.toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";

      const result = await CollectionController.getCollectionDetails({
        limit: limit || 50,
        page: page || 1,
        sortBy,
      });

      return ApiResponseUtil.success(result, {
        routeType: RouteType.COLLECTION,
      });
    } catch (error) {
      console.error("Error in collections handler:", error);
      return ApiResponseUtil.internalError(
        error,
        "Error processing collections request",
      );
    }
  },
};
