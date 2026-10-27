/**
 * POST /api/v2/ecx/broadcast: the server end of the ECX sign-only flow.
 *
 * handleEcxBroadcast takes env and fetch explicitly, so no test touches
 * Deno.env (shared by the parallel workers) or the network. The ECX node is a
 * stubbed fetch speaking bitcoind JSON-RPC; tests that must not reach the
 * node assert the stub was never called.
 */
import { assert, assertEquals } from "@std/assert";
import * as bitcoin from "bitcoinjs-lib";
import {
  ECX_REPLAY_LOCKTIME,
  SEQUENCE_FINAL,
  SEQUENCE_RBF,
  setChainEnvForTesting,
} from "$server/services/chain/chainProfile.ts";
import {
  ECX_NODE_RETRY_AFTER_SECONDS,
  handleEcxBroadcast,
  handler,
} from "../../routes/api/v2/ecx/broadcast.ts";

const NODE_URL = "http://ecx-node.test:8332";
// Generated per run: a fixed credential-looking literal trips secret scanners.
const RPC_USER = "u-" + crypto.randomUUID().slice(0, 8);
const RPC_SECRET = crypto.randomUUID();
const ECX_ON = {
  CHAIN: "ecx",
  ECX_BROADCAST_ENABLED: "true",
  ECX_NODE_RPC_URL: NODE_URL,
  ECX_NODE_RPC_USER: RPC_USER,
  ECX_NODE_RPC_PASSWORD: RPC_SECRET,
};

function env(vars: Record<string, string | undefined>) {
  return { get: (k: string) => vars[k] };
}

function txHex(locktime: number, sequence: number): string {
  const tx = new bitcoin.Transaction();
  tx.version = 2;
  tx.addInput(new Uint8Array(32).fill(0x22), 1, sequence);
  tx.addOutput(
    bitcoin.script.compile([bitcoin.opcodes.OP_0, new Uint8Array(20)]),
    7_000n,
  );
  tx.locktime = locktime;
  return tx.toHex();
}

const PROTECTED = txHex(ECX_REPLAY_LOCKTIME, SEQUENCE_RBF);
const UNPROTECTED = txHex(0, SEQUENCE_FINAL);
const PROTECTED_TXID = bitcoin.Transaction.fromHex(PROTECTED).getId();

type RpcCall = {
  url: string;
  method: string;
  params: unknown[];
  auth: string | null;
};

/** A bitcoind-shaped node: answers each call with `reply`, records the calls. */
function node(reply: (call: RpcCall) => Response | Promise<Response>) {
  const calls: RpcCall[] = [];
  const fetchImpl =
    (async (input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const call: RpcCall = {
        url: String(input),
        method: body.method,
        params: body.params,
        auth: new Headers(init?.headers).get("Authorization"),
      };
      calls.push(call);
      return await reply(call);
    }) as typeof fetch;
  return { calls, fetchImpl };
}

const rpcResult = (result: unknown) =>
  new Response(JSON.stringify({ result, error: null, id: "stampchain" }), {
    status: 200,
  });
const rpcError = (code: number, message: string) =>
  new Response(
    JSON.stringify({
      result: null,
      error: { code, message },
      id: "stampchain",
    }),
    {
      status: 500,
    },
  );

function post(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/v2/ecx/broadcast", {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "GET"
      ? undefined
      : typeof body === "string"
      ? body
      : JSON.stringify(body),
  });
}

async function errorOf(res: Response): Promise<string> {
  return (await res.json()).error;
}

// ---------------------------------------------------------------- bitcoin

Deno.test("ecx broadcast route: CHAIN=bitcoin or unset answers 404 for every method", async () => {
  for (
    const vars of [{}, { CHAIN: "bitcoin" }, {
      CHAIN: "bitcoin",
      ECX_BROADCAST_ENABLED: "true",
    }]
  ) {
    for (const method of ["POST", "GET", "PUT"]) {
      const n = node(() => rpcResult(PROTECTED_TXID));
      const res = await handleEcxBroadcast(
        post({ txHex: PROTECTED }, method),
        env(vars),
        n.fetchImpl,
      );
      assertEquals(res.status, 404, `${method} ${JSON.stringify(vars)}`);
      assertEquals(n.calls, []);
    }
  }
});

Deno.test("ecx broadcast route: the Fresh handler reads the chainProfile env seam (bitcoin -> 404)", async () => {
  const restoreEnv = setChainEnvForTesting(env({ CHAIN: "bitcoin" }));
  try {
    const res = await (handler as (req: Request) => Promise<Response>)(
      post({ txHex: PROTECTED }),
    );
    assertEquals(res.status, 404);
  } finally {
    restoreEnv();
  }
});

// ---------------------------------------------------------------- the gate

Deno.test("ecx broadcast route: ECX_BROADCAST_ENABLED off answers 403 and sends nothing", async () => {
  for (const flag of [undefined, "false", "1", "TRUE"]) {
    const n = node(() => rpcResult(PROTECTED_TXID));
    const res = await handleEcxBroadcast(
      post({ txHex: PROTECTED }),
      env({ ...ECX_ON, ECX_BROADCAST_ENABLED: flag }),
      n.fetchImpl,
    );
    assertEquals(res.status, 403, `flag=${flag}`);
    assert((await errorOf(res)).includes("ECX_BROADCAST_ENABLED"));
    assertEquals(n.calls, []);
  }
});

Deno.test("ecx broadcast route: a transaction without the replay marker answers 400 and sends nothing", async () => {
  const finalWithMarkerLocktime = txHex(ECX_REPLAY_LOCKTIME, SEQUENCE_FINAL);
  for (const hex of [UNPROTECTED, finalWithMarkerLocktime]) {
    const n = node(() => rpcResult(PROTECTED_TXID));
    const res = await handleEcxBroadcast(
      post({ txHex: hex }),
      env(ECX_ON),
      n.fetchImpl,
    );
    assertEquals(res.status, 400);
    assert((await errorOf(res)).includes("replay marker"));
    assertEquals(n.calls, []);
  }
});

// ---------------------------------------------------------------- input validation

Deno.test("ecx broadcast route: txHex must be the hex of a parseable transaction", async () => {
  const psbt = new bitcoin.Psbt();
  psbt.addInput({ hash: new Uint8Array(32), index: 0 });
  const cases: [unknown, string][] = [
    ["not json", "JSON"],
    [{}, "txHex is required"],
    [{ txHex: 42 }, "txHex is required"],
    [{ txHex: "" }, "txHex is required"],
    [{ txHex: "abc" }, "even-length hex"],
    [{ txHex: "zz".repeat(40) }, "even-length hex"],
    [{ txHex: psbt.toHex() }, "PSBT"],
    [{ txHex: "00".repeat(40) }, "not a valid transaction"],
    [{ txHex: PROTECTED + "00" }, "not a valid transaction"],
    [{ txHex: "00".repeat(400_001) }, "too large"],
  ];
  for (const [body, expected] of cases) {
    const n = node(() => rpcResult(PROTECTED_TXID));
    const res = await handleEcxBroadcast(post(body), env(ECX_ON), n.fetchImpl);
    assertEquals(res.status, 400, JSON.stringify(body).slice(0, 60));
    const error = await errorOf(res);
    assert(error.includes(expected), `${error} should mention ${expected}`);
    assertEquals(n.calls, []);
  }
});

Deno.test("ecx broadcast route: methods other than POST answer 405 under ECX", async () => {
  const n = node(() => rpcResult(PROTECTED_TXID));
  const res = await handleEcxBroadcast(
    post(null, "GET"),
    env(ECX_ON),
    n.fetchImpl,
  );
  assertEquals(res.status, 405);
  assertEquals(res.headers.get("Allow"), "POST");
  assertEquals(n.calls, []);
});

// ---------------------------------------------------------------- the node

Deno.test("ecx broadcast route: success sends sendrawtransaction to the ECX node and returns its txid", async () => {
  const n = node(() => rpcResult(PROTECTED_TXID));
  const res = await handleEcxBroadcast(
    post({ txHex: PROTECTED.toUpperCase() }),
    env(ECX_ON),
    n.fetchImpl,
  );
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { txid: PROTECTED_TXID });
  assertEquals(
    res.headers.get("Cache-Control")?.includes("no-store") ?? false,
    true,
  );
  assertEquals(n.calls.length, 1);
  assertEquals(n.calls[0].url, NODE_URL);
  assertEquals(n.calls[0].method, "sendrawtransaction");
  assertEquals(n.calls[0].params, [PROTECTED.toUpperCase()]);
  assertEquals(n.calls[0].auth, `Basic ${btoa(`${RPC_USER}:${RPC_SECRET}`)}`);
});

Deno.test("ecx broadcast route: a node rejection answers 400 with the node's reason", async () => {
  const rejections: [number, string][] = [
    [-26, "non-final"],
    [-25, "bad-txns-inputs-missingorspent"],
    [-27, "Transaction already in block chain"],
  ];
  for (const [code, message] of rejections) {
    const n = node(() => rpcError(code, message));
    const res = await handleEcxBroadcast(
      post({ txHex: PROTECTED }),
      env(ECX_ON),
      n.fetchImpl,
    );
    assertEquals(res.status, 400, `code ${code}`);
    const body = await res.json();
    assert(body.error.includes(message), body.error);
    assertEquals(body.details, { code });
    assert(
      !JSON.stringify(body).includes("ecx-node.test"),
      "node URL must not leak",
    );
    assertEquals(n.calls.length, 1);
  }
});

Deno.test("ecx broadcast route: an unreachable node answers 503 with Retry-After and no URL", async () => {
  const unreachable: [
    string,
    Record<string, string | undefined>,
    () => Response | Promise<Response>,
  ][] = [
    [
      "connection refused",
      ECX_ON,
      () =>
        Promise.reject(
          new TypeError(`error sending request for url (${NODE_URL})`),
        ),
    ],
    [
      "timeout",
      ECX_ON,
      () =>
        Promise.reject(new DOMException("signal timed out", "TimeoutError")),
    ],
    [
      "HTTP 401 without JSON",
      ECX_ON,
      () => new Response("Unauthorized", { status: 401 }),
    ],
    ["warming up (-28)", ECX_ON, () => rpcError(-28, "Loading block index...")],
    [
      "RPC URL unset",
      { ...ECX_ON, ECX_NODE_RPC_URL: undefined },
      () => rpcResult(PROTECTED_TXID),
    ],
  ];
  for (const [label, vars, reply] of unreachable) {
    const n = node(reply);
    const res = await handleEcxBroadcast(
      post({ txHex: PROTECTED }),
      env(vars),
      n.fetchImpl,
    );
    assertEquals(res.status, 503, label);
    assertEquals(
      res.headers.get("Retry-After"),
      String(ECX_NODE_RETRY_AFTER_SECONDS),
      label,
    );
    const text = await res.text();
    assert(
      !text.includes("ecx-node.test") && !text.includes(RPC_SECRET),
      `${label}: ${text}`,
    );
  }
});
