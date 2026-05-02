import { Handlers } from "$fresh/server.ts";
import { getChallenge, clearChallenge, createSession } from "$server/services/news/auth.ts";
import { verifySignature } from "$lib/utils/security/cryptoUtils.ts";
import { setCookie } from "@std/http/cookie";

export const handler: Handlers = {
  async POST(req) {
    try {
      const { address, signature } = await req.json();
      if (!address || !signature) {
        return new Response(JSON.stringify({ error: "Missing address or signature" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const nonce = getChallenge(address);
      if (!nonce) {
        return new Response(JSON.stringify({ error: "Challenge expired or invalid" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const messageToSign = `Sign this message to authenticate with Stamp News Network.\n\nNonce: ${nonce}`;
      const isValid = verifySignature(messageToSign, signature, address);

      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      clearChallenge(address);
      const sessionId = createSession(address);

      const response = new Response(JSON.stringify({ success: true, address }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

      setCookie(response.headers, {
        name: "snn_session",
        value: sessionId,
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/", // Changed to / so it applies globally for profile
        httpOnly: true,
        secure: req.url.startsWith("https://"),
        sameSite: "Lax",
      });

      return response;
    } catch (_e) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
