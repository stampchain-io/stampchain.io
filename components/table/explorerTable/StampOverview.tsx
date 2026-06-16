/* ===== STAMP EXPLORER TABLE COMPONENT ===== */
import { cellAlign, colGroup } from "$components/layout/types.ts";
import { PlaceholderImage } from "$icon";
import {
  cellCenterL2Card,
  cellLeftL2Card,
  cellRightL2Card,
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
  formatFileSize,
  formatSupplyValue,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { getStampImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import { labelXxs, textXs } from "$text";
import type { StampRow } from "$types/stamp.d.ts";

/* ===== CONSTANTS ===== */
const HEADERS = [
  "IMAGE",
  "STAMP #",
  "CPID",
  "ADDRESS",
  "SUPPLY",
  "TYPE",
  "SIZE",
  "BLOCK",
  "DATE",
];

/* ===== ROW COMPONENT ===== */
interface StampOverviewRowProps {
  stamp: StampRow;
}

export function StampOverviewRow({ stamp }: StampOverviewRowProps) {
  const imgSrc = getStampImageSrc(stamp);
  const href = `/stamp/${stamp.tx_hash}`;

  const creatorDisplay = stamp.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp.creator, 5);

  const supplyDisplay = stamp.ident !== "SRC-20" && stamp.balance
    ? `${formatSupplyValue(Number(stamp.balance), stamp.divisible)}/${
      stamp.supply < 100000 && !stamp.divisible
        ? formatSupplyValue(stamp.supply ?? 0, stamp.divisible)
        : "+100000"
    }`
    : stamp.supply === 1
    ? "1/1"
    : `${formatSupplyValue(stamp.supply ?? 0, stamp.divisible)}`;

  const fileType = stamp.stamp_mimetype?.split("/")[1]?.toUpperCase() ||
    "UNKNOWN";

  /* ===== FILE SIZE ===== */
  const fileSize = stamp.file_size_bytes != null
    ? formatFileSize(
      stamp.file_size_bytes,
      stamp.stamp_mimetype === "text/plain",
    )
    : "—";

  /* ===== RENDER ===== */
  return (
    <tr
      class={`group ${container2} ${shadowGlowPurple} cursor-pointer`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === "A") return;
        if (!e.ctrlKey && !e.metaKey && e.button !== 1) {
          e.preventDefault();
          if (!isBrowser()) return;
          safeNavigate(href);
        }
      }}
    >
      {/* IMAGE */}
      <td
        class={`${cellAlign(0, HEADERS.length)} ${cellLeftL2Card}`}
      >
        <a
          href={href}
          f-partial={href}
          target="_top"
          class="flex items-center justify-center w-9 h-9 rounded-xl"
        >
          {imgSrc
            ? (
              <img
                src={imgSrc}
                alt={`Stamp ${stamp.stamp ?? stamp.cpid ?? ""}`}
                class="w-9 h-9 object-contain rounded-xl pixelart"
              />
            )
            : <PlaceholderImage variant="no-image" />}
        </a>
      </td>

      {/* STAMP # */}
      <td class={`${cellCenterL2Card} text-center`}>
        <a
          href={href}
          f-partial={href}
          target="_top"
          class="font-extrabold text-sm bg-gradient-to-r color-neutral-gradient color-gradient-hover inline-block"
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
      <td class={`${cellCenterL2Card} text-color-neutral-300 text-center`}>
        {stamp.cpid ?? "—"}
      </td>

      {/* CREATOR */}
      <td class={`${cellCenterL2Card} text-color-neutral-200 text-center`}>
        {creatorDisplay}
      </td>

      {/* SUPPLY */}
      <td class={`${cellCenterL2Card} text-color-neutral-200 text-center`}>
        {supplyDisplay}
      </td>

      {/* TYPE */}
      <td class={`${cellCenterL2Card} text-color-neutral-200 text-center`}>
        {fileType}
      </td>

      {/* SIZE */}
      <td class={`${cellCenterL2Card} text-color-neutral-200 text-center`}>
        {fileSize}
      </td>

      {/* BLOCK */}
      <td class={`${cellCenterL2Card} text-color-neutral-300 text-center`}>
        {stamp.block_index.toLocaleString()}
      </td>

      {/* DATE */}
      <td class={`${cellRightL2Card} text-color-neutral-300 text-right pr-3`}>
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
    <div class="overflow-x-auto tablet:overflow-x-visible scrollbar-hide">
      <table
        class={`w-full border-separate border-spacing-y-3 ${textXs}`}
      >
        <colgroup>
          {colGroup([
            { width: "w-12" }, // IMAGE
            { width: "min-w-[90px] w-auto" }, // STAMP #
            { width: "min-w-[90px] w-auto" }, // CPID
            { width: "min-w-[110px] w-auto" }, // CREATOR
            { width: "min-w-[90px] w-auto" }, // SUPPLY
            { width: "min-w-[70px] w-auto" }, // TYPE
            { width: "min-w-[80px] w-auto" }, // SIZE
            { width: "min-w-[90px] w-auto" }, // BLOCK
            { width: "min-w-[100px] w-auto" }, // DATE
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
              return (
                <th
                  key={header}
                  class={`${labelXxs} ${
                    cellAlign(i, HEADERS.length)
                  } py-1.5 !px-3 ${rowClass} text-color-neutral-500`}
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
                  <p class="text-center text-color-neutral-500 text-xs">
                    NO STAMPS TO DISPLAY
                  </p>
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
