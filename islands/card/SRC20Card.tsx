/* ===== SRC20 TRANSACTION CARD COMPONENT ===== */
import { PlaceholderImage, UserProfileIcon } from "$icon";
import { container3, containerCard, containerPill } from "$layout";
import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";
import { getSRC20ImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import { tooltipButton } from "$notification";
import {
  cardCreator,
  cardEyebrowNeutral,
  cardFileSize,
  cardFileType,
  cardPrice,
  cardStampNumber,
  cardSupply,
  truncate,
  valueNegative,
  valueNeutral,
  valuePositive,
} from "$text";
import type { SRC20Row } from "$types/src20.d.ts";
import { ComponentChildren } from "preact";
import { useState } from "preact/hooks";

/* ===== TYPES ===== */
interface SRC20CardProps {
  src20: SRC20Row;
  variant?:
    | "cardVerticalDetail"
    | "cardVerticalBalance"
    | "cardSquare"
    | "cardSquareBalance"
    | "cardHorizontal";
}

/* ===== PILL WITH TOOLTIP (instant on hover, no delay/timeout) ===== */
// `wrapperClassName` carries layout/spacing utilities (margins, w-fit,
// mx-auto, flex, etc.) that must live on the *outer* element — putting them
// on the inner pill instead desyncs the tooltip from the pill whenever this
// wrapper ends up as a direct flex item (e.g. inside containerCard's
// `flex flex-col`), since flex items establish their own block formatting
// context and stop the inner margin from collapsing into the wrapper.
function PillWithTooltip(
  { label, className, wrapperClassName, children }: {
    label: string;
    className: string;
    wrapperClassName?: string;
    children: ComponentChildren;
  },
) {
  return (
    <div class={`relative group/pill ${wrapperClassName ?? ""}`}>
      <div class={className}>{children}</div>
      <div
        class={`${tooltipButton} opacity-0 group-hover/pill:opacity-100 transition-opacity duration-150`}
      >
        {label}
      </div>
    </div>
  );
}

/* ===== HELPERS ===== */
function formatAmount(amt: string | bigint | undefined): string {
  if (amt === undefined || amt === null) return "—";
  const n = Number(amt);
  if (isNaN(n)) return String(amt);
  return n.toLocaleString();
}

// Mirrors the SATS formatting used by SRC20OverviewCompact's PRICE column —
// keeps unit-price display consistent across the table and card views.
function formatPriceSats(priceBtc: number): string {
  if (!priceBtc) return "0 SATS";
  const sats = priceBtc * 1e8;
  if (sats < 0.0001) return `${sats.toFixed(6)} SATS`;
  if (sats < 1) return `${sats.toFixed(4)} SATS`;
  if (sats < 10) return `${sats.toFixed(2)} SATS`;
  if (sats < 100) return `${sats.toFixed(1)} SATS`;
  return `${Math.round(sats).toLocaleString()} SATS`;
}

// Mirrors the BTC formatting used by SRC20OverviewCompact's MARKETCAP
// column — reused here for the holding's total BTC value (balance * price).
function formatValueBtc(valueBtc: number): string {
  if (!valueBtc) return "0 BTC";
  if (valueBtc < 1) return `${valueBtc.toFixed(4)} BTC`;
  if (valueBtc < 1000) return `${valueBtc.toFixed(2)} BTC`;
  return `${Math.round(valueBtc).toLocaleString()} BTC`;
}

/* ===== COMPONENT ===== */
export function SRC20Card(
  { src20, variant = "cardVerticalDetail" }: SRC20CardProps,
) {
  const [imgError, setImgError] = useState(false);

  const tick = unicodeEscapeToEmoji(src20.tick ?? "");
  const op = (src20.op ?? "").toUpperCase() as "DEPLOY" | "MINT" | "TRANSFER";
  const imageUrl = imgError
    ? null
    : (src20.deploy_img || getSRC20ImageSrc(src20) || null);

  const href = `/src20/${encodeURIComponent(tick)}`;

  // Unit price in BTC — market_data.price_btc (v2.3) is preferred, falling
  // back to the legacy floor_price_btc field.
  const priceBtc = src20.market_data?.price_btc != null
    ? parseFloat(String(src20.market_data.price_btc))
    : src20.floor_price_btc ?? 0;
  const balanceAmt = src20.amt !== undefined ? Number(src20.amt) : NaN;
  const valueBtc = !isNaN(balanceAmt) && priceBtc ? balanceAmt * priceBtc : 0;

  // 24H price change percentage — same source field as SRC20OverviewCompact's
  // CHANGE column.
  const change24h = src20.market_data?.change_24h_percent != null
    ? Number(src20.market_data.change_24h_percent)
    : null;

  /* ===== HORIZONTAL LAYOUT (row card: image · ticker · balance · price · value) ===== */
  const renderHorizontal = () => (
    <div
      class={`flex items-center justify-between ${container3} p-0.5 pr-2 w-full`}
    >
      {/* Image + Ticker */}
      <div class="flex items-center gap-2 min-w-0">
        <div class="flex-shrink-0 h-6 w-6 rounded-full overflow-hidden">
          {imageUrl
            ? (
              <img
                src={imageUrl}
                alt={tick}
                class="w-full h-full object-cover rounded-full"
                onError={() => setImgError(true)}
              />
            )
            : <PlaceholderImage variant="no-image" className="!rounded-full" />}
        </div>
        <div class={`${cardCreator} !text-left uppercase ${truncate}`}>
          <span class="font-light pr-0.5">$</span>
          {tick}
        </div>
      </div>

      {/* Price */}
      <div
        class={`hidden min-[420px]:flex ${cardFileType} text-right shrink-0`}
      >
        {formatPriceSats(priceBtc)}
      </div>

      {/* Change (24H) */}
      <div
        class={`hidden mobileMd:flex tablet:hidden ${cardFileType} text-right shrink-0 ${
          change24h == null
            ? valueNeutral
            : change24h > 0
            ? valuePositive
            : change24h < 0
            ? valueNegative
            : valueNeutral
        }`}
      >
        {change24h == null
          ? "N/A"
          : `${change24h > 0 ? "+" : ""}${change24h.toFixed(2)}%`}
      </div>

      {/* Balance */}
      <div class={`${cardSupply} text-right shrink-0`}>
        {formatAmount(src20.amt)}
      </div>

      {/* Value */}
      <div class={`hidden mobileMd:flex ${cardPrice} text-right shrink-0`}>
        {formatValueBtc(valueBtc)}
      </div>
    </div>
  );

  /* ===== SHARED TOP ROW: image + ticker ===== */
  const renderTopRow = () => (
    <>
      <div
        class={`flex items-center ${container3} p-0.5 gap-2`}
      >
        {/* Image */}
        <div class="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden">
          {imageUrl
            ? (
              <img
                src={imageUrl}
                alt={tick}
                class="w-full h-full object-cover rounded-lg"
                onError={() => setImgError(true)}
              />
            )
            : <PlaceholderImage variant="no-image" className="!rounded-lg" />}
        </div>

        {/* Ticker */}
        <div
          class={`${cardCreator} !font-bold uppercase`}
        >
          <span class="hidden min-[420px]:inline-block font-light pr-0.5">
            $
          </span>
          {tick}
        </div>
      </div>

      {/* Stamp number */}
      <div class="mt-2 flex justify-center gap-3">
        {src20.stamp != null && (
          <div class={`${cardStampNumber}`}>
            <span class="font-light">#</span>
            {src20.stamp.toLocaleString()}
          </div>
        )}
      </div>

      {/* Operation type pill — centered */}
      <div class="mt-2 flex justify-center">
        <PillWithTooltip
          label="OPERATION"
          className={`${containerPill} ${cardFileType}`}
        >
          {op}
        </PillWithTooltip>
      </div>
    </>
  );

  /* ===== TRANSFER LAYOUT ===== */
  const renderTransfer = () => (
    <>
      {renderTopRow()}

      {/* Amount */}
      <PillWithTooltip
        label="AMOUNT"
        wrapperClassName="mt-2 w-fit mx-auto"
        className={`${containerPill} ${cardSupply}`}
      >
        {formatAmount(src20.amt)}
      </PillWithTooltip>

      {/* Max supply */}
      {(src20.max || src20.mint_progress?.max_supply) && (
        <PillWithTooltip
          label="SUPPLY"
          wrapperClassName="mt-2 w-fit mx-auto"
          className={`${containerPill} ${cardFileSize}`}
        >
          {formatAmount(src20.max ?? src20.mint_progress?.max_supply)}
        </PillWithTooltip>
      )}

      {/* From → To */}
      <div class="flex flex-1 min-h-2" />
      <div
        class={`flex flex-col items-center justify-center px-3 py-2 gap-1 ${container3} cursor-pointer`}
      >
        <UserProfileIcon>
          <span class={cardFileType}>
            {src20.creator_name ?? abbreviateAddress(src20.creator, 5)}
          </span>
        </UserProfileIcon>
        <div
          class={`hidden min-[420px]:flex ${cardEyebrowNeutral} py-0`}
        >
          TO
        </div>
        <UserProfileIcon
          className="w-[14px] h-[14px] stroke-[2] stroke-color-neutral-400 shrink-0"
          wrapperClassName="hidden min-[420px]:flex"
        >
          <span class={cardFileSize}>
            {src20.destination_name ??
              (src20.destination
                ? abbreviateAddress(src20.destination, 5)
                : "—")}
          </span>
        </UserProfileIcon>
      </div>
    </>
  );

  /* ===== DEPLOY LAYOUT ===== */
  const renderDeploy = () => (
    <>
      {renderTopRow()}

      {/* Max supply */}
      <PillWithTooltip
        label="SUPPLY"
        wrapperClassName="mt-2 w-fit mx-auto"
        className={`${containerPill} ${cardSupply}`}
      >
        {src20.max ? formatAmount(src20.max) : "—"}
      </PillWithTooltip>

      {/* Limit per mint */}
      {src20.lim && (
        <PillWithTooltip
          label="LIMIT PER MINT"
          wrapperClassName="mt-2 w-fit mx-auto"
          className={`${containerPill} ${cardFileSize}`}
        >
          {formatAmount(src20.lim)}
        </PillWithTooltip>
      )}

      {/* Creator */}
      <div class="flex flex-1 min-h-2" />
      <div
        class={`flex flex-col items-center justify-center px-3 py-2 ${container3} cursor-pointer`}
      >
        <UserProfileIcon>
          <span class={cardFileType}>
            {src20.creator_name ?? abbreviateAddress(src20.creator, 5)}
          </span>
        </UserProfileIcon>
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

        {/* Amount minted */}
        {src20.amt !== undefined && (
          <PillWithTooltip
            label="AMOUNT"
            wrapperClassName="flex mt-2 w-fit mx-auto"
            className={`${containerPill} ${cardSupply}`}
          >
            {formatAmount(src20.amt)}
          </PillWithTooltip>
        )}

        {/* Max supply */}
        {(src20.max || src20.mint_progress?.max_supply) && (
          <PillWithTooltip
            label="SUPPLY"
            wrapperClassName="mt-2 w-fit mx-auto"
            className={`${containerPill} ${cardFileSize}`}
          >
            {formatAmount(src20.max ?? src20.mint_progress?.max_supply)}
          </PillWithTooltip>
        )}

        {/* Recipient (destination) */}
        <div class="flex flex-1 min-h-2" />
        <div
          class={`flex flex-col items-center justify-center px-3 py-2 gap-2 ${container3} cursor-pointer`}
        >
          <UserProfileIcon>
            <span class={cardFileType}>
              {src20.destination_name ??
                (src20.destination
                  ? abbreviateAddress(src20.destination, 5)
                  : src20.creator_name ?? abbreviateAddress(src20.creator, 5))}
            </span>
          </UserProfileIcon>

          {/* Mint progress */}
          {progress !== null && (
            <div class="hidden min-[420px]:flex flex-col w-full">
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

  /* ===== COMPACT LAYOUT (all ops) ===== */
  const renderMinimal = () => {
    const amount = op === "DEPLOY"
      ? formatAmount(src20.max)
      : formatAmount(src20.amt);

    return (
      <>
        {/* ===== BACKGROUND IMAGE with dark overlay gradient (top -> bottom) ===== */}
        {imageUrl && (
          <div class="absolute inset-0 z-0 overflow-hidden rounded-xl">
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
            <div class="absolute inset-0 bg-gradient-to-b from-color-neutral-950/95 via-color-neutral-900/70 to-color-neutral-1000/90" />
          </div>
        )}

        <div class="relative z-10 flex flex-col w-full h-full">
          {/* ticker row */}
          <div
            class={`flex items-center ${container3} rounded-xl p-0.5 gap-2`}
          >
            <div class="flex-shrink-0 w-6 h-6 rounded-xl overflow-hidden">
              {imageUrl
                ? (
                  <img
                    src={imageUrl}
                    alt={tick}
                    class="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                )
                : (
                  <PlaceholderImage
                    variant="no-image"
                    className="!rounded-xl"
                  />
                )}
            </div>
            <div
              class={`${cardCreator} !font-bold uppercase`}
            >
              <span class="hidden min-[420px]:inline-block font-light pr-0.5">
                $
              </span>
              {tick}
            </div>
          </div>

          {/* spacer 1 */}
          <div class="flex-[0_1_8px]" />

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
          <div class="flex-[0_1_8px]" />

          {/* op pill */}
          <div class="flex justify-center">
            <PillWithTooltip
              label="OPERATION"
              className={`${containerPill} ${cardFileType}`}
            >
              {op}
            </PillWithTooltip>
          </div>

          {/* spacer 3 */}
          <div class="flex-[0_1_8px]" />

          {/* amount */}
          <div class="flex justify-center">
            <PillWithTooltip
              label="AMOUNT"
              className={`w-fit ${containerPill} ${cardSupply}`}
            >
              {amount}
            </PillWithTooltip>
          </div>
        </div>
      </>
    );
  };

  /* ===== SQUARE WALLET LAYOUT (image+ticker, price, balance, value) ===== */
  const renderWallet = () => (
    <>
      {/* ===== BACKGROUND IMAGE with dark overlay gradient (top -> bottom) ===== */}
      {imageUrl && (
        <div class="absolute inset-0 z-0 overflow-hidden rounded-xl">
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
          <div class="absolute inset-0 bg-gradient-to-b from-color-neutral-950/95 via-color-neutral-900/70 to-color-neutral-1000/90" />
        </div>
      )}

      <div class="relative z-10 flex flex-col w-full h-full">
        {/* ticker row */}
        <div
          class={`flex items-center ${container3} rounded-xl p-0.5 gap-2`}
        >
          <div class="flex-shrink-0 w-6 h-6 rounded-xl overflow-hidden">
            {imageUrl
              ? (
                <img
                  src={imageUrl}
                  alt={tick}
                  class="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              )
              : <PlaceholderImage variant="no-image" className="!rounded-xl" />}
          </div>
          <div
            class={`${cardCreator} !font-bold uppercase`}
          >
            <span class="hidden min-[420px]:inline-block font-light pr-0.5">
              $
            </span>
            {tick}
          </div>
        </div>

        {/* spacer 1 */}
        <div class="flex-[0_1_8px]" />

        {/* price */}
        <div class="flex justify-center">
          <PillWithTooltip
            label="PRICE"
            className={`w-fit ${containerPill} ${cardPrice}`}
          >
            {formatPriceSats(priceBtc)}
          </PillWithTooltip>
        </div>

        {/* spacer 2 */}
        <div class="flex-[0_1_8px]" />

        {/* balance */}
        <div class="flex justify-center mt-auto">
          <PillWithTooltip
            label="BALANCE"
            className={`w-fit ${containerPill} ${cardSupply}`}
          >
            {formatAmount(src20.amt)}
          </PillWithTooltip>
        </div>

        {/* spacer 3 */}
        <div class="flex-[0_1_8px]" />

        {/* value */}
        <div class="flex justify-center">
          <PillWithTooltip
            label="VALUE"
            className={`w-fit ${containerPill} ${cardFileType}`}
          >
            {formatValueBtc(valueBtc)}
          </PillWithTooltip>
        </div>
      </div>
    </>
  );

  /* ===== VERTICAL WALLET LAYOUT (image+ticker, price+change, balance, holders, value) ===== */
  const renderWalletVertical = () => (
    <>
      {/* ticker row */}
      <div
        class={`flex items-center ${container3} p-0.5 gap-2`}
      >
        {/* Image */}
        <div class="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden">
          {imageUrl
            ? (
              <img
                src={imageUrl}
                alt={tick}
                class="w-full h-full object-cover rounded-lg"
                onError={() => setImgError(true)}
              />
            )
            : <PlaceholderImage variant="no-image" className="!rounded-lg" />}
        </div>

        {/* Ticker */}
        <div
          class={`${cardCreator} !font-bold uppercase`}
        >
          <span class="hidden min-[420px]:inline-block font-light pr-0.5">
            $
          </span>
          {tick}
        </div>
      </div>

      {/* spacer 1 */}
      <div class="flex-[0_1_8px]" />

      {/* price */}
      <div class="flex justify-center">
        <PillWithTooltip
          label="PRICE"
          className={`w-fit ${containerPill} ${cardPrice}`}
        >
          {formatPriceSats(priceBtc)}
        </PillWithTooltip>
      </div>

      {/* spacer 2 */}
      <div class="flex-[0_1_8px]" />

      {/* 24h change */}
      <div class="flex justify-center">
        <PillWithTooltip
          label="24H CHANGE"
          className={`w-fit ${containerPill} ${cardFileType} ${
            change24h == null
              ? valueNeutral
              : change24h > 0
              ? valuePositive
              : change24h < 0
              ? valueNegative
              : valueNeutral
          }`}
        >
          {change24h == null
            ? "N/A"
            : `${change24h > 0 ? "+" : ""}${change24h.toFixed(2)}%`}
        </PillWithTooltip>
      </div>

      {/* spacer 3 */}
      <div class="flex-[0_1_8px]" />

      {/* holders */}
      <div class="flex justify-center">
        <PillWithTooltip
          label="HOLDERS"
          className={`w-fit ${containerPill} ${cardFileSize}`}
        >
          {src20.holders != null ? src20.holders.toLocaleString() : "N/A"}
        </PillWithTooltip>
      </div>

      {/* spacer 4 */}
      <div class="flex-[0_1_20px]" />

      {/* balance */}
      <div class="flex justify-center">
        <PillWithTooltip
          label="BALANCE"
          className={`w-fit ${containerPill} ${cardSupply}`}
        >
          {formatAmount(src20.amt)}
        </PillWithTooltip>
      </div>

      {/* spacer 5 */}
      <div class="flex-[0_1_8px]" />

      {/* value */}
      <div class="flex justify-center">
        <PillWithTooltip
          label="VALUE"
          className={`w-fit ${containerPill} ${cardFileType}`}
        >
          {formatValueBtc(valueBtc)}
        </PillWithTooltip>
      </div>
    </>
  );

  /* ===== RENDER: HORIZONTAL ROW VARIANT ===== */
  if (variant === "cardHorizontal") {
    return (
      <a
        href={href}
        target="_top"
        f-partial={href}
        class="relative flex w-full"
      >
        {renderHorizontal()}
      </a>
    );
  }

  /* ===== RENDER ===== */
  return (
    <div
      class={`relative flex justify-center w-full max-w-72 ${
        variant === "cardVerticalBalance" ? "!h-fit" : "h-full"
      }`}
    >
      <a
        href={href}
        target="_top"
        f-partial={href}
        class={`${containerCard} ${
          variant === "cardVerticalDetail"
            ? "min-h-[260px]"
            : variant === "cardVerticalBalance"
            ? "!h-fit"
            : ""
        }`}
      >
        {variant === "cardSquare"
          ? renderMinimal()
          : variant === "cardSquareBalance"
          ? renderWallet()
          : variant === "cardVerticalBalance"
          ? renderWalletVertical()
          : (
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
