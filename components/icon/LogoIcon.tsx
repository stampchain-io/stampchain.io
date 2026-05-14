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

interface LogoIconProps {
  href?: string;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  "f-partial"?: string;
}

export function LogoIcon({
  href = "/home",
  onClick,
  className = "",
  ariaLabel = "Stampchain home",
  "f-partial": fPartial,
}: LogoIconProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      aria-label={ariaLabel}
      class={`inline-block ${className}`.trim()}
      {...(fPartial !== undefined ? { "f-partial": fPartial } : {})}
    >
      <span aria-hidden="true">
        <Icon
          type="icon"
          name="stampchain"
          weight="light"
          size="mdR"
          color="custom"
          className="stroke-color-neutral-400 hover:stroke-color-primary-500"
        />
      </span>
    </a>
  );
}
