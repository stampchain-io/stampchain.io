import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { VERSION_CONFIG } from "$server/middleware/apiVersionMiddleware.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

/**
 * API Version Discovery Endpoint
 *
 * GET /api/v2/versions - Returns available API versions and their status
 */

const CHANGELOG = [
  {
    version: "2.3.0",
    releaseDate: "2025-01-15",
    status: "current",
    changes: {
      added: [
        "market_data object with floor price and volume information",
        "dispenserInfo for stamp dispenser statistics",
        "cacheStatus to indicate data freshness",
        "holderCount and uniqueHolderCount fields",
        "Advanced market data filtering parameters",
        "dataQualityScore for data reliability metrics",
        "from_timestamp and to_timestamp query parameters for date filtering (validation only)",
        "Enhanced transaction details in recent sales data including buyer_address, dispenser_address, time_ago, btc_amount_satoshis, and dispenser_tx_hash",
        "btcPriceUSD field in recent sales response for real-time USD conversions",
        "metadata object in recent sales response with dayRange and lastUpdated timestamp",
        "activityLevel field in StampMarketData (HOT, WARM, COOL, DORMANT, COLD) for trading activity indicators",
        "lastActivityTime field in StampMarketData with Unix timestamp of last trading activity",
        "Enhanced transaction details in StampMarketData including lastSaleTxHash, lastSaleBuyerAddress, lastSaleDispenserAddress",
        "lastSaleBtcAmount, lastSaleDispenserTxHash, and lastSaleBlockIndex fields for complete sale information",
      ],
      improved: [
        "Response performance with intelligent caching",
        "Pagination consistency across all endpoints",
        "List query performance by excluding stamp_base64 field from list responses",
        "Input validation for ident parameter to return empty results for invalid values",
        "Security validation for SQL injection attempts in SRC101 endpoints",
        "XSS detection in address-related endpoints",
        "Transaction hash format validation requiring 64-character hex strings",
        "Recent sales performance by using local market data cache instead of external XCP API calls",
        "Data accuracy with transaction-level details from stamp_market_data table",
        "Time calculations with user-friendly relative timestamps (e.g., '2h ago', '5d ago')",
      ],
      optimized: [
        "stamp_base64 field is now excluded from list endpoints for 50-70% smaller responses",
        "stamp_base64 remains available in single stamp detail endpoints (/stamps/[identifier])",
      ],
      fixed: [],
      deprecated: [
        "🚫 /api/v2/cursed endpoint - Use /api/v2/stamps?type=cursed instead for better filtering and consistency",
      ],
      removed: [
        "floorPrice, floorPriceUSD, marketCapUSD moved into marketData object in stamp detail endpoints",
      ],
      migrationGuide: "https://stampchain.io/docs/api/migration/v2.2-to-v2.3",
    },
  },
  {
    version: "2.2.0",
    releaseDate: "2024-06-01",
    status: "supported",
    endOfLife: "2025-12-01",
    changes: {
      added: [
        "SRC-101 token support",
        "Collections endpoints",
        "Cursed stamps functionality",
      ],
      improved: [
        "Error handling and response formats",
        "Query parameter validation",
      ],
      fixed: [
        "Pagination limit enforcement",
        "SQL injection vulnerabilities",
      ],
      deprecated: [],
    },
  },
  {
    version: "2.1.0",
    releaseDate: "2024-01-01",
    status: "deprecated",
    endOfLife: "2025-06-01",
    changes: {
      added: [
        "Initial SRC-20 token endpoints",
        "Basic stamp management",
      ],
      improved: [],
      fixed: [],
      deprecated: [
        "Legacy stamp format endpoints",
      ],
    },
  },
];

export const handler: Handlers = {
  GET(_req, ctx) {
    // Version discovery endpoint
    const currentVersion: string =
      (typeof ctx.state.apiVersion === "string"
        ? ctx.state.apiVersion
        : null) ||
      VERSION_CONFIG.defaultVersion;

    const versions = VERSION_CONFIG.supportedVersions.map((version) => {
      const changelogEntry = CHANGELOG.find((entry) =>
        entry.version.startsWith(version)
      );
      const isDeprecated = VERSION_CONFIG.deprecatedVersions.includes(version);
      const endOfLife = VERSION_CONFIG.versionEndOfLife[version];

      return {
        version,
        status: version === VERSION_CONFIG.defaultVersion
          ? "current"
          : isDeprecated
          ? "deprecated"
          : "supported",
        releaseDate: changelogEntry?.releaseDate,
        endOfLife,
        changes: changelogEntry?.changes,
        links: {
          documentation: `/docs`,
          changelog: `/api/v2/versions/changelog#${version}`,
        },
      };
    });

    // Add deprecated versions to the list
    VERSION_CONFIG.deprecatedVersions.forEach((version: string) => {
      if (!versions.some((v) => v.version === version)) {
        const changelogEntry = CHANGELOG.find((entry) =>
          entry.version.startsWith(version)
        );
        versions.push({
          version,
          status: "deprecated",
          releaseDate: changelogEntry?.releaseDate,
          endOfLife: VERSION_CONFIG.versionEndOfLife[version],
          changes: changelogEntry?.changes,
          links: {
            documentation: `/docs`,
            changelog: `/api/v2/versions/changelog#${version}`,
          },
        });
      }
    });

    // Sort versions by version number descending
    versions.sort((a, b) => b.version.localeCompare(a.version));

    const response: any = {
      current: VERSION_CONFIG.defaultVersion,
      requestedVersion: currentVersion,
      versions,
      headers: {
        "API-Version": "Specify desired API version (e.g., '2.3')",
        "Accept-Version": "Alternative version header (e.g., '2.2')",
        "X-API-Version": "Legacy version header (e.g., '2.1')",
      },
      usage: {
        example: "curl -H 'X-API-Version: 2.2' /api/v2/stamps",
        note:
          "Use any of the above headers to specify API version. Documentation at /docs applies to all versions.",
      },
      links: {
        changelog: "/api/v2/versions/changelog",
        documentation: "/docs",
      },
    };

    // Add deprecation notice if using deprecated version
    if (VERSION_CONFIG.deprecatedVersions.includes(currentVersion)) {
      response.deprecationNotice = {
        message:
          `API version ${currentVersion} is deprecated and will be removed on ${
            VERSION_CONFIG.versionEndOfLife[currentVersion]
          }`,
        migrationGuide: `/docs`,
        currentVersion: VERSION_CONFIG.defaultVersion,
      };
    }

    return ApiResponseUtil.success(response, { routeType: RouteType.STATIC });
  },
};
