/* ===== HEADER COMPONENT ===== */
import { Icon, LogoIcon } from "$icon";
import { MenuButton } from "$islands/button/MenuButton.tsx";
import { SearchButton } from "$islands/button/SearchButton.tsx";
import { ToolsButton } from "$islands/button/ToolsButton.tsx";
import { WalletButton } from "$islands/button/WalletButton.tsx";
import {
  container0,
  container1,
  transitionColors,
  transitionTransform,
} from "$layout";
import {
  CREATE_NAV_HREF,
  CREATE_NAV_LINKS,
} from "$lib/constants/navConstants.ts";
import { useFees } from "$lib/hooks/useFees.ts";
import { tooltipIcon } from "$notification";
import {
  eyebrowNeutral,
  logoHeader,
  navLinkActiveDesktop,
  navLinkDesktop,
  navSublinkActiveDesktop,
  navSublinkDesktop,
} from "$text";
import { createPortal } from "preact/compat";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

/* ===== NAVIGATION LINK INTERFACE ===== */
interface NavLink {
  title: string;
  href?: string;
  icon?: string;
  subLinks?: readonly NavLink[];
}

/* ===== TOOLS CONFIGURATION ===== */

/* ===== DESKTOP NAVIGATION CONFIGURATION ===== */
const desktopNavLinks: NavLink[] = [
  {
    title: "Marketplace",
    href: "/marketplace",
    icon: "artStamp",
  },
  {
    title: "Collections",
    href: "/collection",
    icon: "artStamps",
  },
  {
    title: "Tokens",
    href: "/src20",
    icon: "src20Token",
  },
  {
    title: "Explorer",
    href: "/explorer",
    icon: "explorer",
  },
  {
    title: "Create",
    href: CREATE_NAV_HREF,
    subLinks: CREATE_NAV_LINKS,
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

  // Prefetch fee data on page load (consumed by BlockchainStats in FeeCalculatorBase)
  useFees();

  // Single atomic dropdown state
  const [dropdownState, setDropdownState] = useState<{
    active: "tools" | "wallet" | "create" | null;
    toolsPos: { top: number; left: number } | null;
    walletPos: { top: number; left: number } | null;
    createPos: { top: number; left: number } | null;
  }>({
    active: null,
    toolsPos: null,
    walletPos: null,
    createPos: null,
  });
  const toolsButtonRef = useRef<HTMLDivElement>(null);
  const walletButtonRef = useRef<HTMLDivElement>(null);
  const createButtonRef = useRef<HTMLDivElement>(null);

  // Hover delay timeout
  const dropdownTimeoutRef = useRef<number | null>(null);

  // Animation state for dropdowns
  const [dropdownAnimation, setDropdownAnimation] = useState<{
    tools: "enter" | "exit" | null;
    wallet: "enter" | "exit" | null;
    create: "enter" | "exit" | null;
  }>({
    tools: null,
    wallet: null,
    create: null,
  });
  const animationTimeoutRef = useRef<number | null>(null);

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
        top: rect.bottom + 2,
        left: rect.right - 97,
      };
    }

    // Atomic state update
    const newState = {
      active: "tools" as const,
      toolsPos: toolsPos,
      walletPos: null,
      createPos: null,
    };
    setDropdownState(newState);

    // Trigger enter animation
    setDropdownAnimation({
      tools: "enter",
      wallet: null,
      create: null,
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
        top: rect.bottom + 2,
        left: rect.right - 168,
      };
    }

    // Atomic state update - all changes happen together
    const newState = {
      active: "wallet" as const,
      toolsPos: null,
      walletPos: walletPos,
      createPos: null,
    };
    setDropdownState(newState);

    // Trigger enter animation
    setDropdownAnimation({
      tools: null,
      wallet: "enter",
      create: null,
    });
  };

  const handleCreateMouseEnter = () => {
    // Clear any existing timeout
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    // Calculate create position (anchored under the CREATE nav link).
    // The text link is ~10px shorter than the icon buttons, so +14 keeps the
    // dropdown top level with the tools/wallet dropdowns (icon bottom + 4).
    let createPos = null;
    if (createButtonRef.current) {
      const rect = createButtonRef.current.getBoundingClientRect();
      createPos = {
        top: rect.bottom + 11,
        left: rect.left - 20,
      };
    }

    setDropdownState({
      active: "create",
      toolsPos: null,
      walletPos: null,
      createPos,
    });

    // Trigger enter animation
    setDropdownAnimation({
      tools: null,
      wallet: null,
      create: "enter",
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
      } else if (dropdownState.active === "create") {
        setDropdownAnimation((prev) => ({ ...prev, create: "exit" }));
      }

      // Close dropdown after animation completes (200ms animation duration)
      animationTimeoutRef.current = setTimeout(() => {
        setDropdownState({
          active: null,
          toolsPos: null,
          walletPos: null,
          createPos: null,
        });
        setDropdownAnimation({
          tools: null,
          wallet: null,
          create: null,
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
          return ToolsButton({ onOpenDrawer: openDrawer }).drawer;
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
          fixed top-0 right-0 left-auto w-full min-[420px]:w-[320px] h-[100dvh] z-modal
          min-[420px]:rounded-l-3xl min-[420px]:border-l-[1px]
          min-[420px]:border-l-color-border/75 min-[420px]:shadow-[-12px_0_12px_-6px_rgba(8,7,8,0.75)]
          ${container0} ${transitionTransform}
          overflow-y-auto overflow-x-hidden scrollbar-background-overlay
          ${isActive ? "translate-x-0" : "translate-x-full"}`}
        style="transition-timing-function: cubic-bezier(0.46,0.03,0.52,0.96);"
        id={`navbar-collapse-${type}`}
      >
        <div class="flex flex-col h-full pt-1">
          <div class="flex flex-row justify-between items-center w-full pl-1 pr-5">
            <div class="relative">
              <div
                class={`${tooltipIcon} ${
                  isCloseTooltipVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                {closeTooltipText}
              </div>
              <Icon
                type="iconButton"
                name="close"
                size="xl"
                weight="bold"
                color="neutral600"
                ariaLabel="Close menu"
                onClick={() => {
                  if (open) {
                    closeMenu();
                  }
                }}
                onMouseEnter={handleCloseMouseEnter}
                onMouseLeave={handleCloseMouseLeave}
              />
            </div>
            <h6
              class={`font-black text-lg text-color-neutral-800 tracking-wide select-none ${
                type === "menu" ? "italic pr-0.5" : ""
              }`}
            >
              {getTitle()}
            </h6>
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

    // Hover/ref props only for the entry that owns a dropdown (CREATE)
    const dropdownProps = (link: NavLink) =>
      link.subLinks
        ? {
          ref: createButtonRef,
          onMouseEnter: handleCreateMouseEnter,
          onMouseLeave: handleDropdownMouseLeave,
        }
        : {};

    return (
      <>
        {desktopNavLinks.map((link) => (
          <div
            key={link.title}
            class="relative group mb-[2px]"
            {...dropdownProps(link)}
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
                  size="md"
                  color="neutral400"
                  className="group-hover:stroke-color-hover"
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
    >
      <span class={`${logoHeader} hidden tablet:inline`}>
        <span class={`group-hover:text-color-hover ${transitionColors}`}>
          STAMP
        </span>CHAIN
      </span>
    </LogoIcon>
  );

  /* ===== COMPONENT RENDER ===== */
  return (
    <header class="mobileLg:flex justify-between items-center max-w-desktop w-full mx-auto
     px-shell-mobile mobileLg:px-shell-tablet tablet:px-shell-desktop
     pt-shell-mobile mobileLg:pt-shell-tablet tablet:pt-shell-desktop pb-5">
      {/* ===== MOBILE NAVIGATION ===== */}
      <div class="mobileLg:hidden flex items-center w-full relative z-header">
        <div
          class={`flex items-center justify-between w-full py-0.5 px-5 ${container1} !rounded-full`}
        >
          {/* Left: Logo Icon */}
          {logoIcon}

          {/* Right: Search, Tools, Wallet and Menu Buttons */}
          <div class="flex items-center gap-1 -mr-2">
            <SearchButton />
            {ToolsButton({ onOpenDrawer: openDrawer }).icon}
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
             py-0.5 px-4
             ${container1} !rounded-full`}
        >
          {/* Left: Logo Icon */}
          {logoIcon}

          {/* Center: Navigation Links (only when NAV_POSITION === "center") */}
          {NAV_POSITION === "center" && (
            <div class="absolute left-1/2 -translate-x-1/2 flex items-center gap-5">
              {renderNavLinks()}
            </div>
          )}

          {/* Right: Icon Buttons (nav links prepended when NAV_POSITION === "right") */}
          <div class="flex items-center gap-1">
            {NAV_POSITION === "right" && (
              <div class="flex items-center gap-5 mr-2">
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
              {ToolsButton({ onOpenDrawer: openDrawer }).icon}
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
            class={`hidden tablet:block !fixed z-dropdown min-w-[150px] px-5 py-3.5 whitespace-nowrap ${container1} ${animationClass}`}
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
            {ToolsButton({ onOpenDrawer: openDrawer }).dropdown}
          </div>,
          document.body,
        );
      })()}

      {(() => {
        const shouldRenderCreate = (dropdownState.active === "create" ||
          dropdownAnimation.create === "exit") &&
          dropdownState.createPos;

        const animationClass = dropdownAnimation.create === "enter"
          ? "dropdown-enter"
          : dropdownAnimation.create === "exit"
          ? "dropdown-exit"
          : "";

        const isCreateLinkActive = (href: string) =>
          !!currentPath &&
          (currentPath === href || currentPath.startsWith(`${href}/`));

        return shouldRenderCreate && createPortal(
          <div
            class={`hidden tablet:block !fixed z-dropdown min-w-[150px] px-5 py-3.5 whitespace-nowrap ${container1} ${animationClass}`}
            style={{
              top: `${dropdownState.createPos!.top}px`,
              left: `${dropdownState.createPos!.left}px`,
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
              if (dropdownAnimation.create === "exit") {
                setDropdownAnimation((prev) => ({ ...prev, create: "enter" }));
              }
            }}
            onMouseLeave={handleDropdownMouseLeave}
          >
            <div class="flex flex-col space-y-1 text-left">
              <h6 class={`${eyebrowNeutral} -my-0.5`}>STAMP</h6>
              {CREATE_NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setCurrentPath(link.href)}
                  class={isCreateLinkActive(link.href)
                    ? navSublinkActiveDesktop
                    : navSublinkDesktop}
                >
                  {link.title}
                </a>
              ))}
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
            class={`hidden tablet:block !fixed z-dropdown min-w-[150px] px-5 py-3.5 justify-end whitespace-nowrap ${container1} ${animationClass}`}
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
