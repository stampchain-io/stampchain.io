/* ===== STAMP INFO COMPONENT ===== */
/*@baba-750+764+815+icons - refactor to StatItems */
import { Button } from "$button";
import { Icon } from "$icon";
import BuyStampModal from "$islands/modal/BuyStampModal.tsx";
import { openModal } from "$islands/modal/states.ts";
import {
  body,
  containerBackground,
  containerColData,
  containerGap,
} from "$layout";
import type { Src101Detail } from "$lib/types/src101.d.ts";
import type { StampRow } from "$lib/types/stamp.d.ts";
import {
  abbreviateAddress,
  formatBTCAmount,
  formatDate,
  formatFileSize,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import {
  getSRC101Data,
  getStampImageSrc,
} from "$lib/utils/ui/media/imageUtils.ts";
import { tooltipIcon } from "$notification";
import { Dispenser, StampListingsOpenTable } from "$table";
import {
  headingGreyDLLink,
  labelSm,
  titleNeutral,
  value2xl,
  value3xl,
  valueDark,
  valueSm,
} from "$text";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */
interface StampInfoProps {
  stamp: StampRow;
  lowestPriceDispenser: any;
}

interface DimensionsType {
  width: number | string;
  height: number | string;
  unit: string | "responsive";
}

/* ===== COMPONENT ===== */
export function StampInfo({ stamp, lowestPriceDispenser }: StampInfoProps) {
  /* ===== STATE ===== */
  const [fee, setFee] = useState<number>(0);
  const handleChangeFee = (newFee: number) => {
    setFee(newFee);
  };

  const toggleModal = (dispenser?: Dispenser) => {
    if (dispenser) {
      setSelectedDispenser(dispenser);
    }

    // Create modal content
    const modalContent = (
      <BuyStampModal
        stamp={stamp}
        fee={fee}
        handleChangeFee={handleChangeFee}
        dispenser={selectedDispenser || lowestPriceDispenser}
      />
    );

    // Show modal with animation
    openModal(modalContent, "slideUpDown");
  };

  const createdDate = (() => {
    const date = new Date(stamp.block_time);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      const hours = Math.floor(diffHours);
      return `${hours} ${hours === 1 ? "HOUR" : "HOURS"} AGO`;
    }

    return formatDate(date, {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      includeRelative: false,
    });
  })();

  const editionCount = stamp.divisible
    ? (stamp.supply / 100000000).toFixed(2)
    : stamp.supply > 100000
    ? "+100000"
    : stamp.supply;

  const editionLabel = stamp.supply === 1 ? "EDITION" : "EDITIONS";
  /* ===== REFS AND UI STATE ===== */
  const [imageDimensions, setImageDimensions] = useState<DimensionsType | null>(
    null,
  );

  const fileExtension = stamp.stamp_url?.split(".")?.pop()?.toUpperCase() ||
    "UNKNOWN";

  const creatorDisplay = stamp.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp.creator, 8);

  const [isDivisibleTooltipVisible, setIsDivisibleTooltipVisible] = useState(
    false,
  );
  const [isKeyburnTooltipVisible, setIsKeyburnTooltipVisible] = useState(false);
  const [isLockedTooltipVisible, setIsLockedTooltipVisible] = useState(false);
  const [isUnlockedTooltipVisible, setIsUnlockedTooltipVisible] = useState(
    false,
  );
  const [isRecursiveTooltipVisible, setIsRecursiveTooltipVisible] = useState(
    false,
  );
  const [allowDivisibleTooltip, setAllowDivisibleTooltip] = useState(true);
  const [allowKeyburnTooltip, setAllowKeyburnTooltip] = useState(true);
  const [allowLockedTooltip, setAllowLockedTooltip] = useState(true);
  const [allowUnlockedTooltip, setAllowUnlockedTooltip] = useState(true);
  const [allowRecursiveTooltip, setAllowRecursiveTooltip] = useState(true);
  const divisibleTooltipTimeoutRef = useRef<number | null>(null);
  const keyburnTooltipTimeoutRef = useRef<number | null>(null);
  const lockedTooltipTimeoutRef = useRef<number | null>(null);
  const unlockedTooltipTimeoutRef = useRef<number | null>(null);
  const recursiveTooltipTimeoutRef = useRef<number | null>(null);

  /* ===== EFFECTS ===== */
  // Cleanup effect
  useEffect(() => {
    return () => {
      [
        divisibleTooltipTimeoutRef,
        keyburnTooltipTimeoutRef,
        lockedTooltipTimeoutRef,
        unlockedTooltipTimeoutRef,
        recursiveTooltipTimeoutRef,
      ].forEach((ref) => {
        if (ref.current) {
          globalThis.clearTimeout(ref.current);
        }
      });
    };
  }, []);

  /* ===== EVENT HANDLERS ===== */
  // Tooltip handlers
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

  /* ===== HELPER FUNCTIONS ===== */
  const handleContent = async () => {
    if (isSrc20Stamp()) {
      // SRC-20 stamps - no file size computation needed
    } else if (isSrc101Stamp()) {
      // SRC-101 stamps - no file size computation needed
    } else if (stamp.stamp_mimetype?.startsWith("image/")) {
      // Handle images
      const src = await getStampImageSrc(stamp);
      if (src) {
        const img = new Image();
        img.onload = () => {
          setImageDimensions({
            width: img.naturalWidth,
            height: img.naturalHeight,
            unit: "px",
          });
        };
        img.src = src;
      }
    } else if (stamp.stamp_mimetype === "text/html") {
      // Handle HTML
      fetch(stamp.stamp_url)
        .then((response) => response.text())
        .then((html) => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");

          const hasViewportMeta = doc.querySelector('meta[name="viewport"]');
          const styleTag = doc.querySelector("style");
          const hasResponsiveUnits = styleTag?.textContent?.includes("vw") ||
            styleTag?.textContent?.includes("vh") ||
            styleTag?.textContent?.includes("%");

          if (hasViewportMeta || hasResponsiveUnits) {
            setImageDimensions({
              width: "responsive",
              height: "responsive",
              unit: "responsive",
            });
          } else {
            // Try to get dimensions from style
            const bodyStyle = doc.body.getAttribute("style");
            const divStyle = doc.querySelector("div")?.getAttribute("style");

            const getDimension = (style: string | null | undefined) => {
              if (!style) return null;
              const widthMatch = style.match(/width:\s*(\d+)(px|rem|em)/);
              const heightMatch = style.match(/height:\s*(\d+)(px|rem|em)/);
              return {
                width: widthMatch ? Number(widthMatch[1]) : null,
                height: heightMatch ? Number(heightMatch[1]) : null,
                unit: (widthMatch && widthMatch[2]) ||
                  (heightMatch && heightMatch[2]) || "px",
              };
            };

            const bodyDims = getDimension(bodyStyle);
            const divDims = getDimension(divStyle);
            const dims = bodyDims || divDims;

            if (dims && dims.width && dims.height) {
              setImageDimensions({
                width: dims.width,
                height: dims.height,
                unit: dims.unit,
              });
            } else {
              setImageDimensions({
                width: "responsive",
                height: "responsive",
                unit: "responsive",
              });
            }
          }
        })
        .catch((error) => {
          console.error("Failed to fetch HTML content:", error);
          setImageDimensions(null);
        });
    } else if (
      stamp.stamp_mimetype?.startsWith("video/mpeg") ||
      stamp.stamp_mimetype?.startsWith("audio/mpeg") ||
      fileExtension === "MP3" ||
      fileExtension === "MP4" ||
      fileExtension === "MPEG"
    ) {
      // Handle MPEG files - no file size computation needed
    } else if (stamp.stamp_mimetype === "text/plain") {
      // Handle plain text files - no file size computation needed
    } else if (
      stamp.stamp_mimetype === "text/javascript" ||
      stamp.stamp_mimetype === "application/javascript"
    ) {
      // Handle JS stamps - no file size computation needed
    } else if (stamp.stamp_mimetype === "application/gzip") {
      // Handle GZIP stamps - no file size computation needed
    } else if (fileExtension === "BMN") {
      // Handle BMN files - no file size computation needed
    } else if (!stamp?.stamp_mimetype && fileExtension !== "BMN") {
      console.log("Missing stamp_mimetype and not BMN:", {
        stamp_mimetype: stamp?.stamp_mimetype,
        stamp_url: stamp?.stamp_url,
      });
      return;
    }
  };

  useEffect(() => {
    handleContent();
  }, [stamp.stamp_mimetype, stamp.stamp_url, fileExtension]);

  /* ===== UTILITY FUNCTIONS ===== */
  // Format dimensions display
  const getDimensionsDisplay = (dims: DimensionsType | null) => {
    if (stamp.stamp_mimetype === "text/plain") {
      return "FIXED";
    }
    if (!dims) return "N/A";
    if (dims.unit === "responsive") return "RESPONSIVE";
    return `${dims.width} x ${dims.height} ${dims.unit.toUpperCase()}`;
  };

  /* ===== STATE ===== */
  // Add this state for HTML title
  const [htmlStampTitle, setHtmlStampTitle] = useState<string | null>(null);

  // Add this effect to extract HTML title
  useEffect(() => {
    if (stamp.stamp_mimetype === "text/html" && stamp.stamp_url) {
      fetch(stamp.stamp_url)
        .then((response) => response.text())
        .then((html) => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const title = doc.querySelector("title")?.textContent?.trim();
          if (title) {
            setHtmlStampTitle(title);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch HTML title:", error);
        });
    }
  }, [stamp.stamp_mimetype, stamp.stamp_url]);

  // Helper function to check if it's a POSH stamp (move near top of component)
  const isPoshStamp = (cpid: string) => {
    return !cpid?.startsWith("A");
  };

  const titleRef = useRef<HTMLParagraphElement>(null);
  const [scale, setScale] = useState(1);

  const updateScale = () => {
    if (titleRef.current) {
      const container = titleRef.current.parentElement;
      if (container) {
        const containerWidth = container.clientWidth;

        // Set initial content to 50% to allow scaling up
        titleRef.current.style.width = "50%";
        const contentWidth = titleRef.current.scrollWidth;

        // Calculate base scale and limit to original size
        const baseScale = containerWidth / contentWidth;
        const maxScale = Math.min(baseScale, 1);
        setScale(maxScale);

        // Reset width to allow proper scaling
        titleRef.current.style.width = "";
      }
    }
  };

  useEffect(() => {
    updateScale();
    globalThis.addEventListener("resize", updateScale);
    return () => globalThis.removeEventListener("resize", updateScale);
  }, []);

  // Add another effect to recalculate when stamp data changes
  useEffect(() => {
    updateScale();
  }, [stamp.cpid, stamp.stamp, htmlStampTitle]);

  const [src101, setSrc101] = useState<Src101Detail>();
  const [showListings, setShowListings] = useState(false);
  const [dispensers, setDispensers] = useState<any[]>([]);
  const [isLoadingDispensers, setIsLoadingDispensers] = useState(false);
  const fetchDispensers = async (page: number) => {
    if (isLoadingDispensers) return;
    setIsLoadingDispensers(true);
    try {
      const encodedCpid = encodeURIComponent(stamp.cpid);
      const params = new URLSearchParams({
        limit: "20",
        sort: "DESC",
        page: page.toString(),
      });

      const response = await fetch(
        `/api/v2/stamps/${encodedCpid}/dispensers?${params}`,
      );

      if (!response.ok) {
        // 404 is expected when no dispensers exist - don't throw for this case
        if (response.status === 404) {
          setDispensers([]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Simply filter for open status dispensers only
      const openDispensers = data.data.filter((d: any) => d.status === "open");

      setDispensers(openDispensers);
    } catch (error: any) {
      // Log all other errors (non-404)
      console.error("Error fetching dispensers:", error);
      setDispensers([]);
    } finally {
      setIsLoadingDispensers(false);
    }
  };

  const fetchSRC101 = async () => {
    try {
      const res = await getSRC101Data(stamp as StampRow);
      setSrc101(res as Src101Detail);
    } catch (error: any) {
      console.log("Fetch SRC101 Error====>", error.message);
      setSrc101({} as Src101Detail);
    }
  };

  // Fetch dispensers when expanded
  useEffect(() => {
    fetchDispensers(1);
    fetchSRC101();
  }, []);

  // Add state for selected dispenser
  const [selectedDispenser, setSelectedDispenser] = useState<Dispenser | null>(
    null,
  );

  // v2.3 API: Use marketData for pricing (preferred) with legacy fallback
  const stampWithMarketData = stamp as any;
  const marketData = stampWithMarketData?.marketData;

  // Calculate BTC price from v2.3 marketData or legacy fields
  const floorPriceBTC = marketData?.floorPriceBTC ??
    (stamp.floorPrice && stamp.floorPrice !== "priceless"
      ? stamp.floorPrice
      : null);
  const floorPriceUSD = marketData
    // For v2.3: calculate from marketData if available
    ? (marketData.floorPriceBTC && marketData.volume24hBTC
      ? marketData.floorPriceBTC * 117888
      : null)
    // Legacy fallback
    : stamp.floorPriceUSD;

  const btcPrice = floorPriceUSD && floorPriceBTC
    ? floorPriceUSD / floorPriceBTC
    : null;

  // Calculate display price: dispenser price > floor price
  const displayPrice = selectedDispenser
    ? parseInt(selectedDispenser.satoshirate.toString(), 10) / 100000000
    : lowestPriceDispenser
    ? parseInt(lowestPriceDispenser.satoshirate.toString(), 10) / 100000000
    : (floorPriceBTC || 0);

  const displayPriceUSD =
    (selectedDispenser || lowestPriceDispenser) && btcPrice
      ? (parseInt(
        (selectedDispenser || lowestPriceDispenser).satoshirate.toString(),
        10,
      ) / 100000000) *
        btcPrice
      : floorPriceUSD;

  // Debug effects for development only
  useEffect(() => {
    if (globalThis.location?.hostname === "localhost") {
      console.log("Price update:", {
        selectedDispenser,
        satoshirate: selectedDispenser?.satoshirate,
        displayPrice,
        displayPriceUSD,
        btcPrice,
      });
    }
  }, [selectedDispenser, btcPrice]);

  useEffect(() => {
    if (globalThis.location?.hostname === "localhost") {
      console.log("Price calculation values:", {
        selectedDispenser,
        satoshirate: selectedDispenser?.satoshirate,
        floorPrice: stamp.floorPrice,
        btcPrice,
        calculatedDisplayPrice: displayPrice,
        calculatedDisplayPriceUSD: displayPriceUSD,
      });
    }
  }, [selectedDispenser, btcPrice, stamp.floorPrice]);

  // Add handler for dispenser selection
  const handleDispenserSelect = (dispenser: Dispenser) => {
    const updatedDispenser = {
      ...dispenser,
      satoshirate: parseInt(dispenser.satoshirate.toString(), 10),
    };
    setSelectedDispenser(updatedDispenser);
  };

  // Development-only logging for initial checks
  const hasMultipleDispensers = dispensers?.length >= 2;
  if (globalThis.location?.hostname === "localhost") {
    console.log("Initial checks:", {
      dispensersLength: dispensers?.length,
      hasMultipleDispensers,
      showListings,
      hasFloorPrice: !!stamp.floorPrice,
      dispensers: dispensers,
    });
  }

  // Development-only useEffect to track dispensers state
  useEffect(() => {
    if (globalThis.location?.hostname === "localhost") {
      console.log("Dispensers state changed:", {
        dispensersLength: dispensers?.length,
        hasDispensers: dispensers?.length > 0,
        hasMultiple: dispensers?.length >= 2,
        rawDispensers: dispensers,
        floorPrice: stamp.floorPrice,
      });
    }
  }, [dispensers]);

  // Add new state for media duration
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);

  // Modify the format duration helper
  const formatDuration = (seconds: number): string => {
    // Less than 10 seconds - show milliseconds
    if (seconds < 10) {
      const milliseconds = Math.floor(seconds * 1000);
      return `${milliseconds} MS`;
    }

    // 10-59 seconds - show seconds
    if (seconds < 60) {
      return `${Math.floor(seconds)} SECONDS`;
    }

    // 60+ seconds - show MM:SS format
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Modify the useEffect to include duration fetching for media files
  useEffect(() => {
    if (
      stamp.stamp_mimetype?.startsWith("video/mpeg") ||
      stamp.stamp_mimetype?.startsWith("audio/mpeg") ||
      fileExtension === "MP3" ||
      fileExtension === "MP4" ||
      fileExtension === "MPEG"
    ) {
      const media = fileExtension === "MP3"
        ? new Audio()
        : document.createElement("video");
      media.src = stamp.stamp_url;

      media.onloadedmetadata = () => {
        setMediaDuration(media.duration);
      };

      media.onerror = () => {
        console.error("Failed to load media duration");
        setMediaDuration(null);
      };
    }
  }, [stamp.stamp_url, stamp.stamp_mimetype, fileExtension]);

  const isMediaFile = ["MP3", "MP4", "MPEG"].includes(fileExtension);

  const isSrc20Stamp = () => {
    return stamp.ident === "SRC-20";
  };

  const isSrc101Stamp = () => {
    return stamp.ident === "SRC-101";
  };

  // Effect to handle document title updates
  useEffect(() => {
    document.title = `Bitcoin Stamp #${stamp.stamp} - stampchain.io`;
    return () => {
      document.title = "stampchain.io";
    };
  }, [stamp.stamp]);

  /* ===== RENDER ===== */
  return (
    <>
      <div className={`${body} ${containerGap}`}>
        <div
          className={containerBackground}
        >
          <div>
            <h2
              ref={titleRef}
              className={`${titleNeutral} overflow-hidden`}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "left",
                width: `${(100 / scale)}%`,
                marginTop: `${-0.2 * (1 / scale - 1)}em`,
                marginBottom: `${-0.26 * (1 / scale - 1)}em`,
              }}
            >
              {isSrc101Stamp() && src101
                ? (
                  <span className="font-light">
                    {src101?.tokenid?.length && atob(src101?.tokenid[0])}
                  </span>
                )
                : isSrc20Stamp()
                ? (
                  <>
                    <span className="font-light">#</span>
                    <span className="font-black">{stamp.stamp}</span>
                  </>
                )
                : (isPoshStamp(stamp.cpid) ||
                    (htmlStampTitle && stamp.stamp_mimetype === "text/html"))
                ? (
                  <span className="font-black uppercase text-ellipsis overflow-hidden">
                    {isPoshStamp(stamp.cpid) ? stamp.cpid : htmlStampTitle}
                  </span>
                )
                : (
                  <>
                    <span className="font-light">#</span>
                    <span className="font-black">{stamp.stamp}</span>
                  </>
                )}
            </h2>

            {isSrc20Stamp() && stamp.cpid && (
              <h6 className={`${valueDark} -mt-1 pb-1 block`}>
                {stamp.cpid}
              </h6>
            )}

            <h5 className="-mt-1.5 font-light text-xl text-color-grey block">
              {(!isSrc20Stamp() && (isPoshStamp(stamp.cpid) ||
                (htmlStampTitle && stamp.stamp_mimetype === "text/html"))) && (
                <>
                  #{stamp.stamp}
                </>
              )}
            </h5>

            {(!isPoshStamp(stamp.cpid) && stamp.cpid) && (
              <h6 className={`${valueDark} block`}>
                {stamp.cpid}
              </h6>
            )}

            <div className="flex flex-col items-start pt-3">
              <h6 className={labelSm}>ARTIST</h6>
              <a
                className={headingGreyDLLink}
                href={`/wallet/${stamp.creator}`}
                target="_parent"
              >
                {creatorDisplay}
              </a>
            </div>
          </div>

          {(dispensers?.length > 0 || !!lowestPriceDispenser)
            ? (
              <div className="flex flex-col w-full pt-6 mobileLg:pt-12">
                <div
                  className={`flex w-full gap-6 mb-2 items-end ${
                    dispensers?.length >= 2 ? "justify-between" : "justify-end"
                  }`}
                >
                  {dispensers?.length >= 2 && (
                    <Icon
                      type="iconButton"
                      name="dispenserListings"
                      weight="normal"
                      size="mdR"
                      color="greyLight"
                      ariaLabel="Listings"
                      onClick={() => setShowListings(!showListings)}
                      className="pb-0.5"
                    />
                  )}

                  <div className="text-right">
                    {displayPriceUSD && (
                      <h6 className={labelSm}>
                        {displayPriceUSD.toLocaleString("en-US", {
                          maximumFractionDigits: 2,
                        })} <span className="font-light">USD</span>
                      </h6>
                    )}
                    <h6 className={value2xl}>
                      {formatBTCAmount(
                        typeof displayPrice === "number" ? displayPrice : 0,
                        {
                          excludeSuffix: true,
                          decimals: 8,
                          stripZeros: true,
                        },
                      )} <span className="font-extralight">BTC</span>
                    </h6>
                  </div>
                </div>

                {(dispensers?.length >= 2)
                  ? (
                    <div
                      className={`overflow-hidden transition-all duration-500 ease-in-out
                      ${
                        showListings
                          ? "max-h-[244px] mt-1 mb-3 opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="w-full mb-4">
                        {isLoadingDispensers
                          ? <h6>LOADING</h6>
                          : (
                            <StampListingsOpenTable
                              dispensers={dispensers}
                              floorPrice={floorPriceBTC || 0}
                              onSelectDispenser={handleDispenserSelect}
                              selectedDispenser={selectedDispenser}
                            />
                          )}
                      </div>
                    </div>
                  )
                  : null}

                <div className="flex justify-end">
                  <Button
                    variant="flat"
                    color="grey"
                    size="mdR"
                    onClick={() =>
                      toggleModal(selectedDispenser || lowestPriceDispenser)}
                  >
                    BUY
                  </Button>
                </div>
              </div>
            )
            : null}
        </div>

        <div className={containerBackground}>
          {!isSrc20Stamp() && (
            <div className="flex flex-col pb-3">
              <h6 className={labelSm}>{editionLabel}</h6>
              <h6 className={value3xl}>{editionCount}</h6>
            </div>
          )}

          <div className="flex flex-row">
            <div className={`${containerColData} flex-1 items-start`}>
              <h6 className={labelSm}>TYPE</h6>
              <h6 className={valueSm}>
                {isSrc20Stamp()
                  ? "SRC-20"
                  : isSrc101Stamp()
                  ? "SRC-101"
                  : fileExtension}
              </h6>
            </div>
            <div className={`${containerColData} flex-1 items-center`}>
              <h6 className={labelSm}>
                {(isSrc20Stamp() || isSrc101Stamp())
                  ? "TRANSACTION"
                  : isMediaFile
                  ? "DURATION"
                  : "DIMENSIONS"}
              </h6>
              <h6 className={valueSm}>
                {isSrc20Stamp()
                  ? stamp.stamp_base64 &&
                      JSON.parse(atob(stamp.stamp_base64))?.op === "DEPLOY"
                    ? "DEPLOY"
                    : stamp.stamp_base64 &&
                        JSON.parse(atob(stamp.stamp_base64))?.op === "MINT"
                    ? "MINT"
                    : "TRANSFER"
                  : isMediaFile
                  ? (mediaDuration ? formatDuration(mediaDuration) : "-")
                  : isSrc101Stamp()
                  ? stamp.stamp_base64 &&
                      JSON.parse(atob(stamp.stamp_base64))?.op === "DEPLOY"
                    ? "SALE"
                    : stamp.stamp_base64 &&
                        JSON.parse(atob(stamp.stamp_base64))?.op === "MINT"
                    ? "REGISTER"
                    : "TRANSFER"
                  : getDimensionsDisplay(imageDimensions)}
              </h6>
            </div>
            <div className="flex flex-1 justify-end items-end pb-1 space-x-[9px]">
              {stamp.ident === "SRC-721" && (
                <div
                  className="relative group"
                  onMouseEnter={handleRecursiveMouseEnter}
                  onMouseLeave={handleRecursiveMouseLeave}
                >
                  <Icon
                    type="icon"
                    name="recursive"
                    weight="normal"
                    size="xs"
                    color="greyDark"
                    ariaLabel="Recursive"
                  />
                  <div
                    className={`${tooltipIcon} ${
                      isRecursiveTooltipVisible ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    RECURSIVE
                  </div>
                </div>
              )}
              {stamp.divisible == true && (
                <div
                  className="relative group"
                  onMouseEnter={handleDivisibleMouseEnter}
                  onMouseLeave={handleDivisibleMouseLeave}
                >
                  <Icon
                    type="icon"
                    name="divisible"
                    weight="normal"
                    size="xs"
                    color="greyDark"
                    ariaLabel="Divisible"
                  />
                  <div
                    className={`${tooltipIcon} ${
                      isDivisibleTooltipVisible ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    DIVISIBLE
                  </div>
                </div>
              )}
              {stamp.keyburn != null && (
                <div
                  className="relative group"
                  onMouseEnter={handleKeyburnMouseEnter}
                  onMouseLeave={handleKeyburnMouseLeave}
                >
                  <Icon
                    type="icon"
                    name="keyburned"
                    weight="normal"
                    size="xs"
                    color="greyDark"
                    ariaLabel="Keyburned"
                  />
                  <div
                    className={`${tooltipIcon} ${
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
                    className="relative group"
                    onMouseEnter={handleLockedMouseEnter}
                    onMouseLeave={handleLockedMouseLeave}
                  >
                    <Icon
                      type="icon"
                      name="locked"
                      weight="normal"
                      size="xs"
                      color="greyDark"
                      ariaLabel="Locked"
                    />
                    <div
                      className={`${tooltipIcon} ${
                        isLockedTooltipVisible ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      LOCKED
                    </div>
                  </div>
                )
                : (
                  <div
                    className="relative group"
                    onMouseEnter={handleUnlockedMouseEnter}
                    onMouseLeave={handleUnlockedMouseLeave}
                  >
                    <Icon
                      type="icon"
                      name="unlocked"
                      weight="normal"
                      size="xs"
                      color="greyDark"
                      ariaLabel="Unlocked"
                    />
                    <div
                      className={`${tooltipIcon} ${
                        isUnlockedTooltipVisible ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      UNLOCKED
                    </div>
                  </div>
                )}
            </div>
          </div>

          <div className="flex flex-row pt-3">
            <div className={`${containerColData} flex-1 items-start`}>
              <h6 className={labelSm}>SIZE</h6>
              <h6 className={valueSm}>
                {stamp.file_size_bytes !== null
                  ? formatFileSize(
                    stamp.file_size_bytes,
                    stamp.stamp_mimetype === "text/plain",
                  )
                  : "N/A"}
              </h6>
            </div>
            <div className={`${containerColData} flex-1 items-center`}>
              <h6 className={labelSm}>
                {isSrc20Stamp() ? "SENT" : "CREATED"}
              </h6>
              <h6 className={valueSm}>
                {createdDate}
              </h6>
            </div>
            {/* @baba - fix logic handling for no tx hash */}
            <div className={`${containerColData} flex-1 items-end`}>
              <h6 className={labelSm}>TX HASH</h6>
              <a
                href={`https://www.blockchain.com/explorer/transactions/btc/${stamp.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${valueSm} hover:text-color-grey transition-colors duration-300`}
              >
                {stamp.tx_hash !== null
                  ? abbreviateAddress(stamp.tx_hash, 4)
                  : "N/A"}
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
