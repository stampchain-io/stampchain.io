import { SATOSHIS_PER_BTC } from "$constants";
import { BigFloat } from "bigfloat/mod.ts";
// @ts-ignore - esm.sh's dayjs type declaration uses `export =`, so it
// has no `default` export per its .d.ts, even though the runtime module does.
import dayjs from "dayjs";
// @ts-ignore - same `export =` typing issue as the dayjs import above.
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// Helper constant for satoshi conversion

export function abbreviateAddress(address: string, length = 4): string {
  if (!address) return "";
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

export function formatBTCAmount(
  btc: number,
  options: {
    includeSymbol?: boolean;
    decimals?: number;
    stripZeros?: boolean;
    excludeSuffix?: boolean;
  } = {},
): string {
  const {
    includeSymbol = true,
    decimals = 8,
    stripZeros = true,
    excludeSuffix = false,
  } = options;

  const formatted = btc.toFixed(decimals);
  const result = stripZeros ? stripTrailingZeros(formatted) : formatted;
  return includeSymbol && !excludeSuffix ? `${result} BTC` : result;
}

export function formatSatoshisToBTC(
  satoshis: number,
  options: {
    includeSymbol?: boolean;
    decimals?: number;
    stripZeros?: boolean;
  } = {},
): string {
  // Check if the number already appears to be in BTC (has decimal places)
  const isAlreadyBTC = satoshis.toString().includes(".");
  const btcValue = isAlreadyBTC ? satoshis : satoshis / SATOSHIS_PER_BTC;

  return formatBTCAmount(btcValue, options);
}

export function formatSatoshisToUSD(
  satoshis: number,
  btcPrice: number | undefined | null,
  options: {
    decimals?: number;
    includeSymbol?: boolean;
  } = {},
): string {
  const { decimals = 2, includeSymbol = false } = options;

  // Handle cases where BTC price is not available
  if (btcPrice === undefined || btcPrice === null) {
    return "N/A";
  }

  // Convert satoshis to BTC then to USD
  const btcValue = satoshis / SATOSHIS_PER_BTC;
  const usdValue = btcValue * btcPrice;

  // Format with specified decimal places
  const formatted = usdValue.toFixed(decimals);

  // Return with or without symbol
  return includeSymbol ? `$${formatted}` : formatted;
}

export function formatNumber(value: number, decimals: number = 8): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

interface DateFormatOptions {
  timeZone?: boolean;
  month?: "short" | "long" | "numeric" | "2-digit";
  year?: "numeric" | "2-digit";
  day?: "numeric" | "2-digit";
  hour?: "numeric" | "2-digit";
  minute?: "numeric" | "2-digit";
  hour12?: boolean;
  includeRelative?: boolean;
}

export function formatDate(
  date: Date,
  options: DateFormatOptions = {},
): string {
  // Check for invalid date
  if (!date || isNaN(date.getTime())) {
    return "INVALID";
  }

  const locale = navigator.language || "en-US";
  const formatOptions: Intl.DateTimeFormatOptions = {};

  // Add timeZone if requested (default: true)
  if (options.timeZone !== false) {
    formatOptions.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  // Add other format options if provided
  if (options.month) formatOptions.month = options.month;
  if (options.year) formatOptions.year = options.year;
  if (options.day) formatOptions.day = options.day;
  if (options.hour) formatOptions.hour = options.hour;
  if (options.minute) formatOptions.minute = options.minute;
  if (options.hour12 !== undefined) formatOptions.hour12 = options.hour12;

  // Use toLocaleString (date + time) when time components are requested,
  // otherwise keep the date-only formatter.
  const formattedDate = (options.hour || options.minute)
    ? date.toLocaleString(locale, formatOptions)
    : date.toLocaleDateString(locale, formatOptions);

  // Add relative time if requested
  if (options.includeRelative) {
    return `${formattedDate} (${dayjs(date).fromNow()})`;
  }

  return formattedDate;
}

export function stripTrailingZeros(num: number | string): string {
  const str = num.toString();
  const parts = str.split(".");
  if (parts.length === 1) {
    return str; // No decimal point, return as is
  }
  const integerPart = parts[0];
  const decimalPart = parts[1].replace(/0+$/, "");
  return decimalPart.length > 0 ? `${integerPart}.${decimalPart}` : integerPart;
}

export function bigFloatToString(
  value: BigFloat,
  precision: number = 3,
): string {
  const stringValue = value.toString();
  const [integerPart, fractionalPart] = stringValue.split(".");

  if (!fractionalPart) {
    return integerPart;
  }

  const roundedFractionalPart = fractionalPart.slice(0, precision);
  const result = `${integerPart}.${roundedFractionalPart}`;

  // Remove trailing zeros
  return result.replace(/\.?0+$/, "");
}

const SUPPLY_BASE_UNITS = 100000000n;

/**
 * Exact base-unit -> whole-unit rendering for a bigint supply, to two
 * decimals. Mirrors `(supply / 100000000).toFixed(2)` without going through a
 * double, so supplies beyond 2^53 keep every digit.
 */
function divisibleBigIntToFixed2(baseUnits: bigint): string {
  const negative = baseUnits < 0n;
  const abs = negative ? -baseUnits : baseUnits;

  let whole = abs / SUPPLY_BASE_UNITS;
  const remainder = (abs % SUPPLY_BASE_UNITS) * 100n;
  let hundredths = remainder / SUPPLY_BASE_UNITS;

  // Round half-up on the hundredths digit, matching Number#toFixed(2).
  if (remainder % SUPPLY_BASE_UNITS >= SUPPLY_BASE_UNITS / 2n) hundredths += 1n;
  if (hundredths === 100n) {
    whole += 1n;
    hundredths = 0n;
  }

  return `${negative ? "-" : ""}${whole}.${
    hundredths.toString().padStart(2, "0")
  }`;
}

/**
 * Renders a stamp's supply for display.
 *
 * `supply` arrives here as a bigint whenever the underlying BIGINT column
 * exceeds Number.MAX_SAFE_INTEGER. The MySQL driver returns those rows as
 * BigInt (deno mysql v2.12.1 maps MYSQL_TYPE_LONGLONG that way), and the Redis
 * layer preserves the type across a round-trip via bigIntSerializer /
 * bigIntReviver, so both a cache hit and a cache miss deliver a bigint.
 *
 * Keeping the value a bigint upstream is deliberate: coercing every BIGINT
 * column to a Number at the database boundary would silently round large
 * supplies. The narrowing therefore happens here, at the single point where a
 * supply becomes a display string.
 */
export function formatSupply(
  supply: number | string | bigint | undefined,
  divisible: boolean,
): string {
  if (supply === undefined) return "0";

  if (typeof supply === "string") {
    supply = parseInt(supply);
  }

  if (typeof supply === "bigint") {
    // `supply / 100000000` here would throw
    // TypeError: Cannot mix BigInt and other types, use explicit conversions.
    return divisible ? divisibleBigIntToFixed2(supply) : supply.toString();
  }

  return divisible ? (supply / 100000000).toFixed(2) : supply.toString();
}

/**
 * Edition count as shown on the stamp detail page, the homepage carousel and
 * the wallet dispenser view: divisible supplies render as whole units to two
 * decimals, indivisible supplies above 100000 collapse to "+100000".
 *
 * Each of those three views previously inlined its own
 * `(supply / 100000000).toFixed(2)`, which is the expression that throws on a
 * bigint supply. They share this one implementation instead.
 */
export function formatEditionCount(
  supply: number | string | bigint | undefined,
  divisible: boolean,
): string {
  if (supply === undefined) return "0";
  if (divisible) return formatSupply(supply, true);

  const exceedsCap = typeof supply === "bigint"
    ? supply > 100000n
    : Number(supply) > 100000;

  return exceedsCap ? "+100000" : formatSupply(supply, false);
}

export function isIntOr32ByteHex(value: string) {
  const isInt = Number.isInteger(value) ||
    (typeof value === "string" && Number.isInteger(Number(value)));

  const is32ByteHex = typeof value === "string" &&
    /^[0-9a-fA-F]{64}$/.test(value);

  return isInt || is32ByteHex;
}

export function categorizeInput(
  value: string | number,
): "number" | "hex_string" | "none" {
  if (
    (typeof value === "string" && /^\d+$/.test(value)) ||
    Number.isInteger(value)
  ) {
    return "number";
  }

  if (typeof value === "string" && /^[0-9a-fA-F]+$/.test(value)) {
    return "hex_string";
  }

  return "none";
}

export function formatBigInt(value: bigint): string {
  return value.toString();
}

export function bigIntSerializer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return { __type: "BigInt", value: value.toString() };
  }
  return value;
}

export function jsonStringifyWithBigInt(obj: object): string {
  return JSON.stringify(obj, bigIntSerializer);
}

export function bigIntReviver(_key: string, value: unknown): unknown {
  // Handle the specific format created by bigIntSerializer
  if (
    typeof value === "object" &&
    value !== null &&
    "__type" in value &&
    "value" in value &&
    (value as any).__type === "BigInt"
  ) {
    try {
      return BigInt((value as any).value);
    } catch (error) {
      console.warn(
        `Failed to parse BigInt from serialized value: ${(value as any).value}`,
        error,
      );
      return (value as any).value; // Return original string if BigInt conversion fails
    }
  }

  // Fallback: Check if value is a string that represents a valid BigInt
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    // Try to determine if this should be a BigInt based on size
    // Numbers larger than MAX_SAFE_INTEGER should be BigInt
    const num = Number(value);
    if (!isNaN(num) && Math.abs(num) <= Number.MAX_SAFE_INTEGER) {
      return num; // Keep as number if within safe range
    }
    // Convert to BigInt for large numbers
    try {
      return BigInt(value);
    } catch {
      return value; // Return original string if BigInt conversion fails
    }
  }
  return value;
}

export function formatUSDValue(value: number): number {
  // Round to 2 decimal places and ensure it's a number
  return Number(value.toFixed(2));
}

/**
 * Formats a numeric string by removing leading zeros before the decimal
 * and trailing zeros after the decimal point
 * @param value The string value to format
 * @returns Formatted string without unnecessary zeros
 */
export function formatAmount(value: string): string {
  const [whole, decimal = ""] = value.replace(/^0+/, "").split(".");
  const trimmedDecimal = decimal.replace(/0+$/, "");
  return trimmedDecimal ? `${whole}.${trimmedDecimal}` : whole;
}

export function decodeBase64(base64String: string) {
  // Use atob to decode the base64 string to a binary string
  const binaryString = atob(base64String);

  // Convert the binary string to a Uint8Array
  const utf8Array = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    utf8Array[i] = binaryString.charCodeAt(i);
  }

  // Decode the Uint8Array back to a UTF-8 string
  const decodedText = new TextDecoder().decode(utf8Array);
  return decodedText;
}

/**
 * Formats a number by adding commas as thousand separators
 * @param num The number to format
 * @returns Formatted string with commas
 */
export function formatNumberWithCommas(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Formats BTC value for market data display with appropriate precision
 * @param btc The BTC value to format
 * @param options Formatting options
 * @returns Formatted BTC string
 */
export function formatBTC(btc: number | null | undefined, options: {
  includeSymbol?: boolean;
  decimals?: number;
  fallback?: string;
} = {}): string {
  const {
    includeSymbol = false,
    decimals = 8,
    fallback = "N/A",
  } = options;

  if (btc === null || btc === undefined) return fallback;

  // For very small values, use more decimals
  let actualDecimals = decimals;
  if (btc < 0.0001 && btc > 0) {
    actualDecimals = 8;
  } else if (btc < 0.01) {
    actualDecimals = 6;
  } else if (btc < 1) {
    actualDecimals = 4;
  } else {
    actualDecimals = 2;
  }

  const formatted = btc.toFixed(actualDecimals).replace(/\.?0+$/, "");
  return includeSymbol ? `${formatted} BTC` : formatted;
}

/**
 * Formats 24h volume for display
 * @param volume The volume in BTC
 * @returns Formatted volume string
 */
export function formatVolume(volume: number | null | undefined): string {
  if (volume === null || volume === undefined) return "N/A";

  if (volume < 0.0001) return "<0.0001";
  if (volume < 0.01) return volume.toFixed(4);
  if (volume < 1) return volume.toFixed(3);
  if (volume < 100) return volume.toFixed(2);

  return formatNumberWithCommas(Math.round(volume));
}

/**
 * Formats percentage change
 * @param percentage The percentage value
 * @returns Formatted percentage string with + or - sign
 */
export function formatPercentage(
  percentage: number | null | undefined,
): string {
  if (percentage === null || percentage === undefined) return "N/A";

  const sign = percentage >= 0 ? "+" : "";
  return `${sign}${percentage.toFixed(2)}%`;
}

/**
 * Formats file size in bytes to human-readable string
 * @param bytes The file size in bytes
 * @param forceBytes If true, always display in bytes (for text/plain)
 * @returns Formatted string (e.g., "7.2 KB", "512 B")
 */
export function formatFileSize(
  bytes: number,
  forceBytes: boolean = false,
): string {
  if (forceBytes || bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

/**
 * Maps a mimetype subtype (e.g. from "text/plain" -> "plain") to a short
 * display label used in stamp card badges.
 */
const FILE_TYPE_LABEL_OVERRIDES: Record<string, string> = {
  javascript: "JS",
  plain: "TXT",
  "svg+xml": "SVG",
};

/**
 * Formats a stamp mimetype subtype into a short, human-readable label
 * for display in stamp card file-type badges (e.g. "javascript" -> "JS").
 * @param mimetype The full mimetype string (e.g. "text/javascript")
 * @returns The abbreviated label, or "N/A" if no mimetype is provided
 */
export function formatFileType(mimetype?: string | null): string {
  const subtype = mimetype?.split("/")[1]?.toLowerCase();
  if (!subtype) return "N/A";
  return FILE_TYPE_LABEL_OVERRIDES[subtype] ?? subtype.toUpperCase();
}

/**
 * Formats market cap
 * @param marketCap The market cap in BTC
 * @returns Formatted market cap string
 */
export function formatMarketCap(marketCap: number | null | undefined): string {
  if (marketCap === null || marketCap === undefined) return "N/A";

  if (marketCap < 0.01) return formatBTC(marketCap, { decimals: 6 });
  if (marketCap < 1) return formatBTC(marketCap, { decimals: 4 });
  if (marketCap < 1000) return formatBTC(marketCap, { decimals: 2 });

  return `${formatNumberWithCommas(Math.round(marketCap))}`;
}

/**
 * Formats large numbers with abbreviated suffixes for constrained display spaces
 * @param value The number to format
 * @param decimals Number of decimal places for abbreviated numbers (default: 1)
 * @returns Formatted string with K, M, B suffixes for large numbers
 */
export function formatLargeNumber(value: number, decimals: number = 1): string {
  if (value === 0) return "0";

  // Handle negative numbers
  const sign = value < 0 ? "-" : "";
  const absValue = Math.abs(value);

  // Less than 1,000 - show as is
  if (absValue < 1000) {
    return sign + absValue.toString();
  }

  // 1,000 - 999,999 - use K suffix
  if (absValue < 1000000) {
    const kValue = absValue / 1000;
    return sign + kValue.toFixed(decimals).replace(/\.?0+$/, "") + "K";
  }

  // 1,000,000 - 999,999,999 - use M suffix
  if (absValue < 1000000000) {
    const mValue = absValue / 1000000;
    return sign + mValue.toFixed(decimals).replace(/\.?0+$/, "") + "M";
  }

  // 1,000,000,000+ - use B suffix
  const bValue = absValue / 1000000000;
  return sign + bValue.toFixed(decimals).replace(/\.?0+$/, "") + "B";
}

/**
 * Formats balance/supply display for wallet cards with overflow protection
 * @param balance Number of stamps owned
 * @param supply Total supply of stamps
 * @param divisible Whether the stamp is divisible
 * @returns Formatted string with smart abbreviation for large numbers
 */
export function formatBalanceDisplay(
  balance: number,
  supply: number,
  divisible: boolean,
): string {
  let formattedBalance: string;
  let formattedSupply: string;

  if (divisible) {
    // For divisible stamps, use formatSupply but abbreviate if result is too long
    const balanceValue = balance / 100000000;
    const supplyValue = supply / 100000000;

    // If balance is very large, use abbreviation
    if (balanceValue >= 1000) {
      formattedBalance = formatLargeNumber(balanceValue, 1);
    } else {
      formattedBalance = balanceValue.toFixed(2).replace(/\.?0+$/, "");
    }

    // Supply formatting (keeping existing logic)
    formattedSupply = supply > 100000
      ? "+100000"
      : supplyValue.toFixed(2).replace(/\.?0+$/, "");
  } else {
    // For non-divisible stamps, use smart abbreviation for large numbers
    if (balance >= 1000) {
      formattedBalance = formatLargeNumber(balance, 1);
    } else {
      formattedBalance = balance.toString();
    }

    // Supply formatting (keeping existing logic)
    formattedSupply = supply > 100000 ? "+100000" : supply.toString();
  }

  return `${formattedBalance}/${formattedSupply}`;
}
