/* ===== INFO BUTTON ===== */
import { Icon } from "$icon";
import { openModal, stackModal } from "$islands/modal/states.ts";
import { containerIcon } from "$layout";
import type { ComponentChildren } from "preact";

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

/* ===== COMPONENT ===== */
/** Icon button that opens the given modal (help icon by default). */
export function InfoButton({
  modal,
  ariaLabel = "How-to",
  icon = "help",
  stack = false,
  variant = "pill",
}: InfoButtonProps) {
  const openInfo = (e: MouseEvent) => {
    e.preventDefault();
    const show = stack ? stackModal : openModal;
    show(modal, "zoomInOut");
  };

  if (variant === "plain") {
    return (
      <Icon
        type="iconButton"
        name={icon}
        weight="bold"
        size="xl"
        color="neutral600"
        ariaLabel={ariaLabel}
        onClick={openInfo}
      />
    );
  }

  return (
    <div class={containerIcon}>
      <Icon
        type="iconButton"
        name={icon}
        weight="normal"
        size="containerIcon"
        color="neutral400"
        ariaLabel={ariaLabel}
        onClick={openInfo}
      />
    </div>
  );
}
