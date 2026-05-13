import { ModalBase } from "$components/layout/ModalBase.tsx";
import { CloseIcon } from "$icon";
import { container1 } from "$layout";
import { tooltipIcon } from "$notification";
import { titlePrimaryLD } from "$text";
import type { MaraModeWarningModalProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

/**
 * Modal warning users about MARA mode transaction behavior
 * Shows before wallet signing to ensure users understand the process
 */
export function MaraModeWarningModal({
  outputValue,
  onConfirm,
  onCancel,
}: MaraModeWarningModalProps) {
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

  const handleConfirm = () => {
    onConfirm?.();
    // Modal should close automatically via parent state management
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
      title="MARA Mode Transaction Warning"
      onClose={onCancel || (() => {})}
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
            onClick={onCancel || (() => {})}
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
          <h2 class={`${titlePrimaryLD} pt-6 pb-9 leading-tight`}>
            MARA Mode<br />Transaction Warning
          </h2>
        </div>
      </div>

      <div class="space-y-5 text-color-grey-light">
        <div
          class={`${container1} bg-gradient-to-br from-orange-900/15 to-orange-800/25 border-orange-500/20 p-5`}
        >
          <div class="flex items-start gap-4">
            <div class="text-orange-400 text-2xl mt-0.5 drop-shadow-sm">⚠️</div>
            <div class="flex-1">
              <h3 class="text-orange-200 font-semibold mb-3 text-base">
                Non-Standard Transaction
              </h3>
              <p class="text-sm text-color-grey-light mb-3">
                This transaction contains non-standard outputs ({outputValue}
                {" "}
                sat) and must be submitted directly to the MARA pool.
              </p>
              <p class="text-sm text-color-grey-light">
                <strong class="text-orange-200">
                  Your wallet cannot broadcast this transaction.
                </strong>{" "}
                After signing, it will be automatically submitted to MARA.
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div
            class={`${container1} bg-gradient-to-br from-blue-900/10 to-blue-800/15 border-blue-500/15 p-4`}
          >
            <div class="flex items-start gap-4">
              <div class="text-blue-400 text-xl mt-0.5 drop-shadow-sm">📋</div>
              <div class="flex-1">
                <strong class="text-blue-200 font-semibold text-sm">
                  What happens next:
                </strong>
                <ol class="mt-2 ml-4 space-y-1.5 list-decimal text-color-grey-light text-sm">
                  <li>Your wallet will sign the transaction (no broadcast)</li>
                  <li>The signed transaction will be sent to MARA pool</li>
                  <li>MARA will handle mining and confirmation</li>
                  <li>You'll receive a transaction ID for tracking</li>
                </ol>
              </div>
            </div>
          </div>

          <div
            class={`${container1} bg-gradient-to-br from-purple-900/10 to-purple-800/15 border-purple-500/15 p-4`}
          >
            <div class="flex items-start gap-4">
              <div class="text-purple-400 text-xl mt-0.5 drop-shadow-sm">
                💡
              </div>
              <div class="flex-1">
                <strong class="text-purple-200 font-semibold text-sm">
                  MARA Pool Benefits:
                </strong>
                <p class="mt-2 text-color-grey-light text-sm">
                  Optimized for low-dust transactions with better confirmation
                  rates and fee efficiency.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel || (() => {})}
          class={`flex-1 px-4 py-2 rounded-2xl transition-colors ${container1} bg-gradient-to-br from-color-grey-dark/20 to-color-grey-dark/40 text-color-grey-light hover:from-color-grey-dark/30 hover:to-color-grey-dark/50`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          class={`flex-1 px-4 py-2 rounded-2xl transition-colors font-semibold ${container1} bg-gradient-to-br from-purple-600/80 to-purple-700/80 text-white hover:from-purple-600 hover:to-purple-700`}
        >
          I Understand, Continue
        </button>
      </div>
    </ModalBase>
  );
}
