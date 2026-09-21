/* ===== SRC20 DETAIL HEADER COMPONENT ===== */
import { Button } from "$button";
import { Icon, PlaceholderImage } from "$icon";
import {
  body,
  container1,
  container2,
  containerGap,
  containerPill,
  StatItem,
  transitionAll,
} from "$layout";
import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import {
  abbreviateAddress,
  formatDate,
  formatNumber,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { constructStampUrl } from "$lib/utils/ui/media/imageUtils.ts";
import { tooltipButton } from "$notification";
import {
  cardPrice,
  labelXs,
  titlePrimary,
  valueNegative,
  valueNeutral,
  valuePositive,
  valueSm,
} from "$text";
import type {
  SRC20DetailHeaderProps,
  SRC20DetailInfoProps,
} from "$types/ui.d.ts";
import { useState } from "preact/hooks";

/* ===== COMPONENT ===== */
export function SRC20DetailHeader({
  deployment,
  marketInfo,
  _mintStatus,
  // highcharts, // ===== CHARTS WIDGET (temporarily disabled) =====
}: SRC20DetailHeaderProps) {
  /* ===== STATE ===== */
  const [imgError, setImgError] = useState(false);

  /* ===== COMPUTED VALUES ===== */
  // Process tick value (handle emoji)
  const tickValue = deployment.tick
    ? unicodeEscapeToEmoji(deployment.tick)
    : "N/A";

  // ✅ ENHANCED IMAGE URL LOGIC: Use new stamp_url and deploy_img fields
  // 1. Use deploy_img if provided (for deploy operations: https://stampchain.io/stamps/{deploy_tx}.svg)
  // 2. Use stamp_url if provided (for transaction stamps: https://stampchain.io/stamps/{tx_hash}.svg)
  // 3. Fallback to constructing URL from deployment.tx_hash if available
  // 4. If unavailable (or fails to load), fall back to the placeholder icon
  const imageUrl = imgError ? null : deployment.deploy_img ||
    deployment.stamp_url ||
    (deployment.tx_hash ? constructStampUrl(deployment.tx_hash) : null);

  // Minting state: still minting while progress hasn't reached 100%
  const progress = _mintStatus ? parseFloat(String(_mintStatus.progress)) : 100;
  const isMinting = !Number.isNaN(progress) && progress < 100;

  const floorPriceBTC = marketInfo?.floor_price_btc ?? 0; // ✅ v2.3 standardized field
  const volume24hBTC = marketInfo?.volume_24h_btc ?? 0; // ✅ v2.3 standardized field
  const marketCapBTC = marketInfo?.market_cap_btc ?? 0; // ✅ v2.3 standardized field
  const change24h = marketInfo?.change_24h ?? null; // ✅ v2.3 standardized field

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
  const marketCapBTCFormatted = formatMarketCap(marketCapBTC);

  /* ===== SHARED SUB-COMPONENTS (rendered once per breakpoint layout) ===== */
  const tokenImageAndName = (
    <div class="flex gap-5">
      <div class="w-11 h-11 shrink-0 rounded-2xl overflow-hidden">
        {imageUrl
          ? (
            <img
              src={imageUrl}
              class="w-full h-full object-contain rounded-2xl"
              alt={`${deployment.tick} token image`}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          )
          : (
            <PlaceholderImage
              variant="no-image"
              className="!rounded-2xl"
            />
          )}
      </div>
      {/* Token name */}
      <div class="flex">
        <h1 class={`mt-1 ${titlePrimary} uppercase`}>
          {tickValue}
        </h1>
      </div>
    </div>
  );

  const pricePill = (
    <div class="relative group/price">
      <div class={`${containerPill} ${cardPrice}`}>
        {floorPriceSatsFormatted}
      </div>
      <div
        class={`${tooltipButton} opacity-0 group-hover/price:opacity-100 transition-opacity duration-150`}
      >
        FLOOR PRICE
      </div>
    </div>
  );

  const changePill = (
    <div class="relative group/change">
      <div
        class={`${containerPill} font-medium text-xs select-none whitespace-nowrap ${
          change24h === null
            ? valueNeutral
            : change24h >= 0
            ? valuePositive
            : valueNegative
        }`}
      >
        {change24h !== null
          ? `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`
          : "N/A %"}
      </div>
      <div
        class={`${tooltipButton} opacity-0 group-hover/change:opacity-100 transition-opacity duration-150`}
      >
        24H CHANGE
      </div>
    </div>
  );

  const supplyValue = formatNumber(deployment.max ?? 0, 0);
  const limitValue = deployment.lim !== undefined
    ? formatNumber(deployment.lim as number, 0)
    : "N/A";
  const holdersValue = formatNumber(marketInfo?.holder_count ?? 0, 0);

  const progressBar = (
    <div
      class={`flex flex-col-reverse min-[460px]:flex-row items-center gap-1 min-[460px]:gap-3`}
    >
      <div class="w-24 min-[420px]:w-[140px] min-[460px]:w-[50px] min-[520px]:w-[90px] mobileMd:w-36 min-[640px]:w-40 mobileLg:w-20 min-[880px]:w-40 tablet:w-60 h-2 tablet:h-1.5 rounded-full bg-color-neutral-800 overflow-hidden">
        <div
          class={`h-full rounded-full bg-gradient-to-r from-color-primary-500 via-color-primary-400 to-color-primary-300 ${transitionAll}`}
          style={{ width: `${Math.min(Math.round(progress), 100)}%` }}
        />
      </div>
      <span
        class={`-mt-1 min-[460px]:-mt-0 min-[460px]:mr-5 ${valueSm} !text-xs min-[460px]:!text-sm`}
      >
        {progress.toFixed(1)}%
      </span>
    </div>
  );

  const mintButton = (
    <Button
      variant="flat"
      color="primary"
      size="xs"
      href={`/tool/src20/mint?tick=${
        encodeURIComponent(deployment.tick ?? "")
      }&trxType=olga`}
      class="rounded-2xl"
    >
      MINT
    </Button>
  );

  /* ===== RENDER ===== */
  return (
    <>
      <div class={`${body} ${containerGap}`}>
        {/* ===== TOKEN INFO CARD ===== */}
        <div class={`relative ${container1} p-0.5 flex-wrap`}>
          {/* ===== MOBILE LAYOUT (base, below mobileLg) ===== */}
          <div class="flex flex-col gap-3 mobileLg:hidden">
            {/* Row 1: image + ticker ... price pill / progress pill */}
            <div class="flex items-center justify-between gap-5">
              {tokenImageAndName}
              <div class="pr-2.5">
                <div class="flex items-center justify-end gap-3">
                  {isMinting
                    ? (
                      <>
                        {progressBar}
                        <div class="hidden min-[460px]:block">
                          {mintButton}
                        </div>
                      </>
                    )
                    : (
                      <>
                        {pricePill}
                        <div class="hidden min-[460px]:block mr-2.5">
                          {changePill}
                        </div>
                      </>
                    )}
                </div>
              </div>
            </div>

            {/* Row 2: (volume + market cap + supply ... change pill) or (holders + supply + limit ... mint button) */}
            <div class="flex items-center pb-1.5 px-5">
              {isMinting
                ? (
                  <>
                    <div class="flex-1 hidden min-[460px]:flex">
                      <StatItem
                        label="HOLDERS"
                        value={holdersValue}
                        align="left"
                      />
                    </div>
                    <div class="flex-1">
                      <StatItem
                        label="SUPPLY"
                        value={supplyValue}
                        class="text-left min-[460px]:text-center"
                      />
                    </div>
                    <div class="flex-1">
                      <StatItem
                        label="LIMIT"
                        value={limitValue}
                        class="text-center min-[460px]:text-right text-color-neutral-400"
                      />
                    </div>
                    <div class="flex min-[460px]:hidden -mr-2.5">
                      {mintButton}
                    </div>
                  </>
                )
                : (
                  <>
                    <div class="flex-1">
                      <StatItem
                        label="VOLUME"
                        value={volume24hBTCFormatted}
                        align="left"
                      />
                    </div>
                    <div class="flex-1">
                      <StatItem
                        label="MARKET CAP"
                        value={marketCapBTCFormatted}
                        align="center"
                      />
                    </div>
                    <div class="flex-1 flex justify-end">
                      <StatItem
                        label="SUPPLY"
                        value={supplyValue}
                        align="right"
                        class="hidden min-[460px]:block text-color-neutral-400"
                      />
                      <div class="flex min-[460px]:hidden -mr-2.5">
                        {changePill}
                      </div>
                    </div>
                  </>
                )}
            </div>
          </div>

          {/* ===== DESKTOP LAYOUT (mobileLg and up) ===== */}
          <div class="hidden mobileLg:flex flex-col gap-3">
            <div class="flex flex-row w-full items-center justify-between">
              {tokenImageAndName}

              {isMinting
                ? (
                  <>
                    {/* ===== MINT PROGRESS PILL ===== */}
                    <div class="flex items-center">
                      {progressBar}
                    </div>

                    {/* ===== HOLDERS + SUPPLY + LIMIT + MINT BUTTON ===== */}
                    <div class="flex items-center pr-5 gap-5">
                      <StatItem
                        label="HOLDERS"
                        value={holdersValue}
                        align="left"
                      />
                      <StatItem
                        label="SUPPLY"
                        value={supplyValue}
                        align="center"
                      />
                      <StatItem
                        label="LIMIT"
                        value={limitValue}
                        align="right"
                        class="text-color-neutral-400"
                      />
                      {mintButton}
                    </div>
                  </>
                )
                : (
                  <>
                    {/* ===== PRICE + 24H CHANGE PILLS ===== */}
                    <div class="flex items-center gap-3">
                      {pricePill}
                      {changePill}
                    </div>

                    {/* ===== VOLUME + MARKET CAP + SUPPLY ===== */}
                    <div class="flex items-center pr-5 gap-5">
                      <StatItem
                        label="VOLUME"
                        value={volume24hBTCFormatted}
                        align="left"
                      />
                      <StatItem
                        label="MARKET CAP"
                        value={marketCapBTCFormatted}
                        align="center"
                      />
                      <StatItem
                        label="SUPPLY"
                        value={supplyValue}
                        align="right"
                        class="text-color-neutral-400"
                      />
                    </div>
                  </>
                )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ===== SRC20 DETAIL INFO (rendered in the DetailsTableBase "INFO" tab) ===== */
export function SRC20DetailInfo({ deployment }: SRC20DetailInfoProps) {
  const deployTimestamp = new Date(deployment.block_time || 0);
  const [deployDatePart, deployTimePart] = formatDate(deployTimestamp, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).split(", ");
  const deployDateValue = (
    <>
      {deployDatePart.toUpperCase()}
      <span class="hidden min-[420px]:inline">
        {" - "}
        {deployTimePart.toUpperCase()}
      </span>
    </>
  );

  const creatorLink = (
    <a
      href={`/wallet/${deployment.destination}`}
      class="link-neutral-200"
    >
      {deployment.creator_name ||
        abbreviateAddress(deployment.destination || "", 7)}
    </a>
  );

  const txHashLink = deployment.tx_hash
    ? (
      <a
        href={`https://www.blockchain.com/explorer/transactions/btc/${deployment.tx_hash}`}
        target="_blank"
        rel="noopener noreferrer"
        class="link-neutral-200"
      >
        {abbreviateAddress(deployment.tx_hash, 7)}
      </a>
    )
    : "N/A";

  const limitValue = deployment.lim !== undefined
    ? formatNumber(deployment.lim as number, 0)
    : "N/A";

  const supplyValue = formatNumber(deployment.max ?? 0, 0);

  const hasSocialLinks = Boolean(
    deployment.x || deployment.tg || deployment.web || deployment.email,
  );

  const socialLinks = (
    <div class="float-right -mt-1.5 -mr-2 ml-4 flex shrink-0 justify-end items-start gap-2 tablet:gap-1 w-fit">
      {deployment.x && (
        <Icon
          type="iconButton"
          name="twitter"
          weight="normal"
          size="smR"
          color="neutral400"
          href={deployment.x}
          target="_blank"
        />
      )}
      {deployment.tg && (
        <Icon
          type="iconButton"
          name="telegram"
          weight="normal"
          size="smR"
          color="neutral400"
          href={deployment.tg}
          target="_blank"
        />
      )}
      {deployment.web && (
        <Icon
          type="iconButton"
          name="website"
          weight="normal"
          size="smR"
          color="neutral400"
          href={deployment.web}
          target="_blank"
        />
      )}
      {deployment.email && (
        <Icon
          type="iconButton"
          name="email"
          weight="normal"
          size="smR"
          color="neutral400"
          href={deployment.email}
          target="_blank"
        />
      )}
    </div>
  );

  return (
    <div class="flex flex-col gap-5">
      {(deployment.description || hasSocialLinks) && (
        <div class={`flow-root ${container2} px-3 py-2 gap-5`}>
          {
            /* Float must come before the text in DOM order so only the lines
              that overlap its height get indented; text below it uses the
              full width automatically. */
          }
          {hasSocialLinks && socialLinks}
          {deployment.description && (
            <div class="min-w-0">
              <h5 class={`${labelXs} text-left`}>ABOUT</h5>
              <h6
                class={`${valueSm} !text-base -mt-0.5 text-left !whitespace-normal break-words`}
              >
                {deployment.description}
              </h6>
            </div>
          )}
        </div>
      )}

      <div class={`${container2} px-3 py-2 space-y-3 flex-wrap`}>
        {/* Row 1: supply + limit + decimals */}
        <div class="flex items-center justify-between gap-5">
          <StatItem
            label="SUPPLY"
            value={supplyValue}
            align="left"
          />
          <StatItem label="LIMIT" value={limitValue} align="center" />
          <StatItem
            label="DECIMALS"
            value={deployment.deci}
            align="right"
            class="text-color-neutral-400"
          />
        </div>

        {/* Row 2: creator + deploy */}
        <div class="flex items-center justify-between gap-5">
          <StatItem label="CREATOR" value={creatorLink} align="left" />
          <StatItem
            label="DEPLOY"
            value={deployDateValue}
            align="right"
            class="text-color-neutral-400"
          />
        </div>

        {/* Row 3: tx hash + block # */}
        <div class="flex items-center justify-between gap-5">
          <StatItem label="TX HASH" value={txHashLink} align="left" />
          <StatItem
            label="BLOCK"
            value={deployment.block_index}
            align="right"
            class="text-color-neutral-400"
          />
        </div>
      </div>
    </div>
  );
}
