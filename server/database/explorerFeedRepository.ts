import type {
  StampEdition,
  StampFilterType,
  StampFiletype,
  StampRange,
  StampType
} from "$constants";
import { dbManager } from "$server/database/databaseManager.ts";
import { SRC20Repository } from "$server/database/src20Repository.ts";
import { StampRepository } from "$server/database/stampRepository.ts";
import type { SUBPROTOCOLS } from "$types/base.d.ts";

export interface ExplorerFeedRow {
  tx_hash: string;
  block_index: number;
  tx_index: number;
  kind: "stamp" | "src20";
}

export interface ExplorerFeedPage {
  data: ExplorerFeedRow[];
  totalStamps: number;
  totalTokens: number;
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Combines stamps (StampTableV4) and SRC-20 transactions (SRC20Valid) into a
 * single chronologically-ordered, correctly-paginated feed for the explorer
 * "all" view.
 *
 * Both sources are unioned as a lightweight ordering index (tx_hash,
 * block_index, tx_index, kind only) so the database — not the client — is
 * the single source of truth for order and offset/limit pagination. Callers
 * hydrate full row data for just the tx_hashes on the requested page
 * (see `StampController.getStamps({ identifier: [...] })` and
 * `SRC20QueryService.fetchBasicSrc20Data({ tx_hash: [...] })`).
 */
export class ExplorerFeedRepository {
  private static db: typeof dbManager = dbManager;

  static setDatabase(database: typeof dbManager): void {
    this.db = database;
  }

  static async getFeedPage(options: {
    page?: number | undefined;
    limit?: number | undefined;
    // Stamp-side filters (see StampRepository.buildFeedFragment)
    type?: StampType | undefined;
    ident?: SUBPROTOCOLS | SUBPROTOCOLS[] | string | undefined;
    collectionId?: string | string[] | undefined;
    filterBy?: StampFilterType[] | undefined;
    fileType?: StampFiletype[] | undefined;
    editions?: StampEdition[] | undefined;
    range?: StampRange | undefined;
    rangeMin?: string | undefined;
    rangeMax?: string | undefined;
    // Token-side filters (see SRC20Repository.buildFeedFragment)
    tokenOp?: string | string[] | undefined;
    stampMin?: number | string | undefined;
    stampMax?: number | string | undefined;
    amtMax?: number | string | undefined;
  }): Promise<ExplorerFeedPage> {
    const { page = 1, limit = 60 } = options;

    const stampFragment = StampRepository.buildFeedFragment({
      type: options.type,
      ident: options.ident,
      collectionId: options.collectionId,
      filterBy: options.filterBy,
      fileType: options.fileType,
      editions: options.editions,
      range: options.range,
      rangeMin: options.rangeMin,
      rangeMax: options.rangeMax,
    });

    const tokenFragment = SRC20Repository.buildFeedFragment({
      op: options.tokenOp,
      stampMin: options.stampMin,
      stampMax: options.stampMax,
      amtMax: options.amtMax,
    });

    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 60;
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const offset = Math.max(0, (safePage - 1) * safeLimit);

    const dataQuery = `
      SELECT tx_hash, block_index, tx_index, kind FROM (
        ${stampFragment.subquery}
        UNION ALL
        ${tokenFragment.subquery}
      ) AS combined_feed
      ORDER BY block_index DESC, tx_index DESC
      LIMIT ? OFFSET ?
    `;
    const dataParams = [
      ...stampFragment.params,
      ...tokenFragment.params,
      safeLimit,
      offset,
    ];

    const countQuery = `
      SELECT
        (SELECT COUNT(*) FROM (${stampFragment.subquery}) AS s) AS stamp_total,
        (SELECT COUNT(*) FROM (${tokenFragment.subquery}) AS t) AS token_total
    `;
    const countParams = [...stampFragment.params, ...tokenFragment.params];

    const [dataResult, countResult] = await Promise.all([
      this.db.executeQuery<{ rows: ExplorerFeedRow[] }>(
        dataQuery,
        dataParams,
      ),
      this.db.executeQuery<
        { rows: { stamp_total: number; token_total: number }[] }
      >(countQuery, countParams),
    ]);

    const rows = Array.isArray((dataResult as any)?.rows)
      ? (dataResult as any).rows
      : [];
    const countRow = (countResult as any)?.rows?.[0] ?? {
      stamp_total: 0,
      token_total: 0,
    };
    const totalStamps = Number(countRow.stamp_total) || 0;
    const totalTokens = Number(countRow.token_total) || 0;
    const total = totalStamps + totalTokens;
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return {
      data: rows.map((r: ExplorerFeedRow) => ({
        tx_hash: r.tx_hash,
        block_index: Number(r.block_index),
        tx_index: Number(r.tx_index),
        kind: r.kind,
      })),
      totalStamps,
      totalTokens,
      total,
      page: safePage,
      totalPages,
    };
  }
}
