import { ModalBase } from "$components/layout/ModalBase.tsx";
import { CloseIcon } from "$icon";
import { container1 } from "$layout";
import { tooltipIcon } from "$notification";
import { titlePrimary } from "$text";
import type { MaraServiceUnavailableModalProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

/**
 * Modal displayed when MARA service is unavailable
 * Offers options to switch to standard mode or retry
 */
export function MaraServiceUnavailableModal({
  isOpen: _isOpen,
  onSwitchToStandard,
  onRetry,
  onClose,
}: MaraServiceUnavailableModalProps) {
  // Close tooltip state (copied from ModalBase)
  const [isCloseTooltipVisible, setIsCloseTooltipVisible] = useState(false);
  const [allowCloseTooltip, setAllowCloseTooltip] = useState(true);
  const closeTooltipTimeoutRef = useRef<number | null>(null);

  const handleCloseMouseEnter = () => {
    if (allowCloseTooltip) {
      if (closeTooltipTimeoutRef.current) {
        globalThis.clearTimeout(closeTooltipTimeoutRef.current);
      }
      closeTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsCloseTooltipVisible(true);
      }, 1500);
    }
  };

  const handleCloseMouseLeave = () => {
    if (closeTooltipTimeoutRef.current) {
      globalThis.clearTimeout(closeTooltipTimeoutRef.current);
    }
    setIsCloseTooltipVisible(false);
    setAllowCloseTooltip(true);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTooltipTimeoutRef.current) {
        globalThis.clearTimeout(closeTooltipTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ModalBase
      title="MARA Service Unavailable"
      onClose={onClose}
      className={`!w-[400px] mobileLg:!w-[450px] ${container1} !bg-gradient-to-br !from-color-grey-dark/70 !to-color-grey-dark/80`}
      contentClassName="space-y-4"
      hideHeader
    >
      {/* Custom Header with Two-Line Title */}
      <div class="relative">
        <div
          class="absolute top-0 right-0 -mr-1.5 -mt-1.5 ms-auto cursor-pointer"
          onMouseEnter={handleCloseMouseEnter}
          onMouseLeave={handleCloseMouseLeave}
        >
          <CloseIcon
            size="sm"
            weight="bold"
            color="purpleLight"
            onClick={onClose}
          />
          <div
            class={`${tooltipIcon} ${
              isCloseTooltipVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            CLOSE
          </div>
        </div>

        <div class="w-full text-center">
          <h2 class={`${titlePrimary} pt-6 pb-9 leading-tight`}>
            MARA Service<br />Temporarily Unavailable
          </h2>
        </div>
      </div>

      <div class="space-y-5 text-color-grey-light">
        <div
          class={`${container1} bg-gradient-to-br from-red-900/15 to-red-800/25 border-red-500/20 p-5`}
        >
          <div class="flex items-start gap-4">
            <div class="text-red-400 text-2xl mt-0.5 drop-shadow-sm">🚫</div>
            <div class="flex-1">
              <h3 class="text-red-200 font-semibold mb-3 text-base">
                Service Connection Error
              </h3>
              <p class="text-sm text-color-grey-light mb-3">
                The MARA pool service is currently unavailable due to temporary
                connection issues.
              </p>
              <p class="text-sm text-color-grey-light">
                This may be due to maintenance or high traffic. You can either
                retry or switch to standard stamping mode.
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div
            class={`${container1} bg-gradient-to-br from-blue-900/10 to-blue-800/15 border-blue-500/15 p-4`}
          >
            <div class="flex items-start gap-4">
              <div class="text-blue-400 text-xl mt-0.5 drop-shadow-sm">💡</div>
              <div class="flex-1">
                <strong class="text-blue-200 font-semibold text-sm">
                  Your Options:
                </strong>
                <ul class="mt-2 ml-4 space-y-1.5 list-disc text-color-grey-light text-sm">
                  <li>
                    Switch to Standard Mode: Use regular 333 sat dust outputs
                  </li>
                  <li>Retry MARA Mode: Attempt to reconnect to MARA service</li>
                  <li>
                    Wait and Try Later: Service typically resumes within minutes
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div
            class={`${container1} bg-gradient-to-br from-yellow-900/10 to-yellow-800/15 border-yellow-500/15 p-4`}
          >
            <div class="flex items-start gap-4">
              <div class="text-yellow-400 text-xl mt-0.5 drop-shadow-sm">
                ⚠️
              </div>
              <div class="flex-1">
                <strong class="text-yellow-200 font-semibold text-sm">
                  Note:
                </strong>
                <p class="mt-2 text-color-grey-light text-sm">
                  Standard mode uses 333 sat outputs and works with all Bitcoin
                  nodes, but may have slightly higher fees.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onRetry}
          class={`flex-1 px-4 py-2 rounded-2xl transition-colors ${container1} bg-gradient-to-br from-color-grey-dark/20 to-color-grey-dark/40 text-color-grey-light hover:from-color-grey-dark/30 hover:to-color-grey-dark/50`}
        >
          Retry MARA
        </button>
        <button
          type="button"
          onClick={onSwitchToStandard}
          class={`flex-1 px-4 py-2 rounded-2xl transition-colors font-semibold ${container1} bg-gradient-to-br from-purple-600/80 to-purple-700/80 text-white hover:from-purple-600 hover:to-purple-700`}
        >
          Switch to Standard
        </button>
      </div>
    </ModalBase>
  );
}
