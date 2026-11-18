
import {
  getStampImageSrc,
  getStampPreviewUrl,
} from "$lib/utils/ui/media/imageUtils.ts";
import { CollectionService } from "$server/services/core/collectionService.ts";
import { StampService } from "$server/services/stampService.ts";
import type { CollectionQueryParams, CollectionRow, CollectionWithCreators, PaginatedCollectionResponseBody } from "$server/types/collection.d.ts";
import type { Collection } from "$types/api.d.ts";

export class CollectionController {
  static async getCollectionDetails(
    params: CollectionQueryParams,
  ): Promise<PaginatedCollectionResponseBody> {
    try {
      return await CollectionService.getCollectionDetails(params);
    } catch (error) {
      console.error("Error in CollectionController.getCollectionDetails:", error);
      throw error;
    }
  }

  static async getCollectionStamps(options: {
    limit?: number;
    page?: number;
    sortBy?: "ASC" | "DESC";
    includeMarketData?: boolean;
    editionsFilter?: "single" | "multiple";
    minStampCount?: number;
  }) {
    try {
      console.log("[CollectionController] getCollectionStamps started");
      const overallStartTime = Date.now();

      const {
        limit = 50,
        page = 1,
        sortBy = "DESC",
        includeMarketData = true,
        editionsFilter,
        // Exclude empty collections by default so the total count (used for
        // the overview page's count pill) stays in sync with the rendered
        // cards, which have always required at least one stamp to display.
        minStampCount = 1,
      } = options;

      // Get collections with market data
      console.log("[CollectionController] Fetching collection details...");
      const collectionsStartTime = Date.now();
      const collectionsResult = await CollectionService.getCollectionDetails({
        limit,
        page,
        sortBy,
        includeMarketData,
        minStampCount,
        ...(editionsFilter && { editionsFilter }),
      });
      console.log(`[CollectionController] Collection details fetched in ${Date.now() - collectionsStartTime}ms, got ${collectionsResult.data?.length || 0} collections`);

      if (!collectionsResult.data) {
        return {
          ...collectionsResult,
          data: [],
        };
      }

      if (!Array.isArray(collectionsResult.data)) {
        throw new Error("Invalid data structure from CollectionService: data is not an array");
      }

      if (collectionsResult.data.length === 0) {
        return {
          ...collectionsResult,
          data: [],
        };
      }

      // Get stamps for each collection to build image arrays
      const stampsByCollection = new Map<string, string[]>();

      console.log(`[CollectionController] Starting to fetch stamps for ${collectionsResult.data.length} collections...`);
      const stampsStartTime = Date.now();

      // Fetch stamps for all collections in parallel
      const stampPromises = collectionsResult.data.map(async (collection) => {
        const collectionId = collection.collection_id;

        try {
          // Get stamps for this collection with a reasonable limit for images
          const stampResults = await StampService.getStamps({
            collectionId,
            limit: 12, // Limit stamps per collection for image gallery
            sortBy: "DESC",
            type: "stamps",
            includeSecondary: false,
            skipTotalCount: true,
          });

          if (stampResults.stamps && Array.isArray(stampResults.stamps) && stampResults.stamps.length > 0) {
            const stamps: string[] = [];

            for (const stamp of stampResults.stamps) {
              if (!stamp.tx_hash || !stamp.stamp_mimetype) {
                continue;
              }

              // WORKAROUND: Manually set collection_id since database JOIN is not working
              // This ensures the grouping logic below works correctly
              stamp.collection_id = collectionId;

              const imageUrl = stamp.stamp_mimetype === "text/html" &&
                  typeof stamp.stamp === "number" && stamp.stamp > 0
                ? getStampPreviewUrl(stamp, { placeholderOnFail: true })
                : await getStampImageSrc(stamp);
              if (imageUrl && stamps.length < 12 && !stamps.includes(imageUrl)) {
                stamps.push(imageUrl);
              }
            }

            if (stamps.length > 0) {
              stampsByCollection.set(collectionId.toUpperCase(), stamps);
            }
          } else if (stampResults.stamps && !Array.isArray(stampResults.stamps)) {
            // Handle invalid data structure
            console.error(`Invalid stamp data structure for collection ${collectionId}: stamps is not an array`);
          }
        } catch (error) {
          console.error(`Error fetching stamps for collection ${collectionId}:`, error);
        }
      });

      // Wait for all stamp fetches to complete
      await Promise.all(stampPromises);
      console.log(`[CollectionController] Stamps fetched for all collections in ${Date.now() - stampsStartTime}ms`);

      // Map collections with their stamps
      const collections: Collection[] = collectionsResult.data.map(
        (collectionRow: CollectionRow) => {
          const collectionId = collectionRow.collection_id.toUpperCase();
          const stamps = stampsByCollection.get(collectionId) || [];

          // Use the second stamp if available, otherwise fall back to the first stamp
          const firstStampImage = stamps[1] || stamps[0] || null;

          // Convert CollectionRow to Collection format
          const collection: Collection = {
            collection_id: collectionRow.collection_id,
            collection_name: collectionRow.collection_name,
            collection_description: collectionRow.collection_description,
            creators: collectionRow.creators,
            stamp_count: collectionRow.stamp_count,
            total_editions: collectionRow.total_editions,
            img: collectionRow.img,
            first_stamp_image: firstStampImage,
            stamp_images: stamps,
            // Pass through market data from collection_market_data table
            ...(collectionRow.marketData && {
              marketData: collectionRow.marketData,
            }),
          };

          return collection;
        }
      );

      const result = {
        ...collectionsResult,
        data: collections as any,
        // No need to update total - it's already correct from database filtering
      };

      console.log(`[CollectionController] getCollectionStamps completed in ${Date.now() - overallStartTime}ms`);
      return result;
    } catch (error) {
      console.error("Error in CollectionController.getCollectionStamps:", error);
      throw error;
    }
  }

  static async getCollectionNames(
    params: CollectionQueryParams,
  ): Promise<PaginatedCollectionResponseBody> {
    try {
      return await CollectionService.getCollectionNames(params);
    } catch (error) {
      console.error("Error in CollectionController.getCollectionNames:", error);
      throw error;
    }
  }

  static async getCollectionById(
    collectionId: string,
    options: {
      includeMarketData?: boolean;
      stampLimit?: number;
      stampPage?: number;
    } = {},
  ): Promise<CollectionWithCreators | null> {
    try {
      return await CollectionService.getCollectionById(collectionId, options);
    } catch (error) {
      console.error("Error in CollectionController.getCollectionById:", error);
      throw error;
    }
  }
}
