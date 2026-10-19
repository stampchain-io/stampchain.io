/* ===== WALLET SRC20 TABLE COMPONENT (COMPACT) =====
 * Used in the wallet page's ALL tab (1/3 tokens + 2/3 stamps split) — same
 * row/cell styling as WalletSRC20Overview.tsx, fewer columns. IMAGE + TICKER
 * are merged into a single sticky "TOKEN" cell (matches SRC20OverviewCompact's
 * merged "TOKEN" cell and WalletStampOverviewCompact's merged "STAMP" cell)
 * instead of two separate sticky columns. */
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
  isBrowser,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import {
  splitTextAndEmojis,
  unicodeEscapeToEmoji,
} from "$lib/utils/ui/formatting/emojiUtils.ts";
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
import {
  formatPriceSats,
  formatValueBtc,
  getPrice,
} from "./WalletSRC20Overview.tsx";

/* ===== CONSTANTS ===== */
const HEADERS = ["TOKEN", "PRICE", "CHANGE", "BALANCE", "VALUE"];

// VALUE is hidden from tablet+ up (see below) — BALANCE becomes the
// visually "last" column at that breakpoint, so it picks up the rounded
// right edge/border/alignment VALUE would otherwise own.
const cellBalanceCompact =
  `${cellCenterL2Card} tablet:rounded-r-2xl tablet:border-r-[1px] tablet:!pr-3 tablet:text-right`;

/* ===== ROW COMPONENT ===== */
interface WalletSRC20OverviewRowCompactProps {
  src20: SRC20Row;
}

export function WalletSRC20OverviewRowCompact(
  { src20 }: WalletSRC20OverviewRowCompactProps,
) {
  const tick = unicodeEscapeToEmoji(src20.tick ?? "");
  const imageUrl = getSRC20ImageSrc(src20) ?? null;
  const isCounterparty = src20.p === "counterparty";
  const href = `/src20/${encodeURIComponent(tick)}`;
  const { text: tickText, emoji: tickEmoji } = splitTextAndEmojis(tick);

  const priceBtc = getPrice(src20);
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
      uses cardRowStampNumber directly (same styling as the STAMP #
      compact cell) rather than a separate font-mono wrapper. */
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

      {/* BALANCE */}
      <td
        class={`${cellBalanceCompact} text-color-primary-400`}
      >
        {!isNaN(balance) ? balance.toLocaleString() : "0"}
      </td>

      {
        /* VALUE — hidden from tablet+ up, BALANCE takes over the last-
       * column styling at that breakpoint (see cellBalanceCompact). */
      }
      <td
        class={`${cellRightL2Card} text-color-neutral-200 pr-3 tablet:hidden`}
      >
        {value > 0
          ? formatValueBtc(value)
          : <span class="text-color-neutral-500">N/A</span>}
      </td>
    </tr>
  );
}

/* ===== TABLE WRAPPER ===== */
interface WalletSRC20OverviewTableCompactProps {
  src20s: SRC20Row[];
}

export function WalletSRC20OverviewTableCompact(
  { src20s }: WalletSRC20OverviewTableCompactProps,
) {
  return (
    <div class="overflow-x-auto tablet:overflow-x-visible scrollbar-hide -my-3">
      <table
        class={`w-full border-separate border-spacing-y-3 ${textXs}`}
      >
        <colgroup>
          {colGroup([
            {
              width:
                "min-w-[140px] max-w-[150px] w-auto sticky left-0 mobileLg:static",
            }, // TOKEN (image + ticker)
            { width: "min-w-[90px] w-auto" }, // PRICE
            { width: "min-w-[90px] w-auto" }, // CHANGE
            { width: "min-w-[90px] w-auto" }, // BALANCE
            { width: "min-w-[90px] w-auto tablet:hidden" }, // VALUE
          ]).map((col) => <col key={col.key} class={col.className} />)}
        </colgroup>
        <thead>
          <tr class={`${container2}`}>
            {HEADERS.map((header, i) => {
              const isFirst = i === 0;
              const isLast = i === HEADERS.length - 1;
              const isBalance = header === "BALANCE";
              const rowClass = header === "VALUE"
                ? `${cellRightL2Card} tablet:hidden`
                : isBalance
                ? cellBalanceCompact
                : isFirst
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
              <WalletSRC20OverviewRowCompact
                key={src20.tx_hash}
                src20={src20}
              />
            ))
            : (
              <tr>
                <td colSpan={HEADERS.length}>
                  <EmptyState label="NO TOKENS IN WALLET" icon="src20Tokens" />
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
