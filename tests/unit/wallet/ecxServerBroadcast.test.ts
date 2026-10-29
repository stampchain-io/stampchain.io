/**
 * ECX sign-only flow in the browser: on an ECX page (`<html data-chain="ecx">`)
 * every wallet adapter is asked to sign without broadcasting, the signed
 * output is finalized here, and the raw hex is POSTed to the server's ECX
 * broadcast route, whose txid is surfaced where a wallet broadcast would put
 * it. Nothing may reach a Bitcoin endpoint or a wallet push method.
 *
 * Drives the REAL adapters with stubbed window.* wallets, as
 * wonder.adapter.test.ts does. Import order matters for the same reason: the
 * wallet.ts <-> WalletProvider.tsx cycle must be entered from the island.
 */
import "$islands/layout/WalletProvider.tsx";
import { assert, assertEquals, assertRejects, assertStrictEquals } from "@std/assert";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { initialWallet, isConnectedSignal, walletSignal } from "$client/wallet/wallet.ts";
import {
  getWalletProvider,
  signPSBT as helperSignPSBT,
  withEcxServerBroadcast,
} from "$client/wallet/walletHelper.ts";
import { horizonProvider } from "$client/wallet/horizon.ts";
import { leatherProvider } from "$client/wallet/leather.ts";
import { okxProvider } from "$client/wallet/okx.ts";
import { phantomProvider } from "$client/wallet/phantom.ts";
import { tapWalletProvider } from "$client/wallet/tapwallet.ts";
import { unisatProvider } from "$client/wallet/unisat.ts";
import { wonderProvider } from "$client/wallet/wonder.ts";
import { xverseProvider } from "$client/wallet/xverse.ts";
import {
  broadcastTransaction,
  broadcastViaEcxServer,
  ECX_BROADCAST_PATH,
  ECX_BROWSER_BROADCAST_REFUSED,
  toRawTransactionHex,
} from "$lib/utils/minting/broadcast.ts";
import { ECX_REPLAY_LOCKTIME, SEQUENCE_RBF } from "$server/services/chain/chainProfile.ts";
import type { Wallet } from "$types/index.d.ts";

// ------------------------------------------------------------ a real signed tx

const PRIV = new Uint8Array(32).fill(7);
const PUB = ecc.pointFromScalar(PRIV, true)!;
const P2WPKH = bitcoin.payments.p2wpkh({ pubkey: PUB }).output!;
const ADDRESS = bitcoin.payments.p2wpkh({ pubkey: PUB }).address!;
const signer = { publicKey: PUB, sign: (hash: Uint8Array) => ecc.sign(hash, PRIV) };

/** A replay-marked psbt: unsigned, signed (not finalized), and the final raw tx. */
function buildPsbts() {
  const psbt = new bitcoin.Psbt();
  psbt.setLocktime(ECX_REPLAY_LOCKTIME);
  psbt.addInput({
    hash: new Uint8Array(32).fill(0x33),
    index: 0,
    sequence: SEQUENCE_RBF,
    witnessUtxo: { script: P2WPKH, value: 100_000n },
  });
  psbt.addOutput({ script: P2WPKH, value: 90_000n });
  const unsigned = psbt.toHex();
  psbt.signInput(0, signer);
  const signed = psbt.toHex();
  const finalizedPsbt = bitcoin.Psbt.fromHex(signed);
  finalizedPsbt.finalizeAllInputs();
  const raw = finalizedPsbt.extractTransaction().toHex();
  return {
    unsigned,
    signed,
    signedBase64: bitcoin.Psbt.fromHex(signed).toBase64(),
    finalized: finalizedPsbt.toHex(),
    raw,
    txid: bitcoin.Transaction.fromHex(raw).getId(),
  };
}
const TX = buildPsbts();
const SERVER_TXID = TX.txid;
const WALLET_TXID = "ff".repeat(32);

// ------------------------------------------------------------ page + network fakes

type Call = { url: string; body?: unknown };
type Globals = Record<string, unknown>;
const g = globalThis as unknown as Globals;
const WALLET_GLOBALS = [
  "unisat",
  "okxwallet",
  "tapwallet",
  "phantom",
  "LeatherProvider",
  "XverseProviders",
  "HorizonWalletProvider",
  "wonderWallet",
];

/**
 * Run fn on a page for `chain` with every fetch recorded and answered as the
 * ECX broadcast route would (or with `reply`). Restores globals in finally.
 */
async function onPage(
  chain: "ecx" | undefined,
  wallets: Globals,
  fn: (calls: Call[]) => Promise<void>,
  reply: (call: Call) => Response = () => Response.json({ txid: SERVER_TXID }),
) {
  const calls: Call[] = [];
  const savedFetch = globalThis.fetch;
  g.document = { documentElement: { dataset: chain ? { chain } : {} } };
  Object.assign(g, wallets);
  walletSignal.value = { ...initialWallet, address: ADDRESS, provider: "unisat" } as Wallet;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(input), body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    return Promise.resolve(reply(call));
  }) as typeof fetch;
  try {
    await fn(calls);
  } finally {
    globalThis.fetch = savedFetch;
    delete g.document;
    for (const key of WALLET_GLOBALS) delete g[key];
    walletSignal.value = initialWallet;
    isConnectedSignal.value = false;
  }
}

const handOff = (raw = TX.raw): Call[] => [{ url: ECX_BROADCAST_PATH, body: { txHex: raw } }];

// ------------------------------------------------------------ finalize + hand-off helpers

Deno.test("toRawTransactionHex: finalizes signed psbts (hex or base64) and passes raw txs through", () => {
  assertEquals(toRawTransactionHex(TX.signed), TX.raw);
  assertEquals(toRawTransactionHex(TX.signedBase64), TX.raw);
  assertEquals(toRawTransactionHex(TX.finalized), TX.raw);
  assertEquals(toRawTransactionHex(TX.raw), TX.raw);
  assertEquals(toRawTransactionHex(TX.raw.toUpperCase()), TX.raw);
});

Deno.test("toRawTransactionHex: an unsigned psbt or junk throws", () => {
  for (const bad of [TX.unsigned, "00".repeat(30), "not hex or base64!"]) {
    let threw = false;
    try {
      toRawTransactionHex(bad);
    } catch {
      threw = true;
    }
    assert(threw, bad.slice(0, 20));
  }
});

Deno.test("broadcastViaEcxServer: POSTs only the finalized hex to the ECX route and returns its txid", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl = ((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(Response.json({ txid: SERVER_TXID }));
  }) as unknown as typeof fetch;
  assertEquals(await broadcastViaEcxServer(TX.signed, fetchImpl), SERVER_TXID);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, ECX_BROADCAST_PATH);
  assertEquals(calls[0].init?.method, "POST");
  assertEquals(JSON.parse(String(calls[0].init?.body)), { txHex: TX.raw });
});

Deno.test("broadcastViaEcxServer: server errors surface; 404 is the ECX refusal; bad input sends nothing", async () => {
  const answer = (res: Response) => (() => Promise.resolve(res)) as unknown as typeof fetch;
  await assertRejects(
    () =>
      broadcastViaEcxServer(
        TX.raw,
        answer(Response.json({ error: "ECX node sendrawtransaction failed: non-final" }, { status: 400 })),
      ),
    Error,
    "ECX broadcast failed: ECX node sendrawtransaction failed: non-final",
  );
  await assertRejects(
    () => broadcastViaEcxServer(TX.raw, answer(new Response("", { status: 503 }))),
    Error,
    "HTTP 503",
  );
  await assertRejects(
    () => broadcastViaEcxServer(TX.raw, answer(Response.json({ error: "nf" }, { status: 404 }))),
    Error,
    ECX_BROWSER_BROADCAST_REFUSED,
  );
  await assertRejects(
    () => broadcastViaEcxServer(TX.raw, answer(Response.json({}))),
    Error,
    "no txid",
  );
  let fetched = false;
  const never = (() => {
    fetched = true;
    return Promise.resolve(Response.json({ txid: SERVER_TXID }));
  }) as unknown as typeof fetch;
  await assertRejects(() => broadcastViaEcxServer(TX.unsigned, never), Error, "Failed to finalize");
  assertEquals(fetched, false);
});

Deno.test("broadcastTransaction: on an ECX page hands off to the server, never a Bitcoin endpoint", async () => {
  await onPage("ecx", {}, async (calls) => {
    assertEquals(await broadcastTransaction(TX.signed), SERVER_TXID);
    assertEquals(calls, handOff());
  });
});

// ------------------------------------------------------------ dispatch

const ADAPTERS = {
  unisat: unisatProvider,
  okx: okxProvider,
  tapwallet: tapWalletProvider,
  phantom: phantomProvider,
  leather: leatherProvider,
  xverse: xverseProvider,
  horizon: horizonProvider,
  wonder: wonderProvider,
} as const;

Deno.test("getWalletProvider: a Bitcoin page gets the adapter object itself, unchanged", async () => {
  await onPage(undefined, {}, async () => {
    for (const [name, adapter] of Object.entries(ADAPTERS)) {
      assertStrictEquals(getWalletProvider(name), adapter, name);
    }
  });
});

Deno.test("getWalletProvider: an ECX page wraps every adapter with server broadcast", async () => {
  await onPage("ecx", {}, async () => {
    for (const [name, adapter] of Object.entries(ADAPTERS)) {
      const wrapped = getWalletProvider(name);
      assert(wrapped !== adapter, name);
      assert(wrapped.signPSBT !== adapter.signPSBT, name);
      assert(typeof wrapped.broadcastPSBT === "function", name);
      assert(typeof wrapped.broadcastRawTX === "function", name);
    }
  });
});

// ------------------------------------------------------------ wrapper semantics

const signedBy = (result: Record<string, unknown>) => {
  const seen: unknown[] = [];
  const base = {
    signMessage: () => Promise.resolve("sig"),
    signPSBT: (...args: unknown[]) => {
      seen.push(args);
      return Promise.resolve(result as never);
    },
  };
  return { seen, base };
};

Deno.test("withEcxServerBroadcast: always asks for sign-only, then hands off when the caller wanted a broadcast", async () => {
  const { seen, base } = signedBy({ signed: true, psbt: TX.signed });
  const calls: string[] = [];
  const fetchImpl = ((url: string, init?: RequestInit) => {
    calls.push(`${url} ${init?.body}`);
    return Promise.resolve(Response.json({ txid: SERVER_TXID }));
  }) as unknown as typeof fetch;
  const wrapped = withEcxServerBroadcast(base, "stub", fetchImpl);
  const result = await wrapped.signPSBT(TX.unsigned, [{ index: 0 }], true, [1], true);
  assertEquals(seen, [[TX.unsigned, [{ index: 0 }], true, [1], false]]);
  assertEquals(result, { signed: true, psbt: TX.signed, txid: SERVER_TXID });
  assertEquals(calls, [`${ECX_BROADCAST_PATH} ${JSON.stringify({ txHex: TX.raw })}`]);
});

Deno.test("withEcxServerBroadcast: autoBroadcast=false (MARA) returns the signed psbt and sends nothing", async () => {
  // A wallet txid would be a wallet broadcast to Bitcoin; it is dropped so
  // callers never treat it as sent.
  const { base } = signedBy({ signed: true, psbt: TX.signed, txid: WALLET_TXID });
  let fetched = false;
  const fetchImpl = (() => {
    fetched = true;
    return Promise.resolve(Response.json({}));
  }) as unknown as typeof fetch;
  const result = await withEcxServerBroadcast(base, "stub", fetchImpl).signPSBT(
    TX.unsigned,
    [],
    true,
    undefined,
    false,
  );
  assertEquals(result, { signed: true, psbt: TX.signed });
  assertEquals(fetched, false);
});

Deno.test("withEcxServerBroadcast: a failed hand-off keeps the signed psbt for the retry path", async () => {
  const { base } = signedBy({ signed: true, psbt: TX.signed });
  const fetchImpl = (() =>
    Promise.resolve(Response.json({ error: "ECX broadcast is disabled" }, { status: 403 }))) as unknown as typeof fetch;
  const result = await withEcxServerBroadcast(base, "stub", fetchImpl).signPSBT(TX.unsigned, []);
  assertEquals(result.signed, true);
  assertEquals(result.psbt, TX.signed);
  assertEquals(result.txid, undefined);
  assert(result.error?.includes("ECX broadcast is disabled"), result.error);
});

Deno.test("withEcxServerBroadcast: cancelled / unsigned / empty results pass through without a hand-off", async () => {
  let fetched = false;
  const fetchImpl = (() => {
    fetched = true;
    return Promise.resolve(Response.json({ txid: SERVER_TXID }));
  }) as unknown as typeof fetch;
  for (const r of [{ signed: false, cancelled: true }, { signed: false, error: "nope" }]) {
    const { base } = signedBy(r);
    assertEquals(await withEcxServerBroadcast(base, "stub", fetchImpl).signPSBT(TX.unsigned, []), r);
  }
  const { base } = signedBy({ signed: true, txid: WALLET_TXID });
  const result = await withEcxServerBroadcast(base, "stub", fetchImpl).signPSBT(TX.unsigned, []);
  assertEquals(result.signed, false);
  assert(result.error?.includes("no signed transaction"));
  assertEquals(fetched, false);
});

// ------------------------------------------------------------ each real adapter on an ECX page

/** Records every call on a stub wallet; push/broadcast methods fail the test. */
function recorder() {
  const log: { method: string; args: unknown[] }[] = [];
  const record = (method: string, result: unknown) => (...args: unknown[]) => {
    log.push({ method, args });
    return Promise.resolve(result);
  };
  const forbidden = (method: string) => (...args: unknown[]) => {
    log.push({ method, args });
    return Promise.reject(new Error(`${method} must not be called on ECX`));
  };
  return { log, record, forbidden };
}

type AdapterCase = {
  name: string;
  install: (r: ReturnType<typeof recorder>) => Globals;
  /** The sign-only option as the wallet saw it. */
  check: (log: ReturnType<typeof recorder>["log"]) => void;
};

const methods = (log: { method: string }[]) => log.map((l) => l.method);

const ADAPTER_CASES: AdapterCase[] = [
  {
    name: "unisat",
    install: (r) => ({
      unisat: { signPsbt: r.record("signPsbt", TX.finalized), pushPsbt: r.forbidden("pushPsbt"), on: () => {} },
    }),
    check: (log) => assertEquals(methods(log), ["signPsbt"]),
  },
  {
    name: "okx",
    install: (r) => ({
      okxwallet: {
        bitcoin: {
          signPsbt: r.record("signPsbt", TX.finalized),
          pushPsbt: r.forbidden("pushPsbt"),
          pushTx: r.forbidden("pushTx"),
        },
      },
    }),
    check: (log) => assertEquals(methods(log), ["signPsbt"]),
  },
  {
    name: "tapwallet",
    install: (r) => ({
      tapwallet: {
        signPsbt: r.record("signPsbt", TX.signed),
        pushPsbt: r.forbidden("pushPsbt"),
        pushTx: r.forbidden("pushTx"),
      },
    }),
    check: (log) => assertEquals(methods(log), ["signPsbt"]),
  },
  {
    name: "phantom",
    install: (r) => ({
      phantom: { bitcoin: { isPhantom: true, signPSBT: r.record("signPSBT", bitcoin.Psbt.fromHex(TX.signed).toBuffer()) } },
    }),
    check: (log) => assertEquals(methods(log), ["signPSBT"]),
  },
  {
    name: "leather",
    install: (r) => ({
      LeatherProvider: { request: r.record("request", { result: { hex: TX.signed } }) },
    }),
    check: (log) => {
      assertEquals(methods(log), ["request"]);
      assertEquals(log[0].args[0], "signPsbt");
      assertEquals((log[0].args[1] as { broadcast: boolean }).broadcast, false);
    },
  },
  {
    name: "xverse",
    install: (r) => ({
      XverseProviders: { BitcoinProvider: { request: r.record("request", { result: { psbt: TX.signedBase64 } }) } },
    }),
    check: (log) => {
      assertEquals(methods(log), ["request"]);
      assertEquals(log[0].args[0], "signPsbt");
      assertEquals((log[0].args[1] as { broadcast: boolean }).broadcast, false);
    },
  },
  {
    name: "horizon",
    install: (r) => ({
      HorizonWalletProvider: {
        request: (method: string, params: unknown) =>
          r.record(method, method === "getAddresses" ? { addresses: [{ address: ADDRESS, publicKey: "02" }] } : { hex: TX.signed })(params),
      },
    }),
    check: (log) => assertEquals(methods(log), ["getAddresses", "signPsbt"]),
  },
  {
    name: "wonder",
    install: (r) => ({
      wonderWallet: {
        signPsbt: r.record("signPsbt", { psbt: TX.signed }),
        broadcastTransaction: r.forbidden("broadcastTransaction"),
        on: () => {},
      },
    }),
    check: (log) => {
      assertEquals(methods(log), ["signPsbt"]);
      assertEquals((log[0].args[1] as { autoFinalized: boolean }).autoFinalized, false);
    },
  },
];

for (const c of ADAPTER_CASES) {
  Deno.test(`${c.name} on ECX: signs without broadcasting, server broadcasts, server txid returned`, async () => {
    const r = recorder();
    await onPage("ecx", c.install(r), async (calls) => {
      // Default autoBroadcast=true, the way the mint / send tools call it.
      const result = await getWalletProvider(c.name).signPSBT(TX.unsigned, [{ index: 0 }], true);
      assertEquals(result.error, undefined, String(result.error));
      assertEquals(result.signed, true);
      assertEquals(result.txid, SERVER_TXID);
      c.check(r.log);
      assertEquals(calls, handOff());
    });
  });

  Deno.test(`${c.name} on ECX: walletHelper.signPSBT surfaces the server txid`, async () => {
    const r = recorder();
    await onPage("ecx", c.install(r), async (calls) => {
      const wallet = { ...initialWallet, address: ADDRESS, provider: c.name } as Wallet;
      const result = await helperSignPSBT(wallet, TX.unsigned, [{ index: 0 } as never]);
      assertEquals(result.signed, true);
      assertEquals(result.txid, SERVER_TXID);
      assertEquals(calls, handOff());
    });
  });

  Deno.test(`${c.name} on ECX: broadcastPSBT / broadcastRawTX go to the server, not the wallet`, async () => {
    const r = recorder();
    await onPage("ecx", c.install(r), async (calls) => {
      const provider = getWalletProvider(c.name);
      assertEquals(await provider.broadcastPSBT!(TX.signed), SERVER_TXID);
      assertEquals(await provider.broadcastRawTX!(TX.raw), SERVER_TXID);
      assertEquals(r.log, []);
      assertEquals(calls, [...handOff(), ...handOff()]);
    });
  });
}

Deno.test("okx on a Bitcoin page: autoBroadcast still pushes through the wallet (unchanged)", async () => {
  const r = recorder();
  const wallets = {
    okxwallet: { bitcoin: { signPsbt: r.record("signPsbt", TX.finalized), pushPsbt: r.record("pushPsbt", WALLET_TXID) } },
  };
  await onPage(undefined, wallets, async (calls) => {
    const result = await getWalletProvider("okx").signPSBT(TX.unsigned, [{ index: 0 }], true, undefined, true);
    assertEquals(result, { signed: true, txid: WALLET_TXID });
    assertEquals(methods(r.log), ["signPsbt", "pushPsbt"]);
    assertEquals(calls, []);
  });
});
