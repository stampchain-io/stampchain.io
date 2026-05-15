/* ===== SALES ACTIVITY FEED COMPONENT ===== */
import { Icon, LoadingIcon } from "$icon";
import { container2 } from "$layout";
import {
  abbreviateAddress,
  formatBTCAmount,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { subtitleNeutral, titleNeutral } from "$text";
import type { StampWithEnhancedSaleData } from "$types/marketData.d.ts";
import type { SalesActivityFeedProps } from "$types/ui.d.ts";
import { useEffect, useState } from "preact/hooks";

export default function SalesActivityFeed({
  title = "Sales Activity",
  subTitle = "Latest stamp transactions",
  sales = [],
  isLoading = false,
  btcPriceUSD = 0,
  maxItems = 20,
  showTimestamps = true,
  showStampPreviews = true,
  autoRefresh = false,
  refreshIntervalMs = 30000,
  onRefresh,
  onItemClick,
  compact = false,
}: SalesActivityFeedProps) {
  /* ===== STATE ===== */
  const [refreshLoading, setRefreshLoading] = useState(false);

  /* ===== EVENT HANDLERS ===== */
  const handleRefresh = async () => {
    if (!onRefresh || refreshLoading) return;

    setRefreshLoading(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Failed to refresh sales feed:", error);
    } finally {
      setRefreshLoading(false);
    }
  };

  const handleItemClick = (sale: StampWithEnhancedSaleData) => {
    if (onItemClick) {
      onItemClick(sale);
    } else {
      // Default behavior: navigate to stamp detail page with SSR protection
      if (typeof globalThis === "undefined" || !globalThis?.location) {
        return; // Cannot navigate during SSR
      }
      globalThis.location.href = `/stamp/${sale.tx_hash}`;
    }
  };

  /* ===== EFFECTS ===== */
  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return;

    const interval = setInterval(() => {
      if (!refreshLoading) {
        handleRefresh();
      }
    }, refreshIntervalMs);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshIntervalMs, onRefresh, refreshLoading]);

  /* ===== DATA PROCESSING ===== */
  const displayedSales = sales.slice(0, maxItems);
  const explorerBaseUrl = "https://mempool.space/tx/";
  const addressExplorerUrl = "https://mempool.space/address/";

  /* ===== RENDER HELPERS ===== */
  const renderSaleItem = (sale: StampWithEnhancedSaleData, index: number) => {
    const saleData = sale.sale_data;
    if (!saleData) return null;

    const usdValue = btcPriceUSD && saleData.btc_amount
      ? saleData.btc_amount * btcPriceUSD
      : null;

    return (
      <div
        key={`${sale.tx_hash}-${saleData.tx_hash}-${index}`}
        class={`feed-item border-l-2 border-color-purple-light pl-4 pb-6 relative ${
          !compact
            ? "hover:bg-gray-800/30 transition-colors cursor-pointer rounded-r-lg p-4 -ml-4"
            : ""
        }`}
        onClick={() => !compact && handleItemClick(sale)}
      >
        {/* Timeline dot */}
        <div class="absolute -left-2 top-2 w-4 h-4 bg-color-purple-light rounded-full border-2 border-gray-900">
        </div>

        <div class="flex gap-4">
          {/* Stamp Preview */}
          {showStampPreviews && (
            <div class="flex-shrink-0">
              <div class="w-12 h-12 bg-gray-700 rounded-2xl border-2 border-gray-600 overflow-hidden">
                <img
                  src={`/api/v2/stamps/src/${sale.tx_hash}?size=small`}
                  alt={`Stamp #${sale.stamp}`}
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Sale Information */}
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                {/* Stamp identifier and price */}
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-white font-bold text-sm">
                    Stamp #{sale.stamp}
                  </span>
                  <span class="text-gray-400 text-xs">sold for</span>
                  <span class="text-green-400 font-mono font-bold text-sm">
                    {formatBTCAmount(saleData.btc_amount)} BTC
                  </span>
                  {usdValue && (
                    <span class="text-gray-400 text-xs">
                      (${usdValue.toFixed(2)})
                    </span>
                  )}
                </div>

                {/* Transaction details */}
                <div class="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  {saleData.buyer_address && (
                    <div class="flex items-center gap-1">
                      <span>to</span>
                      <a
                        href={`${addressExplorerUrl}${saleData.buyer_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-blue-400 hover:text-blue-300 font-mono"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {abbreviateAddress(saleData.buyer_address, 4)}
                      </a>
                    </div>
                  )}

                  {saleData.dispenser_address && (
                    <div class="flex items-center gap-1">
                      <span>via</span>
                      <a
                        href={`${addressExplorerUrl}${saleData.dispenser_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-purple-400 hover:text-purple-300 font-mono"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {abbreviateAddress(saleData.dispenser_address, 4)}
                      </a>
                    </div>
                  )}

                  <div class="flex items-center gap-1">
                    <span>block</span>
                    <span class="font-mono">
                      #{saleData.block_index.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Timestamp */}
                {showTimestamps && saleData.time_ago && (
                  <div class="text-xs text-gray-500 mt-1">
                    {saleData.time_ago}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div class="flex items-center gap-1">
                <a
                  href={`${explorerBaseUrl}${saleData.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                  title="View transaction"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon
                    name="external-link"
                    size="xs"
                    type="icon"
                    weight="normal"
                    color="custom"
                  />
                </a>
                {!compact && (
                  <button
                    type="button"
                    class="p-1 text-gray-400 hover:text-white transition-colors"
                    title="View stamp details"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(sale);
                    }}
                  >
                    <Icon
                      name="eye"
                      size="xs"
                      type="icon"
                      weight="normal"
                      color="custom"
                    />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ===== RENDER ===== */
  return (
    <div class="w-full">
      {/* ===== HEADER ===== */}
      <div class="flex justify-between items-center mb-6">
        <div class="flex flex-col">
          {title && (
            <h2 class={`${titleNeutral} !bg-gradient-to-l text-lg`}>
              {title}
            </h2>
          )}
          {subTitle && (
            <p class={`${subtitleNeutral} text-sm`}>
              {subTitle}
            </p>
          )}
        </div>

        {/* Refresh controls */}
        {onRefresh && (
          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshLoading}
              class="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh feed"
            >
              <Icon
                name={refreshLoading ? "loading" : "refresh"}
                size="sm"
                type="icon"
                weight="normal"
                color="custom"
                className={refreshLoading ? "animate-spin" : ""}
              />
            </button>
            {autoRefresh && (
              <div class="text-xs text-gray-500">
                Auto: {refreshIntervalMs / 1000}s
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== FEED CONTENT ===== */}
      <div class="relative">
        {isLoading
          ? (
            <div class="flex items-center justify-center py-12">
              <LoadingIcon />
              <span class="ml-2 text-gray-400">Loading sales activity...</span>
            </div>
          )
          : displayedSales.length > 0
          ? (
            <div class="space-y-0">
              {displayedSales.map((
                sale: StampWithEnhancedSaleData,
                index: number,
              ) => renderSaleItem(sale, index))}
            </div>
          )
          : (
            <div class="text-center py-12">
              <div class="text-gray-400 text-lg mb-2">
                No recent sales activity
              </div>
              <div class="text-gray-500 text-sm">
                Sales will appear here as they happen
              </div>
            </div>
          )}

        {/* Timeline end marker */}
        {displayedSales.length > 0 && !isLoading && (
          <div class="border-l-2 border-gray-600 pl-4 pb-2 relative">
            <div class="absolute -left-2 top-0 w-4 h-4 bg-gray-600 rounded-full border-2 border-gray-900">
            </div>
            <div class="text-xs text-gray-500 italic">
              Showing latest {displayedSales.length} sales
            </div>
          </div>
        )}
      </div>

      {/* ===== LOADING OVERLAY FOR REFRESH ===== */}
      {refreshLoading && !isLoading && (
        <div class="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded-2xl">
          <div class={`${container2} p-4 flex items-center gap-2`}>
            <LoadingIcon />
            <span class="text-white text-sm">Refreshing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
