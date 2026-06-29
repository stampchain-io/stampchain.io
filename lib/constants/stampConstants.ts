/**
 * Stamp Constants for BTC Stamps Explorer
 * Runtime constants for stamp classifications, statuses, and protocol versions
 */

/**
 * Stamp type constants - aligned with actual application usage
 * These represent the different categories/types of stamps used throughout the application
 *
 * @example
 * ```typescript
 * import { STAMP_TYPES } from "$constants/stampConstants";
 *
 * // Use in API routes
 * const filterType = params.type || STAMP_TYPES.ALL;
 *
 * // Use in type checking
 * if (stampType === STAMP_TYPES.CURSED) {
 *   return getCursedStamps();
 * }
 * ```
 */
export const STAMP_TYPES = {
  /** All stamp types - no filtering */
  ALL: "all",
  /** Regular stamps - includes both STAMP and SRC-721 protocols */
  STAMPS: "stamps",
  /** Cursed stamps - violate protocol rules but are valid transactions */
  CURSED: "cursed",
  /** Classic stamps - early protocol compliant stamps */
  CLASSIC: "classic",
  /** Posh stamps - premium quality stamps */
  POSH: "posh",
  /** SRC-721 recursive stamps */
  SRC721: "src-721",
  /** SRC-20 images - for showing SRC-20 related imagery */
  SRC20: "src20",
} as const;

/**
 * Stamp type values as array for validation and iteration
 */
export const STAMP_TYPE_VALUES = Object.values(STAMP_TYPES);

/**
 * TypeScript type derived from the constants
 */
export type StampType = typeof STAMP_TYPES[keyof typeof STAMP_TYPES];

/**
 * Subset of stamp types used for block operations
 */
export const BLOCK_STAMP_TYPES = {
  ALL: STAMP_TYPES.ALL,
  STAMPS: STAMP_TYPES.STAMPS,
  CURSED: STAMP_TYPES.CURSED,
} as const;

/**
 * TypeScript type for block stamp operations
 */
export type BlockStampType =
  typeof BLOCK_STAMP_TYPES[keyof typeof BLOCK_STAMP_TYPES];

/**
 * Subset of stamp types used for handler operations
 */
export const HANDLER_STAMP_TYPES = {
  STAMPS: STAMP_TYPES.STAMPS,
  CURSED: STAMP_TYPES.CURSED,
} as const;

/**
 * TypeScript type for handler operations
 */
export type HandlerStampType =
  typeof HANDLER_STAMP_TYPES[keyof typeof HANDLER_STAMP_TYPES];

/**
 * Frontend-specific stamp types for UI filtering
 * Includes all, classic, posh, src-721 (recursive), and cursed
 */
export const FRONTEND_STAMP_TYPES = {
  ALL: STAMP_TYPES.ALL,
  CLASSIC: STAMP_TYPES.CLASSIC,
  CURSED: STAMP_TYPES.CURSED,
  POSH: STAMP_TYPES.POSH,
  SRC721: STAMP_TYPES.SRC721,
} as const;

export const FRONTEND_STAMP_TYPE_VALUES = Object.values(FRONTEND_STAMP_TYPES);

export type FrontendStampType =
  typeof FRONTEND_STAMP_TYPES[keyof typeof FRONTEND_STAMP_TYPES];

/**
 * API validation stamp types
 * Excludes meta types (all, stamps) but includes SRC-20 imagery
 */
export const API_STAMP_TYPES = {
  CLASSIC: STAMP_TYPES.CLASSIC,
  CURSED: STAMP_TYPES.CURSED,
  POSH: STAMP_TYPES.POSH,
  SRC20: STAMP_TYPES.SRC20,
} as const;

export const API_STAMP_TYPE_VALUES = Object.values(API_STAMP_TYPES);

export type APIStampType = typeof API_STAMP_TYPES[keyof typeof API_STAMP_TYPES];

// ============================================================================
// STAMP FILTER AND CLASSIFICATION CONSTANTS
// ============================================================================

/**
 * Stamp filter types for UI filtering and search
 */
export const STAMP_FILTER_TYPES = {
  PIXEL: "pixel",
  VECTOR: "vector",
  FOR_SALE: "for sale",
  TRENDING_SALES: "trending sales",
  SOLD: "sold",
  RECURSIVE: "recursive",
} as const;

export const STAMP_FILTER_TYPE_VALUES = Object.values(STAMP_FILTER_TYPES);
export type StampFilterType =
  typeof STAMP_FILTER_TYPES[keyof typeof STAMP_FILTER_TYPES];

/**
 * File suffix filters for stamp content types
 */
export const STAMP_SUFFIX_FILTERS = {
  GIF: "gif",
  JPG: "jpg",
  PNG: "png",
  WEBP: "webp",
  BMP: "bmp",
  JPEG: "jpeg",
  SVG: "svg",
  HTML: "html",
} as const;

export const STAMP_SUFFIX_FILTER_VALUES = Object.values(STAMP_SUFFIX_FILTERS);
export type StampSuffixFilter =
  typeof STAMP_SUFFIX_FILTERS[keyof typeof STAMP_SUFFIX_FILTERS];

/**
 * Marketplace filter types for trading interfaces
 */
export const STAMP_MARKETPLACE = {
  // Main market types
  LISTINGS: "listings",
  SALES: "sales",
  // Market sub-options
  DISPENSERS: "dispensers",
  ATOMICS: "atomics",
  // Listing price types
  ALL: "all", // Default - show all listings
  BARGAIN: "bargain", // <0.0025 BTC
  AFFORDABLE: "affordable", // 0.005-0.01 BTC
  PREMIUM: "premium", // >0.1 BTC
  // Sales types
  RECENT: "recent",
  VOLUME: "volume", // Maps to volume_24h_btc, volume_7d_btc, volume_30d_btc database fields
  // Shared options
  CUSTOM: "custom", // Custom price range
  // Unused filter types
  PSBT: "psbt", // aka "utxo bound"
} as const;

export const STAMP_MARKETPLACE_VALUES = Object.values(STAMP_MARKETPLACE);
export type StampMarketplace =
  typeof STAMP_MARKETPLACE[keyof typeof STAMP_MARKETPLACE];

/**
 * Stamp trading activity levels, computed by the btc_stamps indexer.
 * Thresholds: HOT <24h, WARM <7d, COOL <30d,
 * DORMANT = no recent sales but has open dispensers, COLD = no activity.
 */
export const STAMP_DISPENSER_ACTIVITY_LEVEL = {
  HOT: "HOT",
  WARM: "WARM",
  COOL: "COOL",
  DORMANT: "DORMANT",
  COLD: "COLD",
} as const;

export type StampDispenserActivityLevel = typeof STAMP_DISPENSER_ACTIVITY_LEVEL[
  keyof typeof STAMP_DISPENSER_ACTIVITY_LEVEL
];

/**
 * File type classifications for stamp content
 * Maps to StampTableV4.stamp_mimetype database field
 */
export const STAMP_FILETYPES = {
  JPG: "jpg", // Maps to 'image/jpeg'
  JPEG: "jpeg", // Grouped with jpg
  PNG: "png", // Maps to 'image/png'
  GIF: "gif", // Maps to 'image/gif'
  WEBP: "webp", // Maps to 'image/webp'
  AVIF: "avif", // Maps to 'image/avif'
  BMP: "bmp", // Maps to 'image/bmp'
  SVG: "svg", // Maps to 'image/svg+xml'
  HTML: "html", // Maps to 'text/html'
  TXT: "txt", // Maps to 'text/plain' - Unused in UI
  MP3: "mp3", // Maps to 'audio/mpeg'
  MPEG: "mpeg", // Grouped with mp3
  LEGACY: "legacy", // Maps to block_index < 833000
  OLGA: "olga", // Maps to block_index >= 833000
} as const;

export const STAMP_FILETYPE_VALUES = Object.values(STAMP_FILETYPES);
export type StampFiletype =
  typeof STAMP_FILETYPES[keyof typeof STAMP_FILETYPES];

/**
 * Stamp edition types based on supply and lock status
 * Maps to StampTableV4 database fields
 */
export const STAMP_EDITIONS = {
  SINGLE: "single", // Maps to supply = 1
  MULTIPLE: "multiple", // Maps to supply > 1
  LOCKED: "locked", // Maps to locked = 1
  UNLOCKED: "unlocked", // Maps to locked = 0
  DIVISIBLE: "divisible", // Maps to divisible = 1
} as const;

export const STAMP_EDITION_VALUES = Object.values(STAMP_EDITIONS);
export type StampEdition = typeof STAMP_EDITIONS[keyof typeof STAMP_EDITIONS];

/**
 * Stamp number range filters
 */
export const STAMP_RANGES = {
  RANGE_100: "100", // stamp < 100
  RANGE_1000: "1000", // stamp < 1000
  RANGE_5000: "5000", // stamp < 5000
  RANGE_10000: "10000", // stamp < 10000
  RANGE_500000: "500000", // stamp < 500,000
  RANGE_1000000: "1000000", // stamp < 1,000,000
  CUSTOM: "custom", // User-defined range
} as const;

export const STAMP_RANGE_VALUES = Object.values(STAMP_RANGES);
export type StampRange = typeof STAMP_RANGES[keyof typeof STAMP_RANGES];

/**
 * File size range filters for stamp content
 */
export const STAMP_FILESIZES = {
  UNDER_1KB: "<1kb", // < 1,024 bytes
  KB_1_TO_7: "1kb-7kb", // 1,024 - 7,168 bytes
  KB_7_TO_32: "7kb-32kb", // 7,168 - 32,768 bytes
  KB_32_TO_64: "32kb-64kb", // 32,768 - 65,536 bytes
  CUSTOM: "custom", // User-defined range
} as const;

export const STAMP_FILESIZE_VALUES = Object.values(STAMP_FILESIZES);
export type StampFilesize =
  typeof STAMP_FILESIZES[keyof typeof STAMP_FILESIZES];

/**
 * Stamp classification enum for type validation and domain logic
 * Contains only the core classification values (no meta-types)
 * For filtering/routing use STAMP_TYPES constants instead
 */
export enum StampClassification {
  /** Cursed stamps - violate protocol rules but are still have stamp: prefix */
  CURSED = "cursed",
  /** Classic stamps - early stamps before certain protocol updates */
  CLASSIC = "classic",
  /** Posh stamps - premium or high-quality stamps */
  POSH = "posh",
}

/**
 * Stamp validation status enumeration
 * Represents the validation state of a stamp according to protocol rules
 */
export enum StampValidationStatus {
  /** Stamp is valid according to all protocol rules */
  VALID = "valid",
  /** Stamp is invalid but still recorded on blockchain */
  INVALID = "invalid",
  /** Stamp validation is pending or incomplete */
  PENDING = "pending",
  /** Stamp validation failed due to technical issues */
  ERROR = "error",
}

/**
 * Stamp rarity classification based on various factors
 */
export enum StampRarity {
  /** Common stamps with high supply or frequency */
  COMMON = "common",
  /** Uncommon stamps with moderate scarcity */
  UNCOMMON = "uncommon",
  /** Rare stamps with low supply or unique properties */
  RARE = "rare",
  /** Epic stamps with very low supply or special significance */
  EPIC = "epic",
  /** Legendary stamps with extreme rarity or historical importance */
  LEGENDARY = "legendary",
}

/**
 * Stamp status enumeration for tracking lifecycle
 */
export enum StampStatus {
  /** Stamp is being created/minted */
  CREATING = "creating",
  /** Stamp creation is pending confirmation */
  PENDING = "pending",
  /** Stamp is confirmed and active */
  CONFIRMED = "confirmed",
  /** Stamp has been transferred */
  TRANSFERRED = "transferred",
  /** Stamp is listed for sale */
  LISTED = "listed",
  /** Stamp has been sold */
  SOLD = "sold",
  /** Stamp is locked or frozen */
  LOCKED = "locked",
}

/**
 * Stamp transaction type enumeration
 */
export enum StampTransactionType {
  /** Stamp creation transaction */
  CREATION = "creation",
  /** Stamp transfer transaction */
  TRANSFER = "transfer",
  /** Stamp burn/destroy transaction */
  BURN = "burn",
  /** Stamp update/modification transaction */
  UPDATE = "update",
}

/**
 * Stamp protocol version enumeration
 */
export enum StampProtocolVersion {
  /** Initial protocol version */
  V1_0 = "1.0",
  /** Enhanced validation rules */
  V1_1 = "1.1",
  /** Cursed stamps support */
  V2_0 = "2.0",
  /** Current version with full feature set */
  V2_1 = "2.1",
  /** Development/beta version */
  BETA = "beta",
}

/**
 * Protocol compliance level constants for stamp validation
 * Indicates the degree of adherence to protocol standards
 */
export enum ProtocolComplianceLevel {
  /** Full compliance with all protocol specifications */
  FULL = "full",
  /** Mostly compliant with minor deviations */
  PARTIAL = "partial",
  /** Significant deviations from protocol standards */
  LIMITED = "limited",
  /** Major violations, may not function correctly */
  MINIMAL = "minimal",
  /** Non-compliant, protocol violations */
  NONE = "none",
}

/**
 * Stamp error codes for validation and processing errors
 */
export enum StampErrorCode {
  STAMP_NOT_FOUND = "STAMP_NOT_FOUND",
  INVALID_STAMP_DATA = "STAMP_INVALID_STAMP_DATA",
  INVALID_CPID = "STAMP_INVALID_CPID",
  STAMP_ALREADY_EXISTS = "STAMP_ALREADY_EXISTS",
  INVALID_CREATOR = "STAMP_INVALID_CREATOR",
  INVALID_SUPPLY = "STAMP_INVALID_SUPPLY",
  INVALID_DIVISIBILITY = "STAMP_INVALID_DIVISIBILITY",
  INVALID_LOCK_STATUS = "STAMP_INVALID_LOCK_STATUS",
  INVALID_MEDIA_TYPE = "STAMP_INVALID_MEDIA_TYPE",
  MEDIA_TOO_LARGE = "STAMP_MEDIA_TOO_LARGE",
  INVALID_BASE64 = "STAMP_INVALID_BASE64",
}
