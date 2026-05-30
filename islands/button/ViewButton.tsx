/* ===== VIEW MODE TOGGLE BUTTON COMPONENT ===== */
import { Icon } from "$components/icon/IconBase.tsx";
import {
  getCurrentPathname,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { useCallback } from "preact/hooks";

/* ===== COMPONENT ===== */
export function ViewButton(
  { viewMode }: { viewMode: "detail" | "minimal" },
) {
  const handleViewModeChange = useCallback(
    (mode: "detail" | "minimal") => {
      if (typeof globalThis === "undefined" || !globalThis?.location) return;
      const params = new URLSearchParams(globalThis.location.search);
      params.set("view", mode);
      safeNavigate(getCurrentPathname() + `?${params.toString()}`);
    },
    [],
  );

  return (
    <Icon
      type="iconButton"
      name={viewMode === "minimal" ? "viewCardMinimal" : "viewCardDetail"}
      weight="bold"
      size="md"
      color="grey"
      className="p-1.5 bg-transparent rounded-full hover:bg-gradient-to-b hover:from-color-neutral-800 hover:via-color-neutral-800 hover:to-color-neutral-900"
      onClick={() =>
        handleViewModeChange(
          viewMode === "minimal" ? "detail" : "minimal",
        )}
      ariaLabel={viewMode === "minimal"
        ? "Switch to detailed view"
        : "Switch to minimal view"}
    />
  );
}
