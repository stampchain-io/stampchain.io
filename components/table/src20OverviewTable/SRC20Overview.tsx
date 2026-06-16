import { cellAlign, colGroup } from "$components/layout/types.ts";
import { SSRSafeUrlBuilder } from "$components/navigation/SSRSafeUrlBuilder.tsx";
import { Icon, PlaceholderImage } from "$icon";
import ChartWidget from "$islands/layout/ChartWidget.tsx";
import {
  cellCenterL2Card,
  cellLeftL2Card,
  cellRightL2Card,
  cellStickyLeft,
  container2,
  shadowGlowPurple,
} from "$layout";
import {
  isBrowser,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import { formatDate } from "$lib/utils/ui/formatting/formatUtils.ts";
import { getSRC20ImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import {
  labelXxs,
  textXs,
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
  const parsed = parseFloat(marketCap);
  return isNaN(parsed) ? 0 : parsed;
}

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

function getPrice(src20: any): number {
  const price = src20?.market_data?.price_btc;
  if (!price) return 0;
  const parsed = parseFloat(price.toString());
  return isNaN(parsed) ? 0 : parsed;
}

function getVolume24h(src20: any): number {
  const volume = src20.market_data?.volume_24h_btc ?? src20.volume_7d_btc;
  if (!volume) return 0;
  const parsed = parseFloat(volume.toString());
  return isNaN(parsed) ? 0 : parsed;
}

interface SRC20OverviewProps {
  data: any;
  fromPage?: string;
  timeframe?: string;
  onImageClick?: (ticker: string) => void;
  currentSort?: {
    filter: string;
    direction: "asc" | "desc";
  } | null;
}

export function SRC20Overview({
  data,
  fromPage: _fromPage,
  timeframe,
  onImageClick,
  currentSort,
}: SRC20OverviewProps) {
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

  const handleHeaderClick = (headerName: string) => {
    if (headerName === "CHART") {
      return;
    }

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
    if (!apiSortKey) return;

    const isCurrentSort = currentSort?.filter === apiSortKey;
    const newDirection = isCurrentSort && currentSort.direction === "desc"
      ? "asc"
      : "desc";

    if (isBrowser()) {
      const url = SSRSafeUrlBuilder.fromCurrent()
        .setParam("sortBy", apiSortKey)
        .setParam("sortDirection", newDirection)
        .setParam("page", "1")
        .toString();

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("f-partial", "");
      link.style.display = "none";
      document.body.appendChild(link as Node);
      link.click();
      document.body.removeChild(link as Node);
    }
  };

  const getSegmentedHeaderClass = (
    index: number,
    isFirst: boolean,
    isLast: boolean,
    isSelected: boolean,
    isClickable: boolean,
  ) => {
    const baseClass = `${labelXxs} ${
      cellAlign(index, headers?.length ?? 0)
    } py-1.5 !px-5`;

    const rowClass = isFirst
      ? cellLeftL2Card
      : isLast
      ? cellRightL2Card
      : cellCenterL2Card;

    const selectedClass = isSelected ? "text-color-primary-400" : "";

    const colorClass = isSelected
      ? "text-color-primary-400"
      : isClickable
      ? "text-color-neutral-500 hover:text-color-hover"
      : "text-color-neutral-500";

    const clickableClass = isClickable
      ? "cursor-pointer transition-all duration-200 select-none"
      : "";

    const sortIndicator = isSelected ? "relative" : "";

    return `${baseClass} ${rowClass} ${selectedClass} ${colorClass} ${clickableClass} ${sortIndicator}`
      .trim();
  };

  const renderSortIndicator = (headerName: string) => {
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
          className={`stroke-color-primary-400 transition-all duration-200 transform ${
            currentSort?.direction === "desc" ? "scale-y-[-1]" : ""
          }`}
        />
      </span>
    );
  };

  function splitTextAndEmojis(text: string): { text: string; emoji: string } {
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
      <table class={`w-full border-separate border-spacing-y-3 ${textXs}`}>
        <colgroup>
          {colGroup([
            {
              width:
                "min-w-[120px] max-w-[150px] w-auto sticky left-0 tablet:static",
            }, // TOKEN
            { width: "min-w-[100px] w-auto" }, // PRICE
            { width: "min-w-[90px] w-auto" }, // CHANGE
            { width: "min-w-[110px] w-auto" }, // VOLUME
            { width: "min-w-[110px] w-auto" }, // MARKETCAP
            { width: "min-w-[110px] w-auto" }, // DEPLOY
            { width: "min-w-[90px] w-auto" }, // HOLDERS
            { width: "min-w-[150px] w-auto" }, // CHART
          ]).map((col) => <col key={col.key} class={col.className} />)}
        </colgroup>
        <thead>
          <tr class={`${container2}`}>
            {headers.map((header, i) => {
              const isFirst = i === 0;
              const isLast = i === (headers?.length ?? 0) - 1;
              const isClickable = header !== "CHART";

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
                const imageUrl = src20.deploy_img ||
                  getSRC20ImageSrc(src20) ||
                  null;

                return (
                  <tr
                    key={src20.tx_hash}
                    class={`${container2} ${shadowGlowPurple}`}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      const isImage = target.tagName === "IMG";
                      const isChart = target.closest("[data-chart-widget]");
                      if (
                        !isImage && !isChart && !e.ctrlKey && !e.metaKey &&
                        e.button !== 1
                      ) {
                        e.preventDefault();
                        if (!isBrowser()) {
                          return;
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
                      } ${cellLeftL2Card} ${cellStickyLeft}`}
                    >
                      <div class="flex items-center gap-4">
                        {imageUrl
                          ? (
                            <img
                              src={imageUrl}
                              class="w-8 h-8 rounded-xl cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (imageUrl) onImageClick?.(imageUrl);
                              }}
                              alt={unicodeEscapeToEmoji(src20.tick ?? "")}
                            />
                          )
                          : (
                            <div
                              class="w-8 h-8 rounded-xl cursor-pointer overflow-hidden"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <PlaceholderImage
                                variant="no-image"
                                className="!rounded-xl"
                              />
                            </div>
                          )}
                        <div class="flex flex-col">
                          <div class="font-extrabold text-sm uppercase tracking-wide">
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
                                    <span class="bg-gradient-to-r color-neutral-gradient color-gradient-hover inline-block">
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
                      } ${cellCenterL2Card}`}
                    >
                      {(() => {
                        const priceInBtc = getPrice(src20);
                        const priceSourceType = undefined;
                        const sourceLabel = getPriceSourceLabel(
                          priceSourceType,
                        );

                        if (priceInBtc === 0) {
                          return "0 SATS";
                        }
                        const priceInSats = priceInBtc * 1e8;

                        let priceDisplay = "";
                        if (priceInSats < 0.0001) {
                          priceDisplay = priceInSats.toFixed(6) + " SATS";
                        } else if (priceInSats < 1) {
                          priceDisplay = priceInSats.toFixed(4) + " SATS";
                        } else if (priceInSats < 10) {
                          priceDisplay = priceInSats.toFixed(2) + " SATS";
                        } else if (priceInSats < 100000) {
                          priceDisplay = priceInSats.toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }) + " SATS";
                        } else {
                          const millions = priceInSats / 1000000;
                          if (millions >= 1) {
                            priceDisplay = millions.toFixed(2) + "M SATS";
                          } else {
                            const thousands = priceInSats / 1000;
                            priceDisplay = thousands.toFixed(1) + "K SATS";
                          }
                        }

                        if (sourceLabel) {
                          return (
                            <span class="relative">
                              {priceDisplay}
                              <sup class="text-[8px] text-color-neutral-500 ml-0.5">
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
                      class={`${cellCenterL2Card} text-center`}
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
                        return <span class="text-color-neutral-500">N/A</span>;
                      })()}
                    </td>
                    {/* VOLUME */}
                    <td
                      class={`${
                        cellAlign(3, headers?.length ?? 0)
                      } ${cellCenterL2Card}`}
                    >
                      {(() => {
                        const volume = getVolume24h(src20);
                        if (volume === 0) {
                          return "0 BTC";
                        }

                        if (volume < 0.0001) {
                          return volume.toFixed(6) + " BTC";
                        } else if (volume < 0.01) {
                          return volume.toFixed(4) + " BTC";
                        } else if (volume < 0.1) {
                          return volume.toFixed(3) + " BTC";
                        } else if (volume < 1) {
                          return volume.toFixed(2) + " BTC";
                        } else if (volume < 100) {
                          return volume.toFixed(2) + " BTC";
                        } else {
                          return Math.round(volume).toLocaleString() + " BTC";
                        }
                      })()}
                    </td>
                    {/* MARKETCAP */}
                    <td
                      class={`${
                        cellAlign(4, headers?.length ?? 0)
                      } ${cellCenterL2Card}`}
                    >
                      {(() => {
                        const marketCap = getMarketCap(src20);
                        if (marketCap === 0) {
                          return "0 BTC";
                        } else if (marketCap < 1) {
                          return marketCap.toFixed(2) + " BTC";
                        } else if (marketCap < 100) {
                          return marketCap.toFixed(2) + " BTC";
                        } else if (marketCap < 1000) {
                          return marketCap.toFixed(1) + " BTC";
                        } else {
                          return Math.round(marketCap).toLocaleString() +
                            " BTC";
                        }
                      })()}
                    </td>
                    {/* DEPLOY */}
                    <td
                      class={`${
                        cellAlign(5, headers?.length ?? 0)
                      } ${cellCenterL2Card}`}
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
                      } ${cellCenterL2Card}`}
                    >
                      {(() => {
                        const holderCount = src20.market_data?.holder_count ??
                          src20.holders ??
                          0;
                        return Number(holderCount).toLocaleString();
                      })()}
                    </td>
                    {/* CHART */}
                    <td
                      class={`${
                        cellAlign(7, headers?.length ?? 0)
                      } ${cellRightL2Card} !py-0`}
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
                          <div class="flex items-center justify-center text-xs text-color-neutral-500">
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
                  class={`w-full h-[46px] ${container2}`}
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
