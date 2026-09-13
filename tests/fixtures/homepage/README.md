# Homepage response fixtures

Two real production responses from `https://stampchain.io/`, captured on
2026-09-13 and stored gzipped. They are the evidence that
`scripts/monitoring/check-homepage-content.ts` is not a vacuous guard.

| File | Captured | Size (raw) | Stamp permalinks | State |
|------|----------|-----------|------------------|-------|
| `broken-empty-state.html.gz` | 08:28 UTC, before #1255 deployed | 140,120 bytes | 0 | The outage. `DATA_PLACEHOLDER_PROD_HOME` served with **HTTP 200**. |
| `healthy.html.gz` | 08:36 UTC, after #1255 deployed | 312,725 bytes | 16 | Normal. |

The broken capture is the actual response that every visitor received for two
days from 2026-09-11, not a synthetic one. `routes/index.tsx` caught a
`TypeError: Cannot mix BigInt and other types` and returned the placeholder
with a 200 status, so nothing alerted.

`tests/unit/homepageContentMonitor.test.ts` asserts that the monitor **fails**
on the broken capture and **passes** on the healthy one. A monitor that passes
a planted regression is worse than no monitor, because it converts unknown risk
into false confidence — so that test is the point, not a nicety.

Inspect one with:

```
gunzip -c tests/fixtures/homepage/broken-empty-state.html.gz | less
```

Do not regenerate these casually. Their value is that they are unmodified
captures of a real incident.
