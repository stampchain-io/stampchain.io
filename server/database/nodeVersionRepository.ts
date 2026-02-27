import { SHORT_CACHE_DURATION } from "$constants";
import { dbManager } from "$server/database/databaseManager.ts";
import type { NodeVersionInfo } from "$types/src20.d.ts";

export class NodeVersionRepository {
  private static db: typeof dbManager = dbManager;

  static setDatabase(database: typeof dbManager): void {
    this.db = database;
  }

  /**
   * Get all current component versions from node_version_history.
   * Returns only rows where is_current = TRUE (one per component).
   */
  static async getCurrentVersions(): Promise<NodeVersionInfo[]> {
    try {
      const rows = await this.db.executeQueryWithCache(
        `SELECT component_name, version_string, version_major, version_minor,
                version_revision, version_suffix, extra_info, detected_at
         FROM node_version_history
         WHERE is_current = TRUE
         ORDER BY component_name`,
        [],
        SHORT_CACHE_DURATION,
      );

      if (!rows || !Array.isArray(rows)) {
        return [];
      }

      return rows.map((row: Record<string, unknown>) => ({
        component_name: String(row.component_name),
        version_string: String(row.version_string),
        version_major: row.version_major != null ? Number(row.version_major) : null,
        version_minor: row.version_minor != null ? Number(row.version_minor) : null,
        version_revision: row.version_revision != null ? Number(row.version_revision) : null,
        version_suffix: row.version_suffix != null ? String(row.version_suffix) : null,
        extra_info: row.extra_info != null
          ? (typeof row.extra_info === "string" ? JSON.parse(row.extra_info) : row.extra_info) as Record<string, unknown>
          : null,
        detected_at: row.detected_at instanceof Date
          ? row.detected_at.toISOString()
          : String(row.detected_at),
      }));
    } catch (error) {
      console.error("Failed to fetch node versions:", error);
      return [];
    }
  }
}
