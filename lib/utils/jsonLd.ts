/**
 * JSON-LD utility for Bitcoin Stamps
 *
 * Generates Schema.org-compliant JSON-LD structured data for stamp pages,
 * combining ImageObject and CreativeWork types.
 */

import type { StampRow } from "$types/stamp.d.ts";

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
export function generateStampJsonLd(
  stamp: StampRow,
  metaInfo: { url: string; baseUrl: string },
  collectionInfo?: {
    collection_id: string;
    collection_name: string;
    collection_description: string;
  } | null,
  lowestPriceDispenser?: { satoshirate: number } | null | undefined,
): object {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["ImageObject", "CreativeWork"],
    name: `Bitcoin Stamp #${stamp.stamp}`,
    contentUrl: metaInfo.url,
    thumbnailUrl: `${metaInfo.baseUrl}/${stamp.stamp}.png`,
    creator: {
      "@type": "Person",
      name: stamp.creator_name || stamp.creator,
    },
    datePublished: stamp.block_time instanceof Date
      ? stamp.block_time.toISOString()
      : new Date(Number(stamp.block_time) * 1000).toISOString(),
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
