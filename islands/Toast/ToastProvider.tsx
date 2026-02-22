// ToastContext.tsx
import { ToastComponent } from "$islands/Toast/ToastComponent.tsx";
import {
  type BaseToast,
  toastSignal,
} from "$lib/utils/ui/notifications/toastSignal.ts";
import type { ToastProviderProps } from "$types/ui.d.ts";
import { useEffect, useState } from "preact/hooks";

// Re-define Toast type for internal state management in ToastProvider if needed, or use BaseToast directly
// This Toast type is for the state array within ToastProvider (which includes an id)
export interface Toast extends Omit<BaseToast, "autoDismiss"> {
  id: string; // Toast instances in the provider need an id for keying and removal
  duration: number; // Duration for the toast display
  autoDismiss: boolean; // Required: whether the toast should auto-dismiss
  isAnimatingOut?: boolean; // Track if toast is animating out
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const getDuration = (type: BaseToast["type"]) => {
    return type === "success" ? 3000 : 7000;
  };

  const shouldAutoDismiss = (_type: BaseToast["type"]) => {
    return true;
  };

  // This function adds to the local `toasts` state array
  const internalAddToast = (
    message: string,
    type: BaseToast["type"],
    autoDismiss?: boolean,
    body?: BaseToast["body"],
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const duration = getDuration(type);
    const shouldDismiss = autoDismiss !== undefined
      ? autoDismiss
      : shouldAutoDismiss(type);

    setToasts((prevToasts) => [
      ...prevToasts,
      {
        id,
        message,
        body,
        type,
        autoDismiss: shouldDismiss,
        duration,
        isAnimatingOut: false,
      },
    ]);
    if (shouldDismiss) {
      // Wait for progress bar to complete, then start notification-exit animation
      setTimeout(() => {
        setToasts((prevToasts) =>
          prevToasts.map((toast) =>
            toast.id === id ? { ...toast, isAnimatingOut: true } : toast
          )
        );
        // Remove toast after notification-exit animation completes
        setTimeout(() => {
          internalRemoveToast(id);
        }, 400); // notification-exit animation duration
      }, duration); // Wait for full progress bar duration
    }
  };

  const internalRemoveToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const handleManualClose = (id: string) => {
    // First trigger the animation
    setToasts((prevToasts) =>
      prevToasts.map((toast) =>
        toast.id === id ? { ...toast, isAnimatingOut: true } : toast
      )
    );
    // Then remove after animation completes
    setTimeout(() => {
      internalRemoveToast(id);
    }, 400); // Match animation duration
  };

  useEffect(() => {
    // Subscribe to the global toast signal
    // The return value of signal.subscribe is the unsubscribe function
    const unsubscribe = toastSignal.subscribe((toastMsg: BaseToast | null) => {
      if (toastMsg) {
        internalAddToast(
          toastMsg.message,
          toastMsg.type,
          toastMsg.autoDismiss,
          toastMsg.body,
        );
      }
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []); // Empty dependency array, subscribes once

  return (
    <>
      {children}
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          id={toast.id}
          message={toast.message}
          body={toast.body}
          type={toast.type}
          onClose={() => handleManualClose(toast.id)}
          autoDismiss={toast.autoDismiss}
          duration={toast.duration}
          isAnimatingOut={toast.isAnimatingOut ?? false}
        />
      ))}
    </>
  );
};
