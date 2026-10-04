/* ===== VIEW MODE TOGGLE BUTTON COMPONENT ===== */
import { Icon } from "$icon";
import {
  getCurrentPathname,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { tooltipIcon } from "$notification";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */
type ViewMode =
  | "cardVertical"
  | "cardSquare"
  | "cardRow"
  | "cardHorizontal";

/* ===== CONSTANTS ===== */
const ICON_BY_MODE: Record<ViewMode, string> = {
  cardVertical: "viewCardVertical",
  cardSquare: "viewCardSquare",
  cardRow: "viewCardRow",
  cardHorizontal: "viewCardHorizontal",
};
const ARIA_LABEL_BY_MODE: Record<ViewMode, string> = {
  cardVertical: "Switch to detailed grid view",
  cardSquare: "Switch to minimal grid view",
  cardRow: "Switch to row view",
  cardHorizontal: "Switch to horizontal view",
};

/* ===== COMPONENT ===== */
export function ViewButton(
  {
    viewMode,
    paramName = "view",
    modes = ["cardVertical", "cardSquare", "cardRow"],
  }: {
    viewMode: ViewMode;
    paramName?: string;
    // Modes to cycle through on click, in order. Defaults to the original
    // 3-mode cycle used by explorer/marketplace; pass a custom (e.g. 2-mode)
    // list for other pages such as the collection overview.
    modes?: ViewMode[];
  },
) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [allowTooltip, setAllowTooltip] = useState(true);
  const tooltipTimeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (allowTooltip) {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }
      tooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsTooltipVisible(true);
      }, 1500);
    }
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setIsTooltipVisible(false);
    setAllowTooltip(true);
  };

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      if (typeof globalThis === "undefined" || !globalThis?.location) return;
      const params = new URLSearchParams(globalThis.location.search);
      params.set(paramName, mode);
      safeNavigate(getCurrentPathname() + `?${params.toString()}`);
    },
    [paramName],
  );

  const currentIndex = modes.indexOf(viewMode);
  const nextMode: ViewMode =
    modes[(currentIndex + 1 + modes.length) % modes.length] ?? modes[0];

  const iconName = ICON_BY_MODE[viewMode];
  const ariaLabel = ARIA_LABEL_BY_MODE[nextMode];

  return (
    <div
      class="relative flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Icon
        type="iconButton"
        name={iconName}
        weight="bold"
        size="container2"
        color="neutral400"
        className="stroke-width:1.5"
        onClick={() => handleViewModeChange(nextMode)}
        ariaLabel={ariaLabel}
      />
      <div
        className={`${tooltipIcon} ${
          isTooltipVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        VIEW
      </div>
    </div>
  );
}
