/* ===== SHARED STAMP MINTING HELPERS ===== */
import { logger } from "$lib/utils/logger.ts";

/** Maximum stamp file size accepted by the stamping tools (64KB). */
export const MAX_STAMP_FILE_BYTES = 64 * 1024;

const BASE64_CHUNK_SIZE = 0x8000;

/* ===== TYPES ===== */

/** Which create page is minting. Drives `isPoshStamp` and CPID validation. */
export type StampMintVariant = "classic" | "posh" | "recursive";

/** File content ready to be minted (base64 body, no data-URL prefix). */
export interface StampMintPayload {
  file: string;
  filename: string;
  fileSize: number;
}

/** Request body for POST /api/v2/olga/mint. */
export interface StampMintRequest {
  sourceWallet: string | undefined;
  qty: string;
  locked: boolean;
  filename: string;
  file: string;
  satsPerVB: number;
  service_fee: string | null | undefined;
  service_fee_address: string | null | undefined;
  assetName?: string;
  divisible: boolean;
  isPoshStamp: boolean;
  dryRun?: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string | undefined;
}

/**
 * Result of validating a single text-input change. When `accept` is false the
 * typed value must not be stored (the field keeps its previous value).
 */
export interface InputValidationResult {
  accept: boolean;
  error: string;
}

/* ===== ENCODING ===== */

/** UTF-8 byte length of a string (what actually goes on-chain). */
export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * Base64 encode bytes. Builds the binary string in chunks to avoid
 * argument-count limits on large payloads.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + BASE64_CHUNK_SIZE),
    );
  }
  return btoa(binary);
}

/**
 * UTF-8 safe base64 encoding of text. `btoa(string)` throws on characters
 * outside Latin-1, so encode to bytes first.
 */
export function textToBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}

/** Base64 encode the raw bytes of a File (matches what gets minted). */
export async function fileToBase64(file: File): Promise<string> {
  try {
    return bytesToBase64(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    throw new Error("Failed to convert file to base64", { cause: error });
  }
}

/* ===== VALIDATION ===== */

const IMAGE_OR_HTML_EXT = /\.(jpg|jpeg|png|gif|webp|svg|avif|html)$/i;

/** Size limit + non-image warning for an uploaded stamp file. */
export function validateStampFile(
  file: Pick<File, "name" | "size">,
): FileValidationResult {
  if (file.size > MAX_STAMP_FILE_BYTES) {
    return {
      isValid: false,
      error: `File size must be less than ${MAX_STAMP_FILE_BYTES / 1024}KB.`,
    };
  }
  return {
    isValid: true,
    warning: IMAGE_OR_HTML_EXT.test(file.name)
      ? undefined
      : "Note: Non-image-html files may not become numbered stamps.",
  };
}

/** Numeric editions input: digits only; empty falls back to "1". */
export function validateEditionsInput(
  raw: string,
): InputValidationResult & { value: string } {
  if (!/^\d*$/.test(raw)) {
    return {
      accept: false,
      value: raw,
      error: "Please enter a valid number.",
    };
  }
  const value = raw === "" ? "1" : raw;
  if (parseEditions(value) < 1) {
    return { accept: true, value, error: "Editions must be at least 1." };
  }
  return { accept: true, value, error: "" };
}

/** Parse the editions string; NaN when it is not a whole number. */
export function parseEditions(raw: string): number {
  return /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
}

const CPID_MIN = BigInt(26) ** BigInt(12) + BigInt(1);
const CPID_MAX = BigInt("18446744073709551615"); // 2^64 - 1

/**
 * Custom numeric CPID: `A` followed by a number between 26^12 + 1 and
 * 2^64 - 1. Partial input ("A", "A123") is accepted while typing but carries
 * an error until the number is in range, which blocks minting.
 */
export function validateCustomCpid(value: string): InputValidationResult {
  if (value === "" || value === "A") return { accept: true, error: "" };
  if (!value.startsWith("A")) {
    return { accept: false, error: "Custom CPID must start with 'A'" };
  }
  const numStr = value.slice(1);
  if (!/^\d+$/.test(numStr)) {
    return { accept: false, error: "Invalid number format after 'A'" };
  }
  const num = BigInt(numStr);
  if (num < CPID_MIN || num > CPID_MAX) {
    return {
      accept: true,
      error:
        `Number must be between ${CPID_MIN.toString()} and ${CPID_MAX.toString()}`,
    };
  }
  return { accept: true, error: "" };
}

/**
 * POSH (named) stamp: first letter B-Z, 1-13 letters total. Empty is accepted
 * so the field can be cleared; "required" is enforced by form validity.
 */
export function validatePoshName(value: string): InputValidationResult {
  if (value === "") return { accept: true, error: "" };
  if (/^[B-Zb-z][A-Za-z]{0,12}$/.test(value)) {
    return { accept: true, error: "" };
  }
  return {
    accept: false,
    error: "Invalid POSH name. Must start with B-Z and be 1-13 letters long.",
  };
}

export interface StampFormState {
  variant: StampMintVariant;
  hasPayload: boolean;
  issuance: string;
  issuanceError: string;
  stampName: string;
  stampNameError: string;
  includeCustomCpid: boolean;
  addressError: string | undefined;
  /** Caller-specific reason minting is blocked (e.g. payload too large). */
  extraBlockReason?: string | null | undefined;
}

/** Whether the stamp form can be submitted. */
export function isStampFormValid(state: StampFormState): boolean {
  if (!state.hasPayload) return false;
  if (state.extraBlockReason) return false;
  if (state.issuanceError || state.addressError || state.stampNameError) {
    return false;
  }
  if (!(parseEditions(state.issuance) >= 1)) return false;
  if (state.variant === "posh") return state.stampName !== "";
  if (state.includeCustomCpid) {
    return state.stampName !== "" && state.stampName !== "A";
  }
  return true;
}

/* ===== REQUEST BUILDING ===== */

export interface BuildMintRequestParams {
  variant: StampMintVariant;
  sourceWallet: string | undefined;
  payload: StampMintPayload;
  issuance: string;
  isLocked: boolean;
  satsPerVB: number;
  stampName: string;
  includeCustomCpid: boolean;
  serviceFee: string | null | undefined;
  serviceFeeAddress: string | null | undefined;
}

/** Build the POST /api/v2/olga/mint body for a real (non dry-run) mint. */
export function buildMintRequest(p: BuildMintRequestParams): StampMintRequest {
  const request: StampMintRequest = {
    sourceWallet: p.sourceWallet,
    qty: p.issuance,
    locked: p.isLocked,
    filename: p.payload.filename,
    file: p.payload.file,
    satsPerVB: p.satsPerVB,
    divisible: false,
    isPoshStamp: p.variant === "posh",
    service_fee: p.serviceFee,
    service_fee_address: p.serviceFeeAddress,
    dryRun: false, // Critical: false to generate the real PSBT
  };
  const usesName = p.variant === "posh" || p.includeCustomCpid;
  if (usesName && p.stampName) request.assetName = p.stampName;
  return request;
}

/* ===== ERRORS ===== */

/** Extract a user-presentable message from API / wallet / unknown errors. */
export function extractErrorMessage(error: unknown): string {
  logger.debug("stamps", {
    message: "Extracting error message from",
    error,
  });

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const err = error as {
      error?: { message?: string; code?: number };
      details?: { error?: { message?: string } };
      response?: { data?: { error?: string } };
      message?: string;
    };

    if (err.response?.data?.error) {
      if (err.response.data.error.includes("Insufficient funds")) {
        return "Insufficient funds to cover outputs and fees";
      }
      return err.response.data.error;
    }

    if (err.error?.message) {
      return err.error.message;
    }

    if (err.details?.error?.message) {
      return err.details.error.message;
    }

    if (err.message) {
      return err.message;
    }
  }

  return "An unexpected error occurred";
}
