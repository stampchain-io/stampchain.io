/* ===== STAMP OVERVIEW HEADER COMPONENT ===== */
/* TODO (@baba) - update filter and styling */
import { SelectorButtons } from "$button";
import type { FrontendStampType } from "$constants";
import { FilterButton } from "$islands/button/FilterButton.tsx";
import { SortButton } from "$islands/button/SortButton.tsx";
import FilterDrawer from "$islands/filter/FilterDrawer.tsx";
import {
  defaultFilters,
  filtersToQueryParams,
  StampFilters as FilterStampFilters,
} from "$islands/filter/FilterOptionsStamp.tsx";
import { container1 } from "$layout";
import {
  getCurrentPathname,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { titleNeutral } from "$text";
import type { StampOverviewHeaderProps } from "$types/ui.d.ts";
import { useCallback, useState } from "preact/hooks";

/* ===== COMPONENT ===== */
export const StampOverviewHeader = (
  { currentFilters = defaultFilters }: StampOverviewHeaderProps,
) => {
  /* ===== STATE MANAGEMENT ===== */
  const [isOpen1, setIsOpen1] = useState(false);

  /* ===== EVENT HANDLERS ===== */
  const handleOpen1 = (open: boolean) => {
    setIsOpen1(open);
  };

  const handleStampTypeChange = useCallback(
    (type: string) => {
      // SSR-safe browser environment check
      if (typeof globalThis === "undefined" || !globalThis?.location) {
        return;
      }

      // Create updated filters with new stamp type
      const updatedFilters: FilterStampFilters = {
        ...currentFilters,
        stampType: type as FrontendStampType,
      };

      // Convert filters to query params
      const queryParams = filtersToQueryParams("", updatedFilters);

      // Construct new URL
      const newUrl = getCurrentPathname() +
        (queryParams ? `?${queryParams}` : "");

      // Navigate immediately - page reloads with new data
      safeNavigate(newUrl);
    },
    [currentFilters],
  );

  /* ===== HELPER FUNCTION ===== */
  function countActiveStampFilters(filters: FilterStampFilters): number {
    let count = 0;

    // Marketplace filter group - count as 1 if any marketplace filters are active
    const hasMarketplaceFilters = filters.market !== "" ||
      filters.dispensers ||
      filters.atomics ||
      filters.listings !== "" ||
      filters.sales !== "" ||
      filters.listingsMin ||
      filters.listingsMax ||
      filters.salesMin ||
      filters.salesMax ||
      filters.volume !== "" ||
      filters.volumeMin ||
      filters.volumeMax;

    if (hasMarketplaceFilters) count++;

    // Other filter categories
    if (filters.fileType.length > 0) count++;
    if (filters.editions.length > 0) count++;
    if (filters.range !== null || filters.rangeMin || filters.rangeMax) count++;
    if (
      filters.fileSize !== null || filters.fileSizeMin || filters.fileSizeMax
    ) count++;

    return count;
  }

  /* ===== RENDER ===== */
  return (
    <div class="relative flex flex-col w-full gap-1.5">
      <div class="flex flex-row justify-between items-start w-full">
        {/* ===== TITLE ===== */}
        <h1 class={`${titleNeutral} ml-1.5`}>ART STAMPS</h1>
      </div>

      {/* ===== STAMP TYPE SELECTOR AND CONTROLS ===== */}
      <div class="flex flex-col mobileMd:flex-row justify-between w-full">
        {/* Stamp Type Selector - Left */}
        <div class="flex gap-3 w-full mobileMd:w-auto">
          <SelectorButtons
            options={[
              { value: "classic", label: "CLASSIC" },
              { value: "posh", label: "POSH" },
              { value: "cursed", label: "CURSED" },
            ]}
            value={currentFilters.stampType || "classic"}
            onChange={handleStampTypeChange}
            size="smR"
            color="grey"
            className="w-full mobileMd:w-auto"
          />
        </div>

        {/* Filter and Sort Controls - Right */}
        <div class="flex justify-start mobileMd:justify-end pt-3 mobileMd:pt-0">
          <div
            class={`flex relative ${container1} !rounded-full
             items-start justify-between
             gap-7 py-1.5 px-5
             tablet:gap-5 tablet:py-1 tablet:px-4 `}
          >
            <FilterButton
              count={countActiveStampFilters(
                currentFilters as FilterStampFilters,
              )}
              open={isOpen1}
              setOpen={handleOpen1}
              type="stamp"
            />
            <SortButton />
          </div>
        </div>
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        open={isOpen1}
        setOpen={handleOpen1}
        type="stamp"
      />
    </div>
  );
};
