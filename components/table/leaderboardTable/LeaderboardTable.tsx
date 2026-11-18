/* ===== LEADERBOARD TABLE ===== */
import { colGroup } from "$components/layout/types.ts";
import { Icon } from "$icon";
import {
  cellCenterL2Card,
  cellLeftL2Card,
  cellRightL2Card,
  container2,
  shadowGlowPurple,
} from "$layout";
import {
  isBrowser,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import {
  abbreviateAddress,
  formatBTC,
  formatNumberWithCommas,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { labelXxs, textXs } from "$text";
import type { LeaderboardEntry } from "$types/leaderboard.d.ts";

const COLUMNS = [
  { width: "min-w-[72px] w-auto" },
  { width: "min-w-[140px] w-auto" },
  { width: "min-w-[80px] w-auto" },
  { width: "min-w-[110px] w-auto" },
];

function WalletName({ entry }: { entry: LeaderboardEntry }) {
  if (entry.creatorName) return <span>{entry.creatorName}</span>;
  return (
    <>
      <span class="mobileMd:hidden">
        {abbreviateAddress(entry.address, 8)}
      </span>
      <span class="hidden mobileMd:inline">{entry.address}</span>
    </>
  );
}

function LeaderboardRow(
  { entry, showValuation }: {
    entry: LeaderboardEntry;
    showValuation: boolean;
  },
) {
  const href = `/wallet/${entry.address}`;
  const stampsClass = showValuation
    ? cellCenterL2Card
    : `${cellRightL2Card} !pr-3`;

  return (
    <tr
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
      <td class={`${cellLeftL2Card} !pl-3`}>
        <div class="flex items-center h-6.5 gap-1.5 text-color-neutral-400">
          <Icon
            type="icon"
            name="trophy"
            weight="custom"
            size="md"
            color="neutral400"
            className="[stroke-width:2] shrink-0"
          />
          <span>{entry.rank}</span>
        </div>
      </td>
      <td class={`${cellCenterL2Card} text-color-neutral-200`}>
        <a href={href} class="link-neutral-200">
          <WalletName entry={entry} />
        </a>
      </td>
      <td class={`${stampsClass} text-color-primary-400`}>
        {formatNumberWithCommas(entry.stampCount)}
      </td>
      {showValuation && (
        <td class={`${cellRightL2Card} !pr-3 text-color-secondary-400`}>
          {formatBTC(entry.floorValueBtc, { includeSymbol: true })}
        </td>
      )}
    </tr>
  );
}

export function LeaderboardTable(
  { entries, showValuation }: {
    entries: LeaderboardEntry[];
    showValuation: boolean;
  },
) {
  if (entries.length === 0) return null;
  const headers = showValuation
    ? ["RANK", "ADDRESS", "STAMPS", "VALUATION"]
    : ["RANK", "ADDRESS", "STAMPS"];
  const columns = showValuation ? COLUMNS : COLUMNS.slice(0, 3);

  return (
    <div class="overflow-x-auto tablet:overflow-x-visible scrollbar-hide -my-3">
      <table class={`w-full border-separate border-spacing-y-3 ${textXs}`}>
        <colgroup>
          {colGroup(columns).map((col) => (
            <col key={col.key} class={col.className} />
          ))}
        </colgroup>
        <thead>
          <tr class={container2}>
            {headers.map((header, index) => {
              const isFirst = index === 0;
              const isLast = index === headers.length - 1;
              const rowClass = isFirst
                ? cellLeftL2Card
                : isLast
                ? cellRightL2Card
                : cellCenterL2Card;
              return (
                <th
                  key={header}
                  class={`${labelXxs} py-1.5 !px-3 ${rowClass}
                    text-color-neutral-500`}
                >
                  {header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <LeaderboardRow
              key={entry.address}
              entry={entry}
              showValuation={showValuation}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
