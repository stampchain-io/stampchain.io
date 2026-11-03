import { Icon } from "$icon";
import { transitionColors } from "$layout";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";
import type { WalletSearchResult } from "$lib/utils/ui/search/navigationSearch.ts";

interface WalletSearchResultRowProps {
  result: WalletSearchResult;
}

export function WalletSearchResultRow({ result }: WalletSearchResultRowProps) {
  return (
    <li>
      <a
        href={`/wallet/${encodeURIComponent(result.address)}`}
        class={`flex items-center gap-5 px-7.5 py-1.5 hover:bg-color-background/60 focus-visible:bg-color-background/60 ${transitionColors} cursor-pointer`}
      >
        <div class="w-10 h-10 rounded bg-color-background/30 flex items-center justify-center flex-shrink-0">
          <Icon
            type="icon"
            name={result.name ? "userCircle" : "wallet"}
            weight="normal"
            size="md"
            color="neutral400"
          />
        </div>
        <div class="flex flex-col flex-1 min-w-0">
          <span class="text-sm font-medium text-color-neutral-400 truncate">
            {result.name || "VIEW WALLET"}
          </span>
          <span class="text-xs text-color-neutral-500 truncate">
            {result.address.startsWith("bc1p")
              ? abbreviateAddress(result.address, 20)
              : result.address}
          </span>
        </div>
      </a>
    </li>
  );
}
