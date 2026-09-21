/* ===== ICON COMPONENT ===== */
import * as iconPaths from "$components/icon/paths.ts";
import {
  BadgeVariants,
  globalSvgAttributes,
  iconButtonPill,
  iconStyles,
  IconVariants,
} from "$icon";
import { transitionAll } from "$layout";

/* ===== COMPONENT ===== */
export function Icon(props: IconVariants) {
  const {
    type,
    name,
    weight,
    size,
    color,
    className = "",
    role,
    ariaLabel,
    colorAccent,
    colorAccentHover,
    isOpen: _isOpen,
    onClick,
    onMouseEnter,
    onMouseLeave,
    ["f-partial"]: fPartial,
    ...rest
  } = props;

  const isInteractive = type === "iconButton" || type === "iconHover";

  /* ===== STYLES ===== */
  const combinedClasses = `${iconStyles.base} ${iconStyles.size[size]} ${
    isInteractive
      ? iconStyles.iconButton[color]
      : iconStyles.icon[color].replace("stroke-1", "")
  } ${iconStyles.weight[weight]} group ${className}`;

  // For iconButton/iconHover, click/hover/a11y semantics live on the <a>
  // wrapper (see render branch below) so the clickable/hoverable area
  // matches the visible pill instead of being limited to the inner <svg>.
  const commonProps = {
    className: combinedClasses,
    ...(isInteractive ? {} : {
      role,
      "aria-label": ariaLabel || name,
      onClick,
      onMouseEnter,
      onMouseLeave,
    }),
    ...rest,
  };

  /* ===== HELPERS ===== */
  const getIconPath = () => {
    const iconNameMap = {
      // Social Media Icons
      stampchain: "stampchainFill",
      twitter: "twitter",
      telegram: "telegram",
      github: "github",
      discord: "discord",
      website: "globe",
      email: "envelope",

      // UI Icons
      menu: "listMenu",
      close: "x",
      expand: "plus",
      search: "magnifingGlass",
      filter: "funnel",
      listAsc: "listAsc",
      listDesc: "listDesc",
      sortAsc: "listAsc",
      sortDesc: "listDesc",
      tools: "gearWrench",
      speedSlow: "time10",
      speedMedium: "time30",
      speedFast: "time60",

      // Artboard Icons
      undo: "undo",
      redo: "redo",
      dropper: "dropper",
      grid: "grid",
      gridsnap: "magnet",
      ruler: "ruler",
      horizontalGuide: "arrowHorizontal",
      verticalGuide: "arrowVertical",
      clearGuides: "trashcan",
      bold: "bold",
      italic: "italic",
      justifyLeft: "justifyLeft",
      justifyCenter: "justifyCenter",
      justifyRight: "justifyRight",

      // View Mode Icons
      viewCardRow: "gridRow",
      viewCardVertical: "gridVertical",
      viewCardSquare: "gridSquare",
      viewCardHorizontal: "gridHorizontal",
      viewCardSingle: "gridSingle",
      viewCardMixed: "gridMixed",

      // Caret Icons
      caretUp: "caretUp",
      caretDown: "caretDown",
      caretLeft: "caretLeft",
      caretRight: "caretRight",
      caretDoubleLeft: "caretDoubleLeft",
      caretDoubleRight: "caretDoubleRight",

      // Art Stamp & Collection Icons
      artStamp: "artStamp",
      artStamps: "artStamps",

      // SRC-20 Token Icons
      src20Token: "src20Token",
      src20Tokens: "src20Tokens",

      // Stamp Specific
      // - Image Right Panel Icons
      share: "share",
      copyLink: "copyLink",
      twitterImage: "twitterImage",
      previewImage: "image",
      previewCode: "imageCode",
      previewImageRaw: "imageOut",
      // - Preview Code Modal Icons
      previewCodeRaw: "codeRaw",
      previewCodeFormatted: "codeFormatted",
      // - Media Icons
      play: "play",
      pause: "pause",
      // - Status Icons
      locked: "lockClosed",
      unlocked: "lockOpen",
      keyburned: "flame",
      divisible: "imageDivide",
      recursive: "layers3",
      atom: "atom",
      dispenserListings: "imagesStar",

      // Wallet Specific Icons
      view: "eye",
      hide: "eyeSlash",
      userCircle: "userCircle",
      collection: "images",
      copy: "copy",
      edit: "pencil",
      pencil: "pencil",

      // SRC-101 Specific Icons
      chartUp: "chartUp",
      chartDown: "chartDown",

      // Bitcoin Specific Icons
      bitcoin: "bitcoin",
      bitcoins: "bitcoins",
      bitcoinTx: "bitcoinTx",
      bitcoinBlock: "blockchain",
      listings: "bitcoinTag",
      version: "bitcoinCpu",
      send: "bitcoinOut",
      receive: "bitcoinIn",
      history: "bitcoinHistory",
      wallet: "bitcoinWallet",
      donate: "bitcoinHand",
      explorer: "bitcoinMagnifyingGlass",

      // Misc Icons
      // - Tools, loader placeholder and donate CTA icons
      stamp: "stampchainOutline",
      uploadImage: "imageUpload",
      downloadImage: "imageDownload",

      // Notification Display Icons
      info: "info",
      error: "error",
      success: "success",

      // Other common icons
      externallink: "imageOut",
      loading: "refresh",
      refresh: "refresh",
    };

    const iconName = iconNameMap[name as keyof typeof iconNameMap];
    return iconName ? iconPaths[iconName as keyof typeof iconPaths] || "" : "";
  };

  const renderPaths = () => {
    const pathData = getIconPath() as
      | string
      | string[]
      | (string | { path: string; style: string })[];

    // Handle array of paths - can include path objects with custom styles
    if (Array.isArray(pathData)) {
      return pathData.map((pathItem, index) => {
        const isLast = index === pathData.length - 1;
        // Handle path object with custom styling
        if (typeof pathItem === "object" && pathItem.path && pathItem.style) {
          // Extract stroke colors and convert to fill
          const iconStyleClass = isInteractive
            ? iconStyles.iconButton[color]
            : iconStyles.icon[color];
          const baseStroke = iconStyleClass.match(/(?:^|\s)(stroke-[a-z0-9-]+)/)
            ?.[1];
          const hoverStroke = iconStyleClass.match(
            /group-hover:(stroke-[a-z0-9-]+)/,
          )?.[1];

          const fillColor = [
            baseStroke?.replace("stroke-", "fill-"),
            hoverStroke &&
            `group-hover:${hoverStroke.replace("stroke-", "fill-")}`,
          ].filter(Boolean).join(" ");

          // Parse custom attributes from style string
          const styleParts = pathItem.style.split(" ");
          const attributes: Record<string, string> = {};

          styleParts.forEach((part) => {
            if (part.startsWith("fill-rule-")) {
              attributes["fill-rule"] = part.replace("fill-rule-", "");
            } else if (part.startsWith("clip-rule-")) {
              attributes["clip-rule"] = part.replace("clip-rule-", "");
            }
          });

          return (
            <path
              key={index}
              d={pathItem.path}
              class={`${pathItem.style} ${fillColor} ${
                isLast && colorAccent
                  ? "stroke-[var(--color-accent)] group-hover:stroke-[var(--color-accent-hover)]"
                  : ""
              }`}
              {...attributes}
            />
          );
        }
        // Handle regular string path
        return (
          <path
            key={index}
            d={pathItem as string}
            class={isLast && colorAccent
              ? "stroke-[var(--color-accent)] group-hover:stroke-[var(--color-accent-hover)]"
              : undefined}
          />
        );
      });
    }

    // Handle single path
    return <path d={pathData as string} />;
  };

  /* ===== SVG ELEMENT ===== */
  const svgProps: Record<string, unknown> = {
    ...commonProps,
    ...globalSvgAttributes,
  };
  if (colorAccent) {
    (svgProps as any).style = {
      "--color-accent": colorAccent,
      "--color-accent-hover": colorAccentHover || colorAccent,
    };
  }

  const svgElement = (
    <svg {...(svgProps as any)}>
      {renderPaths()}
    </svg>
  );

  /* ===== RENDER BASED ON TYPE ===== */
  if (type === "icon") {
    return svgElement;
  }

  if (isInteractive) {
    const { href, target, rel } = props;
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        {...(fPartial !== undefined ? { "f-partial": fPartial } : {})}
        role={role || "button"}
        aria-label={ariaLabel || name}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        class={`inline-flex items-center group cursor-pointer ${
          type === "iconButton" ? iconButtonPill : ""
        }`}
      >
        {svgElement}
      </a>
    );
  }

  // This ensures TypeScript will catch if type is not one of the expected values
  throw new Error(`Invalid icon type: ${type}`);
}

/* ===== BADGE ICON COMPONENT ===== */
export function BadgeIcon({ text, className = "" }: BadgeVariants) {
  return (
    <span
      class={`
        flex items-center justify-center z-[-999]
        absolute top-[-15px] left-[-15px]
        size-5 rounded-full
        font-semibold text-[10px] text-color-hover tracking-wider
        bg-transparent group-hover:bg-gradient-to-b group-hover:from-color-neutral-800 group-hover:via-color-neutral-800 group-hover:to-color-neutral-900 border border-color-neutral-700
        ${transitionAll} cursor-pointer
        ${text === "0" ? "opacity-0" : "opacity-100"}
        ${className}
      `}
    >
      {text}
    </span>
  );
}
