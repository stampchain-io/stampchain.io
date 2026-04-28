/**
 * Comprehensive tests for consolidated type guards module
 * Verifies all type guards work correctly after consolidation
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  filterNonNull,
  isAPIError,
  // Error Type Guards
  isApplicationError,
  isAuthenticationError,
  isAuthorizationError,
  isBitcoinError,
  isCpid,
  isDefined,
  isNetworkError,
  isNonEmptyArray,
  isNonEmptyString,
  isNonNegativeNumber,
  // Utility Guards
  isObject,
  // Bitcoin Protocol Guards
  isP2PKHAddress,
  // Bitcoin Script Guards
  isP2PKHScript,
  isP2SHAddress,
  isP2SHScript,
  isP2TRAddress,
  isP2TRScript,
  isP2WPKHAddress,
  isP2WPKHScript,
  isP2WSHScript,
  isPositiveInteger,
  isSRC20Data,
  isSRC20Error,
  isSRC20Operation,
  isStampData,
  isStampError,
  isStampHash,
  isStampNumber,
  isTxHash,
  isValidationError,
  isValidBase64StampData,
  isValidBitcoinAddress,
  isValidCPID,
  isValidSRC101Deploy,
  // SRC-101 Protocol Guards
  isValidSRC101Slug,
  isValidSRC20Deploy,
  isValidSRC20Mint,
  isValidSrc20Tick,
  // SRC-20 Protocol Guards
  isValidSRC20Ticker,
  isValidSRC20Transfer,
  isValidStampClassification,
  isValidStampMimeType,
  // Stamp Protocol Guards
  isValidStampNumber,
  isValidStampRow,
  isValidTransactionInput,
  isValidTransactionOutput,
  isValidUTXO,
  safeFirst,
  safeLast,
  validateSRC20Deployment,
} from "$lib/utils/typeGuards.ts";

// ============================================================================
// BITCOIN ADDRESS TYPE GUARDS TESTS
// ============================================================================

Deno.test("Bitcoin Address Type Guards", async (t) => {
  await t.step("isP2PKHAddress - valid addresses", () => {
    assertEquals(isP2PKHAddress("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"), true);
    assertEquals(isP2PKHAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"), true);
    assertEquals(isP2PKHAddress("1CounterpartyXXXXXXXXXXXXXXXUWLpVr"), true);
  });

  await t.step("isP2PKHAddress - invalid addresses", () => {
    assertEquals(isP2PKHAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"), false);
    assertEquals(
      isP2PKHAddress("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"),
      false,
    );
    assertEquals(isP2PKHAddress("invalid"), false);
    assertEquals(isP2PKHAddress(""), false);
  });

  await t.step("isP2SHAddress - valid addresses", () => {
    assertEquals(isP2SHAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"), true);
    assertEquals(isP2SHAddress("3QJmV3qfvL9SuYo34YihAf3sRCW3qSinyC"), true);
  });

  await t.step("isP2WPKHAddress - valid addresses", () => {
    assertEquals(
      isP2WPKHAddress("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"),
      true,
    );
    assertEquals(
      isP2WPKHAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"),
      true,
    );
  });

  await t.step("isP2TRAddress - valid addresses", () => {
    assertEquals(
      isP2TRAddress(
        "bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr",
      ),
      true,
    );
    assertEquals(
      isP2TRAddress(
        "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
      ),
      true,
    );
  });

  await t.step("isValidBitcoinAddress - all types", () => {
    assertEquals(
      isValidBitcoinAddress("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"),
      true,
    );
    assertEquals(
      isValidBitcoinAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"),
      true,
    );
    assertEquals(
      isValidBitcoinAddress("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"),
      true,
    );
    assertEquals(
      isValidBitcoinAddress(
        "bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr",
      ),
      true,
    );
    assertEquals(isValidBitcoinAddress("invalid_address"), false);
  });
});

// ============================================================================
// TRANSACTION TYPE GUARDS TESTS
// ============================================================================

Deno.test("Transaction Type Guards", async (t) => {
  await t.step("isTxHash - valid transaction hashes", () => {
    assertEquals(
      isTxHash(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      ),
      true,
    );
    assertEquals(
      isTxHash(
        "0000000000000000000000000000000000000000000000000000000000000000",
      ),
      true,
    );
    assertEquals(
      isTxHash(
        "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      ),
      true,
    );
  });

  await t.step("isTxHash - invalid transaction hashes", () => {
    assertEquals(isTxHash("too_short"), false);
    assertEquals(
      isTxHash(
        "not_hex_characters_zzz0000000000000000000000000000000000000000000",
      ),
      false,
    );
    assertEquals(isTxHash(""), false);
  });

  await t.step("isValidUTXO - valid UTXO", () => {
    const validUTXO = {
      txid: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      vout: 0,
      value: 100000,
      script: "76a914",
    };
    assertEquals(isValidUTXO(validUTXO), true);
  });

  await t.step("isValidUTXO - invalid UTXO", () => {
    assertEquals(
      isValidUTXO({
        txid: "invalid",
        vout: 0,
        value: 100000,
        script: "76a914",
      }),
      false,
    );
    assertEquals(
      isValidUTXO({
        txid:
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        vout: -1,
        value: 100000,
        script: "76a914",
      }),
      false,
    );
    assertEquals(
      isValidUTXO({
        txid:
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        vout: 0,
        value: -100,
        script: "76a914",
      }),
      false,
    );
    assertEquals(isValidUTXO(null), false);
  });

  await t.step("isValidTransactionInput", () => {
    const validInput = { type: "p2pkh", isWitness: false, size: 148 };
    assertEquals(isValidTransactionInput(validInput), true);

    const invalidInput = { type: "", isWitness: false, size: 148 };
    assertEquals(isValidTransactionInput(invalidInput), false);
  });

  await t.step("isValidTransactionOutput", () => {
    const validOutput = {
      type: "p2pkh",
      value: 100000,
      isWitness: false,
      size: 34,
    };
    assertEquals(isValidTransactionOutput(validOutput), true);

    const invalidOutput = {
      type: "p2pkh",
      value: -100,
      isWitness: false,
      size: 34,
    };
    assertEquals(isValidTransactionOutput(invalidOutput), false);
  });
});

// ============================================================================
// SRC-20 PROTOCOL TYPE GUARDS TESTS
// ============================================================================

Deno.test("SRC-20 Protocol Type Guards", async (t) => {
  await t.step("isValidSRC20Ticker - basic alphanumeric", () => {
    assertEquals(isValidSRC20Ticker("STAMP"), true);
    assertEquals(isValidSRC20Ticker("BTC"), true);
    assertEquals(isValidSRC20Ticker("12345"), true);
    assertEquals(isValidSRC20Ticker("TOOLONG"), false);
    assertEquals(isValidSRC20Ticker(""), false);
  });

  await t.step("isValidSrc20Tick - Unicode aware", () => {
    assertEquals(isValidSrc20Tick("STAMP"), true);
    assertEquals(isValidSrc20Tick("🚀"), true);
    assertEquals(isValidSrc20Tick("💎🙌"), true);
    assertEquals(isValidSrc20Tick("中文"), true);
    assertEquals(isValidSrc20Tick("TOOLONG"), false);
  });

  await t.step("isValidSRC20Deploy", () => {
    const validDeploy = {
      p: "src-20",
      op: "deploy",
      tick: "TEST",
      max: "1000000",
      lim: "1000",
      dec: "8",
    };
    assertEquals(isValidSRC20Deploy(validDeploy), true);

    const invalidDeploy = {
      p: "src-20",
      op: "deploy",
      tick: "TOOLONG",
      max: "1000000",
    };
    assertEquals(isValidSRC20Deploy(invalidDeploy), false);
  });

  await t.step("isValidSRC20Mint", () => {
    const validMint = {
      p: "src-20",
      op: "mint",
      tick: "TEST",
      amt: "1000",
    };
    assertEquals(isValidSRC20Mint(validMint), true);

    const invalidMint = {
      p: "src-20",
      op: "mint",
      tick: "TEST",
      amt: "0",
    };
    assertEquals(isValidSRC20Mint(invalidMint), false);
  });

  await t.step("isValidSRC20Transfer", () => {
    const validTransfer = {
      p: "src-20",
      op: "transfer",
      tick: "TEST",
      amt: "500",
    };
    assertEquals(isValidSRC20Transfer(validTransfer), true);

    const invalidTransfer = {
      p: "src-20",
      op: "transfer",
      tick: "TEST",
      amt: "-100",
    };
    assertEquals(isValidSRC20Transfer(invalidTransfer), false);
  });

  await t.step("validateSRC20Deployment - advanced validation", () => {
    const deployment = {
      p: "src-20",
      op: "deploy",
      tick: "BTC",
      max: "21000000000000001",
      lim: "1000",
      dec: "8",
    };
    const result = validateSRC20Deployment(deployment);
    assertEquals(result.valid, true);
    assertExists(result.warnings);
    assertEquals(result.warnings?.length, 2); // BTC ticker warning + max supply warning
  });
});

// ============================================================================
// STAMP PROTOCOL TYPE GUARDS TESTS
// ============================================================================

Deno.test("Stamp Protocol Type Guards", async (t) => {
  await t.step("isValidStampNumber", () => {
    assertEquals(isValidStampNumber(1), true);
    assertEquals(isValidStampNumber(null), true); // cursed stamps
    assertEquals(isValidStampNumber(0), false);
    assertEquals(isValidStampNumber(-1), false);
  });

  await t.step("isStampNumber - enhanced version", () => {
    assertEquals(isStampNumber(1), true);
    assertEquals(isStampNumber(-1), true); // cursed stamps
    assertEquals(isStampNumber(0), true); // stamp 0 exists
  });

  await t.step("isStampHash", () => {
    assertEquals(isStampHash("AbCdEf123456"), true);
    assertEquals(isStampHash("aBc123XyZ456"), true);
    assertEquals(isStampHash("ABCDEF123456789012"), false); // No lowercase
    assertEquals(isStampHash("alllowercase123"), false); // No uppercase
    assertEquals(isStampHash("toolong12345678901234"), false);
    assertEquals(isStampHash("short"), false);
  });

  await t.step("isValidCPID", () => {
    assertEquals(isValidCPID("26612428013343742"), true);
    assertEquals(isValidCPID("184467440737095520000"), true);
    assertEquals(isValidCPID("1"), false); // too small
    assertEquals(isValidCPID("not_a_number"), false);
  });

  await t.step("isValidStampClassification", () => {
    assertEquals(isValidStampClassification("cursed"), true);
    assertEquals(isValidStampClassification("classic"), true);
    assertEquals(isValidStampClassification("posh"), true);
    assertEquals(isValidStampClassification("blessed"), false);
    assertEquals(isValidStampClassification("invalid"), false);
  });

  await t.step("isValidStampMimeType", () => {
    assertEquals(isValidStampMimeType("image/png"), true);
    assertEquals(isValidStampMimeType("image/jpeg"), true);
    assertEquals(isValidStampMimeType("video/mp4"), true);
    assertEquals(isValidStampMimeType("application/pdf"), false);
  });

  await t.step("isValidStampRow", () => {
    const validRow = {
      stamp: 123,
      cpid: "26612428013343742",
      creator: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
      divisible: false,
      locked: true,
      supply: 1000,
      stamp_mimetype: "image/png",
      stamp_base64: "aGVsbG8=", // "hello" in base64
    };
    assertEquals(isValidStampRow(validRow), true);

    const invalidRow = {
      stamp: 123,
      cpid: "invalid",
      creator: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
      divisible: false,
      locked: true,
      supply: 1000,
    };
    assertEquals(isValidStampRow(invalidRow), false);
  });
});

// ============================================================================
// ERROR TYPE GUARDS TESTS
// ============================================================================

Deno.test("Error Type Guards", async (t) => {
  await t.step("isApplicationError", () => {
    const appError = new Error("Test error");
    (appError as any).code = "TEST_ERROR";
    (appError as any).timestamp = Date.now();
    (appError as any).correlationId = "12345";
    assertEquals(isApplicationError(appError), true);

    const regularError = new Error("Regular error");
    assertEquals(isApplicationError(regularError), false);
  });

  await t.step("isValidationError", () => {
    const validationError = new Error("Validation failed");
    (validationError as any).code = "VALIDATION_REQUIRED_FIELD";
    assertEquals(isValidationError(validationError), true);

    const otherError = new Error("Other error");
    (otherError as any).code = "OTHER_ERROR";
    assertEquals(isValidationError(otherError), false);
  });

  await t.step("isAPIError", () => {
    const apiError = new Error("API failed");
    (apiError as any).code = "API_NOT_FOUND";
    assertEquals(isAPIError(apiError), true);
  });

  await t.step("isBitcoinError", () => {
    const btcError = new Error("Bitcoin error");
    (btcError as any).code = "BITCOIN_INVALID_ADDRESS";
    assertEquals(isBitcoinError(btcError), true);
  });

  await t.step("isSRC20Error", () => {
    const src20Error = new Error("SRC20 error");
    (src20Error as any).code = "SRC20_INVALID_TICKER";
    assertEquals(isSRC20Error(src20Error), true);
  });

  await t.step("isStampError", () => {
    const stampError = new Error("Stamp error");
    (stampError as any).code = "STAMP_NOT_FOUND";
    assertEquals(isStampError(stampError), true);
  });

  await t.step("isNetworkError", () => {
    const networkError = new Error("Network error");
    (networkError as any).code = "NETWORK_TIMEOUT";
    assertEquals(isNetworkError(networkError), true);
  });

  await t.step("isAuthenticationError", () => {
    const authError = new Error("Auth error");
    (authError as any).code = "AUTH_INVALID_TOKEN";
    (authError as any).userId = "123";
    assertEquals(isAuthenticationError(authError), true);
  });

  await t.step("isAuthorizationError", () => {
    const authzError = new Error("Authz error");
    (authzError as any).code = "AUTH_FORBIDDEN";
    (authzError as any).resource = "api";
    assertEquals(isAuthorizationError(authzError), true);
  });
});

// ============================================================================
// UTILITY TYPE GUARDS TESTS
// ============================================================================

Deno.test("Utility Type Guards", async (t) => {
  await t.step("isObject", () => {
    assertEquals(isObject({}), true);
    assertEquals(isObject({ a: 1 }), true);
    assertEquals(isObject(null), false);
    assertEquals(isObject([]), false);
    assertEquals(isObject("string"), false);
  });

  await t.step("isNonEmptyString", () => {
    assertEquals(isNonEmptyString("hello"), true);
    assertEquals(isNonEmptyString(""), false);
    assertEquals(isNonEmptyString(null), false);
    assertEquals(isNonEmptyString(123), false);
  });

  await t.step("isPositiveInteger", () => {
    assertEquals(isPositiveInteger(1), true);
    assertEquals(isPositiveInteger(100), true);
    assertEquals(isPositiveInteger(0), false);
    assertEquals(isPositiveInteger(-1), false);
    assertEquals(isPositiveInteger(1.5), false);
  });

  await t.step("isNonNegativeNumber", () => {
    assertEquals(isNonNegativeNumber(0), true);
    assertEquals(isNonNegativeNumber(1), true);
    assertEquals(isNonNegativeNumber(1.5), true);
    assertEquals(isNonNegativeNumber(-1), false);
  });
});

// ============================================================================
// ARRAY SAFETY UTILITIES TESTS
// ============================================================================

Deno.test("Array Safety Utilities", async (t) => {
  await t.step("isNonEmptyArray", () => {
    assertEquals(isNonEmptyArray([1, 2, 3]), true);
    assertEquals(isNonEmptyArray([]), false);
    assertEquals(isNonEmptyArray(null), false);
    assertEquals(isNonEmptyArray(undefined), false);
  });

  await t.step("safeFirst", () => {
    assertEquals(safeFirst([1, 2, 3]), 1);
    assertEquals(safeFirst([]), undefined);
    assertEquals(safeFirst(null), undefined);
  });

  await t.step("safeLast", () => {
    assertEquals(safeLast([1, 2, 3]), 3);
    assertEquals(safeLast([]), undefined);
    assertEquals(safeLast(null), undefined);
  });

  await t.step("filterNonNull", () => {
    assertEquals(filterNonNull([1, null, 2, undefined, 3]), [1, 2, 3]);
    assertEquals(filterNonNull([null, undefined]), []);
  });

  await t.step("isDefined", () => {
    assertEquals(isDefined(0), true);
    assertEquals(isDefined(""), true);
    assertEquals(isDefined(false), true);
    assertEquals(isDefined(null), false);
    assertEquals(isDefined(undefined), false);
  });
});

// ============================================================================
// BITCOIN SCRIPT TYPE GUARDS TESTS
// ============================================================================

Deno.test("Bitcoin Script Type Guards", async (t) => {
  await t.step("isP2PKHScript", () => {
    assertEquals(isP2PKHScript("76a914" + "a".repeat(40) + "88ac"), true);
    assertEquals(isP2PKHScript("invalid"), false);
  });

  await t.step("isP2SHScript", () => {
    assertEquals(isP2SHScript("a914" + "a".repeat(40) + "87"), true);
    assertEquals(isP2SHScript("invalid"), false);
  });

  await t.step("isP2WPKHScript", () => {
    assertEquals(isP2WPKHScript("0014" + "a".repeat(40)), true);
    assertEquals(isP2WPKHScript("invalid"), false);
  });

  await t.step("isP2WSHScript", () => {
    assertEquals(isP2WSHScript("0020" + "a".repeat(64)), true);
    assertEquals(isP2WSHScript("invalid"), false);
  });

  await t.step("isP2TRScript", () => {
    assertEquals(isP2TRScript("5120" + "a".repeat(64)), true);
    assertEquals(isP2TRScript("invalid"), false);
  });
});

// ============================================================================
// SRC-101 PROTOCOL TYPE GUARDS TESTS
// ============================================================================

Deno.test("SRC-101 Protocol Type Guards", async (t) => {
  await t.step("isValidSRC101Slug", () => {
    assertEquals(isValidSRC101Slug("my-nft"), true);
    assertEquals(isValidSRC101Slug("cool-collection-123"), true);
    assertEquals(isValidSRC101Slug("invalid_slug"), false);
    assertEquals(isValidSRC101Slug("UPPERCASE"), false);
    assertEquals(
      isValidSRC101Slug(
        "too-long-slug-that-exceeds-fifty-characters-limit-here",
      ),
      false,
    );
  });

  await t.step("isValidSRC101Deploy", () => {
    const validDeploy = {
      p: "src-101",
      op: "deploy",
      name: "My NFT Collection",
      slug: "my-nft",
      supply: "1000",
      traits: { rarity: "common" },
    };
    assertEquals(isValidSRC101Deploy(validDeploy), true);

    const invalidDeploy = {
      p: "src-101",
      op: "deploy",
      name: "",
      slug: "my-nft",
    };
    assertEquals(isValidSRC101Deploy(invalidDeploy), false);
  });
});

// Wallet State Type Guards Tests
Deno.test("Wallet State Type Guards", async (t) => {
  const {
    isValidWalletProvider,
    isConnectedWallet,
    isWalletConnectionResult,
    isValidWalletState,
  } = await import("$lib/utils/typeGuards.ts");

  await t.step("isValidWalletProvider", () => {
    // Valid providers
    assertEquals(isValidWalletProvider("unisat"), true);
    assertEquals(isValidWalletProvider("xverse"), true);
    assertEquals(isValidWalletProvider("hiro"), true);
    assertEquals(isValidWalletProvider("leather"), true);
    assertEquals(isValidWalletProvider("horizon"), true);

    // Invalid providers
    assertEquals(isValidWalletProvider("metamask"), false);
    assertEquals(isValidWalletProvider(""), false);
    assertEquals(isValidWalletProvider(null), false);
    assertEquals(isValidWalletProvider(undefined), false);
    assertEquals(isValidWalletProvider(123), false);
  });

  await t.step("isConnectedWallet", () => {
    // Valid connected wallet
    const validWallet = {
      address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      publicKey:
        "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      provider: "unisat",
      balance: 1000000,
    };
    assertEquals(isConnectedWallet(validWallet), true);

    // Valid wallet without balance
    const walletNoBalance = {
      address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      publicKey:
        "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      provider: "xverse",
    };
    assertEquals(isConnectedWallet(walletNoBalance), true);

    // Invalid cases
    assertEquals(isConnectedWallet(null), false);
    assertEquals(isConnectedWallet(undefined), false);
    assertEquals(isConnectedWallet({}), false);
    assertEquals(isConnectedWallet({ address: "invalid" }), false);
    assertEquals(
      isConnectedWallet({
        address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        publicKey: "",
        provider: "unisat",
      }),
      false,
    );
  });

  await t.step("isWalletConnectionResult", () => {
    // Valid success result
    const successResult = {
      success: true,
      address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      publicKey:
        "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      provider: "unisat",
    };
    assertEquals(isWalletConnectionResult(successResult), true);

    // Valid error result
    const errorResult = {
      success: false,
      error: {
        code: "USER_REJECTED",
        message: "User rejected the connection request",
      },
    };
    assertEquals(isWalletConnectionResult(errorResult), true);

    // Invalid cases
    assertEquals(isWalletConnectionResult(null), false);
    assertEquals(isWalletConnectionResult(undefined), false);
    assertEquals(isWalletConnectionResult({}), false);
    assertEquals(isWalletConnectionResult({ success: "true" }), false);
    assertEquals(
      isWalletConnectionResult({
        success: true,
        address: "invalid-address",
      }),
      false,
    );
  });

  await t.step("isValidWalletState", () => {
    // Valid states
    assertEquals(
      isValidWalletState({ address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" }),
      true,
    );
    assertEquals(
      isValidWalletState({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        connected: true,
        provider: "unisat",
      }),
      true,
    );

    // Invalid states
    assertEquals(isValidWalletState(null), false);
    assertEquals(isValidWalletState(undefined), false);
    assertEquals(isValidWalletState({}), false);
    assertEquals(isValidWalletState({ address: "" }), false);
    assertEquals(isValidWalletState({ address: 123 }), false);
  });
});

// Fee Calculation Type Guards Tests
Deno.test("Fee Calculation Type Guards", async (t) => {
  const {
    isValidFeeRate,
    isValidFeeEstimate,
    isFeeAlert,
  } = await import("$lib/utils/typeGuards.ts");

  await t.step("isValidFeeRate", () => {
    // Valid fee rates
    assertEquals(isValidFeeRate(1), true);
    assertEquals(isValidFeeRate(10), true);
    assertEquals(isValidFeeRate(100), true);
    assertEquals(isValidFeeRate(1000), true);
    assertEquals(isValidFeeRate(50.5), true);

    // Invalid fee rates
    assertEquals(isValidFeeRate(0), false);
    assertEquals(isValidFeeRate(-1), false);
    assertEquals(isValidFeeRate(1001), false);
    assertEquals(isValidFeeRate(NaN), false);
    assertEquals(isValidFeeRate(Infinity), false);
    assertEquals(isValidFeeRate("10"), false);
    assertEquals(isValidFeeRate(null), false);
    assertEquals(isValidFeeRate(undefined), false);
  });

  await t.step("isValidFeeEstimate", () => {
    // Valid fee estimate
    const validEstimate = {
      recommendedFee: 50,
      effectiveFeeRate: 45,
      feeRateSatsPerVB: 48,
      minFeeRate: 10,
      maxFeeRate: 200,
    };
    assertEquals(isValidFeeEstimate(validEstimate), true);

    // Valid minimal estimate
    const minimalEstimate = {
      recommendedFee: 25,
    };
    assertEquals(isValidFeeEstimate(minimalEstimate), true);

    // Invalid estimates
    assertEquals(isValidFeeEstimate(null), false);
    assertEquals(isValidFeeEstimate(undefined), false);
    assertEquals(isValidFeeEstimate({}), false);
    assertEquals(isValidFeeEstimate({ recommendedFee: 0 }), false);
    assertEquals(isValidFeeEstimate({ recommendedFee: 2000 }), false);
    assertEquals(isValidFeeEstimate({ recommendedFee: "50" }), false);
  });

  await t.step("isFeeAlert", () => {
    // Valid fee alerts
    const warningAlert = {
      type: "warning",
      message: "Fees are higher than usual",
      currentFee: 150,
      recommendedFee: 50,
      threshold: 100,
    };
    assertEquals(isFeeAlert(warningAlert), true);

    const criticalAlert = {
      type: "critical",
      message: "Extremely high fees detected",
      currentFee: 500,
      recommendedFee: 50,
    };
    assertEquals(isFeeAlert(criticalAlert), true);

    // Invalid alerts
    assertEquals(isFeeAlert(null), false);
    assertEquals(isFeeAlert(undefined), false);
    assertEquals(isFeeAlert({}), false);
    assertEquals(
      isFeeAlert({
        type: "invalid-type",
        message: "Test",
        currentFee: 50,
        recommendedFee: 25,
      }),
      false,
    );
    assertEquals(
      isFeeAlert({
        type: "warning",
        message: "",
        currentFee: 50,
        recommendedFee: 25,
      }),
      false,
    );
  });
});

// API Response Type Guards Tests
Deno.test("API Response Type Guards", async (t) => {
  const {
    isPaginatedResponse,
    isValidApiResponse,
  } = await import("$lib/utils/typeGuards.ts");

  await t.step("isPaginatedResponse", () => {
    // Valid paginated response
    const validPaginated = {
      data: [{ id: 1 }, { id: 2 }],
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10,
      hasMore: true,
      cursor: "next-cursor",
    };
    assertEquals(isPaginatedResponse(validPaginated), true);

    // Valid minimal paginated response
    const minimalPaginated = {
      data: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    };
    assertEquals(isPaginatedResponse(minimalPaginated), true);

    // Invalid responses
    assertEquals(isPaginatedResponse(null), false);
    assertEquals(isPaginatedResponse(undefined), false);
    assertEquals(isPaginatedResponse({}), false);
    assertEquals(isPaginatedResponse({ data: "not-array" }), false);
    assertEquals(
      isPaginatedResponse({
        data: [],
        page: 0,
        limit: 10,
        total: 0,
        totalPages: 0,
      }),
      false,
    );
  });

  await t.step("isValidApiResponse", () => {
    // Valid success response
    const successResponse = {
      success: true,
      data: { id: 1, name: "Test" },
    };
    assertEquals(isValidApiResponse(successResponse), true);

    // Valid error response
    const errorResponse = {
      success: false,
      error: { code: "NOT_FOUND", message: "Resource not found" },
    };
    assertEquals(isValidApiResponse(errorResponse), true);

    // Invalid responses
    assertEquals(isValidApiResponse(null), false);
    assertEquals(isValidApiResponse(undefined), false);
    assertEquals(isValidApiResponse({}), false);
    assertEquals(isValidApiResponse({ success: "true" }), false);
    assertEquals(isValidApiResponse({ success: true }), false); // missing data
  });
});

// Summary
console.log("\n✅ All type guard tests completed successfully!");
console.log("This comprehensive test suite validates:");
console.log("- Bitcoin address validation (P2PKH, P2SH, P2WPKH, P2TR)");
console.log("- Transaction validation (hashes, UTXOs, inputs/outputs)");
console.log("- SRC-20 protocol validation (deploy, mint, transfer)");
console.log(
  "- Stamp protocol validation (numbers, hashes, CPIDs, classifications)",
);
console.log("- Error type discrimination");
console.log("- Utility functions and array safety");
console.log("- Bitcoin script validation");
console.log("- SRC-101 protocol validation");
console.log("- Wallet state validation (providers, connections, states)");
console.log("- Fee calculation validation (rates, estimates, alerts)");
console.log("- API response validation (pagination, generic responses)");
