import { Handlers } from "$fresh/server.ts";
import {
  getCdnUrl,
  stripSrc20JsonOverlay,
} from "$lib/utils/ui/media/imageUtils.ts";

import { isSrc20StampTx } from "$server/database/src20StampLookup.ts";

const TX_HASH = /^[a-f0-9]{64}$/;
const UPSTREAM_TIMEOUT_MS = 5000;

/**
 * This route serves third-party SVG from the main, wallet-connected origin,
 * so the response is locked down whatever the SVG contains: a sandbox CSP (no
 * script, no network, inline styles and data: images only, which is all the
 * deploy art needs), and only SRC-20 stamps, whose SVG the indexer renders.
 * Any other stamp hash gets a 404 instead of the uploader's SVG.
 */
const SVG_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Content-Security-Policy":
    "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:",
  "X-Content-Type-Options": "nosniff",
  // A day, not a year: a cached copy must not outlive a fix.
  "Cache-Control": "public, max-age=86400",
};

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
      if (!(await isSrc20StampTx(txHash))) {
        return new Response(null, { status: 404 });
      }
      const upstream = await fetch(`${getCdnUrl()}/stamps/${txHash}.svg`, {
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
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
        headers: SVG_HEADERS,
      });
    } catch {
      return new Response(null, { status: 502 });
    }
  },
};
