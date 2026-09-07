/* ===== STAMP INFO COMPONENT ===== */
import { Button } from "$button";
import { Icon, UserProfileIcon } from "$icon";
import BuyStampModal from "$islands/modal/BuyStampModal.tsx";
import { openModal } from "$islands/modal/states.ts";
import {
  container2Icon,
  container3,
  containerPill,
  PillContentCount,
  StatItem,
  StatPrice,
} from "$layout";
import type { Src101Detail } from "$lib/types/src101.d.ts";
import type { StampRow } from "$lib/types/stamp.d.ts";
import {
  abbreviateAddress,
  formatBTCAmount,
  formatDate,
  formatFileSize,
  formatFileType,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import {
  getSRC101Data,
  getStampImageSrc,
} from "$lib/utils/ui/media/imageUtils.ts";
import { tooltipButton, tooltipIcon } from "$notification";
import { Dispenser, StampListingsOpenTable } from "$table";
import {
  cardSupply,
  subtitlePrimary,
  titlePrimary,
  truncate,
  valueDarkLg,
} from "$text";
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TOOLTIP HELPERS ===== */
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

/* ===== TYPES ===== */
interface StampInfoProps {
  stamp: StampRow;
  lowestPriceDispenser: any;
  btcPriceUSD?: number;
  collectionInfo?:
    | {
      collection_id: string;
      collection_name: string;
      collection_description: string;
    }
    | null
    | undefined;
}

interface DimensionsType {
  width: number | string;
  height: number | string;
  unit: string | "responsive";
}

/* ===== COMPONENT ===== */
export function StampInfo(
  { stamp, lowestPriceDispenser, btcPriceUSD, collectionInfo }: StampInfoProps,
) {
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

  /* ===== REFS AND UI STATE ===== */
  const [imageDimensions, setImageDimensions] = useState<DimensionsType | null>(
    null,
  );

  const fileExtension = stamp.stamp_url?.split(".")?.pop()?.toUpperCase() ||
    "UNKNOWN";

  const creatorDisplaySm = stamp.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp.creator, 7);
  const creatorDisplay = stamp.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp.creator, 12);

  /* ===== CPID COPY STATE ===== */
  const [showCpidCopied, setShowCpidCopied] = useState(false);
  const [isCpidTooltipVisible, setIsCpidTooltipVisible] = useState(false);
  const [allowCpidTooltip, setAllowCpidTooltip] = useState(true);
  const cpidCopyButtonRef = useRef<HTMLDivElement>(null);
  const cpidTooltipTimeoutRef = useRef<number | null>(null);

  /* ===== LISTINGS TOOLTIP STATE ===== */
  const [isListingsTooltipVisible, setIsListingsTooltipVisible] = useState(
    false,
  );
  const [allowListingsTooltip, setAllowListingsTooltip] = useState(true);
  const listingsTooltipTimeoutRef = useRef<number | null>(null);

  /* ===== EFFECTS ===== */
  // Cleanup effect
  useEffect(() => {
    return () => {
      [
        cpidTooltipTimeoutRef,
        listingsTooltipTimeoutRef,
      ].forEach((ref) => {
        if (ref.current) {
          globalThis.clearTimeout(ref.current);
        }
      });
    };
  }, []);

  /* ===== CPID COPY HANDLERS ===== */
  const handleCpidCopyMouseEnter = () => {
    if (allowCpidTooltip) {
      if (cpidTooltipTimeoutRef.current) {
        globalThis.clearTimeout(cpidTooltipTimeoutRef.current);
      }

      cpidTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        const buttonRect = cpidCopyButtonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          setIsCpidTooltipVisible(true);
        }
      }, 1500);
    }
  };

  const handleCpidCopyMouseLeave = () => {
    if (cpidTooltipTimeoutRef.current) {
      globalThis.clearTimeout(cpidTooltipTimeoutRef.current);
    }
    setIsCpidTooltipVisible(false);
    setShowCpidCopied(false);
    setAllowCpidTooltip(true);
  };

  const copyCpid = async () => {
    try {
      await navigator.clipboard.writeText(stamp.cpid);
      setShowCpidCopied(true);
      setIsCpidTooltipVisible(false);
      setAllowCpidTooltip(false);

      if (cpidTooltipTimeoutRef.current) {
        globalThis.clearTimeout(cpidTooltipTimeoutRef.current);
      }

      cpidTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setShowCpidCopied(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  /* ===== LISTINGS TOOLTIP HANDLERS ===== */
  const handleListingsMouseEnter = () => {
    if (allowListingsTooltip) {
      if (listingsTooltipTimeoutRef.current) {
        globalThis.clearTimeout(listingsTooltipTimeoutRef.current);
      }
      listingsTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsListingsTooltipVisible(true);
      }, 500);
    }
  };

  const handleListingsMouseLeave = () => {
    if (listingsTooltipTimeoutRef.current) {
      globalThis.clearTimeout(listingsTooltipTimeoutRef.current);
    }
    setIsListingsTooltipVisible(false);
    setAllowListingsTooltip(true);
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

  const getIdentLabel = () => {
    if (stamp.ident === "SRC-20") return "SRC-20";
    if (stamp.ident === "SRC-101") return "SRC-101";
    if (stamp.ident === "SRC-721") return "RECURSIVE";
    if (stamp.ident === "STAMP" && isPoshStamp(stamp.cpid)) return "POSH";
    return "CLASSIC";
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
  const floorPriceUSD = stampWithMarketData?.market_data?.floor_price_usd ??
    stamp.floorPriceUSD ??
    null;

  // Prefer the BTC/USD ratio implied by cached market data; fall back to
  // the live BTC price fetched server-side so USD still renders for stamps
  // without cached market data (e.g. priced purely from a dispenser).
  const btcPrice = floorPriceUSD && floorPriceBTC
    ? floorPriceUSD / floorPriceBTC
    : btcPriceUSD ?? null;

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

  const activityLevel = stamp.activity_level ??
    marketData?.activityLevel ??
    null;

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

  const fileTypeValue = isSrc20Stamp()
    ? "SRC-20"
    : isSrc101Stamp()
    ? "SRC-101"
    : fileExtension === "BMN"
    ? "BMN"
    : formatFileType(stamp.stamp_mimetype);

  const fileSizeValue = stamp.file_size_bytes !== null
    ? formatFileSize(
      stamp.file_size_bytes,
      stamp.stamp_mimetype === "text/plain",
    )
    : "N/A";

  const dimensionsValue = isSrc20Stamp()
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
    : getDimensionsDisplay(imageDimensions);

  const txHashValue = stamp.tx_hash !== null
    ? (
      <a
        href={`https://www.blockchain.com/explorer/transactions/btc/${stamp.tx_hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="link-neutral-400 transition-colors duration-200"
      >
        {abbreviateAddress(stamp.tx_hash, 8)}
      </a>
    )
    : "N/A";

  // Effect to handle document title updates
  useEffect(() => {
    document.title = `Bitcoin Stamp #${stamp.stamp} - stampchain.io`;
    return () => {
      document.title = "stampchain.io";
    };
  }, [stamp.stamp]);

  /* ===== RENDER ===== */
  // `contents` lets the listings table participate in the parent CSS grid
  // (routes/stamp/[id].tsx) as a full-width row beneath image + info.
  // That grows the card by the table height only — `h-full` inside a
  // stretch-sized flex column cannot, so the table used to overflow.
  return (
    <div className="contents">
      <div className="min-w-0 h-full">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2
                ref={titleRef}
                className={`${titlePrimary} overflow-hidden`}
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
                  : isPoshStamp(stamp.cpid)
                  ? (
                    <span className="font-black uppercase text-ellipsis overflow-hidden">
                      {stamp.cpid}
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
                <h6 className={`${subtitlePrimary} -mt-1 pb-1 block`}>
                  {stamp.cpid}
                </h6>
              )}

              {(!isSrc20Stamp() && isPoshStamp(stamp.cpid)) && (
                <h5 className={`${subtitlePrimary} -mt-1.5 block`}>
                  #{stamp.stamp}
                </h5>
              )}

              {(!isPoshStamp(stamp.cpid) && stamp.cpid) && (
                <h6 className={`${subtitlePrimary} -mt-1.5 block min-w-0`}>
                  <span className="inline-flex max-w-full flex-row-reverse items-center gap-3 min-w-0">
                    <span
                      ref={cpidCopyButtonRef}
                      className="relative peer -translate-y-[1px] shrink-0"
                      onMouseEnter={handleCpidCopyMouseEnter}
                      onMouseLeave={handleCpidCopyMouseLeave}
                    >
                      <Icon
                        type="iconButton"
                        name="copy"
                        weight="normal"
                        size="xxs"
                        color="neutral500"
                        onClick={copyCpid}
                      />
                      <div
                        className={`${tooltipIcon} ${
                          isCpidTooltipVisible ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        COPY CPID
                      </div>
                      <div
                        className={`${tooltipIcon} ${
                          showCpidCopied ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        CPID COPIED
                      </div>
                    </span>
                    <span
                      className={`${truncate} peer-hover:text-color-hover transition-colors duration-200 min-w-0`}
                    >
                      {stamp.cpid}
                    </span>
                  </span>
                </h6>
              )}

              {(!isSrc20Stamp() && !isPoshStamp(stamp.cpid) && htmlStampTitle &&
                stamp.stamp_mimetype === "text/html") && (
                <h6 className={`${valueDarkLg} -mt-2 mb-1 block`}>
                  {htmlStampTitle}
                </h6>
              )}

              <UserProfileIcon
                size="xs"
                weight="bold"
                className="stroke-color-neutral-200 translate-y-0.5"
                wrapperClassName="mt-1"
                link
                href={stamp.creator ? `/wallet/${stamp.creator}` : undefined}
              >
                <span className="font-normal text-sm text-color-neutral-200 link-neutral-200 group-hover:text-color-hover transition-colors duration-200">
                  <span className="min-[420px]:hidden">{creatorDisplaySm}</span>
                  <span className="hidden min-[420px]:inline">
                    {creatorDisplay}
                  </span>
                </span>
              </UserProfileIcon>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <PillWithTooltip label="STAMP TYPE" className="w-fit">
                <PillContentCount
                  value={getIdentLabel()}
                  class="!static !text-color-neutral-500"
                />
              </PillWithTooltip>

              {!isSrc20Stamp() && (
                <PillWithTooltip
                  label={stamp.supply === 1 ? "EDITION" : "EDITIONS"}
                  className={`${containerPill} ${cardSupply} !text-sm w-fit`}
                >
                  {stamp.supply === 1 ? "1/1" : editionCount}
                </PillWithTooltip>
              )}

              <div className="flex items-center space-x-2">
                {stamp.ident === "SRC-721" && (
                  <IconWithTooltip label="RECURSIVE">
                    <Icon
                      type="icon"
                      name="recursive"
                      weight="normal"
                      size="xs"
                      color="neutral600"
                      ariaLabel="Recursive"
                    />
                  </IconWithTooltip>
                )}
                {stamp.divisible == true && (
                  <IconWithTooltip label="DIVISIBLE">
                    <Icon
                      type="icon"
                      name="divisible"
                      weight="normal"
                      size="xs"
                      color="neutral600"
                      ariaLabel="Divisible"
                    />
                  </IconWithTooltip>
                )}
                {Boolean(stamp.keyburn) && (
                  <IconWithTooltip label="KEYBURNED">
                    <Icon
                      type="icon"
                      name="keyburned"
                      weight="normal"
                      size="xs"
                      color="neutral600"
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
                        weight="normal"
                        size="xs"
                        color="neutral600"
                        ariaLabel="Locked"
                      />
                    </IconWithTooltip>
                  )
                  : (
                    <IconWithTooltip label="UNLOCKED">
                      <Icon
                        type="icon"
                        name="unlocked"
                        weight="normal"
                        size="xs"
                        color="neutral600"
                        ariaLabel="Unlocked"
                      />
                    </IconWithTooltip>
                  )}
              </div>
            </div>
          </div>

          <div className="w-full min-w-0">
            {collectionInfo?.collection_name &&
              collectionInfo.collection_name.toLowerCase() !== "posh" && (
              <div className="w-fit">
                <PillWithTooltip
                  label="COLLECTION"
                  className={`flex items-center gap-1.5 w-fit mt-4 px-3 py-1 ${container3} group`}
                >
                  <a
                    href={`/collection/${
                      encodeURIComponent(collectionInfo.collection_name)
                    }`}
                    class="flex items-center gap-1.5"
                  >
                    <Icon
                      type="icon"
                      name="artStamps"
                      weight="normal"
                      size="xxs"
                      color="custom"
                      className="stroke-color-neutral-500  group-hover:stroke-color-hover transition-colors duration-200"
                      ariaLabel="Collection"
                    />
                    <span className="font-normal text-xs text-color-neutral-500 group-hover:text-color-hover transition-colors duration-200">
                      {collectionInfo.collection_name}
                    </span>
                  </a>
                </PillWithTooltip>
              </div>
            )}
          </div>

          <div className="flex flex-col mobileMd:flex-row mobileMd:justify-between mobileMd:items-end gap-3 mt-auto -mb-1.5">
            {(dispensers?.length > 0 || !!lowestPriceDispenser)
              ? (
                <>
                  <hr className="w-full mt-12 mb-0.5 border-color-neutral-800 border-t-1 mobileMd:hidden" />
                  <div
                    className={`flex flex-col w-full mobileMd:w-[310px] mobileMd:shrink-0 mobileMd:mt-16 tablet:mt-16 gap-1`}
                  >
                    <div className="flex justify-between mobileMd:flex-wrap w-full gap-5">
                      <StatItem
                        label="FILE TYPE"
                        value={fileTypeValue}
                        align="left"
                      />
                      <StatItem
                        label="FILE SIZE"
                        value={fileSizeValue}
                        align="center"
                      />
                      <StatItem
                        label="DIMENSIONS"
                        value={dimensionsValue}
                        align="right"
                        valueClass="!text-color-neutral-400"
                      />
                    </div>

                    <div className="flex justify-between mobileMd:flex-wrap w-full gap-5 mt-2">
                      <StatItem
                        label="CREATED"
                        value={createdDate}
                        valueClass="!text-color-neutral-400"
                      />
                      <StatItem
                        label="TX HASH"
                        value={txHashValue}
                        align="right"
                      />
                    </div>
                  </div>
                </>
              )
              : (
                <div className="flex flex-col w-full mt-16 tablet:mt-0 gap-1">
                  <hr className="w-full mb-3 border-color-neutral-800 border-t-1" />
                  <div className="flex flex-col gap-1 mobileMd:hidden min-[900px]:flex min-[900px]:flex-col tablet:hidden">
                    <div className="flex justify-between w-full gap-5">
                      <StatItem
                        label="FILE TYPE"
                        value={fileTypeValue}
                        align="left"
                      />
                      <StatItem
                        label="FILE SIZE"
                        value={fileSizeValue}
                        align="center"
                      />
                      <StatItem
                        label="DIMENSIONS"
                        value={dimensionsValue}
                        align="right"
                        valueClass="!text-color-neutral-400"
                      />
                    </div>

                    <div className="flex justify-between w-full gap-5 mt-2">
                      <StatItem
                        label="CREATED"
                        value={createdDate}
                        valueClass="!text-color-neutral-400"
                      />
                      <StatItem
                        label="TX HASH"
                        value={txHashValue}
                        align="right"
                      />
                    </div>
                  </div>

                  <div className="hidden mobileMd:flex min-[900px]:hidden tablet:flex justify-between w-full gap-5">
                    <StatItem
                      label="FILE TYPE"
                      value={fileTypeValue}
                      align="left"
                    />
                    <StatItem
                      label="FILE SIZE"
                      value={fileSizeValue}
                      align="center"
                    />
                    <StatItem
                      label="DIMENSIONS"
                      value={dimensionsValue}
                      align="center"
                      valueClass="!text-color-neutral-400"
                    />
                    <StatItem
                      label="CREATED"
                      value={createdDate}
                      align="center"
                      valueClass="!text-color-neutral-400"
                    />
                    <StatItem
                      label="TX HASH"
                      value={txHashValue}
                      align="right"
                    />
                  </div>
                </div>
              )}

            {(dispensers?.length > 0 || !!lowestPriceDispenser)
              ? (
                <div className="flex flex-col w-full mobileMd:min-w-0 mobileMd:flex-1">
                  <hr className="w-full mt-0.5 mb-12 border-color-neutral-800 border-t-1 mobileMd:hidden" />
                  <div className="flex flex-row mobileMd:flex-col justify-between mobileMd:justify-end items-end gap-3 min-w-0">
                    <div
                      className={`flex flex-col items-start tablet:items-end w-fit px-3 py-2.5 ${container3}`}
                    >
                      <StatPrice
                        priceBTC={formatBTCAmount(
                          typeof displayPrice === "number" ? displayPrice : 0,
                          {
                            excludeSuffix: true,
                            decimals: 8,
                            stripZeros: false,
                          },
                        )}
                        priceUSD={displayPriceUSD != null
                          ? displayPriceUSD.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                          : null}
                        activityLevel={activityLevel}
                        align="right"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-5">
                      {dispensers?.length >= 2 && (
                        <div
                          class={container2Icon}
                          onMouseEnter={handleListingsMouseEnter}
                          onMouseLeave={handleListingsMouseLeave}
                        >
                          <Icon
                            type="iconButton"
                            name="listings"
                            weight="bold"
                            size="xxsR"
                            color="custom"
                            className="stroke-color-orange-400 group-hover:stroke-color-hover transition-colors duration-200"
                            ariaLabel="Listings"
                            onClick={() => {
                              setShowListings(!showListings);
                              setIsListingsTooltipVisible(false);
                              setAllowListingsTooltip(false);
                            }}
                          />
                          <div
                            className={`${tooltipIcon} pointer-events-none ${
                              isListingsTooltipVisible
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          >
                            LISTINGS
                          </div>
                        </div>
                      )}

                      <Button
                        variant="flat"
                        color="primary"
                        size="smR"
                        onClick={() =>
                          toggleModal(
                            selectedDispenser || lowestPriceDispenser,
                          )}
                      >
                        BUY
                      </Button>
                    </div>
                  </div>
                </div>
              )
              : null}
          </div>
        </div>
      </div>

      {(dispensers?.length >= 2)
        ? (
          <div
            className={`col-span-full overflow-hidden transition-all duration-500 ease-in-out
                      ${
              showListings
                ? "max-h-[222px] mt-5 opacity-100"
                : "max-h-0 mt-0 opacity-0"
            }`}
          >
            {isLoadingDispensers ? <h6>LOADING</h6> : (
              <StampListingsOpenTable
                dispensers={dispensers}
                onSelectDispenser={handleDispenserSelect}
                selectedDispenser={selectedDispenser}
              />
            )}
          </div>
        )
        : null}
    </div>
  );
}
