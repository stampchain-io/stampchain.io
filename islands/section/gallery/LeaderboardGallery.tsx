/* ===== LEADERBOARD GALLERY ===== */
import { PaginationButtons } from "$button";
import { LeaderboardCard } from "$components/card/LeaderboardCard.tsx";
import { LeaderboardTable } from "$components/table/leaderboardTable/LeaderboardTable.tsx";
import type {
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardViewMode,
} from "$types/leaderboard.d.ts";

export interface LeaderboardGalleryProps {
  entries: LeaderboardEntry[];
  metric: LeaderboardMetric;
  showValuation: boolean;
  viewMode?: LeaderboardViewMode;
  pagination?: {
    page: number;
    totalPages: number;
  };
}

export default function LeaderboardGallery({
  entries,
  metric,
  showValuation,
  viewMode = "cardHorizontal",
  pagination,
}: LeaderboardGalleryProps) {
  const handlePageChange = (page: number) => {
    if (typeof globalThis === "undefined" || !globalThis?.location) return;
    const url = new URL(globalThis.location.href);
    url.searchParams.set("page", page.toString());
    globalThis.location.href = url.toString();
  };

  return (
    <div>
      {viewMode === "cardRow"
        ? (
          <LeaderboardTable
            entries={entries}
            showValuation={showValuation}
          />
        )
        : (
          <div class="flex flex-col gap-3">
            {entries.map((entry) => (
              <LeaderboardCard
                key={entry.address}
                entry={entry}
                metric={metric}
                showValuation={showValuation}
              />
            ))}
          </div>
        )}
      {pagination && pagination.totalPages > 1 && (
        <PaginationButtons
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
