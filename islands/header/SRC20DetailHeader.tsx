/* ===== SRC20 DETAIL HEADER COMPONENT ===== */
import { StatItem, StatTitle } from "$components/section/WalletComponents.tsx";
import { Icon } from "$icon";
import { body, containerBackground, containerGap } from "$layout";
import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import {
  abbreviateAddress,
  formatDate,
  formatNumber,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { constructStampUrl } from "$lib/utils/ui/media/imageUtils.ts";
import {
  labelSm,
  titleNeutralLD,
  valueNegative,
  valueNeutral,
  valuePositive,
  valueSm,
} from "$text";
import type { SRC20DetailHeaderProps } from "$types/ui.d.ts";

/* ===== COMPONENT ===== */
export function SRC20DetailHeader({
  deployment,
  marketInfo,
}: SRC20DetailHeaderProps) {
  /* ===== COMPUTED VALUES ===== */
  // Process tick value (handle emoji)
  const tickValue = deployment.tick
    ? (() => {
      console.log("Original tick:", deployment.tick);
      const converted = unicodeEscapeToEmoji(deployment.tick);
      console.log("Converted tick:", converted);
      return converted;
    })()
    : "N/A";

  // Format deployment date
  const deployDate = formatDate(new Date(deployment.block_time || 0), {
    month: "short",
    year: "numeric",
  });

  // ✅ ENHANCED IMAGE URL LOGIC: Use new stamp_url and deploy_img fields
  // 1. Use deploy_img if provided (for deploy operations: https://stampchain.io/stamps/{deploy_tx}.svg)
  // 2. Use stamp_url if provided (for transaction stamps: https://stampchain.io/stamps/{tx_hash}.svg)
  // 3. Fallback to constructing URL from deployment.tx_hash if available
  // 4. Final fallback to placeholder image
  const imageUrl = deployment.deploy_img ||
    deployment.stamp_url ||
    (deployment.tx_hash ? constructStampUrl(deployment.tx_hash) : null) ||
    "/img/placeholder/stamp-no-image.svg";

  const floorPriceBTC = marketInfo?.floor_price_btc ?? 0; // ✅ v2.3 standardized field
  const volume24hBTC = marketInfo?.volume_24h_btc ?? 0; // ✅ v2.3 standardized field
  const volume7dBTC = marketInfo?.volume_7d_btc ?? 0; // ✅ v2.3 extended field (no more (as any) hacks!)
  const marketCapBTC = marketInfo?.market_cap_btc ?? 0; // ✅ v2.3 standardized field
  const change24h = marketInfo?.change_24h ?? null; // ✅ v2.3 standardized field
  const change7d = marketInfo?.change_7d ?? null; // ✅ v2.3 extended field (properly typed now!)

  // Convert floorPrice from BTC to Satoshis with smart formatting
  const floorPriceSats = floorPriceBTC * 1e8;

  // Smart price formatting
  const formatPrice = (sats: number): string => {
    if (sats === 0) return "0 SATS";
    if (sats < 0.0001) return sats.toFixed(6) + " SATS";
    if (sats < 1) return sats.toFixed(4) + " SATS";
    if (sats < 10) return sats.toFixed(2) + " SATS";
    if (sats < 100) return sats.toFixed(1) + " SATS";
    if (sats < 1000) return Math.round(sats).toLocaleString() + " SATS";
    return Math.round(sats).toLocaleString() + " SATS";
  };

  // Smart BTC volume formatting
  const formatBTCVolume = (btc: number): string => {
    if (btc === 0) return "0 BTC";
    if (btc < 0.0001) return btc.toFixed(6) + " BTC";
    if (btc < 0.01) return btc.toFixed(4) + " BTC";
    if (btc < 0.1) return btc.toFixed(3) + " BTC";
    if (btc < 1) return btc.toFixed(2) + " BTC";
    if (btc < 100) return btc.toFixed(2) + " BTC";
    return Math.round(btc).toLocaleString() + " BTC";
  };

  // Smart market cap formatting
  const formatMarketCap = (btc: number): string => {
    if (btc === 0) return "0 BTC";
    if (btc < 1) return btc.toFixed(2) + " BTC";
    if (btc < 100) return btc.toFixed(2) + " BTC";
    if (btc < 1000) return btc.toFixed(1) + " BTC";
    return Math.round(btc).toLocaleString() + " BTC";
  };

  const floorPriceSatsFormatted = formatPrice(floorPriceSats);
  const volume24hBTCFormatted = formatBTCVolume(volume24hBTC);
  const volume7dBTCFormatted = formatBTCVolume(volume7dBTC);
  const marketCapBTCFormatted = formatMarketCap(marketCapBTC);

  /* ===== RENDER ===== */
  return (
    <>
      <div class={`${body} ${containerGap}`}>
        {/* ===== TOKEN INFO CARD ===== */}
        <div class={`relative ${containerBackground} flex-wrap`}>
          <div class="flex flex-row w-full">
            {/* ===== TOKEN IMAGE AND CREATOR ===== */}
            <div class="flex gap-[18px] mobileMd:gap-[30px]">
              <img
                src={imageUrl}
                class="max-w-[80px] rounded-md relative z-10"
                alt={`${deployment.tick} token image`}
                loading="lazy"
              />
              <div class="relative z-10">
                {/* Token name and social links */}
                <div class="flex">
                  <h1 class={`${titleNeutralLD} uppercase`}>
                    {tickValue}
                  </h1>
                  <div class="flex gap-3 items-center">
                    {deployment.email && (
                      <Icon
                        type="iconButton"
                        name="email"
                        weight="normal"
                        size="xxs"
                        color="greyLight"
                        href={deployment.email}
                        target="_blank"
                      />
                    )}
                    {deployment.web && (
                      <Icon
                        type="iconButton"
                        name="website"
                        weight="normal"
                        size="xxs"
                        color="greyLight"
                        href={deployment.web}
                        target="_blank"
                      />
                    )}
                    {deployment.tg && (
                      <Icon
                        type="iconButton"
                        name="telegram"
                        weight="normal"
                        size="xxs"
                        color="greyLight"
                        href={deployment.tg}
                        target="_blank"
                      />
                    )}
                    {deployment.x && (
                      <Icon
                        type="iconButton"
                        name="twitter"
                        weight="normal"
                        size="xxs"
                        color="greyLight"
                        href={deployment.x}
                        target="_blank"
                      />
                    )}
                  </div>
                </div>
                {/* Creator information */}
                <h6 class={labelSm}>
                  CREATOR
                </h6>
                <h5 class="font-bold text-lg bg-gradient-to-r color-neutral-gradient color-gradient-hover tracking-wide -mt-1">
                  {deployment.creator_name ||
                    abbreviateAddress(deployment.destination || "")}
                </h5>
              </div>
            </div>

            {/* ===== DEPLOYMENT DETAILS ===== */}
            <div class="flex flex-col gap-0 justify-end ml-auto">
              <div class="hidden mobileLg:flex flex-col ml-20 mb-0 -space-y-0.5 items-center">
                <div class="flex items-center gap-1.5">
                  <h5 class={labelSm}>
                    DEPLOY
                  </h5>
                  <h6 class={valueSm}>
                    {deployDate.toUpperCase()}
                  </h6>
                </div>
                <div class="flex items-center gap-1.5">
                  <h5 class={labelSm}>
                    BLOCK #
                  </h5>
                  <h6 class={valueSm}>
                    {deployment.block_index}
                  </h6>
                </div>
                <div class="flex items-center gap-1.5">
                  <h5 class={labelSm}>
                    TX ID
                  </h5>
                  <h6 class={valueSm}>
                    {deployment.tx_hash
                      ? abbreviateAddress(deployment.tx_hash)
                      : "N/A"}
                  </h6>
                </div>
              </div>
            </div>

            {/* ===== TOKEN PARAMETERS ===== */}
            <div class="flex flex-col gap-0 justify-end items-end ml-auto">
              <div class="flex flex-col -space-y-0.5 text-right">
                <div class="flex items-center gap-1.5 justify-end">
                  <h5 class={labelSm}>
                    DECIMALS
                  </h5>
                  <h6 class={valueSm}>
                    {deployment.deci}
                  </h6>
                </div>
                <div class="flex items-center gap-1.5 justify-end">
                  <h5 class={labelSm}>
                    LIMIT
                  </h5>
                  <h6 class={valueSm}>
                    {deployment.lim !== undefined
                      ? formatNumber(deployment.lim as number, 0)
                      : "N/A"}
                  </h6>
                </div>
                <div class="flex items-center gap-1.5 justify-end">
                  <h5 class={labelSm}>
                    SUPPLY
                  </h5>
                  <h6 class={valueSm}>
                    {formatNumber(deployment.max ?? 0, 0)}
                  </h6>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== MARKET INFORMATION CARD ===== */}
        <div class={containerBackground}>
          {/* Market cap */}
          <div class="flex flex-col">
            <StatTitle
              label="MARKET CAP"
              value={marketCapBTCFormatted}
            />
          </div>

          {/* ===== VOLUME STATS ===== */}
          <div class="flex flex-wrap justify-between pt-6">
            <StatItem
              label="24H VOLUME"
              value={volume24hBTCFormatted}
              align="left"
            />
            <StatItem
              label="3 DAY VOLUME"
              value="N/A BTC"
              align="center"
            />
            <StatItem
              label="7 DAY VOLUME"
              value={volume7dBTCFormatted}
              align="right"
            />
          </div>

          {/* ===== PRICE STATS ===== */}
          <div class="flex flex-wrap justify-between pt-3">
            <StatItem
              label="PRICE"
              value={floorPriceSatsFormatted}
            />
            <StatItem
              label="24H CHANGE"
              value={change24h !== null
                ? (
                  <span
                    class={change24h >= 0 ? valuePositive : valueNegative}
                  >
                    {change24h >= 0 ? "+" : ""}
                    {change24h.toFixed(2)}%
                  </span>
                )
                : <span class={valueNeutral}>N/A %</span>}
              align="center"
            />
            <StatItem
              label="7 DAY CHANGE"
              value={change7d !== null
                ? (
                  <span
                    class={change7d >= 0 ? valuePositive : valueNegative}
                  >
                    {change7d >= 0 ? "+" : ""}
                    {change7d.toFixed(2)}%
                  </span>
                )
                : <span class={valueNeutral}>N/A %</span>}
              align="right"
            />
          </div>
        </div>
      </div>
    </>
  );
}
