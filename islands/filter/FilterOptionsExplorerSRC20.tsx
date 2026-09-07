import type { StampRange } from "$constants";

export type ExplorerSRC20Filters = {
  range: StampRange | null;
  rangeMin: string;
  rangeMax: string;
  op: "deploy" | "mint" | "transfer" | "";
  amount: "<50000" | "<100000" | "<250000" | "<500000" | "<1000000" | "";
  [key: string]: any;
};

export const defaultFilters: ExplorerSRC20Filters = {
  range: null,
  rangeMin: "",
  rangeMax: "",
  op: "",
  amount: "",
};

export function filtersToQueryParams(
  search: string,
  filters: ExplorerSRC20Filters,
): string {
  const queryParams = new URLSearchParams(search);

  if (filters.range) {
    queryParams.set("tokenRange", filters.range);
  } else {
    queryParams.delete("tokenRange");
  }

  if (filters.rangeMin) {
    queryParams.set("tokenRangeMin", filters.rangeMin);
  } else {
    queryParams.delete("tokenRangeMin");
  }

  if (filters.rangeMax) {
    queryParams.set("tokenRangeMax", filters.rangeMax);
  } else {
    queryParams.delete("tokenRangeMax");
  }

  if (filters.op) {
    queryParams.set("tokenOp", filters.op);
  } else {
    queryParams.delete("tokenOp");
  }

  if (filters.amount) {
    queryParams.set("tokenAmount", filters.amount);
  } else {
    queryParams.delete("tokenAmount");
  }

  return queryParams.toString();
}

export function queryParamsToFilters(query: string): ExplorerSRC20Filters {
  const params = new URLSearchParams(query);
  const filters: ExplorerSRC20Filters = { ...defaultFilters };

  const range = params.get("tokenRange");
  if (range) {
    filters.range = range as StampRange;
  }

  const rangeMin = params.get("tokenRangeMin");
  if (rangeMin) {
    filters.rangeMin = rangeMin;
  }

  const rangeMax = params.get("tokenRangeMax");
  if (rangeMax) {
    filters.rangeMax = rangeMax;
  }

  const op = params.get("tokenOp");
  if (op && ["deploy", "mint", "transfer"].includes(op)) {
    filters.op = op as ExplorerSRC20Filters["op"];
  }

  const amount = params.get("tokenAmount");
  if (
    amount &&
    ["<50000", "<100000", "<250000", "<500000", "<1000000"].includes(amount)
  ) {
    filters.amount = amount as ExplorerSRC20Filters["amount"];
  }

  return filters;
}

export const allQueryKeysFromFiltersExplorerSRC20 = [
  "tokenRange",
  "tokenRangeMin",
  "tokenRangeMax",
  "tokenOp",
  "tokenAmount",
];
