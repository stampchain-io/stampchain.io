/* ===== STAMP OVERVIEW PAGE ===== */

import { FRONTEND_STAMP_TYPE_VALUES } from "$constants";
import { StampOverviewContent } from "$content";
import { Handlers } from "$fresh/server.ts";
import { StampOverviewHeader } from "$header";
import { containerBackground } from "$layout";

import {
  queryParamsToFilters,
  queryParamsToServicePayload,
  StampFilters,
} from "$islands/filter/FilterOptionsStamp.tsx";
import type { StampPageProps } from "$types/api.d.ts";
import type { StampRow, StampSaleRow } from "$types/stamp.d.ts";

import {
  DEV_DUMMY_MODE,
  DUMMY_STAMP_OVERVIEW_PAGE,
  withTimeout,
} from "$lib/utils/devDummyData.ts";
import { StampController } from "$server/controller/stampController.ts";

/* ===== CONSTANTS ===== */
const MAX_PAGE_SIZE = 120;

/* ===== SERVER HANDLER ===== */
export const handler: Handlers = {
  async GET(req: Request, ctx) {
    const url = new URL(req.url);
    // ✅ REMOVED: baseUrl was causing internal API self-referencing via EC2 IP
    // Now using direct controller/service calls instead of HTTP fetch

    if (DEV_DUMMY_MODE) {
      const typeParam = url.searchParams.get("type") || "all";
      const all = DUMMY_STAMP_OVERVIEW_PAGE.data;

      // Filter dummy stamps to match the selected tab
      const stampsByType: Record<string, typeof all> = {
        all,
        classic: all.filter((s) =>
          s.ident === "STAMP" && s.cpid.startsWith("A") && s.stamp >= 0
        ),
        posh: all.filter((s) => s.ident === "STAMP" && !s.cpid.startsWith("A")),
        cursed: all.filter((s) =>
          s.ident === "STAMP" && !s.cpid.startsWith("A")
        ),
        "src-721": all.filter((s) => s.ident === "SRC-721"),
      };

      const stamps = stampsByType[typeParam] ?? all;
      const displayParam = url.searchParams.get("display");
      const cardView: "detail" | "minimal" = displayParam === "minimal"
        ? "minimal"
        : "detail";

      return ctx.render({
        stamps,
        pagination: {
          ...DUMMY_STAMP_OVERVIEW_PAGE.pagination,
          total: stamps.length,
        },
        recentSales: [],
        filters: queryParamsToFilters(url.search),
        page: 1,
        page_size: 60,
        sortBy: "DESC",
        selectedTab: typeParam,
        totalPages: 1,
        cardView,
      });
    }

    try {
      return await withTimeout(
        (async () => {
          /* ===== URL PARAMS ===== */
          const page = parseInt(url.searchParams.get("page") || "1");
          const page_size = Math.min(
            parseInt(url.searchParams.get("limit") || "60"),
            MAX_PAGE_SIZE,
          );
          const sortBy = url.searchParams.get("sortBy") || "DESC";

          // ✅ IMPROVED: Handle view parameter for different stamp display modes
          const viewMode = url.searchParams.get("view") || "all";
          const marketMode = url.searchParams.get("market") || "";

          // Redirect marketplace sales filter to use the proven sales view logic
          const recentSales = viewMode === "sales" ||
            marketMode === "sales" || // ✅ NEW: marketplace sales filter uses sales view
            url.searchParams.get("recentSales") === "true"; // Backward compatibility

          // Handle type parameter for stamp filtering (all, classic, posh, src-721, cursed)
          // Note: SRC-20 excluded from frontend options as they're handled separately in the app
          const stampType = url.searchParams.get("type") || "all"; // Default to all
          const typeFilter =
            FRONTEND_STAMP_TYPE_VALUES.includes(stampType as any)
              ? stampType
              : "all";

          /* ===== DATA FETCHING BASED ON MODE ===== */
          let stampsData: {
            data: StampRow[];
            pagination: {
              total: number;
              page?: number | undefined;
              totalPages?: number | undefined;
            };
          } = {
            data: [],
            pagination: { total: 0 },
          };
          let recentSalesData: StampSaleRow[] = [];

          if (recentSales) {
            // ✅ FIX: Use direct controller call instead of HTTP fetch
            // This eliminates the internal API self-referencing issue where requests
            // were timing out due to EC2 IP resolution instead of localhost
            try {
              const result = await StampController.getRecentSales(
                page,
                page_size,
                {
                  dayRange: 30, // Use 30-day range like homepage
                  includeFullDetails: true, // Enable enhanced transaction information
                  type: typeFilter as any, // Add stamp type filtering
                },
              );

              const salesResult = result.data || [];
              // Cast the result via unknown - data will be transformed to proper format later
              recentSalesData = (Array.isArray(salesResult)
                ? salesResult.filter((item) =>
                  item !== null
                )
                : []) as unknown as StampSaleRow[];

              // Debug: Check received data for stamp_url issues
              recentSalesData.forEach((sale: any, index: number) => {
                if (!sale.stamp_url) {
                  console.warn(
                    `[Frontend] Sale ${index} missing stamp_url. Received data:`,
                    {
                      stamp: sale.stamp,
                      stamp_url: sale.stamp_url,
                      stamp_mimetype: sale.stamp_mimetype,
                      has_stamp_url: "stamp_url" in sale,
                      stamp_url_type: typeof sale.stamp_url,
                    },
                  );
                }
              });

              // ✅ PRACTICAL FIX: Handle potential data processing issues with fallback
              stampsData = {
                data: recentSalesData.map((sale: any) => {
                  // Debug: Check if stamp_url is actually missing/invalid
                  if (
                    !sale.stamp_url || sale.stamp_url === "" ||
                    sale.stamp_url.includes("undefined") ||
                    sale.stamp_url.includes("null")
                  ) {
                    console.warn(
                      `[Recent Sales] Invalid stamp_url for stamp ${sale.stamp}: "${sale.stamp_url}". Using fallback.`,
                    );
                  }

                  return {
                    stamp: sale.stamp,
                    cpid: sale.cpid,
                    tx_hash: sale.tx_hash,
                    tx_index: 0,
                    block_index: sale.block_index,
                    block_time: sale.timestamp,
                    stamp_base64: "",
                    // Use stamp content route as reliable fallback for any invalid URLs
                    stamp_url: (sale.stamp_url && sale.stamp_url !== "" &&
                        !sale.stamp_url.includes("undefined") &&
                        !sale.stamp_url.includes("null"))
                      ? sale.stamp_url
                      : `/s/${sale.stamp}`,
                    stamp_mimetype: sale.stamp_mimetype || "",
                    stamp_hash: "",
                    file_hash: "",
                    file_size_bytes: null,
                    ident: "STAMP" as const,
                    creator: sale.creator || sale.source,
                    creator_name: sale.creator_name,
                    divisible: false,
                    keyburn: null,
                    locked: 0,
                    // For recent sales, show transaction quantity instead of total supply
                    supply: sale.sale_data?.dispense_quantity || 1,
                    unbound_quantity: sale.sale_data?.dispense_quantity || 1,
                    sale_data: sale.sale_data,
                  };
                }),
                pagination: {
                  total: result.total || 0,
                  page: result.page || page,
                  totalPages: result.totalPages ||
                    Math.ceil((result.total || 0) / page_size),
                },
              };

              console.log(
                `[Stamp Route] Recent sales mode: fetched ${recentSalesData.length} sales`,
              );
            } catch (recentSalesError) {
              console.error(
                "[Recent Sales Error]",
                (recentSalesError as Error).message || "Unknown error",
              );
              // Fallback to empty data for recent sales
              stampsData = { data: [], pagination: { total: 0 } };
              recentSalesData = [];
            }
          } else {
            // Handle type-based filtering (classic/posh/cursed/src-721) or all-stamps mode
            try {
              // If a specific type is requested, fetch stamps by type; otherwise show all
              if (typeFilter !== "all") {
                /* ===== TYPE-BASED STAMP FILTERING ===== */
                try {
                  // Parse all filter parameters from URL
                  const filterPayload = queryParamsToServicePayload(url.search);

                  // Remove undefined values to satisfy TypeScript's exactOptionalPropertyTypes
                  const cleanFilters = Object.fromEntries(
                    Object.entries(filterPayload).filter(([_, v]) =>
                      v !== undefined
                    ),
                  );

                  // Call StampController directly instead of HTTP request
                  const controllerResult = await StampController.getStamps({
                    ...cleanFilters, // ✅ Apply all filters from URL first
                    page,
                    limit: page_size,
                    sortBy: sortBy as "ASC" | "DESC",
                    type: typeFilter as any, // Override type from filters with explicit type
                    url: url.toString(),
                  });

                  stampsData = {
                    data: Array.isArray(controllerResult.data)
                      ? controllerResult.data
                      : [],
                    pagination: {
                      total: "total" in controllerResult
                        ? (controllerResult.total || 0)
                        : 0,
                      page: "page" in controllerResult
                        ? (controllerResult.page || page)
                        : page,
                      totalPages: "totalPages" in controllerResult
                        ? (controllerResult.totalPages || 0)
                        : 0,
                    },
                  };

                  console.log(
                    `[Stamp Route] Type filtering mode: fetched ${
                      stampsData.data?.length || 0
                    } stamps for type '${typeFilter}'`,
                  );
                } catch (typeError) {
                  console.error("[Type Filtering Error]:", {
                    message: (typeError as Error).message || "Unknown error",
                    type: typeFilter,
                    url: url.pathname,
                    timestamp: new Date().toISOString(),
                  });
                  // Use fallback data
                  stampsData = { data: [], pagination: { total: 0 } };
                }
              } else {
                /* ===== ALL STAMPS — no type filter ===== */
                try {
                  // Parse all filter parameters from URL
                  const filterPayload = queryParamsToServicePayload(url.search);

                  // Remove undefined values to satisfy TypeScript's exactOptionalPropertyTypes
                  const cleanFilters = Object.fromEntries(
                    Object.entries(filterPayload).filter(([_, v]) =>
                      v !== undefined
                    ),
                  );

                  // Fetch without a type restriction so every art stamp is returned
                  const { type: _type, ...filtersWithoutType } = cleanFilters;

                  const controllerResult = await StampController.getStamps({
                    ...filtersWithoutType,
                    page,
                    limit: page_size,
                    sortBy: sortBy as "ASC" | "DESC",
                    url: url.toString(),
                  });

                  stampsData = {
                    data: Array.isArray(controllerResult.data)
                      ? controllerResult.data
                      : [],
                    pagination: {
                      total: "total" in controllerResult
                        ? (controllerResult.total || 0)
                        : 0,
                      page: "page" in controllerResult
                        ? (controllerResult.page || page)
                        : page,
                      totalPages: "totalPages" in controllerResult
                        ? (controllerResult.totalPages || 0)
                        : 0,
                    },
                  };

                  console.log(
                    `[Stamp Route] All stamps mode: fetched ${
                      stampsData.data?.length || 0
                    } stamps`,
                  );
                } catch (allError) {
                  console.error("[All Stamps Error]:", {
                    message: (allError as Error).message || "Unknown error",
                    url: url.pathname,
                    timestamp: new Date().toISOString(),
                  });
                  stampsData = { data: [], pagination: { total: 0 } };
                }
              }
            } catch (outerError) {
              console.error(
                "[Stamp Fetch Error]",
                (outerError as Error).message || "Unknown error",
              );
              stampsData = { data: [], pagination: { total: 0 } };
            }
          }

          /* ===== RENDER PAGE ===== */
          const displayParam = url.searchParams.get("display");
          const cardView: "detail" | "minimal" = displayParam === "minimal"
            ? "minimal"
            : "detail";

          return ctx.render({
            stamps: stampsData.data || [],
            pagination: stampsData.pagination || { total: 0 },
            recentSales: recentSalesData || [], // Keep for backward compatibility
            filters: queryParamsToFilters(url.search),
            page,
            page_size,
            sortBy,
            // ✅ FIX: Set selectedTab properly like explorer route
            selectedTab: recentSales ? "recent_sales" : "all",
            totalPages: stampsData.pagination?.totalPages ||
              Math.ceil((stampsData.pagination?.total || 0) / page_size),
            cardView,
          });
        })(),
        15000,
      );
    } catch (error) {
      console.error(
        "[Stamp Handler Error]",
        (error as Error).message || "Unknown error",
      );

      // Ultimate fallback
      const displayParamFallback = url.searchParams.get("display");
      return ctx.render({
        stamps: DUMMY_STAMP_OVERVIEW_PAGE.data,
        pagination: DUMMY_STAMP_OVERVIEW_PAGE.pagination,
        recentSales: [],
        filters: queryParamsToFilters(url.search),
        page: 1,
        page_size: 60,
        sortBy: "DESC",
        selectedTab: "all",
        totalPages: 1,
        cardView: displayParamFallback === "minimal" ? "minimal" : "detail",
      });
    }
  },
};

/* ===== PAGE COMPONENT ===== */
export function StampOverviewPage(props: StampPageProps) {
  const {
    stamps,
    page,
    totalPages,
    sortBy: _sortBy,
    selectedTab,
    filters,
    search: _search,
    cardView: cardViewRaw,
  } = props.data;
  const cardView: "detail" | "minimal" = cardViewRaw ?? "detail";
  const stampsArray = Array.isArray(stamps) ? stamps : [];
  const isRecentSales = selectedTab === "recent_sales";

  /* ===== RENDER ===== */
  return (
    <div
      class={containerBackground}
      f-client-nav
      data-partial="/stamp"
    >
      {/* Header Component with Filter Controls */}
      <StampOverviewHeader
        currentFilters={filters as StampFilters}
        viewMode={cardView}
      />

      {/* Main Content with Pagination */}
      <StampOverviewContent
        stamps={stampsArray}
        isRecentSales={isRecentSales}
        pagination={{
          page,
          totalPages,
          // Remove onPageChange to let PaginationButtons component use its built-in Fresh navigation
        }}
        viewMode={cardView}
      />
    </div>
  );
}

export default StampOverviewPage;
