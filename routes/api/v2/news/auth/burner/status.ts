import { Handlers } from "$fresh/server.ts";
import { CommonUTXOService } from "$server/services/utxo/commonUtxoService.ts";

export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const address = url.searchParams.get("address");

      if (!address) {
        return new Response(JSON.stringify({ error: "Missing address" }), { status: 400 });
      }

      const commonUtxoService = new CommonUTXOService();
      const utxos = await commonUtxoService.getSpendableUTXOs(address, undefined, {
        confirmedOnly: false
      });

      const totalBalance = utxos.reduce((acc, curr) => acc + (curr.value || 0), 0);
      
      return new Response(JSON.stringify({
        hasutxos: utxos.length > 0,
        utxoCount: utxos.length,
        balanceSats: totalBalance
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (e: any) {
      console.error("[Burner] Failed to check status:", e.message);
      return new Response(JSON.stringify({ error: "Failed to check balance" }), { status: 500 });
    }
  }
};
