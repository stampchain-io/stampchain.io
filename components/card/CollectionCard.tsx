/* ===== COLLECTION OVERVIEW CARD COMPONENT ===== */
import { UserProfileIcon } from "$icon";
import {
  container2Hover,
  containerCard,
  containerPill,
  shadowGlowPurple,
} from "$layout";
import {
  abbreviateAddress,
  formatBTC,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { tooltipButtonInCollapsible } from "$notification";
import {
  cardCreator,
  cardFileSize,
  cardPrice,
  cardStampNumber,
  cardSupply,
  textSm,
  valueSm,
} from "$text";
import type { CollectionWithOptionalMarketData } from "$types/index.d.ts";
import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useRef, useState } from "preact/hooks";

// Gap between the tooltip and the pill/screen edge, and the min distance
// the tooltip must keep from the viewport edges.
const TOOLTIP_GAP = 8;
const TOOLTIP_VIEWPORT_MARGIN = 8;

/* ===== PILL WITH TOOLTIP (instant on hover, no delay/timeout) ===== */
// Cards (e.g. CollectionCardHorizontal) clip their content with
// overflow-hidden to round the background image's corners, which would
// clip a plain `absolute` tooltip - `position: fixed` (via
// getBoundingClientRect, same pattern as StampingTool's
// tooltipButtonInCollapsible) escapes that clipping.
//
// However, an ancestor further up the tree (a backdrop-blur container)
// creates its own containing block for `position: fixed` descendants per
// the CSS spec (backdrop-filter/filter/transform all do this), which
// would make the tooltip resolve its position against that ancestor
// instead of the viewport - and since that ancestor scrolls with the
// page, the tooltip would drift further off the longer you scroll. A
// portal to `document.body` sidesteps this entirely, matching the
// pattern already used for dropdowns/drawers elsewhere (e.g.
// islands/header/Header.tsx).
function PillWithTooltip(
  { label, className, children }: {
    label: string;
    className: string;
    children: ComponentChildren;
  },
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  // `left`/`top` are the tooltip's anchor point: horizontally it's the
  // pill's center (paired with `translateX(-50%)` below, so it's
  // centered by construction rather than by a manual width subtraction).
  // `shiftX` nudges that anchor inward only when the pill sits close
  // enough to a viewport edge that a centered tooltip would otherwise
  // render off-screen.
  const [position, setPosition] = useState({ left: 0, top: 0, shiftX: 0 });

  const updatePosition = () => {
    const pillRect = wrapperRef.current?.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    if (!pillRect || !tooltipRect) return;

    const pillCenterX = pillRect.left + pillRect.width / 2;
    const halfTooltipWidth = tooltipRect.width / 2;
    const viewportWidth = globalThis.innerWidth;

    let shiftX = 0;
    const overflowLeft = TOOLTIP_VIEWPORT_MARGIN -
      (pillCenterX - halfTooltipWidth);
    const overflowRight = (pillCenterX + halfTooltipWidth) -
      (viewportWidth - TOOLTIP_VIEWPORT_MARGIN);
    if (overflowLeft > 0) {
      shiftX = overflowLeft;
    } else if (overflowRight > 0) {
      shiftX = -overflowRight;
    }

    // Prefer displaying above the pill; flip below if there isn't enough
    // room above (e.g. the pill sits near the top of the viewport).
    let top = pillRect.top - tooltipRect.height - TOOLTIP_GAP;
    if (top < TOOLTIP_VIEWPORT_MARGIN) {
      top = pillRect.bottom + TOOLTIP_GAP;
    }

    setPosition({ left: pillCenterX, top, shiftX });
  };

  // Keep the tooltip glued to the pill if the page scrolls/resizes while
  // it's still visible, instead of freezing at the position captured on
  // hover-enter.
  useEffect(() => {
    if (!isVisible) return;
    globalThis.addEventListener("scroll", updatePosition, {
      passive: true,
      capture: true,
    });
    globalThis.addEventListener("resize", updatePosition, { passive: true });
    return () => {
      globalThis.removeEventListener("scroll", updatePosition, {
        capture: true,
      } as EventListenerOptions);
      globalThis.removeEventListener("resize", updatePosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  return (
    <div
      ref={wrapperRef}
      class="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div class={className}>{children}</div>
      {typeof document !== "undefined" && createPortal(
        <div
          ref={tooltipRef}
          class={`${tooltipButtonInCollapsible} !mt-0 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{
            left: `${position.left}px`,
            top: `${position.top}px`,
            transform: `translateX(calc(-50% + ${position.shiftX}px))`,
          }}
        >
          {label}
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ===== HELPERS ===== */
// Visibility per gallery image index, aligned to the grid's column counts:
// base=4, min-[420px]=6, mobileMd=7, mobileLg=8, min-[880px]=9, tablet=7,
// desktop=9. Indices 7 and 8 need to reappear at mobileLg/min-[880px], hide
// again at tablet (fewer columns than the breakpoints just below it), then
// reappear at desktop - hence the non-cumulative classes.
const GALLERY_IMAGE_VISIBILITY = [
  "",
  "",
  "",
  "",
  "hidden min-[420px]:block",
  "hidden min-[420px]:block",
  "hidden mobileMd:block",
  "hidden mobileLg:block tablet:hidden desktop:block",
  "hidden min-[880px]:block tablet:hidden",
];

/* ===== COMPONENT ===== */
export function CollectionCard(
  { collection }: { collection: CollectionWithOptionalMarketData },
) {
  // Early return if collection is undefined
  if (!collection) {
    return null;
  }

  // Safe access to collection properties with fallbacks
  const collectionName = collection.collection_name ?? "Unknown Collection";
  const stampImage = collection.first_stamp_image ?? collection.img ?? "";
  const stampCount = collection.stamp_count ?? 0;

  const statsPills = (
    <>
      <PillWithTooltip
        label="STAMPS"
        className={`${containerPill} ${cardSupply}`}
      >
        {stampCount}
      </PillWithTooltip>
      <PillWithTooltip
        label="FLOOR PRICE"
        className={`${containerPill} ${cardPrice}`}
      >
        {collection.marketData?.floorPriceBTC
          ? formatBTC(collection.marketData.floorPriceBTC)
          : "N/A"} BTC
      </PillWithTooltip>
    </>
  );

  return (
    <a
      href={`/collection/${collectionName}`}
      className={`${container2Hover} ${shadowGlowPurple} !p-1 !gap-5 group`}
    >
      {/* ===== CARD HEADER ===== */}
      <div class="flex w-full gap-5">
        <div class="min-w-[126px] min-h-[126px] max-w-[126px] max-h-[126px] min-[480px]:min-w-[106px] min-[480px]:min-h-[106px] min-[480px]:max-w-[106px] min-[480px]:max-h-[106px] rounded-xl aspect-stamp image-rendering-pixelated overflow-hidden">
          <div class="relative flex items-center justify-center w-full h-full">
            <img
              src={stampImage}
              alt=""
              className="w-full h-full"
            />
          </div>
        </div>
        <div class="flex justify-between gap-3 w-full min-w-0">
          <div class="flex flex-col flex-1 min-w-0 mt-0.5">
            <h2 class={`${cardStampNumber} !text-lg`}>
              {collectionName.toUpperCase()}
            </h2>

            <h5 class="mt-1">
              <UserProfileIcon size="xxs" weight="bold">
                <span class={`${valueSm} normal-case`}>
                  {collection.creators && collection.creators.length > 0
                    ? (
                      <>
                        {/* Use creator name if available, otherwise fall back to address */}
                        {collection.creator_names &&
                            collection.creator_names.length > 0
                          ? <span>{collection.creator_names?.[0] ?? ""}</span>
                          : (
                            <>
                              <span class="min-[420px]:hidden">
                                {abbreviateAddress(
                                  collection.creators?.[0] ?? "",
                                  4,
                                )}
                              </span>
                              <span class="hidden min-[420px]:inline mobileMd:hidden">
                                {abbreviateAddress(
                                  collection.creators?.[0] ?? "",
                                  6,
                                )}
                              </span>
                              <span class="hidden mobileMd:inline mobileLg:hidden tablet:inline desktop:hidden">
                                {abbreviateAddress(
                                  collection.creators?.[0] ?? "",
                                  8,
                                )}
                              </span>
                              <span class="hidden mobileLg:inline tablet:hidden desktop:inline">
                                {abbreviateAddress(
                                  collection.creators?.[0] ?? "",
                                  12,
                                )}
                              </span>
                            </>
                          )}
                      </>
                    )
                    : "UNKNOWN"}
                </span>
              </UserProfileIcon>
            </h5>

            {/* ===== STATS (base breakpoint, left-aligned below BY) ===== */}
            <div class="flex flex-col items-start min-[480px]:hidden gap-2 pt-2">
              {statsPills}
            </div>

            {collection.collection_description && (
              <h6
                class={`${textSm} hidden min-[480px]:line-clamp-2 pt-2`}
              >
                {collection.collection_description}
              </h6>
            )}
          </div>

          {/* ===== STATS (min-[480px]+, top-right column) ===== */}
          <div class="hidden min-[480px]:flex flex-col items-end gap-2 shrink-0">
            {statsPills}
          </div>
        </div>
      </div>

      {/* ===== CARD GALLERY ===== */}
      <div class="grid grid-cols-4 min-[420px]:grid-cols-6 mobileMd:grid-cols-7 mobileLg:grid-cols-8 min-[880px]:grid-cols-9 tablet:grid-cols-7 desktop:grid-cols-8 mt-4 gap-5">
        {collection.stamp_images &&
          collection.stamp_images.slice(-9).reverse().map(
            (imageUrl: string, index: number) => {
              return (
                <div
                  className={`w-full h-full rounded-xl aspect-stamp image-rendering-pixelated overflow-hidden ${
                    GALLERY_IMAGE_VISIBILITY[index] ?? ""
                  }`}
                >
                  <div class="relative flex items-center justify-center w-full h-full">
                    <img
                      key={index}
                      src={imageUrl}
                      alt=""
                      className={`w-full h-full object-contain pixelart`}
                    />
                  </div>
                </div>
              );
            },
          )}
      </div>
    </a>
  );
}

/* ===== COMPONENT (VERTICAL VARIANT) ===== */
// Layout borrowed from StampCard's cardVerticalDetail: square image on top,
// then a centered info column below (CPID row skipped - collections have no
// CPID). Rows: name, creator, stamps+holders, floor price+mcap.
export function CollectionCardVertical(
  { collection }: { collection: CollectionWithOptionalMarketData },
) {
  // Early return if collection is undefined
  if (!collection) {
    return null;
  }

  // Safe access to collection properties with fallbacks
  const collectionName = collection.collection_name ?? "Unknown Collection";
  const stampImage = collection.first_stamp_image ?? collection.img ?? "";
  const stampCount = collection.stamp_count ?? 0;
  const holderCount = collection.marketData?.uniqueHolders ?? null;
  const floorPriceBTC = collection.marketData?.floorPriceBTC ?? null;

  const creatorDisplay = collection.creators && collection.creators.length > 0
    ? (collection.creator_names && collection.creator_names.length > 0
      ? collection.creator_names[0] ?? "UNKNOWN"
      : abbreviateAddress(collection.creators[0] ?? "", 6))
    : "UNKNOWN";

  return (
    <div class="relative flex justify-center w-full h-full max-w-72">
      <a
        href={`/collection/${collectionName}`}
        className={containerCard}
      >
        {/* ===== IMAGE ===== */}
        <div class="relative w-full h-full">
          <div class="aspect-stamp w-full h-full rounded-xl overflow-hidden">
            <img
              src={stampImage}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* ===== INFO COLUMN ===== */}
        <div class="flex flex-col items-center p-0.5">
          {/* Collection Name */}
          <h2
            class={`block mt-1 w-full text-center truncate ${cardStampNumber} !text-lg`}
          >
            {collectionName.toUpperCase()}
          </h2>

          {/* Creator Name or Abbreviated Address */}
          <h5 class="mt-1 max-w-full">
            <UserProfileIcon wrapperClassName="justify-center w-full">
              <span class={cardCreator}>{creatorDisplay}</span>
            </UserProfileIcon>
          </h5>

          {/* Row 1: Stamps (left) + Holders (right) */}
          <div class="flex justify-between items-center gap-2 mt-2 w-full">
            <PillWithTooltip
              label="STAMPS"
              className={`${containerPill} ${cardSupply}`}
            >
              {stampCount}
            </PillWithTooltip>
            <PillWithTooltip
              label="HOLDERS"
              className={`${containerPill} ${cardFileSize}`}
            >
              {holderCount ?? "N/A"}
            </PillWithTooltip>
          </div>

          {/* Row 2: Floor price (centered) */}
          <div class="flex items-center justify-center gap-2 mt-2 w-full">
            <PillWithTooltip
              label="FLOOR PRICE"
              className={`${containerPill} ${cardPrice}`}
            >
              {floorPriceBTC ? formatBTC(floorPriceBTC) : "N/A"} BTC
            </PillWithTooltip>
          </div>
        </div>
      </a>
    </div>
  );
}

/* ===== COMPONENT (SQUARE VARIANT) ===== */
// Minimal image-only card for dense grids - mirrors StampCard's bare
// "cardSquare" variant (square thumbnail, no info column below it).
export function CollectionCardSquare(
  { collection }: { collection: CollectionWithOptionalMarketData },
) {
  // Early return if collection is undefined
  if (!collection) {
    return null;
  }

  const collectionName = collection.collection_name ?? "Unknown Collection";
  const stampImage = collection.first_stamp_image ?? collection.img ?? "";

  return (
    <div class="relative flex justify-center w-full h-full max-w-72">
      <a
        href={`/collection/${collectionName}`}
        className={containerCard}
      >
        <div class="relative w-full h-full">
          <div class="aspect-stamp w-full h-full rounded-xl overflow-hidden">
            <img
              src={stampImage}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </a>
    </div>
  );
}

/* ===== COMPONENT (HORIZONTAL VARIANT) ===== */
// Same content as CollectionCard, but the stampImage is rendered full-bleed
// behind the card content instead of as a left-aligned thumbnail.
export function CollectionCardHorizontal(
  { collection }: { collection: CollectionWithOptionalMarketData },
) {
  // Early return if collection is undefined
  if (!collection) {
    return null;
  }

  // Safe access to collection properties with fallbacks
  const collectionName = collection.collection_name ?? "Unknown Collection";
  const stampImage = collection.first_stamp_image ?? collection.img ?? "";
  const stampCount = collection.stamp_count ?? 0;
  const holderCount = collection.marketData?.uniqueHolders ?? null;

  const stampsPill = (
    <PillWithTooltip
      label="STAMPS"
      className={`${containerPill} ${cardSupply}`}
    >
      {stampCount}
    </PillWithTooltip>
  );
  const holdersPill = (
    <PillWithTooltip
      label="HOLDERS"
      className={`${containerPill} ${cardFileSize}`}
    >
      {holderCount ?? "N/A"}
    </PillWithTooltip>
  );
  const floorPricePill = (
    <PillWithTooltip
      label="FLOOR PRICE"
      className={`${containerPill} ${cardPrice}`}
    >
      {collection.marketData?.floorPriceBTC
        ? formatBTC(collection.marketData.floorPriceBTC)
        : "N/A"} BTC
    </PillWithTooltip>
  );

  return (
    <a
      href={`/collection/${collectionName}`}
      className={`relative flex flex-col h-[246px] min-[420px]:h-[218px] mobileMd:h-[230px] mobileLg:h-[234px] tablet:h-[226px] desktop:h-[244px] overflow-hidden ${container2Hover} ${shadowGlowPurple} px-4 py-3 !gap-5 group`}
    >
      {/* ===== STAMP IMAGE with dark overlay gradient (top -> bottom) ===== */}
      {stampImage && (
        <div class="absolute inset-0 z-0">
          <img
            src={stampImage}
            alt=""
            className="w-full h-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-b from-color-neutral-950/95 via-color-neutral-900/70 to-color-neutral-1000/90" />
        </div>
      )}

      {/* ===== CARD HEADER ===== */}
      <div class="relative z-10 flex flex-col w-full gap-2">
        {/* ===== ROW 1: name + creator (left) / pills (right), top-aligned ===== */}
        <div class="flex justify-between items-start gap-3 w-full min-w-0">
          <div class="flex flex-col flex-1 min-w-0 mt-0.5">
            <h2 class={`-mt-2 truncate ${cardStampNumber} !text-lg`}>
              {collectionName.toUpperCase()}
            </h2>

            <h5 class="mt-1">
              <UserProfileIcon size="xxs" weight="bold">
                <span class={`${valueSm} normal-case`}>
                  {collection.creators && collection.creators.length > 0
                    ? (
                      <>
                        {/* Use creator name if available, otherwise fall back to address */}
                        {collection.creator_names &&
                            collection.creator_names.length > 0
                          ? <span>{collection.creator_names?.[0] ?? ""}</span>
                          : (
                            <>
                              <span class="min-[420px]:hidden">
                                {abbreviateAddress(
                                  collection.creators?.[0] ?? "",
                                  6,
                                )}
                              </span>
                              <span class="hidden min-[420px]:inline mobileLg:hidden tablet:inline desktop:hidden">
                                {abbreviateAddress(
                                  collection.creators?.[0] ?? "",
                                  8,
                                )}
                              </span>
                              <span class="hidden mobileLg:inline tablet:hidden desktop:inline">
                                {abbreviateAddress(
                                  collection.creators?.[0] ?? "",
                                  12,
                                )}
                              </span>
                            </>
                          )}
                      </>
                    )
                    : "UNKNOWN"}
                </span>
              </UserProfileIcon>
            </h5>
          </div>

          {/* ===== STATS (min-[420px]+, top-right, top-aligned) ===== */}
          {
            /* min-[420px]-mobileMd: row 1 = stamps + holders, row 2 = floor
              price below. mobileMd+: the row-1 wrapper collapses via
              `contents` so all three pills sit in a single row. */
          }
          <div class="hidden min-[420px]:flex flex-col mobileMd:flex-row items-start mobileMd:items-center gap-2 shrink-0">
            <div class="flex items-center gap-2 mobileMd:contents">
              {stampsPill}
              {holdersPill}
            </div>
            {floorPricePill}
          </div>
        </div>

        {/* ===== ROW 2: description, spans full card width ===== */}
        {collection.collection_description && (
          <h6 class={`mb-2 ${textSm} !text-color-neutral-400 line-clamp-2`}>
            {collection.collection_description}
          </h6>
        )}

        {/* ===== STATS (base breakpoint, 1 row, full width) ===== */}
        <div class="flex items-center justify-between w-full min-[420px]:hidden gap-2">
          {stampsPill}
          {holdersPill}
          {floorPricePill}
        </div>
      </div>

      {/* ===== CARD GALLERY ===== */}
      <div class="relative z-10 grid grid-cols-4 min-[420px]:grid-cols-6 mobileMd:grid-cols-7 mobileLg:grid-cols-8 min-[880px]:grid-cols-9 tablet:grid-cols-7 desktop:grid-cols-8 mt-auto gap-5">
        {collection.stamp_images &&
          collection.stamp_images.slice(-9).reverse().map(
            (imageUrl: string, index: number) => {
              return (
                <div
                  className={`w-full h-full rounded-xl aspect-stamp image-rendering-pixelated overflow-hidden ${
                    GALLERY_IMAGE_VISIBILITY[index] ?? ""
                  }`}
                >
                  <div class="relative flex items-center justify-center w-full h-full">
                    <img
                      key={index}
                      src={imageUrl}
                      alt=""
                      className={`w-full h-full object-contain pixelart`}
                    />
                  </div>
                </div>
              );
            },
          )}
      </div>
    </a>
  );
}
