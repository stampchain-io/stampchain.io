import { assert, assertEquals } from "@std/assert";
import {
  getIdentifierType,
} from "$lib/utils/data/identifiers/identifierUtils.ts";
import {
  isCpid,
  isStampHash,
  isStampNumber,
  isTxHash,
  isValidSrc20Tick,
} from "$lib/utils/typeGuards.ts";

Deno.test("identifierUtils - isStampNumber", async (t) => {
  await t.step("should validate positive integers", () => {
    assert(isStampNumber(1));
    assert(isStampNumber(100));
    assert(isStampNumber(999999));
    assert(isStampNumber("1"));
    assert(isStampNumber("100"));
  });

  await t.step("should validate zero (stamp 0 - genesis stamp)", () => {
    assert(isStampNumber(0));
    assert(isStampNumber("0"));
  });

  await t.step("should validate negative integers (cursed stamps)", () => {
    assert(isStampNumber(-1));
    assert(isStampNumber(-100));
    assert(isStampNumber("-1"));
    assert(isStampNumber("-999"));
  });

  await t.step("should reject non-integers", () => {
    assert(!isStampNumber(1.5));
    assert(!isStampNumber("1.5"));
    assert(!isStampNumber("abc"));
    assert(!isStampNumber(null));
    assert(!isStampNumber(undefined));
    assert(!isStampNumber({}));
    assert(!isStampNumber([]));
  });
});

Deno.test("identifierUtils - isTxHash", async (t) => {
  await t.step("should validate 64-character hex strings", () => {
    assert(
      isTxHash(
        "a1b2c3d4e5f67890123456789012345678901234567890123456789012345678",
      ),
    );
    assert(
      isTxHash(
        "ABCDEF1234567890123456789012345678901234567890123456789012345678",
      ),
    );
  });

  await t.step("should reject invalid transaction hashes", () => {
    assert(!isTxHash("too_short"));
    assert(
      !isTxHash(
        "not_hex_1234567890123456789012345678901234567890123456789012345678",
      ),
    );
    assert(
      !isTxHash(
        "a1b2c3d4e5f678901234567890123456789012345678901234567890123456789", // 65 chars
      ),
    );
    assert(!isTxHash(null));
    assert(!isTxHash(123));
  });
});

Deno.test("identifierUtils - isStampHash", async (t) => {
  await t.step("should validate stamp hashes", () => {
    assert(isStampHash("aBc123XyZ456"));
    assert(isStampHash("MixedCase123"));
    assert(isStampHash("aB1234567890cD"));
  });

  await t.step("should reject invalid stamp hashes", () => {
    assert(!isStampHash("short")); // Too short
    assert(!isStampHash("ALLUPPERCASE123")); // No lowercase
    assert(!isStampHash("alllowercase123")); // No uppercase
    assert(!isStampHash("NoNumbers")); // No numbers
    assert(!isStampHash("Special@Chars123")); // Special characters
    assert(!isStampHash("ThisIsWayTooLongForAStampHash123")); // Too long
  });
});

Deno.test("identifierUtils - isCpid", async (t) => {
  await t.step("should validate A-prefixed numeric CPIDs", () => {
    assert(isCpid("A95428956661682177")); // Exactly 26^12 + 1
    assert(isCpid("A95428956661682178"));
    assert(isCpid("A18446744073709551615")); // Exactly 2^64 - 1
  });

  await t.step("should validate alphabetic CPIDs", () => {
    assert(isCpid("B"));
    assert(isCpid("Z"));
    assert(isCpid("BA"));
    assert(isCpid("ZZZZZZZZZZZZZ")); // 13 chars max
  });

  await t.step("should reject invalid CPIDs", () => {
    assert(!isCpid("A")); // A alone is not valid
    assert(!isCpid("A123")); // Too small number
    assert(!isCpid("AZZZZZZZZZZZZ")); // A with letters
    assert(!isCpid("ZZZZZZZZZZZZZZ")); // 14 chars
    assert(!isCpid("lowercase"));
    assert(!isCpid("123"));
  });
});

Deno.test("identifierUtils - getIdentifierType", async (t) => {
  await t.step("should identify stamp numbers", () => {
    assertEquals(getIdentifierType(123), "stamp_number");
    assertEquals(getIdentifierType("456"), "stamp_number");
    assertEquals(getIdentifierType(-789), "stamp_number");
    assertEquals(getIdentifierType(0), "stamp_number");
    assertEquals(getIdentifierType("0"), "stamp_number");
  });

  await t.step("should identify transaction hashes", () => {
    assertEquals(
      getIdentifierType(
        "a1b2c3d4e5f67890123456789012345678901234567890123456789012345678",
      ),
      "tx_hash",
    );
  });

  await t.step("should identify stamp hashes", () => {
    assertEquals(getIdentifierType("aBc123XyZ456"), "stamp_hash");
  });

  await t.step("should identify CPIDs", () => {
    assertEquals(getIdentifierType("A95428956661682177"), "cpid");
    assertEquals(getIdentifierType("BITCOIN"), "cpid");
  });

  await t.step("should return invalid for unrecognized identifiers", () => {
    assertEquals(getIdentifierType("invalid!@#"), "invalid");
    assertEquals(getIdentifierType(null), "invalid");
    assertEquals(getIdentifierType(undefined), "invalid");
  });
});

Deno.test("identifierUtils - isValidSrc20Tick", async (t) => {
  await t.step("should validate alphanumeric ticks", () => {
    assert(isValidSrc20Tick("PEPE"));
    assert(isValidSrc20Tick("MEME"));
    assert(isValidSrc20Tick("BTC"));
    assert(isValidSrc20Tick("42069"));
    assert(isValidSrc20Tick("A"));
    assert(isValidSrc20Tick("12345"));
  });

  await t.step("should validate ticks with special characters", () => {
    assert(isValidSrc20Tick("!"));
    assert(isValidSrc20Tick("@"));
    assert(isValidSrc20Tick("#"));
    assert(isValidSrc20Tick("$"));
    assert(isValidSrc20Tick("%"));
    assert(isValidSrc20Tick("&"));
    assert(isValidSrc20Tick("*"));
    assert(isValidSrc20Tick("+"));
    assert(isValidSrc20Tick("-"));
    assert(isValidSrc20Tick("="));
    assert(isValidSrc20Tick("?"));
    assert(isValidSrc20Tick("."));
    assert(isValidSrc20Tick(","));
    assert(isValidSrc20Tick(":"));
    assert(isValidSrc20Tick(";"));
    assert(isValidSrc20Tick("'"));
    assert(isValidSrc20Tick('"'));
    assert(isValidSrc20Tick("/"));
    assert(isValidSrc20Tick("<"));
    assert(isValidSrc20Tick(">"));
    assert(isValidSrc20Tick("()"));
    assert(isValidSrc20Tick("[]"));
    assert(isValidSrc20Tick("{}"));
    assert(isValidSrc20Tick("|"));
    assert(isValidSrc20Tick("_"));
  });

  await t.step("should validate Unicode/emoji ticks", () => {
    assert(isValidSrc20Tick("🔥"));
    assert(isValidSrc20Tick("💎"));
    assert(isValidSrc20Tick("🚀"));
    assert(isValidSrc20Tick("🎵"));
    assert(isValidSrc20Tick("👍"));
    assert(isValidSrc20Tick("⚡"));
    assert(isValidSrc20Tick("🌟"));
    assert(isValidSrc20Tick("🏆"));
    assert(isValidSrc20Tick("🎯"));
    assert(isValidSrc20Tick("🎮"));
    // Mixed emoji and text
    assert(isValidSrc20Tick("🔥HOT"));
    assert(isValidSrc20Tick("BTC💎"));
    // Multiple emojis (up to 5 Unicode code points)
    assert(isValidSrc20Tick("🔥🔥"));
    assert(isValidSrc20Tick("🚀🌟"));
    assert(isValidSrc20Tick("💎💎💎"));
    assert(isValidSrc20Tick("👍👍👍👍"));
    assert(isValidSrc20Tick("⚡⚡⚡⚡⚡"));
  });

  await t.step("should reject invalid ticks", () => {
    // Empty string
    assert(!isValidSrc20Tick(""));

    // Too long (more than 5 characters/code points)
    assert(!isValidSrc20Tick("TOOLONG"));
    assert(!isValidSrc20Tick("123456"));
    assert(!isValidSrc20Tick("ABCDEF"));
    assert(!isValidSrc20Tick("🔥🔥🔥🔥🔥🔥")); // 6 emojis
    assert(!isValidSrc20Tick("EMOJI🔥🔥🔥")); // Total length > 5

    // Non-string types
    assert(!isValidSrc20Tick(null));
    assert(!isValidSrc20Tick(undefined));
    assert(!isValidSrc20Tick(123));
    assert(!isValidSrc20Tick(true));
    assert(!isValidSrc20Tick({}));
    assert(!isValidSrc20Tick([]));

    // Control characters (not allowed)
    assert(!isValidSrc20Tick("\x00")); // Null character
    assert(!isValidSrc20Tick("\t")); // Tab
    assert(!isValidSrc20Tick("\n")); // Newline
    assert(!isValidSrc20Tick("\r")); // Carriage return
  });

  await t.step("should handle edge cases correctly", () => {
    // Exactly 5 characters
    assert(isValidSrc20Tick("EXACT"));
    assert(isValidSrc20Tick("12345"));
    assert(isValidSrc20Tick("!@#$%"));

    // Exactly 1 character
    assert(isValidSrc20Tick("X"));
    assert(isValidSrc20Tick("1"));
    assert(isValidSrc20Tick("!"));
    assert(isValidSrc20Tick("🔥"));

    // Mixed content within 5 code points
    assert(isValidSrc20Tick("A!1🔥"));
    assert(isValidSrc20Tick("@BTC#"));
    assert(isValidSrc20Tick("$$$$$"));
  });

  await t.step("should handle complex Unicode correctly", () => {
    // Emoji with skin tone modifiers (counts as multiple code points)
    assert(isValidSrc20Tick("👍🏻")); // Thumbs up with light skin tone (2 code points)
    assert(isValidSrc20Tick("👋🏽")); // Wave with medium skin tone (2 code points)

    // Combined emojis have too many code points for a 5-char tick
    assert(!isValidSrc20Tick("👨‍👩‍👧‍👦")); // Family emoji (7 code points - too long)

    // Various Unicode symbols
    assert(isValidSrc20Tick("♠♥♦♣"));
    assert(isValidSrc20Tick("★☆✓✗"));
    assert(isValidSrc20Tick("←↑→↓"));
  });
});
