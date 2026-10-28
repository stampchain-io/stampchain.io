/**
 * ECX replay protection on the Counterparty-composed PSBT routes:
 * create/send, create/dispense, trx/stampattach (CP-chosen and inputs_set
 * inputs), trx/stampdetach and fairmint/compose.
 *
 * Each route runs end to end with Counterparty and the UTXO lookup stubbed.
 * - CHAIN unset: the PSBT hex equals the hex the route produced before replay
 *   protection was wired in (golden values captured from the pre-change code),
 *   so Bitcoin output is byte-identical.
 * - CHAIN=ecx: locktime 499999998, at least one non-final input, and the
 *   inputs keep Counterparty's order (vin[0] is the ARC4 key input).
 *
 * The chain is selected by stubbing Deno.env.get in this test isolate only;
 * the process environment is never written, so CHAIN cannot leak into test
 * files running in parallel. Every stub is restored in a finally block.
 */
import { assert, assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import * as bitcoin from "bitcoinjs-lib";
import { Buffer } from "node:buffer";
import { handler as sendHandler } from "$routes/api/v2/create/send.ts";
import { handler as dispenseHandler } from "$routes/api/v2/create/dispense.ts";
import { handler as attachHandler } from "$routes/api/v2/trx/stampattach.ts";
import { handler as detachHandler } from "$routes/api/v2/trx/stampdetach.ts";
import { handler as fairmintHandler } from "$routes/api/v2/fairmint/compose.ts";
import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import { CommonUTXOService } from "$server/services/utxo/commonUtxoService.ts";
import { StampController } from "$server/controller/stampController.ts";
import {
  ECX_REPLAY_LOCKTIME,
  SEQUENCE_FINAL,
  SEQUENCE_RBF,
} from "$server/services/chain/chainProfile.ts";

/* ===== fixtures ===== */

const ADDRESS = "bc1q20d2cdvy2x83h3ssrz5lgryy4c9wqxsgc749ej";
const ADDRESS_SCRIPT = "001453daac3584518f1bc61018a9f40c84ae0ae01a08";
const UTXO_VALUE = 1027319;

// Authentic CP rawtransactions (return_psbt:false) for the wallet above; the
// same fixtures serviceFeeRouteMigration.test.ts uses. One input, sequence final.
const FAIRMINT_RAWTX =
  "02000000014665047b54620698fb66106dc7919353b911691f79d4fe36d37c244255a6cc831b00000000ffffffff020000000000000000166a146bb05262506ef33a694cdcc4708b88509918405836aa0f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a0800000000";
const DISPENSE_RAWTX =
  "02000000014665047b54620698fb66106dc7919353b911691f79d4fe36d37c244255a6cc831b00000000ffffffff032f5106000000000016001421fc69cd03020d0fdc00cfcfef848a8847618f0000000000000000000c6a0a6bb05262506ef33a3fce9e5809000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a0800000000";

/** Synthetic CP tx with two all-final inputs, OP_RETURN + change to ADDRESS. */
function twoInputRawTx(): string {
  const tx = new bitcoin.Transaction();
  tx.version = 2;
  tx.addInput(Buffer.alloc(32, 0xaa), 1, SEQUENCE_FINAL);
  tx.addInput(Buffer.alloc(32, 0xbb), 0, SEQUENCE_FINAL);
  tx.addOutput(Buffer.from("6a04cafebabe", "hex"), 0n);
  tx.addOutput(
    Buffer.from(ADDRESS_SCRIPT, "hex"),
    BigInt(UTXO_VALUE * 2 - 2000),
  );
  return tx.toHex();
}
const TWO_INPUT_RAWTX = twoInputRawTx();

/* ===== helpers ===== */

type Overrides = Record<string, string | undefined>;

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

// No operator service fee in either mode, so the hex depends only on CHAIN.
const NO_FEE: Overrides = {
  MINTING_SERVICE_FEE_FIXED_SATS: "0",
  MINTING_SERVICE_FEE_ADDRESS: "",
};
const BITCOIN: Overrides = { ...NO_FEE, CHAIN: undefined };
const ECX: Overrides = { ...NO_FEE, CHAIN: "ecx" };

/** Stub the UTXO lookup every route uses to resolve CP's inputs. */
function stubUtxoLookup() {
  return stub(
    CommonUTXOService.prototype,
    "getSpecificUTXO",
    // deno-lint-ignore no-explicit-any
    (() =>
      Promise.resolve({ script: ADDRESS_SCRIPT, value: UTXO_VALUE })) as any,
  );
}

function post(body: unknown): Request {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function psbtHexFrom(res: Response): Promise<string> {
  const json = await res.json();
  assertEquals(res.status, 200, JSON.stringify(json));
  const hex = json.psbtHex ?? json.psbt;
  assert(typeof hex === "string" && hex.length > 0, "response has no PSBT hex");
  return hex;
}

interface RouteCase {
  name: string;
  rawTx: string;
  /** Install route-specific stubs; returns their restore functions. */
  stubs: (rawTx: string) => { restore: () => void }[];
  call: () => Promise<Response>;
}

// deno-lint-ignore no-explicit-any
const ctx = {} as any;

const ROUTES: RouteCase[] = [
  {
    name: "create/send",
    rawTx: TWO_INPUT_RAWTX,
    stubs: (rawTx) => [
      stub(
        CounterpartyApiManager,
        "createSend",
        // deno-lint-ignore no-explicit-any
        (() =>
          Promise.resolve({
            result: { rawtransaction: rawTx, btc_fee: 2000 },
          })) as any,
      ),
    ],
    call: () =>
      sendHandler.POST!(
        post({
          address: ADDRESS,
          destination: ADDRESS,
          asset: "A1",
          quantity: 1,
          satsPerVB: 5,
        }),
        ctx,
      ),
  },
  {
    name: "create/dispense",
    rawTx: DISPENSE_RAWTX,
    stubs: (rawTx) => [
      stub(
        CounterpartyApiManager,
        "createDispense",
        // deno-lint-ignore no-explicit-any
        (() => Promise.resolve({ result: { rawtransaction: rawTx } })) as any,
      ),
    ],
    call: () =>
      dispenseHandler.POST!(
        post({
          address: ADDRESS,
          dispenser: "d1",
          quantity: 413999,
          options: { satsPerVB: 5 },
        }),
        ctx,
      ),
  },
  {
    name: "trx/stampattach (CP-chosen inputs)",
    rawTx: TWO_INPUT_RAWTX,
    stubs: (rawTx) => [
      stub(StampController, "resolveToCpid", () => Promise.resolve("A1")),
      // deno-lint-ignore no-explicit-any
      stub(
        CounterpartyApiManager,
        "composeAttach",
        (() => Promise.resolve({ rawtransaction: rawTx })) as any,
      ),
    ],
    call: () =>
      attachHandler.POST!(
        post({
          address: ADDRESS,
          identifier: "A1",
          quantity: 1,
          options: { satsPerVB: 5 },
        }),
        ctx,
      ),
  },
  {
    name: "trx/stampattach (inputs_set, allow_unconfirmed_inputs=false)",
    rawTx: FAIRMINT_RAWTX,
    stubs: (rawTx) => [
      stub(StampController, "resolveToCpid", () => Promise.resolve("A1")),
      // deno-lint-ignore no-explicit-any
      stub(
        CounterpartyApiManager,
        "composeAttach",
        (() => Promise.resolve({ rawtransaction: rawTx })) as any,
      ),
    ],
    call: () =>
      attachHandler.POST!(
        post({
          address: ADDRESS,
          identifier: "A1",
          quantity: 1,
          inputs_set: `${
            "4665047b54620698fb66106dc7919353b911691f79d4fe36d37c244255a6cc83"
              .match(/../g)!.reverse().join("")
          }:27`,
          options: { satsPerVB: 5, allow_unconfirmed_inputs: false },
        }),
        ctx,
      ),
  },
  {
    name: "trx/stampdetach",
    rawTx: TWO_INPUT_RAWTX,
    stubs: (rawTx) => [
      stub(
        CounterpartyApiManager,
        "composeDetach",
        // deno-lint-ignore no-explicit-any
        (() => Promise.resolve({ result: { rawtransaction: rawTx } })) as any,
      ),
    ],
    call: () =>
      detachHandler.POST!(
        post({
          utxo: `${"aa".repeat(32)}:1`,
          destination: ADDRESS,
          options: { satsPerVB: 5 },
        }),
        ctx,
      ),
  },
  {
    name: "fairmint/compose",
    rawTx: FAIRMINT_RAWTX,
    stubs: (rawTx) => [
      // deno-lint-ignore no-explicit-any
      stub(
        CounterpartyApiManager,
        "getAssetFairminter",
        (() => Promise.resolve({ price: 0 })) as any,
      ),
      stub(
        CounterpartyApiManager,
        "composeFairmint",
        // deno-lint-ignore no-explicit-any
        (() => Promise.resolve({ result: { rawtransaction: rawTx } })) as any,
      ),
    ],
    call: () =>
      fairmintHandler.POST!(
        post({ address: ADDRESS, asset: "TRUDEEPEPE", satsPerVB: 5 }),
        ctx,
      ),
  },
];

async function buildRoutePsbt(
  route: RouteCase,
  env: Overrides,
): Promise<bitcoin.Psbt> {
  const stubs = [stubUtxoLookup(), ...route.stubs(route.rawTx)];
  try {
    const hex = await withEnv(env, () => route.call().then(psbtHexFrom));
    return bitcoin.Psbt.fromHex(hex);
  } finally {
    stubs.forEach((s) => s.restore());
  }
}

const txidOf = (hash: Uint8Array) =>
  Buffer.from(hash).reverse().toString("hex");

/* ===== Bitcoin: byte-identical to the pre-change routes ===== */

// PSBT hex each route returned for these fixtures BEFORE replay protection was
// wired in (captured from origin/feat/ecx-chain-profile at 12adaa22a).
const BITCOIN_GOLDEN: Record<string, string> = {
  "create/send":
    "70736274ff01008a0200000002aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0100000000ffffffffbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb0000000000ffffffff020000000000000000066a04cafebabe1e521f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000000001011ff7ac0f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a080001011ff7ac0f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000",
  "create/dispense":
    "70736274ff01008602000000014665047b54620698fb66106dc7919353b911691f79d4fe36d37c244255a6cc831b00000000ffffffff032f5106000000000016001421fc69cd03020d0fdc00cfcfef848a8847618f0000000000000000000c6a0a6bb05262506ef33a3fce9e5809000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000000001011ff7ac0f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a0800000000",
  "trx/stampattach (CP-chosen inputs)":
    "70736274ff01008a0200000002aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0100000000ffffffffbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb0000000000ffffffff020000000000000000066a04cafebabe1e521f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000000001011ff7ac0f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a080001011ff7ac0f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000",
  "trx/stampattach (inputs_set, allow_unconfirmed_inputs=false)":
    "70736274ff01007102000000014665047b54620698fb66106dc7919353b911691f79d4fe36d37c244255a6cc831b00000000ffffffff020000000000000000166a146bb05262506ef33a694cdcc4708b88509918405836aa0f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000000001011ff7ac0f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000",
  "trx/stampdetach":
    "70736274ff01008a0200000002aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0100000000ffffffffbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb0000000000ffffffff020000000000000000066a04cafebabe1e521f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000000001011ff7ac0f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a080001011ff7ac0f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000",
  "fairmint/compose":
    "70736274ff01007102000000014665047b54620698fb66106dc7919353b911691f79d4fe36d37c244255a6cc831b00000000ffffffff020000000000000000166a146bb05262506ef33a694cdcc4708b88509918405836aa0f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000000001011ff7ac0f000000000016001453daac3584518f1bc61018a9f40c84ae0ae01a08000000",
};

for (const route of ROUTES) {
  Deno.test(`${route.name}: CHAIN unset keeps the Bitcoin PSBT byte-identical`, async () => {
    const psbt = await buildRoutePsbt(route, BITCOIN);
    const cpTx = bitcoin.Transaction.fromHex(route.rawTx);
    assertEquals(psbt.locktime, 0);
    if (!route.name.includes("inputs_set")) {
      assertEquals(
        psbt.txInputs.map((i) => i.sequence),
        cpTx.ins.map((i) => i.sequence),
      );
    }
    assertEquals(psbt.toHex(), BITCOIN_GOLDEN[route.name]);
  });
}

/* ===== ECX: replay marker set, input order untouched ===== */

for (const route of ROUTES) {
  Deno.test(`${route.name}: CHAIN=ecx sets the replay marker before signing`, async () => {
    const bitcoinPsbt = await buildRoutePsbt(route, BITCOIN);
    const ecxPsbt = await buildRoutePsbt(route, ECX);

    assertEquals(ecxPsbt.locktime, ECX_REPLAY_LOCKTIME);
    assert(
      ecxPsbt.txInputs.some((i) => i.sequence < SEQUENCE_FINAL),
      "no non-final input",
    );

    // Same inputs in the same order (vin[0] is the ARC4 key), same outputs.
    assertEquals(
      ecxPsbt.txInputs.map((i) => `${txidOf(i.hash)}:${i.index}`),
      bitcoinPsbt.txInputs.map((i) => `${txidOf(i.hash)}:${i.index}`),
    );
    assertEquals(
      ecxPsbt.txOutputs.map((
        o,
      ) => [Buffer.from(o.script).toString("hex"), o.value]),
      bitcoinPsbt.txOutputs.map((
        o,
      ) => [Buffer.from(o.script).toString("hex"), o.value]),
    );

    // Only vin[0] may change, and only from final to RBF.
    const before = bitcoinPsbt.txInputs.map((i) => i.sequence);
    const after = ecxPsbt.txInputs.map((i) => i.sequence);
    const expected = before.every((s) => s === SEQUENCE_FINAL)
      ? [SEQUENCE_RBF, ...before.slice(1)]
      : before;
    assertEquals(after, expected);

    // Unsigned: no signatures exist yet, so a wallet can still sign it.
    assert(
      ecxPsbt.data.inputs.every((i) =>
        !i.partialSig?.length && !i.finalScriptWitness
      ),
    );
  });
}
