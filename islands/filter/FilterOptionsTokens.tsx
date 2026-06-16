import type { StampRange } from "$constants";

export type TokenFilters = {
  range: StampRange | null;
  rangeMin: string;
  rangeMax: string;
  op: "deploy" | "mint" | "transfer" | "";
  amount: "<50000" | "<100000" | "<250000" | "<500000" | "<1000000" | "";
  [key: string]: any;
};

export const defaultFilters: TokenFilters = {
  range: null,
  rangeMin: "",
  rangeMax: "",
  op: "",
  amount: "",
};

export function filtersToQueryParams(
  search: string,
  filters: TokenFilters,
): string {
  const queryParams = new URLSearchParams(search);

  if (filters.range) {
    queryParams.set("token[range]", filters.range);
  } else {
    queryParams.delete("token[range]");
  }

  if (filters.rangeMin) {
    queryParams.set("token[rangeMin]", filters.rangeMin);
  } else {
    queryParams.delete("token[rangeMin]");
  }

  if (filters.rangeMax) {
    queryParams.set("token[rangeMax]", filters.rangeMax);
  } else {
    queryParams.delete("token[rangeMax]");
  }

  if (filters.op) {
    queryParams.set("token[op]", filters.op);
  } else {
    queryParams.delete("token[op]");
  }

  if (filters.amount) {
    queryParams.set("token[amount]", filters.amount);
  } else {
    queryParams.delete("token[amount]");
  }

  return queryParams.toString();
}

export function queryParamsToFilters(query: string): TokenFilters {
  const params = new URLSearchParams(query);
  const filters: TokenFilters = { ...defaultFilters };

  const range = params.get("token[range]");
  if (range) {
    filters.range = range as StampRange;
  }

  const rangeMin = params.get("token[rangeMin]");
  if (rangeMin) {
    filters.rangeMin = rangeMin;
  }

  const rangeMax = params.get("token[rangeMax]");
  if (rangeMax) {
    filters.rangeMax = rangeMax;
  }

  const op = params.get("token[op]");
  if (op && ["deploy", "mint", "transfer"].includes(op)) {
    filters.op = op as TokenFilters["op"];
  }

  const amount = params.get("token[amount]");
  if (
    amount &&
    ["<50000", "<100000", "<250000", "<500000", "<1000000"].includes(amount)
  ) {
    filters.amount = amount as TokenFilters["amount"];
  }

  return filters;
}

export const allQueryKeysFromFiltersTokens = [
  "token[range]",
  "token[rangeMin]",
  "token[rangeMax]",
  "token[op]",
  "token[amount]",
];
