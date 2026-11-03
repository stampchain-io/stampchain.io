import type { CreatorSearchResult } from "$lib/types/creator.ts";
import {
  classifySearchInput,
  generateSearchErrorMessage,
} from "$lib/utils/data/search/searchInputClassifier.ts";
import { isValidBitcoinAddress } from "$lib/utils/typeGuards.ts";

export type NavigationSearchType = "stamp" | "src20";

export interface WalletSearchResult {
  _addressLink: true;
  address: string;
  name?: string;
}

async function fetchSearchResults<T>(url: string): Promise<T[]> {
  const response = await fetch(url, {
    headers: { "X-API-Version": "2.3" },
  });
  if (!response.ok) throw new Error("Search request failed");
  const data = await response.json();
  if (!Array.isArray(data.data)) throw new Error("Invalid search response");
  return data.data;
}

/** Search users alongside the current asset type, preserving display names. */
export async function searchNavigation(
  term: string,
  searchType: NavigationSearchType,
): Promise<Array<Record<string, unknown> | WalletSearchResult>> {
  const query = term.trim();
  if (!query) return [];

  const encoded = encodeURIComponent(query);
  const assetPath = searchType === "stamp" ? "stamps" : "src20";
  const [assets, creators] = await Promise.allSettled([
    fetchSearchResults<Record<string, unknown>>(
      `/api/v2/${assetPath}/search?q=${encoded}`,
    ),
    fetchSearchResults<CreatorSearchResult>(
      `/api/v2/creators/search?q=${encoded}`,
    ),
  ]);

  const wallets = new Map<string, WalletSearchResult>();
  if (isValidBitcoinAddress(query)) {
    wallets.set(query, { _addressLink: true, address: query });
  }
  if (creators.status === "fulfilled") {
    for (const creator of creators.value) {
      wallets.set(creator.address, { _addressLink: true, ...creator });
    }
  }

  const results = [
    ...wallets.values(),
    ...(assets.status === "fulfilled" ? assets.value : []),
  ];
  // Keep usable results if one search fails, but don't present a failed
  // lookup as "no results" when neither search produced anything.
  if (
    !results.length &&
    (assets.status === "rejected" || creators.status === "rejected")
  ) {
    throw new Error("Search unavailable");
  }
  return results;
}

export function navigationSearchError(
  term: string,
  searchType: NavigationSearchType,
): string {
  const { type } = classifySearchInput(term);
  if (type === "ticker" || type === "unknown") {
    const assets = searchType === "stamp" ? "stamps" : "tokens";
    return `NO RESULTS FOUND\n${term.trim()}\nNo users or ${assets} match this search`;
  }
  return generateSearchErrorMessage(term, searchType);
}
