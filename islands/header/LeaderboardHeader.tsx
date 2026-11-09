/* ===== LEADERBOARD HEADER ===== */
import { SelectorButtons } from "$button";
import { SortButton } from "$islands/button/SortButton.tsx";
import { ViewButton } from "$islands/button/ViewButton.tsx";
import { containerIcon, PillContentCount, ScrollFadeRow } from "$layout";
import {
  getCurrentPathname,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { updatedAgoLabel } from "$lib/utils/leaderboard/rank.ts";
import { formatNumberWithCommas } from "$lib/utils/ui/formatting/formatUtils.ts";
import { subtitleNeutral, titlePrimary } from "$text";
import type {
  LeaderboardMetric,
  LeaderboardSort,
} from "$types/leaderboard.d.ts";
import { useCallback } from "preact/hooks";

function LeaderboardHeader(
  {
    metric,
    sortBy,
    total,
    showValuation,
    generatedAt,
    escrowIncluded,
  }: {
    metric: LeaderboardMetric;
    sortBy: LeaderboardSort;
    total: number;
    showValuation: boolean;
    generatedAt: number | null;
    escrowIncluded: boolean;
  },
) {
  const handleMetricChange = useCallback((value: string) => {
    if (typeof globalThis === "undefined" || !globalThis?.location) return;
    const params = new URLSearchParams(globalThis.location.search);
    if (value === "valuation") params.set("metric", "valuation");
    else params.delete("metric");
    params.set("page", "1");
    const query = params.toString();
    safeNavigate(getCurrentPathname() + (query ? `?${query}` : ""));
  }, []);

  const updated = updatedAgoLabel(generatedAt);
  const options = showValuation
    ? [
      { value: "stamps", label: "STAMPS" },
      { value: "valuation", label: "VALUATION" },
    ]
    : [{ value: "stamps", label: "STAMPS" }];

  return (
    <div class="flex flex-col w-full gap-1.5">
      <div class="relative flex flex-row justify-between items-start w-full">
        <div class="flex flex-col gap-1">
          <h1 class={`-mt-2 ${titlePrimary}`}>LEADERBOARD</h1>
          {updated && <p class={subtitleNeutral}>{updated}</p>}
          {!escrowIncluded && (
            <p class={subtitleNeutral}>LISTINGS NOT INCLUDED YET</p>
          )}
        </div>
        <PillContentCount value={formatNumberWithCommas(total)} />
      </div>
      <ScrollFadeRow deps={[metric, sortBy]}>
        <div class="shrink-0">
          <SelectorButtons
            options={options}
            value={metric}
            onChange={handleMetricChange}
            size="xs"
            color="primary"
          />
        </div>
        <div class="shrink-0 flex ml-auto gap-3">
          <div class={containerIcon}>
            <ViewButton viewMode="cardHorizontal" modes={["cardHorizontal"]} />
          </div>
          <div class={containerIcon}>
            <SortButton initSort={sortBy} resetPage />
          </div>
        </div>
      </ScrollFadeRow>
    </div>
  );
}

export { LeaderboardHeader };
