/* ===== EDIT CREATOR NAME MODAL COMPONENT ===== */
import { Button, ButtonProcessing } from "$button";
import { walletContext } from "$client/wallet/wallet.ts";
import { inputField } from "$form";
import { closeModal } from "$islands/modal/states.ts";
import { ModalBase } from "$layout";
import {
  CREATOR_NAME_CANCELLED,
  CREATOR_NAME_MAX_LENGTH,
  CREATOR_NAME_NOT_OWNER,
  CREATOR_NAME_WALLET_REQUIRED,
  submitCreatorName,
  validateCreatorName,
} from "$lib/utils/creator/creatorNameClient.ts";
import { logger } from "$lib/utils/logger.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { walletOwnsAddress } from "$lib/utils/wallet/ownership.ts";
import { labelSm } from "$text";
import { useState } from "preact/hooks";

export { validateCreatorName };

/* ===== TYPES ===== */
export interface EditCreatorNameModalProps {
  /**
   * Address whose creator name is being edited (the profile being viewed).
   * Must be one of the connected wallet's addresses — payment or ordinals —
   * and is the address that signs the update and that the server verifies.
   */
  address: string;
  currentName?: string;
  onSuccess?: (newName: string) => void;
}

/* ===== COMPONENT ===== */
function EditCreatorNameModal({
  address,
  currentName,
  onSuccess,
}: EditCreatorNameModalProps) {
  /* ===== CONTEXT ===== */
  const { wallet } = walletContext;

  /* ===== STATE ===== */
  const [newName, setNewName] = useState(currentName ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successName, setSuccessName] = useState<string | null>(null);

  /* ===== COMPUTED VALUES ===== */
  const charCount = newName.length;
  const isOverLimit = charCount > CREATOR_NAME_MAX_LENGTH;

  /* ===== EVENT HANDLERS ===== */
  const handleInput = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setNewName(value);

    // Clear validation error on new input
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleClose = () => {
    logger.debug("ui", {
      message: "Modal closing",
      component: "EditCreatorNameModal",
    });
    closeModal();
  };

  const handleSubmit = async () => {
    // Guard: wallet must be connected
    if (!wallet?.address) {
      showToast(CREATOR_NAME_WALLET_REQUIRED, "error");
      return;
    }

    // Guard: the profile address must belong to the connected wallet
    // (payment or ordinals address). Never sign/submit for a foreign address.
    if (!walletOwnsAddress(wallet, address)) {
      showToast(CREATOR_NAME_NOT_OWNER, "error");
      return;
    }

    // Client-side validation
    const validation = validateCreatorName(newName);
    if (!validation.valid) {
      setValidationError(validation.message ?? "Invalid creator name");
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const result = await submitCreatorName({
        address,
        name: newName,
        wallet,
        signMessage: (message, signAddress) =>
          walletContext.signMessage(message, signAddress),
        component: "EditCreatorNameModal",
      });

      if (result.status === "cancelled") {
        showToast(CREATOR_NAME_CANCELLED, "info");
        return;
      }
      if (result.status === "error") {
        setValidationError(result.message);
        return;
      }

      setSuccessName(result.name);
      showToast(`Creator name updated to "${result.name}"`, "success");

      if (onSuccess) {
        onSuccess(result.name);
      }

      // Auto-close after brief success display
      globalThis.setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (err) {
      const errMsg = err instanceof Error
        ? err.message
        : "An unexpected error occurred";
      setValidationError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ===== RENDER ===== */
  return (
    <ModalBase
      onClose={handleClose}
      title="EDIT NAME"
    >
      <div class="flex flex-col gap-5">
        {/* ===== SUCCESS STATE ===== */}
        {successName && (
          <div class="flex flex-col items-center gap-2 py-2">
            <p class="text-sm font-medium text-color-green-400 text-center">
              Name updated successfully
            </p>
            <p class="text-base font-semibold text-color-neutral-200 text-center">
              {successName}
            </p>
          </div>
        )}

        {/* ===== INPUT SECTION ===== */}
        {!successName && (
          <>
            <div class="flex flex-col gap-2">
              {/* ===== CURRENT NAME DISPLAY ===== */}
              {currentName && (
                <p class="text-xs font-light text-color-neutral-500 uppercase tracking-wide">
                  Current:{" "}
                  <span class="font-medium text-color-neutral-200">
                    {currentName}
                  </span>
                </p>
              )}

              {/* ===== TEXT INPUT WITH CHARACTER COUNTER ===== */}
              <div class="relative">
                <input
                  type="text"
                  value={newName}
                  onInput={handleInput}
                  placeholder="Enter creator name"
                  maxLength={CREATOR_NAME_MAX_LENGTH + 5}
                  disabled={isSubmitting}
                  class={`${inputField} ${
                    isOverLimit ? "ring-1 ring-red-500/75 ring-inset" : ""
                  } ${isSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
                />

                {/* ===== CHARACTER COUNTER ===== */}
                <span
                  class={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-light pointer-events-none ${
                    isOverLimit
                      ? "text-color-red-400"
                      : charCount > CREATOR_NAME_MAX_LENGTH - 5
                      ? "text-color-orange-400"
                      : "text-color-neutral-500"
                  }`}
                >
                  {charCount}/{CREATOR_NAME_MAX_LENGTH}
                </span>
              </div>

              {/* ===== VALIDATION ERROR ===== */}
              {validationError && (
                <p class="text-xs text-color-red-500 mt-1 leading-snug">
                  {validationError}
                </p>
              )}

              {/* ===== FORMAT HINT ===== */}
              {!validationError && (
                <p class={`${labelSm} leading-snug !whitespace-normal`}>
                  Letters, numbers, spaces, periods, hyphens, underscores,
                  apostrophes
                </p>
              )}
            </div>

            {/* ===== ACTION BUTTONS ===== */}
            <div class="flex gap-5">
              {/* ===== CANCEL BUTTON ===== */}
              <Button
                variant="outline"
                color="neutral"
                onClick={handleClose}
                disabled={isSubmitting}
                class="flex-1"
              >
                CANCEL
              </Button>

              {/* ===== UPDATE BUTTON ===== */}
              <ButtonProcessing
                variant="flat"
                color="primary"
                isSubmitting={isSubmitting}
                onClick={handleSubmit}
                disabled={isOverLimit || charCount === 0}
                class="flex-1"
              >
                UPDATE
              </ButtonProcessing>
            </div>
          </>
        )}
      </div>
    </ModalBase>
  );
}

export default EditCreatorNameModal;
