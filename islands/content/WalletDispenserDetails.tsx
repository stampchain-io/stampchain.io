/* ===== WALLET DISPENSER DETAILS COMPONENT ===== */
import { Button } from "$button";
import { StatItem, StatTitle } from "$components/section/WalletComponents.tsx";
import { StampImage } from "$content";
import { Icon } from "$icon";
import BuyStampModal from "$islands/modal/BuyStampModal.tsx";
import { openModal } from "$islands/modal/states.ts";
import { containerBackground } from "$layout";
import type { WalletOverviewInfo } from "$lib/types/wallet.d.ts";
import {
  abbreviateAddress,
  formatBTCAmount,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { tooltipIcon } from "$notification";
import { headingGreyLD, textXs, titleNeutralLD } from "$text";
import type { StampRow } from "$types/stamp.d.ts";
import type { WalletDispenserDetailsProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */

/* ===== STAMP STATS SUBCOMPONENT ===== */
function StampStats({
  dispensers,
  walletData,
}: {
  dispensers: WalletOverviewInfo["dispensers"];
  walletData: WalletOverviewInfo;
}) {
  /* ===== TOOLTIP STATES ===== */
  const [isDivisibleTooltipVisible, setIsDivisibleTooltipVisible] = useState(
    false,
  );
  const [isKeyburnTooltipVisible, setIsKeyburnTooltipVisible] = useState(false);
  const [isLockedTooltipVisible, setIsLockedTooltipVisible] = useState(false);
  const [isUnlockedTooltipVisible, setIsUnlockedTooltipVisible] = useState(
    false,
  );

  /* ===== REFS ===== */
  const tooltipTimeoutRef = useRef<number | null>(null);

  /* ===== EFFECTS ===== */
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  /* ===== TOOLTIP HANDLERS ===== */
  const handleDivisibleMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setIsDivisibleTooltipVisible(true);
    }, 1500);
  };

  const handleDivisibleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setIsDivisibleTooltipVisible(false);
  };

  const handleKeyburnMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setIsKeyburnTooltipVisible(true);
    }, 1500);
  };

  const handleKeyburnMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setIsKeyburnTooltipVisible(false);
  };

  const handleLockedMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setIsLockedTooltipVisible(true);
    }, 1500);
  };

  const handleLockedMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setIsLockedTooltipVisible(false);
  };

  const handleUnlockedMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setIsUnlockedTooltipVisible(true);
    }, 1500);
  };

  const handleUnlockedMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setIsUnlockedTooltipVisible(false);
  };

  /* ===== VALIDATION ===== */
  if (!walletData.address.startsWith("1D") && !walletData.dispensers?.total) {
    return null;
  }

  /* ===== COMPUTED VALUES ===== */
  const firstDispenser = (dispensers as any)?.items?.[0];
  const stampData = firstDispenser?.stamp as StampRow;

  if (!firstDispenser || !stampData) return null;

  const creatorDisplay = (
    <span>
      <span className="hidden mobileMd:block mobileLg:hidden desktop:block">
        {stampData.creator_name || stampData.creator}
      </span>
      <span className="hidden tablet:block desktop:hidden">
        {abbreviateAddress(stampData.creator, 12)}
      </span>
      <span className="block mobileMd:hidden mobileLg:block tablet:hidden">
        {abbreviateAddress(stampData.creator, 8)}
      </span>
    </span>
  );

  const editionCount = stampData.divisible
    ? (stampData.supply / 100000000).toFixed(2)
    : stampData.supply > 100000
    ? "+100000"
    : stampData.supply.toFixed(2);

  const editionCountFormatted = stampData.divisible
    ? editionCount.toString()
    : parseInt(editionCount.toString()).toString();

  /* ===== RENDER ===== */
  return (
    <div className="flex flex-col gap-1.5 mobileLg:gap-3">
      <div className="flex pb-1.5 mobileLg:pb-3">
        <StatTitle
          label="STAMP"
          value={
            <>
              <span className="font-light">#</span>
              {stampData.stamp}
            </>
          }
          href={`/stamp/${stampData.stamp}`}
        />
      </div>
      <div className="flex justify-between">
        <StatItem
          label="CPID"
          value={stampData.cpid}
        />
        <div className="flex flex-1 justify-end items-end pb-1 space-x-[9px]">
          {stampData.divisible == true && (
            <div
              className="relative group"
              onMouseEnter={handleDivisibleMouseEnter}
              onMouseLeave={handleDivisibleMouseLeave}
            >
              <Icon
                type="icon"
                name="divisible"
                weight="normal"
                size="custom"
                color="greyLight"
                className="w-[23px] h-[23px]"
              />
              <div
                className={`${tooltipIcon} ${
                  isDivisibleTooltipVisible ? "opacity-100" : "opacity-0"
                } -mb-[1px]`}
              >
                DIVISIBLE
              </div>
            </div>
          )}
          {stampData.keyburn != null && (
            <div
              className="relative group"
              onMouseEnter={handleKeyburnMouseEnter}
              onMouseLeave={handleKeyburnMouseLeave}
            >
              <Icon
                type="icon"
                name="keyburned"
                weight="normal"
                size="xs"
                color="greyLight"
              />
              <div
                className={`${tooltipIcon} ${
                  isKeyburnTooltipVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                KEYBURNED
              </div>
            </div>
          )}
          {stampData.locked && (
            <div
              className="relative group"
              onMouseEnter={handleLockedMouseEnter}
              onMouseLeave={handleLockedMouseLeave}
            >
              <Icon
                type="icon"
                name="locked"
                weight="normal"
                size="xs"
                color="greyLight"
              />
              <div
                className={`${tooltipIcon} ${
                  isLockedTooltipVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                LOCKED
              </div>
            </div>
          )}
          {!stampData.locked && (
            <div
              className="relative group"
              onMouseEnter={handleUnlockedMouseEnter}
              onMouseLeave={handleUnlockedMouseLeave}
            >
              <Icon
                type="icon"
                name="unlocked"
                weight="normal"
                size="xs"
                color="greyLight"
              />
              <div
                className={`${tooltipIcon} ${
                  isUnlockedTooltipVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                UNLOCKED
              </div>
            </div>
          )}
        </div>
      </div>
      <div class="flex justify-between">
        <StatItem
          label="BY"
          value={creatorDisplay}
          href={`/wallet/${stampData.creator}`}
        />
        <StatItem
          label="EDITIONS"
          value={editionCountFormatted}
          align="right"
        />
      </div>
    </div>
  );
}

/* ===== DISPENSER STATS SUBCOMPONENT ===== */
function DispenserStats({
  dispensers,
  btcPrice,
}: {
  dispensers: WalletOverviewInfo["dispensers"];
  btcPrice: number;
}) {
  const [fee, setFee] = useState(1);
  const firstDispenser = (dispensers as any)?.items?.[0];

  const handleOpenBuyModal = () => {
    const modalContent = (
      <BuyStampModal
        stamp={firstDispenser.stamp}
        fee={fee}
        handleChangeFee={setFee}
        dispenser={firstDispenser}
      />
    );
    openModal(modalContent, "slideUpDown");
  };

  /* ===== RENDER ===== */
  return (
    <div className="flex flex-col gap-1.5 mobileLg:gap-3 pt-3 mobileLg:pt-6">
      {/* Open / close */}
      <div className="flex justify-between">
        <StatItem
          label="OPENED"
          value={firstDispenser?.block_index
            ? firstDispenser.block_index.toString()
            : "N/A"}
        />
        <StatItem
          label="CLOSED"
          value={!firstDispenser?.close_block_index ||
              firstDispenser.close_block_index <= 0
            ? "OPEN"
            : firstDispenser.close_block_index.toString()}
          align="right"
        />
      </div>
      {/* Dispenser Stats / price display */}
      <div className="flex justify-between">
        <StatItem
          label="ESCROW"
          value={
            <>
              <span class={textXs}>
                {firstDispenser.escrow_quantity.toString()}
              </span>
            </>
          }
        />
        <StatItem
          label="GIVE"
          value={
            <>
              <span class={textXs}>
                {firstDispenser.give_quantity.toString()}
              </span>
            </>
          }
          align="center"
        />
        <StatItem
          label="REMAIN"
          value={
            <>
              <span class={textXs}>
                {firstDispenser.give_remaining.toString()}
              </span>
            </>
          }
          align="center"
        />
        <StatItem
          label={
            <>
              {((firstDispenser.satoshirate || 0) / 100000000 * btcPrice)
                .toFixed(2)} <span class="font-light">USD</span>
            </>
          }
          value={
            <>
              {formatBTCAmount(
                (firstDispenser.satoshirate || 0) / 100000000,
                {
                  excludeSuffix: true,
                },
              )} <span class="font-extralight">BTC</span>
            </>
          }
          align="right"
        />
      </div>

      {/* Buy Button */}
      {firstDispenser?.give_remaining > 0 && (
        <div className="flex justify-end pt-1.5">
          <Button
            variant="outline"
            color="purple"
            size="md"
            onClick={handleOpenBuyModal}
          >
            BUY
          </Button>
        </div>
      )}
    </div>
  );
}

/* ===== WALLET OVERVIEW SUBCOMPONENT ===== */
function WalletOverview({ walletData }: { walletData: WalletOverviewInfo }) {
  /* ===== STATE ===== */
  const [showCopied, setShowCopied] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [allowTooltip, setAllowTooltip] = useState(true);

  /* ===== REFS ===== */
  const copyButtonRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);

  /* ===== EFFECTS ===== */
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  /* ===== EVENT HANDLERS ===== */
  const handleCopyMouseEnter = () => {
    if (allowTooltip) {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }

      tooltipTimeoutRef.current = globalThis.setTimeout(() => {
        const buttonRect = copyButtonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          setIsTooltipVisible(true);
        }
      }, 1500);
    }
  };

  const handleCopyMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setIsTooltipVisible(false);
    setShowCopied(false);
    setAllowTooltip(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(walletData.address);
      setShowCopied(true);
      setIsTooltipVisible(false);
      setAllowTooltip(false);

      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }

      tooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setShowCopied(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col">
      <div class="flex pb-1.5 mobileLg:pb-3">
        <p class={titleNeutralLD}>DISPENSER</p>
      </div>
      <div class="flex gap-6">
        <div class="flex">
          <p
            class={`${headingGreyLD} hidden mobileMd:block mobileLg:hidden desktop:block`}
          >
            {walletData.address}
          </p>
          <p class={`${headingGreyLD} hidden tablet:block desktop:hidden`}>
            {abbreviateAddress(walletData.address, 14)}
          </p>
          <p
            class={`${headingGreyLD} block mobileMd:hidden mobileLg:block tablet:hidden`}
          >
            {abbreviateAddress(walletData.address, 10)}
          </p>
        </div>

        <div
          ref={copyButtonRef}
          class="relative -pt-0.5"
          onMouseEnter={handleCopyMouseEnter}
          onMouseLeave={handleCopyMouseLeave}
        >
          <Icon
            type="iconButton"
            name="copy"
            weight="normal"
            size="mdR"
            color="grey"
            onClick={copy}
          />
          <div
            class={`${tooltipIcon} ${
              isTooltipVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            COPY ADDY
          </div>
          <div
            class={`${tooltipIcon} ${showCopied ? "opacity-100" : "opacity-0"}`}
          >
            ADDY COPIED
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== MAIN COMPONENT ===== */
export default function WalletDispenserDetails({
  walletData,
}: WalletDispenserDetailsProps) {
  /* ===== COMPUTED VALUES ===== */
  const firstDispenser = (walletData.dispensers as any)?.items?.[0];
  const stampData = firstDispenser?.stamp;

  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col mobileLg:flex-row gap-6">
      <div class="flex flex-col w-full mobileLg:w-1/2 desktop:w-2/3 gap-6">
        <div className={containerBackground}>
          <WalletOverview walletData={walletData} />
          <DispenserStats
            dispensers={walletData.dispensers}
            btcPrice={walletData.btcPrice}
          />
        </div>
        <div className={containerBackground}>
          <StampStats
            dispensers={walletData.dispensers}
            walletData={walletData}
          />
        </div>
      </div>
      {stampData && (
        <div class="flex flex-col w-full mobileLg:w-1/2 desktop:w-1/3">
          <div className={containerBackground}>
            <StampImage
              stamp={stampData}
              className="w-full h-full"
              flag={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
