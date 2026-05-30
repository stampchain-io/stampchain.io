/* ===== STAMP OVERVIEW HEADER COMPONENT ===== */
/* TODO (@baba) - update filter and styling */
import { SelectorButtons } from "$button";
import type { FrontendStampType } from "$constants";
import { FilterButton } from "$islands/button/FilterButton.tsx";
import { SortButton } from "$islands/button/SortButton.tsx";
import { ViewButton } from "$islands/button/ViewButton.tsx";
import FilterDrawer from "$islands/filter/FilterDrawer.tsx";
import {
  defaultFilters,
  filtersToQueryParams,
  StampFilters as FilterStampFilters,
} from "$islands/filter/FilterOptionsStamp.tsx";
import { container2 } from "$layout";
import {
  getCurrentPathname,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { titlePrimary } from "$text";
import type { StampOverviewHeaderProps } from "$types/ui.d.ts";
import { createPortal } from "preact/compat";
import { useCallback, useState } from "preact/hooks";

/* ===== COMPONENT ===== */
export const StampOverviewHeader = (
  {
    currentFilters = defaultFilters,
    viewMode = "detail",
  }: StampOverviewHeaderProps,
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

      // Convert filters to query params, preserving the current view mode
      const queryParams = filtersToQueryParams("", updatedFilters);
      const params = new URLSearchParams(queryParams);
      const currentView = new URLSearchParams(globalThis.location.search).get(
        "view",
      );
      if (currentView) params.set("view", currentView);

      // Construct new URL
      const newUrl = getCurrentPathname() +
        (params.toString() ? `?${params.toString()}` : "");

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
        <h1 class={`${titlePrimary} ml-1.5`}>ART STAMPS</h1>
      </div>

      {/* ===== STAMP TYPE SELECTOR AND CONTROLS ===== */}
      <div class="flex flex-col mobileMd:flex-row justify-between w-full">
        {/* Stamp Type Selector - Left */}
        <div class="flex gap-3 w-full mobileMd:w-auto">
          <SelectorButtons
            options={[
              { value: "all", label: "ALL" },
              { value: "classic", label: "CLASSIC" },
              { value: "posh", label: "POSH" },
              { value: "src-721", label: "RECURSIVE" },
              { value: "cursed", label: "CURSED" },
            ]}
            value={currentFilters.stampType || "all"}
            onChange={handleStampTypeChange}
            size="xsR"
            color="purple"
            className="w-full mobileMd:w-auto"
          />
        </div>

        {/* View Mode + Filter and Sort Controls - Right */}
        <div class="flex justify-start mobileMd:justify-end pt-3 mobileMd:pt-0 gap-3">
          {/* View Mode Toggle */}
          <div
            class={`relative flex items-center justify-center px-1 py-0.5 ${container2} rounded-full`}
          >
            <ViewButton viewMode={viewMode} />
          </div>

          {/* Filter and Sort Controls */}
          <div
            class={`relative flex items-center justify-between px-1 py-0.5 gap-1.5 tablet:gap-1 ${container2} rounded-full`}
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

      {/* Filter Drawer — portalled to document.body to escape backdrop-filter containing block */}
      {typeof document !== "undefined" && createPortal(
        <FilterDrawer
          open={isOpen1}
          setOpen={handleOpen1}
          type="stamp"
        />,
        document.body,
      )}
    </div>
  );
};
