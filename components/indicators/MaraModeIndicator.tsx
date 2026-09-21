import { Icon } from "$icon";
import type { MaraModeIndicatorProps } from "$types/ui.d.ts";
import { AccessibilityUtils } from "$utils/ui/accessibility/accessibilityUtils.ts";
import { useRef, useState } from "preact/hooks";

export function MaraModeIndicator({
  isActive,
  outputValue,
  feeRate,
  class: className = "",
}: MaraModeIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }

    tooltipTimeoutRef.current = globalThis.setTimeout(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
        setShowTooltip(true);
      }
    }, 800);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setShowTooltip(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setShowTooltip(!showTooltip);
    } else if (event.key === "Escape") {
      setShowTooltip(false);
    }
  };

  // Generate MARA-specific accessibility labels using utility patterns
  const getMaraAccessibilityLabel = () => {
    const baseLabel = "MARA Pool optimized mode active";
    const outputInfo = `Output value: ${outputValue} sats`;
    const feeInfo = feeRate ? `, minimum fee rate: ${feeRate} sat/vB` : "";
    const instruction = "Press Enter for details";

    return `${baseLabel}. ${outputInfo}${feeInfo}. ${instruction}`;
  };

  const shouldReduceMotion = AccessibilityUtils.prefersReducedMotion();

  return (
    <div
      ref={containerRef}
      class={`flex items-center gap-2 bg-purple-900/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl px-3 py-2 cursor-help focus:outline-none focus:ring-2 focus:ring-purple-400 ${className}`}
      role="button"
      tabIndex={0}
      aria-label={getMaraAccessibilityLabel()}
      aria-expanded={showTooltip}
      aria-describedby={showTooltip ? "mara-indicator-tooltip" : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      onClick={() => setShowTooltip(!showTooltip)}
    >
      <div class="flex items-center gap-2">
        <div class="relative">
          <div
            class={`w-2 h-2 bg-purple-400 rounded-full ${
              shouldReduceMotion || !isActive ? "" : "animate-pulse"
            }`}
          />
          <div
            class={`absolute inset-0 w-2 h-2 bg-purple-400 rounded-full opacity-20 ${
              shouldReduceMotion || !isActive ? "" : "animate-ping"
            }`}
          />
        </div>
        <span class="text-purple-300 text-sm font-medium">
          MARA Pool Optimized
        </span>
      </div>

      <div class="flex items-center gap-3 ml-auto text-xs text-purple-300/80">
        <div class="flex items-center gap-1">
          <Icon
            type="icon"
            name="bitcoin"
            size="md"
            weight="normal"
            color="custom"
            className="fill-purple-400"
          />
          <span>{outputValue} sat outputs</span>
        </div>

        {feeRate !== null && feeRate !== undefined && (
          <>
            <div class="w-px h-3 bg-purple-500/30" />
            <div class="flex items-center gap-1">
              <Icon
                type="icon"
                name="network"
                size="md"
                weight="normal"
                color="custom"
                className="stroke-purple-400"
              />
              <span>{feeRate} sat/vB min</span>
            </div>
          </>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          class="fixed z-50 bg-color-grey-dark/95 backdrop-blur-sm border border-color-grey-light/20 rounded-2xl px-4 py-3 shadow-lg max-w-xs text-sm pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: "translate(-50%, -100%)",
          }}
          role="tooltip"
          aria-hidden="false"
          id="mara-indicator-tooltip"
        >
          <div class="space-y-2">
            <h4 class="font-semibold text-purple-400">
              MARA Pool Benefits
            </h4>
            <ul class="space-y-1 text-color-grey-light text-xs">
              <li class="flex items-start gap-1">
                <span class="text-purple-400 mt-0.5">•</span>
                <span>
                  Non-standard transactions with {outputValue} sat outputs
                </span>
              </li>
              <li class="flex items-start gap-1">
                <span class="text-purple-400 mt-0.5">•</span>
                <span>Direct submission to MARA mining pool</span>
              </li>
              <li class="flex items-start gap-1">
                <span class="text-purple-400 mt-0.5">•</span>
                <span>Bypasses standard mempool restrictions</span>
              </li>
              <li class="flex items-start gap-1">
                <span class="text-purple-400 mt-0.5">•</span>
                <span>Service fee: 42,000 sats per transaction</span>
              </li>
              <li class="flex items-start gap-1">
                <span class="text-purple-400 mt-0.5">•</span>
                <span>Minimum fee rate: {feeRate || "XX"} sat/vB</span>
              </li>
            </ul>
            <p class="text-[10px] text-color-grey-semidark mt-2 pt-2 border-t border-color-grey-light/10">
              Note: Standard wallets cannot broadcast these transactions
            </p>
          </div>
          {/* Tooltip arrow */}
          <div class="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-color-grey-dark border-b border-r border-color-grey-light/20 rotate-45" />
        </div>
      )}
    </div>
  );
}

// Compact variant for smaller spaces
export function MaraModeIndicatorCompact({
  outputValue,
  class: className = "",
}: Omit<MaraModeIndicatorProps, "feeRate">) {
  const shouldReduceMotion = AccessibilityUtils.prefersReducedMotion();

  return (
    <div
      class={`inline-flex items-center gap-1.5 bg-purple-900/20 border border-purple-500/30 rounded-full px-2.5 py-1 ${className}`}
      role="status"
      aria-label={`MARA Pool optimized mode: ${outputValue} sat outputs`}
    >
      <div
        class={`w-1.5 h-1.5 bg-purple-400 rounded-full ${
          shouldReduceMotion ? "" : "animate-pulse"
        }`}
      />
      <span class="text-xs text-purple-300 font-medium">
        MARA • {outputValue} sat
      </span>
    </div>
  );
}

// Badge variant for fee calculator
export function MaraModeBadge({
  class: className = "",
}: { class?: string }) {
  return (
    <div
      class={`inline-flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded px-2 py-0.5 ${className}`}
    >
      <div class="w-1 h-1 bg-purple-400 rounded-full" />
      <span class="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">
        MARA
      </span>
    </div>
  );
}
