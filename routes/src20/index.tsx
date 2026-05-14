/* ===== SRC20 OVERVIEW PAGE ===== */
/*@baba-149*/
import { SRC20OverviewContent } from "$content";
import { Handlers } from "$fresh/server.ts";
import { body } from "$layout";
import {
  DEV_DUMMY_MODE,
  DUMMY_TOKEN_OVERVIEW_PAGE,
} from "$lib/utils/devDummyData.ts";

/* ===== HELPER FUNCTIONS ===== */
/**
 * Get base URL from request for API calls
 */
function getBaseUrl(req: Request): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

/**
 * Fetch data from internal API endpoints
 * This maintains proper separation between frontend and backend
 */
async function fetchFromAPI(endpoint: string, baseUrl: string): Promise<any> {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        "X-API-Version": "2.3", // Use latest API version with market data
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(
        `[SRC20] API call failed: ${endpoint} - ${response.status}`,
      );
      return { data: [], total: 0, page: 1, totalPages: 0 };
    }

    const result = await response.json();

    // Handle API response structure properly
    if (result.data && Array.isArray(result.data)) {
      // Standard API response with pagination info
      return {
        data: result.data,
        total: result.total || 0,
        page: result.page || 1,
        totalPages: result.totalPages || 0,
      };
    } else if (Array.isArray(result)) {
      // Direct array response (for some internal endpoints)
      return {
        data: result,
        total: result.length,
        page: 1,
        totalPages: 1,
      };
    } else {
      // Fallback for other response structures
      return result.data || result ||
        { data: [], total: 0, page: 1, totalPages: 0 };
    }
  } catch (error) {
    console.error(
      `[SRC20] API call error: ${endpoint}`,
      error,
    );
    return DUMMY_TOKEN_OVERVIEW_PAGE;
  }
}

/* ===== SERVER HANDLER ===== */
export const handler: Handlers = {
  async GET(req, ctx) {
    const url = new URL(req.url);

    if (DEV_DUMMY_MODE) {
      return ctx.render({
        mintingData: DUMMY_TOKEN_OVERVIEW_PAGE,
        timeframe: "24H",
        sortBy: "TRENDING",
        sortDirection: "desc",
        viewType: "minted",
        btcPrice: 65000,
        btcPriceSource: "dummy",
      });
    }

    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 50;
    const timeframe = (url.searchParams.get("timeframe") || "24H") as
      | "24H"
      | "7D"
      | "30D";
    const sortBy = (url.searchParams.get("sortBy") || "TRENDING") as
      | "TRENDING"
      | "DEPLOY"
      | "HOLDERS"
      | "PROGRESS"
      | "MARKET_CAP"
      | "VOLUME"
      | "PRICE"
      | "CHANGE"
      | "TOKEN";
    const sortDirection = (url.searchParams.get("sortDirection") || "desc") as
      | "asc"
      | "desc";

    // MINTING button toggle functionality
    const viewType = (url.searchParams.get("viewType") || "minted") as
      | "minted"
      | "minting";

    const baseUrl = getBaseUrl(req);

    try {
      /* ===== SINGLE BTC PRICE FETCH ===== */
      // Use singleton BTC price service to eliminate duplicate fetches
      const { btcPriceSingleton } = await import(
        "$server/services/price/btcPriceSingleton.ts"
      );
      const btcPriceData = await btcPriceSingleton.getPrice();
      const btcPrice = btcPriceData.price;

      // Store BTC price in context for components to use
      ctx.state.btcPrice = btcPrice;
      ctx.state.btcPriceSource = btcPriceData.source;

      // Build API endpoint with v2.3 parameters
      let apiEndpoint =
        `/api/v2/src20?op=DEPLOY&limit=${limit}&page=${page}&includeMarketData=true&includeProgress=true`;

      // Add minting status filter using simplified API parameter
      if (viewType === "minting") {
        apiEndpoint += "&mintingStatus=minting";
      } else if (viewType === "minted") {
        apiEndpoint += "&mintingStatus=minted";
      }

      // Map frontend sort options to API sort parameters
      let apiSortBy = "";
      switch (sortBy) {
        case "TRENDING":
          // Use different trending sorts for minting vs minted tokens
          if (viewType === "minting") {
            // For minting tokens, use TRENDING_MINTING sort
            apiSortBy = sortDirection === "desc"
              ? "TRENDING_MINTING_DESC"
              : "TRENDING_MINTING_ASC";
          } else {
            // For minted tokens, use timeframe-based trending
            switch (timeframe) {
              case "24H":
                apiSortBy = sortDirection === "desc"
                  ? "TRENDING_24H_DESC"
                  : "TRENDING_24H_ASC";
                break;
              case "30D":
                // 30D for trending
                apiSortBy = sortDirection === "desc"
                  ? "TRENDING_30D_DESC"
                  : "TRENDING_30D_ASC";
                break;
              case "7D":
                apiSortBy = sortDirection === "desc"
                  ? "TRENDING_7D_DESC"
                  : "TRENDING_7D_ASC";
                break;
            }
          }
          break;
        case "TOKEN":
          apiSortBy = sortDirection === "desc" ? "TICK_DESC" : "TICK_ASC";
          break;
        case "DEPLOY":
          apiSortBy = sortDirection === "desc" ? "DEPLOY_DESC" : "DEPLOY_ASC";
          break;
        case "HOLDERS":
          apiSortBy = sortDirection === "desc" ? "HOLDERS_DESC" : "HOLDERS_ASC";
          break;
        case "PROGRESS":
          apiSortBy = sortDirection === "desc"
            ? "PROGRESS_DESC"
            : "PROGRESS_ASC";
          break;
        case "MARKET_CAP":
          apiSortBy = sortDirection === "desc"
            ? "MARKET_CAP_DESC"
            : "MARKET_CAP_ASC";
          break;
        case "PRICE":
          apiSortBy = sortDirection === "desc" ? "PRICE_DESC" : "PRICE_ASC";
          break;
        case "CHANGE":
          switch (timeframe) {
            case "24H":
              apiSortBy = sortDirection === "desc"
                ? "CHANGE_24H_DESC"
                : "CHANGE_24H_ASC";
              break;
            case "7D":
              apiSortBy = sortDirection === "desc"
                ? "CHANGE_7D_DESC"
                : "CHANGE_7D_ASC";
              break;
            case "30D":
              apiSortBy = sortDirection === "desc"
                ? "CHANGE_30D_DESC"
                : "CHANGE_30D_ASC";
              break;
          }
          break;
        case "VOLUME":
          // Volume sorting with timeframe support
          switch (timeframe) {
            case "24H":
              apiSortBy = sortDirection === "desc"
                ? "VOLUME_24H_DESC"
                : "VOLUME_24H_ASC";
              break;
            case "30D":
              // 30D for volume
              apiSortBy = sortDirection === "desc"
                ? "VOLUME_30D_DESC"
                : "VOLUME_30D_ASC";
              break;
            case "7D":
              apiSortBy = sortDirection === "desc"
                ? "VOLUME_7D_DESC"
                : "VOLUME_7D_ASC";
              break;
          }
          break;
      }

      if (apiSortBy) {
        apiEndpoint += `&sortBy=${apiSortBy}`;
      }

      // Fetch data from API
      const result = await fetchFromAPI(apiEndpoint, baseUrl);

      const mintingData = result || {
        page: 1,
        limit: 50,
        totalPages: 0,
        total: 0,
        last_block: 0,
        data: [],
      };
      return ctx.render({
        mintingData,
        timeframe,
        sortBy,
        sortDirection,
        viewType, // Pass viewType to frontend
        // Pass BTC price to components to avoid redundant fetches
        btcPrice: btcPrice,
        btcPriceSource: btcPriceData.source,
      });
    } catch (error) {
      console.error(
        `[SRC20] Error fetching SRC20 data:`,
        error,
      );

      return ctx.render({
        mintingData: DUMMY_TOKEN_OVERVIEW_PAGE,
        timeframe,
        sortBy,
        sortDirection,
        viewType,
        btcPrice: undefined,
        btcPriceSource: "error",
      });
    }
  },
};

/* ===== PAGE COMPONENT ===== */
export default function SRC20OverviewPage({ data }: any) {
  if (!data || !data.mintingData) {
    return <div>Error: No data received</div>;
  }

  const {
    mintingData,
    timeframe = "24H",
    sortBy = "TRENDING",
    sortDirection = "desc",
    viewType = "minted",
    btcPrice,
    btcPriceSource,
  } = data;

  return (
    <div
      class={`${body} -mb-3`}
      f-client-nav
      data-partial="/src20"
    >
      <SRC20OverviewContent
        mintingData={mintingData}
        timeframe={timeframe}
        sortBy={sortBy}
        sortDirection={sortDirection}
        viewType={viewType}
        btcPrice={btcPrice}
        btcPriceSource={btcPriceSource}
      />
    </div>
  );
}
