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
import { labelXxs, textXs } from "$text";
import type { StampWithEnhancedSaleData } from "$types/stamp.d.ts";

/* ===== CONSTANTS ===== */
const HEADERS = [
  "IMAGE",
  "STAMP #",
  "CPID",
  "CREATOR",
  "SOLD",
  "PRICE",
  "SELLER",
  "BUYER",
  "TX HASH",
];

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
    : "—";

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
        } ${cellCenterL2Card} text-color-neutral-200`}
      >
        {priceDisplay}
      </td>

      {/* SELLER */}
      <td
        class={`${
          cellAlign(6, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-400 underline hover:text-color-hover hover:no-underline transition-all`}
      >
        {sale?.dispenser_address
          ? (
            <a
              href={`/wallet/${sale.dispenser_address}`}
            >
              {abbreviateAddress(sale.dispenser_address, 5)}
            </a>
          )
          : "—"}
      </td>

      {/* BUYER */}
      <td
        class={`${
          cellAlign(7, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-400 underline hover:text-color-hover hover:no-underline transition-all`}
      >
        {sale?.buyer_address
          ? (
            <a
              href={`/wallet/${sale.buyer_address}`}
            >
              {abbreviateAddress(sale.buyer_address, 5)}
            </a>
          )
          : "—"}
      </td>

      {/* TX HASH */}
      <td
        class={`${
          cellAlign(8, HEADERS.length)
        } ${cellRightL2Card} text-color-neutral-400 underline hover:text-color-hover hover:no-underline transition-all pr-3`}
      >
        {sale?.tx_hash
          ? abbreviateAddress(sale.tx_hash, 6)
          : abbreviateAddress(stamp.tx_hash, 6)}
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
            { width: "w-12" }, // IMAGE
            { width: "min-w-[90px] w-auto" }, // STAMP #
            { width: "min-w-[110px] w-auto" }, // CPID
            { width: "min-w-[120px] w-auto" }, // CREATOR
            { width: "min-w-[80px] w-auto" }, // SOLD
            { width: "min-w-[120px] w-auto" }, // PRICE
            { width: "min-w-[110px] w-auto" }, // SELLER
            { width: "min-w-[110px] w-auto" }, // BUYER
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
                  <p class="text-center text-color-neutral-500 text-xs">
                    NO SALES TO DISPLAY
                  </p>
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
