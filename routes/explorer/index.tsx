/* ===== EXPLORER PAGE ===== */
import { ExplorerContent } from "$content";
import { Handlers } from "$fresh/server.ts";
import { containerBackground } from "$layout";
import type { SUBPROTOCOLS } from "$types/base.d.ts";

import type { StampFilterType, StampType } from "$constants";
import { ExplorerHeader } from "$header";
import {
  DEV_DUMMY_MODE,
  DUMMY_EXPLORER_OVERVIEW_PAGE,
  DUMMY_STAMP_OVERVIEW_PAGE,
  withTimeout,
} from "$lib/utils/devDummyData.ts";
import { StampController } from "$server/controller/stampController.ts";
import { CollectionService } from "$server/services/core/collectionService.ts";
import { SRC20Service } from "$server/services/src20/index.ts";
import type { StampPageProps } from "$types/api.d.ts";
import type { SRC20Row } from "$types/src20.d.ts";

/* ===== CONSTANTS ===== */
const MAX_PAGE_SIZE = 120;

/* ===== HELPERS ===== */
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
    const cardView: "detail" | "minimal" | "row" = viewParam === "minimal"
      ? "minimal"
      : viewParam === "row"
      ? "row"
      : "detail";

    if (DEV_DUMMY_MODE) {
      const selectedTab = (url.searchParams.get("type") || "all") as StampType;
      const all = DUMMY_STAMP_OVERVIEW_PAGE.data;
      const stampsByType: Record<string, typeof all> = {
        all,
        classic: all.filter((s) =>
          s.ident === "STAMP" && s.cpid.startsWith("A") && s.stamp >= 0
        ),
        posh: all.filter((s) => s.ident === "STAMP" && !s.cpid.startsWith("A")),
        cursed: all.filter((s) => s.stamp < 0),
        "src-721": all.filter((s) => s.ident === "SRC-721"),
      };
      const stamps = section === "tokens"
        ? []
        : (stampsByType[selectedTab] ?? all);
      return ctx.render({
        stamps,
        pagination: {
          ...DUMMY_STAMP_OVERVIEW_PAGE.pagination,
          total: stamps.length,
        },
        src20DataCard: section === "stamps" ? null : DUMMY_EXPLORER_OVERVIEW_PAGE,
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
      const viewMode = url.searchParams.get("view") || "all";
      const recentSales = viewMode === "sales" ||
        url.searchParams.get("recentSales") === "true";

      /* ===== DATA FETCHING ===== */
      // Fetch stamps and SRC-20 transactions in parallel.
      // Stamps explicitly exclude SRC-20 ident so those appear only as SRC20Card.
      const NON_SRC20_IDENTS: SUBPROTOCOLS[] = ["STAMP", "SRC-721", "SRC-101"];

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
          withTimeout(
            StampController.getRecentSales(page, page_size, {
              type: recentSalesType === "all" ? "all" : recentSalesType,
            }),
            15000,
          ),
        ]);
      } else {
        // Regular stamp listing + SRC-20 transactions in parallel.
        // Skip each fetch when the section selector excludes it.
        let collectionId;

        if (selectedTab === "posh" && section !== "tokens") {
          const poshCollection = await withTimeout(
            CollectionService.getCollectionByName("posh"),
            15000,
          );
          if (poshCollection) {
            collectionId = poshCollection.collection_id;
          } else {
            throw new Error("Posh collection not found");
          }
        }

        const stampFetch = section === "tokens"
          ? Promise.resolve({ data: [], total: 0, page: 1, totalPages: 1 })
          : withTimeout(
            StampController.getStamps({
              page,
              limit: page_size,
              sortBy: sortBy as "DESC" | "ASC",
              type: selectedTab,
              filterBy,
              ident: NON_SRC20_IDENTS,
              collectionId,
              url: url.origin,
            }),
            15000,
          );

        const src20Fetch = section === "stamps"
          ? Promise.resolve({ data: [], total: 0, page: 1, totalPages: 1 })
          : withTimeout(
            SRC20Service.QueryService.fetchBasicSrc20Data(
              {
                limit: page_size,
                page,
                sortBy: { field: "block_index", direction: "desc" },
              },
            ).then(extractSrc20Rows),
            15000,
          );

        [stampResult, src20Result] = await Promise.all([
          stampFetch,
          src20Fetch,
        ]);
      }

      /* ===== RESPONSE FORMATTING ===== */
      const { data: stamps = [], ...restResult } = stampResult;
      const data = {
        ...restResult,
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
      return ctx.render({
        stamps: DUMMY_STAMP_OVERVIEW_PAGE.data,
        pagination: DUMMY_STAMP_OVERVIEW_PAGE.pagination,
        src20DataCard: DUMMY_EXPLORER_OVERVIEW_PAGE,
        page: 1,
        limit: 60,
        totalPages: 1,
        filterBy: [],
        sortBy: "DESC",
        selectedTab: "all",
        section,
        cardView,
        partial: false,
      });
    }
  },
};

/* ===== PAGE COMPONENT ===== */
export function ExplorerPage(props: StampPageProps) {
  const {
    stamps,
    page,
    totalPages,
    filterBy: _filterBy,
    sortBy: _sortBy,
    selectedTab,
    src20DataCard,
    section = "all",
    cardView = "detail",
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
      />

      {/* Main Content with Pagination */}
      <ExplorerContent
        stamps={stampsArray}
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
