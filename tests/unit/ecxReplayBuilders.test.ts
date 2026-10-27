/**
 * ECX replay protection on the server-built PSBTs that do not come from a
 * Counterparty compose route: the SRC-101 multisig PSBT service, the
 * marketplace listing PSBT (trx/create_psbt) and the buyer completion
 * (trx/complete_psbt).
 *
 * - CHAIN unset: the PSBT hex equals the hex the builder produced before
 *   replay protection was wired in (golden values captured from the
 *   pre-change code), so Bitcoin output is byte-identical.
 * - CHAIN=ecx: locktime 499999998 and at least one non-final input; inputs
 *   keep their order (vin[0] is the SRC-101 ARC4 key input).
 *
 * The chain is selected by stubbing Deno.env.get in this test isolate only;
 * the process environment is never written, so CHAIN cannot leak into test
 * files running in parallel. Every stub is restored in a finally block.
 */
import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import * as bitcoin from "bitcoinjs-lib";
import { Buffer } from "node:buffer";
import { crypto as stdCrypto } from "@std/crypto";
import { SRC101MultisigPSBTService } from "$server/services/src101/psbt/src101MultisigPSBTService.ts";
import {
  BitcoinTransactionBuilder,
  createBitcoinTransactionBuilder,
} from "$server/services/transaction/bitcoinTransactionBuilder.ts";
import {
  ECX_REPLAY_LOCKTIME,
  SEQUENCE_FINAL,
  SEQUENCE_RBF,
} from "$server/services/chain/chainProfile.ts";

/* ===== fixtures ===== */

const ADDRESS = "bc1q20d2cdvy2x83h3ssrz5lgryy4c9wqxsgc749ej";
const ADDRESS_SCRIPT = "001453daac3584518f1bc61018a9f40c84ae0ae01a08";
const BUYER = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
const BUYER_SCRIPT = Buffer.from(
  bitcoin.address.toOutputScript(BUYER, bitcoin.networks.bitcoin),
).toString("hex");
const TXID_A = "aa".repeat(32);
const TXID_B = "bb".repeat(32);
const SELLER_TXID = "cc".repeat(32);
const BUYER_TXID = "dd".repeat(32);

/* ===== helpers ===== */

type Overrides = Record<string, string | undefined>;

// No operator service fee in either mode, so the hex depends only on CHAIN.
const NO_FEE: Overrides = {
  MINTING_SERVICE_FEE_ENABLED: "0",
  MINTING_SERVICE_FEE_FIXED_SATS: "0",
  MINTING_SERVICE_FEE_ADDRESS: "",
};
const BITCOIN: Overrides = { ...NO_FEE, CHAIN: undefined };
const ECX: Overrides = { ...NO_FEE, CHAIN: "ecx" };

/** Run fn with Deno.env.get overridden in this isolate only, then restore. */
async function withEnv<T>(
  overrides: Overrides,
  fn: () => Promise<T>,
): Promise<T> {
  const realGet = Deno.env.get.bind(Deno.env);
  const envStub = stub(
    Deno.env,
    "get",
    (key: string) => (key in overrides ? overrides[key] : realGet(key)),
  );
  try {
    return await fn();
  } finally {
    envStub.restore();
  }
}

/**
 * Make the SRC-101 pubkey padding byte deterministic: a counter, so the
 * service's retry-until-valid-pubkey loop still terminates.
 */
function stubRandom() {
  let next = 0;
  return stub(
    stdCrypto,
    "getRandomValues",
    // deno-lint-ignore no-explicit-any
    ((arr: any) => {
      for (let i = 0; i < arr.length; i++) arr[i] = next++ & 0xff;
      return arr;
    }) as typeof stdCrypto.getRandomValues,
  );
}

const txidOf = (hash: Uint8Array) =>
  Buffer.from(hash).reverse().toString("hex");
const inputsOf = (psbt: bitcoin.Psbt) =>
  psbt.txInputs.map((i) => `${txidOf(i.hash)}:${i.index}`);
const outputsOf = (psbt: bitcoin.Psbt) =>
  psbt.txOutputs.map((o) => [Buffer.from(o.script).toString("hex"), o.value]);

function assertEcxMarker(ecx: bitcoin.Psbt, btc: bitcoin.Psbt) {
  assertEquals(ecx.locktime, ECX_REPLAY_LOCKTIME);
  assert(
    ecx.txInputs.some((i) => i.sequence < SEQUENCE_FINAL),
    "no non-final input",
  );
  assertEquals(inputsOf(ecx), inputsOf(btc));
  assertEquals(outputsOf(ecx), outputsOf(btc));
  const before = btc.txInputs.map((i) => i.sequence);
  const expected = before.every((s) => s === SEQUENCE_FINAL)
    ? [SEQUENCE_RBF, ...before.slice(1)]
    : before;
  assertEquals(ecx.txInputs.map((i) => i.sequence), expected);
}

// PSBT hex each builder returned for these fixtures BEFORE replay protection
// was wired in (captured from origin/feat/ecx-chain-profile at 12adaa22a).
const BITCOIN_GOLDEN: Record<string, string> = {
  "src101 preparePSBT (enableRBF=true)":
    "70736274ff0100fdf0010200000002aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0100000000fdffffffbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb0000000000fdffffff05150300000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08290300000000000069512103e3e81c932355a17da65306a7971208fdd0180cd0b916fe7a9ca33ed71e7fdb002102829d37892957d2bb6bea948b7cabb0e0548f175152987f726d3c4a900d0bf2012102020202020202020202020202020202020202020202020202020202020202020253ae290300000000000069512103144853d80ba9c0b4a558d193bdad1087dad68270099543778c07a333a1d971042102929333515f4b13aabe6816448bd3dce9d7b12d4e4537f9abe6af87e5ede9e9072102020202020202020202020202020202020202020202020202020202020202020253ae290300000000000069512102e120992ef987ec1e2f3b773669c6464892f538cb0a10ebcb0cac106dc8198e09210307f95191b88deb852e78f542977a9e723974ed6f4e4edefa619b0e55700d2b0a2102020202020202020202020202020202020202020202020202020202020202020253ae586e01000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000000001011f60ea00000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a080001011f409c00000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000000000",
  "src101 preparePSBT (enableRBF=false)":
    "70736274ff0100fdf0010200000002aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0100000000ffffffffbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb0000000000ffffffff05150300000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08290300000000000069512103e3e81c932355a17da65306a7971208fdd0180cd0b916fe7a9ca33ed71e7fdb002102829d37892957d2bb6bea948b7cabb0e0548f175152987f726d3c4a900d0bf2012102020202020202020202020202020202020202020202020202020202020202020253ae290300000000000069512103144853d80ba9c0b4a558d193bdad1087dad68270099543778c07a333a1d971042102929333515f4b13aabe6816448bd3dce9d7b12d4e4537f9abe6af87e5ede9e9072102020202020202020202020202020202020202020202020202020202020202020253ae290300000000000069512102e120992ef987ec1e2f3b773669c6464892f538cb0a10ebcb0cac106dc8198e09210307f95191b88deb852e78f542977a9e723974ed6f4e4edefa619b0e55700d2b0a2102020202020202020202020202020202020202020202020202020202020202020253ae586e01000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000000001011f60ea00000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a080001011f409c00000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000000000",
  "create_psbt listing":
    "70736274ff0100710200000001cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc0000000000fdffffff0250c300000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a0868bf00000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000000001011fa08601000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000",
  "complete_psbt":
    "70736274ff01009a0200000002cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc0000000000fdffffffdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd0000000000fdffffff02f04902000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08e045020000000000160014e8df018c7e326cc253faac7e46cdc51e68542c42000000000001011fa08601000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a080001011f400d030000000000160014e8df018c7e326cc253faac7e46cdc51e68542c42000000",
};

function assertGolden(name: string, psbt: bitcoin.Psbt) {
  assertEquals(psbt.toHex(), BITCOIN_GOLDEN[name]);
}

/* ===== SRC-101 multisig PSBT service ===== */

async function buildSrc101(
  env: Overrides,
  enableRBF: boolean,
): Promise<bitcoin.Psbt> {
  // deno-lint-ignore no-explicit-any
  const utxoService = (SRC101MultisigPSBTService as any).utxoService;
  const select = stub(
    utxoService,
    "selectUTXOsForTransaction",
    () =>
      Promise.resolve({
        inputs: [
          {
            txid: TXID_A,
            vout: 1,
            value: 60_000,
            script: ADDRESS_SCRIPT,
            scriptType: "P2WPKH",
          },
          {
            txid: TXID_B,
            vout: 0,
            value: 40_000,
            script: ADDRESS_SCRIPT,
            scriptType: "P2WPKH",
          },
        ],
        fee: 3_000,
      }),
  );
  const random = stubRandom();
  try {
    const result = await withEnv(
      env,
      () =>
        SRC101MultisigPSBTService.preparePSBT({
          network: "mainnet",
          sourceAddress: ADDRESS,
          changeAddress: ADDRESS,
          recAddress: ADDRESS,
          recVault: 789,
          feeRate: 5,
          transferString: JSON.stringify({
            p: "src-101",
            op: "transfer",
            hash: "x",
            toaddress: ADDRESS,
            tokenid: ["dGVzdA=="],
          }),
          enableRBF,
          // deno-lint-ignore no-explicit-any
        } as any),
    );
    return bitcoin.Psbt.fromHex(result.psbtHex);
  } finally {
    random.restore();
    select.restore();
  }
}

for (const enableRBF of [true, false]) {
  const name = `src101 preparePSBT (enableRBF=${enableRBF})`;

  Deno.test(`${name}: CHAIN unset keeps the Bitcoin PSBT byte-identical`, async () => {
    const psbt = await buildSrc101(BITCOIN, enableRBF);
    assertEquals(psbt.locktime, 0);
    const seq = enableRBF ? SEQUENCE_RBF : SEQUENCE_FINAL;
    assertEquals(psbt.txInputs.map((i) => i.sequence), [seq, seq]);
    assertGolden(name, psbt);
  });

  Deno.test(`${name}: CHAIN=ecx sets the replay marker, vin[0] stays the ARC4 key`, async () => {
    const btc = await buildSrc101(BITCOIN, enableRBF);
    const ecx = await buildSrc101(ECX, enableRBF);
    assertEcxMarker(ecx, btc);
    assertEquals(txidOf(ecx.txInputs[0].hash), TXID_A);
  });
}

/* ===== trx/create_psbt: marketplace listing PSBT ===== */

function listingBuilder() {
  return createBitcoinTransactionBuilder({
    // deno-lint-ignore no-explicit-any
    getUTXOForAddress: (() =>
      Promise.resolve({
        utxo: { script: ADDRESS_SCRIPT, value: 100_000 },
      })) as any,
    estimateFee: () => 1_000,
    commonUtxoService: {
      getRawTransactionHex: () => Promise.resolve("00"),
      // deno-lint-ignore no-explicit-any
    } as any,
  });
}

async function buildListing(env: Overrides): Promise<bitcoin.Psbt> {
  const hex = await withEnv(
    env,
    () => listingBuilder().createPSBT(`${SELLER_TXID}:0`, 0.0005, ADDRESS),
  );
  return bitcoin.Psbt.fromHex(hex);
}

Deno.test("create_psbt listing: CHAIN unset keeps the Bitcoin PSBT byte-identical", async () => {
  const psbt = await buildListing(BITCOIN);
  assertEquals(psbt.locktime, 0);
  assertEquals(psbt.txInputs.map((i) => i.sequence), [SEQUENCE_RBF]);
  assertGolden("create_psbt listing", psbt);
});

Deno.test("create_psbt listing: CHAIN=ecx sets the replay marker before the seller signs", async () => {
  const btc = await buildListing(BITCOIN);
  const ecx = await buildListing(ECX);
  assertEcxMarker(ecx, btc);
});

/* ===== trx/complete_psbt: buyer completion ===== */

/** Answer the mempool.space /tx/{txid} lookups completePSBT makes. */
function stubMempool() {
  return stub(globalThis, "fetch", (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);
    const script = url.includes(BUYER_TXID) ? BUYER_SCRIPT : ADDRESS_SCRIPT;
    const value = url.includes(BUYER_TXID) ? 200_000 : 100_000;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          vout: [{ scriptpubkey: script, value }],
          status: { confirmed: true },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
  });
}

/** An unsigned seller listing: seller input + payment output. */
function sellerListing(locktime?: number): string {
  const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
  psbt.addInput({
    hash: SELLER_TXID,
    index: 0,
    sequence: SEQUENCE_RBF,
    witnessUtxo: {
      script: Buffer.from(ADDRESS_SCRIPT, "hex"),
      value: 100_000n,
    },
  });
  psbt.addOutput({ address: ADDRESS, value: 150_000n });
  if (locktime !== undefined) psbt.setLocktime(locktime);
  return psbt.toHex();
}

async function completeListing(
  env: Overrides,
  sellerHex = sellerListing(),
): Promise<bitcoin.Psbt> {
  const fetchStub = stubMempool();
  try {
    const hex = await withEnv(
      env,
      () =>
        BitcoinTransactionBuilder.completePSBT(
          sellerHex,
          `${BUYER_TXID}:0`,
          BUYER,
          5,
        ),
    );
    return bitcoin.Psbt.fromHex(hex);
  } finally {
    fetchStub.restore();
  }
}

Deno.test("complete_psbt: CHAIN unset keeps the Bitcoin PSBT byte-identical", async () => {
  const psbt = await completeListing(BITCOIN);
  assertEquals(psbt.locktime, 0);
  assertEquals(psbt.txInputs.map((i) => i.sequence), [
    SEQUENCE_RBF,
    SEQUENCE_RBF,
  ]);
  assertGolden("complete_psbt", psbt);
});

Deno.test("complete_psbt: CHAIN=ecx marks an unmarked unsigned listing", async () => {
  const btc = await completeListing(BITCOIN);
  const ecx = await completeListing(ECX);
  assertEcxMarker(ecx, btc);
});

Deno.test("complete_psbt: CHAIN=ecx keeps a listing that already carries the marker", async () => {
  const ecx = await completeListing(ECX, sellerListing(ECX_REPLAY_LOCKTIME));
  assertEquals(ecx.locktime, ECX_REPLAY_LOCKTIME);
  assertEquals(ecx.txInputs.length, 2);
});

Deno.test("complete_psbt: CHAIN=ecx refuses a signed listing without the marker", async () => {
  // A seller signature fixes the locktime, so an unmarked signed listing can
  // never become replay-protected. Completing it must fail, not ship it.
  const psbt = bitcoin.Psbt.fromHex(sellerListing());
  psbt.data.inputs[0].partialSig = [{
    pubkey: Buffer.alloc(33, 2),
    signature: Buffer.from("3006020101020101" + "83", "hex"), // SIGHASH_SINGLE|ANYONECANPAY
  }];
  const signedHex = psbt.toHex();
  // Control: Bitcoin completes the same signed listing as before.
  const btc = await completeListing(BITCOIN, signedHex);
  assertEquals(btc.locktime, 0);
  assertEquals(btc.txInputs.length, 2);
  await assertRejects(
    () => completeListing(ECX, signedHex),
    Error,
    "signatures exist",
  );
});
