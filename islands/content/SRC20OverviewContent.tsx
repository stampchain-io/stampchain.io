/* ===== SRC20 OVERVIEW CONTENT COMPONENT ===== */
import type { SRC20OverviewContentProps } from "$types/ui.d.ts";
import { useState } from "preact/hooks";
// import type { SRC20Row } from "$types/src20.d.ts"; // Removed unused import
import { SRC20OverviewHeader } from "$header";
import { container2 } from "$layout";
import { SRC20Gallery } from "$section";
import {
  createFreshPaginationHandler,
  navigateWithFreshPartial,
} from "$utils/navigation/freshNavigationUtils.ts";

/* ===== TYPES ===== */
type SortOption =
  | "TRENDING"
  | "DEPLOY"
  | "HOLDERS"
  | "PROGRESS"
  | "MARKET_CAP"
  | "VOLUME";

/* ===== COMPONENT ===== */
export function SRC20OverviewContent({
  mintingData,
  timeframe,
  sortBy,
  sortDirection,
  viewType, // 🎸 NEW: Accept viewType prop
  btcPrice: _btcPrice, // 🚀 PERFORMANCE: Accept BTC price (for future use)
  btcPriceSource: _btcPriceSource, // 🚀 PERFORMANCE: Accept BTC price source (for future use)
}: SRC20OverviewContentProps) {
  // Note: btcPrice and btcPriceSource are available for future component optimizations
  // Currently passed through context but not directly used in this component

  const [currentTimeframe, setCurrentTimeframe] = useState<
    "24H" | "7D" | "30D"
  >(timeframe as "24H" | "7D" | "30D");
  const [isNavigating, setIsNavigating] = useState(false);

  // Get the current data (simplified) - all tokens are in mintingData
  const currentData = mintingData?.data || [];
  const totalPages = mintingData?.totalPages || 1;
  const currentPage = mintingData?.page || 1;
  const [currentSort, setCurrentSort] = useState<{
    filter: SortOption | null;
    direction: "asc" | "desc";
  }>({
    filter: sortBy as SortOption,
    direction: sortDirection as "asc" | "desc",
  });

  // Handle filter changes
  const handleFilterChange = (
    filter: SortOption | null,
    direction: "asc" | "desc",
  ) => {
    setCurrentSort({ filter, direction });
    setIsNavigating(true); // ✅ FRESH.JS: Set loading state

    // Use centralized Fresh partial navigation
    navigateWithFreshPartial("/src20", {
      sortBy: filter || "TRENDING",
      sortDirection: direction,
    }, true); // Reset to page 1

    // Reset loading state after a short delay (Fresh.js will handle the actual navigation)
    setTimeout(() => setIsNavigating(false), 100);
  };

  // Handle view type changes
  const handleViewTypeChange = (viewType: string) => {
    // 🎸 MINTING BUTTON: Use the provided view type instead of toggling
    setIsNavigating(true);

    // Use centralized Fresh partial navigation
    navigateWithFreshPartial("/src20", {
      viewType: viewType,
    }, true); // Reset to page 1

    // Reset loading state after a short delay
    setTimeout(() => setIsNavigating(false), 100);
  };

  // Handle timeframe changes
  const handleTimeframeChange = (newTimeframe: string) => {
    if (
      newTimeframe === "24H" || newTimeframe === "7D" || newTimeframe === "30D"
    ) {
      setCurrentTimeframe(newTimeframe);
      setIsNavigating(true);

      // Navigate with the new timeframe parameter
      navigateWithFreshPartial("/src20", {
        timeframe: newTimeframe,
        sortBy: currentSort.filter || "TRENDING",
        sortDirection: currentSort.direction,
        viewType: viewType || "minted",
      }, false); // Don't reset page when changing timeframe

      // Reset loading state after a short delay
      setTimeout(() => setIsNavigating(false), 100);
    }
  };

  return (
    <div class="w-full">
      {/* ✅ FRESH.JS: Show loading overlay during navigation */}
      {isNavigating && (
        <div class="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div class={`${container2} p-4 shadow-lg`}>
            <div class="animate-spin w-6 h-6 border-2 border-color-purple-light border-t-transparent rounded-full">
            </div>
          </div>
        </div>
      )}
      <SRC20OverviewHeader
        onViewTypeChange={handleViewTypeChange}
        viewType={viewType || "minted"} // 🔧 Fix TS2375: Provide default when undefined
        onTimeframeChange={handleTimeframeChange}
        onFilterChange={(filter: string, direction?: "asc" | "desc") =>
          handleFilterChange(filter as SortOption | null, direction || "desc")}
        currentSort={currentSort}
      />
      <SRC20Gallery
        viewType={viewType || "minted"} // 🔧 Fix TS2375: Provide default when undefined
        fromPage="src20"
        initialData={currentData}
        timeframe={currentTimeframe}
        currentSort={currentSort} // 🎯 NEW: Pass currentSort for table header sorting
        pagination={{
          page: currentPage,
          totalPages: totalPages,
          onPageChange: createFreshPaginationHandler("/src20"),
        }}
      />
    </div>
  );
}
