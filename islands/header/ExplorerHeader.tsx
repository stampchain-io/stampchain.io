/* ===== EXPLORER HEADER COMPONENT ===== */
import { SelectorButtons } from "$button";
import { FilterButton } from "$islands/button/FilterButton.tsx";
import { SortButton } from "$islands/button/SortButton.tsx";
import { ViewButton } from "$islands/button/ViewButton.tsx";
import FilterDrawer from "$islands/filter/FilterDrawer.tsx";
import {
  countActiveExplorerFilters,
  queryParamsToFilters as explorerQueryParamsToFilters,
} from "$islands/filter/FilterOptionsExplorer.tsx";
import { container2 } from "$layout";
import {
  getCurrentPathname,
  getSearchParams,
  isBrowser,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { titlePrimary } from "$text";
import type { ExplorerHeaderProps } from "$types/ui.d.ts";
import { createPortal } from "preact/compat";
import { useEffect, useState } from "preact/hooks";

/* ===== COMPONENT ===== */
export const ExplorerHeader = (
  {
    currentSection = "all",
    viewMode = "detail",
  }: ExplorerHeaderProps,
) => {
  /* ===== STATE ===== */
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  /* ===== COMPUTE ACTIVE FILTER COUNT FROM URL ===== */
  useEffect(() => {
    if (isBrowser()) {
      const filters = explorerQueryParamsToFilters(
        getSearchParams().toString(),
      );
      setActiveFilterCount(countActiveExplorerFilters(filters));
    }
  }, []);

  /* ===== EVENT HANDLERS ===== */
  const handleSectionChange = (section: string) => {
    if (typeof globalThis === "undefined" || !globalThis?.location) return;
    const params = new URLSearchParams(globalThis.location.search);
    if (section === "all") {
      params.delete("section");
    } else {
      params.set("section", section);
    }
    const query = params.toString();
    safeNavigate(getCurrentPathname() + (query ? `?${query}` : ""));
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
  };

  /* ===== RENDER ===== */
  return (
    <div class="relative flex flex-col w-full gap-1.5">
      <div class="flex flex-row justify-between items-start w-full">
        {/* Title Section */}
        <h1 class={`${titlePrimary} ml-1.5`}>EXPLORER</h1>
      </div>

      {/* Section Selector + Controls */}
      <div class="flex flex-col mobileMd:flex-row justify-between w-full">
        {/* Section Selector - Left */}
        <div class="flex gap-3 w-full mobileMd:w-auto">
          <SelectorButtons
            options={[
              { value: "all", label: "ALL" },
              { value: "stamps", label: "STAMPS" },
              { value: "tokens", label: "TOKENS" },
            ]}
            value={currentSection}
            onChange={handleSectionChange}
            size="xsR"
            color="purple"
            className="w-full mobileMd:w-auto"
          />
        </div>

        {/* View Toggle + Filter + Sort Controls - Right */}
        <div class="flex justify-start mobileMd:justify-end pt-3 mobileMd:pt-0 gap-3">
          {/* View Mode Toggle */}
          <div
            class={`relative flex items-center justify-center px-1 py-0.5 ${container2} rounded-full`}
          >
            <ViewButton viewMode={viewMode} />
          </div>

          {/* Filter + Sort Controls */}
          <div
            class={`relative flex items-center justify-between px-1 py-0.5 gap-1.5 tablet:gap-1 ${container2} rounded-full`}
          >
            <FilterButton
              count={activeFilterCount}
              open={isOpen}
              setOpen={handleOpen}
              type="explorer"
            />
            <SortButton />
          </div>
        </div>
      </div>

      {/* Filter Drawer — portalled to document.body to escape backdrop-filter containing block */}
      {typeof document !== "undefined" && createPortal(
        <FilterDrawer
          open={isOpen}
          setOpen={handleOpen}
          type="explorer"
        />,
        document.body,
      )}
    </div>
  );
};
