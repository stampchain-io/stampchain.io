/* ===== DETAILS TABLE COMPONENT ===== */
import { SelectorButtons } from "$button";
import { SRC20DetailInfo } from "$islands/header/index.ts";
import {
  containerBackground,
  PillContentCount,
  ScrollContainer,
  ScrollFadeRow,
} from "$layout";
import { formatNumberWithCommas } from "$lib/utils/ui/formatting/formatUtils.ts";
import {
  HoldersPieChart,
  HoldersTableBase,
  SRC20MintsTable,
  SRC20TransfersTable,
  StampListingsAllTable,
  StampSalesTable,
  StampTransfersTable,
} from "$table";
import { subtitlePrimary } from "$text";
import type { TabData, TableProps, TableType } from "$types/ui.d.ts";
import { useEffect, useState } from "preact/hooks";

/* ===== CONSTANTS ===== */
const PAGE_SIZE = 16;

/* ===== COMPONENT ===== */
export default function DetailsTableBase({
  type,
  configs = [],
  cpid,
  tick,
  initialCounts = {},
  holders = [],
  title,
  deployment,
}: TableProps) {
  /* ===== STATE ===== */
  const [selectedTab, setSelectedTab] = useState<string>(
    configs.length > 0 ? configs[0].id : "",
  );
  const [tabData, setTabData] = useState<TabData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCounts, setTotalCounts] = useState(initialCounts);

  /* ===== DATA HANDLERS ===== */
  const fetchData = async (
    pageNum: number,
    tabId: string,
    isTabChange = false,
  ) => {
    // Holders data comes from the `holders` prop (SSR), not a client fetch,
    // and "info" is rendered directly from the `deployment` prop.
    if (tabId === "holders" || tabId === "info") return;
    if (!isTabChange && !hasMore) return;

    setIsLoading(true);
    try {
      if (type === "stamps" && cpid) {
        const encodedCpid = encodeURIComponent(cpid);
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: PAGE_SIZE.toString(),
          sort: "DESC",
        });

        const operation = tabId === "dispensers"
          ? "dispensers"
          : tabId === "sales"
          ? "dispenses"
          : "sends";

        const response = await fetch(
          `/api/v2/stamps/${encodedCpid}/${operation}?${params}`,
        );

        // Handle 404 responses (no data found) gracefully
        if (!response.ok) {
          if (response.status === 404) {
            setTabData((prev: TabData) => ({
              ...prev,
              [operation]: isTabChange ? [] : prev[operation] || [],
            }));
            setHasMore(false);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        setTabData((prev: TabData) => ({
          ...prev,
          [operation]: isTabChange
            ? data.data
            : [...(prev[operation] || []), ...data.data],
        }));

        setHasMore(data.data?.length === PAGE_SIZE);
      } else if (type === "src20" && tick) {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: PAGE_SIZE.toString(),
          sort: "DESC",
        });

        const operation = tabId === "mints" ? "MINT" : "TRANSFER";
        const response = await fetch(
          `/api/v2/src20/tick/${tick}?op=${operation}&${params}`,
          {
            headers: {
              "X-API-Version": "2.3",
            },
          },
        );
        const data = await response.json();

        setTabData((prev: TabData) => ({
          ...prev,
          [tabId]: isTabChange
            ? data.data
            : [...(prev[tabId] || []), ...data.data],
        }));

        setHasMore(data.data?.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error(`Error fetching ${tabId} data:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  /* ===== RENDER HELPERS ===== */
  const renderTabContent = () => {
    if (type === "stamps") {
      switch (selectedTab) {
        case "dispensers":
          return (
            <StampListingsAllTable
              listings={tabData.dispensers || []}
              isLoading={isLoading}
            />
          );
        case "sales":
          // Dispenses already include the real per-transaction `btc_amount`
          // from Counterparty, so no client-side rate-joining is needed
          // (that previously depended on the "listings" tab having been
          // fetched first, and silently showed 0 BTC otherwise).
          return (
            <StampSalesTable
              dispenses={tabData.dispenses || []}
              isLoading={isLoading}
            />
          );
        case "transfers":
          return (
            <StampTransfersTable
              transactions={tabData.sends || []}
              sends={tabData.sends || []}
              isLoading={isLoading}
            />
          );
        default:
          return null;
      }
    } else if (type === "src20") {
      switch (selectedTab) {
        case "mints":
          return (
            <SRC20MintsTable
              mints={tabData.mints || []}
              isLoading={isLoading}
            />
          );
        case "transfers":
          return (
            <SRC20TransfersTable
              transactions={tabData.transfers || []}
              sends={tabData.transfers || []}
              isLoading={isLoading}
            />
          );
        default:
          return null;
      }
    }
    return null;
  };

  /* ===== EFFECTS ===== */
  useEffect(() => {
    if (!selectedTab) return;
    setPage(1);
    setHasMore(true);
    fetchData(1, selectedTab, true);
  }, [selectedTab]);

  /* ===== EVENT HANDLERS ===== */
  const handleScroll = (e: Event) => {
    const target = e.target as HTMLDivElement;
    const scrollPosition = target.scrollTop + target.clientHeight;
    const scrollThreshold = target.scrollHeight - 20;
    if (
      scrollPosition >= scrollThreshold &&
      !isLoading &&
      hasMore
    ) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, selectedTab);
    }
  };

  /* ===== DATA INITIALIZATION ===== */
  useEffect(() => {
    if (Object.keys(initialCounts).length > 0) return;

    const fetchCounts = async () => {
      if (!tick && !cpid) return;

      try {
        if (type === "stamps" && cpid) {
          const encodedCpid = encodeURIComponent(cpid);
          const countParams = new URLSearchParams({
            limit: PAGE_SIZE.toString(),
            sort: "DESC",
          });

          const [dispensersCount, salesCount, transfersCount] = await Promise
            .all([
              fetch(`/api/v2/stamps/${encodedCpid}/dispensers?${countParams}`),
              fetch(`/api/v2/stamps/${encodedCpid}/dispenses?${countParams}`),
              fetch(`/api/v2/stamps/${encodedCpid}/sends?${countParams}`),
            ]);

          // Handle 404s gracefully for count fetching
          const dispensersData = dispensersCount.ok
            ? await dispensersCount.json()
            : { total: 0 };
          const salesData = salesCount.ok
            ? await salesCount.json()
            : { total: 0 };
          const transfersData = transfersCount.ok
            ? await transfersCount.json()
            : { total: 0 };

          setTotalCounts({
            dispensers: dispensersData.total || 0,
            sales: salesData.total || 0,
            transfers: transfersData.total || 0,
          });
        } else if (type === "src20" && tick) {
          const encodedTick = encodeURIComponent(tick);
          const [transferCount, mintCount] = await Promise.all([
            fetch(`/api/v2/src20/tick/${encodedTick}?op=TRANSFER&limit=1`, {
              headers: {
                "X-API-Version": "2.3",
              },
            }),
            fetch(`/api/v2/src20/tick/${encodedTick}?op=MINT&limit=1`, {
              headers: {
                "X-API-Version": "2.3",
              },
            }),
          ]);

          const [transferData, mintData] = await Promise.all([
            transferCount.json(),
            mintCount.json(),
          ]);

          setTotalCounts((prev: any) => ({
            ...prev,
            transfers: transferData.total || 0,
            mints: mintData.total || 0,
          }));
        }
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    };

    fetchCounts();
  }, [type, cpid, tick]);

  /* ===== HELPER FUNCTIONS ===== */
  const getTabLabel = (type: TableType, id: string) => {
    if (id === "holders") return "HOLDERS";
    if (id === "info") return "INFO";

    switch (type) {
      case "stamps":
        return id === "dispensers"
          ? "LISTINGS"
          : id === "sales"
          ? "SALES"
          : "TRANSFERS";
      case "src20":
        return id === "mints" ? "MINTS" : "TRANSFERS";
      case "src101":
        // Add bitname specific labels
        return id.toUpperCase();
      case "vault":
        // Add vault specific labels
        return id.toUpperCase();
      default:
        return id.toUpperCase();
    }
  };

  const selectorOptions = configs.map(({ id }) => ({
    value: id,
    label: type ? getTabLabel(type, id) : id.toUpperCase(),
  }));

  /* ===== COUNT PILL ===== */
  // Reflects only the currently selected tab's own count.
  const selectedTabCount = selectedTab === "holders"
    ? holders.length
    : totalCounts[selectedTab as keyof typeof totalCounts] || 0;
  const countPill = formatNumberWithCommas(selectedTabCount);

  /* ===== RENDER ===== */
  return (
    <div class={containerBackground}>
      {/* ===== TITLE ===== */}
      {title && (
        <div class="relative">
          <h4 class={`-mt-1.5 ${subtitlePrimary}`}>{title}</h4>
          {selectedTab !== "info" && <PillContentCount value={countPill} />}
        </div>
      )}
      {/* ===== TABS SECTION ===== */}
      <div class="w-full mb-5">
        <ScrollFadeRow deps={[selectedTab, selectorOptions]}>
          <div class="shrink-0">
            <SelectorButtons
              options={selectorOptions}
              value={selectedTab}
              onChange={setSelectedTab}
              size="xsR"
              color="primary"
            />
          </div>
        </ScrollFadeRow>
      </div>
      {/* ===== TAB CONTENT ===== */}
      {selectedTab === "holders"
        ? (
          <div class="flex flex-col tablet:flex-row w-full gap-5">
            <div class="flex justify-center tablet:justify-start">
              <HoldersPieChart holders={holders} />
            </div>
            <div class="relative w-full max-w-full">
              <HoldersTableBase holders={holders} />
            </div>
          </div>
        )
        : selectedTab === "info"
        ? deployment && <SRC20DetailInfo deployment={deployment} />
        : (
          <ScrollContainer
            class="min-h-[72px] max-h-[296px] scrollbar-background-layer1"
            onScroll={handleScroll}
          >
            <div class="">
              {renderTabContent()}
              {/* ===== LOADING INDICATOR ===== */}
              {isLoading && (
                <div class="flex flex-col w-full mb-2 gap-2">
                  {[...Array(6)].map((_, index) => (
                    <div
                      key={index}
                      class="loading-skeleton running w-full rounded-2xl h-[34px]"
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollContainer>
        )}
    </div>
  );
}
