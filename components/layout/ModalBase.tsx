import { CloseIcon } from "$icon";
import { closeModal } from "$islands/modal/states.ts";
import { container0, shadow } from "$layout";
import { logger } from "$lib/utils/logger.ts";
import { tooltipIcon } from "$notification";
import { titleNeutral } from "$text";
import type { ModalBaseProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

export function ModalBase({
  onClose,
  title,
  children,
  className = "",
  contentClassName = "",
  hideHeader = false,
}: ModalBaseProps) {
  const [isCloseTooltipVisible, setIsCloseTooltipVisible] = useState(false);
  const [allowCloseTooltip, setAllowCloseTooltip] = useState(true);
  const [closeTooltipText, setCloseTooltipText] = useState("CLOSE");
  const closeTooltipTimeoutRef = useRef<number | null>(null);

  const handleCloseMouseEnter = () => {
    if (allowCloseTooltip) {
      setCloseTooltipText("CLOSE");

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

  const handleClose = () => {
    logger.debug("ui", {
      message: "Modal closing from ModalBase",
      component: "ModalBase",
    });

    const modalContainer = document.getElementById("animation-modal-container");
    if (modalContainer) {
      modalContainer.classList.add("out");
    }

    setTimeout(() => {
      if (onClose) {
        onClose();
      }
      closeModal();
    }, 600);
  };

  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyboardShortcut);
    return () =>
      document.removeEventListener("keydown", handleKeyboardShortcut);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (closeTooltipTimeoutRef.current) {
        globalThis.clearTimeout(closeTooltipTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div /* similar to container1 design on the drawers - importing the class consts doesn't display properly */
      className={`
        relative w-[340px] min-[420px]:w-[360px] mobileMd:w-[380px] p-5
        ${container0} rounded-3xl
        border border-color-border/50
        ${shadow} ${className}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      <div class={`relative ${contentClassName}`}>
        {!hideHeader && (
          <>
            <div
              class="absolute top-0 right-0 -mr-1.5 -mt-1.5 ms-auto cursor-pointer"
              onMouseEnter={handleCloseMouseEnter}
              onMouseLeave={handleCloseMouseLeave}
            >
              <CloseIcon
                size="sm"
                weight="bold"
                color="greyLight"
                onClick={() => handleClose()}
              />
              <div
                class={`${tooltipIcon} ${
                  isCloseTooltipVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                {closeTooltipText}
              </div>
            </div>

            <div class="w-full text-center">
              <h2 class={`${titleNeutral} pb-6`}>
                {title}
              </h2>
            </div>
          </>
        )}

        {children}
      </div>
    </div>
  );
}

export const handleModalClose = () => {
  logger.debug("ui", {
    message: "Modal closing from ModalBase",
    component: "ModalBase",
  });

  const modalContainer = document.getElementById("animation-modal-container");
  if (modalContainer) {
    modalContainer.classList.add("out");
  }

  setTimeout(() => {
    closeModal();
  }, 600);
};
