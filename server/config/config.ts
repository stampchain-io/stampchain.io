import "$/server/config/env.ts";
import { type MaraConfig, createMaraConfigFromEnv } from "$/server/config/maraConfig.ts";

type ServerConfig = {
  readonly APP_ROOT: string;
  readonly IMAGES_SRC_PATH?: string;
  readonly MINTING_SERVICE_FEE?: string;
  readonly MINTING_SERVICE_FEE_ADDRESS?: string;
  readonly CSRF_SECRET_KEY?: string;
  readonly MINTING_SERVICE_FEE_ENABLED: string;
  readonly MINTING_SERVICE_FEE_FIXED_SATS: string;
  readonly OPENSTAMP_API_KEY: string;
  readonly API_KEY?: string;
  readonly QUICKNODE_ENDPOINT?: string;
  readonly QUICKNODE_API_KEY?: string;
  readonly DEBUG_NAMESPACES: string;
  readonly IS_DEBUG_ENABLED: boolean;
  readonly APP_DOMAIN: string | undefined;
  readonly ALLOWED_DOMAINS: string | undefined;
  // MARA Integration Configuration
  readonly MARA_API_BASE_URL?: string;
  readonly MARA_API_TIMEOUT?: string;
  readonly MARA_SERVICE_FEE_SATS?: string;
  readonly MARA_SERVICE_FEE_ADDRESS?: string;
  readonly ENABLE_MARA_INTEGRATION?: string;
  // Environment detection
  readonly DENO_ENV: string;
  readonly IS_DEVELOPMENT: boolean;
  readonly IS_PRODUCTION: boolean;
  // Security
  readonly INTERNAL_API_KEY?: string;
  readonly INTERNAL_API_SECRET?: string;
  readonly CF_ACCESS_CLIENT_ID?: string;
  readonly CF_ACCESS_CLIENT_SECRET?: string;
  readonly CLOUDFLARE_ZONE_ID?: string;
  readonly CLOUDFLARE_API_TOKEN?: string;
  // Development & debugging
  readonly DEV_BASE_URL: string;
  readonly PROD_BASE_URL: string | undefined;
  readonly DEBUG_SQL: boolean;
  readonly USE_CRYPTO_STUBS: boolean;
  // Middleware
  readonly PUBLIC_API_KEY?: string;
  readonly RATE_LIMIT_DEBUG: boolean;
  readonly OPENAPI_VALIDATION_DISABLED: boolean;
  // Database & Caching
  readonly REDIS_TIMEOUT: string;
  readonly SKIP_REDIS_TLS: boolean;
  readonly REDIS_DEBUG: boolean;
  // Worker & Cloudflare
  readonly CONNECTION_POOL_RESET_TOKEN?: string;
  readonly CF_PREVIEW_WORKER_URL?: string;
  readonly CF_PREVIEW_WORKER_SECRET?: string;
  // S3 & CloudFront (stamp preview storage)
  readonly AWS_S3_BUCKETNAME: string;
  readonly AWS_S3_IMAGE_DIR: string;
  readonly CLOUDFRONT_PREVIEW_DOMAIN: string;
  readonly PREVIEW_STORAGE: "s3" | "redis";
  readonly AWS_REGION: string;
  // Rendering
  readonly PUPPETEER_EXECUTABLE_PATH?: string;
  // Server Role
  readonly DENO_ROLE?: string;
  [key: string]: string | boolean | undefined;
};

const serverConfig: ServerConfig = {
  get APP_ROOT() {
    return Deno.cwd();
  },
  MINTING_SERVICE_FEE_ENABLED: "0",
  MINTING_SERVICE_FEE_FIXED_SATS: "0",

  get IMAGES_SRC_PATH() {
    return Deno.env.get("IMAGES_SRC_PATH") || "";
  },
  get MINTING_SERVICE_FEE() {
    return Deno.env.get("MINTING_SERVICE_FEE") || "";
  },
  get MINTING_SERVICE_FEE_ADDRESS() {
    return Deno.env.get("MINTING_SERVICE_FEE_ADDRESS") || "";
  },
  get CSRF_SECRET_KEY() {
    return Deno.env.get("CSRF_SECRET_KEY") || "";
  },
  get OPENSTAMP_API_KEY() {
    return Deno.env.get("OPENSTAMP_API_KEY") || "";
  },
  get API_KEY() {
    return Deno.env.get("API_KEY") || "";
  },
  get QUICKNODE_ENDPOINT() {
    return Deno.env.get("QUICKNODE_ENDPOINT") || "";
  },
  get QUICKNODE_API_KEY() {
    return Deno.env.get("QUICKNODE_API_KEY") || "";
  },
  get DEBUG_NAMESPACES() {
    return Deno.env.get("DEBUG") || "";
  },
  get IS_DEBUG_ENABLED() {
    return !!Deno.env.get("DEBUG");
  },
  get APP_DOMAIN() {
    return Deno.env.get("APP_DOMAIN") || "";
  },
  get ALLOWED_DOMAINS() {
    return Deno.env.get("ALLOWED_DOMAINS") || "";
  },
  // MARA Integration Configuration
  get MARA_API_BASE_URL() {
    return Deno.env.get("MARA_API_BASE_URL") || "https://slipstream.mara.com/rest-api";
  },
  get MARA_API_TIMEOUT() {
    return Deno.env.get("MARA_API_TIMEOUT") || "30000";
  },
  get MARA_SERVICE_FEE_SATS() {
    return Deno.env.get("MARA_SERVICE_FEE_SATS") || "42000";
  },
  get MARA_SERVICE_FEE_ADDRESS() {
    return Deno.env.get("MARA_SERVICE_FEE_ADDRESS") || "bc1qhhv6rmxvq5mj2fc3zne2gpjqduy45urapje64m";
  },
  get ENABLE_MARA_INTEGRATION() {
    return Deno.env.get("ENABLE_MARA_INTEGRATION") || "0";
  },
  // Environment detection
  get DENO_ENV() {
    return Deno.env.get("DENO_ENV") || "development";
  },
  get IS_DEVELOPMENT() {
    return Deno.env.get("DENO_ENV") === "development";
  },
  get IS_PRODUCTION() {
    return Deno.env.get("DENO_ENV") === "production";
  },
  // Security
  get INTERNAL_API_KEY() {
    return Deno.env.get("INTERNAL_API_KEY") || "";
  },
  get INTERNAL_API_SECRET() {
    return Deno.env.get("INTERNAL_API_SECRET") || "";
  },
  get CF_ACCESS_CLIENT_ID() {
    return Deno.env.get("CF_ACCESS_CLIENT_ID") || "";
  },
  get CF_ACCESS_CLIENT_SECRET() {
    return Deno.env.get("CF_ACCESS_CLIENT_SECRET") || "";
  },
  get CLOUDFLARE_ZONE_ID() {
    return Deno.env.get("CLOUDFLARE_ZONE_ID") || "";
  },
  get CLOUDFLARE_API_TOKEN() {
    return Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
  },
  // Development & debugging
  get DEV_BASE_URL() {
    return Deno.env.get("DEV_BASE_URL") || "https://stampchain.io";
  },
  get PROD_BASE_URL() {
    return Deno.env.get("PROD_BASE_URL") || "";
  },
  get DEBUG_SQL() {
    return Deno.env.get("DEBUG_SQL") === "true";
  },
  get USE_CRYPTO_STUBS() {
    return Deno.env.get("USE_CRYPTO_STUBS") === "true";
  },
  // Middleware
  get PUBLIC_API_KEY() {
    return Deno.env.get("PUBLIC_API_KEY") || "";
  },
  get RATE_LIMIT_DEBUG() {
    return Deno.env.get("RATE_LIMIT_DEBUG") === "true";
  },
  get OPENAPI_VALIDATION_DISABLED() {
    return Deno.env.get("OPENAPI_VALIDATION_DISABLED") === "true";
  },
  // Database & Caching
  get REDIS_TIMEOUT() {
    return Deno.env.get("REDIS_TIMEOUT") || "15000";
  },
  get SKIP_REDIS_TLS() {
    return Deno.env.get("SKIP_REDIS_TLS") === "true";
  },
  get REDIS_DEBUG() {
    return Deno.env.get("REDIS_DEBUG") === "true";
  },
  // Worker & Cloudflare
  get CONNECTION_POOL_RESET_TOKEN() {
    return Deno.env.get("CONNECTION_POOL_RESET_TOKEN") || "";
  },
  get CF_PREVIEW_WORKER_URL() {
    return Deno.env.get("CF_PREVIEW_WORKER_URL") || "";
  },
  get CF_PREVIEW_WORKER_SECRET() {
    return Deno.env.get("CF_PREVIEW_WORKER_SECRET") || "";
  },
  // S3 & CloudFront (stamp preview storage)
  get AWS_S3_BUCKETNAME() {
    return Deno.env.get("AWS_S3_BUCKETNAME") ?? "";
  },
  get AWS_S3_IMAGE_DIR() {
    return Deno.env.get("AWS_S3_IMAGE_DIR") ?? "stamps/";
  },
  get CLOUDFRONT_PREVIEW_DOMAIN() {
    return Deno.env.get("CLOUDFRONT_PREVIEW_DOMAIN") ?? "stampchain.io";
  },
  get PREVIEW_STORAGE(): "s3" | "redis" {
    return (Deno.env.get("PREVIEW_STORAGE") ?? "redis") as "s3" | "redis";
  },
  get AWS_REGION() {
    return Deno.env.get("AWS_REGION") ?? "us-east-1";
  },
  // Rendering
  get PUPPETEER_EXECUTABLE_PATH() {
    return Deno.env.get("PUPPETEER_EXECUTABLE_PATH") || "";
  },
  // Server Role
  get DENO_ROLE() {
    return Deno.env.get("DENO_ROLE") || "";
  },
};

export { serverConfig };

/**
 * Get MARA configuration object
 * Returns null if MARA integration is disabled
 */
export function getMaraConfig(): MaraConfig | null {
  try {
    return createMaraConfigFromEnv();
  } catch (error) {
    // Log configuration errors but don't crash the server
    console.error('MARA configuration error:', error);
    return null;
  }
}

export function getClientConfig() {
  return {
    MINTING_SERVICE_FEE: serverConfig.MINTING_SERVICE_FEE,
    MINTING_SERVICE_FEE_ADDRESS: serverConfig.MINTING_SERVICE_FEE_ADDRESS,
    DEBUG_NAMESPACES: serverConfig.DEBUG_NAMESPACES,
    IS_DEBUG_ENABLED: serverConfig.IS_DEBUG_ENABLED,
  };
}