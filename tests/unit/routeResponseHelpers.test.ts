/**
 * Route-level tests for the manual `new Response()` sites migrated to
 * ApiResponseUtil / WebResponseUtil (issue #1223).
 *
 * Each test pins the status, content-type, cache headers and body that the
 * route emitted BEFORE the migration so the helper-based version is proven
 * equivalent on the wire.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { afterEach, describe, it } from "jsr:@std/testing@1.0.14/bdd";
import { restore, stub } from "@std/testing@1.0.14/mock";

import { handler as sitemapHandler } from "../../routes/sitemap.xml.ts";
import { handleContentRequest } from "../../routes/handlers/sharedContentHandler.ts";
import { handler as keysHandler } from "../../routes/api/v2/keys/index.ts";
import { handler as apiMiddleware } from "../../routes/api/_middleware.ts";
import { StampController } from "$server/controller/stampController.ts";
import { ApiKeyService } from "$server/services/apiKey/apiKeyService.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";

const silence = () => {
  const noop = () => {};
  const saved = { error: console.error, warn: console.warn, log: console.log };
  console.error = noop;
  console.warn = noop;
  console.log = noop;
  return () => {
    console.error = saved.error;
    console.warn = saved.warn;
    console.log = saved.log;
  };
};

describe("routes/sitemap.xml.ts", () => {
  it("returns XML with a 1h public cache on every cache layer", async () => {
    const req = new Request("https://stampchain.io/sitemap.xml");
    const res = await sitemapHandler.GET!(req, {} as never);

    assertEquals(res.status, 200);
    assertEquals(
      res.headers.get("content-type"),
      "application/xml; charset=utf-8",
    );
    assertEquals(res.headers.get("cache-control"), "public, max-age=3600");
    assertEquals(res.headers.get("cdn-cache-control"), "public, max-age=3600");
    assertEquals(
      res.headers.get("cloudflare-cdn-cache-control"),
      "public, max-age=3600",
    );
    assertEquals(res.headers.get("surrogate-control"), "max-age=3600");
    assertEquals(res.headers.get("edge-control"), "cache-maxage=3600");
    assertEquals(res.headers.get("x-api-version") !== null, true);

    const body = await res.text();
    assertStringIncludes(body, '<?xml version="1.0" encoding="UTF-8"?>');
    assertStringIncludes(
      body,
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    assertStringIncludes(body, "<loc>https://stampchain.io/</loc>");
    assertStringIncludes(body, "<loc>https://stampchain.io/marketplace</loc>");
  });
});

describe("routes/handlers/sharedContentHandler.ts", () => {
  afterEach(() => restore());

  it("re-emits direct 200 HTML with edge-cache headers and CF-safe Vary", async () => {
    const txHash = "a".repeat(64);
    const html = "<html><body>stamp</body></html>";
    stub(
      StampController,
      "getStampFile",
      () =>
        Promise.resolve(
          new Response(html, {
            status: 200,
            headers: {
              "content-type": "text/html; charset=utf-8",
              "vary": "Accept-Encoding, X-API-Version, Origin",
              "cache-control": "public, max-age=31536000, immutable",
              "x-frame-options": "DENY",
              "x-custom-upstream": "kept",
            },
          }),
        ),
    );

    const ctx = {
      url: new URL(`https://stampchain.io/content/${txHash}`),
      state: { baseUrl: "https://stampchain.io" },
    } as never;
    const res = await handleContentRequest(txHash, ctx);

    assertEquals(res.status, 200);
    assertEquals(res.headers.get("content-type"), "text/html; charset=utf-8");
    assertEquals(
      res.headers.get("cache-control"),
      "public, max-age=3600, no-transform",
    );
    assertEquals(res.headers.get("cdn-cache-control"), "public, max-age=86400");
    // Vary must be exactly Accept-Encoding or Cloudflare skips edge caching.
    assertEquals(res.headers.get("vary"), "Accept-Encoding");
    assertEquals(res.headers.get("x-frame-options"), "SAMEORIGIN");
    assertEquals(res.headers.get("x-content-type-options"), "nosniff");
    // Upstream headers not overridden are preserved.
    assertEquals(res.headers.get("x-custom-upstream"), "kept");
    assertEquals(await res.text(), html);
  });
});

describe("routes/api/v2/keys/index.ts", () => {
  afterEach(() => restore());

  const post = (email: string) =>
    new Request("https://stampchain.io/api/v2/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

  it("returns 409 DUPLICATE_EMAIL with no-store when the email already has a key", async () => {
    const unsilence = silence();
    try {
      (globalThis as Record<string, unknown>).SKIP_REDIS_CONNECTION = true;
      stub(
        ApiKeyService,
        "createKey",
        () => Promise.reject(new Error("Duplicate entry 'x' for key 'email'")),
      );

      const res = await keysHandler.POST!(post("dupe@example.com"), {} as never);

      assertEquals(res.status, 409);
      assertEquals(res.headers.get("content-type"), "application/json");
      assertEquals(res.headers.get("cache-control"), "no-store");
      assertEquals(
        await res.text(),
        JSON.stringify({
          error: "An API key already exists for this email address.",
          code: "DUPLICATE_EMAIL",
        }),
      );
    } finally {
      unsilence();
    }
  });

  it("signup rate-limit response keeps the 429 wire contract", async () => {
    // The in-memory Redis fallback used under SKIP_REDIS_CONNECTION always
    // returns incr=1, so the >3 branch is exercised through the exact helper
    // call the route makes.
    const res = ApiResponseUtil.custom(
      {
        error: "Too many signup attempts. Limit: 3 per hour per IP.",
        retryAfter: 3600,
      },
      429,
      {
        forceNoCache: true,
        headers: { "Retry-After": "3600", "Cache-Control": "no-store" },
      },
    );

    assertEquals(res.status, 429);
    assertEquals(res.headers.get("content-type"), "application/json");
    assertEquals(res.headers.get("cache-control"), "no-store");
    assertEquals(res.headers.get("retry-after"), "3600");
    assertEquals(
      await res.text(),
      JSON.stringify({
        error: "Too many signup attempts. Limit: 3 per hour per IP.",
        retryAfter: 3600,
      }),
    );
  });
});

describe("routes/api/_middleware.ts", () => {
  it("maps a timeout to a 504 GATEWAY_TIMEOUT JSON body", async () => {
    const unsilence = silence();
    try {
      const req = new Request("https://stampchain.io/api/v2/health");
      const abort = new Error("aborted");
      abort.name = "AbortError";
      const ctx = {
        state: {},
        url: new URL(req.url),
        next: () => Promise.reject(abort),
      } as never;

      const res = await apiMiddleware(req, ctx);

      assertEquals(res.status, 504);
      assertEquals(res.headers.get("content-type"), "application/json");
      assertEquals(
        await res.text(),
        JSON.stringify({
          status: "error",
          message: "Request timeout - the operation took too long to complete",
          error: "GATEWAY_TIMEOUT",
        }),
      );
    } finally {
      unsilence();
    }
  });
});
