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
        class={`flex items-center ${container3} !rounded-full p-1 gap-2`}
      >
        {/* Image — 24px rounded */}
        <div class="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
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
        <div
          class={`${cardCreator} min-[420px]:before:content-['$'] before:text-color-neutral-500`}
        >
          {tick}
        </div>
      </div>

      {/* Stamp number */}
      <div class="mt-2.5 flex justify-center gap-3">
        {src20.stamp != null && (
          <div class={`${cardStampNumber}`}>
            <span class="font-light">#</span>
            {src20.stamp.toLocaleString()}
          </div>
        )}
      </div>

      {/* Operation type pill — centered */}
      <div class="mt-3 flex justify-center">
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
      <div class="hidden min-[420px]:flex flex-1 min-h-3" />
      <div
        class={`hidden min-[420px]:flex flex-col items-center justify-center px-3 py-2.5 gap-0.5 ${container3}`}
      >
        <div class={cardFileType}>
          {src20.creator_name ?? abbreviateAddress(src20.creator, 5)}
        </div>
        <Icon
          type="icon"
          name="caretDown"
          weight="bold"
          size="sm"
          color="grey"
        />
        <div class={cardFileSize}>
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

      {/* Limit per mint */}
      {src20.lim && (
        <div class={`mt-3 w-fit mx-auto ${containerPill} ${cardFileSize}`}>
          {formatAmount(src20.lim)}
        </div>
      )}

      {/* Creator */}
      <div class="hidden min-[420px]:flex flex-1 min-h-3" />
      <div
        class={`hidden min-[420px]:flex flex-col items-center justify-center px-3 py-2.5 ${container3}`}
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

        {/* Max supply */}
        {(src20.max || src20.mint_progress?.max_supply) && (
          <div
            class={`hidden min-[820px]:flex min-[1024px]:hidden min-[1048px]:flex mt-3 w-fit mx-auto ${containerPill} ${cardFileSize}`}
          >
            {formatAmount(src20.max ?? src20.mint_progress?.max_supply)}
          </div>
        )}

        {/* Limit per mint */}
        {src20.lim && (
          <div
            class={`mt-3 w-fit mx-auto ${containerPill} ${cardPrice}`}
          >
            {formatAmount(src20.lim)}
          </div>
        )}

        {/* Recipient (destination) */}
        <div class="hidden min-[420px]:flex flex-1 min-h-3" />
        <div
          class={`hidden min-[420px]:flex flex-col items-center justify-center px-3 py-2.5 gap-3 ${container3}`}
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
        {/* ticker row */}
        <div class={`flex items-center ${container2} rounded-full !p-5 gap-2`}>
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
          <div
            class={`${cardCreator} min-[420px]:before:content-['$'] before:text-color-neutral-500`}
          >
            {tick}
          </div>
        </div>

        {/* spacer 1 */}
        <div class="flex-[0_1_10px]" />

        {/* stamp number */}
        {src20.stamp != null && (
          <div class="flex justify-center">
            <div class={cardStampNumber}>
              <span class="font-light">#</span>
              {src20.stamp.toLocaleString()}
            </div>
          </div>
        )}

        {/* spacer 2 */}
        <div class="flex-[0_1_12px]" />

        {/* op pill */}
        <div class="flex justify-center">
          <div class={`${containerPill} ${cardSupply}`}>
            {op}
          </div>
        </div>

        {/* spacer 3 */}
        <div class="hidden min-[420px]:flex flex-[0_1_12px]" />

        {/* amount */}
        <div class="hidden min-[420px]:flex justify-center">
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
