/* ===== WALLET SETTINGS CONTENT ===== */
import { Button } from "$button";
import { walletContext } from "$client/wallet/wallet.ts";
import { inputCheckbox, InputField, inputTextarea } from "$form";
import { Icon } from "$icon";
import { AddRemoveButton } from "$islands/button/AddRemoveButton.tsx";
import { container2, containerRowForm, StatItem } from "$layout";
import { walletOwnsAddress } from "$lib/utils/wallet/ownership.ts";
import { labelXs, subtitlePrimary, text, valueSm } from "$text";
import { signal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

/**
 * Shared by the settings header and this island. Close and check both
 * set it back to false; check does not persist anything yet.
 */
export const walletSettingsEditing = signal(false);

interface SettingsField {
  label: string;
  placeholder: string;
  type?: "text" | "email";
  multiline?: boolean;
  wrap?: boolean;
}

const PROFILE_FIELDS: SettingsField[] = [
  { label: "NAME", placeholder: "Artist or user name" },
  { label: "BITNAME", placeholder: "Preferred bitname" },
  {
    label: "BIO",
    placeholder: "Details about yourself",
    multiline: true,
    wrap: true,
  },
];

const SOCIAL_ROWS: SettingsField[][] = [
  [
    { label: "WEBSITE", placeholder: "example.com" },
    { label: "EMAIL", placeholder: "your@email.com", type: "email" },
  ],
  [
    { label: "X", placeholder: "@username" },
    { label: "TELEGRAM", placeholder: "@username" },
  ],
  [
    { label: "INSTAGRAM", placeholder: "@username" },
    { label: "STAMPMAP", placeholder: "pixel coordinates" },
  ],
];

const panelClass = `${container2} flex w-full min-w-0 flex-col p-3
  mobileLg:w-1/2`;

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

function SettingsInput(
  { field, class: extraClass = "" }: {
    field: SettingsField;
    class?: string;
  },
) {
  return (
    <Field label={field.label} class={extraClass}>
      {field.multiline
        ? (
          <textarea
            class={inputTextarea}
            placeholder={field.placeholder}
          />
        )
        : (
          <InputField
            type={field.type ?? "text"}
            placeholder={field.placeholder}
          />
        )}
    </Field>
  );
}

function SettingsStat({ field }: { field: SettingsField }) {
  return (
    <StatItem
      label={field.label}
      value={field.placeholder.toUpperCase()}
      valueClass={field.wrap
        ? "!whitespace-normal break-all"
        : "!whitespace-normal"}
    />
  );
}

function ProfilePanel({ editing }: { editing: boolean }) {
  return (
    <div class={panelClass}>
      <h2 class={` ${subtitlePrimary} -mt-1`}>PROFILE</h2>
      <div class="flex flex-col gap-3">
        <ProfileAvatar />
        {PROFILE_FIELDS.map((field) =>
          editing
            ? <SettingsInput key={field.label} field={field} />
            : <SettingsStat key={field.label} field={field} />
        )}
      </div>
    </div>
  );
}

function SocialsPanel({ editing }: { editing: boolean }) {
  return (
    <div class={panelClass}>
      <h3 class={` ${subtitlePrimary} -mt-1`}>SOCIALS</h3>
      <div class="flex flex-col gap-3">
        {SOCIAL_ROWS.map((row) => (
          <div class={containerRowForm} key={row[0].label}>
            {row.map((field) =>
              editing
                ? (
                  <SettingsInput
                    key={field.label}
                    field={field}
                    class="flex-1"
                  />
                )
                : (
                  <div key={field.label} class="min-w-0 flex-1">
                    <SettingsStat field={field} />
                  </div>
                )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const INTERLINK_PLACEHOLDER = "NO ADDITIONAL ADDRESSES CONNECTED";

function InterlinkEditRows() {
  const [rowIds, setRowIds] = useState<number[]>([0]);

  const addRow = (id: number) => {
    setRowIds((current) => {
      const index = current.indexOf(id);
      const lastId = current[current.length - 1] ?? 0;
      const next = [...current];
      next.splice(index < 0 ? current.length : index + 1, 0, lastId + 1);
      return next;
    });
  };

  const removeRow = (id: number) => {
    setRowIds((current) => {
      if (current.length <= 1) return current;
      return current.filter((rowId) => rowId !== id);
    });
  };

  return (
    <Field label="INTERLINKED WALLETS">
      <div class="flex flex-col gap-3">
        {rowIds.map((id) => (
          <div key={id} class="flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <InputField
                type="text"
                placeholder={INTERLINK_PLACEHOLDER}
              />
            </div>
            <AddRemoveButton
              addLabel="Add interlinked wallet"
              removeLabel="Remove interlinked wallet"
              canRemove={rowIds.length > 1}
              onAdd={() => addRow(id)}
              onRemove={() => removeRow(id)}
            />
          </div>
        ))}
      </div>
    </Field>
  );
}

function InterlinkPanel(
  { editing, connectedAddress }: {
    editing: boolean;
    connectedAddress: string;
  },
) {
  return (
    <div class={panelClass}>
      <h3 class={` ${subtitlePrimary} -mt-1`}>INTERLINK WALLETS</h3>
      <div class="flex flex-col gap-3">
        <StatItem
          label="CONNECTED WALLET ADDRESS"
          value={connectedAddress}
          valueClass="!whitespace-normal break-all"
        />
        {editing ? <InterlinkEditRows /> : (
          <StatItem
            label="INTERLINKED WALLETS"
            value={INTERLINK_PLACEHOLDER}
          />
        )}
      </div>
    </div>
  );
}

const TERMS_LABEL = "ACCEPT TERMS OF SERVICES GLOBALLY";

function PreferencesEdit() {
  const [accepted, setAccepted] = useState(false);
  const [canHover, setCanHover] = useState(true);

  return (
    <Field label="TERMS OF SERVICE">
      <label
        class="flex cursor-pointer items-center gap-3 group"
        onMouseLeave={() => setCanHover(true)}
      >
        <span class={`${valueSm} min-w-0 flex-1 !whitespace-normal`}>
          "ACCEPT TERMS OF SERVICES GLOBALLY"
        </span>
        <input
          type="checkbox"
          class={`${inputCheckbox(accepted, canHover)} shrink-0`}
          checked={accepted}
          onChange={(e) => {
            setAccepted(e.currentTarget.checked);
            setCanHover(false);
          }}
        />
      </label>
    </Field>
  );
}

function PreferencesPanel({ editing }: { editing: boolean }) {
  return (
    <div class={panelClass}>
      <h3 class={` ${subtitlePrimary} -mt-1`}>PREFERENCES</h3>
      {editing ? <PreferencesEdit /> : (
        <StatItem
          label="TERMS OF SERVICE"
          value={TERMS_LABEL}
        />
      )}
    </div>
  );
}

function WalletSettingsContent({ address }: { address: string }) {
  const { wallet, isConnected, showConnectModal } = walletContext;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      walletSettingsEditing.value = false;
    };
  }, []);

  const isOwner = mounted && isConnected &&
    walletOwnsAddress(wallet, address);

  useEffect(() => {
    if (!isOwner) walletSettingsEditing.value = false;
  }, [isOwner]);

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

  const editing = walletSettingsEditing.value;

  return (
    <div class="flex flex-col gap-3 w-full">
      <div class="flex w-full flex-col gap-3 mobileLg:flex-row">
        <ProfilePanel editing={editing} />
        <SocialsPanel editing={editing} />
      </div>
      <div class="flex w-full flex-col gap-3 mobileLg:flex-row">
        <InterlinkPanel
          editing={editing}
          connectedAddress={wallet.address}
        />
        <PreferencesPanel editing={editing} />
      </div>
    </div>
  );
}

export { WalletSettingsContent };
