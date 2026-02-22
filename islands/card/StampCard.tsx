/* ===== STAMP CARD COMPONENT ===== */
/* @baba-update audio icon size (custom) - 247*/
/*@baba-check styles+icon*/
import { Icon, LoadingIcon, PlaceholderImage } from "$icon";
import StampTextContent from "$islands/content/stampDetailContent/StampTextContent.tsx";
import {
  glassmorphism,
  glassmorphismL2,
  shadowGlowPurple,
  transitionColors,
} from "$layout";
import {
  abbreviateAddress,
  formatSupplyValue,
  stripTrailingZeros,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import {
  getStampImageSrc,
  getStampPreviewUrl,
} from "$lib/utils/ui/media/imageUtils.ts";
import type { StampRow } from "$types/stamp.d.ts";
import { VNode } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { TEXT_STYLES } from "./styles.ts";

/* ===== TYPES ===== */
interface StampWithSaleData extends Omit<StampRow, "stamp_base64"> {
  sale_data?: {
    btc_amount: number;
    block_index: number;
    tx_hash: string;
  };
  stamp_base64?: string;
}

/* ===== COMPONENT ===== */
export function StampCard({
  stamp,
  isRecentSale = false,
  showDetails = true,
  showEdition = false,
  showMinDetails = false,
  variant = "default",
}: {
  stamp: StampWithSaleData;
  isRecentSale?: boolean;
  showDetails?: boolean;
  showEdition?: boolean;
  showMinDetails?: boolean;
  variant?: "default" | "grey";
}) {
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
    const res = getStampImageSrc(stamp as StampRow);
    setSrc(res);
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
                    class="max-w-none object-contain rounded-2xl pixelart stamp-image h-full w-full"
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
                    class="max-w-none object-contain rounded-2xl pixelart stamp-image h-full w-full"
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

    // Handle HTML content - show cached preview PNG in grid view
    if (stamp.stamp_mimetype === "text/html") {
      return (
        <div class="stamp-container">
          <div class="relative z-10 aspect-square">
            <img
              src={getStampPreviewUrl(stamp as StampRow)}
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
            class="max-w-none object-contain rounded-2xl pixelart stamp-image h-full w-full"
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
        style: `${TEXT_STYLES.price.base} ${TEXT_STYLES.price.sizes}`,
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
          style: `${TEXT_STYLES.price.base} ${TEXT_STYLES.price.sizes}`,
        };
      }
    }

    // Legacy fallback for v2.2 or older data structures
    // @deprecated - Remove once all data migrated to v2.3 marketData structure
    const legacyPrice = stamp.floorPrice !== "priceless"
      ? stamp.floorPrice
      : stamp.recentSalePrice;
    if (legacyPrice !== "priceless" && !isNaN(Number(legacyPrice))) {
      return {
        text: `${stripTrailingZeros(Number(legacyPrice).toFixed(8))} BTC`,
        style: `${TEXT_STYLES.price.base} ${TEXT_STYLES.price.sizes}`,
      };
    }

    // Default to mime type if no valid price
    return {
      text: stamp.stamp_mimetype?.split("/")[1]?.toUpperCase() || "UNKNOWN",
      style: `${TEXT_STYLES.mimeType.base} ${TEXT_STYLES.mimeType.sizes}`,
    };
  };

  /* ===== COMPUTED VALUES ===== */
  const shouldDisplayHash = Number(stamp.stamp ?? 0) >= 0 ||
    (stamp.cpid && stamp.cpid.charAt(0) === "A");

  const supplyDisplay = isRecentSale
    ? `Qty: ${stamp.supply || 1}` // For recent sales, show transaction quantity
    : stamp.ident !== "SRC-20" && stamp.balance
    ? `${formatSupplyValue(Number(stamp.balance), stamp.divisible)}/${
      stamp.supply < 100000 && !stamp.divisible
        ? formatSupplyValue(stamp.supply ?? 0, stamp.divisible)
        : "+100000"
    }`
    : `1/${formatSupplyValue(stamp.supply ?? 0, stamp.divisible)}`;

  // Use dynamic abbreviation length
  const creatorDisplay = stamp.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp.creator, getAbbreviationLength());

  const stampValue = Number(stamp.stamp ?? 0) >= 0 ||
      (stamp.cpid && stamp.cpid.charAt(0) === "A")
    ? `${stamp.stamp}`
    : `${stamp.cpid}`;

  const editionCount = stamp.divisible
    ? (stamp.supply / 100000000).toFixed(2)
    : stamp.supply > 100000
    ? "+100000"
    : stamp.supply;

  /* ===== STYLE HELPERS ===== */
  const getTextStyles = (type: "hashSymbol" | "stampNumber") => {
    if (variant === "grey") {
      return `${TEXT_STYLES.greyGradient[type].base} ${
        TEXT_STYLES.greyGradient[type].sizes
      }`;
    }
    return `${TEXT_STYLES[type].base} ${TEXT_STYLES[type].sizes}`;
  };

  const isLongNumber = (value: string | number) => {
    const stringValue = String(value);
    return stringValue.length > 6;
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
          w-full h-full
          hover:border-color-purple-light ${shadowGlowPurple}
          ${glassmorphism} ${transitionColors}
        `}
      >
        {/* ===== ATOM ICON ===== */}
        {/* Note: Atomic icon is only shown on WalletStampCard for stamps with UTXO attachments */}
        {/* Regular StampCard does not show atomic icon as it lacks wallet-specific UTXO data */}

        {/* ===== CONTENT SECTION ===== */}
        <div class="relative w-full h-full">
          <div class="aspect-stamp w-full h-full overflow-hidden flex items-center justify-center">
            {renderContent()}
          </div>
        </div>

        {/* ===== DETAILS SECTION ===== */}
        {showDetails && !showMinDetails && (
          <div class="flex flex-col items-center px-[6px] pt-5 pb-0">
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
              class={`${TEXT_STYLES.creator.base} ${TEXT_STYLES.creator.sizes} mt-1`}
            >
              {creatorDisplay}
            </div>

            {/* Price and Supply */}
            <div class="flex justify-between items-center mt-4 w-full">
              {/* Price on the Left */}
              <div class={`text-left ${glassmorphismL2} px-3 py-1`}>
                <span
                  class={renderPrice().style}
                >
                  {renderPrice().text}
                </span>
              </div>
              {/* Supply/Editions on the Right */}
              <div
                class={`${TEXT_STYLES.supply.base} ${TEXT_STYLES.supply.sizes} text-right ${glassmorphismL2} px-3 py-1`}
              >
                {supplyDisplay}
              </div>
            </div>
          </div>
        )}

        {/* ===== EDITION SECTION ===== */}
        {showEdition && (
          <div class="flex flex-col items-center px-1.5 mobileLg:px-3 pt-1.5 mobileLg:pt-3">
            <div class="flex items-center justify-center">
              {shouldDisplayHash && (
                <span
                  class={`${TEXT_STYLES.minimal.hashSymbol.base} ${TEXT_STYLES.minimal.hashSymbol.sizes}`}
                >
                  #
                </span>
              )}
              <span
                class={`${TEXT_STYLES.minimal.stampNumber.base} ${TEXT_STYLES.minimal.stampNumber.sizes}`}
              >
                {stampValue}
              </span>
            </div>
            <div class="-mt-1 mobileLg:mt-0.5 w-full flex justify-between items-center">
              <span
                class={`${TEXT_STYLES.minimal.price.base} ${TEXT_STYLES.minimal.price.sizes}`}
              >
                {editionCount}
              </span>
              <span
                class={`${TEXT_STYLES.minimal.price.base} ${TEXT_STYLES.minimal.price.sizes}`}
              >
                {renderPrice().text}
              </span>
            </div>
          </div>
        )}

        {/* ===== MINIMAL DETAILS SECTION ===== */}
        {showMinDetails && !showDetails && (
          <div class="flex flex-col items-center px-1.5 mobileLg:px-3 pt-1.5 mobileLg:pt-3">
            <div class="flex items-center justify-center">
              {shouldDisplayHash && (
                <span
                  class={`${TEXT_STYLES.minimal.hashSymbol.base} ${TEXT_STYLES.minimal.hashSymbol.sizes}`}
                >
                  #
                </span>
              )}
              <span
                class={`${TEXT_STYLES.minimal.stampNumber.base} ${TEXT_STYLES.minimal.stampNumber.sizes}`}
              >
                {stampValue}
              </span>
            </div>
            <div class="-mt-1 mobileLg:mt-0.5">
              <span
                class={`${TEXT_STYLES.minimal.price.base} ${TEXT_STYLES.minimal.price.sizes}`}
              >
                {renderPrice().text}
              </span>
            </div>
          </div>
        )}
      </a>
    </div>
  );
}
