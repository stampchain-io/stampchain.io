// islands/modal/ModalOverlay.tsx
import type { ModalLayerValue } from "$islands/modal/states.ts";
import {
  BASE_MODAL_CONTAINER_ID,
  closeModal,
  closeStackedModal,
  ModalLayerContext,
  STACKED_MODAL_CONTAINER_ID,
  stackedModal,
} from "$islands/modal/states.ts";
import type { ModalOverlayProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

export default function ModalOverlay({
  handleClose,
  children,
  animation = "slideUpDown", // default animation
  layer = "base",
}: ModalOverlayProps) {
  const [status, setStatus] = useState<boolean>(false);
  const focusTrapRef = useRef<HTMLDivElement>(null);

  const containerId = layer === "stacked"
    ? STACKED_MODAL_CONTAINER_ID
    : BASE_MODAL_CONTAINER_ID;

  const layerValue: ModalLayerValue = {
    layer,
    containerId,
    close: layer === "stacked" ? closeStackedModal : closeModal,
  };

  // Debug logging for development
  console.log("ModalOverlay rendering with:", {
    hasChildren: !!children,
    animation,
    status,
    layer,
  });

  const handleModalClose = () => {
    setStatus(true);
    focusTrapRef.current?.focus();
    setTimeout(() => {
      handleClose?.();
    }, 500); // Animation duration
  };

  // Keyboard event handling. Only the top-most layer reacts, and holding
  // Escape (key repeat) must not also close the modal underneath.
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.repeat) return;
      if (layer === "base" && stackedModal.value.isOpen) return;
      handleModalClose();
    };

    document.addEventListener("keydown", handleKeyboardShortcut);
    return () =>
      document.removeEventListener("keydown", handleKeyboardShortcut);
  }, [handleClose, layer]);

  return (
    <ModalLayerContext.Provider value={layerValue}>
      {/* Focus trap element */}
      <div
        ref={focusTrapRef}
        tabIndex={-1}
        style={{ position: "fixed", opacity: 0, pointerEvents: "none" }}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        class={`animation-modal-container ${animation} ${status ? "out" : ""}`}
        id={containerId}
        onClick={handleModalClose}
      >
        <div class="animation-modal-background">
          <div class="animation-modal">
            {/* Debug wrapper from component version */}
            <div data-debug="modal-content">
              {children}
            </div>
          </div>
        </div>
      </div>
    </ModalLayerContext.Provider>
  );
}
