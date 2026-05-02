import { NewsService } from "$server/services/news/index.ts";
import { BlockService } from "$server/services/core/blockService.ts";
import type { SNNBroadcastsParams } from "$server/database/newsRepository.ts";

export class NewsController {
  static async handleBroadcastsRequest(
    params: SNNBroadcastsParams,
  ) {
    try {
      const [lastBlock, broadcasts, totalCount] = await Promise.all([
        BlockService.getLastBlock(),
        NewsService.QueryService.getBroadcasts(params),
        NewsService.QueryService.getBroadcastCount(params),
      ]);

      const limit = params.limit || 50;
      const page = params.page || 1;

      const restructuredResult: any = {
        last_block: lastBlock,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        total: totalCount,
        data: broadcasts,
      };

      return restructuredResult;
    } catch (error) {
      console.error("Error processing News Broadcasts request:", error);
      return {
        last_block: await BlockService.getLastBlock(),
        data: [],
      };
    }
  }

  static async handlePublisherRequest(
    address: string,
  ) {
    try {
      const [lastBlock, publisherInfo] = await Promise.all([
        BlockService.getLastBlock(),
        NewsService.QueryService.getPublisher(address),
      ]);

      const restructuredResult: any = {
        last_block: lastBlock,
        data: publisherInfo,
      };

      return restructuredResult;
    } catch (error) {
      console.error("Error processing News Publisher request:", error);
      return {
        last_block: await BlockService.getLastBlock(),
        data: {},
      };
    }
  }
}
