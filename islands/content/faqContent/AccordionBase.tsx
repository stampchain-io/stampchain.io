/* ===== ACCORDION BASE COMPONENT ===== */
import { Icon } from "$icon";
import { transitionAll, transitionColors, transitionTransform } from "$layout";
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
        {/* group-hover overrides --gradient-stop-* to a custom grey instead of the default primary-400 used by color-gradient-hover */}
        <h2
          class={`font-bold text-lg text-color-neutral-200 group-hover:text-color-hover tracking-wide
            ${isOpen ? "text-color-primary-400" : ""}`}
        >
          {title}
        </h2>

        {/* Toggle Icon */}
        <span
          class={`${transitionTransform} ${
            isOpen
              ? "stroke-color-hover rotate-45"
              : `stroke-color-neutral-200 group-hover:stroke-color-hover ${transitionColors} rotate-0`
          }`}
        >
          <Icon
            type="iconButton"
            name="expand"
            weight="bold"
            size="lg"
            color="custom"
          />
        </span>
      </div>

      {/* Accordion Content with Animation */}
      <div
        class={` ${
          isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-10"
        } overflow-hidden ${transitionAll}`}
      >
        <div
          class={`${text} [&>div>ul]:list-disc [&>div>ul]:list-inside [&>div>ul]:mb-6 [&>div>ul]:flex [&>div>ul]:flex-col [&>div>ul]:gap-1.5 mb-3`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
