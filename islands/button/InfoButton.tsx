/* ===== INFO BUTTON ===== */
import { Icon } from "$icon";
import { openModal, stackModal } from "$islands/modal/states.ts";
import { containerIcon } from "$layout";
import { tooltipButtonInCollapsible } from "$notification";
import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */
interface InfoButtonProps {
  /** Complete modal, e.g. `<StampCreateClassicInfo />` (renders `ModalBase`). */
  modal: ComponentChildren;
  ariaLabel?: string;
  /** Icon name (defaults to the help icon). */
  icon?: string;
  /** Open above the current modal instead of replacing it. */
  stack?: boolean;
  /** `plain` matches the modal close icon. Default is the icon pill. */
  variant?: "pill" | "plain";
}

/* Same hover delay as the CLOSE icon in ModalBase. */
const TOOLTIP_DELAY_MS = 1500;

/* ===== COMPONENT ===== */
/** Icon button that opens the given modal (help icon by default). */
export function InfoButton({
  modal,
  ariaLabel = "How-to",
  icon = "help",
  stack = false,
  variant = "pill",
}: InfoButtonProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipTimeoutRef = useRef<number | null>(null);

  const openInfo = (e: MouseEvent) => {
    e.preventDefault();
    const show = stack ? stackModal : openModal;
    show(modal, "zoomInOut");
  };

  const handleMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }

    tooltipTimeoutRef.current = globalThis.setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      }
      setIsTooltipVisible(true);
    }, TOOLTIP_DELAY_MS);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setIsTooltipVisible(false);
  };

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  const tooltip = isMounted
    ? createPortal(
      <div
        class={`${tooltipButtonInCollapsible} !z-notification ${
          isTooltipVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`,
          marginTop: 0,
          transform: "translate(-50%, -100%)",
        }}
      >
        HOW-TO GUIDE
      </div>,
      document.body,
    )
    : null;

  if (variant === "plain") {
    return (
      <div
        ref={anchorRef}
        class="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Icon
          type="iconButton"
          name={icon}
          weight="bold"
          size="xl"
          color="neutral600"
          ariaLabel={ariaLabel}
          onClick={openInfo}
        />
        {tooltip}
      </div>
    );
  }

  return (
    <div
      ref={anchorRef}
      class={containerIcon}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Icon
        type="iconButton"
        name={icon}
        weight="normal"
        size="containerIcon"
        color="neutral400"
        ariaLabel={ariaLabel}
        onClick={openInfo}
      />
      {tooltip}
    </div>
  );
}
