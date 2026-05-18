/* ===== SRC20 TRANSACTION CARD COMPONENT ===== */
import { Icon, PlaceholderImage } from "$icon";
import {
  container2Hover,
  containerPill,
  shadowGlowPurple,
  transitionColors,
} from "$layout";
import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";
import { getSRC20ImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import { cardFileSize, cardPrice, cardStampNumber, cardSupply } from "$text";
import type { SRC20Row } from "$types/src20.d.ts";
import { useState } from "preact/hooks";

/* ===== TYPES ===== */
interface SRC20CardProps {
  src20: SRC20Row;
}

/* ===== HELPERS ===== */
function formatAmount(amt: string | bigint | undefined): string {
  if (amt === undefined || amt === null) return "—";
  const n = Number(amt);
  if (isNaN(n)) return String(amt);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString();
}

/* ===== COMPONENT ===== */
export function SRC20Card({ src20 }: SRC20CardProps) {
  const [imgError, setImgError] = useState(false);

  const tick = unicodeEscapeToEmoji(src20.tick ?? "");
  const op = (src20.op ?? "").toUpperCase() as "DEPLOY" | "MINT" | "TRANSFER";
  const imageUrl = imgError ? null : getSRC20ImageSrc(src20) ?? null;

  const href = `/src20/${encodeURIComponent(tick)}`;

  /* ===== SHARED TOP ROW: image + ticker + supply ===== */
  const renderTopRow = (supplyLabel: string) => (
    <div class="flex items-center gap-3">
      {/* Image — 48px rounded */}
      <div class="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
        {imageUrl
          ? (
            <img
              src={imageUrl}
              alt={tick}
              class="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          )
          : <PlaceholderImage variant="no-image" />}
      </div>

      {/* Ticker + supply */}
      <div class="flex flex-col min-w-0 flex-1">
        <div
          class={`${cardStampNumber} truncate`}
        >
          {tick}
        </div>
        <div class={`${containerPill} ${cardSupply} mt-1 w-fit`}>
          {supplyLabel}
        </div>
      </div>
    </div>
  );

  /* ===== TRANSFER LAYOUT ===== */
  const renderTransfer = () => (
    <>
      {renderTopRow(
        src20.max ? `${formatAmount(src20.max)} MAX` : "—",
      )}

      {/* Amount */}
      <div class={`${containerPill} ${cardPrice} mt-3 w-fit`}>
        {formatAmount(src20.amt)}
      </div>

      {/* From → To */}
      <div class="flex flex-col mt-3 gap-0.5">
        <div class={cardFileSize}>
          {src20.creator_name ?? abbreviateAddress(src20.creator, 5)}
        </div>
        <Icon
          type="icon"
          name="caretDown"
          weight="normal"
          size="xxs"
          color="grey"
        />
        <div class={cardPrice}>
          {src20.destination_name ??
            (src20.destination ? abbreviateAddress(src20.destination, 5) : "—")}
        </div>
      </div>
    </>
  );

  /* ===== DEPLOY LAYOUT ===== */
  const renderDeploy = () => (
    <>
      {renderTopRow(
        src20.max ? `${formatAmount(src20.max)} MAX` : "—",
      )}

      {/* Mint limit */}
      <div class={`${containerPill} ${cardPrice} mt-3 w-fit`}>
        {src20.lim ? `${formatAmount(src20.lim)} LIM` : "—"}
      </div>

      {/* Creator */}
      <div class={`${cardFileSize} mt-3`}>
        {src20.creator_name ?? abbreviateAddress(src20.creator, 5)}
      </div>
    </>
  );

  /* ===== MINT LAYOUT ===== */
  const renderMint = () => {
    const progress = src20.progress
      ? parseFloat(String(src20.progress))
      : src20.mint_progress
      ? parseFloat(src20.mint_progress.progress)
      : null;

    return (
      <>
        {renderTopRow(
          src20.max ? `${formatAmount(src20.max)} MAX` : "—",
        )}

        {/* Minted amount */}
        <div class={`${containerPill} ${cardPrice} mt-3 w-fit`}>
          {formatAmount(src20.amt)}
        </div>

        {/* Recipient (destination) */}
        <div class={`${cardFileSize} mt-3`}>
          {src20.destination_name ??
            (src20.destination
              ? abbreviateAddress(src20.destination, 5)
              : src20.creator_name ?? abbreviateAddress(src20.creator, 5))}
        </div>

        {/* Mint progress */}
        {progress !== null && (
          <div class="mt-3 w-full">
            <div class="w-full h-1 rounded-full bg-color-neutral-800 overflow-hidden">
              <div
                class="h-full rounded-full bg-gradient-to-r from-color-primary-500 to-color-primary-400 transition-all duration-300"
                style={{ width: `${Math.min(progress, 100).toFixed(1)}%` }}
              />
            </div>
            <div class={`${cardFileSize} mt-0.5 text-right`}>
              {progress.toFixed(1)}%
            </div>
          </div>
        )}
      </>
    );
  };

  /* ===== RENDER ===== */
  return (
    <div class="relative flex justify-center w-full h-full max-w-72">
      <a
        href={href}
        target="_top"
        f-partial={href}
        class={`
          group relative z-0 flex flex-col
          p-stamp-card mobileLg:p-3
          w-full h-full
          hover:border-color-hover ${shadowGlowPurple}
          ${container2Hover} ${transitionColors}
        `}
      >
        {op === "TRANSFER" && renderTransfer()}
        {op === "DEPLOY" && renderDeploy()}
        {op === "MINT" && renderMint()}
        {op !== "TRANSFER" && op !== "DEPLOY" && op !== "MINT" && (
          /* Fallback for unknown op types */
          renderDeploy()
        )}
      </a>
    </div>
  );
}
