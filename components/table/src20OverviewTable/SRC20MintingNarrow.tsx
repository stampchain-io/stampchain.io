/* @reinamora - update Trending calculations */
import { Button } from "$button";
import { cellAlign, colGroup } from "$components/layout/types.ts";
import type { SRC20Row } from "$types/src20.d.ts";
import type { SRC20MintingNarrowProps } from "$types/ui.d.ts";
import type { TargetedEvent } from "preact/compat";
import {
  cellCenterL2Card,
  cellLeftL2Card,
  cellRightL2Card,
  cellStickyLeft,
  container2,
  shadowGlowPurple,
} from "$layout";
import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import { constructStampUrl } from "$lib/utils/ui/media/imageUtils.ts";
import { labelXs, textSm, valueDarkSm } from "$text";
import {
  getCurrentUrl,
  isBrowser,
  safeNavigate,
} from "$utils/navigation/freshNavigationUtils.ts";

export function SRC20MintingNarrow({
  data = [],
  onImageClick,
}: SRC20MintingNarrowProps) {
  const headers = [
    "TOKEN",
    "MINTS",
    "PROGRESS",
    "HOLDERS",
    "MINT",
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
          {colGroup([
            {
              width:
                "min-w-[140px] max-w-[160px] w-auto sticky left-0 mobileLg:static tablet:min-w-[130px] min-[1090px]:min-w-[140px]",
            }, // TOKEN
            {
              width:
                "min-w-[90px] w-auto tablet:hidden min-[1280px]:table-cell min-[1280px]:min-w-[80px]",
            }, // MINTS
            {
              width:
                "min-w-[120px] w-auto tablet:min-w-[110px] min-[1090px]:min-w-[120px]",
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
          <tr class={`${container2}`}>
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
                  class={`${labelXs} ${
                    cellAlign(i, headers?.length ?? 0)
                  } py-2 ${rowClass} ${
                    i === 1
                      ? "tablet:hidden min-[1280px]:table-cell"
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
              data.map((src20: SRC20Row) => {
                const imageUrl = src20.deploy_img ||
                  src20.stamp_url ||
                  (src20.deploy_tx
                    ? constructStampUrl(src20.deploy_tx)
                    : null) ||
                  "/img/placeholder/stamp-no-image.svg";

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
                      class={`${
                        cellAlign(0, headers?.length ?? 0)
                      } ${cellLeftL2Card} ${cellStickyLeft}`}
                    >
                      <div class="flex items-center gap-4">
                        <img
                          src={imageUrl}
                          class="w-7 h-7 rounded cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            if (imageUrl) onImageClick?.(imageUrl);
                          }}
                          alt={unicodeEscapeToEmoji(src20.tick ?? "")}
                        />
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
                    {/* MINTS */}
                    <td
                      class={`${
                        cellAlign(1, headers?.length ?? 0)
                      } ${cellCenterL2Card} tablet:hidden min-[1280px]:table-cell`}
                    >
                      {src20.mint_progress?.total_mints || src20.mint_count ||
                        "N/A"}
                    </td>
                    {/* PROGRESS */}
                    <td
                      class={`${
                        cellAlign(2, headers?.length ?? 0)
                      } ${cellCenterL2Card}`}
                    >
                      <div class="flex items-center justify-center w-full">
                        <div class="flex flex-col w-[65px] min-[380px]:w-[75px] min-[400px]:w-[85px] min-[420px]:w-[100px] min-[480px]:w-[125px] mobileLg:w-[160px] tablet:w-[80px] min-[1080px]:w-[90px] min-[1180px]:w-[110px] desktop:w-[160px] gap-1">
                          <div class="!text-xs text-center">
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
                            <span class="text-color-grey-light">%</span>
                          </div>
                          <div class="relative h-1.5 bg-color-grey rounded-full">
                            <div
                              class="absolute left-0 top-0 h-1.5 bg-color-purple rounded-full"
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
                        </div>
                      </div>
                    </td>
                    {/* HOLDERS */}
                    <td
                      class={`${
                        cellAlign(3, headers?.length ?? 0)
                      } ${cellCenterL2Card}`}
                    >
                      {(() => {
                        const holderCount =
                          (src20 as any)?.market_data?.holder_count ||
                          (src20 as any)?.holders ||
                          0;
                        return Number(holderCount).toLocaleString();
                      })()}
                    </td>
                    {/* MINT BUTTON */}
                    <td
                      class={`${
                        cellAlign(4, headers?.length ?? 0)
                      } ${cellRightL2Card}`}
                    >
                      <Button
                        variant="flat"
                        color="grey"
                        size="xsR"
                        href={mintHref}
                        onClick={handleMintClick}
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
                <td
                  colSpan={headers?.length ?? 0}
                  class={`w-full h-[46px] ${container2}`}
                >
                  <h6 class={`${valueDarkSm} text-center`}>
                    NO MINTING TOKENS
                  </h6>
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
