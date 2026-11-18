/* ===== WALLET SETTINGS PAGE ===== */
import { Handlers, PageProps } from "$fresh/server.ts";
import { WalletSettingsHeader } from "$header";
import { WalletSettingsContent } from "$islands/content/WalletSettingsContent.tsx";
import { containerBackground } from "$layout";
import { DATA_PLACEHOLDER_DEV } from "$lib/utils/dataPlaceholderProd.ts";
import { SRC101Service } from "$server/services/src101/index.ts";
import { StampService } from "$server/services/stampService.ts";

interface SettingsBitname {
  name: string;
  primary: boolean;
}

interface WalletSettingsData {
  /** Raw `creator` column. Null when the address has no row. */
  creatorName: string | null;
  /** Unexpired SRC-101 domains. Primary rows come first. */
  bitnames: SettingsBitname[];
}

export const handler: Handlers<WalletSettingsData> = {
  async GET(_req, ctx) {
    const { address } = ctx.params;
    if (DATA_PLACEHOLDER_DEV) {
      return ctx.render({
        creatorName: null,
        bitnames: [],
      });
    }

    const [creatorResult, bitnameResult] = await Promise.allSettled([
      StampService.getCreatorNameByAddress(address),
      SRC101Service.QueryService.getDomainsForAddress(address),
    ]);

    return ctx.render({
      creatorName: creatorResult.status === "fulfilled"
        ? creatorResult.value
        : null,
      bitnames: bitnameResult.status === "fulfilled" ? bitnameResult.value : [],
    });
  },
};

export default function WalletSettingsPage(
  props: PageProps<WalletSettingsData>,
) {
  const { address } = props.params;
  const creatorName = props.data?.creatorName ?? null;
  const bitnames = props.data?.bitnames ?? [];

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
        creatorName={creatorName}
        bitnames={bitnames}
      />
    </div>
  );
}
