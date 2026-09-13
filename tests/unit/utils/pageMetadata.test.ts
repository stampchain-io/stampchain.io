import { assert, assertEquals, assertNotEquals } from "@std/assert";
import {
  DEFAULT_METADATA,
  getPageMetadata,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  NOT_FOUND_METADATA,
  STATIC_PAGE_METADATA,
} from "$lib/utils/pageMetadata.ts";

// Regression coverage for the identical-title defect: MetaTags defaulted
// `title` to "Bitcoin Stamps" and _app.tsx never passed one, so all 41 routes
// shipped the same <title> and the same description. Only /stamp/[id] escaped.
//
// These tests also hold the line on length. A sibling property shipped six
// titles between 65 and 79 characters; Google truncated every one of them and
// the payload was lost. Character counts are cheap to assert and expensive to
// eyeball, so they are asserted here rather than trusted to review.

/** Every URL listed in routes/sitemap.xml.ts. */
const SITEMAP_PATHS = [
  "/",
  "/marketplace",
  "/src20",
  "/collection",
  "/explorer",
  "/block",
  "/about",
  "/faq",
  "/docs",
  "/howto",
  "/howto/stamp",
  "/howto/sendstamp",
  "/howto/deploytoken",
  "/howto/minttoken",
  "/howto/transfertoken",
  "/howto/leatherconnect",
  "/howto/leathercreate",
  "/howto/transferbitname",
  "/tool/stamp/create",
  "/tool/fairmint",
  "/media",
  "/presskit",
  "/upload",
  "/termsofservice",
];

Deno.test("every sitemap URL has hand-written metadata", () => {
  for (const path of SITEMAP_PATHS) {
    const meta = STATIC_PAGE_METADATA[path];
    assert(meta, `${path} is in the sitemap but has no entry`);
    assert(meta.title.length > 0, `${path} has an empty title`);
    assert(meta.description.length > 0, `${path} has an empty description`);
  }
});

Deno.test("titles fit inside what Google renders", () => {
  for (const [path, meta] of Object.entries(STATIC_PAGE_METADATA)) {
    assert(
      meta.title.length <= MAX_TITLE_LENGTH,
      `${path} title is ${meta.title.length} chars (max ${MAX_TITLE_LENGTH}): ${meta.title}`,
    );
  }
});

Deno.test("descriptions fit inside what Google renders", () => {
  for (const [path, meta] of Object.entries(STATIC_PAGE_METADATA)) {
    assert(
      meta.description.length <= MAX_DESCRIPTION_LENGTH,
      `${path} description is ${meta.description.length} chars (max ${MAX_DESCRIPTION_LENGTH})`,
    );
  }
});

Deno.test("no two pages share a title or a description", () => {
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();

  for (const [path, meta] of Object.entries(STATIC_PAGE_METADATA)) {
    // The home page IS the default, so it is allowed to match it.
    if (path !== "/") {
      assertNotEquals(
        meta.title,
        DEFAULT_METADATA.title,
        `${path} fell back to the site-wide default title`,
      );
    }

    const titleOwner = titles.get(meta.title);
    assert(!titleOwner, `${path} reuses the title from ${titleOwner}`);
    titles.set(meta.title, path);

    const descOwner = descriptions.get(meta.description);
    assert(!descOwner, `${path} reuses the description from ${descOwner}`);
    descriptions.set(meta.description, path);
  }
});

Deno.test("routes outside the static map get a derived title, not the site name", () => {
  const derived: Array<[string, string]> = [
    ["/src20/KEVIN", "KEVIN"],
    ["/collection/utxo_punks", "Utxo Punks"],
    ["/block/966781", "966781"],
    ["/tool/src20/deploy", "Deploy"],
    ["/howto/template", "Template"],
    ["/stamp/1", "Bitcoin Stamp 1"],
  ];

  for (const [path, expectedFragment] of derived) {
    const meta = getPageMetadata(path);
    assertNotEquals(
      meta.title,
      DEFAULT_METADATA.title,
      `${path} fell through to the default title`,
    );
    assert(
      meta.title.includes(expectedFragment),
      `${path} title "${meta.title}" is missing "${expectedFragment}"`,
    );
  }
});

Deno.test("derived metadata is clamped to the same limits", () => {
  const longSlug = "a_very_long_collection_name_that_keeps_on_going_forever_and_ever";
  const meta = getPageMetadata(`/collection/${longSlug}`);
  assert(
    meta.title.length <= MAX_TITLE_LENGTH,
    `derived title is ${meta.title.length} chars: ${meta.title}`,
  );
  assert(
    meta.description.length <= MAX_DESCRIPTION_LENGTH,
    `derived description is ${meta.description.length} chars`,
  );

  const longAddress = getPageMetadata(
    "/wallet/bc1qf8cedqguh2ucc3fgsphmgt789q9szh35vtl38m",
  );
  assert(longAddress.title.length <= MAX_TITLE_LENGTH);
});

Deno.test("trailing slashes and unknown paths resolve sensibly", () => {
  assertEquals(getPageMetadata("/faq/").title, STATIC_PAGE_METADATA["/faq"].title);
  assertEquals(getPageMetadata("/").title, DEFAULT_METADATA.title);
});

// routes/_404.tsx renders inside _app.tsx, so whatever getPageMetadata returns
// for an unmatched path IS the 404 page's title. Before this, _404.tsx carried
// its own <Head><title>, the _app title rendered alongside it, and the page
// shipped two. Verified in served HTML, not in source.
Deno.test("unmatched paths get the not-found entry, not the home page's", () => {
  for (const path of ["/no/such/page", "/faq/nope", "/marketplace/nope"]) {
    assertEquals(getPageMetadata(path).title, NOT_FOUND_METADATA.title);
    assertNotEquals(getPageMetadata(path).title, DEFAULT_METADATA.title);
  }

  assert(
    NOT_FOUND_METADATA.title.length <= MAX_TITLE_LENGTH,
    `not-found title is ${NOT_FOUND_METADATA.title.length} chars`,
  );
  assert(
    NOT_FOUND_METADATA.description.length <= MAX_DESCRIPTION_LENGTH,
    `not-found description is ${NOT_FOUND_METADATA.description.length} chars`,
  );
});

// The single biggest query by impressions on sc-domain:stampchain.io is a raw
// bech32 address (522 impressions, 16 clicks). A title that shortens the address
// cannot match it, so the full string has to survive whenever it fits.
Deno.test("address pages keep the whole address in the title when it fits", () => {
  const cases: Array<[string, boolean]> = [
    ["1AY8vMC7R1UbYCczrVUlmv7iqPhSABguJP", true], // legacy, 34 chars
    ["bc1qf8cedqguh2ucc3fgsphmgt789q9szh35vtl38m", true], // bech32, 42 chars
    // taproot runs 62 chars, past the budget on its own
    ["bc1p8w6zr5e2q60s0r8al4tvmsfer77c0eqc8j55gk8r7hzv39zhs2lqa8p0k6", false],
  ];

  for (const [address, shouldFit] of cases) {
    for (const prefix of ["/wallet/", "/dashboard/"]) {
      const meta = getPageMetadata(`${prefix}${address}`);
      assert(
        meta.title.length <= MAX_TITLE_LENGTH,
        `${prefix}${address} title is ${meta.title.length} chars: ${meta.title}`,
      );
      assertEquals(
        meta.title.includes(address),
        shouldFit,
        `${prefix}${address} -> "${meta.title}"`,
      );
      assert(
        meta.description.includes(address),
        `${prefix}${address} description dropped the address`,
      );
    }
  }
});
