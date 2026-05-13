/* ===== RECENT SALES GALLERY COMPONENT ===== */
import { PaginationButtons } from "$button";
import { BREAKPOINTS } from "$constants";
import { LoadingIcon } from "$icon";
import { RecentSaleCard } from "$islands/card/RecentSaleCard.tsx";
import { container2 } from "$layout";
import { useLoadingSkeleton } from "$lib/hooks/useLoadingSkeleton.ts";
import { AccessibilityUtils } from "$lib/utils/ui/accessibility/accessibilityUtils.ts";
import { subtitleNeutral, titleNeutralDL } from "$text";
import type { RecentSalesGalleryProps } from "$types/ui.d.ts";
import { useEffect, useState } from "preact/hooks";

export default function RecentSalesGallery({
  title = "Recent Sales",
  subTitle,
  sales = [],
  layout = "grid",
  showFullDetails = false,
  displayCounts = {
    mobileSm: 4,
    mobileMd: 6,
    mobileLg: 8,
    tablet: 12,
    desktop: 16,
  },
  pagination,
  isLoading = false,
  btc_price_usd = 0,
  autoRefresh = false,
  refreshIntervalMs = 30000, // 30 seconds
  onRefresh,
  gridClass =
    "grid grid-cols-2 mobileMd:grid-cols-3 mobileLg:grid-cols-4 tablet:grid-cols-6 desktop:grid-cols-8 gap-4",
  maxItems,
}: RecentSalesGalleryProps) {
  /* ===== STATE ===== */
  const [displayCount, setDisplayCount] = useState(displayCounts.mobileSm || 4);
  const [refreshLoading, setRefreshLoading] = useState(false);

  /* ===== EVENT HANDLERS ===== */
  const handlePageChange = (page: number) => {
    pagination?.onPageChange?.(page);
  };

  const handleRefresh = async () => {
    if (!onRefresh || refreshLoading) return;

    setRefreshLoading(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Failed to refresh sales data:", error);
    } finally {
      setRefreshLoading(false);
    }
  };

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
              displayCounts.mobileSm || sales.length,
          );
        } else if (width >= BREAKPOINTS.tablet) {
          setDisplayCount(
            displayCounts.tablet || displayCounts.mobileLg ||
              displayCounts.mobileMd || displayCounts.mobileSm || sales.length,
          );
        } else if (width >= BREAKPOINTS.mobileLg) {
          setDisplayCount(
            displayCounts.mobileLg || displayCounts.mobileMd ||
              displayCounts.mobileSm || sales.length,
          );
        } else if (width >= BREAKPOINTS.mobileMd) {
          setDisplayCount(
            displayCounts.mobileMd || displayCounts.mobileSm || sales.length,
          );
        } else {
          setDisplayCount(displayCounts.mobileSm || sales.length);
        }
      } else {
        setDisplayCount(sales.length);
      }
    };

    handleResize();
    globalThis.addEventListener("resize", handleResize);
    return () => globalThis.removeEventListener("resize", handleResize);
  }, [displayCounts, sales.length]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return;

    const interval = setInterval(() => {
      if (!refreshLoading) {
        handleRefresh();
      }
    }, refreshIntervalMs);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshIntervalMs, onRefresh, refreshLoading]);

  /* ===== DATA PROCESSING ===== */
  const filteredSales = sales || [];
  const displayedSales = maxItems
    ? filteredSales.slice(0, maxItems)
    : filteredSales.slice(0, displayCount);

  const containerClass = layout === "grid" ? gridClass : "flex flex-col gap-4";

  // Generate accessibility labels
  const galleryLabel = pagination
    ? AccessibilityUtils.getGalleryNavigationLabel(
      pagination.page,
      pagination.totalPages,
      displayedSales.length,
    )
    : `Sales gallery with ${displayedSales.length} items`;

  const refreshButtonLabel = AccessibilityUtils.getRefreshButtonLabel(
    refreshLoading,
  );
  const loadingLabel = AccessibilityUtils.getLoadingLabel("gallery");

  /* ===== RENDER ===== */
  return (
    <div
      class="w-full"
      role="region"
      aria-label={galleryLabel}
      aria-live="polite"
      aria-busy={isLoading}
    >
      {/* ===== SECTION HEADER ===== */}
      <div class="w-full flex justify-between items-center mb-6">
        <div class="flex flex-col w-full">
          {title && (
            <div class="flex flex-col items-start">
              <h1 class={`${titleNeutralDL} tablet:hidden`}>
                {title}
              </h1>
              <h1 class={`hidden tablet:block ${titleNeutralDL}`}>
                {title}
              </h1>
            </div>
          )}
          {subTitle && (
            <div class="flex flex-col items-start pb-1">
              <h2 class={subtitleNeutral}>
                {subTitle}
              </h2>
            </div>
          )}
        </div>

        {/* Auto-refresh controls */}
        {autoRefresh && onRefresh && (
          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshLoading}
              aria-label={refreshButtonLabel}
              class="px-3 py-2 text-sm bg-color-purple-light hover:bg-color-purple text-white rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshLoading ? "Refreshing..." : "Refresh"}
            </button>
            <div class="text-xs text-gray-400">
              Auto-refresh: {refreshIntervalMs / 1000}s
            </div>
          </div>
        )}
      </div>

      {/* ===== SALES CONTENT ===== */}
      <div class={containerClass}>
        {isLoading
          ? (
            // Loading skeleton
            <div aria-label={loadingLabel}>
              {[...Array(displayCount)].map((_, index) => {
                const skeletonClasses = useLoadingSkeleton(
                  isLoading,
                  "aspect-square rounded",
                );
                return (
                  <div
                    key={index}
                    class={skeletonClasses}
                  />
                );
              })}
            </div>
          )
          : displayedSales.length > 0
          ? (
            displayedSales.map((sale) => (
              <div
                key={`${sale.tx_hash}-${
                  sale.sale_data?.tx_hash || sale.sale_data?.block_index
                }`}
                class="w-full"
              >
                <RecentSaleCard
                  sale={sale}
                  showFullDetails={showFullDetails}
                  btc_price_usd={btc_price_usd}
                />
              </div>
            ))
          )
          : (
            // No sales state
            <div class="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <div class="text-gray-400 text-lg mb-2">
                No recent sales found
              </div>
              <div class="text-gray-500 text-sm">
                Check back later for recent stamp transactions
              </div>
            </div>
          )}
      </div>

      {/* ===== PAGINATION ===== */}
      {pagination && pagination.totalPages > 1 && (
        <div class="mt-7.5 tablet:mt-10">
          <PaginationButtons
            page={pagination.page}
            totalPages={pagination.totalPages}
            {...(pagination.prefix && { prefix: pagination.prefix })}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* ===== LOADING OVERLAY FOR REFRESH ===== */}
      {refreshLoading && (
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class={`${container2} p-5 flex items-center gap-3`}>
            <LoadingIcon />
            <span class="text-white">Refreshing sales data...</span>
          </div>
        </div>
      )}
    </div>
  );
}
