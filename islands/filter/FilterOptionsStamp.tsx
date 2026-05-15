import type {
  FrontendStampType,
  StampEdition,
  StampFilesize,
  StampFiletype,
  StampMarketplace,
  StampRange,
} from "$constants";
import { FRONTEND_STAMP_TYPE_VALUES } from "$constants";

export type StampFilters = {
  // Stamp Type Filter (NEW!)
  stampType: FrontendStampType;

  // Market Place filters
  market: Extract<StampMarketplace, "listings" | "sales"> | "";

  // LISTINGS options
  dispensers: boolean;
  atomics: boolean;

  // Listings price range
  listings:
    | Extract<
      StampMarketplace,
      "all" | "bargain" | "affordable" | "premium" | "custom"
    >
    | "";
  listingsMin: string;
  listingsMax: string;

  // SALES options
  sales:
    | Extract<StampMarketplace, "recent" | "premium" | "custom" | "volume">
    | "";
  salesMin: string;
  salesMax: string;

  // Volume (for trending sales)
  volume: "24h" | "7d" | "30d" | "";
  volumeMin: string; // Minimum volume in BTC
  volumeMax: string; // Maximum volume in BTC

  // Other existing filters
  fileType: StampFiletype[];
  fileSize: StampFilesize | null;
  fileSizeMin: string;
  fileSizeMax: string;
  editions: StampEdition[];
  range: StampRange | null;
  rangeMin: string;
  rangeMax: string;

  // Market Data Filters (Task 42)
  minHolderCount: string;
  maxHolderCount: string;
  minDistributionScore: string;
  maxTopHolderPercentage: string;
  minFloorPriceBTC: string;
  maxFloorPriceBTC: string;
  minVolume24h: string;
  minPriceChange24h: string;
  minDataQualityScore: string;
  maxCacheAgeMinutes: string;
  priceSource: string;

  [key: string]: any; // Keep index signature for flexibility
};

export const defaultFilters: StampFilters = {
  stampType: "all",
  market: "",
  dispensers: false,
  atomics: false,
  listings: "",
  listingsMin: "",
  listingsMax: "",
  sales: "",
  salesMin: "",
  salesMax: "",
  volume: "",
  volumeMin: "",
  volumeMax: "",
  fileType: [],
  fileSize: null,
  fileSizeMin: "",
  fileSizeMax: "",
  editions: [],
  range: null,
  rangeMin: "",
  rangeMax: "",
  // Market Data Filters (Task 42)
  minHolderCount: "",
  maxHolderCount: "",
  minDistributionScore: "",
  maxTopHolderPercentage: "",
  minFloorPriceBTC: "",
  maxFloorPriceBTC: "",
  minVolume24h: "",
  minPriceChange24h: "",
  minDataQualityScore: "",
  maxCacheAgeMinutes: "",
  priceSource: "",
};

export function filtersToQueryParams(
  search: string,
  filters: StampFilters,
) {
  const queryParams = new URLSearchParams(search);

  // STAMP TYPE
  if (filters.stampType && filters.stampType !== "all") {
    queryParams.set("type", filters.stampType);
  } else {
    queryParams.delete("type"); // Default to all (no type param needed)
  }

  // MARKET TYPE
  if (filters.market) {
    queryParams.set("market", filters.market);
  } else {
    queryParams.delete("market");
  }

  // DISPENSERS & ATOMICS
  if (filters.dispensers) {
    queryParams.set("dispensers", "true");
  } else {
    queryParams.delete("dispensers");
  }

  if (filters.atomics) {
    queryParams.set("atomics", "true");
  } else {
    queryParams.delete("atomics");
  }

  // LISTINGS
  if (filters.listings) {
    queryParams.set("listings", filters.listings);
  } else {
    queryParams.delete("listings");
  }

  if (filters.listings === "custom" && filters.listingsMin) {
    queryParams.set("listingsMin", filters.listingsMin);
  } else {
    queryParams.delete("listingsMin");
  }

  if (filters.listings === "custom" && filters.listingsMax) {
    queryParams.set("listingsMax", filters.listingsMax);
  } else {
    queryParams.delete("listingsMax");
  }

  // SALES
  if (filters.sales) {
    queryParams.set("sales", filters.sales);
  } else {
    queryParams.delete("sales");
  }

  if (filters.sales === "custom" && filters.salesMin) {
    queryParams.set("salesMin", filters.salesMin);
  } else {
    queryParams.delete("salesMin");
  }

  if (filters.sales === "custom" && filters.salesMax) {
    queryParams.set("salesMax", filters.salesMax);
  } else {
    queryParams.delete("salesMax");
  }

  // VOLUME
  if (filters.volume) {
    queryParams.set("volume", filters.volume);
  } else {
    queryParams.delete("volume");
  }

  if (filters.volumeMin) {
    queryParams.set("volumeMin", filters.volumeMin);
  } else {
    queryParams.delete("volumeMin");
  }

  if (filters.volumeMax) {
    queryParams.set("volumeMax", filters.volumeMax);
  } else {
    queryParams.delete("volumeMax");
  }

  // FILETYPE
  if (filters.fileType.length > 0) {
    // Convert 'jpg' to 'jpeg' and 'mp3' to 'mpeg' in the URL parameters
    const fileTypes = filters.fileType.map((type) => {
      if (type === "jpg") return "jpeg";
      if (type === "mp3") return "mpeg";
      return type;
    });
    queryParams.set("filetype", fileTypes.join(","));
  } else {
    queryParams.delete("filetype");
  }

  // FILE SIZE
  if (filters.fileSize) {
    queryParams.set("fileSize", filters.fileSize);
  } else {
    queryParams.delete("fileSize");
  }

  if (filters.fileSizeMin) {
    queryParams.set("fileSizeMin", filters.fileSizeMin);
  } else {
    queryParams.delete("fileSizeMin");
  }

  if (filters.fileSizeMax) {
    queryParams.set("fileSizeMax", filters.fileSizeMax);
  } else {
    queryParams.delete("fileSizeMax");
  }

  // EDITIONS
  if (filters.editions.length > 0) {
    queryParams.set("editions", filters.editions.join(","));
  } else {
    queryParams.delete("editions");
  }

  // RANGE (flattened structure)
  if (filters.range) {
    queryParams.set("range", filters.range);
  } else {
    queryParams.delete("range");
  }

  if (filters.rangeMin) {
    queryParams.set("rangeMin", filters.rangeMin);
  } else {
    queryParams.delete("rangeMin");
  }

  if (filters.rangeMax) {
    queryParams.set("rangeMax", filters.rangeMax);
  } else {
    queryParams.delete("rangeMax");
  }

  // MARKET DATA FILTERS (Task 42)
  if (filters.minHolderCount) {
    queryParams.set("minHolderCount", filters.minHolderCount);
  } else {
    queryParams.delete("minHolderCount");
  }

  if (filters.maxHolderCount) {
    queryParams.set("maxHolderCount", filters.maxHolderCount);
  } else {
    queryParams.delete("maxHolderCount");
  }

  if (filters.minDistributionScore) {
    queryParams.set("minDistributionScore", filters.minDistributionScore);
  } else {
    queryParams.delete("minDistributionScore");
  }

  if (filters.maxTopHolderPercentage) {
    queryParams.set("maxTopHolderPercentage", filters.maxTopHolderPercentage);
  } else {
    queryParams.delete("maxTopHolderPercentage");
  }

  if (filters.minFloorPriceBTC) {
    queryParams.set("minFloorPriceBTC", filters.minFloorPriceBTC);
  } else {
    queryParams.delete("minFloorPriceBTC");
  }

  if (filters.maxFloorPriceBTC) {
    queryParams.set("maxFloorPriceBTC", filters.maxFloorPriceBTC);
  } else {
    queryParams.delete("maxFloorPriceBTC");
  }

  if (filters.minVolume24h) {
    queryParams.set("minVolume24h", filters.minVolume24h);
  } else {
    queryParams.delete("minVolume24h");
  }

  if (filters.minPriceChange24h) {
    queryParams.set("minPriceChange24h", filters.minPriceChange24h);
  } else {
    queryParams.delete("minPriceChange24h");
  }

  if (filters.minDataQualityScore) {
    queryParams.set("minDataQualityScore", filters.minDataQualityScore);
  } else {
    queryParams.delete("minDataQualityScore");
  }

  if (filters.maxCacheAgeMinutes) {
    queryParams.set("maxCacheAgeMinutes", filters.maxCacheAgeMinutes);
  } else {
    queryParams.delete("maxCacheAgeMinutes");
  }

  if (filters.priceSource) {
    queryParams.set("priceSource", filters.priceSource);
  } else {
    queryParams.delete("priceSource");
  }

  const result = queryParams.toString();
  return result;
}

export function filtersToServicePayload(filters: StampFilters) {
  let range: StampRange | undefined = undefined;
  if (filters.range) {
    range = filters.range;
  } else if (filters.rangeMin || filters.rangeMax) {
    range = "custom";
  }

  let fileSize: StampFilesize | undefined = undefined;
  if (filters.fileSize) {
    fileSize = filters.fileSize;
  } else if (filters.fileSizeMin || filters.fileSizeMax) {
    fileSize = "custom";
  }

  const result = {
    type: filters.stampType || undefined, // NEW: Include stamp type in API payload!
    ident: [],
    fileType: filters.fileType.length > 0 ? filters.fileType : undefined,
    editions: filters.editions.length > 0 ? filters.editions : undefined,
    range: range || undefined,
    rangeMin: filters.rangeMin || undefined,
    rangeMax: filters.rangeMax || undefined,
    market: filters.market || undefined,
    dispensers: filters.dispensers || undefined,
    atomics: filters.atomics || undefined,
    listings: filters.listings || undefined,
    listingsMin: filters.listingsMin || undefined,
    listingsMax: filters.listingsMax || undefined,
    sales: filters.sales || undefined,
    salesMin: filters.salesMin || undefined,
    salesMax: filters.salesMax || undefined,
    volume: filters.volume || undefined,
    volumeMin: filters.volumeMin || undefined,
    volumeMax: filters.volumeMax || undefined,
    fileSize: fileSize || undefined,
    fileSizeMin: filters.fileSizeMin || undefined,
    fileSizeMax: filters.fileSizeMax || undefined,
    // Market Data Filters (Task 42)
    minHolderCount: filters.minHolderCount || undefined,
    maxHolderCount: filters.maxHolderCount || undefined,
    minDistributionScore: filters.minDistributionScore || undefined,
    maxTopHolderPercentage: filters.maxTopHolderPercentage || undefined,
    minFloorPriceBTC: filters.minFloorPriceBTC || undefined,
    maxFloorPriceBTC: filters.maxFloorPriceBTC || undefined,
    minVolume24h: filters.minVolume24h || undefined,
    minPriceChange24h: filters.minPriceChange24h || undefined,
    minDataQualityScore: filters.minDataQualityScore || undefined,
    maxCacheAgeMinutes: filters.maxCacheAgeMinutes || undefined,
    priceSource: filters.priceSource || undefined,
  };

  return result;
}

// export function queryParamsToServicePayload(query: URLSearchParams): {
//   filterBy: STAMP_FILTER_TYPES[];
// } {
//   return {
//     filterBy: [],
//   };
// }

export const allQueryKeysFromFilters = [
  "market",
  "dispensers",
  "atomics",
  "listings",
  "listingsMin",
  "listingsMax",
  "sales",
  "salesMin",
  "salesMax",
  "volume",
  "volumeMin",
  "volumeMax",
  "filetype",
  "fileSize",
  "fileSizeMin",
  "fileSizeMax",
  "editions",
  "range",
  "rangeMin",
  "rangeMax",
  // Market Data Filters (Task 42)
  "minHolderCount",
  "maxHolderCount",
  "minDistributionScore",
  "maxTopHolderPercentage",
  "minFloorPriceBTC",
  "maxFloorPriceBTC",
  "minVolume24h",
  "minPriceChange24h",
  "minDataQualityScore",
  "maxCacheAgeMinutes",
  "priceSource",
];

export function queryParamsToFilters(query: string): StampFilters {
  const params = new URLSearchParams(query);

  const filtersPartial: Partial<StampFilters> = {
    stampType: "all", // Default stamp type
    market: "",
    dispensers: false,
    atomics: false,
    listings: "",
    sales: "",
    listingsMin: "",
    listingsMax: "",
    salesMin: "",
    salesMax: "",
    volume: "",
    fileType: [],
    fileSize: null,
    fileSizeMin: "",
    fileSizeMax: "",
    editions: [],
    range: null,
    rangeMin: "",
    rangeMax: "",
    // Market Data Filters (Task 42)
    minHolderCount: "",
    maxHolderCount: "",
    minDistributionScore: "",
    maxTopHolderPercentage: "",
    minFloorPriceBTC: "",
    maxFloorPriceBTC: "",
    minVolume24h: "",
    minPriceChange24h: "",
    minDataQualityScore: "",
    maxCacheAgeMinutes: "",
    priceSource: "",
  };

  // Parse stamp type parameter
  const stampTypeParam = params.get("type") || params.get("stampType");
  if (
    stampTypeParam &&
    FRONTEND_STAMP_TYPE_VALUES.includes(stampTypeParam as any)
  ) {
    filtersPartial.stampType = stampTypeParam as FrontendStampType;
  }

  // Parse market type parameter
  const marketParam = params.get("market");
  if (
    marketParam &&
    (marketParam === "listings" || marketParam === "sales")
  ) {
    filtersPartial.market = marketParam;
  }

  // Parse dispensers and atomics
  const dispensersParam = params.get("dispensers");
  if (dispensersParam === "true") {
    filtersPartial.dispensers = true;
  }

  const atomicsParam = params.get("atomics");
  if (atomicsParam === "true") {
    filtersPartial.atomics = true;
  }

  // Parse listings type
  const listingsParam = params.get("listings");
  if (
    listingsParam &&
    ["all", "bargain", "affordable", "premium", "custom"].includes(
      listingsParam,
    )
  ) {
    filtersPartial.listings = listingsParam as
      | "all"
      | "bargain"
      | "affordable"
      | "premium"
      | "custom";
  }

  const listingsMin = params.get("listingsMin");
  if (listingsMin) {
    filtersPartial.listingsMin = listingsMin;
  }

  const listingsMax = params.get("listingsMax");
  if (listingsMax) {
    filtersPartial.listingsMax = listingsMax;
  }

  // Parse sales type
  const salesParam = params.get("sales");
  if (
    salesParam &&
    ["recent", "premium", "custom", "volume"].includes(salesParam)
  ) {
    filtersPartial.sales = salesParam as
      | "recent"
      | "premium"
      | "custom"
      | "volume";
  }

  const salesMin = params.get("salesMin");
  if (salesMin) {
    filtersPartial.salesMin = salesMin;
  }

  const salesMax = params.get("salesMax");
  if (salesMax) {
    filtersPartial.salesMax = salesMax;
  }

  // Parse volume parameters
  const volume = params.get("volume");
  if (volume) {
    filtersPartial.volume = volume as "24h" | "7d" | "30d" | "";
  }

  const volumeMin = params.get("volumeMin");
  if (volumeMin) {
    filtersPartial.volumeMin = volumeMin;
  }

  const volumeMax = params.get("volumeMax");
  if (volumeMax) {
    filtersPartial.volumeMax = volumeMax;
  }

  // Parse filetype parameter
  const filetypeParam = params.get("filetype");
  if (filetypeParam) {
    filtersPartial.fileType = filetypeParam.split(",") as StampFiletype[];
  }

  // Parse editions parameter
  const editionsParam = params.get("editions");
  if (editionsParam) {
    filtersPartial.editions = editionsParam.split(",") as StampEdition[];
  }

  // Parse range parameters (flat structure)
  const range = params.get("range");
  if (range) {
    filtersPartial.range = range as StampRange;
  }

  const rangeMin = params.get("rangeMin");
  if (rangeMin) {
    filtersPartial.rangeMin = rangeMin;
  }

  const rangeMax = params.get("rangeMax");
  if (rangeMax) {
    filtersPartial.rangeMax = rangeMax;
  }

  // Parse file size parameters
  const fileSize = params.get("fileSize");
  if (fileSize) {
    filtersPartial.fileSize = fileSize as StampFilesize;
  }

  const fileSizeMin = params.get("fileSizeMin");
  if (fileSizeMin) {
    filtersPartial.fileSizeMin = fileSizeMin;
  }

  const fileSizeMax = params.get("fileSizeMax");
  if (fileSizeMax) {
    filtersPartial.fileSizeMax = fileSizeMax;
  }

  // Parse market data filters (Task 42)
  const minHolderCount = params.get("minHolderCount");
  if (minHolderCount) {
    filtersPartial.minHolderCount = minHolderCount;
  }

  const maxHolderCount = params.get("maxHolderCount");
  if (maxHolderCount) {
    filtersPartial.maxHolderCount = maxHolderCount;
  }

  const minDistributionScore = params.get("minDistributionScore");
  if (minDistributionScore) {
    filtersPartial.minDistributionScore = minDistributionScore;
  }

  const maxTopHolderPercentage = params.get("maxTopHolderPercentage");
  if (maxTopHolderPercentage) {
    filtersPartial.maxTopHolderPercentage = maxTopHolderPercentage;
  }

  const minFloorPriceBTC = params.get("minFloorPriceBTC");
  if (minFloorPriceBTC) {
    filtersPartial.minFloorPriceBTC = minFloorPriceBTC;
  }

  const maxFloorPriceBTC = params.get("maxFloorPriceBTC");
  if (maxFloorPriceBTC) {
    filtersPartial.maxFloorPriceBTC = maxFloorPriceBTC;
  }

  const minVolume24h = params.get("minVolume24h");
  if (minVolume24h) {
    filtersPartial.minVolume24h = minVolume24h;
  }

  const minPriceChange24h = params.get("minPriceChange24h");
  if (minPriceChange24h) {
    filtersPartial.minPriceChange24h = minPriceChange24h;
  }

  const minDataQualityScore = params.get("minDataQualityScore");
  if (minDataQualityScore) {
    filtersPartial.minDataQualityScore = minDataQualityScore;
  }

  const maxCacheAgeMinutes = params.get("maxCacheAgeMinutes");
  if (maxCacheAgeMinutes) {
    filtersPartial.maxCacheAgeMinutes = maxCacheAgeMinutes;
  }

  const priceSource = params.get("priceSource");
  if (priceSource) {
    filtersPartial.priceSource = priceSource;
  }

  const result = { ...defaultFilters, ...filtersPartial };
  return result;
}

export function queryParamsToServicePayload(query: string) {
  return filtersToServicePayload(queryParamsToFilters(query));
}
