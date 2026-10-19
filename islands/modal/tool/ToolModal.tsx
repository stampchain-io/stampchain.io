/* ===== TOOL MODAL COMPONENT ===== */
/* Tool shells: title, optional subtitle, and a how-to opened on top. */
import { InfoButton } from "$islands/button/InfoButton.tsx";
import { openModal } from "$islands/modal/states.ts";
import { ModalBase } from "$layout";
import type { ComponentChildren } from "preact";

/** Open a tool modal. Slides up on open and down on close. */
export function openToolModal(content: ComponentChildren) {
  openModal(content, "slideUpDown");
}

/* ===== TYPES ===== */
interface ToolModalProps {
  title: string;
  /** Optional line under the title. */
  subtitle?: string;
  /** Info modal opened from the header button, e.g. `<SRC20TransferInfo />`. */
  info: ComponentChildren;
  children: ComponentChildren;
}

/* ===== COMPONENT ===== */
export function ToolModal(
  { title, subtitle, info, children }: ToolModalProps,
) {
  return (
    <ModalBase
      title={title}
      subtitle={subtitle}
      variant="primary"
      className="max-w-[85vw] mobileMd:w-[360px]"
      headerAction={
        <InfoButton
          modal={info}
          stack
          variant="plain"
          ariaLabel={`${title} how-to`}
        />
      }
    >
      <div class="flex flex-col w-full min-w-0 max-h-[80vh] gap-3
          overflow-x-hidden overflow-y-auto scrollbar-background-layer1">
        {children}
      </div>
    </ModalBase>
  );
}
