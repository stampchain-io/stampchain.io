/* ===== CHAIN BANNER ===== */
/**
 * Server-rendered strip above the site header naming the chain and what the
 * indexer has reached, e.g.
 *   "ECX · INDEXED BLOCK 973,800 · 0000… | FORK BLOCK 973,728 | TRANSACTIONS NOT OPEN YET"
 * Three separate facts: the indexed tip (or "INDEXED BLOCK UNAVAILABLE" when
 * the tip lookup failed), the fixed fork block, and whether the site sends
 * transactions. Rendered by _app.tsx only when the chain is not Bitcoin, so
 * Bitcoin pages carry no extra markup.
 */
import { ExplorerLink } from "$components/layout/ExplorerLink.tsx";
import {
  blockExplorerUrl,
  type ClientChainInfo,
} from "$lib/utils/chain/clientChain.ts";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";

export interface ChainBannerProps {
  label: string;
  height: number | null;
  blockHash: string | null;
  /** Links the hash to the chain's explorer; passed because the banner
    renders before the Header island publishes the chain. */
  chain?: ClientChainInfo | null;
  /** First block of the chain, shown apart from the indexed tip. */
  forkBlock?: number;
  /** Whether the site broadcasts transactions on this chain. Unknown: omitted. */
  transactionsOpen?: boolean;
}

const n = (value: number) => value.toLocaleString("en-US");

/** Where the indexer stands relative to the fork block. */
export function indexStatus(
  height: number | null,
  forkBlock: number | undefined,
): "unavailable" | "before-fork" | "indexing" | null {
  if (height === null) return "unavailable";
  if (forkBlock === undefined) return null;
  return height < forkBlock ? "before-fork" : "indexing";
}

export function ChainBanner(
  {
    label,
    height,
    blockHash,
    chain = null,
    forkBlock,
    transactionsOpen,
  }: ChainBannerProps,
) {
  const status = indexStatus(height, forkBlock);
  return (
    <div
      class="flex flex-wrap items-center gap-x-2 max-w-desktop w-full mx-auto
        px-shell-mobile mobileLg:px-shell-tablet tablet:px-shell-desktop
        pt-2 text-xs font-medium text-color-neutral-400 estamps-banner"
      data-chain={label.toLowerCase()}
      data-chain-height={height ?? undefined}
      data-chain-block-hash={blockHash ?? undefined}
      data-chain-status={status ?? undefined}
    >
      <span class="estamps-banner__group">
        <span class="font-bold text-color-primary-400 estamps-banner__chain">
          {label}
        </span>
        {height !== null
          ? (
            <span>
              · INDEXED BLOCK <span class="font-mono">{n(height)}</span>
            </span>
          )
          : (
            <span class="estamps-banner__warn">
              · INDEXED BLOCK UNAVAILABLE
            </span>
          )}
        {blockHash && (
          <span class="font-mono" title={blockHash}>
            ·{" "}
            <ExplorerLink
              href={chain ? blockExplorerUrl(blockHash, chain) : null}
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-color-hover"
            >
              <span class="tablet:hidden">
                {abbreviateAddress(blockHash, 8)}
              </span>
              <span class="hidden tablet:inline">{blockHash}</span>
            </ExplorerLink>
          </span>
        )}
        {status === "before-fork" && (
          <span class="estamps-banner__warn">· BEFORE FORK BLOCK</span>
        )}
      </span>
      {forkBlock !== undefined && (
        <span class="estamps-banner__group estamps-banner__fork">
          FORK BLOCK <span class="font-mono">{n(forkBlock)}</span>
        </span>
      )}
      {transactionsOpen !== undefined && (
        <span
          class={`estamps-banner__group estamps-banner__service${
            transactionsOpen ? "" : " estamps-banner__warn"
          }`}
        >
          {transactionsOpen ? "TRANSACTIONS OPEN" : "TRANSACTIONS NOT OPEN YET"}
        </span>
      )}
    </div>
  );
}
