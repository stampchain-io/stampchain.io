/* ===== HOW TO RECURSIVE STAMP COMPONENT ===== */
/* Keyboard shortcuts of the recursive stamp composer. */
import { ModalBase } from "$layout";
import { subtitlePrimary, textSm } from "$text";

/* ===== DATA ===== */
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

/* ===== COMPONENT ===== */
export const StampCreateRecursiveHowto = () => {
  return (
    <ModalBase title="HOW-TO">
      <h4 class={`${subtitlePrimary} text-center -mt-3 mb-3`}>
        KEYBOARD SHORTCUTS
      </h4>

      {/* ===== SHORTCUTS LIST ===== */}
      <div class="flex flex-col gap-1.5 max-h-[80vh] overflow-y-auto scrollbar-background-layer1">
        {SHORTCUTS.map((row) => (
          <div
            key={row.action}
            class="flex justify-between items-center gap-3 py-1
              border-b border-color-neutral-800 last:border-0"
          >
            <span class={textSm}>{row.action}</span>
            <span class="font-mono text-[0.625rem] text-color-neutral-500 text-right">
              {row.keys}
            </span>
          </div>
        ))}
      </div>
    </ModalBase>
  );
};
