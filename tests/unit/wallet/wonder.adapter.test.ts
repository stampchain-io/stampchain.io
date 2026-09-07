/**
 * Tests that exercise the REAL client/wallet/wonder.ts module.
 *
 * tests/unit/wallet/wonder.test.ts covers the adapter's logic through local
 * mirror implementations. That protects the intended behaviour but never
 * executes wonder.ts itself, so a regression in the shipped module would go
 * unnoticed and the file reports ~12% coverage. This suite imports the real
 * adapter and drives it with a stubbed `window.wonderWallet`.
 *
 * Import order matters: wallet.ts -> ModalStack.tsx -> WalletProvider.tsx ->
 * wonder.ts -> wallet.ts is a cycle. The browser always enters that cycle from
 * an island, so we import the island first to reproduce the same evaluation
 * order; importing wonder.ts as the entry module trips a TDZ error inside
 * WalletProvider.tsx.
 */

import "$islands/layout/WalletProvider.tsx";
import { assertEquals, assertRejects } from "@std/assert";
import * as bitcoin from "bitcoinjs-lib";
import {
  initialWallet,
  isConnectedSignal,
  walletContext,
  walletSignal,
} from "$client/wallet/wallet.ts";
import {
  broadcastPSBT,
  broadcastRawTX,
  checkWonder,
  connectWonder,
  isWonderInstalled,
  signMessage,
  signPSBT,
  wonderProvider,
} from "$client/wallet/wonder.ts";
import { hexToBase64 } from "$lib/utils/data/binary/baseUtils.ts";

// ============================================================================
// Stub provider + global installation helpers
// ============================================================================

type Handler = (payload?: unknown) => void;

interface StubProvider {
  requestAccounts: () => Promise<unknown>;
  getPublicKey: () => Promise<string | null>;
  getBalances: () => Promise<
    { confirmed?: number; unconfirmed?: number; total?: number } | undefined
  >;
  signPsbt: (psbtHex: string, options: unknown) => Promise<unknown>;
  broadcastTransaction: (txhex: string) => Promise<unknown>;
  signMessage: (message: string) => Promise<string>;
  on: (event: string, handler: Handler) => void;
  handlers: Record<string, Handler[]>;
  calls: { signPsbt: unknown[][]; broadcast: string[] };
}

const ADDRESS = "bc1qwonderpayment123abc";
const ADDRESS_2 = "bc1qwondersecondaccount";
const PUBKEY = "02wonderpubkey1234567890abcdef";
const PSBT_MAGIC_HEX = "70736274ff01000a0200000000000000000000";

function buildStub(overrides: Partial<StubProvider> = {}): StubProvider {
  const stub: StubProvider = {
    requestAccounts: () =>
      Promise.resolve({ accounts: [ADDRESS], proof: { signature: "s" } }),
    getPublicKey: () => Promise.resolve(PUBKEY),
    getBalances: () =>
      Promise.resolve({
        confirmed: 100_000,
        unconfirmed: 5_000,
        total: 105_000,
      }),
    signPsbt: (psbtHex, options) => {
      stub.calls.signPsbt.push([psbtHex, options]);
      return Promise.resolve({ txhex: "aabbcc", txid: "signedtxid" });
    },
    broadcastTransaction: (txhex) => {
      stub.calls.broadcast.push(txhex);
      return Promise.resolve({ txid: "broadcasttxid" });
    },
    signMessage: () => Promise.resolve("signature123"),
    on: (event, handler) => {
      (stub.handlers[event] ??= []).push(handler);
    },
    handlers: {},
    calls: { signPsbt: [], broadcast: [] },
    ...overrides,
  };
  return stub;
}

type WalletGlobals = {
  document?: unknown;
  wonderWallet?: StubProvider;
};

const globals = globalThis as unknown as WalletGlobals;

/** getGlobalWallets() only inspects window.* when a `document` exists. */
function installProvider(stub: StubProvider | undefined): void {
  globals.document = {};
  if (stub) {
    globals.wonderWallet = stub;
  } else {
    delete globals.wonderWallet;
  }
}

/**
 * Resets wallet state without walletContext.disconnect(), whose toast starts a
 * 50 ms timer that would trip Deno's op sanitizer.
 */
function uninstallProvider(): void {
  delete globals.document;
  delete globals.wonderWallet;
  walletSignal.value = initialWallet;
  isConnectedSignal.value = false;
  localStorage.removeItem("wallet");
}

/** Lets showToast's 50 ms auto-clear timer finish (adapter-driven disconnects). */
const settleToasts = () => new Promise((resolve) => setTimeout(resolve, 60));

function toastRecorder() {
  const toasts: { message: string; type: string }[] = [];
  const addToast = (message: string, type: string) => {
    toasts.push({ message, type });
  };
  return { toasts, addToast };
}

/** Runs `fn` with the stub installed and always restores globals afterwards. */
async function withProvider(
  stub: StubProvider | undefined,
  fn: (stub: StubProvider | undefined) => Promise<void> | void,
): Promise<void> {
  installProvider(stub);
  try {
    await fn(stub);
  } finally {
    uninstallProvider();
  }
}

function buildLegacyPsbt(): { psbtHex: string; prevTxid: string } {
  const p2pkhScript = bitcoin.script.compile([
    bitcoin.opcodes.OP_DUP,
    bitcoin.opcodes.OP_HASH160,
    new Uint8Array(20),
    bitcoin.opcodes.OP_EQUALVERIFY,
    bitcoin.opcodes.OP_CHECKSIG,
  ]);
  const prevTx = new bitcoin.Transaction();
  prevTx.version = 2;
  prevTx.addInput(new Uint8Array(32), 0xffffffff);
  prevTx.addOutput(p2pkhScript, 100_000n);

  const psbt = new bitcoin.Psbt();
  psbt.addInput({
    hash: prevTx.getId(),
    index: 0,
    nonWitnessUtxo: prevTx.toBuffer(),
  });
  psbt.addOutput({ script: p2pkhScript, value: 90_000n });
  return { psbtHex: psbt.toHex(), prevTxid: prevTx.getId() };
}

function buildSegwitPsbt(): string {
  const script = bitcoin.script.compile([
    bitcoin.opcodes.OP_0,
    new Uint8Array(20),
  ]);
  const psbt = new bitcoin.Psbt();
  psbt.addInput({
    hash: new Uint8Array(32),
    index: 0,
    witnessUtxo: { script, value: 100_000n },
  });
  psbt.addOutput({ script, value: 90_000n });
  return psbt.toHex();
}

// ============================================================================
// wonderProvider surface
// ============================================================================

Deno.test("wonderProvider exposes the adapter surface used by walletHelper", () => {
  assertEquals(Object.keys(wonderProvider).sort(), [
    "broadcastPSBT",
    "broadcastRawTX",
    "checkWonder",
    "connectWonder",
    "signMessage",
    "signPSBT",
  ]);
  assertEquals(wonderProvider.signPSBT, signPSBT);
  assertEquals(wonderProvider.connectWonder, connectWonder);
});

// ============================================================================
// checkWonder
// ============================================================================

Deno.test("checkWonder: false and signal cleared when no provider is injected", async () => {
  await withProvider(undefined, () => {
    assertEquals(checkWonder(), false);
    assertEquals(isWonderInstalled.value, false);
  });
});

Deno.test("checkWonder: true and signal set when window.wonderWallet exists", async () => {
  await withProvider(buildStub(), () => {
    assertEquals(checkWonder(), true);
    assertEquals(isWonderInstalled.value, true);
  });
});

// ============================================================================
// connectWonder
// ============================================================================

Deno.test("connectWonder: toasts an install error when the provider is missing", async () => {
  await withProvider(undefined, async () => {
    const { toasts, addToast } = toastRecorder();
    await connectWonder(addToast);
    assertEquals(toasts.length, 1);
    assertEquals(toasts[0].type, "error");
    assertEquals(toasts[0].message.includes("not detected"), true);
    assertEquals(walletContext.isConnected, false);
  });
});

Deno.test("connectWonder: populates walletContext from the { accounts, proof } response", async () => {
  await withProvider(buildStub(), async () => {
    const { toasts, addToast } = toastRecorder();
    await connectWonder(addToast);

    assertEquals(toasts, [
      { message: "Connected using Wonder Wallet.", type: "success" },
    ]);
    const wallet = walletContext.wallet;
    assertEquals(wallet.address, ADDRESS);
    assertEquals(wallet.accounts, [ADDRESS]);
    assertEquals(wallet.publicKey, PUBKEY);
    assertEquals(wallet.provider, "wonder");
    assertEquals(wallet.network, "mainnet");
    assertEquals(wallet.addressType, "p2wpkh");
    assertEquals(wallet.stampBalance, []);
    assertEquals(wallet.btcBalance, {
      confirmed: 100_000,
      unconfirmed: 5_000,
      total: 105_000,
    });
    assertEquals(walletContext.isConnected, true);
  });
});

Deno.test("connectWonder: accepts the bare string[] repeat-connect response", async () => {
  const stub = buildStub({
    requestAccounts: () => Promise.resolve([ADDRESS_2]),
  });
  await withProvider(stub, async () => {
    const { toasts, addToast } = toastRecorder();
    await connectWonder(addToast);
    assertEquals(toasts[0].type, "success");
    assertEquals(walletContext.wallet.address, ADDRESS_2);
  });
});

Deno.test("connectWonder: derives addressType from the address prefix", async () => {
  const cases: [string, string][] = [
    ["bc1pwondertaproot", "p2tr"],
    ["bc1qwondersegwit", "p2wpkh"],
    ["3WonderNestedSegwit", "p2sh"],
    ["1WonderLegacy", "p2pkh"],
  ];
  for (const [address, expected] of cases) {
    const stub = buildStub({
      requestAccounts: () => Promise.resolve([address]),
    });
    await withProvider(stub, async () => {
      await connectWonder(() => {});
      assertEquals(walletContext.wallet.addressType, expected);
    });
  }
});

Deno.test("connectWonder: falls back to empty publicKey and summed total balance", async () => {
  const stub = buildStub({
    getPublicKey: () => Promise.resolve(null),
    getBalances: () => Promise.resolve({ confirmed: 7, unconfirmed: 3 }),
  });
  await withProvider(stub, async () => {
    await connectWonder(() => {});
    assertEquals(walletContext.wallet.publicKey, "");
    assertEquals(walletContext.wallet.btcBalance, {
      confirmed: 7,
      unconfirmed: 3,
      total: 10,
    });
  });
});

Deno.test("connectWonder: zeroes the balance when getBalances resolves undefined", async () => {
  const stub = buildStub({ getBalances: () => Promise.resolve(undefined) });
  await withProvider(stub, async () => {
    await connectWonder(() => {});
    assertEquals(walletContext.wallet.btcBalance, {
      confirmed: 0,
      unconfirmed: 0,
      total: 0,
    });
  });
});

Deno.test("connectWonder: reports an error instead of a false success on zero accounts", async () => {
  const stub = buildStub({
    requestAccounts: () => Promise.resolve({ accounts: [], proof: {} }),
  });
  await withProvider(stub, async () => {
    const { toasts, addToast } = toastRecorder();
    await connectWonder(addToast);
    assertEquals(toasts.length, 1);
    assertEquals(toasts[0].type, "error");
    assertEquals(toasts[0].message.includes("no accounts"), true);
    assertEquals(walletContext.isConnected, false);
  });
});

Deno.test("connectWonder: surfaces a rejected approval as an error toast", async () => {
  const stub = buildStub({
    requestAccounts: () => Promise.reject(new Error("User rejected request")),
  });
  await withProvider(stub, async () => {
    const { toasts, addToast } = toastRecorder();
    await connectWonder(addToast);
    assertEquals(toasts.length, 1);
    assertEquals(toasts[0].type, "error");
    assertEquals(toasts[0].message.startsWith("Failed to connect"), true);
    assertEquals(walletContext.isConnected, false);
  });
});

// ============================================================================
// Provider events (accountsChanged / disconnect) via wonder-wallet#initialized
// ============================================================================

Deno.test("provider events: late-injected provider gets accountsChanged and disconnect wired", async () => {
  const stub = buildStub();
  await withProvider(stub, async () => {
    // The module registered a one-shot listener at import time because no
    // provider existed then; announcing the provider wires the handlers.
    globalThis.dispatchEvent(new Event("wonder-wallet#initialized"));
    const accountsChanged = stub.handlers["accountsChanged"]?.[0];
    const disconnect = stub.handlers["disconnect"]?.[0];
    assertEquals(typeof accountsChanged, "function");
    assertEquals(typeof disconnect, "function");

    // Switching to a new account updates the wallet.
    accountsChanged?.([ADDRESS_2]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assertEquals(walletContext.wallet.address, ADDRESS_2);
    assertEquals(walletContext.isConnected, true);

    // Same account again is a no-op (no re-fetch, still connected).
    accountsChanged?.([ADDRESS_2]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assertEquals(walletContext.wallet.address, ADDRESS_2);

    // An empty account list disconnects.
    accountsChanged?.([]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assertEquals(walletContext.isConnected, false);

    // Reconnect, then the provider's disconnect event tears it down.
    accountsChanged?.([ADDRESS]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assertEquals(walletContext.isConnected, true);
    disconnect?.();
    assertEquals(walletContext.isConnected, false);
    await settleToasts();
  });
});

// ============================================================================
// signPSBT
// ============================================================================

Deno.test("signPSBT: returns an error when the provider is missing", async () => {
  await withProvider(undefined, async () => {
    const result = await signPSBT(PSBT_MAGIC_HEX, [{ index: 0 }]);
    assertEquals(result, {
      signed: false,
      error: "Wonder Wallet not connected",
    });
  });
});

Deno.test("signPSBT: auto-broadcast unwraps { txid } from broadcastTransaction", async () => {
  const stub = buildStub();
  await withProvider(stub, async () => {
    const result = await signPSBT(PSBT_MAGIC_HEX, [{ index: 0 }]);
    assertEquals(result, { signed: true, txid: "broadcasttxid" });
    assertEquals(stub.calls.broadcast, ["aabbcc"]);
  });
});

Deno.test("signPSBT: auto-broadcast accepts a bare string txid", async () => {
  const stub = buildStub({
    broadcastTransaction: () => Promise.resolve("plaintxid"),
  });
  await withProvider(stub, async () => {
    const result = await signPSBT(PSBT_MAGIC_HEX, []);
    assertEquals(result, { signed: true, txid: "plaintxid" });
  });
});

Deno.test("signPSBT: passes autoFinalized, enableRBF and mapped toSignInputs to the wallet", async () => {
  const stub = buildStub();
  await withProvider(stub, async () => {
    await connectWonder(() => {});
    stub.calls.signPsbt.length = 0;
    await signPSBT(PSBT_MAGIC_HEX, [{ index: 0 }, { index: 2 }], false, [1]);
    assertEquals(stub.calls.signPsbt.length, 1);
    const [psbtArg, options] = stub.calls.signPsbt[0] as [string, {
      autoFinalized: boolean;
      enableRBF: boolean;
      toSignInputs?: unknown;
      prevTxs?: unknown;
    }];
    assertEquals(psbtArg, PSBT_MAGIC_HEX);
    assertEquals(options.autoFinalized, true);
    assertEquals(options.enableRBF, false);
    assertEquals(options.toSignInputs, [
      { index: 0, address: ADDRESS, sighashTypes: [1] },
      { index: 2, address: ADDRESS, sighashTypes: [1] },
    ]);
    assertEquals("prevTxs" in options, false);
  });
});

Deno.test("signPSBT: omits toSignInputs when no inputs are given", async () => {
  const stub = buildStub();
  await withProvider(stub, async () => {
    await signPSBT(PSBT_MAGIC_HEX, []);
    const options = stub.calls.signPsbt[0][1] as { toSignInputs?: unknown };
    assertEquals("toSignInputs" in options, false);
  });
});

Deno.test("signPSBT: hands legacy previous transactions to the wallet as prevTxs", async () => {
  const stub = buildStub();
  const { psbtHex, prevTxid } = buildLegacyPsbt();
  await withProvider(stub, async () => {
    await signPSBT(psbtHex, [{ index: 0 }]);
    const options = stub.calls.signPsbt[0][1] as {
      prevTxs?: Record<string, string>;
    };
    assertEquals(Object.keys(options.prevTxs ?? {}), [prevTxid]);
    assertEquals(typeof options.prevTxs?.[prevTxid], "string");
  });
});

Deno.test("signPSBT: segwit-only PSBT sends no prevTxs", async () => {
  const stub = buildStub();
  await withProvider(stub, async () => {
    await signPSBT(buildSegwitPsbt(), [{ index: 0 }]);
    const options = stub.calls.signPsbt[0][1] as { prevTxs?: unknown };
    assertEquals("prevTxs" in options, false);
  });
});

Deno.test("signPSBT: broadcast failure falls back to signed txhex with an error", async () => {
  const stub = buildStub({
    broadcastTransaction: () => Promise.reject(new Error("mempool rejected")),
  });
  await withProvider(stub, async () => {
    const result = await signPSBT(PSBT_MAGIC_HEX, []);
    assertEquals(result, {
      signed: true,
      psbt: "aabbcc",
      error: "Transaction signed but broadcast failed",
    });
  });
});

Deno.test("signPSBT: broadcast response without a txid is treated as a failed broadcast", async () => {
  const stub = buildStub({
    broadcastTransaction: () => Promise.resolve({}),
  });
  await withProvider(stub, async () => {
    const result = await signPSBT(PSBT_MAGIC_HEX, []);
    assertEquals(result, {
      signed: true,
      psbt: "aabbcc",
      error: "Transaction signed but broadcast failed",
    });
  });
});

Deno.test("signPSBT: undefined wallet result is reported as an error", async () => {
  const stub = buildStub({ signPsbt: () => Promise.resolve(undefined) });
  await withProvider(stub, async () => {
    const result = await signPSBT(PSBT_MAGIC_HEX, []);
    assertEquals(result, {
      signed: false,
      error: "No result from Wonder Wallet",
    });
  });
});

Deno.test("signPSBT: non-broadcast path converts a base64 PSBT to hex", async () => {
  const signedHex = "70736274ff0100";
  const stub = buildStub({
    signPsbt: () => Promise.resolve({ psbt: hexToBase64(signedHex) }),
  });
  await withProvider(stub, async () => {
    const result = await signPSBT(PSBT_MAGIC_HEX, [], true, undefined, false);
    assertEquals(result, { signed: true, psbt: signedHex });
    assertEquals(stub.calls.broadcast, []);
  });
});

Deno.test("signPSBT: non-broadcast path passes a hex PSBT through unchanged", async () => {
  const stub = buildStub({
    signPsbt: () => Promise.resolve({ psbt: "70736274FF0100" }),
  });
  await withProvider(stub, async () => {
    const result = await signPSBT(PSBT_MAGIC_HEX, [], true, undefined, false);
    assertEquals(result, { signed: true, psbt: "70736274FF0100" });
  });
});

Deno.test("signPSBT: non-broadcast path returns finalized txhex as psbt when no psbt is given", async () => {
  const stub = buildStub({
    signPsbt: () => Promise.resolve({ txhex: "ddeeff" }),
  });
  await withProvider(stub, async () => {
    const result = await signPSBT(PSBT_MAGIC_HEX, [], true, undefined, false);
    assertEquals(result, { signed: true, psbt: "ddeeff" });
    assertEquals(stub.calls.broadcast, []);
  });
});

Deno.test("signPSBT: empty wallet result is an error", async () => {
  const stub = buildStub({ signPsbt: () => Promise.resolve({}) });
  await withProvider(stub, async () => {
    const result = await signPSBT(PSBT_MAGIC_HEX, []);
    assertEquals(result, {
      signed: false,
      error: "No signed result from Wonder Wallet",
    });
  });
});

Deno.test("signPSBT: wallet rejection is normalised through handleWalletError", async () => {
  const stub = buildStub({
    signPsbt: () => Promise.reject(new Error("sighash_not_allowed:0x02")),
  });
  await withProvider(stub, async () => {
    const result = await signPSBT(PSBT_MAGIC_HEX, []);
    assertEquals(result.signed, false);
    assertEquals(result.error, "sighash_not_allowed:0x02");
  });
});

// ============================================================================
// signMessage / broadcastRawTX / broadcastPSBT
// ============================================================================

Deno.test("signMessage: throws without a provider and returns the signature with one", async () => {
  await withProvider(undefined, async () => {
    await assertRejects(
      () => signMessage("hello"),
      Error,
      "Wonder Wallet not connected",
    );
  });
  await withProvider(buildStub(), async () => {
    assertEquals(await signMessage("hello"), "signature123");
  });
});

Deno.test("broadcastRawTX: unwraps { txid } and rejects an empty response", async () => {
  await withProvider(undefined, async () => {
    await assertRejects(
      () => broadcastRawTX("aabb"),
      Error,
      "Wonder Wallet not connected",
    );
  });
  await withProvider(buildStub(), async () => {
    assertEquals(await broadcastRawTX("aabb"), "broadcasttxid");
  });
  await withProvider(
    buildStub({ broadcastTransaction: () => Promise.resolve({ txid: 42 }) }),
    async () => {
      await assertRejects(
        () => broadcastRawTX("aabb"),
        Error,
        "did not return a txid",
      );
    },
  );
});

Deno.test("broadcastPSBT: rejects PSBT magic bytes and forwards raw transactions", async () => {
  const stub = buildStub();
  await withProvider(stub, async () => {
    await assertRejects(
      () => broadcastPSBT(PSBT_MAGIC_HEX),
      Error,
      "cannot broadcast an unfinalized PSBT",
    );
    await assertRejects(
      () => broadcastPSBT(PSBT_MAGIC_HEX.toUpperCase()),
      Error,
      "cannot broadcast an unfinalized PSBT",
    );
    assertEquals(stub.calls.broadcast, []);
    assertEquals(await broadcastPSBT("0200000001aabb"), "broadcasttxid");
    assertEquals(stub.calls.broadcast, ["0200000001aabb"]);
  });
});
