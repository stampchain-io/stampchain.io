/* ===== SRC20 EXPLORER TABLE COMPONENT ===== */
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
import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";
import { getSRC20ImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import { labelXxs, textXs } from "$text";
import type { SRC20Row } from "$types/src20.d.ts";

/* ===== CONSTANTS ===== */
const HEADERS = [
  "IMAGE",
  "STAMP #",
  "TICK",
  "ADDRESS",
  "OP",
  "AMOUNT",
  "DEST / LIMIT",
];

/* ===== HELPERS ===== */
function formatAmount(amt: string | bigint | undefined): string {
  if (amt === undefined || amt === null) return "—";
  const n = Number(amt);
  if (isNaN(n)) return String(amt);
  return n.toLocaleString();
}

function splitTextAndEmojis(text: string): { text: string; emoji: string } {
  if (typeof text !== "string") return { text: String(text || ""), emoji: "" };
  const emojiRegex =
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;
  const match = text.match(emojiRegex);
  if (!match || !match[0]) return { text, emoji: "" };
  const emojiIndex = text.indexOf(match[0]);
  return { text: text.slice(0, emojiIndex), emoji: text.slice(emojiIndex) };
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

  /* ===== DEST / LIMIT column ===== */
  let destOrLimit: string;
  if (op === "TRANSFER") {
    destOrLimit = src20.destination_name ??
      (src20.destination ? abbreviateAddress(src20.destination, 5) : "—");
  } else if (op === "MINT") {
    destOrLimit = src20.destination_name ??
      (src20.destination
        ? abbreviateAddress(src20.destination, 5)
        : src20.creator_name ?? abbreviateAddress(src20.creator, 5));
  } else {
    // DEPLOY
    destOrLimit = src20.lim ? formatAmount(src20.lim) : "—";
  }

  const { text: tickText, emoji: tickEmoji } = splitTextAndEmojis(tick);

  /* ===== RENDER ===== */
  return (
    <tr
      class={`group ${container2} ${shadowGlowPurple} cursor-pointer`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === "A" || target.tagName === "IMG") return;
        if (!e.ctrlKey && !e.metaKey && e.button !== 1) {
          e.preventDefault();
          if (!isBrowser()) return;
          safeNavigate(href);
        }
      }}
    >
      {/* IMAGE */}
      <td
        class={`${cellAlign(0, HEADERS.length)} ${cellLeftL2Card} !p-1.5`}
      >
        <a
          href={href}
          f-partial={href}
          target="_top"
          class="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden"
        >
          {imageUrl
            ? (
              <img
                src={imageUrl}
                alt={tick}
                class="w-9 h-9 object-cover rounded-full"
              />
            )
            : (
              <div class="w-9 h-9 rounded-full overflow-hidden">
                <PlaceholderImage variant="no-image" />
              </div>
            )}
        </a>
      </td>

      {/* STAMP # */}
      <td class={`${cellCenterL2Card} text-center`}>
        {src20.stamp != null
          ? (
            <a
              href={href}
              f-partial={href}
              target="_top"
              class="font-extrabold text-sm bg-gradient-to-r color-neutral-gradient color-gradient-hover inline-block"
            >
              <span class="font-light">#</span>
              {src20.stamp.toLocaleString()}
            </a>
          )
          : <span class="text-color-neutral-500">—</span>}
      </td>

      {/* TICK */}
      <td class={`${cellCenterL2Card} text-center`}>
        <a
          href={href}
          f-partial={href}
          target="_top"
          class="text-color-neutral-300"
        >
          {tickText && tickText.toUpperCase()}
          {tickEmoji && <span class="emoji-ticker">{tickEmoji}</span>}
        </a>
      </td>

      {/* ADDRESS */}
      <td class={`${cellCenterL2Card} text-color-neutral-200 text-center`}>
        {src20.creator_name ?? abbreviateAddress(src20.creator, 5)}
      </td>

      {/* OP */}
      <td class={`${cellCenterL2Card} text-center`}>
        <div class="text-color-neutral-200">
          {op}
        </div>
      </td>

      {/* AMOUNT */}
      <td class={`${cellCenterL2Card} text-color-neutral-200 text-center`}>
        {amount}
      </td>

      {/* DEST / LIMIT */}
      <td
        class={`${
          cellAlign(HEADERS.length - 1, HEADERS.length)
        } ${cellRightL2Card} text-color-neutral-200 text-right pr-3`}
      >
        {destOrLimit}
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
            { width: "w-14" }, // IMAGE
            { width: "min-w-[90px] w-auto" }, // STAMP #
            { width: "min-w-[110px] w-auto" }, // TICK
            { width: "min-w-[110px] w-auto" }, // ADDRESS
            { width: "min-w-[90px] w-auto" }, // OP
            { width: "min-w-[100px] w-auto" }, // AMOUNT
            { width: "min-w-[120px] w-auto" }, // DEST/LIMIT
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
                  } py-1.5 !px-5 ${rowClass} text-color-neutral-500`}
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
                  <p class="text-center text-color-neutral-500 text-xs">
                    NO TOKENS TO DISPLAY
                  </p>
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
