import { Icon } from "$icon";
import type { SettingProps } from "$types/ui.d.ts";
import { useEffect, useState } from "preact/hooks";

export function SettingsButton({
  initFilter = [],
  open = false,
  handleOpen,
  filterButtons,
  onFilterClick,
}: SettingProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [localFilters, setLocalFilters] = useState<string[]>(initFilter);

  useEffect(() => {
    setLocalFilters(initFilter);
  }, [initFilter]);

  const handleFilterClick = (filter: string) => {
    if (onFilterClick) {
      onFilterClick(filter);
    }
    handleOpen?.(false);
  };

  return (
    <div
      class={`rounded-full flex flex-col items-center gap-1 h-fit relative z-[10] ${
        open
          ? "px-6 py-4 border-2 border-color-purple-semilight bg-color-background"
          : ""
      }`}
    >
      {open
        ? (
          <>
            <Icon
              type="iconButton"
              name="x"
              size="lg"
              color="custom"
              weight="normal"
              className="absolute top-5 right-2"
              onClick={() => handleOpen?.(false)}
              ariaLabel="Close"
            />
            <p class="text-lg font-black text-color-purple-light mb-1">
              TOOLS
            </p>
            {filterButtons?.map((filter: string) => (
              <button
                key={filter}
                type="button"
                class={`cursor-pointer text-xs tablet:text-sm font-black ${
                  localFilters.includes(filter)
                    ? "text-color-purple-light "
                    : "text-color-purple-semilight hover:text-color-purple-light"
                }`}
                onClick={() => handleFilterClick(filter)}
              >
                {filter.toUpperCase()}
              </button>
            ))}
          </>
        )
        : (
          <Icon
            type="iconButton"
            name="gear"
            weight="normal"
            size="lg"
            color="neutral400"
            ariaLabel="Settings"
            onClick={() => handleOpen?.(true)}
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
          />
        )}
      {visible && (
        <div
          role="tooltip"
          className="absolute bottom-full right-[0.3px] mb-2 z-10 px-3 py-2 text-sm font-medium text-white bg-color-grey-dark rounded-xl shadow-md"
        >
          Settings
          <div class="tooltip-arrow" />
        </div>
      )}
    </div>
  );
}
