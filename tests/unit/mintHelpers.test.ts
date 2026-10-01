import {
  buildMintRequest,
  bytesToBase64,
  extractErrorMessage,
  fileToBase64,
  isStampFormValid,
  MAX_STAMP_FILE_BYTES,
  textToBase64,
  utf8ByteLength,
  validateCustomCpid,
  validateEditionsInput,
  validatePoshName,
  validateStampFile,
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

Deno.test("bytesToBase64 matches btoa for binary data", () => {
  const bytes = Uint8Array.from([0, 1, 2, 250, 251, 255]);
  assertEquals(bytesToBase64(bytes), btoa(String.fromCharCode(...bytes)));
});

Deno.test("fileToBase64 encodes raw file bytes", async () => {
  const file = new File([Uint8Array.from([1, 2, 3, 255])], "a.png");
  assertEquals(await fileToBase64(file), btoa("\x01\x02\x03\xff"));
});

Deno.test("validateStampFile enforces size and warns on non-images", () => {
  assertEquals(
    validateStampFile({ name: "a.png", size: MAX_STAMP_FILE_BYTES + 1 })
      .isValid,
    false,
  );
  assertEquals(
    validateStampFile({ name: "a.png", size: 10 }).warning,
    undefined,
  );
  assertEquals(
    validateStampFile({ name: "a.html", size: 10 }).warning,
    undefined,
  );
  assertEquals(
    validateStampFile({ name: "a.txt", size: 10 }).isValid,
    true,
  );
  assertStringIncludes(
    validateStampFile({ name: "a.txt", size: 10 }).warning ?? "",
    "Non-image",
  );
});

Deno.test("validateEditionsInput accepts digits and defaults empty to 1", () => {
  assertEquals(validateEditionsInput("12"), {
    accept: true,
    value: "12",
    error: "",
  });
  assertEquals(validateEditionsInput("").value, "1");
  assertEquals(validateEditionsInput("1a").accept, false);
  assertEquals(
    validateEditionsInput("0").error,
    "Editions must be at least 1.",
  );
});

Deno.test("validateCustomCpid enforces A + numeric range", () => {
  assertEquals(validateCustomCpid(""), { accept: true, error: "" });
  assertEquals(validateCustomCpid("A"), { accept: true, error: "" });
  assertEquals(validateCustomCpid("B1").accept, false);
  assertEquals(validateCustomCpid("A12x").accept, false);
  // typing in progress: accepted but flagged
  const partial = validateCustomCpid("A123");
  assertEquals(partial.accept, true);
  assertStringIncludes(partial.error, "Number must be between");
  // 26^12 = 95428956661682176, so +1 is the minimum
  assertEquals(validateCustomCpid("A95428956661682177").error, "");
  assertEquals(validateCustomCpid("A95428956661682176").accept, true);
  assertEquals(
    validateCustomCpid("A95428956661682176").error === "",
    false,
  );
  assertEquals(validateCustomCpid("A18446744073709551615").error, "");
  assertEquals(
    validateCustomCpid("A18446744073709551616").error === "",
    false,
  );
});

Deno.test("validatePoshName enforces B-Z start and 13 letters, allows clearing", () => {
  assertEquals(validatePoshName(""), { accept: true, error: "" });
  assertEquals(validatePoshName("Bob"), { accept: true, error: "" });
  assertEquals(validatePoshName("ZZZZZZZZZZZZZ").accept, true);
  assertEquals(validatePoshName("ZZZZZZZZZZZZZZ").accept, false);
  assertEquals(validatePoshName("Amazing").accept, false);
  assertEquals(validatePoshName("B1").accept, false);
});

Deno.test("isStampFormValid is variant aware", () => {
  const base = {
    variant: "classic" as const,
    hasPayload: true,
    issuance: "1",
    issuanceError: "",
    stampName: "",
    stampNameError: "",
    includeCustomCpid: false,
    addressError: undefined,
  };
  assertEquals(isStampFormValid(base), true);
  assertEquals(isStampFormValid({ ...base, hasPayload: false }), false);
  assertEquals(isStampFormValid({ ...base, issuance: "0" }), false);
  assertEquals(
    isStampFormValid({ ...base, extraBlockReason: "too big" }),
    false,
  );
  assertEquals(isStampFormValid({ ...base, addressError: "bad" }), false);
  // classic custom CPID requires a value
  assertEquals(isStampFormValid({ ...base, includeCustomCpid: true }), false);
  assertEquals(
    isStampFormValid({ ...base, includeCustomCpid: true, stampName: "A" }),
    false,
  );
  assertEquals(
    isStampFormValid({
      ...base,
      includeCustomCpid: true,
      stampName: "A95428956661682177",
    }),
    true,
  );
  // posh always requires a name
  assertEquals(isStampFormValid({ ...base, variant: "posh" }), false);
  assertEquals(
    isStampFormValid({ ...base, variant: "posh", stampName: "Bob" }),
    true,
  );
  assertEquals(
    isStampFormValid({
      ...base,
      variant: "posh",
      stampName: "Bob",
      stampNameError: "x",
    }),
    false,
  );
});

Deno.test("buildMintRequest sets posh flag, asset name and MARA params", () => {
  const common = {
    sourceWallet: "bc1qtest",
    payload: { file: "AAAA", filename: "a.png", fileSize: 3 },
    issuance: "5",
    isLocked: false,
    satsPerVB: 3,
    serviceFee: "100",
    serviceFeeAddress: "bc1qfee",
    includeCustomCpid: false,
  };
  const classic = buildMintRequest({
    ...common,
    variant: "classic",
    stampName: "A95428956661682177",
  });
  assertEquals(classic.isPoshStamp, false);
  assertEquals(classic.assetName, undefined);
  assertEquals(classic.dryRun, false);
  assertEquals(classic.qty, "5");
  assertEquals(classic.locked, false);

  const custom = buildMintRequest({
    ...common,
    variant: "classic",
    includeCustomCpid: true,
    stampName: "A95428956661682177",
  });
  assertEquals(custom.assetName, "A95428956661682177");

  const posh = buildMintRequest({
    ...common,
    variant: "posh",
    stampName: "Bob",
    mara: { outputValue: 100, feeRate: 6.1 },
  });
  assertEquals(posh.isPoshStamp, true);
  assertEquals(posh.assetName, "Bob");
  assertEquals(posh.outputValue, 100);
  assertEquals(posh.maraFeeRate, 6.1);

  const maraNoRate = buildMintRequest({
    ...common,
    variant: "classic",
    stampName: "",
    mara: { outputValue: 50, feeRate: null },
  });
  assertEquals("maraFeeRate" in maraNoRate, false);
});
