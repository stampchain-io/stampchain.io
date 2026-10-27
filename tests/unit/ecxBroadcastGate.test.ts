/**
 * ECX broadcast gate: assertBroadcastAllowed plus every server site that
 * sends or accepts a signed transaction (MaraSlipstreamService.submitTransaction
 * and POST /api/internal/mara-submit), plus the browser broadcaster in
 * lib/utils/bitcoin/minting/broadcast.ts (which hands ECX transactions to the
 * server) and the /config chain field.
 *
 * Network is stubbed at FetchHttpClient.prototype.post; refusals must leave
 * it uncalled. No test writes Deno.env, which the parallel workers share.
 */
import { assert, assertEquals, assertInstanceOf, assertRejects, assertThrows } from "@std/assert";
import { restore, stub } from "@std/testing@1.0.14/mock";
import * as bitcoin from "bitcoinjs-lib";
import { FetchHttpClient } from "$server/interfaces/httpClient.ts";
import { MaraSlipstreamService } from "$server/services/mara/maraSlipstreamService.ts";
import {
  assertBroadcastAllowed,
  BroadcastRefusedError,
  ECX_REPLAY_LOCKTIME,
  SEQUENCE_FINAL,
  SEQUENCE_RBF,
  setChainEnvForTesting,
} from "$server/services/chain/chainProfile.ts";
import { InternalRouteGuard } from "$server/services/security/internalRouteGuard.ts";
import { getMaraConfig } from "$server/config/config.ts";
import { assertValidMaraConfig } from "$server/config/maraConfigValidator.ts";
import { getClientConfig } from "$server/config/config.ts";
import {
  broadcastTransaction,
  ECX_BROADCAST_PATH,
  ECX_BROWSER_BROADCAST_REFUSED,
  getPageChain,
} from "$lib/utils/minting/broadcast.ts";
import { handler } from "../../routes/api/internal/mara-submit.ts";

const MARA_TXID = "ab".repeat(32);
const maraConfig = {
  enabled: true,
  apiBaseUrl: "https://test-slipstream.mara.com/rest-api",
  apiTimeout: 30000,
  serviceFeeAddress: "bc1qtest",
  serviceFeeSats: 42000,
  clientCode: "test-client",
};

function txHex(locktime: number, sequence: number): string {
  const tx = new bitcoin.Transaction();
  tx.version = 2;
  tx.addInput(new Uint8Array(32).fill(0x11), 0, sequence);
  const script = new Uint8Array(22);
  script[1] = 20;
  tx.addOutput(script, 5_000n);
  tx.locktime = locktime;
  return tx.toHex();
}

const PROTECTED = txHex(ECX_REPLAY_LOCKTIME, SEQUENCE_RBF);
const UNPROTECTED = txHex(0, SEQUENCE_FINAL);

/**
 * Run fn with the gate reading `vars` instead of the process env. Deno.env is
 * process-wide and shared by the parallel test workers, so setting CHAIN there
 * would leak into other files; the chainProfile seam is per worker. Restored
 * in finally.
 */
async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const restoreEnv = setChainEnvForTesting({ get: (k: string) => vars[k] });
  try {
    await fn();
  } finally {
    restoreEnv();
  }
}

/** Stub MARA config and the HTTP layer; returns the list of upstream POST bodies. */
async function withMaraStub(fn: (sent: unknown[]) => Promise<void>) {
  const sent: unknown[] = [];
  MaraSlipstreamService.setConfigProvider({ getMaraConfig: () => maraConfig as never });
  MaraSlipstreamService.setConfigValidator({ assertValidMaraConfig: () => maraConfig as never });
  MaraSlipstreamService.resetCircuitBreaker();
  // The API-key guard has its own tests; stubbing it avoids touching the
  // process-wide INTERNAL_API_KEY that other parallel test files set.
  stub(InternalRouteGuard, "requireAPIKey", () => null);
  stub(FetchHttpClient.prototype, "post", (_url: string, body: unknown) => {
    sent.push(body);
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      data: { message: MARA_TXID, status: "success" },
      headers: new Headers(),
    // deno-lint-ignore no-explicit-any
    }) as any;
  });
  try {
    await fn(sent);
  } finally {
    restore();
    MaraSlipstreamService.setConfigProvider({ getMaraConfig });
    MaraSlipstreamService.setConfigValidator({ assertValidMaraConfig });
  }
}

function submit(hex: string): Promise<Response> {
  const req = new Request("http://localhost/api/internal/mara-submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hex, priority: "high" }),
  });
  // deno-lint-ignore no-explicit-any
  return (handler as any).POST(req, {} as any);
}

// ---------------------------------------------------------------- helper

Deno.test("assertBroadcastAllowed: bitcoin never blocks and never parses", () => {
  const env = (vars: Record<string, string>) => ({ get: (k: string) => vars[k] });
  assertBroadcastAllowed("not-hex-at-all", env({}));
  assertBroadcastAllowed(UNPROTECTED, env({ CHAIN: "bitcoin" }));
  assertBroadcastAllowed(UNPROTECTED, env({ CHAIN: "bitcoin", ECX_BROADCAST_ENABLED: "false" }));
});

Deno.test("assertBroadcastAllowed: ecx flag must be exactly true", () => {
  for (const flag of [undefined, "false", "TRUE", "1", "yes", ""]) {
    const env = { get: (k: string) => (k === "CHAIN" ? "ecx" : k === "ECX_BROADCAST_ENABLED" ? flag : undefined) };
    const err = assertThrows(() => assertBroadcastAllowed(PROTECTED, env), BroadcastRefusedError);
    assertEquals(err.status, 403);
    assertEquals(err.reason, "broadcast_disabled");
  }
});

Deno.test("assertBroadcastAllowed: ecx enabled checks the replay marker", () => {
  const env = { get: (k: string) => ({ CHAIN: "ecx", ECX_BROADCAST_ENABLED: "true" } as Record<string, string>)[k] };
  assertBroadcastAllowed(PROTECTED, env);
  const missing = assertThrows(() => assertBroadcastAllowed(UNPROTECTED, env), BroadcastRefusedError);
  assertEquals([missing.status, missing.reason], [400, "replay_marker_missing"]);
  const allFinal = assertThrows(
    () => assertBroadcastAllowed(txHex(ECX_REPLAY_LOCKTIME, SEQUENCE_FINAL), env),
    BroadcastRefusedError,
  );
  assertEquals(allFinal.status, 400);
  const garbage = assertThrows(() => assertBroadcastAllowed("deadbeef", env), BroadcastRefusedError);
  assertEquals([garbage.status, garbage.reason], [400, "invalid_transaction"]);
});

Deno.test("assertBroadcastAllowed reads Deno.env at call time", async () => {
  // In a child process: Deno.env is shared with the parallel test workers, and
  // CHAIN=ecx visible there even briefly makes modules that read it at import
  // (lib/constants/serverConstants.ts) throw in another file.
  const code = `
    const { assertBroadcastAllowed } = await import("./server/services/chain/chainProfile.ts");
    const hex = ${JSON.stringify(PROTECTED)};
    const outcome = () => { try { assertBroadcastAllowed(hex); return "allowed"; } catch (e) { return e.status; } };
    const off = outcome();
    Deno.env.set("ECX_BROADCAST_ENABLED", "true");
    console.log(JSON.stringify({ off, on: outcome() }));`;
  const out = await new Deno.Command(Deno.execPath(), {
    args: ["eval", "--no-check", code],
    cwd: new URL("../..", import.meta.url).pathname,
    env: { HOME: Deno.env.get("HOME") ?? "", NO_COLOR: "1", CHAIN: "ecx" },
    clearEnv: true,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const text = new TextDecoder().decode(out.stdout) + new TextDecoder().decode(out.stderr);
  assertEquals(out.code, 0, text);
  const last = text.trim().split("\n").filter((l) => l.startsWith("{")).pop();
  assertEquals(JSON.parse(last ?? "null"), { off: 403, on: "allowed" });
});

// ------------------------------------------- site: MaraSlipstreamService

Deno.test("MaraSlipstreamService.submitTransaction: bitcoin unchanged", async () => {
  for (const chain of [undefined, "bitcoin"]) {
    await withEnv({ CHAIN: chain, ECX_BROADCAST_ENABLED: undefined }, () =>
      withMaraStub(async (sent) => {
        const result = await MaraSlipstreamService.submitTransaction(UNPROTECTED);
        assertEquals(sent, [{ tx_hex: UNPROTECTED }]);
        assertEquals(result.txid, MARA_TXID);
        assertEquals(result.status, "accepted");
        // Unparseable hex still goes upstream untouched: bitcoin mode does no parsing.
        await MaraSlipstreamService.submitTransaction("deadbeef");
        assertEquals(sent.length, 2);
        await assertRejects(() => MaraSlipstreamService.submitTransaction(""), Error, "Invalid transaction hex");
        assertEquals(sent.length, 2);
      }));
  }
});

Deno.test("MaraSlipstreamService.submitTransaction: ecx refusals send nothing", async () => {
  for (const flag of [undefined, "false"]) {
    await withEnv({ CHAIN: "ecx", ECX_BROADCAST_ENABLED: flag }, () =>
      withMaraStub(async (sent) => {
        const err = await assertRejects(() => MaraSlipstreamService.submitTransaction(PROTECTED));
        assertInstanceOf(err, BroadcastRefusedError);
        assertEquals(err.status, 403);
        assertEquals(sent.length, 0);
      }));
  }
  await withEnv({ CHAIN: "ecx", ECX_BROADCAST_ENABLED: "true" }, () =>
    withMaraStub(async (sent) => {
      const err = await assertRejects(() => MaraSlipstreamService.submitTransaction(UNPROTECTED));
      assertInstanceOf(err, BroadcastRefusedError);
      assertEquals(err.status, 400);
      assertEquals(sent.length, 0);
    }));
});

Deno.test("MaraSlipstreamService.submitTransaction: ecx enabled + marker is sent", async () => {
  await withEnv({ CHAIN: "ecx", ECX_BROADCAST_ENABLED: "true" }, () =>
    withMaraStub(async (sent) => {
      const result = await MaraSlipstreamService.submitTransaction(PROTECTED);
      assertEquals(sent, [{ tx_hex: PROTECTED }]);
      assertEquals(result.txid, MARA_TXID);
    }));
});

// -------------------------------------- site: POST /api/internal/mara-submit

Deno.test("POST /api/internal/mara-submit: bitcoin unchanged", async () => {
  for (const chain of [undefined, "bitcoin"]) {
    await withEnv({ CHAIN: chain, ECX_BROADCAST_ENABLED: undefined }, () =>
      withMaraStub(async (sent) => {
        const res = await submit(UNPROTECTED);
        assertEquals(res.status, 200);
        assertEquals(await res.json(), {
          txid: MARA_TXID,
          status: "accepted",
          pool: "mara",
          message: "Transaction accepted by MARA pool",
        });
        assertEquals(sent, [{ tx_hex: UNPROTECTED }]);
        // Pre-existing validation is unchanged.
        const bad = await submit("zz");
        assertEquals(bad.status, 400);
        await bad.body?.cancel();
        assertEquals(sent.length, 1);
      }));
  }
});

Deno.test("POST /api/internal/mara-submit: ecx disabled answers 403 and sends nothing", async () => {
  for (const flag of [undefined, "false", "True"]) {
    await withEnv({ CHAIN: "ecx", ECX_BROADCAST_ENABLED: flag }, () =>
      withMaraStub(async (sent) => {
        const res = await submit(PROTECTED);
        assertEquals(res.status, 403);
        const body = await res.json();
        assert(JSON.stringify(body).includes("ECX_BROADCAST_ENABLED"));
        assertEquals(sent.length, 0);
      }));
  }
});

Deno.test("POST /api/internal/mara-submit: ecx enabled without marker answers 400 and sends nothing", async () => {
  await withEnv({ CHAIN: "ecx", ECX_BROADCAST_ENABLED: "true" }, () =>
    withMaraStub(async (sent) => {
      for (const hex of [UNPROTECTED, txHex(ECX_REPLAY_LOCKTIME, SEQUENCE_FINAL), "deadbeef"]) {
        const res = await submit(hex);
        assertEquals(res.status, 400);
        await res.body?.cancel();
      }
      assertEquals(sent.length, 0);
    }));
});

Deno.test("POST /api/internal/mara-submit: ecx enabled with marker is submitted", async () => {
  await withEnv({ CHAIN: "ecx", ECX_BROADCAST_ENABLED: "true" }, () =>
    withMaraStub(async (sent) => {
      const res = await submit(PROTECTED);
      assertEquals(res.status, 200);
      assertEquals((await res.json()).txid, MARA_TXID);
      assertEquals(sent, [{ tx_hex: PROTECTED }]);
    }));
});

// ------------------------------------------------------------ /config field

Deno.test("getClientConfig: no CHAIN key under bitcoin, CHAIN=ecx under ecx", async () => {
  for (const chain of [undefined, "bitcoin"]) {
    await withEnv({ CHAIN: chain }, () => {
      assertEquals(Object.keys(getClientConfig()), [
        "MINTING_SERVICE_FEE",
        "MINTING_SERVICE_FEE_ADDRESS",
        "DEBUG_NAMESPACES",
        "IS_DEBUG_ENABLED",
      ]);
    });
  }
  await withEnv({ CHAIN: "ecx" }, () => {
    assertEquals(getClientConfig().CHAIN, "ecx");
  });
});

// ------------------------------- site: browser broadcastTransaction (phantom)

/** Fake <html data-chain> and fetch; returns the URLs fetch was called with. */
async function withBrowser(chain: string | undefined, fn: (calls: string[]) => Promise<void>) {
  const calls: string[] = [];
  const g = globalThis as Record<string, unknown>;
  const hadDocument = "document" in g;
  const savedDocument = g.document;
  g.document = { documentElement: { dataset: chain === undefined ? {} : { chain } } };
  stub(globalThis, "fetch", (input: string | URL | Request) => {
    calls.push(String(input));
    // The ECX hand-off route answers JSON; Bitcoin endpoints answer the txid.
    return Promise.resolve(
      String(input) === ECX_BROADCAST_PATH
        ? Response.json({ txid: MARA_TXID })
        : new Response(MARA_TXID, { status: 200 }),
    );
  });
  try {
    await fn(calls);
  } finally {
    restore();
    if (hadDocument) g.document = savedDocument;
    else delete g.document;
  }
}

Deno.test("broadcastTransaction: bitcoin page broadcasts exactly as before", async () => {
  await withBrowser(undefined, async (calls) => {
    assertEquals(getPageChain(), "bitcoin");
    assertEquals(await broadcastTransaction(UNPROTECTED), MARA_TXID);
    assertEquals(calls, ["https://mempool.space/api/tx"]);
  });
});

Deno.test("broadcastTransaction: ecx page hands off to the server route only", async () => {
  // The server's gate decides (an unmarked tx is refused there with 400);
  // the browser never sends either one to a Bitcoin endpoint.
  for (const hex of [PROTECTED, UNPROTECTED]) {
    await withBrowser("ecx", async (calls) => {
      assertEquals(getPageChain(), "ecx");
      assertEquals(await broadcastTransaction(hex), MARA_TXID);
      assertEquals(calls, [ECX_BROADCAST_PATH]);
    });
  }
});

Deno.test("broadcastTransaction: ecx page refuses when the server has no ECX route (404)", async () => {
  await withBrowser("ecx", async (calls) => {
    restore();
    stub(globalThis, "fetch", (input: string | URL | Request) => {
      calls.push(String(input));
      return Promise.resolve(Response.json({ error: "Resource not found" }, { status: 404 }));
    });
    await assertRejects(() => broadcastTransaction(PROTECTED), Error, ECX_BROWSER_BROADCAST_REFUSED);
    assertEquals(calls, [ECX_BROADCAST_PATH]);
  });
});
