import { assertEquals, assertThrows } from "@std/assert";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { Buffer } from "node:buffer";
import {
  addSellerOffer,
  assembleCompletedSale,
  PLACEHOLDER_SATS,
  readSellerOffer,
  SALE_SIGHASH,
} from "$lib/utils/bitcoin/psbt/tradeOffer.ts";

bitcoin.initEccLib(ecc);

function signerFrom(privateKey: Uint8Array) {
  const publicKey = ecc.pointFromScalar(privateKey, true);
  if (!publicKey) throw new Error("bad key");
  return {
    publicKey,
    sign: (hash: Uint8Array) => ecc.sign(hash, privateKey),
  };
}

function key(byte: number): Uint8Array {
  const priv = new Uint8Array(32);
  priv[31] = byte;
  return priv;
}

Deno.test("sale offer locks the payment on output 1 and the stamp on input 1", () => {
  const sellerKey = signerFrom(key(1));
  const payment = bitcoin.payments.p2wpkh({
    pubkey: sellerKey.publicKey,
    network: bitcoin.networks.bitcoin,
  });
  const sellerAddress = payment.address!;
  const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
  addSellerOffer(psbt, {
    assetTxid: "ab".repeat(32),
    assetVout: 0,
    assetValue: 1000n,
    assetScript: payment.output!,
    isWitness: true,
    sellerAddress,
    salePriceSats: 50_000n,
  });

  assertEquals(psbt.inputCount, 2);
  assertEquals(psbt.txOutputs[0].value, PLACEHOLDER_SATS);
  assertEquals(psbt.txOutputs[1].value, 50_000n);
  assertEquals(psbt.data.inputs[1].sighashType, SALE_SIGHASH);

  assertThrows(
    () => readSellerOffer(psbt.toHex()),
    Error,
    "not signed",
  );

  psbt.signInput(1, sellerKey, [SALE_SIGHASH]);
  const offer = readSellerOffer(psbt.toHex());
  assertEquals(offer.salePriceSats, 50_000);
  assertEquals(offer.sellerAddress, sellerAddress);
  assertEquals(offer.assetUtxo, `${"ab".repeat(32)}:0`);
  assertEquals(offer.assetValueSats, 1000);
});

Deno.test("completed swap pays the buyer first and keeps the seller signature", () => {
  const sellerKey = signerFrom(key(2));
  const buyerKey = signerFrom(key(3));
  const network = bitcoin.networks.bitcoin;
  const seller = bitcoin.payments.p2wpkh({
    pubkey: sellerKey.publicKey,
    network,
  });
  const buyer = bitcoin.payments.p2wpkh({
    pubkey: buyerKey.publicKey,
    network,
  });
  const offer = new bitcoin.Psbt({ network });
  addSellerOffer(offer, {
    assetTxid: "cd".repeat(32),
    assetVout: 1,
    assetValue: 2000n,
    assetScript: seller.output!,
    isWitness: true,
    sellerAddress: seller.address!,
    salePriceSats: 80_000n,
  });
  offer.signInput(1, sellerKey, [SALE_SIGHASH]);
  const signedHex = offer.toHex();

  const completed = assembleCompletedSale(
    signedHex,
    {
      txid: "ef".repeat(32),
      vout: 0,
      value: 200_000,
      scriptHex: Buffer.from(buyer.output!).toString("hex"),
      isWitness: true,
    },
    buyer.address!,
    5,
    2000,
  );

  const psbt = bitcoin.Psbt.fromHex(completed.completedPsbt);
  assertEquals(psbt.txOutputs[0].address, buyer.address);
  assertEquals(psbt.txOutputs[0].value, 2000n);
  assertEquals(psbt.txOutputs[1].value, 80_000n);
  assertEquals(psbt.data.inputs[1].partialSig?.length, 1);
  assertEquals(completed.inputsToSign[0].index, 0);
  assertEquals(completed.inputsToSign[0].sighashTypes, [1]);
  assertEquals(completed.preview.assetUtxo, `${"cd".repeat(32)}:1`);
  assertEquals(completed.preview.changeSats > 0, true);

  const valid = psbt.validateSignaturesOfInput(1, (pubkey, hash, signature) =>
    ecc.verify(hash, pubkey, signature)
  );
  assertEquals(valid, true);
});

Deno.test("completed swap rejects a buyer who cannot cover the price", () => {
  const sellerKey = signerFrom(key(4));
  const network = bitcoin.networks.bitcoin;
  const seller = bitcoin.payments.p2wpkh({
    pubkey: sellerKey.publicKey,
    network,
  });
  const offer = new bitcoin.Psbt({ network });
  addSellerOffer(offer, {
    assetTxid: "aa".repeat(32),
    assetVout: 0,
    assetValue: 1000n,
    assetScript: seller.output!,
    isWitness: true,
    sellerAddress: seller.address!,
    salePriceSats: 90_000n,
  });
  offer.signInput(1, sellerKey, [SALE_SIGHASH]);

  assertThrows(
    () =>
      assembleCompletedSale(
        offer.toHex(),
        {
          txid: "bb".repeat(32),
          vout: 0,
          value: 1000,
          scriptHex: Buffer.from(seller.output!).toString("hex"),
          isWitness: true,
        },
        seller.address!,
        10,
        1000,
      ),
    Error,
    "Insufficient funds",
  );
});
