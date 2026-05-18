/* ===== SRC20 RECENT MINTS GALLERY COMPONENT ===== */
import { SRC20MintingNarrow } from "$card";
import { containerBackground } from "$layout";
import {
  notificationBody,
  notificationContainerError,
  notificationHeading,
  notificationTextError,
} from "$notification";
import { subtitleNeutral, titleNeutral } from "$text";
import type { SRC20Row } from "$types/src20.d.ts";
import { useEffect, useState } from "preact/hooks";

/* ===== COMPONENT ===== */
export default function SRC20MintsGallery() {
  /* ===== STATE ===== */
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<SRC20Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* ===== EFFECTS ===== */
  useEffect(() => {
    const fetchTrendingActiveMintingTokens = async () => {
      try {
        const response = await fetch(
          "/api/v2/src20?op=DEPLOY&mintingStatus=minting&sortBy=TRENDING_MINTING_DESC&limit=5&page=1&includeMarketData=true&includeProgress=true",
          {
            headers: {
              "X-API-Version": "2.3",
            },
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch trending tokens: ${response.status}`,
          );
        }

        const data = await response.json();
        setTransactions(data.data || []);
        setError(null);
      } catch (error) {
        console.error("Error fetching trending tokens:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendingActiveMintingTokens();
  }, []);

  /* ===== RENDER ===== */
  return (
    <div class={`${containerBackground} items-start tablet:items-end`}>
      {/* ===== TITLE SECTION ===== */}
      <div>
        <h4 class={`${titleNeutral} tablet:hidden`}>
          TRENDING
        </h4>
        <h4
          class={`hidden tablet:block w-full tablet:text-right ${titleNeutral} !bg-gradient-to-l`}
        >
          TRENDING
        </h4>
      </div>
      <h3 class={`${subtitleNeutral} tablet:text-right mb-2`}>
        {isLoading ? <span class="animate-pulse">POPULAR TOKENS</span> : (
          "POPULAR TOKENS"
        )}
      </h3>

      {/* ===== LOADING OR CONTENT ===== */}
      {isLoading
        ? (
          <div class="flex flex-col w-full gap-3 mt-1">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                class={`loading-skeleton running w-full rounded-2xl ${
                  index === 0 ? "h-[34px]" : "h-[54px]"
                }`}
              />
            ))}
          </div>
        )
        : error
        ? (
          <div class={`mt-3 ${notificationContainerError}`}>
            <h6 class={`${notificationHeading} ${notificationTextError}`}>
              ERROR LOADING TRENDING TOKENS
            </h6>
            <h6 class={`${notificationBody} ${notificationTextError}`}>
              {error}
            </h6>
          </div>
        )
        : transactions.length === 0
        ? (
          <div class="text-color-grey-dark text-sm">
            NO TRENDING TOKENS FOUND
          </div>
        )
        : (
          <div class="-mb-3">
            <SRC20MintingNarrow
              data={transactions}
              fromPage="stamping/src20"
              timeframe="24H"
              onImageClick={() => {}}
            />
          </div>
        )}
    </div>
  );
}
