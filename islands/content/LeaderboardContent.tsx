/* ===== LEADERBOARD PODIUM + GALLERY ===== */
import { Icon, UserProfileIcon } from "$icon";
import LeaderboardGallery from "$islands/section/gallery/LeaderboardGallery.tsx";
import { container2 } from "$layout";
import {
  abbreviateAddress,
  formatBTC,
  formatNumberWithCommas,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { subtitlePrimary, textSm } from "$text";
import type {
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardPageData,
  LeaderboardViewMode,
} from "$types/leaderboard.d.ts";

const MEDALS: Record<
  number,
  {
    name: "firstPlace" | "secondPlace" | "thirdPlace";
    stroke: string;
    step: string;
  }
> = {
  1: {
    name: "firstPlace",
    stroke: "stroke-color-secondary-400",
    step:
      "relative z-[2] -mx-px min-h-[170px] mobileLg:min-h-[200px] border-color-secondary-400 bg-gradient-to-b from-color-secondary-400/30 to-color-neutral-900",
  },
  2: {
    name: "secondPlace",
    stroke: "stroke-color-neutral-400",
    step:
      "relative z-[1] -mr-1 min-h-[130px] mobileLg:min-h-[150px] border-color-neutral-400 bg-gradient-to-b from-color-neutral-700/60 to-color-neutral-900",
  },
  3: {
    name: "thirdPlace",
    stroke: "stroke-color-secondary-800",
    step:
      "relative z-0 -ml-1 min-h-[90px] mobileLg:min-h-[100px] border-color-secondary-800 bg-gradient-to-b from-color-secondary-800/30 to-color-neutral-900",
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
  const stampsFirst = metric !== "valuation" || !showValuation;
  const stampClass = stampsFirst
    ? "font-bold text-sm mobileLg:text-base text-color-neutral-100"
    : "text-xs text-color-neutral-400";
  const valueClass = stampsFirst
    ? "text-xs text-color-neutral-400"
    : "font-bold text-sm mobileLg:text-base text-color-neutral-100";
  return (
    <a
      href={`/wallet/${entry.address}`}
      class="flex flex-col items-center justify-end gap-1 w-full min-w-0"
    >
      <UserProfileIcon
        className={`w-6 h-6 mobileLg:w-8 mobileLg:h-8 [stroke-width:1.5] ${medal.stroke}`}
      />
      <h6 class="max-w-full px-2 font-bold text-xs mobileLg:text-sm text-color-neutral-200 text-center truncate">
        {name}
      </h6>
      <div
        class={`flex w-full flex-col items-center justify-between
          mt-2 px-1.5 pt-0 pb-3 border-2 border-b-0
        rounded-lg rounded-b-none ${medal.step}`}
      >
        <Icon
          type="icon"
          name={medal.name}
          weight="bold"
          size="custom"
          color="custom"
          className={`-mt-[3px] ${medal.stroke} w-8 h-8 mobileLg:w-10 mobileLg:h-10`}
        />
        <div class="flex flex-col items-center max-w-full">
          <h6 class={`max-w-full truncate ${stampClass}`}>{stamps}</h6>
          {showValuation && (
            <h6 class={`max-w-full truncate ${valueClass}`}>{value}</h6>
          )}
        </div>
      </div>
    </a>
  );
}

export function LeaderboardContent(
  { data, viewMode }: {
    data: LeaderboardPageData;
    viewMode: LeaderboardViewMode;
  },
) {
  const byRank = new Map(data.podium.map((entry) => [entry.rank, entry]));
  const slots = [byRank.get(2), byRank.get(1), byRank.get(3)];
  const hasPodium = slots.some(Boolean);

  return (
    <div class="flex flex-col gap-3 w-full pt-3">
      <div
        class={`${container2} flex flex-col items-center p-3 ${
          hasPodium ? "pb-0" : ""
        }`}
      >
        <h2 class={`${subtitlePrimary} self-start`}>TOP WHALES</h2>
        {hasPodium
          ? (
            <div class="grid w-full max-w-[360px] mobileMd:max-w-[420px] mobileLg:max-w-[480px] tablet:max-w-[520px] grid-cols-3 items-end">
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
          : (
            <p class={`${textSm} self-start`}>
              {data.error || "No Rankings available."}
            </p>
          )}
      </div>
      <LeaderboardGallery
        entries={data.entries}
        metric={data.metric}
        showValuation={data.showValuation}
        viewMode={viewMode}
        pagination={{
          page: data.page,
          totalPages: data.totalPages,
        }}
      />
    </div>
  );
}
