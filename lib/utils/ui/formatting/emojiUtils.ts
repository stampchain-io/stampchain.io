import { SUPPORTED_UNICODE_FROM_INDEXER_CODE } from "$constants";
// Format the unicode string and create a Set of supported emoji code points
const formattedString =
  SUPPORTED_UNICODE_FROM_INDEXER_CODE.replace(/U/g, "\\u{") + "}";
const emojiCodePoints = formattedString.split("}{").map((emoji) =>
  emoji.replace("\\u{", "").replace("}", "")
);

// Create Set of supported emoji code points for validation
export const SUPPORTED_UNICODE = new Set(
  emojiCodePoints.map((code) => parseInt(code, 16)),
);

// Create regex pattern from supported unicode points
const SUPPORTED_EMOJI_PATTERN = new RegExp(
  `^[${SUPPORTED_UNICODE_FROM_INDEXER_CODE.replace(/U/g, "\\u")}]+$`,
  "u",
);

/**
 * Converts an emoji character or string containing emoji to its Unicode escape sequence representation.
 * Example: "🧧" -> "\U0001F9E7"
 * @param emoji The emoji character or string containing emoji to convert
 * @returns The Unicode escape sequence representation
 */
export function emojiToUnicodeEscape(emoji: string): string {
  if (!emoji) return emoji;

  try {
    // Split the string into an array of characters/emojis
    const chars = Array.from(emoji);

    // Map through each character, only convert if it's an emoji
    const converted = chars.map((char) => {
      // Check if it's an emoji (surrogate pair)
      if (/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(char)) {
        const codePoint = char.codePointAt(0);
        if (!codePoint) return char;
        // Convert to uppercase hex and pad to 8 digits
        return `\\U${codePoint.toString(16).toUpperCase().padStart(8, "0")}`;
      }
      return char;
    });

    // Join the characters back together
    return converted.join("");
  } catch {
    return emoji;
  }
}

/**
 * Converts a Unicode escape sequence back to its emoji character representation.
 * Example: "\U0001F9E7" -> "🧧"
 * Supports both uppercase (\U0001F9E7) and lowercase (\u{1F9E7}) formats
 * @param unicodeStr The Unicode escape sequence to convert
 * @returns The emoji character representation
 */
/**
 * Splits a string into its plain-text prefix and trailing emoji suffix.
 * Returns { text: "BTC", emoji: "🔥" } or { text: fullString, emoji: "" }
 * when no emoji is found.
 */
export function splitTextAndEmojis(
  text: string,
): { text: string; emoji: string } {
  if (typeof text !== "string") {
    return { text: String(text || ""), emoji: "" };
  }

  const emojiRegex =
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;
  const match = text.match(emojiRegex);
  if (!match || !match[0]) return { text, emoji: "" };
  const emojiIndex = text.indexOf(match[0]);
  return {
    text: text.slice(0, emojiIndex),
    emoji: text.slice(emojiIndex),
  };
}

export function unicodeEscapeToEmoji(unicodeStr: string): string {
  // Check if the string is already a supported emoji
  if (SUPPORTED_EMOJI_PATTERN.test(unicodeStr)) {
    return unicodeStr;
  }

  // First try to match 8-digit uppercase format: \U0001f525
  let result = unicodeStr.replace(/\\U([0-9a-fA-F]{8})/g, (match, grp) => {
    const codePoint = parseInt(grp, 16);
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return match;
    }
  });

  // If no change and it's lowercase format, try that
  if (result === unicodeStr) {
    result = result.replace(/\\u([0-9a-fA-F]{4,8})/g, (match, grp) => {
      const codePoint = parseInt(grp, 16);
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    });
  }

  return result;
}
