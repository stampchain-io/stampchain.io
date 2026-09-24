/* ===== COLLECTION VIEW TOGGLE BUTTON COMPONENT ===== */
import { Icon } from "$icon";
import { tooltipIcon } from "$notification";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */
export type CollectionViewMode = "stamps" | "collections";

/* ===== CONSTANTS ===== */
const MODES: CollectionViewMode[] = ["stamps", "collections"];
const ICON_BY_MODE: Record<CollectionViewMode, string> = {
  stamps: "artStamp",
  collections: "artStamps",
};
const ARIA_LABEL_BY_MODE: Record<CollectionViewMode, string> = {
  stamps: "View stamps",
  collections: "View collections",
};

/* ===== COMPONENT ===== */
export function CollectionButton({
  view,
  onChange,
}: {
  view: CollectionViewMode;
  onChange: (view: CollectionViewMode) => void;
}) {
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

  const currentIndex = MODES.indexOf(view);
  const nextMode: CollectionViewMode =
    MODES[(currentIndex + 1 + MODES.length) % MODES.length] ?? MODES[0];

  const iconName = ICON_BY_MODE[view];
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
        size="md"
        color="neutral400"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onChange(nextMode);
        }}
        ariaLabel={ariaLabel}
      />
      <div
        className={`${tooltipIcon} ${
          isTooltipVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        COLLECTION
      </div>
    </div>
  );
}
