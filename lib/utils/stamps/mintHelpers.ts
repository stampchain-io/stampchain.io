/* ===== SHARED STAMP MINTING HELPERS ===== */
import { logger } from "$lib/utils/logger.ts";

/** Maximum stamp file size accepted by the stamping tools (64KB). */
export const MAX_STAMP_FILE_BYTES = 64 * 1024;

const BASE64_CHUNK_SIZE = 0x8000;

/** UTF-8 byte length of a string (what actually goes on-chain). */
export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * UTF-8 safe base64 encoding of text. `btoa(string)` throws on characters
 * outside Latin-1, so encode to bytes first and build the binary string in
 * chunks to avoid argument-count limits on large payloads.
 */
export function textToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + BASE64_CHUNK_SIZE),
    );
  }
  return btoa(binary);
}

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
