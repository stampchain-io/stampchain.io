/* ===== MARKETPLACE LISTINGS TABLE COMPONENT ===== */
import { cellAlign, colGroup } from "$components/layout/types.ts";
import { PlaceholderImage } from "$icon";
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
  formatBTCAmount,
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
  "CREATOR",
  "LISTED",
  "PRICE",
  "SELLER",
  "DISPENSER",
  "TX HASH",
];

/* ===== HELPERS ===== */
function formatPrice(floorPrice: number | "priceless" | undefined): string {
  if (!floorPrice || floorPrice === "priceless") return "PRICELESS";
  return formatBTCAmount(floorPrice, { includeSymbol: true, decimals: 8 });
}

function getDispenser(stamp: StampRow): {
  txHash: string | null;
  source: string | null;
  giveRemaining: number | null;
} {
  const d = (stamp as unknown as Record<string, unknown>).lowestPriceDispenser;
  if (!d || typeof d !== "object") {
    return { txHash: null, source: null, giveRemaining: null };
  }
  const dispenser = d as Record<string, unknown>;
  return {
    txHash: typeof dispenser.tx_hash === "string" ? dispenser.tx_hash : null,
    source: typeof dispenser.source === "string" ? dispenser.source : null,
    giveRemaining: typeof dispenser.give_remaining === "number"
      ? dispenser.give_remaining
      : null,
  };
}

/* ===== ROW COMPONENT ===== */
interface StampListingsRowProps {
  stamp: StampRow;
}

export function StampListingsRow({ stamp }: StampListingsRowProps) {
  const imgSrc = getStampImageSrc(stamp);
  const href = `/stamp/${stamp.tx_hash}`;
  const dispenser = getDispenser(stamp);

  const creatorDisplay = stamp.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp.creator, 5);

  const listedDisplay = dispenser.giveRemaining != null
    ? `${dispenser.giveRemaining.toLocaleString()}/${
      formatSupplyValue(stamp.supply ?? 0, stamp.divisible)
    }`
    : formatSupplyValue(stamp.supply ?? 0, stamp.divisible);

  /* ===== RENDER ===== */
  return (
    <tr
      class={`group ${container2} ${shadowGlowPurple}`}
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
      {/* IMAGE — sticky col 0 */}
      <td
        class={`${
          cellAlign(0, HEADERS.length)
        } ${cellLeftL2Card} ${cellStickyLeft}`}
      >
        <a
          href={href}
          f-partial={href}
          target="_top"
          class="flex items-center justify-center w-8 h-8 rounded-xl overflow-hidden"
        >
          {imgSrc
            ? (
              <img
                src={imgSrc}
                alt={`Stamp ${stamp.stamp ?? stamp.cpid ?? ""}`}
                class="w-8 h-8 object-contain rounded-xl pixelart"
              />
            )
            : <PlaceholderImage variant="no-image" />}
        </a>
      </td>

      {/* STAMP # — sticky col 1 */}
      <td
        class={`${
          cellAlign(1, HEADERS.length)
        } ${cellCenterL2Card} ${cellStickyLeft2}`}
      >
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
      <td
        class={`${
          cellAlign(2, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-400`}
      >
        {stamp.cpid ?? "—"}
      </td>

      {/* CREATOR */}
      <td
        class={`${
          cellAlign(3, HEADERS.length)
        } ${cellCenterL2Card} font-medium text-color-neutral-200`}
      >
        {creatorDisplay}
      </td>

      {/* LISTED */}
      <td
        class={`${
          cellAlign(4, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-200`}
      >
        {listedDisplay}
      </td>

      {/* PRICE */}
      <td
        class={`${
          cellAlign(5, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-200`}
      >
        {formatPrice(stamp.floorPrice)}
      </td>

      {/* SELLER */}
      <td
        class={`${
          cellAlign(6, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-400 underline hover:text-color-hover hover:no-underline transition-all`}
      >
        {dispenser.source
          ? (
            <a
              href={`/wallet/${dispenser.source}`}
            >
              {abbreviateAddress(dispenser.source, 5)}
            </a>
          )
          : "—"}
      </td>

      {/* DISPENSER TX */}
      <td
        class={`${
          cellAlign(7, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-400 underline hover:text-color-hover hover:no-underline transition-all`}
      >
        {dispenser.txHash ? abbreviateAddress(dispenser.txHash, 6) : "—"}
      </td>

      {/* TX HASH */}
      <td
        class={`${
          cellAlign(8, HEADERS.length)
        } ${cellRightL2Card} text-color-neutral-400 underline hover:text-color-hover hover:no-underline transition-all pr-3`}
      >
        {abbreviateAddress(stamp.tx_hash, 6)}
      </td>
    </tr>
  );
}

/* ===== TABLE WRAPPER ===== */
interface StampListingsTableProps {
  stamps: StampRow[];
}

export function StampListingsTable({ stamps }: StampListingsTableProps) {
  return (
    <div class="overflow-x-auto scrollbar-hide">
      <table
        class={`w-full border-separate border-spacing-y-3 ${textXs}`}
      >
        <colgroup>
          {colGroup([
            { width: "w-12" }, // IMAGE
            { width: "min-w-[90px] w-auto" }, // STAMP #
            { width: "min-w-[110px] w-auto" }, // CPID
            { width: "min-w-[120px] w-auto" }, // CREATOR
            { width: "min-w-[90px] w-auto" }, // LISTED
            { width: "min-w-[120px] w-auto" }, // PRICE
            { width: "min-w-[110px] w-auto" }, // SELLER
            { width: "min-w-[110px] w-auto" }, // DISPENSER
            { width: "min-w-[110px] w-auto" }, // TX HASH
          ]).map((col) => <col key={col.key} class={col.className} />)}
        </colgroup>
        <thead>
          <tr class={`${container2}`}>
            {HEADERS.map((header, i) => {
              const isFirst = i === 0;
              const isLast = i === HEADERS.length - 1;
              const stickyClass = isFirst
                ? cellStickyLeft
                : i === 1
                ? cellStickyLeft2
                : "";
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
                  } py-1.5 !px-3 ${rowClass} ${stickyClass} text-color-neutral-500`}
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
              <StampListingsRow
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
                    NO LISTINGS TO DISPLAY
                  </p>
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
