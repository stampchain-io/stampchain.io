/* ===== EDIT BUTTON ===== */
import { Icon } from "$icon";
import { containerIcon } from "$layout";
import { tooltipIcon } from "$notification";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */
interface EditButtonProps {
  /**
   * Check icon. `false` or a thrown error keeps edit mode open.
   * A missing return value closes it.
   */
  onConfirm?: () => boolean | void | Promise<boolean | void>;
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

type TooltipId = "edit" | "dismiss" | "save";

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
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmingRef = useRef(false);
  const isEditing = editing ?? internalEditing;

  const setEditing = (next: boolean) => {
    if (editing === undefined) setInternalEditing(next);
    onEditingChange?.(next);
  };
  const [tooltipId, setTooltipId] = useState<TooltipId | null>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);

  const clearTooltipTimer = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
  };

  const scheduleTooltip = (id: TooltipId) => {
    clearTooltipTimer();
    setTooltipId(null);
    tooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setTooltipId(id);
    }, TOOLTIP_DELAY_MS);
  };

  const hideTooltip = () => {
    clearTooltipTimer();
    setTooltipId(null);
  };

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  const tooltipClass = (id: TooltipId) => {
    const visible = tooltipId === id &&
      (id === "edit" ? !isEditing : isEditing);
    return `${tooltipIcon} ${visible ? "opacity-100" : "opacity-0"}`;
  };

  const openEditor = (e: MouseEvent) => {
    e.preventDefault();
    setEditing(true);
    // Pointer stays on this icon, which is now the close control.
    scheduleTooltip("dismiss");
  };

  const closeEditor = async (
    e: MouseEvent,
    action: "confirm" | "cancel",
  ) => {
    e.preventDefault();
    if (confirmingRef.current) return;
    hideTooltip();
    if (action === "cancel") {
      setEditing(false);
      onCancel?.();
      return;
    }

    confirmingRef.current = true;
    setIsConfirming(true);
    try {
      const result = await onConfirm?.();
      if (result !== false) setEditing(false);
    } catch {
      // A thrown confirm stays in edit mode.
    } finally {
      confirmingRef.current = false;
      setIsConfirming(false);
    }
  };

  const actionClass = !isEditing
    ? "pointer-events-none max-w-0 opacity-0"
    : isConfirming
    ? `pointer-events-none max-w-[2.125rem] opacity-40
      tablet:max-w-[1.875rem]`
    : "max-w-[2.125rem] opacity-100 tablet:max-w-[1.875rem]";

  return (
    <div
      class="relative flex items-center"
      onMouseLeave={hideTooltip}
    >
      <div class={`${containerIcon} !justify-start !gap-0`}>
        <div
          class="relative shrink-0"
          onMouseEnter={() => scheduleTooltip(isEditing ? "dismiss" : "edit")}
        >
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
              ariaLabel="Dismiss changes"
              onClick={isEditing ? (e) => closeEditor(e, "cancel") : undefined}
            />
          </div>
          <div class={tooltipClass("edit")}>
            EDIT SETTINGS
          </div>
          <div class={tooltipClass("dismiss")}>
            DISMISS CHANGES
          </div>
        </div>
        <div class="relative">
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
                onMouseEnter={() => {
                  if (isEditing) scheduleTooltip("save");
                }}
                onClick={isEditing
                  ? (e) => closeEditor(e, "confirm")
                  : undefined}
              />
            </div>
          </div>
          {
            /* The check icon's width animation clips overflow. This box
              matches that icon button (w-4 plus p-[5px]) so the tooltip
              can sit above it, outside the clip. */
          }
          <div class="pointer-events-none absolute bottom-0 right-0 size-[26px]">
            <div class={tooltipClass("save")}>
              SAVE SETTINGS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
