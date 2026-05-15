import { Handlers } from "$fresh/server.ts";
import { destroySession } from "$server/services/news/auth.ts";
import { deleteCookie, getCookies } from "@std/http/cookie";

export const handler: Handlers = {
  POST(req) {
    const cookies = getCookies(req.headers);
    const sessionId = cookies.snn_session;

    if (sessionId) {
      destroySession(sessionId);
    }

    const response = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    deleteCookie(response.headers, "snn_session", {
        path: "/",
        domain: new URL(req.url).hostname,
    });

    return response;
  },
};
