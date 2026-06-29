/* ===== ACTIVITY BADGE COMPONENT ===== */
import { STAMP_DISPENSER_ACTIVITY_LEVEL } from "$constants";
import type { ActivityBadgeProps } from "$types/ui.d.ts";

const activityConfig = {
  [STAMP_DISPENSER_ACTIVITY_LEVEL.HOT]: {
    emoji: "🔥",
    label: "Hot",
    className: "bg-red-500/20 text-red-400 border-red-500/50",
  },
  [STAMP_DISPENSER_ACTIVITY_LEVEL.WARM]: {
    emoji: "🟡",
    label: "Warm",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  },
  [STAMP_DISPENSER_ACTIVITY_LEVEL.COOL]: {
    emoji: "🔵",
    label: "Cool",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  },
  [STAMP_DISPENSER_ACTIVITY_LEVEL.DORMANT]: {
    emoji: "⚪",
    label: "Dormant",
    className: "bg-gray-500/20 text-gray-400 border-gray-500/50",
  },
  [STAMP_DISPENSER_ACTIVITY_LEVEL.COLD]: {
    emoji: "❄️",
    label: "Cold",
    className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
  },
};

const sizeClasses = {
  xs: "text-xs px-1.5 py-0.5",
  sm: "text-sm px-2 py-1",
  md: "text-base px-2.5 py-1",
  lg: "text-lg px-3 py-1.5",
};

export function ActivityBadge({
  level,
  showLabel = false,
  size = "sm",
  className = "",
}: ActivityBadgeProps) {
  if (!level || !activityConfig[level]) {
    return null;
  }

  const config = activityConfig[level];

  return (
    <span
      class={`inline-flex items-center gap-1 rounded-full border font-medium ${config.className} ${
        sizeClasses[size ?? "sm"]
      } ${className}`}
      title={`Activity: ${config.label}`}
      aria-label={`Activity level: ${config.label}`}
    >
      <span class="leading-none" aria-hidden="true">
        {config.emoji}
      </span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
