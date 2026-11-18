/* ===== PILL WITH TOOLTIP (instant on hover, no delay/timeout) ===== */
// Cards clip their content with overflow-hidden, which would clip a plain
// `absolute` tooltip. `position: fixed` escapes that clipping.
//
// An ancestor with backdrop-filter creates its own containing block for
// `position: fixed` descendants, so the tooltip would scroll with that
// ancestor. A portal to `document.body` sidesteps this.
import { tooltipButtonInCollapsible } from "$notification";
import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useRef, useState } from "preact/hooks";

const TOOLTIP_GAP = 8;
const TOOLTIP_VIEWPORT_MARGIN = 8;

export function PillWithTooltip(
  { label, className, children }: {
    label: string;
    className: string;
    children: ComponentChildren;
  },
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  // `left`/`top` are the tooltip's anchor point: horizontally it's the
  // pill's center (paired with `translateX(-50%)` below). `shiftX` nudges
  // that anchor inward only when a centered tooltip would leave the screen.
  const [position, setPosition] = useState({ left: 0, top: 0, shiftX: 0 });

  const updatePosition = () => {
    const pillRect = wrapperRef.current?.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    if (!pillRect || !tooltipRect) return;

    const pillCenterX = pillRect.left + pillRect.width / 2;
    const halfTooltipWidth = tooltipRect.width / 2;
    const viewportWidth = globalThis.innerWidth;

    let shiftX = 0;
    const overflowLeft = TOOLTIP_VIEWPORT_MARGIN -
      (pillCenterX - halfTooltipWidth);
    const overflowRight = (pillCenterX + halfTooltipWidth) -
      (viewportWidth - TOOLTIP_VIEWPORT_MARGIN);
    if (overflowLeft > 0) {
      shiftX = overflowLeft;
    } else if (overflowRight > 0) {
      shiftX = -overflowRight;
    }

    let top = pillRect.top - tooltipRect.height - TOOLTIP_GAP;
    if (top < TOOLTIP_VIEWPORT_MARGIN) {
      top = pillRect.bottom + TOOLTIP_GAP;
    }

    setPosition({ left: pillCenterX, top, shiftX });
  };

  useEffect(() => {
    if (!isVisible) return;
    globalThis.addEventListener("scroll", updatePosition, {
      passive: true,
      capture: true,
    });
    globalThis.addEventListener("resize", updatePosition, { passive: true });
    return () => {
      globalThis.removeEventListener("scroll", updatePosition, {
        capture: true,
      } as EventListenerOptions);
      globalThis.removeEventListener("resize", updatePosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  return (
    <div
      ref={wrapperRef}
      class="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div class={className}>{children}</div>
      {typeof document !== "undefined" && createPortal(
        <div
          ref={tooltipRef}
          class={`${tooltipButtonInCollapsible} !mt-0 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{
            left: `${position.left}px`,
            top: `${position.top}px`,
            transform: `translateX(calc(-50% + ${position.shiftX}px))`,
          }}
        >
          {label}
        </div>,
        document.body,
      )}
    </div>
  );
}
