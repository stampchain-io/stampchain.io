import { Handlers } from "$fresh/server.ts";
import * as bitcoin from "npm:bitcoinjs-lib";
import ECPairFactory from "npm:ecpair";
import * as ecc from "npm:tiny-secp256k1";
import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import { GeneralBitcoinTransactionBuilder } from "$server/services/transaction/generalBitcoinTransactionBuilder.ts";

const ECPair = ECPairFactory(ecc);

export const handler: Handlers = {
  async POST(req) {
    try {
      const data = await req.json();
      const { wif, text, satsPerVB = 20 } = data;

      if (!wif || !text) {
        return new Response(JSON.stringify({ error: "Missing wif or text" }), { status: 400 });
      }

      // 1. Recover Burner Wallet Address
      const keyPair = ECPair.fromWIF(wif);
      const { address } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.bitcoin });
      if (!address) throw new Error("Could not derive address from WIF");

      // 2. Compose raw Counterparty broadcast hex
      const hex = await CounterpartyApiManager.composeBroadcast(
        address,
        text,
        -1,
        satsPerVB * 1000
      );

      // 3. Build PSBT wrapping the broadcast
      const psbtResult = await GeneralBitcoinTransactionBuilder.generatePSBT(hex, {
        address,
        satsPerVB,
        operationType: 'generic'
      });

      // 4. Sign PSBT entirely server-side because we hold the burner WIF
      psbtResult.psbt.signAllInputs(keyPair);
      psbtResult.psbt.finalizeAllInputs();
      
      const txHex = psbtResult.psbt.extractTransaction().toHex();

      // 5. Broadcast to Mempool API natively
      const broadcastRes = await fetch("https://mempool.space/api/tx", {
        method: "POST",
        body: txHex,
      });

      if (!broadcastRes.ok) {
        const errorText = await broadcastRes.text();
        throw new Error(`Broadcast failed: ${errorText}`);
      }

      const txid = await broadcastRes.text();

      return new Response(JSON.stringify({
        success: true,
        txid: txid.trim(),
        burnedAddress: address
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (e: any) {
      console.error("[Burner Publish] Failed to publish:", e.message);
      return new Response(JSON.stringify({ error: e.message || "Failed to publish burner transaction" }), { status: 500 });
    }
  }
};
