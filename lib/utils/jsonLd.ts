/**
 * JSON-LD utility for Bitcoin Stamps
 *
 * Generates Schema.org-compliant JSON-LD structured data for stamp pages,
 * combining ImageObject and CreativeWork types.
 */

import type { StampRow } from "$types/stamp.d.ts";
import { type BrandChain, stampTitle } from "$lib/utils/chain/brand.ts";

/** Satoshis per BTC for price conversion */
const SATS_PER_BTC = 100_000_000;

/**
 * Generate a Schema.org JSON-LD object for a Bitcoin Stamp.
 *
 * Returns a plain JavaScript object (not stringified) suitable for embedding
 * in a <script type="application/ld+json"> tag.
 *
 * @param stamp - The stamp data row from the database
 * @param metaInfo - URL metadata for the stamp page
 * @param collectionInfo - Optional collection the stamp belongs to
 * @param lowestPriceDispenser - Optional dispenser with the lowest price
 * @returns Schema.org-compliant JSON-LD object
 */
/**
 * ISO date for a stamp's block_time, or undefined when it does not parse.
 * block_time reaches the page as a Date from the database, an ISO string when
 * the row came through the JSON cache, or Unix seconds from some API shapes.
 * The old code assumed seconds for anything that was not a Date, so a cached
 * row gave NaN and toISOString() threw, failing the whole stamp page.
 */
export function blockTimeToIso(value: unknown): string | undefined {
  let date: Date | undefined;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    date = new Date(value * 1000);
  } else if (typeof value === "string" && value.trim() !== "") {
    date = /^\d+$/.test(value.trim())
      ? new Date(Number(value) * 1000)
      : new Date(value);
  }
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
}

export function generateStampJsonLd(
  stamp: StampRow,
  metaInfo: { url: string; baseUrl: string },
  collectionInfo?: {
    collection_id: string;
    collection_name: string;
    collection_description: string;
  } | null,
  lowestPriceDispenser?: { satoshirate: number } | null | undefined,
  chain: BrandChain = "bitcoin",
): object {
  const datePublished = blockTimeToIso(stamp.block_time);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["ImageObject", "CreativeWork"],
    name: stampTitle(stamp.stamp, chain, stamp.block_index),
    contentUrl: metaInfo.url,
    thumbnailUrl: `${metaInfo.baseUrl}/${stamp.stamp}.png`,
    creator: {
      "@type": "Person",
      name: stamp.creator_name || stamp.creator,
    },
    ...(datePublished ? { datePublished } : {}),
    encodingFormat: stamp.stamp_mimetype,
    ...(stamp.file_size_bytes != null
      ? { contentSize: `${stamp.file_size_bytes} bytes` }
      : {}),
    identifier: {
      "@type": "PropertyValue",
      propertyID: "tx_hash",
      value: stamp.tx_hash,
    },
  };

  if (collectionInfo) {
    jsonLd["isPartOf"] = {
      "@type": "Collection",
      name: collectionInfo.collection_name,
    };
  }

  if (lowestPriceDispenser) {
    jsonLd["offers"] = {
      "@type": "Offer",
      price: lowestPriceDispenser.satoshirate / SATS_PER_BTC,
      priceCurrency: "BTC",
    };
  }

  return jsonLd;
}
