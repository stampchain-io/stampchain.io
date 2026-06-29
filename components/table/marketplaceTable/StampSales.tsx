/* ===== MARKETPLACE SALES TABLE COMPONENT ===== */
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
import { labelXxs, textXs, valueDarkSm } from "$text";
import type { StampWithEnhancedSaleData } from "$types/stamp.d.ts";

/* ===== CONSTANTS ===== */
const HEADERS = [
  "IMAGE",
  "STAMP #",
  "CPID",
  "CREATOR",
  "SOLD",
  "PRICE",
  "DISPENSER",
  "BUYER",
  "TX HASH",
  "DATE",
];

/* ===== HELPERS ===== */
function formatSaleDate(blockTime: Date, timeAgo?: string): string {
  try {
    const blockMs = new Date(blockTime).getTime();
    if (isNaN(blockMs)) return "N/A";
    const ageMs = Date.now() - blockMs;
    if (ageMs < 86_400_000) {
      if (timeAgo) return timeAgo;
      const hours = Math.floor(ageMs / 3_600_000);
      const mins = Math.floor((ageMs % 3_600_000) / 60_000);
      if (hours > 0) return `${hours}H AGO`;
      if (mins > 0) return `${mins}M AGO`;
      return "JUST NOW";
    }
    const d = new Date(blockTime);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  } catch {
    return "N/A";
  }
}

/* ===== ROW COMPONENT ===== */
interface MarketplaceSalesRowProps {
  stamp: StampWithEnhancedSaleData;
}

export function MarketplaceSalesRow({ stamp }: MarketplaceSalesRowProps) {
  const imgSrc = getStampImageSrc(stamp);
  const href = `/stamp/${stamp.tx_hash}`;
  const sale = stamp.sale_data;

  const creatorDisplay = stamp.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp.creator, 5);

  const soldQuantity = (sale as Record<string, unknown> | undefined)
    ?.dispense_quantity;
  const soldDisplay = soldQuantity != null
    ? `${Number(soldQuantity).toLocaleString()}/${
      formatSupplyValue(stamp.supply ?? 0, stamp.divisible)
    }`
    : `1/${formatSupplyValue(stamp.supply ?? 0, stamp.divisible)}`;

  const priceDisplay = sale?.btc_amount != null
    ? formatBTCAmount(sale.btc_amount, { includeSymbol: true, decimals: 8 })
    : "N/A";

  const timeAgo = (sale as Record<string, unknown> | undefined)
    ?.time_ago as string | undefined;
  const dateDisplay = formatSaleDate(stamp.block_time, timeAgo);

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
            : "N/A"}
        </a>
      </td>

      {/* CPID */}
      <td
        class={`${
          cellAlign(2, HEADERS.length)
        } ${cellCenterL2Card} font-mono text-color-neutral-400`}
      >
        {stamp.cpid ?? "N/A"}
      </td>

      {/* CREATOR */}
      <td
        class={`${
          cellAlign(3, HEADERS.length)
        } ${cellCenterL2Card} font-medium text-color-neutral-200`}
      >
        {creatorDisplay}
      </td>

      {/* SOLD */}
      <td
        class={`${
          cellAlign(4, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-200`}
      >
        {soldDisplay}
      </td>

      {/* PRICE */}
      <td
        class={`${
          cellAlign(5, HEADERS.length)
        } ${cellCenterL2Card} text-color-secondary-400`}
      >
        {priceDisplay}
      </td>

      {/* DISPENSER ADDY */}
      <td
        class={`${
          cellAlign(6, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-200`}
      >
        {sale?.dispenser_address
          ? (
            <a
              href={`/wallet/${sale.dispenser_address}`}
              class="link-neutral-200-cell"
            >
              {abbreviateAddress(sale.dispenser_address, 5)}
            </a>
          )
          : "N/A"}
      </td>

      {/* BUYER ADDY */}
      <td
        class={`${
          cellAlign(7, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-400`}
      >
        {sale?.buyer_address
          ? (
            <a
              href={`/wallet/${sale.buyer_address}`}
              class="link-neutral-400-cell"
            >
              {abbreviateAddress(sale.buyer_address, 5)}
            </a>
          )
          : "N/A"}
      </td>

      {/* TX HASH */}
      <td
        class={`${
          cellAlign(8, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-400`}
      >
        {sale?.tx_hash
          ? (
            <a
              href={`https://mempool.space/tx/${sale.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              class="link-neutral-400-cell"
            >
              {abbreviateAddress(sale.tx_hash, 6)}
            </a>
          )
          : "N/A"}
      </td>

      {/* DATE */}
      <td
        class={`${
          cellAlign(9, HEADERS.length)
        } ${cellRightL2Card} pr-3 text-color-neutral-200`}
      >
        {dateDisplay}
      </td>
    </tr>
  );
}

/* ===== TABLE WRAPPER ===== */
interface MarketplaceSalesTableProps {
  stamps: StampWithEnhancedSaleData[];
}

export function MarketplaceSalesTable({ stamps }: MarketplaceSalesTableProps) {
  return (
    <div class="overflow-x-auto scrollbar-hide">
      <table
        class={`w-full border-separate border-spacing-y-3 ${textXs}`}
      >
        <colgroup>
          {colGroup([
            { width: "w-10" }, // IMAGE
            { width: "min-w-[100px] w-auto" }, // STAMP #
            { width: "min-w-[170px] w-auto" }, // CPID
            { width: "min-w-[110px] w-auto" }, // CREATOR
            { width: "min-w-[70px] w-auto" }, // SOLD
            { width: "min-w-[110px] w-auto" }, // PRICE
            { width: "min-w-[110px] w-auto" }, // DISPENSER ADDY
            { width: "min-w-[110px] w-auto" }, // BUYER ADDY
            { width: "min-w-[110px] w-auto" }, // TX HASH
            { width: "min-w-[90px] w-auto" }, // DATE
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
            ? stamps.map((stamp, index) => (
              <MarketplaceSalesRow
                key={stamp.sale_data?.tx_hash
                  ? `${stamp.tx_hash}-${stamp.sale_data.tx_hash}-${index}`
                  : stamp.tx_hash}
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
                    NO SALES TO DISPLAY
                  </h6>
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
