/* ===== WALLET PAGE ===== */
/*@baba-367*/

import { WalletContent } from "$content";
import { Handlers } from "$fresh/server.ts";
import { body, containerGap } from "$layout";
import type { DispenserRow, StampRow } from "$types/stamp.d.ts";

import WalletContentDispenser from "$islands/content/WalletContentDispenser.tsx";
import WalletHeader from "$islands/header/WalletHeader.tsx";
import { getBTCBalanceInfo } from "$lib/utils/data/processing/balanceUtils.ts";
import { DATA_PLACEHOLDER_DEV } from "$lib/utils/dataPlaceholderProd.ts";
import { CollectionController } from "$server/controller/collectionController.ts";
import { Src20Controller } from "$server/controller/src20Controller.ts";
import { StampController } from "$server/controller/stampController.ts";
import { CreatorService } from "$server/services/creator/creatorService.ts";
import { SRC20Service } from "$server/services/src20/index.ts";
import type {
  WalletContentTabId,
  WalletContentTabIdSub,
  WalletProfilePageProps,
  WalletStampsTab,
  WalletTokensTab,
} from "$types/ui.d.ts";
import type { WalletOverviewInfo } from "$types/wallet.d.ts";

/* ===== CONSTANTS ===== */
const SECTION_VALUES: WalletContentTabId[] = ["all", "stamps", "tokens"];
const CONTENT_TAB_VALUES: WalletContentTabIdSub[] = [
  "balance",
  "created",
  "listings",
  "collections",
];
const VIEW_MODE_VALUES = ["cardVertical", "cardSquare", "cardRow"] as const;
type ViewMode = typeof VIEW_MODE_VALUES[number];

// Grid-friendly page sizes per sub-tab
const STAMPS_GRID_LIMIT = 40; // fills a 10x4 desktop grid
const LISTINGS_LIMIT = 20;
const COLLECTIONS_LIMIT = 10;
const TOKENS_GRID_LIMIT = 20;
const DISPENSERS_STATS_LIMIT = 10; // matches legacy default, used for the stats card when Listings isn't active

/* ===== HELPERS ===== */
function normalizeSortBy(value: string | null): "ASC" | "DESC" {
  return value?.toUpperCase() === "ASC" ? "ASC" : "DESC";
}

function normalizeViewMode(value: string | null): ViewMode {
  return (VIEW_MODE_VALUES as readonly string[]).includes(value ?? "")
    ? value as ViewMode
    : "cardVertical";
}

function normalizeSection(value: string | null): WalletContentTabId {
  return (SECTION_VALUES as readonly string[]).includes(value ?? "")
    ? value as WalletContentTabId
    : "all";
}

/**
 * `listings`/`collections` are stamps-only — force back to `balance` when
 * they're paired with a `section` that can't render them (defensive: the
 * header already prevents this combination from being reachable via the
 * UI, but URLs can be typed/bookmarked directly).
 */
function normalizeContentTab(
  value: string | null,
  section: WalletContentTabId,
): WalletContentTabIdSub {
  const tab = (CONTENT_TAB_VALUES as readonly string[]).includes(value ?? "")
    ? value as WalletContentTabIdSub
    : "balance";
  return (tab === "listings" || tab === "collections") && section !== "stamps"
    ? "balance"
    : tab;
}

/**
 * Maps the unified header tab (balance/created/listings/collections) back
 * to each side's existing internal tab type — keeps
 * StampsTabContent/TokensTabContent and the fetch logic below unchanged.
 */
function mapTabToStampsTab(tab: WalletContentTabIdSub): WalletStampsTab {
  return tab;
}

function mapTabToTokensTab(tab: WalletContentTabIdSub): WalletTokensTab {
  // "listings"/"collections" have no Tokens equivalent — only reachable
  // when section === "stamps", where the Tokens panel isn't rendered.
  return tab === "created" ? "created" : "balance";
}

/**
 * `SRC20QueryService.fetchBasicSrc20Data` returns raw, flat market columns
 * (e.g. `price_btc`, `price_change_24h_percent`) instead of the nested
 * `market_data` object that `SRC20OverviewCompact` reads. Re-shape it here
 * so the "Created" tab's row view can show price/mcap/volume like the
 * "Balance" tab (which goes through `MarketDataEnrichmentService`).
 */
function withNestedMarketData(row: Record<string, any>) {
  const hasMarketFields = row.market_cap_btc != null ||
    row.price_btc != null ||
    row.volume_24h_btc != null ||
    row.price_change_24h_percent != null;
  if (!hasMarketFields) return row;
  return {
    ...row,
    market_data: {
      market_cap_btc: row.market_cap_btc ?? null,
      price_btc: row.price_btc ?? null,
      volume_24h_btc: row.volume_24h_btc ?? null,
      change_24h_percent: row.price_change_24h_percent ?? null,
    },
  };
}

// Helper function to determine if address should be treated as dispenser-only
function isDispenserOnlyAddress(data: {
  stampsTotal: number;
  src20Total: number;
  stampsCreated: number;
  walletData?: { dispensers?: { total?: number } };
}) {
  const dispensersTotal = data.walletData?.dispensers?.total ?? 0;
  const hasDispensers = dispensersTotal > 0;
  const hasOtherStamps = data.stampsTotal > dispensersTotal;
  const hasSrc20Tokens = data.src20Total > 0;
  const hasCreatedStamps = data.stampsCreated > 0;

  // Only treat as dispenser if it ONLY has dispenser activity
  return hasDispensers && !hasOtherStamps && !hasSrc20Tokens &&
    !hasCreatedStamps;
}

/* ===== SERVER HANDLER ===== */
/**
 * Stamps and Tokens are rendered as panels of one unified wallet content
 * container, sharing a single top-level section selector (all/stamps/
 * tokens), sub-tab selector (balance/created/listings/collections), view
 * mode, and sort order — mirrors ExplorerHeader's `section`/`view`/`page`
 * handling. Only the panel(s) visible under the current `section` are
 * fetched at full page size; the data sources that still feed the stats
 * card (balance stamps/tokens/dispensers) are fetched with a minimal
 * limit purely to obtain an accurate `total` when their panel is hidden.
 */
export const handler: Handlers = {
  async GET(req, ctx) {
    /* ===== PARAMETER EXTRACTION ===== */
    const { address } = ctx.params;
    const url = new URL(req.url);

    const section = normalizeSection(url.searchParams.get("section"));
    const tab = normalizeContentTab(url.searchParams.get("tab"), section);
    const view = normalizeViewMode(url.searchParams.get("view"));
    const sortBy = normalizeSortBy(url.searchParams.get("sortBy"));

    // The unified tab/sort drive both panels at once — map back to each
    // side's existing internal tab type for the fetch logic below.
    const stampsTab = mapTabToStampsTab(tab);
    const stampsSortBy = sortBy;
    const stampsPage = Math.max(
      1,
      parseInt(url.searchParams.get("stamps_page") || "1") || 1,
    );

    const tokensTab = mapTabToTokensTab(tab);
    const tokensSortBy = sortBy;
    const tokensPage = Math.max(
      1,
      parseInt(url.searchParams.get("tokens_page") || "1") || 1,
    );

    const anchor = url.searchParams.get("anchor");

    if (DATA_PLACEHOLDER_DEV) {
      const { getDummyWalletPage } = await import(
        "$lib/utils/dataPlaceholderDev.ts"
      );
      return ctx.render(
        getDummyWalletPage(address, {
          section,
          tab,
          view,
          stampsPage,
          tokensPage,
        }),
      );
    }

    // Only the visible side(s) need full-grid-limit data — e.g. when
    // section === "stamps", tokensTab is still "balance" (mapped from the
    // shared `tab`) but the Tokens panel isn't rendered, so it should only
    // ever get the minimal stats-card fetch.
    const stampsVisible = section !== "tokens";
    const tokensVisible = section !== "stamps";

    // "Balance" stamps — full page when active, minimal fetch (just for an
    // accurate `total`) otherwise.
    const balanceStampsActive = stampsVisible && stampsTab === "balance";
    const balanceStampsPage = balanceStampsActive ? stampsPage : 1;
    const balanceStampsLimit = balanceStampsActive ? STAMPS_GRID_LIMIT : 1;
    const balanceStampsSort = balanceStampsActive ? stampsSortBy : "DESC";

    // Dispensers back the "Listings" sub-tab AND the stats card's dispenser
    // counts — always fetched, just at a smaller page size when inactive.
    const listingsActive = stampsVisible && stampsTab === "listings";
    const dispensersPage = listingsActive ? stampsPage : 1;
    const dispensersLimit = listingsActive
      ? LISTINGS_LIMIT
      : DISPENSERS_STATS_LIMIT;
    const dispensersSort = listingsActive ? stampsSortBy : "DESC";

    // "Balance" tokens — same minimal-fetch-when-inactive pattern as stamps.
    const balanceSrc20Active = tokensVisible && tokensTab === "balance";
    const balanceSrc20Page = balanceSrc20Active ? tokensPage : 1;
    const balanceSrc20Limit = balanceSrc20Active ? TOKENS_GRID_LIMIT : 1;
    const balanceSrc20Sort = balanceSrc20Active ? tokensSortBy : "DESC";

    const createdStampsActive = stampsVisible && stampsTab === "created";
    const collectionsActive = stampsVisible && stampsTab === "collections";
    const createdSrc20Active = tokensVisible && tokensTab === "created";

    /* ===== DATA FETCHING ===== */
    try {
      const [
        balanceStampsResponse,
        balanceSrc20Response,
        btcInfoResponse,
        dispensersResponse,
        stampsCreatedCountResponse,
        src101FetchResponse,
        creatorNameResponse,
        // Separate fetch for ALL stamps for accurate value calculation
        allStampsForValuesResponse,
        createdStampsResponse,
        collectionsResponse,
        createdSrc20Response,
      ] = await Promise.allSettled([
        // Balance stamps via the enhanced API endpoint, with fallback
        fetch(
          `${url.origin}/api/v2/stamps/balance/${address}?enhanced=true&page=${balanceStampsPage}&limit=${balanceStampsLimit}&sortBy=${balanceStampsSort}`,
          { headers: { "X-API-Version": "2.3" } },
        ).then(async (res) => {
          if (!res.ok) {
            console.error(
              "Enhanced stamps fetch failed:",
              res.status,
              res.statusText,
            );
            return StampController.getStampBalancesByAddress(
              address,
              balanceStampsLimit,
              balanceStampsPage,
              balanceStampsSort,
            );
          }
          return await res.json();
        }),

        // Balance SRC20 tokens
        Src20Controller.handleSrc20BalanceRequest({
          address,
          includePagination: true,
          limit: balanceSrc20Limit,
          page: balanceSrc20Page,
          includeMintData: true,
          includeMarketData: true,
          sortBy: balanceSrc20Sort,
        }),

        // BTC info
        getBTCBalanceInfo(address, { includeUSD: true }),

        // Dispensers (backs both Listings sub-tab and the stats card)
        StampController.getDispensersWithStampsByAddress(
          address,
          dispensersPage,
          dispensersLimit,
          { sortBy: dispensersSort },
        ),

        StampController.getStampsCreatedCount(address),

        // SRC101 balance
        fetch(
          `${url.origin}/api/v2/src101/balance/${address}?limit=100&offset=0`,
          { headers: { "X-API-Version": "2.3" } },
        ).then(async (res) => {
          if (!res.ok) {
            console.error("SRC101 fetch failed:", res.status, res.statusText);
            return null;
          }
          const data = await res.json();

          if (data.pagination?.total > 100) {
            const remainingPages = Math.ceil(data.pagination.total / 100) - 1;
            const additionalRequests = Array.from(
              { length: remainingPages },
              (_, i) =>
                fetch(
                  `${url.origin}/api/v2/src101/balance/${address}?limit=100&offset=${
                    (i + 1) * 100
                  }`,
                  { headers: { "X-API-Version": "2.3" } },
                ).then((r) => r.json()),
            );

            const additionalData = await Promise.all(additionalRequests);
            data.data = [
              ...data.data,
              ...additionalData.flatMap((d) => d.data || []),
            ];
          }

          return data;
        }),

        // Creator name
        CreatorService.getCreatorNameByAddress(address),

        // ALL stamps for accurate wallet value calculation (unrelated to
        // whichever sub-tab is active)
        fetch(
          `${url.origin}/api/v2/stamps/balance/${address}?enhanced=true&page=1&limit=1000&sortBy=DESC`,
          { headers: { "X-API-Version": "2.3" } },
        ).then(async (res) => {
          if (!res.ok) {
            console.error(
              "All stamps fetch for values failed:",
              res.status,
              res.statusText,
            );
            return StampController.getStampBalancesByAddress(
              address,
              1000,
              1,
              "DESC",
            );
          }
          const data = await res.json();

          if (data.pagination && data.pagination.total > 1000) {
            const totalPages = Math.ceil(data.pagination.total / 1000);
            const additionalRequests = Array.from(
              { length: totalPages - 1 },
              (_, i) =>
                fetch(
                  `${url.origin}/api/v2/stamps/balance/${address}?enhanced=true&page=${
                    i + 2
                  }&limit=1000&sortBy=DESC`,
                  { headers: { "X-API-Version": "2.3" } },
                ).then((r) => r.json()),
            );

            const additionalData = await Promise.all(additionalRequests);
            data.data = [
              ...data.data,
              ...additionalData.flatMap((d) => d.data || []),
            ];
          }

          return data;
        }),

        // "Created" — stamps created by this address (Stamps > Created)
        createdStampsActive
          ? StampController.getStamps({
            creatorAddress: address,
            ident: ["STAMP", "SRC-721"],
            page: stampsPage,
            limit: STAMPS_GRID_LIMIT,
            sortBy: stampsSortBy,
            url: url.origin,
          })
          : Promise.resolve(null),

        // "Collections" — collections created by this address (Stamps > Collections)
        collectionsActive
          ? CollectionController.getCollectionDetails({
            creator: address,
            page: stampsPage,
            limit: COLLECTIONS_LIMIT,
            sortBy: stampsSortBy,
            includeMarketData: true,
          })
          : Promise.resolve(null),

        // "Created" — tokens deployed by this address (Tokens > Created)
        createdSrc20Active
          ? SRC20Service.QueryService.fetchBasicSrc20Data({
            op: "DEPLOY",
            address,
            page: tokensPage,
            limit: TOKENS_GRID_LIMIT,
            sortBy: tokensSortBy,
          })
          : Promise.resolve(null),
      ]);

      /* ===== DATA PROCESSING ===== */
      const balanceStamps = balanceStampsResponse.status === "fulfilled"
        ? {
          data: (balanceStampsResponse.value.data ?? []) as StampRow[],
          total: balanceStampsResponse.value.pagination?.total ??
            balanceStampsResponse.value.total ?? 0,
          totalPages: balanceStampsResponse.value.pagination?.totalPages ??
            balanceStampsResponse.value.totalPages ?? 0,
        }
        : { data: [], total: 0, totalPages: 0 };

      // Calculate stamp values using ALL stamps, not just the current page
      const stampValues = allStampsForValuesResponse.status === "fulfilled"
        ? await StampController.calculateWalletStampValues(
          allStampsForValuesResponse.value.data,
        )
        : { stampValues: {}, totalValue: 0 };

      const baseSrc20Data = balanceSrc20Response.status === "fulfilled"
        ? balanceSrc20Response.value
        : {
          data: [],
          total: 0,
          page: 1,
          limit: balanceSrc20Limit,
          totalPages: 0,
        };

      // Calculate total SRC20 value from enriched tokens
      const src20Value = Array.isArray(baseSrc20Data.data)
        ? baseSrc20Data.data.reduce((total: number, token: any) => {
          try {
            const marketData = token.market_data;
            if (marketData?.floor_price_btc && token.amt) {
              const quantity = typeof token.amt === "bigint"
                ? Number(token.amt)
                : token.amt;
              return total + marketData.floor_price_btc * quantity;
            }
          } catch (marketDataError) {
            console.warn(
              `Market data calculation error for token ${token.tick}:`,
              marketDataError,
            );
          }
          return total;
        }, 0)
        : 0;

      const marketDataStatus = {
        stampsMarketData: balanceStampsResponse.status === "fulfilled" &&
            (balanceStampsResponse.value as any).stampValues
          ? "available"
          : "unavailable",
        src20MarketData: balanceSrc20Response.status === "fulfilled" &&
            (baseSrc20Data.data?.length === 0 ||
              baseSrc20Data.data?.some((token: any) => token.market_data))
          ? "available"
          : "unavailable",
        overallStatus: "partial" as "full" | "partial" | "unavailable",
      };
      if (
        marketDataStatus.stampsMarketData === "available" &&
        marketDataStatus.src20MarketData === "available"
      ) {
        marketDataStatus.overallStatus = "full";
      } else if (
        marketDataStatus.stampsMarketData === "unavailable" &&
        marketDataStatus.src20MarketData === "unavailable"
      ) {
        marketDataStatus.overallStatus = "unavailable";
      }

      const dispensersData: DispenserRow[] =
        dispensersResponse.status === "fulfilled"
          ? (dispensersResponse.value
            .dispensers as unknown as DispenserRow[]) ??
            []
          : [];
      const dispensersTotal = dispensersResponse.status === "fulfilled"
        ? dispensersResponse.value.total ?? dispensersData.length
        : 0;
      const openDispensers = dispensersData.filter((d) => d.give_remaining > 0);
      const closedDispensers = dispensersData.filter((d) =>
        d.give_remaining === 0
      );

      const btcInfo = btcInfoResponse.status === "fulfilled"
        ? btcInfoResponse.value
        : null;

      const src101Data = src101FetchResponse.status === "fulfilled" &&
          src101FetchResponse.value &&
          typeof src101FetchResponse.value === "object"
        ? {
          names: (src101FetchResponse.value.data || [])
            .filter((item: any) => item?.tokenid_utf8)
            .map((item: any) => item.tokenid_utf8),
          total: src101FetchResponse.value.last_block || 0,
        }
        : { names: [], total: 0 };

      const creatorName = creatorNameResponse.status === "fulfilled"
        ? creatorNameResponse.value
        : null;

      /* ===== WALLET DATA ASSEMBLY ===== */
      const walletData = {
        balance: btcInfo?.balance ?? 0,
        usdValue: (btcInfo?.balance ?? 0) * (btcInfo?.btcPrice ?? 0),
        address,
        btcPrice: btcInfo?.btcPrice ?? 0,
        fee: 0,
        creatorName,
        txCount: btcInfo?.txCount ?? 0,
        unconfirmedBalance: btcInfo?.unconfirmedBalance ?? 0,
        unconfirmedTxCount: btcInfo?.unconfirmedTxCount ?? 0,
        stampValue: stampValues.totalValue,
        src20Value,
        marketDataStatus,
        dispensers: {
          open: openDispensers.length,
          closed: closedDispensers.length,
          total: dispensersTotal,
          items: dispensersData,
        },
        src101: src101Data,
      };

      /* ===== ACTIVE STAMPS SUB-TAB DATA ===== */
      let stampsData: any[] = balanceStamps.data;
      let stampsPagination = {
        page: balanceStampsPage,
        limit: balanceStampsLimit,
        total: balanceStamps.total,
        totalPages: balanceStamps.totalPages ||
          Math.ceil(balanceStamps.total / (balanceStampsLimit || 1)),
      };

      if (stampsTab === "created") {
        const r = createdStampsResponse.status === "fulfilled"
          ? createdStampsResponse.value as any
          : null;
        stampsData = r?.data ?? [];
        stampsPagination = {
          page: r?.page ?? stampsPage,
          limit: r?.limit ?? STAMPS_GRID_LIMIT,
          total: r?.total ?? 0,
          totalPages: r?.totalPages ?? 0,
        };
      } else if (stampsTab === "collections") {
        const r = collectionsResponse.status === "fulfilled"
          ? collectionsResponse.value
          : null;
        stampsData = r?.data ?? [];
        stampsPagination = {
          page: r?.page ?? stampsPage,
          limit: r?.limit ?? COLLECTIONS_LIMIT,
          total: r?.total ?? 0,
          totalPages: r?.totalPages ??
            Math.ceil((r?.total ?? 0) / COLLECTIONS_LIMIT),
        };
      } else if (stampsTab === "listings") {
        stampsData = dispensersData;
        stampsPagination = {
          page: dispensersPage,
          limit: dispensersLimit,
          total: dispensersTotal,
          totalPages: Math.max(1, Math.ceil(dispensersTotal / dispensersLimit)),
        };
      }

      /* ===== ACTIVE TOKENS SUB-TAB DATA ===== */
      let tokensData: any[] = baseSrc20Data.data ?? [];
      let tokensPagination = {
        page: balanceSrc20Page,
        limit: balanceSrc20Limit,
        total: baseSrc20Data.total ?? 0,
        totalPages: baseSrc20Data.totalPages ??
          Math.ceil((baseSrc20Data.total ?? 0) / (balanceSrc20Limit || 1)),
      };

      if (tokensTab === "created") {
        const r = createdSrc20Response.status === "fulfilled"
          ? createdSrc20Response.value as any
          : null;
        tokensData = (r?.data ?? []).map(withNestedMarketData);
        tokensPagination = {
          page: r?.page ?? tokensPage,
          limit: r?.limit ?? TOKENS_GRID_LIMIT,
          total: r?.total ?? 0,
          totalPages: r?.totalPages ?? 0,
        };
      }

      /* ===== RESPONSE RENDERING ===== */
      return ctx.render({
        address,
        walletData,
        stampsTotal: balanceStamps.total,
        src20Total: baseSrc20Data.total ?? 0,
        stampsCreated: stampsCreatedCountResponse.status === "fulfilled"
          ? stampsCreatedCountResponse.value
          : 0,
        anchor,

        section,
        tab,
        view,

        stampsData,
        stampsPagination,

        tokensData,
        tokensPagination,
      });
    } catch (error) {
      /* ===== ERROR HANDLING ===== */
      console.error("Wallet page error:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          address,
          timestamp: new Date().toISOString(),
        });
      }

      return ctx.render({
        address,
        walletData: {
          balance: 0,
          usdValue: 0,
          address,
          btcPrice: 0,
          fee: 0,
          creatorName: null,
          txCount: 0,
          unconfirmedBalance: 0,
          unconfirmedTxCount: 0,
          stampValue: 0,
          src20Value: 0,
          marketDataStatus: {
            stampsMarketData: "unavailable",
            src20MarketData: "unavailable",
            overallStatus: "unavailable",
          },
          dispensers: { open: 0, closed: 0, total: 0, items: [] },
          src101: { names: [], total: 0 },
        },
        stampsTotal: 0,
        src20Total: 0,
        stampsCreated: 0,
        anchor: "",

        // Preserve the requested section/tab/view (parsed above, before
        // this try/catch) so the selector buttons stay in sync with the
        // URL even when the underlying data fetch fails.
        section,
        tab,
        view,

        stampsData: [],
        stampsPagination: {
          page: 1,
          limit: STAMPS_GRID_LIMIT,
          total: 0,
          totalPages: 0,
        },

        tokensData: [],
        tokensPagination: {
          page: 1,
          limit: TOKENS_GRID_LIMIT,
          total: 0,
          totalPages: 0,
        },
      });
    }
  },
};

/* ===== PAGE COMPONENT ===== */
export default function WalletPage(props: { data: WalletProfilePageProps }) {
  const routeData = props.data;
  const isDispenserOnly = isDispenserOnlyAddress(routeData);

  /* ===== RENDER ===== */
  return (
    <div
      class={`${body} ${containerGap}`}
      f-client-nav
      data-partial={`/wallet/${routeData.address}`}
    >
      {
        /* MetaTags used to render here, inside <body> rather than a Fresh
          <Head>, which emitted a second <title> (invalid in body, so browsers
          ignored it) plus a duplicate favicon and JSON-LD block. The wallet
          title and description now come from $lib/utils/pageMetadata.ts via
          _app.tsx, which puts them in the real <head>. */
      }
      {isDispenserOnly
        ? (
          <WalletContentDispenser
            walletData={routeData.walletData as WalletOverviewInfo}
            stampsTotal={routeData.stampsTotal || 0}
            src20Total={routeData.src20Total || 0}
            stampsCreated={routeData.stampsCreated || 0}
            setShowItem={() => {}}
          />
        )
        : (
          <>
            <WalletHeader
              walletData={routeData.walletData as WalletOverviewInfo}
              stampsTotal={routeData.stampsTotal}
              src20Total={routeData.src20Total}
              stampsCreated={routeData.stampsCreated}
              setShowItem={() => {}}
            />
            <WalletContent
              address={routeData.address}
              anchor={routeData.anchor}
              section={routeData.section}
              tab={routeData.tab}
              view={routeData.view}
              stampsData={routeData.stampsData}
              stampsPagination={routeData.stampsPagination}
              tokensData={routeData.tokensData}
              tokensPagination={routeData.tokensPagination}
            />
          </>
        )}
    </div>
  );
}
