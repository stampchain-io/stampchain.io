import {
  extractErrorMessage,
  MAX_STAMP_FILE_BYTES,
  textToBase64,
  utf8ByteLength,
} from "$lib/utils/stamps/mintHelpers.ts";
import { buildRecursiveStampHtml } from "$lib/utils/ui/rendering/recursiveStampHtml.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";

function decodeBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

Deno.test("textToBase64 round-trips ASCII text", () => {
  const text = "<html><body>hello</body></html>";
  assertEquals(decodeBase64(textToBase64(text)), text);
  assertEquals(textToBase64(text), btoa(text));
});

Deno.test("textToBase64 round-trips non-Latin-1 text (btoa would throw)", () => {
  const text = "<div>héllo wörld ✓ 🎨 日本語</div>";
  assertEquals(decodeBase64(textToBase64(text)), text);
});

Deno.test("textToBase64 handles payloads larger than one chunk", () => {
  const text = "a".repeat(MAX_STAMP_FILE_BYTES);
  assertEquals(decodeBase64(textToBase64(text)), text);
});

Deno.test("utf8ByteLength counts bytes, not characters", () => {
  assertEquals(utf8ByteLength("abc"), 3);
  assertEquals(utf8ByteLength("é"), 2);
  assertEquals(utf8ByteLength("✓"), 3);
  assertEquals(utf8ByteLength("🎨"), 4);
});

Deno.test("generated recursive HTML encodes to base64 and stays referenced", () => {
  const html = buildRecursiveStampHtml([], "#000", false, "cpid", "Título ✓");
  const b64 = textToBase64(html);
  assertEquals(decodeBase64(b64), html);
  assertStringIncludes(html, "/s/");
  assertEquals(utf8ByteLength(html) > html.length, true);
});

Deno.test("extractErrorMessage handles strings and Error instances", () => {
  assertEquals(extractErrorMessage("boom"), "boom");
  assertEquals(extractErrorMessage(new Error("bad")), "bad");
});

Deno.test("extractErrorMessage reads axios-style response errors", () => {
  assertEquals(
    extractErrorMessage({ response: { data: { error: "Nope" } } }),
    "Nope",
  );
  assertEquals(
    extractErrorMessage({
      response: { data: { error: "Insufficient funds: need more" } },
    }),
    "Insufficient funds to cover outputs and fees",
  );
});

Deno.test("extractErrorMessage reads nested and simple messages", () => {
  assertEquals(extractErrorMessage({ error: { message: "direct" } }), "direct");
  assertEquals(
    extractErrorMessage({ details: { error: { message: "nested" } } }),
    "nested",
  );
  assertEquals(extractErrorMessage({ message: "simple" }), "simple");
});

Deno.test("extractErrorMessage falls back to a default message", () => {
  assertEquals(extractErrorMessage({}), "An unexpected error occurred");
  assertEquals(extractErrorMessage(undefined), "An unexpected error occurred");
});
