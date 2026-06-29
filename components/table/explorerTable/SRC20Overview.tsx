/* ===== SRC20 EXPLORER TABLE COMPONENT ===== */
import { cellAlign, colGroup } from "$components/layout/types.ts";
import { Icon, PlaceholderImage } from "$icon";
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
  splitTextAndEmojis,
  unicodeEscapeToEmoji,
} from "$lib/utils/ui/formatting/emojiUtils.ts";
import {
  abbreviateAddress,
  formatDate,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { getSRC20ImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import { labelXxs, textXs, valueDarkSm } from "$text";
import type { SRC20Row } from "$types/src20.d.ts";

/* ===== CONSTANTS ===== */
const HEADERS = [
  "IMAGE",
  "STAMP #",
  "TICK",
  "TYPE",
  "ADDRESS",
  "AMOUNT",
  "TX HASH",
  "BLOCK",
  "DATE",
];

/* ===== HELPERS ===== */
function formatAmount(amt: string | bigint | undefined): string {
  if (amt === undefined || amt === null) return "—";
  const n = Number(amt);
  if (isNaN(n)) return String(amt);
  return n.toLocaleString();
}

/* ===== ROW COMPONENT ===== */
interface SRC20OverviewRowProps {
  src20: SRC20Row;
}

export function SRC20OverviewRow({ src20 }: SRC20OverviewRowProps) {
  const tick = unicodeEscapeToEmoji(src20.tick ?? "");
  const op = (src20.op ?? "").toUpperCase() as "DEPLOY" | "MINT" | "TRANSFER";
  const imageUrl = getSRC20ImageSrc(src20) ?? null;
  const href = `/src20/${encodeURIComponent(tick)}`;

  /* ===== AMOUNT: amt for TRANSFER/MINT, max for DEPLOY ===== */
  const amount = op === "DEPLOY"
    ? formatAmount(src20.max)
    : formatAmount(src20.amt);

  const { text: tickText, emoji: tickEmoji } = splitTextAndEmojis(tick);

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
          {imageUrl
            ? (
              <img
                src={imageUrl}
                alt={tick}
                class="w-8 h-8 object-contain rounded-xl"
              />
            )
            : <PlaceholderImage variant="no-image" className="!rounded-xl" />}
        </a>
      </td>

      {/* STAMP # */}
      <td
        class={`${
          cellAlign(1, HEADERS.length)
        } ${cellCenterL2Card} ${cellStickyLeft2}`}
      >
        {src20.stamp != null
          ? (
            <a
              href={href}
              f-partial={href}
              target="_top"
              class="font-extrabold text-sm bg-gradient-to-r color-neutral-gradient color-gradient-hover inline-block w-fit"
            >
              <span class="font-light">#</span>
              {src20.stamp.toLocaleString()}
            </a>
          )
          : <span class="text-color-neutral-500">—</span>}
      </td>

      {/* TICK */}
      <td class={`${cellAlign(2, HEADERS.length)} ${cellCenterL2Card}`}>
        <a
          href={href}
          f-partial={href}
          target="_top"
          class="font-mono text-color-neutral-400"
        >
          {tickText && tickText.toUpperCase()}
          {tickEmoji && <span class="emoji-ticker">{tickEmoji}</span>}
        </a>
      </td>

      {/* TYPE */}
      <td
        class={`${cellAlign(3, HEADERS.length)} ${cellCenterL2Card}`}
      >
        <div class="flex items-center justify-center gap-2">
          <Icon
            type="icon"
            name="src20Token"
            weight="bold"
            size="xxs"
            color="greyLight"
          />
          <span class="bg-gradient-to-r from-color-neutral-400 via-color-neutral-300 to-color-neutral-200 inline-block text-transparent bg-clip-text w-fit">
            {op}
          </span>
        </div>
      </td>

      {/* ADDRESS */}
      <td
        class={`${
          cellAlign(4, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-200`}
      >
        <a
          href={`/wallet/${src20.creator}`}
          class="link-neutral-200-cell"
        >
          {src20.creator_name ?? abbreviateAddress(src20.creator, 5)}
        </a>
      </td>

      {/* AMOUNT */}
      <td
        class={`${
          cellAlign(5, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-200`}
      >
        {amount}
      </td>

      {/* TX HASH */}
      <td
        class={`${
          cellAlign(6, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-400`}
      >
        <a
          href={`https://mempool.space/tx/${src20.tx_hash}`}
          target="_blank"
          rel="noopener noreferrer"
          class="link-neutral-400-cell"
        >
          {abbreviateAddress(src20.tx_hash, 6)}
        </a>
      </td>

      {/* BLOCK */}
      <td
        class={`${
          cellAlign(7, HEADERS.length)
        } ${cellCenterL2Card} text-color-neutral-400`}
      >
        {src20.block_index.toLocaleString()}
      </td>

      {/* DATE */}
      <td
        class={`${
          cellAlign(8, HEADERS.length)
        } ${cellRightL2Card} text-color-neutral-200 pr-3`}
      >
        {formatDate(new Date(src20.block_time), {
          month: "numeric",
          day: "numeric",
          year: "numeric",
        }).toUpperCase()}
      </td>
    </tr>
  );
}

/* ===== TABLE WRAPPER ===== */
interface SRC20OverviewTableProps {
  src20s: SRC20Row[];
}

export function SRC20OverviewTable({ src20s }: SRC20OverviewTableProps) {
  return (
    <div class="overflow-x-auto tablet:overflow-x-visible scrollbar-hide">
      <table
        class={`w-full border-separate border-spacing-y-3 ${textXs}`}
      >
        <colgroup>
          {colGroup([
            { width: "w-10" }, // IMAGE (fixed for sticky left-0 anchor)
            { width: "min-w-[100px] w-auto" }, // STAMP #
            { width: "min-w-[170px] w-auto" }, // TICK
            { width: "min-w-[120px] w-auto" }, // TYPE
            { width: "min-w-[110px] w-auto" }, // ADDRESS
            { width: "min-w-[90px] w-auto" }, // AMOUNT
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
          {src20s.length
            ? src20s.map((src20) => (
              <SRC20OverviewRow
                key={src20.tx_hash}
                src20={src20}
              />
            ))
            : (
              <tr>
                <td
                  colSpan={HEADERS.length}
                  class={`w-full h-[46px] ${container2}`}
                >
                  <h6 class={`${valueDarkSm} text-center`}>
                    NO TOKENS TO DISPLAY
                  </h6>
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
