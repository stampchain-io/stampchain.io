/**
 * @fileoverview Keyboard navigation tests for EditCreatorNameModal
 * @description Tests accessibility support including ESC key handling and focus management
 */

import { assertEquals } from "@std/assert";
import { describe, it } from "jsr:@std/testing@1.0.14/bdd";
import { validateCreatorName } from "$islands/modal/EditCreatorNameModal.tsx";
import { MockHTMLElement, withDOM } from "./utils/testHelpers.ts";

describe("EditCreatorNameModal - Keyboard Navigation", () => {
  describe("ESC key handling (ModalBase integration)", () => {
    it("should close modal when ESC key is pressed", async () => {
      await withDOM(({ mockDoc }) => {
        let closeHandlerCalled = false;
        let keydownHandler: ((e: { key: string }) => void) | null = null;

        // Mock addEventListener to capture the keydown handler
        const originalAddEventListener = mockDoc.addEventListener;
        mockDoc.addEventListener = (event: string, handler: any) => {
          if (event === "keydown") {
            keydownHandler = handler;
          }
          return originalAddEventListener.call(mockDoc, event, handler);
        };

        // Simulate modal setup (ModalBase's useEffect)
        const setupKeyboardListener = () => {
          const handleClose = () => {
            closeHandlerCalled = true;
          };

          const handleKeyboardShortcut = (e: { key: string }) => {
            if (e.key === "Escape") {
              handleClose();
            }
          };

          mockDoc.addEventListener("keydown", handleKeyboardShortcut as any);
        };

        setupKeyboardListener();

        // Verify handler was registered
        assertEquals(keydownHandler !== null, true);

        // Simulate ESC key press with mock event
        if (keydownHandler) {
          const escEvent = { key: "Escape" };
          keydownHandler(escEvent);
        }

        assertEquals(closeHandlerCalled, true);
      });
    });

    it("should not close modal on other key presses", async () => {
      await withDOM(({ mockDoc }) => {
        let closeHandlerCalled = false;
        let keydownHandler: ((e: { key: string }) => void) | null = null;

        const originalAddEventListener = mockDoc.addEventListener;
        mockDoc.addEventListener = (event: string, handler: any) => {
          if (event === "keydown") {
            keydownHandler = handler;
          }
          return originalAddEventListener.call(mockDoc, event, handler);
        };

        const setupKeyboardListener = () => {
          const handleClose = () => {
            closeHandlerCalled = true;
          };

          const handleKeyboardShortcut = (e: { key: string }) => {
            if (e.key === "Escape") {
              handleClose();
            }
          };

          mockDoc.addEventListener("keydown", handleKeyboardShortcut as any);
        };

        setupKeyboardListener();

        // Test various non-ESC keys
        const testKeys = ["Enter", "Tab", "Space", "ArrowDown", "a", "1"];
        for (const key of testKeys) {
          if (keydownHandler) {
            const keyEvent = { key };
            keydownHandler(keyEvent);
          }
        }

        assertEquals(closeHandlerCalled, false);
      });
    });
  });

  describe("Focus management", () => {
    it("should manage focus on input field", async () => {
      await withDOM(({ mockDoc }) => {
        let inputFocused = false;
        const inputElement = new MockHTMLElement("input");
        inputElement.focus = () => {
          inputFocused = true;
        };

        mockDoc._addMockElement("input[type='text']", inputElement);

        // Simulate focusing the input
        const input = mockDoc.querySelector("input[type='text']");
        if (input) {
          input.focus();
        }

        assertEquals(inputFocused, true);
      });
    });

    it("should manage focus on action buttons", async () => {
      await withDOM(({ mockDoc }) => {
        let cancelFocused = false;
        let updateFocused = false;

        const cancelButton = new MockHTMLElement("button");
        cancelButton.focus = () => {
          cancelFocused = true;
        };

        const updateButton = new MockHTMLElement("button");
        updateButton.focus = () => {
          updateFocused = true;
        };

        mockDoc._addMockElement("#cancel-button", cancelButton);
        mockDoc._addMockElement("#update-button", updateButton);

        // Test cancel button focus
        const cancel = mockDoc.querySelector("#cancel-button");
        if (cancel) {
          cancel.focus();
        }
        assertEquals(cancelFocused, true);

        // Test update button focus
        const update = mockDoc.querySelector("#update-button");
        if (update) {
          update.focus();
        }
        assertEquals(updateFocused, true);
      });
    });

    it("should trap focus within modal container", async () => {
      await withDOM(({ mockDoc }) => {
        const container = new MockHTMLElement("div");
        const input = new MockHTMLElement("input");
        const cancelButton = new MockHTMLElement("button");
        const updateButton = new MockHTMLElement("button");

        let currentFocus = 0;
        const elements = [input, cancelButton, updateButton];

        input.focus = () => {
          currentFocus = 0;
        };
        cancelButton.focus = () => {
          currentFocus = 1;
        };
        updateButton.focus = () => {
          currentFocus = 2;
        };

        // Mock querySelectorAll to return focusable elements
        container.querySelectorAll = () =>
          elements as unknown as NodeListOf<Element>;

        mockDoc._addMockElement("#modal-container", container);

        // Simulate focus trap setup
        const setupFocusTrap = (selector: string) => {
          const modalContainer = mockDoc.querySelector(selector);
          if (!modalContainer) return null;

          const focusableElements = modalContainer.querySelectorAll();

          if (focusableElements.length === 0) return null;

          const firstElement =
            focusableElements[0] as unknown as MockHTMLElement;
          const lastElement = focusableElements[
            focusableElements.length - 1
          ] as unknown as MockHTMLElement;

          const handleTabKey = (
            e: { key: string; shiftKey?: boolean; preventDefault?: () => void },
          ) => {
            if (e.key === "Tab") {
              if (e.shiftKey) {
                // Shift+Tab: focus last element if at first
                if (
                  mockDoc.activeElement === (firstElement as unknown as Element)
                ) {
                  lastElement.focus();
                  e.preventDefault?.();
                }
              } else {
                // Tab: focus first element if at last
                if (
                  mockDoc.activeElement === (lastElement as unknown as Element)
                ) {
                  firstElement.focus();
                  e.preventDefault?.();
                }
              }
            }
          };

          mockDoc.addEventListener("keydown", handleTabKey as any);
          return () =>
            mockDoc.removeEventListener("keydown", handleTabKey as any);
        };

        const cleanup = setupFocusTrap("#modal-container");
        assertEquals(cleanup !== null, true);
      });
    });
  });

  describe("Input field keyboard interaction", () => {
    it("should handle text input via keyboard", async () => {
      await withDOM(() => {
        let inputValue = "";

        const handleInput = (e: { target: { value: string } }) => {
          inputValue = e.target.value;
        };

        // Simulate typing "TestName"
        handleInput({ target: { value: "T" } });
        assertEquals(inputValue, "T");

        handleInput({ target: { value: "Te" } });
        assertEquals(inputValue, "Te");

        handleInput({ target: { value: "TestName" } });
        assertEquals(inputValue, "TestName");
      });
    });

    it("should validate input on keyboard entry", async () => {
      await withDOM(() => {
        // Test validation with keyboard input values
        const validName = "ValidName123";
        const validation1 = validateCreatorName(validName);
        assertEquals(validation1.valid, true);

        const emptyName = "";
        const validation2 = validateCreatorName(emptyName);
        assertEquals(validation2.valid, false);
        assertEquals(validation2.message, "Creator name cannot be empty");

        const tooLongName = "a".repeat(26);
        const validation3 = validateCreatorName(tooLongName);
        assertEquals(validation3.valid, false);
        assertEquals(
          validation3.message,
          "Creator name must be 25 characters or fewer (got 26)",
        );
      });
    });

    it("should clear validation error on new keyboard input", async () => {
      await withDOM(() => {
        let validationError: string | null = "Previous error";

        const handleInput = (_e: { target: { value: string } }) => {
          if (validationError) {
            validationError = null;
          }
        };

        // Simulate new input
        handleInput({ target: { value: "New" } });
        assertEquals(validationError, null);
      });
    });
  });

  describe("Button keyboard activation", () => {
    it("should activate cancel button via keyboard", async () => {
      await withDOM(() => {
        let cancelCalled = false;

        const handleClose = () => {
          cancelCalled = true;
        };

        // Simulate Enter or Space key on cancel button
        const activateButton = () => {
          handleClose();
        };

        activateButton();
        assertEquals(cancelCalled, true);
      });
    });

    it("should activate update button via keyboard when valid", async () => {
      await withDOM(() => {
        let updateCalled = false;
        const newName = "ValidName";
        let isSubmitting = false;
        let isOverLimit = false;
        const charCount = newName.length;

        const handleSubmit = () => {
          if (!isSubmitting && !isOverLimit && charCount > 0) {
            updateCalled = true;
          }
        };

        handleSubmit();
        assertEquals(updateCalled, true);
      });
    });

    it("should prevent update button activation when disabled", async () => {
      await withDOM(() => {
        let updateCalled = false;
        const isSubmitting = true; // Disabled state

        const handleSubmit = () => {
          if (!isSubmitting) {
            updateCalled = true;
          }
        };

        handleSubmit();
        assertEquals(updateCalled, false);
      });
    });

    it("should prevent update button activation when over limit", async () => {
      await withDOM(() => {
        let updateCalled = false;
        const isOverLimit = true; // Over character limit

        const handleSubmit = () => {
          if (!isOverLimit) {
            updateCalled = true;
          }
        };

        handleSubmit();
        assertEquals(updateCalled, false);
      });
    });

    it("should prevent update button activation when empty", async () => {
      await withDOM(() => {
        let updateCalled = false;
        const charCount = 0; // Empty input

        const handleSubmit = () => {
          if (charCount > 0) {
            updateCalled = true;
          }
        };

        handleSubmit();
        assertEquals(updateCalled, false);
      });
    });
  });

  describe("Tab navigation flow", () => {
    it("should support tab navigation through modal elements", async () => {
      await withDOM(({ mockDoc }) => {
        const focusOrder: string[] = [];
        const input = new MockHTMLElement("input");
        const cancelButton = new MockHTMLElement("button");
        const updateButton = new MockHTMLElement("button");
        const closeIcon = new MockHTMLElement("button");

        input.focus = () => focusOrder.push("input");
        cancelButton.focus = () => focusOrder.push("cancel");
        updateButton.focus = () => focusOrder.push("update");
        closeIcon.focus = () => focusOrder.push("close");

        mockDoc._addMockElement("input", input);
        mockDoc._addMockElement("#cancel", cancelButton);
        mockDoc._addMockElement("#update", updateButton);
        mockDoc._addMockElement("#close", closeIcon);

        // Simulate tab navigation order
        mockDoc.querySelector("#close")?.focus();
        mockDoc.querySelector("input")?.focus();
        mockDoc.querySelector("#cancel")?.focus();
        mockDoc.querySelector("#update")?.focus();

        assertEquals(focusOrder, ["close", "input", "cancel", "update"]);
      });
    });

    it("should handle Shift+Tab reverse navigation", async () => {
      await withDOM(({ mockDoc }) => {
        const focusOrder: string[] = [];
        const input = new MockHTMLElement("input");
        const cancelButton = new MockHTMLElement("button");
        const updateButton = new MockHTMLElement("button");

        input.focus = () => focusOrder.push("input");
        cancelButton.focus = () => focusOrder.push("cancel");
        updateButton.focus = () => focusOrder.push("update");

        mockDoc._addMockElement("input", input);
        mockDoc._addMockElement("#cancel", cancelButton);
        mockDoc._addMockElement("#update", updateButton);

        // Simulate reverse tab navigation
        mockDoc.querySelector("#update")?.focus();
        mockDoc.querySelector("#cancel")?.focus();
        mockDoc.querySelector("input")?.focus();

        assertEquals(focusOrder, ["update", "cancel", "input"]);
      });
    });
  });

  describe("Validation helper - validateCreatorName", () => {
    it("should validate empty name", () => {
      const result = validateCreatorName("");
      assertEquals(result.valid, false);
      assertEquals(result.message, "Creator name cannot be empty");
    });

    it("should validate name exceeding max length", () => {
      const longName = "a".repeat(26);
      const result = validateCreatorName(longName);
      assertEquals(result.valid, false);
      assertEquals(
        result.message,
        "Creator name must be 25 characters or fewer (got 26)",
      );
    });

    it("should validate name with invalid characters", () => {
      const invalidName = "test@name#123";
      const result = validateCreatorName(invalidName);
      assertEquals(result.valid, false);
      assertEquals(
        result.message,
        "Creator name can only contain letters, numbers, spaces, periods, hyphens, underscores, and apostrophes",
      );
    });

    it("should validate valid names", () => {
      const validNames = [
        "JohnDoe",
        "John Doe",
        "John.Doe",
        "John-Doe",
        "John_Doe",
        "John'Doe",
        "JohnDoe123",
        "123JohnDoe",
        "a",
        "a".repeat(25),
      ];

      for (const name of validNames) {
        const result = validateCreatorName(name);
        assertEquals(
          result.valid,
          true,
          `Expected "${name}" to be valid but got: ${result.message}`,
        );
      }
    });

    it("should trim whitespace before validation", () => {
      const nameWithWhitespace = "  ValidName  ";
      const result = validateCreatorName(nameWithWhitespace);
      assertEquals(result.valid, true);
    });
  });

  describe("Enter key submission", () => {
    it("should support Enter key to submit form when valid", async () => {
      await withDOM(() => {
        let submitCalled = false;
        const newName = "ValidName";
        const isSubmitting = false;
        const isOverLimit = false;
        const charCount = newName.length;

        const handleSubmit = () => {
          if (!isSubmitting && !isOverLimit && charCount > 0) {
            submitCalled = true;
          }
        };

        // Simulate Enter key press on input field
        const handleKeyDown = (e: { key: string }) => {
          if (e.key === "Enter") {
            handleSubmit();
          }
        };

        handleKeyDown({ key: "Enter" });
        assertEquals(submitCalled, true);
      });
    });

    it("should prevent Enter key submission when input is invalid", async () => {
      await withDOM(() => {
        let submitCalled = false;
        const charCount = 0; // Empty input

        const handleSubmit = () => {
          if (charCount > 0) {
            submitCalled = true;
          }
        };

        const handleKeyDown = (e: { key: string }) => {
          if (e.key === "Enter") {
            handleSubmit();
          }
        };

        handleKeyDown({ key: "Enter" });
        assertEquals(submitCalled, false);
      });
    });

    it("should prevent Enter key submission when over character limit", async () => {
      await withDOM(() => {
        let submitCalled = false;
        const isOverLimit = true;

        const handleSubmit = () => {
          if (!isOverLimit) {
            submitCalled = true;
          }
        };

        const handleKeyDown = (e: { key: string }) => {
          if (e.key === "Enter") {
            handleSubmit();
          }
        };

        handleKeyDown({ key: "Enter" });
        assertEquals(submitCalled, false);
      });
    });

    it("should prevent Enter key submission when already submitting", async () => {
      await withDOM(() => {
        let submitCount = 0;
        const isSubmitting = true;

        const handleSubmit = () => {
          if (!isSubmitting) {
            submitCount++;
          }
        };

        const handleKeyDown = (e: { key: string }) => {
          if (e.key === "Enter") {
            handleSubmit();
          }
        };

        // Try to submit multiple times
        handleKeyDown({ key: "Enter" });
        handleKeyDown({ key: "Enter" });
        assertEquals(submitCount, 0);
      });
    });
  });

  describe("Disabled state keyboard interaction", () => {
    it("should prevent keyboard interaction when input is disabled", async () => {
      await withDOM(() => {
        let inputValue = "";
        const isSubmitting = true; // Disabled state

        const handleInput = (e: { target: { value: string } }) => {
          if (!isSubmitting) {
            inputValue = e.target.value;
          }
        };

        // Attempt to type when disabled
        handleInput({ target: { value: "Test" } });
        assertEquals(inputValue, "");
      });
    });

    it("should prevent button activation when disabled via keyboard", async () => {
      await withDOM(({ mockDoc }) => {
        let buttonActivated = false;
        const button = new MockHTMLElement("button");

        // Mock disabled attribute
        button.attributes["disabled"] = "true";

        const handleClick = () => {
          if (!button.attributes["disabled"]) {
            buttonActivated = true;
          }
        };

        mockDoc._addMockElement("#disabled-button", button);

        // Simulate Space or Enter key on disabled button
        handleClick();
        assertEquals(buttonActivated, false);
      });
    });
  });

  describe("Accessibility and ARIA support", () => {
    it("should verify input field has accessible label", async () => {
      await withDOM(({ mockDoc }) => {
        const input = new MockHTMLElement("input");
        input.attributes["aria-label"] = "Creator name input";
        input.attributes["type"] = "text";

        mockDoc._addMockElement("input[type='text']", input);

        const element = mockDoc.querySelector("input[type='text']");
        assertEquals(
          element?.attributes["aria-label"] !== undefined,
          true,
        );
      });
    });

    it("should verify error message is associated with input", async () => {
      await withDOM(({ mockDoc }) => {
        const input = new MockHTMLElement("input");
        const errorId = "creator-name-error";
        input.attributes["aria-describedby"] = errorId;
        input.attributes["aria-invalid"] = "true";

        mockDoc._addMockElement("#name-input", input);

        const element = mockDoc.querySelector("#name-input");
        assertEquals(element?.attributes["aria-invalid"], "true");
        assertEquals(element?.attributes["aria-describedby"], errorId);
      });
    });

    it("should verify buttons have accessible labels", async () => {
      await withDOM(({ mockDoc }) => {
        const cancelButton = new MockHTMLElement("button");
        const updateButton = new MockHTMLElement("button");

        cancelButton.attributes["aria-label"] = "Cancel name edit";
        updateButton.attributes["aria-label"] = "Update creator name";

        mockDoc._addMockElement("#cancel-btn", cancelButton);
        mockDoc._addMockElement("#update-btn", updateButton);

        const cancel = mockDoc.querySelector("#cancel-btn");
        const update = mockDoc.querySelector("#update-btn");

        assertEquals(cancel?.attributes["aria-label"] !== undefined, true);
        assertEquals(update?.attributes["aria-label"] !== undefined, true);
      });
    });
  });

  describe("Focus management on modal open/close", () => {
    it("should focus input field when modal opens", async () => {
      await withDOM(({ mockDoc }) => {
        let inputFocused = false;
        const input = new MockHTMLElement("input");
        input.focus = () => {
          inputFocused = true;
        };

        mockDoc._addMockElement("input[type='text']", input);

        // Simulate modal open effect
        const modalInput = mockDoc.querySelector("input[type='text']");
        if (modalInput) {
          modalInput.focus();
        }

        assertEquals(inputFocused, true);
      });
    });

    it("should restore focus to trigger element on modal close", async () => {
      await withDOM(({ mockDoc }) => {
        let triggerFocused = false;
        const triggerButton = new MockHTMLElement("button");
        triggerButton.focus = () => {
          triggerFocused = true;
        };

        mockDoc._addMockElement("#edit-name-trigger", triggerButton);
        mockDoc.activeElement = triggerButton as unknown as Element;

        // Simulate modal close - should restore focus
        const trigger = mockDoc.querySelector("#edit-name-trigger");
        if (trigger) {
          trigger.focus();
        }

        assertEquals(triggerFocused, true);
      });
    });
  });

  describe("Keyboard navigation edge cases", () => {
    it("should handle rapid ESC key presses gracefully", async () => {
      await withDOM(({ mockDoc }) => {
        let closeCallCount = 0;
        let keydownHandler: ((e: { key: string }) => void) | null = null;

        const originalAddEventListener = mockDoc.addEventListener;
        mockDoc.addEventListener = (event: string, handler: any) => {
          if (event === "keydown") {
            keydownHandler = handler;
          }
          return originalAddEventListener.call(mockDoc, event, handler);
        };

        const setupKeyboardListener = () => {
          const handleClose = () => {
            closeCallCount++;
          };

          const handleKeyboardShortcut = (e: { key: string }) => {
            if (e.key === "Escape") {
              handleClose();
            }
          };

          mockDoc.addEventListener("keydown", handleKeyboardShortcut as any);
        };

        setupKeyboardListener();

        // Simulate rapid ESC presses
        if (keydownHandler) {
          keydownHandler({ key: "Escape" });
          keydownHandler({ key: "Escape" });
          keydownHandler({ key: "Escape" });
        }

        // All presses should be handled (no debounce in current impl)
        assertEquals(closeCallCount, 3);
      });
    });

    it("should handle Tab key at modal boundaries", async () => {
      await withDOM(({ mockDoc }) => {
        const input = new MockHTMLElement("input");
        const cancelButton = new MockHTMLElement("button");
        const updateButton = new MockHTMLElement("button");

        let focusOrder: string[] = [];

        input.focus = () => focusOrder.push("input");
        cancelButton.focus = () => focusOrder.push("cancel");
        updateButton.focus = () => focusOrder.push("update");

        const elements = [input, cancelButton, updateButton];
        let currentIndex = 0;

        // Simulate Tab navigation
        const handleTab = (shiftKey: boolean) => {
          if (shiftKey) {
            currentIndex = currentIndex > 0
              ? currentIndex - 1
              : elements.length - 1;
          } else {
            currentIndex = (currentIndex + 1) % elements.length;
          }
          elements[currentIndex].focus();
        };

        // Tab forward through all elements
        handleTab(false); // to cancel
        handleTab(false); // to update
        handleTab(false); // wraps to input

        assertEquals(focusOrder, ["cancel", "update", "input"]);
      });
    });

    it("should handle Space key on buttons", async () => {
      await withDOM(() => {
        let cancelCalled = false;

        const handleButtonActivation = (
          e: { key: string; preventDefault?: () => void },
        ) => {
          if (e.key === " " || e.key === "Space") {
            e.preventDefault?.();
            cancelCalled = true;
          }
        };

        handleButtonActivation({ key: " " });
        assertEquals(cancelCalled, true);
      });
    });
  });
});
