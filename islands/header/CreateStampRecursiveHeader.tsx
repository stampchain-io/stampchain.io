/* ===== CREATE STAMP RECURSIVE HEADER ===== */
import { Icon } from "$icon";
import { container2Icon, ScrollFadeRow } from "$layout";
import {
  redo,
  rsbGrid,
  rsbRulers,
  rsbSnap,
  toggleGuide,
  undo,
  useRecursiveStampState,
} from "$lib/hooks/useRecursiveStampState.ts";
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
      size="md"
      color={props.active ? "primary400" : "neutral400"}
      ariaLabel={props.label}
      className={props.disabled ? "opacity-80 pointer-events-none" : ""}
      onClick={props.disabled ? undefined : (e) => {
        e.preventDefault();
        props.onClick?.(e);
      }}
    />
  );
}

export function CreateStampRecursiveHeader(
  _props: CreateStampRecursiveHeaderProps = {},
) {
  const { canUndo, canRedo, snap, grid, rulers, guideH, guideV } =
    useRecursiveStampState();

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
              active={guideH}
              onClick={() => toggleGuide("h")}
            />
            <PlaceholderIcon
              name="verticalGuide"
              label="Vertical guide"
              active={guideV}
              onClick={() => toggleGuide("v")}
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
        </div>
      </ScrollFadeRow>
    </div>
  );
}
