import { dbManager } from "$server/database/databaseManager.ts";
import { serverConfig } from "$server/config/config.ts";

interface BlockNotification {
  type: "new_block";
  blockHeight: number;
  blockHash: string;
  timestamp: number;
}

interface PriceNotification {
  type: "price_update";
  price: number;
  timestamp: number;
}

type BitcoinNotification = BlockNotification | PriceNotification;

export class BitcoinNotificationService {
  static async handleNotification(data: BitcoinNotification) {
    switch (data.type) {
      case "new_block":
        await this.handleNewBlock(data);
        break;
      case "price_update":
        await this.handlePriceUpdate(data);
        break;
      default:
        console.warn("Unknown notification type:", data);
    }
  }

  private static async handleNewBlock(data: BlockNotification) {
    // NOTE: preview:* cache keys (rendered stamp PNG previews) are intentionally
    // excluded from block-based invalidation. Stamp content is immutable blockchain
    // data — once rendered, a preview never changes regardless of new blocks.
    console.log(`Processing new block notification: ${data.blockHeight}`);

    // Block-specific cache invalidation
    await dbManager.invalidateCacheByPattern('last_block');
    await dbManager.invalidateCacheByPattern(`block_${data.blockHeight}`);
    await dbManager.invalidateCacheByPattern('block_*');

    // Balance caches - these change with new transactions in blocks
    // OLD METHOD (INEFFECTIVE): Pattern-based invalidation doesn't work with SHA-256 hash keys
    // await dbManager.invalidateCacheByPattern('balance_*');
    // await dbManager.invalidateCacheByPattern('src20_balance_*');
    // await dbManager.invalidateCacheByPattern('src101_balance_*');
    // await dbManager.invalidateCacheByPattern('stamp_balance_*');

    // NEW METHOD (COMPREHENSIVE): Category-based invalidation using cache key registry
    // Clear all categories that might contain balance-related data
    await dbManager.invalidateCacheByCategory('balance');
    await dbManager.invalidateCacheByCategory('src20_balance');
    await dbManager.invalidateCacheByCategory('src101_balance');
    await dbManager.invalidateCacheByCategory('stamp_balance');

    // SELECTIVE: Only clear categories that ACTUALLY change with new blocks
    // Commented out over-aggressive invalidations that hurt cache hit rate
    // await dbManager.invalidateCacheByCategory('stamp');      // Most stamp data doesn't change with blocks
    // await dbManager.invalidateCacheByCategory('stamp_detail'); // Individual stamps rarely change
    await dbManager.invalidateCacheByCategory('stamp_list'); // New stamps may appear
    await dbManager.invalidateCacheByCategory('market_data'); // Prices/volumes change with trades
    await dbManager.invalidateCacheByCategory('block');      // Block data obviously changes
    await dbManager.invalidateCacheByCategory('src20_transaction'); // New transactions in blocks
    await dbManager.invalidateCacheByCategory('blockchain_data'); // Blockchain state changes
    await dbManager.invalidateCacheByCategory('dispenser'); // Dispenser state changes with usage
    await dbManager.invalidateCacheByCategory('transaction'); // New transactions in blocks

    // Market data caches - prices/volumes may change with new blocks
    await dbManager.invalidateCacheByPattern('market_data_*');
    await dbManager.invalidateCacheByPattern('src20_market_*');

    // Transaction-related caches
    await dbManager.invalidateCacheByPattern('transaction_*');
    await dbManager.invalidateCacheByPattern('stamp_*');

    // Recent sales and block transactions - simple invalidation
    // (Append strategy would be more complex than it's worth during rapid development)
    await dbManager.invalidateCacheByCategory('recent_sales');
    await dbManager.invalidateCacheByCategory('block_transactions');

    console.log(`Cache invalidated for new block ${data.blockHeight} (using comprehensive category-based invalidation)`);

    // Purge Cloudflare CDN edge cache for data that changed with new block.
    // Redis cache (above) handles server-side; this handles CF edge.
    await this.purgeCloudflareCache();
  }

  /**
   * Purge Cloudflare CDN cache for API endpoints with block-dependent data.
   * Uses the CF API prefix-purge to clear cached responses at the edge.
   * Runs fire-and-forget — CF purge failure shouldn't block notification processing.
   */
  private static async purgeCloudflareCache(): Promise<void> {
    const zoneId = serverConfig.CLOUDFLARE_ZONE_ID;
    const apiToken = serverConfig.CLOUDFLARE_API_TOKEN;

    if (!zoneId || !apiToken) {
      console.log("[CF PURGE] Skipping — CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN not configured");
      return;
    }

    const prefixes = [
      "https://stampchain.io/api/v2/src20/",
      "https://stampchain.io/api/v2/balance/",
      "https://stampchain.io/api/v2/stamps/",
      "https://stampchain.io/api/v2/block/",
      "https://stampchain.io/api/v2/src101/",
      "https://stampchain.io/api/v2/cursed/",
    ];

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prefixes }),
        },
      );

      if (response.ok) {
        console.log(`[CF PURGE] Purged ${prefixes.length} URL prefixes`);
      } else {
        const body = await response.text();
        console.warn(`[CF PURGE] Failed (${response.status}): ${body}`);
      }
    } catch (error) {
      console.warn(`[CF PURGE] Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async handlePriceUpdate(data: PriceNotification) {
    console.log(`Processing price update notification: $${data.price}`);
    await dbManager.invalidateCacheByPattern('btc_price*');
  }
}
