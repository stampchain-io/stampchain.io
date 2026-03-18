import type { MetaTagsProps } from "$types/ui.d.ts";

const OPENGRAPH_IMAGE =
  "https://stampchain.io/img/logo/stampchain-logo-opengraph.jpg";

export function MetaTags({
  title = "Bitcoin Stamps",
  description = "Unprunable UTXO Art, Because Sats Don't Exist",
  image = OPENGRAPH_IMAGE,
  skipImage = false,
  skipTitle = false,
  skipDescription = false,
  skipOgMeta = false,
  canonicalUrl,
  ogUrl,
}: MetaTagsProps) {
  const resolvedCanonical = canonicalUrl || "https://stampchain.io";
  const resolvedOgUrl = ogUrl || resolvedCanonical;

  return (
    <>
      {/* Essential meta tags */}
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="keywords"
        content="Bitcoin Stamps, SRC-20, SRC-721, UTXO Art, Bitcoin NFT, block explorer, on-chain art, unprunable, stampchain"
      />
      <meta name="author" content="stampchain.io" />
      <meta name="robots" content="index, follow" />

      {/* Icons */}
      {
        /*
        Order matters for Chrome: ICO must come first with sizes="48x48" so
        Chrome ignores it (doesn't request that size) and falls through to the
        SVG. Without this Chrome picks up the ICO and never loads the SVG.
        See: https://spacejelly.dev/posts/light-dark-mode-favicons
      */
      }
      <link rel="icon" href="/img/logo/favicon/favicon.ico" sizes="48x48" />
      <link
        rel="icon"
        type="image/svg+xml"
        sizes="any"
        href="/img/logo/favicon/favicon.svg"
      />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/img/logo/favicon/apple-touch-icon.png"
      />
      <meta name="apple-mobile-web-app-title" content="Stampchain" />
      <link rel="manifest" href="/img/logo/favicon/site.webmanifest" />
      {
        /* Force-refresh SVG favicon on theme change — Chrome caches the favicon
          and won't re-evaluate its media queries without a new href. */
      }
      <script
        dangerouslySetInnerHTML={{
          __html: `(function() {
  var SVG_BASE = '/img/logo/favicon/favicon.svg';
  var mq = window.matchMedia('(prefers-color-scheme: dark)');

  function refreshFavicon() {
    var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var link = document.querySelector('link[type="image/svg+xml"]');
    if (link) {
      link.setAttribute('href', SVG_BASE + '?scheme=' + (isDark ? 'dark' : 'light') + '&t=' + Date.now());
    }
  }

  mq.addEventListener('change', refreshFavicon);
})();`,
        }}
      />
      <link rel="canonical" href={resolvedCanonical} />

      {/* Machine-readable alternate content */}
      <link
        rel="alternate"
        type="text/plain"
        href="https://stampchain.io/llms.txt"
        title="LLM-readable site summary"
      />

      {/* OpenGraph tags */}
      {!skipTitle && (
        <meta
          property="og:title"
          content={title}
          key="og-title"
        />
      )}
      {!skipDescription && (
        <meta
          property="og:description"
          content={description}
          key="og-description"
        />
      )}
      {/* Conditionally add og:image - skip if page has its own */}
      {!skipImage && (
        <>
          <meta property="og:image" content={image} key="og:image" />
          <meta
            property="og:image:type"
            content={getImageType(image)}
            key="og:image:type"
          />
          <meta property="og:image:width" content="1200" key="og:image:width" />
          <meta
            property="og:image:height"
            content="630"
            key="og:image:height"
          />
          <meta
            property="og:image:alt"
            content="stampchain.io — Bitcoin Stamps block explorer"
            key="og:image:alt"
          />
        </>
      )}
      {!skipOgMeta && (
        <>
          <meta property="og:type" content="website" key="og-type" />
          <meta
            property="og:url"
            content={resolvedOgUrl}
            key="og-url"
          />
          <meta property="og:locale" content="en_US" key="og-locale" />
          <meta
            property="og:site_name"
            content="stampchain.io"
            key="og-site-name"
          />
        </>
      )}

      {/* Twitter Card tags */}
      {!skipOgMeta && (
        <>
          <meta
            name="twitter:card"
            content="summary_large_image"
            key="twitter-card"
          />
          <meta
            name="twitter:site"
            content="@stampchain"
            key="twitter-site"
          />
        </>
      )}
      {!skipTitle && (
        <meta
          name="twitter:title"
          content={title}
          key="twitter-title"
        />
      )}
      {/* Conditionally add twitter:image - skip if page has its own */}
      {!skipImage && (
        <meta name="twitter:image" content={image} key="twitter:image" />
      )}
      {!skipDescription && (
        <meta
          name="twitter:description"
          content={description}
          key="twitter-description"
        />
      )}

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "stampchain.io",
            "url": "https://stampchain.io",
            "description":
              "Official Bitcoin Stamps block explorer and API. Search stamps, SRC-20 tokens, blocks, and transactions on the Bitcoin blockchain.",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://stampchain.io/stamp/{search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Stampchain",
            "url": "https://stampchain.io",
            "logo":
              "https://stampchain.io/img/logo/stampchain-logo-monotone-black.svg",
            "sameAs": [
              "https://x.com/ArmandDLV",
              "https://github.com/stampchain-io",
            ],
          }),
        }}
      />
    </>
  );
}

// Helper function to set the correct MIME type for OpenGraph
function getImageType(image: string) {
  if (image.endsWith(".jpg") || image.endsWith(".jpeg")) return "image/jpeg";
  if (image.endsWith(".png")) return "image/png";
  if (image.endsWith(".gif")) return "image/gif";
  if (image.endsWith(".svg")) return "image/svg+xml";
  return "image/png"; // Default
}
