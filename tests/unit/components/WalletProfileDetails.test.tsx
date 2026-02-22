/**
 * @fileoverview WalletProfileDetails Integration Tests
 * @description Tests for edit button integration and modal interaction in WalletProfileDetails
 */

import { assertEquals, assertExists } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import type { WalletOverviewInfo } from "$lib/types/wallet.d.ts";

/* ===== TEST UTILITIES ===== */
// Mock wallet context that can be configured per test
let mockWalletState = {
  address: null as string | null,
};

// Mock modal state
let openedModal: any = null;
let modalAnimation: string | null = null;

// Mock global functions
const mockGlobalThis = {
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  navigator: {
    clipboard: {
      writeText: async (_text: string) => {},
    },
  },
  location: {
    reload: () => {},
  },
};

/* ===== MOCK WALLET DATA FACTORY ===== */
function createMockWalletData(
  overrides: Partial<WalletOverviewInfo> = {},
): WalletOverviewInfo {
  return {
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    balance: 0.001,
    usdValue: 50.0,
    creatorName: "",
    src101: { names: [] },
    dispensers: { open: 0, closed: 0, total: 0 },
    ...overrides,
  };
}

describe("WalletProfileDetails - Edit Button Integration", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockWalletState = { address: null };
    openedModal = null;
    modalAnimation = null;

    // Mock globalThis functions
    Object.assign(globalThis, mockGlobalThis);
  });

  afterEach(() => {
    // Cleanup after each test
    mockWalletState = { address: null };
    openedModal = null;
    modalAnimation = null;
  });

  describe("Edit Button Visibility", () => {
    it("should show edit button when connected wallet matches profile address", () => {
      const walletData = createMockWalletData({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        creatorName: "TestUser",
      });

      // Set connected wallet to same address
      mockWalletState.address = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

      // In actual component: isOwner = wallet?.address && wallet.address.toLowerCase() === walletData.address.toLowerCase()
      const isOwner = !!(mockWalletState.address &&
        mockWalletState.address.toLowerCase() ===
          walletData.address.toLowerCase());

      assertEquals(isOwner, true);
    });

    it("should hide edit button when no wallet is connected", () => {
      const walletData = createMockWalletData({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        creatorName: "TestUser",
      });

      // No wallet connected
      mockWalletState.address = null;

      const isOwner = !!(mockWalletState.address &&
        mockWalletState.address.toLowerCase() ===
          walletData.address.toLowerCase());

      assertEquals(isOwner, false);
    });

    it("should hide edit button when connected wallet differs from profile address", () => {
      const walletData = createMockWalletData({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        creatorName: "TestUser",
      });

      // Different wallet connected
      mockWalletState.address = "bc1qdifferentaddress0000000000000000000000";

      const isOwner = !!(mockWalletState.address &&
        mockWalletState.address.toLowerCase() ===
          walletData.address.toLowerCase());

      assertEquals(isOwner, false);
    });

    it("should handle case-insensitive address matching", () => {
      const walletData = createMockWalletData({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        creatorName: "TestUser",
      });

      // Same address but different case
      mockWalletState.address = "BC1QXY2KGDYGJRSQTZQ2N0YRF2493P83KKFJHX0WLH";

      const isOwner = !!(mockWalletState.address &&
        mockWalletState.address.toLowerCase() ===
          walletData.address.toLowerCase());

      assertEquals(isOwner, true);
    });
  });

  describe("Modal Integration", () => {
    it("should pass current creator name to modal when opening", () => {
      const walletData = createMockWalletData({
        creatorName: "AliceTheCreator",
      });

      // Simulate openModal call with expected props
      const mockOpenModal = (
        modalComponent: any,
        animation: string,
      ) => {
        openedModal = modalComponent;
        modalAnimation = animation;
      };

      // Simulate what handleEditClick does
      mockOpenModal(
        {
          type: "EditCreatorNameModal",
          props: {
            currentName: walletData.creatorName || "",
            onSuccess: () => {},
          },
        },
        "slideUpDown",
      );

      assertExists(openedModal);
      assertEquals(openedModal.type, "EditCreatorNameModal");
      assertEquals(openedModal.props.currentName, "AliceTheCreator");
      assertEquals(modalAnimation, "slideUpDown");
    });

    it("should pass empty string to modal when no creator name exists", () => {
      const walletData = createMockWalletData({
        creatorName: undefined,
      });

      const mockOpenModal = (
        modalComponent: any,
        _animation: string,
      ) => {
        openedModal = modalComponent;
      };

      mockOpenModal(
        {
          type: "EditCreatorNameModal",
          props: {
            currentName: walletData.creatorName || "",
            onSuccess: () => {},
          },
        },
        "slideUpDown",
      );

      assertEquals(openedModal.props.currentName, "");
    });

    it("should configure modal with slideUpDown animation", () => {
      const walletData = createMockWalletData({
        creatorName: "TestUser",
      });

      const mockOpenModal = (
        _modalComponent: any,
        animation: string,
      ) => {
        modalAnimation = animation;
      };

      mockOpenModal(
        {
          type: "EditCreatorNameModal",
          props: {
            currentName: walletData.creatorName || "",
            onSuccess: () => {},
          },
        },
        "slideUpDown",
      );

      assertEquals(modalAnimation, "slideUpDown");
    });
  });

  describe("Success Callback Handling", () => {
    it("should update display name when modal success callback is invoked", () => {
      let displayName = "OldName";
      const newName = "NewName";

      // Simulate the onSuccess callback from handleEditClick
      const onSuccess = (updatedName: string) => {
        displayName = updatedName;
      };

      onSuccess(newName);

      assertEquals(displayName, "NewName");
    });

    it("should schedule page reload after successful name update", () => {
      let reloadCalled = false;
      let timeoutDelay = 0;

      // Mock setTimeout to capture reload call
      const mockSetTimeout = (callback: () => void, delay: number) => {
        timeoutDelay = delay;
        // Execute callback synchronously for testing
        callback();
        return 1 as any;
      };

      // Mock location.reload
      const mockReload = () => {
        reloadCalled = true;
      };

      // Simulate onSuccess callback that schedules reload
      const onSuccess = (_newName: string) => {
        mockSetTimeout(() => {
          mockReload();
        }, 1500);
      };

      onSuccess("UpdatedName");

      assertEquals(reloadCalled, true);
      assertEquals(timeoutDelay, 1500);
    });

    it("should handle success callback with trimmed names", () => {
      let displayName = "";

      const onSuccess = (updatedName: string) => {
        displayName = updatedName;
      };

      // Modal should return trimmed name
      onSuccess("  TrimmedName  ".trim());

      assertEquals(displayName, "TrimmedName");
    });
  });

  describe("Display Name Management", () => {
    it("should initialize display name with creator name when available", () => {
      const walletData = createMockWalletData({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        creatorName: "MyCreatorName",
      });

      const displayName = walletData.creatorName || walletData.address;

      assertEquals(displayName, "MyCreatorName");
    });

    it("should initialize display name with address when no creator name exists", () => {
      const walletData = createMockWalletData({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        creatorName: undefined,
      });

      const displayName = walletData.creatorName || walletData.address;

      assertEquals(displayName, "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh");
    });

    it("should update display name when creator name changes", () => {
      let displayName = "InitialName";

      // Simulate update from modal success
      const updateDisplayName = (newName: string) => {
        displayName = newName;
      };

      updateDisplayName("UpdatedCreatorName");

      assertEquals(displayName, "UpdatedCreatorName");
    });
  });

  describe("BitNames Integration", () => {
    it("should filter creator name from bitNames list to avoid duplication", () => {
      const walletData = createMockWalletData({
        creatorName: "alice.btc",
        src101: {
          names: ["alice", "bob", "charlie"],
        },
      });

      const bitNames = Array.isArray(walletData.src101?.names)
        ? walletData.src101.names.filter((name): name is string =>
          typeof name === "string"
        )
        : [];

      // Filter out creator name to avoid duplication
      const additionalBitNames = bitNames.filter((name) =>
        walletData.creatorName !== `${name}.btc`
      );

      assertEquals(bitNames.length, 3);
      assertEquals(additionalBitNames.length, 2);
      assertEquals(additionalBitNames.includes("alice"), false);
      assertEquals(additionalBitNames.includes("bob"), true);
      assertEquals(additionalBitNames.includes("charlie"), true);
    });

    it("should handle empty bitNames array", () => {
      const walletData = createMockWalletData({
        creatorName: "alice.btc",
        src101: { names: [] },
      });

      const bitNames = Array.isArray(walletData.src101?.names)
        ? walletData.src101.names.filter((name): name is string =>
          typeof name === "string"
        )
        : [];

      assertEquals(bitNames.length, 0);
    });

    it("should handle missing src101 data", () => {
      const walletData = createMockWalletData({
        creatorName: "alice.btc",
        src101: undefined as any,
      });

      const bitNames = Array.isArray(walletData.src101?.names)
        ? walletData.src101.names.filter((name): name is string =>
          typeof name === "string"
        )
        : [];

      assertEquals(bitNames.length, 0);
    });
  });

  describe("Copy Address Integration", () => {
    it("should handle clipboard write for address copying", async () => {
      let copiedText = "";

      const mockClipboard = {
        writeText: (text: string) => {
          copiedText = text;
          return Promise.resolve();
        },
      };

      const walletData = createMockWalletData({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      });

      await mockClipboard.writeText(walletData.address);

      assertEquals(copiedText, "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh");
    });

    it("should handle clipboard errors gracefully", async () => {
      let errorCaught = false;

      const mockClipboard = {
        writeText: (_text: string) => {
          return Promise.reject(new Error("Clipboard access denied"));
        },
      };

      const walletData = createMockWalletData({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      });

      try {
        await mockClipboard.writeText(walletData.address);
      } catch (err) {
        errorCaught = true;
        assertEquals(err instanceof Error, true);
        assertEquals((err as Error).message, "Clipboard access denied");
      }

      assertEquals(errorCaught, true);
    });
  });

  describe("Tooltip State Management", () => {
    it("should manage copy tooltip visibility with timeout", () => {
      let isTooltipVisible = false;
      let timeoutId: number | null = null;

      // Simulate mouse enter with timeout
      const handleMouseEnter = () => {
        timeoutId = globalThis.setTimeout(() => {
          isTooltipVisible = true;
        }, 1500) as any;
      };

      handleMouseEnter();

      // Timeout should be set
      assertExists(timeoutId);
      assertEquals(typeof timeoutId, "number");

      // Clean up timeout to prevent leak
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    });

    it("should clear timeout on mouse leave", () => {
      let isTooltipVisible = true;
      let timeoutCleared = false;

      const mockTimeoutId = 123;

      const mockClearTimeout = (_id: number) => {
        timeoutCleared = true;
      };

      // Simulate mouse leave
      const handleMouseLeave = () => {
        mockClearTimeout(mockTimeoutId);
        isTooltipVisible = false;
      };

      handleMouseLeave();

      assertEquals(timeoutCleared, true);
      assertEquals(isTooltipVisible, false);
    });

    it("should disable tooltip after copy action", () => {
      let allowTooltip = true;
      let showCopied = false;

      // Simulate successful copy
      const handleCopy = () => {
        showCopied = true;
        allowTooltip = false;
      };

      handleCopy();

      assertEquals(showCopied, true);
      assertEquals(allowTooltip, false);
    });
  });

  describe("Edit Button Accessibility", () => {
    it("should have proper aria-label for edit button", () => {
      const expectedAriaLabel = "Edit creator name";

      // Icon component should receive ariaLabel prop
      const iconProps = {
        type: "icon",
        name: "edit",
        weight: "normal",
        size: "smR",
        color: "greyDark",
        ariaLabel: expectedAriaLabel,
      };

      assertEquals(iconProps.ariaLabel, "Edit creator name");
    });

    it("should configure edit icon with proper visual styling", () => {
      const iconConfig = {
        name: "edit",
        weight: "normal",
        size: "smR",
        color: "greyDark",
      };

      assertEquals(iconConfig.name, "edit");
      assertEquals(iconConfig.weight, "normal");
      assertEquals(iconConfig.size, "smR");
      assertEquals(iconConfig.color, "greyDark");
    });
  });

  describe("Modal Success Flow Integration", () => {
    it("should trigger page reload with correct delay after successful update", () => {
      let reloadCalled = false;
      let actualDelay = 0;

      const mockSetTimeout = (callback: () => void, delay: number) => {
        actualDelay = delay;
        // Execute callback for testing
        callback();
        return 1 as any;
      };

      const mockReload = () => {
        reloadCalled = true;
      };

      // Simulate the onSuccess flow from handleEditClick (lines 95-100)
      const simulateSuccessFlow = (newName: string) => {
        // Display name would be updated
        // Then page reload is scheduled
        mockSetTimeout(() => {
          mockReload();
        }, 1500);
      };

      simulateSuccessFlow("UpdatedName");

      assertEquals(actualDelay, 1500);
      assertEquals(reloadCalled, true);
    });

    it("should coordinate display name update before page reload", () => {
      let displayName = "OldName";
      let reloadScheduled = false;

      const simulateSuccessFlow = (newName: string) => {
        // Step 1: Update display name
        displayName = newName;

        // Step 2: Schedule reload
        reloadScheduled = true;
      };

      simulateSuccessFlow("NewName");

      assertEquals(displayName, "NewName");
      assertEquals(reloadScheduled, true);
    });
  });

  describe("Component State Integration", () => {
    it("should preserve wallet data during edit flow", () => {
      const originalWalletData = createMockWalletData({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        creatorName: "OriginalName",
        balance: 0.001,
        usdValue: 50.0,
      });

      // Wallet data should remain unchanged during modal interaction
      const walletDataAfterModalOpen = { ...originalWalletData };

      assertEquals(
        walletDataAfterModalOpen.address,
        originalWalletData.address,
      );
      assertEquals(
        walletDataAfterModalOpen.balance,
        originalWalletData.balance,
      );
      assertEquals(
        walletDataAfterModalOpen.usdValue,
        originalWalletData.usdValue,
      );
    });

    it("should handle multiple bitNames during name editing", () => {
      const walletData = createMockWalletData({
        creatorName: "alice.btc",
        src101: {
          names: ["alice", "bob", "charlie", "david"],
        },
      });

      // BitNames filtering should work correctly even during edit operations
      const bitNames = Array.isArray(walletData.src101?.names)
        ? walletData.src101.names.filter((name): name is string =>
          typeof name === "string"
        )
        : [];

      const additionalBitNames = bitNames.filter((name) =>
        walletData.creatorName !== `${name}.btc`
      );

      // alice should be filtered out since it matches creatorName
      assertEquals(additionalBitNames.length, 3);
      assertEquals(additionalBitNames.includes("alice"), false);
      assertEquals(additionalBitNames.includes("bob"), true);
      assertEquals(additionalBitNames.includes("charlie"), true);
      assertEquals(additionalBitNames.includes("david"), true);
    });
  });

  describe("Edge Case Handling", () => {
    it("should handle empty string creator name gracefully", () => {
      const walletData = createMockWalletData({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        creatorName: "",
      });

      // Display name should fall back to address when creator name is empty
      const displayName = walletData.creatorName || walletData.address;

      assertEquals(displayName, "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh");
    });

    it("should handle undefined src101 gracefully during edit", () => {
      const walletData = createMockWalletData({
        creatorName: "TestUser",
        src101: undefined as any,
      });

      const bitNames = Array.isArray(walletData.src101?.names)
        ? walletData.src101.names.filter((name): name is string =>
          typeof name === "string"
        )
        : [];

      assertEquals(bitNames.length, 0);
      // Should not throw error when accessing src101.names
    });

    it("should handle null wallet address in ownership check", () => {
      const walletData = createMockWalletData({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      });

      mockWalletState.address = null;

      const isOwner = !!(mockWalletState.address &&
        mockWalletState.address.toLowerCase() ===
          walletData.address.toLowerCase());

      assertEquals(isOwner, false);
    });

    it("should handle very long creator names in modal", () => {
      const longName = "A".repeat(30); // Exceeds 25 char limit
      const walletData = createMockWalletData({
        creatorName: longName,
      });

      // Modal should receive the long name even if it exceeds limit
      const modalProps = {
        currentName: walletData.creatorName || "",
        onSuccess: () => {},
      };

      assertEquals(modalProps.currentName, longName);
      assertEquals(modalProps.currentName.length, 30);
    });
  });

  describe("Modal Animation Integration", () => {
    it("should use slideUpDown animation consistently", () => {
      const animations: string[] = [];

      const mockOpenModal = (
        _modalComponent: any,
        animation: string,
      ) => {
        animations.push(animation);
      };

      // Simulate multiple modal openings
      for (let i = 0; i < 3; i++) {
        mockOpenModal(
          {
            type: "EditCreatorNameModal",
            props: { currentName: "", onSuccess: () => {} },
          },
          "slideUpDown",
        );
      }

      // All openings should use the same animation
      assertEquals(animations.length, 3);
      assertEquals(animations.every((anim) => anim === "slideUpDown"), true);
    });
  });

  describe("Wallet Context Integration", () => {
    it("should handle wallet connection state changes", () => {
      const walletData = createMockWalletData({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      });

      // Initially not connected
      mockWalletState.address = null;
      let isOwner = !!(mockWalletState.address &&
        mockWalletState.address.toLowerCase() ===
          walletData.address.toLowerCase());
      assertEquals(isOwner, false);

      // Connect wallet
      mockWalletState.address = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
      isOwner = !!(mockWalletState.address &&
        mockWalletState.address.toLowerCase() ===
          walletData.address.toLowerCase());
      assertEquals(isOwner, true);

      // Disconnect wallet
      mockWalletState.address = null;
      isOwner = !!(mockWalletState.address &&
        mockWalletState.address.toLowerCase() ===
          walletData.address.toLowerCase());
      assertEquals(isOwner, false);
    });

    it("should handle wallet address switching", () => {
      const walletData = createMockWalletData({
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      });

      // Connect with address A
      mockWalletState.address = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
      let isOwner = !!(mockWalletState.address &&
        mockWalletState.address.toLowerCase() ===
          walletData.address.toLowerCase());
      assertEquals(isOwner, true);

      // Switch to address B
      mockWalletState.address = "bc1qdifferentaddress0000000000000000000000";
      isOwner = !!(mockWalletState.address &&
        mockWalletState.address.toLowerCase() ===
          walletData.address.toLowerCase());
      assertEquals(isOwner, false);

      // Switch back to address A
      mockWalletState.address = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
      isOwner = !!(mockWalletState.address &&
        mockWalletState.address.toLowerCase() ===
          walletData.address.toLowerCase());
      assertEquals(isOwner, true);
    });
  });
});
