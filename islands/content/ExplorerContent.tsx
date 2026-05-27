/* ===== EXPLORER CONTENT COMPONENT ===== */
import { PaginationButtons } from "$button";
import { StampCard } from "$card";
import { SRC20Card } from "$islands/card/SRC20Card.tsx";
import type { SRC20Row } from "$types/src20.d.ts";
import type { StampRow } from "$types/stamp.d.ts";
import type { ExplorerContentProps } from "$types/ui.d.ts";

/* ===== TYPES ===== */
type MixedItem =
  | { kind: "stamp"; item: StampRow }
  | { kind: "src20"; item: SRC20Row };

/* ===== COMPONENT ===== */
export function ExplorerContent({
  stamps,
  isRecentSales = false,
  pagination,
  fromPage,
  src20DataCard,
  section = "all",
}: ExplorerContentProps) {
  /* ===== MERGE + SORT by block_index DESC ===== */
  const stampItems: MixedItem[] = (stamps ?? []).map((s) => ({
    kind: "stamp",
    item: s,
  }));
  const src20Items: MixedItem[] = (src20DataCard?.data ?? []).map((s) => ({
    kind: "src20",
    item: s,
  }));

  const mixed: MixedItem[] = [...stampItems, ...src20Items].sort(
    (a, b) => Number(b.item.block_index) - Number(a.item.block_index),
  );

  /* ===== FILTER by section ===== */
  const visible: MixedItem[] = section === "stamps"
    ? mixed.filter((e) => e.kind === "stamp")
    : section === "tokens"
    ? mixed.filter((e) => e.kind === "src20")
    : mixed;

  /* ===== RENDER ===== */
  return (
    <div class="w-full pt-3 mobileMd:pt-6">
      {/* ===== OVERVIEW GRID ===== */}
      <div class="grid grid-cols-2 mobileMd:grid-cols-3 mobileLg:grid-cols-4 tablet:grid-cols-5 desktop:grid-cols-6 gap-6 w-full auto-rows-fr">
        {visible.map((entry, index) => {
          if (entry.kind === "stamp") {
            const stamp = entry.item;
            return (
              <StampCard
                key={isRecentSales && stamp.sale_data
                  ? `${stamp.tx_hash}-${stamp.sale_data.tx_hash}-${stamp.sale_data.block_index}-${index}`
                  : stamp.tx_hash}
                stamp={stamp}
                isRecentSale={isRecentSales}
                variant="imageDetail"
                {...(fromPage && { fromPage })}
              />
            );
          }
          return (
            <SRC20Card
              key={entry.item.tx_hash}
              src20={entry.item}
            />
          );
        })}
      </div>

      {/* ===== PAGINATION ===== */}
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
