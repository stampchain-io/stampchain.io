import { BadgeIcon, Icon } from "$components/icon/IconBase.tsx";
import { tooltipIcon } from "$notification";
import { useEffect, useRef, useState } from "preact/hooks";

// Define the filter types
export type FilterType = "stamp" | "src20" | "explorer";

export function FilterButton(
  { count, open, setOpen, type = "stamp" }: {
    count: number;
    open: boolean;
    setOpen: (status: boolean) => void;
    type?: FilterType;
  },
) {
  // Define drawer target based on filter type
  const drawerTarget = `drawer-form-${type}`;

  // Add tooltip state
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [allowTooltip, setAllowTooltip] = useState(true);
  const tooltipTimeoutRef = useRef<number | null>(null);

  // Add tooltip handlers
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div class="group relative">
      <BadgeIcon text={count !== undefined ? count.toString() : ""} />
      <Icon
        type="iconButton"
        name="filter"
        weight="bold"
        size="md"
        color={count > 0 ? "purpleLight" : "grey"}
        className="p-1.5 bg-transparent rounded-full hover:bg-gradient-to-b hover:from-color-neutral-800 hover:via-color-neutral-800 hover:to-color-neutral-900"
        onClick={() => {
          setOpen(!open);
          setIsTooltipVisible(false);
          setAllowTooltip(false);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-drawer-target={drawerTarget}
        data-drawer-show={drawerTarget}
        aria-controls={drawerTarget}
      />
      <div
        className={`${tooltipIcon} ${
          isTooltipVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        FILTER
      </div>
    </div>
  );
}
