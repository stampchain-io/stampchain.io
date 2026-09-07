/* ===== ACTIVITY LEVEL INDICATOR COMPONENT ===== */
import { containerPill } from "$layout";
import { tooltipButton } from "$notification";
import type { ActivityLevelIndicatorProps } from "$types/ui.d.ts";
import { VNode } from "preact";

/**
 * Dot colors match ProgressiveEstimationIndicator's primary scale.
 * Dots are cumulative — HOT lights all three, WARM lights two, COOL lights one.
 * DORMANT shows the pill with all-neutral dots.
 * COLD (no sales yet) renders nothing — the indicator is hidden entirely
 * rather than shown as an empty/"none" state.
 */
const DOT_ON = [
  "bg-color-secondary-300",
  "bg-color-secondary-400",
  "bg-color-secondary-500",
] as const;
const DOT_OFF = "bg-color-neutral-700";

const TOOLTIP_LABEL: Record<string, string> = {
  HOT: "24H SALES",
  WARM: "7D SALES",
  COOL: "30D SALES",
  DORMANT: "NO RECENT SALES",
};

const DOTS_BY_LEVEL: Record<string, [string, string, string]> = {
  HOT: [DOT_ON[0], DOT_ON[1], DOT_ON[2]],
  WARM: [DOT_ON[0], DOT_ON[1], DOT_OFF],
  COOL: [DOT_ON[0], DOT_OFF, DOT_OFF],
  DORMANT: [DOT_OFF, DOT_OFF, DOT_OFF],
};

export function ActivityLevelIndicator({
  level,
  className = "",
}: ActivityLevelIndicatorProps): VNode<any> | null {
  if (!level || level === "COLD") return null;

  const dots = DOTS_BY_LEVEL[level];

  return (
    <div class={`relative w-fit group/pill ${className}`}>
      <div className={containerPill}>
        <div className="flex items-center gap-1">
          <div
            className={`size-1.5 rounded-full ${dots[0]}`}
          />
          <div
            className={`size-1.5 rounded-full ${dots[1]}`}
          />
          <div
            className={`size-1.5 rounded-full ${dots[2]}`}
          />
        </div>
      </div>
      <div
        className={`${tooltipButton} opacity-0 group-hover/pill:opacity-100 transition-opacity duration-150`}
      >
        {TOOLTIP_LABEL[level] ?? level}
      </div>
    </div>
  );
}
