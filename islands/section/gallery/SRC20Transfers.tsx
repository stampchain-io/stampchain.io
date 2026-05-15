/* ===== SRC20 RECENT TRANSFERS GALLERY COMPONENT ===== */
import { StampCard } from "$card";
import { containerBackground } from "$layout";
import type { StampTransaction } from "$lib/types/stamping.ts";
import { constructStampUrl } from "$lib/utils/ui/media/imageUtils.ts";
import {
  notificationBody,
  notificationContainerError,
  notificationHeading,
  notificationTextError,
} from "$notification";
import { subtitleNeutral, titleNeutral } from "$text";
import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";

/* ===== COMPONENT ===== */
export default function SRC20TransfersGallery(): JSX.Element {
  /* ===== STATE ===== */
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<StampTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* ===== EFFECTS ===== */
  useEffect(() => {
    const fetchRecentTransactions = async () => {
      try {
        const response = await fetch(
          "/api/v2/src20?op=TRANSFER&sortBy=RECENT_DESC&limit=5&page=1",
          {
            headers: {
              "X-API-Version": "2.3",
            },
          },
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch recent transfers: ${response.status}`,
          );
        }
        const data = await response.json();
        setTransactions(data.data || []);
        setError(null);
      } catch (error) {
        console.error("Error fetching recent transfers:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentTransactions();
  }, []);

  /* ===== RENDER ===== */
  return (
    <div class={`${containerBackground} items-start tablet:items-end`}>
      {/* ===== TITLE SECTION ===== */}
      <div>
        <h4 class={`${titleNeutral} tablet:hidden`}>
          RECENT TRANSFERS
        </h4>
        <h4
          class={`hidden tablet:block w-full tablet:text-right ${titleNeutral} !bg-gradient-to-l`}
        >
          RECENT TRANSFERS
        </h4>
      </div>

      {/* Show block title with loading state */}
      <h3 class={`tablet:text-right ${subtitleNeutral}`}>
        {isLoading ? <span class="animate-pulse">BLOCK #XXXXXX</span> : (
          transactions.length > 0 && `BLOCK #${transactions[0].block_index}`
        )}
      </h3>

      {/* ===== LOADING OR CONTENT ===== */}
      {isLoading
        ? (
          <div class="w-full grid grid-cols-4 mobileMd:grid-cols-4 mobileLg:grid-cols-6 tablet:grid-cols-4 desktop:grid-cols-4 gap-5">
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                class="loading-skeleton running aspect-square rounded-2xl"
              />
            ))}
          </div>
        )
        : error
        ? (
          <div class={`mt-3 ${notificationContainerError}`}>
            <h6 class={`${notificationHeading} ${notificationTextError}`}>
              ERROR LOADING RECENT TRANSFERS
            </h6>
            <h6 class={`${notificationBody} ${notificationTextError}`}>
              {error}
            </h6>
          </div>
        )
        : transactions.length === 0
        ? (
          <div class="text-color-grey-dark text-sm">
            NO RECENT TRANSFERS FOUND
          </div>
        )
        : (
          <div class="w-full grid grid-cols-4 mobileMd:grid-cols-4 mobileLg:grid-cols-6 tablet:grid-cols-4 desktop:grid-cols-4 gap-6">
            {transactions.map((stamp, index) => (
              <StampCard
                key={index}
                stamp={stamp.stamp_url ? stamp : {
                  ...stamp,
                  stamp_url: constructStampUrl(stamp.tx_hash, "svg"),
                }}
                isRecentSale={false}
                showDetails={false}
              />
            ))}
          </div>
        )}
    </div>
  );
}
