import { Icon } from "$icon";
import { useFees } from "$lib/hooks/useFees.ts";
import { formatUSDValue } from "$lib/utils/ui/formatting/formatUtils.ts";
import { eyebrowNeutral, labelXs } from "$text";
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

interface BlockchainStatsProps {
  className?: string;
  /** Rendered below the transaction fees and above the divider. */
  children?: ComponentChildren;
}

/* ===== BLOCKCHAIN STATS ===== */
// Latest indexed block, BTC price and mempool priority fees.
// Full-width, no container; ends with an <hr> divider.
export function BlockchainStats(
  { className = "", children }: BlockchainStatsProps,
) {
  const { fees, loading: feesLoading } = useFees();
  // -1 signals the health service is unavailable
  const [latestBlock, setLatestBlock] = useState(0);
  const [healthLoading, setHealthLoading] = useState(true);

  /* ===== HEALTH DATA FETCHING ===== */
  useEffect(() => {
    let isMounted = true;

    const fetchHealthData = async () => {
      try {
        const response = await fetch("/api/v2/health");
        if (!isMounted) return;
        if (response.ok) {
          const healthData = await response.json();
          const blockHeight = healthData.services?.blockSync?.indexed || 0;
          setLatestBlock(blockHeight === 0 ? -1 : blockHeight);
        } else {
          setLatestBlock(-1);
        }
      } catch (err) {
        console.error("Health data fetch error:", err);
        if (isMounted) setLatestBlock(-1);
      } finally {
        if (isMounted) setHealthLoading(false);
      }
    };

    fetchHealthData();
    return () => {
      isMounted = false;
    };
  }, []);

  const isLoading = feesLoading || healthLoading;
  const btcPrice = fees?.btcPrice || 0;
  const lowFee = fees?.hourFee || 0;
  const mediumFee = fees?.halfHourFee || 0;
  const highFee = fees?.fastestFee || 0;

  const displayPrice = btcPrice && typeof btcPrice === "number"
    ? formatUSDValue(btcPrice).toLocaleString()
    : "0";

  const statValue = (
    iconName: string,
    content: ComponentChildren,
  ) => (
    <div class="flex items-center font-medium text-color-orange-400">
      <Icon
        type="icon"
        name={iconName}
        weight="normal"
        size="lg"
        color="neutral500"
        className="mr-3"
      />
      {content}
    </div>
  );

  return (
    <div class={`w-full ${labelXs} ${className}`}>
      {/* Row 1: Latest block (left) + BTC price (right) */}
      <div class="flex flex-row justify-between items-center w-full gap-4">
        {statValue(
          "bitcoinBlock",
          isLoading
            ? <span class="animate-pulse">XXX,XXX</span>
            : latestBlock === -1
            ? <span>N/A</span>
            : <span>{latestBlock.toLocaleString()}</span>,
        )}
        {statValue(
          "bitcoin",
          isLoading
            ? (
              <>
                <span class="animate-pulse">XXX,XXX</span>
                <span class="font-light">&nbsp;USD</span>
              </>
            )
            : (
              <>
                <span>{displayPrice}</span>
                <span class="font-light">&nbsp;USD</span>
              </>
            ),
        )}
      </div>

      {/* Row 2: Priority fees - 3 column layout */}
      <div class="flex flex-col space-y-1 w-full mt-3">
        <h6
          class={`pb-1 ${eyebrowNeutral} !text-color-neutral-500 text-center`}
        >
          TRANSACTION FEES
        </h6>
        <div class="flex justify-between">
          <Icon
            type="icon"
            name="speedSlow"
            weight="normal"
            size="lg"
            color="neutral500"
          />
          <Icon
            type="icon"
            name="speedMedium"
            weight="normal"
            size="lg"
            color="neutral500"
          />
          <Icon
            type="icon"
            name="speedFast"
            weight="normal"
            size="lg"
            color="neutral500"
          />
        </div>
        <div class="flex justify-between font-medium text-color-orange-400">
          {isLoading
            ? (
              <>
                <span class="animate-pulse pl-0.5">XX</span>
                <span class="animate-pulse">XX</span>
                <span class="animate-pulse pr-0.5">XX</span>
              </>
            )
            : (
              <>
                <span class="pl-0.5">{lowFee || "N/A"}</span>
                <span>{mediumFee || "N/A"}</span>
                <span class="pr-0.5">{highFee || "N/A"}</span>
              </>
            )}
        </div>
      </div>

      {/* Row 3: Optional content (e.g. recommended fee), above the divider */}
      {children && <div class="mt-3">{children}</div>}

      <hr class="mt-3 mb-3" />
    </div>
  );
}
