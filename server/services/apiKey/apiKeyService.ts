/**
 * API Key Service for stampchain.io
 *
 * Manages API key creation, validation, and usage tracking.
 * Uses MySQL for persistent storage and Redis for caching/rate limiting.
 *
 * Tiers:
 *   - free: 50,000 requests/day, 3-5x higher per-minute limits than anonymous
 *   - partner: unlimited, full bypass
 */

import { dbManager } from "$server/database/databaseManager.ts";
import { getRedisConnection } from "$server/cache/redisClient.ts";

/** Shape returned from MySQL / Redis cache */
export interface ApiKeyInfo {
  tier: "free" | "partner";
  daily_limit: number;
  is_active: boolean;
}

/** Full row from MySQL (also used for createKey return) */
export interface ApiKeyRecord extends ApiKeyInfo {
  id: number;
  api_key: string;
  email: string;
  created_at: string;
  last_used_at: string | null;
}

/** Result of createKey */
export interface CreateKeyResult {
  api_key: string;
  tier: "free";
  daily_limit: number;
}

let tableEnsured = false;

/**
 * Ensure the api_keys table exists (lazy, idempotent, runs once per cold start).
 */
async function ensureTable(): Promise<void> {
  if (tableEnsured) return;

  await dbManager.executeQuery<unknown>(
    `CREATE TABLE IF NOT EXISTS api_keys (
      id INT AUTO_INCREMENT PRIMARY KEY,
      api_key VARCHAR(64) UNIQUE NOT NULL,
      email VARCHAR(255) NOT NULL,
      tier ENUM('free', 'partner') DEFAULT 'free',
      daily_limit INT DEFAULT 50000,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_used_at TIMESTAMP NULL,
      is_active BOOLEAN DEFAULT TRUE,
      INDEX idx_api_key (api_key),
      INDEX idx_email (email)
    )`,
    [],
  );

  tableEnsured = true;
}

/**
 * Generate a 64-character hex API key.
 */
function generateApiKey(): string {
  const a = crypto.randomUUID().replaceAll("-", ""); // 32 hex chars
  const b = crypto.randomUUID().replaceAll("-", "").slice(0, 32); // 32 hex chars
  return a + b;
}

/**
 * Validate an email address with a basic regex.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Get today's date string for Redis daily usage keys (YYYY-MM-DD UTC).
 */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export const ApiKeyService = {
  /**
   * Create a new API key for the given email address.
   * Validates email format, generates a 64-char hex key, inserts into MySQL.
   * Throws on duplicate email.
   */
  async createKey(email: string): Promise<CreateKeyResult> {
    if (!email || !isValidEmail(email)) {
      throw new Error("Invalid email address");
    }

    await ensureTable();

    const apiKey = generateApiKey();

    await dbManager.executeQuery<unknown>(
      `INSERT INTO api_keys (api_key, email) VALUES (?, ?)`,
      [apiKey, email.toLowerCase().trim()],
    );

    return { api_key: apiKey, tier: "free", daily_limit: 50000 };
  },

  /**
   * Validate an API key. Checks Redis cache first (5-min TTL), falls back to MySQL.
   * Returns null for unknown or inactive keys.
   */
  async validateKey(apiKey: string): Promise<ApiKeyInfo | null> {
    if (!apiKey) return null;

    try {
      const redis = await getRedisConnection();
      const cacheKey = `apikey:${apiKey}`;

      // Redis cache hit
      const cached = await redis.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached) as ApiKeyInfo;
        } catch {
          // Corrupted cache entry — fall through to MySQL
        }
      }

      // MySQL lookup
      await ensureTable();
      const result = await dbManager.executeQuery<{
        rows: Array<{ tier: string; daily_limit: number; is_active: number | boolean }>;
      }>(
        `SELECT tier, daily_limit, is_active FROM api_keys WHERE api_key = ? LIMIT 1`,
        [apiKey],
      );

      const row = result?.rows?.[0];
      if (!row) return null;

      const info: ApiKeyInfo = {
        tier: row.tier as "free" | "partner",
        daily_limit: row.daily_limit,
        is_active: Boolean(row.is_active),
      };

      if (!info.is_active) return null;

      // Cache for 5 minutes
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(info));
      } catch {
        // Cache write failure is non-fatal
      }

      return info;
    } catch (error) {
      console.error(
        "[ApiKeyService] validateKey error:",
        error instanceof Error ? error.message : String(error),
      );
      // Fail open: if Redis/MySQL down, return null (caller falls through to anon limits)
      return null;
    }
  },

  /**
   * Get today's usage count for an API key from Redis.
   * Returns 0 if Redis is unavailable.
   */
  async getUsage(apiKey: string): Promise<number> {
    try {
      const redis = await getRedisConnection();
      const key = `apikey:usage:${apiKey}:${todayUtc()}`;
      const raw = await redis.get(key);
      return raw ? parseInt(raw, 10) : 0;
    } catch (error) {
      console.error(
        "[ApiKeyService] getUsage error:",
        error instanceof Error ? error.message : String(error),
      );
      return 0;
    }
  },

  /**
   * Increment the daily usage counter for an API key in Redis.
   * Sets a 48-hour TTL on first increment.
   * Returns the new count (or 0 on error — fail open).
   */
  async incrementDailyUsage(apiKey: string): Promise<number> {
    try {
      const redis = await getRedisConnection();
      const key = `apikey:usage:${apiKey}:${todayUtc()}`;
      const newCount = await redis.incr(key);
      if (newCount === 1) {
        // First request today — set 48h TTL so key expires naturally
        await redis.pexpire(key, 48 * 60 * 60 * 1000);
      }
      return newCount;
    } catch (error) {
      console.error(
        "[ApiKeyService] incrementDailyUsage error:",
        error instanceof Error ? error.message : String(error),
      );
      return 0; // Fail open: don't block request if Redis is down
    }
  },

  /**
   * Fire-and-forget UPDATE of last_used_at in MySQL.
   * Never throws — caller uses `.catch(() => {})`.
   */
  async touchLastUsed(apiKey: string): Promise<void> {
    try {
      await dbManager.executeQuery<unknown>(
        `UPDATE api_keys SET last_used_at = NOW() WHERE api_key = ?`,
        [apiKey],
      );
    } catch (error) {
      console.error(
        "[ApiKeyService] touchLastUsed error:",
        error instanceof Error ? error.message : String(error),
      );
    }
  },
};
