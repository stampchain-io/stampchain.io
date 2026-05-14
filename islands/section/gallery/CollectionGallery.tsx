/* ===== COLLECTION GALLERY COMPONENT ===== */
import { BREAKPOINTS } from "$constants";
import { useWindowSize } from "$lib/hooks/useWindowSize.ts";
import { CollectionsBanner } from "$section";
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
}

/* ===== STATE ===== */
export default function CollectionGallery({
  title,
  subTitle,
  collections,
  gridClass,
  displayCounts,
}: CollectionGalleryProps) {
  const collectionArray = Array.isArray(collections) ? collections : [];
  const [displayCount, setDisplayCount] = useState(collectionArray.length);
  const { width } = useWindowSize();

  /* ===== EVENT HANDLERS ===== */
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
  const grid = gridClass ?? "grid grid-cols-1 gap-4";
  return (
    <div>
      {title && <h3 class={titleNeutral}>{title}</h3>}
      {subTitle && (
        <h4
          class={subtitleNeutral +
            "mb-6"}
        >
          {subTitle}
        </h4>
      )}
      <div class={grid}>
        {collectionArray.slice(0, displayCount).map((
          collection: Collection,
          key: number,
        ) => (
          <CollectionsBanner
            key={collection.collection_id}
            collection={collection}
            isDarkMode={key % 2 ? false : true}
          />
        ))}
      </div>
    </div>
  );
}
