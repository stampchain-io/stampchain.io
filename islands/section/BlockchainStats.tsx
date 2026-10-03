import { Icon } from "$icon";
import { useFees } from "$lib/hooks/useFees.ts";
import { formatUSDValue } from "$lib/utils/ui/formatting/formatUtils.ts";
import { tooltipButton } from "$notification";
import { eyebrowNeutral, labelXs } from "$text";
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

/* ===== FEE SPEED TOOLTIPS ===== */
// `align` overrides the default centered tooltip on the outer icons so the
// tooltip doesn't overflow the container edges.
const FEE_SPEEDS = [
  {
    name: "speedFast",
    feeKey: "fastestFee",
    label: "10 MINUTE CONFIRMATION TIME",
    align: "!-left-3 !translate-x-0",
  },
  {
    name: "speedMedium",
    feeKey: "halfHourFee",
    label: "HALF HOUR CONFIRMATION",
    align: "",
  },
  {
    name: "speedSlow",
    feeKey: "hourFee",
    label: "ONE HOUR CONFIRMATION",
    align: "",
  },
  {
    name: "speedNone",
    feeKey: "economyFee",
    label: "NO PRIORITY - CONFIRMATION WHENEVER",
    align: "!left-auto !-right-3 !translate-x-0",
  },
] as const;

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
  const feeValues = {
    economyFee: fees?.economyFee || 0,
    hourFee: fees?.hourFee || 0,
    halfHourFee: fees?.halfHourFee || 0,
    fastestFee: fees?.fastestFee || 0,
  };

  const displayPrice = btcPrice && typeof btcPrice === "number"
    ? formatUSDValue(btcPrice).toLocaleString()
    : "0";

  const statValue = (
    iconName: string,
    content: ComponentChildren,
  ) => (
    <div class="flex items-center font-medium text-color-neutral-400">
      <Icon
        type="icon"
        name={iconName}
        weight="normal"
        size="lg"
        color="neutral500"
        className="mr-2"
      />
      {content}
    </div>
  );

  return (
    <div class={`w-full ${labelXs} ${className}`}>
      <div class="flex flex-col items-start w-full gap-2">
        {/* Latest block + BTC price */}
        <div class="flex flex-row items-center justify-between w-full whitespace-nowrap">
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
          {statValue(
            "bitcoinBlock",
            isLoading
              ? <span class="animate-pulse">XXX,XXX</span>
              : latestBlock === -1
              ? <span>N/A</span>
              : <span>{latestBlock.toLocaleString()}</span>,
          )}
        </div>

        {/* Priority fees - 4 column layout */}
        <div class="flex flex-col w-full space-y-1">
          <h6
            class={`${eyebrowNeutral} text-center`}
          >
            TRANSACTION FEES
          </h6>
          <div class="flex justify-between">
            {FEE_SPEEDS.map(({ name, label, align }) => (
              <div key={name} class="relative group flex">
                <Icon
                  type="icon"
                  name={name}
                  weight="normal"
                  size="xl"
                  color="neutral500"
                />
                <div
                  class={`${tooltipButton} ${align} opacity-0 group-hover:opacity-100`}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
          <div class="flex justify-between font-medium text-color-neutral-400">
            {FEE_SPEEDS.map(({ feeKey }, index) => (
              <span
                key={feeKey}
                class={`${isLoading ? "animate-pulse" : ""} ${
                  index === 0
                    ? "pl-0.5"
                    : index === FEE_SPEEDS.length - 1
                    ? "pr-0.5"
                    : ""
                }`}
              >
                {isLoading ? "XX" : feeValues[feeKey] || "N/A"}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Optional content (e.g. recommended fee), above the divider */}
      {children && <div class="mt-3">{children}</div>}

      <hr class="mt-3 mb-3" />
    </div>
  );
}
