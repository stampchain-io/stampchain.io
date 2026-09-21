/* ===== COLLECTION LIST CARD COMPONENT ===== */
import { shadowGlowGrey, transitionAll } from "$layout";
import type { CollectionsBannerProps } from "$types/ui.d.ts";
import { useState } from "preact/hooks";

/* ===== STYLES ===== */
const containerClassName =
  `border-2 border-color-grey-semidark rounded-2xl relative overflow-hidden
  w-full h-[92px] mobileMd:h-[116px] mobileLg:h-[130px] tablet:h-[148px] desktop:h-[160px]`;
const imageContentClassName =
  `bg-center bg-no-repeat bg-[length:100%] w-full h-full grayscale ${transitionAll}`;
const gradientContentClassName =
  "w-full h-full bg-gradient-to-tr absolute left-0 top-0";
const nameClassName = `hidden mobileLg:block
  text-xl desktop:text-2xl font-black uppercase
  absolute mobileLg:left-[14px] mobileLg:bottom-[9px] tablet:left-3 tablet:bottom-[6px] desktop:left-[18px] desktop:bottom-3
`;

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
export function CollectionsBanner(
  { collection, isDarkMode }: CollectionsBannerProps,
) {
  /* ===== STATE ===== */
  const [isHovered, setIsHovered] = useState(false);

  // Guard against undefined collection
  if (!collection) return null;

  /* ===== COMPONENT ===== */
  return (
    <a
      href={`/collection/${collection.collection_name ?? ""}`}
      class={`${containerClassName} ${isHovered ? shadowGlowGrey : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        class={`${imageContentClassName} ${isHovered ? "grayscale-0" : ""}`}
        style={{
          backgroundImage: `url('${
            collection.first_stamp_image ?? collection.img ??
              "/default-collection-image.png"
          }')`,
        }}
      >
      </div>
      <div
        class={`${gradientContentClassName} ${
          isDarkMode
            ? "from-color-grey-semidark/100 via-color-grey/50 to-color-grey-semilight/0"
            : "from-color-grey-semilight/100 via-color-grey/50 to-color-grey-semidark/0"
        } ${isHovered ? "hidden" : ""}`}
      />
      <h3
        class={`${nameClassName} ${
          isDarkMode ? "text-color-grey-light" : "text-color-grey-dark"
        } ${isHovered ? "!hidden" : ""}`}
      >
        {collection.collection_name}
      </h3>
    </a>
  );
}
