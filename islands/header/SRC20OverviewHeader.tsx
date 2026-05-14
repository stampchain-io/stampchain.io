/* ===== SRC20 HEADER COMPONENT ===== */
/* @baba - update search button styling */
import { SelectorButtons, ToggleButton } from "$button";
import { titleNeutral } from "$text";
import type { SRC20OverviewHeaderProps } from "$types/ui.d.ts";
import { useCallback, useState } from "preact/hooks";

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
export const SRC20OverviewHeader = (
  {
    onViewTypeChange,
    viewType,
    onTimeframeChange,
    onFilterChange,
    currentSort,
  }: SRC20OverviewHeaderProps,
) => {
  // 🚀 SIMPLIFIED STATE: Reduced complexity with modern patterns
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("24H");

  // 🚀 PREACT OPTIMIZATION: Memoized handlers
  const handleViewTypeClick = useCallback((viewType: string) => {
    // Reset timeframe to default when switching views
    setSelectedTimeframe("24H");
    onTimeframeChange?.("24H");
    // Pass the new view type to the parent component
    onViewTypeChange?.(viewType);
  }, [onViewTypeChange, onTimeframeChange]);

  const handleTimeframeClick = useCallback(
    (timeframe: string) => {
      setSelectedTimeframe(timeframe);
      onTimeframeChange?.(timeframe as "24H" | "7D" | "30D");
    },
    [onTimeframeChange],
  );

  const handleTrendingClick = useCallback(() => {
    const currentFilter = currentSort?.filter || "TRENDING";
    const newFilter = currentFilter === "TRENDING" ? "DEPLOY" : "TRENDING";
    onFilterChange?.(newFilter);
  }, [onFilterChange, currentSort?.filter]);

  /* ===== RENDER ===== */
  return (
    <div class="relative flex flex-col w-full gap-1.5">
      <div class="flex flex-row justify-between items-start w-full">
        {/* ===== TITLE ===== */}
        <h1 class={`${titleNeutral} ml-1.5`}>SRC-20 TOKENS</h1>
      </div>

      {/* ===== TRENDING, MINTED/MINTING AND TIMEFRAME BUTTONS ===== */}
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
            size="smR"
            color="grey"
            className="w-full mobileMd:w-auto"
          />
        </div>

        {/* Trending and Timeframes - Right */}
        <div class="flex justify-between pt-3 mobileLg:pt-0 gap-3">
          {/* Trending Toggle */}
          <div class="mt-[3px]">
            <ToggleButton
              options={["TRENDING"]}
              selected={currentSort?.filter === "TRENDING" ? "TRENDING" : ""}
              onChange={handleTrendingClick}
              mode="single"
              size="smR"
              color="grey"
            />
          </div>

          {/* Timeframe Buttons */}
          <SelectorButtons
            options={[
              { value: "24H", label: "24H" },
              { value: "7D", label: "7D" },
              { value: "30D", label: "30D" },
            ]}
            value={selectedTimeframe}
            onChange={handleTimeframeClick}
            size="smR"
            color="grey"
          />
        </div>
      </div>
    </div>
  );
};
