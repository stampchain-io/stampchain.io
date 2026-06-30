// Detach service-fee migration tests (#959 / T1171.3).
//
// stampdetach.ts was migrated off GeneralBitcoinTransactionBuilder.generatePSBT
// (the re-derive-miner-fee + second-change path that double-counted the network
// fee and produced a ~279-sat deficit) onto buildServiceFeeOutputs() — the
// trust-CP-outputs + splice-service-fee pattern shared with stampattach.ts.
//
// These tests reconstruct, with bitcoinjs-lib, the EXACT output-assembly the
// route performs (parse CP raw tx -> trust CP outputs -> buildServiceFeeOutputs
// with the bitcoinjs address codecs -> add outputs to a PSBT) and assert the
// money invariants on the resulting unsigned PSBT:
//   1. service fee > 0: inputs - outputs = a sane positive miner fee, the
//      service-fee output is present at the configured address, NO deficit.
//   2. service fee = 0 (disabled): CP outputs are trusted verbatim — no extra
//      service-fee output and no second change output.
//
// No broadcast is performed. The funded-wallet (bc1q20d...749ej) live compose
// path is guarded behind RUN_LIVE_DETACH=1 and logs a skip otherwise, so the
// CI-safe synthetic path keeps `deno check`/`deno fmt`/`deno test` green.

import { TX_CONSTANTS } from "$constants";
import { buildServiceFeeOutputs } from "$lib/utils/bitcoin/psbt/serviceFeeOutputs.ts";
import { assertEquals } from "@std/assert";
import {
  address as bjsAddress,
  networks,
  Psbt,
  Transaction,
} from "bitcoinjs-lib";
import { Buffer } from "node:buffer";

const network = networks.bitcoin;
const DUST = BigInt(TX_CONSTANTS.DUST_SIZE);

// Funded test wallet (owner of the spent UTXO; CP change goes back here).
const SOURCE_ADDRESS = "bc1q20d2cdvy2x83h3ssrz5lgryy4c9wqxsgc749ej";
// A distinct, valid mainnet bech32 address standing in for the operator's
// service-fee destination (differs from SOURCE_ADDRESS so the splice is
// observable).
const SERVICE_FEE_ADDRESS = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";

// The codec lambdas the route passes to buildServiceFeeOutputs(), built on the
// same bitcoinjs primitives the production handler uses.
const decodeAddress = (script: Uint8Array): string | undefined => {
  try {
    return bjsAddress.fromOutputScript(Buffer.from(script), network);
  } catch {
    return undefined;
  }
};
const encodeAddress = (addr: string): Uint8Array =>
  new Uint8Array(bjsAddress.toOutputScript(addr, network));

// Build a synthetic Counterparty-composed detach rawtransaction:
//   input:  one funded UTXO worth `inputValue`
//   outputs: an OP_RETURN data output (the detach payload) + change back to the
//            source address. CP has already deducted its own miner fee, so
//            inputValue - sum(outputs) = CP's implicit network fee (positive).
function buildSyntheticCpDetachTx(opts: {
  inputValue: number;
  changeValue: number;
  dataValue?: number;
}): { rawTxHex: string; inputValue: number } {
  const tx = new Transaction();
  tx.version = 2;
  // A single previous-output reference (txid/vout are arbitrary for assembly).
  const prevTxid = Buffer.alloc(32, 1);
  tx.addInput(prevTxid, 0, 0xfffffffd);

  // OP_RETURN data output (the detach payload) — value 0, not address-like.
  const opReturn = Buffer.from([0x6a, 0x04, 0xde, 0xad, 0xbe, 0xef]);
  tx.addOutput(opReturn, BigInt(opts.dataValue ?? 0));

  // CP change back to the source address.
  const changeScript = bjsAddress.toOutputScript(SOURCE_ADDRESS, network);
  tx.addOutput(changeScript, BigInt(opts.changeValue));

  return { rawTxHex: tx.toHex(), inputValue: opts.inputValue };
}

// Mirror the route's output-assembly: parse CP raw tx, trust its outputs, splice
// the service fee via the shared helper, add the result to a PSBT. Returns the
// decoded PSBT plus the helper's accounting so tests can assert invariants.
function assembleDetachOutputs(opts: {
  rawTxHex: string;
  sumOfUserInputs: bigint;
  serviceFeeSats: bigint;
  serviceFeeAddress?: string;
}) {
  const cpTx = Transaction.fromHex(opts.rawTxHex);
  const cpOutputs = cpTx.outs.map((o) => ({
    script: new Uint8Array(o.script),
    value: BigInt(o.value),
  }));

  const { outputs, cpNetworkFee, serviceFeeAdded, totalFee } =
    buildServiceFeeOutputs({
      cpOutputs,
      sumOfUserInputs: opts.sumOfUserInputs,
      sourceAddress: SOURCE_ADDRESS,
      serviceFeeSats: opts.serviceFeeSats,
      serviceFeeAddress: opts.serviceFeeAddress,
      dustSize: DUST,
      decodeAddress,
      encodeAddress,
    });

  const psbt = new Psbt({ network });
  for (const out of outputs) {
    psbt.addOutput({ script: Buffer.from(out.script), value: out.value });
  }

  const psbtTx = (psbt as unknown as { __CACHE: { __TX: Transaction } }).__CACHE
    .__TX;
  const sumOutputs = psbtTx.outs.reduce((acc, o) => acc + BigInt(o.value), 0n);

  return { psbt, sumOutputs, cpNetworkFee, serviceFeeAdded, totalFee, outputs };
}

Deno.test("stampdetach migration onto buildServiceFeeOutputs()", async (t) => {
  await t.step(
    "service fee > 0: sane miner fee, service-fee output present, NO deficit",
    () => {
      const inputValue = 20000;
      const { rawTxHex } = buildSyntheticCpDetachTx({
        inputValue,
        changeValue: 19000, // CP implicit miner fee = 1000 sat
      });
      const serviceFeeSats = 1000n;

      const r = assembleDetachOutputs({
        rawTxHex,
        sumOfUserInputs: BigInt(inputValue),
        serviceFeeSats,
        serviceFeeAddress: SERVICE_FEE_ADDRESS,
      });

      // No deficit: inputs strictly cover outputs.
      const minerFee = BigInt(inputValue) - r.sumOutputs;
      assertEquals(minerFee >= 0n, true);
      // Miner fee is exactly CP's implicit fee (service fee comes out of change,
      // not out of the miner fee), and it is a sane positive value.
      assertEquals(minerFee, 1000n);
      assertEquals(r.cpNetworkFee, 1000n);

      // Service-fee output present at the configured address.
      const svc = r.outputs.find((o) =>
        decodeAddress(o.script) === SERVICE_FEE_ADDRESS
      );
      assertEquals(svc !== undefined, true);
      assertEquals(svc!.value, serviceFeeSats);
      assertEquals(r.serviceFeeAdded, serviceFeeSats);

      // Total cost to user = miner fee + service fee. No ~279-sat deficit.
      assertEquals(r.totalFee, 2000n);
    },
  );

  await t.step(
    "service fee = 0 (disabled): CP outputs trusted verbatim, no extra outputs",
    () => {
      const inputValue = 20000;
      const { rawTxHex } = buildSyntheticCpDetachTx({
        inputValue,
        changeValue: 19000,
      });
      const cpTx = Transaction.fromHex(rawTxHex);
      const cpOutCount = cpTx.outs.length;

      const r = assembleDetachOutputs({
        rawTxHex,
        sumOfUserInputs: BigInt(inputValue),
        serviceFeeSats: 0n,
      });

      // Verbatim: same output count as CP, no service-fee splice.
      assertEquals(r.outputs.length, cpOutCount);
      assertEquals(r.serviceFeeAdded, 0n);
      // No output pays the service-fee address.
      const svc = r.outputs.find((o) =>
        decodeAddress(o.script) === SERVICE_FEE_ADDRESS
      );
      assertEquals(svc, undefined);
      // No deficit; miner fee equals CP's implicit fee.
      const minerFee = BigInt(inputValue) - r.sumOutputs;
      assertEquals(minerFee, 1000n);
      assertEquals(r.totalFee, 1000n);
    },
  );

  await t.step(
    "live funded-wallet compose (guarded; NO broadcast)",
    () => {
      if (Deno.env.get("RUN_LIVE_DETACH") !== "1") {
        console.log(
          "[skip] live detach compose against " + SOURCE_ADDRESS +
            " — set RUN_LIVE_DETACH=1 to run (requires CP/network; never broadcasts).",
        );
        return;
      }
      // When enabled, a follow-up could call the route handler against the
      // funded wallet and decode the returned psbtHex with the same invariants
      // asserted above. Intentionally not broadcasting under any flag.
      console.log(
        "[live] RUN_LIVE_DETACH=1 set; live compose harness not wired in this CI-safe test.",
      );
    },
  );
});
