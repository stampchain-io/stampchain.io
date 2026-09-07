/* ===== CREATE STAMP RECURSIVE HEADER ===== */
import { Icon } from "$icon";
import { openModal } from "$islands/modal/states.ts";
import { container2Icon, ModalBase, ScrollFadeRow } from "$layout";
import {
  addGuide,
  clearGuides,
  redo,
  rsbGrid,
  rsbRulers,
  rsbSnap,
  undo,
  useRecursiveStampState,
} from "$lib/hooks/useRecursiveStampState.ts";
import { textSm } from "$text";
import type { CreateStampRecursiveHeaderProps } from "$types/ui.d.ts";

function PlaceholderIcon(props: {
  label: string;
  name?: string;
  onClick?: (e: MouseEvent) => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Icon
      type="iconButton"
      name={props.name ?? "website"}
      weight="normal"
      size="xsR"
      color={props.active ? "primary400" : "neutral400"}
      ariaLabel={props.label}
      className={props.disabled ? "opacity-100 pointer-events-none" : ""}
      onClick={props.disabled ? undefined : (e) => {
        e.preventDefault();
        props.onClick?.(e);
      }}
    />
  );
}

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: "Cmd/Ctrl+Z · ⇧Z", action: "Undo / Redo" },
  { keys: "Cmd/Ctrl+D", action: "Duplicate selected" },
  { keys: "Cmd/Ctrl+C · X · V", action: "Copy / Cut / Paste" },
  { keys: "Cmd/Ctrl+G · ⇧G", action: "Group / Ungroup" },
  { keys: "Cmd/Ctrl+A", action: "Select all layers" },
  { keys: "Delete / Backspace", action: "Delete selected" },
  { keys: "Arrow keys", action: "Nudge selected (0.5%)" },
  { keys: "Shift+Arrows", action: "Nudge selected (5%)" },
  { keys: "Shift+H · Shift+V", action: "Flip horizontal / vertical" },
  { keys: "+ / − · Wheel", action: "Zoom in / out" },
  { keys: "Space+Drag", action: "Pan canvas" },
  { keys: "0", action: "Reset zoom & pan" },
  { keys: "Esc", action: "Deselect / close dialogs" },
  { keys: "?", action: "Show this help" },
];

function ShortcutsModal() {
  return (
    <ModalBase title="SHORTCUTS">
      <div class="flex flex-col gap-1.5 pt-5">
        {SHORTCUTS.map((row) => (
          <div
            key={row.action}
            class="flex justify-between items-center gap-3 py-1
              border-b border-color-neutral-800 last:border-0"
          >
            <span class={textSm}>{row.action}</span>
            <span class="font-mono text-[0.625rem] text-color-neutral-500">
              {row.keys}
            </span>
          </div>
        ))}
      </div>
    </ModalBase>
  );
}

export function CreateStampRecursiveHeader(
  _props: CreateStampRecursiveHeaderProps = {},
) {
  const { canUndo, canRedo, snap, grid, rulers } = useRecursiveStampState();

  return (
    <div class="flex flex-col w-full">
      <ScrollFadeRow>
        <div class={`${container2Icon} shrink-0`}>
          <PlaceholderIcon
            name="undo"
            label="Undo"
            disabled={!canUndo}
            onClick={() => undo()}
          />
          <PlaceholderIcon
            name="redo"
            label="Redo"
            disabled={!canRedo}
            onClick={() => redo()}
          />
        </div>

        <div class="flex shrink-0 ml-auto gap-3">
          <div class={container2Icon}>
            <PlaceholderIcon
              name="horizontalGuide"
              label="Horizontal guide"
              onClick={() => addGuide("h")}
            />
            <PlaceholderIcon
              name="verticalGuide"
              label="Vertical guide"
              onClick={() => addGuide("v")}
            />
            <PlaceholderIcon
              name="clearGuides"
              label="Clear guides"
              onClick={() => clearGuides()}
            />
          </div>

          <div class={`${container2Icon} gap-1.5 tablet:gap-1`}>
            <PlaceholderIcon
              name="ruler"
              label="Rulers"
              active={rulers}
              onClick={() => {
                rsbRulers.value = !rsbRulers.value;
              }}
            />
            <PlaceholderIcon
              name="grid"
              label="Grid"
              active={grid}
              onClick={() => {
                rsbGrid.value = !rsbGrid.value;
              }}
            />
            <PlaceholderIcon
              name="gridsnap"
              label="Snap"
              active={snap}
              onClick={() => {
                rsbSnap.value = !rsbSnap.value;
              }}
            />
          </div>

          <div class={container2Icon}>
            <Icon
              type="iconButton"
              name="info"
              weight="normal"
              size="xsR"
              color="neutral400"
              ariaLabel="Keyboard shortcuts"
              onClick={(e) => {
                e.preventDefault();
                openModal(<ShortcutsModal />, "zoomInOut");
              }}
            />
          </div>
        </div>
      </ScrollFadeRow>
    </div>
  );
}
