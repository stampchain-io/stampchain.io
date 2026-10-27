/**
 * Keyboard focus rules for modal dialogs. The DOM-free part (where Tab goes
 * next) is a pure function so it can be unit-tested.
 */

/** Elements a keyboard user can Tab to, in document order. */
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** The focusable elements inside `root`, skipping hidden ones. */
export function focusableWithin(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((el) =>
      !el.hasAttribute?.("inert") &&
      el.getAttribute?.("aria-hidden") !== "true" &&
      // Rendered elements only; environments without layout (SSR, tests)
      // count everything as visible.
      (typeof el.getClientRects !== "function" ||
        el.getClientRects().length > 0)
    );
}

/**
 * Where a Tab press should move focus to keep it inside the dialog, or null
 * to let the browser move it normally. Wraps from the last element to the
 * first (and Shift+Tab from first to last), and pulls focus back in when it
 * sits outside the dialog.
 */
export function nextFocusTarget<T>(
  focusables: readonly T[],
  active: T | null,
  shift: boolean,
  isInside: (el: T | null) => boolean,
): T | "dialog" | null {
  if (focusables.length === 0) return "dialog";
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (!isInside(active)) return shift ? last : first;
  if (shift && active === first) return last;
  if (!shift && active === last) return first;
  return null;
}
