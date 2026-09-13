/* ===== PER-ROUTE PAGE METADATA ===== */
/**
 * Single source of truth for `<title>` and `<meta name="description">`.
 *
 * Before this existed, `MetaTags` defaulted `title` to "Bitcoin Stamps" and
 * `_app.tsx` never passed one, so all 41 routes shipped the same title. Only
 * `/stamp/[id]` escaped, and only because a route-level `<Head>` renders
 * BEFORE `_app`'s — which also meant those pages emitted two `<title>` tags.
 *
 * Rules enforced by `tests/unit/utils/pageMetadata.test.ts`:
 *   - title       <= 60 chars (Google truncates around here)
 *   - description <= 155 chars
 *   - both unique across every static entry
 *
 * Copy is grounded in what each page actually renders and in real Search
 * Console demand for `sc-domain:stampchain.io`. Do not add claims about the
 * protocol that the page itself does not make.
 */

export interface PageMetadata {
  title: string;
  description: string;
}

export const SITE_NAME = "Stampchain";

export const DEFAULT_METADATA: PageMetadata = {
  title: "Bitcoin Stamps: Unprunable UTXO Art | Stampchain",
  description:
    "Browse, buy and create Bitcoin Stamps: art written straight into Bitcoin UTXOs, plus SRC-20 tokens, curated collections and a live explorer.",
};

/**
 * Returned for any path that matches nothing. Fresh renders `routes/_404.tsx`
 * inside `_app.tsx`, so without a distinct entry here every 404 would claim the
 * home page's title and description.
 */
export const NOT_FOUND_METADATA: PageMetadata = {
  title: "Page Not Found | Stampchain",
  description:
    "This page isn't on stampchain.io. Try the marketplace, the explorer, or the SRC-20 token list to find the stamp or ticker you were after.",
};

/* ===== STATIC ROUTES ===== */
/**
 * Keyed by exact pathname (no trailing slash). Covers all 24 URLs in
 * `routes/sitemap.xml.ts` plus `/howto/buy`, which carries 119 impressions and
 * zero clicks in Search Console despite being absent from the sitemap.
 */
export const STATIC_PAGE_METADATA: Record<string, PageMetadata> = {
  "/": DEFAULT_METADATA,

  "/marketplace": {
    title: "Buy Bitcoin Stamps | Stamp Marketplace",
    description:
      "Every Bitcoin Stamp currently listed, priced in BTC and USD. Filter by classic, posh, recursive or cursed, and see what has actually been selling.",
  },

  "/src20": {
    title: "SRC-20 Tokens: Prices, Holders and Open Mints",
    description:
      "Live price, 24h change, volume, market cap and holder count for every SRC-20 token on Bitcoin, plus which tickers are still open to mint.",
  },

  "/collection": {
    title: "Bitcoin Stamps Collections | Browse Series",
    description:
      "Curated Bitcoin Stamps collections from KEVIN to STAMPEPES, each with its stamp count, holder count and lowest listed price.",
  },

  "/explorer": {
    title: "Bitcoin Stamps Explorer | Stamps and SRC-20",
    description:
      "Search every stamp issuance and SRC-20 transfer on Bitcoin. Filter to stamps or tokens and follow activity by address, ticker or stamp number.",
  },

  "/block": {
    title: "Bitcoin Stamps by Block | Block Explorer",
    description:
      "Stamp issuances and SRC-20 operations in each Bitcoin block, alongside current fee rates, average block time and the latest blocks as they confirm.",
  },

  "/about": {
    title: "About Stampchain | Who Built Bitcoin Stamps",
    description:
      "Mike In Space conceived the Bitcoin Stamps meta-protocol. Arwyn and Reinamora built it out. Meet the founders, and the dev fund behind Stampchain.",
  },

  "/faq": {
    title: "Bitcoin Stamps FAQ: Types, Wallets, Trading",
    description:
      "What Bitcoin Stamps are, how Classic, SRC-20, SRC-721 and OLGA differ, which wallets work, what file sizes fit, and how stamps compare to Ordinals.",
  },

  "/docs": {
    title: "Stampchain API Docs | Bitcoin Stamps REST API",
    description:
      "Reference for the Stampchain v2 API. Endpoints for stamps, SRC-20 balances, collections, blocks and addresses, with v2.2 and v2.3 request schemas.",
  },

  "/howto": {
    title: "Bitcoin Stamps How-To Guides | Step by Step",
    description:
      "Guides for Bitcoin Stamps: set up a Leather wallet, connect it, buy your first stamp, stamp your own art, and deploy or mint an SRC-20 token.",
  },

  "/howto/buy": {
    title: "How to Buy a Bitcoin Stamp | Step by Step",
    description:
      "Buy a stamp from a dispenser. Connect a wallet, fund it with BTC, pick a listing on the marketplace, then send the exact amount the dispenser expects.",
  },

  "/howto/stamp": {
    title: "How to Stamp Your Art on Bitcoin",
    description:
      "Write an image straight into Bitcoin. Connect a wallet, open the create tool, upload your art, choose editions and a name, set the fee and broadcast.",
  },

  "/howto/sendstamp": {
    title: "How to Send a Bitcoin Stamp to Another Wallet",
    description:
      "Transfer a stamp you own. Open the send tool under Tools, choose the stamp, enter the destination address, set your fee and sign in your wallet.",
  },

  "/howto/deploytoken": {
    title: "How to Deploy an SRC-20 Token on Bitcoin",
    description:
      "Deploy your own SRC-20 ticker. Pick a name of 5 characters or fewer, set supply, decimals and mint limit, upload 420x420 art, then sign and broadcast.",
  },

  "/howto/minttoken": {
    title: "How to Mint an SRC-20 Token | Bitcoin Stamps",
    description:
      "Mint an SRC-20 ticker that is still open. Open the mint tool, choose the token and amount, set your fee, then confirm the transaction in your wallet.",
  },

  "/howto/transfertoken": {
    title: "How to Transfer SRC-20 Tokens",
    description:
      "Send SRC-20 tokens to another Bitcoin address. Open the transfer tool, choose the ticker and amount, set your fee and sign the transaction.",
  },

  "/howto/leatherconnect": {
    title: "Connect a Bitcoin Stamps Wallet to Stampchain",
    description:
      "Leather, Unisat, OKX, TapWallet, Phantom and Horizon all connect to stampchain.io. This walkthrough uses Leather, from Connect through wallet approval.",
  },

  "/howto/leathercreate": {
    title: "Create a Leather Wallet for Bitcoin Stamps",
    description:
      "Install the Leather extension in Chrome or Brave, create a wallet and back up the secret key. Start here if you are new to Bitcoin Stamps.",
  },

  "/howto/transferbitname": {
    title: "How to Transfer a Bitname | Bitcoin Stamps",
    description:
      "Moving a bitname to another Bitcoin address. This guide is still being written, and the transfer option has not landed in the Tools menu yet.",
  },

  "/tool/stamp/create": {
    title: "Create a Bitcoin Stamp | Stamping Tool",
    description:
      "Stamp artwork into Bitcoin. Upload a file, set the edition count, choose a custom CPID or posh name, lock the supply and tune the fee before signing.",
  },

  "/tool/fairmint": {
    title: "Fairmint Counterparty Assets | Stampchain",
    description:
      "Fairmint an open Counterparty asset. Pick a fairminter or enter an asset name, set the quantity, check the estimated fee and sign in your wallet.",
  },

  "/media": {
    title: "Bitcoin Stamps in the Media | Press and Video",
    description:
      "Interviews with Mike In Space, news coverage and research on Bitcoin Stamps, including the SQRR deep dive and podcast appearances on Rice TVX.",
  },

  "/presskit": {
    title: "Bitcoin Stamps Press Kit | Logos and Colors",
    description:
      "Brand assets for the Bitcoin Stamps protocol and Stampchain: logos in SVG and PNG, colour palettes, typefaces and the stamp and SRC-20 icon set.",
  },

  "/upload": {
    title: "Upload SRC-20 Token Artwork | Stampchain",
    description:
      "Add or replace the image shown for an SRC-20 ticker, alongside the deployed token list with creator, block, max supply, mint limit and decimals.",
  },

  "/termsofservice": {
    title: "Terms of Service | Stampchain",
    description:
      "The legal terms covering use of stampchain.io, its stamping and token tools, and its API. Last updated 11 September 2024.",
  },
};

/* ===== DYNAMIC PREFIX RULES ===== */
/**
 * Routes outside the static map get a derived title rather than falling back
 * to the bare site name. Ordered longest-prefix-first; the first match wins.
 */
const PREFIX_RULES: Array<{
  prefix: string;
  build: (rest: string) => PageMetadata;
}> = [
  {
    prefix: "/tool/stamp/",
    build: (rest) => ({
      title: `${humanize(rest)} Stamps | Stampchain Tools`,
      description: `${
        humanize(rest)
      } Bitcoin Stamps from your own wallet. Set the details, review the fee estimate and sign the transaction on stampchain.io.`,
    }),
  },
  {
    prefix: "/tool/src20/",
    build: (rest) => ({
      title: `${humanize(rest)} SRC-20 Tokens | Stampchain Tools`,
      description: `${
        humanize(rest)
      } an SRC-20 token on Bitcoin. Fill in the ticker details, review the fee estimate and sign the transaction in your wallet.`,
    }),
  },
  {
    prefix: "/tool/src101/",
    build: (rest) => ({
      title: `${humanize(rest)} a Bitname | Stampchain Tools`,
      description: `${
        humanize(rest)
      } an SRC-101 bitname on Bitcoin. Fill in the details, review the fee estimate and sign the transaction in your wallet.`,
    }),
  },
  {
    prefix: "/howto/",
    build: (rest) => ({
      title: `${humanize(rest)} | Bitcoin Stamps How-To`,
      description: `Step-by-step guide to ${
        humanize(rest).toLowerCase()
      } on stampchain.io, with the wallet setup and fee settings each step needs.`,
    }),
  },
  {
    prefix: "/collection/",
    build: (rest) => ({
      title: `${humanize(rest)} Collection | Bitcoin Stamps`,
      description: `Every stamp in the ${
        humanize(rest)
      } collection on Bitcoin, with edition counts, holders and the lowest listed price for each piece.`,
    }),
  },
  {
    prefix: "/src20/",
    build: (rest) => ({
      title: `${rest.toUpperCase()} SRC-20 Token | Price and Holders`,
      description:
        `Live price, supply, mint progress, holder count and transfer history for the ${rest.toUpperCase()} SRC-20 token on Bitcoin.`,
    }),
  },
  {
    prefix: "/block/",
    build: (rest) => ({
      title: `Bitcoin Block ${rest} | Stamps and SRC-20`,
      description:
        `Stamp issuances and SRC-20 operations confirmed in Bitcoin block ${rest}, with the transactions and neighbouring blocks around it.`,
    }),
  },
  {
    prefix: "/stamp/",
    build: (rest) => ({
      title: `Bitcoin Stamp ${rest} | Stampchain`,
      description:
        `Bitcoin Stamp ${rest}: the artwork, its editions and holders, the dispensers offering it, and every transfer recorded against it on-chain.`,
    }),
  },
  {
    prefix: "/wallet/",
    build: (rest) => ({
      title: addressTitle(rest, "Stamps Wallet", "Bitcoin Stamps Wallet"),
      description:
        `Stamps, SRC-20 balances and BTC held by ${rest}, plus everything this address has created, listed or sold on Bitcoin.`,
    }),
  },
  {
    prefix: "/dashboard/",
    build: (rest) => ({
      title: addressTitle(rest, "Dashboard", "Wallet Dashboard"),
      description:
        `Manage the stamps and SRC-20 tokens held by ${rest}: balances, open listings and the transfers this address has signed.`,
    }),
  },
];

/* ===== EXACT NON-SITEMAP ROUTES ===== */
const EXTRA_STATIC: Record<string, PageMetadata> = {
  "/stamp": {
    title: "All Bitcoin Stamps | Browse Every Stamp",
    description:
      "Every stamp issued on Bitcoin, newest first. Filter by type, sort by stamp number or price, and open any piece for its full on-chain history.",
  },
  "/tool/stamp/stamping": {
    title: "Stamping Machine | Create Bitcoin Stamps",
    description:
      "Stamp art into Bitcoin with custom CPID or posh naming. Upload a file, set editions, adjust the fee and sign the transaction in your wallet.",
  },
  "/tool/stamp/trade": {
    title: "Trade Bitcoin Stamps | Dispensers and Offers",
    description:
      "Open or take a stamp dispenser on Bitcoin. Set the price and quantity, review the fee estimate and sign the transaction in your wallet.",
  },
};

/* ===== HELPERS ===== */
function humanize(segment: string): string {
  const cleaned = segment.replace(/\/+$/, "").split("/")[0].replace(
    /[-_]+/g,
    " ",
  );
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Address pages carry the site's single biggest query by impressions: people
 * paste a raw address into Google. In Search Console for sc-domain:stampchain.io
 * one address alone draws 522 impressions against 16 clicks, and four more
 * addresses sit in the top 25. So put the whole address in the title whenever it
 * fits inside 60 characters, because a truncated one cannot match that query.
 *
 * Taproot addresses run 62 characters and blow the budget on their own. Those
 * fall back to the shortened form, which still reads as a wallet page.
 */
function addressTitle(
  raw: string,
  suffix: string,
  fallbackPrefix: string,
): string {
  const clean = raw.replace(/\/+$/, "").split("/")[0];
  const full = `${clean} | ${suffix}`;
  if (full.length <= MAX_TITLE_LENGTH) return full;
  return `${fallbackPrefix} ${truncateAddress(clean)}`;
}

function truncateAddress(address: string): string {
  const clean = address.replace(/\/+$/, "").split("/")[0];
  if (clean.length <= 14) return clean;
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

export const MAX_TITLE_LENGTH = 60;
export const MAX_DESCRIPTION_LENGTH = 155;

/**
 * Guard rail for derived metadata only. A long collection slug or asset name
 * could otherwise push a generated title past what Google renders. Hand-written
 * entries never reach this — the unit test fails the build if one is too long.
 */
function clamp(meta: PageMetadata): PageMetadata {
  return {
    title: truncateAt(meta.title, MAX_TITLE_LENGTH),
    description: truncateAt(meta.description, MAX_DESCRIPTION_LENGTH),
  };
}

function truncateAt(value: string, limit: number): string {
  if (value.length <= limit) return value;
  const cut = value.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${
    (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()
  }…`;
}

function normalize(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

/* ===== PUBLIC API ===== */
/**
 * Resolve metadata for a pathname. Exact static entry wins, then the extra
 * static list, then the longest matching prefix rule, then the not-found entry.
 */
export function getPageMetadata(pathname: string): PageMetadata {
  const path = normalize(pathname);

  const exact = STATIC_PAGE_METADATA[path] ?? EXTRA_STATIC[path];
  if (exact) return exact;

  for (const rule of PREFIX_RULES) {
    if (path.startsWith(rule.prefix)) {
      const rest = path.slice(rule.prefix.length);
      if (rest) return clamp(rule.build(rest));
    }
  }

  return NOT_FOUND_METADATA;
}
