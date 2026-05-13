/* ===== COLLECTION OVERVIEW CARD COMPONENT ===== */
import { containerBackground, shadowGlowPurple } from "$layout";
import {
  abbreviateAddress,
  formatBTC,
  formatMarketCap,
  formatVolume,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { labelSm, valueSm } from "$text";
import type { CollectionWithOptionalMarketData } from "$types/index.d.ts";

/* ===== HELPERS ===== */
function abbreviateCollectionName(name: string): string {
  if (name.length <= 11) return name;
  return name.slice(0, 8) + "...";
}

/* ===== COMPONENT ===== */
export function CollectionCard(
  { collection }: { collection: CollectionWithOptionalMarketData },
) {
  // Early return if collection is undefined
  if (!collection) {
    return null;
  }

  // Safe access to collection properties with fallbacks
  const collectionName = collection.collection_name ?? "Unknown Collection";
  const stampImage = collection.first_stamp_image ?? collection.img ?? "";
  const stampCount = collection.stamp_count ?? 0;

  return (
    <a
      href={`/collection/detail/${collectionName}`}
      className={`${containerBackground} gap-6 hover:border-color-purple-light ${shadowGlowPurple} hover:border-solid border-2 border-transparent group`}
    >
      {/* ===== CARD HEADER ===== */}
      <div class="flex w-full gap-6">
        <div class="min-w-[106px] min-h-[106px] max-w-[106px] max-h-[106px] mobileMd:min-w-[98px] mobileMd:min-h-[98px] mobileMd:max-w-[98px] mobileMd:max-h-[98px] rounded-2xl aspect-stamp image-rendering-pixelated overflow-hidden">
          <div class="relative flex items-center justify-center w-full h-full">
            <img
              src={stampImage}
              alt=""
              className="w-full h-full"
            />
          </div>
        </div>
        <div class="w-full">
          <div class="flex flex-col justify-between w-full">
            {/* check code */}
            <h2 class="font-black text-2xl bg-gradient-to-l color-neutral-gradient color-gradient-hover tracking-wide inline-block w-fit">
              <span class="min-[420px]:hidden">
                {abbreviateCollectionName(collectionName)
                  .toUpperCase()}
              </span>
              <span class="hidden min-[420px]:inline">
                {collectionName.toUpperCase()}
              </span>
            </h2>

            <h5 class={`${labelSm} pt-0.75 mobileLg:pt-1.5`}>
              BY{" "}
              <span class={`${valueSm} normal-case`}>
                {collection.creators && collection.creators.length > 0
                  ? (
                    <>
                      {/* Use creator name if available, otherwise fall back to address */}
                      {collection.creator_names &&
                          collection.creator_names.length > 0
                        ? <span>{collection.creator_names?.[0] ?? ""}</span>
                        : (
                          <>
                            <span class="mobileMd:hidden">
                              {abbreviateAddress(
                                collection.creators?.[0] ?? "",
                                4,
                              )}
                            </span>
                            <span class="hidden mobileMd:inline mobileLg:hidden">
                              {abbreviateAddress(
                                collection.creators?.[0] ?? "",
                                7,
                              )}
                            </span>
                            <span class="hidden mobileLg:inline tablet:hidden">
                              {abbreviateAddress(
                                collection.creators?.[0] ?? "",
                                9,
                              )}
                            </span>
                            <span class="hidden tablet:inline">
                              {collection.creators?.[0] ?? ""}
                            </span>
                          </>
                        )}
                    </>
                  )
                  : "N/A"}
              </span>
            </h5>
          </div>
          <div class="flex flex-col mobileLg:flex-row justify-between w-full">
            <h5 class={`${labelSm} -mt-0.5`}>
              STAMPS{" "}
              <span class={valueSm}>
                {stampCount}
              </span>
            </h5>
            <h5 class={`${labelSm} -mt-0.5 hidden mobileLg:block`}>
              VOLUME{" "}
              <span class={valueSm}>
                {collection.marketData?.volume24hBTC
                  ? formatVolume(collection.marketData.volume24hBTC)
                  : "N/A"}
              </span>{"  "}
              <span class="text-color-grey-light">BTC</span>
            </h5>
          </div>
          <div class="flex flex-col mobileLg:flex-row justify-between w-full">
            <h5 class={`${labelSm} -mt-0.5`}>
              <span class="min-[400px]:hidden">PRICE</span>
              <span class="hidden min-[400px]:inline">FLOOR PRICE</span>{" "}
              <span class={valueSm}>
                {collection.marketData?.floorPriceBTC
                  ? formatBTC(collection.marketData.floorPriceBTC)
                  : "N/A"}
              </span>{" "}
              <span class="text-color-grey-light">BTC</span>
            </h5>
            <h5 class={`${labelSm} -mt-0.5`}>
              <span class="min-[400px]:hidden">MCAP</span>
              <span class="hidden min-[400px]:inline">MARKETCAP</span>{" "}
              <span class={valueSm}>
                {collection.marketData?.floorPriceBTC &&
                    collection.total_editions
                  ? formatMarketCap(
                    collection.marketData.floorPriceBTC *
                      collection.total_editions,
                  )
                  : "N/A"}
              </span>{" "}
              <span class="text-color-grey-light">BTC</span>
            </h5>
          </div>
        </div>
      </div>

      {/* ===== CARD GALLERY ===== */}
      <div class="grid grid-cols-3 mobileMd:grid-cols-4 mobileLg:grid-cols-6 tablet:grid-cols-8 desktop:grid-cols-10 gap-6">
        {collection.stamp_images &&
          collection.stamp_images.slice(-10).reverse().map(
            (imageUrl: string, index: number) => {
              return (
                <div
                  className={`w-full h-full rounded-2xl aspect-stamp image-rendering-pixelated overflow-hidden ${
                    index >= 8
                      ? "hidden desktop:block"
                      : index >= 6
                      ? "hidden tablet:block"
                      : index >= 4
                      ? "hidden mobileLg:block"
                      : index >= 3
                      ? "hidden mobileMd:block"
                      : ""
                  }`}
                >
                  <div class="relative flex items-center justify-center w-full h-full">
                    <img
                      key={index}
                      src={imageUrl}
                      alt=""
                      className={`min-w-[80%] min-h-[80%] object-contain pixelart`}
                    />
                  </div>
                </div>
              );
            },
          )}
      </div>
    </a>
  );
}
