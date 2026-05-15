import { Handlers } from "$fresh/server.ts";
import { CounterpartyApiManager } from "$server/services/counterpartyApiService.ts";
import { GeneralBitcoinTransactionBuilder } from "$server/services/transaction/generalBitcoinTransactionBuilder.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const data = await req.json();
      const { address, text, value = -1,  satsPerVB = 50 } = data;

      if (!address || !text) {
        return new Response(JSON.stringify({ error: "Missing address or text" }), { status: 400 });
      }

      // 1. Get raw hex from Counterparty
      const hex = await CounterpartyApiManager.composeBroadcast(
        address,
        text,
        value,
        satsPerVB * 1000 // Convert sats/vB to fee_per_kb roughly for the API signature
      );

      // 2. Wrap the raw hex into a valid PSBT using stampchain's master builder
      const psbtResult = await GeneralBitcoinTransactionBuilder.generatePSBT(hex, {
        address,
        satsPerVB,
        operationType: 'generic'
      });

      return new Response(JSON.stringify({
        psbtHex: psbtResult.psbt.toHex(),
        estimatedFee: psbtResult.estMinerFee,
        inputsToSign: psbtResult.psbt.txInputs.map((_, i) => ({
          index: i,
          address: address, // In generic builders, usually the inputs belong to the source address
          sighashTypes: [1] // SIGHASH_ALL
        }))
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (e: any) {
      console.error("[API] Failed to construct broadcast:", e.message);
      return new Response(JSON.stringify({ error: e.message || "Failed to construct PSBT" }), { status: 500 });
    }
  }
};
