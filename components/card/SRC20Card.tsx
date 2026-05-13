import { cellAlign, colGroup } from "$components/layout/types.ts";
import { SSRSafeUrlBuilder } from "$components/navigation/SSRSafeUrlBuilder.tsx";
import { Icon, PlaceholderImage } from "$icon";
import ChartWidget from "$islands/layout/ChartWidget.tsx";
import {
  cellCenterCard,
  cellLeftCard,
  cellRightCard,
  cellStickyLeft,
  glassmorphism,
  shadowGlowPurple,
} from "$layout";
import {
  isBrowser,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import { formatDate } from "$lib/utils/ui/formatting/formatUtils.ts";
import { constructStampUrl } from "$lib/utils/ui/media/imageUtils.ts";
import {
  labelXs,
  textSm,
  valueDarkSm,
  valueNegative,
  valueNeutral,
  valuePositive,
} from "$text";
import type { SRC20Row } from "$types/src20.d.ts";
import type { HighchartsData } from "$types/ui.d.ts";

function getMarketCap(src20: any): number {
  const marketCap = src20?.market_data?.market_cap_btc;
  if (!marketCap) return 0;
  // Parse as float to handle string values from API
  const parsed = parseFloat(marketCap);
  return isNaN(parsed) ? 0 : parsed;
}

// Helper to get price source type label
function getPriceSourceLabel(sourceType?: string): string {
  switch (sourceType) {
    case "last_traded":
      return "Last Trade";
    case "floor_ask":
      return "Floor Ask";
    case "composite":
      return "Avg Price";
    case "unknown":
    default:
      return "";
  }
}

// ✅ FIXED: Use price_btc for fungible SRC-20 tokens (not floor_price_btc)
function getPrice(src20: any): number {
  const price = src20?.market_data?.price_btc;
  if (!price) return 0;
  // Parse as float to handle string values from API
  const parsed = parseFloat(price.toString());
  return isNaN(parsed) ? 0 : parsed;
}

function getVolume24h(src20: any): number {
  const volume = src20.market_data?.volume_24h_btc ?? src20.volume_7d_btc;
  if (!volume) return 0;
  // Parse as float to handle string values from API
  const parsed = parseFloat(volume.toString());
  return isNaN(parsed) ? 0 : parsed;
}

interface SRC20CardProps {
  data: any;
  fromPage?: string;
  timeframe?: string;
  onImageClick?: (ticker: string) => void;
  currentSort?: {
    filter: string;
    direction: "asc" | "desc";
  } | null;
}

export function SRC20Card({
  data,
  fromPage: _fromPage,
  timeframe,
  onImageClick,
  currentSort,
}: SRC20CardProps) {
  const headers = [
    "TOKEN",
    "PRICE",
    "CHANGE",
    "VOLUME",
    "MARKETCAP",
    "DEPLOY",
    "HOLDERS",
    "CHART",
  ];

  // Helper function to handle header clicks for sorting
  const handleHeaderClick = (headerName: string) => {
    // Skip sorting for CHART header (non-interactive)
    if (headerName === "CHART") {
      return;
    }

    // Map header names to API sort parameters
    const sortMapping: Record<string, string> = {
      "TOKEN": "TOKEN", // Alphabetical sorting
      "PRICE": "PRICE",
      "CHANGE": "CHANGE",
      "VOLUME": "VOLUME",
      "MARKETCAP": "MARKET_CAP",
      "DEPLOY": "DEPLOY",
      "HOLDERS": "HOLDERS",
    };

    const apiSortKey = sortMapping[headerName];
    if (!apiSortKey) return;

    // Determine new direction
    const isCurrentSort = currentSort?.filter === apiSortKey;
    const newDirection = isCurrentSort && currentSort.direction === "desc"
      ? "asc"
      : "desc";

    // Navigate with new sort parameters using SSR-safe URL builder
    if (isBrowser()) {
      const url = SSRSafeUrlBuilder.fromCurrent()
        .setParam("sortBy", apiSortKey)
        .setParam("sortDirection", newDirection)
        .setParam("page", "1") // Reset to page 1 when sorting changes
        .toString();

      // Use Fresh.js navigation
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("f-partial", "");
      link.style.display = "none";
      document.body.appendChild(link as Node);
      link.click();
      document.body.removeChild(link as Node);
    }
  };

  // Helper function to get segmented control header class names (Apple HIG style)
  const getSegmentedHeaderClass = (
    index: number,
    isFirst: boolean,
    isLast: boolean,
    isSelected: boolean,
    isClickable: boolean,
  ) => {
    const baseClass = `${labelXs} ${
      cellAlign(index, headers?.length ?? 0)
    } py-2`;

    // Row background color and rounded corners
    const rowClass = isFirst
      ? cellLeftCard
      : isLast
      ? cellRightCard
      : cellCenterCard;

    // Selected segment styling
    const selectedClass = isSelected ? "text-color-grey-light" : "";

    const colorClass = isSelected
      ? "text-color-grey-light"
      : isClickable
      ? "text-color-grey-semidark hover:text-color-grey-light"
      : "text-color-grey-semidark";

    const clickableClass = isClickable
      ? "cursor-pointer transition-all duration-200 select-none"
      : "";

    const sortIndicator = isSelected ? "relative" : "";

    return `${baseClass} ${rowClass} ${selectedClass} ${colorClass} ${clickableClass} ${sortIndicator}`
      .trim();
  };

  // Helper function to render sort indicator
  const renderSortIndicator = (headerName: string) => {
    // Map header names to API sort parameters
    const sortMapping: Record<string, string> = {
      "TOKEN": "TOKEN",
      "PRICE": "PRICE",
      "CHANGE": "CHANGE",
      "VOLUME": "VOLUME",
      "MARKETCAP": "MARKET_CAP",
      "DEPLOY": "DEPLOY",
      "HOLDERS": "HOLDERS",
    };

    const apiSortKey = sortMapping[headerName];
    const isCurrentSort = currentSort?.filter === apiSortKey;

    if (!isCurrentSort) return null;

    return (
      <span class="absolute -right-5 -top-[1px]">
        <Icon
          type="icon"
          name="caretUp"
          weight="normal"
          size="xxxs"
          color="custom"
          className={`stroke-color-grey-light transition-all duration-200 transform ${
            currentSort.direction === "desc" ? "scale-y-[-1]" : ""
          }`}
        />
      </span>
    );
  };

  function splitTextAndEmojis(text: string): { text: string; emoji: string } {
    // Ensure text is actually a string
    if (typeof text !== "string") {
      return { text: String(text || ""), emoji: "" };
    }

    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;
    const match = text.match(emojiRegex);
    if (!match || !match[0]) return { text, emoji: "" };
    const emojiIndex = text.indexOf(match[0]);
    return {
      text: text.slice(0, emojiIndex),
      emoji: text.slice(emojiIndex),
    };
  }

  return (
    <div class="overflow-x-auto tablet:overflow-x-visible scrollbar-hide">
      <table class={`w-full border-separate border-spacing-y-3 ${textSm}`}>
        <colgroup>
          {colGroup([
            {
              width:
                "min-w-[150px] max-w-[180px] w-auto sticky left-0 tablet:static",
            }, // TOKEN
            { width: "min-w-[120px] w-auto" }, // PRICE
            { width: "min-w-[90px] w-auto" }, // CHANGE
            { width: "min-w-[110px] w-auto" }, // VOLUME
            { width: "min-w-[110px] w-auto" }, // MARKETCAP
            { width: "min-w-[110px] w-auto" }, // DEPLOY
            { width: "min-w-[90px] w-auto" }, // HOLDERS
            { width: "min-w-[160px] w-auto" }, // CHART
          ]).map((col) => <col key={col.key} class={col.className} />)}
        </colgroup>
        <thead>
          <tr class={`${glassmorphism}`}>
            {headers.map((header, i) => {
              const isFirst = i === 0;
              const isLast = i === (headers?.length ?? 0) - 1;
              const isClickable = header !== "CHART";

              // Get sort state for segmented control styling
              const sortMapping: Record<string, string> = {
                "TOKEN": "TOKEN",
                "PRICE": "PRICE",
                "CHANGE": "CHANGE",
                "VOLUME": "VOLUME",
                "MARKETCAP": "MARKET_CAP",
                "DEPLOY": "DEPLOY",
                "HOLDERS": "HOLDERS",
              };
              const apiSortKey = sortMapping[header];
              const isSelected = currentSort?.filter === apiSortKey;

              return (
                <th
                  key={header}
                  class={`${
                    getSegmentedHeaderClass(
                      i,
                      isFirst,
                      isLast,
                      isSelected,
                      isClickable,
                    )
                  } ${isFirst ? cellStickyLeft : ""}`}
                  onClick={() => handleHeaderClick(header)}
                >
                  <span class="relative inline-block">
                    {header}
                    {(header === "CHANGE" || header === "VOLUME") &&
                      ` ${timeframe}`}
                    {renderSortIndicator(header)}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data?.length
            ? (
              data.map((src20: SRC20Row) => {
                // SRC-20 Image URL Logic:
                // 1. Use deploy_img if provided (for deploy operations: https://stampchain.io/stamps/{deploy_tx}.svg)
                // 2. Use stamp_url if provided (for transaction stamps: https://stampchain.io/stamps/{tx_hash}.svg)
                // 3. Fallback to constructing URL from deploy_tx if available
                // 4. Final fallback to null (will render PlaceholderImage component)
                const imageUrl = src20.deploy_img ||
                  src20.stamp_url ||
                  (src20.deploy_tx ? constructStampUrl(src20.deploy_tx) : null);

                return (
                  <tr
                    key={src20.tx_hash}
                    class={`${glassmorphism} ${shadowGlowPurple}`}
                    onClick={(e) => {
                      // Only navigate if not clicking on image or chart
                      const target = e.target as HTMLElement;
                      const isImage = target.tagName === "IMG";
                      const isChart = target.closest("[data-chart-widget]"); // Add this data attribute to ChartWidget
                      if (
                        !isImage && !isChart && !e.ctrlKey && !e.metaKey &&
                        e.button !== 1
                      ) {
                        e.preventDefault();
                        // SSR-safe browser environment check
                        if (!isBrowser()) {
                          return; // Cannot navigate during SSR
                        }
                        const href = `/src20/${
                          encodeURIComponent(
                            unicodeEscapeToEmoji(src20.tick ?? ""),
                          )
                        }`;
                        safeNavigate(href);
                      }
                    }}
                  >
                    {/* TOKEN */}
                    <td
                      class={`${
                        cellAlign(0, headers?.length ?? 0)
                      } ${cellLeftCard} ${cellStickyLeft}`}
                    >
                      <div class="flex items-center gap-4">
                        {imageUrl
                          ? (
                            <img
                              src={imageUrl}
                              class="w-7 h-7 rounded cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation(); // Prevent row click
                                if (imageUrl) onImageClick?.(imageUrl);
                              }}
                              alt={unicodeEscapeToEmoji(src20.tick ?? "")}
                            />
                          )
                          : (
                            <div
                              class="w-7 h-7 rounded cursor-pointer overflow-hidden"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation(); // Prevent row click
                              }}
                            >
                              <PlaceholderImage variant="no-image" />
                            </div>
                          )}
                        <div class="flex flex-col">
                          <div class="font-bold text-base uppercase tracking-wide">
                            {(() => {
                              const tickValue = src20.tick ?? "";
                              const emojiValue = unicodeEscapeToEmoji(
                                tickValue,
                              );
                              const { text, emoji } = splitTextAndEmojis(
                                emojiValue,
                              );
                              return (
                                <>
                                  {text && (
                                    <span class="bg-gradient-to-l color-neutral-gradient color-gradient-hover inline-block transition-colors duration-200">
                                      {text.toUpperCase()}
                                    </span>
                                  )}
                                  {emoji && (
                                    <span class="emoji-ticker">{emoji}</span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* PRICE */}
                    <td
                      class={`${
                        cellAlign(1, headers?.length ?? 0)
                      } ${cellCenterCard}`}
                    >
                      {(() => {
                        // ✅ CLEANED: No more root-level field access
                        const priceInBtc = getPrice(src20);
                        const priceSourceType = undefined; // price_source_type not available in MarketListingAggregated
                        const sourceLabel = getPriceSourceLabel(
                          priceSourceType,
                        );

                        if (priceInBtc === 0) {
                          return "0 SATS";
                        }
                        const priceInSats = priceInBtc * 1e8;

                        // Smart formatting based on price level
                        let priceDisplay = "";
                        if (priceInSats < 0.0001) {
                          // For extremely small values, show with high precision
                          priceDisplay = priceInSats.toFixed(6) + " SATS";
                        } else if (priceInSats < 1) {
                          // For values less than 1 sat, show 4 decimal places
                          priceDisplay = priceInSats.toFixed(4) + " SATS";
                        } else if (priceInSats < 10) {
                          // For values 1-10 sats, show 2 decimal places
                          priceDisplay = priceInSats.toFixed(2) + " SATS";
                        } else if (priceInSats < 100000) {
                          // For larger values, use comma formatting
                          priceDisplay = priceInSats.toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }) + " SATS";
                        } else {
                          // For very large values, switch to K/M notation
                          const millions = priceInSats / 1000000;
                          if (millions >= 1) {
                            priceDisplay = millions.toFixed(2) + "M SATS";
                          } else {
                            const thousands = priceInSats / 1000;
                            priceDisplay = thousands.toFixed(1) + "K SATS";
                          }
                        }

                        // Add price source indicator if available
                        if (sourceLabel) {
                          return (
                            <span class="relative">
                              {priceDisplay}
                              <sup class="text-[8px] text-color-grey-light ml-0.5">
                                {sourceLabel}
                              </sup>
                            </span>
                          );
                        }

                        return priceDisplay;
                      })()}
                    </td>
                    {/* CHANGE */}
                    <td
                      class={`${cellCenterCard} text-center`}
                    >
                      {(() => {
                        const change = src20.market_data?.change_24h_percent;
                        if (change !== undefined && change !== null) {
                          const changeNum = Number(change);
                          if (!isNaN(changeNum)) {
                            return (
                              <span
                                class={changeNum > 0
                                  ? valuePositive
                                  : changeNum < 0
                                  ? valueNegative
                                  : valueNeutral}
                              >
                                {changeNum > 0 ? "+" : ""}
                                {changeNum.toFixed(2)}%
                              </span>
                            );
                          }
                        }
                        return <span class="text-color-grey">N/A</span>;
                      })()}
                    </td>
                    {/* VOLUME */}
                    <td
                      class={`${
                        cellAlign(3, headers?.length ?? 0)
                      } ${cellCenterCard}`}
                    >
                      {(() => {
                        // ✅ CLEANED: No more type casting chaos
                        const volume = getVolume24h(src20);
                        if (volume === 0) {
                          return "0 BTC";
                        }

                        // Smart formatting based on volume level
                        if (volume < 0.0001) {
                          // For very small volumes, show 6 decimals
                          return volume.toFixed(6) + " BTC";
                        } else if (volume < 0.01) {
                          // For small volumes, show 4 decimals
                          return volume.toFixed(4) + " BTC";
                        } else if (volume < 0.1) {
                          // For medium-small volumes, show 3 decimals
                          return volume.toFixed(3) + " BTC";
                        } else if (volume < 1) {
                          // For sub-1 BTC volumes, show 2 decimals
                          return volume.toFixed(2) + " BTC";
                        } else if (volume < 100) {
                          // For 1-100 BTC, show 2 decimals
                          return volume.toFixed(2) + " BTC";
                        } else {
                          // For large volumes, show whole numbers with commas
                          return Math.round(volume).toLocaleString() + " BTC";
                        }
                      })()}
                    </td>
                    {/* MARKETCAP */}
                    <td
                      class={`${
                        cellAlign(4, headers?.length ?? 0)
                      } ${cellCenterCard}`}
                    >
                      {(() => {
                        // ✅ FIXED: Use correct market data path with proper typing
                        const marketCap = getMarketCap(src20);
                        if (marketCap === 0) {
                          return "0 BTC";
                        } else if (marketCap < 1) {
                          // For small market caps, show 2 decimals
                          return marketCap.toFixed(2) + " BTC";
                        } else if (marketCap < 100) {
                          // For medium market caps, show 2 decimals
                          return marketCap.toFixed(2) + " BTC";
                        } else if (marketCap < 1000) {
                          // For larger market caps, show 1 decimal
                          return marketCap.toFixed(1) + " BTC";
                        } else {
                          // For very large market caps, show whole numbers with commas
                          return Math.round(marketCap).toLocaleString() +
                            " BTC";
                        }
                      })()}
                    </td>

                    {/* DEPLOY */}
                    <td
                      class={`${
                        cellAlign(5, headers?.length ?? 0)
                      } ${cellCenterCard}`}
                    >
                      {formatDate(new Date(src20.block_time), {
                        month: "numeric",
                        day: "numeric",
                        year: "numeric",
                      }).toUpperCase()}
                    </td>
                    {/* HOLDERS */}
                    <td
                      class={`${
                        cellAlign(6, headers?.length ?? 0)
                      } ${cellCenterCard}`}
                    >
                      {(() => {
                        // First try market_data.holder_count (v2.3 structure)
                        const holderCount = src20.market_data?.holder_count ??
                          // Fallback to root level holders for backward compatibility
                          src20.holders ??
                          0;
                        return Number(holderCount).toLocaleString();
                      })()}
                    </td>

                    {/* CHART */}
                    <td
                      class={`${
                        cellAlign(7, headers?.length ?? 0)
                      } ${cellRightCard} !py-0`}
                    >
                      {src20.chart
                        ? (
                          <ChartWidget
                            type="line"
                            fromPage="home"
                            data={src20.chart as unknown as HighchartsData}
                            tick={src20.tick ?? ""}
                            data-chart-widget
                          />
                        )
                        : (
                          <div class="flex items-center justify-center text-xs text-color-grey-light opacity-60">
                            <span>—</span>
                          </div>
                        )}
                    </td>
                  </tr>
                );
              })
            )
            : (
              <tr>
                <td
                  colSpan={headers?.length ?? 0}
                  class={`w-full h-[46px] ${glassmorphism}`}
                >
                  <h6 class={`${valueDarkSm} text-center`}>
                    NO TOKENS TO DISPLAY
                  </h6>
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
