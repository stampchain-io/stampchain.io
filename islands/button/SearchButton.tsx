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
        weight="light"
        size="custom"
        color="neutral400"
        className="w-6 h-6"
        onClick={openContextualSearch}
        role="button"
        aria-label="Search"
      />
    </div>
  );
}
