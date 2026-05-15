import { NewsRepository, type SNNBroadcastsParams } from "$server/database/newsRepository.ts";

export class NewsQueryService {
  static async getBroadcastCount(
    params: SNNBroadcastsParams,
  ) {
    try {
      return await NewsRepository.getBroadcastCount(params);
    } catch (error) {
      console.error("Error getting SNN Broadcasts Count:", error);
      throw error;
    }
  }

  static async getBroadcasts(
    params: SNNBroadcastsParams,
  ) {
    try {
      return await NewsRepository.getBroadcasts(params);
    } catch (error) {
      console.error("Error getting SNN Broadcasts:", error);
      throw error;
    }
  }

  static async getPublisher(
    address: string,
  ) {
    try {
      return await NewsRepository.getPublisher(address);
    } catch (error) {
      console.error("Error getting SNN Publisher:", error);
      throw error;
    }
  }
}
