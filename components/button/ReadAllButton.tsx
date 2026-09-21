import { Button } from "$button";
import type { ReadAllButtonProps } from "$types/ui.d.ts";
/* ===== READ ALL BUTTON COMPONENT ===== */
/* ===== COMPONENT ===== */
export function ReadAllButton({ href = "/howto" }: ReadAllButtonProps) {
  return (
    <div class="flex justify-start">
      <Button
        variant="outline"
        color="neutral"
        size="md"
        href={href}
        target="_top"
      >
        READ MORE
      </Button>
    </div>
  );
}

/* ===== TEXT ===== */
/*
  <a
    href={href}
    target="_top"
    class="font-semibold text-base text-color-grey-light hover:text-color-grey link-neutral-200-bold"
  >
    Read the full guide
  </a>
*/
