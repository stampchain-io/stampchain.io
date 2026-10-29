/**
 * Our ECX node is the only ECX fee source (and, with the broadcast gate, the
 * only way an ECX transaction leaves the server). estimatesmartfee is floored
 * at 1 sat/vB, and errors never expose the node URL or credentials.
 */
import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  ECX_MIN_FEE_SAT_PER_VB,
  ecxNodeRpc,
  EcxNodeRpcError,
  estimateEcxFeeSatPerVb,
  sendEcxRawTransaction,
} from "$server/services/chain/ecxNodeRpc.ts";

const URL_ = "http://ecx-node.test:8332";
const env = (extra: Record<string, string> = {}) => {
  const vars: Record<string, string> = {
    ECX_NODE_RPC_URL: URL_,
    ECX_NODE_RPC_USER: "u",
    ECX_NODE_RPC_PASSWORD: "p",
    ...extra,
  };
  return { get: (k: string) => vars[k] };
};
const rpcReply = (result: unknown, status = 200, error: unknown = null) =>
  (() =>
    Promise.resolve(
      new Response(JSON.stringify({ result, error, id: "stampchain" }), {
        status,
      }),
    )) as unknown as typeof fetch;

Deno.test("estimatesmartfee: BTC/kvB becomes sat/vB, rounded up", async () => {
  const r = await estimateEcxFeeSatPerVb(
    1,
    env(),
    rpcReply({ feerate: 0.00002345, blocks: 2 }),
  );
  assertEquals(r, { satPerVb: 3, fromNode: true });
});

Deno.test("estimatesmartfee: never below the 1 sat/vB floor", async () => {
  const r = await estimateEcxFeeSatPerVb(
    1,
    env(),
    rpcReply({ feerate: 0.000001, blocks: 2 }),
  );
  assertEquals(r.satPerVb, ECX_MIN_FEE_SAT_PER_VB);
});

Deno.test("estimatesmartfee: no estimate yet (after the fork) gives the floor", async () => {
  const r = await estimateEcxFeeSatPerVb(
    1,
    env(),
    rpcReply({ errors: ["Insufficient data or no feerate found"], blocks: 0 }),
  );
  assertEquals(r, { satPerVb: ECX_MIN_FEE_SAT_PER_VB, fromNode: false });
});

Deno.test("requests use JSON-RPC with basic auth, settings read per call", async () => {
  let seen: { url: string; auth: string | null; body: any } | null = null;
  const f = ((u: string, init: RequestInit) => {
    seen = {
      url: u,
      auth: new Headers(init.headers).get("authorization"),
      body: JSON.parse(String(init.body)),
    };
    return Promise.resolve(
      new Response(JSON.stringify({ result: "ab".repeat(32), error: null })),
    );
  }) as unknown as typeof fetch;
  const txid = await sendEcxRawTransaction("00", env(), f);
  assertEquals(txid, "ab".repeat(32));
  assertEquals(seen!.url, URL_);
  assertEquals(seen!.auth, `Basic ${btoa("u:p")}`);
  assertEquals(seen!.body.method, "sendrawtransaction");
  assertEquals(seen!.body.params, ["00"]);
});

Deno.test("an RPC error is reported by code and message, without URL or credentials", async () => {
  const e = await assertRejects(
    () =>
      sendEcxRawTransaction(
        "00",
        env(),
        rpcReply(null, 500, { code: -26, message: "non-final" }),
      ),
    EcxNodeRpcError,
  );
  assertEquals(e.code, -26);
  assert(e.message.includes("non-final"));
  assert(
    !e.message.includes("ecx-node.test") && !e.message.includes("u:p"),
    e.message,
  );
});

Deno.test("network failure and missing URL fail without leaking the address", async () => {
  const down = (() =>
    Promise.reject(
      new TypeError(`error sending request for url (${URL_})`),
    )) as unknown as typeof fetch;
  const e1 = await assertRejects(
    () => ecxNodeRpc("getblockcount", [], env(), down),
    EcxNodeRpcError,
  );
  assert(!e1.message.includes("ecx-node.test"), e1.message);
  const e2 = await assertRejects(
    () => ecxNodeRpc("getblockcount", [], { get: () => undefined }),
    EcxNodeRpcError,
  );
  assert(e2.message.includes("ECX_NODE_RPC_URL is not set"));
});

async function run(envVars: Record<string, string>, code: string) {
  const out = await new Deno.Command(Deno.execPath(), {
    args: ["eval", "--no-check", code],
    cwd: new URL("../..", import.meta.url).pathname,
    env: {
      HOME: Deno.env.get("HOME") ?? "",
      NO_COLOR: "1",
      DENO_ENV: "test",
      SKIP_REDIS_CONNECTION: "true",
      ...envVars,
    },
    clearEnv: true,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const text = new TextDecoder().decode(out.stdout) +
    new TextDecoder().decode(out.stderr);
  const line = text.trim().split("\n").filter((l) => l.startsWith("{")).pop();
  return { code: out.code, text, json: line ? JSON.parse(line) : null };
}

const PROVIDERS =
  "globalThis.__mockDbManager = { getCacheValue: () => Promise.resolve(null), setCacheValue: () => Promise.resolve(), handleCache: (_k, f) => f() };" +
  'const { createProductionFeeService } = await import("./server/services/fee/feeServiceFactory.ts");' +
  "const s = createProductionFeeService(); const d = s.dependencies ?? s.deps ?? s;" +
  "const providers = (d.feeProviders ?? s.feeProviders ?? []).map((p) => p.getName());" +
  "const fallback = (s.config ?? {}).staticFallbackRates;" +
  "console.log(JSON.stringify({ providers, fallback }));";

Deno.test("ECX: fees come only from our node, with floor-based fallbacks", async () => {
  const r = await run(
    {
      CHAIN: "ecx",
      XCP_PRIMARY_NODE_URL: "http://x.test/v2",
      MEMPOOL_API_URL: "https://esplora.ecash.ninja",
    },
    PROVIDERS,
  );
  assertEquals(r.code, 0, r.text);
  assertEquals(r.json.providers, ["ecx-node"]);
  assertEquals(r.json.fallback, { conservative: 2, normal: 1, minimum: 1 });
});

Deno.test("Bitcoin (CHAIN unset): fee providers and fallbacks unchanged", async () => {
  const r = await run({}, PROVIDERS);
  assertEquals(r.code, 0, r.text);
  assertEquals(r.json.providers, ["mempool", "quicknode"]);
  assertEquals(r.json.fallback, { conservative: 10, normal: 6, minimum: 1 });
});
