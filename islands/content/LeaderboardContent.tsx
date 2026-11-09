/* ===== LEADERBOARD PODIUM + GALLERY ===== */
import { Icon } from "$icon";
import LeaderboardGallery from "$islands/section/gallery/LeaderboardGallery.tsx";
import { container2 } from "$layout";
import {
  abbreviateAddress,
  formatBTC,
  formatNumberWithCommas,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { subtitleNeutral } from "$text";
import type {
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardPageData,
} from "$types/leaderboard.d.ts";

const MEDALS: Record<
  number,
  {
    name: "firstPlace" | "secondPlace" | "thirdPlace";
    stroke: string;
    minH: string;
  }
> = {
  1: {
    name: "firstPlace",
    stroke: "stroke-color-secondary-400",
    minH: "min-h-[220px]",
  },
  2: {
    name: "secondPlace",
    stroke: "stroke-color-neutral-400",
    minH: "min-h-[180px]",
  },
  3: {
    name: "thirdPlace",
    stroke: "stroke-color-secondary-600",
    minH: "min-h-[150px]",
  },
};

function PodiumStep(
  { entry, metric, showValuation }: {
    entry: LeaderboardEntry;
    metric: LeaderboardMetric;
    showValuation: boolean;
  },
) {
  const medal = MEDALS[entry.rank] ?? MEDALS[3];
  const name = entry.creatorName || abbreviateAddress(entry.address, 6);
  const stamps = formatNumberWithCommas(entry.stampCount);
  const value = formatBTC(entry.floorValueBtc, { includeSymbol: true });
  const primary = metric === "valuation" && showValuation ? value : stamps;
  const secondary = metric === "valuation" && showValuation ? stamps : value;
  return (
    <a
      href={`/wallet/${entry.address}`}
      class={`flex flex-col items-center justify-end gap-2 w-full min-w-0 overflow-hidden ${medal.minH} px-2 py-3`}
    >
      <Icon
        type="icon"
        name={medal.name}
        weight="bold"
        size="custom"
        color="custom"
        className={`${medal.stroke} w-8 h-8 mobileLg:w-10 mobileLg:h-10`}
      />
      <span class="max-w-full font-bold text-sm text-color-primary-400 text-center truncate">
        {name}
      </span>
      <span class="font-bold text-base mobileLg:text-lg text-color-neutral-200">
        {primary}
      </span>
      {showValuation && (
        <span class="text-sm text-color-neutral-400">{secondary}</span>
      )}
    </a>
  );
}

export function LeaderboardContent(
  { data }: { data: LeaderboardPageData },
) {
  const byRank = new Map(data.podium.map((entry) => [entry.rank, entry]));
  const slots = [byRank.get(2), byRank.get(1), byRank.get(3)];
  const hasPodium = slots.some(Boolean);

  return (
    <div class="flex flex-col gap-5 w-full">
      {data.error && <p class={subtitleNeutral}>{data.error}</p>}
      {hasPodium
        ? (
          <div class={`${container2} grid grid-cols-3 items-end gap-2 p-3`}>
            {slots.map((entry, index) =>
              entry
                ? (
                  <PodiumStep
                    key={entry.address}
                    entry={entry}
                    metric={data.metric}
                    showValuation={data.showValuation}
                  />
                )
                : <div key={`empty-${index}`} />
            )}
          </div>
        )
        : !data.error && (
          <div class={`${container2} p-5`}>
            <p class={subtitleNeutral}>NO WALLETS YET</p>
          </div>
        )}
      <LeaderboardGallery
        entries={data.entries}
        metric={data.metric}
        showValuation={data.showValuation}
        pagination={{
          page: data.page,
          totalPages: data.totalPages,
        }}
      />
    </div>
  );
}
