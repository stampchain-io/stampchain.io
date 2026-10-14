/**
 * Server Configuration Constants for BTC Stamps Explorer
 * Runtime constants for server configuration, API versioning, and middleware
 */

/**
 * Default pagination values for API endpoints
 */
export const DEFAULT_PAGINATION = {
  limit: 50,
  page: 1,
} as const;

/**
 * API version configuration
 */
export interface VersionConfig {
  supportedVersions: string[];
  defaultVersion: string;
  deprecatedVersions: string[];
  versionEndOfLife: Record<string, string>; // version -> EOL date
}

// API Version constants for type safety
export const API_VERSIONS = {
  V2_1: "2.1",
  V2_2: "2.2",
  V2_3: "2.3",
} as const;

export type ApiVersion = typeof API_VERSIONS[keyof typeof API_VERSIONS];

export const VERSION_CONFIG: VersionConfig = {
  supportedVersions: [API_VERSIONS.V2_2, API_VERSIONS.V2_3],
  defaultVersion: API_VERSIONS.V2_3, // Latest version by default
  deprecatedVersions: [API_VERSIONS.V2_1],
  versionEndOfLife: {
    [API_VERSIONS.V2_1]: "2025-06-01",
    [API_VERSIONS.V2_2]: "2025-12-01",
  },
};

/**
 * Endpoint deprecation configuration
 * Endpoints that are deprecated in specific versions
 */
export const DEPRECATED_ENDPOINTS: Record<string, {
  deprecatedInVersion: ApiVersion;
  reason: string;
  alternative: string;
  endOfLife: string;
}> = {
  "/api/v2/cursed": {
    deprecatedInVersion: API_VERSIONS.V2_3,
    reason:
      "Redundant endpoint - use /api/v2/stamps with type=cursed filter instead",
    alternative: "/api/v2/stamps?type=cursed",
    endOfLife: "2025-12-01",
  },
  "/api/v2/cursed/": {
    deprecatedInVersion: API_VERSIONS.V2_3,
    reason:
      "Redundant endpoint - use /api/v2/stamps with type=cursed filter instead",
    alternative: "/api/v2/stamps?type=cursed",
    endOfLife: "2025-12-01",
  },
};

/**
 * MARA configuration interface
 */
export interface MaraConfig {
  apiBaseUrl: string;
  apiTimeout: number;
  serviceFeeAmount: number;
  serviceFeeAddress: string;
  enabled: boolean;
}

/**
 * Default MARA configuration for development
 */
export const DEFAULT_MARA_CONFIG: MaraConfig = {
  apiBaseUrl: "https://slipstream.mara.com/rest-api",
  apiTimeout: 30000,
  serviceFeeAmount: 42000,
  serviceFeeAddress: "bc1qhhv6rmxvq5mj2fc3zne2gpjqduy45urapje64m",
  enabled: true,
};

/**
 * Counterparty API node endpoints with metadata
 * In CI/test environments, override with XCP_API_URL env var to point to mock server
 */
const _xcpApiUrl = typeof Deno !== "undefined"
  ? Deno.env.get("XCP_API_URL")
  : undefined;
export const XCP_V2_NODES: ReadonlyArray<{ name: string; url: string }> =
  _xcpApiUrl ? [{ name: "mock", url: _xcpApiUrl }] : [
    // One public node. A second "dev.counterparty.io" entry pointed at this
    // same URL (dev.counterparty.io does not resolve), so every failover
    // re-sent the request to the server that had just rate-limited it.
    {
      name: "counterparty.io",
      url: "https://api.counterparty.io:4000/v2",
    },
  ];

/**
 * Circuit breaker fallback data for trending tokens
 */
export const TRENDING_FALLBACK_DATA = {
  trending_tokens: [],
  fallback_used: true,
  timestamp: Date.now(),
  message: "Using fallback data due to circuit breaker activation",
} as const;

/**
 * Circuit breaker fallback data for market cap data
 */
export const MARKET_CAP_FALLBACK_DATA = {
  market_data: [],
  fallback_used: true,
  timestamp: Date.now(),
  message: "Using fallback data due to circuit breaker activation",
} as const;
