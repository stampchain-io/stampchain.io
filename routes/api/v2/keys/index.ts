/**
 * POST /api/v2/keys — API key signup
 *
 * Creates a new free-tier API key for the given email address.
 * Rate-limits signup to 3 attempts per IP per hour (Redis-backed).
 */

import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { ApiKeyService } from "$server/services/apiKey/apiKeyService.ts";
import { getRedisConnection } from "$server/cache/redisClient.ts";

/** Extract client IP using the same header priority as rateLimiter.ts */
function getClientIp(req: Request): string {
  const cfIp = req.headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp;

  const xForwarded = req.headers.get("X-Forwarded-For");
  if (xForwarded) return xForwarded.split(",")[0].trim();

  const xRealIp = req.headers.get("X-Real-IP");
  if (xRealIp) return xRealIp;

  return "unknown";
}

/** Validate basic email format */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const handler: Handlers = {
  async POST(req) {
    const noCache = { forceNoCache: true };

    // Parse JSON body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return ApiResponseUtil.badRequest(
        "Request body must be valid JSON",
        undefined,
        noCache,
      );
    }

    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return ApiResponseUtil.badRequest(
        "email is required",
        undefined,
        noCache,
      );
    }

    if (!isValidEmail(email)) {
      return ApiResponseUtil.badRequest(
        "Invalid email address format",
        undefined,
        noCache,
      );
    }

    // Signup rate limit: max 3 per IP per hour
    const clientIp = getClientIp(req);
    const signupKey = `apikey:signup:${clientIp}`;
    try {
      const redis = await getRedisConnection();
      const signupCount = await redis.incr(signupKey);
      if (signupCount === 1) {
        // First attempt this hour — set 1-hour TTL
        await redis.pexpire(signupKey, 60 * 60 * 1000);
      }
      if (signupCount > 3) {
        return new Response(
          JSON.stringify({
            error: "Too many signup attempts. Limit: 3 per hour per IP.",
            retryAfter: 3600,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "3600",
              "Cache-Control": "no-store",
            },
          },
        );
      }
    } catch (redisError) {
      // Fail open: if Redis down, allow signup
      console.error(
        "[keys/index] signup rate limit Redis error:",
        redisError instanceof Error ? redisError.message : String(redisError),
      );
    }

    // Create the key
    try {
      const result = await ApiKeyService.createKey(email);
      return ApiResponseUtil.success(result, { ...noCache, status: 201 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      // Surface duplicate-email constraint violations as 409
      if (
        msg.includes("Duplicate entry") || msg.includes("unique constraint")
      ) {
        return new Response(
          JSON.stringify({
            error: "An API key already exists for this email address.",
            code: "DUPLICATE_EMAIL",
          }),
          {
            status: 409,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          },
        );
      }

      if (msg === "Invalid email address") {
        return ApiResponseUtil.badRequest(msg, undefined, noCache);
      }

      console.error("[keys/index] createKey error:", msg);
      return ApiResponseUtil.internalError(error, "Error creating API key");
    }
  },
};
