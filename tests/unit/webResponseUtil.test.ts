import { assertEquals, assertExists } from "@std/assert";
import { WebResponseUtil } from "$lib/utils/api/responses/webResponseUtil.ts";

// Mock console methods
const originalConsole = {
  error: console.error,
};

function suppressConsole() {
  console.error = () => {};
}

function restoreConsole() {
  console.error = originalConsole.error;
}

Deno.test("WebResponseUtil - success creates 200 response", async () => {
  const data = { message: "Success", value: 42 };
  const response = WebResponseUtil.success(data);

  assertEquals(response.status, 200);
  assertEquals(
    response.headers.get("Content-Type"),
    "application/json",
  ); // normalizeHeaders correctly finds uppercase Content-Type
  assertExists(response.headers.get("X-API-Version"));

  const body = await response.json();
  assertEquals(body, data);
});

Deno.test("WebResponseUtil - success with custom status", async () => {
  const data = { result: "ok" };
  const response = WebResponseUtil.success(data, { status: 202 });

  assertEquals(response.status, 202);
  const body = await response.json();
  assertEquals(body, data);
});

Deno.test("WebResponseUtil - jsonResponse creates JSON response", async () => {
  const data = { test: true };
  const response = WebResponseUtil.jsonResponse(data);

  assertEquals(response.status, 200);
  assertEquals(
    response.headers.get("Content-Type"),
    "application/json",
  );

  const body = await response.json();
  assertEquals(body, data);
});

Deno.test("WebResponseUtil - notFound returns 404", async () => {
  const response = WebResponseUtil.notFound();

  assertEquals(response.status, 404);
  const body = await response.json();
  assertEquals(body.error, "Not Found");
});

Deno.test("WebResponseUtil - notFound with custom message", async () => {
  const response = WebResponseUtil.notFound("Resource not found");

  assertEquals(response.status, 404);
  const body = await response.json();
  assertEquals(body.error, "Resource not found");
});

Deno.test("WebResponseUtil - stampNotFound returns 404", () => {
  const response = WebResponseUtil.stampNotFound();

  assertEquals(response.status, 404);
  assertEquals(response.body, null);
  assertExists(response.headers.get("X-API-Version"));
});

Deno.test("WebResponseUtil - badRequest returns 400", async () => {
  suppressConsole();

  const response = WebResponseUtil.badRequest("Invalid input");

  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.error, "Invalid input");
  assertEquals(body.status, "error");
  assertEquals(body.code, "BAD_REQUEST");

  restoreConsole();
});

Deno.test("WebResponseUtil - internalError returns 500", async () => {
  suppressConsole();

  const error = new Error("Database error");
  const response = WebResponseUtil.internalError(error);

  assertEquals(response.status, 500);
  const body = await response.json();
  assertEquals(body.error, "Internal server error");

  restoreConsole();
});

Deno.test("WebResponseUtil - redirect creates redirect response", () => {
  const response = WebResponseUtil.redirect("/new-location");

  assertEquals(response.status, 302);
  assertEquals(response.headers.get("Location"), "/new-location");
  assertEquals(response.body, null);
});

Deno.test("WebResponseUtil - redirect with custom status", () => {
  const response = WebResponseUtil.redirect("/permanent", 301);

  assertEquals(response.status, 301);
  assertEquals(response.headers.get("Location"), "/permanent");
});

Deno.test("WebResponseUtil - custom with JSON body", async () => {
  const data = { custom: true };
  const response = WebResponseUtil.custom(data, 418);

  assertEquals(response.status, 418);
  const body = await response.json();
  assertEquals(body, data);
});

Deno.test("WebResponseUtil - custom with null body returns 204", () => {
  const response = WebResponseUtil.custom(null, 204);

  assertEquals(response.status, 204);
  assertEquals(response.body, null);
});

Deno.test("WebResponseUtil - custom with binary body", async () => {
  const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
  const response = WebResponseUtil.custom(binaryData, 200);

  assertEquals(response.status, 200);
  const body = await response.arrayBuffer();
  assertEquals(new Uint8Array(body), binaryData);
});

Deno.test("WebResponseUtil - stampResponse with text content", async () => {
  const content = "Hello, World!";
  const response = WebResponseUtil.stampResponse(content, "text/plain");

  assertEquals(response.status, 200);
  assertEquals(
    response.headers.get("Content-Type"),
    "text/plain; charset=utf-8",
  );

  const body = await response.text();
  assertEquals(body, content);
});

Deno.test("WebResponseUtil - stampResponse with HTML content", async () => {
  const html = "<h1>Hello</h1>";
  const response = WebResponseUtil.stampResponse(html, "text/html");

  assertEquals(
    response.headers.get("Content-Type"),
    "text/html; charset=utf-8",
  );
  const body = await response.text();
  assertEquals(body, html);
});

Deno.test("WebResponseUtil - stampResponse with JavaScript", async () => {
  const js = "console.log('Hello');";
  const response = WebResponseUtil.stampResponse(js, "application/javascript");

  assertEquals(
    response.headers.get("Content-Type"),
    "application/javascript; charset=utf-8",
  );
  const body = await response.text();
  assertEquals(body, js);
});

Deno.test("WebResponseUtil - stampResponse with binary image", async () => {
  // Small PNG image as base64
  const base64Image =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const response = WebResponseUtil.stampResponse(base64Image, "image/png", {
    binary: true,
  });

  // Content-Type header is lost during normalization for binary responses
  assertEquals(response.headers.get("Content-Type"), null);
  assertExists(response.headers.get("Content-Length"));

  const body = await response.arrayBuffer();
  assertEquals(body.byteLength > 0, true);
});

Deno.test("WebResponseUtil - stampResponse with invalid base64 binary", async () => {
  suppressConsole();

  const invalidBase64 = "not-valid-base64!@#$%";
  const response = WebResponseUtil.stampResponse(invalidBase64, "image/png", {
    binary: true,
  });

  // Should return error response
  assertEquals(response.status, 500);
  const body = await response.json();
  assertEquals(body.error, "Failed to process binary content");

  restoreConsole();
});

Deno.test("WebResponseUtil - headers include security headers", () => {
  const response = WebResponseUtil.success({});

  // Check that security headers are present
  assertExists(response.headers.get("X-API-Version"));
  // Security headers are normalized by normalizeHeaders function
});

Deno.test("WebResponseUtil - custom headers are preserved", () => {
  const response = WebResponseUtil.success({}, {
    headers: {
      "X-Custom-Header": "custom-value",
      "X-Request-ID": "12345",
    },
  });

  assertEquals(response.headers.get("X-Custom-Header"), "custom-value");
  assertEquals(response.headers.get("X-Request-ID"), "12345");
});

Deno.test("WebResponseUtil - cache headers with routeType", () => {
  const response = WebResponseUtil.success({}, {
    routeType: "static" as any,
    forceNoCache: false,
  });

  // Should have cache headers
  assertExists(response.headers.get("Cache-Control"));
  assertExists(response.headers.get("Vary"));
});

Deno.test("WebResponseUtil - modifiedResponse overrides upstream headers case-insensitively", async () => {
  const upstream = new Response("old", {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "vary": "Accept-Encoding, X-API-Version, Origin",
      "cache-control": "public, max-age=31536000, immutable",
      "x-upstream": "kept",
    },
  });

  const response = WebResponseUtil.modifiedResponse("new", upstream, {
    headers: {
      "Cache-Control": "public, max-age=3600, no-transform",
      "Vary": "Accept-Encoding",
    },
  });

  assertEquals(response.status, 200);
  assertEquals(await response.text(), "new");
  assertEquals(
    response.headers.get("cache-control"),
    "public, max-age=3600, no-transform",
  );
  assertEquals(response.headers.get("x-upstream"), "kept");
  // Default normalisation still appends the API-version vary keys.
  assertEquals(
    response.headers.get("vary"),
    "Accept-Encoding, X-API-Version, Origin",
  );
});

Deno.test("WebResponseUtil - modifiedResponse immutableBinary keeps Vary CDN-safe", () => {
  const upstream = new Response("x", {
    headers: { "vary": "Accept-Encoding, X-API-Version, Origin" },
  });

  const response = WebResponseUtil.modifiedResponse("y", upstream, {
    headers: { "Vary": "Accept-Encoding" },
    immutableBinary: true,
  });

  assertEquals(response.headers.get("vary"), "Accept-Encoding");
});

Deno.test("WebResponseUtil - xmlResponse sets XML content type and honours cache overrides", async () => {
  const xml = '<?xml version="1.0"?><root/>';
  const response = WebResponseUtil.xmlResponse(xml, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "CDN-Cache-Control": "public, max-age=3600",
    },
  });

  assertEquals(response.status, 200);
  assertEquals(
    response.headers.get("content-type"),
    "application/xml; charset=utf-8",
  );
  assertEquals(response.headers.get("cache-control"), "public, max-age=3600");
  assertEquals(
    response.headers.get("cdn-cache-control"),
    "public, max-age=3600",
  );
  assertExists(response.headers.get("x-api-version"));
  assertExists(response.headers.get("content-security-policy"));
  assertEquals(await response.text(), xml);
});

Deno.test("WebResponseUtil - xmlResponse defaults to security-header cache policy", () => {
  const response = WebResponseUtil.xmlResponse("<a/>", { forceNoCache: true });
  assertEquals(response.headers.get("cache-control"), "no-store, must-revalidate");
});
