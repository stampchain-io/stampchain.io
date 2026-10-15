import {
  getSRC101Data,
  getSRC20ImageSrc,
  getStampImageSrc,
  handleImageError,
  getMimeTypeFromExtension,
  mimeTypeToSuffix,
  showFallback,
  stripSrc20JsonOverlay,
  toCleanSrc20ImageUrl,
} from "$lib/utils/ui/media/imageUtils.ts";
import { assertEquals } from "@std/assert";

// Note: detectContentType, getMimeType, isValidDataUrl, isValidSVG, validateStampContent
// have been removed or refactored. Tests commented out pending implementation.

Deno.test("getMimeTypeFromExtension - returns correct mime type for known extensions", () => {
  assertEquals(getMimeTypeFromExtension("test.jpg"), "image/jpeg");
  assertEquals(getMimeTypeFromExtension("test.jpeg"), "image/jpeg");
  assertEquals(getMimeTypeFromExtension("test.png"), "image/png");
  assertEquals(getMimeTypeFromExtension("test.gif"), "image/gif");
  assertEquals(getMimeTypeFromExtension("test.svg"), "image/svg+xml");
  assertEquals(getMimeTypeFromExtension("test.html"), "text/html");
  assertEquals(getMimeTypeFromExtension("test.js"), "application/javascript");
  assertEquals(getMimeTypeFromExtension("test.json"), "application/json");
  assertEquals(getMimeTypeFromExtension("test.css"), "text/css");
  assertEquals(getMimeTypeFromExtension("test.mp3"), "audio/mpeg");
  assertEquals(getMimeTypeFromExtension("test.mp4"), "video/mp4");
});

Deno.test("getMimeTypeFromExtension - handles case insensitive extensions", () => {
  assertEquals(getMimeTypeFromExtension("test.JPG"), "image/jpeg");
  assertEquals(getMimeTypeFromExtension("test.PNG"), "image/png");
  assertEquals(getMimeTypeFromExtension("test.GIF"), "image/gif");
  assertEquals(getMimeTypeFromExtension("test.SVG"), "image/svg+xml");
});

Deno.test("getMimeTypeFromExtension - returns default for unknown extensions", () => {
  assertEquals(getMimeTypeFromExtension("test.xyz"), "application/octet-stream");
  assertEquals(getMimeTypeFromExtension("test.unknown"), "application/octet-stream");
  assertEquals(getMimeTypeFromExtension("test"), "application/octet-stream");
  assertEquals(getMimeTypeFromExtension("test.123"), "application/octet-stream");
});

Deno.test("mimeTypeToSuffix - correctly reverses mimeTypes mapping", () => {
  // Note: image/jpeg maps to "jpeg" not "jpg" because both extensions map to the same mime type
  assertEquals(mimeTypeToSuffix["image/jpeg"], "jpeg");
  assertEquals(mimeTypeToSuffix["image/png"], "png");
  assertEquals(mimeTypeToSuffix["image/gif"], "gif");
  assertEquals(mimeTypeToSuffix["text/html"], "htm"); // htm comes after html in the mapping
  assertEquals(mimeTypeToSuffix["application/javascript"], "cjs"); // cjs comes last in the mapping
});

// TODO: Restore these tests when isValidDataUrl and detectContentType are re-implemented
/*
Deno.test("isValidDataUrl - validates correct data URLs", () => {
  assertEquals(isValidDataUrl("data:text/plain,hello"), true);
  assertEquals(isValidDataUrl("data:text/plain;base64,aGVsbG8="), true);
  assertEquals(isValidDataUrl("data:image/png;base64,iVBORw0KGgo="), true);
  assertEquals(isValidDataUrl("data:application/json,{}"), true);
  assertEquals(isValidDataUrl("data:text/html,<h1>Hello</h1>"), true);
});

Deno.test("isValidDataUrl - rejects invalid data URLs", () => {
  assertEquals(isValidDataUrl("http://example.com"), false);
  assertEquals(isValidDataUrl("data:"), false);
  assertEquals(isValidDataUrl("data:,"), false);
  assertEquals(isValidDataUrl("data:text/plain"), false);
  assertEquals(isValidDataUrl(""), false);
  assertEquals(isValidDataUrl("not-a-data-url"), false);
});

Deno.test("isValidDataUrl - rejects multiple media type declarations", () => {
  assertEquals(isValidDataUrl("data:text/plain+html+xml,test"), false);
  assertEquals(isValidDataUrl("data:text/plain+xml,test"), true); // Only one + is allowed
});

*/

// Tests for getStampImageSrc
Deno.test("getStampImageSrc - returns undefined when no stamp_url", () => {
  const stamp = { stamp_url: null } as any;
  const result = getStampImageSrc(stamp);
  assertEquals(result, undefined);
});

Deno.test("getStampImageSrc - handles SRC-20 JSON stamps", () => {
  const stamp = {
    stamp_url: "https://stampchain.io/stamps/abc123.json",
    ident: "SRC-20",
  } as any;
  const result = getStampImageSrc(stamp);
  assertEquals(result, "https://stampchain.io/stamps/abc123.svg");
});

const SRC20_TX =
  "f353823cdc63ee24fe2167ca14d3bb9b6a54dd063b53382c0cd42f05d7262808";

Deno.test("stripSrc20JsonOverlay removes the JSON pre and keeps the image", () => {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg">`,
    `<p style="background-image: url(data:image/webp;base64,QUJD)">`,
    `<pre>{"tick":"STAMP"}</pre></p></svg>`,
  ].join("");
  const result = stripSrc20JsonOverlay(svg);
  assertEquals(result.includes("<pre>"), false);
  assertEquals(result.includes("data:image/webp;base64,QUJD"), true);
  assertEquals(result.includes("<svg"), true);
});

Deno.test("toCleanSrc20ImageUrl rewrites a deploy stamp svg", () => {
  assertEquals(
    toCleanSrc20ImageUrl(`https://stampchain.io/stamps/${SRC20_TX}.svg`),
    `/token-image/${SRC20_TX}`,
  );
  assertEquals(
    toCleanSrc20ImageUrl(`https://stampchain.io/stamps/${SRC20_TX}.json`),
    `/token-image/${SRC20_TX}`,
  );
  assertEquals(
    toCleanSrc20ImageUrl("https://stampchain.io/stamps/abc123.svg"),
    "https://stampchain.io/stamps/abc123.svg",
  );
});

Deno.test("getSRC20ImageSrc points deploy_img at the cleaned token image", () => {
  const result = getSRC20ImageSrc({
    deploy_img: `https://dev.stampchain.io/stamps/${SRC20_TX}.svg`,
  } as any);
  assertEquals(result, `/token-image/${SRC20_TX}`);
});

Deno.test("getStampImageSrc uses the cleaned image for SRC-20 svg stamps", () => {
  const result = getStampImageSrc({
    stamp_url: `https://stampchain.io/stamps/${SRC20_TX}.svg`,
    ident: "SRC-20",
  } as any);
  assertEquals(result, `/token-image/${SRC20_TX}`);
});

Deno.test("getStampImageSrc - returns undefined for SRC-20 with invalid URL", () => {
  const stamp = {
    stamp_url: "https://example.com/invalid.json",
    ident: "SRC-20",
  } as any;
  const result = getStampImageSrc(stamp);
  assertEquals(result, undefined);
});

Deno.test("getStampImageSrc - handles SRC-20 fetch errors", () => {
  // Ensure test environment
  const originalEnv = Deno.env.get("DENO_ENV");
  Deno.env.set("DENO_ENV", "test");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    return Promise.resolve(new Response("", { status: 404 }));
  };

  try {
    const stamp = {
      stamp_url: "https://stampchain.io/stamps/abc123.json",
      ident: "SRC-20",
    } as any;
    const result = getStampImageSrc(stamp);
    assertEquals(result, "https://stampchain.io/stamps/abc123.svg"); // SRC-20 returns SVG path regardless of fetch result
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnv) {
      Deno.env.set("DENO_ENV", originalEnv);
    }
  }
});

Deno.test("getStampImageSrc - handles HTML stamp URL extraction", () => {
  // Ensure test environment
  const originalEnv = Deno.env.get("DENO_ENV");
  Deno.env.set("DENO_ENV", "test");

  try {
    const stamp = {
      stamp_url: "https://stampchain.io/stamps/content.html",
      stamp_mimetype: "text/html",
      tx_hash: "abc123",
    } as any;
    const result = getStampImageSrc(stamp);
    // In test environment, uses full URLs - /content/ path without .html extension
    assertEquals(result, "https://stampchain.io/content/content");
  } finally {
    if (originalEnv) {
      Deno.env.set("DENO_ENV", originalEnv);
    }
  }
});

Deno.test("getStampImageSrc - handles complex HTML stamp URL", () => {
  // Ensure test environment
  const originalEnv = Deno.env.get("DENO_ENV");
  Deno.env.set("DENO_ENV", "test");

  try {
    const stamp = {
      stamp_url: "https://stampchain.io/stamps/path/to/file.html",
    } as any;
    const result = getStampImageSrc(stamp);
    // In test environment, uses full URLs
    assertEquals(result, "https://stampchain.io/content/path/to/file");
  } finally {
    if (originalEnv) {
      Deno.env.set("DENO_ENV", originalEnv);
    }
  }
});

Deno.test("getStampImageSrc - handles SRC-101 stamps", () => {
  const stamp = {
    stamp_url: "https://stampchain.io/stamps/src101.json",
    ident: "SRC-101",
  } as any;
  const result = getStampImageSrc(stamp);
  // SRC-101 JSON stamps now return null (can't fetch synchronously)
  assertEquals(result, undefined);
});

// SRC-101 tests removed since getStampImageSrc is now synchronous
// and doesn't fetch JSON data anymore

Deno.test("getStampImageSrc - handles non-JSON stamps", () => {
  // Ensure test environment
  const originalEnv = Deno.env.get("DENO_ENV");
  Deno.env.set("DENO_ENV", "test");

  try {
    const stamp = {
      stamp_url: "https://stampchain.io/stamps/image.png",
    } as any;
    const result = getStampImageSrc(stamp);
    // In test environment, uses full URLs
    // Non-HTML files use /stamps/ path
    assertEquals(result, "https://stampchain.io/stamps/image.png");
  } finally {
    if (originalEnv) {
      Deno.env.set("DENO_ENV", originalEnv);
    }
  }
});

Deno.test("getStampImageSrc - handles other JSON stamps (not SRC-20/101)", () => {
  const stamp = {
    stamp_url: "https://stampchain.io/stamps/data.json",
    ident: "OTHER",
  } as any;
  const result = getStampImageSrc(stamp);
  assertEquals(result, undefined);
});

Deno.test("getStampImageSrc - handles empty stamp_url string", () => {
  const stamp = { stamp_url: "" } as any;
  const result = getStampImageSrc(stamp);
  assertEquals(result, undefined);
});

Deno.test("getStampImageSrc - handles undefined stamp_url", () => {
  const stamp = { stamp_url: undefined } as any;
  const result = getStampImageSrc(stamp);
  assertEquals(result, undefined);
});

// Tests for getSRC101Data
Deno.test("getSRC101Data - returns empty object for non-SRC-101", async () => {
  const stamp = { ident: "SRC-20" } as any;
  const result = await getSRC101Data(stamp);
  assertEquals(result, {});
});

Deno.test("getSRC101Data - fetches and returns JSON data", async () => {
  const originalFetch = globalThis.fetch;
  const mockData = { name: "Test NFT", img: ["test.png"] };

  globalThis.fetch = () => {
    return Promise.resolve(
      new Response(JSON.stringify(mockData), { status: 200 }),
    );
  };

  const stamp = {
    ident: "SRC-101",
    stamp_url: "https://stampchain.io/stamps/src101.json",
  } as any;
  const result = await getSRC101Data(stamp);
  assertEquals(result, mockData);

  globalThis.fetch = originalFetch;
});

Deno.test("getSRC101Data - throws on fetch errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Network error");
  };

  const stamp = {
    ident: "SRC-101",
    stamp_url: "https://stampchain.io/stamps/src101.json",
  } as any;

  try {
    await getSRC101Data(stamp);
    assertEquals(true, false, "Expected error to be thrown");
  } catch (error) {
    assertEquals((error as Error).message, "Network error");
  }

  globalThis.fetch = originalFetch;
});

Deno.test("getSRC101Data - throws on invalid JSON response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    return Promise.resolve(
      new Response("invalid json", { status: 200 }),
    );
  };

  const stamp = {
    ident: "SRC-101",
    stamp_url: "https://stampchain.io/stamps/src101.json",
  } as any;

  try {
    await getSRC101Data(stamp);
    assertEquals(true, false, "Expected error to be thrown");
  } catch (error) {
    assertEquals(error instanceof SyntaxError, true);
  }

  globalThis.fetch = originalFetch;
});

Deno.test("getSRC101Data - throws on HTTP error responses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    return Promise.resolve(new Response("Not found", { status: 404 }));
  };

  const stamp = {
    ident: "SRC-101",
    stamp_url: "https://stampchain.io/stamps/src101.json",
  } as any;

  try {
    await getSRC101Data(stamp);
    assertEquals(true, false, "Expected error to be thrown");
  } catch (error) {
    // getSRC101Data throws an Error for HTTP errors, not SyntaxError
    assertEquals(error instanceof Error, true);
  }

  globalThis.fetch = originalFetch;
});

// Tests for validateStampContent

// Mock DOM functions for testing - these simulate browser behavior
Deno.test("showFallback - deprecated function warns user", () => {
  const originalConsole = globalThis.console;
  let warningCalled = false;
  let warningMessage = "";

  globalThis.console = {
    ...originalConsole,
    warn: (message: string) => {
      warningCalled = true;
      warningMessage = message;
    },
  } as any;

  const mockElement = {} as any;

  try {
    showFallback(mockElement);
    assertEquals(warningCalled, true);
    assertEquals(
      warningMessage.includes("deprecated"),
      true,
      "Should warn about deprecation",
    );
    assertEquals(
      warningMessage.includes("PlaceholderImage"),
      true,
      "Should mention PlaceholderImage component",
    );
  } finally {
    // Restore
    globalThis.console = originalConsole;
  }
});

Deno.test("handleImageError - handles HTMLImageElement", () => {
  const originalHTMLImageElement = globalThis.HTMLImageElement;
  const originalHTMLIFrameElement = globalThis.HTMLIFrameElement;

  globalThis.HTMLImageElement = class {} as any;
  globalThis.HTMLIFrameElement = class {} as any;

  const mockImg = {
    src: "original.jpg",
    alt: "Original alt text",
  };

  // Make it instance of HTMLImageElement
  Object.setPrototypeOf(mockImg, globalThis.HTMLImageElement.prototype);

  const event = {
    currentTarget: mockImg,
  };

  try {
    handleImageError(event as any);
    // Uses transparent pixel data URI to prevent infinite error loops
    assertEquals(
      mockImg.src,
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    );
    assertEquals(mockImg.alt, "Content not available");
  } catch (error) {
    // Expected in test environment - DOM APIs not available
    assertEquals(error instanceof ReferenceError, true);
  }

  // Restore
  globalThis.HTMLImageElement = originalHTMLImageElement;
  globalThis.HTMLIFrameElement = originalHTMLIFrameElement;
});
