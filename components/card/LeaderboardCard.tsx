/* ===== LEADERBOARD CARD ===== */
import { PillWithTooltip } from "$components/card/PillWithTooltip.tsx";
import { Icon, UserProfileIcon } from "$icon";
import { container2Hover, containerPill, shadowGlowPurple } from "$layout";
import {
  abbreviateAddress,
  formatBTC,
  formatNumberWithCommas,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { cardPrice, cardSupply, text } from "$text";
import type {
  LeaderboardEntry,
  LeaderboardMetric,
} from "$types/leaderboard.d.ts";

// Columns: base 4, 420px 6, mobileMd 7, mobileLg 8, 880px 9,
// tablet 14, desktop 16. Below tablet the card is the same width as a
// collection card, so the column counts stay the same. From tablet up
// the card is full width and the counts double.
const GALLERY_IMAGE_VISIBILITY = [
  "",
  "",
  "",
  "",
  "hidden min-[420px]:block",
  "hidden min-[420px]:block",
  "hidden mobileMd:block",
  "hidden mobileLg:block",
  "hidden min-[880px]:block",
  "hidden tablet:block",
  "hidden tablet:block",
  "hidden tablet:block",
  "hidden tablet:block",
  "hidden tablet:block",
  "hidden desktop:block",
  "hidden desktop:block",
];

export function LeaderboardCard(
  { entry, metric, showValuation }: {
    entry: LeaderboardEntry;
    metric: LeaderboardMetric;
    showValuation: boolean;
  },
) {
  const stampPill = (
    <PillWithTooltip
      label="STAMPS"
      className={`${containerPill} ${cardSupply}`}
    >
      {formatNumberWithCommas(entry.stampCount)}
    </PillWithTooltip>
  );
  const valuePill = showValuation
    ? (
      <PillWithTooltip
        label="FLOOR VALUE"
        className={`${containerPill} ${cardPrice}`}
      >
        {formatBTC(entry.floorValueBtc, { includeSymbol: true })}
      </PillWithTooltip>
    )
    : null;
  const pills = metric === "valuation"
    ? (
      <>
        {valuePill}
        {stampPill}
      </>
    )
    : (
      <>
        {stampPill}
        {valuePill}
      </>
    );

  return (
    <a
      href={`/wallet/${entry.address}`}
      class={`${container2Hover} ${shadowGlowPurple} flex flex-col p-3`}
    >
      <div class="flex w-full items-start justify-between gap-5">
        <div class="flex items-center -mt-1 gap-1.5">
          <Icon
            type="icon"
            name="trophy"
            weight="custom"
            size="lg"
            color="neutral400"
            className="[stroke-width:2] shrink-0"
          />
          <h6 class="font-normal text-xl text-neutral-400">{entry.rank}</h6>
        </div>
        <div class="flex flex-wrap justify-end gap-2 shrink-0">{pills}</div>
      </div>
      <div class="flex w-full -mt-0.5">
        <UserProfileIcon className="w-4 h-4 stroke-[2] stroke-color-neutral-200 shrink-0">
          <h6 class={`${text} block min-w-0`}>
            {entry.creatorName || (
              <>
                <span class="mobileMd:hidden">
                  {abbreviateAddress(entry.address, 8)}
                </span>
                <span class="hidden mobileMd:inline">
                  {entry.address}
                </span>
              </>
            )}
          </h6>
        </UserProfileIcon>
      </div>

      {entry.images.length > 0 && (
        <div class="mt-3 grid grid-cols-4 min-[420px]:grid-cols-6 mobileMd:grid-cols-7 mobileLg:grid-cols-8 min-[880px]:grid-cols-9 tablet:grid-cols-[repeat(14,minmax(0,1fr))] desktop:grid-cols-[repeat(16,minmax(0,1fr))] gap-5">
          {entry.images.slice(0, 16).map((url, index) => (
            <div
              class={`w-full rounded-xl aspect-stamp overflow-hidden ${
                GALLERY_IMAGE_VISIBILITY[index] ?? ""
              }`}
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                class="w-full h-full object-contain pixelart"
              />
            </div>
          ))}
        </div>
      )}
    </a>
  );
}
