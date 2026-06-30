/* ===== STAMP CARD COMPONENT ===== */
/* @baba-update audio icon size (custom) - 247*/
/*@baba-check styles+icon*/
import { Button } from "$button";
import { Icon, LoadingIcon, PlaceholderImage } from "$icon";
import StampTextContent from "$islands/content/stampDetailContent/StampTextContent.tsx";
import { container3, containerCard, containerPill } from "$layout";
import {
  abbreviateAddress,
  formatFileSize,
  formatSupplyValue,
  stripTrailingZeros,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import {
  getStampImageSrc,
  getStampPreviewUrl,
} from "$lib/utils/ui/media/imageUtils.ts";
import { tooltipIcon } from "$notification";
import {
  cardCreator,
  cardFileSize,
  cardFileType,
  cardPrice,
  cardPriceMinimal,
  cardStampNumber,
  cardStampNumberMinimal,
  cardSupply,
} from "$text";
import type { StampCardVariant, StampRow } from "$types/stamp.d.ts";
import { VNode } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */
interface StampWithSaleData extends Omit<StampRow, "stamp_base64"> {
  sale_data?: {
    btc_amount: number;
    block_index: number;
    tx_hash: string;
    buyer_address?: string;
    dispenser_address?: string;
    time_ago?: string;
    dispense_quantity?: number;
  };
  stamp_base64?: string;
}

/* ===== COMPONENT ===== */
export function StampCard({
  stamp,
  isRecentSale = false,
  variant = "imageDetailExplorer",
}: {
  stamp: StampWithSaleData;
  isRecentSale?: boolean;
  variant?: StampCardVariant;
}) {
  /* ===== STATE ===== */
  const [loading, setLoading] = useState<boolean>(true);
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [validatedContent, setValidatedContent] = useState<VNode | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof globalThis !== "undefined" ? globalThis.innerWidth ?? 0 : 0,
  );

  // Audio-related state (always declared to avoid conditional hooks)
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Tooltip visibility state
  const [isRecursiveTooltipVisible, setIsRecursiveTooltipVisible] = useState(
    false,
  );
  const [isDivisibleTooltipVisible, setIsDivisibleTooltipVisible] = useState(
    false,
  );
  const [isKeyburnTooltipVisible, setIsKeyburnTooltipVisible] = useState(false);
  const [isLockedTooltipVisible, setIsLockedTooltipVisible] = useState(false);
  const [isUnlockedTooltipVisible, setIsUnlockedTooltipVisible] = useState(
    false,
  );
  const [allowRecursiveTooltip, setAllowRecursiveTooltip] = useState(true);
  const [allowDivisibleTooltip, setAllowDivisibleTooltip] = useState(true);
  const [allowKeyburnTooltip, setAllowKeyburnTooltip] = useState(true);
  const [allowLockedTooltip, setAllowLockedTooltip] = useState(true);
  const [allowUnlockedTooltip, setAllowUnlockedTooltip] = useState(true);
  const [isBtcTooltipVisible, setIsBtcTooltipVisible] = useState(false);
  const [allowBtcTooltip, setAllowBtcTooltip] = useState(true);
  const recursiveTooltipTimeoutRef = useRef<number | null>(null);
  const divisibleTooltipTimeoutRef = useRef<number | null>(null);
  const keyburnTooltipTimeoutRef = useRef<number | null>(null);
  const lockedTooltipTimeoutRef = useRef<number | null>(null);
  const unlockedTooltipTimeoutRef = useRef<number | null>(null);
  const btcTooltipTimeoutRef = useRef<number | null>(null);

  // Library file detection (CSS, JS, GZIP, JSON)
  const isLibraryFile = stamp.stamp_mimetype === "text/css" ||
    stamp.stamp_mimetype === "text/javascript" ||
    stamp.stamp_mimetype === "application/javascript" ||
    stamp.stamp_mimetype === "application/gzip" ||
    stamp.stamp_mimetype === "application/json" ||
    stamp.stamp_mimetype === "text/json";

  /* ===== TOOLTIP HANDLERS ===== */
  const handleRecursiveMouseEnter = () => {
    if (allowRecursiveTooltip) {
      if (recursiveTooltipTimeoutRef.current) {
        globalThis.clearTimeout(recursiveTooltipTimeoutRef.current);
      }
      recursiveTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsRecursiveTooltipVisible(true);
      }, 500);
    }
  };

  const handleRecursiveMouseLeave = () => {
    if (recursiveTooltipTimeoutRef.current) {
      globalThis.clearTimeout(recursiveTooltipTimeoutRef.current);
    }
    setIsRecursiveTooltipVisible(false);
    setAllowRecursiveTooltip(true);
  };

  const handleDivisibleMouseEnter = () => {
    if (allowDivisibleTooltip) {
      if (divisibleTooltipTimeoutRef.current) {
        globalThis.clearTimeout(divisibleTooltipTimeoutRef.current);
      }
      divisibleTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsDivisibleTooltipVisible(true);
      }, 500);
    }
  };

  const handleDivisibleMouseLeave = () => {
    if (divisibleTooltipTimeoutRef.current) {
      globalThis.clearTimeout(divisibleTooltipTimeoutRef.current);
    }
    setIsDivisibleTooltipVisible(false);
    setAllowDivisibleTooltip(true);
  };

  const handleKeyburnMouseEnter = () => {
    if (allowKeyburnTooltip) {
      if (keyburnTooltipTimeoutRef.current) {
        globalThis.clearTimeout(keyburnTooltipTimeoutRef.current);
      }
      keyburnTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsKeyburnTooltipVisible(true);
      }, 500);
    }
  };

  const handleKeyburnMouseLeave = () => {
    if (keyburnTooltipTimeoutRef.current) {
      globalThis.clearTimeout(keyburnTooltipTimeoutRef.current);
    }
    setIsKeyburnTooltipVisible(false);
    setAllowKeyburnTooltip(true);
  };

  const handleLockedMouseEnter = () => {
    if (allowLockedTooltip) {
      if (lockedTooltipTimeoutRef.current) {
        globalThis.clearTimeout(lockedTooltipTimeoutRef.current);
      }
      lockedTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsLockedTooltipVisible(true);
      }, 500);
    }
  };

  const handleLockedMouseLeave = () => {
    if (lockedTooltipTimeoutRef.current) {
      globalThis.clearTimeout(lockedTooltipTimeoutRef.current);
    }
    setIsLockedTooltipVisible(false);
    setAllowLockedTooltip(true);
  };

  const handleUnlockedMouseEnter = () => {
    if (allowUnlockedTooltip) {
      if (unlockedTooltipTimeoutRef.current) {
        globalThis.clearTimeout(unlockedTooltipTimeoutRef.current);
      }
      unlockedTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsUnlockedTooltipVisible(true);
      }, 500);
    }
  };

  const handleUnlockedMouseLeave = () => {
    if (unlockedTooltipTimeoutRef.current) {
      globalThis.clearTimeout(unlockedTooltipTimeoutRef.current);
    }
    setIsUnlockedTooltipVisible(false);
    setAllowUnlockedTooltip(true);
  };

  const handleBtcMouseEnter = () => {
    if (allowBtcTooltip) {
      if (btcTooltipTimeoutRef.current) {
        globalThis.clearTimeout(btcTooltipTimeoutRef.current);
      }
      btcTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsBtcTooltipVisible(true);
      }, 500);
    }
  };

  const handleBtcMouseLeave = () => {
    if (btcTooltipTimeoutRef.current) {
      globalThis.clearTimeout(btcTooltipTimeoutRef.current);
    }
    setIsBtcTooltipVisible(false);
    setAllowBtcTooltip(true);
  };

  /* ===== HANDLERS ===== */
  const handleImageError = (e: Event) => {
    if (e.currentTarget instanceof HTMLImageElement) {
      // Use transparent pixel data URI to prevent infinite error loops
      // (setting src="" resolves to the page URL, which isn't an image → re-triggers error)
      e.currentTarget.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      e.currentTarget.alt = "Content not available";
    }
  };

  const abbreviationLength = windowWidth < 768 ? 4 : windowWidth < 1024 ? 5 : 5;

  const fetchStampImage = () => {
    setLoading(true);
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
  // Cleanup tooltip timeouts on unmount
  useEffect(() => {
    return () => {
      [
        recursiveTooltipTimeoutRef,
        divisibleTooltipTimeoutRef,
        keyburnTooltipTimeoutRef,
        lockedTooltipTimeoutRef,
        unlockedTooltipTimeoutRef,
        btcTooltipTimeoutRef,
      ].forEach((ref) => {
        if (ref.current) {
          globalThis.clearTimeout(ref.current);
        }
      });
    };
  }, []);

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
                    src={getStampPreviewUrl(stamp as StampRow)}
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
      return (
        <div class="stamp-container">
          <div class="relative z-10 aspect-square">
            <img
              src={getStampPreviewUrl(stamp as StampRow)}
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
    return (
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
      </div>
    );
  };

  const renderPrice = () => {
    if (isRecentSale && stamp.sale_data) {
      return {
        text: `${
          stripTrailingZeros(stamp.sale_data.btc_amount.toFixed(8))
        } BTC`,
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
        return {
          text: `${stripTrailingZeros(Number(marketPrice).toFixed(8))} BTC`,
          style: cardPrice,
        };
      }
    }

    return {
      text: stamp.stamp_mimetype?.split("/")[1]?.toUpperCase() || "UNKNOWN",
      style: cardFileType,
    };
  };

  /* ===== COMPUTED VALUES ===== */
  const supplyDisplay = isRecentSale
    ? `${stamp.supply || 1}` // For recent sales, show transaction quantity
    : stamp.ident !== "SRC-20" && stamp.balance
    ? `${formatSupplyValue(Number(stamp.balance), stamp.divisible)}/${
      stamp.supply < 100000 && !stamp.divisible
        ? formatSupplyValue(stamp.supply ?? 0, stamp.divisible)
        : "+100000"
    }`
    : stamp.supply === 1
    ? "1/1"
    : `${formatSupplyValue(stamp.supply ?? 0, stamp.divisible)}`;

  // Use dynamic abbreviation length
  const creatorDisplay = stamp.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp.creator, abbreviationLength);

  const stampValue = stamp.stamp != null ? `${stamp.stamp}` : `${stamp.cpid}`;
  const displayStampHash = stamp.stamp != null;

  const isLongNumber = (value: string | number) => {
    const stringValue = String(value);
    return stringValue.length > 6;
  };

  const isListed = renderPrice().style === cardPrice;

  /* ===== RENDER ===== */
  return (
    <div class="relative flex justify-center w-full h-full max-w-72">
      <a
        href={`/stamp/${stamp.tx_hash}`}
        target="_top"
        f-partial={`/stamp/${stamp.tx_hash}`}
        data-long-number={isLongNumber(stampValue)}
        class={containerCard}
      >
        {/* ===== ATOM ICON ===== */}
        {/* Note: Atomic icon is only shown on WalletStampCard for stamps with UTXO attachments */}
        {/* Regular StampCard does not show atomic icon as it lacks wallet-specific UTXO data */}

        {/* ===== CONTENT SECTION ===== */}
        <div class="relative w-full h-full">
          <div class="aspect-stamp w-full h-full overflow-hidden flex items-center justify-center">
            {renderContent()}
          </div>
          {/* ===== IMAGE PILL OVERLAY ===== */}
          {variant === "imagePill" && (
            <div class="absolute bottom-1 left-1 z-20">
              <div class={`${containerPill} ${cardSupply} cursor-pointer`}>
                {supplyDisplay}
              </div>
            </div>
          )}
        </div>

        {/* ===== FULL DETAILS SECTION (explorer / marketplace listings) ===== */}
        {(variant === "imageDetailExplorer" ||
          variant === "imageDetailMarketplaceListings") && (
          <div class="flex flex-col items-center p-0.5">
            {/* Stamp Number */}
            <div
              class={`flex items-center justify-center max-w-[90%] mt-1
              ${cardStampNumber}`}
            >
              {displayStampHash && <span class="font-light">#</span>}
              {stampValue}
            </div>

            {/* CPID (marketplace listings only) */}
            {variant === "imageDetailMarketplaceListings" && stamp.cpid && (
              <div class="font-mono text-xs text-color-neutral-500 truncate max-w-[90%] mt-0.5">
                {stamp.cpid}
              </div>
            )}

            {/* Creator Name or Abbreviated Address */}
            <div class={`${cardCreator} mt-1`}>
              {creatorDisplay}
            </div>

            {/* Row 1: Supply (left) + Status Icons (right) */}
            <div class="flex justify-between items-center mt-2 w-full">
              <div class={`${containerPill} ${cardSupply}`}>
                {variant === "imageDetailMarketplaceListings"
                  ? `${
                    (stamp as any).lowestPriceDispenser?.give_remaining ??
                      stamp.supply ?? 1
                  }/${stamp.supply ?? 1}`
                  : supplyDisplay}
              </div>
              <div class="flex items-center gap-1.5 mr-0.5">
                {variant === "imageDetailExplorer" && isListed && (
                  <div
                    class="relative"
                    onMouseEnter={handleBtcMouseEnter}
                    onMouseLeave={handleBtcMouseLeave}
                  >
                    <Icon
                      type="icon"
                      name="bitcoin"
                      weight="bold"
                      size="xxs"
                      color="custom"
                      className="stroke-color-secondary-400"
                      ariaLabel="BTC"
                    />
                    <div
                      class={`${tooltipIcon} ${
                        isBtcTooltipVisible ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {renderPrice().text}
                    </div>
                  </div>
                )}
                {stamp.ident === "SRC-721" && (
                  <div
                    class="relative"
                    onMouseEnter={handleRecursiveMouseEnter}
                    onMouseLeave={handleRecursiveMouseLeave}
                  >
                    <Icon
                      type="icon"
                      name="recursive"
                      weight="bold"
                      size="xxs"
                      color="greyLight"
                      ariaLabel="Recursive"
                    />
                    <div
                      class={`${tooltipIcon} ${
                        isRecursiveTooltipVisible ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      RECURSIVE
                    </div>
                  </div>
                )}
                {stamp.divisible && (
                  <div
                    class="relative"
                    onMouseEnter={handleDivisibleMouseEnter}
                    onMouseLeave={handleDivisibleMouseLeave}
                  >
                    <Icon
                      type="icon"
                      name="divisible"
                      weight="bold"
                      size="xxs"
                      color="greyLight"
                      ariaLabel="Divisible"
                    />
                    <div
                      class={`${tooltipIcon} ${
                        isDivisibleTooltipVisible ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      DIVISIBLE
                    </div>
                  </div>
                )}
                {stamp.keyburn != null && (
                  <div
                    class="relative"
                    onMouseEnter={handleKeyburnMouseEnter}
                    onMouseLeave={handleKeyburnMouseLeave}
                  >
                    <Icon
                      type="icon"
                      name="keyburned"
                      weight="bold"
                      size="xxs"
                      color="greyLight"
                      ariaLabel="Keyburned"
                    />
                    <div
                      class={`${tooltipIcon} ${
                        isKeyburnTooltipVisible ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      KEYBURNED
                    </div>
                  </div>
                )}
                {stamp.locked
                  ? (
                    <div
                      class="relative"
                      onMouseEnter={handleLockedMouseEnter}
                      onMouseLeave={handleLockedMouseLeave}
                    >
                      <Icon
                        type="icon"
                        name="locked"
                        weight="bold"
                        size="xxs"
                        color="greyLight"
                        ariaLabel="Locked"
                      />
                      <div
                        class={`${tooltipIcon} ${
                          isLockedTooltipVisible ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        LOCKED
                      </div>
                    </div>
                  )
                  : (
                    <div
                      class="relative"
                      onMouseEnter={handleUnlockedMouseEnter}
                      onMouseLeave={handleUnlockedMouseLeave}
                    >
                      <Icon
                        type="icon"
                        name="unlocked"
                        weight="bold"
                        size="xxs"
                        color="greyLight"
                        ariaLabel="Unlocked"
                      />
                      <div
                        class={`${tooltipIcon} ${
                          isUnlockedTooltipVisible ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        UNLOCKED
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Row 2: File type + File size pills */}
            <div class="flex items-center justify-between mt-2 w-full">
              <div class={`${containerPill} ${cardFileType}`}>
                {stamp.stamp_mimetype?.split("/")[1]?.toUpperCase() ||
                  "UNKNOWN"}
              </div>
              {stamp.file_size_bytes != null && (
                <div class={`${containerPill} ${cardFileSize}`}>
                  {formatFileSize(
                    stamp.file_size_bytes,
                    stamp.stamp_mimetype === "text/plain",
                  )}
                </div>
              )}
            </div>

            {/* Row 3: Buy button (marketplace listings only) */}
            {variant === "imageDetailMarketplaceListings" && isListed && (
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
                      {renderPrice().text}
                    </span>
                    <span class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      BUY
                    </span>
                  </span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ===== SALE DETAILS SECTION (marketplace sales) ===== */}
        {variant === "imageDetailMarketplaceSales" && (
          <div class="flex flex-col items-center p-0.5">
            {/* Stamp Number */}
            <div
              class={`flex items-center justify-center max-w-[90%] mt-1
              ${cardStampNumber}`}
            >
              {displayStampHash && <span class="font-light">#</span>}
              {stampValue}
            </div>

            {/* CPID */}
            {stamp.cpid && (
              <div class="font-mono text-xs text-color-neutral-500 truncate max-w-[90%] mt-0.5">
                {stamp.cpid}
              </div>
            )}

            {/* Creator Name or Abbreviated Address */}
            <div class={`${cardCreator} mt-1`}>
              {creatorDisplay}
            </div>

            {/* Row B: amount pill (left) + time_ago pill (right) */}
            {stamp.sale_data && (
              <div class="flex items-center justify-between mt-2 w-full">
                <div class={`${containerPill} ${cardSupply}`}>
                  {stamp.sale_data.dispense_quantity ?? 1}/{stamp.supply ?? 1}
                </div>
                {stamp.sale_data.time_ago && (
                  <div class={`${containerPill} ${cardFileSize}`}>
                    {stamp.sale_data.time_ago}
                  </div>
                )}
              </div>
            )}

            {/* Sale info container: sale price BTC (left) + buyer address (right) */}
            {stamp.sale_data && (
              <div
                class={`flex flex-col w-full mt-2 items-center justify-center px-3 py-2 gap-1 ${container3} cursor-pointer`}
              >
                <div class={`${cardPrice}`}>
                  {renderPrice().text}
                </div>
                <div
                  class={`hidden min-[420px]:flex text-[11px] bg-gradient-to-b from-color-secondary-400 to-color-neutral-400 bg-clip-text text-transparent`}
                >
                  BY
                </div>
                {(stamp.sale_data.buyer_address ||
                  stamp.sale_data.dispenser_address) && (
                  <div class={`${cardFileSize}`}>
                    {abbreviateAddress(
                      stamp.sale_data.buyer_address ||
                        stamp.sale_data.dispenser_address || "",
                      abbreviationLength,
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== MINIMAL DETAILS SECTION (home / sales pages) ===== */}
        {variant === "imageDetailHomeSales" && (
          <div class="flex flex-col items-center px-1.5 mobileLg:px-3 pt-1.5 mobileLg:pt-3">
            <div
              class={`flex items-center justify-center
              ${cardStampNumberMinimal}`}
            >
              {displayStampHash && <span class="font-light">#</span>}
              {stampValue}
            </div>
            <div class={`mt-2 ${containerPill} ${cardPriceMinimal}`}>
              {renderPrice().text}
            </div>
          </div>
        )}
      </a>
    </div>
  );
}
