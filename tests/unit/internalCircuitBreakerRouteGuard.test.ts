/**
 * /api/internal/test-reset-circuit-breakers must require the internal API key
 * for both methods. It shipped unguarded, so anyone could POST to re-open every
 * circuit breaker in production and GET upstream health metrics.
 */
import { assertEquals } from "@std/assert";
import { handler } from "../../routes/api/internal/test-reset-circuit-breakers.ts";

type RouteHandler = (
  req: Request,
  ctx: unknown,
) => Response | Promise<Response>;
const post = handler.POST as RouteHandler;
const get = handler.GET as RouteHandler;

// serverConfig.INTERNAL_API_KEY is a getter over Deno.env, so the env var is
// the only knob; always restore it so nothing leaks into other test files.
function withApiKey(key: string, fn: () => Promise<void>) {
  const original = Deno.env.get("INTERNAL_API_KEY");
  Deno.env.set("INTERNAL_API_KEY", key);
  return fn().finally(() => {
    if (original === undefined) Deno.env.delete("INTERNAL_API_KEY");
    else Deno.env.set("INTERNAL_API_KEY", original);
  });
}

const url = "http://localhost/api/internal/test-reset-circuit-breakers";

Deno.test("circuit-breaker reset: POST without X-API-Key is rejected", async () => {
  await withApiKey("test-internal-key", async () => {
    const res = await post(new Request(url, { method: "POST" }), {});
    assertEquals(res.status, 401);
    await res.body?.cancel();
  });
});

Deno.test("circuit-breaker reset: POST with a wrong key is rejected", async () => {
  await withApiKey("test-internal-key", async () => {
    const res = await post(
      new Request(url, { method: "POST", headers: { "X-API-Key": "nope" } }),
      {},
    );
    assertEquals(res.status >= 400, true);
    await res.body?.cancel();
  });
});

Deno.test("circuit-breaker metrics: GET without X-API-Key is rejected", async () => {
  await withApiKey("test-internal-key", async () => {
    const res = await get(new Request(url), {});
    assertEquals(res.status, 401);
    await res.body?.cancel();
  });
});

Deno.test("circuit-breaker reset: correct key still resets and reports", async () => {
  await withApiKey("test-internal-key", async () => {
    const headers = { "X-API-Key": "test-internal-key" };
    const reset = await post(new Request(url, { method: "POST", headers }), {});
    assertEquals(reset.status, 200);
    const body = await reset.json();
    assertEquals(body.message, "All circuit breakers reset successfully");
    const metrics = await get(new Request(url, { headers }), {});
    assertEquals(metrics.status, 200);
    assertEquals(typeof (await metrics.json()).circuitBreakers, "object");
  });
});
