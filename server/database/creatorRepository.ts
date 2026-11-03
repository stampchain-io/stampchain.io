import { SRC101_OWNERS_TABLE } from "$constants";
import type { CreatorSearchResult } from "$lib/types/creator.ts";
import { dbManager } from "$server/database/databaseManager.ts";

export class CreatorRepository {
  private static db: Pick<typeof dbManager, "executeQueryWithCache"> =
    dbManager;

  static setDatabase(
    database: Pick<typeof dbManager, "executeQueryWithCache">,
  ): void {
    this.db = database;
  }

  static async searchCreators(query: string): Promise<CreatorSearchResult[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    // Treat LIKE wildcards as literal characters in names (e.g. alice_smith).
    const escaped = normalized.replace(/[=%_]/g, "=$&");
    const contains = `%${escaped}%`;
    const result = await this.db.executeQueryWithCache(
      `
        SELECT address, name
        FROM (
          SELECT address, creator AS name
          FROM creator
          WHERE creator IS NOT NULL AND creator <> ''
            AND (LOWER(creator) LIKE ? ESCAPE '='
              OR LOWER(address) LIKE ? ESCAPE '=')
          UNION
          SELECT domains.owner AS address,
            COALESCE(NULLIF(creator.creator, ''),
              CONCAT(domains.tokenid_utf8, '.btc')) AS name
          FROM ${SRC101_OWNERS_TABLE} domains
          LEFT JOIN creator ON creator.address = domains.owner
          WHERE domains.prim = 1
            AND domains.expire_timestamp > UNIX_TIMESTAMP()
            AND domains.tokenid_utf8 IS NOT NULL
            AND domains.tokenid_utf8 <> ''
            AND (LOWER(CONCAT(domains.tokenid_utf8, '.btc'))
                LIKE ? ESCAPE '='
              OR LOWER(domains.owner) LIKE ? ESCAPE '=')
            AND NOT EXISTS (
              SELECT 1 FROM ${SRC101_OWNERS_TABLE} newer
              WHERE newer.owner = domains.owner AND newer.prim = 1
                AND newer.expire_timestamp > UNIX_TIMESTAMP()
                AND (newer.last_update > domains.last_update
                  OR (newer.last_update = domains.last_update
                    AND newer.tokenid_utf8 < domains.tokenid_utf8))
            )
        ) creator_matches
        WHERE address IS NOT NULL AND address <> ''
        ORDER BY (LOWER(name) = ?) DESC, (LOWER(address) = ?) DESC,
          (LOWER(name) LIKE ? ESCAPE '=') DESC, LOWER(name), address
        LIMIT 10
      `,
      [
        contains,
        contains,
        contains,
        contains,
        normalized,
        normalized,
        `${escaped}%`,
      ],
      60,
    ) as { rows?: CreatorSearchResult[] };

    return result?.rows ?? [];
  }
}
