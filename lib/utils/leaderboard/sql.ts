/**
 * Parameterized SELECTs for the leaderboard build.
 * `StampTableV4` is unique on (cpid, stamp), so every join goes through
 * one row per CPID (the earliest stamp) and a reissue cannot multiply
 * a holder's quantity.
 */
import {
  BURN_ADDRESSES,
  IMAGE_MIMETYPES,
} from "$lib/utils/leaderboard/rank.ts";

export interface SqlQuery {
  sql: string;
  params: unknown[];
}

const ONE_STAMP = `
  SELECT s.cpid, s.stamp, s.ident, s.divisible,
         s.stamp_url, s.stamp_mimetype
  FROM StampTableV4 s
  INNER JOIN (
    SELECT cpid, MIN(stamp) AS stamp
    FROM StampTableV4
    WHERE ident IN ('STAMP', 'SRC-721')
      AND cpid IS NOT NULL AND cpid <> ''
    GROUP BY cpid
  ) one_cpid ON one_cpid.cpid = s.cpid AND one_cpid.stamp = s.stamp
`;

const QTY = `
  CASE
    WHEN st.divisible = 1 AND h.quantity >= 100000000
      THEN h.quantity / 100000000
    ELSE h.quantity
  END
`;

function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

export function src721BodiesQuery(): SqlQuery {
  return {
    sql: `
      SELECT st.cpid AS cpid, st.stamp_base64 AS stamp_base64
      FROM StampTableV4 st
      INNER JOIN (
        SELECT cpid, MIN(stamp) AS stamp
        FROM StampTableV4
        WHERE ident = 'SRC-721' AND cpid IS NOT NULL AND cpid <> ''
        GROUP BY cpid
      ) one_cpid ON one_cpid.cpid = st.cpid AND one_cpid.stamp = st.stamp
    `,
    params: [],
  };
}

export function stampFlagsQuery(): SqlQuery {
  return {
    sql: `
      SELECT st.cpid AS cpid, st.divisible AS divisible,
             m.floor_price_btc AS floor_price_btc
      FROM (${ONE_STAMP}) st
      LEFT JOIN stamp_market_data m ON m.cpid = st.cpid
    `,
    params: [],
  };
}

export function aggregateQuery(excluded: string[]): SqlQuery {
  const excludeSql = excluded.length
    ? `AND st.cpid NOT IN (${placeholders(excluded.length)})`
    : "";
  return {
    sql: `
      SELECT h.address AS address,
             COUNT(DISTINCT h.cpid) AS stamp_count,
             SUM((${QTY}) * COALESCE(m.floor_price_btc, 0)) AS floor_value
      FROM stamp_holder_cache h
      INNER JOIN (${ONE_STAMP}) st ON st.cpid = h.cpid
      LEFT JOIN stamp_market_data m ON m.cpid = h.cpid
      WHERE h.address IS NOT NULL AND h.address <> ''
        AND h.address NOT IN (${placeholders(BURN_ADDRESSES.length)})
        ${excludeSql}
      GROUP BY h.address
    `,
    params: [...BURN_ADDRESSES, ...excluded],
  };
}

export function holdingsByCpidQuery(cpids: string[]): SqlQuery {
  return {
    sql: `
      SELECT h.address AS address, h.cpid AS cpid,
             h.quantity AS quantity, st.divisible AS divisible
      FROM stamp_holder_cache h
      INNER JOIN (${ONE_STAMP}) st ON st.cpid = h.cpid
      WHERE h.cpid IN (${placeholders(cpids.length)})
        AND h.address IS NOT NULL AND h.address <> ''
        AND h.address NOT IN (${placeholders(BURN_ADDRESSES.length)})
    `,
    params: [...cpids, ...BURN_ADDRESSES],
  };
}

export function holdingsByAddressQuery(
  addresses: string[],
  excluded: string[],
): SqlQuery {
  const excludeSql = excluded.length
    ? `AND st.cpid NOT IN (${placeholders(excluded.length)})`
    : "";
  return {
    sql: `
      SELECT h.address AS address, h.cpid AS cpid,
             h.quantity AS quantity, st.divisible AS divisible
      FROM stamp_holder_cache h
      INNER JOIN (${ONE_STAMP}) st ON st.cpid = h.cpid
      WHERE h.address IN (${placeholders(addresses.length)})
        ${excludeSql}
    `,
    params: [...addresses, ...excluded],
  };
}

export function imagesByAddressQuery(
  addresses: string[],
  excluded: string[],
): SqlQuery {
  const excludeSql = excluded.length
    ? `AND st.cpid NOT IN (${placeholders(excluded.length)})`
    : "";
  return {
    sql: `
      SELECT address, stamp_url, floor_price_btc, stamp FROM (
        SELECT h.address AS address, st.stamp_url AS stamp_url,
               m.floor_price_btc AS floor_price_btc, st.stamp AS stamp,
               ROW_NUMBER() OVER (
                 PARTITION BY h.address
                 ORDER BY (m.floor_price_btc IS NULL),
                          m.floor_price_btc DESC, st.stamp DESC
               ) AS rn
        FROM stamp_holder_cache h
        INNER JOIN (${ONE_STAMP}) st ON st.cpid = h.cpid
        LEFT JOIN stamp_market_data m ON m.cpid = h.cpid
        WHERE h.address IN (${placeholders(addresses.length)})
          AND st.stamp_url IS NOT NULL AND st.stamp_url <> ''
          AND st.stamp_mimetype IN (${placeholders(IMAGE_MIMETYPES.length)})
          ${excludeSql}
      ) ranked
      WHERE rn <= 16
    `,
    params: [...addresses, ...IMAGE_MIMETYPES, ...excluded],
  };
}

export function stampImagesByCpidQuery(cpids: string[]): SqlQuery {
  return {
    sql: `
      SELECT st.cpid AS cpid, st.stamp_url AS stamp_url,
             st.stamp AS stamp, st.stamp_mimetype AS stamp_mimetype,
             m.floor_price_btc AS floor_price_btc
      FROM (${ONE_STAMP}) st
      LEFT JOIN stamp_market_data m ON m.cpid = st.cpid
      WHERE st.cpid IN (${placeholders(cpids.length)})
    `,
    params: [...cpids],
  };
}

export function creatorNamesQuery(addresses: string[]): SqlQuery {
  return {
    sql: `
      SELECT address, creator
      FROM creator
      WHERE address IN (${placeholders(addresses.length)})
    `,
    params: [...addresses],
  };
}

export function lastBlockQuery(): SqlQuery {
  return {
    sql: `SELECT MAX(block_index) AS last_block FROM StampTableV4`,
    params: [],
  };
}
