/* ===== VIEW MODE TOGGLE BUTTON COMPONENT ===== */
import { Icon } from "$components/icon/IconBase.tsx";
import {
  getCurrentPathname,
  safeNavigate,
} from "$lib/utils/navigation/freshNavigationUtils.ts";
import { useCallback } from "preact/hooks";

/* ===== TYPES ===== */
type ViewMode = "detail" | "minimal" | "row";

/* ===== COMPONENT ===== */
export function ViewButton(
  { viewMode }: { viewMode: ViewMode },
) {
  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      if (typeof globalThis === "undefined" || !globalThis?.location) return;
      const params = new URLSearchParams(globalThis.location.search);
      params.set("view", mode);
      safeNavigate(getCurrentPathname() + `?${params.toString()}`);
    },
    [],
  );

  const nextMode: ViewMode = viewMode === "detail"
    ? "minimal"
    : viewMode === "minimal"
    ? "row"
    : "detail";

  const iconName = viewMode === "minimal"
    ? "viewCardMinimal"
    : viewMode === "row"
    ? "viewRow"
    : "viewCardDetail";

  const ariaLabel = viewMode === "detail"
    ? "Switch to minimal grid view"
    : viewMode === "minimal"
    ? "Switch to row view"
    : "Switch to detailed grid view";

  return (
    <Icon
      type="iconButton"
      name={iconName}
      weight="bold"
      size="xxxs"
      color="grey"
      onClick={() => handleViewModeChange(nextMode)}
      ariaLabel={ariaLabel}
    />
  );
}
