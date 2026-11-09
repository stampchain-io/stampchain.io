/* ===== LEADERBOARD PAGE ===== */
import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { LeaderboardHeader } from "$header";
import { LeaderboardContent } from "$islands/content/LeaderboardContent.tsx";
import { containerBackground } from "$layout";
import {
  DATA_PLACEHOLDER_DEV,
  DATA_PLACEHOLDER_PROD_LEADERBOARD_PAGE,
} from "$lib/utils/dataPlaceholderProd.ts";
import { presentLeaderboard } from "$lib/utils/leaderboard/rank.ts";
import { getChainId } from "$server/services/chain/chainProfile.ts";
import { getLeaderboardPage } from "$server/services/leaderboard/leaderboardService.ts";
import type {
  LeaderboardMetric,
  LeaderboardPageData,
  LeaderboardSort,
} from "$types/leaderboard.d.ts";

function readQuery(url: URL, showValuation: boolean): {
  metric: LeaderboardMetric;
  sortBy: LeaderboardSort;
  page: number;
  showValuation: boolean;
} {
  const metric: LeaderboardMetric =
    showValuation && url.searchParams.get("metric") === "valuation"
      ? "valuation"
      : "stamps";
  const sortBy: LeaderboardSort =
    url.searchParams.get("sortBy")?.toUpperCase() === "ASC" ? "ASC" : "DESC";
  const parsed = parseInt(url.searchParams.get("page") || "1", 10);
  return {
    metric,
    sortBy,
    page: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
    showValuation,
  };
}

export const handler: Handlers<LeaderboardPageData> = {
  async GET(req: Request, ctx: FreshContext) {
    const url = new URL(req.url);
    const showValuation = getChainId() === "bitcoin";
    const query = readQuery(url, showValuation);
    try {
      if (DATA_PLACEHOLDER_DEV) {
        const { DATA_PLACEHOLDER_DEV_LEADERBOARD_SNAPSHOT } = await import(
          "$lib/utils/dataPlaceholderDev.ts"
        );
        return ctx.render(
          presentLeaderboard(
            DATA_PLACEHOLDER_DEV_LEADERBOARD_SNAPSHOT,
            { ...query, pageSize: 20 },
          ),
        );
      }
      return ctx.render(await getLeaderboardPage(query));
    } catch (error) {
      console.error("Error in leaderboard:", error);
      return ctx.render({
        ...DATA_PLACEHOLDER_PROD_LEADERBOARD_PAGE,
        metric: query.metric,
        sortBy: query.sortBy,
        showValuation,
        error: "Service temporarily unavailable",
      });
    }
  },
};

export default function LeaderboardPage(
  { data }: PageProps<LeaderboardPageData>,
) {
  return (
    <div
      class={containerBackground}
      f-client-nav
      data-partial="/leaderboard"
    >
      <LeaderboardHeader
        metric={data.metric}
        sortBy={data.sortBy}
        total={data.total}
        showValuation={data.showValuation}
        escrowIncluded={data.escrowIncluded}
      />
      <LeaderboardContent data={data} />
    </div>
  );
}
