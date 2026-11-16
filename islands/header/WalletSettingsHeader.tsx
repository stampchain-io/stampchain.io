/* ===== WALLET SETTINGS HEADER ===== */
import { walletContext } from "$client/wallet/wallet.ts";
import { EditButton } from "$islands/button/EditButton.tsx";
import { InfoButton } from "$islands/button/InfoButton.tsx";
import { walletSettingsEditing } from "$islands/content/WalletSettingsContent.tsx";
import { WalletSettingsInfo } from "$islands/modal/info/WalletSettingsInfo.tsx";
import { walletOwnsAddress } from "$lib/utils/wallet/ownership.ts";
import { titlePrimary } from "$text";
import { useEffect, useState } from "preact/hooks";

export function WalletSettingsHeader({ address }: { address: string }) {
  const { wallet, isConnected } = walletContext;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isOwner = mounted && isConnected &&
    walletOwnsAddress(wallet, address);

  return (
    <div class="flex w-full items-center justify-between">
      <h1 class={`-mt-2 ${titlePrimary}`}>SETTINGS</h1>
      <div class="flex shrink-0 gap-3">
        {isOwner && (
          <EditButton
            editing={walletSettingsEditing.value}
            onEditingChange={(editing) => {
              walletSettingsEditing.value = editing;
            }}
          />
        )}
        <InfoButton modal={<WalletSettingsInfo />} />
      </div>
    </div>
  );
}
