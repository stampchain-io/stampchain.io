import { assertEquals } from "@std/assert";
import {
  isValidDeployCoverSize,
  normalizeExternalImageRef,
  SRC20_DEPLOY_COVER_SIZE,
  toOriginRelative,
  topCenterRelative,
} from "$lib/utils/src20/deployTool.ts";

Deno.test("isValidDeployCoverSize accepts only 420x420", () => {
  assertEquals(SRC20_DEPLOY_COVER_SIZE, 420);
  assertEquals(isValidDeployCoverSize(420, 420), true);
  assertEquals(isValidDeployCoverSize(420, 419), false);
  assertEquals(isValidDeployCoverSize(421, 420), false);
  assertEquals(isValidDeployCoverSize(0, 0), false);
});

Deno.test("normalizeExternalImageRef trims long st: references to 20 chars", () => {
  const long = "st:" + "a".repeat(30);
  assertEquals(normalizeExternalImageRef(long), "st:" + "a".repeat(20));
  assertEquals(normalizeExternalImageRef(long).length, 23);
});

Deno.test("normalizeExternalImageRef leaves other values alone", () => {
  const exact = "st:" + "b".repeat(20);
  assertEquals(normalizeExternalImageRef(exact), exact);
  assertEquals(normalizeExternalImageRef("st:short"), "st:short");
  assertEquals(normalizeExternalImageRef(""), "");
  const notSt = "ar:" + "c".repeat(40);
  assertEquals(normalizeExternalImageRef(notSt), notSt);
});

Deno.test("toOriginRelative returns viewport coords without an origin", () => {
  assertEquals(toOriginRelative({ clientX: 10, clientY: 20 }), {
    x: 10,
    y: 20,
  });
  assertEquals(toOriginRelative({ clientX: 10, clientY: 20 }, null), {
    x: 10,
    y: 20,
  });
});

Deno.test("toOriginRelative subtracts the origin corner", () => {
  assertEquals(
    toOriginRelative({ clientX: 110, clientY: 70 }, { left: 100, top: 50 }),
    { x: 10, y: 20 },
  );
});

Deno.test("topCenterRelative centers over the rect from the origin", () => {
  const rect = { left: 200, top: 80, width: 40 };
  assertEquals(topCenterRelative(rect), { x: 220, y: 80 });
  assertEquals(topCenterRelative(rect, { left: 100, top: 30 }), {
    x: 120,
    y: 50,
  });
});
