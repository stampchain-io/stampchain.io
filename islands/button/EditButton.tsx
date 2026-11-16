/* ===== EDIT BUTTON ===== */
import { Icon } from "$icon";
import { containerIcon } from "$layout";
import { tooltipIcon } from "$notification";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */
interface EditButtonProps {
  /** Check icon. The control returns to the edit icon either way. */
  onConfirm?: () => void;
  /** Close icon. The control returns to the edit icon either way. */
  onCancel?: () => void;
  /**
   * When set, the pill follows this flag. Omit it to keep the pill's
   * own open/closed state.
   */
  editing?: boolean;
  /** Fires with the next open/closed state for either mode. */
  onEditingChange?: (editing: boolean) => void;
}

const TOOLTIP_DELAY_MS = 1500;

/* ===== COMPONENT ===== */
/**
 * Edit icon pill. Click expands it into close and check; either of those
 * collapses it back to the edit icon.
 */
export function EditButton({
  onConfirm,
  onCancel,
  editing,
  onEditingChange,
}: EditButtonProps) {
  const [internalEditing, setInternalEditing] = useState(false);
  const isEditing = editing ?? internalEditing;

  const setEditing = (next: boolean) => {
    if (editing === undefined) setInternalEditing(next);
    onEditingChange?.(next);
  };
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [allowTooltip, setAllowTooltip] = useState(true);
  const tooltipTimeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (!allowTooltip || isEditing) return;

    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setIsTooltipVisible(true);
    }, TOOLTIP_DELAY_MS);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setIsTooltipVisible(false);
    setAllowTooltip(true);
  };

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  const stopTooltip = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setIsTooltipVisible(false);
    setAllowTooltip(false);
  };

  const openEditor = (e: MouseEvent) => {
    e.preventDefault();
    stopTooltip();
    setEditing(true);
  };

  const closeEditor = (e: MouseEvent, action: "confirm" | "cancel") => {
    e.preventDefault();
    stopTooltip();
    setEditing(false);
    if (action === "confirm") onConfirm?.();
    else onCancel?.();
  };

  const actionClass = isEditing
    ? "max-w-[2.125rem] opacity-100 tablet:max-w-[1.875rem]"
    : "pointer-events-none max-w-0 opacity-0";

  return (
    <div
      class="relative flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div class={`${containerIcon} !justify-start !gap-0`}>
        <div class="relative shrink-0">
          <div
            class={`transition-opacity duration-200 ${
              isEditing ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
            aria-hidden={isEditing}
          >
            <Icon
              type="iconButton"
              name="edit"
              weight="normal"
              size="containerIcon"
              color="neutral400"
              ariaLabel="Edit settings"
              onClick={isEditing ? undefined : openEditor}
            />
          </div>
          <div
            class={`absolute inset-0 transition-opacity duration-200 ${
              isEditing ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={!isEditing}
          >
            <Icon
              type="iconButton"
              name="close"
              weight="normal"
              size="containerIcon"
              color="neutral400"
              ariaLabel="Cancel editing"
              onClick={isEditing ? (e) => closeEditor(e, "cancel") : undefined}
            />
          </div>
        </div>
        <div
          class={`min-w-0 overflow-hidden transition-[max-width,opacity]
            duration-300 ease-out ${actionClass}`}
          aria-hidden={!isEditing}
        >
          <div class="pl-2 tablet:pl-1">
            <Icon
              type="iconButton"
              name="check"
              weight="normal"
              size="containerIcon"
              color="neutral400"
              ariaLabel="Save settings"
              onClick={isEditing ? (e) => closeEditor(e, "confirm") : undefined}
            />
          </div>
        </div>
      </div>
      <div
        class={`${tooltipIcon} ${
          isTooltipVisible && !isEditing ? "opacity-100" : "opacity-0"
        }`}
      >
        EDIT
      </div>
    </div>
  );
}
