/* ===== MARKETPLACE HEADER COMPONENT ===== */
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
} from "$islands/filter/FilterOptionsMarketplace.tsx";
import { container2 } from "$layout";
import {
  getCurrentPathname,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { titlePrimary } from "$text";
import type { MarketplaceHeaderProps } from "$types/ui.d.ts";
import { createPortal } from "preact/compat";
import { useCallback, useState } from "preact/hooks";

/* ===== COMPONENT ===== */
export const MarketplaceHeader = (
  {
    currentFilters = defaultFilters,
    viewMode = "detail",
    isSalesMode = false,
  }: MarketplaceHeaderProps,
) => {
  /* ===== STATE MANAGEMENT ===== */
  const [isOpen1, setIsOpen1] = useState(false);

  /* ===== EVENT HANDLERS ===== */
  const handleOpen1 = (open: boolean) => {
    setIsOpen1(open);
  };

  const handleStampTypeChange = useCallback(
    (type: string) => {
      if (typeof globalThis === "undefined" || !globalThis?.location) {
        return;
      }

      const updatedFilters: FilterStampFilters = {
        ...currentFilters,
        stampType: type as FrontendStampType,
      };

      const queryParams = filtersToQueryParams("", updatedFilters);
      safeNavigate(
        getCurrentPathname() + (queryParams ? `?${queryParams}` : ""),
      );
    },
    [currentFilters],
  );

  const handleMarketModeChange = useCallback(
    (mode: string) => {
      let updatedFilters: FilterStampFilters;

      if (mode === "sales") {
        updatedFilters = {
          ...currentFilters,
          market: "sales",
          // Clear listings-specific sub-filters
          dispensers: false,
          atomics: false,
          listings: "",
          listingsMin: "",
          listingsMax: "",
        };
      } else {
        // listings — apply the marketplace default state
        updatedFilters = {
          ...currentFilters,
          market: "listings",
          dispensers: true,
          atomics: false,
          listings: "all",
          // Clear sales-specific sub-filters
          sales: "",
          salesMin: "",
          salesMax: "",
          volume: "",
          volumeMin: "",
          volumeMax: "",
        };
      }

      const queryParams = filtersToQueryParams("", updatedFilters);
      safeNavigate(
        getCurrentPathname() + (queryParams ? `?${queryParams}` : ""),
      );
    },
    [currentFilters],
  );

  /* ===== HELPER FUNCTION ===== */
  function countActiveMarketplaceFilters(filters: FilterStampFilters): number {
    let count = 0;

    // LISTINGS vs SALES is the primary mode selector — not counted as a filter.
    // Only sub-filter choices within a mode increment the badge.
    const hasActiveMarketSubFilter =
      // Non-default listing price tier
      (filters.listings !== "" && filters.listings !== "all") ||
      filters.listingsMin ||
      filters.listingsMax ||
      filters.atomics ||
      // Sales sub-filters
      filters.salesMin ||
      filters.salesMax ||
      filters.volume !== "" ||
      filters.volumeMin ||
      filters.volumeMax;

    if (hasActiveMarketSubFilter) count++;
    if (filters.fileType.length > 0) count++;
    if (filters.editions.length > 0) count++;
    if (filters.range !== null || filters.rangeMin || filters.rangeMax) count++;
    if (
      filters.fileSize !== null || filters.fileSizeMin || filters.fileSizeMax
    ) count++;

    return count;
  }

  // Derive current market mode: prefer explicit filter value, fall back to isSalesMode prop
  const currentMarketMode = currentFilters.market === "sales" || isSalesMode
    ? "sales"
    : "listings";

  /* ===== RENDER ===== */
  return (
    <div class="relative flex flex-col w-full gap-1.5">
      <div class="flex flex-row justify-between items-start w-full">
        {/* ===== TITLE ===== */}
        <h1 class={`${titlePrimary} ml-1.5`}>MARKETPLACE</h1>
      </div>

      {/* ===== CONTROLS ROW ===== */}
      <div class="flex justify-between items-center w-full">
        {/* Market Mode Selector */}
        <SelectorButtons
          options={[
            { value: "listings", label: "LISTINGS" },
            { value: "sales", label: "SALES" },
          ]}
          value={currentMarketMode}
          onChange={handleMarketModeChange}
          size="xsR"
          color="purple"
        />

        <div class="hidden tablet:flex w-auto">
          {/* Stamp Type Selector */}
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
          />
        </div>

        <div class="flex justify-end gap-2">
          {/* View Mode Toggle */}
          <div
            class={`relative flex items-center justify-center p-0.5 ${container2} rounded-full`}
          >
            <ViewButton viewMode={viewMode} />
          </div>

          {/* Filter and Sort Controls */}
          <div
            class={`relative flex items-center justify-between p-0.5 gap-2 tablet:gap-1 ${container2} rounded-full`}
          >
            <FilterButton
              count={countActiveMarketplaceFilters(
                currentFilters as FilterStampFilters,
              )}
              open={isOpen1}
              setOpen={handleOpen1}
              type="marketplace"
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
          type="marketplace"
        />,
        document.body,
      )}
    </div>
  );
};
