/* ===== STAMPCHAIN LOGO ICON COMPONENT ===== */
/*
 * Renders the Stampchain logo as an <img> tag loading the SVG from static assets.
 *
 * The logo SVG uses linearGradient paint servers with xlink:href stop inheritance.
 * Inline SVG approaches (JSX, dangerouslySetInnerHTML) all fail in this context
 * because the Header is a Fresh island: the SVG is server-rendered during SSR and
 * then Preact re-hydrates the island client-side. During that hydration cycle,
 * gradient url(#id) references silently break — paths with solid hex stroke colours
 * survive but any path using stroke:url(#gradient) becomes invisible.
 *
 * Loading via <img src="...svg"> sidesteps this entirely: the browser fetches and
 * parses the file as a standalone SVG document where xlink:href and all gradient
 * references work as designed, with no Preact/hydration involvement.
 *
 *       ORIGINAL IMG TAG:
 *       <img
        src="/img/logo/logo-duotone-gradient.svg"
        alt=""
        class="w-9 h-9 tablet:w-8 tablet:h-8"
      />

 */

import { Icon } from "$icon";
import type { ComponentChildren } from "preact";

interface LogoIconProps {
  href?: string;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  "f-partial"?: string;
  children?: ComponentChildren;
}

export function LogoIcon({
  href = "/home",
  onClick,
  className = "",
  ariaLabel = "Stampchain home",
  "f-partial": fPartial,
  children,
}: LogoIconProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      {
        /* Only name the link explicitly when it has no visible children.
           With children present (the wordmark), an aria-label REPLACES that
           visible text in the accessible name, which trips axe's
           label-content-name-mismatch — the name a screen reader announces
           would no longer match the label a sighted user reads aloud. The
           children already provide a perfectly good name, so step aside. */
        ...(children ? {} : { "aria-label": ariaLabel })
      }
      class={`inline-flex items-center gap-2 group ${className}`.trim()}
      {...(fPartial !== undefined ? { "f-partial": fPartial } : {})}
    >
      {
        /* type="icon": iconButton would nest a second <a> inside this
            link and the HTML parser would break the flex group on SSR. */
      }
      <Icon
        type="icon"
        name="stampchain"
        weight="normal"
        size="mdR"
        color="neutral400"
      />

      {children}
    </a>
  );
}
