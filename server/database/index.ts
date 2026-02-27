// Export types first
export type { DatabaseConfig } from "./databaseManager.ts";

// Then check SKIP_REDIS_CONNECTION before any database imports
if (!(globalThis as any).SKIP_REDIS_CONNECTION) {
  await import("./databaseManager.ts");
}

// Export repositories that don't initialize connections
export { StampRepository } from "./stampRepository.ts";
export { BlockRepository } from "./blockRepository.ts";
export { CollectionRepository } from "./collectionRepository.ts";
export { MarketDataRepository } from "./marketDataRepository.ts";
export { NodeVersionRepository } from "./nodeVersionRepository.ts";
export { summarize_issuances } from "./summary.ts";
 