// islands/modal/ModalOverlay.tsx
import type { ModalLayerValue } from "$islands/modal/states.ts";
import {
  BASE_MODAL_CONTAINER_ID,
  closeModal,
  closeStackedModal,
  isTopModalLayer,
  ModalLayerContext,
  shouldCloseLayerOnKey,
  STACKED_MODAL_CONTAINER_ID,
} from "$islands/modal/states.ts";
import {
  focusableWithin,
  nextFocusTarget,
} from "$lib/utils/ui/accessibility/focusTrap.ts";
import type { ModalOverlayProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

export default function ModalOverlay({
  handleClose,
  children,
  animation = "slideUpDown", // default animation
  layer = "base",
}: ModalOverlayProps) {
  const [status, setStatus] = useState<boolean>(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [labelId, setLabelId] = useState<string | undefined>(undefined);

  const containerId = layer === "stacked"
    ? STACKED_MODAL_CONTAINER_ID
    : BASE_MODAL_CONTAINER_ID;

  const layerValue: ModalLayerValue = {
    layer,
    containerId,
    close: layer === "stacked" ? closeStackedModal : closeModal,
  };

  const handleModalClose = () => {
    setStatus(true);
    setTimeout(() => {
      handleClose?.();
    }, 500); // Animation duration
  };

  // Keyboard event handling. Only the top-most layer reacts, and holding
  // Escape (key repeat) must not also close the modal underneath.
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      if (!shouldCloseLayerOnKey(layer, e)) return;
      handleModalClose();
    };

    document.addEventListener("keydown", handleKeyboardShortcut);
    return () =>
      document.removeEventListener("keydown", handleKeyboardShortcut);
  }, [handleClose, layer]);

  // Accessibility: move focus into the dialog when it opens, name it after
  // its first heading, and give focus back to whatever opened it on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Focus the dialog itself rather than its first field, so phones do not
    // pop the keyboard; Tab then moves into the form.
    dialog.focus({ preventScroll: true });

    const labelFromHeading = () => {
      const heading = dialog.querySelector<HTMLElement>("h1,h2,h3,h4,h5,h6");
      if (!heading) return false;
      if (!heading.id) heading.id = `${containerId}-title`;
      setLabelId(heading.id);
      return true;
    };
    // Tool content can render a moment later (lazy islands), so wait for it.
    let observer: MutationObserver | undefined;
    if (!labelFromHeading()) {
      observer = new MutationObserver(() => {
        if (labelFromHeading()) observer?.disconnect();
      });
      observer.observe(dialog, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      if (opener?.isConnected && typeof opener.focus === "function") {
        opener.focus({ preventScroll: true });
      }
    };
  }, []);

  // Keep Tab inside the top-most dialog so keyboard users cannot reach the
  // page (or the modal underneath) while a transaction form is open.
  useEffect(() => {
    const trapTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !isTopModalLayer(layer)) return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const target = nextFocusTarget(
        focusableWithin(dialog),
        document.activeElement as HTMLElement | null,
        e.shiftKey,
        // The dialog element itself counts as outside, so Tab and Shift+Tab
        // from it land on the first and last field.
        (el) => !!el && el !== dialog && dialog.contains(el),
      );
      if (target === null) return;
      e.preventDefault();
      (target === "dialog" ? dialog : target).focus();
    };
    document.addEventListener("keydown", trapTab);
    return () => document.removeEventListener("keydown", trapTab);
  }, [layer]);

  return (
    <ModalLayerContext.Provider value={layerValue}>
      {/* Modal container */}
      <div
        class={`animation-modal-container ${animation} ${status ? "out" : ""}`}
        id={containerId}
        onClick={handleModalClose}
      >
        <div class="animation-modal-background">
          <div
            class="animation-modal outline-none"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            {...(labelId
              ? { "aria-labelledby": labelId }
              : { "aria-label": "Dialog" })}
          >
            {children}
          </div>
        </div>
      </div>
    </ModalLayerContext.Provider>
  );
}
