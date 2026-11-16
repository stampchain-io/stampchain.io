/* ===== WALLET SETTINGS CONTENT ===== */
import { Button } from "$button";
import { walletContext } from "$client/wallet/wallet.ts";
import { inputCheckbox, InputField, inputTextarea } from "$form";
import { Icon } from "$icon";
import { AddRemoveButton } from "$islands/button/AddRemoveButton.tsx";
import { container2, containerIcon, containerRowForm, StatItem } from "$layout";
import {
  CREATOR_NAME_CANCELLED,
  CREATOR_NAME_MAX_LENGTH,
  CREATOR_NAME_NOT_OWNER,
  CREATOR_NAME_WALLET_REQUIRED,
  decideCreatorNameSave,
  submitCreatorName,
} from "$lib/utils/creator/creatorNameClient.ts";
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { walletOwnsAddress } from "$lib/utils/wallet/ownership.ts";
import { tooltipImage } from "$notification";
import { labelXs, subtitlePrimary, text, valueSm } from "$text";
import { signal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/**
 * Shared by the settings header and this island. Close sets it false
 * immediately. Check sets it false only after the name save succeeds.
 */
export const walletSettingsEditing = signal(false);

/**
 * Registered while the settings content is mounted for an owner.
 * The header check button awaits it. True leaves edit mode.
 */
export const walletSettingsSave = signal<
  (() => Promise<boolean>) | null
>(null);

interface SettingsField {
  label: string;
  placeholder: string;
  /** Read-view text. Falls back to the placeholder when omitted. */
  value?: string;
  type?: "text" | "email";
  multiline?: boolean;
  wrap?: boolean;
}

const NAME_PLACEHOLDER = "Artist and user name";
const ANONYMOUS_NAME = "ANONYMOUS";

const PROFILE_FIELDS: SettingsField[] = [
  {
    label: "NAME",
    placeholder: NAME_PLACEHOLDER,
  },
  {
    label: "BITNAME",
    placeholder: "Preferred bitname",
    value: "NO BITNAME IN THE WALLET",
  },
  {
    label: "BIO",
    placeholder: "Details about yourself",
    value: "NOTHING ADDED YET",
    multiline: true,
    wrap: true,
  },
];

const SOCIAL_ROWS: SettingsField[][] = [
  [
    {
      label: "WEBSITE",
      placeholder: "example.com",
      value: "NO WEBSITE ADDED",
    },
    {
      label: "EMAIL",
      placeholder: "your@email.com",
      type: "email",
      value: "NO EMAIL ADDRESS",
    },
  ],
  [
    {
      label: "X",
      placeholder: "username",
      value: "NO X USER PROFILE",
    },
    {
      label: "TELEGRAM",
      placeholder: "username",
      value: "NO TELEGRAM PROFILE",
    },
  ],
  [
    {
      label: "INSTAGRAM",
      placeholder: "username",
      value: "NO INSTAGRAM ACCOUNT",
    },
    {
      label: "STAMPMAP",
      placeholder: "Bitcoin wallet address",
      value: "NO STAMPMAP ADDRESS",
    },
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

const AVATAR_TOOLTIP_DELAY_MS = 1500;

function ProfileAvatar({ editing }: { editing: boolean }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!editing) setIsTooltipVisible(false);
  }, [editing]);

  useEffect(() => {
    if (!isTooltipVisible) return;

    const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    return () =>
      document.removeEventListener("mousemove", handleGlobalMouseMove);
  }, [isTooltipVisible]);

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        globalThis.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  const handleFileChange = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const selected = input.files?.[0];
    if (!selected || !selected.type.startsWith("image/")) return;
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleMouseMove = (e: MouseEvent) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setIsTooltipVisible(true);
    }, AVATAR_TOOLTIP_DELAY_MS);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      globalThis.clearTimeout(tooltipTimeoutRef.current);
    }
    setIsTooltipVisible(false);
  };

  const hideTooltip = () => setIsTooltipVisible(false);

  const avatar = previewUrl
    ? (
      <img
        src={previewUrl}
        alt="Avatar"
        class="h-16 w-16 rounded-full object-cover"
      />
    )
    : (
      <Icon
        type="icon"
        name="userProfile"
        weight="extraLight"
        size="custom"
        color="custom"
        className={`h-16 w-16 stroke-color-neutral-600 ${
          editing ? "group-hover:stroke-color-hover" : ""
        }`}
        ariaLabel="Avatar"
      />
    );

  const avatarFace = (
    <div
      class={`${container2} flex shrink-0 items-center justify-center
        w-fit h-fit !rounded-full p-0.5`}
    >
      {avatar}
    </div>
  );

  return (
    <>
      <div
        class="relative w-fit"
        {...(editing
          ? {
            onMouseMove: handleMouseMove,
            onMouseEnter: handleMouseEnter,
            onMouseLeave: handleMouseLeave,
            onMouseDown: hideTooltip,
            onClick: hideTooltip,
          }
          : {})}
      >
        {editing && (
          <input
            id="profile-avatar-upload"
            type="file"
            class="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        )}
        {editing
          ? (
            <label
              for="profile-avatar-upload"
              class="group relative block cursor-pointer"
            >
              {avatarFace}
              <span
                class={`${containerIcon} !absolute -bottom-2.5 -right-2.5
                 shrink-0 !justify-center !gap-0 !p-1`}
              >
                <Icon
                  type="icon"
                  name="edit"
                  weight="bold"
                  size="lg"
                  color="custom"
                  className="stroke-color-neutral-600
                    group-hover:stroke-color-hover"
                  ariaLabel="Update profile avatar image"
                />
              </span>
            </label>
          )
          : avatarFace}
      </div>
      {editing && (
        <div
          class={`${tooltipImage} !fixed pointer-events-none ${
            isTooltipVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 6}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          UPDATE PROFILE AVATAR IMAGE
        </div>
      )}
    </>
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
      value={field.value ?? field.placeholder.toUpperCase()}
      valueClass={field.wrap
        ? "!whitespace-normal break-all"
        : "!whitespace-normal"}
    />
  );
}

function NameField(
  {
    editing,
    displayName,
    draft,
    error,
    disabled,
    onDraft,
  }: {
    editing: boolean;
    displayName: string | null;
    draft: string;
    error: string | null;
    disabled: boolean;
    onDraft: (value: string) => void;
  },
) {
  if (!editing) {
    return (
      <SettingsStat
        field={{
          label: "NAME",
          placeholder: NAME_PLACEHOLDER,
          value: displayName || ANONYMOUS_NAME,
        }}
      />
    );
  }

  return (
    <Field label="NAME">
      <InputField
        type="text"
        placeholder={NAME_PLACEHOLDER}
        value={draft}
        maxLength={CREATOR_NAME_MAX_LENGTH + 5}
        disabled={disabled}
        onInput={(e) => onDraft(e.currentTarget.value)}
        {...(error ? { error } : {})}
      />
    </Field>
  );
}

function ProfilePanel(
  {
    editing,
    displayName,
    draft,
    nameError,
    nameDisabled,
    onDraft,
  }: {
    editing: boolean;
    displayName: string | null;
    draft: string;
    nameError: string | null;
    nameDisabled: boolean;
    onDraft: (value: string) => void;
  },
) {
  return (
    <div class={panelClass}>
      <h2 class={` ${subtitlePrimary} -mt-1`}>PROFILE</h2>
      <div class="flex flex-col gap-3">
        <ProfileAvatar editing={editing} />
        {PROFILE_FIELDS.map((field) => {
          if (field.label === "NAME") {
            return (
              <NameField
                key={field.label}
                editing={editing}
                displayName={displayName}
                draft={draft}
                error={nameError}
                disabled={nameDisabled}
                onDraft={onDraft}
              />
            );
          }
          return editing
            ? <SettingsInput key={field.label} field={field} />
            : <SettingsStat key={field.label} field={field} />;
        })}
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
          <div
            class={`${containerRowForm} flex-col mobileMd:flex-row mobileLg:flex-col min-[940px]:flex-row`}
            key={row[0].label}
          >
            {row.map((field) =>
              editing
                ? (
                  <SettingsInput
                    key={field.label}
                    field={field}
                    class="w-full mobileMd:flex-1 mobileLg:flex-none min-[940px]:flex-1"
                  />
                )
                : (
                  <div
                    key={field.label}
                    class="min-w-0 w-full mobileMd:flex-1 mobileLg:flex-none min-[940px]:flex-1"
                  >
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
                placeholder="Bitcoin wallet address"
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

function ShortFullText(
  { short, full }: { short: string; full: string },
) {
  return (
    <>
      <span class="min-[420px]:hidden">{short}</span>
      <span class="hidden min-[420px]:inline">{full}</span>
    </>
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
          value={
            <ShortFullText
              short={abbreviateAddress(connectedAddress, 12)}
              full={connectedAddress}
            />
          }
          valueClass="!whitespace-normal break-all"
        />
        {editing ? <InterlinkEditRows /> : (
          <StatItem
            label="INTERLINKED WALLETS"
            value={
              <ShortFullText
                short="NO ADDITIONAL ADDRESSES"
                full="NO ADDITIONAL ADDRESSES CONNECTED"
              />
            }
          />
        )}
      </div>
    </div>
  );
}

const TERMS_ACCEPTED = "ACCEPTED GLOBALLY";
const TERMS_NOT_ACCEPTED = "NOT ACCEPTED";

function PreferencesEdit(
  { accepted, onAccepted }: {
    accepted: boolean;
    onAccepted: (accepted: boolean) => void;
  },
) {
  const [canHover, setCanHover] = useState(true);

  return (
    <Field label="TERMS OF SERVICE">
      <label
        class="flex cursor-pointer items-center gap-3 group"
        onMouseLeave={() => setCanHover(true)}
      >
        <span class={`${valueSm} min-w-0 flex-1 !whitespace-normal`}>
          ACCEPT TERMS OF SERVICES GLOBALLY
        </span>
        <input
          type="checkbox"
          class={`${inputCheckbox(accepted, canHover)} w-4 h-4
            shrink-0 ${accepted ? "" : "border-neutral-600"}`}
          checked={accepted}
          onChange={(e) => {
            onAccepted(e.currentTarget.checked);
            setCanHover(false);
          }}
        />
      </label>
    </Field>
  );
}

function PreferencesPanel({ editing }: { editing: boolean }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div class={panelClass}>
      <h3 class={` ${subtitlePrimary} -mt-1`}>PREFERENCES</h3>
      {editing
        ? (
          <PreferencesEdit
            accepted={accepted}
            onAccepted={setAccepted}
          />
        )
        : (
          <StatItem
            label="TERMS OF SERVICE"
            value={accepted ? TERMS_ACCEPTED : TERMS_NOT_ACCEPTED}
          />
        )}
    </div>
  );
}

function WalletSettingsContent(
  {
    address,
    storedName: storedNameProp,
    displayName: displayNameProp,
  }: {
    address: string;
    storedName: string | null;
    displayName: string | null;
  },
) {
  const { wallet, isConnected, showConnectModal } = walletContext;
  const [mounted, setMounted] = useState(false);
  const [storedName, setStoredName] = useState(storedNameProp);
  const [displayName, setDisplayName] = useState(displayNameProp);
  const [draft, setDraft] = useState(storedNameProp ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const storedNameRef = useRef(storedNameProp);
  const wasEditingRef = useRef(walletSettingsEditing.value);
  const skipDraftResetRef = useRef(false);
  const saveNameRef = useRef<() => Promise<boolean>>(() =>
    Promise.resolve(false)
  );

  useEffect(() => {
    storedNameRef.current = storedName;
  }, [storedName]);

  useEffect(() => {
    setMounted(true);
    return () => {
      walletSettingsEditing.value = false;
      walletSettingsSave.value = null;
    };
  }, []);

  useEffect(() => {
    if (walletSettingsEditing.value) return;
    setStoredName(storedNameProp);
    setDisplayName(displayNameProp);
    setDraft(storedNameProp ?? "");
    storedNameRef.current = storedNameProp;
    setNameError(null);
  }, [storedNameProp, displayNameProp]);

  useEffect(() => {
    const editing = walletSettingsEditing.value;
    if (wasEditingRef.current && !editing) {
      if (skipDraftResetRef.current) {
        skipDraftResetRef.current = false;
      } else {
        setDraft(storedNameRef.current ?? "");
        setNameError(null);
      }
    }
    wasEditingRef.current = editing;
  }, [walletSettingsEditing.value]);

  const isOwner = mounted && isConnected &&
    walletOwnsAddress(wallet, address);

  useEffect(() => {
    if (!isOwner) walletSettingsEditing.value = false;
  }, [isOwner]);

  const handleDraft = (value: string) => {
    setDraft(value);
    if (nameError) setNameError(null);
  };

  saveNameRef.current = async () => {
    if (isSaving) return false;
    const decision = decideCreatorNameSave(draft, storedNameRef.current);
    if (decision.action === "unchanged") return true;
    if (decision.action === "invalid") {
      setNameError(decision.message);
      return false;
    }

    setIsSaving(true);
    setNameError(null);
    try {
      const result = await submitCreatorName({
        address,
        name: decision.name,
        wallet,
        signMessage: (message, signAddress) =>
          walletContext.signMessage(message, signAddress),
        component: "WalletSettingsContent",
      });

      if (result.status === "cancelled") {
        showToast(CREATOR_NAME_CANCELLED, "info");
        return false;
      }
      if (result.status === "error") {
        if (
          result.message === CREATOR_NAME_WALLET_REQUIRED ||
          result.message === CREATOR_NAME_NOT_OWNER
        ) {
          showToast(result.message, "error");
        }
        setNameError(result.message);
        return false;
      }

      skipDraftResetRef.current = true;
      storedNameRef.current = result.name;
      setStoredName(result.name);
      setDisplayName(result.name);
      setDraft(result.name);
      setNameError(null);
      showToast(`Creator name updated to "${result.name}"`, "success");
      return true;
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isOwner) {
      walletSettingsSave.value = null;
      return;
    }
    walletSettingsSave.value = () => saveNameRef.current();
    return () => {
      walletSettingsSave.value = null;
    };
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
        <ProfilePanel
          editing={editing}
          displayName={displayName}
          draft={draft}
          nameError={nameError}
          nameDisabled={isSaving}
          onDraft={handleDraft}
        />
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
