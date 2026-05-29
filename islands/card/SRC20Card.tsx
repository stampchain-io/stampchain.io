/* ===== SRC20 TRANSACTION CARD COMPONENT ===== */
import { Icon, PlaceholderImage } from "$icon";
import {
  container2,
  container2Hover,
  container3,
  containerPill,
  shadowGlowPurple,
  transitionColors,
} from "$layout";
import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";
import { getSRC20ImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import {
  cardCreator,
  cardFileSize,
  cardFileType,
  cardPrice,
  cardStampNumber,
  cardSupply,
} from "$text";
import type { SRC20Row } from "$types/src20.d.ts";
import { useState } from "preact/hooks";

/* ===== TYPES ===== */
interface SRC20CardProps {
  src20: SRC20Row;
  variant?: "detail" | "minimal";
}

/* ===== HELPERS ===== */
function formatAmount(amt: string | bigint | undefined): string {
  if (amt === undefined || amt === null) return "—";
  const n = Number(amt);
  if (isNaN(n)) return String(amt);
  return n.toLocaleString();
}

/* ===== COMPONENT ===== */
export function SRC20Card({ src20, variant = "detail" }: SRC20CardProps) {
  const [imgError, setImgError] = useState(false);

  const tick = unicodeEscapeToEmoji(src20.tick ?? "");
  const op = (src20.op ?? "").toUpperCase() as "DEPLOY" | "MINT" | "TRANSFER";
  const imageUrl = imgError ? null : getSRC20ImageSrc(src20) ?? null;

  const href = `/src20/${encodeURIComponent(tick)}`;

  /* ===== SHARED TOP ROW: image + ticker ===== */
  const renderTopRow = () => (
    <>
      <div
        class={`${container2} rounded-full px-1.5 py-0.5 flex items-center gap-3`}
      >
        {/* Image — 24px rounded */}
        <div class="flex-shrink-0 w-6 h-6 rounded-full overflow-hidden">
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

        {/* Ticker */}

        <div class={`${cardCreator} !pt-0 truncate`}>
          {tick}
        </div>
      </div>

      {/* Stamp number */}
      <div class="flex justify-center gap-3">
        {src20.stamp != null && (
          <div class={`${cardStampNumber} mt-3`}>
            <span class="font-light">#</span>
            {src20.stamp.toLocaleString()}
          </div>
        )}
      </div>

      {/* Operation type pill — centered */}
      <div class="flex justify-center mt-3">
        <div class={`${containerPill} ${cardSupply}`}>
          {op}
        </div>
      </div>
    </>
  );

  /* ===== TRANSFER LAYOUT ===== */
  const renderTransfer = () => (
    <>
      {renderTopRow()}

      {/* Amount */}
      <div class={`mt-3 w-fit mx-auto ${containerPill} ${cardPrice}`}>
        {formatAmount(src20.amt)}
      </div>

      {/* From → To */}
      <div class="flex-1 min-h-6" />
      <div
        class={`flex flex-col items-center justify-center px-3 py-2.5 gap-0.5 ${container3}`}
      >
        <div class={cardFileSize}>
          {src20.creator_name ?? abbreviateAddress(src20.creator, 5)}
        </div>
        <Icon
          type="icon"
          name="caretDown"
          weight="bold"
          size="sm"
          color="grey"
        />
        <div class={cardFileType}>
          {src20.destination_name ??
            (src20.destination ? abbreviateAddress(src20.destination, 5) : "—")}
        </div>
      </div>
    </>
  );

  /* ===== DEPLOY LAYOUT ===== */
  const renderDeploy = () => (
    <>
      {renderTopRow()}

      {/* Max supply */}
      <div
        class={`mt-3 w-fit mx-auto ${containerPill} ${cardPrice}`}
      >
        {src20.max ? formatAmount(src20.max) : "—"}
      </div>

      {/* Creator */}
      <div class="flex-1 min-h-6" />
      <div
        class={`flex flex-col items-center justify-center px-3 py-2.5 ${container3}`}
      >
        <div class={cardFileType}>
          {src20.creator_name ?? abbreviateAddress(src20.creator, 5)}
        </div>
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
        {renderTopRow()}

        {/* Minted amount */}
        <div
          class={`mt-3 w-fit mx-auto ${containerPill} ${cardPrice}`}
        >
          {formatAmount(src20.amt)}
        </div>

        {/* Recipient (destination) */}
        <div class="flex-1 min-h-6" />
        <div
          class={`flex flex-col items-center justify-center px-3 py-2.5 gap-3 ${container3}`}
        >
          <div class={cardFileType}>
            {src20.destination_name ??
              (src20.destination
                ? abbreviateAddress(src20.destination, 5)
                : src20.creator_name ?? abbreviateAddress(src20.creator, 5))}
          </div>

          {/* Mint progress */}
          {progress !== null && (
            <div class="w-full">
              <div class="w-full h-1 rounded-full bg-color-neutral-800 overflow-hidden">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-color-primary-500 via-color-primary-400 to-color-primary-300 transition-all duration-300"
                  style={{
                    width: `${Math.min(Math.round(progress), 100)}%`,
                  }}
                />
              </div>
              <div class={`${cardFileSize} mt-1 text-right`}>
                {Math.round(progress)}%
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  /* ===== MINIMAL LAYOUT (all ops) ===== */
  const renderMinimal = () => {
    const amount = op === "DEPLOY"
      ? formatAmount(src20.max)
      : formatAmount(src20.amt);

    return (
      <>
        {/* ===== TOP: image + ticker pill, stamp number ===== */}
        <div>
          <div
            class={`${container2} rounded-full px-1.5 py-0.5 flex items-center gap-3`}
          >
            <div class="flex-shrink-0 w-6 h-6 rounded-full overflow-hidden">
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
            <div class={`${cardCreator} truncate`}>
              {tick}
            </div>
          </div>

          {src20.stamp != null && (
            <div class="flex justify-center">
              <div class={`${cardStampNumber} mt-3`}>
                <span class="font-light">#</span>
                {src20.stamp.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* ===== BOTTOM: operation pill, amount ===== */}
        <div class="flex flex-col items-center gap-3">
          <div class={`${containerPill} ${cardSupply}`}>
            {op}
          </div>
          <div class={`w-fit ${containerPill} ${cardPrice}`}>
            {amount}
          </div>
        </div>
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
          p-3 w-full h-full
          ${shadowGlowPurple}
          ${container2Hover} ${transitionColors}
          ${variant === "minimal" ? "justify-between overflow-hidden" : ""}
        `}
      >
        {variant === "minimal" ? renderMinimal() : (
          <>
            {op === "TRANSFER" && renderTransfer()}
            {op === "DEPLOY" && renderDeploy()}
            {op === "MINT" && renderMint()}
            {op !== "TRANSFER" && op !== "DEPLOY" && op !== "MINT" && (
              renderDeploy()
            )}
          </>
        )}
      </a>
    </div>
  );
}
