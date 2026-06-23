## Summary

This PR adds `Stampchain x STAMPYSWAP` as a dedicated hosted route at `/swap`.
It integrates the full STAMPYSWAP trading experience into the Stampchain repo without rewriting the trading logic into Fresh components.

## What This Includes

- standalone `/swap` route served by the Stampchain app
- co-branded hosted page shell
- vendored STAMPYSWAP frontend bundle under `static/swap-assets/`
- tool navigation entry linking to `/swap`
- repo-local handoff note in `docs/stampyswap-swap-route-handoff.md`

## What Was Intentionally Left Unchanged

- no Counterparty protocol changes
- no Stampchain API contract changes
- no change to the existing STAMPYSWAP wallet model:
  - Leather direct signing
  - Xverse direct signing
  - watch-only + Freewallet QR signing

## Manual Validation Required Before Deploy

- Leather direct-sign flow
- Xverse direct-sign flow
- watch-only + QR flow
- mainnet/testnet explorer behavior
- mobile layout under real Stampchain site navigation

## Notes

- This is a thin-hosting integration for fast adoption.
- The hosted route vendors the built STAMPYSWAP bundle instead of porting the app source into Fresh islands.
- Follow-up work can port the feature deeper into the Stampchain design system once the hosted route is accepted and validated.
