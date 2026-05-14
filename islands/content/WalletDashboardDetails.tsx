/* ===== WALLET DASHBOARD DETAILS COMPONENT ===== */
/* @baba - cleanup button/icon code */
import { StatItem, StatTitle } from "$components/section/WalletComponents.tsx";
import { Icon } from "$icon";
import RecieveAddyModal from "$islands/modal/RecieveAddyModal.tsx";
import SendBTCModal from "$islands/modal/SendBTCModal.tsx";
import { openModal } from "$islands/modal/states.ts";
import { containerBackground } from "$layout";
import type { WalletOverviewInfo } from "$lib/types/index.d.ts";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";
import { tooltipIcon } from "$notification";
import { titleNeutral } from "$text";
import type { WalletDashboardDetailsProps } from "$types/ui.d.ts";
import { useEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */

/* ===== WALLET OVERVIEW SUBCOMPONENT ===== */
function WalletOverview(
  { walletData, onSend, onReceive }: {
    walletData: WalletOverviewInfo;
    onSend: () => void;
    onReceive: () => void;
  },
) {
  /* ===== STATE ===== */
  const [hideBalance, setHideBalance] = useState<boolean>(false);
  const [showCopied, setShowCopied] = useState(false);
  const [tooltipText, setTooltipText] = useState("HIDE BALANCE");

  /* ===== TOOLTIP STATES ===== */
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [allowTooltip, setAllowTooltip] = useState(true);
  const [isSendTooltipVisible, setIsSendTooltipVisible] = useState(false);
  const [allowSendTooltip, setAllowSendTooltip] = useState(true);
  const [isReceiveTooltipVisible, setIsReceiveTooltipVisible] = useState(false);
  const [allowReceiveTooltip, setAllowReceiveTooltip] = useState(true);
  const [isHistoryTooltipVisible, setIsHistoryTooltipVisible] = useState(false);
  const [allowHistoryTooltip, setAllowHistoryTooltip] = useState(true);
  const [isBalanceTooltipVisible, setIsBalanceTooltipVisible] = useState(false);
  const [allowBalanceTooltip, setAllowBalanceTooltip] = useState(true);

  /* ===== REFS ===== */
  const copyButtonRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const sendButtonRef = useRef<HTMLDivElement>(null);
  const sendTooltipTimeoutRef = useRef<number | null>(null);
  const receiveButtonRef = useRef<HTMLDivElement>(null);
  const receiveTooltipTimeoutRef = useRef<number | null>(null);
  const historyButtonRef = useRef<HTMLDivElement>(null);
  const historyTooltipTimeoutRef = useRef<number | null>(null);
  const balanceButtonRef = useRef<HTMLButtonElement>(null);
  const balanceTooltipTimeoutRef = useRef<number | null>(null);

  /* ===== EFFECTS ===== */
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }
      if (sendTooltipTimeoutRef.current) {
        globalThis.clearTimeout(sendTooltipTimeoutRef.current);
      }
      if (receiveTooltipTimeoutRef.current) {
        globalThis.clearTimeout(receiveTooltipTimeoutRef.current);
      }
      if (historyTooltipTimeoutRef.current) {
        globalThis.clearTimeout(historyTooltipTimeoutRef.current);
      }
      if (balanceTooltipTimeoutRef.current) {
        globalThis.clearTimeout(balanceTooltipTimeoutRef.current);
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
    if (!hideBalance) {
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
    }
  };

  const handleSendMouseEnter = () => {
    if (allowSendTooltip) {
      if (sendTooltipTimeoutRef.current) {
        globalThis.clearTimeout(sendTooltipTimeoutRef.current);
      }

      sendTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        const buttonRect = sendButtonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          setIsSendTooltipVisible(true);
        }
      }, 1500);
    }
  };

  const handleSendMouseLeave = () => {
    if (sendTooltipTimeoutRef.current) {
      globalThis.clearTimeout(sendTooltipTimeoutRef.current);
    }
    setIsSendTooltipVisible(false);
    setAllowSendTooltip(true);
  };

  const handleReceiveMouseEnter = () => {
    if (allowReceiveTooltip) {
      if (receiveTooltipTimeoutRef.current) {
        globalThis.clearTimeout(receiveTooltipTimeoutRef.current);
      }

      receiveTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        const buttonRect = receiveButtonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          setIsReceiveTooltipVisible(true);
        }
      }, 1500);
    }
  };

  const handleReceiveMouseLeave = () => {
    if (receiveTooltipTimeoutRef.current) {
      globalThis.clearTimeout(receiveTooltipTimeoutRef.current);
    }
    setIsReceiveTooltipVisible(false);
    setAllowReceiveTooltip(true);
  };

  const handleHistoryMouseEnter = () => {
    if (allowHistoryTooltip) {
      if (historyTooltipTimeoutRef.current) {
        globalThis.clearTimeout(historyTooltipTimeoutRef.current);
      }

      historyTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        const buttonRect = historyButtonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          setIsHistoryTooltipVisible(true);
        }
      }, 1500);
    }
  };

  const handleHistoryMouseLeave = () => {
    if (historyTooltipTimeoutRef.current) {
      globalThis.clearTimeout(historyTooltipTimeoutRef.current);
    }
    setIsHistoryTooltipVisible(false);
    setAllowHistoryTooltip(true);
  };

  const handleBalanceMouseEnter = () => {
    if (allowBalanceTooltip) {
      // Set tooltip text based on current state when mouse enters
      setTooltipText(hideBalance ? "SHOW BALANCE" : "HIDE BALANCE");

      if (balanceTooltipTimeoutRef.current) {
        globalThis.clearTimeout(balanceTooltipTimeoutRef.current);
      }

      balanceTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        const buttonRect = balanceButtonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          setIsBalanceTooltipVisible(true);
        }
      }, 1500);
    }
  };

  const handleBalanceMouseLeave = () => {
    if (balanceTooltipTimeoutRef.current) {
      globalThis.clearTimeout(balanceTooltipTimeoutRef.current);
    }
    setIsBalanceTooltipVisible(false);
    setAllowBalanceTooltip(true);
  };

  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col">
      <div class="flex justify-between">
        <div class={`${hideBalance ? "blur-sm" : ""}`}>
          <h6 class="text-color-grey-light font-extralight text-2xl mobileMd:text-3xl mobileLg:text-4xl select-none">
            <span class="font-bold">
              {hideBalance ? "*********" : walletData.balance}
            </span>{" "}
            BTC
          </h6>
          <h6 class="text-color-grey font-extralight text-base mobileMd:text-lg mobileLg:text-xl select-none pt-[3px]">
            <span class="font-medium">
              {hideBalance ? "*****" : walletData.usdValue.toLocaleString()}
            </span>{" "}
            USD
          </h6>
        </div>
        <button
          type="button"
          ref={balanceButtonRef}
          class="mb-7 mobileMd:mb-[34px]"
          onClick={() => {
            setHideBalance(!hideBalance);
            setIsBalanceTooltipVisible(false);
            setAllowBalanceTooltip(false);
          }}
          onMouseEnter={handleBalanceMouseEnter}
          onMouseLeave={handleBalanceMouseLeave}
        >
          {hideBalance
            ? (
              <div class="relative">
                <Icon
                  type="iconButton"
                  name="view"
                  weight="normal"
                  size="mdR"
                  color="greyLight"
                  ariaLabel="Show Balance"
                />
                <div
                  class={`${tooltipIcon} ${
                    isBalanceTooltipVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {tooltipText}
                </div>
              </div>
            )
            : (
              <div class="relative">
                <Icon
                  type="iconButton"
                  name="hide"
                  weight="normal"
                  size="mdR"
                  color="greyLight"
                  ariaLabel="Hide Balance"
                />
                <div
                  class={`${tooltipIcon} ${
                    isBalanceTooltipVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {tooltipText}
                </div>
              </div>
            )}
        </button>
      </div>

      <div class="flex items-center pt-3 mobileMd:pt-6 text-base mobileLg:text-lg text-color-purple-semilight font-medium select-none">
        <h6 class="hidden tablet:block">
          {abbreviateAddress(walletData.address, 12)}
        </h6>
        <h6 class="hidden mobileLg:block tablet:hidden">
          {abbreviateAddress(walletData.address, 10)}
        </h6>
        <h6 class="block mobileLg:hidden">
          {abbreviateAddress(walletData.address, 8)}
        </h6>
      </div>
      <div class="flex pt-[3px] mobileMd:pt-1.5 gap-3 mobileLg:gap-[9px]">
        <div
          ref={copyButtonRef}
          class="relative"
          onMouseEnter={handleCopyMouseEnter}
          onMouseLeave={handleCopyMouseLeave}
        >
          <Icon
            type="iconButton"
            name="copy"
            weight="normal"
            size="mdR"
            color="greyLight"
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
        <div
          ref={sendButtonRef}
          class="relative group"
          onMouseEnter={handleSendMouseEnter}
          onMouseLeave={handleSendMouseLeave}
        >
          <Icon
            type="iconButton"
            name="send"
            weight="normal"
            size="mdR"
            color="greyLight"
            onClick={() => {
              setIsSendTooltipVisible(false);
              onSend();
            }}
          />
          <div
            class={`${tooltipIcon} ${
              isSendTooltipVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            SEND
          </div>
        </div>
        <div
          ref={receiveButtonRef}
          class="relative group"
          onMouseEnter={handleReceiveMouseEnter}
          onMouseLeave={handleReceiveMouseLeave}
        >
          <Icon
            type="iconButton"
            name="receive"
            weight="normal"
            size="mdR"
            color="greyLight"
            onClick={() => {
              setIsReceiveTooltipVisible(false);
              onReceive();
            }}
          />
          <div
            class={`${tooltipIcon} ${
              isReceiveTooltipVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            RECEIVE
          </div>
        </div>
        <div
          ref={historyButtonRef}
          class="relative group"
          onMouseEnter={handleHistoryMouseEnter}
          onMouseLeave={handleHistoryMouseLeave}
        >
          <a
            href={`https://mempool.space/address/${walletData.address}`}
            target="_blank"
            onClick={() => setIsHistoryTooltipVisible(false)}
          >
            <Icon
              type="iconButton"
              name="history"
              weight="normal"
              size="mdR"
              color="greyLight"
            />
          </a>
          <div
            class={`${tooltipIcon} ${
              isHistoryTooltipVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            HISTORY
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== DASHBOARD PROFILE SUBCOMPONENT ===== */
function DashboardProfile() {
  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col">
      <div class="flex">
        <div class="flex items-center justify-center relative -top-3 -left-3 mobileMd:-top-6 mobileMd:-left-6 w-[58px] h-[58px] mobileLg:w-[76px] mobileLg:h-[76px] bg-color-purple-semilight rounded-full">
          <img
            src="/img/banner/kevin.png"
            alt="Avatar"
            class="w-[54px] h-[54px] mobileLg:w-[72px] mobileLg:h-[72px] rounded-full"
          />
        </div>
        <div class="flex ml-1.5 mobileMd:ml-0 mt-1.5 mobileMd:-mt-2 mobileLg:mt-0">
          <h5 class={titleNeutral}>
            ANONYMOUS
          </h5>
        </div>
      </div>
      <div class="flex justify-between">
        <div class="flex flex-col gap-0.5">
          <h6 class="text-color-grey font-light text-base mobileLg:text-lg">
            anonymous.btc
          </h6>
          <h6 class="text-color-grey font-light text-base mobileLg:text-lg">
            kevin.btc
          </h6>
          <h6 class="text-color-grey font-light text-base mobileLg:text-lg">
            pepe.btc
          </h6>
          <h6 class="text-color-grey font-light text-base mobileLg:text-lg">
            satoshi.btc
          </h6>
        </div>
        <div class="flex">
          <h6 class="text-color-grey-semidark font-medium text-sm mobileLg:text-base">
            website // X
          </h6>
        </div>
      </div>
      <div class="flex justify-end">
        <div class="flex flex-col gap-1.5 mobileMd:gap-3">
          <Icon
            type="iconButton"
            name="website"
            weight="normal"
            size="mdR"
            color="greyLight"
          />

          <Icon
            type="iconButton"
            name="collection"
            weight="normal"
            size="mdR"
            color="greyLight"
          />

          <Icon
            type="iconButton"
            name="stamp"
            weight="normal"
            size="mdR"
            color="greyLight"
          />
        </div>
      </div>
    </div>
  );
}

/* ===== WALLET STATS SUBCOMPONENT ===== */
function WalletStats(
  {
    stampsTotal,
    src20Total,
    stampsCreated,
    dispensers,
    setShowItem = () => {},
    stampValue = 0,
    src20Value = 0,
  }: {
    stampsTotal: number;
    src20Total: number;
    stampsCreated: number;
    dispensers?: { open: number; closed: number; total: number };
    setShowItem?: (type: string) => void;
    stampValue?: number;
    src20Value?: number;
  },
) {
  /* ===== EVENT HANDLERS ===== */
  const handleType = (type: string) => {
    setShowItem(type);
  };

  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col mobileLg:flex-row gap-3 mobileMd:gap-6">
      <div class="flex flex-col w-full">
        <div class={containerBackground}>
          <StampStats
            stampsTotal={stampsTotal}
            stampsCreated={stampsCreated}
            handleType={handleType}
            stampValue={stampValue}
          />
        </div>
      </div>
      <div class="flex flex-col w-full">
        <div class={containerBackground}>
          <DispenserStats
            dispensers={{
              open: dispensers?.open ?? 0,
              closed: dispensers?.closed ?? 0,
              total: dispensers?.total ?? 0,
            }}
            handleType={handleType}
          />
        </div>
      </div>
      <div class="flex flex-col w-full">
        <div class={containerBackground}>
          <TokenStats
            src20Total={src20Total}
            handleType={handleType}
            src20Value={src20Value}
          />
        </div>
      </div>
    </div>
  );
}

/* ===== STAMP STATS SUBCOMPONENT ===== */
function StampStats(
  { stampsTotal, stampsCreated, stampValue = 0 }: {
    stampsTotal: number;
    stampsCreated: number;
    handleType: (type: string) => void;
    stampValue?: number;
  },
) {
  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col gap-1.5 mobileLg:gap-3">
      <div class="flex pb-1.5 mobileLg:pb-3">
        <StatTitle label="STAMPS" value={stampsTotal.toString()} />
      </div>
      <div class="flex justify-between">
        <StatItem label="EDITIONS" value="239" />
        <StatItem label="CREATED" value={stampsCreated.toString()} />
        <StatItem
          label="VALUE"
          value={
            <>
              {stampValue > 0 ? stampValue.toFixed(8) : "N/A"}{" "}
              <span class="font-light">BTC</span>
            </>
          }
          align="right"
        />
      </div>
      <div class="flex justify-between">
        <StatItem label="COLLECTIONS" value="8" />
        <StatItem
          label="LISTINGS"
          value="4"
          align="right"
        />
      </div>
    </div>
  );
}

/* ===== DISPENSER STATS SUBCOMPONENT ===== */
function DispenserStats(
  { dispensers = { open: 0, closed: 0, total: 0 } }: {
    handleType: (type: string) => void;
    dispensers?: { open: number; closed: number; total: number };
  },
) {
  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col gap-1.5 mobileLg:gap-3">
      <div class="flex pb-1.5 mobileLg:pb-3">
        <StatTitle label="LISTINGS" value={dispensers.open.toString()} />
      </div>
      <div class="flex justify-between">
        <StatItem label="ATOMIC" value="N/A" />
        <StatItem
          label="DISPENSERS"
          value={dispensers.total.toString()}
          align="right"
        />
      </div>
    </div>
  );
}

/* ===== TOKEN STATS SUBCOMPONENT ===== */
function TokenStats(
  { src20Total, src20Value = 0 }: {
    src20Total: number;
    handleType: (type: string) => void;
    src20Value?: number;
  },
) {
  /* ===== COMPUTED VALUES ===== */
  const totalValue = src20Value || 0;

  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col gap-1.5 mobileLg:gap-3">
      <div class="flex pb-1.5 mobileLg:pb-3">
        <StatTitle label="TOKENS" value={src20Total?.toString()} />
      </div>

      <div class="flex justify-between">
        <StatItem
          label="VALUE"
          value={
            <>
              {totalValue > 0 ? totalValue.toFixed(8) : "N/A"}{" "}
              <span class="font-light">BTC</span>
            </>
          }
        />
        <StatItem label="24H CHANGE" value="+/- 0.00%" align="right" />
      </div>
      <div class="flex justify-between">
        <StatItem
          label="TOP HOLDINGS"
          value={
            <>
              XCP<br />
              STAMP<br />
              KEVIN
            </>
          }
        />
        <StatItem
          label="AMOUNT"
          value={
            <>
              23.12<br />
              100,000<br />
              700,000
            </>
          }
          align="center"
        />

        <StatItem
          label="VALUE"
          value={
            <>
              234.34 USD<br />
              5,886.98 USD<br />
              532.39 USD
            </>
          }
          align="right"
        />
      </div>
    </div>
  );
}

/* ===== MAIN WALLET DASHBOARD DETAILS COMPONENT ===== */
export default function WalletDashboardDetails({
  walletData,
  stampsTotal,
  src20Total,
  stampsCreated,
  setShowItem,
}: WalletDashboardDetailsProps) {
  /* ===== STATE ===== */
  const [fee, setFee] = useState<number>(walletData.fee || 0);

  /* ===== MODAL HANDLERS ===== */
  const handleOpenSendModal = () => {
    const modalContent = (
      <SendBTCModal
        fee={fee}
        balance={walletData.balance}
        handleChangeFee={setFee}
      />
    );
    openModal(modalContent, "slideUpDown");
  };

  const handleOpenReceiveModal = () => {
    const modalContent = (
      <RecieveAddyModal
        address={walletData.address}
        title="RECEIVE"
      />
    );
    openModal(modalContent, "slideUpDown");
  };

  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col w-full gap-3 mobileMd:gap-6">
      <div class="flex flex-col mobileLg:flex-row gap-3 mobileMd:gap-6">
        <div class="flex flex-col w-full mobileLg:w-1/2 tablet:w-2/3">
          <div class={containerBackground}>
            <DashboardProfile />
          </div>
        </div>
        <div class="flex flex-col w-full mobileLg:w-1/2 tablet:w-1/3">
          <div class={containerBackground}>
            <WalletOverview
              walletData={walletData}
              onSend={handleOpenSendModal}
              onReceive={handleOpenReceiveModal}
            />
          </div>
        </div>
      </div>

      <div class="flex flex-col w-full">
        <WalletStats
          setShowItem={setShowItem}
          stampsTotal={stampsTotal}
          src20Total={src20Total}
          stampsCreated={stampsCreated}
          {...(walletData.dispensers && { dispensers: walletData.dispensers })}
          {...(walletData.stampValue !== undefined &&
            { stampValue: walletData.stampValue })}
          {...(walletData.src20Value !== undefined &&
            { src20Value: walletData.src20Value })}
        />
      </div>
    </div>
  );
}
