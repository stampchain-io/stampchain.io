import { Handlers } from "$fresh/server.ts";
import { generateChallenge } from "$server/services/news/auth.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      const { address } = await req.json();
      if (!address) {
        return new Response(JSON.stringify({ error: "Missing address" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const nonce = generateChallenge(address);
      const messageToSign = `Sign this message to authenticate with Stamp News Network.\n\nNonce: ${nonce}`;

      return new Response(JSON.stringify({ message: messageToSign, nonce }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (_e) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
