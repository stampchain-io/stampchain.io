import { Handlers } from "$fresh/server.ts";
import * as bitcoin from "npm:bitcoinjs-lib";
import ECPairFactory from "npm:ecpair";
import * as ecc from "npm:tiny-secp256k1";

const ECPair = ECPairFactory(ecc);

export const handler: Handlers = {
  GET() {
    try {
      const keyPair = ECPair.makeRandom();
      const { address } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.bitcoin });
      
      const wif = keyPair.toWIF();
      
      return new Response(JSON.stringify({
        address,
        wif,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (e: any) {
      console.error("[Burner] Failed to generate burner wallet:", e.message);
      return new Response(JSON.stringify({ error: "Failed to generate burner wallet" }), { status: 500 });
    }
  }
};
