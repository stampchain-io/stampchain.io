/* ===== SRC20 HEADER COMPONENT ===== */
import { SelectorButtons, ToggleButton } from "$button";
import {
  navigateWithFreshPartial,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { titlePrimary } from "$text";
import type { SRC20OverviewHeaderProps } from "$types/ui.d.ts";
import { useCallback } from "preact/hooks";

/* ===== COMPONENT ===== */
export const SRC20OverviewHeader = ({
  viewType = "minted",
  timeframe = "24H",
  sortBy = "TRENDING",
  sortDirection = "desc",
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

  /* ===== RENDER ===== */
  return (
    <div class="relative flex flex-col w-full gap-1.5">
      <div class="flex flex-row justify-between items-start w-full">
        {/* ===== TITLE ===== */}
        <h1 class={`${titlePrimary} ml-1.5`}>SRC-20 TOKENS</h1>
      </div>

      {/* ===== MINTED/MINTING, TRENDING AND TIMEFRAME BUTTONS ===== */}
      <div class="flex flex-col mobileLg:flex-row justify-between w-full">
        {/* Minting/Minted */}
        <div class="flex gap-3 w-full mobileMd:w-auto">
          <SelectorButtons
            options={[
              { value: "minted", label: "MINTED" },
              { value: "minting", label: "MINTING" },
            ]}
            value={viewType}
            onChange={handleViewTypeClick}
            size="xsR"
            color="purple"
            className="w-full mobileMd:w-auto"
          />
        </div>

        {/* Trending and Timeframes - Right */}
        <div class="flex justify-between pt-3 mobileLg:pt-0 gap-3">
          {/* Trending Toggle */}
          <div class="mt-[3px]">
            <ToggleButton
              options={["TRENDING"]}
              selected={sortBy === "TRENDING" ? "TRENDING" : ""}
              onChange={handleTrendingClick}
              mode="single"
              size="xsR"
              color="purple"
            />
          </div>

          {/* Timeframe Buttons */}
          <SelectorButtons
            options={[
              { value: "24H", label: "24H" },
              { value: "7D", label: "7D" },
              { value: "30D", label: "30D" },
            ]}
            value={timeframe}
            onChange={handleTimeframeClick}
            size="xsR"
            color="purple"
          />
        </div>
      </div>
    </div>
  );
};
