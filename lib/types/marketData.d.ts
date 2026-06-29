import type { StampDispenserActivityLevel } from "$constants";
import type { CollectionRow } from "$server/types/collection.d.ts";
import type { SRC20Row } from "$types/src20.d.ts";
import type { StampRow } from "$types/stamp.d.ts";
import type { MarketDataCacheInfo } from "$types/utils.d.ts";

// Re-export for other modules
export type { MarketDataCacheInfo, SRC20Row, StampRow };

export interface MarketListingSummary {
  tick: string;
  floor_price_btc: number | null; // ✅ v2.3 standardized field
  market_cap_btc: number; // ✅ v2.3 standardized field
  volume_7d_btc: number | null; // ✅ v2.3 extended field (was sum_7d)
  volume_3d_btc: number | null; // ✅ v2.3 extended field (was sum_3d)
  volume_24h_btc: number | null; // ✅ v2.3 standardized field (was sum_1d)
  stamp_url: string | null;
  tx_hash: string;
  holder_count: number;
}

export interface OpenStampMarketData {
  tokenId: number;
  name: string; // emoji tick
  totalSupply: number;
  holdersCount: number;
  price: string; // in satoshis
  amount24: string;
  volume_24h_btc: string; // ✅ v2.3 standardized field (was volume24, in satoshis)
  volume_24h_change: string; // ✅ v2.3 standardized field (was volume24Change)
  change_24h: string; // ✅ v2.3 standardized field (was change24)
  change_7d: string; // ✅ v2.3 standardized field (was change7d)
  isOpen?: boolean; // Added optional flag for market status
}

export interface StampScanMarketData {
  tick: string; // emoji tick
  floor_price_btc: number | null; // ✅ v2.3 standardized field (was floor_unit_price)
  market_cap_btc: number; // ✅ v2.3 standardized field (was mcap)
  volume_7d_btc: number | null; // ✅ v2.3 extended field (was sum_7d)
  volume_3d_btc: number | null; // ✅ v2.3 extended field (was sum_3d)
  volume_24h_btc: number | null; // ✅ v2.3 standardized field (was sum_1d)
  stamp_url: string | null;
  tx_hash: string;
  holder_count: number;
}

export interface MarketListingAggregated {
  tick: string;
  price_btc?: number | null; // ✅ v2.3 field for fungible SRC-20 tokens
  floor_price_btc: number | null; // ✅ v2.3 standardized field (for NFTs, lower of stampscan/openstamp)
  market_cap_btc: number; // ✅ v2.3 standardized field (computed on lower price * totalSupply)
  volume_24h_btc: number; // ✅ v2.3 standardized field (sum of volumes)
  volume_7d_btc?: number; // ✅ v2.3 extended field
  volume_30d_btc?: number; // ✅ v2.3 extended field
  change_24h_percent?: number | undefined; // ✅ v2.3 standardized field (24h price change percentage)
  change_7d?: number | undefined; // ✅ v2.3 standardized field (7d price change percentage)
  stamp_url?: string | null;
  tx_hash: string;
  holder_count: number; // use stampscan holder_count value

  // Added to match MarketDataFields
  price_change_24h_percent?: number; // Added to match MarketDataFields
  data_quality_score?: number; // Added to match MarketDataFields
  last_updated?: Date; // Added to match MarketDataFields

  // New market status field
  isOpen?: boolean; // Optional flag to indicate market status

  // 🔄 BACKWARD COMPATIBILITY: Legacy field names (DEPRECATED - use standardized names above)
  floor_unit_price?: number | null; // @deprecated Use floor_price_btc
  mcap?: number; // @deprecated Use market_cap_btc
  volume24?: number; // @deprecated Use volume_24h_btc
  change_24h?: number | undefined; // @deprecated Use change_24h_percent
  change24?: number | undefined; // @deprecated Use change_24h_percent

  market_data: {
    stampscan?: {
      price: number | null; // floor_price_btc
      volume_24h_btc: number | null; // ✅ v2.3 standardized field (was volume24)
    } | null;
    openstamp?: {
      price: number | null; // price
      volume_24h_btc: number | null; // ✅ v2.3 standardized field (was volume24)
    } | null;
  } | null;
}

/**
 * Standardized market data status for fetch operations
 */
export type MarketDataStatusValue = "loading" | "success" | "error" | "stale";

export interface MarketDataStatus {
  status: MarketDataStatusValue;
  message?: string;
  timestamp?: number;
}

/**
 * Database row interface for stamp_market_data table
 * All DECIMAL columns are represented as strings to preserve precision
 */
export interface StampMarketDataRow {
  cpid: string;
  floor_price_btc: string | null;
  recent_sale_price_btc: string | null;
  open_dispensers_count: number;
  closed_dispensers_count: number;
  total_dispensers_count: number;
  holder_count: number;
  unique_holder_count: number;
  top_holder_percentage: string;
  holder_distribution_score: string;
  volume_24h_btc: string;
  volume_7d_btc: string;
  volume_30d_btc: string;
  total_volume_btc: string;
  price_source: string | null;
  volume_sources: string | null; // JSON string
  data_quality_score: string;
  confidence_level: string;
  last_updated: Date;
  last_price_update: Date | null;
  update_frequency_minutes: number;
  // New transaction detail fields
  last_sale_tx_hash: string | null;
  last_sale_buyer_address: string | null;
  last_sale_dispenser_address: string | null;
  last_sale_btc_amount: string | null; // BIGINT stored as string (satoshis)
  last_sale_dispenser_tx_hash: string | null;
  last_sale_block_index: number | null;
  // Activity tracking fields
  activity_level: StampDispenserActivityLevel | null;
  last_activity_time: number | null; // Unix timestamp
}

/**
 * Database row interface for src20_market_data table
 * All DECIMAL columns are represented as strings to preserve precision
 */
export interface SRC20MarketDataRow {
  tick: string;
  price_btc: string | null;
  price_usd: string | null;
  floor_price_btc: string | null;
  market_cap_btc: string;
  market_cap_usd: string;
  volume_24h_btc: string;
  volume_7d_btc: string;
  volume_30d_btc: string;
  total_volume_btc: string;
  holder_count: number;
  circulating_supply: string;
  price_change_24h_percent: string;
  price_change_7d_percent: string;
  price_change_30d_percent: string;
  primary_exchange: string | null;
  exchange_sources: string | null; // JSON string
  data_quality_score: string;
  last_updated: Date;
}

/**
 * Database row interface for collection_market_data table
 * Actual columns: collection_id (BINARY(16)), floor_price_btc, avg_price_btc,
 * total_value_btc, volume_24h_btc, volume_7d_btc, volume_30d_btc, total_volume_btc,
 * total_stamps, unique_holders, listed_stamps, sold_stamps_24h, last_updated, created_at
 */
export interface CollectionMarketDataRow {
  collection_id: string;
  floor_price_btc: string | null;
  avg_price_btc: string | null;
  total_value_btc: string | null;
  volume_24h_btc: string;
  volume_7d_btc: string;
  volume_30d_btc: string;
  total_volume_btc: string;
  total_stamps: number;
  unique_holders: number;
  listed_stamps: number;
  sold_stamps_24h: number;
  last_updated: Date;
  created_at: Date;
}

/**
 * Parsed interfaces for application use
 * These convert database string values to appropriate types
 */
export interface StampMarketData {
  cpid: string;
  floorPriceBTC: number | null;
  recentSalePriceBTC: number | null;
  lastPriceBTC: number; // Calculated best price (fallback hierarchy: floorPriceBTC > recentSalePriceBTC > defaults)
  walletValueBTC: number; // Total portfolio value (quantity × lastPriceBTC)
  openDispensersCount: number;
  closedDispensersCount: number;
  totalDispensersCount: number;
  holderCount: number;
  uniqueHolderCount: number;
  topHolderPercentage: number;
  holderDistributionScore: number; // 0-100
  volume24hBTC: number;
  volume7dBTC: number;
  volume30dBTC: number;
  totalVolumeBTC: number;
  priceSource: string | null;
  volumeSources: Record<string, number> | null;
  dataQualityScore: number; // 0-10
  confidenceLevel: number; // 0-10
  lastUpdated: Date;
  lastPriceUpdate: Date | null;
  updateFrequencyMinutes: number;
  // New transaction detail fields
  lastSaleTxHash: string | null;
  lastSaleBuyerAddress: string | null;
  lastSaleDispenserAddress: string | null;
  lastSaleBtcAmount: number | null; // Converted from satoshis to BTC
  lastSaleDispenserTxHash: string | null;
  lastSaleBlockIndex: number | null;
  // Activity tracking fields
  activityLevel: StampDispenserActivityLevel | null;
  lastActivityTime: number | null; // Unix timestamp
}

export interface SRC20MarketData {
  tick: string;
  priceBTC: number | null;
  priceUSD: number | null;
  floorPriceBTC: number | null;
  marketCapBTC: number;
  marketCapUSD: number;
  volume24hBTC: number;
  volume7dBTC: number;
  volume30dBTC: number;
  totalVolumeBTC: number;
  holderCount: number;
  circulatingSupply: string;
  priceChange24hPercent: number;
  priceChange7dPercent: number;
  priceChange30dPercent: number;
  primaryExchange: string | null;
  exchangeSources: string[] | null;
  dataQualityScore: number;
  lastUpdated: Date;
}

export interface CollectionMarketData {
  collectionId: string;
  floorPriceBTC: number | null;
  avgPriceBTC: number | null;
  totalValueBTC: number;
  volume24hBTC: number;
  volume7dBTC: number;
  volume30dBTC: number;
  totalVolumeBTC: number;
  totalStamps: number;
  uniqueHolders: number;
  listedStamps: number;
  soldStamps24h: number;
  lastUpdated: Date;
}

/**
 * Database row interface for stamp_holder_cache table
 * Stores detailed holder information for individual stamps
 */
export interface StampHolderCacheRow {
  id: number;
  cpid: string;
  address: string;
  quantity: string; // DECIMAL(20,8) stored as string
  percentage: string; // DECIMAL(5,2) stored as string
  rank_position: number;
  last_updated: Date;
}

/**
 * Database row interface for market_data_sources table
 * Tracks market data from multiple sources for transparency
 */
export interface MarketDataSourcesRow {
  id: number;
  asset_type: "stamp" | "src20";
  asset_id: string; // cpid for stamps, tick for src20
  source: string; // 'counterparty', 'openstamp', 'kucoin', etc.
  price_btc: string | null; // DECIMAL(16,8)
  price_usd: string | null; // DECIMAL(16,2)
  volume_24h_btc: string; // DECIMAL(16,8)
  holder_count: number;
  market_cap_btc: string; // DECIMAL(20,8)
  source_confidence: string; // DECIMAL(3,1) - 0-10 confidence score
  api_response_time_ms: number;
  last_updated: Date;
}

/**
 * Parsed interface for stamp holder cache
 * Used in application logic with proper types
 */
export interface StampHolderCache {
  id: number;
  cpid: string;
  address: string;
  quantity: number;
  percentage: number;
  rankPosition: number;
  lastUpdated: Date;
}

/**
 * Parsed interface for market data sources
 * Used for source tracking and data quality assessment
 */
export interface MarketDataSource {
  id: number;
  assetType: "stamp" | "src20";
  assetId: string;
  source: string;
  priceBTC: number | null;
  priceUSD: number | null;
  volume24hBTC: number;
  holderCount: number;
  marketCapBTC: number;
  sourceConfidence: number; // 0-10
  apiResponseTimeMs: number;
  lastUpdated: Date;
}

/**
 * Cache status type for indicating data freshness
 */
export type CacheStatus = "fresh" | "stale" | "expired";

/**
 * Volume sources type for parsed JSON data
 */
export type VolumeSources = Record<string, number>;

/**
 * Exchange sources type for parsed JSON data
 */
export type ExchangeSources = string[];

/**
 * Price data interface for market data
 * Represents pricing information for an asset
 */
export interface PriceData {
  /** Price in BTC */
  priceBTC: number | null;
  /** Price in USD */
  priceUSD: number | null;
  /** Timestamp of the price */
  timestamp: number;
  /** Source of the price data */
  source: string;
  /** Confidence level of the price data (0-10) */
  confidence?: number;
}

/**
 * Volume data interface for market data
 * Represents trading volume information for an asset
 */
export interface VolumeData {
  /** Volume in BTC over 24 hours */
  volume24hBTC: number;
  /** Volume in BTC over 7 days */
  volume7dBTC: number;
  /** Volume in BTC over 30 days */
  volume30dBTC: number;
  /** Timestamp of the volume data */
  timestamp: number;
  /** Source of the volume data */
  source: string;
  /** Confidence level of the volume data (0-10) */
  confidence?: number;
}

/**
 * Interface for market data providers
 * Defines standard methods for retrieving market data
 */
export interface MarketDataProvider {
  /**
   * Retrieve price data for a specific asset
   * @param asset Asset identifier (ticker, CPID, etc.)
   */
  getPrice(asset: string): Promise<PriceData>;

  /**
   * Retrieve market data for a specific asset
   * @param asset Asset identifier (ticker, CPID, etc.)
   */
  getMarketData(asset: string): Promise<StampMarketData | SRC20MarketData>;

  /**
   * Retrieve trading volume data
   * @param asset Asset identifier (ticker, CPID, etc.)
   */
  getVolume(asset: string): Promise<VolumeData>;

  /**
   * Get the name of the market data provider
   */
  getName(): string;

  /**
   * Check if the provider is currently available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Extended stamp interface that includes market data
 * Used when joining stamps with market data cache
 */
export interface StampWithMarketData extends StampRow {
  marketData?: StampMarketData | null;
  marketDataMessage?: string | null;
  cacheStatus?: CacheStatus | null;
  cacheAgeMinutes?: number | null;
  overallStatus?: MarketDataStatus | null;
}

/**
 * Extended SRC20 interface that includes market data
 * Used when joining SRC20 tokens with market data cache
 */
export interface SRC20WithMarketData extends SRC20Row {
  marketData?: SRC20MarketData | null;
  marketDataMessage?: string | null;
  cacheStatus?: CacheStatus | null;
  cacheAgeMinutes?: number | null;
  overallStatus?: MarketDataStatus | null;
}

/**
 * API response interface for stamp with market data
 * Used for REST API responses
 */
export interface StampMarketDataResponse {
  stamp: StampRow;
  marketData?: StampMarketData | null;
  cacheStatus?: CacheStatus | null;
  message?: string | null;
  overallStatus?: MarketDataStatus | null;
}

/**
 * API response interface for SRC20 with market data
 * Used for REST API responses
 */
export interface SRC20MarketDataResponse {
  token: SRC20Row;
  marketData?: SRC20MarketData | null;
  cacheStatus?: CacheStatus | null;
  message?: string | null;
  overallStatus?: MarketDataStatus | null;
}

/**
 * Collection stamps with aggregated market data
 */
export interface CollectionWithMarketData {
  collection: CollectionRow;
  stamps?: StampWithMarketData[] | null;
  aggregatedMarketData?: CollectionMarketData | null;
}

/**
 * Enhanced recent sales data structure
 */
export interface RecentSaleData {
  // Stamp information
  cpid: string;
  stamp: number;
  stampUrl: string;
  stampMimetype: string;
  creator: string;
  creatorName?: string;

  // Sale transaction details
  sale: {
    priceBtc: number;
    priceUsd: number;
    timestamp: string;
    timeAgo: string;
    txHash: string;
    buyerAddress: string;
    dispenserAddress?: string;
    btcAmountSatoshis: number;
    blockNumber: number;
    dispenserTxHash?: string;
  };
}

/**
 * API response for enhanced recent sales
 */
export interface RecentSalesResponse {
  recentSales: RecentSaleData[];
  total: number;
  btc_price_usd: number;
  metadata: {
    day_range: number;
    last_updated: string;
  };
}

/**
 * Enhanced stamp interface with sale data for backward compatibility
 */
export interface StampWithEnhancedSaleData extends StampRow {
  sale_data?: {
    btc_amount: number;
    block_index: number;
    tx_hash: string;
    buyer_address?: string;
    dispenser_address?: string;
    time_ago?: string;
    btc_amount_satoshis?: number;
    dispenser_tx_hash?: string;
  };
  marketData?: StampMarketData;
  activity_level?: StampDispenserActivityLevel;
  last_activity_time?: number;
}
