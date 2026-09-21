/* ===== WALLET HEADER CONTENT COMPONENT ===== */
import { SelectorButtons } from "$button";
import { SortButton } from "$islands/button/SortButton.tsx";
import { ViewButton } from "$islands/button/ViewButton.tsx";
import { container2Icon, PillContentCount, ScrollFadeRow } from "$layout";
import {
  getCurrentPathname,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { formatNumberWithCommas } from "$lib/utils/ui/formatting/formatUtils.ts";
import { subtitlePrimary } from "$text";
import type { WalletHeaderContentProps } from "$types/ui.d.ts";

/* ===== COMPONENT ===== */
export const WalletHeaderContent = (
  {
    section = "all",
    tab = "balance",
    viewMode = "cardVertical",
    stampsTotal = 0,
    tokensTotal = 0,
  }: WalletHeaderContentProps,
) => {
  /* ===== EVENT HANDLERS ===== */
  const handleSectionChange = (value: string) => {
    if (typeof globalThis === "undefined" || !globalThis?.location) return;
    const params = new URLSearchParams(globalThis.location.search);
    if (value === "all") {
      params.delete("section");
    } else {
      params.set("section", value);
    }
    // Listings/Collections are stamps-only — fall back to Balance when the
    // newly selected section can no longer show them.
    if (
      value !== "stamps" && (tab === "listings" || tab === "collections")
    ) {
      params.delete("tab");
    }
    params.delete("stamps_page");
    params.delete("tokens_page");
    const query = params.toString();
    safeNavigate(getCurrentPathname() + (query ? `?${query}` : ""));
  };

  const handleTabChange = (value: string) => {
    if (typeof globalThis === "undefined" || !globalThis?.location) return;
    const params = new URLSearchParams(globalThis.location.search);
    if (value === "balance") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    params.delete("stamps_page");
    params.delete("tokens_page");
    const query = params.toString();
    safeNavigate(getCurrentPathname() + (query ? `?${query}` : ""));
  };

  /* ===== SUB-TAB OPTIONS ===== */
  // Listings/Collections have no Tokens equivalent — only offered when
  // Stamps is the active top-level section.
  const tabOptions = section === "stamps"
    ? [
      { value: "balance", label: "BALANCE" },
      { value: "created", label: "CREATED" },
      { value: "listings", label: "LISTINGS" },
      { value: "collections", label: "COLLECTIONS" },
    ]
    : [
      { value: "balance", label: "BALANCE" },
      // Tokens are "deployed", not "created" — Stamps keeps "CREATED".
      {
        value: "created",
        label: section === "tokens" ? "DEPLOYED" : "CREATED",
      },
    ];

  /* ===== COUNT PILL =====
   * Reflects only the currently active section + sub-tab combo - "all"
   * combines both panels' totals (both are always fetched together in
   * that mode, so no extra query is needed). */
  const countPill = section === "stamps"
    ? formatNumberWithCommas(stampsTotal)
    : section === "tokens"
    ? formatNumberWithCommas(tokensTotal)
    : formatNumberWithCommas(stampsTotal + tokensTotal);

  /* ===== RENDER ===== */
  return (
    <div class="flex flex-col w-full gap-1.5">
      <div class="relative flex flex-row justify-between items-start w-full -mb-2">
        <h2 class={`-mt-1.5 ${subtitlePrimary}`}>PORTFOLIO</h2>
        <PillContentCount value={countPill} />
      </div>

      {/* Section Selector + Sub-tab Selector + View/Sort Controls */}
      <ScrollFadeRow deps={[section, tab]}>
        {/* Section Selector - Left */}
        <div class="shrink-0">
          <SelectorButtons
            options={[
              { value: "all", label: "ALL" },
              { value: "stamps", label: "STAMPS" },
              { value: "tokens", label: "TOKENS" },
            ]}
            value={section}
            onChange={handleSectionChange}
            size="xs"
            color="primary"
          />
        </div>

        {/* Sub-tab Selector - Center */}
        {
          /* "all" only ever shows Balance data — hide the tab selector so
            users can't switch to a sub-tab with nothing to show there. */
        }
        {section !== "all" && (
          <div class="grow shrink-0 flex justify-center">
            <SelectorButtons
              options={tabOptions}
              value={tab}
              onChange={handleTabChange}
              size="xs"
              color="primary"
            />
          </div>
        )}

        {/* View Toggle + Sort Controls - Right */}
        {
          /* ml-auto: keeps this pinned right even when the sub-tab selector
            (the other flex-grow element) is hidden for "all". */
        }
        <div class="flex shrink-0 gap-3 ml-auto">
          <div class={container2Icon}>
            <ViewButton
              viewMode={viewMode}
              paramName="view"
              modes={["cardVertical", "cardSquare", "cardRow"]}
            />
          </div>
          <div class={`${container2Icon} gap-1.5 tablet:gap-1`}>
            <SortButton sortParam="sortBy" />
          </div>
        </div>
      </ScrollFadeRow>
    </div>
  );
};

export default WalletHeaderContent;
