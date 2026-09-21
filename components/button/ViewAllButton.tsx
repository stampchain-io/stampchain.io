/* ===== VIEW ALL BUTTON COMPONENT ===== */
import { Button } from "$button";
import type { ViewAllButtonProps } from "$types/ui.d.ts";

/* ===== COMPONENT ===== */
export function ViewAllButton({ href }: ViewAllButtonProps) {
  return (
    <div class="flex justify-end w-full mt-5">
      <Button
        variant="flat"
        color="primary"
        href={href}
        f-partial={href}
        target="_top"
      >
        VIEW ALL
      </Button>
    </div>
  );
}
