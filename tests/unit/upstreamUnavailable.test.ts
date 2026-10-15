/**
 * Counterparty's public node answering 429/503 is a dependency outage. Compose
 * routes must answer it with 503 + Retry-After, not an opaque 500.
 */
import { assertEquals, assertInstanceOf, assertRejects } from "@std/assert";
import { restore, stub } from "@std/testing/mock";
import { UpstreamUnavailableError } from "$lib/utils/api/upstreamUnavailableError.ts";
import { ApiResponseUtil } from "$lib/utils/api/responses/apiResponseUtil.ts";

(globalThis as any).__mockDbManager ??= {
  getCacheValue: () => Promise.resolve(null),
  setCacheValue: () => Promise.resolve(),
  handleCache: (_k: string, fetch: () => Promise<unknown>) => fetch(),
};
const { CounterpartyApiManager, _resetXcpCooldown } = await import(
  "$server/services/counterpartyApiService.ts"
);

Deno.test("internalError answers an upstream outage with 503 + Retry-After", async () => {
  const res = ApiResponseUtil.internalError(
    new UpstreamUnavailableError("Counterparty", 10),
    "Failed to process stamp detach request",
  );
  assertEquals(res.status, 503);
  assertEquals(res.headers.get("Retry-After"), "10");
  assertEquals((await res.json()).code, "SERVICE_UNAVAILABLE");
});

Deno.test("internalError still answers other errors with 500", () => {
  assertEquals(ApiResponseUtil.internalError(new Error("boom")).status, 500);
});

Deno.test({
  name: "composeDetach throws UpstreamUnavailableError on the node's 503",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    stub(globalThis, "fetch", () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: "counterparty_temporarily_unavailable",
            retry_after_seconds: 7,
          }),
          { status: 503, headers: { "content-type": "application/json" } },
        ),
      ));
    try {
      const error = await assertRejects(() =>
        CounterpartyApiManager.composeDetach(
          "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16:0",
          "bc1qzxszplp8v7w0jc89dlrqyct9staqlhwxzy7lkq",
        )
      );
      assertInstanceOf(error, UpstreamUnavailableError);
      assertEquals(error.retryAfterSeconds, 7);
    } finally {
      _resetXcpCooldown();
      restore();
    }
  },
});
