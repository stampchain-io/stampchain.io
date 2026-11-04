/* ===== STAMP GALLERY HOME COMPONENT ===== */
import { containerBackground, containerGap } from "$layout";
import type { BrandChain } from "$lib/utils/chain/brand.ts";
import {
  StampGallery,
  StampListingsGallery,
  StampSalesGallery,
} from "$section";
import type {
  StampGalleryHomeProps,
  StampGalleryProps,
} from "$types/stamp.d.ts";

/**
 * Renders the three stamp galleries shown on the home page, in order:
 *   1. Latest Creations — combined ART/POSH/SRC-721 stamps (SSR-only, via
 *      StampGallery), sorted by tx_index (most recent first).
 *   2. New Listings — stamps with open dispensers (SSR-only, via
 *      StampListingsGallery), using the compact horizontal listing card
 *      variant.
 *   3. Recent Sales — stamps with a completed sale (SSR + client-side
 *      polling every 3 min, via StampSalesGallery).
 */
export function StampGalleryHome({
  stamps_src721 = [],
  stamps_art = [],
  stamps_posh = [],
  collectionData: _collectionData = [],
  recentSalesData = [],
  newListingsData = [],
  chain = "bitcoin",
}: StampGalleryHomeProps & { chain?: BrandChain }) {
  const isEcx = chain === "ecx";
  /* ===== SECTION CONFIGURATION ===== */
  // Combine Classic, Posh, and Recursive stamps into a single gallery,
  // sorted by recency (tx_index) so the latest stamps across all types
  // surface first regardless of which type they belong to.
  const combinedStamps = [...stamps_art, ...stamps_posh, ...stamps_src721]
    .sort((a, b) => (b.tx_index ?? 0) - (a.tx_index ?? 0));

  const CombinedArtStampsSection: StampGalleryProps = {
    ...(isEcx ? {} : { title: "ART STAMPS", subTitle: "LATEST CREATIONS" }),
    type: "all",
    stamps: combinedStamps,
    variant: "cardSquare" as const,
    viewAllLink: "/explorer?section=stamps",
    gridClass: `
      ${isEcx ? "estamps-art-grid " : ""}grid w-full gap-6
      grid-cols-2 min-[420px]:grid-cols-3 mobileMd:grid-cols-4 mobileLg:grid-cols-5 tablet:grid-cols-6 desktop:grid-cols-7
      auto-rows-fr
    `,
    displayCounts: {
      mobileSm: 6,
      mobileMd: 8,
      mobileLg: 10,
      tablet: 12,
      desktop: 14,
    },
  };

  /* ===== RENDER ===== */
  return (
    <div class="
        flex flex-col max-w-desktop w-full mx-auto
        gap-12 mobileLg:gap-24 desktop:gap-36
      ">
      {/* ===== STAMPS SECTION ===== */}
      <div
        class={`${
          isEcx ? "estamps-gallery-surface " : ""
        }${containerBackground} ${containerGap}`}
      >
        {/* ===== LATEST CREATIONS ===== */}
        {isEcx && <h2 class="estamps-section-title">Latest creations</h2>}
        <StampGallery {...CombinedArtStampsSection} showStampNumbers={isEcx} />

        {/* ===== NEW LISTINGS ===== */}
        <StampListingsGallery
          subTitle="LISTINGS"
          initialData={newListingsData}
        />

        {/* ===== RECENT SALES ===== */}
        <StampSalesGallery
          subTitle="RECENT SALES"
          initialData={recentSalesData}
        />
      </div>
    </div>
  );
}
