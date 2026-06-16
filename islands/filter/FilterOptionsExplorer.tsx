import type { StampRange } from "$constants";
import {
  defaultFilters as stampDefaultFilters,
  filtersToQueryParams as stampFiltersToQueryParams,
  queryParamsToFilters as stampQueryParamsToFilters,
  StampFilters,
} from "$islands/filter/FilterOptionsStamps.tsx";
import {
  allQueryKeysFromFiltersTokens,
  defaultFilters as tokenDefaultFilters,
  filtersToQueryParams as tokenFiltersToQueryParams,
  queryParamsToFilters as tokenQueryParamsToFilters,
  TokenFilters,
} from "$islands/filter/FilterOptionsTokens.tsx";

export type ExplorerSection = "all" | "stamps" | "tokens";

export type ExplorerFilters = {
  section: ExplorerSection;
  // ALL section — range filtering both stamps and tokens together
  range: StampRange | null;
  rangeMin: string;
  rangeMax: string;
  // Section-specific sub-filters (preserved across section switches)
  stampFilters: StampFilters;
  tokenFilters: TokenFilters;
  [key: string]: any;
};

export const defaultFilters: ExplorerFilters = {
  section: "all",
  range: null,
  rangeMin: "",
  rangeMax: "",
  stampFilters: { ...stampDefaultFilters },
  tokenFilters: { ...tokenDefaultFilters },
};

// All stamp-specific URL keys to clear when not in stamps section
const STAMP_FILTER_KEYS = [
  "type",
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

// Top-level range keys for ALL section
const ALL_RANGE_KEYS = ["range", "rangeMin", "rangeMax"];

export function filtersToQueryParams(
  search: string,
  filters: ExplorerFilters,
): string {
  const queryParams = new URLSearchParams(search);

  // Section
  if (filters.section && filters.section !== "all") {
    queryParams.set("section", filters.section);
  } else {
    queryParams.delete("section");
  }

  if (filters.section === "stamps") {
    // Clear token and top-level range params
    allQueryKeysFromFiltersTokens.forEach((k) => queryParams.delete(k));
    ALL_RANGE_KEYS.forEach((k) => queryParams.delete(k));

    // Serialize stamp filters (writes type, market, range, etc.)
    const stampQuery = stampFiltersToQueryParams("", filters.stampFilters);
    const stampParams = new URLSearchParams(stampQuery);
    stampParams.forEach((value, key) => queryParams.set(key, value));
    // Remove stamp params that are now empty/default
    STAMP_FILTER_KEYS.forEach((k) => {
      if (!stampParams.has(k)) queryParams.delete(k);
    });
  } else if (filters.section === "tokens") {
    // Clear stamp and top-level range params
    STAMP_FILTER_KEYS.forEach((k) => queryParams.delete(k));
    ALL_RANGE_KEYS.forEach((k) => queryParams.delete(k));

    // Serialize token filters (writes token[*] namespaced params)
    const tokenQuery = tokenFiltersToQueryParams("", filters.tokenFilters);
    const tokenParams = new URLSearchParams(tokenQuery);
    tokenParams.forEach((value, key) => queryParams.set(key, value));
    allQueryKeysFromFiltersTokens.forEach((k) => {
      if (!tokenParams.has(k)) queryParams.delete(k);
    });
  } else {
    // ALL section: clear stamp and token params, write top-level range
    STAMP_FILTER_KEYS.forEach((k) => queryParams.delete(k));
    allQueryKeysFromFiltersTokens.forEach((k) => queryParams.delete(k));

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
  }

  return queryParams.toString();
}

export function queryParamsToFilters(query: string): ExplorerFilters {
  const params = new URLSearchParams(query);

  const sectionParam = params.get("section");
  const section: ExplorerSection =
    sectionParam === "stamps"
      ? "stamps"
      : sectionParam === "tokens"
      ? "tokens"
      : "all";

  // Always deserialize all sub-states so switching sections restores them
  const stampFilters = stampQueryParamsToFilters(query);
  const tokenFilters = tokenQueryParamsToFilters(query);

  // Top-level range for ALL section
  const range = params.get("range") as StampRange | null;
  const rangeMin = params.get("rangeMin") || "";
  const rangeMax = params.get("rangeMax") || "";

  return {
    section,
    range: section === "all" ? range : null,
    rangeMin: section === "all" ? rangeMin : "",
    rangeMax: section === "all" ? rangeMax : "",
    stampFilters,
    tokenFilters,
  };
}

export function countActiveExplorerFilters(filters: ExplorerFilters): number {
  if (filters.section === "all") {
    return filters.range !== null || filters.rangeMin !== "" ||
        filters.rangeMax !== ""
      ? 1
      : 0;
  }

  if (filters.section === "stamps") {
    const sf = filters.stampFilters;
    let count = 0;
    const hasMarket = sf.market !== "" || sf.dispensers || sf.atomics ||
      sf.listings !== "" || sf.sales !== "";
    if (hasMarket) count++;
    if (sf.fileType.length > 0) count++;
    if (sf.editions.length > 0) count++;
    if (sf.range !== null || sf.rangeMin !== "" || sf.rangeMax !== "") count++;
    if (
      sf.fileSize !== null || sf.fileSizeMin !== "" || sf.fileSizeMax !== ""
    ) count++;
    return count;
  }

  if (filters.section === "tokens") {
    const tf = filters.tokenFilters;
    let count = 0;
    if (tf.range !== null || tf.rangeMin !== "" || tf.rangeMax !== "") count++;
    if (tf.op !== "") count++;
    if (tf.amount !== "") count++;
    return count;
  }

  return 0;
}
