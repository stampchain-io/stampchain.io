import { Icon } from "$icon";
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
        <div>
          <button
            type="button"
            onClick={handleClick}
            onMouseLeave={handleMouseLeave}
            class="flex items-center w-full justify-between pt-2 pb-4 tablet:pt-2 tablet:pb-3 transition-colors duration-200 group"
            data-section-toggle
          >
            <span
              class={`
                font-light tablet:font-normal text-lg tablet:text-sm transition-colors duration-200
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
              class={`transform transition-all duration-400 ${
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
                } transition-colors duration-200`}
              >
                <Icon
                  type="iconButton"
                  name="caretDown"
                  weight="normal"
                  size="xsR"
                  color="custom"
                  className="mb-[3px]"
                />
              </div>
            </div>
          </button>

          <div
            class={`overflow-hidden transition-all duration-400 ${
              expanded ? "max-h-[999px] opacity-100" : "max-h-0 opacity-0"
            }`}
            data-section-expanded={expanded}
          >
            <div class="-mt-2 tablet:-mt-1 pb-4 pl-0.5">
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
            class="flex items-center w-full mt-2 tablet:mt-1.5 group transition-colors duration-200"
          >
            <div
              class={`transform transition-all duration-400 ${
                expanded ? "scale-y-[-1]" : "mb-0.5"
              } ${
                expanded
                  ? `stroke-color-neutral-400 ${
                    canHoverSelected ? "group-hover:stroke-color-hover" : ""
                  }`
                  : `stroke-color-primary-400 ${
                    canHoverSelected ? "group-hover:stroke-color-hover" : ""
                  }`
              } transition-colors duration-200`}
            >
              <Icon
                type="iconButton"
                name="caretDown"
                weight="normal"
                size="xxsR"
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
            class={`overflow-hidden transition-all duration-400 ${
              expanded ? "max-h-[999px] opacity-100" : "max-h-0 opacity-0"
            }`}
            data-section-expanded={expanded}
          >
            <div class="pt-3.5 pl-0.5">
              {children}
            </div>
          </div>
        </div>
      );
    }

    case "collapsibleLabel": {
      return (
        <div
          class={`overflow-hidden transition-all duration-400 ease-in-out ${
            expanded ? "max-h-[100px] opacity-100" : "max-h-0 opacity-0"
          }`}
          data-section-expanded={expanded}
        >
          <div class="pt-2 pl-0.5">
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
