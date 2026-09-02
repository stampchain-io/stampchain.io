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
import { container2Icon, PillContentCount, ScrollFadeRow } from "$layout";
import {
  getCurrentPathname,
  getSearchParams,
  isBrowser,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { formatNumberWithCommas } from "$lib/utils/ui/formatting/formatUtils.ts";
import { titlePrimary } from "$text";
import type { ExplorerHeaderProps } from "$types/ui.d.ts";
import { createPortal } from "preact/compat";
import { useEffect, useState } from "preact/hooks";

/* ===== COMPONENT ===== */
export const ExplorerHeader = (
  {
    currentSection = "all",
    viewMode = "cardVertical",
    stampsTotal = 0,
    tokensTotal = 0,
    sortBy = "DESC",
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

  /* ===== COUNT PILL ===== */
  // Reflects only the currently active section - combined stamps+tokens
  // total for "all" (both are always fetched together in that mode, so no
  // extra query is needed), otherwise whichever single total applies.
  const countPill = currentSection === "stamps"
    ? formatNumberWithCommas(stampsTotal)
    : currentSection === "tokens"
    ? formatNumberWithCommas(tokensTotal)
    : formatNumberWithCommas(stampsTotal + tokensTotal);

  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col w-full gap-1.5">
      <div class="relative flex flex-row justify-between items-start w-full">
        {/* Title Section */}
        <h1 class={titlePrimary}>EXPLORER</h1>
        <PillContentCount value={countPill} />
      </div>

      {/* Section Selector + Controls */}
      <ScrollFadeRow deps={[currentSection]}>
        {/* Section Selector - Left */}
        <div class="shrink-0">
          <SelectorButtons
            options={[
              { value: "all", label: "ALL" },
              { value: "stamps", label: "STAMPS" },
              { value: "tokens", label: "TOKENS" },
            ]}
            value={currentSection}
            onChange={handleSectionChange}
            size="xsR"
            color="primary"
          />
        </div>

        {/* View Toggle + Filter + Sort Controls - Right */}
        <div class="shrink-0 flex ml-auto gap-3">
          <div class={container2Icon}>
            <ViewButton viewMode={viewMode} />
          </div>
          <div class={`${container2Icon} gap-1.5 tablet:gap-1`}>
            <FilterButton
              count={activeFilterCount}
              open={isOpen}
              setOpen={handleOpen}
              type="explorer"
            />
            <SortButton initSort={sortBy} />
          </div>
        </div>
      </ScrollFadeRow>

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
