/**
 * Text of the one-time update announcement (islands/Toast/NotificationUpdate.tsx).
 * Kept outside islands/ because Fresh treats every export there as an island.
 */
import type { BrandChain } from "$lib/utils/chain/brand.ts";
import { getClientChainId } from "$lib/utils/chain/clientChain.ts";

/**
 * Message content for update notification.
 * Supports multi-line formatting with bullet points.
 * `[label](https://...)` renders that label as the link. A bare
 * http(s) URL is linked as itself. stampchain.io links stay on this site.
 */
export const NOTIFICATION_UPDATE_MESSAGE = `New Leaderboard Page
• Leaderboard with top 500 ranking wallets and top 3 stamp whale collectors.
• View rankings by amount of stamps collected, or by value.
• Check out your [ranking](https://stampchain.io/leaderboard/).

Please clear browser cache and refresh the page for all updates to take effect.`;

/**
 * ECX has no valuation ranking, so the "or by value" line is omitted.
 */
export const NOTIFICATION_UPDATE_MESSAGE_ECX = `New Leaderboard Page
• Leaderboard with top 500 ranking wallets and top 3 stamp whale collectors.
• Check out your [ranking](https://ecx.stampchain.io/leaderboard/).

Please clear browser cache and refresh the page for all updates to take effect.`;

/** Bitcoin names stamp count and value. ECX names stamp count only. */
export function notificationUpdateMessage(
  chain: BrandChain = getClientChainId(),
): string {
  return chain === "ecx"
    ? NOTIFICATION_UPDATE_MESSAGE_ECX
    : NOTIFICATION_UPDATE_MESSAGE;
}
