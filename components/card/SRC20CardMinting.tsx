/* reinamora - update Trending calculations */
import { Button } from "$button";
import { cellAlign, colGroup } from "$components/layout/types.ts";
import { Icon } from "$icon";
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
import { labelXs, textSm, valueDarkSm } from "$text";
import type { SRC20Row } from "$types/src20.d.ts";
import type { SRC20CardMintingProps } from "$types/ui.d.ts";
import type { TargetedEvent } from "preact/compat";

export function SRC20CardMinting({
  data,
  fromPage: _fromPage,
  timeframe,
  onImageClick,
  currentSort,
}: SRC20CardMintingProps) {
  const headers = [
    "TOKEN",
    "MINTS",
    "PROGRESS",
    "TRENDING",
    "DEPLOY",
    "HOLDERS",
    "MINT",
  ];

  // Helper function to handle header clicks for sorting
  const handleHeaderClick = (headerName: string) => {
    // Skip sorting for empty header (MINT button) and TRENDING (leave for now as requested)
    if (headerName === "" || headerName === "TRENDING") {
      return;
    }

    // Map header names to API sort parameters
    const sortMapping: Record<string, string> = {
      "TOKEN": "TOKEN", // Add TOKEN for alphabetical sorting
      "MINTS": "MINTS",
      "PROGRESS": "PROGRESS",
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

    // Navigate with new sort parameters
    if (typeof globalThis !== "undefined" && globalThis?.location) {
      // Use location.href safely with SSR guard
      const currentHref = globalThis.location?.href;
      if (!currentHref) return;

      const url = new URL(currentHref);
      url.searchParams.set("sortBy", apiSortKey);
      url.searchParams.set("sortDirection", newDirection);
      url.searchParams.set("page", "1"); // Reset to page 1 when sorting changes

      // Use Fresh.js navigation
      const link = document.createElement("a");
      link.href = url.toString();
      link.setAttribute("f-partial", "");
      link.style.display = "none";
      // Type-safe DOM manipulation for navigation
      const bodyElement = document.body;
      bodyElement.appendChild(link as Node);
      link.click();
      bodyElement.removeChild(link as Node);
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
      "MINTS": "MINTS",
      "PROGRESS": "PROGRESS",
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
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;
    const match = text.match(emojiRegex);
    if (!match) return { text, emoji: "" };
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
            { width: "min-w-[100px] w-auto" }, // MINTS
            { width: "min-w-[120px] w-auto" }, // PROGRESS
            { width: "min-w-[110px] w-auto" }, // TRENDING
            { width: "min-w-[110px] w-auto" }, // DEPLOY
            { width: "min-w-[90px] w-auto" }, // HOLDERS
            { width: "min-w-[100px] w-auto" }, // MINT button
          ]).map((col) => <col key={col.key} class={col.className} />)}
        </colgroup>
        <thead>
          <tr class={`${glassmorphism}`}>
            {headers.map((header, i) => {
              const isFirst = i === 0;
              const isLast = i === (headers?.length ?? 0) - 1;
              const isClickable = header !== "" && header !== "TRENDING";

              // Get sort state for segmented control styling
              const sortMapping: Record<string, string> = {
                "TOKEN": "TOKEN",
                "MINTS": "MINTS",
                "PROGRESS": "PROGRESS",
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
                // SRC-20 Image URL Logic:
                // 1. Use deploy_img if provided (for deploy operations: https://stampchain.io/stamps/{deploy_tx}.svg)
                // 2. Use stamp_url if provided (for transaction stamps: https://stampchain.io/stamps/{tx_hash}.svg)
                // 3. Fallback to constructing URL from deploy_tx if available
                // 4. Final fallback to placeholder image
                const imageUrl = src20.deploy_img ||
                  src20.stamp_url ||
                  (src20.deploy_tx
                    ? constructStampUrl(src20.deploy_tx)
                    : null) ||
                  "/img/placeholder/stamp-no-image.svg";

                const mintHref = `/tool/src20/mint?tick=${
                  encodeURIComponent(src20.tick ?? "")
                }&trxType=olga`;

                const handleMintClick = (
                  event: TargetedEvent<HTMLButtonElement>,
                ) => {
                  event.preventDefault();

                  // SSR-safe browser environment check
                  if (
                    typeof globalThis === "undefined" || !globalThis?.location
                  ) {
                    return; // Cannot navigate during SSR
                  }

                  globalThis.location.href = mintHref;
                };

                return (
                  <tr
                    key={src20.tx_hash}
                    class={`${glassmorphism} ${shadowGlowPurple}`}
                    onClick={(e) => {
                      // Only navigate if not clicking on image or button
                      const target = e.target as HTMLElement;
                      const isImage = target.tagName === "IMG";
                      const isButton = target.closest("button");
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
                      class={`${
                        cellAlign(0, headers?.length ?? 0)
                      } ${cellLeftCard} ${cellStickyLeft}`}
                    >
                      <div class="flex items-center gap-4">
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
                        <div class="flex flex-col">
                          <div class="font-bold text-base uppercase tracking-wide">
                            {(() => {
                              const { text, emoji } = splitTextAndEmojis(
                                unicodeEscapeToEmoji(src20.tick ?? ""),
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
                    {/* MINTS */}
                    <td
                      class={`${
                        cellAlign(1, headers?.length ?? 0)
                      } ${cellCenterCard}`}
                    >
                      {src20.mint_progress?.total_mints || "N/A"}
                    </td>
                    {/* PROGRESS */}
                    <td
                      class={`${
                        cellAlign(2, headers?.length ?? 0)
                      } ${cellCenterCard}`}
                    >
                      <div class="flex items-center justify-center w-full">
                        <div class="flex flex-col w-[100px] min-[420px]:w-[120px] mobileLg:w-[160px] gap-1">
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
                    {/* TRENDING */}
                    <td
                      class={`${
                        cellAlign(3, headers?.length ?? 0)
                      } ${cellCenterCard}`}
                    >
                      {"N/A"}
                    </td>
                    {/* DEPLOY */}
                    <td
                      class={`${
                        cellAlign(4, headers?.length ?? 0)
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
                        cellAlign(5, headers?.length ?? 0)
                      } ${cellCenterCard}`}
                    >
                      {Number(
                        (src20 as any)?.market_data?.holder_count ||
                          (src20 as any)?.holders || 0,
                      ).toLocaleString()}
                    </td>
                    {/* MINT BUTTON */}
                    <td
                      class={`text-right ${cellRightCard}`}
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
                  class={`w-full h-[46px] ${glassmorphism}`}
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
