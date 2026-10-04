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
}

/* ===== COMPONENT ===== */
/** Info icon button that opens the given modal. */
export function InfoButton(
  { modal, ariaLabel = "How-to" }: InfoButtonProps,
) {
  return (
    <div class={container2Icon}>
      <Icon
        type="iconButton"
        name="help"
        weight="normal"
        size="md"
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
