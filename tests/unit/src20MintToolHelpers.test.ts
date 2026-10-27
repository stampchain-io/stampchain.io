import { assertEquals } from "@std/assert";
import {
  buildMintDataUrl,
  formatMintProgress,
  mintProgressWidth,
} from "$lib/utils/bitcoin/src20/mintTool.ts";

Deno.test("buildMintDataUrl - plain tick", () => {
  assertEquals(buildMintDataUrl("KEVIN"), "/api/v2/src20/tick/KEVIN/mintData");
});

Deno.test("buildMintDataUrl - encodes characters that break the path", () => {
  assertEquals(
    buildMintDataUrl("A#B?/C"),
    "/api/v2/src20/tick/A%23B%3F%2FC/mintData",
  );
});

Deno.test("buildMintDataUrl - round-trips emoji ticks through decodeURIComponent", () => {
  const tick = "\u{1F438}FROG";
  const segment = buildMintDataUrl(tick).split("/")[5];
  assertEquals(decodeURIComponent(segment), tick);
});

Deno.test("formatMintProgress - truncates to two decimals without rounding", () => {
  assertEquals(formatMintProgress(12.3456), "12.34");
  assertEquals(formatMintProgress("99.999"), "99.99");
  assertEquals(formatMintProgress(100), "100");
  assertEquals(formatMintProgress(0), "0");
});

Deno.test("formatMintProgress - missing or non-numeric shows 0", () => {
  assertEquals(formatMintProgress(null), "0");
  assertEquals(formatMintProgress(undefined), "0");
  assertEquals(formatMintProgress("n/a"), "0");
});

Deno.test("mintProgressWidth - numeric and fallback widths", () => {
  assertEquals(mintProgressWidth("42.5"), "42.5%");
  assertEquals(mintProgressWidth(0), "0%");
  assertEquals(mintProgressWidth("n/a"), "0%");
});
