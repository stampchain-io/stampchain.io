/* ===== STAMP OVERVIEW GALLERY COMPONENT ===== */
import { containerBackground, containerGap } from "$layout";
import { StampGallery } from "$section";
import { titleNeutral } from "$text";
import type {
  StampGalleryProps,
  StampOverviewGalleryProps,
} from "$types/stamp.d.ts";

/* ===== COMPONENT ===== */
export function StampOverviewGallery({
  stamps_src721 = [],
  stamps_art = [],
  stamps_posh = [],
  collectionData: _collectionData = [],
}: StampOverviewGalleryProps) {
  /* ===== SECTION CONFIGURATIONS ===== */
  const LatestArtStampsSection: StampGalleryProps[] = [
    {
      subTitle: "CLASSIC",
      type: "classic",
      stamps: stamps_art,
      fromPage: "home",
      layout: "grid",
      variant: "image" as const,
      viewAllLink: "/stamp/art",
      gridClass: `
        grid w-full gap-6
        grid-cols-2 mobileMd:grid-cols-3 mobileLg:grid-cols-4 tablet:grid-cols-5 desktop:grid-cols-6
        auto-rows-fr
      `,
      displayCounts: {
        mobileSm: 8,
        mobileMd: 12,
        mobileLg: 16,
        tablet: 20,
        desktop: 24,
      },
    },
  ];

  const CollectionsSection: StampGalleryProps[] = [
    {
      subTitle: "FRESH POSH STAMPS",
      type: "posh",
      stamps: stamps_posh,
      fromPage: "home",
      layout: "grid",
      variant: "image" as const,
      viewAllLink: "/collection/posh",
      gridClass: `
        grid w-full gap-3 mobileMd:gap-6
        grid-cols-2 mobileMd:grid-cols-3 mobileLg:grid-cols-4 tablet:grid-cols-6 desktop:grid-cols-7
        auto-rows-fr
      `,
      displayCounts: {
        mobileSm: 4,
        mobileMd: 6,
        mobileLg: 8,
        tablet: 12,
        desktop: 14,
      },
    },
    {
      subTitle: "RECENT RECURSIVE",
      filterBy: "recursive",
      stamps: stamps_src721,
      fromPage: "home",
      layout: "grid",
      variant: "image" as const,
      viewAllLink: "/collection/recursive",
      gridClass: `
        grid w-full gap-3 mobileMd:gap-6
        grid-cols-4 mobileLg:grid-cols-5 tablet:grid-cols-6 desktop:grid-cols-6
        auto-rows-fr
      `,
      displayCounts: {
        mobileSm: 8,
        mobileLg: 10,
        tablet: 12,
        desktop: 12,
      },
    },
  ];

  /* ===== RENDER ===== */
  return (
    <div class="
        flex flex-col max-w-desktop w-full mx-auto
        gap-12 mobileLg:gap-24 desktop:gap-36
      ">
      {/* ===== LATEST ART STAMPS SECTION ===== */}
      <div class={`${containerBackground} ${containerGap}`}>
        <div class="w-full -mb-6 mobileLg:-mb-9">
          <h1 class={titleNeutral}>
            <span class="block mobileLg:hidden">LATEST STAMPS</span>
            <span class="hidden mobileLg:block">LATEST ART STAMPS</span>
          </h1>
        </div>
        <div class="flex flex-col gap-5">
          {LatestArtStampsSection.map((section, index) => (
            <StampGallery key={index} {...section} />
          ))}
        </div>

        {
          /* ===== FEATURED ARTISTS SECTION =====
      <CollectionGallery {...FeaturedArtistsSection} />*/
        }

        {/* ===== COLLECTIONS SECTION ===== */}
        {CollectionsSection.map((section, index) => (
          <StampGallery key={index} {...section} />
        ))}

        {
          /* ===== CUTTING EDGE SECTION =====
      <CollectionGallery {...CuttingEdgeSection} />*/
        }
      </div>
    </div>
  );
}
