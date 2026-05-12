// KEEP file for reference on the handleUpdateDisplayName to move into the new wallet / dashboard page
// UPDATE COMMENTARY
import { walletContext } from "$client/wallet/wallet.ts";
import { DEFAULT_WALLET_CONNECTORS } from "$constants";
import { Icon } from "$icon";
import { WalletProvider } from "$islands/layout/WalletProvider.tsx";
import { ConnectWalletModal } from "$islands/modal/ConnectWalletModal.tsx";
import { closeModal, openModal } from "$islands/modal/states.ts";
import { containerStickyBottom, glassmorphismL2 } from "$layout";
import {
  abbreviateAddress,
  formatSatoshisToBTC,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { tooltipIcon } from "$notification";
import {
  labelLg,
  labelSm,
  labelXs,
  navLinkGreyLD,
  navLinkGreyLDActive,
  navSublinkActiveDesktop,
  navSublinkDesktop,
  valueDarkSm,
  valueDarkXs,
  valueLg,
  valueSm,
} from "$text";
import { useEffect, useRef, useState } from "preact/hooks";

interface WalletLink {
  title: string;
  href?: string;
}

interface WalletButtonProps {
  onOpenDrawer?: (content: "wallet") => void;
  onCloseDrawer?: () => void;
}

/* ===== WALLET CONFIGURATION ===== */
const getWalletLinks = (address: string): WalletLink[] => [
  { title: "DASHBOARD", href: `/wallet/${address}` },
  { title: "DISCONNECT" },
];

/* ===== MAIN WALLET MODAL COMPONENT ===== */
export const WalletButton = (
  { onOpenDrawer, onCloseDrawer }: WalletButtonProps,
) => {
  const connectors = DEFAULT_WALLET_CONNECTORS;

  const { wallet, isConnected, disconnect } = walletContext;
  const { address, btcBalance } = wallet;
  const [path, setPath] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  /* ===== COPY STATE ===== */
  const [showCopied, setShowCopied] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [allowTooltip, setAllowTooltip] = useState(true);

  /* ===== REFS ===== */
  const copyButtonRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);

  /* ===== PATH INITIALIZATION ===== */
  useEffect(() => {
    // SSR-safe browser environment check
    if (typeof globalThis === "undefined" || !globalThis?.location) {
      return; // Cannot access location during SSR
    }
    setPath(globalThis.location.pathname?.split("/")[1] || null);
  }, []);

  /* ===== COPY CLEANUP EFFECT ===== */
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  /* ===== ACTIVE-STATE PATH TRACKING ===== */
  useEffect(() => {
    setCurrentPath(globalThis?.location?.pathname || null);
    const onPop = () => setCurrentPath(globalThis?.location?.pathname || null);
    globalThis.addEventListener("popstate", onPop);
    return () => globalThis.removeEventListener("popstate", onPop);
  }, []);

  const isActive = (href?: string) => {
    if (!href || !currentPath) return false;
    const hrefPath = href.split("?")[0];
    return currentPath === hrefPath || currentPath.startsWith(`${hrefPath}/`);
  };

  /* ===== COPY EVENT HANDLERS ===== */
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
      await navigator.clipboard.writeText(address);
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

  /* ===== MODAL VISIBILITY HANDLER ===== */
  const handleOpenModal = () => {
    if (!isConnected) {
      try {
        // Create the providers array first
        const providerComponents = connectors.map((key) => (
          <WalletProvider
            key={key}
            providerKey={key}
          />
        ));

        // Create modal content with the array directly
        const modalContent = (
          <ConnectWalletModal
            connectors={providerComponents}
            handleClose={closeModal}
          />
        );

        // Open modal
        openModal(modalContent, "slideUpDown");
      } catch (error) {
        console.error("Error in handleOpenModal:", error);
      }
    }
  };

  /* ===== WALLET SIGN OUT FUNCTION ===== */
  const walletSignOut = () => {
    disconnect();
    onCloseDrawer?.();
    if (path === "wallet" && typeof globalThis !== "undefined") {
      globalThis.history.pushState({}, "", "/");
      globalThis.location.reload();
    }
  };

  /* ===== WALLET ICON CLICK HANDLER ===== */
  const handleWalletIconClick = () => {
    if (!isConnected) {
      handleOpenModal();
    } else {
      // On mobile/tablet, open wallet drawer; on desktop, do nothing (dropdown handles it)
      if (typeof globalThis !== "undefined" && globalThis.innerWidth < 1024) {
        onOpenDrawer?.("wallet");
      }
    }
  };

  /* ===== COMPONENT RENDER ===== */
  return {
    // The wallet icon component
    icon: (
      <div class="relative z-10">
        {/* ===== CONNECT WALLET BUTTON ===== */}
        {!(isConnected && address) && (
          <Icon
            type="iconButton"
            name="wallet"
            weight="normal"
            size="smR"
            color="custom"
            className="stroke-color-neutral-400 hover:stroke-color-hover"
            onClick={handleWalletIconClick}
          />
        )}

        {/* ===== CONNECTED WALLET DISPLAY ===== */}
        {isConnected && address && (
          <>
            {/* ===== MOBILE/TABLET WALLET ICON ===== */}
            <div class="flex items-center relative">
              <Icon
                type="iconButton"
                name="wallet"
                weight="normal"
                size="smR"
                color="custom"
                className="stroke-color-neutral-400 hover:stroke-color-hover"
                colorAccent="var(--color-secondary-400)"
                colorAccentHover="var(--color-hover)"
                onClick={handleWalletIconClick}
              />
            </div>
          </>
        )}
      </div>
    ),
    // The wallet dropdown content
    dropdown: isConnected && address
      ? (
        <div class="flex flex-col gap-1.5 text-right whitespace-nowrap">
          <div class="flex flex-row-reverse justify-end items-center gap-3">
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
                size="xxs"
                color="greyDark"
                className="mb-0.5"
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
                class={`${tooltipIcon} ${
                  showCopied ? "opacity-100" : "opacity-0"
                }`}
              >
                ADDY COPIED
              </div>
            </div>
            <h6
              class={`${valueDarkXs} transition-colors duration-200 peer-hover:text-color-grey-light`}
            >
              {abbreviateAddress(address, 7)}
            </h6>
          </div>
          <div class="flex items-center gap-3 mb-0.5">
            <Icon
              type="icon"
              name="bitcoins"
              weight="normal"
              size="xs"
              color="greyDark"
            />
            <h6 class={valueSm}>
              {formatSatoshisToBTC(btcBalance.total, {
                includeSymbol: false,
                stripZeros: true,
              })} <span class={labelSm}>BTC</span>
            </h6>
          </div>
          <hr class="!mt-2 !mb-2" />
          <a
            href={`/wallet/${address}`}
            class={isActive(`/wallet/${address}`)
              ? `${navSublinkActiveDesktop}`
              : `${navSublinkDesktop}`}
          >
            DASHBOARD
          </a>
          <a
            onClick={() => walletSignOut()}
            class={`${navSublinkDesktop}`}
          >
            DISCONNECT
          </a>
        </div>
      )
      : null,
    // The wallet drawer content
    drawer: (
      <div class="flex flex-col h-full px-9 tablet:px-6">
        {/* Top - Main navigation content */}
        <div class="flex flex-col flex-1 items-start pt-9 tablet:pt-6 gap-5">
          <div
            class={`flex-col ${glassmorphismL2} w-full -mt-1.5 mb-3 px-3 py-2 space-y-1`}
          >
            <div class="flex flex-row-reverse justify-start items-center gap-3">
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
                  size="xs"
                  color="greyDark"
                  className="mb-0.5"
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
                  class={`${tooltipIcon} ${
                    showCopied ? "opacity-100" : "opacity-0"
                  }`}
                >
                  ADDY COPIED
                </div>
              </div>
              <h6
                class={`${valueDarkSm} transition-colors duration-200 peer-hover:text-color-grey-light`}
              >
                {abbreviateAddress(address, 12)}
              </h6>
            </div>
            <div class="flex justify-between items-end flex-1">
              <Icon
                type="icon"
                name="bitcoins"
                weight="normal"
                size="xs"
                color="greyDark"
              />
              <h6 class={valueLg}>
                {formatSatoshisToBTC(btcBalance.total, {
                  includeSymbol: false,
                  stripZeros: true,
                })} <span class={labelLg}>BTC</span>
              </h6>
            </div>
          </div>

          {getWalletLinks(address).map((link) => (
            <a
              key={link.title}
              href={link.href}
              onClick={() => {
                if (link.title === "DISCONNECT") {
                  walletSignOut();
                }
                if (link.href) {
                  setCurrentPath(link.href);
                }
              }}
              class={`inline-block w-full ${
                link.href && link.title === "DASHBOARD" && isActive(link.href)
                  ? navLinkGreyLDActive
                  : navLinkGreyLD
              }`}
            >
              {link.title}
            </a>
          ))}
        </div>

        {/* Bottom - Counterparty version */}
        <div class={containerStickyBottom}>
          <div class={`flex items-end -mb-1.5`}>
            <CounterpartyVersion />
          </div>
        </div>
      </div>
    ),
    currentPath: path,
    isConnected: Boolean(isConnected && address),
  };
};

function CounterpartyVersion() {
  const [version, setVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    const fetchVersion = async () => {
      try {
        const res = await fetch("/api/v2/counterparty/version", {
          headers: { "X-CSRF-Token": "safe" },
        });
        const data = await res.json();
        if (!cancelled) {
          setVersion(data?.version ?? null);
        }
      } catch (_e) {
        if (!cancelled) setVersion(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchVersion();

    // Refresh periodically to keep up-to-date
    const interval = globalThis.setInterval(fetchVersion, 24 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      globalThis.clearInterval(interval);
    };
  }, []);

  return (
    <div class={`flex items-center`}>
      <Icon
        type="icon"
        name="version"
        weight="normal"
        size="xs"
        color="custom"
        className="mr-3 stroke-color-grey-dark"
      />
      <span class={labelXs}>
        COUNTERPARTY {loading
          ? <span class="animate-pulse">vXX.X.X</span>
          : version
          ? <>v{version}</>
          : <>v N/A</>}
      </span>
    </div>
  );
}
