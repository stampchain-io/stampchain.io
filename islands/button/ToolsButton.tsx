import { Icon } from "$icon";
import { logger } from "$lib/utils/logger.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import {
  eyebrowNeutral,
  navLinkActiveMobile,
  navLinkMobile,
  navSublinkActiveDesktop,
  navSublinkDesktop,
} from "$text";
import { useEffect, useState } from "preact/hooks";

type ModalToolId =
  | "stamp-send"
  | "src20-deploy"
  | "src20-mint"
  | "src20-transfer"
  | "src101-register";

type ToolLink =
  | { title: string; href: string }
  | { title: string; modal: ModalToolId };

interface ToolGroup {
  heading: string;
  links: readonly ToolLink[];
}

interface ToolsButtonProps {
  onOpenDrawer: (content: "tools") => void;
  /** Closes the tools dropdown or drawer before a modal tool opens. */
  onSelectTool?: () => void;
}

const isModalLink = (
  link: ToolLink,
): link is { title: string; modal: ModalToolId } => {
  return "modal" in link;
};

/* ===== MODAL TOOL LOADERS ===== */
// Tool modals are code-split; each loader fetches its chunk and opens it.
const modalToolLoaders: Record<ModalToolId, () => Promise<void>> = {
  "stamp-send": () =>
    import("$islands/modal/tool/StampSendTool.tsx").then((mod) =>
      mod.openStampSendTool()
    ),
  "src20-deploy": () =>
    import("$islands/modal/tool/SRC20DeployTool.tsx").then((mod) =>
      mod.openSRC20DeployTool()
    ),
  "src20-mint": () =>
    import("$islands/modal/tool/SRC20MintTool.tsx").then((mod) =>
      mod.openSRC20MintTool()
    ),
  "src20-transfer": () =>
    import("$islands/modal/tool/SRC20TransferTool.tsx").then((mod) =>
      mod.openSRC20TransferTool()
    ),
  "src101-register": () =>
    import("$islands/modal/tool/SRC101RegisterTool.tsx").then((mod) =>
      mod.openSRC101RegisterTool()
    ),
};

/* ===== TOOLS CONFIGURATION ===== */
const toolGroups: readonly ToolGroup[] = [
  {
    heading: "STAMPS",
    links: [{ title: "Send", modal: "stamp-send" }],
  },
  {
    heading: "TOKENS",
    links: [
      { title: "Deploy", modal: "src20-deploy" },
      { title: "Mint", modal: "src20-mint" },
      { title: "Transfer", modal: "src20-transfer" },
    ],
  },
  {
    heading: "BITNAME",
    links: [{ title: "Register", modal: "src101-register" }],
  },
];

export function ToolsButton(
  { onOpenDrawer, onSelectTool }: ToolsButtonProps,
) {
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

  const openModalTool = (modal: ModalToolId) => {
    onSelectTool?.();
    modalToolLoaders[modal]().catch((error: unknown) => {
      logger.error("ui", {
        message: "Failed to load modal tool",
        modal,
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : typeof error,
      });
      showToast(
        "Failed to open the tool. Please check your connection and try again.",
        "error",
      );
    });
  };

  const renderToolEntry = (
    link: ToolLink,
    variant: "desktop" | "drawer",
  ) => {
    if (isModalLink(link)) {
      const idle = variant === "desktop" ? navSublinkDesktop : navLinkMobile;
      return (
        <button
          key={link.modal}
          type="button"
          class={`${idle} text-left`}
          onClick={() => openModalTool(link.modal)}
        >
          {link.title}
        </button>
      );
    }

    const active = variant === "desktop"
      ? navSublinkActiveDesktop
      : navLinkActiveMobile;
    const idle = variant === "desktop" ? navSublinkDesktop : navLinkMobile;
    return (
      <a
        key={link.href}
        href={link.href}
        onClick={() => setCurrentPath(link.href)}
        class={isActive(link.href) ? active : idle}
      >
        {link.title}
      </a>
    );
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
            {group.links.map((link) =>
              renderToolEntry(link, "drawer")
            )}
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
          size="container1"
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
            {group.links.map((link) =>
              renderToolEntry(link, "desktop")
            )}
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
