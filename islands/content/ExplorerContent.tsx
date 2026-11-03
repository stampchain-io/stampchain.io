/* ===== EXPLORER CONTENT COMPONENT ===== */
import { PaginationButtons } from "$button";
import { StampCard } from "$card";
import {
  ExplorerTableBase,
  type MixedItem,
} from "$components/table/explorerTable/ExplorerTableBase.tsx";
import { SRC20Card } from "$islands/card/SRC20Card.tsx";
import { EmptyState, gridCard } from "$layout";
import type { ExplorerContentProps } from "$types/ui.d.ts";

/* ===== COMPONENT ===== */
export function ExplorerContent({
  stamps,
  mixedItems,
  isRecentSales = false,
  pagination,
  src20DataCard,
  section = "all",
  viewMode = "cardVertical",
  sortBy = "DESC",
}: ExplorerContentProps) {
  // The server selects each page's records. Keep those page groups intact
  // for both the unified feed and the separate stamp/token queries.
  const mixed: MixedItem[] = mixedItems ?? (() => {
    const stampItems: MixedItem[] = (stamps ?? []).map((s) => ({
      kind: "stamp",
      item: s,
    }));
    const src20Items: MixedItem[] = (src20DataCard?.data ?? []).map((s) => ({
      kind: "src20",
      item: s,
    }));

    return [...stampItems, ...src20Items];
  })();

  /* ===== FILTER by section ===== */
  const sectionItems: MixedItem[] = section === "stamps"
    ? mixed.filter((e) => e.kind === "stamp")
    : section === "tokens"
    ? mixed.filter((e) => e.kind === "src20")
    : mixed;

  // Read each page from earliest to latest without changing its membership
  // or mutating the server data. Recent sales retain their sale-time order.
  const visible = (() => {
    if (isRecentSales) return sectionItems;
    if (mixedItems) {
      // The unified feed knows the transaction order even when hydrated
      // tokens omit tx_index. Reverse that order rather than sorting again.
      return sortBy === "ASC" ? sectionItems : [...sectionItems].reverse();
    }

    return [...sectionItems].sort((a, b) => {
      const blockDiff = Number(a.item.block_index) - Number(b.item.block_index);
      if (blockDiff !== 0) return blockDiff;

      const aTxIndex = (a.item as { tx_index?: number | null }).tx_index;
      const bTxIndex = (b.item as { tx_index?: number | null }).tx_index;
      if (aTxIndex == null || bTxIndex == null) return 0;
      const aIndex = Number(aTxIndex);
      const bIndex = Number(bTxIndex);
      return Number.isFinite(aIndex) && Number.isFinite(bIndex)
        ? aIndex - bIndex
        : 0;
    });
  })();

  /* ===== RENDER ===== */
  return (
    <div class="w-full pt-3">
      {viewMode === "cardRow"
        ? (
          /* ===== ROW TABLE VIEW ===== */
          <ExplorerTableBase items={visible} section={section} />
        )
        : visible.length === 0
        ? (
          <EmptyState
            label={section === "stamps"
              ? "NO STAMPS TO DISPLAY"
              : section === "tokens"
              ? "NO TOKENS TO DISPLAY"
              : "NO STAMPS OR TOKENS TO DISPLAY"}
            icon={section === "stamps"
              ? "artStamps"
              : section === "tokens"
              ? "src20Tokens"
              : ["artStamps", "src20Tokens"]}
          />
        )
        : (
          /* ===== CARD GRID VIEW ===== */
          // Explorer page opts into the Md grid tier (2/3/4/5/6 cols) even
          // in cardSquare view — other galleries keep the denser Sm tier.
          <div class={gridCard(viewMode, true)}>
            {visible.map((entry, index) => {
              const key = entry.kind === "stamp"
                ? (isRecentSales && entry.item.sale_data
                  ? `${entry.item.tx_hash}-${entry.item.sale_data.tx_hash}-${entry.item.sale_data.block_index}-${index}`
                  : entry.item.tx_hash)
                : entry.item.tx_hash;

              const card = entry.kind === "stamp"
                ? (
                  <StampCard
                    stamp={entry.item}
                    isRecentSale={isRecentSales}
                    variant={viewMode === "cardSquare"
                      ? "cardSquare"
                      : "cardVerticalDetail"}
                  />
                )
                : (
                  <SRC20Card
                    src20={entry.item}
                    variant={viewMode === "cardSquare"
                      ? "cardSquare"
                      : "cardVerticalDetail"}
                  />
                );

              // MINIMAL view: square each cell so a taller SRC20 card can't
              // stretch the row and break the stamp's 1:1 aspect ratio.
              // Detailed view is rendered exactly as before.
              return viewMode === "cardSquare"
                ? (
                  <div key={key} class="w-full max-w-72 mx-auto aspect-square">
                    {card}
                  </div>
                )
                : <div key={key} class="contents">{card}</div>;
            })}
          </div>
        )}

      {/* ===== PAGINATION ===== */}
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
