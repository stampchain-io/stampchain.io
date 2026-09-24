/* ===== COLLECTION DETAIL CONTENT COMPONENT ===== */
import { SelectorButtons } from "$button";
import { StampCard } from "$card";
import { SortButton } from "$islands/button/SortButton.tsx";
import { ViewButton } from "$islands/button/ViewButton.tsx";
import {
  container2Icon,
  EmptyState,
  gridCard,
  PillContentCount,
} from "$layout";
import {
  getCurrentPathname,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { formatNumberWithCommas } from "$lib/utils/ui/formatting/formatUtils.ts";
import { subtitlePrimary } from "$text";
import type { StampCardVariant, StampRow } from "$types/stamp.d.ts";
import { useCallback } from "preact/hooks";

/* ===== COMPONENT ===== */
export const CollectionDetailContent = (
  {
    stamps = [],
    market = "all",
    sortBy = "DESC",
    viewMode = "cardVertical",
    totalStamps = null,
    totalEditions = null,
    listedStamps = null,
  }: {
    stamps: StampRow[];
    market?: "all" | "listings";
    sortBy?: "ASC" | "DESC";
    viewMode?: "cardVertical" | "cardSquare";
    totalStamps?: number | null;
    totalEditions?: number | null;
    listedStamps?: number | null;
  },
) => {
  const cardVariant: StampCardVariant = viewMode === "cardSquare"
    ? "cardSquare"
    : "cardVerticalCollection";

  const stampsValue = totalStamps !== null
    ? formatNumberWithCommas(totalStamps)
    : "N/A";
  const editionsValue = totalEditions !== null
    ? formatNumberWithCommas(totalEditions)
    : "N/A";
  const countPill = market === "listings"
    ? (listedStamps !== null ? formatNumberWithCommas(listedStamps) : "N/A")
    : totalStamps !== totalEditions
    ? (
      <>
        {stampsValue}
        <span class="ml-1.5 text-color-neutral-600">/ {editionsValue}</span>
      </>
    )
    : stampsValue;

  /* ===== EVENT HANDLERS ===== */
  // Same "market=listings" filter as /marketplace - re-navigates through the
  // Fresh partial on this route so the server re-fetches only listed stamps
  const handleMarketChange = useCallback((value: string) => {
    if (typeof globalThis === "undefined" || !globalThis?.location) {
      return;
    }

    const params = new URLSearchParams(globalThis.location.search);
    if (value === "listings") {
      params.set("market", "listings");
    } else {
      params.delete("market");
    }
    params.set("page", "1");

    const queryString = params.toString();
    safeNavigate(
      getCurrentPathname() + (queryString ? `?${queryString}` : ""),
    );
  }, []);

  return (
    <div data-name="stamps" class="relative">
      <PillContentCount value={countPill} />

      <div class={`flex -mt-2 ${subtitlePrimary}`}>
        COLLECTION
      </div>

      <div class="flex items-center justify-between mb-4">
        <SelectorButtons
          options={[
            { value: "all", label: "ALL" },
            { value: "listings", label: "LISTINGS" },
          ]}
          value={market}
          onChange={handleMarketChange}
          size="xs"
          color="primary"
        />
        <div class="flex items-center gap-3">
          <div class={container2Icon}>
            <ViewButton
              viewMode={viewMode}
              modes={["cardVertical", "cardSquare"]}
            />
          </div>
          <div class={container2Icon}>
            <SortButton initSort={sortBy} />
          </div>
        </div>
      </div>

      {stamps.length
        ? (
          <div class={gridCard(viewMode)}>
            {stamps.map((stamp: StampRow) => (
              <StampCard
                key={stamp.tx_hash}
                stamp={stamp}
                variant={cardVariant}
              />
            ))}
          </div>
        )
        : (
          <EmptyState
            label={market === "listings"
              ? "NO LISTINGS TO DISPLAY"
              : "UNABLE TO LOAD THE COLLECTION"}
            icon="artStamps"
          />
        )}
    </div>
  );
};
