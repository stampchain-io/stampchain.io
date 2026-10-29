/**
 * Comprehensive Unit Tests for Server Configuration
 *
 * Tests configuration loading, environment variable parsing, validation,
 * and client configuration generation.
 */

import { assertEquals, assertExists, assertThrows } from "@std/assert";
import {
  getClientConfig,
  serverConfig,
} from "../../server/config/config.ts";

// Mock environment for testing
const originalEnv = { ...Deno.env.toObject() };

function setTestEnv(envVars: Record<string, string>) {
  // Clear existing env
  for (const key of Object.keys(Deno.env.toObject())) {
    Deno.env.delete(key);
  }
  // Set test env
  for (const [key, value] of Object.entries(envVars)) {
    Deno.env.set(key, value);
  }
}

function restoreEnv() {
  // Clear all env vars
  for (const key of Object.keys(Deno.env.toObject())) {
    Deno.env.delete(key);
  }
  // Restore original
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value !== undefined) {
      Deno.env.set(key, value);
    }
  }
}

Deno.test("ServerConfig - Basic Configuration", async (t) => {
  await t.step("should have correct default values", () => {
    assertEquals(serverConfig.APP_ROOT, Deno.cwd());
    assertEquals(serverConfig.MINTING_SERVICE_FEE_ENABLED, "0");
    assertEquals(serverConfig.MINTING_SERVICE_FEE_FIXED_SATS, "0");
  });

  await t.step("should get APP_ROOT as current working directory", () => {
    const appRoot = serverConfig.APP_ROOT;
    assertEquals(typeof appRoot, "string");
    assertEquals(appRoot.length > 0, true);
  });
});

Deno.test("ServerConfig - Environment Variable Getters", async (t) => {
  await t.step("should get IMAGES_SRC_PATH from environment", () => {
    setTestEnv({ IMAGES_SRC_PATH: "/test/images" });

    try {
      assertEquals(serverConfig.IMAGES_SRC_PATH, "/test/images");
    } finally {
      restoreEnv();
    }
  });

  await t.step(
    "should return empty string for undefined IMAGES_SRC_PATH",
    () => {
      setTestEnv({});

      try {
        assertEquals(serverConfig.IMAGES_SRC_PATH, "");
      } finally {
        restoreEnv();
      }
    },
  );

  await t.step("should get MINTING_SERVICE_FEE from environment", () => {
    setTestEnv({ MINTING_SERVICE_FEE: "1000" });

    try {
      assertEquals(serverConfig.MINTING_SERVICE_FEE, "1000");
    } finally {
      restoreEnv();
    }
  });

  await t.step(
    "should get MINTING_SERVICE_FEE_ADDRESS from environment",
    () => {
      setTestEnv({ MINTING_SERVICE_FEE_ADDRESS: "bc1qtest123" });

      try {
        assertEquals(serverConfig.MINTING_SERVICE_FEE_ADDRESS, "bc1qtest123");
      } finally {
        restoreEnv();
      }
    },
  );

  await t.step("should get CSRF_SECRET_KEY from environment", () => {
    setTestEnv({ CSRF_SECRET_KEY: "secret123" });

    try {
      assertEquals(serverConfig.CSRF_SECRET_KEY, "secret123");
    } finally {
      restoreEnv();
    }
  });

  await t.step("should get OPENSTAMP_API_KEY from environment", () => {
    setTestEnv({ OPENSTAMP_API_KEY: "openstamp123" });

    try {
      assertEquals(serverConfig.OPENSTAMP_API_KEY, "openstamp123");
    } finally {
      restoreEnv();
    }
  });

  await t.step("should get API_KEY from environment", () => {
    setTestEnv({ API_KEY: "api123" });

    try {
      assertEquals(serverConfig.API_KEY, "api123");
    } finally {
      restoreEnv();
    }
  });

  await t.step("should get QUICKNODE_ENDPOINT from environment", () => {
    setTestEnv({ QUICKNODE_ENDPOINT: "https://test.quicknode.pro" });

    try {
      assertEquals(
        serverConfig.QUICKNODE_ENDPOINT,
        "https://test.quicknode.pro",
      );
    } finally {
      restoreEnv();
    }
  });

  await t.step("should get QUICKNODE_API_KEY from environment", () => {
    setTestEnv({ QUICKNODE_API_KEY: "quicknode123" });

    try {
      assertEquals(serverConfig.QUICKNODE_API_KEY, "quicknode123");
    } finally {
      restoreEnv();
    }
  });

  await t.step("should get DEBUG_NAMESPACES from environment", () => {
    setTestEnv({ DEBUG: "app:*,api:*" });

    try {
      assertEquals(serverConfig.DEBUG_NAMESPACES, "app:*,api:*");
    } finally {
      restoreEnv();
    }
  });

  await t.step("should return empty string for undefined DEBUG", () => {
    setTestEnv({});

    try {
      assertEquals(serverConfig.DEBUG_NAMESPACES, "");
    } finally {
      restoreEnv();
    }
  });

  await t.step("should get IS_DEBUG_ENABLED correctly", () => {
    // Test with DEBUG set
    setTestEnv({ DEBUG: "app:*" });

    try {
      assertEquals(serverConfig.IS_DEBUG_ENABLED, true);
    } finally {
      restoreEnv();
    }

    // Test without DEBUG
    setTestEnv({});

    try {
      assertEquals(serverConfig.IS_DEBUG_ENABLED, false);
    } finally {
      restoreEnv();
    }
  });

  await t.step("should get APP_DOMAIN from environment", () => {
    setTestEnv({ APP_DOMAIN: "https://example.com" });

    try {
      assertEquals(serverConfig.APP_DOMAIN, "https://example.com");
    } finally {
      restoreEnv();
    }
  });

  await t.step("should get ALLOWED_DOMAINS from environment", () => {
    setTestEnv({ ALLOWED_DOMAINS: "example.com,test.com" });

    try {
      assertEquals(serverConfig.ALLOWED_DOMAINS, "example.com,test.com");
    } finally {
      restoreEnv();
    }
  });
});

Deno.test("ServerConfig - getClientConfig Function", async (t) => {
  await t.step("should return client configuration with correct fields", () => {
    setTestEnv({
      MINTING_SERVICE_FEE: "1000",
      MINTING_SERVICE_FEE_ADDRESS: "bc1qtest123",
      DEBUG: "app:*",
    });

    try {
      const clientConfig = getClientConfig();

      assertExists(clientConfig);
      assertEquals(clientConfig.MINTING_SERVICE_FEE, "1000");
      assertEquals(clientConfig.MINTING_SERVICE_FEE_ADDRESS, "bc1qtest123");
      assertEquals(clientConfig.DEBUG_NAMESPACES, "app:*");
      assertEquals(clientConfig.IS_DEBUG_ENABLED, true);
    } finally {
      restoreEnv();
    }
  });

  await t.step("should return client configuration with empty values", () => {
    setTestEnv({});

    try {
      const clientConfig = getClientConfig();

      assertExists(clientConfig);
      assertEquals(clientConfig.MINTING_SERVICE_FEE, "");
      assertEquals(clientConfig.MINTING_SERVICE_FEE_ADDRESS, "");
      assertEquals(clientConfig.DEBUG_NAMESPACES, "");
      assertEquals(clientConfig.IS_DEBUG_ENABLED, false);
    } finally {
      restoreEnv();
    }
  });

  await t.step("should only include client-safe configuration", () => {
    setTestEnv({
      MINTING_SERVICE_FEE: "1000",
      MINTING_SERVICE_FEE_ADDRESS: "bc1qtest123",
      DEBUG: "app:*",
      API_KEY: "secret123", // This should NOT be in client config
      QUICKNODE_API_KEY: "quicknode123", // This should NOT be in client config
    });

    try {
      const clientConfig = getClientConfig();

      // Should have client-safe fields
      assertExists(clientConfig.MINTING_SERVICE_FEE);
      assertExists(clientConfig.MINTING_SERVICE_FEE_ADDRESS);
      assertExists(clientConfig.DEBUG_NAMESPACES);
      assertExists(clientConfig.IS_DEBUG_ENABLED);

      // Should NOT have sensitive fields
      assertEquals((clientConfig as any).API_KEY, undefined);
      assertEquals((clientConfig as any).QUICKNODE_API_KEY, undefined);
      assertEquals((clientConfig as any).CSRF_SECRET_KEY, undefined);
    } finally {
      restoreEnv();
    }
  });
});

Deno.test("ServerConfig - Dynamic Property Access", async (t) => {
  await t.step("should support dynamic property access via string keys", () => {
    setTestEnv({
      TEST_VALUE: "dynamic123",
      ANOTHER_TEST: "another456",
    });

    try {
      // Access properties dynamically
      assertEquals(serverConfig["MINTING_SERVICE_FEE_ENABLED"], "0");
      assertEquals(serverConfig["MINTING_SERVICE_FEE_FIXED_SATS"], "0");

      // Test with known string key
      const key: string = "APP_ROOT";
      assertEquals(typeof serverConfig[key], "string");
    } finally {
      restoreEnv();
    }
  });

  await t.step("should handle undefined dynamic property access", () => {
    const undefinedKey = "NON_EXISTENT_KEY";
    assertEquals(serverConfig[undefinedKey], undefined);
  });
});

Deno.test("ServerConfig - Type Safety and Validation", async (t) => {
  await t.step("should have correct types for boolean values", () => {
    setTestEnv({ DEBUG: "test" });

    try {
      assertEquals(typeof serverConfig.IS_DEBUG_ENABLED, "boolean");
      assertEquals(serverConfig.IS_DEBUG_ENABLED, true);
    } finally {
      restoreEnv();
    }
  });

  await t.step("should have correct types for string values", () => {
    assertEquals(typeof serverConfig.APP_ROOT, "string");
    assertEquals(typeof serverConfig.MINTING_SERVICE_FEE_ENABLED, "string");
    assertEquals(typeof serverConfig.MINTING_SERVICE_FEE_FIXED_SATS, "string");
  });

  await t.step("should handle environment variable type conversion", () => {
    setTestEnv({
      DEBUG: "", // Empty string should be falsy
    });

    try {
      assertEquals(serverConfig.IS_DEBUG_ENABLED, false);
    } finally {
      restoreEnv();
    }

    setTestEnv({
      DEBUG: "0", // Non-empty string should be truthy
    });

    try {
      assertEquals(serverConfig.IS_DEBUG_ENABLED, true);
    } finally {
      restoreEnv();
    }
  });
});

Deno.test("ServerConfig - Error Handling and Edge Cases", async (t) => {
  await t.step("should handle missing environment gracefully", () => {
    setTestEnv({});

    try {
      // All these should return empty strings or defaults, not throw
      assertEquals(serverConfig.IMAGES_SRC_PATH, "");
      assertEquals(serverConfig.MINTING_SERVICE_FEE, "");
      assertEquals(serverConfig.API_KEY, "");
      assertEquals(serverConfig.DEBUG_NAMESPACES, "");
      assertEquals(serverConfig.IS_DEBUG_ENABLED, false);
    } finally {
      restoreEnv();
    }
  });

  await t.step("should handle environment with special characters", () => {
    setTestEnv({
      IMAGES_SRC_PATH: "/path/with spaces/and-dashes_and.dots",
      DEBUG: "namespace:with:colons,another*with*stars",
    });

    try {
      assertEquals(
        serverConfig.IMAGES_SRC_PATH,
        "/path/with spaces/and-dashes_and.dots",
      );
      assertEquals(
        serverConfig.DEBUG_NAMESPACES,
        "namespace:with:colons,another*with*stars",
      );
      assertEquals(serverConfig.IS_DEBUG_ENABLED, true);
    } finally {
      restoreEnv();
    }
  });

  await t.step("should handle very long environment values", () => {
    const longValue = "a".repeat(1000);
    setTestEnv({ IMAGES_SRC_PATH: longValue });

    try {
      assertEquals(serverConfig.IMAGES_SRC_PATH, longValue);
      assertEquals(serverConfig.IMAGES_SRC_PATH.length, 1000);
    } finally {
      restoreEnv();
    }
  });

  await t.step("should handle Unicode in environment values", () => {
    setTestEnv({
      IMAGES_SRC_PATH: "/path/with/émojis/🚀/and/üñíçödé",
    });

    try {
      assertEquals(
        serverConfig.IMAGES_SRC_PATH,
        "/path/with/émojis/🚀/and/üñíçödé",
      );
    } finally {
      restoreEnv();
    }
  });
});
