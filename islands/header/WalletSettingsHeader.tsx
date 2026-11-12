/* ===== WALLET SETTINGS HEADER ===== */
import { Icon } from "$icon";
import { InfoButton } from "$islands/button/InfoButton.tsx";
import { WalletSettingsInfo } from "$islands/modal/info/WalletSettingsInfo.tsx";
import { containerIcon } from "$layout";
import { titlePrimary } from "$text";

export function WalletSettingsHeader() {
  return (
    <div class="flex w-full items-center justify-between">
      <h1 class={`-mt-2 ${titlePrimary}`}>SETTINGS</h1>
      <div class="flex shrink-0 gap-3">
        <div class={containerIcon}>
          <Icon
            type="iconButton"
            name="edit"
            weight="normal"
            size="containerIcon"
            color="neutral400"
            ariaLabel="Edit settings"
            onClick={(e) => e.preventDefault()}
          />
        </div>
        <InfoButton modal={<WalletSettingsInfo />} />
      </div>
    </div>
  );
}
