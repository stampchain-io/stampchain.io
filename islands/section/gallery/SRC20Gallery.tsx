/* ===== SRC20 GALLERY COMPONENT ===== */
// @baba - add token cards specific to wallet page
import { PaginationButtons, ViewAllButton } from "$button";
import {
  SRC20Card,
  SRC20CardMinting,
  SRC20CardSm,
  SRC20CardSmMinting,
} from "$card";
import { useLoadingSkeleton } from "$lib/hooks/useLoadingSkeleton.ts";
import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import { subtitleNeutral, titleNeutral } from "$text";
import type { EnrichedSRC20Row } from "$types/src20.d.ts";
import type { SRC20GalleryProps } from "$types/ui.d.ts";
import { useEffect, useMemo, useState } from "preact/hooks";

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
export function SRC20Gallery({
  initialData,
  fromPage = "src20",
  viewType,
  title,
  subTitle,
  pagination,
  timeframe,
  serverData,
  currentSort,
}: SRC20GalleryProps) {
  const [data, setData] = useState<EnrichedSRC20Row[]>(initialData || []); // 🎯 FIXED: Use EnrichedSRC20Row
  const [isLoading, setIsLoading] = useState(!initialData && !serverData);

  // 🚀 PREACT OPTIMIZATION: Memoized data processing
  const processedData: EnrichedSRC20Row[] = useMemo(() => {
    return data.map((item: EnrichedSRC20Row) => ({
      ...item,
      tick: unicodeEscapeToEmoji(item.tick),
    }));
  }, [data]);

  // 🚀 DENO FRESH 2.3+ OPTIMIZATION: Server-side data is already enriched and filtered
  useEffect(() => {
    if (serverData) {
      setData(serverData.data);
      setIsLoading(false);
    }
  }, [serverData]);

  // 🚀 REMOVED: Client-side API calls for /src20 page - use server-side rendering only
  // This eliminates dual data sources and ensures consistency

  // 🚀 FRESH.JS NAVIGATION: Server-side rendering with URL updates
  const handlePageChange = (page: number) => {
    if (pagination?.onPageChange) {
      pagination.onPageChange(page);
    } else {
      // Always use server-side navigation for /src20 page
      // SSR-safe browser environment check
      if (typeof globalThis === "undefined" || !globalThis?.location) {
        return; // Cannot navigate during SSR
      }
      const url = new URL(globalThis.location.href);
      url.searchParams.set("page", page.toString());
      globalThis.location.href = url.toString();
    }
  };

  // 🚀 SIMPLIFIED: Basic image click handler
  const handleImageClick = (_imgSrc: string) => {
    // TODO(@dev): Implement image click handler
  };

  // 🚀 DENO FRESH 2.3+ OPTIMIZATION: Simplified card component selection
  const CardComponent = useMemo(() => {
    // For /src20 page, use full-size cards
    if (fromPage === "src20" || fromPage === "stamping/src20") {
      return viewType === "minted" ? SRC20Card : SRC20CardMinting;
    }
    // For other pages (home, wallet), use small cards
    return viewType === "minted" ? SRC20CardSm : SRC20CardSmMinting;
  }, [viewType, fromPage]);

  // 🚀 PREACT OPTIMIZATION: Memoized card props
  const cardProps = useMemo(() => ({
    data: processedData,
    fromPage,
    ...(timeframe && { timeframe }), // Only pass timeframe if it exists
    onImageClick: handleImageClick,
    ...(currentSort && { currentSort }), // Only pass currentSort if it exists
  }), [processedData, fromPage, timeframe, handleImageClick, currentSort]);

  // Always call hooks at the top level
  const skeletonClasses = useLoadingSkeleton(
    isLoading,
    "src20-skeleton h-[400px]",
  );

  if (isLoading) {
    return <div class={skeletonClasses} />;
  }

  // 🚀 DENO FRESH 2.3+ OPTIMIZATION: Early return for src20 page with optimized rendering
  if (fromPage === "src20" || fromPage === "stamping/src20") {
    return <CardComponent {...cardProps} />;
  }

  return (
    <div class="w-full">
      {title && (
        <h1
          class={`${titleNeutral} ${
            fromPage === "home" && viewType === "minting" ? "opacity-0" : ""
          }`}
        >
          {title}
        </h1>
      )}
      {subTitle && (
        <h2
          class={`${subtitleNeutral} ${
            viewType === "minting" ? "text-left tablet:text-right" : ""
          }`}
        >
          {subTitle}
        </h2>
      )}

      {/* 🚀 OPTIMIZED: Use dynamic card component selection based on minting status */}
      <CardComponent {...cardProps} />

      {fromPage === "home" && (
        <div class="flex justify-end -mt-3 mobileLg:-mt-7">
          <ViewAllButton
            href={`/src20${viewType === "minting" ? "/minting" : ""}`}
          />
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div class="mt-7.5 tablet:mt-10">
          <PaginationButtons
            page={pagination.page}
            totalPages={pagination.totalPages}
            prefix={fromPage === "wallet" ? "src20" : ""}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
