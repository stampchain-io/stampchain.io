/**
 * Tests for server/config/config.ts
 *
 * Tests the server configuration module including environment variable handling
 * and client configuration generation.
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "jsr:@std/testing@1.0.14/bdd";
import { restore, stub } from "@std/testing@1.0.14/mock";

describe("Server Config Module", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Store original environment variables
    originalEnv = {};
    const envVars = [
      "IMAGES_SRC_PATH",
      "MINTING_SERVICE_FEE",
      "MINTING_SERVICE_FEE_ADDRESS",
      "CSRF_SECRET_KEY",
      "OPENSTAMP_API_KEY",
      "API_KEY",
      "QUICKNODE_ENDPOINT",
      "QUICKNODE_API_KEY",
      "DEBUG",
      "APP_DOMAIN",
      "ALLOWED_DOMAINS",
    ];

    envVars.forEach((key) => {
      originalEnv[key] = Deno.env.get(key);
      Deno.env.delete(key);
    });
  });

  afterEach(() => {
    // Restore original environment variables
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value !== undefined) {
        Deno.env.set(key, value);
      } else {
        Deno.env.delete(key);
      }
    });

    // Clear module cache to get fresh imports
    restore();
  });

  describe("serverConfig defaults", () => {
    it("should have correct APP_ROOT", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.APP_ROOT, Deno.cwd());
    });

    it("should have correct default MINTING_SERVICE_FEE_ENABLED", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.MINTING_SERVICE_FEE_ENABLED, "0");
    });

    it("should have correct default MINTING_SERVICE_FEE_FIXED_SATS", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.MINTING_SERVICE_FEE_FIXED_SATS, "0");
    });
  });

  describe("environment variable getters", () => {
    it("should return empty string for undefined IMAGES_SRC_PATH", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.IMAGES_SRC_PATH, "");
    });

    it("should return env value for IMAGES_SRC_PATH", async () => {
      Deno.env.set("IMAGES_SRC_PATH", "/test/images");
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.IMAGES_SRC_PATH, "/test/images");
    });

    it("should return empty string for undefined MINTING_SERVICE_FEE", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.MINTING_SERVICE_FEE, "");
    });

    it("should return env value for MINTING_SERVICE_FEE", async () => {
      Deno.env.set("MINTING_SERVICE_FEE", "1000");
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.MINTING_SERVICE_FEE, "1000");
    });

    it("should return empty string for undefined MINTING_SERVICE_FEE_ADDRESS", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.MINTING_SERVICE_FEE_ADDRESS, "");
    });

    it("should return env value for MINTING_SERVICE_FEE_ADDRESS", async () => {
      Deno.env.set("MINTING_SERVICE_FEE_ADDRESS", "bc1qtest123");
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.MINTING_SERVICE_FEE_ADDRESS, "bc1qtest123");
    });

    it("should return empty string for undefined CSRF_SECRET_KEY", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.CSRF_SECRET_KEY, "");
    });

    it("should return env value for CSRF_SECRET_KEY", async () => {
      Deno.env.set("CSRF_SECRET_KEY", "secret123");
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.CSRF_SECRET_KEY, "secret123");
    });

    it("should return empty string for undefined OPENSTAMP_API_KEY", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.OPENSTAMP_API_KEY, "");
    });

    it("should return env value for OPENSTAMP_API_KEY", async () => {
      Deno.env.set("OPENSTAMP_API_KEY", "openstamp123");
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.OPENSTAMP_API_KEY, "openstamp123");
    });

    it("should return empty string for undefined API_KEY", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.API_KEY, "");
    });

    it("should return env value for API_KEY", async () => {
      Deno.env.set("API_KEY", "api123");
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.API_KEY, "api123");
    });

    it("should return empty string for undefined QUICKNODE_ENDPOINT", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.QUICKNODE_ENDPOINT, "");
    });

    it("should return env value for QUICKNODE_ENDPOINT", async () => {
      Deno.env.set("QUICKNODE_ENDPOINT", "https://quicknode.test");
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.QUICKNODE_ENDPOINT, "https://quicknode.test");
    });

    it("should return empty string for undefined QUICKNODE_API_KEY", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.QUICKNODE_API_KEY, "");
    });

    it("should return env value for QUICKNODE_API_KEY", async () => {
      Deno.env.set("QUICKNODE_API_KEY", "quicknode123");
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.QUICKNODE_API_KEY, "quicknode123");
    });

    it("should return empty string for undefined DEBUG_NAMESPACES", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.DEBUG_NAMESPACES, "");
    });

    it("should return env value for DEBUG_NAMESPACES", async () => {
      Deno.env.set("DEBUG", "app:*");
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.DEBUG_NAMESPACES, "app:*");
    });

    it("should return false for IS_DEBUG_ENABLED when DEBUG not set", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.IS_DEBUG_ENABLED, false);
    });

    it("should return true for IS_DEBUG_ENABLED when DEBUG is set", async () => {
      Deno.env.set("DEBUG", "app:*");
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.IS_DEBUG_ENABLED, true);
    });

    it("should return empty string for undefined APP_DOMAIN", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.APP_DOMAIN, "");
    });

    it("should return env value for APP_DOMAIN", async () => {
      Deno.env.set("APP_DOMAIN", "example.com");
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.APP_DOMAIN, "example.com");
    });

    it("should return empty string for undefined ALLOWED_DOMAINS", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.ALLOWED_DOMAINS, "");
    });

    it("should return env value for ALLOWED_DOMAINS", async () => {
      Deno.env.set("ALLOWED_DOMAINS", "example.com,test.com");
      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.ALLOWED_DOMAINS, "example.com,test.com");
    });
  });

  describe("getClientConfig function", () => {
    it("should return client-safe configuration", async () => {
      // Set some test values
      Deno.env.set("MINTING_SERVICE_FEE", "1000");
      Deno.env.set("MINTING_SERVICE_FEE_ADDRESS", "bc1qtest123");
      Deno.env.set("DEBUG", "app:*");

      const { getClientConfig } = await import("../../server/config/config.ts");
      const clientConfig = getClientConfig();

      assertEquals(clientConfig.MINTING_SERVICE_FEE, "1000");
      assertEquals(clientConfig.MINTING_SERVICE_FEE_ADDRESS, "bc1qtest123");
      assertEquals(clientConfig.DEBUG_NAMESPACES, "app:*");
      assertEquals(clientConfig.IS_DEBUG_ENABLED, true);
    });

    it("should return default values when env vars not set", async () => {
      const { getClientConfig } = await import("../../server/config/config.ts");
      const clientConfig = getClientConfig();

      assertEquals(clientConfig.MINTING_SERVICE_FEE, "");
      assertEquals(clientConfig.MINTING_SERVICE_FEE_ADDRESS, "");
      assertEquals(clientConfig.DEBUG_NAMESPACES, "");
      assertEquals(clientConfig.IS_DEBUG_ENABLED, false);
    });

    it("should only include safe configuration fields", async () => {
      const { getClientConfig } = await import("../../server/config/config.ts");
      const clientConfig = getClientConfig();

      const keys = Object.keys(clientConfig);
      assertEquals(keys.length, 4);
      assert(keys.includes("MINTING_SERVICE_FEE"));
      assert(keys.includes("MINTING_SERVICE_FEE_ADDRESS"));
      assert(keys.includes("DEBUG_NAMESPACES"));
      assert(keys.includes("IS_DEBUG_ENABLED"));

      // Should not include sensitive keys
      assert(!keys.includes("CSRF_SECRET_KEY"));
      assert(!keys.includes("API_KEY"));
      assert(!keys.includes("OPENSTAMP_API_KEY"));
      assert(!keys.includes("QUICKNODE_API_KEY"));
    });
  });

  describe("config indexability", () => {
    it("should allow index access to config properties", async () => {
      Deno.env.set("API_KEY", "test123");

      const { serverConfig } = await import("../../server/config/config.ts");

      // Test index signature access
      assertEquals(serverConfig["API_KEY"], "test123");
      assertEquals(serverConfig["APP_ROOT"], Deno.cwd());
      assertEquals(serverConfig["MINTING_SERVICE_FEE_ENABLED"], "0");
    });

    it("should handle undefined keys gracefully", async () => {
      const { serverConfig } = await import("../../server/config/config.ts");

      // Test accessing undefined key
      assertEquals(serverConfig["NONEXISTENT_KEY"], undefined);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle falsy but defined environment variables", async () => {
      Deno.env.set("DEBUG", "");

      const { serverConfig } = await import("../../server/config/config.ts");

      assertEquals(serverConfig.DEBUG_NAMESPACES, "");
      assertEquals(serverConfig.IS_DEBUG_ENABLED, false);
    });

    it("should handle environment variables with special characters", async () => {
      Deno.env.set("MINTING_SERVICE_FEE", "1,000.50");

      const { serverConfig } = await import("../../server/config/config.ts");
      assertEquals(serverConfig.MINTING_SERVICE_FEE, "1,000.50");
    });

    it("should maintain getter behavior on multiple accesses", async () => {
      Deno.env.set("API_KEY", "initial");

      const { serverConfig } = await import("../../server/config/config.ts");

      assertEquals(serverConfig.API_KEY, "initial");

      // Change environment variable
      Deno.env.set("API_KEY", "changed");

      // Getter should return new value
      assertEquals(serverConfig.API_KEY, "changed");
    });
  });
});
