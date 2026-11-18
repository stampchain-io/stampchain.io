/* ===== COLLECTION GALLERY COMPONENT ===== */
/* @baba - not updated */
import { PaginationButtons, ViewAllButton } from "$button";
import {
  CollectionCardHorizontal,
  CollectionCardSquare,
  CollectionCardVertical,
} from "$card";
import { BREAKPOINTS } from "$constants";
import { gridCardMd, gridCardSm } from "$layout";
import { useWindowSize } from "$lib/hooks/useWindowSize.ts";
import { subtitleNeutral, titleNeutral } from "$text";
import type { Collection } from "$types/stamp.d.ts";
import { useEffect, useState } from "preact/hooks";
// Local copy of props to avoid importing server-only types
export interface CollectionGalleryProps {
  title?: string;
  subTitle?: string;
  collections: Collection[];
  gridClass?: string;
  displayCounts?: {
    desktop?: number;
    tablet?: number;
    mobileLg?: number;
    mobileMd?: number;
    mobileSm?: number;
  };
  pagination?: {
    page: number;
    totalPages: number;
    prefix?: string;
    onPageChange?: (page: number) => void;
  };
  viewAllHref?: string;
  // "cardHorizontal" (default): full-width row card with background image.
  // "cardVertical": StampCard-style square grid card with info column.
  // "cardSquare": StampCard-style bare square thumbnail, no info column -
  // densest grid tier.
  viewMode?: "cardHorizontal" | "cardVertical" | "cardSquare";
}

/* ===== STATE ===== */
export default function CollectionGallery({
  title,
  subTitle,
  collections,
  gridClass,
  displayCounts,
  pagination,
  viewAllHref,
  viewMode = "cardHorizontal",
}: CollectionGalleryProps) {
  const { width } = useWindowSize();
  // Empty-collection and known test/placeholder name filtering is enforced
  // server-side (CollectionRepository) so this list always matches the
  // overview page's total count pill.
  const collectionArray = Array.isArray(collections) ? collections : [];
  const [displayCount, setDisplayCount] = useState(collectionArray.length);

  /* ===== EVENT HANDLERS ===== */
  const handlePageChange = (page: number) => {
    if (pagination?.onPageChange) {
      pagination.onPageChange(page);
    } else {
      // SSR-safe browser environment check
      if (typeof globalThis === "undefined" || !globalThis?.location) {
        return; // Cannot navigate during SSR
      }
      const url = new URL(globalThis.location.href);
      url.searchParams.set("page", page.toString());
      globalThis.location.href = url.toString();
    }
  };

  useEffect(() => {
    const updateDisplayCount = () => {
      if (displayCounts) {
        if (width >= BREAKPOINTS.desktop) {
          setDisplayCount(displayCounts.desktop || collectionArray.length);
        } else if (width >= BREAKPOINTS.tablet) {
          setDisplayCount(
            displayCounts.tablet || displayCounts.desktop ||
              collectionArray.length,
          );
        } else if (width >= BREAKPOINTS.mobileLg) {
          setDisplayCount(
            displayCounts.mobileLg || displayCounts.tablet ||
              displayCounts.desktop || collectionArray.length,
          );
        } else {
          setDisplayCount(
            displayCounts.mobileSm ||
              displayCounts.mobileMd ||
              displayCounts.mobileLg ||
              displayCounts.tablet ||
              displayCounts.desktop ||
              collectionArray.length,
          );
        }
      } else {
        setDisplayCount(collectionArray.length);
      }
    };
    updateDisplayCount();
  }, [width, displayCounts, collectionArray.length]);

  /* ===== RENDER ===== */
  const grid = gridClass ??
    (viewMode === "cardSquare"
      ? gridCardSm
      : viewMode === "cardVertical"
      ? gridCardMd
      : "grid grid-cols-1 tablet:grid-cols-2 gap-3");
  const CardComponent = viewMode === "cardSquare"
    ? CollectionCardSquare
    : viewMode === "cardVertical"
    ? CollectionCardVertical
    : CollectionCardHorizontal;
  return (
    <div>
      {title && <h3 class={titleNeutral}>{title}</h3>}
      {subTitle && (
        <h4
          class={subtitleNeutral +
            " mb-3 mobileMd:mb-6"}
        >
          {subTitle}
        </h4>
      )}
      <div class={grid}>
        {collectionArray.slice(0, displayCount).map((
          collection: Collection,
        ) => (
          <CardComponent
            key={collection.collection_id}
            collection={collection}
          />
        ))}
      </div>
      {viewAllHref && <ViewAllButton href={viewAllHref} />}

      {pagination && (
        <PaginationButtons
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
          {...(pagination.prefix && { prefix: pagination.prefix })}
        />
      )}
    </div>
  );
}
