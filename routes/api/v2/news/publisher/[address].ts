import { Handlers } from "$fresh/server.ts";
import { NewsController } from "$server/controller/newsController.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { checkEmptyResult } from "$server/services/validation/routeValidationService.ts";

// Simple moderation blocklist
const BLOCKED_ADDRESSES = [
  "1SpamAddressExample",
];

export const handler: Handlers = {
  async GET(req, ctx) {
    try {
      const address = ctx.params.address;

      if (!address) {
        return ApiResponseUtil.error(400, "Address parameter is required");
      }

      if (BLOCKED_ADDRESSES.includes(address)) {
        return ApiResponseUtil.error(403, "Address is blocked by moderation.");
      }

      const result = await NewsController.handlePublisherRequest(address);

      const emptyCheck = checkEmptyResult(result, "publisher data");
      if (emptyCheck) {
        return emptyCheck;
      }

      return ApiResponseUtil.success(result);
    } catch (error) {
      console.error("Error in publisher profile handler:", error);
      return ApiResponseUtil.internalError(
        error,
        "Error processing news publisher request",
      );
    }
  },
};
