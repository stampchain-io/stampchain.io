/* ===== SRC-101 BITNAME AVAILABILITY ===== */
/* Pure helpers for the bitname register tool (page and modal). */

/** Deploy hash of the bitname SRC-101 collection. */
export const SRC101_BITNAME_DEPLOY_HASH =
  "77fb147b72a551cf1e2f0b37dccf9982a1c25623a7fe8b4d5efaac566cf63fed";

/**
 * URL for the availability lookup of a bitname.
 *
 * Only the name is encoded, without the TLD, because the mint stores
 * btoa(toAddress) as the token id. The name is lowercased first.
 * Throws when btoa cannot encode the name (characters outside Latin-1).
 */
export function buildBitnameAvailabilityUrl(name: string): string {
  return `/api/v2/src101/${SRC101_BITNAME_DEPLOY_HASH}/${
    btoa(name.toLowerCase())
  }`;
}

export type BitnameAvailability<T> =
  | { kind: "registered"; match: T }
  | { kind: "available" }
  | { kind: "unknown" };

/**
 * Read the lookup response. Any non-200 status, or a body without a
 * `data` array, gives "unknown" and the name must not be registered.
 */
export function interpretBitnameAvailability<T>(
  status: number,
  body: unknown,
): BitnameAvailability<T> {
  if (status !== 200) return { kind: "unknown" };
  const data = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return { kind: "unknown" };
  if (data.length) return { kind: "registered", match: data[0] as T };
  return { kind: "available" };
}

/** Full bitname as shown to the user: lowercased name plus TLD. */
export function formatBitname(name: string, root: string): string {
  return name.toLowerCase() + root;
}

/** Status line under the bitname field. The page and modal word it differently. */
export function bitnameAvailabilityMessage(
  name: string,
  root: string,
  isRegistered: boolean,
  variant: "page" | "modal",
): string {
  const bitname = formatBitname(name, root);
  if (!isRegistered) return `${bitname} is available`;
  return variant === "modal"
    ? `${bitname} is registered`
    : `${bitname} is already registered`;
}
