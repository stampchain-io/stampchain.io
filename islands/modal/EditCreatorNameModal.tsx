/* ===== EDIT CREATOR NAME MODAL COMPONENT ===== */
import { walletContext } from "$client/wallet/wallet.ts";
import { inputField, inputFieldWrapper } from "$form";
import { closeModal } from "$islands/modal/states.ts";
import { ModalBase } from "$layout";
import { logger } from "$lib/utils/logger.ts";
import { getCSRFToken } from "$lib/utils/security/clientSecurityUtils.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { useState } from "preact/hooks";

/* ===== CONSTANTS ===== */
const CREATOR_NAME_MAX_LENGTH = 25;
const CREATOR_NAME_MIN_LENGTH = 1;
const CREATOR_NAME_PATTERN = /^[a-zA-Z0-9 .\-_']+$/;

/* ===== TYPES ===== */
export interface EditCreatorNameModalProps {
  currentName?: string;
  onSuccess?: (newName: string) => void;
}

/* ===== VALIDATION ===== */
export function validateCreatorName(
  name: string,
): { valid: boolean; message?: string } {
  const trimmed = name.trim();

  if (trimmed.length < CREATOR_NAME_MIN_LENGTH) {
    return { valid: false, message: "Creator name cannot be empty" };
  }

  if (trimmed.length > CREATOR_NAME_MAX_LENGTH) {
    return {
      valid: false,
      message:
        `Creator name must be ${CREATOR_NAME_MAX_LENGTH} characters or fewer (got ${trimmed.length})`,
    };
  }

  if (!CREATOR_NAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      message:
        "Creator name can only contain letters, numbers, spaces, periods, hyphens, underscores, and apostrophes",
    };
  }

  return { valid: true };
}

/* ===== COMPONENT ===== */
function EditCreatorNameModal({
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
      showToast("Please connect your wallet first", "error");
      return;
    }

    // Client-side validation
    const validation = validateCreatorName(newName);
    if (!validation.valid) {
      setValidationError(validation.message ?? "Invalid creator name");
      return;
    }

    const trimmedName = newName.trim();

    setIsSubmitting(true);
    setValidationError(null);

    try {
      // Step 1: Fetch CSRF token
      let csrfToken: string;
      try {
        csrfToken = await getCSRFToken();
      } catch (err) {
        logger.error("ui", {
          message: "Failed to fetch CSRF token",
          error: err instanceof Error ? err.message : String(err),
          component: "EditCreatorNameModal",
        });
        throw new Error("Failed to fetch security token. Please try again.");
      }

      // Step 2: Request wallet signature
      const timestamp = Date.now().toString();
      const message = `Update creator name to ${trimmedName} at ${timestamp}`;

      logger.debug("ui", {
        message: "Requesting wallet signature",
        messageToSign: message,
        component: "EditCreatorNameModal",
      });

      let signature: string;
      try {
        const rawSignature = await walletContext.signMessage(message);
        console.log(
          "[EditCreatorName] signMessage returned:",
          typeof rawSignature,
          rawSignature
            ? `(${String(rawSignature).length} chars)`
            : rawSignature,
        );
        if (!rawSignature || typeof rawSignature !== "string") {
          throw new Error(
            `Wallet returned invalid signature (got ${typeof rawSignature})`,
          );
        }
        signature = rawSignature;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        // User cancellation — don't show an error toast
        if (
          errMsg.toLowerCase().includes("cancel") ||
          errMsg.toLowerCase().includes("reject") ||
          errMsg.toLowerCase().includes("denied") ||
          errMsg === "cancelled"
        ) {
          showToast("Signature request was cancelled", "info");
          return;
        }
        logger.error("ui", {
          message: "Wallet signature failed",
          error: errMsg,
          component: "EditCreatorNameModal",
        });
        throw new Error(`Signing failed: ${errMsg}`);
      }

      // Step 3: POST to API
      logger.debug("ui", {
        message: "Submitting creator name update",
        address: wallet.address,
        newName: trimmedName,
        component: "EditCreatorNameModal",
      });

      const response = await fetch("/api/internal/creatorName", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          address: wallet.address,
          newName: trimmedName,
          signature,
          timestamp,
          csrfToken,
        }),
      });

      const responseData = await response.json().catch(() => ({
        error: "Failed to parse server response",
      }));

      if (!response.ok) {
        const detail = responseData.error ||
          responseData.message ||
          "Failed to update creator name";
        logger.error("ui", {
          message: "Creator name update API error",
          detail,
          status: response.status,
          component: "EditCreatorNameModal",
        });
        throw new Error(detail);
      }

      // Step 4: Show success
      const updatedName = responseData.creatorName ?? trimmedName;
      logger.debug("ui", {
        message: "Creator name updated successfully",
        updatedName,
        component: "EditCreatorNameModal",
      });

      setSuccessName(updatedName);
      showToast(`Creator name updated to "${updatedName}"`, "success");

      if (onSuccess) {
        onSuccess(updatedName);
      }

      // Auto-close after brief success display
      globalThis.setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (err) {
      const errMsg = err instanceof Error
        ? err.message
        : "An unexpected error occurred";
      logger.error("ui", {
        message: "Creator name update failed",
        error: errMsg,
        component: "EditCreatorNameModal",
      });
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
            <p class="text-sm font-medium text-green-400 text-center">
              Name updated successfully
            </p>
            <p class="text-base font-semibold text-color-grey-light text-center">
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
                <p class="text-xs font-light text-color-grey-semidark uppercase tracking-wide">
                  Current:{" "}
                  <span class="font-medium text-color-grey">{currentName}</span>
                </p>
              )}

              {/* ===== TEXT INPUT WITH CHARACTER COUNTER ===== */}
              <div class="relative">
                <div
                  class={`${inputFieldWrapper} ${
                    isOverLimit ? "ring-1 ring-red-500/75 ring-inset" : ""
                  } ${isSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="text"
                    value={newName}
                    onInput={handleInput}
                    placeholder="Enter creator name"
                    maxLength={CREATOR_NAME_MAX_LENGTH + 5}
                    disabled={isSubmitting}
                    class={`${inputField} ${
                      isSubmitting ? "cursor-not-allowed" : ""
                    }`}
                  />
                </div>

                {/* ===== CHARACTER COUNTER ===== */}
                <span
                  class={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-light pointer-events-none ${
                    isOverLimit
                      ? "text-red-400"
                      : charCount > CREATOR_NAME_MAX_LENGTH - 5
                      ? "text-yellow-400/80"
                      : "text-color-grey-semidark"
                  }`}
                >
                  {charCount}/{CREATOR_NAME_MAX_LENGTH}
                </span>
              </div>

              {/* ===== VALIDATION ERROR ===== */}
              {validationError && (
                <p class="text-xs text-red-400 mt-1 leading-snug">
                  {validationError}
                </p>
              )}

              {/* ===== FORMAT HINT ===== */}
              {!validationError && (
                <p class="text-xs font-light text-color-grey-semidark leading-snug">
                  Letters, numbers, spaces, periods, hyphens, underscores,
                  apostrophes
                </p>
              )}
            </div>

            {/* ===== ACTION BUTTONS ===== */}
            <div class="flex gap-3 mt-1">
              {/* ===== CANCEL BUTTON ===== */}
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                class="flex-1 h-10 px-4 rounded-2xl border border-color-border/75 bg-color-background/30 hover:bg-color-background/60 hover:border-color-border text-sm font-medium text-color-grey hover:text-color-grey-light transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CANCEL
              </button>

              {/* ===== UPDATE BUTTON ===== */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isOverLimit || charCount === 0}
                class="flex-1 h-10 px-4 rounded-2xl border border-color-border/75 bg-color-background/30 hover:bg-color-background/60 hover:border-color-border text-sm font-medium text-color-grey-light hover:text-white transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "UPDATING..." : "UPDATE"}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalBase>
  );
}

export default EditCreatorNameModal;
