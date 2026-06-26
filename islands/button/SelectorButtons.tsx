import { buttonHover, buttonStyles, color, state } from "$button";
import { container2, transitionColors } from "$layout";
import type { SelectorButtonsProps } from "$types/ui.d.ts";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */
interface SelectorOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/* ===== COMPONENT ===== */
export const SelectorButtons = ({
  options,
  value,
  defaultValue,
  onChange,
  size,
  color: colorProp,
  className = "",
  disabled: disabledProp = false,
}: SelectorButtonsProps) => {
  const [selectedValue, setSelectedValue] = useState<string>(() => {
    return value !== undefined
      ? value
      : (defaultValue || options[0]?.value || "");
  });
  const [isMounted, setIsMounted] = useState(false);
  // Generate unique name for this instance to avoid radio button conflicts
  const uniqueName = useRef(
    `selector-${Math.random().toString(36).substr(2, 9)}`,
  );
  // Track the last prop value to detect actual changes (not navigation flickers)
  const lastPropValue = useRef(value);

  // Set mounted flag after initial render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update internal state when controlled value actually changes (not during navigation)
  useEffect(() => {
    if (value !== undefined && value !== lastPropValue.current) {
      lastPropValue.current = value;
      setSelectedValue(value);
    }
  }, [value]);

  // Handle option selection
  const handleOptionChange = useCallback((optionValue: string) => {
    if (disabledProp) return;

    const option = options.find((opt) => opt.value === optionValue);
    if (option?.disabled) return;

    // Optimistic update - set both local state and ref to prevent flicker during navigation
    setSelectedValue(optionValue);
    lastPropValue.current = optionValue;
    onChange?.(optionValue);
  }, [disabledProp, options, onChange]);

  // Use imported color from buttonStyles (needs the css variables)
  const colorVariants = {
    grey: color.grey,
    purple: color.purple,
  } as const satisfies Record<string, string>;

  // Helper function to determine if an option is disabled
  const isOptionDisabled = useCallback((option: SelectorOption) => {
    return option.disabled || disabledProp;
  }, [disabledProp]);

  // Derive pill position from selected index using pure CSS calc — no DOM measurement needed.
  // All columns are equal (1fr), container has p-0.5 (2px padding), labels have mx-0.5 (2px margin).
  // pill left  = 2px (container padding) + i * columnWidth + 2px (label margin)
  //            = calc(2px + i * (100% - 2px) / N)
  // pill width = columnWidth - 2px (label margins)
  //            = calc((100% - 2px) / N - 2px)
  const N = options.length;
  const selectedIndex = options.findIndex((o) => o.value === selectedValue);

  return (
    <div
      class={`relative grid p-0 select-none
        ${container2} rounded-full
        ${
        (colorProp === "purple" || colorProp === "grey")
          ? colorVariants[colorProp]
          : colorVariants.grey
      }
        ${disabledProp ? state.disabled : ""}
        ${className}
      `}
      style={{
        gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
      }}
    >
      {/* Pill — hidden during SSR, positioned via pure CSS math after hydration */}
      {isMounted && selectedIndex !== -1 && (
        <div
          class={`!absolute top-0.5 bottom-0.5 z-10 ${buttonStyles.variant.flat}`}
          style={{
            left: `calc(2px + ${selectedIndex} * (100% - 2px) / ${N})`,
            width: `calc((100% - 2px) / ${N} - 2px)`,
            transition: "left 200ms ease-out",
          }}
        />
      )}

      {/* Options */}
      {options.map((option, _index) => {
        const optionDisabled = isOptionDisabled(option);
        const isSelected = selectedValue === option.value;

        // All cursor/disabled state lives on the wrapper div only.
        const wrapperClass = optionDisabled
          ? state.disabled
          : isSelected
          ? "!cursor-default"
          : isMounted
          ? "!cursor-pointer"
          : "";

        // Only appearance (color/bg) on the label — no cursor or disabled duplication.
        const labelClass = isSelected && isMounted
          ? `mx-0.5 text-color-neutral-1000 ${transitionColors}`
          : `mx-0.5 bg-transparent text-color-neutral-500 ${
            isMounted
              ? `${transitionColors} hover:!text-color-hover ${buttonHover}`
              : "transition-none"
          }`;

        return (
          <div
            key={option.value}
            class={`relative min-w-0 group ${wrapperClass}`}
          >
            <input
              type="radio"
              id={`${uniqueName.current}-${option.value}`}
              name={uniqueName.current}
              value={option.value}
              checked={isSelected}
              disabled={optionDisabled}
              onChange={() => handleOptionChange(option.value)}
              class="absolute inset-0 w-full h-full opacity-0 cursor-[inherit]"
            />
            <label
              for={`${uniqueName.current}-${option.value}`}
              class={`
                relative flex items-center justify-center my-0.5 z-20 cursor-[inherit]
                font-medium text-center tracking-wide !rounded-full
                ${buttonStyles.size[size]}
                ${labelClass}
              `}
            >
              <span class="block relative z-20">
                {option.label}
              </span>
            </label>
          </div>
        );
      })}
    </div>
  );
};

export default SelectorButtons;
