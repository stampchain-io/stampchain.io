/* @baba - before:blur-sm is causing a flash of the pill before it is mounted */

import { buttonStyles, color, state } from "$button";
import { container1, transitionColors } from "$layout";
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
    // Use function form to ensure correct initial value on SSR/hydration
    return value !== undefined
      ? value
      : (defaultValue || options[0]?.value || "");
  });
  const [selectionTransform, setSelectionTransform] = useState(
    "translateX(0px)",
  );
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
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

  // Calculate and update selection pill position
  const updateSelectionPosition = useCallback(() => {
    if (!containerRef.current) return;

    const selectedIndex = options.findIndex((option) =>
      option.value === selectedValue
    );
    if (selectedIndex === -1) return;

    const optionElement = optionRefs.current[selectedIndex];
    if (!optionElement) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const optionRect = optionElement.getBoundingClientRect();
    const offsetX = optionRect.left - containerRect.left;

    setSelectionTransform(`translateX(${offsetX}px)`);
  }, [selectedValue, options]);

  // Update position on mount and when selection changes
  useEffect(() => {
    updateSelectionPosition();
  }, [updateSelectionPosition]);

  // Update position on window resize
  useEffect(() => {
    const handleResize = () => {
      updateSelectionPosition();
    };

    globalThis.addEventListener("resize", handleResize);
    return () => globalThis.removeEventListener("resize", handleResize);
  }, [updateSelectionPosition]);

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

  return (
    <div
      ref={containerRef}
      class={`relative grid p-0.5 select-none
        ${container1} !rounded-full
        ${
        (colorProp === "purple" || colorProp === "grey")
          ? colorVariants[colorProp]
          : colorVariants.grey
      }
        ${disabledProp ? state.disabled : ""}
        ${className}
      `}
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {/* Selection button - only render after mount to prevent SSR flash */}
      {isMounted && (
        <div
          class={`!absolute top-0.5 bottom-0.5 z-10
            ${buttonStyles.variant.flat}
          `}
          style={{
            transform: selectionTransform,
            width: `calc((100% - ${options.length * 4}px) / ${options.length})`,
            transition: "transform 200ms ease-out",
          }}
        />
      )}

      {/* Options */}
      {options.map((option, index) => {
        const optionDisabled = isOptionDisabled(option);
        const isSelected = selectedValue === option.value;

        // Compute label styling based on selection and mount state
        const labelClass = isSelected
          ? isMounted
            ? `text-black ${transitionColors}` // After mount: fancy pill behind
            : `text-black ${buttonStyles.variant.flat} !px-1 transition-none pointer-events-none` // Before mount: flat
          : isMounted
          ? `mx-0.5 bg-transparent text-[var(--color-button-dark)] ${transitionColors} hover:text-[var(--color-button)] hover:bg-color-grey-dark/25` // Unselected after mount
          : "mx-0.5 bg-transparent text-[var(--color-button-dark)] transition-none pointer-events-none"; // Unselected before mount

        return (
          <div
            key={option.value}
            ref={(el) => {
              optionRefs.current[index] = el;
            }}
            class={`
              relative min-w-0 group
              ${
              optionDisabled
                ? state.disabled
                : isSelected
                ? "!cursor-default"
                : "!cursor-pointer"
            }
            `}
          >
            <input
              type="radio"
              id={`${uniqueName.current}-${option.value}`}
              name={uniqueName.current}
              value={option.value}
              checked={isSelected}
              disabled={optionDisabled}
              onChange={() => handleOptionChange(option.value)}
              class="absolute inset-0 w-full h-full opacity-0"
            />
            <label
              for={`${uniqueName.current}-${option.value}`}
              class={`
                relative flex items-center justify-center z-20 group
                font-semibold text-center !rounded-full
                ${buttonStyles.size[size]}
                ${labelClass}
                ${
                optionDisabled
                  ? state.disabled
                  : isMounted
                  ? isSelected ? "!cursor-default" : "!cursor-pointer"
                  : ""
              }
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
