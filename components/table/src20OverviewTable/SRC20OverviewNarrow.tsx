import { cellAlign, colGroup } from "$components/layout/types.ts";
import { PlaceholderImage } from "$icon";
import {
  cellCenterL2Card,
  cellLeftL2Card,
  cellRightL2Card,
  cellStickyLeft,
  container2,
  shadowGlowPurple,
} from "$layout";
import { safeNavigate } from "$lib/utils/navigation/freshNavigationUtils.ts";
import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import { getSRC20ImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import {
  labelXs,
  textSm,
  valueDarkSm,
  valueNegative,
  valueNeutral,
  valuePositive,
} from "$text";
import type { EnrichedSRC20Row } from "$types/src20.d.ts";

interface SRC20OverviewNarrowProps {
  data: EnrichedSRC20Row[];
  fromPage: "src20" | "wallet" | "stamping/src20" | "home";
  onImageClick: (imgSrc: string) => void;
}

export function SRC20OverviewNarrow({
  data,
  fromPage,
  onImageClick,
}: SRC20OverviewNarrowProps) {
  function getMarketCap(src20: any): number {
    const marketCap = src20?.market_data?.market_cap_btc;
    if (!marketCap) return 0;
    const parsed = parseFloat(marketCap);
    return isNaN(parsed) ? 0 : parsed;
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

  const headers = fromPage === "wallet"
    ? [
      "TOKEN",
      "BALANCE",
      "PRICE",
      "CHANGE",
      "VOLUME",
      "MARKETCAP",
    ]
    : [
      "TOKEN",
      "PRICE",
      "CHANGE",
      "VOLUME",
      "MARKETCAP",
    ];

  function splitTextAndEmojis(text: string): { text: string; emoji: string } {
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
      <table
        class={`w-full -mt-2 border-separate border-spacing-y-3 ${textSm}`}
      >
        <colgroup>
          {colGroup(
            fromPage === "wallet"
              ? [
                {
                  width:
                    "min-w-[140px] max-w-[160px] w-auto sticky left-0 mobileLg:static",
                }, // TOKEN
                {
                  width: "min-w-[120px] w-auto",
                }, // BALANCE
                {
                  width: "min-w-[120px] w-auto",
                }, // PRICE
                {
                  width: "min-w-[100px] w-auto",
                }, // CHANGE
                {
                  width: "min-w-[120px] w-auto",
                }, // VOLUME
                {
                  width:
                    "min-w-[110px] w-auto tablet:hidden desktop:table-cell",
                }, // MARKETCAP
              ]
              : [
                {
                  width:
                    "min-w-[140px] max-w-[160px] w-auto sticky left-0 mobileLg:static tablet:min-w-[125px] min-[1090px]:min-w-[140px]",
                }, // TOKEN
                {
                  width:
                    "min-w-[120px] w-auto tablet:min-w-[110px] min-[1090px]:min-w-[120px]",
                }, // PRICE
                {
                  width:
                    "min-w-[100px] w-auto tablet:min-w-[60px] min-[1090px]:min-w-[100px]",
                }, // CHANGE
                {
                  width: "min-w-[110px]",
                }, // VOLUME
                {
                  width:
                    "min-w-[110px] w-auto tablet:hidden desktop:table-cell",
                }, // MARKETCAP
              ],
          ).map((col) => <col key={col.key} class={col.className} />)}
        </colgroup>
        <thead>
          <tr class={`${container2}`}>
            {headers.map((header, i) => {
              const isFirst = i === 0;
              const isLast = i === (headers?.length ?? 0) - 1;

              let rowClass = "";
              if (header === "TOKEN") {
                rowClass = cellLeftL2Card;
              } else if (header === "BALANCE") {
                rowClass = cellCenterL2Card;
              } else if (header === "PRICE") {
                rowClass = cellCenterL2Card;
              } else if (header === "CHANGE") {
                rowClass = cellCenterL2Card;
              } else if (header === "VOLUME") {
                rowClass =
                  `p-3 border-y-[1px] border-x-0 border-color-border/75 group-hover:border-color-purple-light transition-all duration-200 tablet:pr-4 tablet:rounded-r-2xl tablet:border-r-[1px] tablet:border-l-0 desktop:pr-3 desktop:rounded-r-none desktop:border-r-0`;
              } else if (header === "MARKETCAP") {
                rowClass = cellRightL2Card;
              } else {
                rowClass = isFirst
                  ? cellLeftL2Card
                  : isLast
                  ? cellRightL2Card
                  : cellCenterL2Card;
              }

              return (
                <th
                  key={header}
                  class={`${labelXs} ${
                    cellAlign(i, headers?.length ?? 0)
                  } !py-2 ${rowClass}
                                  ${
                    header === "MARKETCAP"
                      ? "tablet:hidden desktop:table-cell"
                      : header === "VOLUME"
                      ? "text-center tablet:text-right desktop:text-center"
                      : header === "CHANGE"
                      ? "text-center"
                      : ""
                  }
                ${isFirst ? cellStickyLeft : ""}
                `}
                >
                  {header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data?.length
            ? (
              data.map((src20: EnrichedSRC20Row) => {
                const imageUrl = getSRC20ImageSrc(src20);

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
                              class="w-7 h-7 rounded-xl cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onImageClick?.(imageUrl);
                              }}
                              alt={unicodeEscapeToEmoji(src20.tick ?? "")}
                            />
                          )
                          : (
                            <div
                              class="w-7 h-7 rounded-xl overflow-hidden"
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
                          <div class="font-bold text-base uppercase tracking-wide">
                            {(() => {
                              const { text, emoji } = splitTextAndEmojis(
                                unicodeEscapeToEmoji(src20.tick ?? ""),
                              );
                              return (
                                <>
                                  {text && (
                                    <span class="bg-gradient-to-l color-neutral-gradient color-gradient-hover inline-block">
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
                    {/* BALANCE - only show in wallet view */}
                    {fromPage === "wallet" && (
                      <td
                        class={`${
                          cellAlign(1, headers?.length ?? 0)
                        } ${cellCenterL2Card}`}
                      >
                        {(() => {
                          const balance = Number(src20.amt || 0);
                          if (balance === 0) return "0";
                          return balance.toLocaleString();
                        })()}
                      </td>
                    )}
                    {/* PRICE */}
                    <td
                      class={`${
                        cellAlign(
                          fromPage === "wallet" ? 2 : 1,
                          headers?.length ?? 0,
                        )
                      } ${cellCenterL2Card}`}
                    >
                      {(() => {
                        const priceInBtc = getPrice(src20);
                        if (priceInBtc === 0) {
                          return "0 SATS";
                        }
                        const priceInSats = priceInBtc * 1e8;

                        if (priceInSats < 0.0001) {
                          return priceInSats.toFixed(6) + " SATS";
                        } else if (priceInSats < 1) {
                          return priceInSats.toFixed(4) + " SATS";
                        } else if (priceInSats < 10) {
                          return priceInSats.toFixed(2) + " SATS";
                        } else if (priceInSats < 100) {
                          return priceInSats.toFixed(1) + " SATS";
                        } else if (priceInSats < 1000) {
                          return Math.round(priceInSats).toLocaleString() +
                            " SATS";
                        } else {
                          return Math.round(priceInSats).toLocaleString() +
                            " SATS";
                        }
                      })()}
                    </td>
                    {/* CHANGE */}
                    <td
                      class={`${cellCenterL2Card} text-center`}
                    >
                      {(() => {
                        const changePercent =
                          src20.market_data?.change_24h_percent ?? 0;

                        const changeValue = Number(changePercent);
                        if (isNaN(changeValue)) {
                          return <span class="text-color-grey">N/A</span>;
                        }

                        return (
                          <span
                            class={changeValue > 0
                              ? valuePositive
                              : changeValue < 0
                              ? valueNegative
                              : valueNeutral}
                          >
                            {changeValue > 0 ? "+" : ""}
                            {changeValue.toFixed(2)}%
                          </span>
                        );
                      })()}
                    </td>
                    {/* VOLUME */}
                    <td
                      class={`p-3 border-y-[1px] border-x-0 border-color-border/75 group-hover:border-color-purple-light transition-all duration-200
                      tablet:pr-4 tablet:rounded-r-2xl tablet:border-r-[1px] tablet:border-l-0
                      desktop:pr-3 desktop:rounded-r-none desktop:border-r-0
                      text-center tablet:text-right desktop:text-center`}
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
                      class={`
                      ${
                        cellAlign(
                          fromPage === "wallet" ? 5 : 4,
                          headers?.length ?? 0,
                        )
                      }
                      ${cellRightL2Card}
                      tablet:hidden desktop:table-cell
                    `}
                    >
                      {(() => {
                        const marketCap = getMarketCap(src20);
                        if (marketCap === 0) {
                          return "0 BTC";
                        }

                        if (marketCap < 1) {
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
