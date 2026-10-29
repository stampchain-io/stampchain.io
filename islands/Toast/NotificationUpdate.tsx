// islands/Toast/NotificationUpdate.tsx
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { notificationUpdateMessage } from "$lib/utils/ui/notifications/updateAnnouncement.ts";
import { useEffect } from "preact/hooks";

/**
 * Update Notification Configuration
 * All settings for the major app update notification
 *
 * To show a new announcement:
 * 1. Increment NOTIFICATION_UPDATE_VERSION version (e.g., "v1" -> "v2")
 * 2. Update the message in lib/utils/ui/notifications/updateAnnouncement.ts
 * 3. Adjust timing/behavior if needed
 */

/**
 * Feature flag to enable/disable the notification
 * Set to false to prevent notification from showing
 */
const SHOW_NOTIFICATION = true;

/**
 * Delay before showing notification (milliseconds)
 */
const DELAY = 2000;

/**
 * Whether toast should auto-dismiss
 * false = user must manually close it
 */
const AUTO_DISMISS = false;

/**
 * Toast type - "info" | "success" | "warning" | "error"
 */
const TYPE = "info" as const;

/**
 * localStorage key for tracking if update notification has been shown
 * INCREMENT VERSION for each new major update announcement
 */
const NOTIFICATION_UPDATE_VERSION = "feature-update-v3.4";

/**
 * Displays a one-time notification for major app updates
 * All configuration is self-contained in this file
 */
export function NotificationUpdate() {
  useEffect(() => {
    // Feature flag check - disable notification
    if (!SHOW_NOTIFICATION) return;

    // Only run on client side
    if (typeof window === "undefined") return;

    // Check if this version has been shown
    const hasBeenShown = localStorage.getItem(NOTIFICATION_UPDATE_VERSION);

    if (hasBeenShown) return; // Already shown, exit early

    // Delay for better UX (let page settle first)
    const timer = setTimeout(() => {
      // Show the toast
      // Read the chain when the toast opens: the Header island has
      // published it by then (it hydrates in the same pass, DELAY earlier).
      showToast(
        notificationUpdateMessage(),
        TYPE,
        AUTO_DISMISS,
        undefined,
        true,
      );

      // Mark as shown (user has been notified)
      localStorage.setItem(NOTIFICATION_UPDATE_VERSION, "true");
    }, DELAY);

    return () => clearTimeout(timer);
  }, []);

  // No visual render - this is a pure behavior component
  return null;
}
