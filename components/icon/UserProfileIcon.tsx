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
 */
import { Icon, IconVariants } from "$icon";
import { transitionColors } from "$layout";
import type { ComponentChildren } from "preact";

interface UserProfileIconProps {
  size?: IconVariants["size"];
  weight?: IconVariants["weight"];
  className?: string;
  wrapperClassName?: string;
  link?: boolean;
  children?: ComponentChildren;
}

export function UserProfileIcon({
  size = "custom",
  weight = "custom",
  className = "w-[14px] h-[14px] stroke-[2] stroke-color-neutral-200 shrink-0",
  wrapperClassName = "",
  link = false,
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
          ? `group-hover:stroke-color-hover ${transitionColors}`
          : ""
      } ${className}`}
    />
  );

  if (children === undefined) return icon;

  return (
    <span
      class={`inline-flex items-center gap-1.5 ${
        link ? "group cursor-pointer" : ""
      } ${wrapperClassName}`}
    >
      {icon}
      {children}
    </span>
  );
}
