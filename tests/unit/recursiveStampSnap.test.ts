import { defaultRecursiveFilters } from "$lib/utils/ui/rendering/recursiveStampHtml.ts";
import {
  layerHitsMarquee,
  measureBadges,
  snapMove,
} from "$lib/utils/ui/rendering/recursiveStampSnap.ts";
import type { RecursiveStampLayer } from "$types/ui.d.ts";
import { assertEquals } from "@std/assert";

function layer(
  partial: Partial<RecursiveStampLayer> & { id: string },
): RecursiveStampLayer {
  return {
    name: partial.id,
    x: 10,
    y: 10,
    w: 20,
    h: 20,
    r: 0,
    flipH: false,
    flipV: false,
    op: 1,
    vis: true,
    filters: defaultRecursiveFilters(),
    ...partial,
  };
}

Deno.test("snapMove snaps left edge to 50% center", () => {
  const moving = layer({ id: "a", x: 49.4, y: 10, w: 20, h: 20 });
  const result = snapMove(
    moving.x,
    moving.y,
    moving.w,
    moving.h,
    ["a"],
    [moving],
    [],
  );
  assertEquals(Number(result.dx.toFixed(1)), 0.6);
  assertEquals(result.lines.some((l) => l.type === "v" && l.pos === 50), true);
});

Deno.test("snapMove snaps to a sibling's right edge", () => {
  const moving = layer({ id: "a", x: 30.5, y: 10, w: 20, h: 20 });
  const peer = layer({ id: "b", x: 0, y: 10, w: 30, h: 20 });
  const result = snapMove(
    moving.x,
    moving.y,
    moving.w,
    moving.h,
    ["a"],
    [moving, peer],
    [],
  );
  assertEquals(result.dx, -0.5);
  assertEquals(result.lines.some((l) => l.type === "v" && l.pos === 30), true);
});

Deno.test("measureBadges reports the gap to an overlapping neighbor", () => {
  const moving = layer({ id: "a", x: 40, y: 10, w: 20, h: 20 });
  const peer = layer({ id: "b", x: 0, y: 10, w: 30, h: 20 });
  const badges = measureBadges(moving, [moving, peer]);
  assertEquals(badges.some((b) => b.text === "10.0%"), true);
});

Deno.test("layerHitsMarquee intersects visible boxes", () => {
  const visible = layer({ id: "a", x: 10, y: 10, w: 20, h: 20 });
  const hidden = layer({ id: "b", x: 10, y: 10, w: 20, h: 20, vis: false });
  assertEquals(layerHitsMarquee(visible, 0, 0, 15, 15), true);
  assertEquals(layerHitsMarquee(visible, 50, 50, 60, 60), false);
  assertEquals(layerHitsMarquee(hidden, 0, 0, 15, 15), false);
});
