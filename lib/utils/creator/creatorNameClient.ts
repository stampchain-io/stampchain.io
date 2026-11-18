/* ===== CREATOR NAME CLIENT ===== */
import { logger } from "$lib/utils/logger.ts";
import { getCSRFToken } from "$lib/utils/security/clientSecurityUtils.ts";
import {
  type WalletAddressSource,
  walletOwnsAddress,
} from "$lib/utils/wallet/ownership.ts";

export const CREATOR_NAME_MAX_LENGTH = 25;
const CREATOR_NAME_MIN_LENGTH = 1;
const CREATOR_NAME_PATTERN = /^[a-zA-Z0-9 .\-_']+$/;

export const CREATOR_NAME_WALLET_REQUIRED = "Please connect your wallet first";
export const CREATOR_NAME_NOT_OWNER =
  "The connected wallet does not control this address";
export const CREATOR_NAME_CANCELLED = "Signature request was cancelled";

export type CreatorNameValidation = {
  valid: boolean;
  message?: string;
};

export type SubmitCreatorNameResult =
  | { status: "success"; name: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export type CreatorNameSaveDecision =
  | { action: "unchanged" }
  | { action: "invalid"; message: string }
  | { action: "submit"; name: string };

export interface SubmitCreatorNameParams {
  address: string;
  name: string;
  wallet: WalletAddressSource | null | undefined;
  signMessage: (message: string, address?: string) => Promise<string>;
  component?: string;
  fetchImpl?: typeof fetch;
  getToken?: () => Promise<string>;
}

export function validateCreatorName(name: string): CreatorNameValidation {
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

/**
 * Unchanged (including both empty) skips signing. Anything else must be a
 * valid name. There is no endpoint for clearing a stored name.
 */
export function decideCreatorNameSave(
  draft: string,
  storedName: string | null,
): CreatorNameSaveDecision {
  const trimmed = draft.trim();
  const stored = (storedName ?? "").trim();
  if (trimmed === stored) return { action: "unchanged" };

  const validation = validateCreatorName(draft);
  if (!validation.valid) {
    return {
      action: "invalid",
      message: validation.message ?? "Invalid creator name",
    };
  }

  return { action: "submit", name: trimmed };
}

function isSignatureCancelled(errMsg: string): boolean {
  const lower = errMsg.toLowerCase();
  return lower.includes("cancel") ||
    lower.includes("reject") ||
    lower.includes("denied") ||
    errMsg === "cancelled";
}

/**
 * Validate, sign, and POST a creator name. Callers present the result.
 * The signed message and `newName` are the same trimmed string, because
 * the server rebuilds the message from `newName`.
 */
export async function submitCreatorName(
  params: SubmitCreatorNameParams,
): Promise<SubmitCreatorNameResult> {
  const component = params.component ?? "submitCreatorName";
  const fetchImpl = params.fetchImpl ?? fetch;
  const getToken = params.getToken ?? getCSRFToken;

  if (!params.wallet?.address) {
    return { status: "error", message: CREATOR_NAME_WALLET_REQUIRED };
  }

  if (!walletOwnsAddress(params.wallet, params.address)) {
    return { status: "error", message: CREATOR_NAME_NOT_OWNER };
  }

  const validation = validateCreatorName(params.name);
  if (!validation.valid) {
    return {
      status: "error",
      message: validation.message ?? "Invalid creator name",
    };
  }

  const trimmedName = params.name.trim();

  try {
    let csrfToken: string;
    try {
      csrfToken = await getToken();
    } catch (err) {
      logger.error("ui", {
        message: "Failed to fetch CSRF token",
        error: err instanceof Error ? err.message : String(err),
        component,
      });
      return {
        status: "error",
        message: "Failed to fetch security token. Please try again.",
      };
    }

    const timestamp = Date.now().toString();
    const message = `Update creator name to ${trimmedName} at ${timestamp}`;

    logger.debug("ui", {
      message: "Requesting wallet signature",
      messageToSign: message,
      component,
    });

    let signature: string;
    try {
      const rawSignature = await params.signMessage(message, params.address);
      if (!rawSignature || typeof rawSignature !== "string") {
        throw new Error(
          `Wallet returned invalid signature (got ${typeof rawSignature})`,
        );
      }
      signature = rawSignature;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (isSignatureCancelled(errMsg)) {
        return { status: "cancelled" };
      }
      logger.error("ui", {
        message: "Wallet signature failed",
        error: errMsg,
        component,
      });
      return { status: "error", message: `Signing failed: ${errMsg}` };
    }

    logger.debug("ui", {
      message: "Submitting creator name update",
      address: params.address,
      newName: trimmedName,
      component,
    });

    const response = await fetchImpl("/api/internal/creatorName", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        address: params.address,
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
        component,
      });
      return { status: "error", message: detail };
    }

    const updatedName = responseData.creatorName ?? trimmedName;
    logger.debug("ui", {
      message: "Creator name updated successfully",
      updatedName,
      component,
    });
    return { status: "success", name: updatedName };
  } catch (err) {
    const errMsg = err instanceof Error
      ? err.message
      : "An unexpected error occurred";
    logger.error("ui", {
      message: "Creator name update failed",
      error: errMsg,
      component,
    });
    return { status: "error", message: errMsg };
  }
}
