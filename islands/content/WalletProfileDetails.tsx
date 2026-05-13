/* ===== WALLET PROFILE DETAILS COMPONENT ===== */
import { StatItem, StatTitle } from "$components/section/WalletComponents.tsx";
import { Icon } from "$icon";
import { containerBackground, containerGap } from "$layout";
import type { WalletOverviewInfo } from "$lib/types/wallet.d.ts";
import {
  abbreviateAddress,
  formatBTCAmount,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { tooltipIcon } from "$notification";
import { label, subtitleNeutral, titleNeutralLD, valueSm } from "$text";
import type { WalletProfileDetailsProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";
import EditCreatorNameModal from "$islands/modal/EditCreatorNameModal.tsx";
import { openModal } from "$islands/modal/states.ts";
import { walletContext } from "$client/wallet/wallet.ts";

/* ===== TYPES ===== */

/* ===== WALLET OVERVIEW SUBCOMPONENT ===== */
function WalletOverview({ walletData }: { walletData: WalletOverviewInfo }) {
  /* ===== STATE ===== */
  const [showCopied, setShowCopied] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [allowTooltip, setAllowTooltip] = useState(true);
  const [displayName, setDisplayName] = useState(
    walletData.creatorName || walletData.address,
  );

  /* ===== WALLET CONTEXT ===== */
  const { wallet } = walletContext;

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

  const handleEditClick = () => {
    openModal(
      <EditCreatorNameModal
        currentName={walletData.creatorName || ""}
        onSuccess={(newName) => {
          setDisplayName(newName);
          // Force a page refresh to update the server-rendered data
          globalThis.setTimeout(() => {
            globalThis.location.reload();
          }, 1500);
        }}
      />,
      "slideUpDown",
    );
  };

  /* ===== COMPUTED VALUES ===== */
  const bitNames = Array.isArray(walletData.src101?.names)
    ? walletData.src101.names.filter((name): name is string =>
      typeof name === "string"
    )
    : [];

  // Filter out the creatorName from the bitNames list to avoid duplication
  const additionalBitNames = bitNames.filter((name) =>
    walletData.creatorName !== `${name}.btc`
  );

  // Check if the connected wallet owns this profile
  const isOwner = wallet?.address &&
    wallet.address.toLowerCase() === walletData.address.toLowerCase();

  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col w-full">
      <h1 class={titleNeutralLD}>WALLET</h1>
      <div class="flex items-center gap-2">
        <h2 class={`${subtitleNeutral} tracking-wider`}>
          {displayName}
        </h2>
        {isOwner && (
          <Icon
            type="icon"
            name="edit"
            weight="normal"
            size="smR"
            color="greyDark"
            className="cursor-pointer hover:stroke-color-grey-light transition-colors duration-200"
            onClick={handleEditClick}
            ariaLabel="Edit creator name"
          />
        )}
      </div>
      <div class="flex flex-row-reverse justify-end gap-4">
        <div
          ref={copyButtonRef}
          class="relative peer"
          onMouseEnter={handleCopyMouseEnter}
          onMouseLeave={handleCopyMouseLeave}
        >
          <Icon
            type="iconButton"
            name="copy"
            weight="normal"
            size="smR"
            color="greyDark"
            className="mb-1"
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

        <h6
          class={`${label} text-color-grey hidden mobileMd:block mobileLg:hidden tablet:block transition-colors duration-200 peer-hover:text-color-grey-light`}
        >
          {walletData.address}
        </h6>
        <h6
          class={`${label} text-color-grey hidden mobileLg:block tablet:hidden transition-colors duration-200 peer-hover:text-color-grey-light`}
        >
          {abbreviateAddress(walletData.address, 13)}
        </h6>
        <h6
          class={`${label} text-color-grey block mobileMd:hidden transition-colors duration-200 peer-hover:text-color-grey-light`}
        >
          {abbreviateAddress(walletData.address, 12)}
        </h6>
      </div>

      {bitNames.length >= 2 && (
        <div className="flex overflow-y-auto pt-2">
          <div class="flex flex-col">
            {additionalBitNames.map((name) => (
              <h6
                key={name}
                class={valueSm}
              >
                {name}
                <span class="font-light">.btc</span>
              </h6>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== TOKEN STATS SUBCOMPONENT ===== */
function TokenStats(
  {
    src20Total,
    stampsTotal,
    dispensers,
    handleType: _handleType,

    stampValue: _stampValue,
    walletData,
  }: {
    src20Total: number;
    stampsTotal: number;
    dispensers: { open: number; closed: number; total: number };
    handleType: (type: string) => void;
    src20Value?: number;
    stampValue?: number;
    walletData: WalletOverviewInfo;
  },
) {
  /* ===== COMPUTED VALUES ===== */
  const bitNamesCount = Array.isArray(walletData.src101?.names)
    ? walletData.src101.names.filter((name): name is string =>
      typeof name === "string"
    ).length
    : 0;

  /* ===== RENDER ===== */
  return (
    <div className="flex flex-col w-full gap-1.5">
      <div className="flex justify-between items-end gap-3 flex-1">
        <Icon
          type="icon"
          name="bitcoins"
          weight="normal"
          size="sm"
          color="greyDark"
          className="mb-1.5"
        />
        <StatTitle
          label={
            <>
              {walletData.usdValue.toFixed(2)}{" "}
              <span class="font-extralight">USD</span>
            </>
          }
          value={
            <>
              {formatBTCAmount(walletData.balance, {
                includeSymbol: false,
                stripZeros: true,
              })} <span class="font-extralight">BTC</span>
            </>
          }
          align="right"
        />
      </div>

      <hr className="my-1.5" />

      <div className="flex justify-between flex-1">
        <StatItem
          label="SRC-20"
          value={src20Total?.toString()}
        />
        <StatItem
          label="BITNAMES"
          value={bitNamesCount.toString()}
          align="right"
        />
      </div>

      <div className="flex justify-between flex-1">
        <StatItem
          label="STAMPS"
          value={stampsTotal.toString()}
        />
        <StatItem
          label="LISTINGS"
          value={dispensers.open.toString()}
          align="right"
        />
      </div>
    </div>
  );
}

/* ===== WALLET STATS SUBCOMPONENT ===== */
function WalletStats(
  {
    stampsTotal,
    src20Total,
    stampsCreated: _stampsCreated,
    setShowItem = () => {},
    stampValue = 0,
    src20Value = 0,
    walletData,
  }: {
    stampsTotal: number;
    src20Total: number;
    stampsCreated: number;
    setShowItem?: (type: string) => void;
    stampValue?: number;
    src20Value?: number;
    walletData: WalletOverviewInfo;
  },
) {
  /* ===== EVENT HANDLERS ===== */
  const handleType = (type: string) => {
    setShowItem(type);
  };

  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col w-full">
      <TokenStats
        src20Total={src20Total}
        stampsTotal={stampsTotal}
        dispensers={walletData.dispensers ||
          { open: 0, closed: 0, total: 0 }}
        handleType={handleType}
        src20Value={src20Value}
        stampValue={stampValue}
        walletData={walletData}
      />
    </div>
  );
}

/* ===== MAIN WALLET PROFILE DETAILS COMPONENT ===== */
export default function WalletProfileDetails({
  walletData,
  stampsTotal,
  src20Total,
  stampsCreated,
  setShowItem,
}: WalletProfileDetailsProps) {
  /* ===== EFFECTS ===== */
  useEffect(() => {
    const status = (walletData as any).marketDataStatus;
    if (status) {
      if (status.overallStatus === "partial") {
        showToast(
          "Some market data might be delayed or unavailable at the moment",
          "warning",
          true,
        );
      } else if (status.overallStatus === "unavailable") {
        showToast(
          "Market data is currently unavailable",
          "warning",
          true,
        );
      }
    }
  }, []); // Empty dependency array - only run on mount

  /* ===== RENDER ===== */
  return (
    <div class={`flex flex-col mobileLg:flex-row ${containerGap}`}>
      <div className="flex flex-col h-fit w-full mobileLg:w-1/2 tablet:w-2/3">
        <div className={containerBackground}>
          <WalletOverview walletData={walletData} />
        </div>
      </div>
      <div
        class={`flex flex-col w-full mobileLg:w-1/2 tablet:w-1/3 ${containerGap}`}
      >
        <div className={containerBackground}>
          <WalletStats
            stampsTotal={stampsTotal}
            src20Total={src20Total}
            stampsCreated={stampsCreated}
            setShowItem={setShowItem}
            {...(walletData.stampValue !== undefined &&
              { stampValue: walletData.stampValue })}
            {...(walletData.src20Value !== undefined &&
              { src20Value: walletData.src20Value })}
            walletData={walletData}
          />
        </div>
      </div>
    </div>
  );
}
