/* ===== WALLET SETTINGS CONTENT ===== */
import { Button } from "$button";
import { walletContext } from "$client/wallet/wallet.ts";
import { walletOwnsAddress } from "$lib/utils/wallet/ownership.ts";
import { labelSm, subtitlePrimary, text, textSm } from "$text";
import { useEffect, useState } from "preact/hooks";

const PROFILE_FIELDS = [
  "AVATAR",
  "NAME",
  "BIO",
  "WEBSITE",
  "EMAIL",
  "X",
  "TELEGRAM",
  "INSTAGRAM",
];

function WalletSettingsContent({ address }: { address: string }) {
  const { wallet, isConnected, showConnectModal } = walletContext;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isOwner = mounted && isConnected &&
    walletOwnsAddress(wallet, address);

  if (!isOwner) {
    return (
      <div class="flex flex-col">
        <h2 class={subtitlePrimary}>PROFILE</h2>
        {mounted && !isConnected && (
          <>
            <h5 class={`${text} mb-1`}>
              YOU ARE NOT CONNECTED WITH THIS WALLET ADDRESS
            </h5>
            <Button
              variant="flat"
              color="primary"
              class="self-start"
              onClick={() => showConnectModal()}
            >
              CONNECT YOUR WALLET
            </Button>
          </>
        )}
        {mounted && isConnected && (
          <>
            <h5 class={`${text} mb-1`}>
              THE CONNECTED WALLET DOES NOT CONTROL THIS ADDRESS
            </h5>
            <Button
              variant="outline"
              color="primary"
              class="self-start"
              href={`/wallet/${wallet.address}/settings`}
            >
              VIEW YOUR SETTINGS
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div class="flex flex-col gap-3 w-full">
      <div class="flex flex-col">
        <h2 class={subtitlePrimary}>PROFILE</h2>
        {PROFILE_FIELDS.map((field) => (
          <h6 key={field} class={labelSm}>{field}</h6>
        ))}
      </div>
      <div class="flex flex-col">
        <h3 class={subtitlePrimary}>LINKED ADDRESSES</h3>
        <h6 class={labelSm}>LINK BITCOIN ADDRESSES</h6>
      </div>
      <div class="flex flex-col">
        <h3 class={subtitlePrimary}>TERMS OF SERVICE</h3>
        <h6 class={labelSm}>ACCEPT TERMS OF SERVICE</h6>
        <a href="/termsofservice" class={textSm}>
          Read the Terms of Service
        </a>
      </div>
    </div>
  );
}

export { WalletSettingsContent };
