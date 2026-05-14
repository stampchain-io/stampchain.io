/* ===== EXPLORER PAGE ===== */
import { ExplorerContent } from "$content";
import { Handlers } from "$fresh/server.ts";
import { body } from "$layout";
import type { SUBPROTOCOLS } from "$types/base.d.ts";

import type { StampFilterType, StampType } from "$constants";
import { ExplorerHeader } from "$header";
import { StampController } from "$server/controller/stampController.ts";
import { CollectionService } from "$server/services/core/collectionService.ts";
import {
  DEV_DUMMY_MODE,
  DUMMY_STAMP_OVERVIEW_PAGE,
  withTimeout,
} from "$lib/utils/devDummyData.ts";
import type { StampPageProps } from "$types/api.d.ts";

/* ===== CONSTANTS ===== */
const MAX_PAGE_SIZE = 120;

/* ===== SERVER HANDLER ===== */
export const handler: Handlers = {
  async GET(req: Request, ctx) {
    const url = new URL(req.url);
    console.log("[Stamp Handler]", {
      url: url.toString(),
      pathname: url.pathname,
      params: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(req.headers),
    });

    // Only process requests for /stamp route
    if (url.searchParams.has("_fresh") && !url.pathname.startsWith("/stamp")) {
      return new Response(null, { status: 204 });
    }

    if (DEV_DUMMY_MODE) {
      return ctx.render({
        stamps: DUMMY_STAMP_OVERVIEW_PAGE.data,
        pagination: DUMMY_STAMP_OVERVIEW_PAGE.pagination,
        page: 1,
        limit: 60,
        totalPages: 1,
        filterBy: [],
        sortBy: "DESC",
        selectedTab: "all",
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
      // Handle both new view parameter and legacy recentSales parameter
      const viewMode = url.searchParams.get("view") || "all";
      const recentSales = viewMode === "sales" ||
        url.searchParams.get("recentSales") === "true";

      /* ===== DATA FETCHING ===== */
      let result;
      if (recentSales) {
        // Handle recent sales view with type filtering
        // Note: SRC-20 excluded from recent sales as they're handled separately in the app
        const recentSalesType = selectedTab === "src20" ? "all" : selectedTab;
        result = await withTimeout(
          StampController.getRecentSales(page, page_size, {
            type: recentSalesType === "all" ? "all" : recentSalesType,
          }),
          15000,
        );
      } else {
        // Handle regular stamp listing
        const ident: SUBPROTOCOLS[] = [];
        let collectionId;

        // Special handling for POSH stamps
        if (selectedTab === "posh") {
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

        // Fetch stamps with filters
        result = await withTimeout(
          StampController.getStamps({
            page,
            limit: page_size,
            sortBy: sortBy as "DESC" | "ASC",
            type: selectedTab,
            filterBy,
            ident,
            collectionId,
            url: url.origin,
          }),
          15000,
        );
      }

      /* ===== RESPONSE FORMATTING ===== */
      const { data: stamps = [], ...restResult } = result;
      const data = {
        ...restResult,
        stamps: Array.isArray(stamps) ? stamps : [],
        filterBy,
        sortBy,
        selectedTab: recentSales ? "recent_sales" : selectedTab,
        page,
        limit: page_size,
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
        page: 1,
        limit: 60,
        totalPages: 1,
        filterBy: [],
        sortBy: "DESC",
        selectedTab: "all",
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
  } = props.data;

  const stampsArray = Array.isArray(stamps) ? stamps : [];
  const isRecentSales = selectedTab === "recent_sales";

  /* ===== RENDER ===== */
  return (
    <div
      class={body}
      f-client-nav
      data-partial="/explorer"
    >
      {/* Header Component with Filter Controls */}
      <ExplorerHeader />

      {/* Main Content with Pagination */}
      <ExplorerContent
        stamps={stampsArray}
        isRecentSales={isRecentSales}
        pagination={{
          page,
          totalPages,
          // Remove onPageChange to let PaginationButtons component use its built-in Fresh navigation
        }}
      />
    </div>
  );
}

export default ExplorerPage;
