import { assertEquals, assertExists } from "@std/assert";
import {
  getBinaryContentHeaders,
  getHtmlHeaders,
  getRecursiveHeaders,
  getSecurityHeaders,
  getStampContentHeaders,
  STAMP_CONTENT_CSP,
} from "$lib/utils/security/securityHeaders.ts";

// Every producer is consumed via object spread. A `Headers` instance has no own
// enumerable properties, so spreading one yields {} and drops everything — the
// exact regression that hid the security headers on stamp content (task 1230).
function assertPlainRecord(name: string, value: unknown) {
  assertEquals(value instanceof Headers, false, `${name} returned Headers`);
  assertEquals(
    Object.keys(value as object).length > 0,
    true,
    `${name} has no own enumerable keys`,
  );
  assertEquals(
    Object.keys({ ...(value as object) }).length,
    Object.keys(value as object).length,
    `${name} loses keys when spread`,
  );
}

Deno.test("securityHeaders - producers return spreadable plain records", () => {
  assertPlainRecord("getSecurityHeaders", getSecurityHeaders());
  assertPlainRecord("getHtmlHeaders", getHtmlHeaders());
  assertPlainRecord("getRecursiveHeaders", getRecursiveHeaders());
  assertPlainRecord(
    "getBinaryContentHeaders",
    getBinaryContentHeaders("image/png"),
  );
  assertPlainRecord(
    "getStampContentHeaders",
    getStampContentHeaders("text/html"),
  );
});

Deno.test("securityHeaders - getHtmlHeaders = web policy + html content type", () => {
  const headers = getHtmlHeaders();
  assertEquals(headers["Content-Type"], "text/html; charset=utf-8");
  assertEquals(
    headers["Content-Security-Policy"],
    getSecurityHeaders({ context: "web" })["Content-Security-Policy"],
  );
  assertEquals(
    getHtmlHeaders({ forceNoCache: true })["Cache-Control"],
    "no-store, must-revalidate",
  );
});

Deno.test("securityHeaders - getRecursiveHeaders / getBinaryContentHeaders use the recursive policy", () => {
  const recursive = getRecursiveHeaders();
  assertEquals(recursive["Cross-Origin-Resource-Policy"], "cross-origin");
  assertEquals(
    recursive["Content-Security-Policy"].includes("frame-ancestors *"),
    true,
  );

  const binary = getBinaryContentHeaders("image/gif");
  assertEquals(binary["Content-Type"], "image/gif");
  assertEquals(
    binary["Content-Security-Policy"],
    recursive["Content-Security-Policy"],
  );
});

Deno.test("securityHeaders - getStampContentHeaders(html) = embedding policy only", () => {
  const headers = getStampContentHeaders("text/html");
  assertEquals(headers, {
    "Content-Type": "text/html",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Security-Policy": STAMP_CONTENT_CSP,
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
  });
  assertEquals(STAMP_CONTENT_CSP, "frame-ancestors 'self'");
});

Deno.test("securityHeaders - getStampContentHeaders(non-html) has no CSP", () => {
  for (const mime of ["image/svg+xml", "application/javascript", "image/png"]) {
    const headers = getStampContentHeaders(mime);
    assertEquals(headers, {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  }
  assertEquals(
    getStampContentHeaders("image/png", { forceNoCache: true })[
      "Cache-Control"
    ],
    "no-store, must-revalidate",
  );
});

Deno.test("securityHeaders - getSecurityHeaders returns a fresh copy per call", () => {
  const first = getSecurityHeaders({ context: "api" });
  first["Cache-Control"] = "mutated";
  const second = getSecurityHeaders({ context: "api" });
  assertExists(second["Cache-Control"]);
  assertEquals(second["Cache-Control"] === "mutated", false);
});
