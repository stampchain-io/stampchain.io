import { button } from "$button";
import { useState } from "preact/hooks";

export const ToggleButton = ({
  options,
  selected,
  onChange,
  mode = "single",
  size = "smR",
  spacing = "normal",
  disabledOptions = [],
  alwaysSelectedOptions = [],
  color = "primary",
  className = "",
}: {
  options: string[];
  selected: string | string[];
  onChange: (value: string | string[]) => void;
  mode?: "single" | "multi";
  size:
    | "xxs"
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "xxsR"
    | "xsR"
    | "smR"
    | "mdR"
    | "lgR";
  spacing?: "normal" | "tight" | "even" | "evenFullwidth";
  disabledOptions?: string[];
  alwaysSelectedOptions?: string[];
  color?:
    | "grey"
    | "purple"
    | "primary"
    | "secondary"
    | "test"
    | "custom";
  className?: string;
}) => {
  const [canHoverSelected, setCanHoverSelected] = useState<
    Record<string, boolean>
  >(
    Object.fromEntries(options.map((opt) => [opt, true])),
  );

  const handleClick = (option: string) => {
    // Don't handle clicks on disabled or always-selected options
    if (
      disabledOptions.includes(option) || alwaysSelectedOptions.includes(option)
    ) {
      return;
    }

    if (mode === "single") {
      onChange(option);
    } else {
      // Multi-select mode
      const currentSelection = Array.isArray(selected) ? selected : [];
      const isSelected = currentSelection.includes(option);

      if (isSelected) {
        onChange(currentSelection.filter((item) => item !== option));
      } else {
        onChange([...currentSelection, option]);
      }
    }

    // ALWAYS disable hover immediately after click - like filter does
    setTimeout(() => {
      setCanHoverSelected((prev) => ({ ...prev, [option]: false }));
    }, 0);
  };

  const handleMouseLeave = (option: string) => {
    // Re-enable hover when mouse leaves
    setCanHoverSelected((prev) => ({ ...prev, [option]: true }));
  };

  const isOptionSelected = (option: string): boolean => {
    if (mode === "single") {
      return selected === option;
    }
    return Array.isArray(selected) && selected.includes(option);
  };

  const getButtonClass = (option: string) => {
    const isSelected = isOptionSelected(option);
    const isDisabled = disabledOptions.includes(option);
    const isAlwaysSelected = alwaysSelectedOptions.includes(option);
    const canHover = canHoverSelected[option];

    if (isAlwaysSelected) {
      return `${button("flat", color, size)} !cursor-default`;
    }

    if (isDisabled) {
      return `${
        button("outline", color, size, {
          disabled: true,
        })
      }`;
    }

    if (isSelected) {
      // Selected state (flat)
      if (canHover) {
        // With hover - use flat
        return button("flat", color, size);
      } else {
        // Without hover - use flat
        return `${button("flat", color, size)}`;
      }
    } else {
      // Unselected state (outline)
      if (canHover) {
        // With hover - use outline
        return button("outline", color, size);
      } else {
        // Without hover - use outline
        return `${button("outline", color, size)}`;
      }
    }
  };

  // Container class based on spacing type
  const getContainerClass = () => {
    switch (spacing) {
      case "normal":
        return "flex gap-5";
      case "tight":
        return "flex gap-2.5";
      case "even":
        return "flex justify-between";
      case "evenFullwidth":
        return "flex gap-5 w-full";
    }
  };

  return (
    <div class={getContainerClass()}>
      {options.map((option) => {
        return (
          <div
            key={option}
            class={`relative group ${
              spacing === "evenFullwidth" ? "flex-1" : ""
            }`}
          >
            <button
              type="button"
              class={`${getButtonClass(option)} ${
                spacing === "evenFullwidth" ? "w-full" : ""
              } ${className}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClick(option);
              }}
              onMouseLeave={() => handleMouseLeave(option)}
            >
              {option.toUpperCase()}
            </button>
          </div>
        );
      })}
    </div>
  );
};
