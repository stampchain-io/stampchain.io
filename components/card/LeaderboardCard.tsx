/* ===== LEADERBOARD CARD ===== */
import { PillWithTooltip } from "$components/card/PillWithTooltip.tsx";
import { Icon, UserProfileIcon } from "$icon";
import { container2Hover, containerPill, shadowGlowPurple } from "$layout";
import {
  abbreviateAddress,
  formatBTC,
  formatNumberWithCommas,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { cardCreator, cardPrice, cardSupply } from "$text";
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
  const name = entry.creatorName || abbreviateAddress(entry.address, 6);
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
      class={`${container2Hover} ${shadowGlowPurple} flex flex-col gap-5 p-5`}
    >
      <div class="flex w-full items-start justify-between gap-5">
        <div class="flex flex-1 items-center gap-3 min-w-0">
          <Icon
            type="icon"
            name="trophy"
            weight="bold"
            size="xl"
            color="custom"
            className="stroke-color-primary-400 shrink-0"
          />
          <span class={`${cardSupply} text-base`}>{entry.rank}</span>
          <UserProfileIcon wrapperClassName="min-w-0">
            <span class={`${cardCreator} block min-w-0 truncate !text-left`}>
              {name}
            </span>
          </UserProfileIcon>
        </div>
        <div class="flex flex-wrap justify-end gap-2 shrink-0">{pills}</div>
      </div>
      {entry.images.length > 0 && (
        <div class="grid grid-cols-4 min-[420px]:grid-cols-6 mobileMd:grid-cols-7 mobileLg:grid-cols-8 min-[880px]:grid-cols-9 tablet:grid-cols-[repeat(14,minmax(0,1fr))] desktop:grid-cols-[repeat(16,minmax(0,1fr))] gap-5">
          {entry.images.slice(0, 16).map((url, index) => (
            <div
              class={`w-full rounded-xl aspect-stamp image-rendering-pixelated overflow-hidden ${
                GALLERY_IMAGE_VISIBILITY[index] ?? ""
              }`}
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                class="w-full h-full object-contain"
              />
            </div>
          ))}
        </div>
      )}
    </a>
  );
}
