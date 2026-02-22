/* ===== STAMP IMAGE COMPONENT ===== */
/* @baba-update audio icon size (custom) - 780*/

import { Icon, LoadingIcon, PlaceholderImage } from "$icon";
import TextContentIsland from "$islands/content/stampDetailContent/StampTextContent.tsx";
import PreviewCodeModal from "$islands/modal/PreviewCodeModal.tsx";
import PreviewImageModal from "$islands/modal/PreviewImageModal.tsx";
import { openModal } from "$islands/modal/states.ts";
import {
  body,
  containerDetailImage,
  containerGap,
  glassmorphism,
} from "$layout";
import {
  getStampImageSrc,
  handleImageError,
} from "$lib/utils/ui/media/imageUtils.ts";
import { tooltipIcon } from "$notification";
import type { StampRow } from "$types/stamp.d.ts";
import { VNode } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== RIGHT PANEL SUBCOMPONENT ===== */
function RightPanel(
  { stamp, toggleCodeModal, toggleFullScreenModal, showCodeButton }: {
    stamp?: StampRow;
    toggleCodeModal: () => void;
    toggleFullScreenModal: () => void;
    showCodeButton: boolean;
  },
) {
  /* ===== STATE & REFS ===== */
  const [showCopied, setShowCopied] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [allowTooltip, setAllowTooltip] = useState(true);
  const copyButtonRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);

  const [isXTooltipVisible, setIsXTooltipVisible] = useState(false);
  const [allowXTooltip, setAllowXTooltip] = useState(true);
  const xButtonRef = useRef<HTMLDivElement>(null);
  const xTooltipTimeoutRef = useRef<number | null>(null);

  const [isShareTooltipVisible, setIsShareTooltipVisible] = useState(false);
  const [allowShareTooltip, setAllowShareTooltip] = useState(true);
  const shareButtonRef = useRef<HTMLDivElement>(null);
  const shareTooltipTimeoutRef = useRef<number | null>(null);

  // Add new state and refs for code tooltip
  const [isCodeTooltipVisible, setIsCodeTooltipVisible] = useState(false);
  const [allowCodeTooltip, setAllowCodeTooltip] = useState(true);
  const codeButtonRef = useRef<HTMLDivElement>(null);
  const codeTooltipTimeoutRef = useRef<number | null>(null);

  const [isFullscreenTooltipVisible, setIsFullscreenTooltipVisible] = useState(
    false,
  );
  const [allowFullscreenTooltip, setAllowFullscreenTooltip] = useState(true);
  const fullscreenButtonRef = useRef<HTMLDivElement>(null);
  const fullscreenTooltipTimeoutRef = useRef<number | null>(null);

  const [isToolsTooltipVisible, setIsToolsTooltipVisible] = useState(false);
  const toolsTooltipTimeoutRef = useRef<number | null>(null);

  /* ===== EFFECTS ===== */
  useEffect(() => {
    return () => {
      if (xTooltipTimeoutRef.current) {
        globalThis.clearTimeout(xTooltipTimeoutRef.current);
      }
      if (shareTooltipTimeoutRef.current) {
        globalThis.clearTimeout(shareTooltipTimeoutRef.current);
      }
      if (codeTooltipTimeoutRef.current) {
        globalThis.clearTimeout(codeTooltipTimeoutRef.current);
      }
      if (fullscreenTooltipTimeoutRef.current) {
        globalThis.clearTimeout(fullscreenTooltipTimeoutRef.current);
      }
    };
  }, []);

  // Early return if stamp is undefined
  if (!stamp) {
    return null;
  }

  /* ===== SHARING CONFIGURATION ===== */
  const url = `https://stampchain.io/stamp/${stamp.stamp}`;
  const text = "Check out what I found @Stampchain";

  const shareContent = async () => {
    const shareData = {
      title: text,
      text: text,
      url: url,
    };

    try {
      setIsShareTooltipVisible(false);
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        alert("Sharing is not supported in your browser.");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  /* ===== EVENT HANDLERS ===== */
  const handleXMouseEnter = () => {
    if (allowXTooltip) {
      if (xTooltipTimeoutRef.current) {
        globalThis.clearTimeout(xTooltipTimeoutRef.current);
      }

      xTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        const buttonRect = xButtonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          setIsXTooltipVisible(true);
        }
      }, 1500);
    }
  };

  const handleXMouseLeave = () => {
    if (xTooltipTimeoutRef.current) {
      globalThis.clearTimeout(xTooltipTimeoutRef.current);
    }
    setIsXTooltipVisible(false);
    setAllowXTooltip(true);
  };

  const handleCopyMouseEnter = () => {
    if (allowTooltip) {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }

      tooltipTimeoutRef.current = globalThis.setTimeout(() => {
        const buttonRect = copyButtonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          setIsTooltipVisible(true);
        }
      }, 1500);
    }
  };

  const handleCopyMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setIsTooltipVisible(false);
    setShowCopied(false);
    setAllowTooltip(true);
  };

  const shareToX = () => {
    const xShareUrl = `https://x.com/intent/post?text=${
      encodeURIComponent(text)
    }&url=${encodeURIComponent(url)}`;
    setIsXTooltipVisible(false);
    globalThis.open(xShareUrl, "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setShowCopied(true);
      setIsTooltipVisible(false);
      setAllowTooltip(false);

      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }

      tooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setShowCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };

  const handleShareMouseEnter = () => {
    if (allowShareTooltip) {
      if (shareTooltipTimeoutRef.current) {
        globalThis.clearTimeout(shareTooltipTimeoutRef.current);
      }

      shareTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        const buttonRect = shareButtonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          setIsShareTooltipVisible(true);
        }
      }, 1500);
    }
  };

  const handleShareMouseLeave = () => {
    if (shareTooltipTimeoutRef.current) {
      globalThis.clearTimeout(shareTooltipTimeoutRef.current);
    }
    setIsShareTooltipVisible(false);
    setAllowShareTooltip(true);
  };

  // Add handlers for code tooltip
  const handleCodeMouseEnter = () => {
    if (allowCodeTooltip) {
      if (codeTooltipTimeoutRef.current) {
        globalThis.clearTimeout(codeTooltipTimeoutRef.current);
      }

      codeTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        const buttonRect = codeButtonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          setIsCodeTooltipVisible(true);
        }
      }, 1500);
    }
  };

  const handleCodeMouseLeave = () => {
    if (codeTooltipTimeoutRef.current) {
      globalThis.clearTimeout(codeTooltipTimeoutRef.current);
    }
    setIsCodeTooltipVisible(false);
    setAllowCodeTooltip(true);
  };

  // Add handlers for fullscreen tooltip
  const handleFullscreenMouseEnter = () => {
    if (allowFullscreenTooltip) {
      if (fullscreenTooltipTimeoutRef.current) {
        globalThis.clearTimeout(fullscreenTooltipTimeoutRef.current);
      }

      fullscreenTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        const buttonRect = fullscreenButtonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          setIsFullscreenTooltipVisible(true);
        }
      }, 1500);
    }
  };

  const handleFullscreenMouseLeave = () => {
    if (fullscreenTooltipTimeoutRef.current) {
      globalThis.clearTimeout(fullscreenTooltipTimeoutRef.current);
    }
    setIsFullscreenTooltipVisible(false);
    setAllowFullscreenTooltip(true);
  };

  const handleToolsMouseEnter = () => {
    if (toolsTooltipTimeoutRef.current) {
      globalThis.clearTimeout(toolsTooltipTimeoutRef.current);
    }
    toolsTooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setIsToolsTooltipVisible(true);
    }, 1500);
  };

  const handleToolsMouseLeave = () => {
    if (toolsTooltipTimeoutRef.current) {
      globalThis.clearTimeout(toolsTooltipTimeoutRef.current);
    }
    setIsToolsTooltipVisible(false);
  };

  /* ===== RENDER ===== */
  return (
    <div className={`${containerDetailImage} !py-4 px-5 flex justify-between`}>
      <div className="flex gap-5 tablet:gap-3.5">
        <div
          ref={copyButtonRef}
          class="relative"
          onMouseEnter={handleCopyMouseEnter}
          onMouseLeave={handleCopyMouseLeave}
        >
          <Icon
            type="iconButton"
            name="copyLink"
            weight="normal"
            size="custom"
            color="greyLight"
            className="w-[29px] h-[29px] tablet:w-[25px] tablet:h-[25px]"
            onClick={copyLink}
          />
          <div
            class={`${tooltipIcon} ${
              isTooltipVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            COPY LINK
          </div>
          <div
            class={`${tooltipIcon} ${showCopied ? "opacity-100" : "opacity-0"}`}
          >
            LINK COPIED
          </div>
        </div>
        <div
          ref={shareButtonRef}
          class="relative"
          onMouseEnter={handleShareMouseEnter}
          onMouseLeave={handleShareMouseLeave}
        >
          <Icon
            type="iconButton"
            name="share"
            weight="normal"
            size="custom"
            color="greyLight"
            className="w-[29px] h-[29px] tablet:w-[25px] tablet:h-[25px]"
            onClick={shareContent}
            ariaLabel="Share content"
          />
          <div
            class={`${tooltipIcon} ${
              isShareTooltipVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            SHARE
          </div>
        </div>
        <div
          ref={xButtonRef}
          class="relative"
          onMouseEnter={handleXMouseEnter}
          onMouseLeave={handleXMouseLeave}
        >
          <Icon
            type="iconButton"
            name="twitterImage"
            weight="normal"
            size="mdR"
            color="greyLight"
            onClick={shareToX}
            ariaLabel="Share on X"
          />
          <div
            class={`${tooltipIcon} ${
              isXTooltipVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            SHARE ON X
          </div>
        </div>
      </div>
      <div className="flex gap-5 tablet:gap-3.5">
        {showCodeButton && (
          <div
            ref={codeButtonRef}
            class="relative"
            onMouseEnter={handleCodeMouseEnter}
            onMouseLeave={handleCodeMouseLeave}
          >
            <Icon
              type="iconButton"
              name="previewCode"
              weight="normal"
              size="mdR"
              color="greyLight"
              onClick={() => {
                setIsCodeTooltipVisible(false);
                toggleCodeModal();
              }}
              ariaLabel="View html code"
            />
            <div
              class={`${tooltipIcon} ${
                isCodeTooltipVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              VIEW CODE
            </div>
          </div>
        )}
        <div
          class="relative"
          onMouseEnter={handleToolsMouseEnter}
          onMouseLeave={handleToolsMouseLeave}
        >
          <Icon
            type="iconButton"
            name="previewImageRaw"
            weight="normal"
            size="mdR"
            color="greyLight"
            onClick={() =>
              globalThis.open(
                `/s/${stamp.cpid}`,
                "targetWindow",
                `top=0,left=${
                  globalThis.screen.availWidth - 600
                },width=600,height=600,
                toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no`,
              )}
            ariaLabel="View raw stamp image in external window"
          />
          <div
            class={`${tooltipIcon} ${
              isToolsTooltipVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            VIEW EXTERNALLY
          </div>
        </div>
        <div
          ref={fullscreenButtonRef}
          class="relative"
          onMouseEnter={handleFullscreenMouseEnter}
          onMouseLeave={handleFullscreenMouseLeave}
        >
          <Icon
            type="iconButton"
            name="previewImage"
            weight="normal"
            size="mdR"
            color="greyLight"
            onClick={() => {
              setIsFullscreenTooltipVisible(false);
              toggleFullScreenModal();
            }}
            ariaLabel="View image in fullscreen"
          />
          <div
            class={`${tooltipIcon} ${
              isFullscreenTooltipVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            VIEW FULLSCREEN
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== MAIN STAMP IMAGE COMPONENT ===== */
export function StampImage(
  { stamp, className, flag, containerClassName }: {
    stamp?: StampRow;
    className?: string;
    flag?: boolean;
    containerClassName?: string;
  },
) {
  /* ===== STATE & REFS ===== */
  const [loading, setLoading] = useState<boolean>(true);
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [validatedContent, setValidatedContent] = useState<VNode | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const copyTooltipTimeoutRef = useRef<number | null>(null);
  const shareTooltipTimeoutRef = useRef<number | null>(null);
  const codeTooltipTimeoutRef = useRef<number | null>(null);
  const fullscreenTooltipTimeoutRef = useRef<number | null>(null);
  const xTooltipTimeoutRef = useRef<number | null>(null);

  // No transform needed: the iframe is w-full h-full inside a square container,
  // so it fills the available space naturally without CSS transform.

  const fetchStampImage = () => {
    if (!stamp) return;
    setLoading(true);
    const res = getStampImageSrc(stamp);
    setSrc(res ?? undefined);
    setLoading(false);
  };

  const fetchHtmlContent = async () => {
    if (!stamp) return;

    try {
      // Use the API endpoint to get raw stamp content instead of the rendered webpage
      const response = await fetch(`/api/v2/stamps/${stamp.stamp}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const stampData = await response.json();

      // Decode the base64 stamp content to get the raw HTML with proper UTF-8 handling
      if (stampData.data?.stamp?.stamp_base64) {
        // Properly decode base64 with UTF-8 support for emojis
        const binaryString = atob(stampData.data.stamp.stamp_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decodedContent = new TextDecoder("utf-8").decode(bytes);
        setHtmlContent(decodedContent);
      } else {
        console.log("No stamp_base64 found in API response:", stampData);
        setHtmlContent(null);
      }
    } catch (error) {
      console.error("Failed to fetch HTML content:", error);
      setHtmlContent(null);
    }
  };

  const validateContent = async () => {
    if (!stamp || stamp.stamp_mimetype !== "image/svg+xml" || !src) {
      setIsValidating(false);
      return;
    }

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
          <div
            className="max-w-none object-contain rounded-2xl pixelart stamp-image h-full w-full flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: rewrittenSVG }}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />,
        );
        setLoading(false);
      } else {
        // No external references, use original src
        setValidatedContent(
          <img
            width="100%"
            loading="lazy"
            className="max-w-none object-contain rounded-2xl pixelart stamp-image h-full w-full"
            src={src}
            onLoad={() => setLoading(false)}
            onError={handleImageError}
            alt={`Stamp No. ${stamp.stamp}`}
          />,
        );
      }
    } catch (_error) {
      // Fallback to original src
      setValidatedContent(
        <img
          width="100%"
          loading="lazy"
          className="max-w-none object-contain rounded-2xl pixelart stamp-image h-full w-full"
          src={src}
          onLoad={() => setLoading(false)}
          onError={handleImageError}
          alt={`Stamp No. ${stamp.stamp}`}
        />,
      );
    } finally {
      setIsValidating(false);
    }
  };

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

  useEffect(() => {
    fetchStampImage();
  }, []);

  useEffect(() => {
    const isHtml = stamp?.stamp_mimetype === "text/html";
    if (isHtml) {
      fetchHtmlContent();
    }
  }, [stamp]);

  useEffect(() => {
    validateContent();
  }, [stamp, src]);

  useEffect(() => {
    return () => {
      const timeoutRefs = [
        tooltipTimeoutRef,
        copyTooltipTimeoutRef,
        shareTooltipTimeoutRef,
        codeTooltipTimeoutRef,
        fullscreenTooltipTimeoutRef,
        xTooltipTimeoutRef,
      ];

      timeoutRefs.forEach((ref) => {
        if (ref.current !== null) {
          globalThis.clearTimeout(ref.current);
          ref.current = null;
        }
      });
    };
  }, []);

  // Early return for TypeScript - in practice, stamp is always defined at call sites
  if (!stamp) return null;

  const toggleFullScreenModal = () => {
    if (!src) return;
    const modalContent = (
      <PreviewImageModal
        src={src}
        contentType={stamp.stamp_mimetype === "text/html"
          ? "html"
          : stamp.stamp_mimetype === "text/plain"
          ? "text"
          : stamp.stamp_mimetype?.startsWith("audio/")
          ? "audio"
          : "image"}
      />
    );
    openModal(modalContent, "zoomInOut");
  };

  const isHtml = stamp.stamp_mimetype === "text/html";
  const isPlainText = stamp.stamp_mimetype === "text/plain";
  const isAudio = stamp.stamp_mimetype?.startsWith("audio/");
  const isLibraryFile = stamp.stamp_mimetype === "text/css" ||
    stamp.stamp_mimetype === "text/javascript" ||
    stamp.stamp_mimetype === "application/javascript" ||
    stamp.stamp_mimetype === "application/gzip" ||
    stamp.stamp_mimetype === "application/json" ||
    stamp.stamp_mimetype === "text/json";
  const isUnrenderable = !stamp.stamp_mimetype ||
    stamp.stamp_mimetype === "UNKNOWN" ||
    stamp.stamp_mimetype === "application/octet-stream";

  // Update the toggleCodeModal function to use the new pattern
  const toggleCodeModal = () => {
    const content = htmlContent || src;
    if (!content) return;
    const modalContent = (
      <PreviewCodeModal
        src={content}
      />
    );
    openModal(modalContent, "zoomInOut");
  };

  const isLoadingOrValidating = loading ||
    (stamp.stamp_mimetype === "image/svg+xml" && isValidating);

  if (isLoadingOrValidating) {
    return (
      <div class={`${body} ${containerGap}`}>
        <div className={`${containerDetailImage} ${containerClassName || ""}`}>
          <div className="stamp-container">
            <LoadingIcon containerClassName="rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {(!src || isUnrenderable) && (
        <div className={`${glassmorphism} p-5`}>
          <PlaceholderImage variant={isUnrenderable ? "error" : "no-image"} />
        </div>
      )}

      {src && isHtml && (
        <div className={`${className} ${body} ${containerGap}`}>
          <div
            className={`relative ${
              flag ? `${containerDetailImage} ${containerClassName || ""}` : ""
            }`}
          >
            <div className="stamp-container">
              <div className="relative pt-[100%] rounded-2xl overflow-hidden">
                {/* Show placeholder image as background while loading */}
                <div
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ zIndex: 0 }}
                >
                  <PlaceholderImage variant="no-image" />
                </div>
                <iframe
                  width="100%"
                  height="100%"
                  scrolling="no"
                  className={`${
                    className || ""
                  } rounded-2xl absolute top-0 left-0 bg-transparent`}
                  sandbox="allow-scripts allow-same-origin"
                  src={src || ""}
                  loading="lazy"
                  style={{
                    border: "none",
                    display: "block",
                    backgroundColor: "transparent",
                    zIndex: 1,
                    transformOrigin: "top left",
                  }}
                  onLoad={(e) => {
                    const iframe = e.currentTarget as HTMLIFrameElement;
                    // Hide the placeholder once iframe loads
                    const placeholder = iframe
                      .previousElementSibling as HTMLElement;
                    if (placeholder) {
                      placeholder.style.display = "none";
                    }
                    // Auto-scale: measure content, then scale iframe to fit
                    // the square container without clipping
                    try {
                      const doc = iframe.contentDocument;
                      if (!doc) return;
                      const cw = Math.max(
                        doc.body?.scrollWidth || 0,
                        doc.documentElement?.scrollWidth || 0,
                      );
                      const ch = Math.max(
                        doc.body?.scrollHeight || 0,
                        doc.documentElement?.scrollHeight || 0,
                      );
                      if (cw > 0 && ch > 0) {
                        const container = iframe.parentElement;
                        if (!container) return;
                        const boxW = container.clientWidth;
                        const boxH = container.clientHeight;
                        const scale = Math.min(boxW / cw, boxH / ch);
                        if (scale < 0.99) {
                          // Content is larger than container — scale down
                          iframe.style.width = `${cw}px`;
                          iframe.style.height = `${ch}px`;
                          iframe.style.transform = `scale(${scale})`;
                        } else {
                          // Content fits — fill container normally
                          iframe.style.width = "100%";
                          iframe.style.height = "100%";
                        }
                      }
                    } catch {
                      // Cross-origin or sandboxed — leave as-is
                    }
                  }}
                  onError={(e) => {
                    handleImageError(e);
                  }}
                  title="Stamp"
                />
              </div>
            </div>
          </div>
          {flag && (
            <RightPanel
              stamp={stamp}
              toggleCodeModal={toggleCodeModal}
              toggleFullScreenModal={toggleFullScreenModal}
              showCodeButton
            />
          )}
        </div>
      )}

      {src && isPlainText && (
        <div class={`${body} ${containerGap}`}>
          <div
            className={`${containerDetailImage} ${containerClassName || ""}`}
          >
            <div className="stamp-container">
              <div className="relative aspect-square">
                <TextContentIsland src={src} />
              </div>
            </div>
          </div>
          {flag && (
            <RightPanel
              stamp={stamp}
              toggleCodeModal={toggleCodeModal}
              toggleFullScreenModal={toggleFullScreenModal}
              showCodeButton={false}
            />
          )}
        </div>
      )}

      {src && isAudio && (
        <div className={`${className} ${body} ${containerGap}`}>
          <div
            className={`${containerDetailImage} ${containerClassName || ""}`}
          >
            <div className="stamp-container relative group">
              <PlaceholderImage variant="audio" />
              <div className="absolute inset-0 flex items-center justify-center">
                <audio
                  ref={audioRef}
                  className="hidden"
                  onEnded={handleAudioEnded}
                >
                  <source src={src} type={stamp.stamp_mimetype} />
                </audio>
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-[10%] h-[10%] rounded-full flex items-center justify-center group/button"
                >
                  <div className="absolute inset-0 bg-black opacity-50 rounded-full" />
                  <Icon
                    name={isPlaying ? "pause" : "play"}
                    type="iconButton"
                    weight="bold"
                    size="xxl"
                    color="grey"
                    className="p-[25%] relative z-10"
                  />
                </button>
              </div>
            </div>
          </div>
          {flag && (
            <RightPanel
              stamp={stamp}
              toggleCodeModal={toggleCodeModal}
              toggleFullScreenModal={toggleFullScreenModal}
              showCodeButton={false}
            />
          )}
        </div>
      )}

      {src && isLibraryFile && (
        <div className={`${className} ${body} ${containerGap}`}>
          <div
            className={`${containerDetailImage} ${containerClassName || ""}`}
          >
            <div className="stamp-container relative group">
              <PlaceholderImage variant="library" />
            </div>
          </div>
          {flag && (
            <RightPanel
              stamp={stamp}
              toggleCodeModal={toggleCodeModal}
              toggleFullScreenModal={toggleFullScreenModal}
              showCodeButton={false}
            />
          )}
        </div>
      )}

      {src && !isHtml && !isPlainText && !isAudio &&
        !isLibraryFile && !isUnrenderable && (
          flag
            ? (
              <div class={`${body} ${containerGap}`}>
                <div
                  className={`${containerDetailImage} ${
                    containerClassName || ""
                  }`}
                >
                  <div className="stamp-container">
                    <div className="relative z-10 aspect-square flex items-center justify-center">
                      {validatedContent || (
                        <img
                          width="100%"
                          loading="lazy"
                          className="max-w-none object-contain rounded-2xl pixelart stamp-image h-full w-full"
                          src={src}
                          onLoad={() => setLoading(false)}
                          onError={handleImageError}
                          alt="Stamp"
                        />
                      )}
                    </div>
                  </div>
                </div>
                {stamp.ident !== "SRC-20" && (
                  <RightPanel
                    stamp={stamp}
                    toggleCodeModal={toggleCodeModal}
                    toggleFullScreenModal={toggleFullScreenModal}
                    showCodeButton={false}
                  />
                )}
              </div>
            )
            : (
              <div
                className={`${containerDetailImage} ${
                  containerClassName || ""
                }`}
              >
                <div className="stamp-container">
                  <div className="relative z-10 aspect-square flex items-center justify-center">
                    {validatedContent || (
                      <img
                        width="100%"
                        loading="lazy"
                        className="max-w-none object-contain rounded-2xl pixelart stamp-image h-full w-full"
                        src={src}
                        onLoad={() => setLoading(false)}
                        onError={handleImageError}
                        alt="Stamp"
                      />
                    )}
                  </div>
                </div>
              </div>
            )
        )}
    </>
  );
}

export default StampImage;
