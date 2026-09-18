import {
  buildRecursiveStampHtml,
  defaultRecursiveFilters,
  RECURSIVE_STAMP_CSS_CPID,
  RECURSIVE_STAMP_CSS_SRC,
  RECURSIVE_STAMP_CSS_TX_HASH,
} from "$lib/utils/ui/rendering/recursiveStampHtml.ts";
import type { RecursiveStampLayer } from "$types/ui.d.ts";
import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";

const CPID = "A11111111111111111111";
const TX_HASH =
  "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

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

const stampLayer = layer({
  id: "s1",
  cpid: CPID,
  hash: TX_HASH,
  mime: "image/png",
});

Deno.test("cpid mode emits /s/{cpid} and not the tx hash", () => {
  const html = buildRecursiveStampHtml([stampLayer], "#000", false, "cpid");
  assertStringIncludes(html, `src="/s/${CPID}"`);
  assertFalse(html.includes(TX_HASH));
});

Deno.test("txHash mode emits /s/{hash}", () => {
  const html = buildRecursiveStampHtml([stampLayer], "#000", false, "txHash");
  assertStringIncludes(html, `src="/s/${TX_HASH}"`);
  assertFalse(html.includes(`/s/${CPID}`));
});

Deno.test("txHash with missing hash falls back to cpid", () => {
  const noHash = layer({
    id: "s2",
    cpid: CPID,
    mime: "image/png",
  });
  const html = buildRecursiveStampHtml([noHash], "#000", false, "txHash");
  assertStringIncludes(html, `src="/s/${CPID}"`);
});

Deno.test("text layers keep the same markup aside from script src", () => {
  const text = layer({
    id: "t1",
    type: "text",
    text: "Hello",
    font: "Arial",
    fontSize: 5,
    color: "#fff",
  });
  const cpidHtml = buildRecursiveStampHtml([text], "#000", false, "cpid");
  const txHtml = buildRecursiveStampHtml([text], "#000", false, "txHash");
  const stripScript = (html: string) =>
    html.replace(/<script src="[^"]+"><\/script>/, "<script></script>");
  assertEquals(stripScript(cpidHtml), stripScript(txHtml));
  assertStringIncludes(cpidHtml, ">Hello</div>");
  assertFalse(cpidHtml.includes("<img"));
  assertFalse(cpidHtml.includes("<iframe"));
});

Deno.test("layout CSS script src follows cpid vs txHash", () => {
  const cpidHtml = buildRecursiveStampHtml([stampLayer], "#000", false, "cpid");
  const txHtml = buildRecursiveStampHtml(
    [stampLayer],
    "#000",
    false,
    "txHash",
  );
  assertStringIncludes(cpidHtml, `src="${RECURSIVE_STAMP_CSS_SRC}"`);
  assertFalse(cpidHtml.includes(RECURSIVE_STAMP_CSS_TX_HASH));
  assertStringIncludes(txHtml, `src="/s/${RECURSIVE_STAMP_CSS_TX_HASH}"`);
  assertFalse(txHtml.includes(`/s/${RECURSIVE_STAMP_CSS_CPID}`));
});
