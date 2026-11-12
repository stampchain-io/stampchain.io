/* ===== WALLET SETTINGS PAGE ===== */
import { PageProps } from "$fresh/server.ts";
import { WalletSettingsHeader } from "$header";
import { WalletSettingsContent } from "$islands/content/WalletSettingsContent.tsx";
import { containerBackground } from "$layout";

export default function WalletSettingsPage(props: PageProps) {
  const { address } = props.params;

  return (
    <div
      class={`${containerBackground} gap-3`}
      f-client-nav
      data-partial={`/wallet/${address}/settings`}
    >
      <WalletSettingsHeader />
      <WalletSettingsContent address={address} />
    </div>
  );
}
