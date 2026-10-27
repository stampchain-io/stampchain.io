/**
 * Tab must stay inside an open dialog: transaction forms open in modals, and
 * keyboard users must not wander into the page behind one mid-signature.
 */
import { assertEquals } from "@std/assert";
import { nextFocusTarget } from "$lib/utils/ui/accessibility/focusTrap.ts";

const fields = ["first", "middle", "last"] as const;
type F = typeof fields[number] | "page" | "dialog";
const inside = (el: F | null) =>
  el === "first" || el === "middle" || el === "last";

Deno.test("Tab on the last field wraps to the first", () => {
  assertEquals(nextFocusTarget<F>([...fields], "last", false, inside), "first");
});

Deno.test("Shift+Tab on the first field wraps to the last", () => {
  assertEquals(nextFocusTarget<F>([...fields], "first", true, inside), "last");
});

Deno.test("Tab between fields is left to the browser", () => {
  assertEquals(nextFocusTarget<F>([...fields], "middle", false, inside), null);
  assertEquals(nextFocusTarget<F>([...fields], "first", false, inside), null);
  assertEquals(nextFocusTarget<F>([...fields], "last", true, inside), null);
});

Deno.test("focus outside the dialog (or on the dialog itself) is pulled back in", () => {
  assertEquals(nextFocusTarget<F>([...fields], "page", false, inside), "first");
  assertEquals(nextFocusTarget<F>([...fields], "page", true, inside), "last");
  assertEquals(
    nextFocusTarget<F>([...fields], "dialog", false, inside),
    "first",
  );
  assertEquals(nextFocusTarget<F>([...fields], null, true, inside), "last");
});

Deno.test("a dialog with nothing focusable keeps focus on itself", () => {
  assertEquals(nextFocusTarget<F>([], "page", false, inside), "dialog");
});

Deno.test("the overlay no longer logs on every render", async () => {
  const src = await Deno.readTextFile(
    new URL("../../islands/layout/ModalOverlay.tsx", import.meta.url),
  );
  assertEquals(/console\.(log|debug|info)\(/.test(src), false);
  // and it is announced as a modal dialog
  assertEquals(src.includes('role="dialog"'), true);
  assertEquals(src.includes('aria-modal="true"'), true);
});
