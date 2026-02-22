import type { BaseToast } from "$types/utils.d.ts";
import { signal } from "@preact/signals";

// Re-export BaseToast for external usage
export type { BaseToast };

// We need the Toast type, but ToastProvider itself uses this signal, so we can't import from there directly to avoid circular dependency if Toast is defined there.
// Let's define a local ToastMessage type here or ensure Toast is defined in a base types file.

// Assuming Toast type will be like this, or imported from a base types definition:

export const toastSignal = signal<BaseToast | null>(null);

export function showToast(
  message: string,
  type: BaseToast["type"],
  autoDismiss = true,
  body?: BaseToast["body"],
) {
  toastSignal.value = { message, type, autoDismiss, body };
  // Clear the signal after a short delay to allow the ToastProvider to pick up the change.
  // This ensures that if showToast is called multiple times quickly with the same content,
  // each call will trigger an update in subscribers because the signal value changes to null then back.
  setTimeout(() => {
    // Only clear if it's still the same message, to avoid clearing a newer different toast.
    if (
      toastSignal.value &&
      toastSignal.value.message === message &&
      toastSignal.value.type === type
    ) {
      toastSignal.value = null;
    }
  }, 50);
}
