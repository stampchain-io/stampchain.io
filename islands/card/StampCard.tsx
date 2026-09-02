/* ===== STAMP CARD COMPONENT ===== */
/* @baba-update audio icon size (custom) - 247*/
/*@baba-check styles+icon*/
import { Button } from "$button";
import { ActivityLevelIcon } from "$components/indicators/ActivityLevelIcon.tsx";
import { ActivityLevelIndicator } from "$components/indicators/ActivityLevelIndicator.tsx";
import { Icon, LoadingIcon, PlaceholderImage, UserProfileIcon } from "$icon";
import StampTextContent from "$islands/content/stampDetailContent/StampTextContent.tsx";
import BuyStampModal from "$islands/modal/BuyStampModal.tsx";
import { openModal } from "$islands/modal/states.ts";
import { container3, containerCard, containerPill } from "$layout";
import {
  getFreshDispenserForPurchase,
  useLowestPriceDispenser,
} from "$lib/hooks/useLowestPriceDispenser.ts";
import { isAtomicIconVisible } from "$lib/utils/bitcoin/stamps/stampUtils.ts";
import {
  abbreviateAddress,
  formatFileSize,
  formatFileType,
  formatSupply,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import {
  getStampImageSrc,
  getStampPreviewUrl,
} from "$lib/utils/ui/media/imageUtils.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { tooltipButton, tooltipIcon } from "$notification";
import {
  cardCreator,
  cardEyebrowNeutral,
  cardFileSize,
  cardFileType,
  cardPrice,
  cardPriceCompact,
  cardStampNumber,
  cardStampNumberCompact,
  cardSupply,
  truncate,
} from "$text";
import type {
  StampCardVariant,
  StampRow,
  StampSaleData,
} from "$types/stamp.d.ts";
import type { WalletStampWithValue } from "$types/wallet.d.ts";
import { ComponentChildren, VNode } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */
interface StampWithSaleData extends Omit<StampRow, "stamp_base64"> {
  sale_data?: StampSaleData;
  stamp_base64?: string;
}

/* ===== PILL WITH TOOLTIP (instant on hover, no delay/timeout) ===== */
function PillWithTooltip(
  { label, className, children }: {
    label: string;
    className: string;
    children: ComponentChildren;
  },
) {
  return (
    <div class="relative group/pill">
      <div class={className}>{children}</div>
      <div
        class={`${tooltipButton} opacity-0 group-hover/pill:opacity-100 transition-opacity duration-150`}
      >
        {label}
      </div>
    </div>
  );
}

/* ===== ICON WITH TOOLTIP (instant on hover, no delay/timeout) ===== */
function IconWithTooltip(
  { label, children }: {
    label: ComponentChildren;
    children: ComponentChildren;
  },
) {
  return (
    <div class="relative group/icon">
      {children}
      <div
        class={`${tooltipIcon} opacity-0 group-hover/icon:opacity-100`}
      >
        {label}
      </div>
    </div>
  );
}

/* ===== COMPONENT ===== */
export function StampCard({
  stamp,
  isRecentSale = false,
  variant = "cardVerticalDetail",
}: {
  stamp: StampWithSaleData;
  isRecentSale?: boolean;
  variant?: StampCardVariant;
}) {
  /* ===== STATE ===== */
  const [loading, setLoading] = useState<boolean>(true);
  const [imageFailed, setImageFailed] = useState<boolean>(false);
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [validatedContent, setValidatedContent] = useState<VNode | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof globalThis !== "undefined" ? globalThis.innerWidth ?? 0 : 0,
  );

  // Buy modal fee state (mirrors StampInfo's fee handling for BuyStampModal)
  const [fee, setFee] = useState<number>(0);
  // Tracks the BUY-click purchase flow (distinct from the passive
  // useLowestPriceDispenser fetch below) — see handleBuyClick.
  const [isFetchingDispenser, setIsFetchingDispenser] = useState(false);

  // Root element ref for the shared lazy-dispenser hook (see below) —
  // shared across all render variants since only one JSX tree is ever
  // returned per render.
  const cardRef = useRef<HTMLDivElement>(null);

  // Audio-related state (always declared to avoid conditional hooks)
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Library file detection (CSS, JS, GZIP, JSON)
  const isLibraryFile = stamp.stamp_mimetype === "text/css" ||
    stamp.stamp_mimetype === "text/javascript" ||
    stamp.stamp_mimetype === "application/javascript" ||
    stamp.stamp_mimetype === "application/gzip" ||
    stamp.stamp_mimetype === "application/json" ||
    stamp.stamp_mimetype === "text/json";

  // Every caller (routes/index.tsx, routes/explorer/index.tsx,
  // routes/stamp/index.tsx, routes/marketplace/index.tsx) now nests sale
  // details under `sale_data` (StampSaleData, $types/stamp.d.ts) — no flat
  // top-level fallback needed here anymore.
  const saleData: StampSaleData | undefined = stamp.sale_data;

  /* ===== HANDLERS ===== */
  // Swaps the broken <img> for the local "no image" placeholder icon instead
  // of leaving a transparent pixel (which just reveals the checkerboard
  // background) or the unrelated Stampchain logo.
  const handleImageError = (_e: Event) => {
    setImageFailed(true);
    setLoading(false);
  };

  const abbreviationLength = windowWidth < 768 ? 4 : windowWidth < 1024 ? 5 : 5;

  const fetchStampImage = () => {
    setLoading(true);
    setImageFailed(false);
    // Use embedded base64 as a data URI when available — works without CDN access
    if (stamp.stamp_base64) {
      const mime = stamp.stamp_mimetype ?? "image/png";
      setSrc(`data:${mime};base64,${stamp.stamp_base64}`);
      setLoading(false);
      return;
    }
    const res = getStampImageSrc(stamp as StampRow);
    setSrc(res);
    setLoading(false);
  };

  /* ===== EFFECTS ===== */
  // Update abbreviation length on window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(globalThis.innerWidth ?? 0);
    globalThis.addEventListener("resize", handleResize);
    return () => globalThis.removeEventListener("resize", handleResize);
  }, []);

  // Fetch stamp image on mount
  useEffect(() => {
    fetchStampImage();
  }, []);

  // Validate SVG content when source changes
  useEffect(() => {
    const validateContent = async () => {
      if (stamp.stamp_mimetype === "image/svg+xml" && src) {
        setIsValidating(true);
        try {
          // Fetch the SVG content
          const response = await fetch(src);
          if (!response.ok) {
            throw new Error(`Failed to fetch SVG: ${response.status}`);
          }

          const svgContent = await response.text();

          // Check if SVG has external ordinals.com or arweave.net references (recursive SVG)
          if (
            svgContent.includes("ordinals.com/content/") ||
            svgContent.includes("arweave.net/")
          ) {
            // Use cached preview PNG for recursive SVGs in grid view
            setValidatedContent(
              <div class="stamp-container">
                <div class="relative z-10 aspect-square">
                  <img
                    src={getStampPreviewUrl(stamp as StampRow, {
                      placeholderOnFail: true,
                    })}
                    loading="lazy"
                    alt={`Stamp No. ${stamp.stamp}`}
                    class="max-w-none object-contain rounded-xl pixelart stamp-image h-full w-full"
                    onLoad={() => setLoading(false)}
                    onError={handleImageError}
                  />
                </div>
              </div>,
            );
          } else {
            // No external references, use original src
            setValidatedContent(
              <div class="stamp-container">
                <div class="relative z-10 aspect-square">
                  <img
                    src={src}
                    loading="lazy"
                    alt={`Stamp No. ${stamp.stamp}`}
                    class="max-w-none object-contain rounded-xl pixelart stamp-image h-full w-full"
                    onLoad={() => setLoading(false)}
                    onError={handleImageError}
                  />
                </div>
              </div>,
            );
          }
        } catch (_error) {
          // Error placeholder image
          setValidatedContent(
            <div class="stamp-container">
              <div class="relative z-10 aspect-square">
                <PlaceholderImage variant="error" />
              </div>
            </div>,
          );
          setLoading(false);
        } finally {
          setIsValidating(false);
        }
      }
    };
    if (src) {
      validateContent();
    }
  }, [src, stamp.stamp_mimetype]);

  /* ===== RENDER HELPERS ===== */
  const renderContent = () => {
    if (loading && !src) {
      return (
        <div class="stamp-container">
          <LoadingIcon />
        </div>
      );
    }

    if (stamp.stamp_mimetype?.startsWith("audio/")) {
      // Audio player functionality
      const togglePlayback = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      };

      const handleAudioEnded = () => {
        setIsPlaying(false);
      };

      return (
        <div class="stamp-audio-container relative w-full h-full flex items-center justify-center">
          <div class="absolute inset-0 flex items-center justify-center">
            {/* Audio placeholder image */}
            <PlaceholderImage variant="audio" />
            <audio
              ref={audioRef}
              class="hidden"
              onEnded={handleAudioEnded}
            >
              <source src={src} type={stamp.stamp_mimetype} />
            </audio>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                togglePlayback();
              }}
              class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-[40px] tablet:w-[34px] aspect-square flex items-center justify-center group/button"
            >
              <div class="absolute inset-0 bg-color-neutral-1000 opacity-50 rounded-full" />
              <Icon
                name={isPlaying ? "pause" : "play"}
                type="iconButton"
                weight="bold"
                size="xsR"
                color="custom"
                className="relative z-10 [&_path]:fill-color-neutral-600 [&_path]:group-hover/button:fill-color-hover transition-all duration-200"
              />
            </button>
          </div>
        </div>
      );
    }

    if (stamp.stamp_mimetype === "text/plain") {
      return <StampTextContent src={src} />;
    }

    // Handle HTML content - show cached preview PNG in grid view
    if (stamp.stamp_mimetype === "text/html") {
      if (imageFailed) {
        return (
          <div class="stamp-container">
            <div class="relative z-10 aspect-square">
              <PlaceholderImage variant="no-image" />
            </div>
          </div>
        );
      }
      return (
        <div class="stamp-container">
          <div class="relative z-10 aspect-square">
            <img
              src={getStampPreviewUrl(stamp as StampRow, {
                placeholderOnFail: true,
              })}
              loading="lazy"
              alt={`Stamp No. ${stamp.stamp}`}
              class="max-w-none object-contain rounded-xl pixelart stamp-image h-full w-full"
              onLoad={() => setLoading(false)}
              onError={handleImageError}
            />
          </div>
        </div>
      );
    }

    // Handle Library Files (CSS, JS, GZIP)
    if (isLibraryFile) {
      return (
        <div class="stamp-container relative">
          <div class="relative z-10 aspect-square">
            <PlaceholderImage variant="library" />
          </div>
        </div>
      );
    }

    if (stamp.stamp_mimetype === "image/svg+xml") {
      // Show spinner while SVG content is being validated (prevents
      // "no-image" placeholder flash during async validation)
      if (isValidating) {
        return (
          <div class="stamp-container">
            <LoadingIcon />
          </div>
        );
      }
      if (imageFailed) {
        return (
          <div class="stamp-container">
            <div class="relative z-10 aspect-square">
              <PlaceholderImage variant="no-image" />
            </div>
          </div>
        );
      }
      return validatedContent || (
        <div class="stamp-container">
          <div class="relative z-10 aspect-square">
            <PlaceholderImage variant="no-image" />
          </div>
        </div>
      );
    }

    // Unrenderable content: no image URL, unknown/missing type, or raw binary
    if (
      !src ||
      !stamp.stamp_mimetype ||
      stamp.stamp_mimetype === "UNKNOWN" ||
      stamp.stamp_mimetype === "application/octet-stream"
    ) {
      return (
        <div class="stamp-container relative">
          <div class="relative z-10 aspect-square">
            <PlaceholderImage variant="error" />
          </div>
        </div>
      );
    }

    // Regular images
    if (imageFailed) {
      return (
        <div class="stamp-container">
          <div class="relative z-10 aspect-square">
            <PlaceholderImage variant="no-image" />
          </div>
        </div>
      );
    }
    return (
      <div class="stamp-container">
        <div class="relative z-10 aspect-square">
          <img
            src={src}
            loading="lazy"
            alt={`Stamp #${stamp.stamp}`}
            class="max-w-none object-contain rounded-xl pixelart stamp-image h-full w-full"
            onLoad={() => setLoading(false)}
            onError={handleImageError}
          />
        </div>
      </div>
    );
  };

  const displayPriceBTC = () => {
    const formatPriceBTC = (amount: number) =>
      `${Number(amount).toFixed(8)} BTC`;

    if (isRecentSale && saleData) {
      return {
        text: formatPriceBTC(saleData.btc_amount),
        style: cardPrice,
      };
    }

    // v2.3 API: Use marketData pricing (preferred) - safe access with optional chaining
    const marketData = (stamp as any).marketData;
    if (marketData) {
      // Priority: floorPriceBTC > recentSalePriceBTC (specific business logic for StampCard)
      const marketPrice = marketData.floorPriceBTC !== null &&
          marketData.floorPriceBTC > 0
        ? marketData.floorPriceBTC
        : marketData.recentSalePriceBTC;

      if (marketPrice !== null && marketPrice > 0) {
        return { text: formatPriceBTC(marketPrice), style: cardPrice };
      }
    }

    return {
      text: formatFileType(stamp.stamp_mimetype),
      style: cardFileType,
    };
  };

  // v2.3 API moved USD prices into the nested `market_data` object
  // (snake_case); the old root-level `floorPriceUSD` field was removed from
  // the API entirely, so there's no fallback to it.
  const displayPriceUSD = () => {
    const marketData = (stamp as any)?.market_data;

    if (isRecentSale && saleData) {
      // usd_price is computed server-side (StampService.getRecentSales) and
      // nested under sale_data by every route — see saleData above.
      return marketData?.recent_sale_price_usd ??
        saleData.usd_price ??
        null;
    }

    return marketData?.floor_price_usd ?? null;
  };

  /* ===== COMPUTED VALUES ===== */
  const supplyDisplay = isRecentSale
    ? `${stamp.supply || 1}` // For recent sales, show transaction quantity
    : stamp.ident !== "SRC-20" && stamp.balance
    ? `${formatSupply(Number(stamp.balance), stamp.divisible)}/${
      stamp.supply < 100000 && !stamp.divisible
        ? formatSupply(stamp.supply ?? 0, stamp.divisible)
        : "+100000"
    }`
    : stamp.supply === 1
    ? "1/1"
    : `${formatSupply(stamp.supply ?? 0, stamp.divisible)}`;

  // Use dynamic abbreviation length
  const creatorDisplay = stamp.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp.creator, abbreviationLength);

  const stampValue = stamp.stamp != null
    ? stamp.stamp.toLocaleString("en-US")
    : `${stamp.cpid}`;
  const displayStampHash = stamp.stamp != null;

  const isLongNumber = (value: string | number) => {
    const stringValue = String(value);
    return stringValue.length > 6;
  };

  // Only the listing variants (marketplace grid + row-equivalent cards)
  // need a live dispenser to buy from — cardVerticalDetail and friends are
  // used on pages with their own buy flow (e.g. StampInfo.tsx), so gate the
  // hook's fetch to listing variants only, even though the ref below is
  // attached to every variant's shared root element.
  const isListingVariant = variant === "cardHorizontalListing" ||
    variant === "cardHorizontalListingCompact" ||
    variant === "cardVerticalListing";

  // Per stampchain.io#1209 / btc_stamps#939: marketplace/listing responses
  // only carry aggregated market data, never a concrete dispenser to buy
  // from — this hook lazily resolves one once the card scrolls into view
  // (shared cache with StampListingsRow, the table's equivalent), and
  // short-circuits entirely once the server starts providing
  // stamp.lowestPriceDispenser directly (see the hook for details).
  const { dispenser: lowestPriceDispenser } = useLowestPriceDispenser(
    isListingVariant ? stamp : null,
    cardRef,
  );

  // Whether the stamp actually has a dispenser open to buy from right now.
  // Gates every price display AND the BUY button/CTA — deliberately never
  // falls back to recentSalePriceBTC (marketData's valuation fallback, used
  // e.g. for wallet portfolio value in lib/hooks/useBTCValue.ts), since a
  // stamp merely having sold once in the past doesn't mean there's anything
  // to buy today.
  const isListed = Boolean(lowestPriceDispenser) ||
    ((stamp as any).marketData?.openDispensersCount ?? 0) > 0;

  const openBuyModal = (dispenser: unknown) => {
    // Opening BuyStampModal here also handles the "wallet not connected"
    // case for us: it internally opens the Connect Wallet modal and
    // re-opens this Buy modal once a wallet is connected.
    openModal(
      <BuyStampModal
        stamp={stamp as StampRow}
        fee={fee}
        handleChangeFee={setFee}
        dispenser={dispenser}
      />,
      "slideUpDown",
    );
  };

  // Because BUY constructs a real spend transaction, this re-checks for a
  // fresher dispenser rather than blindly trusting whatever the passive
  // useLowestPriceDispenser hook above already resolved — getFreshDispenser
  // ForPurchase treats a cache hit older than ~12s as stale and re-fetches
  // once more. Usually resolves instantly since the display hook already
  // populated the shared cache by the time a user can click BUY.
  const handleBuyClick = async () => {
    if (isFetchingDispenser || !stamp.cpid) return;
    setIsFetchingDispenser(true);
    try {
      const dispenser = await getFreshDispenserForPurchase(stamp);
      if (!dispenser) {
        showToast("This stamp is no longer listed for sale.", "info");
        return;
      }
      openBuyModal(dispenser);
    } finally {
      setIsFetchingDispenser(false);
    }
  };

  /* ===== RENDER: HORIZONTAL LISTING VARIANT ===== */
  if (variant === "cardHorizontalListing") {
    return (
      <div ref={cardRef} class="relative flex w-full">
        <a
          href={`/stamp/${stamp.tx_hash}`}
          target="_top"
          f-partial={`/stamp/${stamp.tx_hash}`}
          data-long-number={isLongNumber(stampValue)}
          class={`${containerCard} gap-2`}
        >
          {
            /* Visually-hidden name: the anchor's only other content is the
              stamp image, which is a skeleton until it resolves — without
              this the link has no accessible name during SSR/loading. */
          }
          <span class="sr-only">Stamp {stampValue}</span>
          {/* ===== TOP: IMAGE + DETAILS (2-COLUMN) ===== */}
          {
            /* Fixed-width image column (not "auto") — with no explicit
              size, an `auto` column falls back to the <img>'s natural
              pixel resolution (since it uses max-w-none), so stamps with
              different native dimensions rendered at different visual
              sizes. A fixed width keeps every thumbnail uniform. */
          }
          <div class="grid grid-cols-[5.5rem_1fr] gap-4">
            {/* LEFT: IMAGE */}
            <div class="relative aspect-stamp rounded-xl overflow-hidden w-full">
              <div class="w-full h-full overflow-hidden flex items-center justify-center">
                {renderContent()}
              </div>
            </div>

            {/* RIGHT: DETAILS COLUMN */}
            <div class="flex flex-col min-w-0 justify-center gap-1.5">
              {/* Stamp Number / CPID / Creator */}
              <div class="flex flex-col min-w-0">
                <div class={`${cardStampNumber} !text-lg`}>
                  {displayStampHash && <span class="font-light">#</span>}
                  {stampValue}
                </div>
                {stamp.cpid && (
                  <div
                    class={`font-mono text-xs text-color-neutral-500 ${truncate}`}
                  >
                    {stamp.cpid}
                  </div>
                )}
                <UserProfileIcon wrapperClassName="mt-0.5">
                  <span class={`${cardCreator} !text-left`}>
                    {creatorDisplay}
                  </span>
                </UserProfileIcon>
              </div>
            </div>
          </div>

          {/* FULL WIDTH DETAILS COLUMN */}
          {/* Row 1: Supply (left) + Status Icons (right) */}
          <div class="flex justify-between items-center w-full">
            <PillWithTooltip
              label="EDITIONS"
              className={`${containerPill} ${cardSupply}`}
            >
              {lowestPriceDispenser?.give_remaining ??
                stamp.supply ?? 1}/{stamp.supply ?? 1}
            </PillWithTooltip>
            <div class="flex items-center gap-1.5 mr-0.5 -translate-y-0.5">
              {stamp.ident === "SRC-721" && (
                <IconWithTooltip label="RECURSIVE">
                  <Icon
                    type="icon"
                    name="recursive"
                    weight="bold"
                    size="xxs"
                    color="neutral400"
                    ariaLabel="Recursive"
                  />
                </IconWithTooltip>
              )}
              {Boolean(stamp.divisible) && (
                <IconWithTooltip label="DIVISIBLE">
                  <Icon
                    type="icon"
                    name="divisible"
                    weight="bold"
                    size="xxs"
                    color="neutral400"
                    ariaLabel="Divisible"
                  />
                </IconWithTooltip>
              )}
              {Boolean(stamp.keyburn) && (
                <IconWithTooltip label="KEYBURNED">
                  <Icon
                    type="icon"
                    name="keyburned"
                    weight="bold"
                    size="xxs"
                    color="neutral400"
                    ariaLabel="Keyburned"
                  />
                </IconWithTooltip>
              )}
              {stamp.locked
                ? (
                  <IconWithTooltip label="LOCKED">
                    <Icon
                      type="icon"
                      name="locked"
                      weight="bold"
                      size="xxs"
                      color="neutral400"
                      ariaLabel="Locked"
                    />
                  </IconWithTooltip>
                )
                : (
                  <IconWithTooltip label="UNLOCKED">
                    <Icon
                      type="icon"
                      name="unlocked"
                      weight="bold"
                      size="xxs"
                      color="neutral400"
                      ariaLabel="Unlocked"
                    />
                  </IconWithTooltip>
                )}
            </div>
          </div>

          {/* Row 2: File type + File size pills */}
          <div class="flex items-center justify-between w-full">
            <PillWithTooltip
              label="FILE TYPE"
              className={`${containerPill} ${cardFileType}`}
            >
              {formatFileType(stamp.stamp_mimetype)}
            </PillWithTooltip>
            {stamp.file_size_bytes != null && (
              <PillWithTooltip
                label="FILE SIZE"
                className={`${containerPill} ${cardFileSize}`}
              >
                {formatFileSize(
                  stamp.file_size_bytes,
                  stamp.stamp_mimetype === "text/plain",
                )}
              </PillWithTooltip>
            )}
          </div>

          {/* ===== BOTTOM: FULL-WIDTH PRICE + BUY ===== */}
          {isListed && (
            <div class="flex items-center justify-between gap-2 w-full">
              <div class="flex items-center gap-1.5 min-w-0">
                {stamp.activity_level && (
                  <ActivityLevelIndicator level={stamp.activity_level} />
                )}
                <PillWithTooltip
                  label="PRICE"
                  className={`${containerPill} ${cardPrice}`}
                >
                  {displayPriceBTC().text}
                </PillWithTooltip>
              </div>
              <Button
                variant="flat"
                color="primary"
                size="xsR"
                class={`rounded-xl shrink-0 ${
                  isFetchingDispenser ? "!opacity-60 !cursor-wait" : ""
                }`}
                onClick={(e: MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBuyClick();
                }}
              >
                {isFetchingDispenser ? "..." : "BUY"}
              </Button>
            </div>
          )}
        </a>
      </div>
    );
  }

  /* ===== RENDER: COMPACT HORIZONTAL LISTING VARIANT ===== */
  if (variant === "cardHorizontalListingCompact") {
    return (
      <div ref={cardRef} class="relative flex w-full">
        <a
          href={`/stamp/${stamp.tx_hash}`}
          target="_top"
          f-partial={`/stamp/${stamp.tx_hash}`}
          data-long-number={isLongNumber(stampValue)}
          class={`${containerCard} gap-2`}
        >
          {
            /* Visually-hidden name: the anchor's only other content is the
              stamp image, which is a skeleton until it resolves — without
              this the link has no accessible name during SSR/loading. */
          }
          <span class="sr-only">Stamp {stampValue}</span>
          {/* ===== TOP: IMAGE + DETAILS (2-COLUMN) ===== */}
          {
            /* Fixed-width image column (not "auto") — see cardHorizontalListing
              above for why "auto" lets the <img>'s natural resolution drive
              the column width, producing inconsistent thumbnail sizes. */
          }
          <div class="grid grid-cols-[5.5rem_1fr] gap-4">
            {/* LEFT: IMAGE */}
            <div class="relative aspect-stamp rounded-xl overflow-hidden w-full">
              <div class="w-full h-full overflow-hidden flex items-center justify-center">
                {renderContent()}
              </div>
            </div>

            {/* RIGHT: DETAILS COLUMN */}
            <div class="flex flex-col min-w-0 justify-center gap-1.5">
              {/* Stamp Number / CPID / Creator */}
              <div class="flex flex-col min-w-0">
                <div class={`${cardStampNumber} !text-lg`}>
                  {displayStampHash && <span class="font-light">#</span>}
                  {stampValue}
                </div>
                {stamp.cpid && (
                  <div
                    class={`font-mono text-xs text-color-neutral-500 ${truncate}`}
                  >
                    {stamp.cpid}
                  </div>
                )}
                <UserProfileIcon wrapperClassName="mt-0.5">
                  <span class={`${cardCreator} !text-left`}>
                    {creatorDisplay}
                  </span>
                </UserProfileIcon>
              </div>
            </div>
          </div>

          {/* ===== FOOTER: EDITIONS (LEFT) + PRICE (RIGHT) ===== */}
          <div class="flex justify-between items-center w-full">
            <PillWithTooltip
              label="EDITIONS"
              className={`${containerPill} ${cardSupply}`}
            >
              {lowestPriceDispenser?.give_remaining ??
                stamp.supply ?? 1}/{stamp.supply ?? 1}
            </PillWithTooltip>
            {isListed && (
              <div class="flex items-center gap-1.5 min-w-0">
                {stamp.activity_level && (
                  <ActivityLevelIcon
                    level={stamp.activity_level}
                    className="hidden"
                  />
                )}
                <PillWithTooltip
                  label="PRICE"
                  className={`${containerPill} ${cardPrice}`}
                >
                  {displayPriceBTC().text}
                </PillWithTooltip>
              </div>
            )}
          </div>
        </a>
      </div>
    );
  }

  /* ===== RENDER ===== */
  /* ===== CARD VARIANTS ===== */
  return (
    /* ===== SQUARE CARD (home / gallery pages) ===== */
    <div
      ref={cardRef}
      class="relative flex justify-center w-full h-full max-w-72"
    >
      <a
        href={`/stamp/${stamp.tx_hash}`}
        target="_top"
        f-partial={`/stamp/${stamp.tx_hash}`}
        data-long-number={isLongNumber(stampValue)}
        class={containerCard}
      >
        {
          /* Visually-hidden name: the anchor's only other content is the
            stamp image, which is a skeleton until it resolves — without
            this the link has no accessible name during SSR/loading. */
        }
        <span class="sr-only">Stamp {stampValue}</span>
        {
          /* ===== ATOM ICON PILL (square wallet balance variant only —
          vertical/detail renders its own atomic icon inline in the row 1
          icon group, to the left of the price icon, see below) ===== */
        }
        {variant === "cardSquareBalance" &&
          isAtomicIconVisible(stamp as unknown as WalletStampWithValue) && (
          <div class="absolute top-1.5 left-1.5 z-10">
            <IconWithTooltip label="ATOMIC SWAP">
              <div class={`${containerPill} !p-1.5`}>
                <Icon
                  type="icon"
                  name="atom"
                  weight="bold"
                  size="custom"
                  color="neutral400"
                  className="w-3.5 h-3.5"
                  ariaLabel="Atomic Swap"
                />
              </div>
            </IconWithTooltip>
          </div>
        )}

        <div class="relative w-full h-full">
          <div class="aspect-stamp w-full h-full overflow-hidden flex items-center justify-center">
            {renderContent()}
          </div>
          {/* ===== SQUARE CARD DETAIL ===== */}
          {variant === "cardSquareDetail" && (
            <div class="absolute bottom-0.5 right-0.5 z-20">
              <PillWithTooltip
                label="EDITIONS"
                className={`${containerPill} ${cardSupply} cursor-pointer`}
              >
                {supplyDisplay}
              </PillWithTooltip>
            </div>
          )}

          {/* ===== SQUARE CARD WALLET BALANCE (bottom-right) ===== */}
          {variant === "cardSquareBalance" && (
            <div class="absolute bottom-0.5 right-0.5 z-20">
              <PillWithTooltip
                label={`You own ${stamp.balance ?? 0} out of ${
                  stamp.supply ?? 0
                } total supply`}
                className={`${containerPill} ${cardSupply} cursor-pointer`}
              >
                {formatSupply(
                  Number(stamp.balance ?? 0),
                  Boolean(stamp.divisible),
                )}
              </PillWithTooltip>
            </div>
          )}
        </div>

        {/* ===== VERTICAL DETAIL CARD (explorer / marketplace listings / wallet balance) ===== */}
        {(variant === "cardVerticalDetail" ||
          variant === "cardVerticalListing" ||
          variant === "cardVerticalBalance") && (
          <div class="flex flex-col items-center p-0.5">
            {/* Stamp Number */}
            <div
              class={`flex items-center justify-center mt-1
              ${cardStampNumber}`}
            >
              {displayStampHash && <span class="font-light">#</span>}
              {stampValue}
            </div>

            {/* CPID */}
            {stamp.cpid && (
              <div
                class={`mt-0.5 font-mono text-xs text-color-neutral-500 ${truncate}`}
              >
                {stamp.cpid}
              </div>
            )}

            {/* Creator Name or Abbreviated Address */}
            <UserProfileIcon wrapperClassName="justify-center w-full mt-1">
              <span class={cardCreator}>{creatorDisplay}</span>
            </UserProfileIcon>

            {/* Row 1: Supply/Balance (left) + Status Icons (right) */}
            <div class="flex justify-between items-center mt-2 w-full">
              <PillWithTooltip
                label={variant === "cardVerticalBalance"
                  ? `You own ${stamp.balance ?? 0} out of ${
                    stamp.supply ?? 0
                  } total supply`
                  : "EDITIONS"}
                className={`${containerPill} ${cardSupply}`}
              >
                {variant === "cardVerticalListing"
                  ? `${
                    lowestPriceDispenser?.give_remaining ?? stamp.supply ?? 1
                  }/${stamp.supply ?? 1}`
                  : variant === "cardVerticalBalance"
                  ? (Number(stamp.balance ?? 0) > 100000
                    ? formatSupply(
                      Number(stamp.balance ?? 0),
                      Boolean(stamp.divisible),
                    )
                    : `${
                      formatSupply(
                        Number(stamp.balance ?? 0),
                        Boolean(stamp.divisible),
                      )
                    }/${
                      formatSupply(
                        Number(stamp.supply ?? 0),
                        Boolean(stamp.divisible),
                      )
                    }`)
                  : supplyDisplay}
              </PillWithTooltip>
              <div class="flex items-center gap-1.5 mr-0.5 -translate-y-0.5">
                {variant === "cardVerticalBalance" &&
                  isAtomicIconVisible(
                    stamp as unknown as WalletStampWithValue,
                  ) && (
                  <IconWithTooltip label="ATOMIC SWAP">
                    <Icon
                      type="icon"
                      name="atom"
                      weight="bold"
                      size="xxs"
                      color="neutral400"
                    />
                  </IconWithTooltip>
                )}
                {(variant === "cardVerticalDetail" ||
                  variant === "cardVerticalBalance") && isListed && (
                  <IconWithTooltip label={displayPriceBTC().text}>
                    <Icon
                      type="icon"
                      name="listings"
                      weight="bold"
                      size="custom"
                      color="custom"
                      className="w-[17px] h-[17px] stroke-color-secondary-400"
                      ariaLabel="BTC"
                    />
                  </IconWithTooltip>
                )}
                {stamp.ident === "SRC-721" && (
                  <IconWithTooltip label="RECURSIVE">
                    <Icon
                      type="icon"
                      name="recursive"
                      weight="bold"
                      size="xxs"
                      color="neutral400"
                      ariaLabel="Recursive"
                    />
                  </IconWithTooltip>
                )}
                {Boolean(stamp.divisible) && (
                  <IconWithTooltip label="DIVISIBLE">
                    <Icon
                      type="icon"
                      name="divisible"
                      weight="bold"
                      size="xxs"
                      color="neutral400"
                      ariaLabel="Divisible"
                    />
                  </IconWithTooltip>
                )}
                {Boolean(stamp.keyburn) && (
                  <IconWithTooltip label="KEYBURNED">
                    <Icon
                      type="icon"
                      name="keyburned"
                      weight="bold"
                      size="xxs"
                      color="neutral400"
                      ariaLabel="Keyburned"
                    />
                  </IconWithTooltip>
                )}
                {stamp.locked
                  ? (
                    <IconWithTooltip label="LOCKED">
                      <Icon
                        type="icon"
                        name="locked"
                        weight="bold"
                        size="xxs"
                        color="neutral400"
                        ariaLabel="Locked"
                      />
                    </IconWithTooltip>
                  )
                  : (
                    <IconWithTooltip label="UNLOCKED">
                      <Icon
                        type="icon"
                        name="unlocked"
                        weight="bold"
                        size="xxs"
                        color="neutral400"
                        ariaLabel="Unlocked"
                      />
                    </IconWithTooltip>
                  )}
              </div>
            </div>

            {/* Row 2: File type + File size pills (hidden for listing/balance variants) */}
            {variant !== "cardVerticalListing" &&
              variant !== "cardVerticalBalance" && (
              <div class="flex items-center justify-between mt-2 w-full">
                <PillWithTooltip
                  label="FILE TYPE"
                  className={`${containerPill} ${cardFileType}`}
                >
                  {formatFileType(stamp.stamp_mimetype)}
                </PillWithTooltip>
                {stamp.file_size_bytes != null && (
                  <PillWithTooltip
                    label="FILE SIZE"
                    className={`${containerPill} ${cardFileSize}`}
                  >
                    {formatFileSize(
                      stamp.file_size_bytes,
                      stamp.stamp_mimetype === "text/plain",
                    )}
                  </PillWithTooltip>
                )}
              </div>
            )}

            {/* Row 3: Buy button (marketplace listings only) */}
            {variant === "cardVerticalListing" && isListed && (
              <>
                <div
                  class={`flex flex-col w-full mt-2 px-2.5 py-1 ${container3} cursor-pointer`}
                >
                  <div class="flex items-end min-[420px]:items-center -ml-1">
                    {stamp.activity_level && (
                      <ActivityLevelIndicator
                        level={stamp.activity_level}
                        className="hidden min-[420px]:flex"
                      />
                    )}
                    {
                      /* ml-auto keeps the price pinned to the right edge
                        whether or not the activity indicator renders
                        (it's hidden below 420px, and absent entirely for
                        COLD listings) */
                    }
                    <div class="font-normal text-xs text-color-neutral-500 text-nowrap ml-auto">
                      {displayPriceUSD()?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} USD
                    </div>
                  </div>
                  <div class={`${cardPrice} min-[420px]:!text-sm text-right`}>
                    {displayPriceBTC().text}
                  </div>
                </div>
                <div class="flex justify-center mt-2 w-full">
                  <Button
                    variant="flat"
                    color="primary"
                    size="xs"
                    class={`w-full rounded-xl ${
                      isFetchingDispenser ? "!opacity-60 !cursor-wait" : ""
                    }`}
                    onClick={(e: MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleBuyClick();
                    }}
                  >
                    {isFetchingDispenser ? "..." : "BUY"}
                  </Button>
                </div>
              </>
            )}

            {
              /* Row 3: Buy button (marketplace listings only)
            {variant === "cardVerticalListing" && isListed && (
              <div class="flex justify-center mt-2 w-full">
                <Button
                  variant="outline"
                  color="custom"
                  size="xs"
                  class="w-full rounded-xl
                  bg-gradient-to-b from-color-neutral-800/80 via-color-neutral-900/90 to-color-neutral-900
                  [--color-button-light:var(--color-neutral-700)]
                  [--color-button:var(--color-neutral-800)] [--color-button-dark:var(--color-neutral-900)]
                  group-hover:from-transparent group-hover:via-transparent group-hover:to-transparent
                  group-hover:[--color-button-light:var(--color-primary-300)]
                  group-hover:[--color-button:var(--color-primary-400)] group-hover:[--color-button-dark:var(--color-primary-500)]"
                >
                  <span class="relative inline-flex items-center justify-center">
                    <span class="group-hover:opacity-0 transition-opacity duration-200 tracking-wide text-[var(--color-secondary-400)]">
                      {displayPriceBTC().text}
                    </span>
                    <span class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      BUY
                    </span>
                  </span>
                </Button>
              </div>
            )} */
            }
          </div>
        )}

        {/* ===== VERTICAL COLLECTION CARD (collection detail page) ===== */}
        {variant === "cardVerticalCollection" && (
          <div class="flex flex-col items-center p-0.5">
            {/* Stamp Number */}
            <div
              class={`flex items-center justify-center mt-1
              ${cardStampNumber}`}
            >
              {displayStampHash && <span class="font-light">#</span>}
              {stampValue}
            </div>

            {/* CPID */}
            {stamp.cpid && (
              <div
                class={`mt-0.5 font-mono text-xs text-color-neutral-500 ${truncate}`}
              >
                {stamp.cpid}
              </div>
            )}

            {/* Creator Name or Abbreviated Address */}
            <UserProfileIcon wrapperClassName="justify-center w-full mt-1">
              <span class={cardCreator}>{creatorDisplay}</span>
            </UserProfileIcon>

            {/* Row 1: Supply (left) + Status Icons (right) */}
            <div class="flex justify-between items-center mt-2 w-full">
              <PillWithTooltip
                label="EDITIONS"
                className={`${containerPill} ${cardSupply}`}
              >
                {supplyDisplay}
              </PillWithTooltip>
              <div class="flex items-center gap-1.5 mr-0.5 -translate-y-0.5">
                {isListed && (
                  <IconWithTooltip label={displayPriceBTC().text}>
                    <Icon
                      type="icon"
                      name="bitcoin"
                      weight="bold"
                      size="custom"
                      color="custom"
                      className="w-[17px] h-[17px] stroke-color-secondary-400"
                      ariaLabel="BTC"
                    />
                  </IconWithTooltip>
                )}
                {stamp.ident === "SRC-721" && (
                  <IconWithTooltip label="RECURSIVE">
                    <Icon
                      type="icon"
                      name="recursive"
                      weight="bold"
                      size="xxs"
                      color="neutral400"
                      ariaLabel="Recursive"
                    />
                  </IconWithTooltip>
                )}
                {Boolean(stamp.divisible) && (
                  <IconWithTooltip label="DIVISIBLE">
                    <Icon
                      type="icon"
                      name="divisible"
                      weight="bold"
                      size="xxs"
                      color="neutral400"
                      ariaLabel="Divisible"
                    />
                  </IconWithTooltip>
                )}
                {Boolean(stamp.keyburn) && (
                  <IconWithTooltip label="KEYBURNED">
                    <Icon
                      type="icon"
                      name="keyburned"
                      weight="bold"
                      size="xxs"
                      color="neutral400"
                      ariaLabel="Keyburned"
                    />
                  </IconWithTooltip>
                )}
                {stamp.locked
                  ? (
                    <IconWithTooltip label="LOCKED">
                      <Icon
                        type="icon"
                        name="locked"
                        weight="bold"
                        size="xxs"
                        color="neutral400"
                        ariaLabel="Locked"
                      />
                    </IconWithTooltip>
                  )
                  : (
                    <IconWithTooltip label="UNLOCKED">
                      <Icon
                        type="icon"
                        name="unlocked"
                        weight="bold"
                        size="xxs"
                        color="neutral400"
                        ariaLabel="Unlocked"
                      />
                    </IconWithTooltip>
                  )}
              </div>
            </div>

            {/* Row 2: File type + File size pills */}
            <div class="flex items-center justify-between mt-2 w-full">
              <PillWithTooltip
                label="FILE TYPE"
                className={`${containerPill} ${cardFileType}`}
              >
                {formatFileType(stamp.stamp_mimetype)}
              </PillWithTooltip>
              {stamp.file_size_bytes != null && (
                <PillWithTooltip
                  label="FILE SIZE"
                  className={`${containerPill} ${cardFileSize}`}
                >
                  {formatFileSize(
                    stamp.file_size_bytes,
                    stamp.stamp_mimetype === "text/plain",
                  )}
                </PillWithTooltip>
              )}
            </div>

            {
              /* Row 3: Holder address container (bottom) - hidden for now,
            pending real top-holder data (see github-issue-holder-data.md);
            stamp.creator is only the original creator, not necessarily the
            current holder
            <div
              class={`flex flex-col w-full mt-2 px-2.5 py-1.5 ${container3} cursor-pointer`}
            >
              <div class="flex justify-between items-center">
                <div class={cardEyebrowNeutral}>
                  HOLDER
                </div>
                <div class={cardFileSize}>
                  {stamp.creator
                    ? (
                      <a
                        href={`/wallet/${stamp.creator}`}
                        class="link-neutral-400"
                      >
                        {abbreviateAddress(stamp.creator, abbreviationLength)}
                      </a>
                    )
                    : <span class="text-color-neutral-500">N/A</span>}
                </div>
              </div>
            </div>
            */
            }
          </div>
        )}

        {/* ===== VERTICAL SALE CARD (marketplace sales) ===== */}
        {variant === "cardVerticalSale" && (
          <div class="flex flex-col items-center p-0.5">
            {/* Stamp Number */}
            <div
              class={`flex items-center justify-center mt-1
              ${cardStampNumber}`}
            >
              {displayStampHash && <span class="font-light">#</span>}
              {stampValue}
            </div>

            {/* CPID */}
            {stamp.cpid && (
              <div
                class={`mt-0.5 font-mono text-xs text-color-neutral-500 ${truncate}`}
              >
                {stamp.cpid}
              </div>
            )}

            {/* Creator Name or Abbreviated Address */}
            <UserProfileIcon wrapperClassName="justify-center w-full mt-1">
              <span class={cardCreator}>{creatorDisplay}</span>
            </UserProfileIcon>

            {/* Row 1: amount pill (left) + time_ago pill (right) */}
            {saleData && (
              <div class="flex items-center justify-between mt-2 w-full">
                <PillWithTooltip
                  label="EDITIONS"
                  className={`${containerPill} ${cardSupply}`}
                >
                  {saleData.dispense_quantity ?? 1}/{stamp.supply ?? 1}
                </PillWithTooltip>
                {(saleData.sale_time || saleData.time_ago) && (
                  <PillWithTooltip
                    label="SALE TIME"
                    className={`${containerPill} ${cardFileSize} text-[10px]`}
                  >
                    {(() => {
                      const { sale_time, time_ago } = saleData;
                      if (sale_time) {
                        const ageMs = Date.now() - sale_time * 1000;
                        if (ageMs >= 7 * 86_400_000) {
                          const d = new Date(sale_time * 1000);
                          return `${
                            d.getMonth() + 1
                          }/${d.getDate()}/${d.getFullYear()}`;
                        }
                      }
                      return time_ago;
                    })()}
                  </PillWithTooltip>
                )}
              </div>
            )}

            {/* Row 2: Sale info containers: sale price USD / sale price BTC */}
            {saleData && (
              <>
                <div
                  class={`flex flex-col items-end w-full mt-2 px-2.5 py-1 ${container3} cursor-pointer`}
                >
                  <div class="font-normal text-xs text-color-neutral-500 text-nowrap">
                    {displayPriceUSD()?.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} USD
                  </div>
                  <div class={`${cardPrice} min-[420px]:!text-sm`}>
                    {displayPriceBTC().text}
                  </div>
                </div>

                {/* Row 3: Buyer address container */}
                <div
                  class={`flex flex-col w-full mt-2 px-2.5 py-1.5 ${container3} cursor-pointer`}
                >
                  <div class="flex justify-between items-center">
                    <div
                      class={`${cardEyebrowNeutral}`}
                    >
                      BUYER
                    </div>
                    <div class={`${cardFileSize}`}>
                      {saleData.buyer_address
                        ? (
                          <a
                            href={`/wallet/${saleData.buyer_address}`}
                            class="link-neutral-400"
                          >
                            {abbreviateAddress(
                              saleData.buyer_address,
                              abbreviationLength,
                            )}
                          </a>
                        )
                        : <span class="text-color-neutral-500">N/A</span>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== SALE COMPACT SECTION (home / sales pages) ===== */}
        {variant === "cardVerticalSaleCompact" && (
          <div class="flex flex-col items-center p-0.5">
            <div
              class={`flex items-center justify-center mt-1 ${cardStampNumberCompact}`}
            >
              {displayStampHash && <span class="font-light">#</span>}
              {stampValue}
            </div>
            <PillWithTooltip
              label="PRICE"
              className={`mt-1.5 ${containerPill} ${cardPriceCompact}`}
            >
              {displayPriceBTC().text}
            </PillWithTooltip>
          </div>
        )}
      </a>
    </div>
  );
}
