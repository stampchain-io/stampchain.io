import type { Handlers } from "$fresh/server.ts";
import { WebResponseUtil } from "$utils/api/responses/webResponseUtil.ts";
import { buildHostedSwapPageHtml } from "$server/services/hostedSwapPageService.ts";

export const handler: Handlers = {
  GET() {
    return WebResponseUtil.htmlResponse(buildHostedSwapPageHtml(), {
      forceNoCache: true,
    });
  },
};
