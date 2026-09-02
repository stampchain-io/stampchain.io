/* ===== COLLECTION DETAILS HEADER COMPONENT ===== */
import { Icon, PlaceholderImage, UserProfileIcon } from "$icon";
import {
  body,
  container1,
  containerGap,
  containerPill,
  StatItem,
} from "$layout";
import {
  abbreviateAddress,
  formatBTC,
  formatMarketCap,
  formatNumberWithCommas,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { tooltipButton } from "$notification";
import { cardFileSize, cardPrice, titlePrimary, truncate } from "$text";
import type { CollectionWithOptionalMarketData } from "$types/services.d.ts";
import type { StampRow } from "$types/stamp.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== COMPONENT ===== */
export const CollectionDetailHeader = (
  { collection, stamps }: {
    collection: CollectionWithOptionalMarketData;
    stamps: StampRow[];
  },
) => {
  /* ===== STATE ===== */
  const [imgError, setImgError] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const descriptionRef = useRef<HTMLDivElement>(null);

  /* ===== CLICK OUTSIDE HANDLER (close description tooltip) ===== */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        descriptionRef.current &&
        !descriptionRef.current.contains(event.target as Node)
      ) {
        setShowDescription(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* ===== GUARD ===== */
  if (!collection) return null;

  /* ===== COMPUTED VALUES ===== */
  const imageUrl = imgError
    ? null
    : (collection.img || stamps?.[0]?.stamp_url || null);

  const creatorName =
    collection.creator_names && collection.creator_names.length > 0
      ? collection.creator_names[0]
      : null;
  const creatorAddress = collection.creators && collection.creators.length > 0
    ? collection.creators[0]
    : null;

  // Full (unabbreviated) address only fits comfortably at the mobileMd
  // breakpoint - abbreviate at base and tablet+ where the row is tighter
  const creatorDisplay = creatorName ??
    (creatorAddress ? abbreviateAddress(creatorAddress, 6) : "ANONYMOUS");

  const floorPriceBTC = collection.marketData?.floorPriceBTC ?? null;
  const avgPriceBTC = collection.marketData?.avgPriceBTC ?? null;
  const uniqueHolders = collection.marketData?.uniqueHolders ?? null;
  const totalVolumeBTC = collection.marketData?.totalVolumeBTC ?? null;

  // collection_market_data.total_value_btc is currently unpopulated (always 0)
  // in production, so market cap is computed: floor price * total editions
  const marketCapBTC = floorPriceBTC !== null && collection.total_editions
    ? floorPriceBTC * collection.total_editions
    : null;

  /* ===== SHARED SUB-COMPONENTS (rendered once per breakpoint layout) ===== */
  const collectionImage = (
    <div class="w-11 h-11 shrink-0 rounded-2xl overflow-hidden">
      {imageUrl
        ? (
          <img
            src={imageUrl}
            class="w-full h-full object-contain pixelart rounded-2xl"
            alt="Collection image"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )
        : (
          <PlaceholderImage
            variant="no-image"
            className="!rounded-2xl"
          />
        )}
    </div>
  );

  /* Clicking the info icon toggles the collection description tooltip.
    Below mobileLg the pills move to their own row, leaving nothing for
    the name row to justify against, so the wrapper grows to fill the
    row (flex-1) and the icon uses ml-auto to land at the far end; at
    mobileLg+ flex-1 is dropped and the icon sits adjacent to the name
    as before */
  const collectionImageAndName = (
    <div class="flex items-center gap-3 min-w-0 flex-1 mobileLg:flex-none">
      {collectionImage}
      <h1 class={`mt-1 ml-2 min-w-0 ${titlePrimary} ${truncate}`}>
        {collection.collection_name.toUpperCase()}
      </h1>
      {collection.collection_description && (
        <div
          ref={descriptionRef}
          class="shrink-0 ml-auto mobileLg:ml-0 translate-y-[1px]"
        >
          <Icon
            type="iconButton"
            name="info"
            weight="bold"
            size="xs"
            color="neutral500"
            onClick={() => setShowDescription((prev) => !prev)}
            ariaLabel="Collection description"
          />
        </div>
      )}
    </div>
  );

  const floorPricePill = (
    <div class="relative group/floor">
      <div class={`${containerPill} ${cardPrice}`}>
        {formatBTC(floorPriceBTC)} BTC
      </div>
      <div
        class={`${tooltipButton} opacity-0 group-hover/floor:opacity-100 transition-opacity duration-150`}
      >
        FLOOR PRICE
      </div>
    </div>
  );

  const avgPricePill = (
    <div class="relative group/avg">
      <div class={`${containerPill} ${cardFileSize}`}>
        {formatBTC(avgPriceBTC)} BTC
      </div>
      <div
        class={`${tooltipButton} opacity-0 group-hover/avg:opacity-100 transition-opacity duration-150`}
      >
        AVERAGE PRICE
      </div>
    </div>
  );

  // Plain icon + address, no label - matches StampInfo's creator/artist
  // layout (size, weight, underline, hover) - used in the desktop second row
  const creatorInline = (
    <UserProfileIcon
      size="xs"
      weight="bold"
      className="stroke-color-neutral-200 translate-y-0.5"
      link
      href={creatorAddress ? `/wallet/${creatorAddress}` : undefined}
    >
      <span class="font-normal text-sm text-color-neutral-200 link-neutral-200 group-hover:text-color-hover transition-colors duration-200">
        {creatorDisplay}
      </span>
    </UserProfileIcon>
  );

  // Covers the whole header container (instead of a small anchored box) on
  // info-icon click - keeps tooltipOverlay's text styling, swaps its
  // positioning/background for a full bg-color-neutral-1000 overlay
  const descriptionOverlay = collection.collection_description && (
    <div
      onClick={() => setShowDescription(false)}
      class={`absolute inset-0 z-tooltip rounded-3xl bg-color-neutral-1000
        flex flex-col justify-center gap-2 p-5 cursor-pointer
        font-normal text-sm/6 text-color-neutral-200 whitespace-normal break-words
        transition-opacity duration-200
        ${showDescription ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      {creatorInline}
      {collection.collection_description}
    </div>
  );

  const marketCapStat = (
    <StatItem
      label="MARKET CAP"
      value={marketCapBTC !== null
        ? `${formatMarketCap(marketCapBTC)} BTC`
        : "N/A BTC"}
      align="center"
    />
  );

  const holdersStat = (
    <StatItem
      label="HOLDERS"
      value={uniqueHolders !== null
        ? formatNumberWithCommas(uniqueHolders)
        : "N/A"}
      align="right"
      valueClass="text-color-neutral-400"
    />
  );

  const volumeStat = (
    <StatItem
      label="VOLUME"
      value={`${formatBTC(totalVolumeBTC)} BTC`}
      align="left"
    />
  );

  /* ===== RENDER ===== */
  return (
    <div class={`${body} ${containerGap}`}>
      <div class={`relative z-header ${container1} p-0.5 flex-wrap`}>
        {descriptionOverlay}

        {/* ===== MOBILE LAYOUT (base + mobileMd, below tablet) ===== */}
        <div class="flex flex-col gap-3 tablet:hidden">
          <div class="flex items-center justify-between gap-5">
            {collectionImageAndName}
            <div class="hidden mobileLg:flex items-center gap-3 shrink-0">
              {floorPricePill}
              {avgPricePill}
            </div>
          </div>

          {/* Row 2 (base, below mobileMd): pills only */}
          <div class="mobileLg:hidden flex items-center justify-end gap-3">
            {floorPricePill}
            {avgPricePill}
          </div>

          {/* Row 3: creator + market cap */}
          <div class="flex items-center justify-between w-full px-5 pb-3 gap-5">
            <div class="hidden mobileMd:flex items-center">
              {creatorInline}
            </div>
            <div class="flex items-center justify-between mobileMd:justify-end gap-5 shrink-0">
              {volumeStat}
              {marketCapStat}
              {holdersStat}
            </div>
          </div>
        </div>

        {/* ===== DESKTOP LAYOUT (tablet and up) ===== */}
        <div class="hidden tablet:flex flex-col gap-0">
          <div class="flex flex-row w-full items-center justify-between">
            {collectionImageAndName}

            <div class="flex items-center gap-3 px-5 shrink-0">
              {floorPricePill}
              {avgPricePill}
            </div>

            <div class="flex items-center pr-5 gap-5 shrink-0">
              {volumeStat}
              {marketCapStat}
              {holdersStat}
            </div>
          </div>

          {/* Row 2: creator (icon + address) */}
          <div class="hidden items-center justify-between px-5 pb-3">
            {creatorInline}
          </div>
        </div>
      </div>
    </div>
  );
};
