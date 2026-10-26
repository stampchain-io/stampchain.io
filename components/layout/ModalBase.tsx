import { Icon } from "$icon";
import {
  closeModal,
  closeStackedModal,
  getTopModalContainer,
  shouldCloseLayerOnKey,
  STACKED_MODAL_CONTAINER_ID,
  useModalLayer,
} from "$islands/modal/states.ts";
import { container0, shadow } from "$layout";
import { logger } from "$lib/utils/logger.ts";
import { tooltipIcon } from "$notification";
import {
  subtitleNeutral,
  subtitlePrimary,
  titleNeutral,
  titlePrimary,
} from "$text";
import type { ModalBaseProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

export function ModalBase({
  onClose,
  title,
  subtitle,
  variant = "primary",
  children,
  className = "",
  contentClassName = "",
  hideHeader = false,
  headerAction,
}: ModalBaseProps) {
  const { layer, containerId, close } = useModalLayer();
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

    const modalContainer = document.getElementById(containerId);
    if (modalContainer) {
      modalContainer.classList.add("out");
    }

    setTimeout(() => {
      if (onClose) {
        onClose();
      }
      close();
    }, 600);
  };

  // Only the top-most layer closes. Key repeat is ignored so holding Escape
  // does not also dismiss the modal underneath once this one unmounts.
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      if (!shouldCloseLayerOnKey(layer, e)) return;
      handleClose();
    };

    document.addEventListener("keydown", handleKeyboardShortcut);
    return () =>
      document.removeEventListener("keydown", handleKeyboardShortcut);
  }, [onClose, layer, containerId]);

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
        relative w-[90vw] min-[420px]:w-[360px] p-3
        ${container0} rounded-3xl
        border border-color-neutral-800
        ${shadow} ${className}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      <div class={`relative ${contentClassName}`}>
        {!hideHeader && (
          <>
            {headerAction && (
              <div class="absolute -top-2 -left-2">
                {headerAction}
              </div>
            )}

            <div
              class="absolute -top-2 -right-2 ms-auto cursor-pointer"
              onMouseEnter={handleCloseMouseEnter}
              onMouseLeave={handleCloseMouseLeave}
            >
              <Icon
                type="iconButton"
                name="close"
                size="xl"
                weight="bold"
                color="neutral600"
                ariaLabel="Close modal"
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
              <h2
                class={`${
                  variant === "neutral" ? titleNeutral : titlePrimary
                } ${subtitle ? "pt-3" : "py-3"}`}
              >
                {title}
              </h2>
              {subtitle && (
                <h4
                  class={`${
                    variant === "neutral" ? subtitleNeutral : subtitlePrimary
                  } mb-3`}
                >
                  {subtitle}
                </h4>
              )}
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

  const modalContainer = getTopModalContainer();
  const stacked = modalContainer?.id === STACKED_MODAL_CONTAINER_ID;
  if (modalContainer) {
    modalContainer.classList.add("out");
  }

  setTimeout(() => {
    if (stacked) {
      closeStackedModal();
    } else {
      closeModal();
    }
  }, 600);
};
