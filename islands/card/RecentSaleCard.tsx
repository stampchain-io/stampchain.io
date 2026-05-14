/* ===== RECENT SALE CARD COMPONENT ===== */
import { Icon } from "$icon";
import { ActivityBadge } from "$islands/badge/index.ts";
import { StampCard } from "$islands/card/StampCard.tsx";
import { container2, shadowGlowPurple } from "$layout";
import { AccessibilityUtils } from "$lib/utils/ui/accessibility/accessibilityUtils.ts";
import {
  abbreviateAddress,
  formatBTCAmount,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import type { RecentSaleCardProps } from "$types/ui.d.ts";

export function RecentSaleCard({
  sale,
  showFullDetails = false,
  btc_price_usd = 0,
}: RecentSaleCardProps) {
  const explorerBaseUrl = "https://mempool.space/tx/";
  const addressExplorerUrl = "https://mempool.space/address/";

  // Calculate USD value if BTC price is available
  const usdValue = btc_price_usd && sale.sale_data?.btc_amount
    ? sale.sale_data.btc_amount * btc_price_usd
    : null;

  // Generate accessibility labels
  const cardLabel = AccessibilityUtils.getSaleCardLabel(sale);
  const transactionDescription = AccessibilityUtils
    .getSaleTransactionDescription(sale);

  return (
    <div
      class={`${container2} border-2 border-transparent hover:border-color-purple-light ${shadowGlowPurple} transition-all duration-200 overflow-hidden`}
      role="article"
      aria-label={cardLabel}
      aria-describedby={showFullDetails
        ? `transaction-${sale.tx_hash}`
        : undefined}
    >
      {/* Stamp Preview */}
      <div class="relative">
        <StampCard
          stamp={sale}
          isRecentSale
          showMinDetails={!showFullDetails}
          showDetails={showFullDetails}
        />

        {/* Sale Badge */}
        {sale.sale_data && (
          <div class="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
            SOLD
          </div>
        )}

        {/* Activity Badge */}
        {sale.activity_level && (
          <div class="absolute top-2 left-2">
            <ActivityBadge level={sale.activity_level} size="sm" />
          </div>
        )}
      </div>

      {/* Enhanced Transaction Details */}
      {showFullDetails && sale.sale_data && (
        <div
          class="px-4 pb-4 space-y-3 border-t border-gray-700 mt-4 pt-4"
          id={`transaction-${sale.tx_hash}`}
          aria-label={transactionDescription}
        >
          {/* Price Information */}
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Sale Price:</span>
            <div class="text-right">
              <div class="font-mono text-white font-bold">
                {formatBTCAmount(sale.sale_data.btc_amount)} BTC
              </div>
              {usdValue && (
                <div class="text-gray-400 text-xs">
                  ${usdValue.toFixed(2)} USD
                </div>
              )}
            </div>
          </div>

          {/* Time Information */}
          {sale.sale_data.time_ago && (
            <div class="flex justify-between items-center">
              <span class="text-gray-400 text-sm">Sold:</span>
              <span class="text-white text-sm">{sale.sale_data.time_ago}</span>
            </div>
          )}

          {/* Buyer Information */}
          {sale.sale_data.buyer_address && (
            <div class="flex justify-between items-center">
              <span class="text-gray-400 text-sm">Buyer:</span>
              <a
                href={`${addressExplorerUrl}${sale.sale_data.buyer_address}`}
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-400 hover:text-blue-300 transition-colors text-sm font-mono flex items-center gap-1"
              >
                {abbreviateAddress(sale.sale_data.buyer_address, 6)}
                <Icon
                  name="external-link"
                  size="xs"
                  type="icon"
                  weight="normal"
                  color="grey"
                />
              </a>
            </div>
          )}

          {/* Dispenser Information */}
          {sale.sale_data.dispenser_address && (
            <div class="flex justify-between items-center">
              <span class="text-gray-400 text-sm">Via Dispenser:</span>
              <a
                href={`${addressExplorerUrl}${sale.sale_data.dispenser_address}`}
                target="_blank"
                rel="noopener noreferrer"
                class="text-purple-400 hover:text-purple-300 transition-colors text-sm font-mono flex items-center gap-1"
              >
                {abbreviateAddress(sale.sale_data.dispenser_address, 6)}
                <Icon
                  name="external-link"
                  size="xs"
                  type="icon"
                  weight="normal"
                  color="grey"
                />
              </a>
            </div>
          )}

          {/* Satoshi Amount */}
          {sale.sale_data.btc_amount_satoshis && (
            <div class="flex justify-between items-center">
              <span class="text-gray-400 text-sm">Satoshis:</span>
              <span class="text-white text-sm font-mono">
                {sale.sale_data.btc_amount_satoshis.toLocaleString()} sats
              </span>
            </div>
          )}

          {/* Block Information */}
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Block:</span>
            <span class="text-white text-sm font-mono">
              #{sale.sale_data.block_index.toLocaleString()}
            </span>
          </div>

          {/* Transaction Links */}
          <div class="pt-2 border-t border-gray-600 space-y-2">
            {/* Main Sale Transaction */}
            <a
              href={`${explorerBaseUrl}${sale.sale_data.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm w-full py-2 bg-gray-800 rounded hover:bg-gray-700"
            >
              <Icon
                name="external-link"
                size="xs"
                type="icon"
                weight="normal"
                color="custom"
              />
              View Sale Transaction
            </a>

            {/* Dispenser Transaction */}
            {sale.sale_data.dispenser_tx_hash && (
              <a
                href={`${explorerBaseUrl}${sale.sale_data.dispenser_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center justify-center gap-2 text-purple-400 hover:text-purple-300 transition-colors text-sm w-full py-2 bg-gray-800 rounded hover:bg-gray-700"
              >
                <Icon
                  name="external-link"
                  size="xs"
                  type="icon"
                  weight="normal"
                  color="grey"
                />
                View Dispenser Transaction
              </a>
            )}
          </div>
        </div>
      )}

      {/* Compact Sale Info for Non-Details View */}
      {!showFullDetails && sale.sale_data && (
        <div class="px-4 pb-3 border-t border-gray-700">
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-400">Sold:</span>
            <div class="text-right">
              <div class="text-white font-bold">
                {formatBTCAmount(sale.sale_data.btc_amount)} BTC
              </div>
              {sale.sale_data.time_ago && (
                <div class="text-gray-400 text-xs">
                  {sale.sale_data.time_ago}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
