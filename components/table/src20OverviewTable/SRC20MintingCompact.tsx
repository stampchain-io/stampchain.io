/* @reinamora - update Trending calculations */
import { Button } from "$button";
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
import {
  getCurrentUrl,
  isBrowser,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import {
  splitTextAndEmojis,
  unicodeEscapeToEmoji,
} from "$lib/utils/ui/formatting/emojiUtils.ts";
import { getSRC20ImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import { cardRowStampNumber, labelXxs, textXs } from "$text";
import type { SRC20Row } from "$types/src20.d.ts";
import type { SRC20MintingCompactProps } from "$types/ui.d.ts";
import type { TargetedEvent } from "preact/compat";

export function SRC20MintingCompact({
  data = [],
  onImageClick,
}: SRC20MintingCompactProps) {
  const headers = [
    "TOKEN",
    "MINTS",
    "PROGRESS",
    "HOLDERS",
    "MINT",
  ];

  return (
    <div class="overflow-x-auto tablet:overflow-x-visible scrollbar-hide -my-3">
      <table
        class={`w-full border-separate border-spacing-y-3 ${textXs}`}
      >
        <colgroup>
          {colGroup([
            {
              width:
                "min-w-[130px] max-w-[130px] w-auto sticky left-0 mobileLg:static tablet:min-w-[130px] min-[1090px]:min-w-[140px]",
            }, // TOKEN
            {
              width:
                "min-w-[100px] w-auto tablet:hidden min-[1280px]:table-cell min-[1280px]:min-w-[80px]",
            }, // MINTS
            {
              width:
                "min-w-[150px] w-auto tablet:min-w-[110px] min-[1090px]:min-w-[120px]",
            }, // PROGRESS
            {
              width:
                "min-w-[100px] w-auto tablet:min-w-[80px] min-[1090px]:min-w-[100px]",
            }, // HOLDERS
            {
              width:
                "min-w-[80px] w-auto tablet:min-w-[70px] min-[1090px]:min-w-[80px]",
            }, // MINT button
          ]).map((col) => <col key={col.key} class={col.className} />)}
        </colgroup>
        <thead>
          <tr class={container2}>
            {headers.map((header, i) => {
              const isFirst = i === 0;
              const isLast = i === (headers?.length ?? 0) - 1;

              const rowClass = isFirst
                ? cellLeftL2Card
                : isLast
                ? cellRightL2Card
                : cellCenterL2Card;

              return (
                <th
                  key={header}
                  class={`${labelXxs} py-1.5 !px-3 ${rowClass} ${
                    i === 1 ? "tablet:hidden min-[1280px]:table-cell" : ""
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
              data.map((src20: SRC20Row) => {
                const imageUrl = getSRC20ImageSrc(src20) || null;

                const href = `/src20/${
                  encodeURIComponent(unicodeEscapeToEmoji(src20.tick ?? ""))
                }`;

                const mintHref = `/tool/src20/mint?tick=${
                  encodeURIComponent(src20.tick ?? "")
                }&trxType=olga`;

                const handleMintClick = (
                  event: TargetedEvent<HTMLButtonElement>,
                ) => {
                  event.preventDefault();

                  if (!isBrowser()) {
                    return;
                  }

                  const currentUrl = getCurrentUrl();
                  const url = new URL(currentUrl);
                  const isMintPage = url.pathname.includes("/tool/src20/mint");

                  if (isMintPage) {
                    const newUrl = new URL(currentUrl);
                    newUrl.searchParams.set("tick", src20.tick ?? "");
                    newUrl.searchParams.set("trxType", "olga");
                    globalThis.history.replaceState({}, "", newUrl.toString());

                    globalThis.dispatchEvent(
                      new CustomEvent("mintTokenSelected", {
                        detail: { tick: src20.tick ?? "" },
                      }),
                    );
                  } else {
                    safeNavigate(mintHref);
                  }
                };

                return (
                  <tr
                    key={src20.tx_hash}
                    class={`${container2} ${shadowGlowPurple}`}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      const isImage = target.tagName === "IMG";
                      const isButton = target.closest("button");
                      if (
                        !isImage && !isButton && !e.ctrlKey && !e.metaKey &&
                        e.button !== 1
                      ) {
                        e.preventDefault();
                        if (isBrowser()) {
                          safeNavigate(href);
                        }
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
                    {/* MINTS */}
                    <td
                      class={`${cellCenterL2Card} tablet:hidden min-[1280px]:table-cell`}
                    >
                      {src20.mint_progress?.total_mints || src20.mint_count ||
                        <span class="text-color-neutral-500">N/A</span>}
                    </td>
                    {/* PROGRESS */}
                    <td
                      class={cellCenterL2Card}
                    >
                      <div class="flex items-center justify-center w-full gap-2">
                        <div class="flex flex-row items-center w-[90px] min-[420px]:w-[100px] mobileMd:w-[120px] mobileLg:w-[150px] tablet:w-[110px] desktop:w-[140px] gap-3">
                          <div class="relative flex-1 h-1.5 bg-color-neutral-800 rounded-full">
                            <div
                              class="absolute left-0 top-0 h-1.5 bg-gradient-to-r from-color-primary-500 via-color-primary-400 to-color-primary-300 rounded-full"
                              style={{
                                width: `${
                                  (() => {
                                    const progressRaw =
                                      src20.mint_progress?.progress ??
                                        src20.progress ?? 0;
                                    const progressValue = Number(progressRaw);
                                    if (isNaN(progressValue)) {
                                      return 0;
                                    }
                                    return Math.min(
                                      100,
                                      Math.max(0, progressValue),
                                    );
                                  })()
                                }%`,
                              }}
                            />
                          </div>
                          <div class="!text-[10px] text-color-neutral-500 shrink-0">
                            {(() => {
                              const progressRaw =
                                src20.mint_progress?.progress ??
                                  src20.progress ?? 0;
                              const progressValue = Number(progressRaw);
                              if (isNaN(progressValue)) {
                                return "0";
                              }
                              return progressValue.toFixed(1);
                            })()}
                            %
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* HOLDERS */}
                    <td
                      class={cellCenterL2Card}
                    >
                      {(() => {
                        const holderCount = src20.market_data?.holder_count ??
                          src20.holders ??
                          0;
                        return Number(holderCount).toLocaleString();
                      })()}
                    </td>
                    {/* MINT BUTTON */}
                    <td
                      class={cellRightL2Card}
                    >
                      <Button
                        variant="flat"
                        color="primary"
                        size="xxs"
                        href={mintHref}
                        onClick={handleMintClick}
                        class="rounded-xl"
                      >
                        MINT
                      </Button>
                    </td>
                  </tr>
                );
              })
            )
            : (
              <tr>
                <td colSpan={headers?.length ?? 0}>
                  <EmptyState label="NO MINTING TOKENS" icon="src20Tokens" />
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
