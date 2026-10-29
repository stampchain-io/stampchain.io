/* ===== MARKETPLACE SALES TABLE COMPONENT ===== */
import { ExplorerLink } from "$components/layout/ExplorerLink.tsx";
import { stampPrefix, txExplorerUrl } from "$lib/utils/chain/clientChain.ts";
import { colGroup } from "$components/layout/types.ts";
import { PlaceholderImage } from "$icon";
import StampTextContent from "$islands/content/stampDetailContent/StampTextContent.tsx";
import {
  cellCenterL2Card,
  cellLeftL2Card,
  cellRightL2Card,
  cellStickyLeft,
  cellStickyLeft2,
  container2,
  EmptyState,
  shadowGlowPurple,
} from "$layout";
import {
  isBrowser,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import {
  abbreviateAddress,
  formatBTCAmount,
  formatSupply,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { getStampImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import { cardRowStampNumber, labelXxs, textXs } from "$text";
import type { StampWithEnhancedSaleData } from "$types/stamp.d.ts";
import { useState } from "preact/hooks";

/* ===== CONSTANTS ===== */
const HEADERS = [
  "IMAGE",
  "STAMP #",
  "CPID",
  "ARTIST",
  "SOLD",
  "PRICE",
  "DISPENSER",
  "BUYER",
  "TX HASH",
  "DATE",
];

/* ===== HELPERS ===== */
function formatSaleDate(saleTime?: number | null, timeAgo?: string): string {
  try {
    if (!saleTime) return timeAgo ?? "N/A";
    const saleMs = saleTime * 1000;
    const ageMs = Date.now() - saleMs;
    if (ageMs < 7 * 86_400_000) {
      return timeAgo ?? (() => {
        const hours = Math.floor(ageMs / 3_600_000);
        const mins = Math.floor((ageMs % 3_600_000) / 60_000);
        if (hours > 0) return `${hours}H AGO`;
        if (mins > 0) return `${mins}M AGO`;
        return "JUST NOW";
      })();
    }
    const d = new Date(saleMs);
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
  // getStampImageSrc points HTML (and some other) mimetypes at a content
  // URL that can't render inside an <img> — track load failure so we swap
  // to the placeholder icon instead of leaving a broken-image icon.
  const [imageFailed, setImageFailed] = useState(false);
  const href = `/stamp/${stamp.tx_hash}`;
  const sale = stamp.sale_data;

  const creatorDisplay = stamp.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp.creator, 5);

  const soldQuantity = (sale as Record<string, unknown> | undefined)
    ?.dispense_quantity;
  const soldDisplay = soldQuantity != null
    ? `${Number(soldQuantity).toLocaleString()}/${
      formatSupply(stamp.supply ?? 0, stamp.divisible)
    }`
    : `1/${formatSupply(stamp.supply ?? 0, stamp.divisible)}`;

  const priceDisplay = sale?.btc_amount != null
    ? formatBTCAmount(sale.btc_amount, { includeSymbol: true, decimals: 8 })
    : null;

  const timeAgo = sale?.time_ago;
  const dateDisplay = formatSaleDate(sale?.sale_time, timeAgo);

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

      {/* STAMP # — sticky col 1 */}
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
                {/* Sale rows: block_index is the sale block, not the creation block. */}
                <span class="font-light">{stampPrefix(null)}</span>
                {stamp.stamp}
              </>
            )
            : <span class="text-color-neutral-500">N/A</span>}
        </a>
      </td>

      {/* CPID */}
      <td
        class={`${cellCenterL2Card} font-mono text-color-neutral-400`}
      >
        {stamp.cpid ?? "N/A"}
      </td>

      {/* CREATOR/ARTIST */}
      <td
        class={`${cellCenterL2Card} font-medium text-color-neutral-200`}
      >
        <a
          href={`/wallet/${stamp.creator}`}
          class="link-neutral-200"
        >
          {creatorDisplay}
        </a>
      </td>

      {/* SOLD */}
      <td
        class={`${cellCenterL2Card} text-color-primary-400`}
      >
        {soldDisplay}
      </td>

      {/* PRICE */}
      <td
        class={`${cellCenterL2Card} text-color-secondary-400`}
      >
        {priceDisplay ?? <span class="text-color-neutral-500">N/A</span>}
      </td>

      {/* DISPENSER ADDY */}
      <td
        class={`${cellCenterL2Card} text-color-neutral-200`}
      >
        {sale?.dispenser_address
          ? (
            <a
              href={`/wallet/${sale.dispenser_address}`}
              class="link-neutral-200"
            >
              {abbreviateAddress(sale.dispenser_address, 5)}
            </a>
          )
          : <span class="text-color-neutral-500">N/A</span>}
      </td>

      {/* BUYER ADDY */}
      <td
        class={`${cellCenterL2Card} text-color-neutral-200`}
      >
        {sale?.buyer_address
          ? (
            <a
              href={`/wallet/${sale.buyer_address}`}
              class="link-neutral-200"
            >
              {abbreviateAddress(sale.buyer_address, 5)}
            </a>
          )
          : <span class="text-color-neutral-500">N/A</span>}
      </td>

      {/* TX HASH */}
      <td
        class={`${cellCenterL2Card} text-color-neutral-400`}
      >
        {sale?.tx_hash
          ? (
            <ExplorerLink
              href={txExplorerUrl(sale.tx_hash)}
              target="_blank"
              rel="noopener noreferrer"
              class="link-neutral-400"
            >
              {abbreviateAddress(sale.tx_hash, 6)}
            </ExplorerLink>
          )
          : "N/A"}
      </td>

      {/* DATE */}
      <td
        class={`${cellRightL2Card} pr-3 text-color-neutral-400`}
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
    <div class="overflow-x-auto scrollbar-hide -my-3">
      <table
        class={`w-full border-separate border-spacing-y-3 ${textXs}`}
      >
        <colgroup>
          {colGroup([
            { width: "w-10" }, // IMAGE
            { width: "min-w-[100px] w-auto" }, // STAMP #
            { width: "min-w-[170px] w-auto" }, // CPID
            { width: "min-w-[110px] w-auto" }, // ARTIST
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
                <td colSpan={HEADERS.length}>
                  <EmptyState label="NO SALES TO DISPLAY" icon="artStamps" />
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
