/* ===== VIEW MODE TOGGLE BUTTON COMPONENT ===== */
import { buttonHover } from "$button";
import { Icon } from "$icon";
import {
  getCurrentPathname,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { tooltipIcon } from "$notification";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */
type ViewMode = "detail" | "minimal" | "row";

/* ===== COMPONENT ===== */
export function ViewButton(
  { viewMode }: { viewMode: ViewMode },
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
      params.set("view", mode);
      safeNavigate(getCurrentPathname() + `?${params.toString()}`);
    },
    [],
  );

  const nextMode: ViewMode = viewMode === "detail"
    ? "minimal"
    : viewMode === "minimal"
    ? "row"
    : "detail";

  const iconName = viewMode === "minimal"
    ? "viewCardMinimal"
    : viewMode === "row"
    ? "viewRow"
    : "viewCardDetail";

  const ariaLabel = viewMode === "detail"
    ? "Switch to minimal grid view"
    : viewMode === "minimal"
    ? "Switch to row view"
    : "Switch to detailed grid view";

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
        size="custom"
        color="greyLight"
        className={`${buttonHover} w-[31px] h-[31px] tablet:w-[27px] tablet:h-[27px]`}
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
