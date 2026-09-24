/* ===== COLLECTION OVERVIEW CONTENT COMPONENT ===== */
import CollectionGallery from "$islands/section/gallery/CollectionGallery.tsx";
import type { CollectionOverviewContentProps } from "$types/ui.d.ts";

/* ===== COMPONENT ===== */
export function CollectionOverviewContent({
  collections = [],
  pagination,
  viewMode = "cardHorizontal",
}: CollectionOverviewContentProps) {
  /* ===== RENDER ===== */
  return (
    <div class="w-full pt-3">
      <CollectionGallery
        collections={collections}
        viewMode={viewMode}
        {...(pagination && { pagination })}
      />
    </div>
  );
}
