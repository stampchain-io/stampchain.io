/* ===== SRC20 OVERVIEW CONTENT COMPONENT ===== */
import { SRC20Gallery } from "$section";
import type { SRC20OverviewContentProps } from "$types/ui.d.ts";
import { createFreshPaginationHandler } from "$utils/navigation/freshNavigationUtils.ts";

/* ===== TYPES ===== */
type SortOption =
  | "TRENDING"
  | "DEPLOY"
  | "HOLDERS"
  | "PROGRESS"
  | "MARKET_CAP"
  | "VOLUME"
  | "PRICE"
  | "CHANGE"
  | "TOKEN";

/* ===== COMPONENT ===== */
export function SRC20OverviewContent({
  mintingData,
  timeframe,
  sortBy,
  sortDirection,
  viewType,
  btcPrice: _btcPrice,
  btcPriceSource: _btcPriceSource,
}: SRC20OverviewContentProps) {
  const currentData = mintingData?.data || [];
  const totalPages = mintingData?.totalPages || 1;
  const currentPage = mintingData?.page || 1;

  // Derived directly from server props — no local state needed since all
  // navigation is now handled by SRC20OverviewHeader.
  const currentSort = {
    filter: (sortBy || "TRENDING") as SortOption | null,
    direction: (sortDirection || "desc") as "asc" | "desc",
  };

  return (
    <div class="w-full">
      <SRC20Gallery
        viewType={viewType || "minted"}
        fromPage="src20"
        initialData={currentData}
        timeframe={(timeframe || "24H") as "24H" | "7D" | "30D"}
        currentSort={currentSort}
        pagination={{
          page: currentPage,
          totalPages: totalPages,
          onPageChange: createFreshPaginationHandler("/src20"),
        }}
      />
    </div>
  );
}
