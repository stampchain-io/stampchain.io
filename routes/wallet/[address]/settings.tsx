/* ===== WALLET SETTINGS PAGE ===== */
import { Handlers, PageProps } from "$fresh/server.ts";
import { WalletSettingsHeader } from "$header";
import { WalletSettingsContent } from "$islands/content/WalletSettingsContent.tsx";
import { containerBackground } from "$layout";
import { DATA_PLACEHOLDER_DEV } from "$lib/utils/dataPlaceholderProd.ts";
import { CreatorService } from "$server/services/creator/creatorService.ts";
import { StampService } from "$server/services/stampService.ts";

interface WalletSettingsData {
  /** Raw `creator` column. Null when the address has no row. */
  storedName: string | null;
  /**
   * Same resolution as the wallet page header: table row, else the
   * primary bitname, else null.
   */
  displayName: string | null;
}

export const handler: Handlers<WalletSettingsData> = {
  async GET(_req, ctx) {
    const { address } = ctx.params;
    if (DATA_PLACEHOLDER_DEV) {
      return ctx.render({ storedName: null, displayName: null });
    }

    const [storedResult, displayResult] = await Promise.allSettled([
      StampService.getCreatorNameByAddress(address),
      CreatorService.getCreatorNameByAddress(address),
    ]);

    return ctx.render({
      storedName: storedResult.status === "fulfilled"
        ? storedResult.value
        : null,
      displayName: displayResult.status === "fulfilled"
        ? displayResult.value
        : null,
    });
  },
};

export default function WalletSettingsPage(
  props: PageProps<WalletSettingsData>,
) {
  const { address } = props.params;
  const storedName = props.data?.storedName ?? null;
  const displayName = props.data?.displayName ?? null;

  return (
    <div
      class={`${containerBackground} gap-3`}
      f-client-nav
      data-partial={`/wallet/${address}/settings`}
    >
      <WalletSettingsHeader address={address} />
      <WalletSettingsContent
        key={address}
        address={address}
        storedName={storedName}
        displayName={displayName}
      />
    </div>
  );
}
