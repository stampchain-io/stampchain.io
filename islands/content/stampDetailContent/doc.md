/**
*
* WIP
* ===
*
* @baba
* - StampImage.tsx: still a single component branching on `stamp.stamp_mimetype`
*   (html / plain-text / audio / library-file / image / unrenderable) with a local
*   `flag` prop that toggles the "extended" detail view (shows the hover `RightPanel`
*   actions - copy link, share, share on X, download, view externally, view fullscreen,
*   view code) vs. the plain "base" render used in cards/previews. Splitting into
*   separate base/extended components is still pending.
* - StampTextContent.tsx (renders `text/plain` stamps) - plain text formatting logic
*   should probably live somewhere more shared (e.g. lib/utils or components), not
*   nested under stampDetailContent.
* - StampInfo.tsx has grown substantially (dispensers/listings table, SRC-101 detail
*   fetch, CPID copy, auto-scaling title, UserProfileIcon-based creator link) - styling
*   and layout logic (StampImage too) still needs consolidation/cleanup.
*
* Components
* ----------
* - StampImage.tsx
*   Exports: `StampImage` (named + default).
*   Props: `stamp?: StampRow`, `className?: string`, `flag?: boolean`,
*   `containerClassName?: string`.
*   `flag` enables the extended view: fixed `containerDetailImage` sizing plus the
*   hover `RightPanel` action bar (hidden for SRC-20 stamps).
*   State/refs: `loading`, `src`, `htmlContent`, `validatedContent`, `isValidating`,
*   `isPlaying` (audio playback), plus several tooltip timeout refs used by `RightPanel`.
*   Renders differently per `stamp_mimetype`: `text/html` (sandboxed, auto-scaling
*   iframe), `text/plain` (delegates to `StampTextContent`), `audio/*` (play/pause
*   overlay), css/js/gzip/json "library" files (placeholder), unrenderable/unknown
*   (`PlaceholderImage` variant `"error"`/`"no-image"`), otherwise image/SVG (SVGs
*   with external `ordinals.com`/`arweave.net` references are rewritten to internal
*   proxy routes before render).
*
* - StampTextContent.tsx (default export)
*   Props: `{ src: string | undefined }`.
*   Fetches `src` as text and renders it in a `<pre>`, auto-sizing font via a
*   `ResizeObserver` on the container (`fontSize` clamped 8px-48px based on width).
*
* - StampInfo.tsx (named export)
*   Props (`StampInfoProps`): `stamp: StampRow`, `lowestPriceDispenser: any`,
*   `btcPriceUSD?: number`, `collectionInfo?: { collection_id, collection_name,
*   collection_description } | null`.
*   Renders the title/CPID/creator header (creator via `UserProfileIcon` from
*   `$icon`), stamp type/edition pills, attribute icons (recursive, divisible,
*   keyburned, locked), an optional collection pill, file stats (`StatItem`: file
*   type, file size, dimensions, created date, tx hash), and pricing/buy UI
*   (`StatPrice`, `Button` "BUY" opening `StampBuyTool`) plus an open-dispensers
*   listings table (`StampListingsOpenTable`) when 2+ dispensers exist.
*   Fetches dispensers (`/api/v2/stamps/{cpid}/dispensers`) and SRC-101 detail
*   (`getSRC101Data`) on mount; computes pricing from v2.3 `marketData` with legacy
*   `floorPrice`/`floorPriceUSD` fallback.
*
* Last Updated: August 23, 2026
* Author: baba
*
*/
