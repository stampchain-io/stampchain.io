/* ===== TOGGLE SWITCH BUTTON COMPONENT ===== */
import { toggleButton, toggleKnob, toggleKnobBackground } from "$button";
import { toggleSymbol } from "$text";
import type { ToggleSwitchButtonProps } from "$types/ui.d.ts";
import { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";

/* ===== COMPONENT ===== */
export function ToggleSwitchButton({
  isActive,
  onToggle,
  toggleButtonId,
  className = "",
  activeSymbol,
  inactiveSymbol,
  onMouseEnter,
  onMouseLeave,
  onClick,
  buttonRef,
  activeKnobClassName =
    "bg-gradient-to-r from-color-primary-300 to-color-primary-400",
  inactiveKnobClassName =
    "bg-gradient-to-r from-color-neutral-500 to-color-neutral-400",
}: ToggleSwitchButtonProps): JSX.Element {
  /* ===== REFS ===== */
  const handleRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLButtonElement>(null);
  const actualRef = buttonRef || internalRef;

  /* ===== EVENT HANDLERS ===== */
  const handleClick = (e: MouseEvent) => {
    if (onClick) {
      onClick(e);
    }
    onToggle();
  };

  /* ===== INITIAL HANDLE APPEARANCE EFFECT ===== */
  useEffect(() => {
    const handleElement = handleRef.current;
    if (handleElement) {
      // Create inner content
      const innerDiv = document.createElement("div");
      innerDiv.className = `${toggleKnob} ${
        isActive ? activeKnobClassName : inactiveKnobClassName
      } flex items-center justify-center ${toggleSymbol} ${
        isActive ? "mr-1" : ""
      }`;

      // Add symbol if provided
      if (isActive && activeSymbol) {
        innerDiv.textContent = activeSymbol;
      } else if (!isActive && inactiveSymbol) {
        innerDiv.textContent = inactiveSymbol;
      }

      // Clear and append
      handleElement.innerHTML = "";
      handleElement.appendChild(innerDiv);

      // Add/remove class
      if (isActive) {
        handleElement.classList.add("translate-x-full");
      } else {
        handleElement.classList.remove("translate-x-full");
      }
    }
  }, []);

  /* ===== HANDLE STATE CHANGE EFFECT ===== */
  useEffect(() => {
    const handleElement = handleRef.current;
    if (handleElement) {
      if (isActive) {
        // Move handle to active position
        handleElement.classList.add("translate-x-full");
        setTimeout(() => {
          // Update inner content with active color
          const innerDiv = document.createElement("div");
          innerDiv.className =
            `${toggleKnob} ${activeKnobClassName} flex items-center justify-center ${toggleSymbol} mr-1`;

          if (activeSymbol) {
            innerDiv.textContent = activeSymbol;
          }

          // Clear and append
          handleElement.innerHTML = "";
          handleElement.appendChild(innerDiv);
        }, 150);
      } else {
        // Move handle to inactive position
        handleElement.classList.remove("translate-x-full");
        setTimeout(() => {
          // Update inner content with inactive color and symbol
          const innerDiv = document.createElement("div");
          innerDiv.className =
            `${toggleKnob} ${inactiveKnobClassName} flex items-center justify-center ${toggleSymbol}`;

          if (inactiveSymbol) {
            innerDiv.textContent = inactiveSymbol;
          }

          // Clear and append
          handleElement.innerHTML = "";
          handleElement.appendChild(innerDiv);
        }, 150);
      }
    }
  }, [isActive, activeSymbol, inactiveSymbol]);

  /* ===== COMPONENT RENDER ===== */
  return (
    <button
      type="button"
      ref={actualRef}
      class={`${toggleButton} ${className}`}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        id={toggleButtonId}
        ref={handleRef}
        class={toggleKnobBackground}
      />
    </button>
  );
}
