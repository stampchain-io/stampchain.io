/* ===== HOME PAGE ROUTE ===== */
import { asset } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import type { CollectionRow } from "$server/types/collection.d.ts";
import type { SRC20Row } from "$types/src20.d.ts";
import type { StampRow, StampSaleRow } from "$types/stamp.d.ts";

import { HomeHeader } from "$header";
import { body, containerBackground, containerGap } from "$layout";
import {
  DATA_PLACEHOLDER_DEV,
  DATA_PLACEHOLDER_PROD_HOME,
} from "$lib/utils/dataPlaceholderProd.ts";
import {
  GetStampingCta,
  SRC20Gallery,
  StampchainContactCta,
  StampGalleryHome,
} from "$section";
import { StampController } from "$server/controller/stampController.ts";
import { SRC20Service } from "$server/services/src20/index.ts";
import {
  EcxNativeEmpty,
  EcxStampViewToggle,
  type EcxViewState,
  ecxViewState,
} from "$components/layout/EcxStampView.tsx";
import { ecxBlockFloor, getEcxStampView } from "$lib/utils/chain/ecxView.ts";
import { getChainId } from "$server/services/chain/chainProfile.ts";

/* ===== HELPERS ===== */
/**
 * StampController.getRecentSales returns flat sale fields (btc_amount,
 * buyer_address, etc.) rather than nesting them under `sale_data`. Nest them
 * into the canonical shape (StampSaleData, $types/stamp.d.ts) here instead
 * of passing the flat controller shape straight through, so StampCard can
 * read `stamp.sale_data` directly without a flat-field fallback.
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

/* ===== TYPES ===== */
// Define the shape of pageData from StampController.getHomePageData()
interface StampControllerData {
  carouselStamps: StampRow[];
  stamps_src721: StampRow[];
  stamps_art: StampRow[];
  stamps_posh: StampRow[];
  collectionData: CollectionRow[];
}

interface HomePageData extends StampControllerData {
  error?: string;
  src20Data?: {
    minted: {
      data: SRC20Row[];
      total: number;
      page: number;
      totalPages: number;
    };
    minting: {
      data: SRC20Row[];
      total: number;
      page: number;
      totalPages: number;
    };
  };
  // Performance optimization - single BTC price fetch
  btcPrice?: number;
  btcPriceSource?: string;
  // Recent sales data for SSR optimization
  recentSalesData?: {
    data: StampSaleRow[];
    total: number;
    page: number;
    totalPages: number;
  };
  // New listings data (stamps with open dispensers) for SSR optimization
  newListingsData?: {
    data: StampRow[];
    total: number;
    page: number;
    totalPages: number;
  };
  // ECX only: ECX-native / inherited-history view of the stamp gallery
  ecxView?: EcxViewState;
}

/* ===== SERVER HANDLER ===== */
export const handler: Handlers<HomePageData> = {
  async GET(req: Request, ctx) {
    /* ===== REQUEST VALIDATION ===== */
    const headers = Object.fromEntries(req.headers);
    if (headers["sec-fetch-dest"] && headers["sec-fetch-dest"] !== "document") {
      // Fix: 204 No Content responses cannot have a body
      return new Response(null, { status: 204 });
    }

    console.log(`[HOMEPAGE] Starting homepage request`);

    /* ECX only: the stamp galleries default to ECX-native stamps (block
      973728 and later); ?history=inherited shows everything. Undefined on
      Bitcoin, so its queries and render data are unchanged. */
    const url = new URL(req.url);
    const ecxView = getChainId() === "ecx"
      ? ecxViewState(url, getEcxStampView(url))
      : undefined;
    const floorFrom = ecxView ? ecxBlockFloor(ecxView.view) : undefined;
    const blockFloor = floorFrom !== undefined
      ? { from: floorFrom }
      : undefined;
    const withEcxView = <T extends Record<string, unknown>>(data: T) =>
      ecxView ? { ...data, ecxView } : data;
    const aboveFloor = <T extends { block_index?: number }>(rows: T[]) =>
      blockFloor
        ? rows.filter((r) => (r.block_index ?? 0) >= blockFloor.from)
        : rows;

    if (DATA_PLACEHOLDER_DEV) {
      const {
        DATA_PLACEHOLDER_DEV_HOME_SRC20_MINTED,
        DATA_PLACEHOLDER_DEV_HOME_SRC20_MINTING,
        DATA_PLACEHOLDER_DEV_LANDING_PAGE,
        DATA_PLACEHOLDER_DEV_NEW_LISTINGS,
        DATA_PLACEHOLDER_DEV_RECENT_SALES,
      } = await import("$lib/utils/dataPlaceholderDev.ts");
      return await ctx.render(withEcxView({
        ...DATA_PLACEHOLDER_DEV_LANDING_PAGE,
        ...(blockFloor && {
          stamps_art: aboveFloor(DATA_PLACEHOLDER_DEV_LANDING_PAGE.stamps_art),
          stamps_posh: aboveFloor(
            DATA_PLACEHOLDER_DEV_LANDING_PAGE.stamps_posh,
          ),
          stamps_src721: aboveFloor(
            DATA_PLACEHOLDER_DEV_LANDING_PAGE.stamps_src721,
          ),
        }),
        src20Data: {
          minted: DATA_PLACEHOLDER_DEV_HOME_SRC20_MINTED as any,
          minting: DATA_PLACEHOLDER_DEV_HOME_SRC20_MINTING as any,
        },
        recentSalesData: {
          data: DATA_PLACEHOLDER_DEV_RECENT_SALES as any,
          total: DATA_PLACEHOLDER_DEV_RECENT_SALES.length,
          page: 1,
          totalPages: 1,
        },
        newListingsData: {
          data: DATA_PLACEHOLDER_DEV_NEW_LISTINGS as any,
          total: DATA_PLACEHOLDER_DEV_NEW_LISTINGS.length,
          page: 1,
          totalPages: 1,
        },
        btcPrice: 65000,
        btcPriceSource: "dummy",
      }) as any);
    }

    try {
      /* ===== SINGLE BTC PRICE FETCH ===== */
      // 🚀 PERFORMANCE: Use singleton BTC price service to eliminate duplicate fetches
      const { btcPriceSingleton } = await import(
        "$server/services/price/btcPriceSingleton.ts"
      );
      const btcPriceData = await btcPriceSingleton.getPrice();
      const btcPrice = btcPriceData.price;
      console.log(
        `[HOMEPAGE] Singleton BTC price: $${btcPrice} from ${btcPriceData.source}`,
      );

      // Store BTC price in context for components to use
      ctx.state.btcPrice = btcPrice;
      ctx.state.btcPriceSource = btcPriceData.source;

      /* ===== DATA FETCHING ===== */
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        console.log(`[HOMEPAGE] Request timed out after 15 seconds`);
        controller.abort();
      }, 15000); // Increased timeout for ECS

      console.log(`[HOMEPAGE] Starting parallel data fetches...`);
      const startTime = Date.now();

      // ECS-specific: Add individual timeouts and fallbacks for each data source
      const fetchWithFallback = async (
        fetchFn: () => Promise<any>,
        fallbackData: any,
        name: string,
      ) => {
        try {
          const result = await Promise.race([
            fetchFn(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`${name} timeout`)), 30000)
            ),
          ]);
          console.log(`[HOMEPAGE] ${name} completed successfully`);
          return result;
        } catch (error) {
          console.warn(`[HOMEPAGE] ${name} failed, using fallback:`, error);
          return fallbackData;
        }
      };

      // ✅ ARCHITECTURE: Call services/controllers directly instead of HTTP fetch
      // This eliminates the internal API self-referencing issue where requests
      // were timing out due to EC2 IP resolution instead of localhost

      const [
        pageData,
        mintedData,
        mintingData,
        recentSalesData,
        newListingsData,
      ] = await Promise.allSettled([
        // Stamp homepage data (carousels, galleries)
        fetchWithFallback(
          () =>
            StampController.getHomePageData(
              btcPrice,
              btcPriceData.source,
              blockFloor,
            ),
          {
            carouselStamps: [],
            stamps_art: [],
            stamps_src721: [],
            stamps_posh: [],
            collectionData: [],
          },
          "StampController.getHomePageData",
        ),
        // Top minted SRC20 tokens - call service directly
        fetchWithFallback(
          async () => {
            const result = await SRC20Service.QueryService
              .fetchEnhancedSrc20Data(
                {
                  op: "DEPLOY",
                  sortBy: "TRENDING_24H_DESC",
                  limit: 5,
                  page: 1,
                },
                {
                  onlyFullyMinted: true,
                  includeMarketData: true,
                  enrichWithProgress: true,
                },
              );
            // Type assertion for paginated response
            const paginatedResult = result as {
              data: unknown[];
              page?: number;
              totalPages?: number;
              limit?: number;
            };
            const dataArray = Array.isArray(paginatedResult.data)
              ? paginatedResult.data
              : [];
            return {
              data: dataArray,
              total: dataArray.length,
              page: paginatedResult.page || 1,
              totalPages: paginatedResult.totalPages || 1,
            };
          },
          { data: [], total: 0, page: 1, totalPages: 0 },
          "fetchTopMintedTokens",
        ),
        // Trending minting SRC20 tokens - call service directly
        fetchWithFallback(
          async () => {
            const result = await SRC20Service.QueryService
              .fetchEnhancedSrc20Data(
                {
                  op: "DEPLOY",
                  sortBy: "TRENDING_MINTING_DESC",
                  limit: 5,
                  page: 1,
                },
                {
                  excludeFullyMinted: true,
                  includeMarketData: true,
                  enrichWithProgress: true,
                },
              );
            // Type assertion for paginated response
            const paginatedResult = result as {
              data: unknown[];
              page?: number;
              totalPages?: number;
              limit?: number;
            };
            const dataArray = Array.isArray(paginatedResult.data)
              ? paginatedResult.data
              : [];
            return {
              data: dataArray,
              total: dataArray.length,
              page: paginatedResult.page || 1,
              totalPages: paginatedResult.totalPages || 1,
            };
          },
          { data: [], total: 0, page: 1, totalPages: 0 },
          "fetchTrendingActiveMintingTokensV2",
        ),
        // Recent stamp sales - call controller directly
        fetchWithFallback(
          async () => {
            const result = await StampController.getRecentSales(1, 8);
            return {
              data: (result.data || []).map(nestRecentSaleData),
              total: result.total || 0,
              page: result.page || 1,
              totalPages: result.totalPages || 0,
            };
          },
          { data: [], total: 0, page: 1, totalPages: 0 },
          "fetchRecentSalesData",
        ),
        // New listings - stamps with open dispensers, call controller directly
        fetchWithFallback(
          async () => {
            const result = await StampController.getStamps({
              market: "listings",
              dispensers: true,
              listings: "all",
              page: 1,
              limit: 10,
              sortBy: "DESC",
            });
            return {
              data: Array.isArray(result.data) ? result.data : [],
              total: "total" in result ? (result.total || 0) : 0,
              page: "page" in result ? (result.page || 1) : 1,
              totalPages: "totalPages" in result ? (result.totalPages || 0) : 0,
            };
          },
          { data: [], total: 0, page: 1, totalPages: 0 },
          "fetchNewListingsData",
        ),
      ]);

      clearTimeout(timeout);

      const duration = Date.now() - startTime;
      console.log(`[HOMEPAGE] All data fetches completed in ${duration}ms`);

      // Extract results from Promise.allSettled
      const pageResult = pageData.status === "fulfilled" ? pageData.value : {
        carouselStamps: [],
        stamps_art: [],
        stamps_src721: [],
        stamps_posh: [],
        collectionData: [],
      };
      const mintedResult = mintedData.status === "fulfilled"
        ? mintedData.value
        : { data: [], total: 0, page: 1, totalPages: 0 };
      const mintingResult = mintingData.status === "fulfilled"
        ? mintingData.value
        : { data: [], total: 0, page: 1, totalPages: 0 };
      const recentSalesResult = recentSalesData.status === "fulfilled"
        ? recentSalesData.value
        : { data: [], total: 0, page: 1, totalPages: 0 };
      const newListingsResult = newListingsData.status === "fulfilled"
        ? newListingsData.value
        : { data: [], total: 0, page: 1, totalPages: 0 };

      /* ===== RESPONSE RENDERING ===== */
      const response = await ctx.render(withEcxView({
        ...pageResult,
        src20Data: {
          minted: mintedResult as any,
          minting: mintingResult as any,
        },
        recentSalesData: recentSalesResult as any,
        newListingsData: newListingsResult as any,
        // 🚀 PERFORMANCE: Pass BTC price to components to avoid redundant fetches
        btcPrice: btcPrice,
        btcPriceSource: btcPriceData.source,
      }));

      return response;
    } catch (error) {
      console.error("[HOMEPAGE] Critical error:", error);
      if (error instanceof Error) {
        console.error("[HOMEPAGE] Error stack:", error.stack);
      }

      // Return the original error/empty state instead of failing completely
      return await ctx.render(withEcxView(DATA_PLACEHOLDER_PROD_HOME) as any);
    }
  },
};

/* ===== PAGE COMPONENT ===== */
export default function Home({ data }: PageProps<HomePageData>) {
  /* ===== DATA EXTRACTION ===== */
  const {
    stamps_art = [],
    stamps_src721 = [],
    stamps_posh = [],
    collectionData = [],
    src20Data,
    recentSalesData,
    newListingsData,
    ecxView,
  } = data || {};
  // ECX only: nothing to show in the ECX-native gallery yet.
  const ecxNativeEmpty = ecxView?.view === "native" &&
    stamps_art.length + stamps_posh.length + stamps_src721.length === 0;

  /* ===== RENDER ===== */
  return (
    <>
      {/* ===== CRITICAL RESOURCES ===== */}
      {/* Preload carousel CSS for above-fold content */}
      <link rel="preload" href={asset("/carousel.css")} as="style" />
      <link rel="stylesheet" href={asset("/carousel.css")} />
      {
        /* The two /homepage-animations.css links that used to sit here were
          removed: that file was never committed. It was referenced from
          814a95e78 (2025-07-30) but the stylesheet itself never landed, so
          both the preload and the stylesheet request have 404'd in production
          ever since — two wasted round-trips and a console error on every
          homepage load. Nothing depends on it; the animation work from that
          commit lives in static/styles.css. */
      }
      {/* ===== MAIN CONTENT ===== */}
      <div
        class={`${body} ${containerGap}`}
      >
        {/* ===== CRITICAL ABOVE FOLD CONTENT ===== */}
        {ecxView ? <HomeHeader chain="ecx" /> : <HomeHeader />}

        {
          /* ===== DEFERRED IMPORTANT CONTENT =====
        <div style="content-visibility:auto;">
          <CarouselHome carouselStamps={carouselStamps} />
        </div>

        {/* ===== NON-CRITICAL CONTENT ===== */
        }
        {ecxView && <EcxStampViewToggle state={ecxView} />}
        {ecxNativeEmpty
          ? <EcxNativeEmpty state={ecxView!} />
          : (
            <div style="content-visibility: auto; contain-intrinsic-size: 0 1240px;">
              <StampGalleryHome
                stamps_art={stamps_art}
                stamps_posh={stamps_posh}
                stamps_src721={stamps_src721}
                collectionData={collectionData}
                recentSalesData={recentSalesData?.data || []}
                newListingsData={newListingsData?.data || []}
              />
            </div>
          )}

        {/* ===== BELOW FOLD CONTENT - LAZY LOAD ===== */}
        <div style="content-visibility: auto; contain-intrinsic-size: 0 360px;">
          <div class="mb-5 mobileLg:mb-7.5">
            <GetStampingCta />
          </div>

          <div
            class={`flex flex-col tablet:flex-row ${containerBackground} ${containerGap}`}
          >
            <div class="w-full tablet:w-1/2">
              <SRC20Gallery
                title="SRC-20 TOKENS"
                subTitle="TOP TICKERS"
                viewType="minted"
                fromPage="home"
                {...(src20Data?.minted && { serverData: src20Data.minted })}
                timeframe="24H"
              />
            </div>
            <div class="w-full tablet:w-1/2">
              <SRC20Gallery
                title="SRC-20 TOKENS"
                subTitle="TRENDING MINTS"
                viewType="minting"
                fromPage="home"
                {...(src20Data?.minting && { serverData: src20Data.minting })}
                timeframe="24H"
              />
            </div>
          </div>
        </div>

        <div>
          <StampchainContactCta />
        </div>
      </div>
    </>
  );
}
