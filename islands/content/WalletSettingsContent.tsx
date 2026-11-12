/* ===== WALLET SETTINGS CONTENT ===== */
import { Button } from "$button";
import { walletContext } from "$client/wallet/wallet.ts";
import { InputField, inputTextarea } from "$form";
import { Icon } from "$icon";
import { container2, containerRowForm, StatItem } from "$layout";
import { walletOwnsAddress } from "$lib/utils/wallet/ownership.ts";
import { labelXs, subtitlePrimary, text } from "$text";
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

function Field(
  { label, children, class: extraClass = "" }: {
    label: string;
    children: ComponentChildren;
    class?: string;
  },
) {
  return (
    <div class={`flex min-w-0 flex-col gap-1 ${extraClass}`}>
      <h6 class={`${labelXs} ml-3`}>{label}</h6>
      {children}
    </div>
  );
}

function ProfileAvatar() {
  return (
    <div
      class={`${container2} flex shrink-0 items-center
        justify-center w-fit h-fit !rounded-full p-0.5`}
    >
      <Icon
        type="icon"
        name="userCircle"
        weight="extraLight"
        size="custom"
        color="custom"
        className="h-16 w-16 stroke-color-neutral-500"
        ariaLabel="Avatar"
      />
    </div>
  );
}

function ProfileFields() {
  return (
    <div class="flex w-full flex-col gap-3 mobileLg:flex-row">
      <div
        class={`${container2} flex w-full min-w-0 flex-col p-3
          mobileLg:w-1/2`}
      >
        <h2 class={subtitlePrimary}>PROFILE</h2>
        <div class="flex flex-col gap-3">
          <ProfileAvatar />
          <Field label="NAME">
            <InputField type="text" placeholder="Artist or user name" />
          </Field>
          <Field label="BITNAME">
            <InputField type="text" placeholder="Preferred bitname" />
          </Field>
          <Field label="BIO">
            <textarea
              class={inputTextarea}
              placeholder="Details about yourself"
            />
          </Field>
        </div>
      </div>
      <div
        class={`${container2} flex w-full min-w-0 flex-col p-3
          mobileLg:w-1/2`}
      >
        <h3 class={subtitlePrimary}>SOCIALS</h3>
        <div class="flex flex-col gap-3">
          <div class={containerRowForm}>
            <Field label="WEBSITE" class="flex-1">
              <InputField type="text" placeholder="example.com" />
            </Field>
            <Field label="EMAIL" class="flex-1">
              <InputField type="email" placeholder="your@email.com" />
            </Field>
          </div>
          <div class={containerRowForm}>
            <Field label="X" class="flex-1">
              <InputField type="text" placeholder="@username" />
            </Field>
            <Field label="TELEGRAM" class="flex-1">
              <InputField type="text" placeholder="@username" />
            </Field>
          </div>
          <div class={containerRowForm}>
            <Field label="INSTAGRAM" class="flex-1">
              <InputField type="text" placeholder="@username" />
            </Field>
            <Field label="STAMPMAP" class="flex-1">
              <InputField type="text" placeholder="pixel coordinates" />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      <ProfileFields />
      <div class="flex w-full flex-col gap-3 mobileLg:flex-row">
        <div
          class={`${container2} flex w-full min-w-0 flex-col p-3
            mobileLg:w-1/2`}
        >
          <h3 class={subtitlePrimary}>INTERLINK WALLETS</h3>
          <div class="flex flex-col gap-3">
            <StatItem
              label="CONNECTED WALLET ADDRESS"
              value={wallet.address}
              valueClass="!whitespace-normal break-all"
            />
            <StatItem
              label="INTERLINKED WALLETS"
              value="NO ADDITIONAL ADDRESSES CONNECTED"
            />
          </div>
        </div>
        <div
          class={`${container2} flex w-full min-w-0 flex-col p-3
            mobileLg:w-1/2`}
        >
          <h3 class={subtitlePrimary}>WEBSITE CUSTOMIZATION</h3>
          <StatItem
            label="TERMS OF SERVICE"
            value="ACCEPT TERMS OF SERVICES GLOBALLY"
          />
        </div>
      </div>
    </div>
  );
}

export { WalletSettingsContent };
