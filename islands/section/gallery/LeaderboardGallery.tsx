/* ===== LEADERBOARD GALLERY ===== */
import { PaginationButtons } from "$button";
import { LeaderboardCard } from "$components/card/LeaderboardCard.tsx";
import type {
  LeaderboardEntry,
  LeaderboardMetric,
} from "$types/leaderboard.d.ts";

export interface LeaderboardGalleryProps {
  entries: LeaderboardEntry[];
  metric: LeaderboardMetric;
  showValuation: boolean;
  pagination?: {
    page: number;
    totalPages: number;
  };
}

export default function LeaderboardGallery({
  entries,
  metric,
  showValuation,
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
      <div class="grid grid-cols-1 gap-5">
        {entries.map((entry) => (
          <LeaderboardCard
            key={entry.address}
            entry={entry}
            metric={metric}
            showValuation={showValuation}
          />
        ))}
      </div>
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
