/* ===== WALLET SRC20 TABLE COMPONENT (FULL) =====
 * IMAGE + TICKER are merged into a single sticky "TOKEN" cell (matches
 * SRC20OverviewCompact's and WalletSRC20OverviewCompact's merged "TOKEN"
 * cell) instead of two separate sticky columns. */
import { colGroup } from "$components/layout/types.ts";
import { PlaceholderImage } from "$icon";
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
  showMarketData,
  withoutMarketColumns,
} from "$lib/utils/chain/clientChain.ts";
import {
  isBrowser,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import {
  splitTextAndEmojis,
  unicodeEscapeToEmoji,
} from "$lib/utils/ui/formatting/emojiUtils.ts";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";
import { getSRC20ImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import {
  cardRowStampNumber,
  labelXxs,
  textXs,
  valueNegative,
  valueNeutral,
  valuePositive,
} from "$text";
import type { SRC20Row } from "$types/src20.d.ts";

/* ===== CONSTANTS ===== */
const HEADERS = [
  "TOKEN",
  "CREATOR",
  "SUPPLY",
  "PRICE",
  "CHANGE",
  "MARKETCAP",
  "BALANCE",
  "VALUE",
];

/* ===== HELPERS ===== */
function formatAmount(amt: string | bigint | undefined): string {
  if (amt === undefined || amt === null) return "—";
  const n = Number(amt);
  if (isNaN(n)) return String(amt);
  return n.toLocaleString();
}

// Same fallback hierarchy SRC20Card uses for its price pill. Exported for
// reuse by WalletSRC20OverviewCompact.tsx.
export function getPrice(src20: SRC20Row): number {
  const price = src20.market_data?.price_btc ?? src20.floor_price_btc;
  if (!price) return 0;
  const parsed = parseFloat(String(price));
  return isNaN(parsed) ? 0 : parsed;
}

export function getMarketCap(src20: SRC20Row): number {
  const marketCap = src20.market_data?.market_cap_btc ?? src20.market_cap_btc;
  if (!marketCap) return 0;
  const parsed = parseFloat(String(marketCap));
  return isNaN(parsed) ? 0 : parsed;
}

export function formatPriceSats(priceInBtc: number): string {
  if (priceInBtc === 0) return "0 SATS";
  const priceInSats = priceInBtc * 1e8;
  if (priceInSats < 0.0001) return priceInSats.toFixed(6) + " SATS";
  if (priceInSats < 1) return priceInSats.toFixed(4) + " SATS";
  if (priceInSats < 10) return priceInSats.toFixed(2) + " SATS";
  if (priceInSats < 100) return priceInSats.toFixed(1) + " SATS";
  return Math.round(priceInSats).toLocaleString() + " SATS";
}

export function formatValueBtc(btc: number): string {
  if (btc === 0) return "0 BTC";
  if (btc < 0.0001) return btc.toFixed(6) + " BTC";
  if (btc < 0.01) return btc.toFixed(4) + " BTC";
  if (btc < 1000) return btc.toFixed(2) + " BTC";
  return Math.round(btc).toLocaleString() + " BTC";
}

/* ===== ROW COMPONENT ===== */
interface WalletSRC20OverviewRowProps {
  src20: SRC20Row;
}

export function WalletSRC20OverviewRow({ src20 }: WalletSRC20OverviewRowProps) {
  const tick = unicodeEscapeToEmoji(src20.tick ?? "");
  const imageUrl = getSRC20ImageSrc(src20) ?? null;
  const isCounterparty = src20.p === "counterparty";
  const href = `/src20/${encodeURIComponent(tick)}`;
  const { text: tickText, emoji: tickEmoji } = splitTextAndEmojis(tick);

  const priceBtc = getPrice(src20);
  const marketCap = getMarketCap(src20);
  const change = src20.market_data?.change_24h_percent;
  const balance = src20.amt !== undefined ? Number(src20.amt) : NaN;
  const value = !isNaN(balance) && priceBtc ? balance * priceBtc : 0;

  const tokenLabel = (
    <>
      <div class="flex items-center justify-center w-6.5 h-6.5 rounded-xl overflow-hidden shrink-0">
        {imageUrl
          ? (
            <img
              src={imageUrl}
              alt={tick}
              class="w-6.5 h-6.5 object-contain rounded-xl"
            />
          )
          : (
            <PlaceholderImage
              variant="no-image"
              className="!rounded-xl"
            />
          )}
      </div>
      <span class={cardRowStampNumber}>
        {tickText && (
          <>
            <span class="font-light pr-0.5">$</span>
            {tickText.toUpperCase()}
          </>
        )}
        {tickEmoji && <span class="emoji-ticker">{tickEmoji}</span>}
      </span>
    </>
  );

  /* ===== RENDER ===== */
  // Floor price, market cap, change and value are market data (none on ECX).
  const market = showMarketData();
  return (
    <tr
      class={`${container2} ${shadowGlowPurple}`}
      onClick={(e) => {
        if (isCounterparty) return;
        const target = e.target as HTMLElement;
        if (target.closest("button, a")) return;
        if (!e.ctrlKey && !e.metaKey && e.button !== 1) {
          e.preventDefault();
          if (!isBrowser()) return;
          safeNavigate(href);
        }
      }}
    >
      {
        /* TOKEN — IMAGE + TICKER merged into one sticky cell. Ticker text
      uses cardRowStampNumber directly (same styling as the STAMP # cell). */
      }
      <td
        class={`${cellLeftL2Card} ${cellStickyLeft}`}
      >
        {isCounterparty
          ? <div class="flex items-center gap-4">{tokenLabel}</div>
          : (
            <a
              href={href}
              f-partial={href}
              target="_top"
              class="flex items-center gap-4"
            >
              {tokenLabel}
            </a>
          )}
      </td>

      {/* CREATOR */}
      <td
        class={`${cellCenterL2Card} text-color-neutral-200`}
      >
        {isCounterparty ? <span class="text-color-neutral-500">N/A</span> : (
          <a
            href={`/wallet/${src20.creator}`}
            class="link-neutral-200"
          >
            {src20.creator_name ?? abbreviateAddress(src20.creator, 5)}
          </a>
        )}
      </td>

      {/* SUPPLY */}
      <td
        class={`${cellCenterL2Card} text-color-neutral-400`}
      >
        {formatAmount(src20.max)}
      </td>

      {market && (
        <>
          {/* PRICE */}
          <td
            class={`${cellCenterL2Card} text-color-secondary-400`}
          >
            {formatPriceSats(priceBtc)}
          </td>

          {/* CHANGE */}
          <td
            class={cellCenterL2Card}
          >
            {change !== undefined && change !== null && !isNaN(Number(change))
              ? (
                <span
                  class={Number(change) > 0
                    ? valuePositive
                    : Number(change) < 0
                    ? valueNegative
                    : valueNeutral}
                >
                  {Number(change) > 0 ? "+" : ""}
                  {Number(change).toFixed(2)}%
                </span>
              )
              : <span class="text-color-neutral-500">N/A</span>}
          </td>

          {/* MARKETCAP */}
          <td
            class={`${cellCenterL2Card} text-color-neutral-400`}
          >
            {marketCap > 0
              ? formatValueBtc(marketCap)
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
        {!isNaN(balance) ? balance.toLocaleString() : "0"}
      </td>

      {market && (
        <>
          {/* VALUE */}
          <td
            class={`${cellRightL2Card} text-color-neutral-200 pr-3`}
          >
            {value > 0
              ? formatValueBtc(value)
              : <span class="text-color-neutral-500">N/A</span>}
          </td>
        </>
      )}
    </tr>
  );
}

/* ===== TABLE WRAPPER ===== */
interface WalletSRC20OverviewTableProps {
  src20s: SRC20Row[];
}

export function WalletSRC20OverviewTable(
  { src20s }: WalletSRC20OverviewTableProps,
) {
  const headers = withoutMarketColumns(HEADERS, HEADERS);
  return (
    <div class="overflow-x-auto tablet:overflow-x-visible scrollbar-hide -my-3">
      <table
        class={`w-full border-separate border-spacing-y-3 ${textXs}`}
      >
        <colgroup>
          {colGroup(withoutMarketColumns([
            {
              width:
                "min-w-[140px] max-w-[160px] w-auto sticky left-0 mobileLg:static",
            }, // TOKEN (image + ticker)
            { width: "min-w-[120px] w-auto" }, // CREATOR
            { width: "min-w-[100px] w-auto" }, // SUPPLY
            { width: "min-w-[100px] w-auto" }, // PRICE
            { width: "min-w-[100px] w-auto" }, // CHANGE
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
              const stickyClass = isFirst ? cellStickyLeft : "";
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
          {src20s.length
            ? src20s.map((src20) => (
              <WalletSRC20OverviewRow key={src20.tx_hash} src20={src20} />
            ))
            : (
              <tr>
                <td colSpan={headers.length}>
                  <EmptyState label="NO TOKENS IN WALLET" icon="src20Tokens" />
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
