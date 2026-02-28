/**
 * Tests for generateStampJsonLd utility function
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { generateStampJsonLd } from "$lib/utils/jsonLd.ts";
import type { StampRow } from "$types/stamp.d.ts";

// Minimal StampRow fixture for testing
function makeStamp(overrides: Partial<StampRow> = {}): StampRow {
  return {
    stamp: 12345,
    cpid: "A12345",
    ident: "STAMP",
    block_index: 800000,
    block_time: new Date("2024-01-15T12:00:00Z"),
    tx_hash: "abc123def456",
    tx_index: 1,
    creator: "1BitcoinAddress",
    creator_name: null,
    divisible: false,
    keyburn: null,
    locked: 1,
    supply: 1,
    stamp_base64: "data:image/png;base64,abc",
    stamp_mimetype: "image/png",
    stamp_url: "https://stampchain.io/stamps/12345.png",
    stamp_hash: "hashvalue",
    file_hash: "filehashvalue",
    file_size_bytes: 1024,
    unbound_quantity: 0,
    ...overrides,
  } as StampRow;
}

const metaInfo = {
  url: "https://stampchain.io/stamp/12345",
  baseUrl: "https://cdn.stampchain.io",
};

describe("generateStampJsonLd", () => {
  describe("required Schema.org fields", () => {
    it("should include @context set to schema.org", () => {
      const stamp = makeStamp();
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      assertEquals(result["@context"], "https://schema.org");
    });

    it("should include @type with ImageObject and CreativeWork", () => {
      const stamp = makeStamp();
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      assertEquals(result["@type"], ["ImageObject", "CreativeWork"]);
    });

    it("should generate name from stamp number", () => {
      const stamp = makeStamp({ stamp: 42 });
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      assertEquals(result["name"], "Bitcoin Stamp #42");
    });

    it("should set contentUrl from metaInfo.url", () => {
      const stamp = makeStamp();
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      assertEquals(result["contentUrl"], metaInfo.url);
    });

    it("should set thumbnailUrl using baseUrl and stamp number", () => {
      const stamp = makeStamp({ stamp: 12345 });
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      assertEquals(
        result["thumbnailUrl"],
        "https://cdn.stampchain.io/12345.png",
      );
    });

    it("should include encodingFormat from stamp_mimetype", () => {
      const stamp = makeStamp({ stamp_mimetype: "image/jpeg" });
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      assertEquals(result["encodingFormat"], "image/jpeg");
    });

    it("should include contentSize in bytes format", () => {
      const stamp = makeStamp({ file_size_bytes: 2048 });
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      assertEquals(result["contentSize"], "2048 bytes");
    });

    it("should omit contentSize when file_size_bytes is null", () => {
      const stamp = makeStamp({ file_size_bytes: null });
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      assertEquals("contentSize" in result, false);
    });

    it("should include identifier with tx_hash", () => {
      const stamp = makeStamp({ tx_hash: "deadbeef1234" });
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      const identifier = result["identifier"] as Record<string, unknown>;
      assertExists(identifier);
      assertEquals(identifier["@type"], "PropertyValue");
      assertEquals(identifier["propertyID"], "tx_hash");
      assertEquals(identifier["value"], "deadbeef1234");
    });
  });

  describe("creator field", () => {
    it("should use creator_name when available", () => {
      const stamp = makeStamp({
        creator: "1BitcoinAddress",
        creator_name: "Satoshi",
      });
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      const creator = result["creator"] as Record<string, unknown>;
      assertEquals(creator["name"], "Satoshi");
    });

    it("should fall back to creator address when creator_name is null", () => {
      const stamp = makeStamp({
        creator: "1BitcoinAddress",
        creator_name: null,
      });
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      const creator = result["creator"] as Record<string, unknown>;
      assertEquals(creator["name"], "1BitcoinAddress");
    });

    it("should include @type Person on creator", () => {
      const stamp = makeStamp({ creator: "1Addr" });
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      const creator = result["creator"] as Record<string, unknown>;
      assertEquals(creator["@type"], "Person");
    });
  });

  describe("datePublished conversion", () => {
    it("should convert block_time Date to ISO 8601 string", () => {
      const stamp = makeStamp({
        block_time: new Date("2024-01-15T12:00:00Z"),
      });
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      assertEquals(result["datePublished"], "2024-01-15T12:00:00.000Z");
    });

    it("should produce a valid ISO 8601 date string", () => {
      const stamp = makeStamp({ block_time: new Date("2023-06-01T00:00:00Z") });
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      const dateStr = result["datePublished"] as string;
      const parsed = new Date(dateStr);
      assertEquals(isNaN(parsed.getTime()), false);
    });
  });

  describe("isPartOf (collection)", () => {
    it("should not include isPartOf when collectionInfo is null", () => {
      const stamp = makeStamp();
      const result = generateStampJsonLd(stamp, metaInfo, null) as Record<
        string,
        unknown
      >;
      assertEquals("isPartOf" in result, false);
    });

    it("should not include isPartOf when collectionInfo is undefined", () => {
      const stamp = makeStamp();
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      assertEquals("isPartOf" in result, false);
    });

    it("should include isPartOf when collectionInfo is provided", () => {
      const stamp = makeStamp();
      const collectionInfo = {
        collection_id: "col1",
        collection_name: "Rare Stamps",
        collection_description: "A collection of rare stamps",
      };
      const result = generateStampJsonLd(
        stamp,
        metaInfo,
        collectionInfo,
      ) as Record<string, unknown>;
      const isPartOf = result["isPartOf"] as Record<string, unknown>;
      assertExists(isPartOf);
      assertEquals(isPartOf["@type"], "Collection");
      assertEquals(isPartOf["name"], "Rare Stamps");
    });
  });

  describe("offers (price dispenser)", () => {
    it("should not include offers when lowestPriceDispenser is undefined", () => {
      const stamp = makeStamp();
      const result = generateStampJsonLd(stamp, metaInfo) as Record<
        string,
        unknown
      >;
      assertEquals("offers" in result, false);
    });

    it("should not include offers when lowestPriceDispenser is null", () => {
      const stamp = makeStamp();
      const result = generateStampJsonLd(
        stamp,
        metaInfo,
        null,
        null,
      ) as Record<string, unknown>;
      assertEquals("offers" in result, false);
    });

    it("should include offers with BTC price when dispenser is provided", () => {
      const stamp = makeStamp();
      const dispenser = { satoshirate: 500000 }; // 0.005 BTC
      const result = generateStampJsonLd(
        stamp,
        metaInfo,
        null,
        dispenser,
      ) as Record<string, unknown>;
      const offers = result["offers"] as Record<string, unknown>;
      assertExists(offers);
      assertEquals(offers["@type"], "Offer");
      assertEquals(offers["priceCurrency"], "BTC");
    });

    it("should accurately convert satoshirate to BTC", () => {
      const stamp = makeStamp();
      const dispenser = { satoshirate: 100000000 }; // 1 BTC
      const result = generateStampJsonLd(
        stamp,
        metaInfo,
        null,
        dispenser,
      ) as Record<string, unknown>;
      const offers = result["offers"] as Record<string, unknown>;
      assertEquals(offers["price"], 1);
    });

    it("should convert small satoshi values accurately", () => {
      const stamp = makeStamp();
      const dispenser = { satoshirate: 1 }; // 0.00000001 BTC
      const result = generateStampJsonLd(
        stamp,
        metaInfo,
        null,
        dispenser,
      ) as Record<string, unknown>;
      const offers = result["offers"] as Record<string, unknown>;
      assertEquals(offers["price"], 1e-8);
    });
  });

  describe("JSON serialization", () => {
    it("should produce an object that is valid JSON when stringified", () => {
      const stamp = makeStamp();
      const collectionInfo = {
        collection_id: "col1",
        collection_name: "Test Collection",
        collection_description: "Test",
      };
      const dispenser = { satoshirate: 50000 };
      const result = generateStampJsonLd(
        stamp,
        metaInfo,
        collectionInfo,
        dispenser,
      );
      const jsonStr = JSON.stringify(result);
      const reparsed = JSON.parse(jsonStr);
      assertExists(reparsed["@context"]);
      assertExists(reparsed["@type"]);
    });
  });

  describe("script tag embedding (JSON-LD for <script type='application/ld+json'>)", () => {
    it("should produce a string via JSON.stringify suitable for dangerouslySetInnerHTML", () => {
      const stamp = makeStamp();
      const result = generateStampJsonLd(stamp, metaInfo);
      const jsonStr = JSON.stringify(result);
      // Must be a non-empty string parseable as JSON
      assertEquals(typeof jsonStr, "string");
      const parsed = JSON.parse(jsonStr);
      assertExists(parsed["@context"]);
    });

    it("should not throw when serializing stamp with collection (isPartOf present)", () => {
      const stamp = makeStamp({ ident: "STAMP" });
      const collectionInfo = {
        collection_id: "col-xyz",
        collection_name: "Elite Collection",
        collection_description: "Top tier stamps",
      };
      const result = generateStampJsonLd(stamp, metaInfo, collectionInfo);
      const jsonStr = JSON.stringify(result);
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      assertExists(parsed["isPartOf"]);
    });

    it("should not include isPartOf when stamp has no collection", () => {
      const stamp = makeStamp({ ident: "STAMP" });
      const result = generateStampJsonLd(stamp, metaInfo, null);
      const jsonStr = JSON.stringify(result);
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      assertEquals("isPartOf" in parsed, false);
    });

    it("should include offers when STAMP/SRC-721 has a dispenser", () => {
      const stamp = makeStamp({ ident: "STAMP" });
      const dispenser = { satoshirate: 200000 }; // 0.002 BTC
      const result = generateStampJsonLd(stamp, metaInfo, null, dispenser);
      const jsonStr = JSON.stringify(result);
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      assertExists(parsed["offers"]);
      const offers = parsed["offers"] as Record<string, unknown>;
      assertEquals(offers["priceCurrency"], "BTC");
    });

    it("should not include offers when SRC-20 stamp has no dispenser", () => {
      const stamp = makeStamp({ ident: "SRC-20" });
      const result = generateStampJsonLd(stamp, metaInfo, null, null);
      const jsonStr = JSON.stringify(result);
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      assertEquals("offers" in parsed, false);
    });
  });
});
