import {
  defaultFilters,
  filtersToQueryParams,
  queryParamsToFilters,
} from "$islands/filter/FilterOptionsStamps.tsx";
import { expect } from "jsr:@std/expect";

Deno.test("filterToQueryParams - does not encode false values", () => {
  expect(filtersToQueryParams("", defaultFilters)).toEqual("");
});

Deno.test("filterToQueryParams - encode string values", () => {
  expect(filtersToQueryParams("search=my+test&sortBy=ASC", defaultFilters))
    .toEqual("search=my+test&sortBy=ASC");
});

Deno.test("filterToQueryParams - encode boolean values", () => {
  expect(filtersToQueryParams("", {
    ...defaultFilters,
    atomics: true,
    fileType: ["svg"],
  })).toEqual("atomics=true&filetype=svg");
});

Deno.test("queryParamsToFilters empty", () => {
  expect(
    queryParamsToFilters(""),
  ).toEqual(defaultFilters);
});

Deno.test("queryParamsToFilters range preset", () => {
  expect(
    queryParamsToFilters("?range=5000"),
  ).toEqual({
    ...defaultFilters,
    range: "5000",
  });
});

Deno.test("queryParamsToFilters file type filters", () => {
  expect(
    queryParamsToFilters("?filetype=jpeg,gif"),
  ).toEqual({
    ...defaultFilters,
    fileType: ["jpeg", "gif"],
  });
});

Deno.test("queryParamsToFilters stamp range min max", () => {
  expect(
    queryParamsToFilters("?rangeMin=50&rangeMax=444"),
  ).toEqual({
    ...defaultFilters,
    rangeMin: "50",
    rangeMax: "444",
  });
});
