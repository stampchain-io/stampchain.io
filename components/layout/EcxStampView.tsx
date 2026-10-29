/* ===== ECX STAMP VIEW ===== */
/**
 * The ECX-native / inherited-history switch above ECX stamp lists, and the
 * empty state for an ECX-native list with nothing in it. Plain links, no
 * island: each option is the same page with or without `?history=inherited`.
 * Only ECX routes render these; Bitcoin pages carry no extra markup.
 */
import {
  ECX_FORK_BLOCK,
  type EcxStampView,
  ecxViewHref,
} from "$lib/utils/chain/ecxView.ts";

export interface EcxViewState {
  view: EcxStampView;
  nativeHref: string;
  inheritedHref: string;
  /** Filters other than the view are applied, so "none yet" may not hold. */
  filtered: boolean;
}

/** Query parameters that only move around a list, not filter it. */
const NON_FILTER_PARAMS = new Set([
  "history",
  "page",
  "limit",
  "section",
  "view",
  "sortBy",
  "_fresh",
]);

/** View state for a request to an ECX stamp list. */
export function ecxViewState(url: URL, view: EcxStampView): EcxViewState {
  const filtered = [...url.searchParams.keys()].some((k) =>
    !NON_FILTER_PARAMS.has(k)
  );
  return {
    view,
    nativeHref: ecxViewHref(url, "native"),
    inheritedHref: ecxViewHref(url, "inherited"),
    filtered,
  };
}

const forkBlock = ECX_FORK_BLOCK.toLocaleString("en-US");

export function EcxStampViewToggle({ state }: { state: EcxViewState }) {
  const option = (view: EcxStampView, href: string, label: string) => (
    <a
      href={href}
      class={`estamps-view__option${
        state.view === view ? " estamps-view__option--active" : ""
      }`}
      aria-current={state.view === view ? "page" : undefined}
    >
      {label}
    </a>
  );
  return (
    <nav class="estamps-view" aria-label="Stamp history">
      <div class="estamps-view__options">
        {option("native", state.nativeHref, "ECX-NATIVE")}
        {option("inherited", state.inheritedHref, "INHERITED HISTORY")}
      </div>
      <p class="estamps-view__hint">
        {state.view === "native"
          ? `Stamps created on ECX, from block ${forkBlock}.`
          : `Everything indexed, including Bitcoin history before block ${forkBlock}.`}
      </p>
    </nav>
  );
}

export function EcxNativeEmpty({ state }: { state: EcxViewState }) {
  return (
    <section class="estamps-empty" aria-live="polite">
      <h3 class="estamps-empty__title">
        {state.filtered
          ? "NO ECX-NATIVE STAMPS MATCH"
          : "NO ECX-NATIVE STAMPS YET"}
      </h3>
      <p class="estamps-empty__text">
        {state.filtered
          ? `No stamps from block ${forkBlock} onwards match these filters.`
          : `ECX-native stamps start at block ${forkBlock}, the first ECX block. None have been indexed yet.`}
      </p>
      <p class="estamps-empty__text">
        Stamps inherited from Bitcoin history are still here.
      </p>
      <a href={state.inheritedHref} class="estamps-button">
        VIEW INHERITED HISTORY
      </a>
    </section>
  );
}
