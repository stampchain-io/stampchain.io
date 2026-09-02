/* ===== SRC20 HEADER COMPONENT ===== */
import { SelectorButtons, TrendingButton } from "$button";
import { container2Icon, PillContentCount, ScrollFadeRow } from "$layout";
import {
  navigateWithFreshPartial,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { formatNumberWithCommas } from "$lib/utils/ui/formatting/formatUtils.ts";
import { titlePrimary } from "$text";
import type { SRC20OverviewHeaderProps } from "$types/ui.d.ts";
import { useCallback } from "preact/hooks";

/* ===== COMPONENT ===== */
export const SRC20OverviewHeader = ({
  viewType = "minted",
  timeframe = "24H",
  sortBy = "TRENDING",
  sortDirection = "desc",
  currentTotal = 0,
}: SRC20OverviewHeaderProps) => {
  /* ===== NAVIGATION HANDLERS ===== */
  const handleViewTypeClick = useCallback((newViewType: string) => {
    navigateWithFreshPartial("/src20", {
      viewType: newViewType,
      timeframe: "24H",
      sortBy,
      sortDirection,
    }, true);
  }, [sortBy, sortDirection]);

  const handleTimeframeClick = useCallback((newTimeframe: string) => {
    navigateWithFreshPartial("/src20", {
      timeframe: newTimeframe,
      viewType,
      sortBy,
      sortDirection,
    }, false);
  }, [viewType, sortBy, sortDirection]);

  const handleTrendingClick = useCallback(() => {
    const newFilter = sortBy === "TRENDING" ? "DEPLOY" : "TRENDING";
    navigateWithFreshPartial("/src20", {
      sortBy: newFilter,
      sortDirection,
      viewType,
      timeframe,
    }, true);
  }, [sortBy, sortDirection, viewType, timeframe]);

  /* ===== COUNT PILL ===== */
  // Reflects only the currently active MINTED/MINTING view.
  const countPill = formatNumberWithCommas(currentTotal);

  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col w-full gap-1.5">
      <div class="relative flex flex-row justify-between items-start w-full">
        {/* ===== TITLE ===== */}
        <h1 class={titlePrimary}>
          <span class="hidden min-[420px]:inline">SRC-20&nbsp;</span>TOKENS
        </h1>
        <PillContentCount value={countPill} />
      </div>

      {/* ===== MINTED/MINTING, TRENDING AND TIMEFRAME BUTTONS ===== */}
      <ScrollFadeRow deps={[viewType, sortBy, timeframe]}>
        {/* Minting/Minted */}
        <div class="shrink-0">
          <SelectorButtons
            options={[
              { value: "minted", label: "MINTED" },
              { value: "minting", label: "MINTING" },
            ]}
            value={viewType}
            onChange={handleViewTypeClick}
            size="xsR"
            color="primary"
          />
        </div>

        {/* Timeframe Buttons - Right */}
        <div class="shrink-0 flex ml-auto gap-3">
          <div class={container2Icon}>
            <TrendingButton
              selected={sortBy === "TRENDING"}
              onClick={handleTrendingClick}
            />
          </div>
          <SelectorButtons
            options={[
              { value: "24H", label: "24H" },
              { value: "7D", label: "7D" },
              { value: "30D", label: "30D" },
            ]}
            value={timeframe}
            onChange={handleTimeframeClick}
            size="xsR"
            color="primary"
          />
        </div>
      </ScrollFadeRow>
    </div>
  );
};
