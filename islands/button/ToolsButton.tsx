import { Icon } from "$icon";
import {
  eyebrowNeutral,
  navLinkActiveMobile,
  navLinkMobile,
  navSublinkActiveDesktop,
  navSublinkDesktop,
} from "$text";
import { useEffect, useState } from "preact/hooks";

interface ToolLink {
  title: string;
  href: string;
}

interface ToolGroup {
  heading: string;
  links: readonly ToolLink[];
}

interface ToolsButtonProps {
  onOpenDrawer: (content: "tools") => void;
}

/* ===== TOOLS CONFIGURATION ===== */
const toolGroups: readonly ToolGroup[] = [
  {
    heading: "STAMPS",
    links: [{ title: "Send", href: "/tool/stamp/send" }],
  },
  {
    heading: "TOKENS",
    links: [
      { title: "Deploy", href: "/tool/src20/deploy" },
      { title: "Mint", href: "/tool/src20/mint" },
      { title: "Transfer", href: "/tool/src20/transfer" },
    ],
  },
  {
    heading: "BITNAME",
    links: [{ title: "Register", href: "/tool/src101/mint" }],
  },
];

export function ToolsButton({ onOpenDrawer }: ToolsButtonProps) {
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

  /* ===== HELPERS ===== */
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
      <div class="flex flex-col w-full">
        {toolGroups.map((group, index) => (
          <div key={group.heading} class="flex flex-col space-y-3">
            <h6
              class={`${eyebrowNeutral} ${
                index > 0 ? "mt-2.5" : ""
              } -mb-6 text-right`}
            >
              {group.heading}
            </h6>
            {group.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => {
                  setCurrentPath(link.href);
                }}
                class={isActive(link.href)
                  ? navLinkActiveMobile
                  : navLinkMobile}
              >
                {link.title}
              </a>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return {
    // The tools icon component with desktop dropdown
    icon: (
      <div class="relative flex items-center">
        <Icon
          type="iconButton"
          name="tools"
          weight="light"
          size="xl"
          color="neutral400"
          onClick={handleToolsClick}
        />
        {/* Dropdown content is rendered by Header.tsx */}
      </div>
    ),
    // The tools dropdown content (without container) - single column
    dropdown: (
      <div class="flex flex-col space-y-2.5 text-left">
        {toolGroups.map((group) => (
          <div key={group.heading} class="flex flex-col space-y-1">
            <h6 class={`${eyebrowNeutral} -my-0.5`}>
              {group.heading}
            </h6>
            {group.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => {
                  setCurrentPath(link.href);
                }}
                class={isActive(link.href)
                  ? navSublinkActiveDesktop
                  : navSublinkDesktop}
              >
                {link.title}
              </a>
            ))}
          </div>
        ))}
      </div>
    ),
    // The tools drawer content
    drawer: (
      <div class="flex flex-col h-full px-5">
        <div class="flex flex-col flex-1 items-start pt-[5px]">
          {tools()}
        </div>
      </div>
    ),
    // Current path for external use
    currentPath,
  };
}
