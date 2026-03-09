# STAMPYSWAP Swap Route Handoff

## Summary

This repo now hosts the current STAMPYSWAP trading app as a standalone route at `/swap`.
The integration is intentionally thin: Stampchain serves the page shell and static bundle, while the STAMPYSWAP app keeps its existing trading internals, wallet flows, and transaction UX intact.

## What Is Included

- Dedicated hosted route at `/swap`
- Co-branded page shell for `Stampchain x STAMPYSWAP`
- Static vendored frontend bundle under `static/swap-assets/`
- Tool navigation entry pointing users to `/swap`
- Support for the existing signing model inside the hosted bundle:
  - Leather direct signing
  - Xverse direct signing
  - Watch-only mode with Freewallet QR signing
- Testnet-aware explorer behavior, scanners, portfolio flow, batch listing flow, order history, and transaction center from the bundled app

## Integration Shape

- Fresh route shell:
  - `routes/swap/index.ts`
  - `routes/swap/[...path].ts`
- HTML builder:
  - `server/services/hostedSwapPageService.ts`
- Static assets:
  - `static/swap-assets/stampyswap-Bx3jizHT.css`
  - `static/swap-assets/stampyswap-CVc6wmfI.js`

The page shell configures the hosted app through `data-*` attributes on `#root`, which the bundled STAMPYSWAP host layer reads at boot time.

## External Dependencies Used By The Hosted App

- Counterparty API endpoints used by the STAMPYSWAP bundle
- Stampchain metadata endpoints and icon metadata
- Leather browser wallet
- Xverse browser wallet
- Freewallet QR signing flow
- Mempool / Blockstream / XChain explorer links used by the bundle

No Stampchain API contract changes were required for this route.

## Deployment Notes

- The `/swap` HTML shell is served with no-store caching to avoid stale shell issues.
- The hosted bundle is vendored into `static/swap-assets/` and should be updated together with the shell when STAMPYSWAP source changes.
- The current implementation favors fast adoption over deep framework integration. It does not port STAMPYSWAP source into Fresh islands.

## Manual Validation Before Production Deploy

- Leather direct-sign flow inside `/swap`
- Xverse direct-sign flow inside `/swap`
- Watch-only + Freewallet QR signing flow
- Mainnet and testnet explorer links from the transaction surfaces
- Portfolio selection and batch listing flow
- Order history and transaction drawer behavior
- Mobile usability inside the real Stampchain site shell and browser chrome

## Known Limitations

- The route currently vendors the built STAMPYSWAP bundle rather than importing source modules directly into the Fresh app.
- Stampchain-specific analytics hooks are not wired yet; the host seam supports them, but this route does not register a production analytics callback.
- Long-term maintainability would improve if the hosted bundle were refreshed from a tagged upstream source commit or ported into native Fresh components later.
