/* ===== EXPLORER PAGE ===== */
import { ExplorerContent } from "$content";
import { Handlers } from "$fresh/server.ts";
import { containerBackground } from "$layout";
import type { SUBPROTOCOLS } from "$types/base.d.ts";

import type {
  StampEdition,
  StampFiletype,
  StampFilterType,
  StampRange,
  StampType,
} from "$constants";
import type { MixedItem } from "$components/table/explorerTable/ExplorerTableBase.tsx";
import { ExplorerHeader } from "$header";
import { queryParamsToServicePayload } from "$islands/filter/FilterOptionsExplorerStamp.tsx";
import {
  DATA_PLACEHOLDER_DEV,
  DATA_PLACEHOLDER_PROD_EXPLORER_OVERVIEW_PAGE,
} from "$lib/utils/dataPlaceholderProd.ts";
import { ErrorHandlingUtils } from "$lib/utils/errorHandling.ts";
import { StampController } from "$server/controller/stampController.ts";
import { ExplorerFeedRepository } from "$server/database/explorerFeedRepository.ts";
import { CollectionService } from "$server/services/core/collectionService.ts";
import { SRC20Service } from "$server/services/src20/index.ts";
import type { StampPageProps } from "$types/api.d.ts";
import type { StampRow } from "$types/stamp.d.ts";
import type { SRC20Row } from "$types/src20.d.ts";

/* ===== CONSTANTS ===== */
const MAX_PAGE_SIZE = 120;

/* ===== HELPERS ===== */
/**
 * StampController.getRecentSales returns flat sale fields (btc_amount,
 * buyer_address, etc.) rather than nesting them under `sale_data`. Nest
 * them into the canonical shape (StampSaleData, $types/stamp.d.ts) here
 * instead of passing the flat controller shape straight through, so
 * StampCard can read `stamp.sale_data` directly without a flat-field
 * fallback.
 */
function nestRecentSaleData(sale: any) {
  return {
    ...sale,
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
}

function extractSrc20Rows(
  result: unknown,
): { data: SRC20Row[]; total: number; page: number; totalPages: number } {
  const r = result as {
    data?: unknown[];
    total?: number;
    page?: number;
    totalPages?: number;
  };
  const data = Array.isArray(r?.data) ? (r.data as SRC20Row[]) : [];
  return {
    data,
    total: r?.total ?? data.length,
    page: r?.page ?? 1,
    totalPages: r?.totalPages ?? 1,
  };
}

/* ===== SERVER HANDLER ===== */
export const handler: Handlers = {
  async GET(req: Request, ctx) {
    const url = new URL(req.url);
    console.log("[Explorer Handler]", {
      url: url.toString(),
      pathname: url.pathname,
      params: Object.fromEntries(url.searchParams),
    });

    // Only process requests for /explorer route
    if (
      url.searchParams.has("_fresh") && !url.pathname.startsWith("/explorer")
    ) {
      return new Response(null, { status: 204 });
    }

    // Read section early so it is available in every render path (DEV, try, catch)
    const section = (url.searchParams.get("section") || "all") as
      | "all"
      | "stamps"
      | "tokens";

    // Read card view mode — "sales" is handled separately via recentSales
    const viewParam = url.searchParams.get("view");
    const cardView: "cardVertical" | "cardSquare" | "cardRow" =
      viewParam === "cardSquare"
        ? "cardSquare"
        : viewParam === "cardRow"
        ? "cardRow"
        : "cardVertical";

    if (DATA_PLACEHOLDER_DEV) {
      const {
        DATA_PLACEHOLDER_DEV_EXPLORER_OVERVIEW_PAGE,
        DATA_PLACEHOLDER_DEV_STAMP_OVERVIEW_PAGE,
        getDummyExplorerFeedItems,
      } = await import("$lib/utils/dataPlaceholderDev.ts");
      const selectedTab = (url.searchParams.get("type") || "all") as StampType;
      const all = DATA_PLACEHOLDER_DEV_STAMP_OVERVIEW_PAGE.data;
      const stampsByType: Record<string, typeof all> = {
        all,
        classic: all.filter((s) =>
          s.ident === "STAMP" && s.cpid.startsWith("A") && s.stamp >= 0
        ),
        posh: all.filter((s) => s.ident === "STAMP" && !s.cpid.startsWith("A")),
        cursed: all.filter((s) => s.stamp < 0),
        "src-721": all.filter((s) => s.ident === "SRC-721"),
      };

      let stamps = section === "tokens"
        ? []
        : (stampsByType[selectedTab] ?? all);

      // DEV: apply stamp range filter (covers ALL and STAMPS sections)
      const rangeParam = url.searchParams.get("range");
      const rangeMinParam = url.searchParams.get("rangeMin");
      const rangeMaxParam = url.searchParams.get("rangeMax");

      if (rangeParam && rangeParam !== "custom") {
        stamps = stamps.filter((s) => s.stamp < parseInt(rangeParam));
      } else if (rangeMinParam || rangeMaxParam) {
        const lo = rangeMinParam ? parseInt(rangeMinParam) : -Infinity;
        const hi = rangeMaxParam ? parseInt(rangeMaxParam) : Infinity;
        stamps = stamps.filter((s) => s.stamp >= lo && s.stamp <= hi);
      }

      let src20Data = section === "stamps"
        ? null
        : DATA_PLACEHOLDER_DEV_EXPLORER_OVERVIEW_PAGE;

      if (src20Data) {
        // DEV: apply token op filter
        const tokenOpParam = url.searchParams.get("tokenOp");
        if (tokenOpParam) {
          src20Data = {
            ...src20Data,
            data: src20Data.data.filter(
              (s) => s.op?.toLowerCase() === tokenOpParam,
            ),
          };
        }

        // DEV: apply token range filter (st.stamp)
        const tokenRangePreset = url.searchParams.get("tokenRange");
        const tokenRangeMin = url.searchParams.get("tokenRangeMin");
        const tokenRangeMax = url.searchParams.get("tokenRangeMax");

        if (tokenRangePreset && tokenRangePreset !== "custom") {
          const max = parseInt(tokenRangePreset);
          src20Data = {
            ...src20Data,
            data: src20Data.data.filter(
              (s) =>
                ((s as unknown as Record<string, unknown>).stamp as number ??
                  Infinity) < max,
            ),
          };
        } else if (tokenRangeMin || tokenRangeMax) {
          const lo = tokenRangeMin ? parseInt(tokenRangeMin) : -Infinity;
          const hi = tokenRangeMax ? parseInt(tokenRangeMax) : Infinity;
          src20Data = {
            ...src20Data,
            data: src20Data.data.filter((s) => {
              const stamp =
                (s as unknown as Record<string, unknown>).stamp as number ?? 0;
              return stamp >= lo && stamp <= hi;
            }),
          };
        }

        // DEV: apply token amount filter
        const tokenAmountParam = url.searchParams.get("tokenAmount");
        if (tokenAmountParam) {
          const maxAmt = parseInt(tokenAmountParam.replace("<", ""));
          src20Data = {
            ...src20Data,
            data: src20Data.data.filter(
              (s) =>
                parseFloat(
                  (s as unknown as Record<string, unknown>).amt as string ??
                    "0",
                ) <= maxAmt,
            ),
          };
        }
      }

      // Mirror production's unified feed for section=all: pre-mix stamps +
      // tokens block_index-descending so the dev preview exercises the
      // same `mixedItems` rendering path (ExplorerContent otherwise falls
      // back to its own client-side merge for `section=stamps`/`tokens`,
      // matching the real DB-backed path too).
      const mixedItems = section === "all"
        ? getDummyExplorerFeedItems(stamps, src20Data?.data ?? [])
        : undefined;

      return ctx.render({
        stamps,
        mixedItems,
        pagination: {
          ...DATA_PLACEHOLDER_DEV_STAMP_OVERVIEW_PAGE.pagination,
          total: stamps.length,
        },
        total: stamps.length,
        src20DataCard: src20Data,
        page: 1,
        limit: 60,
        totalPages: 1,
        filterBy: [],
        sortBy: "DESC",
        selectedTab,
        section,
        cardView,
        partial: false,
      });
    }

    try {
      /* ===== QUERY PARAMETERS ===== */
      const sortBy = url.searchParams.get("sortBy") || "DESC";
      const filterBy = url.searchParams.get("filterBy")
        ? (url.searchParams.get("filterBy")?.split(",").filter(
          Boolean,
        ) as StampFilterType[])
        : [];
      const selectedTab = (url.searchParams.get("type") || "all") as StampType;
      const page = parseInt(url.searchParams.get("page") || "1");
      const requestedPageSize = parseInt(url.searchParams.get("limit") || "60");
      const page_size = Math.min(requestedPageSize, MAX_PAGE_SIZE);
      const recentSales = url.searchParams.get("recentSales") === "true";

      /* ===== DATA FETCHING ===== */
      // Fetch stamps and SRC-20 transactions in parallel.
      // Stamps explicitly exclude SRC-20 ident so those appear only as SRC20Card.
      const NON_SRC20_IDENTS: SUBPROTOCOLS[] = ["STAMP", "SRC-721", "SRC-101"];

      // Build full stamp filter payload from URL (reads range, filetype,
      // editions, market, listings, sales, type, etc.)
      const stampFiltersPayload = queryParamsToServicePayload(url.search);
      const cleanStampFilters = Object.fromEntries(
        Object.entries(stampFiltersPayload).filter(([, v]) => v !== undefined),
      );

      // Token filter params from URL
      const tokenOp = url.searchParams.get("tokenOp") || undefined;
      const tokenRangeParam = url.searchParams.get("tokenRange");
      const tokenRangeMin = url.searchParams.get("tokenRangeMin");
      const tokenRangeMax = url.searchParams.get("tokenRangeMax");
      const stampMax = tokenRangeParam && tokenRangeParam !== "custom"
        ? parseInt(tokenRangeParam)
        : tokenRangeMax
        ? parseInt(tokenRangeMax)
        : undefined;
      const stampMin = tokenRangeMin ? parseInt(tokenRangeMin) : undefined;
      const tokenAmountParam = url.searchParams.get("tokenAmount");
      const amtMax = tokenAmountParam
        ? tokenAmountParam.replace("<", "")
        : undefined;

      let stampResult;
      let src20Result: {
        data: SRC20Row[];
        total: number;
        page: number;
        totalPages: number;
      } = { data: [], total: 0, page: 1, totalPages: 1 };

      if (recentSales) {
        // Recent sales view — SRC-20 excluded by design
        const recentSalesType = selectedTab === "src20" ? "all" : selectedTab;
        [stampResult] = await Promise.all([
          ErrorHandlingUtils.withTimeout(
            StampController.getRecentSales(page, page_size, {
              type: recentSalesType === "all" ? "all" : recentSalesType,
            }),
            15000,
            "DB timeout after 15000ms",
          ),
        ]);
        // StampController.getRecentSales returns flat sale fields
        // (btc_amount, buyer_address, etc.) — nest them into sale_data so
        // StampCard can read stamp.sale_data directly.
        stampResult = {
          ...stampResult,
          data: (Array.isArray(stampResult.data) ? stampResult.data : [])
            .map(nestRecentSaleData),
        };
      } else {
        // Regular stamp listing + SRC-20 transactions in parallel.
        // Skip each fetch when the section selector excludes it.
        let collectionId;

        if (selectedTab === "posh" && section !== "tokens") {
          const poshCollection = await ErrorHandlingUtils.withTimeout(
            CollectionService.getCollectionByName("posh"),
            15000,
            "DB timeout after 15000ms",
          );
          if (poshCollection) {
            collectionId = poshCollection.collection_id;
          } else {
            throw new Error("Posh collection not found");
          }
        }

        // Marketplace-only filters (dispensers, listings, sales, volume,
        // Task 42 market-data filters) need `stamp_market_data` /
        // `stamp_sales_history` joins that the unified feed's lightweight
        // ordering query (ExplorerFeedRepository) doesn't build — fall back
        // to the legacy independently-paginated fetch+merge below when any
        // of those are active. They're inherently stamp-only concepts
        // anyway (a SRC-20 mint has no "dispenser" or "floor price").
        const filtersRecord = cleanStampFilters as Record<string, unknown>;
        const usesAdvancedMarketplaceFilters = !!(
          filtersRecord.market ||
          filtersRecord.dispensers ||
          filtersRecord.atomics ||
          filtersRecord.listings ||
          filtersRecord.listingsMin ||
          filtersRecord.listingsMax ||
          filtersRecord.sales ||
          filtersRecord.salesMin ||
          filtersRecord.salesMax ||
          filtersRecord.volume ||
          filtersRecord.volumeMin ||
          filtersRecord.volumeMax ||
          filtersRecord.fileSize ||
          filtersRecord.fileSizeMin ||
          filtersRecord.fileSizeMax ||
          filtersRecord.minHolderCount ||
          filtersRecord.maxHolderCount ||
          filtersRecord.minDistributionScore ||
          filtersRecord.maxTopHolderPercentage ||
          filtersRecord.minFloorPriceBTC ||
          filtersRecord.maxFloorPriceBTC ||
          filtersRecord.minVolume24h ||
          filtersRecord.minPriceChange24h ||
          filtersRecord.minDataQualityScore ||
          filtersRecord.maxCacheAgeMinutes ||
          filtersRecord.priceSource
        );

        if (section === "all" && !usesAdvancedMarketplaceFilters) {
          /* ===== UNIFIED FEED — stamps + tokens interwoven by tx order =====
           * Single DB-level ordering query (UNION ALL across StampTableV4 and
           * SRC20Valid) drives sort + pagination, then hydrate full row data
           * for just the tx_hashes on this page. See ExplorerFeedRepository. */
          const feedPage = await ErrorHandlingUtils.withTimeout(
            ExplorerFeedRepository.getFeedPage({
              page,
              limit: page_size,
              type: selectedTab,
              ident: NON_SRC20_IDENTS,
              collectionId,
              filterBy,
              fileType: filtersRecord.fileType as StampFiletype[] | undefined,
              editions: filtersRecord.editions as StampEdition[] | undefined,
              range: filtersRecord.range as StampRange | undefined,
              rangeMin: filtersRecord.rangeMin as string | undefined,
              rangeMax: filtersRecord.rangeMax as string | undefined,
              tokenOp: tokenOp?.toUpperCase(),
              stampMin,
              stampMax,
              amtMax,
            }),
            15000,
            "DB timeout after 15000ms",
          );

          const stampTxHashes = feedPage.data
            .filter((row) => row.kind === "stamp")
            .map((row) => row.tx_hash);
          const tokenTxHashes = feedPage.data
            .filter((row) => row.kind === "src20")
            .map((row) => row.tx_hash);

          const [hydratedStamps, hydratedTokens] = await Promise.all([
            stampTxHashes.length > 0
              ? ErrorHandlingUtils.withTimeout(
                StampController.getStamps({
                  identifier: stampTxHashes,
                  ident: NON_SRC20_IDENTS,
                  limit: stampTxHashes.length,
                  noPagination: true,
                  skipTotalCount: true,
                  url: url.origin,
                }),
                15000,
                "DB timeout after 15000ms",
              )
              : Promise.resolve({ data: [] as StampRow[] }),
            tokenTxHashes.length > 0
              ? ErrorHandlingUtils.withTimeout(
                SRC20Service.QueryService.fetchBasicSrc20Data({
                  tx_hash: tokenTxHashes,
                  limit: tokenTxHashes.length,
                  page: 1,
                }).then(extractSrc20Rows),
                15000,
                "DB timeout after 15000ms",
              )
              : Promise.resolve(
                { data: [] as SRC20Row[], total: 0, page: 1, totalPages: 1 },
              ),
          ]);

          const stampByHash = new Map<string, StampRow>(
            (hydratedStamps.data ?? []).map((
              s: StampRow,
            ) => [s.tx_hash, s]),
          );
          const tokenByHash = new Map<string, SRC20Row>(
            (hydratedTokens.data ?? []).map((
              t: SRC20Row,
            ) => [t.tx_hash, t]),
          );

          const mixedItems: MixedItem[] = feedPage.data
            .map((row): MixedItem | null => {
              if (row.kind === "stamp") {
                const stamp = stampByHash.get(row.tx_hash);
                return stamp ? { kind: "stamp", item: stamp } : null;
              }
              const token = tokenByHash.get(row.tx_hash);
              return token ? { kind: "src20", item: token } : null;
            })
            .filter((entry): entry is MixedItem => entry !== null);

          return ctx.render({
            stamps: [],
            mixedItems,
            total: feedPage.totalStamps,
            totalPages: feedPage.totalPages,
            filterBy,
            sortBy,
            selectedTab,
            page,
            limit: page_size,
            src20DataCard: {
              data: [],
              total: feedPage.totalTokens,
              page,
              totalPages: feedPage.totalPages,
            },
            section,
            cardView,
            partial: url.searchParams.has("_fresh"),
          });
        }

        const stampFetch = section === "tokens"
          ? Promise.resolve({ data: [], total: 0, page: 1, totalPages: 1 })
          : ErrorHandlingUtils.withTimeout(
            StampController.getStamps({
              ...cleanStampFilters, // filter payload from URL (range, fileType, etc.)
              page,
              limit: page_size,
              sortBy: sortBy as "DESC" | "ASC",
              type: selectedTab,
              filterBy,
              ident: NON_SRC20_IDENTS, // always exclude SRC-20 ident
              collectionId,
              url: url.origin,
            }),
            15000,
            "DB timeout after 15000ms",
          );

        const src20Fetch = section === "stamps"
          ? Promise.resolve({ data: [], total: 0, page: 1, totalPages: 1 })
          : ErrorHandlingUtils.withTimeout(
            SRC20Service.QueryService.fetchBasicSrc20Data({
              limit: page_size,
              page,
              // "BLOCK_DESC" is the string form getValidSrc20TxFromDb
              // recognizes for `ORDER BY block_index DESC` — the previous
              // { field: "block_index", direction: "desc" } object shape
              // normalizes to "BLOCK_INDEX_DESC", which isn't a recognized
              // sort key, so it silently fell back to block_index ASC
              // (oldest-first) instead of the intended recent-first order.
              sortBy: "BLOCK_DESC",
              ...(tokenOp && { op: tokenOp.toUpperCase() }),
              ...(stampMax != null && { stampMax }),
              ...(stampMin != null && { stampMin }),
              ...(amtMax && { amtMax }),
            }).then(extractSrc20Rows),
            15000,
            "DB timeout after 15000ms",
          );

        [stampResult, src20Result] = await Promise.all([
          stampFetch,
          src20Fetch,
        ]);
      }

      /* ===== RESPONSE FORMATTING ===== */
      const { data: stamps = [], ...restResult } = stampResult;
      // The "section" filter can exclude stamps or tokens from the fetch
      // entirely (stubbed to totalPages: 1 above), so the pager must read
      // totalPages from whichever dataset(s) are actually shown — otherwise
      // switching to the TOKENS-only filter always hides pagination.
      const stampTotalPages =
        (restResult as { totalPages?: number }).totalPages ?? 1;
      const tokenTotalPages = src20Result.totalPages ?? 1;
      const totalPages = recentSales || section === "stamps"
        ? stampTotalPages
        : section === "tokens"
        ? tokenTotalPages
        : Math.max(stampTotalPages, tokenTotalPages);
      const data = {
        ...restResult,
        totalPages,
        stamps: Array.isArray(stamps) ? stamps : [],
        filterBy,
        sortBy,
        selectedTab: recentSales ? "recent_sales" : selectedTab,
        page,
        limit: page_size,
        src20DataCard: src20Result,
        section,
        cardView,
      };

      return ctx.render({
        ...data,
        partial: url.searchParams.has("_fresh"),
      });
    } catch (error) {
      console.error(error);
      // Preserve the requested section/tab/view so the selector buttons and
      // empty-state messages stay in sync with the URL even when the
      // underlying data fetch fails (e.g. DB unavailable) — otherwise every
      // failed request falls back to the same "all" defaults, making it
      // look like the section/tab selection isn't taking effect.
      const selectedTab = (url.searchParams.get("type") || "all") as StampType;
      const recentSales = url.searchParams.get("recentSales") === "true";
      return ctx.render({
        ...DATA_PLACEHOLDER_PROD_EXPLORER_OVERVIEW_PAGE,
        stamps: [],
        pagination: { total: 0 },
        page: 1,
        totalPages: 0,
        filterBy: [],
        sortBy: "DESC",
        selectedTab: recentSales ? "recent_sales" : selectedTab,
        src20DataCard: { data: [], total: 0, page: 1, totalPages: 0 },
        section,
        cardView,
        partial: url.searchParams.has("_fresh"),
      });
    }
  },
};

/* ===== PAGE COMPONENT ===== */
export function ExplorerPage(props: StampPageProps) {
  const {
    stamps,
    mixedItems,
    page,
    totalPages,
    total,
    filterBy: _filterBy,
    sortBy,
    selectedTab,
    src20DataCard,
    section = "all",
    cardView = "cardVertical",
  } = props.data;

  const stampsArray = Array.isArray(stamps) ? stamps : [];
  const isRecentSales = selectedTab === "recent_sales";

  /* ===== RENDER ===== */
  return (
    <div
      class={containerBackground}
      f-client-nav
      data-partial="/explorer"
    >
      {/* Header Component with Filter Controls */}
      <ExplorerHeader
        currentSection={section}
        viewMode={cardView}
        stampsTotal={total ?? 0}
        tokensTotal={src20DataCard?.total ?? 0}
        sortBy={sortBy as "ASC" | "DESC"}
      />

      {/* Main Content with Pagination */}
      <ExplorerContent
        stamps={stampsArray}
        mixedItems={mixedItems}
        isRecentSales={isRecentSales}
        src20DataCard={src20DataCard ?? null}
        section={section}
        viewMode={cardView}
        pagination={{
          page,
          totalPages,
        }}
      />
    </div>
  );
}

export default ExplorerPage;
