import { Icon } from "$icon";
import { openSRC20Search } from "$islands/modal/SearchSRC20Modal.tsx";
import { openStampSearch } from "$islands/modal/SearchStampModal.tsx";
import { useEffect } from "preact/hooks";

const isSRC20Context = (path: string) =>
  path.startsWith("/src20") ||
  /^\/tool\/src20\/(deploy|mint|transfer)(\/|$)/.test(path);

export function SearchButton() {
  const openContextualSearch = () => {
    const path = globalThis?.location?.pathname ?? "/";
    if (isSRC20Context(path)) {
      openSRC20Search();
    } else {
      openStampSearch();
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        openContextualSearch();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div class="relative flex items-center">
      <Icon
        type="iconButton"
        name="search"
        weight="normal"
        size="smR"
        color="custom"
        className="mb-[1px] mobileLg:-ml-1 -mr-0.5 mobileLg:mr-0 stroke-color-neutral-400 hover:stroke-color-hover"
        onClick={openContextualSearch}
        role="button"
        aria-label="Search"
      />
    </div>
  );
}
