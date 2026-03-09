import { Icon } from "$icon";
import { containerStickyBottom, glassmorphismL2 } from "$layout";
import { formatUSDValue } from "$lib/utils/ui/formatting/formatUtils.ts";
import {
  labelLightSm,
  labelXs,
  labelXxs,
  navLinkGrey,
  navLinkGreyActive,
  navSublinkPurple,
  navSublinkPurpleActive,
} from "$text";
import { useEffect, useState } from "preact/hooks";

interface ToolLink {
  title: string;
  href: string;
}

interface ToolsData {
  btcPrice: number;
  recommendedFee: number;
  latestBlock: number;
  isLoading: boolean;
  // Transaction fees from mempool.space
  lowFee?: number; // hourFee
  mediumFee?: number; // halfHourFee
  highFee?: number; // fastestFee
}

interface ToolsButtonProps {
  onOpenDrawer: (content: "tools") => void;
  data?: ToolsData;
}

/* ===== TOOLS CONFIGURATION ===== */
const toolLinks: ToolLink[] = [
  { title: "SWAP", href: "/swap" },
  { title: "CREATE", href: "/tool/stamp/create" },
  { title: "SEND", href: "/tool/stamp/send" },
  { title: "DEPLOY", href: "/tool/src20/deploy" },
  { title: "MINT", href: "/tool/src20/mint" },
  { title: "TRANSFER", href: "/tool/src20/transfer" },
  { title: "REGISTER", href: "/tool/src101/mint" },
];

export function ToolsButton({ onOpenDrawer, data }: ToolsButtonProps) {
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  // Use centralized data if provided, otherwise fallback to local state
  const btcPrice = data?.btcPrice ?? 0;
  const latestBlock = data?.latestBlock ?? 0;
  const isLoading = data?.isLoading ?? false;

  // Transaction fees
  const lowFee = data?.lowFee ?? 0;
  const mediumFee = data?.mediumFee ?? 0;
  const highFee = data?.highFee ?? 0;

  /* ===== PATH TRACKING EFFECT ===== */
  useEffect(() => {
    // Set initial path
    setCurrentPath(globalThis?.location?.pathname || null);

    // Update path on route change
    const handleRouteChange = () => {
      setCurrentPath(globalThis?.location?.pathname || null);
    };

    // Listen for route changes
    globalThis.addEventListener("popstate", handleRouteChange);

    return () => {
      globalThis.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  // Data fetching is now handled by the Header component

  /* ===== HELPERS ===== */
  const displayPrice = btcPrice && typeof btcPrice === "number"
    ? formatUSDValue(btcPrice).toLocaleString()
    : "0";

  const handleToolsClick = () => {
    // On mobile/tablet, open drawer; on desktop, do nothing (dropdown handles it)
    if (typeof globalThis !== "undefined" && globalThis.innerWidth < 1024) {
      onOpenDrawer("tools");
    }
  };

  const isActive = (href: string) => {
    if (!currentPath) return false;
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  const tools = () => {
    return (
      <div class="flex flex-col space-y-0 w-full">
        {/* DEX Section */}
        <div class="flex flex-col space-y-4">
          <h6 class={`${labelXs} -mb-7 text-right`}>
            DEX
          </h6>
          {toolLinks.filter((link) => link.href === "/swap").map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => {
                setCurrentPath(link.href);
              }}
              class={`inline-block w-full ${
                isActive(link.href) ? navLinkGreyActive : navLinkGrey
              }`}
            >
              {link.title}
            </a>
          ))}
        </div>

        {/* STAMPS Section */}
        <div class="flex flex-col space-y-4">
          <h6 class={`${labelXs} mt-3 -mb-7 text-right`}>
            STAMPS
          </h6>
          {toolLinks.filter((link) =>
            link.href === "/tool/stamp/create" ||
            link.href === "/tool/stamp/send"
          ).map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => {
                setCurrentPath(link.href);
              }}
              class={`inline-block w-full ${
                isActive(link.href) ? navLinkGreyActive : navLinkGrey
              }`}
            >
              {link.title}
            </a>
          ))}
        </div>

        {/* TOKENS Section */}
        <div class="flex flex-col space-y-4">
          <h6 class={`${labelXs} mt-3 -mb-7 text-right`}>
            TOKENS
          </h6>
          {toolLinks.filter((link) =>
            link.href === "/tool/src20/deploy" ||
            link.href === "/tool/src20/mint" ||
            link.href === "/tool/src20/transfer"
          ).map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => {
                setCurrentPath(link.href);
              }}
              class={`inline-block w-full ${
                isActive(link.href) ? navLinkGreyActive : navLinkGrey
              }`}
            >
              {link.title}
            </a>
          ))}
        </div>

        {/* BITNAME Section */}
        <div class="flex flex-col space-y-4">
          <h6 class={`${labelXs} mt-3 -mb-7 text-right`}>
            BITNAME
          </h6>
          {toolLinks.filter((link) => link.href === "/tool/src101/mint")
            .map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => {
                  setCurrentPath(link.href);
                }}
                class={`inline-block w-full ${
                  isActive(link.href) ? navLinkGreyActive : navLinkGrey
                }`}
              >
                {link.title}
              </a>
            ))}
        </div>
      </div>
    );
  };

  const bitcoinStats = (containerClass: string) => (
    <div
      class={`${containerClass} backdrop-blur-xl tablet:backdrop-blur-xs`}
    >
      {/* Latest Block */}
      <div class="flex items-center">
        <Icon
          type="icon"
          name="bitcoinBlock"
          weight="normal"
          size="xs"
          color="greyDark"
          className="mr-3"
        />
        {isLoading
          ? <span class="animate-pulse">XXX,XXX</span>
          : latestBlock === -1
          ? <span class="font-medium">N/A</span>
          : (
            <span class="font-medium">
              {latestBlock.toLocaleString()}
            </span>
          )}
      </div>
      {/* Price */}
      <div class="flex items-center">
        <Icon
          type="icon"
          name="bitcoin"
          weight="normal"
          size="xs"
          color="greyDark"
          className="mr-3"
        />
        {isLoading
          ? <span class="animate-pulse">XXX,XXX</span>
          : <span class="font-medium">{displayPrice}</span>}&nbsp;USD
      </div>
      <hr class="!mt-[14px] !mb-3" />
      {/* Priority Fees - 3 column layout */}
      <div class="flex flex-col space-y-1 w-full">
        {/* Header row */}
        <h6 class={`pb-1 ${labelXs} text-center`}>
          TRANSACTION FEES
        </h6>
        {/* Icons row */}
        <div class="flex justify-between">
          <Icon
            type="icon"
            name="speedSlow"
            weight="normal"
            size="xs"
            color="greyDark"
          />
          <Icon
            type="icon"
            name="speedMedium"
            weight="normal"
            size="xs"
            color="greyDark"
          />
          <Icon
            type="icon"
            name="speedFast"
            weight="normal"
            size="xs"
            color="greyDark"
          />
        </div>
        {/* Data row */}
        <div class="flex justify-between">
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
                <span class="font-medium pl-0.5">{lowFee || "N/A"}</span>
                <span class="font-medium">{mediumFee || "N/A"}</span>
                <span class="font-medium pr-0.5">{highFee || "N/A"}</span>
              </>
            )}
        </div>
      </div>
    </div>
  );

  return {
    // The tools icon component with desktop dropdown
    icon: (
      <div class="relative">
        <Icon
          type="iconButton"
          name="tools"
          weight="normal"
          size="mdR"
          color="purpleLight"
          className="mb-[1px]"
          onClick={handleToolsClick}
          colorAccent="color-mix(in srgb, var(--color-grey-semidark) 75%, transparent)"
          colorAccentHover="var(--color-grey-semidark)"
        />
        {/* Dropdown content is rendered by Header.tsx */}
      </div>
    ),
    // The tools dropdown content (without container)
    dropdown: (
      <>
        {/* Column 1: Left aligned - Stats */}
        {bitcoinStats(
          `flex-col ${glassmorphismL2} -ml-1 w-[168px] px-3 py-2 space-y-1 ${labelLightSm}`,
        )}

        {/* Spacer column */}
        <div class="w-0" />

        {/* Column 2: Left aligned - Stamp tools */}
        <div class="flex flex-col -ml-3 space-y-1 text-left">
          <h6 class={labelXxs}>
            DEX
          </h6>
          {toolLinks.filter((link) => link.href === "/swap").map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => {
                setCurrentPath(link.href);
              }}
              class={isActive(link.href)
                ? navSublinkPurpleActive
                : navSublinkPurple}
            >
              {link.title}
            </a>
          ))}
        </div>

        {/* Column 3: Left aligned - Stamp tools */}
        <div class="flex flex-col -ml-3 space-y-1 text-left">
          <h6 class={labelXxs}>
            STAMPS
          </h6>
          {toolLinks.filter((link) =>
            link.href === "/tool/stamp/create" ||
            link.href === "/tool/stamp/send"
          ).map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => {
                setCurrentPath(link.href);
              }}
              class={isActive(link.href)
                ? navSublinkPurpleActive
                : navSublinkPurple}
            >
              {link.title}
            </a>
          ))}
        </div>

        {/* Column 4: Center aligned - Token tools */}
        <div class="flex flex-col -ml-6 space-y-1 text-center">
          <h6 class={labelXxs}>
            TOKENS
          </h6>
          {toolLinks.filter((link) =>
            link.href === "/tool/src20/deploy" ||
            link.href === "/tool/src20/mint" ||
            link.href === "/tool/src20/transfer"
          ).map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => {
                setCurrentPath(link.href);
              }}
              class={isActive(link.href)
                ? navSublinkPurpleActive
                : navSublinkPurple}
            >
              {link.title}
            </a>
          ))}
        </div>

        {/* Column 5: Right aligned - Register */}
        <div class="flex flex-col space-y-1 text-right">
          <h6 class={labelXxs}>
            BITNAME
          </h6>
          {toolLinks.filter((link) => link.href === "/tool/src101/mint")
            .map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => {
                  setCurrentPath(link.href);
                }}
                class={isActive(link.href)
                  ? navSublinkPurpleActive
                  : navSublinkPurple}
              >
                {link.title}
              </a>
            ))}
        </div>
      </>
    ),
    // The tools drawer content
    drawer: (
      <div class="flex flex-col h-full px-9 tablet:px-6">
        {/* Top - Main navigation content */}
        <div class="flex flex-col flex-1 items-start pt-9 tablet:pt-6 gap-3">
          {tools()}
        </div>

        {/* Bottom - Bitcoin Stats */}
        <div class={containerStickyBottom}>
          {/* ===== PRICE/FEE/BLOCK INFO ===== */}
          {bitcoinStats(
            `flex-col ${glassmorphismL2} items-end px-5 py-4 space-y-1 ${labelLightSm}`,
          )}
        </div>
      </div>
    ),
    // Current path for external use
    currentPath,
  };
}
