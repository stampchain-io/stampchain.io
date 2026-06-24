import { assertEquals } from "@std/assert";
import {
  fetchFromEsplora,
  getEsploraProviders,
} from "$server/services/utxo/esploraFetch.ts";
import type {
  HttpClient,
  HttpResponse,
} from "$server/interfaces/httpClient.ts";

/**
 * Minimal HttpClient stub: maps a URL substring to a canned response (or throws
 * if the value is an Error). Records every URL it was asked for so tests can
 * assert provider ordering / short-circuiting.
 */
function makeHttpClient(
  handler: (url: string) => HttpResponse | Error,
): { client: HttpClient; calls: string[] } {
  const calls: string[] = [];
  const get = (url: string): Promise<HttpResponse> => {
    calls.push(url);
    const result = handler(url);
    if (result instanceof Error) return Promise.reject(result);
    return Promise.resolve(result);
  };
  // Only `get` is exercised by fetchFromEsplora; cast the rest.
  const client = { get } as unknown as HttpClient;
  return { client, calls };
}

function ok(data: unknown): HttpResponse {
  return { data, status: 200, statusText: "OK", headers: {}, ok: true };
}
function notOk(status = 503): HttpResponse {
  return { data: null, status, statusText: "ERR", headers: {}, ok: false };
}

const [PRIMARY, FALLBACK] = getEsploraProviders();

Deno.test("fetchFromEsplora: returns primary result and does NOT call fallback", async () => {
  const { client, calls } = makeHttpClient(() => ok("deadbeef"));
  const result = await fetchFromEsplora<string>(
    "/tx/abc/hex",
    client,
    (d) => (typeof d === "string" ? d : null),
  );
  assertEquals(result, "deadbeef");
  assertEquals(calls.length, 1);
  assertEquals(calls[0], `${PRIMARY.baseUrl}/tx/abc/hex`);
});

Deno.test("fetchFromEsplora: falls back to second provider when primary is non-OK", async () => {
  const { client, calls } = makeHttpClient((url) =>
    url.startsWith(PRIMARY.baseUrl) ? notOk() : ok("cafe")
  );
  const result = await fetchFromEsplora<string>(
    "/tx/abc/hex",
    client,
    (d) => (typeof d === "string" ? d : null),
  );
  assertEquals(result, "cafe");
  assertEquals(calls.length, 2);
  assertEquals(calls[1], `${FALLBACK.baseUrl}/tx/abc/hex`);
});

Deno.test("fetchFromEsplora: falls back when primary THROWS (outage)", async () => {
  const { client } = makeHttpClient((url) =>
    url.startsWith(PRIMARY.baseUrl) ? new Error("ECONNRESET") : ok("beef")
  );
  const result = await fetchFromEsplora<string>(
    "/tx/abc/hex",
    client,
    (d) => (typeof d === "string" ? d : null),
  );
  assertEquals(result, "beef");
});

Deno.test("fetchFromEsplora: falls back when extract rejects primary payload as malformed", async () => {
  const { client, calls } = makeHttpClient((url) =>
    url.startsWith(PRIMARY.baseUrl) ? ok({ malformed: true }) : ok({ value: 5 })
  );
  const result = await fetchFromEsplora<number>(
    "/tx/abc",
    client,
    (d) => {
      const v = (d as { value?: number }).value;
      return typeof v === "number" ? v : null;
    },
  );
  assertEquals(result, 5);
  assertEquals(calls.length, 2);
});

Deno.test("fetchFromEsplora: returns null when ALL providers fail", async () => {
  const { client, calls } = makeHttpClient(() => notOk(500));
  const result = await fetchFromEsplora<string>(
    "/tx/abc/hex",
    client,
    (d) => (typeof d === "string" ? d : null),
  );
  assertEquals(result, null);
  assertEquals(calls.length, getEsploraProviders().length);
});

Deno.test("getEsploraProviders: mempool.space is primary, blockstream.info is fallback", () => {
  const providers = getEsploraProviders();
  assertEquals(providers[0].name, "mempool.space");
  assertEquals(providers[1].name, "blockstream.info");
});
