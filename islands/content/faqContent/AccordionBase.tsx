/* ===== ACCORDION BASE COMPONENT ===== */
import { Icon } from "$icon";
import { text } from "$text";
import { signal } from "@preact/signals";
import { JSX } from "preact";

/* ===== STATE  ===== */
// Create a shared signal outside the component
const activeAccordion = signal<string | null>(null);

/* ===== COMPONENT ===== */
export const Accordion = (
  { title, children }: { title: string; children: JSX.Element },
) => {
  /* ===== ACCORDION STATE ===== */
  const isOpen = activeAccordion.value === title;

  /* ===== EVENT HANDLERS ===== */
  const toggleAccordion = () => {
    activeAccordion.value = isOpen ? null : title;
  };

  /* ===== RENDER ===== */
  return (
    <div class="w-full">
      {/* Accordion Header */}
      <div
        class="flex justify-between items-center cursor-pointer group"
        onClick={toggleAccordion}
      >
        {/* Title with Gradient Styling - uses bg-gradient-to-r color-neutral-gradient color-gradient-hover instead of headingGreyLDLink because group-hover overrides the hover state */}
        <h2
          class={`font-bold text-xl tracking-wide bg-gradient-to-r color-neutral-gradient color-gradient-hover group-hover:[background:none_!important] group-hover:[-webkit-text-fill-color:var(--color-grey-semilight)_!important] group-hover:[text-fill-color:var(--color-grey-semilight)_!important] transition-colors duration-200
            ${
            isOpen
              ? "[background:none_!important] [-webkit-text-fill-color:var(--color-grey-semilight)_!important] [text-fill-color:var(--color-grey-semilight)_!important] "
              : ""
          }`}
        >
          {title}
        </h2>

        {/* Toggle Icon */}
        <span
          class={`transition-transform duration-400 ${
            isOpen
              ? "stroke-color-grey-light rotate-45"
              : "stroke-color-grey-semidark group-hover:stroke-color-grey-light transition-colors duration-400 rotate-0"
          }`}
        >
          <Icon
            type="iconButton"
            name="expand"
            weight="bold"
            size="xsR"
            color="custom"
            className="-mt-[3px]"
          />
        </span>
      </div>

      {/* Accordion Content with Animation */}
      <div
        class={` ${
          isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-10"
        } mt-3 overflow-hidden transition-all duration-500`}
      >
        <div
          class={`${text} [&>div>ul]:list-disc [&>div>ul]:list-inside [&>div>ul]:mb-6 [&>div>ul]:flex [&>div>ul]:flex-col [&>div>ul]:gap-1.5 mb-6`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
