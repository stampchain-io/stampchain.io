/* ===== STAMPING REDIRECT ROUTE ===== */
// @baba - delete this file after 2025-09-01
import { Handlers } from "$fresh/server.ts";
import { WebResponseUtil } from "$lib/utils/api/responses/webResponseUtil.ts";

/* ===== SERVER HANDLER ===== */
export const handler: Handlers = {
  GET(req) {
    const url = new URL(req.url);
    url.pathname = "/tool/stamp/create";

    return WebResponseUtil.redirect(url.toString(), 307);
  },
};

/* ===== PAGE COMPONENT ===== */
export default function StampingRedirect() {
  /* ===== RENDER ===== */
  return null;
}
