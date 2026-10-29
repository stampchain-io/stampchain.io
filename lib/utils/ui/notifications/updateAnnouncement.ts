/**
 * Text of the one-time update announcement (islands/Toast/NotificationUpdate.tsx).
 * Kept outside islands/ because Fresh treats every export there as an island.
 */
import type { BrandChain } from "$lib/utils/chain/brand.ts";
import { getClientChainId } from "$lib/utils/chain/clientChain.ts";

/**
 * Message content for update notification
 * Supports multi-line formatting with bullet points
 */
export const NOTIFICATION_UPDATE_MESSAGE = `Create Stamp tool update
• Redesigned Stamp creator page with Classic, Posh and Recursive modes.
• New Recursive Stamp builder that lets you add layers of stamp asset images and/or text, tweak the elements, to easily create a new lightweight recursive stamp.
• Improved fee calculator with transaction fees, bitcoin block and price display.

Please clear browser cache and refresh the page for all updates to take effect.`;

/**
 * The same announcement for ECX, where the fee calculator shows no coin
 * price: it names neither Bitcoin nor a price.
 */
export const NOTIFICATION_UPDATE_MESSAGE_ECX = `Create Stamp tool update
• Redesigned Stamp creator page with Classic, Posh and Recursive modes.
• New Recursive Stamp builder that lets you add layers of stamp asset images and/or text, tweak the elements, to easily create a new lightweight recursive stamp.
• Improved fee calculator with transaction fees and current block display.

Please clear browser cache and refresh the page for all updates to take effect.`;

/** The announcement for the chain. Bitcoin's text is unchanged. */
export function notificationUpdateMessage(
  chain: BrandChain = getClientChainId(),
): string {
  return chain === "ecx"
    ? NOTIFICATION_UPDATE_MESSAGE_ECX
    : NOTIFICATION_UPDATE_MESSAGE;
}
