/* ===== STAMP GALLERY COMPONENT ===== */
import { PaginationButtons, ViewAllButton } from "$button";
import { StampCard } from "$card";
import { BREAKPOINTS } from "$constants";
import { SortButton } from "$islands/button/SortButton.tsx";
import { EmptyState } from "$layout";
import { useLoadingSkeleton } from "$lib/hooks/useLoadingSkeleton.ts";
import { subtitlePrimary, titlePrimary } from "$text";
import type { StampGalleryProps, StampRow } from "$types/stamp.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";
import Swiper from "swiper";
import { Autoplay, Navigation } from "swiper/modules";

/* ===== COMPONENT ===== */
export default function StampGallery({
  title,
  subTitle,
  stamps,
  isRecentSales = false,
  variant = "cardSquare",
  gridClass,
  displayCounts,
  pagination,
  viewAllLink,
  alignRight = false,
  fromPage = "",
  sortBy = "ASC",
  swiperSlidesPerView = 3,
  swiperBreakpoints,
}: StampGalleryProps) {
  /* ===== STATE ===== */
  const swiperRef = useRef<Swiper | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(
    displayCounts?.mobileSm || 16,
  );

  /* ===== EVENT HANDLERS ===== */
  const handlePageChange = (page: number) => {
    pagination?.onPageChange?.(page);
  };

  /* ===== DATA PROCESSING ===== */
  const filteredStamps = stamps || [];

  const containerClass = gridClass ?? "grid grid-cols-2 gap-3";

  const resolvedSwiperBreakpoints = swiperBreakpoints || {
    360: { slidesPerView: 3 }, // mobileSm
    568: { slidesPerView: 4 }, // mobileMd
    768: { slidesPerView: 5 }, // mobileLg
    1024: { slidesPerView: 6 }, // tablet
    1440: { slidesPerView: 8 }, // desktop
  };
  const maxSlidesPerView = Math.max(
    swiperSlidesPerView,
    ...Object.values(resolvedSwiperBreakpoints).map((bp) => bp.slidesPerView),
  );
  // Swiper's loop mode needs comfortably more real slides than the
  // largest slidesPerView it will ever show, or it can't build proper
  // clone padding on both ends - causing the carousel to visibly break
  // once it wraps around. Repeat the available stamps so there are always
  // enough slides to loop smoothly, instead of disabling the loop.
  const minSlidesForLoop = maxSlidesPerView * 2 + 1;
  const swiperStamps = filteredStamps.length > 0 &&
      filteredStamps.length < minSlidesForLoop
    ? Array.from(
      { length: minSlidesForLoop },
      (_, index) => filteredStamps[index % filteredStamps.length],
    )
    : filteredStamps;

  // Shared key derivation for both the swiper and grid render branches
  const getStampKey = (stamp: StampRow, index: number) =>
    isRecentSales && stamp.sale_data
      ? `${stamp.tx_hash}-${stamp.sale_data.tx_hash}-${index}`
      : `${stamp.tx_hash}-${index}`;

  /* ===== EFFECTS ===== */
  // Update display count based on window width
  useEffect(() => {
    const handleResize = () => {
      const width = globalThis.innerWidth;
      if (displayCounts) {
        if (width >= BREAKPOINTS.desktop) {
          setDisplayCount(
            displayCounts.desktop || displayCounts.tablet ||
              displayCounts.mobileLg || displayCounts.mobileMd ||
              displayCounts.mobileSm || stamps.length,
          );
        } else if (width >= BREAKPOINTS.tablet) {
          setDisplayCount(
            displayCounts.tablet || displayCounts.mobileLg ||
              displayCounts.mobileMd || displayCounts.mobileSm || stamps.length,
          );
        } else if (width >= BREAKPOINTS.mobileLg) {
          setDisplayCount(
            displayCounts.mobileLg || displayCounts.mobileMd ||
              displayCounts.mobileSm || stamps.length,
          );
        } else if (width >= BREAKPOINTS.mobileMd) {
          setDisplayCount(
            displayCounts.mobileMd || displayCounts.mobileSm || stamps.length,
          );
        } else {
          setDisplayCount(displayCounts.mobileSm || stamps.length);
        }
      } else {
        setDisplayCount(stamps.length);
      }
    };

    handleResize();
    globalThis.addEventListener("resize", handleResize);
    return () => globalThis.removeEventListener("resize", handleResize);
  }, [displayCounts, stamps.length]);

  // Handle pagination loading state
  useEffect(() => {
    if (pagination) {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 300);
    }
  }, [pagination?.page]);

  // Initialize Swiper
  useEffect(() => {
    swiperRef.current = new Swiper(".swiper-container", {
      modules: [Navigation, Autoplay],
      slidesPerView: swiperSlidesPerView,
      spaceBetween: 20,
      loop: true,
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
      },
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
      breakpoints: resolvedSwiperBreakpoints,
    });

    return () => swiperRef.current?.destroy();
  }, []);

  /* ===== RENDER ===== */
  return (
    <div class="w-full">
      {/* ===== SECTION HEADER ===== */}
      <div class="w-full flex justify-between items-center">
        <div class="flex flex-col w-full">
          {title && (
            <div
              class={`flex flex-col items-start ${
                alignRight && "tablet:items-end"
              }`}
            >
              <h1 class={titlePrimary}>
                {title}
              </h1>
            </div>
          )}
          {subTitle && (
            <div
              class={`flex flex-col items-start pb-1 ${
                alignRight && "tablet:items-end"
              }`}
            >
              <h2 class={subtitlePrimary}>
                {subTitle}
              </h2>
            </div>
          )}
        </div>

        {fromPage === "collection" &&
          (
            <div class="flex gap-1 items-center">
              <SortButton initSort={sortBy} />
            </div>
          )}
      </div>

      {/* ===== STAMP CONTENT ===== */}
      {!isLoading && filteredStamps.length === 0
        ? <EmptyState label="NO STAMP CREATIONS AVAILABLE" icon="artStamps" />
        : ((viewAllLink && viewAllLink !== "/collection/posh" &&
            fromPage == "home") ||
            fromPage === "stamp_detail")
        ? (
          <div class="swiper-container overflow-hidden">
            <div class="swiper-wrapper">
              {isLoading ? <div>Loading...</div> : (
                swiperStamps.map((stamp: StampRow, index: number) => (
                  <div
                    class="swiper-slide"
                    key={getStampKey(stamp, index)}
                  >
                    <StampCard
                      stamp={stamp}
                      isRecentSale={isRecentSales}
                      variant={variant}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )
        : (
          <div class={containerClass}>
            {isLoading
              ? (
                // Grid view loading skeleton with optimized animation control - IS THIS WORKING @baba-check
                [...Array(displayCount)].map((_, index) => {
                  const skeletonClasses = useLoadingSkeleton(
                    isLoading,
                    "aspect-square rounded-2xl",
                  );
                  return (
                    <div
                      key={index}
                      class={skeletonClasses}
                    />
                  );
                })
              )
              : (
                filteredStamps.slice(0, displayCount).map((
                  stamp: StampRow,
                  index: number,
                ) => (
                  <div
                    key={getStampKey(stamp, index)}
                  >
                    <StampCard
                      stamp={stamp}
                      isRecentSale={isRecentSales}
                      variant={variant}
                    />
                  </div>
                ))
              )}
          </div>
        )}

      {/* ===== NAVIGATION CONTROLS ===== */}
      {viewAllLink && filteredStamps.length > 0 && (
        <ViewAllButton href={viewAllLink} />
      )}

      {pagination && (
        <PaginationButtons
          page={pagination.page}
          totalPages={pagination.totalPages}
          {...(pagination.prefix && { prefix: pagination.prefix })}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
