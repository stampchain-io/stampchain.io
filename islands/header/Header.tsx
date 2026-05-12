/* ===== HEADER COMPONENT ===== */
import { CloseIcon, Icon, LogoIcon } from "$icon";
import { MenuButton } from "$islands/button/MenuButton.tsx";
import { SearchButton } from "$islands/button/SearchButton.tsx";
import { ToolsButton } from "$islands/button/ToolsButton.tsx";
import { WalletButton } from "$islands/button/WalletButton.tsx";
import {
  glassmorphism,
  glassmorphismOverlay,
  transitionTransform,
} from "$layout";
import { useFees } from "$lib/hooks/useFees.ts";
import { tooltipIcon } from "$notification";
import { navLinkActiveDesktop, navLinkDesktop } from "$text";
import { createPortal } from "preact/compat";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

/* ===== NAVIGATION LINK INTERFACE ===== */
interface NavLink {
  title: string;
  href?: string;
  icon?: string;
}

/* ===== TOOLS CONFIGURATION ===== */

/* ===== DESKTOP NAVIGATION CONFIGURATION ===== */
const desktopNavLinks: NavLink[] = [
  {
    title: "Stamps",
    href: "/stamp?type=classic",
    icon: "artStamp",
  },
  {
    title: "Tokens",
    href: "/src20",
    icon: "src20Token",
  },
  {
    title: "Collections",
    href: "/collection",
    icon: "artStamps",
  },
  {
    title: "Explorer",
    href: "/explorer",
    icon: "explorer",
  },
];

/* ===== MOBILE NAVIGATION CONFIGURATION ===== */
// Mobile/tablet drawer nav links live in islands/button/MenuButton.tsx — not here.
// This file only drives the desktop (mobileLg+) pill nav via renderNavLinks().

// Toggle nav link icons on/off for the desktop pill (default: disabled)
const NAV_ICONS = false;

// Desktop pill nav link position: "center" (absolute centred) | "right" (beside icon buttons)
const NAV_POSITION: "center" | "right" = "center";

/* ===== MAIN HEADER COMPONENT ===== */
export function Header() {
  const [open, setOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [drawerContent, setDrawerContent] = useState<
    "menu" | "wallet" | "tools"
  >("menu");
  // Add tooltip state for close button
  const [isCloseTooltipVisible, setIsCloseTooltipVisible] = useState(false);
  const [allowCloseTooltip, setAllowCloseTooltip] = useState(true);
  const [closeTooltipText, setCloseTooltipText] = useState("CLOSE");
  const closeTooltipTimeoutRef = useRef<number | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Centralized data fetching - starts immediately on page load
  const { fees, loading: feesLoading } = useFees();
  const [latestBlock, setLatestBlock] = useState(0);
  const [healthLoading, setHealthLoading] = useState(true);

  // Single atomic dropdown state
  const [dropdownState, setDropdownState] = useState<{
    active: "tools" | "wallet" | null;
    toolsPos: { top: number; left: number } | null;
    walletPos: { top: number; left: number } | null;
  }>({
    active: null,
    toolsPos: null,
    walletPos: null,
  });
  const toolsButtonRef = useRef<HTMLDivElement>(null);
  const walletButtonRef = useRef<HTMLDivElement>(null);

  // Hover delay timeout
  const dropdownTimeoutRef = useRef<number | null>(null);

  // Animation state for dropdowns
  const [dropdownAnimation, setDropdownAnimation] = useState<{
    tools: "enter" | "exit" | null;
    wallet: "enter" | "exit" | null;
  }>({
    tools: null,
    wallet: null,
  });
  const animationTimeoutRef = useRef<number | null>(null);

  /* ===== HEALTH DATA FETCHING ===== */
  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        const response = await fetch("/api/v2/health");
        if (response.ok) {
          const healthData = await response.json();
          const blockHeight = healthData.services?.blockSync?.indexed || 0;
          setLatestBlock(blockHeight);

          if (blockHeight === 0) {
            // Set -1 to indicate service is unavailable
            setLatestBlock(-1);
          }
        } else {
          // API failed, set -1 to indicate service is unavailable
          setLatestBlock(-1);
        }
      } catch (err) {
        console.error("Health data fetch error:", err);
        // Set -1 to indicate service is unavailable
        setLatestBlock(-1);
      } finally {
        setHealthLoading(false);
      }
    };

    fetchHealthData();
  }, []);

  // Scroll lock
  useEffect(() => {
    if (open) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      return;
    } else {
      const timer = setTimeout(() => {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }, 400); // Match drawer transition duration
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Add combined handler for keyboard shortcuts and click outside
  useEffect(() => {
    const handleCloseEvents = (e: KeyboardEvent | MouseEvent) => {
      // Handle keyboard shortcuts
      if (e.type === "keydown") {
        const keyEvent = e as KeyboardEvent;
        // Close on Escape key
        if (keyEvent.key === "Escape" && open) {
          e.preventDefault();
          closeMenu();
        }
      }

      // Handle click outside
      if (e.type === "mousedown" && open) {
        // Check if the click was outside the drawer
        if (
          drawerRef.current && !drawerRef.current.contains(e.target as Node)
        ) {
          closeMenu();
        }
      }
    };

    // Add event listeners
    document.addEventListener("keydown", handleCloseEvents);
    document.addEventListener("mousedown", handleCloseEvents);

    // Clean up event listeners
    return () => {
      document.removeEventListener("keydown", handleCloseEvents);
      document.removeEventListener("mousedown", handleCloseEvents);
    };
  }, [open]);

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

  /* ===== ORIENTATION CHANGE HANDLER ===== */
  useEffect(() => {
    const handleOrientationChange = () => {
      if (open) {
        closeMenu();
      }
    };

    globalThis.addEventListener("orientationchange", handleOrientationChange);
    return () => {
      globalThis.removeEventListener(
        "orientationchange",
        handleOrientationChange,
      );
    };
  }, [open]);

  // Add cleanup effect for tooltip timeout
  useEffect(() => {
    return () => {
      if (closeTooltipTimeoutRef.current) {
        globalThis.clearTimeout(closeTooltipTimeoutRef.current);
      }
    };
  }, []);

  // Add cleanup effect for animation timeout
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        globalThis.clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const handleCloseMouseEnter = () => {
    if (allowCloseTooltip) {
      setCloseTooltipText("CLOSE");

      if (closeTooltipTimeoutRef.current) {
        globalThis.clearTimeout(closeTooltipTimeoutRef.current);
      }

      closeTooltipTimeoutRef.current = globalThis.setTimeout(() => {
        setIsCloseTooltipVisible(true);
      }, 1500);
    }
  };

  const handleCloseMouseLeave = () => {
    if (closeTooltipTimeoutRef.current) {
      globalThis.clearTimeout(closeTooltipTimeoutRef.current);
    }
    setIsCloseTooltipVisible(false);
    setAllowCloseTooltip(true);
  };

  /* ===== MENU CLOSE FUNCTION ===== */
  const closeMenu = () => {
    // Close menu by updating state
    setOpen(false);
  };

  /* ===== DRAWER CONTROL FUNCTIONS ===== */
  const openDrawer = (content: "menu" | "wallet" | "tools") => {
    setDrawerContent(content);
    setOpen(true);
  };

  /* ===== PORTAL DROPDOWN HANDLERS ===== */
  const handleToolsMouseEnter = () => {
    // Clear any existing timeout
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    // Calculate tools position
    let toolsPos = null;
    if (toolsButtonRef.current) {
      const rect = toolsButtonRef.current.getBoundingClientRect();
      toolsPos = {
        top: rect.bottom + 20,
        left: rect.right - 550 + 61,
      };
    }

    // Atomic state update
    const newState = {
      active: "tools" as const,
      toolsPos: toolsPos,
      walletPos: null,
    };
    setDropdownState(newState);

    // Trigger enter animation
    setDropdownAnimation({
      tools: "enter",
      wallet: null,
    });
  };

  const handleWalletMouseEnter = () => {
    // Clear any existing timeout
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    // Calculate wallet position
    let walletPos = null;
    if (walletButtonRef.current) {
      const rect = walletButtonRef.current.getBoundingClientRect();
      walletPos = {
        top: rect.bottom + 20,
        left: rect.right - 150 - 15,
      };
    }

    // Atomic state update - all changes happen together
    const newState = {
      active: "wallet" as const,
      toolsPos: null,
      walletPos: walletPos,
    };
    setDropdownState(newState);

    // Trigger enter animation
    setDropdownAnimation({
      tools: null,
      wallet: "enter",
    });
  };

  const handleDropdownMouseLeave = () => {
    // Set timeout to start exit animation
    dropdownTimeoutRef.current = setTimeout(() => {
      // Trigger exit animation based on what's currently active
      if (dropdownState.active === "tools") {
        setDropdownAnimation((prev) => ({ ...prev, tools: "exit" }));
      } else if (dropdownState.active === "wallet") {
        setDropdownAnimation((prev) => ({ ...prev, wallet: "exit" }));
      }

      // Close dropdown after animation completes (200ms animation duration)
      animationTimeoutRef.current = setTimeout(() => {
        setDropdownState({
          active: null,
          toolsPos: null,
          walletPos: null,
        });
        setDropdownAnimation({
          tools: null,
          wallet: null,
        });
      }, 200);
    }, 300); // 300ms hover delay that works as a bridge between icon button and dropdown
  };

  // Create a single wallet button instance to prevent state pollution
  const walletButtonInstance = useMemo(() => {
    return WalletButton({
      onOpenDrawer: openDrawer,
      onCloseDrawer: closeMenu,
    });
  }, [openDrawer, closeMenu]);

  // Create centralized data object to pass to ToolsButton
  const toolsData = useMemo(() => ({
    btcPrice: fees?.btcPrice || 0,
    recommendedFee: fees?.recommendedFee || 6,
    latestBlock,
    isLoading: feesLoading || healthLoading,
    // Priority fees from mempool.space
    lowFee: fees?.hourFee || 0,
    mediumFee: fees?.halfHourFee || 0,
    highFee: fees?.fastestFee || 0,
  }), [fees, latestBlock, feesLoading, healthLoading]);

  /* ===== DRAWER RENDERER ===== */
  const renderDrawer = (type: "menu" | "wallet" | "tools") => {
    const isActive = drawerContent === type && open;

    const getContent = () => {
      switch (type) {
        case "menu":
          return MenuButton({ onOpenDrawer: openDrawer }).drawer;
        case "wallet":
          return WalletButton({
            onOpenDrawer: openDrawer,
            onCloseDrawer: closeMenu,
          }).drawer;
        case "tools":
          return ToolsButton({ onOpenDrawer: openDrawer, data: toolsData })
            .drawer;
      }
    };

    const getTitle = () => {
      switch (type) {
        case "menu":
          return "STAMPCHAIN";
        case "wallet":
          return "WALLET";
        case "tools":
          return "TOOLS";
      }
    };

    return (
      <div
        ref={drawerContent === type ? drawerRef : null}
        class={`flex tablet:hidden flex-col justify-between
          fixed top-0 right-0 left-auto w-full min-[420px]:w-[340px] h-[100dvh] z-30
          min-[420px]:rounded-l-3xl min-[420px]:border-l-[1px]
          min-[420px]:border-l-color-border/75 min-[420px]:shadow-[-12px_0_12px_-6px_rgba(8,7,8,0.75)]
          ${glassmorphismOverlay} ${transitionTransform} transition-transform will-change-transform
          overflow-y-auto overflow-x-hidden scrollbar-background-overlay
          ${isActive ? "translate-x-0" : "translate-x-full"}`}
        style="transition-timing-function: cubic-bezier(0.46,0.03,0.52,0.96);"
        id={`navbar-collapse-${type}`}
      >
        <div class="flex flex-col h-full">
          <div class="pt-[29px] mobileLg:pt-[41px] px-9">
            <div class="flex flex-row justify-between items-center w-full">
              <div class="relative">
                <div
                  class={`${tooltipIcon} ${
                    isCloseTooltipVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {closeTooltipText}
                </div>
                <CloseIcon
                  size="md"
                  weight="bold"
                  color="greyLight"
                  onClick={() => {
                    if (open) {
                      closeMenu();
                    }
                  }}
                  onMouseEnter={handleCloseMouseEnter}
                  onMouseLeave={handleCloseMouseLeave}
                  aria-label="Close menu"
                />
              </div>
              <h6
                class={`font-extrabold text-2xl color-grey-gradientLD tracking-wide select-none inline-block w-fit ${
                  type === "menu" ? "italic font-black pr-0.5" : ""
                }`}
              >
                {getTitle()}
              </h6>
            </div>
          </div>
          {getContent()}
        </div>
      </div>
    );
  };

  /* ===== NAVIGATION LINKS RENDERER ===== */
  // Desktop (mobileLg+) pill nav only. Mobile/tablet drawer nav is in MenuButton.tsx.
  const renderNavLinks = () => {
    const isActive = (href?: string) => {
      if (!href || !currentPath) return false;
      const hrefPath = href.split("?")[0];
      return currentPath === hrefPath || currentPath.startsWith(`${hrefPath}/`);
    };

    return (
      <>
        {desktopNavLinks.map((link) => (
          <div
            key={link.title}
            class="relative group mb-[2px]"
          >
            <a
              href={link.href}
              onClick={() => {
                if (!link?.href) return;
                if (open) {
                  closeMenu();
                }
                setCurrentPath(link?.href ? link?.href : null);
              }}
              class={`flex items-center gap-2 ${
                isActive(link.href) ? navLinkActiveDesktop : navLinkDesktop
              }`}
            >
              {/* Left icon */}
              {NAV_ICONS && link.icon && (
                <Icon
                  type="icon"
                  name={link.icon}
                  weight="normal"
                  size="xxs"
                  color="greyLight"
                  className="group-hover:stroke-color-purple-light"
                />
              )}
              {/* Text label */}
              <span>{link.title}</span>
            </a>
          </div>
        ))}
      </>
    );
  };

  /* ===== LOGO ICON ===== */
  const logoIcon = (
    <LogoIcon
      href="/home"
      f-partial="/home"
      onClick={() => setCurrentPath("home")}
    />
  );

  /* ===== COMPONENT RENDER ===== */
  return (
    <header class="mobileLg:flex justify-between items-center max-w-desktop w-full mx-auto
     px-gutter-mobile mobileLg:px-gutter-tablet tablet:px-gutter-desktop
     pt-6 pb-9 mobileLg:pt-9 tablet:pb-14">
      {/* ===== MOBILE NAVIGATION ===== */}
      <div class="mobileLg:hidden flex items-center w-full relative z-header">
        <div
          class={`flex items-center justify-between w-full gap-7 py-1.5 px-5 ${glassmorphism} !rounded-full`}
        >
          {/* Left: Logo Icon */}
          {logoIcon}

          {/* Right: Search, Tools, Wallet and Menu Buttons */}
          <div class="flex items-center gap-6">
            <SearchButton />
            {ToolsButton({ onOpenDrawer: openDrawer, data: toolsData }).icon}
            {WalletButton({
              onOpenDrawer: openDrawer,
              onCloseDrawer: closeMenu,
            }).icon}
            {MenuButton({ onOpenDrawer: openDrawer }).icon}
          </div>
        </div>
      </div>

      {/* ===== TABLET/DESKTOP NAVIGATION ===== */}
      <div class="hidden mobileLg:flex items-center w-full relative z-header">
        <div
          class={`relative flex items-center justify-between w-full
             py-1.5 px-6
             ${glassmorphism} !rounded-full`}
        >
          {/* Left: Logo Icon */}
          {logoIcon}

          {/* Center: Navigation Links (only when NAV_POSITION === "center") */}
          {NAV_POSITION === "center" && (
            <div class="absolute left-1/2 -translate-x-1/2 flex items-center gap-6 tablet:gap-6">
              {renderNavLinks()}
            </div>
          )}

          {/* Right: Icon Buttons (nav links prepended when NAV_POSITION === "right") */}
          <div class="flex items-center gap-4">
            {NAV_POSITION === "right" && (
              <div class="flex items-center gap-10 tablet:gap-10 mr-2">
                {renderNavLinks()}
              </div>
            )}
            <div class="relative group">
              <SearchButton />
            </div>
            <div
              class="relative group"
              ref={toolsButtonRef}
              onMouseEnter={handleToolsMouseEnter}
              onMouseLeave={handleDropdownMouseLeave}
            >
              {ToolsButton({ onOpenDrawer: openDrawer, data: toolsData }).icon}
            </div>
            <div
              class="relative group"
              ref={walletButtonRef}
              onMouseEnter={handleWalletMouseEnter}
              onMouseLeave={handleDropdownMouseLeave}
            >
              {WalletButton({
                onOpenDrawer: openDrawer,
                onCloseDrawer: closeMenu,
              }).icon}
            </div>
          </div>
        </div>
      </div>

      {/* ===== MOBILE NAVIGATION DRAWERS ===== */}
      {renderDrawer("menu")}
      {renderDrawer("tools")}
      {renderDrawer("wallet")}

      {/* ===== PORTAL DROPDOWNS ===== */}
      {(() => {
        const shouldRenderTools = (dropdownState.active === "tools" ||
          dropdownAnimation.tools === "exit") &&
          dropdownState.toolsPos;

        const animationClass = dropdownAnimation.tools === "enter"
          ? "dropdown-enter"
          : dropdownAnimation.tools === "exit"
          ? "dropdown-exit"
          : "";

        return shouldRenderTools && createPortal(
          <div
            class={`hidden tablet:block fixed z-dropdown w-[550px] py-3.5 px-5 whitespace-nowrap ${glassmorphism} ${animationClass}`}
            style={{
              top: `${dropdownState.toolsPos!.top}px`,
              left: `${dropdownState.toolsPos!.left}px`,
            }}
            onMouseEnter={() => {
              // Clear timeout when hovering over dropdown
              if (dropdownTimeoutRef.current) {
                clearTimeout(dropdownTimeoutRef.current);
                dropdownTimeoutRef.current = null;
              }
              if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
                animationTimeoutRef.current = null;
              }
              // If we were exiting, switch back to enter
              if (dropdownAnimation.tools === "exit") {
                setDropdownAnimation((prev) => ({ ...prev, tools: "enter" }));
              }
            }}
            onMouseLeave={handleDropdownMouseLeave}
          >
            <div class="grid grid-cols-5 w-full">
              {ToolsButton({ onOpenDrawer: openDrawer, data: toolsData })
                .dropdown}
            </div>
          </div>,
          document.body,
        );
      })()}

      {(() => {
        const shouldRenderWallet = (dropdownState.active === "wallet" ||
          dropdownAnimation.wallet === "exit") &&
          dropdownState.walletPos &&
          walletButtonInstance.isConnected;

        const animationClass = dropdownAnimation.wallet === "enter"
          ? "dropdown-enter"
          : dropdownAnimation.wallet === "exit"
          ? "dropdown-exit"
          : "";

        return shouldRenderWallet && createPortal(
          <div
            class={`hidden tablet:block fixed z-dropdown min-w-[150px] py-3.5 px-5 justify-end whitespace-nowrap ${glassmorphism} ${animationClass}`}
            style={{
              top: `${dropdownState.walletPos!.top}px`,
              left: `${dropdownState.walletPos!.left}px`,
            }}
            onMouseEnter={() => {
              // Clear timeout when hovering over dropdown
              if (dropdownTimeoutRef.current) {
                clearTimeout(dropdownTimeoutRef.current);
                dropdownTimeoutRef.current = null;
              }
              if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
                animationTimeoutRef.current = null;
              }
              // If we were exiting, switch back to enter
              if (dropdownAnimation.wallet === "exit") {
                setDropdownAnimation((prev) => ({ ...prev, wallet: "enter" }));
              }
            }}
            onMouseLeave={handleDropdownMouseLeave}
          >
            {(() => {
              return walletButtonInstance.isConnected
                ? walletButtonInstance.dropdown
                : null;
            })()}
          </div>,
          document.body,
        );
      })()}
    </header>
  );
}
