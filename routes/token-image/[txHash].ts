import { Handlers } from "$fresh/server.ts";
import {
  getCdnUrl,
  stripSrc20JsonOverlay,
} from "$lib/utils/ui/media/imageUtils.ts";

const TX_HASH = /^[a-f0-9]{64}$/;

/**
 * Serves an SRC-20 stamp SVG with the deploy JSON `<pre>` removed.
 * The artwork (or gradient, when the deploy has no image) stays.
 */
export const handler: Handlers = {
  async GET(_req, ctx) {
    const txHash = (ctx.params.txHash ?? "").toLowerCase();
    if (!TX_HASH.test(txHash)) {
      return new Response(null, { status: 404 });
    }

    try {
      const upstream = await fetch(`${getCdnUrl()}/stamps/${txHash}.svg`, {
        headers: {
          "Accept": "image/svg+xml,*/*",
          "User-Agent": "stampchain.io",
        },
      });
      if (!upstream.ok) {
        return new Response(null, {
          status: upstream.status === 404 ? 404 : 502,
        });
      }

      const svg = await upstream.text();
      if (!svg.includes("<svg")) {
        return new Response(null, { status: 502 });
      }

      return new Response(stripSrc20JsonOverlay(svg), {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return new Response(null, { status: 502 });
    }
  },
};
