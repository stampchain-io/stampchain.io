import { colGroup } from "$components/layout/types.ts";
import { PlaceholderImage } from "$icon";
import {
  cellCenterL2Card,
  cellLeftL2Card,
  cellRightL2Card,
  cellStickyLeft,
  container2,
  EmptyState,
  shadowGlowPurple,
} from "$layout";
import { safeNavigate } from "$lib/utils/navigation/freshNavigationUtils.ts";
import {
  splitTextAndEmojis,
  unicodeEscapeToEmoji,
} from "$lib/utils/ui/formatting/emojiUtils.ts";
import { getSRC20ImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import {
  cardRowStampNumber,
  labelXxs,
  textXs,
  valueNegative,
  valueNeutral,
  valuePositive,
} from "$text";
import type { EnrichedSRC20Row } from "$types/src20.d.ts";

interface SRC20OverviewCompactProps {
  data: EnrichedSRC20Row[];
  fromPage: "src20" | "wallet" | "stamping/src20" | "home";
  onImageClick: (imgSrc: string) => void;
}

export function SRC20OverviewCompact({
  data,
  fromPage,
  onImageClick,
}: SRC20OverviewCompactProps) {
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

  // VOLUME is last visible col on tablet (MARKETCAP hidden); center on desktop
  const cellVolume =
    `${cellCenterL2Card} tablet:rounded-r-2xl tablet:border-r-[1px] tablet:!pr-3 tablet:text-right desktop:rounded-r-none desktop:border-r-0 desktop:text-center`;

  return (
    <div class="overflow-x-auto tablet:overflow-x-visible scrollbar-hide -my-3">
      <table
        class={`w-full border-separate border-spacing-y-3 ${textXs}`}
      >
        <colgroup>
          {colGroup(
            fromPage === "wallet"
              ? [
                {
                  width:
                    "min-w-[130px] max-w-[130px] w-auto sticky left-0 mobileLg:static",
                }, // TOKEN
                {
                  width: "min-w-[100px] w-auto",
                }, // BALANCE
                {
                  width: "min-w-[100px] w-auto",
                }, // PRICE
                {
                  width: "min-w-[100px] w-auto",
                }, // CHANGE
                {
                  width: "min-w-[100px] w-auto",
                }, // VOLUME
                {
                  width:
                    "min-w-[100px] w-auto tablet:hidden desktop:table-cell",
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
          <tr class={container2}>
            {headers.map((header, i) => {
              const isFirst = i === 0;
              const isLast = i === (headers?.length ?? 0) - 1;

              let rowClass = "";
              if (header === "VOLUME") {
                rowClass = cellVolume;
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
                  class={`${labelXxs} py-1.5 !px-3 ${rowClass} ${
                    header === "MARKETCAP"
                      ? "tablet:hidden desktop:table-cell"
                      : ""
                  } ${isFirst ? cellStickyLeft : ""}`}
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
                      class={`${cellLeftL2Card} ${cellStickyLeft}`}
                    >
                      <div class="flex items-center gap-4">
                        {imageUrl
                          ? (
                            <img
                              src={imageUrl}
                              class="w-6.5 h-6.5 rounded-xl cursor-pointer"
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
                              class="w-6.5 h-6.5 rounded-xl overflow-hidden"
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
                              const { text, emoji } = splitTextAndEmojis(
                                unicodeEscapeToEmoji(src20.tick ?? ""),
                              );
                              return (
                                <>
                                  {text && (
                                    <span class={cardRowStampNumber}>
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
                        class={cellCenterL2Card}
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
                      class={`${cellCenterL2Card} text-color-secondary-400`}
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
                      class={cellCenterL2Card}
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
                      class={cellVolume}
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
                      class={`${cellRightL2Card} !pr-3
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
                <td colSpan={headers?.length ?? 0}>
                  <EmptyState label="NO TOKENS TO DISPLAY" icon="src20Tokens" />
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
