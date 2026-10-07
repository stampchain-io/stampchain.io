import { Icon } from "$icon";
import { container2, containerStickyBottom } from "$layout";
import {
  CREATE_NAV_HREF,
  CREATE_NAV_LINKS,
} from "$lib/constants/navConstants.ts";
import {
  labelXs,
  navLinkActiveMobile,
  navLinkMobile,
  navSublinkActiveMobile,
  navSublinkMobile,
} from "$text";
import { useEffect, useState } from "preact/hooks";

interface NavLink {
  title: string;
  href?: string;
  icon?: string;
  subLinks?: readonly NavLink[];
}

interface MenuButtonProps {
  onOpenDrawer: (content: "menu") => void;
}

// Toggle nav link icons on/off for the mobile/tablet drawer (default: disabled)
const NAV_ICONS = false;

/* ===== MOBILE NAVIGATION CONFIGURATION ===== */
const navLinks: NavLink[] = [
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

const subNavLinks: NavLink[] = [
  { title: "How-To", href: "/howto" },
  { title: "FAQ", href: "/faq" },
  { title: "Media", href: "/media" },
];

export function MenuButton({ onOpenDrawer }: MenuButtonProps) {
  const [currentPath, setCurrentPath] = useState<string | null>(null);

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

  const handleMenuClick = () => {
    onOpenDrawer("menu");
  };

  const isActive = (href?: string) => {
    if (!href || !currentPath) return false;
    const hrefPath = href.split("?")[0];
    return currentPath === hrefPath || currentPath.startsWith(`${hrefPath}/`);
  };

  const navigation = () => {
    return (
      <>
        {navLinks.map((link) => (
          <div key={link.title} class="relative group w-full">
            <a
              href={link.href}
              onClick={() => {
                if (!link?.href) {
                  return;
                }
                setCurrentPath(link.href);
              }}
              class={`flex items-center gap-3 ${
                isActive(link.href) ? navLinkActiveMobile : navLinkMobile
              }`}
            >
              {NAV_ICONS && link.icon && (
                <Icon
                  type="icon"
                  name={link.icon}
                  weight="normal"
                  size="xl"
                  color="custom"
                  className="stroke-color-neutral-400 !hover:stroke-color-hover"
                />
              )}
              <span>{link.title}</span>
            </a>
            {link.subLinks && (
              <div class="flex flex-col gap-2 pl-4 pt-2">
                {link.subLinks.map((subLink) => (
                  <a
                    key={subLink.href}
                    href={subLink.href}
                    onClick={() => {
                      if (subLink.href) {
                        setCurrentPath(subLink.href);
                      }
                    }}
                    class={isActive(subLink.href)
                      ? navSublinkActiveMobile
                      : navSublinkMobile}
                  >
                    {subLink.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </>
    );
  };

  const subnavigation = () => {
    return (
      <div class="flex flex-col gap-2">
        {subNavLinks.map((link) => (
          <a
            key={link.title}
            href={link.href}
            onClick={() => {
              if (link?.href) {
                setCurrentPath(link.href);
              }
            }}
            class={`${
              isActive(link.href) ? navSublinkActiveMobile : navSublinkMobile
            }`}
          >
            {link.title}
          </a>
        ))}
      </div>
    );
  };

  return {
    // The hamburger icon component
    icon: (
      <Icon
        type="iconButton"
        name="menu"
        weight="light"
        size="container1"
        color="neutral400"
        isOpen={false}
        onClick={handleMenuClick}
      />
    ),
    // The menu drawer content
    drawer: (
      <div class="flex flex-col h-full px-5">
        {/* Top - Main navigation content */}
        <div class="flex flex-col flex-1 items-start pt-2 gap-3">
          {navigation()}
        </div>

        {/* Bottom - Sub navigation and version */}
        <div class={containerStickyBottom}>
          {subnavigation()}
          <div
            class={`${container2} !border-color-neutral-900 flex items-end mt-3 px-2 py-1.5`}
          >
            <CounterpartyVersion />
          </div>
        </div>
      </div>
    ),
    // Current path for external use
    currentPath,
  };
}

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
    <div class="flex items-center justify-center">
      <Icon
        type="icon"
        name="version"
        weight="normal"
        size="lg"
        color="neutral600"
        className="mr-3"
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
