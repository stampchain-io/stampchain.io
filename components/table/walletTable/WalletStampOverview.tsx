/* ===== WALLET STAMP TABLE COMPONENT (FULL) ===== */
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
  showMarketData,
  stampPrefix,
  withoutMarketColumns,
} from "$lib/utils/chain/clientChain.ts";
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
import type { StampRow } from "$types/stamp.d.ts";
import { useState } from "preact/hooks";

/* ===== TYPES =====
 * The wallet balance API (routes/api/v2/stamps/balance/[address].tsx)
 * nests floor price + precomputed wallet value on every balance row —
 * there is no per-stamp market-cap field, so MARKETCAP below is derived
 * client-side (floor price × total issued supply). */
export interface WalletStampBalanceRow extends StampRow {
  market_data?: {
    floor_price_btc?: number | null;
    wallet_value_btc?: number | null;
  };
}

/* ===== CONSTANTS ===== */
const HEADERS = [
  "IMAGE",
  "STAMP #",
  "CPID",
  "CREATOR",
  "PRICE",
  "MARKETCAP",
  "BALANCE",
  "VALUE",
];

/* ===== HELPERS =====
 * Mirrors formatSupply's divisible handling so BALANCE/MARKETCAP math lines up
 * with the pill text shown alongside it. */
function toRealUnits(amount: number, divisible: boolean): number {
  return divisible ? amount / 100000000 : amount;
}

/* ===== ROW COMPONENT ===== */
interface WalletStampOverviewRowProps {
  stamp: WalletStampBalanceRow;
}

export function WalletStampOverviewRow({ stamp }: WalletStampOverviewRowProps) {
  const imgSrc = getStampImageSrc(stamp);
  // getStampImageSrc points HTML (and some other) mimetypes at a content
  // URL that can't render inside an <img> — track load failure so we swap
  // to the placeholder icon instead of leaving a broken-image icon.
  const [imageFailed, setImageFailed] = useState(false);
  const href = `/stamp/${stamp.tx_hash}`;

  const creatorDisplay = stamp.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp.creator, 5);

  const divisible = Boolean(stamp.divisible);
  const owned = Number(stamp.balance ?? 0);
  const issued = Number(stamp.supply ?? 0);
  const floor = stamp.market_data?.floor_price_btc ?? 0;

  const balanceDisplay = `${formatSupply(owned, divisible)}/${
    issued < 100000 && !divisible ? formatSupply(issued, divisible) : "+100000"
  }`;

  const value = stamp.market_data?.wallet_value_btc ??
    floor * toRealUnits(owned, divisible);
  const mcap = floor * toRealUnits(issued, divisible);

  /* ===== RENDER ===== */
  // Floor price, market cap, change and value are market data (none on ECX).
  const market = showMarketData();
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
                <span class="font-light">{stampPrefix(stamp.block_index)}</span>
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

      {market && (
        <>
          {/* PRICE */}
          <td
            class={`${cellCenterL2Card} text-color-secondary-400`}
          >
            {floor > 0
              ? formatBTCAmount(floor, { includeSymbol: true, decimals: 8 })
              : <span class="text-color-neutral-500">N/A</span>}
          </td>

          {/* MARKETCAP */}
          <td
            class={`${cellCenterL2Card} text-color-neutral-400`}
          >
            {mcap > 0
              ? formatBTCAmount(mcap, { includeSymbol: true, decimals: 4 })
              : <span class="text-color-neutral-500">N/A</span>}
          </td>
        </>
      )}

      {/* BALANCE */}
      <td
        class={`${
          market ? cellCenterL2Card : cellRightL2Card
        } text-color-primary-400`}
      >
        {balanceDisplay}
      </td>

      {market && (
        <>
          {/* VALUE */}
          <td
            class={`${cellRightL2Card} text-color-neutral-200 pr-3`}
          >
            {value > 0
              ? formatBTCAmount(value, { includeSymbol: true, decimals: 8 })
              : <span class="text-color-neutral-500">N/A</span>}
          </td>
        </>
      )}
    </tr>
  );
}

/* ===== TABLE WRAPPER ===== */
interface WalletStampOverviewTableProps {
  stamps: WalletStampBalanceRow[];
}

export function WalletStampOverviewTable(
  { stamps }: WalletStampOverviewTableProps,
) {
  const headers = withoutMarketColumns(HEADERS, HEADERS);
  return (
    <div class="overflow-x-auto tablet:overflow-x-visible scrollbar-hide -my-3">
      <table
        class={`w-full border-separate border-spacing-y-3 ${textXs}`}
      >
        <colgroup>
          {colGroup(withoutMarketColumns([
            { width: "w-10" }, // IMAGE (fixed for sticky left-0 anchor)
            { width: "min-w-[90px] w-auto" }, // STAMP #
            { width: "min-w-[180px] w-auto" }, // CPID
            { width: "min-w-[120px] w-auto" }, // CREATOR
            { width: "min-w-[100px] w-auto" }, // PRICE
            { width: "min-w-[100px] w-auto" }, // MARKETCAP
            { width: "min-w-[100px] w-auto" }, // BALANCE
            { width: "min-w-[100px] w-auto" }, // VALUE
          ], HEADERS)).map((col) => (
            <col
              key={col.key}
              class={col.className}
            />
          ))}
        </colgroup>
        <thead>
          <tr class={`${container2}`}>
            {headers.map((header, i) => {
              const isFirst = i === 0;
              const isLast = i === headers.length - 1;
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
              <WalletStampOverviewRow key={stamp.tx_hash} stamp={stamp} />
            ))
            : (
              <tr>
                <td colSpan={headers.length}>
                  <EmptyState label="NO STAMPS IN WALLET" icon="artStamps" />
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
