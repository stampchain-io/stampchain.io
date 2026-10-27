/* ===== CHAIN BANNER ===== */
/**
 * Server-rendered strip above the site header naming the chain and the
 * indexed tip, e.g. "ECX · BLOCK 973,800 · 0000…". Rendered by _app.tsx only
 * when the chain is not Bitcoin, so Bitcoin pages carry no extra markup.
 */
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";

export interface ChainBannerProps {
  label: string;
  height: number | null;
  blockHash: string | null;
}

export function ChainBanner({ label, height, blockHash }: ChainBannerProps) {
  return (
    <div
      class="flex flex-wrap items-center gap-x-2 max-w-desktop w-full mx-auto
        px-shell-mobile mobileLg:px-shell-tablet tablet:px-shell-desktop
        pt-2 text-xs font-medium text-color-neutral-400"
      data-chain={label.toLowerCase()}
      data-chain-height={height ?? undefined}
      data-chain-block-hash={blockHash ?? undefined}
    >
      <span class="font-bold text-color-primary-400">{label}</span>
      {height !== null && (
        <span>
          · BLOCK{" "}
          <span class="font-mono">{height.toLocaleString("en-US")}</span>
        </span>
      )}
      {blockHash && (
        <span class="font-mono" title={blockHash}>
          · <span class="tablet:hidden">{abbreviateAddress(blockHash, 8)}</span>
          <span class="hidden tablet:inline">{blockHash}</span>
        </span>
      )}
    </div>
  );
}
