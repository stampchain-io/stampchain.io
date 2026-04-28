import { Handlers } from "$fresh/server.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";
import { VERSION_CONFIG } from "$server/middleware/apiVersionMiddleware.ts";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

/**
 * API Version Changelog Endpoint
 *
 * GET /api/v2/versions/changelog - Returns version changelog
 */

const CHANGELOG = [
  {
    version: "2.3.0",
    releaseDate: "2025-01-15",
    status: "current",
    changes: {
      added: [
        "marketData object with floor price and volume information",
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
        "Enhanced stamps balance endpoint (/api/v2/stamps/balance/{address}) with optional advanced features via enhanced=true parameter",
        "sortBy parameter for enhanced stamps balance with options: value_desc, value_asc, quantity_desc, quantity_asc, stamp_desc, stamp_asc, recent_desc, recent_asc",
        "Individual stamp values and unit prices in enhanced stamp balance responses",
        "Market data integration with bulk optimization for better performance",
        "UTXO attachment information for stamp balance responses",
        "Enhanced SRC20 balance endpoints (/api/v2/src20/balance/{address} and /api/v2/src20/balance/{address}/{tick}) with optional market data enrichment via includeMarketData=true parameter",
        "Market data fields in SRC20 balance responses: floor_unit_price, market_cap, volume24, change24, and nested market_data_sources object with detailed pricing information from stampscan and openstamp sources",
        "Backward compatible SRC20 balance API - existing clients receive unchanged responses, new clients can opt-in to enhanced market data",
        "HOLDERS_DESC and HOLDERS_ASC sortBy parameters for SRC-20 endpoints to sort tokens by holder count (requires includeMarketData=true)",
        "Enhanced SRC-20 sorting capabilities: ASC/DESC for deploy date, HOLDERS for holder count",
        "Comprehensive SRC-20 sortBy parameters following stamps pattern for consistency: MARKET_CAP, VALUE/PRICE, VOLUME_24H/7D/30D, CHANGE_24H/7D, SUPPLY, PROGRESS, LIMIT, DECIMALS, DEPLOY/BLOCK, RECENT, TICK, CREATOR - all with _DESC/_ASC variants",
        "CRITICAL: Operation-specific sortBy restrictions - DEPLOY operations support all sorting options, MINT/TRANSFER operations limited to basic/activity/alphabetical sorting only",
        "Market data and token metrics sorting (MARKET_CAP, HOLDERS, SUPPLY, PROGRESS, etc.) only available for DEPLOY operations - returns validation error for MINT/TRANSFER",
        "SUPPLY_DESC/SUPPLY_ASC now uses numeric sorting (CAST AS UNSIGNED) instead of alphabetical string sorting for correct results",
        "Activity sorting (DEPLOY, RECENT, BLOCK) and alphabetical sorting (TICK, CREATOR) available for all queries",
        "fee_rate_sat_vb field in transaction-related endpoints with improved fee calculation logic (fee = total_inputs - total_outputs)",
        "API-Version header support for all SRC-20 endpoints (consistent with stamps endpoints)",
        "PaginatedSrc20WithMarketDataResponseBody schema for proper v2.3 market data structure",
        "Frontend components updated with X-API-Version: 2.3 headers for all SRC20 API calls",
        "Schema validation improvements ensuring consistent API versioning across all endpoints",
        "market_data_sources field in SRC20 responses containing detailed pricing data from multiple exchanges (stampscan, openstamp) with consistent snake_case naming for API compatibility",
        "mintingStatus query parameter for simplified token filtering: 'all' (default), 'minting' (progress < 100%), or 'minted' (progress = 100%)",
        "Replaced onlyMintable and onlyFullyMinted boolean parameters with single mintingStatus enum parameter for cleaner API design",
        "price_btc field in market_data object for fungible SRC-20 tokens (replacing NFT-oriented floor_price_btc)",
        "SQL-level filtering for mintingStatus parameter using src20_market_data.progress_percentage for optimal performance",
        "total_mints field in mint_progress object showing count of MINT transactions (not to be confused with total_minted which is sum of amounts)",
        "price_source_type field in market_data object indicating price data source: 'last_traded' (KuCoin/StampScan), 'floor_ask' (OpenStamp), 'composite' (weighted average), or 'unknown'",
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
        "OpenAPI schema consistency with proper oneOf patterns for v2.2/v2.3 response variations",
        "SRC-20 and Stamps endpoint parity with unified API versioning approach",
        "Frontend component reliability with consistent X-API-Version header implementation",
        "Market data enrichment architecture by consolidating redundant code paths into single service for SRC20 endpoints",
        "✅ Field naming consistency across all market data structures using snake_case convention for consistency with stamp API patterns",
        "✅ SRC20 market data completeness - All endpoints now include volume_7d_btc and volume_30d_btc for comprehensive trading analysis",
        "✅ API version middleware reliability - v2.2 requests now properly exclude market_data fields for backward compatibility",
      ],
      optimized: [
        "stamp_base64 field is now excluded from list endpoints for 50-70% smaller responses",
        "stamp_base64 remains available in single stamp detail endpoints (/stamps/[identifier])",
        "SRC20 market data enrichment by eliminating duplicate code paths and consolidating to single MarketDataEnrichmentService",
        "Field naming consistency removes confusion between snake_case and camelCase in nested market data objects",
        "✅ Balance endpoint normalization - Now uses standardized MarketDataEnrichmentService with complete v2.3 field structure including extended volume timeframes",
      ],
      fixed: [
        "Fee field scope clarification - fee_rate_sat_vb and fee fields now properly limited to transaction-specific endpoints only",
        "OpenAPI schema validation errors in path parameter definitions",
        "Market data schema inconsistencies between SRC-20 and Stamps endpoints",
        "✅ CRITICAL: SRC20 market_data field standardization - Unified snake_case naming across all endpoints for consistency with stamp API patterns",
        "✅ BREAKING: Field name changes for consistency: floor_unit_price → floor_price_btc, mcap → market_cap_btc, volume24 → volume_24h_btc",
        "✅ ENHANCED: Added missing volume timeframes - volume_7d_btc and volume_30d_btc now included in all SRC20 market_data responses",
        "✅ MIDDLEWARE: Fixed v2.2 API middleware to properly strip market_data field (was using incorrect camelCase 'marketData' instead of 'market_data')",
        "Eliminated redundant market data enrichment code paths in SRC20 services to ensure single source of truth",
        "Newman API test validation updated to expect standardized field names and comprehensive volume timeframes",
      ],
      deprecated: [
        "🚫 /api/v2/cursed endpoint - Use /api/v2/stamps?type=cursed instead for better filtering and consistency",
        "All /api/v2/cursed/* sub-endpoints - Replaced by /api/v2/stamps with type=cursed filter parameter",
      ],
      removed: [
        "floorPrice, floorPriceUSD, marketCapUSD moved into marketData object in stamp detail endpoints",
        "❌ DEPRECATED: Old field names floor_unit_price, mcap, volume24 - Use standardized snake_case equivalents",
      ],
      notes: [
        "📊 Market Data Coverage: 25.2% of tokens have price data, 93.1% have holder data, 18.2% have volume data",
        "✅ COMPLETED: Balance endpoints normalized to use standardized MarketDataEnrichmentService with complete v2.3 field structure",
        "🔄 Migration: Update client code to use new field names: floor_price_btc, market_cap_btc, volume_24h_btc, volume_7d_btc, volume_30d_btc",
        "✅ Backward Compatibility: v2.2 API continues to work without market_data fields via X-API-Version header",
        "🚀 Performance: Balance endpoints benefit from 93% performance improvement through cached market data infrastructure",
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
  GET(_req, _ctx) {
    return ApiResponseUtil.success({
      changelog: CHANGELOG,
      currentVersion: VERSION_CONFIG.defaultVersion,
      deprecationPolicy: {
        notice: "6 months",
        support: "12 months after deprecation",
      },
    }, { routeType: RouteType.STATIC });
  },
};
