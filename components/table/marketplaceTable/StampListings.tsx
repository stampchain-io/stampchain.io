/* ===== MARKETPLACE LISTINGS TABLE COMPONENT ===== */
import { Button } from "$button";
import { ActivityLevelIndicator } from "$components/indicators/ActivityLevelIndicator.tsx";
import { colGroup } from "$components/layout/types.ts";
import { PlaceholderImage } from "$icon";
import StampTextContent from "$islands/content/stampDetailContent/StampTextContent.tsx";
import BuyStampModal from "$islands/modal/BuyStampModal.tsx";
import { openModal } from "$islands/modal/states.ts";
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
  getFreshDispenserForPurchase,
  useLowestPriceDispenser,
} from "$lib/hooks/useLowestPriceDispenser.ts";
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
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { cardRowStampNumber, labelXxs, textXs } from "$text";
import type { StampRow } from "$types/stamp.d.ts";
import { useRef, useState } from "preact/hooks";

/* ===== CONSTANTS ===== */
const HEADERS = [
  "IMAGE",
  "STAMP #",
  "CPID",
  "ARTIST",
  "LISTED",
  "PRICE",
  "ACTIVITY",
  "DISPENSER",
  "SELLER",
  "BUY",
];

/* ===== ROW COMPONENT ===== */
interface StampListingsRowProps {
  stamp: StampRow;
}

export function StampListingsRow({ stamp }: StampListingsRowProps) {
  const imgSrc = getStampImageSrc(stamp);
  const href = `/stamp/${stamp.tx_hash}`;
  const rowRef = useRef<HTMLTableRowElement>(null);
  // Lazily resolves the live open dispenser once this row scrolls into
  // view (per stampchain.io#1209 / btc_stamps#939 — see the hook for why
  // this can't be a bulk server-side fetch). `dispenser` is a DispenserRow,
  // so its fields (source, origin, give_remaining, tx_hash, ...) can be
  // read directly and passed straight to BuyStampModal.
  const { dispenser, isLoading: isDispenserLoading } = useLowestPriceDispenser(
    stamp,
    rowRef,
  );
  const [fee, setFee] = useState<number>(0);
  // getStampImageSrc points HTML (and some other) mimetypes at a content
  // URL that can't render inside an <img> — track load failure so we swap
  // to the placeholder icon instead of leaving a broken-image icon.
  const [imageFailed, setImageFailed] = useState(false);
  // Tracks the BUY-click purchase flow (distinct from isDispenserLoading,
  // the passive display fetch above) — see handleBuyClick below.
  const [isPurchasing, setIsPurchasing] = useState(false);

  const creatorDisplay = stamp.creator_name
    ? stamp.creator_name
    : abbreviateAddress(stamp.creator, 5);

  const floorPrice = (stamp as unknown as {
    marketData?: { floorPriceBTC: number | null };
  }).marketData?.floorPriceBTC;

  const priceDisplay = floorPrice != null
    ? formatBTCAmount(floorPrice, { includeSymbol: true, decimals: 8 })
    : null;

  const listedDisplay = dispenser?.give_remaining != null
    ? `${dispenser.give_remaining.toLocaleString()}/${
      formatSupply(stamp.supply ?? 0, stamp.divisible)
    }`
    : formatSupply(stamp.supply ?? 0, stamp.divisible);

  // Opens the Buy modal instead of navigating to the stamp detail page.
  // BuyStampModal handles the "wallet not connected" flow internally
  // (opens Connect Wallet, then re-opens this modal once connected).
  // Because BUY constructs a real spend transaction, this re-checks for a
  // fresher dispenser (getFreshDispenserForPurchase treats a cache hit
  // older than ~12s as stale) rather than blindly trusting whatever the
  // passive display hook above already resolved — falling back to the
  // button's default link navigation only if the stamp truly has no open
  // dispenser left (e.g. it sold out after the page loaded).
  const handleBuyClick = async (e: MouseEvent) => {
    if (isPurchasing || !stamp.cpid) return;
    e.preventDefault();
    e.stopPropagation();
    setIsPurchasing(true);
    try {
      const liveDispenser = await getFreshDispenserForPurchase(stamp);
      if (!liveDispenser) {
        showToast("This stamp is no longer listed for sale.", "info");
        return;
      }
      openModal(
        <BuyStampModal
          stamp={stamp}
          fee={fee}
          handleChangeFee={setFee}
          dispenser={liveDispenser}
        />,
        "slideUpDown",
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  /* ===== RENDER ===== */
  return (
    <tr
      ref={rowRef}
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
                <span class="font-light">#</span>
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

      {/* LISTED */}
      <td
        class={`${cellCenterL2Card} text-color-primary-400`}
      >
        {listedDisplay}
      </td>

      {/* PRICE */}
      <td
        class={`${cellCenterL2Card} text-color-secondary-400`}
      >
        {priceDisplay ?? <span class="text-color-neutral-500">N/A</span>}
      </td>

      {/* ACTIVITY */}
      <td
        class={`${cellCenterL2Card}`}
      >
        {stamp.activity_level
          ? (
            <ActivityLevelIndicator
              level={stamp.activity_level}
              className="mx-auto"
            />
          )
          : <span class="text-color-neutral-500">N/A</span>}
      </td>

      {/* DISPENSER ADDY */}
      <td
        class={`${cellCenterL2Card} text-color-neutral-200`}
      >
        {dispenser?.source
          ? (
            <a
              href={`/wallet/${dispenser.source}`}
              class="link-neutral-200"
            >
              {abbreviateAddress(dispenser.source, 5)}
            </a>
          )
          : isDispenserLoading
          ? <span class="text-color-neutral-500">···</span>
          : <span class="text-color-neutral-500">N/A</span>}
      </td>

      {/* SELLER ADDY */}
      <td
        class={`${cellCenterL2Card} text-color-neutral-200`}
      >
        {(dispenser?.origin ?? dispenser?.source)
          ? (
            <a
              href={`/wallet/${dispenser!.origin ?? dispenser!.source}`}
              class="link-neutral-200"
            >
              {abbreviateAddress(
                (dispenser!.origin ?? dispenser!.source)!,
                5,
              )}
            </a>
          )
          : isDispenserLoading
          ? <span class="text-color-neutral-500">···</span>
          : <span class="text-color-neutral-500">N/A</span>}
      </td>

      {/* BUY */}
      <td
        class={`${cellRightL2Card}`}
      >
        <Button
          variant="flat"
          color="primary"
          size="xs"
          href={href}
          target="_top"
          class={`rounded-xl ${isPurchasing ? "!opacity-60 !cursor-wait" : ""}`}
          onClick={handleBuyClick}
        >
          {isPurchasing ? "..." : "BUY"}
        </Button>
      </td>
    </tr>
  );
}

/* ===== TABLE WRAPPER ===== */
interface StampListingsTableProps {
  stamps: StampRow[];
}

export function StampListingsTable({ stamps }: StampListingsTableProps) {
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
            { width: "min-w-[70px] w-auto" }, // LISTED
            { width: "min-w-[110px] w-auto" }, // PRICE
            { width: "min-w-[60px] w-auto" }, // ACTIVITY
            { width: "min-w-[110px] w-auto" }, // DISPENSER ADDY
            { width: "min-w-[110px] w-auto" }, // SELLER ADDY
            { width: "min-w-[50px] w-auto" }, // BUY
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
            ? stamps.map((stamp) => (
              <StampListingsRow
                key={stamp.tx_hash}
                stamp={stamp}
              />
            ))
            : (
              <tr>
                <td colSpan={HEADERS.length}>
                  <EmptyState label="NO LISTINGS TO DISPLAY" icon="artStamps" />
                </td>
              </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
