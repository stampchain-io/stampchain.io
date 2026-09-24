/* ===== MARKETPLACE CONTENT COMPONENT ===== */
import { PaginationButtons } from "$button";
import { StampCard } from "$card";
import { MarketplaceTableBase } from "$components/table/marketplaceTable/MarketplaceTableBase.tsx";
import { EmptyState, gridCard } from "$layout";
import type { StampCardVariant, StampRow } from "$types/stamp.d.ts";
import type { MarketplaceContentProps } from "$types/ui.d.ts";

/* ===== COMPONENT ===== */
export function MarketplaceContent({
  stamps,
  isRecentSales = false,
  pagination,
  viewMode = "cardVertical",
}: MarketplaceContentProps) {
  const cardVariant: StampCardVariant = viewMode === "cardSquare"
    ? "cardSquare"
    : isRecentSales
    ? "cardVerticalSale"
    : "cardVerticalListing";

  /* ===== RENDER ===== */
  return (
    <div class="w-full pt-3">
      {viewMode === "cardRow"
        ? (
          /* ===== ROW TABLE VIEW ===== */
          <MarketplaceTableBase
            stamps={stamps ?? []}
            isRecentSales={isRecentSales}
          />
        )
        : stamps?.length
        ? (
          /* ===== CARD GRID VIEW ===== */
          <div class={gridCard(viewMode)}>
            {stamps.map((stamp: StampRow, index: number) => (
              <StampCard
                key={isRecentSales && stamp.sale_data
                  ? `${stamp.tx_hash}-${stamp.sale_data.tx_hash}-${stamp.sale_data.block_index}-${index}`
                  : stamp.tx_hash}
                stamp={stamp}
                isRecentSale={isRecentSales}
                variant={cardVariant}
              />
            ))}
          </div>
        )
        : (
          <EmptyState
            label={isRecentSales
              ? "NO SALES TO DISPLAY"
              : "NO LISTINGS TO DISPLAY"}
            icon="artStamps"
          />
        )}
      {pagination && (
        <PaginationButtons
          page={pagination.page}
          totalPages={pagination.totalPages}
          {...(pagination.prefix && { prefix: pagination.prefix })}
          {...(pagination.onPageChange &&
            { onPageChange: pagination.onPageChange })}
        />
      )}
    </div>
  );
}
