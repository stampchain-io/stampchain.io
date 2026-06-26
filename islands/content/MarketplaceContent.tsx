/* ===== MARKETPLACE CONTENT COMPONENT ===== */
import { PaginationButtons } from "$button";
import { StampCard } from "$card";
import { containerBackground } from "$layout";
import { valueDark } from "$text";
import type { StampCardVariant, StampRow } from "$types/stamp.d.ts";
import type { MarketplaceContentProps } from "$types/ui.d.ts";

/* ===== COMPONENT ===== */
export function MarketplaceContent({
  stamps,
  isRecentSales = false,
  pagination,
  viewMode = "detail",
}: MarketplaceContentProps) {
  const cardVariant: StampCardVariant = viewMode === "minimal"
    ? "image"
    : "imageDetail";

  /* ===== RENDER ===== */
  return (
    <div class="w-full pt-3 mobileMd:pt-6">
      {stamps?.length
        ? (
          <div class="grid grid-cols-2 mobileMd:grid-cols-3 mobileLg:grid-cols-4 tablet:grid-cols-5 desktop:grid-cols-6 gap-3 mobileMd:gap-6 w-full auto-rows-fr">
            {stamps.map((stamp: StampRow, index: number) => (
              <StampCard
                key={isRecentSales && stamp.sale_data
                  ? `${stamp.tx_hash}-${stamp.sale_data.tx_hash}-${stamp.sale_data.block_index}-${index}`
                  : stamp.tx_hash}
                stamp={stamp}
                isRecentSale={isRecentSales}
                variant={cardVariant}
                fromPage="marketplace"
              />
            ))}
          </div>
        )
        : (
          <div
            class={`${containerBackground} flex-col flex justify-center items-center`}
          >
            <img src="/img/ic_content.svg" width="160" />
            <h6 class={`py-2 ${valueDark} text-center`}>NO LISTINGS</h6>
          </div>
        )}
      {pagination && pagination.totalPages > 1 && (
        <div class="mt-7.5 tablet:mt-10">
          <PaginationButtons
            page={pagination.page}
            totalPages={pagination.totalPages}
            {...(pagination.prefix && { prefix: pagination.prefix })}
            {...(pagination.onPageChange &&
              { onPageChange: pagination.onPageChange })}
          />
        </div>
      )}
    </div>
  );
}
