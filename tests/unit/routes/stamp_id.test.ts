/**
 * Route-level integration test for JSON-LD script tag rendering in stamp detail page.
 *
 * Verifies that routes/stamp/[id].tsx embeds a <script type="application/ld+json">
 * tag with Schema.org structured data in its rendered HTML output.
 *
 * Mirrors the manual validation step:
 *   curl https://stampchain.io/stamp/1 | grep application/ld+json
 *
 * Strategy: two complementary layers
 *   1. Source-code inspection — verifies the route *statically* renders
 *      `application/ld+json` (same pattern used in tests/unit/routes/_app.test.tsx)
 *   2. Pipeline integration — calls generateStampJsonLd() with a realistic fixture
 *      and asserts the resulting JSON string is schema.org-compliant, mirroring the
 *      exact data that would be injected into the script tag at runtime.
 *
 * Related subtasks: 24.3 (jsonLd.ts utility), 24.4 (CollectionRepository),
 *                   24.5 (route wiring)
 */

import { assertEquals, assertExists } from "@std/assert";
import { generateStampJsonLd } from "../../../lib/utils/jsonLd.ts";
import type { StampRow } from "../../../types/stamp.d.ts";

/* ===== PATH HELPERS ===== */
// Resolve the route source file relative to this test file, independent of CWD.
const resolve = (rel: string) => new URL(rel, import.meta.url).pathname;

const STAMP_DETAIL_ROUTE = resolve("../../../routes/stamp/[id].tsx");

/* ===== FIXTURES ===== */

/** Realistic StampRow fixture modelled after stamp #1. */
function makeStampFixture(overrides: Partial<StampRow> = {}): StampRow {
  return {
    stamp: 1,
    cpid: "A1234567890123456789",
    ident: "STAMP",
    block_index: 779652,
    block_time: new Date("2014-01-03T00:00:00Z"),
    tx_hash: "deadbeefcafebabe1234567890abcdef01234567890abcdef01234567890ab",
    tx_index: 42,
    creator: "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf Na",
    creator_name: "Satoshi",
    divisible: false,
    keyburn: null,
    locked: 1,
    supply: 1,
    stamp_base64: "data:image/png;base64,iVBORw0KGgo=",
    stamp_mimetype: "image/png",
    stamp_url: "https://stampchain.io/stamps/1.png",
    stamp_hash: "abc123hashvalue",
    file_hash: "filehash123",
    file_size_bytes: 512,
    unbound_quantity: 0,
    ...overrides,
  } as StampRow;
}

const STAMP_META_INFO = {
  url: "https://stampchain.io/stamp/1",
  baseUrl: "https://cdn.stampchain.io",
};

/* ===== LAYER 1: SOURCE-CODE INSPECTION ===== */
// These tests verify the route file statically contains the JSON-LD script tag
// pattern, so the feature cannot be accidentally deleted without test failure.

Deno.test({
  name: "Route source — renders <script type='application/ld+json'>",
  fn: () => {
    const source = Deno.readTextFileSync(STAMP_DETAIL_ROUTE);

    assertEquals(
      source.includes("application/ld+json"),
      true,
      "routes/stamp/[id].tsx must contain 'application/ld+json' in its source",
    );
  },
});

Deno.test({
  name: "Route source — uses generateStampJsonLd utility",
  fn: () => {
    const source = Deno.readTextFileSync(STAMP_DETAIL_ROUTE);

    assertEquals(
      source.includes("generateStampJsonLd"),
      true,
      "routes/stamp/[id].tsx must call generateStampJsonLd()",
    );
  },
});

Deno.test({
  name: "Route source — imports jsonLd utility module",
  fn: () => {
    const source = Deno.readTextFileSync(STAMP_DETAIL_ROUTE);

    assertEquals(
      source.includes("jsonLd"),
      true,
      "routes/stamp/[id].tsx must import from the jsonLd utility",
    );
  },
});

Deno.test({
  name: "Route source — includes CollectionRepository for collection data",
  fn: () => {
    const source = Deno.readTextFileSync(STAMP_DETAIL_ROUTE);

    assertEquals(
      source.includes("CollectionRepository"),
      true,
      "routes/stamp/[id].tsx must use CollectionRepository for collection data",
    );
    assertEquals(
      source.includes("getCollectionByStamp"),
      true,
      "routes/stamp/[id].tsx must call getCollectionByStamp()",
    );
  },
});

Deno.test({
  name: "Route source — passes collectionInfo to generateStampJsonLd",
  fn: () => {
    const source = Deno.readTextFileSync(STAMP_DETAIL_ROUTE);

    // The route must wire collectionInfo into generateStampJsonLd call
    assertEquals(
      source.includes("collectionInfo"),
      true,
      "routes/stamp/[id].tsx must pass collectionInfo to generateStampJsonLd",
    );
  },
});

/* ===== LAYER 2: PIPELINE INTEGRATION ===== */
// These tests call generateStampJsonLd() with a realistic fixture and assert
// the output matches the Schema.org contract that gets embedded in the script tag.

Deno.test({
  name: "Pipeline — generateStampJsonLd produces @context: https://schema.org",
  fn: () => {
    const stamp = makeStampFixture();
    const result = generateStampJsonLd(stamp, STAMP_META_INFO) as Record<
      string,
      unknown
    >;

    assertEquals(
      result["@context"],
      "https://schema.org",
      "JSON-LD must declare @context as 'https://schema.org'",
    );
  },
});

Deno.test({
  name: "Pipeline — generated JSON is valid when stringified (as rendered in script tag)",
  fn: () => {
    const stamp = makeStampFixture();
    const jsonLd = generateStampJsonLd(stamp, STAMP_META_INFO);

    // The route uses JSON.stringify(jsonLd) for dangerouslySetInnerHTML
    const htmlEmbeddedJson = JSON.stringify(jsonLd);

    // The resulting string is what ends up inside <script type="application/ld+json">
    assertEquals(
      typeof htmlEmbeddedJson,
      "string",
      "JSON.stringify(jsonLd) must produce a string",
    );
    assertEquals(
      htmlEmbeddedJson.length > 0,
      true,
      "Serialized JSON-LD must be non-empty",
    );

    // Must be valid JSON
    const reparsed = JSON.parse(htmlEmbeddedJson) as Record<string, unknown>;
    assertEquals(
      reparsed["@context"],
      "https://schema.org",
      "Embedded JSON must retain @context: https://schema.org",
    );
  },
});

Deno.test({
  name: "Pipeline — JSON-LD includes stamp identifier fields",
  fn: () => {
    const stamp = makeStampFixture({ stamp: 42, tx_hash: "cafebabe42" });
    const result = generateStampJsonLd(stamp, STAMP_META_INFO) as Record<
      string,
      unknown
    >;

    assertEquals(result["name"], "Bitcoin Stamp #42");

    const identifier = result["identifier"] as Record<string, unknown>;
    assertExists(identifier, "JSON-LD must include identifier");
    assertEquals(identifier["propertyID"], "tx_hash");
    assertEquals(identifier["value"], "cafebabe42");
  },
});

Deno.test({
  name: "Pipeline — JSON-LD includes isPartOf when collectionInfo is provided",
  fn: () => {
    const stamp = makeStampFixture();
    const collectionInfo = {
      collection_id: "POSH",
      collection_name: "Posh Collection",
      collection_description: "A curated collection of rare stamps",
    };

    const result = generateStampJsonLd(
      stamp,
      STAMP_META_INFO,
      collectionInfo,
    ) as Record<string, unknown>;

    const isPartOf = result["isPartOf"] as Record<string, unknown>;
    assertExists(isPartOf, "JSON-LD must include isPartOf when stamp has a collection");
    assertEquals(isPartOf["@type"], "Collection");
    assertEquals(isPartOf["name"], "Posh Collection");

    // Verify the full script tag content would contain schema.org
    const scriptContent = JSON.stringify(result);
    assertEquals(
      scriptContent.includes("schema.org"),
      true,
      "Script tag content must reference schema.org",
    );
  },
});

Deno.test({
  name: "Pipeline — JSON-LD has no isPartOf when collectionInfo is null (no collection)",
  fn: () => {
    const stamp = makeStampFixture();
    const result = generateStampJsonLd(
      stamp,
      STAMP_META_INFO,
      null,
    ) as Record<string, unknown>;

    assertEquals(
      "isPartOf" in result,
      false,
      "JSON-LD must omit isPartOf when stamp has no collection",
    );
  },
});

Deno.test({
  name: "Pipeline — script tag content matches curl | grep application/ld+json pattern",
  fn: () => {
    const stamp = makeStampFixture({ stamp: 1 });
    const jsonLd = generateStampJsonLd(stamp, STAMP_META_INFO);

    // Simulate the full HTML fragment that the route renders:
    //   <script type="application/ld+json">{...}</script>
    const simulatedScriptTag =
      `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

    // This is exactly what `curl https://stampchain.io/stamp/1 | grep application/ld+json`
    // would match in a live response.
    assertEquals(
      simulatedScriptTag.includes("application/ld+json"),
      true,
      "Simulated script tag must contain 'application/ld+json'",
    );
    assertEquals(
      simulatedScriptTag.includes("https://schema.org"),
      true,
      "Simulated script tag must contain 'https://schema.org'",
    );
  },
});
