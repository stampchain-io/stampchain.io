/* ===== RECENT SALES GALLERY COMPONENT ===== */
/*@baba-153+154-move Refreshing to ViewAllButton-remove default (not used)*/
import { containerBackground, loaderSpinXsGrey } from "$layout";
import { StampGallery } from "$section";
import { titleGreyLD, valueDarkSm } from "$text";
import type { StampWithEnhancedSaleData } from "$types/marketData.d.ts";
import type { StampSalesProps } from "$types/ui.d.ts";
import { useEffect, useState } from "preact/hooks";

/* ===== TYPES ===== */
interface DisplayCountBreakpoints {
  mobileSm: number;
  mobileMd: number;
  mobileLg: number;
  tablet: number;
  desktop: number;
}

/* ===== COMPONENT ===== */
export function StampSalesGallery({
  initialData = [],
  title = "LATEST STAMPS",
  subTitle,
  variant = "detail",
  displayCounts,
  gridClass,
}: StampSalesProps) {
  /* ===== STATE ===== */
  const [recentSales, setRecentSales] = useState<StampWithEnhancedSaleData[]>(
    initialData,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ===== OPTIMIZED DATA FETCHING ===== */
  const fetchRecentSales = async () => {
    // Skip fetching if we already have initial data and this is the first load
    if (initialData.length > 0 && recentSales.length === 0) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        "/api/internal/stamp-recent-sales?page=1&limit=8",
      );
      if (!response.ok) {
        throw new Error("Failed to fetch recent sales");
      }
      const data = await response.json();
      const salesWithData = (data.data || []).map(
        (stamp: StampWithEnhancedSaleData) => {
          if (!stamp.sale_data) {
            console.warn(`Stamp ${stamp.tx_hash} missing sale_data`);
          }
          return stamp;
        },
      );
      setRecentSales(salesWithData);
    } catch (error) {
      console.error("Error fetching recent sales:", error);
      setError("Failed to load recent sales");
    } finally {
      setIsLoading(false);
    }
  };

  /* ===== OPTIMIZED EFFECTS FOR DENO FRESH SSR ===== */
  useEffect(() => {
    // Initialize with server-side data if available
    if (initialData.length > 0 && recentSales.length === 0) {
      setRecentSales(initialData);
    }

    // Only fetch client-side if no initial data was provided
    if (initialData.length === 0) {
      fetchRecentSales();
    }

    // Set up refresh interval for live updates (but less aggressive for SSR)
    const refreshInterval = setInterval(fetchRecentSales, 60000); // Increased to 60s for better SSR performance
    return () => clearInterval(refreshInterval);
  }, [initialData.length]); // Depend on initialData.length to handle server-side updates

  /* ===== ERROR HANDLING ===== */
  if (error) {
    return <div class="text-red-500">{error}</div>;
  }

  /* ===== DISPLAY CONFIGURATIONS ===== */
  const defaultHomeDisplayCounts: DisplayCountBreakpoints = {
    mobileSm: 3,
    mobileMd: 4,
    mobileLg: 5,
    tablet: 6,
    desktop: 7,
  };

  const defaultDetailDisplayCounts: DisplayCountBreakpoints = {
    mobileSm: 3,
    mobileMd: 3,
    mobileLg: 4,
    tablet: 4,
    desktop: 6,
  };

  /* ===== GRID STYLES ===== */
  const defaultHomeGridClass = `
    grid w-full gap-3 mobileMd:gap-6
    grid-cols-3 mobileMd:grid-cols-3 mobileLg:grid-cols-5 tablet:grid-cols-6 desktop:grid-cols-7
    auto-rows-fr
  `;

  const defaultDetailGridClass = `
    grid w-full gap-3 mobileLg:gap-6
    grid-cols-2 mobileSm:grid-cols-3
    mobileLg:grid-cols-4 desktop:grid-cols-6
  `;

  /* ===== SECTION PROPS ===== */
  // Filter for hot stamps when activity data is available
  const filteredStamps = variant === "home" && recentSales.length > 0
    ? recentSales.filter((stamp) => {
      // If activity_level is available, filter for HOT stamps
      if (stamp.activity_level) {
        return stamp.activity_level === "HOT";
      }
      // Fallback: show all recent sales if no activity data
      return true;
    })
    : recentSales;

  const sectionProps = variant === "home"
    ? {
      subTitle: subTitle || "HOT STAMPS",
      type: "recent",
      stamps: filteredStamps,
      fromPage: "home",
      layout: "grid" as const,
      isRecentSales: true,
      showDetails: false,
      viewAllLink: "/stamp?view=sales",
      showMinDetails: true,
      variant: "grey" as const,
      gridClass: gridClass || defaultHomeGridClass,
      displayCounts: displayCounts || defaultHomeDisplayCounts,
    }
    : {
      subTitle: subTitle || "LATEST TRANSACTIONS",
      type: "stamps",
      stamps: recentSales,
      layout: "grid" as const,
      isRecentSales: true,
      showDetails: false,
      showMinDetails: true,
      gridClass: gridClass || defaultDetailGridClass,
      displayCounts: displayCounts || defaultDetailDisplayCounts,
    };

  /* ===== RENDER ===== */
  return (
    <div class={containerBackground}>
      <h3
        class={variant === "home"
          ? titleGreyLD
          : "text-3xl tablet:text-7xl text-left mb-2 bg-gradient-to-l color-primary-gradient font-black"}
      >
        {title}
      </h3>
      <div class="flex flex-col">
        {variant === "home" && filteredStamps.length === 0 && !isLoading && (
          <div class={`${valueDarkSm} text-center py-8`}>
            <h6 class="text-lg">NO TRENDING STAMPS AVAILABLE AT THE MOMENT</h6>
          </div>
        )}
        {(filteredStamps.length > 0 || variant !== "home") && (
          <StampGallery {...sectionProps} />
        )}
        {isLoading && (
          <div class="flex items-center gap-3 -mt-[29px] mb-[9px]">
            <div class={loaderSpinXsGrey} />
            <div class="animate-pulse font-medium text-sm text-color-grey">
              REFRESHING
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
