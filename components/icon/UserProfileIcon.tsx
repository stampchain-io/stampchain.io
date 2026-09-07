/* ===== USER PROFILE ICON COMPONENT ===== */
/*
 * Shared "creator/artist" avatar icon (userCircle) used wherever a creator
 * name or address is displayed - cards, detail headers, etc. Defaults match
 * the compact card usage; pass size/weight/className to match other
 * contexts (e.g. detail headers use size="xs" weight="bold" with hover
 * transitions).
 *
 * Pass `children` (the creator name/address markup) to render the icon
 * inline next to it - this strips the repeated icon+wrapper markup out of
 * every call site into one place.
 *
 * Pass `link` when the creator name is styled/behaves like a link (e.g.
 * StampInfo, CollectionDetailHeader) - this adds the `group` + cursor-pointer
 * classes needed for the icon/text group-hover transitions, so call sites
 * don't need to repeat them.
 *
 * Pass `href` to make `link` a *real* link - the icon+children wrapper
 * renders as an `<a>` pointing there (e.g. `/wallet/{address}`) instead of
 * just looking clickable. Without `href`, `link` remains styling-only, so
 * callers that need a click handler instead of navigation can still use
 * `link` alone and wrap/handle clicks themselves.
 */
import { Icon, IconVariants } from "$icon";
import type { ComponentChildren } from "preact";

interface UserProfileIconProps {
  size?: IconVariants["size"];
  weight?: IconVariants["weight"];
  className?: string;
  wrapperClassName?: string;
  link?: boolean;
  href?: string | undefined;
  target?: string;
  children?: ComponentChildren;
}

export function UserProfileIcon({
  size = "custom",
  weight = "custom",
  className = "w-[14px] h-[14px] stroke-[2] stroke-color-neutral-200 shrink-0",
  wrapperClassName = "",
  link = false,
  href,
  target = "_self",
  children,
}: UserProfileIconProps) {
  const icon = (
    <Icon
      type="icon"
      name="userCircle"
      weight={weight}
      size={size}
      color="custom"
      className={`${
        link
          ? "group-hover:stroke-color-hover transition-colors duration-200"
          : ""
      } ${className}`}
    />
  );

  if (children === undefined) return icon;

  const wrapperClass = `inline-flex items-center gap-1.5 ${
    link ? "group cursor-pointer" : ""
  } ${wrapperClassName}`;

  if (href) {
    return (
      <a href={href} target={target} class={wrapperClass}>
        {icon}
        {children}
      </a>
    );
  }

  return (
    <span class={wrapperClass}>
      {icon}
      {children}
    </span>
  );
}
