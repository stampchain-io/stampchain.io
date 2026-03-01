/* ===== CAROUSEL GALLERY COMPONENT ===== */
/* TODO (@baba)-update styling */
import createCarouselSlider from "$client/utils/carousel-slider.ts";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { PlaceholderImage } from "$icon";
import { glassmorphismL2, shadowGlowPurple } from "$layout";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";
import { getStampImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import type { CarouselHomeProps } from "$types/ui.d.ts";
import { ComponentChildren } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

/* ===== COMPONENT ===== */
export default function CarouselGallery(props: CarouselHomeProps) {
  /* ===== PROPS EXTRACTION ===== */
  const { carouselStamps } = props;
  const stamps = carouselStamps || [];

  /* ===== REFS ===== */
  const carouselInitialized = useRef(false);
  const swiperInstance = useRef<any>(null);

  /* ===== COMPUTED VALUES ===== */
  const isMobile = IS_BROWSER ? globalThis.innerWidth < 768 : false;

  // Memoize duplicatedStamps to prevent infinite re-renders
  const duplicatedStamps = useMemo(() => {
    if (stamps.length === 0) return [];

    // Mobile needs 3 slides per view, desktop needs 5
    const minSlidesNeeded = isMobile ? 6 : 10; // 2x slidesPerView for proper loop

    // If we have enough stamps, just duplicate them
    if (stamps.length >= (isMobile ? 3 : 5)) {
      return [...stamps, ...stamps];
    }

    // If we don't have enough stamps, repeat them until we have enough
    const result = [...stamps];
    while (result.length < minSlidesNeeded) {
      result.push(...stamps);
    }

    return result;
  }, [stamps, isMobile]);

  /* ===== STATE ===== */
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [validatedContent, setValidatedContent] = useState<
    Record<string, ComponentChildren>
  >({});
  const [stampSources, setStampSources] = useState<
    Record<string, string | null>
  >({});

  /* ===== EVENT HANDLERS ===== */
  const handleLoad = () => {
    setLoading(false);
  };

  /* ===== VALIDATION EFFECT ===== */
  useEffect(() => {
    // Defer stamp validation to idle periods to reduce main thread blocking
    // This improves TBT (Total Blocking Time) by spreading validation work across idle callbacks
    const validateStamps = () => {
      const validated: Record<string, ComponentChildren> = {};
      const sources: Record<string, string> = {};

      // Process stamps in batches to avoid overwhelming the browser
      const batchSize = 5;
      let currentBatch = 0;
      const totalBatches = Math.ceil(duplicatedStamps.length / batchSize);

      // Process one batch per idle callback
      const processBatch = () => {
        if (currentBatch >= totalBatches) {
          return; // All batches processed
        }

        const startIdx = currentBatch * batchSize;
        const batch = duplicatedStamps.slice(startIdx, startIdx + batchSize);

        batch.forEach((stamp) => {
          // Skip if already validated
          if (validatedContent[stamp.tx_hash]) {
            return;
          }

          // Get proper stamp URL using getStampImageSrc
          const src = getStampImageSrc(stamp);
          if (src) {
            sources[stamp.tx_hash] = src;
          }

          // If no src, show placeholder
          if (!src) {
            validated[stamp.tx_hash] = (
              <a target="_top" href={`/stamp/${stamp.tx_hash}`}>
                <div class="object-contain cursor-pointer desktop:min-w-[408px] tablet:min-w-[269px] mobileLg:min-w-[200px] mobileMd:min-w-[242px] min-w-[150px] rounded-2xl aspect-square">
                  <PlaceholderImage variant="no-image" />
                </div>
              </a>
            );
            return;
          }

          // Handle HTML content — render in sandboxed iframe
          // Preview endpoint is unreliable for HTML stamps (CF Worker may
          // fail or produce blank renders), so use live iframe rendering
          // which matches the detail page behavior.
          if (stamp.stamp_mimetype === "text/html") {
            const contentSrc = getStampImageSrc(stamp) ||
              `/content/${stamp.tx_hash}`;
            validated[stamp.tx_hash] = (
              <a target="_top" href={`/stamp/${stamp.tx_hash}`}>
                <iframe
                  src={contentSrc}
                  sandbox="allow-scripts"
                  scrolling="no"
                  loading="lazy"
                  class="w-full aspect-square rounded-2xl pointer-events-none"
                  style="border: none; background: transparent;"
                  onLoad={handleLoad}
                />
              </a>
            );
            return;
          }

          // Handle SVG content - check for recursive external references
          if (stamp.stamp_mimetype === "image/svg+xml") {
            (async () => {
              try {
                const response = await fetch(src);
                if (!response.ok) return;
                const svgContent = await response.text();
                if (
                  svgContent.includes("ordinals.com/content/") ||
                  svgContent.includes("arweave.net/")
                ) {
                  setValidatedContent((prev) => ({
                    ...prev,
                    [stamp.tx_hash]: (
                      <a target="_top" href={`/stamp/${stamp.tx_hash}`}>
                        <img
                          src={`/api/v2/stamp/${stamp.stamp}/preview`}
                          alt={`Stamp #${stamp.stamp}`}
                          loading="lazy"
                          class="object-contain cursor-pointer desktop:min-w-[408px] tablet:min-w-[269px] mobileLg:min-w-[200px] mobileMd:min-w-[242px] min-w-[150px] rounded-2xl pixelart stamp-image"
                          onLoad={handleLoad}
                        />
                      </a>
                    ),
                  }));
                }
                // Non-recursive SVG: leave stampSources as-is for <img> rendering
              } catch {
                // Leave as default <img> rendering on network error
              }
            })();
            return;
          }
        });

        // Update state after each batch
        if (Object.keys(validated).length > 0) {
          setValidatedContent((prev) => ({ ...prev, ...validated }));
        }
        if (Object.keys(sources).length > 0) {
          setStampSources((prev) => ({ ...prev, ...sources }));
        }

        currentBatch++;

        // Schedule next batch during idle time
        if (currentBatch < totalBatches) {
          const idleCallback = (globalThis as any).requestIdleCallback ||
            ((cb: () => void) => setTimeout(cb, 16)); // Fallback to ~60fps timing
          idleCallback(processBatch);
        }
      };

      // Start processing first batch during idle time
      const idleCallback = (globalThis as any).requestIdleCallback ||
        ((cb: () => void) => setTimeout(cb, 16));
      idleCallback(processBatch);
    };

    validateStamps();
  }, [duplicatedStamps]);

  /* ===== CAROUSEL EFFECT ===== */
  useEffect(() => {
    if (IS_BROWSER && !carouselInitialized.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const carouselElement = document.querySelector(
          ".carousel-slider",
        ) as HTMLElement;

        if (carouselElement && !swiperInstance.current) {
          swiperInstance.current = createCarouselSlider(carouselElement);
          swiperInstance.current?.on("slideChange", () => {
            setActiveSlideIndex(swiperInstance.current.realIndex);
          });
          carouselInitialized.current = true;
        }
      });
    }
  }, []);

  /* ===== LOADING STATE ===== */
  if (!IS_BROWSER && loading) {
    return (
      <div class="carousel-slider-skeleton h-full">
        <div class="swiper h-full">
          <div class="swiper-wrapper">
            {[...Array(5)].map((_, i) => (
              <div class="swiper-slide" key={`skeleton-${i}`}>
                <div class="loading-skeleton rounded-3xl h-full min-h-[150px] mobileMd:min-h-[242px] mobileLg:min-h-[200px] tablet:min-h-[269px] desktop:min-h-[408px]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ===== RENDER ===== */
  return (
    <>
      <div class={`carousel-slider ${props.class ?? ""}`}>
        <div class="swiper h-full">
          <div class="swiper-wrapper">
            {duplicatedStamps.map((stamp, index) => {
              // const extension = stamp.stamp_url?.split(".")?.pop() || "";
              return (
                <div
                  class="swiper-slide group h-full"
                  key={`${stamp.tx_hash}-${index}`}
                  data-hash={stamp.tx_hash}
                >
                  <a target="_top" href={`/stamp/${stamp.tx_hash}`}>
                    <div
                      class={`hover-gradient hover:bg-color-purple-light ${shadowGlowPurple} p-0.5 rounded-3xl`}
                    >
                      <div
                        class={`relative min-h-[150px] mobileMd:min-h-[242px] mobileLg:min-h-[200px] tablet:min-h-[269px] desktop:min-h-[408px] p-[6px] mobileMd:p-[12px] desktop:p-[18px] rounded-3xl ${glassmorphismL2} hover:bg-black`}
                      >
                        {validatedContent[stamp.tx_hash] || (
                          <img
                            src={stampSources[stamp.tx_hash] || stamp.stamp_url}
                            alt={`Stamp #${stamp.stamp}`}
                            loading="lazy"
                            class="object-contain cursor-pointer desktop:min-w-[408px] tablet:min-w-[269px] mobileLg:min-w-[200px] mobileMd:min-w-[242px] min-w-[150px] rounded-2xl pixelart stamp-image"
                            onLoad={handleLoad}
                          />
                        )}
                        {/* ===== HOVER OVERLAY ===== */}
                        {activeSlideIndex - 1 == index && (
                          <div
                            id="hover"
                            class="flex items-end mobileLg:w-calc-24 w-calc-12 h-[100%] hover-dark-gradient absolute bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                          >
                            <div class="w-full pb-1">
                              <div class="desktop:hidden flex justify-center items-center w-full">
                                <h3 class="font-black text-lg color-grey-gradientDL text-center">
                                  <span class="font-light text-color-grey-light">
                                    #
                                  </span>
                                  {stamp.stamp}
                                </h3>
                              </div>
                              <div class="hidden mobileLg:flex justify-between items-end w-full flex-1 px-1 desktop:px-3 pb-1.5 desktop:pb-2">
                                <h3 class="hidden desktop:block font-black text-3xl color-grey-gradientDL desktop:text-left">
                                  <span class="font-light text-color-grey-light">
                                    #
                                  </span>
                                  {stamp.stamp}
                                </h3>
                                <h4 class="font-medium text-sm desktop:text-base color-grey-gradientLD text-left desktop:text-center tracking-normal mb-0.5">
                                  {stamp.creator_name
                                    ? stamp.creator_name
                                    : abbreviateAddress(stamp.creator, 8)}
                                </h4>
                                <h5 class="font-bold text-base desktop:text-lg text-color-grey text-right">
                                  {stamp.divisible
                                    ? (stamp.supply / 100000000).toFixed(2)
                                    : stamp.supply > 100000
                                    ? "+100000"
                                    : stamp.supply}
                                </h5>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
        {/* ===== PAGINATION ===== */}
        <div
          class="swiper-pagination"
          data-slides-length={stamps?.length || 0}
        >
        </div>
      </div>
    </>
  );
}
