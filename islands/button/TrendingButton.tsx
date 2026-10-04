/* ===== TRENDING TOGGLE BUTTON COMPONENT ===== */
import { Icon } from "$icon";
import { tooltipIcon } from "$notification";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */
interface TrendingButtonProps {
  selected: boolean;
  onClick: () => void;
  className?: string;
}

/* ===== COMPONENT ===== */
export function TrendingButton(
  { selected, onClick, className = "" }: TrendingButtonProps,
) {
  /* ===== TOOLTIP STATE ===== */
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

  return (
    <div
      class="relative flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Icon
        type="iconButton"
        name="chartUp"
        weight="bold"
        size="container2"
        color={selected ? "custom" : "neutral400"}
        className={`${
          selected
            ? "stroke-color-orange-400 hover:stroke-color-hover group-hover:stroke-color-hover"
            : ""
        } ${className}`}
        onClick={() => {
          onClick();
          setIsTooltipVisible(false);
          setAllowTooltip(false);
        }}
        ariaLabel={selected ? "Sorted by trending" : "Sort by trending"}
      />
      <div
        className={`${tooltipIcon} ${
          isTooltipVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        TRENDING
      </div>
    </div>
  );
}
