/* reinamora - update Trending calculations */
import { Button } from "$button";
import { colGroup } from "$components/layout/types.ts";
import { SSRSafeUrlBuilder } from "$components/navigation/SSRSafeUrlBuilder.tsx";
import { Icon, PlaceholderImage } from "$icon";
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
  isBrowser,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import {
  splitTextAndEmojis,
  unicodeEscapeToEmoji,
} from "$lib/utils/ui/formatting/emojiUtils.ts";
import {
  abbreviateAddress,
  formatDate,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { getSRC20ImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import { cardRowStampNumber, labelXxs, textXs } from "$text";
import type { SRC20Row } from "$types/src20.d.ts";
import type { SRC20MintingProps } from "$types/ui.d.ts";

const SORT_MAPPING: Record<string, string> = {
  "TOKEN": "TOKEN",
  "MINTS": "MINTS",
  "PROGRESS": "PROGRESS",
  "DEPLOY": "DEPLOY",
  "HOLDERS": "HOLDERS",
};

export function SRC20Minting({
  data,
  fromPage: _fromPage,
  timeframe,
  onImageClick,
  currentSort,
}: SRC20MintingProps) {
  const headers = [
    "TOKEN",
    "MINTS",
    "PROGRESS",
    "TRENDING",
    "HOLDERS",
    "CREATOR",
    "DEPLOY",
    "MINT",
  ];

  const handleHeaderClick = (headerName: string) => {
    const apiSortKey = SORT_MAPPING[headerName];
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
    _index: number,
    isFirst: boolean,
    isLast: boolean,
    isSelected: boolean,
    isClickable: boolean,
  ) => {
    const baseClass = `${labelXxs} py-1.5 !px-3`;

    const rowClass = isFirst
      ? cellLeftL2Card
      : isLast
      ? cellRightL2Card
      : cellCenterL2Card;

    const colorClass = isSelected
      ? "text-color-primary-400"
      : isClickable
      ? "text-color-neutral-500 hover:text-color-hover"
      : "text-color-neutral-500";

    const clickableClass = isClickable
      ? "cursor-pointer transition-all duration-200 select-none"
      : "";

    const sortIndicator = isSelected ? "relative" : "";

    return `${baseClass} ${rowClass} ${colorClass} ${clickableClass} ${sortIndicator}`
      .trim();
  };

  const renderSortIndicator = (headerName: string) => {
    const apiSortKey = SORT_MAPPING[headerName];
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
            currentSort.direction === "desc" ? "scale-y-[-1]" : ""
          }`}
        />
      </span>
    );
  };

  return (
    <div class="overflow-x-auto tablet:overflow-x-visible scrollbar-hide -my-3">
      <table class={`w-full border-separate border-spacing-y-3 ${textXs}`}>
        <colgroup>
          {colGroup([
            {
              width:
                "min-w-[130px] max-w-[150px] w-auto sticky left-0 tablet:static",
            }, // TOKEN
            { width: "min-w-[100px] w-auto" }, // MINTS
            { width: "min-w-[130px] w-auto" }, // PROGRESS
            { width: "min-w-[100px] w-auto" }, // TRENDING
            { width: "min-w-[90px] w-auto" }, // HOLDERS
            { width: "min-w-[140px] w-auto" }, // CREATOR
            { width: "min-w-[100px] w-auto" }, // DEPLOY
            { width: "min-w-[100px] w-auto" }, // MINT button
          ]).map((col) => <col key={col.key} class={col.className} />)}
        </colgroup>
        <thead>
          <tr class={`${container2}`}>
            {headers.map((header, i) => {
              const isFirst = i === 0;
              const isLast = i === headers.length - 1;
              const isClickable = !!SORT_MAPPING[header];
              const isSelected = currentSort?.filter === SORT_MAPPING[header];

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
                    {header === "TRENDING" && ` ${timeframe}`}
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
                const imageUrl = getSRC20ImageSrc(src20) || null;

                const mintHref = `/tool/src20/mint?tick=${
                  encodeURIComponent(src20.tick ?? "")
                }&trxType=olga`;

                return (
                  <tr
                    key={src20.tx_hash}
                    class={`${container2} ${shadowGlowPurple}`}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      const isImage = target.tagName === "IMG";
                      const isButton = target.closest("button, a");
                      if (
                        !isImage && !isButton && !e.ctrlKey && !e.metaKey &&
                        e.button !== 1
                      ) {
                        e.preventDefault();
                        if (isBrowser()) {
                          const href = `/src20/${
                            encodeURIComponent(
                              unicodeEscapeToEmoji(src20.tick ?? ""),
                            )
                          }`;
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
                    <td class={cellCenterL2Card}>
                      {src20.mint_progress?.total_mints || (
                        <span class="text-color-neutral-500">N/A</span>
                      )}
                    </td>
                    {/* PROGRESS */}
                    <td class={cellCenterL2Card}>
                      <div class="flex items-center justify-center w-full">
                        <div class="flex flex-row items-center w-[100px] min-[420px]:w-[120px] mobileLg:w-[140px] gap-1.5">
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
                    {/* TRENDING */}
                    <td class={cellCenterL2Card}>
                      <span class="text-color-neutral-500">N/A</span>
                    </td>
                    {/* HOLDERS */}
                    <td class={`${cellCenterL2Card} text-color-primary-400`}>
                      {Number(
                        src20.market_data?.holder_count ??
                          src20.holders ?? 0,
                      ).toLocaleString()}
                    </td>
                    {/* CREATOR */}
                    <td class={`${cellCenterL2Card} text-color-neutral-200`}>
                      <a
                        href={`/wallet/${src20.creator}`}
                        class="link-neutral-200"
                      >
                        {src20.creator_name ??
                          abbreviateAddress(src20.creator, 5)}
                      </a>
                    </td>
                    {/* DEPLOY */}
                    <td class={`${cellCenterL2Card} text-color-neutral-400`}>
                      {formatDate(new Date(src20.block_time), {
                        month: "numeric",
                        day: "numeric",
                        year: "numeric",
                      }).toUpperCase()}
                    </td>
                    {/* MINT BUTTON */}
                    <td class={cellRightL2Card}>
                      <Button
                        variant="flat"
                        color="primary"
                        size="xxs"
                        href={mintHref}
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
                <td colSpan={headers.length}>
                  <EmptyState label="NO MINTING TOKENS" icon="src20Tokens" />
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
