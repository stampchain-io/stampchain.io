/* ===== CREATE INDEX REDIRECT ROUTE ===== */
import { Handlers } from "$fresh/server.ts";
import { WebResponseUtil } from "$lib/utils/api/responses/webResponseUtil.ts";

/* ===== SERVER HANDLER ===== */
export const handler: Handlers = {
  GET(req) {
    const url = new URL(req.url);
    url.pathname = "/create/classic";

    // 307 (not 308) so the default create type can change later
    return WebResponseUtil.redirect(url.toString(), 307);
  },
};

/* ===== PAGE COMPONENT ===== */
export default function CreateIndexRedirect() {
  return null;
}
