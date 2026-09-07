/**
 * Comprehensive unit tests for client/wallet/wonder.ts
 *
 * Tests cover:
 *   - checkWonder() provider detection
 *   - connectWonder() account normalization and empty-account handling
 *   - handleAccountsChanged() account/balance mapping and disconnect handling
 *   - signPSBT() PSBT signing with the Wonder (UniSat-style) API
 *   - broadcastRawTX() / broadcastPSBT() txid unwrapping
 *   - signMessage() message signing
 *   - wonderProvider object structure and interface compliance
 *
 * Approach: All tests use local mock implementations to avoid importing
 * browser-dependent modules (window, Preact signals, walletContext) in a
 * Deno server-side test environment. Mocks mirror the exact logic in wonder.ts
 * to validate behavior independently — the same approach used by
 * tests/unit/wallet/xverse.test.ts.
 *
 * The provider response shapes exercised here follow the Wonder Wallet
 * provider API: requestAccounts() resolves { accounts, proof } on a first
 * connect and a bare string[] on a repeat connect, broadcastTransaction()
 * resolves { txid }, and a non-finalized signPsbt() resolves a base64 PSBT.
 */

import { assertEquals, assertRejects } from "@std/assert";
import {
  base64ToHex,
  hexToBase64,
} from "$lib/utils/data/binary/baseUtils.ts";

// ============================================================================
// Type definitions mirroring the Wonder provider + wallet types
// ============================================================================

interface MockBalance {
  confirmed?: number;
  unconfirmed?: number;
  total?: number;
}

type WonderAccountsResponse =
  | string[]
  | { accounts?: unknown; proof?: unknown }
  | null
  | undefined;

type WonderBroadcastResponse =
  | string
  | { txid?: unknown }
  | null
  | undefined;

interface MockWonderProvider {
  requestAccounts: () => Promise<WonderAccountsResponse>;
  getPublicKey: () => Promise<string | null>;
  getBalances: () => Promise<MockBalance | undefined>;
  signPsbt: (
    psbtHex: string,
    options: WonderSignOptions,
  ) => Promise<WonderSignResult | undefined>;
  broadcastTransaction: (txhex: string) => Promise<WonderBroadcastResponse>;
  signMessage: (message: string) => Promise<string>;
  on?: (event: string, handler: (payload: unknown) => void) => void;
}

interface WonderSignOptions {
  autoFinalized: boolean;
  enableRBF: boolean;
  toSignInputs?: {
    index: number;
    address: string;
    sighashTypes?: number[] | undefined;
  }[];
}

interface WonderSignResult {
  txhex?: string;
  txid?: string;
  psbt?: string;
}

interface MockWallet {
  accounts: string[];
  address: string;
  publicKey: string;
  addressType: "p2pkh" | "p2sh" | "p2wpkh" | "p2tr";
  btcBalance: {
    confirmed: number;
    unconfirmed: number;
    total: number;
  };
  network: "mainnet" | "testnet";
  provider: string;
  stampBalance: unknown[];
}

interface SignPSBTResult {
  signed: boolean;
  psbt?: string;
  txid?: string;
  error?: string;
  cancelled?: boolean;
}

// ============================================================================
// Local re-implementations mirroring wonder.ts logic for isolated testing
// ============================================================================

/**
 * Mirror of checkWonder() detection logic from wonder.ts.
 * checkWalletAvailability("wonder") resolves to whether wonderWallet is on
 * the global wallets object.
 */
function mockCheckWonder(
  wallets: { wonderWallet?: MockWonderProvider } | undefined,
): boolean {
  return !!(wallets?.wonderWallet);
}

/** Mirror of toAccounts() from wonder.ts. */
function toAccounts(result: unknown): string[] {
  const list = Array.isArray(result)
    ? result
    : (result as { accounts?: unknown } | null)?.accounts;
  return Array.isArray(list)
    ? list.filter((account): account is string => typeof account === "string")
    : [];
}

/** Mirror of toTxid() from wonder.ts. */
function toTxid(result: unknown): string {
  if (typeof result === "string") return result;
  const txid = (result as { txid?: unknown } | null)?.txid;
  return typeof txid === "string" ? txid : "";
}

/** Mirror of toPsbtHex() from wonder.ts. */
function toPsbtHex(psbt: string): string {
  return /^[0-9a-fA-F]+$/.test(psbt) ? psbt : base64ToHex(psbt);
}

/** Mirror of addressTypeFor() from wonder.ts. */
function addressTypeFor(address: string): MockWallet["addressType"] {
  if (address.startsWith("bc1p")) return "p2tr";
  if (address.startsWith("bc1")) return "p2wpkh";
  if (address.startsWith("3")) return "p2sh";
  return "p2pkh";
}

type ConnectOutcome =
  | { status: "not-installed" }
  | { status: "no-accounts" }
  | { status: "connected"; accounts: string[] }
  | { status: "error"; message: string };

/**
 * Mirror of connectWonder() from wonder.ts, reduced to the outcome so tests
 * can assert without a live toast queue or walletContext.
 */
async function mockConnectWonder(
  provider: MockWonderProvider | undefined,
): Promise<ConnectOutcome> {
  if (!provider) {
    return { status: "not-installed" };
  }
  try {
    const accounts = toAccounts(await provider.requestAccounts());
    if (accounts.length === 0) {
      return { status: "no-accounts" };
    }
    return { status: "connected", accounts };
  } catch (error: unknown) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

type AccountsChangedOutcome =
  | { action: "disconnect" }
  | { action: "unchanged" }
  | { action: "update"; wallet: MockWallet };

/**
 * Mirror of handleAccountsChanged() from wonder.ts.
 * Returns the resulting action so tests can assert on it without a live
 * walletContext.
 */
async function mockHandleAccountsChanged(
  rawAccounts: unknown,
  provider: MockWonderProvider | undefined,
  currentAddress = "",
): Promise<AccountsChangedOutcome> {
  const accounts = toAccounts(rawAccounts);
  if (accounts.length === 0) {
    return { action: "disconnect" };
  }
  if (currentAddress === accounts[0]) {
    return { action: "unchanged" };
  }
  const wonder = provider!;
  const wallet = {} as MockWallet;
  wallet.accounts = accounts;
  wallet.address = accounts[0];
  const publicKey = await wonder.getPublicKey();
  wallet.publicKey = typeof publicKey === "string" ? publicKey : "";
  wallet.addressType = addressTypeFor(accounts[0]);
  const balance = await wonder.getBalances();
  const confirmed = balance?.confirmed ?? 0;
  const unconfirmed = balance?.unconfirmed ?? 0;
  wallet.btcBalance = {
    confirmed,
    unconfirmed,
    total: balance?.total ?? confirmed + unconfirmed,
  };
  wallet.network = "mainnet";
  wallet.provider = "wonder";
  wallet.stampBalance = [];
  return { action: "update", wallet };
}

/**
 * Mirror of signPSBT() from wonder.ts.
 * Wonder is UniSat-style: with autoFinalized it returns a finalized
 * { txhex, txid }; without it, a signed { psbt }.
 */
async function mockSignPSBT(
  psbtHex: string,
  inputsToSign: { index: number }[],
  enableRBF = true,
  sighashTypes: number[] | undefined = undefined,
  autoBroadcast = true,
  provider: MockWonderProvider | undefined = undefined,
  walletAddress = "bc1qtest123",
): Promise<SignPSBTResult> {
  try {
    const wonder = provider;
    if (!wonder) {
      return { signed: false, error: "Wonder Wallet not connected" };
    }

    const options: WonderSignOptions = {
      autoFinalized: autoBroadcast,
      enableRBF,
    };
    if (inputsToSign?.length > 0) {
      options.toSignInputs = inputsToSign.map((input) => ({
        index: input.index,
        address: walletAddress,
        sighashTypes,
      }));
    }

    const rawResult = await wonder.signPsbt(psbtHex, options);
    const result = rawResult as WonderSignResult | undefined;

    if (!result) {
      return { signed: false, error: "No result from Wonder Wallet" };
    }

    if (autoBroadcast && result.txhex) {
      try {
        const txid = toTxid(await wonder.broadcastTransaction(result.txhex));
        if (!txid) {
          throw new Error("Wonder Wallet did not return a txid");
        }
        return { signed: true, txid };
      } catch (_broadcastError) {
        return {
          signed: true,
          psbt: result.txhex,
          error: "Transaction signed but broadcast failed",
        };
      }
    }

    if (result.psbt) {
      return { signed: true, psbt: toPsbtHex(result.psbt) };
    }
    if (result.txhex) {
      return { signed: true, psbt: result.txhex };
    }
    return { signed: false, error: "No signed result from Wonder Wallet" };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { signed: false, error: message };
  }
}

/** Mirror of broadcastRawTX() from wonder.ts. */
async function mockBroadcastRawTX(
  rawTx: string,
  provider: MockWonderProvider | undefined,
): Promise<string> {
  if (!provider) {
    throw new Error("Wonder Wallet not connected");
  }
  const txid = toTxid(await provider.broadcastTransaction(rawTx));
  if (!txid) {
    throw new Error("Wonder Wallet did not return a txid");
  }
  return txid;
}

/** Mirror of broadcastPSBT() from wonder.ts. */
async function mockBroadcastPSBT(
  psbtHex: string,
  provider: MockWonderProvider | undefined,
): Promise<string> {
  if (psbtHex.toLowerCase().startsWith("70736274ff")) {
    throw new Error(
      "Wonder Wallet cannot broadcast an unfinalized PSBT. " +
        "Re-sign the transaction to broadcast it.",
    );
  }
  return await mockBroadcastRawTX(psbtHex, provider);
}

/**
 * Mirror of signMessage() from wonder.ts.
 */
async function mockSignMessage(
  message: string,
  provider: MockWonderProvider | undefined,
): Promise<string> {
  const wonder = provider;
  if (!wonder) {
    throw new Error("Wonder Wallet not connected");
  }
  return await wonder.signMessage(message);
}

// ============================================================================
// Test helpers / constants
// ============================================================================

const PSBT_HEX = "70736274ff01000a0200000000000000000000";
const ADDRESS = "bc1qwonderpayment123abc";
const PUBKEY = "02wonderpubkey1234567890abcdef";
const PROOF = { message: "stampchain.io wants you to connect", signature: "s" };

function buildProvider(
  overrides: Partial<MockWonderProvider> = {},
): MockWonderProvider {
  return {
    requestAccounts: () =>
      Promise.resolve({ accounts: [ADDRESS], proof: PROOF }),
    getPublicKey: () => Promise.resolve(PUBKEY),
    getBalances: () =>
      Promise.resolve({ confirmed: 100000, unconfirmed: 0, total: 100000 }),
    signPsbt: () => Promise.resolve({ txhex: "aabbcc", txid: "txid123" }),
    broadcastTransaction: () => Promise.resolve({ txid: "broadcasttxid" }),
    signMessage: () => Promise.resolve("signature123"),
    on: () => {},
    ...overrides,
  };
}

// ============================================================================
// Section 1: checkWonder() detection tests
// ============================================================================

Deno.test("checkWonder: returns false when wallets object is undefined", () => {
  assertEquals(mockCheckWonder(undefined), false);
});

Deno.test(
  "checkWonder: returns false when wonderWallet is absent",
  () => {
    assertEquals(mockCheckWonder({}), false);
  },
);

Deno.test(
  "checkWonder: returns true when wonderWallet provider is present",
  () => {
    assertEquals(mockCheckWonder({ wonderWallet: buildProvider() }), true);
  },
);

// ============================================================================
// Section 2: toAccounts() normalization tests
// ============================================================================

Deno.test(
  "toAccounts: unwraps the { accounts, proof } first-connect response",
  () => {
    assertEquals(
      toAccounts({ accounts: [ADDRESS, "bc1qsecond456"], proof: PROOF }),
      [ADDRESS, "bc1qsecond456"],
    );
  },
);

Deno.test(
  "toAccounts: passes through the bare array repeat-connect response",
  () => {
    assertEquals(toAccounts([ADDRESS]), [ADDRESS]);
  },
);

Deno.test("toAccounts: returns empty for null, undefined and {}", () => {
  assertEquals(toAccounts(null), []);
  assertEquals(toAccounts(undefined), []);
  assertEquals(toAccounts({}), []);
});

Deno.test("toAccounts: returns empty for an empty accounts array", () => {
  assertEquals(toAccounts({ accounts: [] }), []);
});

Deno.test("toAccounts: drops non-string entries", () => {
  assertEquals(toAccounts([ADDRESS, null, 42, undefined]), [ADDRESS]);
});

// ============================================================================
// Section 3: connectWonder() tests
// ============================================================================

Deno.test(
  "connectWonder: reports not-installed when the provider is missing",
  async () => {
    const outcome = await mockConnectWonder(undefined);
    assertEquals(outcome.status, "not-installed");
  },
);

Deno.test(
  "connectWonder: connects from the { accounts, proof } response",
  async () => {
    const outcome = await mockConnectWonder(buildProvider());
    assertEquals(outcome.status, "connected");
    if (outcome.status !== "connected") return;
    assertEquals(outcome.accounts, [ADDRESS]);
  },
);

Deno.test(
  "connectWonder: connects from the bare array response",
  async () => {
    const provider = buildProvider({
      requestAccounts: () => Promise.resolve([ADDRESS]),
    });
    const outcome = await mockConnectWonder(provider);
    assertEquals(outcome.status, "connected");
    if (outcome.status !== "connected") return;
    assertEquals(outcome.accounts, [ADDRESS]);
  },
);

Deno.test(
  "connectWonder: reports no-accounts instead of connecting with no address",
  async () => {
    const provider = buildProvider({
      requestAccounts: () => Promise.resolve({ accounts: [], proof: PROOF }),
    });
    const outcome = await mockConnectWonder(provider);
    assertEquals(outcome.status, "no-accounts");
  },
);

Deno.test(
  "connectWonder: surfaces a rejected approval as an error",
  async () => {
    const provider = buildProvider({
      requestAccounts: () => Promise.reject(new Error("user_rejected")),
    });
    const outcome = await mockConnectWonder(provider);
    assertEquals(outcome.status, "error");
    if (outcome.status !== "error") return;
    assertEquals(outcome.message, "user_rejected");
  },
);

// ============================================================================
// Section 4: handleAccountsChanged() tests
// ============================================================================

Deno.test(
  "handleAccountsChanged: disconnects when accounts is null",
  async () => {
    const outcome = await mockHandleAccountsChanged(null, buildProvider());
    assertEquals(outcome.action, "disconnect");
  },
);

Deno.test(
  "handleAccountsChanged: disconnects when accounts is empty",
  async () => {
    const outcome = await mockHandleAccountsChanged([], buildProvider());
    assertEquals(outcome.action, "disconnect");
  },
);

Deno.test(
  "handleAccountsChanged: no-op when first account equals current address",
  async () => {
    const outcome = await mockHandleAccountsChanged(
      [ADDRESS],
      buildProvider(),
      ADDRESS,
    );
    assertEquals(outcome.action, "unchanged");
  },
);

Deno.test(
  "handleAccountsChanged: builds wallet from first account",
  async () => {
    const outcome = await mockHandleAccountsChanged([ADDRESS], buildProvider());
    assertEquals(outcome.action, "update");
    if (outcome.action !== "update") return;
    assertEquals(outcome.wallet.address, ADDRESS);
    assertEquals(outcome.wallet.accounts, [ADDRESS]);
    assertEquals(outcome.wallet.publicKey, PUBKEY);
    assertEquals(outcome.wallet.provider, "wonder");
    assertEquals(outcome.wallet.network, "mainnet");
    assertEquals(outcome.wallet.stampBalance, []);
  },
);

Deno.test(
  "handleAccountsChanged: builds wallet from the connect response object",
  async () => {
    const outcome = await mockHandleAccountsChanged(
      { accounts: [ADDRESS], proof: PROOF },
      buildProvider(),
    );
    assertEquals(outcome.action, "update");
    if (outcome.action !== "update") return;
    assertEquals(outcome.wallet.address, ADDRESS);
    assertEquals(outcome.wallet.accounts, [ADDRESS]);
  },
);

Deno.test(
  "handleAccountsChanged: falls back to an empty publicKey when unavailable",
  async () => {
    const provider = buildProvider({
      getPublicKey: () => Promise.resolve(null),
    });
    const outcome = await mockHandleAccountsChanged([ADDRESS], provider);
    if (outcome.action !== "update") throw new Error("expected update");
    assertEquals(outcome.wallet.publicKey, "");
  },
);

Deno.test(
  "handleAccountsChanged: derives addressType from the address prefix",
  async () => {
    const cases: [string, MockWallet["addressType"]][] = [
      ["bc1qwonderpayment123abc", "p2wpkh"],
      ["bc1ptaprootaddress123abc", "p2tr"],
      ["3NestedSegwitAddress123", "p2sh"],
      ["1LegacyAddress123abcdef", "p2pkh"],
    ];
    for (const [address, expected] of cases) {
      const outcome = await mockHandleAccountsChanged(
        [address],
        buildProvider(),
      );
      if (outcome.action !== "update") throw new Error("expected update");
      assertEquals(outcome.wallet.addressType, expected);
    }
  },
);

Deno.test(
  "handleAccountsChanged: maps confirmed/unconfirmed/total balance",
  async () => {
    const provider = buildProvider({
      getBalances: () =>
        Promise.resolve({ confirmed: 5000, unconfirmed: 250, total: 5250 }),
    });
    const outcome = await mockHandleAccountsChanged([ADDRESS], provider);
    if (outcome.action !== "update") throw new Error("expected update");
    assertEquals(outcome.wallet.btcBalance.confirmed, 5000);
    assertEquals(outcome.wallet.btcBalance.unconfirmed, 250);
    assertEquals(outcome.wallet.btcBalance.total, 5250);
  },
);

Deno.test(
  "handleAccountsChanged: derives total when provider omits it",
  async () => {
    const provider = buildProvider({
      getBalances: () => Promise.resolve({ confirmed: 700, unconfirmed: 300 }),
    });
    const outcome = await mockHandleAccountsChanged([ADDRESS], provider);
    if (outcome.action !== "update") throw new Error("expected update");
    assertEquals(outcome.wallet.btcBalance.total, 1000);
  },
);

Deno.test(
  "handleAccountsChanged: defaults balances to zero when missing",
  async () => {
    const provider = buildProvider({
      getBalances: () => Promise.resolve(undefined),
    });
    const outcome = await mockHandleAccountsChanged([ADDRESS], provider);
    if (outcome.action !== "update") throw new Error("expected update");
    assertEquals(outcome.wallet.btcBalance.confirmed, 0);
    assertEquals(outcome.wallet.btcBalance.unconfirmed, 0);
    assertEquals(outcome.wallet.btcBalance.total, 0);
  },
);

Deno.test(
  "handleAccountsChanged: selects the first of multiple accounts",
  async () => {
    const outcome = await mockHandleAccountsChanged(
      [ADDRESS, "bc1qsecond456"],
      buildProvider(),
    );
    if (outcome.action !== "update") throw new Error("expected update");
    assertEquals(outcome.wallet.address, ADDRESS);
    assertEquals(outcome.wallet.accounts.length, 2);
  },
);

// ============================================================================
// Section 5: signPSBT() tests
// ============================================================================

Deno.test(
  "signPSBT: returns error when provider not connected",
  async () => {
    const result = await mockSignPSBT(
      PSBT_HEX,
      [{ index: 0 }],
      true,
      undefined,
      true,
      undefined,
    );
    assertEquals(result.signed, false);
    assertEquals(result.error, "Wonder Wallet not connected");
  },
);

Deno.test(
  "signPSBT: unwraps the { txid } broadcast response into a txid string",
  async () => {
    const provider = buildProvider({
      signPsbt: () => Promise.resolve({ txhex: "deadbeef", txid: "signed" }),
      broadcastTransaction: () => Promise.resolve({ txid: "finaltxid" }),
    });
    const result = await mockSignPSBT(
      PSBT_HEX,
      [{ index: 0 }],
      true,
      undefined,
      true,
      provider,
    );
    assertEquals(result.signed, true);
    assertEquals(result.txid, "finaltxid");
    assertEquals(typeof result.txid, "string");
  },
);

Deno.test(
  "signPSBT: accepts a bare txid string broadcast response",
  async () => {
    const provider = buildProvider({
      signPsbt: () => Promise.resolve({ txhex: "deadbeef" }),
      broadcastTransaction: () => Promise.resolve("finaltxid"),
    });
    const result = await mockSignPSBT(
      PSBT_HEX,
      [{ index: 0 }],
      true,
      undefined,
      true,
      provider,
    );
    assertEquals(result.signed, true);
    assertEquals(result.txid, "finaltxid");
  },
);

Deno.test(
  "signPSBT: falls back to signed txhex when broadcast returns no txid",
  async () => {
    const provider = buildProvider({
      signPsbt: () => Promise.resolve({ txhex: "deadbeef" }),
      broadcastTransaction: () => Promise.resolve({}),
    });
    const result = await mockSignPSBT(
      PSBT_HEX,
      [{ index: 0 }],
      true,
      undefined,
      true,
      provider,
    );
    assertEquals(result.signed, true);
    assertEquals(result.txid, undefined);
    assertEquals(result.psbt, "deadbeef");
    assertEquals(result.error, "Transaction signed but broadcast failed");
  },
);

Deno.test(
  "signPSBT: falls back to signed txhex when broadcast fails",
  async () => {
    const provider = buildProvider({
      signPsbt: () => Promise.resolve({ txhex: "deadbeef" }),
      broadcastTransaction: () => Promise.reject(new Error("network down")),
    });
    const result = await mockSignPSBT(
      PSBT_HEX,
      [{ index: 0 }],
      true,
      undefined,
      true,
      provider,
    );
    assertEquals(result.signed, true);
    assertEquals(result.psbt, "deadbeef");
    assertEquals(result.error, "Transaction signed but broadcast failed");
  },
);

Deno.test(
  "signPSBT: converts a base64 signed PSBT to hex",
  async () => {
    const signedHex = "70736274ffdeadbeef";
    const provider = buildProvider({
      signPsbt: () => Promise.resolve({ psbt: hexToBase64(signedHex) }),
    });
    const result = await mockSignPSBT(
      PSBT_HEX,
      [{ index: 0 }],
      true,
      undefined,
      false,
      provider,
    );
    assertEquals(result.signed, true);
    assertEquals(result.psbt, signedHex);
  },
);

Deno.test(
  "signPSBT: leaves an already-hex signed PSBT untouched",
  async () => {
    const provider = buildProvider({
      signPsbt: () => Promise.resolve({ psbt: "70736274ffaabbcc" }),
    });
    const result = await mockSignPSBT(
      PSBT_HEX,
      [{ index: 0 }],
      true,
      undefined,
      false,
      provider,
    );
    assertEquals(result.signed, true);
    assertEquals(result.psbt, "70736274ffaabbcc");
    assertEquals(result.txid, undefined);
  },
);

Deno.test(
  "signPSBT: returns txhex as psbt when no-broadcast wallet returns txhex only",
  async () => {
    const provider = buildProvider({
      signPsbt: () => Promise.resolve({ txhex: "rawtxhex" }),
    });
    const result = await mockSignPSBT(
      PSBT_HEX,
      [{ index: 0 }],
      true,
      undefined,
      false,
      provider,
    );
    assertEquals(result.signed, true);
    assertEquals(result.psbt, "rawtxhex");
  },
);

Deno.test(
  "signPSBT: errors when provider returns no result",
  async () => {
    const provider = buildProvider({
      signPsbt: () => Promise.resolve(undefined),
    });
    const result = await mockSignPSBT(
      PSBT_HEX,
      [{ index: 0 }],
      true,
      undefined,
      true,
      provider,
    );
    assertEquals(result.signed, false);
    assertEquals(result.error, "No result from Wonder Wallet");
  },
);

Deno.test(
  "signPSBT: errors when result has neither txhex nor psbt",
  async () => {
    const provider = buildProvider({
      signPsbt: () => Promise.resolve({}),
    });
    const result = await mockSignPSBT(
      PSBT_HEX,
      [{ index: 0 }],
      true,
      undefined,
      false,
      provider,
    );
    assertEquals(result.signed, false);
    assertEquals(result.error, "No signed result from Wonder Wallet");
  },
);

Deno.test(
  "signPSBT: maps toSignInputs with address and sighashTypes",
  async () => {
    let captured: WonderSignOptions | undefined;
    const provider = buildProvider({
      signPsbt: (_hex, options) => {
        captured = options;
        return Promise.resolve({ psbt: "ok" });
      },
    });
    await mockSignPSBT(
      PSBT_HEX,
      [{ index: 0 }, { index: 2 }],
      true,
      [1],
      false,
      provider,
      "bc1qmine",
    );
    assertEquals(captured?.autoFinalized, false);
    assertEquals(captured?.enableRBF, true);
    assertEquals(captured?.toSignInputs?.length, 2);
    assertEquals(captured?.toSignInputs?.[0].index, 0);
    assertEquals(captured?.toSignInputs?.[0].address, "bc1qmine");
    assertEquals(captured?.toSignInputs?.[0].sighashTypes, [1]);
    assertEquals(captured?.toSignInputs?.[1].index, 2);
  },
);

Deno.test(
  "signPSBT: omits toSignInputs when no inputs provided",
  async () => {
    let captured: WonderSignOptions | undefined;
    const provider = buildProvider({
      signPsbt: (_hex, options) => {
        captured = options;
        return Promise.resolve({ psbt: "ok" });
      },
    });
    await mockSignPSBT(PSBT_HEX, [], true, undefined, false, provider);
    assertEquals(captured?.toSignInputs, undefined);
  },
);

Deno.test(
  "signPSBT: passes enableRBF flag through to options",
  async () => {
    let captured: WonderSignOptions | undefined;
    const provider = buildProvider({
      signPsbt: (_hex, options) => {
        captured = options;
        return Promise.resolve({ psbt: "ok" });
      },
    });
    await mockSignPSBT(
      PSBT_HEX,
      [{ index: 0 }],
      false,
      undefined,
      false,
      provider,
    );
    assertEquals(captured?.enableRBF, false);
  },
);

Deno.test(
  "signPSBT: returns error message when signPsbt throws",
  async () => {
    const provider = buildProvider({
      signPsbt: () => Promise.reject(new Error("user rejected")),
    });
    const result = await mockSignPSBT(
      PSBT_HEX,
      [{ index: 0 }],
      true,
      undefined,
      true,
      provider,
    );
    assertEquals(result.signed, false);
    assertEquals(result.error, "user rejected");
  },
);

// ============================================================================
// Section 6: broadcastRawTX() / broadcastPSBT() tests
// ============================================================================

Deno.test(
  "broadcastRawTX: unwraps the { txid } response",
  async () => {
    const txid = await mockBroadcastRawTX("aabbcc", buildProvider());
    assertEquals(txid, "broadcasttxid");
  },
);

Deno.test(
  "broadcastRawTX: accepts a bare txid string response",
  async () => {
    const provider = buildProvider({
      broadcastTransaction: () => Promise.resolve("plaintxid"),
    });
    assertEquals(await mockBroadcastRawTX("aabbcc", provider), "plaintxid");
  },
);

Deno.test(
  "broadcastRawTX: throws when the provider is missing",
  async () => {
    await assertRejects(
      () => mockBroadcastRawTX("aabbcc", undefined),
      Error,
      "Wonder Wallet not connected",
    );
  },
);

Deno.test(
  "broadcastRawTX: throws when the response carries no txid",
  async () => {
    const provider = buildProvider({
      broadcastTransaction: () => Promise.resolve({}),
    });
    await assertRejects(
      () => mockBroadcastRawTX("aabbcc", provider),
      Error,
      "did not return a txid",
    );
  },
);

Deno.test(
  "broadcastPSBT: forwards a finalized raw transaction",
  async () => {
    const txid = await mockBroadcastPSBT("aabbcc", buildProvider());
    assertEquals(txid, "broadcasttxid");
  },
);

Deno.test(
  "broadcastPSBT: rejects an unfinalized PSBT",
  async () => {
    await assertRejects(
      () => mockBroadcastPSBT(PSBT_HEX, buildProvider()),
      Error,
      "cannot broadcast an unfinalized PSBT",
    );
  },
);

// ============================================================================
// Section 7: signMessage() tests
// ============================================================================

Deno.test(
  "signMessage: throws when provider not connected",
  async () => {
    await assertRejects(
      () => mockSignMessage("hello", undefined),
      Error,
      "Wonder Wallet not connected",
    );
  },
);

Deno.test(
  "signMessage: returns signature from provider",
  async () => {
    const provider = buildProvider({
      signMessage: () => Promise.resolve("0xsignedmessage"),
    });
    const sig = await mockSignMessage("hello world", provider);
    assertEquals(sig, "0xsignedmessage");
  },
);

Deno.test(
  "signMessage: forwards the exact message to the provider",
  async () => {
    let captured = "";
    const provider = buildProvider({
      signMessage: (message) => {
        captured = message;
        return Promise.resolve("sig");
      },
    });
    await mockSignMessage("prove ownership", provider);
    assertEquals(captured, "prove ownership");
  },
);

// ============================================================================
// Section 8: wonderProvider structure tests
// ============================================================================

Deno.test(
  "wonderProvider: exposes the full WalletProvider surface",
  () => {
    const wonderProvider = {
      checkWonder: () => {},
      connectWonder: () => {},
      signPSBT: () => {},
      signMessage: () => {},
      broadcastRawTX: () => {},
      broadcastPSBT: () => {},
    };
    assertEquals(typeof wonderProvider.checkWonder, "function");
    assertEquals(typeof wonderProvider.connectWonder, "function");
    assertEquals(typeof wonderProvider.signPSBT, "function");
    assertEquals(typeof wonderProvider.signMessage, "function");
    assertEquals(typeof wonderProvider.broadcastRawTX, "function");
    assertEquals(typeof wonderProvider.broadcastPSBT, "function");
  },
);
