/* ===== INFO BUTTON ===== */
import { Icon } from "$icon";
import { openModal } from "$islands/modal/states.ts";
import { container2Icon } from "$layout";
import type { ComponentChildren } from "preact";

/* ===== TYPES ===== */
interface InfoButtonProps {
  /** Complete modal, e.g. `<StampCreateClassicHowto />` (renders `ModalBase`). */
  modal: ComponentChildren;
  ariaLabel?: string;
  /** Icon name (defaults to the help icon). */
  icon?: string;
}

/* ===== COMPONENT ===== */
/** Icon button that opens the given modal (help icon by default). */
export function InfoButton(
  { modal, ariaLabel = "How-to", icon = "help" }: InfoButtonProps,
) {
  return (
    <div class={container2Icon}>
      <Icon
        type="iconButton"
        name={icon}
        weight="normal"
        size="containerIcon"
        color="neutral400"
        ariaLabel={ariaLabel}
        onClick={(e) => {
          e.preventDefault();
          openModal(modal, "zoomInOut");
        }}
      />
    </div>
  );
}
