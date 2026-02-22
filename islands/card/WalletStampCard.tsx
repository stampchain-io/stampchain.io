/* ===== WALLET STAMP CARD COMPONENT ===== */
/* Specialized version of StampCard for wallet pages showing user-specific details */
import { Icon, LoadingIcon, PlaceholderImage } from "$icon";
import StampTextContent from "$islands/content/stampDetailContent/StampTextContent.tsx";
import { glassmorphismL2, shadowGlowPurple } from "$layout";
import type { WalletStampCardProps } from "$types/ui.d.ts";
import { VNode } from "preact";
import { memo } from "preact/compat";
import { useEffect, useRef, useState } from "preact/hooks";

import { WalletStampValue } from "$components/display/BTCValueDisplay.tsx";
import {
  cardCreator,
  cardHashSymbol,
  cardHashSymbolGrey,
  cardMimeType,
  cardPrice,
  cardStampNumber,
  cardStampNumberGrey,
  cardSupply,
} from "$components/text/styles.ts";
import { isAtomicIconVisible } from "$lib/utils/bitcoin/stamps/stampUtils.ts";
import {
  abbreviateAddress,
  formatBalanceDisplay,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import {
  getStampImageSrc,
  getStampPreviewUrl,
} from "$lib/utils/ui/media/imageUtils.ts";

/* ===== TYPES ===== */

/* ===== UTILITY FUNCTIONS ===== */

/**
 * Formats the quantity display for left side of card
 * @param balance - Number of stamps owned
 * @param supply - Total supply of stamps
 * @param divisible - Whether the stamp is divisible
 * @returns Formatted string like "4/35 total editions"
 */
const formatQuantityDisplay = (
  balance: number,
  supply: number,
  divisible: boolean,
): string => {
  // Use the new formatBalanceDisplay function to handle large numbers
  return formatBalanceDisplay(balance, supply, divisible);
};

/* ===== MAIN COMPONENT ===== */
const WalletStampCardComponent = (
  { stamp, variant = "default", fromPage }: WalletStampCardProps,
) => {
  /* ===== STATE ===== */
  const [loading, setLoading] = useState<boolean>(true);
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [validatedContent, setValidatedContent] = useState<VNode | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

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

  const getAbbreviationLength = () => {
    if (typeof globalThis !== "undefined" && globalThis.innerWidth) {
      if (globalThis.innerWidth < 768) return 4;
      if (globalThis.innerWidth < 1024) return 6;
      return 8;
    }
    return 6;
  };

  const fetchStampImage = () => {
    setLoading(true);
    // Use centralized image URL logic
    const imageSrc = getStampImageSrc(stamp);
    setSrc(imageSrc);
    setLoading(false);
  };

  /* ===== EFFECTS ===== */
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

          // Check if SVG has external ordinals.com or arweave.net references
          if (
            svgContent.includes("ordinals.com/content/") ||
            svgContent.includes("arweave.net/")
          ) {
            // Rewrite external references to use our proxy
            let rewrittenSVG = svgContent.replace(
              /https:\/\/ordinals\.com\/content\/([^"'\s>]+)/g,
              "/api/proxy/ordinals/$1",
            ).replace(
              /https:\/\/arweave\.net\/([^"'\s>]+)/g,
              "/api/proxy/arweave/$1",
            );

            // Ensure SVG fills container by removing fixed dimensions and adding proper styling
            if (rewrittenSVG.includes("<svg")) {
              // Remove width and height attributes
              rewrittenSVG = rewrittenSVG.replace(
                /<svg([^>]*)\s+width="([^"]*)"([^>]*)/,
                "<svg$1$3",
              ).replace(
                /<svg([^>]*)\s+height="([^"]*)"([^>]*)/,
                "<svg$1$3",
              );

              // Add viewBox if not present (using the original dimensions)
              if (!rewrittenSVG.includes("viewBox")) {
                rewrittenSVG = rewrittenSVG.replace(
                  /<svg([^>]*)>/,
                  '<svg$1 viewBox="0 0 460 500">',
                );
              }

              // Add responsive styling to fill container properly
              rewrittenSVG = rewrittenSVG.replace(
                /<svg([^>]*)>/,
                '<svg$1 style="max-width: 100%; max-height: 100%; width: auto; height: auto; display: block;">',
              );
            }

            setValidatedContent(
              <div class="stamp-container">
                <div class="relative z-10 aspect-square flex items-center justify-center">
                  <div
                    class="max-w-none object-contain rounded pixelart stamp-image h-full w-full"
                    dangerouslySetInnerHTML={{ __html: rewrittenSVG }}
                  />
                </div>
              </div>,
            );
            setLoading(false);
          } else {
            // No external references, use original src
            setValidatedContent(
              <div class="stamp-container">
                <div class="relative z-10 aspect-square">
                  <img
                    src={src}
                    loading="lazy"
                    alt={`Stamp No. ${stamp.stamp}`}
                    class="max-w-none object-contain rounded pixelart stamp-image h-full w-full"
                    onLoad={() => setLoading(false)}
                    onError={handleImageError}
                  />
                </div>
              </div>,
            );
          }
        } catch (_error) {
          // Fallback to PlaceholderImage
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
            {/* Fallback image for audio files */}
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
              <div class="absolute inset-0 bg-black opacity-50 rounded-full" />
              <Icon
                name={isPlaying ? "pause" : "play"}
                type="iconButton"
                weight="bold"
                size="xsR"
                color="custom"
                className="relative z-10 [&_path]:fill-color-grey-dark [&_path]:group-hover/button:fill-color-purple-light transition-all duration-200"
              />
            </button>
          </div>
        </div>
      );
    }

    if (stamp.stamp_mimetype === "text/plain") {
      return <StampTextContent src={src} />;
    }

    // Handle HTML content — show cached preview PNG instead of iframe
    if (stamp.stamp_mimetype === "text/html") {
      return (
        <div class="stamp-container relative">
          <div class="relative z-10 aspect-square">
            <img
              src={getStampPreviewUrl(stamp)}
              loading="lazy"
              alt={`Stamp No. ${stamp.stamp}`}
              class="max-w-none object-contain rounded-2xl pixelart stamp-image h-full w-full"
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
            class="max-w-none object-contain rounded pixelart stamp-image h-full w-full"
            onLoad={() => setLoading(false)}
            onError={handleImageError}
          />
        </div>
      </div>
    );
  };

  /* ===== COMPUTED VALUES ===== */
  const shouldDisplayHash = Number(stamp.stamp ?? 0) >= 0 ||
    (stamp.cpid && stamp.cpid.charAt(0) === "A");

  // Use dynamic abbreviation length
  const creatorDisplay = stamp.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp.creator || "", getAbbreviationLength());

  const stampValue = Number(stamp.stamp ?? 0) >= 0 ||
      (stamp.cpid && stamp.cpid.charAt(0) === "A")
    ? `${stamp.stamp}`
    : `${stamp.cpid}`;

  /* ===== STYLE HELPERS ===== */
  const getTextStyles = (type: "hashSymbol" | "stampNumber") => {
    if (variant === "grey") {
      return type === "hashSymbol" ? cardHashSymbolGrey : cardStampNumberGrey;
    }
    return type === "hashSymbol" ? cardHashSymbol : cardStampNumber;
  };

  const isLongNumber = (value: string | number) => {
    const stringValue = String(value);
    return stringValue.length > 6;
  };

  // Check if stamp has BTC value for display using v2.3 marketData or legacy fallback
  const stampWithMarketData = stamp as any;
  const marketData = stampWithMarketData?.marketData;

  const hasStampValue = marketData?.walletValueBTC > 0;
  const hasMarketPrice = marketData
    ? (marketData.floorPriceBTC > 0 || marketData.recentSalePriceBTC > 0)
    : false;

  // Determine fallback display
  const fallbackDisplay = {
    text: stamp.stamp_mimetype?.split("/")[1]?.toUpperCase() || "UNKNOWN",
    style: cardMimeType,
    title: `File Type: ${stamp.stamp_mimetype || "Unknown"}`,
  };

  /* ===== RENDER ===== */
  return (
    <div class="relative flex justify-center w-full h-full max-w-72">
      <a
        href={`/stamp/${stamp.tx_hash}`}
        target="_top"
        f-partial={`/stamp/${stamp.tx_hash}`}
        data-long-number={isLongNumber(stampValue)}
        class={`
          text-white group relative z-0 flex flex-col
          p-stamp-card mobileLg:p-3
          rounded-2xl transition-all
          w-full h-full
          hover:border-color-purple-light ${shadowGlowPurple} hover:border-solid border-2 border-transparent
           ${glassmorphismL2}
        `}
      >
        {/* ===== WALLET INDICATOR (ATOMIC ICON) ===== */}
        {fromPage && fromPage === "wallet" && isAtomicIconVisible(stamp) && (
          <div class="absolute top-0 right-0 w-[31px] h-[31px] z-10 rounded-[3px] bg-color-background p-[3px] desktop:block hidden">
            <Icon
              type="icon"
              name="atom"
              weight="normal"
              size="xs"
              color="greyLight"
            />
          </div>
        )}

        {/* ===== CONTENT SECTION ===== */}
        <div class="relative w-full h-full">
          <div class="aspect-stamp w-full h-full overflow-hidden flex items-center justify-center">
            {renderContent()}
          </div>
        </div>

        {/* ===== WALLET-SPECIFIC DETAILS SECTION ===== */}
        <div class="flex flex-col items-center px-[6px] pt-[18px] pb-0">
          {/* Stamp Number with container */}
          <div class="flex items-center justify-center max-w-[90%]">
            {shouldDisplayHash && (
              <span
                class={getTextStyles("hashSymbol")}
              >
                #
              </span>
            )}
            <span
              class={getTextStyles("stampNumber")}
            >
              {stampValue}
            </span>
          </div>

          {/* Creator Name or Abbreviated Address */}
          <div
            class={`${cardCreator} mt-[3px]`}
          >
            {creatorDisplay}
          </div>

          {/* Price/File Type and Quantity (wallet-specific) */}
          <div class="flex justify-between w-full mt-[6px]">
            {/* BTC Value or File Type on the Left */}
            <div class="flex-1 text-left -mt-[2px] mobileLg:-mt-[0px] desktop:mt-[3px]">
              {hasStampValue || hasMarketPrice
                ? (
                  <WalletStampValue
                    stamp={stamp}
                    size="sm"
                    className={cardPrice}
                  />
                )
                : (
                  <span
                    class={fallbackDisplay.style}
                    title={fallbackDisplay.title}
                  >
                    {fallbackDisplay.text}
                  </span>
                )}
            </div>

            {/* Quantity Display on the Right */}
            <div
              class={`${cardSupply} flex-1 text-right truncate min-w-0`}
              title={`You own ${stamp.balance} out of ${stamp.supply} total supply`}
            >
              {formatQuantityDisplay(
                Number(stamp.balance || 0),
                Number(stamp.supply || 0),
                Boolean(stamp.divisible),
              )}
            </div>
          </div>
        </div>
      </a>
    </div>
  );
};

// Export memoized component for performance optimization
export const WalletStampCard = memo(WalletStampCardComponent);
