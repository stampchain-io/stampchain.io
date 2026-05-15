import { sliderBar, sliderKnob, trackFill } from "$button";
import { formatNumberWithCommas } from "$lib/utils/ui/formatting/formatUtils.ts";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

// Range Slider Component
export const RangeSliderDual = ({
  variant,
  onChange,
  initialMin,
  initialMax,
}: {
  variant: "holders" | "price" | "range" | "fileSize";
  onChange?: (min: number, max: number) => void;
  initialMin?: number;
  initialMax?: number;
}) => {
  // State for dynamic stamp count (only used for range variant)
  const [currentStampCount, setCurrentStampCount] = useState<number | null>(
    null,
  );

  // State for inline editing
  const [editingMin, setEditingMin] = useState(false);
  const [editingMax, setEditingMax] = useState(false);
  const [tempMinValue, setTempMinValue] = useState<string>("");
  const [tempMaxValue, setTempMaxValue] = useState<string>("");

  // Fetch current stamp count for range variant
  useEffect(() => {
    if (variant === "range") {
      fetch("/api/v2/health")
        .then((res) => res.json())
        .then((data) => {
          if (data?.services?.stats?.totalStamps) {
            setCurrentStampCount(data.services.stats.totalStamps);
          }
        })
        .catch((error) => {
          console.warn("Failed to fetch current stamp count:", error);
          // Fallback to default estimate
          setCurrentStampCount(1100000);
        });
    }
  }, [variant]);
  // Define range configurations for different variants
  const rangeConfigs = {
    // Holders configuration
    holders: {
      min: 0,
      max: Infinity,
      segments: [
        { end: 1000, proportion: 1 / 3 }, // First third covers 0-1000
        { end: 10000, proportion: 1 / 3 }, // Second third covers 1000-10000
        { end: 100000, proportion: 1 / 3 }, // Last third covers 10000-100000
      ],
      tickMarks: ["0", "1,000", "10,000", "∞"],
      tickMarkPositions: ["left-0", "left-[33%]", "left-[66%]", "right-0"],
      formatValue: (value: number) => {
        if (value === Infinity) return "NO LIMIT";
        return formatNumberWithCommas(value);
      },
    },
    // Price configuration
    price: {
      min: 0,
      max: Infinity,
      segments: [
        { end: 0.0001, proportion: 1 / 3 }, // First third covers 0-0.0001
        { end: 0.01, proportion: 1 / 3 }, // Second third covers 0.0001-0.01
        { end: 1.0, proportion: 1 / 3 }, // Last third covers 0.01-1.0
      ],
      tickMarks: ["0", "0.0001", "0.01", "∞"],
      tickMarkPositions: [
        "left-0",
        "left-[33%]",
        "left-[66%]",
        "right-0",
      ],
      formatValue: (value: number) => {
        if (value === Infinity) return "NO LIMIT";
        return value.toFixed(
          // Use appropriate decimal places based on value range
          value < 0.0001 ? 6 : value < 0.01 ? 5 : 3,
        ) + " ₿";
      },
    },
    // range configuration
    range: {
      min: 0,
      max: Infinity,
      // Dynamic segments based on current stamp ecosystem (~1.1M stamps)
      segments: [
        { end: 10000, proportion: 1 / 3 }, // First third: early stamps (0-10K)
        { end: 500000, proportion: 1 / 3 }, // Second third: mid-range (10K-500K)
        { end: 1200000, proportion: 1 / 3 }, // Third third: recent stamps (500K-1.2M)
      ],
      tickMarks: ["0", "10K", "500K", "∞"],
      tickMarkPositions: [
        "left-0",
        "left-[33%]",
        "left-[66%]",
        "right-0",
      ],
      formatValue: (value: number) => {
        if (value === Infinity) return "NO LIMIT";
        // Dynamic formatting based on value size
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
        } else if (value >= 1000) {
          const kValue = value / 1000;
          return `${kValue % 1 === 0 ? kValue.toFixed(0) : kValue.toFixed(1)}K`;
        }
        return formatNumberWithCommas(value);
      },
      // Dynamic breakpoints based on current stamp ecosystem
      breakpoints: [
        // Fine control for early stamps (0-1K)
        0,
        10,
        25,
        50,
        100,
        250,
        500,
        // 1K-10K range (every 1K for precision)
        1000,
        2000,
        3000,
        4000,
        5000,
        6000,
        7000,
        8000,
        9000,
        10000,
        // 10K-100K range (every 5K-10K)
        15000,
        20000,
        25000,
        30000,
        40000,
        50000,
        60000,
        70000,
        80000,
        90000,
        100000,
        // 100K-1M range (every 50K-100K)
        150000,
        200000,
        250000,
        300000,
        400000,
        500000,
        600000,
        700000,
        800000,
        900000,
        1000000,
        // 1M+ range (dynamically updated based on current ecosystem)
        1250000,
        1500000,
        1750000,
        2000000,
        2500000,
        3000000,
        4000000,
        5000000,
      ],
    },
    // fileSize configuration
    fileSize: {
      min: 0,
      max: 65536, // 64KB max
      segments: [
        { end: 1024, proportion: 1 / 3 }, // First third: 0-1KB
        { end: 7168, proportion: 1 / 3 }, // Second third: 1KB-7KB
        { end: 65536, proportion: 1 / 3 }, // Third third: 7KB-64KB
      ],
      tickMarks: ["0", "1KB", "7KB", "64KB"],
      tickMarkPositions: [
        "left-0",
        "left-[33%]",
        "left-[66%]",
        "right-0",
      ],
      formatValue: (value: number) => {
        if (value >= 65536) return "64 KB";
        if (value < 1024) return `${value} B`;
        return `${(value / 1024).toFixed(1)} KB`;
      },
    },
  };

  // Get the configuration for the current variant
  const config = rangeConfigs[variant];

  // For range variant, filter breakpoints based on current stamp count
  const getFilteredBreakpoints = () => {
    const breakpoints = "breakpoints" in config ? config.breakpoints : [];

    if (
      variant === "fileSize" || variant === "price" || variant === "holders" ||
      !breakpoints.length
    ) {
      return []; // fileSize, price, and holders don't use breakpoints
    }

    if (variant !== "range" || currentStampCount === null) {
      return breakpoints;
    }

    // Add 20% buffer for new stamps being created
    const maxWithBuffer = Math.ceil(currentStampCount * 1.2);

    // Filter breakpoints to only include those that make sense for current ecosystem
    return breakpoints.filter((breakpoint: number) =>
      breakpoint <= maxWithBuffer
    );
  };

  // Use filtered breakpoints for snapping - recalculate when currentStampCount changes
  const activeBreakpoints = useMemo(() => getFilteredBreakpoints(), [
    currentStampCount,
    variant,
  ]);

  // Track both current and pending values
  const [minValue, setMinValue] = useState(initialMin || config.min);
  const [maxValue, setMaxValue] = useState(initialMax || config.max);
  const [pendingMin, setPendingMin] = useState(initialMin || config.min);
  const [pendingMax, setPendingMax] = useState(initialMax || config.max);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredHandle, setHoveredHandle] = useState<"min" | "max" | null>(
    null,
  );
  const [lastChangedHandle, setLastChangedHandle] = useState<
    "min" | "max" | null
  >(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Convert actual value to slider position (0-100)
  const valueToPosition = (value: number): number => {
    // Special case for Infinity
    if (value === Infinity) return 100;

    // Find which segment the value falls into
    if (value <= config.segments[0].end) {
      // First segment
      return (value / config.segments[0].end) *
        (config.segments[0].proportion * 100);
    } else if (value <= config.segments[1].end) {
      // Second segment
      const segmentPosition = config.segments[0].proportion * 100;
      const segmentValue = value - config.segments[0].end;
      const segmentRange = config.segments[1].end - config.segments[0].end;
      return segmentPosition +
        (segmentValue / segmentRange) * (config.segments[1].proportion * 100);
    } else {
      // Third segment (up to the end or position 99)
      const segmentPosition =
        (config.segments[0].proportion + config.segments[1].proportion) * 100;
      const segmentValue = Math.min(value, config.segments[2].end) -
        config.segments[1].end;
      const segmentRange = config.segments[2].end - config.segments[1].end;

      // If value is exactly at the end of the third segment, cap at 99 to leave room for infinity
      const position = segmentPosition +
        (segmentValue / segmentRange) * (config.segments[2].proportion * 100);

      return Math.min(position, 99);
    }
  };

  // Modify the positionToValue function to handle price variant better
  const positionToValue = (position: number): number => {
    // Special case for the last step (position 100 or very close to it)
    if (position >= 99.5) {
      return variant === "fileSize" ? config.max : Infinity;
    }

    // Calculate which segment this position falls into
    const segment0End = config.segments[0].proportion * 100;
    const segment1End = segment0End + config.segments[1].proportion * 100;
    const segment2End = variant === "fileSize" ? 100 : 99; // For fileSize, use full range

    let value: number;

    if (position <= segment0End) {
      // First segment
      value = (position / segment0End) * config.segments[0].end;
    } else if (position <= segment1End) {
      // Second segment
      const segmentPosition = position - segment0End;
      const segmentRange = config.segments[1].proportion * 100;
      value = config.segments[0].end + (segmentPosition / segmentRange) *
          (config.segments[1].end - config.segments[0].end);
    } else if (position <= segment2End) {
      // Third segment
      const segmentPosition = position - segment1End;
      const segmentRange = segment2End - segment1End;
      value = config.segments[1].end + (segmentPosition / segmentRange) *
          (config.segments[2].end - config.segments[1].end);
    } else {
      // Beyond segment2End (should be handled by the special case above)
      return variant === "fileSize" ? config.max : Infinity;
    }

    // Clamp to minimum value to prevent negative values
    const clampedValue = Math.max(config.min, value);

    return variant === "price"
      ? Number(clampedValue.toFixed(6))
      : Number(clampedValue.toFixed(0));
  };

  // Adjusted valueToPosition functions for padding
  const adjustedValueToPositionMin = (value: number): number => {
    const basePosition = valueToPosition(value);
    // Add 1px padding as percentage (assuming ~300px typical slider width)
    const paddingPercent = 1; // 2% padding for left handle
    return Math.min(basePosition + paddingPercent, 100);
  };

  const adjustedValueToPositionMax = (value: number): number => {
    const basePosition = valueToPosition(value);
    // Subtract 1px padding as percentage
    const paddingPercent = 1; // 2% padding for right handle
    return Math.max(basePosition - paddingPercent, 0);
  };

  // Smart breakpoint snapping function
  const snapToBreakpoint = (value: number): number => {
    if (value === Infinity) return Infinity;

    // Find the closest breakpoint using filtered breakpoints
    const breakpoints = activeBreakpoints;
    let closest = breakpoints[0];
    let minDiff = Math.abs(value - closest);

    for (const breakpoint of breakpoints) {
      const diff = Math.abs(value - breakpoint);
      if (diff < minDiff) {
        minDiff = diff;
        closest = breakpoint;
      }
    }

    return closest;
  };

  // Calculate minimum step size based on variant
  const getMinStep = () => {
    if (variant === "price") {
      return 0.000001; // Smallest step for price
    }
    return 1; // Default step for holders and range
  };

  // Helper functions for inline editing
  const startEditing = (type: "min" | "max") => {
    // First, finish editing the other field if it's currently being edited
    if (type === "min" && editingMax) {
      finishEditing("max");
    } else if (type === "max" && editingMin) {
      finishEditing("min");
    }

    const currentValue = type === "min" ? minValue : maxValue;

    if (type === "min") {
      setEditingMin(true);
      const valueString = currentValue === 0
        ? ""
        : (variant === "price" && currentValue.toString().includes("e"))
        ? currentValue.toFixed(8).replace(/\.?0+$/, "")
        : currentValue.toString();
      setTempMinValue(valueString);
    } else {
      setEditingMax(true);
      const valueString = currentValue === Infinity
        ? ""
        : (variant === "price" && currentValue.toString().includes("e"))
        ? currentValue.toFixed(8).replace(/\.?0+$/, "")
        : currentValue.toString();
      setTempMaxValue(valueString);
    }
  };

  const handleNumericInput = (value: string): string => {
    // For price variant, allow decimal numbers
    if (variant === "price") {
      // Convert scientific notation to decimal if present
      if (value.includes("e") || value.includes("E")) {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          value = num.toFixed(8);
        }
      }

      // Handle initial decimal point input - add leading zero
      if (value === ".") {
        return "0.";
      }

      // Allow digits and decimal point only
      let sanitized = value.replace(/[^0-9.]/g, "");
      const parts = sanitized.split(".");

      // Ensure only one decimal point
      if (parts.length > 2) {
        sanitized = parts[0] + "." + parts[1];
      }

      // Limit decimal places to 8 for price precision
      if (parts.length === 2 && parts[1].length > 8) {
        sanitized = parts[0] + "." + parts[1].slice(0, 8);
      }

      // Limit total length to 10 characters for price precision
      return sanitized.slice(0, 10);
    } else {
      // For holders and range variants, only allow integers
      return value.replace(/\D/g, "");
    }
  };

  const finishEditing = (type: "min" | "max") => {
    const inputValue = type === "min" ? tempMinValue : tempMaxValue;
    const numValue = parseFloat(inputValue);

    if (type === "min") {
      setEditingMin(false);
      if (!isNaN(numValue) && numValue >= config.min) {
        const clampedValue = maxValue === Infinity
          ? numValue
          : Math.min(numValue, maxValue - getMinStep());
        setMinValue(clampedValue);
        setPendingMin(clampedValue);
        onChange?.(clampedValue, maxValue);
      }
    } else {
      setEditingMax(false);
      if (inputValue === "" || inputValue.toLowerCase() === "no limit") {
        const maxValue = variant === "fileSize" ? config.max : Infinity;
        setMaxValue(maxValue);
        setPendingMax(maxValue);
        onChange?.(minValue, maxValue);
      } else if (!isNaN(numValue) && numValue > minValue) {
        const clampedValue = variant === "fileSize"
          ? Math.min(numValue, config.max)
          : numValue;
        setMaxValue(clampedValue);
        setPendingMax(clampedValue);
        onChange?.(minValue, clampedValue);
      }
    }
  };

  const cancelEditing = (type: "min" | "max") => {
    if (type === "min") {
      setEditingMin(false);
      setTempMinValue("");
    } else {
      setEditingMax(false);
      setTempMaxValue("");
    }
  };

  // Handle track clicks to move nearest handle
  const handleTrackClick = (e: Event) => {
    if (!sliderRef.current || isDragging) return;

    // Finish any active editing when track is clicked
    if (editingMin) finishEditing("min");
    if (editingMax) finishEditing("max");

    const mouseEvent = e as MouseEvent;
    const rect = sliderRef.current.getBoundingClientRect();
    const clickX = mouseEvent.clientX - rect.left;
    const clickPercent = (clickX / rect.width) * 100;

    // Clamp to valid range
    const clampedPercent = Math.max(0, Math.min(100, clickPercent));

    // Convert to value and snap to breakpoint (except for fileSize, price, and holders)
    const rawValue = positionToValue(clampedPercent);
    const snappedValue =
      variant === "fileSize" || variant === "price" || variant === "holders"
        ? rawValue
        : snapToBreakpoint(rawValue);

    // Determine which handle is closer
    const minPos = valueToPosition(minValue);
    const maxPos = valueToPosition(maxValue);
    const distToMin = Math.abs(clampedPercent - minPos);
    const distToMax = Math.abs(clampedPercent - maxPos);

    const minStep = getMinStep();

    if (distToMin <= distToMax) {
      // Move min handle
      const newMin = maxValue === Infinity
        ? snappedValue
        : Math.min(snappedValue, maxValue - minStep * 10);

      // Ensure min value is never below config.min (0 for price variant)
      const clampedNewMin = Math.max(config.min, newMin);

      setPendingMin(clampedNewMin);
      setMinValue(clampedNewMin);
      setLastChangedHandle("min");

      // Trigger onChange immediately for track clicks
      if (variant === "price") {
        const finalMin = clampedNewMin < 0.0001
          ? Number(clampedNewMin.toFixed(6))
          : clampedNewMin < 0.01
          ? Number(clampedNewMin.toFixed(5))
          : Number(clampedNewMin.toFixed(3));
        onChange?.(finalMin, maxValue);
      } else {
        onChange?.(
          Math.round(clampedNewMin),
          maxValue === Infinity ? Infinity : Math.round(maxValue),
        );
      }
    } else {
      // Move max handle
      if (clampedPercent >= 99.5) {
        const maxValue = variant === "fileSize" ? config.max : Infinity;
        setPendingMax(maxValue);
        setMaxValue(maxValue);
        setLastChangedHandle("max");
        onChange?.(minValue, maxValue);
        return;
      }

      const newMax = Math.max(snappedValue, minValue + minStep * 10);

      setPendingMax(newMax);
      setMaxValue(newMax);
      setLastChangedHandle("max");

      // Trigger onChange immediately for track clicks
      if (variant === "price") {
        const finalMax = newMax < 0.0001
          ? Number(newMax.toFixed(6))
          : newMax < 0.01
          ? Number(newMax.toFixed(5))
          : Number(newMax.toFixed(3));
        onChange?.(minValue, finalMax);
      } else {
        onChange?.(Math.round(minValue), Math.round(newMax));
      }
    }
  };

  // Modify the handle functions while preserving decimal precision
  const handleMinInput = (e: Event) => {
    // Finish any active editing when slider is used
    if (editingMin) finishEditing("min");
    if (editingMax) finishEditing("max");

    setIsDragging(true);
    const sliderValue = parseInt((e.target as HTMLInputElement).value);
    const rawValue = positionToValue(sliderValue);
    const snappedValue =
      variant === "fileSize" || variant === "price" || variant === "holders"
        ? rawValue
        : snapToBreakpoint(rawValue);

    const minStep = getMinStep();
    const maxLimit = variant === "fileSize"
      ? config.max
      : (pendingMax === Infinity ? snappedValue : pendingMax);
    // Ensure min value is never below config.min (0 for price variant)
    const clampedMin = Math.max(
      config.min,
      Math.min(snappedValue, maxLimit - minStep * 10),
    );

    setPendingMin(clampedMin);
    setMinValue(clampedMin);
    setLastChangedHandle("min");
  };

  const handleMaxInput = (e: Event) => {
    // Finish any active editing when slider is used
    if (editingMin) finishEditing("min");
    if (editingMax) finishEditing("max");

    setIsDragging(true);
    const sliderValue = parseInt((e.target as HTMLInputElement).value);
    const rawValue = positionToValue(sliderValue);

    if (sliderValue >= 99.5) {
      const maxValue = variant === "fileSize" ? config.max : Infinity;
      setPendingMax(maxValue);
      setMaxValue(maxValue);
      setLastChangedHandle("max");
      return;
    }

    const snappedValue =
      variant === "fileSize" || variant === "price" || variant === "holders"
        ? rawValue
        : snapToBreakpoint(rawValue);
    const minStep = getMinStep();
    const clampedMax = Math.max(snappedValue, pendingMin + minStep * 10);

    setPendingMax(clampedMax);
    setMaxValue(clampedMax);
    setLastChangedHandle("max");
  };

  // Update useEffect to handle final value updates
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (variant === "price") {
          const finalMin = pendingMin < 0.0001
            ? Number(pendingMin.toFixed(6))
            : pendingMin < 0.01
            ? Number(pendingMin.toFixed(5))
            : Number(pendingMin.toFixed(3));

          const finalMax = pendingMax === Infinity
            ? Infinity
            : pendingMax < 0.0001
            ? Number(pendingMax.toFixed(6))
            : pendingMax < 0.01
            ? Number(pendingMax.toFixed(5))
            : Number(pendingMax.toFixed(3));

          onChange?.(finalMin, finalMax);
        } else {
          const finalMax = variant === "fileSize" && pendingMax >= config.max
            ? config.max
            : (pendingMax === Infinity ? Infinity : Math.round(pendingMax));
          onChange?.(
            Math.round(pendingMin),
            finalMax,
          );
        }
      }
    };

    globalThis.addEventListener("mouseup", handleMouseUp);
    globalThis.addEventListener("touchend", handleMouseUp);

    return () => {
      globalThis.removeEventListener("mouseup", handleMouseUp);
      globalThis.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, pendingMin, pendingMax, onChange, variant]);

  // Define the gradient colors
  const trackGradientFill = (
    hoveredHandle: "min" | "max" | null,
    isHovered: boolean,
  ) => {
    // Calculate percentages based on our non-linear scale with adjusted positioning
    const minPercent = adjustedValueToPositionMin(minValue);
    const maxPercent = (variant === "fileSize" && maxValue >= config.max) ||
        maxValue === Infinity
      ? 98 // Adjust max to account for right padding
      : adjustedValueToPositionMax(maxValue);

    // Calculate dynamic offsets based on handle positions
    const minHandleOffset = (minPercent / 100) * 3; // 0% to 3% based on position
    const maxHandleOffset = ((100 - maxPercent) / 100) * 3; // 0% to 3% based on position

    const baseStyle = {
      left: `calc(${minPercent}% - ${minHandleOffset}%)`,
      right: `calc(${100 - maxPercent}% - ${maxHandleOffset}%)`,
      width: "auto",
    };

    if (hoveredHandle === "min") {
      return {
        ...baseStyle,
        background:
          "linear-gradient(90deg, var(--color-primary-400) 5%, var(--color-primary-500) 50%, var(--color-primary-400) 95%)",
      };
    } else if (hoveredHandle === "max") {
      return {
        ...baseStyle,
        background:
          "linear-gradient(90deg, var(--color-primary-400) 5%, var(--color-primary-500) 50%, var(--color-primary-400) 95%)",
      };
    } else if (isHovered) {
      return {
        ...baseStyle,
        background:
          "linear-gradient(90deg, var(--color-primary-400), var(--color-primary-400) 95%)",
      };
    }

    return {
      ...baseStyle,
      background:
        "linear-gradient(90deg, var(--color-neutral-400) 5%, var(--color-neutral-800) 40%, var(--color-neutral-800) 60%, var(--color-neutral-400) 95%)",
    };
  };

  return (
    <div class={`w-full ${variant === "price" ? "mt-0 mb-2" : ""}`}>
      <div class="flex w-full justify-center pb-3 tablet:pb-1.5">
        <div class="flex items-center font-regular text-[0.625rem] tablet:text-[0.5625rem]">
          {/* Min Value - Clickable/Editable */}
          {editingMin
            ? (
              <input
                type="text"
                inputMode={variant === "price" ? "decimal" : "numeric"}
                pattern={variant === "price" ? "[0-9]*[.]?[0-9]*" : "[0-9]*"}
                value={tempMinValue}
                onInput={(e) => {
                  const inputValue = (e.target as HTMLInputElement).value;

                  // Handle "0." to empty conversion for price variant
                  if (
                    variant === "price" && tempMinValue === "0." &&
                    inputValue === "0"
                  ) {
                    setTempMinValue("");
                    return;
                  }

                  // Handle "0" to "0." conversion for price variant
                  if (
                    variant === "price" &&
                    (inputValue === "0" || inputValue === ".")
                  ) {
                    setTempMinValue("0.");
                    return;
                  }

                  const sanitizedValue = handleNumericInput(inputValue);
                  setTempMinValue(sanitizedValue);
                }}
                onBlur={() => finishEditing("min")}
                onKeyDown={(e) => {
                  // Allow control keys
                  if (
                    [
                      "Backspace",
                      "Delete",
                      "Tab",
                      "Escape",
                      "Enter",
                      "Home",
                      "End",
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                    ].includes(e.key)
                  ) {
                    if (e.key === "Enter") finishEditing("min");
                    if (e.key === "Escape") cancelEditing("min");
                    return;
                  }

                  // For price variant, only allow digits and decimal point
                  if (variant === "price") {
                    if (!/^[0-9.]$/.test(e.key)) {
                      e.preventDefault();
                    }
                  } else {
                    // For holders/range variants, only allow digits
                    if (!/^[0-9]$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }
                }}
                placeholder="0"
                tabIndex={1}
                class={`${
                  variant === "price"
                    ? "w-[84px] tablet:w-[72px]"
                    : "w-[72px] tablet:w-16"
                } text-right bg-color-neutral-800 rounded-full -my-0.5 px-1.5 py-0.5 text-color-neutral-400 placeholder:text-color-neutral-400
                text-[0.625rem] tablet:text-[0.5625rem] focus-visible:outline-none`}
                autoFocus
              />
            )
            : (
              <div
                class={`${
                  variant === "price"
                    ? "w-[84px] tablet:w-[72px]"
                    : "w-[72px] tablet:w-16"
                } text-right cursor-pointer select-none ${
                  hoveredHandle === "min" || isHovered
                    ? "text-color-hover"
                    : "text-color-neutral-400"
                } hover:text-color-hover transition-colors duration-200`}
                onClick={() => startEditing("min")}
              >
                {config.formatValue(minValue)}
              </div>
            )}

          <span class="mx-2 text-color-neutral-500">-</span>

          {/* Max Value - Clickable/Editable */}
          {editingMax
            ? (
              <input
                type="text"
                inputMode={variant === "price" ? "decimal" : "numeric"}
                pattern={variant === "price" ? "[0-9]*[.]?[0-9]*" : "[0-9]*"}
                value={tempMaxValue}
                onInput={(e) => {
                  const inputValue = (e.target as HTMLInputElement).value;

                  // Handle "0." to empty conversion for price variant
                  if (
                    variant === "price" && tempMaxValue === "0." &&
                    inputValue === "0"
                  ) {
                    setTempMaxValue("");
                    return;
                  }

                  // Handle "0" to "0." conversion for price variant
                  if (
                    variant === "price" &&
                    (inputValue === "0" || inputValue === ".")
                  ) {
                    setTempMaxValue("0.");
                    return;
                  }

                  const sanitizedValue = handleNumericInput(inputValue);
                  setTempMaxValue(sanitizedValue);
                }}
                onBlur={() => finishEditing("max")}
                onKeyDown={(e) => {
                  // Allow control keys
                  if (
                    [
                      "Backspace",
                      "Delete",
                      "Tab",
                      "Escape",
                      "Enter",
                      "Home",
                      "End",
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                    ].includes(e.key)
                  ) {
                    if (e.key === "Enter") finishEditing("max");
                    if (e.key === "Escape") cancelEditing("max");
                    return;
                  }

                  // For price variant, only allow digits and decimal point
                  if (variant === "price") {
                    if (!/^[0-9.]$/.test(e.key)) {
                      e.preventDefault();
                    }
                  } else {
                    // For holders/range variants, only allow digits
                    if (!/^[0-9]$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }
                }}
                placeholder="NO LIMIT"
                tabIndex={2}
                class="w-[72px] tablet:w-16 text-left bg-color-neutral-800 rounded-full -my-0.5 px-1.5 py-0.5 text-color-neutral-400 placeholder:text-color-neutral-400
                text-[0.625rem] tablet:text-[0.5625rem] focus-visible:outline-none"
                autoFocus
              />
            )
            : (
              <div
                class={`w-[72px] tablet:w-16 text-left cursor-pointer select-none ${
                  hoveredHandle === "max" || isHovered
                    ? "text-color-hover"
                    : "text-color-neutral-400"
                } hover:text-color-hover transition-colors duration-200`}
                onClick={() => startEditing("max")}
              >
                {config.formatValue(maxValue)}
              </div>
            )}
        </div>
      </div>

      <div
        class={sliderBar}
        onClick={handleTrackClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div class="absolute inset-y-0 left-[3px] right-[3px]" ref={sliderRef}>
          {/* Track fill with dynamic gradient */}
          <div
            class={trackFill}
            style={trackGradientFill(hoveredHandle, isHovered)}
          />

          {/* Min handle input - using 0-100 range for the slider */}
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={adjustedValueToPositionMin(minValue)}
            onChange={handleMinInput}
            onInput={handleMinInput}
            onMouseEnter={() => setHoveredHandle("min")}
            onMouseLeave={() => setHoveredHandle(null)}
            tabIndex={3}
            class={`${sliderKnob} ${
              lastChangedHandle === "min" ? "z-20" : "z-10"
            }`}
          />

          {/* Max handle input - using 0-100 range for the slider */}
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={adjustedValueToPositionMax(maxValue)}
            onChange={handleMaxInput}
            onInput={handleMaxInput}
            onMouseEnter={() => setHoveredHandle("max")}
            onMouseLeave={() => setHoveredHandle(null)}
            tabIndex={4}
            class={`${sliderKnob} ${
              lastChangedHandle === "max" ? "z-20" : "z-10"
            }`}
          />
        </div>
      </div>

      {/* Tick marks for the segment boundaries */}
      <div class="relative w-full h-6 pt-1.5 tablet:pt-1 text-xs tablet:text-[10px] font-regular text-color-neutral-500 cursor-default select-none">
        {config.tickMarks.map((mark, index) => {
          const position = config.tickMarkPositions[index];
          const isFirst = index === 0;
          const isLast = index === config.tickMarks.length - 1;

          return (
            <p
              key={index}
              class={`absolute ${position} ${
                isFirst
                  ? "transform-none"
                  : isLast
                  ? "transform-none"
                  : "transform -translate-x-1/2"
              } ${
                hoveredHandle !== null || isHovered
                  ? "text-color-hover"
                  : "text-color-neutral-600"
              } transition-colors duration-100`}
            >
              {mark}
            </p>
          );
        })}
      </div>
    </div>
  );
};
