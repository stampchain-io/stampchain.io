/**
 * Rate Limiting Middleware for stampchain.io
 *
 * Implements preventive rate limiting to protect against API abuse
 * Uses Redis for distributed rate limit tracking
 *
 * Created: November 14, 2025
 * Strategy: RATE_LIMITING_STRATEGY.md
 */

import { FreshContext } from "$fresh/server.ts";
import { getRedisConnection } from "$server/cache/redisClient.ts";
import { serverConfig } from "$server/config/config.ts";
import { ApiKeyService } from "$server/services/apiKey/apiKeyService.ts";

interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed in window */
  max: number;
  /** Custom error message */
  message?: string;
  /** Block duration in seconds (0 = just deny request) */
  blockDuration?: number;
}

/**
 * Rate limit configurations by endpoint pattern
 * More specific patterns checked first
 *
 * Anonymous (no API key) rate limits:
 * - SRC-20: 60 req/min (1/sec) - Heaviest DB queries, known bottleneck
 * - Stamps: 100 req/min (~2/sec) - Database-intensive metadata lookups
 * - Blocks: 120 req/min (2/sec) - Block data queries
 * - General: 150 req/min (~3/sec) - All other v2 endpoints
 *
 * Block durations are short (30s) to avoid frustrating legitimate users.
 * API key holders get higher limits (see apiKeyRateLimitConfigs below).
 */
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // Tier 3: SRC-20 endpoints (strictest - heaviest DB queries)
  "/api/v2/src20": {
    windowMs: 60000, // 1 minute
    max: 60, // 60 requests = 1 req/sec
    message:
      "SRC-20 API rate limit exceeded. Limit: 60 requests per minute. Get higher limits with a free API key at stampchain.io/api",
    blockDuration: 30, // 30 second block
  },

  // Tier 2: Expensive endpoints (database-intensive)
  "/api/v2/stamps": {
    windowMs: 60000,
    max: 100, // 100 requests = ~2 req/sec
    message:
      "Stamps API rate limit exceeded. Limit: 100 requests per minute. Get higher limits with a free API key at stampchain.io/api",
    blockDuration: 30, // 30 second block
  },
  "/api/v2/blocks": {
    windowMs: 60000,
    max: 120, // 120 requests = 2 req/sec
    message:
      "Blocks API rate limit exceeded. Limit: 120 requests per minute. Get higher limits with a free API key at stampchain.io/api",
    blockDuration: 30, // 30 second block
  },

  // Tier 1: General API protection (default for all other endpoints)
  "/api/v2": {
    windowMs: 60000,
    max: 150, // 150 requests = ~3 req/sec
    message:
      "API rate limit exceeded. Limit: 150 requests per minute. Get higher limits with a free API key at stampchain.io/api",
    blockDuration: 30, // 30 second block
  },
};

/**
 * Rate limits for authenticated API key holders (free tier).
 * 3-5x higher than anonymous limits, no blocking on exceedance.
 * These will be used when X-API-Key header matches a registered key.
 *
 * NOTE: Currently unused — API key tier detection not yet implemented.
 * This config is defined now so the values are documented and ready
 * for the next PR that adds key signup + tier-aware middleware.
 */
const apiKeyRateLimitConfigs: Record<string, RateLimitConfig> = {
  "/api/v2/src20": {
    windowMs: 60000,
    max: 300, // 5 req/sec (5x anonymous)
    message: "SRC-20 API rate limit exceeded. Limit: 300 requests per minute.",
    blockDuration: 0, // No block for key holders
  },
  "/api/v2/stamps": {
    windowMs: 60000,
    max: 480, // 8 req/sec
    message: "Stamps API rate limit exceeded. Limit: 480 requests per minute.",
    blockDuration: 0,
  },
  "/api/v2/blocks": {
    windowMs: 60000,
    max: 600, // 10 req/sec
    message: "Blocks API rate limit exceeded. Limit: 600 requests per minute.",
    blockDuration: 0,
  },
  "/api/v2": {
    windowMs: 60000,
    max: 600, // 10 req/sec
    message: "API rate limit exceeded. Limit: 600 requests per minute.",
    blockDuration: 0,
  },
};

/**
 * Get client IP address from request headers
 * Cloudflare provides CF-Connecting-IP header with real client IP
 */
function getClientIp(req: Request): string {
  // Cloudflare header (most reliable)
  const cfIp = req.headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp;

  // X-Forwarded-For fallback
  const xForwarded = req.headers.get("X-Forwarded-For");
  if (xForwarded) {
    // X-Forwarded-For can contain multiple IPs, take first
    return xForwarded.split(",")[0].trim();
  }

  // X-Real-IP fallback
  const xRealIp = req.headers.get("X-Real-IP");
  if (xRealIp) return xRealIp;

  return "unknown";
}

/**
 * Find the most specific rate limit config for a given path
 * Checks from most specific to least specific
 */
function getRateLimitConfig(pathname: string): RateLimitConfig | null {
  // Sort configs by specificity (longest path first)
  const sortedConfigs = Object.entries(rateLimitConfigs)
    .sort(([a], [b]) => b.length - a.length);

  // Find first matching config
  for (const [path, config] of sortedConfigs) {
    if (pathname.startsWith(path)) {
      return config;
    }
  }

  return null;
}

/**
 * Find the most specific API key rate limit config for a given path.
 * Same matching logic as getRateLimitConfig but uses apiKeyRateLimitConfigs.
 */
function getApiKeyRateLimitConfig(pathname: string): RateLimitConfig | null {
  const sortedConfigs = Object.entries(apiKeyRateLimitConfigs)
    .sort(([a], [b]) => b.length - a.length);

  for (const [path, config] of sortedConfigs) {
    if (pathname.startsWith(path)) {
      return config;
    }
  }

  return null;
}

/**
 * Rate Limiting Middleware
 *
 * Flow:
 * 1. Skip internal APIs (protected by API key)
 * 2. Skip health checks (monitoring needs high frequency)
 * 3. Check for legacy PUBLIC_API_KEY bypass (backward compat)
 * 4. Check for registered API key (tier-aware limits)
 * 5. Check if IP is blocked
 * 6. Increment request counter in Redis
 * 7. Return 429 if limit exceeded
 * 8. Add rate limit headers to response
 */
export async function rateLimitMiddleware(
  req: Request,
  ctx: FreshContext
): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Skip rate limiting for internal APIs (protected by API key)
  if (pathname.startsWith("/api/internal/")) {
    return ctx.next();
  }

  // Skip rate limiting for health checks
  if (pathname === "/api/health") {
    return ctx.next();
  }

  // Get client IP (used for anon rate limiting and as fallback identifier)
  const clientIp = getClientIp(req);

  // Default rate limit identifier: IP-based (overridden to key-based for authenticated requests)
  let rateLimitIdentifier = clientIp;

  // Check for API key (registered or legacy)
  const apiKey = req.headers.get("X-API-Key");
  if (apiKey) {
    // Legacy PUBLIC_API_KEY check (backward compat for existing partners)
    const legacyKey = serverConfig.PUBLIC_API_KEY;
    if (legacyKey && apiKey === legacyKey) {
      console.log("[RATE LIMITER] Legacy API key bypass granted");
      return ctx.next();
    }

    // Registered API key — tier-aware handling
    try {
      const keyInfo = await ApiKeyService.validateKey(apiKey);
      if (keyInfo && keyInfo.is_active) {
        if (keyInfo.tier === "partner") {
          // Partners get full bypass
          ApiKeyService.touchLastUsed(apiKey).catch(() => {});
          return ctx.next();
        }

        // Free tier: check daily quota, then apply higher per-minute limits
        const keyConfig = getApiKeyRateLimitConfig(pathname);
        if (keyConfig) {
          const dailyUsed = await ApiKeyService.incrementDailyUsage(apiKey);
          if (dailyUsed > keyInfo.daily_limit) {
            return new Response(
              JSON.stringify({
                error: "Daily API quota exceeded",
                daily_limit: keyInfo.daily_limit,
                used_today: dailyUsed,
                upgrade: {
                  message: "Contact us for higher limits",
                  url: "https://stampchain.io/api",
                },
              }),
              {
                status: 429,
                headers: {
                  "Content-Type": "application/json",
                  "Retry-After": "3600",
                },
              },
            );
          }

          // Use key-based identifier and higher limits for free tier
          rateLimitIdentifier = `key:${apiKey}`;
          ApiKeyService.touchLastUsed(apiKey).catch(() => {});

          // Find matching config
          const config = keyConfig;

          // Redis keys (per-API-key, not per-IP)
          const rateLimitKey = `ratelimit:${pathname}:${rateLimitIdentifier}`;

          try {
            const redis = await getRedisConnection();

            // Increment request counter
            const current = await redis.incr(rateLimitKey);
            if (current === 1) {
              await redis.pexpire(rateLimitKey, config.windowMs);
            }

            const remaining = Math.max(0, config.max - current);

            if (current > config.max) {
              const ttl = await redis.pttl(rateLimitKey);
              const retryAfter = Math.ceil(ttl / 1000);

              return new Response(
                JSON.stringify({
                  error: config.message || "Rate limit exceeded",
                  retryAfter,
                  limit: config.max,
                  window: config.windowMs / 1000,
                }),
                {
                  status: 429,
                  headers: {
                    "Content-Type": "application/json",
                    "Retry-After": String(retryAfter),
                    "X-RateLimit-Limit": String(config.max),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": String(Date.now() + ttl),
                  },
                },
              );
            }

            const response = await ctx.next();
            response.headers.set("X-RateLimit-Limit", String(config.max));
            response.headers.set("X-RateLimit-Remaining", String(remaining));
            response.headers.set(
              "X-RateLimit-Reset",
              String(Date.now() + config.windowMs),
            );
            return response;
          } catch (error) {
            console.error("[RATE LIMITER ERROR] key-tier Redis:", error);
            return ctx.next(); // Fail open
          }
        }

        // No key-tier config for this path — fall through to anonymous limits
        ApiKeyService.touchLastUsed(apiKey).catch(() => {});
      }
      // Invalid/inactive key falls through to anonymous IP-based limits
    } catch (error) {
      console.error("[RATE LIMITER] ApiKeyService error:", error);
      // Fail open: proceed with anonymous limits
    }
  }

  // Find matching anonymous config
  const config = getRateLimitConfig(pathname);

  if (!config) {
    // No rate limit configured for this endpoint
    return ctx.next();
  }

  // Redis keys (IP-based for anonymous requests)
  const rateLimitKey = `ratelimit:${pathname}:${rateLimitIdentifier}`;
  const blockKey = `ratelimit:block:${pathname}:${rateLimitIdentifier}`;

  try {
    const redis = await getRedisConnection();

    // Check if IP is currently blocked
    const blocked = await redis.get(blockKey);
    if (blocked) {
      const ttl = await redis.pttl(blockKey);
      const retryAfter = Math.ceil(ttl / 1000);

      console.log(`[RATE LIMITER BLOCKED] IP ${clientIp} blocked for ${pathname} (${retryAfter}s remaining)`);

      return new Response(
        JSON.stringify({
          error: "Too many requests. You have been temporarily blocked.",
          retryAfter,
          limit: config.max,
          window: config.windowMs / 1000,
          upgrade: {
            message: "Get 3-5x higher limits with a free API key",
            url: "https://stampchain.io/api",
          },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(config.max),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Date.now() + ttl),
          },
        }
      );
    }

    // Increment request counter
    const current = await redis.incr(rateLimitKey);

    // Set expiry on first request
    if (current === 1) {
      await redis.pexpire(rateLimitKey, config.windowMs);
    }

    // Check if limit exceeded
    if (current > config.max) {
      const ttl = await redis.pttl(rateLimitKey);
      const retryAfter = Math.ceil(ttl / 1000);

      console.warn(`[RATE LIMITER EXCEEDED] IP ${clientIp} exceeded limit for ${pathname}: ${current}/${config.max}`);

      // Block IP if blockDuration configured
      if (config.blockDuration && config.blockDuration > 0) {
        await redis.setex(blockKey, config.blockDuration, "1");
        console.warn(`[RATE LIMITER BLOCK] IP ${clientIp} blocked for ${config.blockDuration}s`);
      }

      return new Response(
        JSON.stringify({
          error: config.message || "Rate limit exceeded",
          retryAfter,
          limit: config.max,
          window: config.windowMs / 1000,
          blocked: config.blockDuration ? true : false,
          blockDuration: config.blockDuration || 0,
          upgrade: {
            message: "Get 3-5x higher limits with a free API key",
            url: "https://stampchain.io/api",
          },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(config.max),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Date.now() + ttl),
          },
        }
      );
    }

    // Calculate remaining requests
    const remaining = config.max - current;

    // Log rate limit status (debug mode)
    const rateLimitDebug = serverConfig.RATE_LIMIT_DEBUG;
    if (rateLimitDebug) {
      console.log(`[RATE LIMITER] IP ${clientIp} ${pathname}: ${current}/${config.max} (${remaining} remaining)`);
    }

    // Continue to next middleware/handler
    const response = await ctx.next();

    // Add rate limit headers to response
    response.headers.set("X-RateLimit-Limit", String(config.max));
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(Date.now() + config.windowMs));

    return response;
  } catch (error) {
    console.error("[RATE LIMITER ERROR]", error);

    // Fail open - allow request if Redis fails
    // Better to have no rate limiting than block all requests
    return ctx.next();
  }
}

/**
 * Utility function to clear rate limit for specific IP (admin use)
 */
export async function clearRateLimit(ip: string, path?: string): Promise<void> {
  try {
    const redis = await getRedisConnection();

    if (path) {
      // Clear specific endpoint
      await redis.del(`ratelimit:${path}:${ip}`);
      await redis.del(`ratelimit:block:${path}:${ip}`);
    } else {
      // Clear all rate limits for IP (use pattern matching)
      const keys = await redis.keys(`ratelimit:*:${ip}`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      const blockKeys = await redis.keys(`ratelimit:block:*:${ip}`);
      if (blockKeys.length > 0) {
        await redis.del(...blockKeys);
      }
    }

    console.log(`[RATE LIMITER] Cleared rate limits for IP ${ip}${path ? ` on ${path}` : ""}`);
  } catch (error) {
    console.error("[RATE LIMITER] Error clearing rate limit:", error);
    throw error;
  }
}
