/**
 * GET /api/v2/keys/usage — API key usage stats
 *
 * Returns current tier, daily quota, and today's usage for the authenticated key.
 * Requires X-API-Key header.
 */

import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { ApiKeyService } from "$server/services/apiKey/apiKeyService.ts";

/** Per-endpoint rate limits shown in the usage response */
const RATE_LIMITS = {
  free: {
    src20: { requests_per_minute: 300, requests_per_day: "daily_limit" },
    stamps: { requests_per_minute: 480, requests_per_day: "daily_limit" },
    blocks: { requests_per_minute: 600, requests_per_day: "daily_limit" },
    general: { requests_per_minute: 600, requests_per_day: "daily_limit" },
  },
  partner: {
    src20: { requests_per_minute: "unlimited", requests_per_day: "unlimited" },
    stamps: { requests_per_minute: "unlimited", requests_per_day: "unlimited" },
    blocks: { requests_per_minute: "unlimited", requests_per_day: "unlimited" },
    general: {
      requests_per_minute: "unlimited",
      requests_per_day: "unlimited",
    },
  },
};

export const handler: Handlers = {
  async GET(req) {
    const noCache = { forceNoCache: true };

    const apiKey = req.headers.get("X-API-Key");
    if (!apiKey) {
      return ApiResponseUtil.unauthorized(
        "X-API-Key header is required",
        undefined,
        noCache,
      );
    }

    const keyInfo = await ApiKeyService.validateKey(apiKey);
    if (!keyInfo || !keyInfo.is_active) {
      return ApiResponseUtil.unauthorized(
        "Invalid or inactive API key",
        undefined,
        noCache,
      );
    }

    const usedToday = await ApiKeyService.getUsage(apiKey);
    const remaining = Math.max(0, keyInfo.daily_limit - usedToday);
    const tier = keyInfo.tier;

    return ApiResponseUtil.success(
      {
        tier,
        daily_limit: keyInfo.daily_limit,
        used_today: usedToday,
        remaining,
        rate_limits: RATE_LIMITS[tier],
      },
      noCache,
    );
  },
};
