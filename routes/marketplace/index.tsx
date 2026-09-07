/* ===== MARKETPLACE PAGE ===== */

import { FRONTEND_STAMP_TYPE_VALUES } from "$constants";
import { MarketplaceContent } from "$content";
import { Handlers } from "$fresh/server.ts";
import { MarketplaceHeader } from "$header";
import { containerBackground } from "$layout";

import {
  queryParamsToFilters,
  queryParamsToServicePayload,
  StampFilters,
} from "$islands/filter/FilterOptionsMarketplace.tsx";
import type { MarketplacePageProps } from "$types/api.d.ts";
import type { StampRow, StampSaleRow } from "$types/stamp.d.ts";

import {
  DATA_PLACEHOLDER_DEV,
  DATA_PLACEHOLDER_PROD_STAMP_OVERVIEW_PAGE,
} from "$lib/utils/dataPlaceholderProd.ts";
import { ErrorHandlingUtils } from "$lib/utils/errorHandling.ts";
import { StampController } from "$server/controller/stampController.ts";

/* ===== CONSTANTS ===== */
const MAX_PAGE_SIZE = 120;

/* ===== SERVER HANDLER ===== */
export const handler: Handlers = {
  async GET(req: Request, ctx) {
    const url = new URL(req.url);

    if (DATA_PLACEHOLDER_DEV) {
      const {
        DATA_PLACEHOLDER_DEV_STAMP_OVERVIEW_PAGE,
        withDummyActivityLevels,
        withDummySalesData,
      } = await import("$lib/utils/dataPlaceholderDev.ts");
      const typeParam = url.searchParams.get("type") || "all";
      const viewParam = url.searchParams.get("view");
      // Detect sales mode via the market filter (view=sales is no longer supported)
      const isSalesView = url.searchParams.get("market") === "sales";
      const all = DATA_PLACEHOLDER_DEV_STAMP_OVERVIEW_PAGE.data;

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

      const stampsByCurrentType = stampsByType[typeParam] ?? all;
      const cardView: "cardVertical" | "cardSquare" | "cardRow" =
        viewParam === "cardSquare"
          ? "cardSquare"
          : viewParam === "cardRow"
          ? "cardRow"
          : "cardVertical";

      // Show listed-only stamps when in listings mode (no market param OR market=listings)
      const isDummyDefaultMarket =
        (url.searchParams.get("market") === "listings" ||
          !url.searchParams.has("market")) &&
        !isSalesView;

      // In listings mode: only show stamps that have an open dispenser (lowestPriceDispenser set)
      // In sales mode: attach stub sale_data + cycling activity levels
      const stamps = isDummyDefaultMarket
        ? withDummyActivityLevels(
          stampsByCurrentType.filter((s: any) => s.lowestPriceDispenser),
          // activity_level reflects sales recency only, not dispenser state —
          // a listed stamp can legitimately be COLD (no sales yet), so it's
          // included here to match real-world data.
        )
        : isSalesView
        ? withDummyActivityLevels(withDummySalesData(stampsByCurrentType))
        : stampsByCurrentType;

      const dummyFilters = isDummyDefaultMarket
        ? {
          ...queryParamsToFilters(url.search),
          market: "listings" as const,
          dispensers: true,
          listings: "all" as const,
        }
        : queryParamsToFilters(url.search);

      return ctx.render({
        stamps,
        pagination: {
          ...DATA_PLACEHOLDER_DEV_STAMP_OVERVIEW_PAGE.pagination,
          total: stamps.length,
        },
        recentSales: [],
        filters: dummyFilters,
        page: 1,
        page_size: 60,
        sortBy: "DESC",
        selectedTab: isSalesView ? "recent_sales" : typeParam,
        totalPages: 1,
        cardView,
      });
    }

    try {
      return await ErrorHandlingUtils.withTimeout(
        (async () => {
          /* ===== URL PARAMS ===== */
          const page = parseInt(url.searchParams.get("page") || "1");
          const page_size = Math.min(
            parseInt(url.searchParams.get("limit") || "60"),
            MAX_PAGE_SIZE,
          );
          const sortBy = url.searchParams.get("sortBy") || "DESC";

          const marketMode = url.searchParams.get("market") || "";

          const recentSales = marketMode === "sales" ||
            url.searchParams.get("recentSales") === "true";

          const stampType = url.searchParams.get("type") || "all";
          const typeFilter =
            FRONTEND_STAMP_TYPE_VALUES.includes(stampType as any)
              ? stampType
              : "all";

          // Marketplace default: show listings when no market filter is set by user
          const isDefaultMarketState = !url.searchParams.has("market") &&
            !recentSales;

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
            try {
              const result = await StampController.getRecentSales(
                page,
                page_size,
                {
                  dayRange: 30,
                  includeFullDetails: true,
                  type: typeFilter as any,
                },
              );

              const salesResult = result.data || [];
              recentSalesData = (Array.isArray(salesResult)
                ? salesResult.filter((item) =>
                  item !== null
                )
                : []) as unknown as StampSaleRow[];

              recentSalesData.forEach((sale: any, index: number) => {
                if (!sale.stamp_url) {
                  console.warn(
                    `[Marketplace] Sale ${index} missing stamp_url. Received data:`,
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

              stampsData = {
                data: recentSalesData.map((sale: any) => {
                  if (
                    !sale.stamp_url || sale.stamp_url === "" ||
                    sale.stamp_url.includes("undefined") ||
                    sale.stamp_url.includes("null")
                  ) {
                    console.warn(
                      `[Marketplace] Invalid stamp_url for stamp ${sale.stamp}: "${sale.stamp_url}". Using fallback.`,
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
                    stamp_url: (sale.stamp_url && sale.stamp_url !== "" &&
                        !sale.stamp_url.includes("undefined") &&
                        !sale.stamp_url.includes("null"))
                      ? sale.stamp_url
                      : `/s/${sale.stamp}`,
                    stamp_mimetype: sale.stamp_mimetype || "",
                    stamp_hash: "",
                    file_hash: "",
                    file_size_bytes: sale.file_size_bytes ?? null,
                    ident: "STAMP" as const,
                    creator: sale.creator || sale.source,
                    creator_name: sale.creator_name,
                    divisible: false,
                    keyburn: null,
                    locked: 0,
                    supply: sale.dispense_quantity || 1,
                    unbound_quantity: sale.dispense_quantity || 1,
                    // StampController.getRecentSales returns flat sale
                    // fields (btc_amount, buyer_address, etc.) — nest them
                    // into the canonical sale_data shape (StampSaleData,
                    // $types/stamp.d.ts) so StampSales.tsx (which only ever
                    // reads stamp.sale_data.*) and StampCard (which reads
                    // stamp.sale_data directly) get the same data.
                    sale_data: {
                      btc_amount: sale.btc_amount,
                      block_index: sale.block_index,
                      tx_hash: sale.tx_hash,
                      buyer_address: sale.buyer_address,
                      seller_address: sale.seller_address,
                      dispenser_address: sale.dispenser_address,
                      dispenser_tx_hash: sale.dispenser_tx_hash,
                      sale_time: sale.sale_time ?? null,
                      time_ago: sale.time_ago,
                      btc_amount_satoshis: sale.btc_amount_satoshis,
                      dispense_quantity: sale.dispense_quantity,
                      usd_price: sale.usd_price,
                      sale_type: sale.sale_type,
                    },
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
                `[Marketplace] Recent sales mode: fetched ${recentSalesData.length} sales`,
              );
            } catch (recentSalesError) {
              console.error(
                "[Marketplace Recent Sales Error]",
                (recentSalesError as Error).message || "Unknown error",
              );
              stampsData = { data: [], pagination: { total: 0 } };
              recentSalesData = [];
            }
          } else {
            try {
              if (typeFilter !== "all") {
                /* ===== TYPE-BASED STAMP FILTERING ===== */
                try {
                  const filterPayload = queryParamsToServicePayload(url.search);

                  const cleanFilters = Object.fromEntries(
                    Object.entries(filterPayload).filter(([_, v]) =>
                      v !== undefined
                    ),
                  );

                  if (isDefaultMarketState) {
                    cleanFilters.market = "listings";
                    cleanFilters.dispensers = true;
                    cleanFilters.listings = "all";
                  }

                  const controllerResult = await StampController.getStamps({
                    ...cleanFilters,
                    page,
                    limit: page_size,
                    sortBy: sortBy as "ASC" | "DESC",
                    type: typeFilter as any,
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
                    `[Marketplace] Type filtering mode: fetched ${
                      stampsData.data?.length || 0
                    } stamps for type '${typeFilter}'`,
                  );
                } catch (typeError) {
                  console.error("[Marketplace Type Filtering Error]:", {
                    message: (typeError as Error).message || "Unknown error",
                    type: typeFilter,
                    url: url.pathname,
                    timestamp: new Date().toISOString(),
                  });
                  stampsData = { data: [], pagination: { total: 0 } };
                }
              } else {
                /* ===== ALL STAMPS — no type filter ===== */
                try {
                  const filterPayload = queryParamsToServicePayload(url.search);

                  const cleanFilters = Object.fromEntries(
                    Object.entries(filterPayload).filter(([_, v]) =>
                      v !== undefined
                    ),
                  );

                  if (isDefaultMarketState) {
                    cleanFilters.market = "listings";
                    cleanFilters.dispensers = true;
                    cleanFilters.listings = "all";
                  }

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
                    `[Marketplace] All stamps mode: fetched ${
                      stampsData.data?.length || 0
                    } stamps`,
                  );
                } catch (allError) {
                  console.error("[Marketplace All Stamps Error]:", {
                    message: (allError as Error).message || "Unknown error",
                    url: url.pathname,
                    timestamp: new Date().toISOString(),
                  });
                  stampsData = { data: [], pagination: { total: 0 } };
                }
              }
            } catch (outerError) {
              console.error(
                "[Marketplace Fetch Error]",
                (outerError as Error).message || "Unknown error",
              );
              stampsData = { data: [], pagination: { total: 0 } };
            }
          }

          /* ===== RENDER PAGE ===== */
          const viewParam = url.searchParams.get("view");
          const cardView: "cardVertical" | "cardSquare" | "cardRow" =
            viewParam === "cardSquare"
              ? "cardSquare"
              : viewParam === "cardRow"
              ? "cardRow"
              : "cardVertical";

          const effectiveFilters = isDefaultMarketState
            ? {
              ...queryParamsToFilters(url.search),
              market: "listings" as const,
              dispensers: true,
              listings: "all" as const,
            }
            : queryParamsToFilters(url.search);

          return ctx.render({
            stamps: stampsData.data || [],
            pagination: stampsData.pagination || { total: 0 },
            recentSales: recentSalesData || [],
            filters: effectiveFilters,
            page,
            page_size,
            sortBy,
            selectedTab: recentSales ? "recent_sales" : "all",
            totalPages: stampsData.pagination?.totalPages ||
              Math.ceil((stampsData.pagination?.total || 0) / page_size),
            cardView,
          });
        })(),
        15000,
        "DB timeout after 15000ms",
      );
    } catch (error) {
      console.error(
        "[Marketplace Handler Error]",
        (error as Error).message || "Unknown error",
      );

      const viewParamFallback = url.searchParams.get("view");
      const fallbackIsDefaultMarket = !url.searchParams.has("market") &&
        url.searchParams.get("recentSales") !== "true";
      const fallbackFilters = fallbackIsDefaultMarket
        ? {
          ...queryParamsToFilters(url.search),
          market: "listings" as const,
          dispensers: true,
          listings: "all" as const,
        }
        : queryParamsToFilters(url.search);

      return ctx.render({
        ...DATA_PLACEHOLDER_PROD_STAMP_OVERVIEW_PAGE,
        filters: fallbackFilters,
        cardView: viewParamFallback === "cardSquare"
          ? "cardSquare"
          : viewParamFallback === "cardRow"
          ? "cardRow"
          : "cardVertical",
      });
    }
  },
};

/* ===== PAGE COMPONENT ===== */
export function MarketplacePage(props: MarketplacePageProps) {
  const {
    stamps,
    page,
    totalPages,
    pagination,
    sortBy,
    selectedTab,
    filters,
    search: _search,
    cardView: cardViewRaw,
  } = props.data;
  const cardView: "cardVertical" | "cardSquare" | "cardRow" =
    cardViewRaw === "cardSquare"
      ? "cardSquare"
      : cardViewRaw === "cardRow"
      ? "cardRow"
      : "cardVertical";
  const stampsArray = Array.isArray(stamps) ? stamps : [];
  const isRecentSales = selectedTab === "recent_sales";
  const isSalesMode = isRecentSales;

  /* ===== RENDER ===== */
  return (
    <div
      class={containerBackground}
      f-client-nav
      data-partial="/marketplace"
    >
      {/* Header Component with Filter Controls */}
      <MarketplaceHeader
        currentFilters={filters as StampFilters}
        viewMode={cardView}
        isSalesMode={isSalesMode}
        currentTotal={pagination?.total ?? 0}
        sortBy={sortBy as "ASC" | "DESC"}
      />

      {/* Main Content with Pagination */}
      <MarketplaceContent
        stamps={stampsArray}
        isRecentSales={isRecentSales}
        pagination={{
          page,
          totalPages,
        }}
        viewMode={cardView}
      />
    </div>
  );
}

export default MarketplacePage;
