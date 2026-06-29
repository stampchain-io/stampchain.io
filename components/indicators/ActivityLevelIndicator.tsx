/* ===== ACTIVITY LEVEL INDICATOR COMPONENT ===== */
import { containerPill } from "$layout";
import { tooltipButton } from "$notification";
import type { ActivityLevelIndicatorProps } from "$types/ui.d.ts";
import { VNode } from "preact";
import { useRef, useState } from "preact/hooks";

/**
 * Dot colors match ProgressiveEstimationIndicator's primary scale.
 * Dots are cumulative — HOT lights all three, WARM lights two, COOL lights one.
 * DORMANT shows the pill with all-neutral dots.
 * COLD shows "none" text with no dots.
 */
const DOT_ON = [
  "bg-color-secondary-400",
  "bg-color-secondary-500",
  "bg-color-secondary-600",
] as const;
const DOT_OFF = "bg-color-neutral-700";

const TOOLTIP_LABEL: Record<string, string> = {
  HOT: "24H SALES",
  WARM: "7D SALES",
  COOL: "30D SALES",
  DORMANT: "NO SALES",
  COLD: "NO DISPENSERS",
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
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipTimeoutRef = useRef<number | null>(null);

  if (!level) return null;

  const handleMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setIsTooltipVisible(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setIsTooltipVisible(false);
  };

  const isCold = level === "COLD";
  const dots = DOTS_BY_LEVEL[level];

  return (
    <div class={`relative w-fit ${className}`}>
      <div
        className={containerPill}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isCold
          ? (
            <span className="text-[10px] text-color-neutral-600 tracking-wide select-none">
              none
            </span>
          )
          : (
            <div className="flex items-center gap-1">
              <div className={`size-1.5 rounded-full ${dots[0]}`} />
              <div className={`size-1.5 rounded-full ${dots[1]}`} />
              <div className={`size-1.5 rounded-full ${dots[2]}`} />
            </div>
          )}
      </div>
      <div
        className={`${tooltipButton} transition-opacity duration-150 ${
          isTooltipVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {TOOLTIP_LABEL[level] ?? level}
      </div>
    </div>
  );
}
