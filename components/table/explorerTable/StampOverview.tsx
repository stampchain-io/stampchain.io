/* ===== STAMP EXPLORER TABLE COMPONENT ===== */
import { colGroup } from "$components/layout/types.ts";
import { Icon, PlaceholderImage } from "$icon";
import StampTextContent from "$islands/content/stampDetailContent/StampTextContent.tsx";
import {
  cellCenterL2Card,
  cellLeftL2Card,
  cellRightL2Card,
  cellStickyLeft,
  cellStickyLeft2,
  container2,
  shadowGlowPurple,
} from "$layout";
import {
  isBrowser,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import {
  abbreviateAddress,
  formatDate,
  formatSupply,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { getStampImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import { cardRowStampNumber, labelXxs, textXs, valueDarkSm } from "$text";
import type { StampRow } from "$types/stamp.d.ts";
import { useState } from "preact/hooks";

/* ===== CONSTANTS ===== */
const HEADERS = [
  "IMAGE",
  "STAMP #",
  "CPID",
  "TYPE",
  "ADDRESS",
  "EDITIONS",
  "TX HASH",
  "BLOCK",
  "DATE",
];

/* ===== HELPERS ===== */
function getStampType(stamp: StampRow): string {
  if (stamp.ident === "SRC-721") return "RECURSIVE";
  if (stamp.stamp !== null && stamp.stamp < 0) {
    return stamp.cpid?.startsWith("A") ? "CURSED" : "POSH";
  }
  return "CLASSIC";
}

/* ===== ROW COMPONENT ===== */
interface StampOverviewRowProps {
  stamp: StampRow;
}

export function StampOverviewRow({ stamp }: StampOverviewRowProps) {
  const imgSrc = getStampImageSrc(stamp);
  // getStampImageSrc points HTML (and some other) mimetypes at a content
  // URL that can't render inside an <img> — track load failure so we swap
  // to the placeholder icon instead of leaving a broken-image icon.
  const [imageFailed, setImageFailed] = useState(false);
  const href = `/stamp/${stamp.tx_hash}`;

  const creatorDisplay = stamp.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp.creator, 5);

  const supplyDisplay = stamp.ident !== "SRC-20" && stamp.balance
    ? `${formatSupply(Number(stamp.balance), stamp.divisible)}/${
      stamp.supply < 100000 && !stamp.divisible
        ? formatSupply(stamp.supply ?? 0, stamp.divisible)
        : "+100000"
    }`
    : stamp.supply === 1
    ? "1/1"
    : `${formatSupply(stamp.supply ?? 0, stamp.divisible)}`;

  /* ===== RENDER ===== */
  return (
    <tr
      class={`${container2} ${shadowGlowPurple}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button, a")) return;
        if (!e.ctrlKey && !e.metaKey && e.button !== 1) {
          e.preventDefault();
          if (!isBrowser()) return;
          safeNavigate(href);
        }
      }}
    >
      {/* IMAGE */}
      <td
        class={`${cellLeftL2Card} ${cellStickyLeft}`}
      >
        <a
          href={href}
          f-partial={href}
          target="_top"
          class="flex items-center justify-center w-6.5 h-6.5 rounded-xl overflow-hidden"
        >
          {stamp.stamp_mimetype === "text/plain"
            ? (
              <div class="w-6.5 h-6.5 rounded-xl overflow-hidden">
                <StampTextContent src={imgSrc} />
              </div>
            )
            : imgSrc && !imageFailed
            ? (
              <img
                src={imgSrc}
                alt={`Stamp ${stamp.stamp ?? stamp.cpid ?? ""}`}
                class="w-6.5 h-6.5 object-contain rounded-xl pixelart"
                onError={() => setImageFailed(true)}
              />
            )
            : <PlaceholderImage variant="no-image" className="!rounded-xl" />}
        </a>
      </td>

      {/* STAMP # */}
      <td
        class={`${cellCenterL2Card} ${cellStickyLeft2}`}
      >
        <a
          href={href}
          f-partial={href}
          target="_top"
          class={cardRowStampNumber}
        >
          {stamp.stamp != null
            ? (
              <>
                <span class="font-light">#</span>
                {stamp.stamp}
              </>
            )
            : "—"}
        </a>
      </td>

      {/* CPID */}
      <td
        class={`${cellCenterL2Card} font-mono text-color-neutral-400`}
      >
        {stamp.cpid ?? "—"}
      </td>

      {/* TYPE */}
      <td
        class={`${cellCenterL2Card}`}
      >
        <div class="flex items-center justify-center gap-2 text-color-neutral-200">
          <Icon
            type="icon"
            name="artStamp"
            weight="bold"
            size="md"
            color="custom"
            className="stroke-color-neutral-200"
          />
          {getStampType(stamp)}
        </div>
      </td>

      {/* CREATOR */}
      <td
        class={`${cellCenterL2Card} text-color-neutral-200`}
      >
        <a
          href={`/wallet/${stamp.creator}`}
          class="link-neutral-200"
        >
          {creatorDisplay}
        </a>
      </td>

      {/* SUPPLY */}
      <td
        class={`${cellCenterL2Card} text-color-primary-400`}
      >
        {supplyDisplay}
      </td>

      {/* TX HASH */}
      <td
        class={`${cellCenterL2Card} text-color-neutral-400`}
      >
        <a
          href={`https://mempool.space/tx/${stamp.tx_hash}`}
          target="_blank"
          rel="noopener noreferrer"
          class="link-neutral-400"
        >
          {abbreviateAddress(stamp.tx_hash, 6)}
        </a>
      </td>

      {/* BLOCK */}
      <td
        class={`${cellCenterL2Card} text-color-neutral-400`}
      >
        {stamp.block_index != null ? stamp.block_index.toLocaleString() : "N/A"}
      </td>

      {/* DATE */}
      <td
        class={`${cellRightL2Card} text-color-neutral-400 pr-3`}
      >
        {formatDate(new Date(stamp.block_time), {
          month: "numeric",
          day: "numeric",
          year: "numeric",
        }).toUpperCase()}
      </td>
    </tr>
  );
}

/* ===== TABLE WRAPPER ===== */
interface StampOverviewTableProps {
  stamps: StampRow[];
}

export function StampOverviewTable({ stamps }: StampOverviewTableProps) {
  return (
    <div class="overflow-x-auto tablet:overflow-x-visible scrollbar-hide -my-3">
      <table
        class={`w-full border-separate border-spacing-y-3 ${textXs}`}
      >
        <colgroup>
          {colGroup([
            { width: "w-10" }, // IMAGE (fixed for sticky left-0 anchor)
            { width: "min-w-[100px] w-auto" }, // STAMP #
            { width: "min-w-[170px] w-auto" }, // CPID
            { width: "min-w-[120px] w-auto" }, // TYPE
            { width: "min-w-[110px] w-auto" }, // CREATOR
            { width: "min-w-[90px] w-auto" }, // SUPPLY
            { width: "min-w-[110px] w-auto" }, // TX HASH
            { width: "min-w-[70px] w-auto" }, // BLOCK
            { width: "min-w-[90px] w-auto" }, // DATE
          ]).map((col) => <col key={col.key} class={col.className} />)}
        </colgroup>
        <thead>
          <tr class={`${container2}`}>
            {HEADERS.map((header, i) => {
              const isFirst = i === 0;
              const isLast = i === HEADERS.length - 1;
              const rowClass = isFirst
                ? cellLeftL2Card
                : isLast
                ? cellRightL2Card
                : cellCenterL2Card;
              const stickyClass = isFirst
                ? cellStickyLeft
                : i === 1
                ? cellStickyLeft2
                : "";
              return (
                <th
                  key={header}
                  class={`${labelXxs} py-1.5 !px-3 ${rowClass} ${stickyClass} text-color-neutral-500`}
                >
                  {header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {stamps.length
            ? stamps.map((stamp) => (
              <StampOverviewRow
                key={stamp.tx_hash}
                stamp={stamp}
              />
            ))
            : (
              <tr>
                <td
                  colSpan={HEADERS.length}
                  class={`w-full h-[46px] ${container2}`}
                >
                  <h6 class={`${valueDarkSm} text-center`}>
                    NO STAMPS TO DISPLAY
                  </h6>
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
