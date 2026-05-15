import { sliderBar, sliderKnob, trackFill } from "$button";
import { useEffect, useRef, useState } from "preact/hooks";

// Single Range Slider Component
export const RangeSlider = ({
  value,
  onChange,
  min = 0,
  max = 100,
  formatValue,
  valueToPosition,
  positionToValue,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseMove,
  className,
  disabled,
}: {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  formatValue?: (value: number) => string;
  valueToPosition?: (value: number) => number;
  positionToValue?: (position: number) => number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: () => void;
  onMouseMove?: (e: MouseEvent) => void;
  className?: string;
  disabled?: boolean;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [knobWidth, setKnobWidth] = useState(0);

  // Default linear conversion functions
  const defaultValueToPosition = (val: number): number => {
    return ((val - min) / (max - min)) * 100;
  };

  const defaultPositionToValue = (position: number): number => {
    const clampedPosition = Math.max(0, Math.min(100, position));
    return min + (clampedPosition / 100) * (max - min);
  };

  // Use custom conversion functions if provided, otherwise use defaults
  const convertValueToPosition = valueToPosition || defaultValueToPosition;
  const convertPositionToValue = positionToValue || defaultPositionToValue;

  // Handle track clicks
  const handleTrackClick = (e: Event) => {
    if (!sliderRef.current || isDragging) return;

    const mouseEvent = e as MouseEvent;
    const rect = sliderRef.current.getBoundingClientRect();
    const clickX = mouseEvent.clientX - rect.left;
    const clickPercent = (clickX / rect.width) * 100;

    const newValue = convertPositionToValue(clickPercent);
    onChange?.(newValue);
  };

  // Handle slider input
  const handleInput = (e: Event) => {
    setIsDragging(true);
    const sliderValue = parseFloat((e.target as HTMLInputElement).value);
    const newValue = convertPositionToValue(sliderValue);
    onChange?.(newValue);
  };

  // Update useEffect to handle final value updates
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    globalThis.addEventListener("mouseup", handleMouseUp);
    globalThis.addEventListener("touchend", handleMouseUp);

    return () => {
      globalThis.removeEventListener("mouseup", handleMouseUp);
      globalThis.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  // Measure knob width after render - make it dynamic based on slider position
  useEffect(() => {
    if (inputRef.current) {
      // Dynamic thumb width: 0% position = 10px, 100% position = 0px
      const position = convertValueToPosition(value);
      const dynamicThumbWidth = 24 - (position / 100) * 30; // 24 at 0%, 0 at 100%
      setKnobWidth(dynamicThumbWidth);
    }
  }, [value, convertValueToPosition]);

  // Track gradient fill with precise knob alignment
  const trackGradientFill = () => {
    const position = convertValueToPosition(value);

    // Calculate precise alignment: knob center + half knob width
    const trackWidth = sliderRef.current?.offsetWidth || 300;
    const knobOffset = (knobWidth / 2 / trackWidth) * 100; // Convert to percentage
    const rightPosition = 100 - position - knobOffset;

    if (hovered) {
      return {
        left: "0px",
        right: `${Math.max(0, rightPosition)}%`,
        width: "auto",
        background:
          "linear-gradient(90deg, var(--color-primary-500), var(--color-primary-400) 95%)",
      };
    }

    return {
      left: "0px",
      right: `${Math.max(0, rightPosition)}%`,
      width: "auto",
      background:
        "linear-gradient(90deg, var(--color-neutral-900), var(--color-neutral-400) 95%)",
    };
  };

  // Default format function
  const defaultFormatValue = (val: number) => val.toString();
  const displayValue = formatValue
    ? formatValue(value)
    : defaultFormatValue(value);

  return (
    <div class={`w-full ${className ?? ""}`}>
      {formatValue && (
        <div class="flex w-full justify-center pb-1.5 tablet:pb-1">
          <div class="flex items-center text-sm tablet:text-xs font-regular">
            <div class="text-center text-color-red-800 select-none">
              {displayValue}
            </div>
          </div>
        </div>
      )}

      <div
        class={sliderBar}
        onClick={handleTrackClick}
        onMouseEnter={() => {
          setHovered(true);
          onMouseEnter?.();
        }}
        onMouseLeave={() => {
          setHovered(false);
          onMouseLeave?.();
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
      >
        <div class="absolute inset-y-0 left-[3px] right-[3px]" ref={sliderRef}>
          {/* Track fill with dynamic gradient */}
          <div
            class={trackFill}
            style={trackGradientFill()}
          />

          {/* Slider input */}
          <input
            ref={inputRef}
            type="range"
            min="0"
            max="100"
            step="0.25"
            value={convertValueToPosition(value)}
            onChange={handleInput}
            onInput={handleInput}
            class={`${sliderKnob} z-10`}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};
