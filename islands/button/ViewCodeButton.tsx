/* ===== VIEW CODE TOGGLE BUTTON COMPONENT ===== */
import { Icon } from "$icon";
import { tooltipIcon } from "$notification";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */
export type CodeViewMode = "codeRaw" | "codeFormatted";

/* ===== CONSTANTS ===== */
const MODES: CodeViewMode[] = ["codeRaw", "codeFormatted"];
const ICON_BY_MODE: Record<CodeViewMode, string> = {
  codeRaw: "previewCodeRaw",
  codeFormatted: "previewCodeFormatted",
};
const ARIA_LABEL_BY_MODE: Record<CodeViewMode, string> = {
  codeRaw: "Switch to raw code",
  codeFormatted: "Switch to formatted code",
};
const TOOLTIP_BY_MODE: Record<CodeViewMode, string> = {
  codeRaw: "VIEW FORMATTED CODE",
  codeFormatted: "VIEW RAW CODE",
};

/* ===== COMPONENT ===== */
export function ViewCodeButton({
  mode,
  onChange,
}: {
  mode: CodeViewMode;
  onChange: (mode: CodeViewMode) => void;
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

  const currentIndex = MODES.indexOf(mode);
  const nextMode: CodeViewMode =
    MODES[(currentIndex + 1 + MODES.length) % MODES.length] ?? MODES[0];

  const iconName = ICON_BY_MODE[mode];
  const ariaLabel = ARIA_LABEL_BY_MODE[nextMode];
  const tooltipLabel = TOOLTIP_BY_MODE[mode];

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
        color="neutral800"
        className="!p-0"
        onClick={() => onChange(nextMode)}
        ariaLabel={ariaLabel}
      />
      <div
        className={`${tooltipIcon} ${
          isTooltipVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {tooltipLabel}
      </div>
    </div>
  );
}
