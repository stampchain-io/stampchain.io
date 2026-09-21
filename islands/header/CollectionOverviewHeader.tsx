/* ===== COLLECTION OVERVIEW HEADER COMPONENT ===== */
import { SelectorButtons } from "$button";
import { SortButton } from "$islands/button/SortButton.tsx";
import { ViewButton } from "$islands/button/ViewButton.tsx";
import { container2Icon, PillContentCount, ScrollFadeRow } from "$layout";
import {
  getCurrentPathname,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { formatNumberWithCommas } from "$lib/utils/ui/formatting/formatUtils.ts";
import { titlePrimary } from "$text";
import { useCallback } from "preact/hooks";

/* ===== COMPONENT ===== */
function CollectionOverviewHeader(
  {
    sortBy = "ASC",
    editionsFilter = "all",
    total = 0,
    viewMode = "cardHorizontal",
  }: {
    sortBy?: "ASC" | "DESC";
    editionsFilter?: "all" | "single" | "multiple";
    total?: number;
    viewMode?: "cardHorizontal" | "cardVertical" | "cardSquare";
  },
) {
  /* ===== EVENT HANDLERS ===== */
  // Filters collections to those containing exclusively 1/1 (single edition)
  // stamps, or those with at least one multi-edition stamp
  const handleEditionsChange = useCallback((value: string) => {
    if (typeof globalThis === "undefined" || !globalThis?.location) {
      return;
    }

    const params = new URLSearchParams(globalThis.location.search);
    if (value === "all") {
      params.delete("editions");
    } else {
      params.set("editions", value);
    }
    params.set("page", "1");

    const queryString = params.toString();
    safeNavigate(
      getCurrentPathname() + (queryString ? `?${queryString}` : ""),
    );
  }, []);

  return (
    <div class="flex flex-col w-full gap-1.5">
      <div class="relative flex flex-row justify-between items-start w-full">
        <h1 class={`-mt-2 ${titlePrimary}`}>
          COLLECTIONS
        </h1>
        <PillContentCount value={formatNumberWithCommas(total)} />
      </div>

      <ScrollFadeRow deps={[editionsFilter, viewMode, sortBy]}>
        {/* Editions Selector - Left */}
        <div class="shrink-0">
          <SelectorButtons
            options={[
              { value: "all", label: "ALL" },
              { value: "single", label: "1/1 EDITIONS" },
              { value: "multiple", label: "MULTIPLE" },
            ]}
            value={editionsFilter}
            onChange={handleEditionsChange}
            size="xs"
            color="primary"
          />
        </div>

        {/* View Toggle + Sort Controls - Right */}
        <div class="shrink-0 flex ml-auto gap-3">
          <div class={container2Icon}>
            <ViewButton
              viewMode={viewMode}
              modes={["cardHorizontal", "cardVertical", "cardSquare"]}
            />
          </div>
          <div class={container2Icon}>
            <SortButton initSort={sortBy} />
          </div>
        </div>
      </ScrollFadeRow>
    </div>
  );
}

export { CollectionOverviewHeader };
