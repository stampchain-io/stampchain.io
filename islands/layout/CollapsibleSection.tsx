import { Icon } from "$icon";
import { transitionAll, transitionColors } from "$layout";
import { labelLogicResponsive } from "$text";
import { ComponentChildren, JSX } from "preact";
import { useState } from "preact/hooks";

// CollapsibleSection Component
export const CollapsibleSection = ({
  title,
  expanded,
  toggle,
  children,
  variant,
}: {
  title: string;
  expanded: boolean;
  toggle: () => void;
  children: ComponentChildren;
  variant: "collapsibleTitle" | "collapsibleSubTitle" | "collapsibleLabel";
  section?: string;
}): JSX.Element => {
  const [canHoverSelected, setCanHoverSelected] = useState(true);

  const handleClick = () => {
    toggle();
    setCanHoverSelected(false);
  };

  const handleMouseLeave = () => {
    setCanHoverSelected(true);
  };

  switch (variant) {
    case "collapsibleTitle": {
      return (
        <div class="[&+&]:mt-3">
          <button
            type="button"
            onClick={handleClick}
            onMouseLeave={handleMouseLeave}
            class={`flex items-center w-full justify-between ${transitionColors} group`}
            data-section-toggle
          >
            <span
              class={`
                font-light text-sm ${transitionColors}
                ${
                expanded
                  ? `text-color-primary-400 ${
                    canHoverSelected ? "group-hover:text-color-hover" : ""
                  }`
                  : `text-color-neutral-400 ${
                    canHoverSelected ? "group-hover:text-color-hover" : ""
                  }`
              }`}
            >
              {title}
            </span>

            <div
              class={`transform ${transitionAll} ${
                expanded ? "scale-y-[-1]" : ""
              }`}
            >
              <div
                class={`${
                  expanded
                    ? `stroke-color-primary-400 ${
                      canHoverSelected ? "group-hover:stroke-color-hover" : ""
                    }`
                    : `stroke-color-neutral-400 ${
                      canHoverSelected ? "group-hover:stroke-color-hover" : ""
                    }`
                } ${transitionColors}`}
              >
                <Icon
                  type="iconHover"
                  name="caretDown"
                  weight="normal"
                  size="md"
                  color="custom"
                />
              </div>
            </div>
          </button>

          <div
            class={`overflow-hidden ${transitionAll} ${
              expanded ? "max-h-[999px] opacity-100" : "max-h-0 opacity-0"
            }`}
            data-section-expanded={expanded}
          >
            <div class="">
              {children}
            </div>
          </div>
        </div>
      );
    }

    case "collapsibleSubTitle": {
      return (
        <div>
          <button
            type="button"
            onClick={handleClick}
            onMouseLeave={handleMouseLeave}
            class={`flex items-center w-full group ${transitionColors}`}
          >
            <div
              class={`transform ${transitionAll} ${
                expanded ? "scale-y-[-1]" : ""
              } ${
                expanded
                  ? `stroke-color-neutral-400 ${
                    canHoverSelected ? "group-hover:stroke-color-hover" : ""
                  }`
                  : `stroke-color-primary-400 ${
                    canHoverSelected ? "group-hover:stroke-color-hover" : ""
                  }`
              } ${transitionColors}`}
            >
              <Icon
                type="iconHover"
                name="caretDown"
                weight="normal"
                size="sm"
                color="custom"
              />
            </div>

            <span
              class={`${
                labelLogicResponsive(expanded, canHoverSelected)
              } font-light`}
            >
              {title}
            </span>
          </button>

          <div
            class={`overflow-hidden ${transitionAll} ${
              expanded ? "max-h-[999px] opacity-100" : "max-h-0 opacity-0"
            }`}
            data-section-expanded={expanded}
          >
            <div class="">
              {children}
            </div>
          </div>
        </div>
      );
    }

    case "collapsibleLabel": {
      return (
        <div
          class={`overflow-hidden ${transitionAll} ease-in-out ${
            expanded ? "max-h-[100px] opacity-100" : "max-h-0 opacity-0"
          }`}
          data-section-expanded={expanded}
        >
          <div class="">
            {children}
          </div>
        </div>
      );
    }

    default: {
      // This exhaustiveness check ensures all variants are handled
      const exhaustiveCheck: never = variant;
      return exhaustiveCheck;
    }
  }
};
