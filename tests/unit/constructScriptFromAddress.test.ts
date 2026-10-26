/**
 * Output scripts derived from addresses, used when a provider's UTXO listing
 * omits them. The bech32 cases used to produce non-hex garbage, which made
 * every native-segwit and taproot wallet look empty.
 */
import { assertEquals } from "@std/assert";
import { constructScriptFromAddress } from "$lib/utils/bitcoin/utxo/utxoUtils.ts";

Deno.test("P2WPKH (bc1q) decodes to 0014 + 20-byte program", () => {
  assertEquals(
    constructScriptFromAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"),
    "0014751e76e8199196d454941c45d1b3a323f1433bd6",
  );
});

Deno.test("P2TR (bc1p) decodes to 5120 + 32-byte program", () => {
  assertEquals(
    constructScriptFromAddress(
      "bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr",
    ),
    "5120a60869f0dbcf1dc659c9cecbaf8050135ea9e8cdc487053f1dc6880949dc684c",
  );
});

Deno.test("P2PKH and P2SH still decode", () => {
  assertEquals(
    constructScriptFromAddress("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"),
    "76a91477bff20c60e522dfaa3350c39b030a5d004e839a88ac",
  );
  assertEquals(
    constructScriptFromAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"),
    "a914b472a266d0bd89c13706a4132ccfb16f7c3b9fcb87",
  );
});

Deno.test("an invalid address gives null, not garbage", () => {
  assertEquals(constructScriptFromAddress("bc1qnotanaddress"), null);
  assertEquals(constructScriptFromAddress(""), null);
});

Deno.test("P2WSH (bc1q, 32-byte program) decodes to 0020 + program", () => {
  assertEquals(
    constructScriptFromAddress(
      "bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3",
    ),
    "00201863143c14c5166804bd19203356da136c985678cd4d27a1b8c6329604903262",
  );
});

Deno.test({
  name:
    "mempool.space's script-less UTXO listing still yields a segwit wallet's UTXOs",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const { restore, stub } = await import("@std/testing/mock");
    const { getUTXOForAddress } = await import(
      "$lib/utils/bitcoin/utxo/utxoUtils.ts"
    );
    const calls: string[] = [];
    stub(globalThis, "fetch", (input: string | URL | Request) => {
      const url = String(input instanceof Request ? input.url : input);
      calls.push(url);
      // mempool.space's /address/:a/utxo omits scriptpubkey.
      return Promise.resolve(
        new Response(
          JSON.stringify([
            {
              txid: "ab".repeat(32),
              vout: 1,
              value: 50000,
              status: { confirmed: true },
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    });
    try {
      const utxos = await getUTXOForAddress(
        "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
      ) as any[];
      assertEquals(utxos.length, 1);
      assertEquals(
        utxos[0].script,
        "0014751e76e8199196d454941c45d1b3a323f1433bd6",
      );
      assertEquals(calls.length, 1, "answered by the first provider");
    } finally {
      restore();
    }
  },
});
