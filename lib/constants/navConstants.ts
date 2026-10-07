/* ===== HEADER / DRAWER NAVIGATION CONSTANTS ===== */
// Shared by islands/header/Header.tsx (desktop dropdown) and
// islands/button/MenuButton.tsx (mobile/tablet drawer subsection).

/** Parent CREATE link. routes/create/index.tsx redirects it (307). */
export const CREATE_NAV_HREF = "/create";

export interface CreateNavLink {
  title: string;
  href: string;
}

export const CREATE_NAV_LINKS: readonly CreateNavLink[] = [
  { title: "CLASSIC", href: "/create/classic" },
  { title: "POSH", href: "/create/posh" },
  { title: "RECURSIVE", href: "/create/recursive" },
];
