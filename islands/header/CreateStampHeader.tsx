/* ===== CREATE STAMP HEADER ===== */
import { SelectorButtons } from "$button";
import { Icon } from "$icon";
import { openModal } from "$islands/modal/states.ts";
import { container2Icon, ModalBase, ScrollFadeRow } from "$layout";
import { textSm, titlePrimary } from "$text";
import type { CreateStampHeaderProps } from "$types/ui.d.ts";
import { useState } from "preact/hooks";

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
  { keys: "Shift+Drag handle", action: "Constrain aspect ratio" },
  { keys: "Drag empty canvas", action: "Box-select layers" },
  { keys: "Shift+Click", action: "Add to / remove from selection" },
  { keys: "Double-click name", action: "Rename layer" },
  { keys: "+ / − · Wheel", action: "Zoom in / out" },
  { keys: "Space+Drag · Middle-drag", action: "Pan canvas" },
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

export function openShortcutsModal(): void {
  openModal(<ShortcutsModal />, "zoomInOut");
}

export function CreateStampHeader(
  _props: CreateStampHeaderProps = {},
) {
  const [stampType, setStampType] = useState("recursive");

  return (
    <div class="flex flex-col w-full gap-1.5">
      <h1 class={titlePrimary}>CREATE</h1>

      <ScrollFadeRow deps={[stampType]}>
        {/* Stamp Type Selector - Left */}
        <div class="shrink-0">
          <SelectorButtons
            options={[
              { value: "classic", label: "CLASSIC" },
              { value: "posh", label: "POSH" },
              { value: "recursive", label: "RECURSIVE" },
            ]}
            value={stampType}
            onChange={setStampType}
            size="xs"
            color="primary"
          />
        </div>

        {/* Info - Right */}
        <div class="flex shrink-0 ml-auto">
          <div class={container2Icon}>
            <Icon
              type="iconButton"
              name="info"
              weight="normal"
              size="md"
              color="neutral400"
              ariaLabel="Keyboard shortcuts"
              onClick={(e) => {
                e.preventDefault();
                openShortcutsModal();
              }}
            />
          </div>
        </div>
      </ScrollFadeRow>
    </div>
  );
}
