import { dbManager } from "$server/database/databaseManager.ts";

const SRC20_BACKGROUND_TABLE = "srcbackground";

export class FileOperations {
  static async saveFileToDatabase(
    tick: string,
    tickHash: string,
    base64Data: string,
  ): Promise<boolean> {
    const query = `
      INSERT INTO ${SRC20_BACKGROUND_TABLE} (tick, tick_hash, base64)
      VALUES (?, ?, ?) AS new_row
      ON DUPLICATE KEY UPDATE
        tick_hash = new_row.tick_hash,
        base64 = new_row.base64
    `;

    try {
      console.log("Starting database save operation:", {
        tick,
        tickHashLength: tickHash.length,
        dataLength: base64Data.length,
      });

      console.log("Executing query:", query.replace(/\s+/g, ' ').trim());

      const result = await dbManager.executeQuery(query, [
        tick,
        tickHash,
        base64Data,
      ]);

      console.log("Database operation completed:", {
        affectedRows: (result as any).affectedRows,
        success: (result as any).affectedRows > 0,
        tick,
        tickHashLength: tickHash.length,
        dataLength: base64Data.length,
      });

      return (result as any).affectedRows > 0;
    } catch (error) {
      console.error("Error saving file to database:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        tick,
        tickHashLength: tickHash.length,
        dataLength: base64Data.length,
        query: query.replace(/\s+/g, ' ').trim(),
      });
      return false;
    }
  }

  static async getFileFromDatabase(
    tick: string,
  ): Promise<{ tickHash: string; base64Data: string } | null> {
    try {
      const query = `
        SELECT tick_hash, base64
        FROM ${SRC20_BACKGROUND_TABLE}
        WHERE tick = ?
      `;

      const result = await dbManager.executeQueryWithCache(
        query,
        [tick],
        60 * 5 // Cache for 5 minutes in seconds
      ); // Cache for 5 minutes

      if ((result as any).rows.length > 0) {
        return {
          tickHash: (result as any).rows[0].tick_hash,
          base64Data: (result as any).rows[0].base64,
        };
      }

      return null;
    } catch (error) {
      console.error("Error retrieving file from database:", error);
      return null;
    }
  }
}

export const saveFileToDatabase = FileOperations.saveFileToDatabase;
export const getFileFromDatabase = FileOperations.getFileFromDatabase;
