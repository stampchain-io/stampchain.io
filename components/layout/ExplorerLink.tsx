/* ===== EXPLORER LINK ===== */
/**
 * An `<a>` to a block explorer whose URL comes from the chain helpers in
 * $lib/utils/chain/clientChain.ts. On Bitcoin `href` is always set and this
 * renders exactly the `<a>` the call site used to write by hand. On a chain
 * with no configured explorer `href` is null and the link is dropped: the
 * children render as plain content, or nothing for icon-only links.
 */
import type { ComponentChildren, JSX } from "preact";

type ExplorerLinkProps =
  & Omit<JSX.AnchorHTMLAttributes, "href">
  & {
    href: string | null;
    children?: ComponentChildren;
    /** "text" keeps the children unlinked; "none" renders nothing. */
    fallback?: "text" | "none";
  };

export function ExplorerLink(
  { href, children, fallback = "text", ...rest }: ExplorerLinkProps,
) {
  if (href === null) return fallback === "none" ? null : <>{children}</>;
  return <a href={href} {...rest}>{children}</a>;
}
