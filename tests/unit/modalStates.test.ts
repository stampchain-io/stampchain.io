/* ===== MODAL STATES - UNIT TESTS ===== */
/*
 * Exercises the real signal state in islands/modal/states.ts: the base and
 * stacked layers, how openModal / stackModal / closeStackedModal move between
 * them, and the Escape rule that only the top-most layer closes.
 */
import { assert, assertEquals, assertFalse } from "@std/assert";
import { beforeEach, describe, it } from "jsr:@std/testing@1.0.14/bdd";
import {
  closeModal,
  closeStackedModal,
  globalModal,
  isTopModalLayer,
  type ModalLayer,
  openModal,
  shouldCloseLayerOnKey,
  stackedModal,
  stackModal,
} from "$islands/modal/states.ts";

const ESCAPE = { key: "Escape", repeat: false };

/** Mirrors the keydown listener each mounted layer registers: every open
 * layer sees the event, and the one the predicate selects closes itself with
 * the close action ModalOverlay binds to it. */
function pressKey(e: { key: string; repeat: boolean }) {
  const openLayers: ModalLayer[] = [];
  if (globalModal.value.isOpen) openLayers.push("base");
  if (stackedModal.value.isOpen) openLayers.push("stacked");
  const closing = openLayers.filter((layer) => shouldCloseLayerOnKey(layer, e));
  for (const layer of closing) {
    if (layer === "stacked") closeStackedModal();
    else closeModal();
  }
  return closing;
}

describe("modal states", () => {
  beforeEach(() => {
    closeModal();
  });

  describe("openModal", () => {
    it("opens the base layer with the given content and animation", () => {
      openModal("base", "zoomInOut");
      assertEquals(globalModal.value, {
        isOpen: true,
        content: "base",
        animation: "zoomInOut",
      });
      assertFalse(stackedModal.value.isOpen);
    });

    it("ignores empty content", () => {
      openModal(null);
      assertFalse(globalModal.value.isOpen);
      assertEquals(globalModal.value.content, null);
    });

    it("clears a leftover stacked layer when replacing the base modal", () => {
      openModal("first");
      stackModal("stacked");
      assert(stackedModal.value.isOpen);

      openModal("second");
      assertEquals(globalModal.value.content, "second");
      assertFalse(stackedModal.value.isOpen);
      assertEquals(stackedModal.value.content, null);
    });
  });

  describe("stackModal", () => {
    it("opens above an open base modal without touching it", () => {
      openModal("base");
      stackModal("stacked", "slideDownUp");

      assertEquals(globalModal.value.content, "base");
      assert(globalModal.value.isOpen);
      assertEquals(stackedModal.value, {
        isOpen: true,
        content: "stacked",
        animation: "slideDownUp",
      });
    });

    it("falls back to the base slot when nothing is open", () => {
      stackModal("alone");
      assert(globalModal.value.isOpen);
      assertEquals(globalModal.value.content, "alone");
      assertFalse(stackedModal.value.isOpen);
    });

    it("replaces existing stacked content (one stacked layer only)", () => {
      openModal("base");
      stackModal("first");
      stackModal("second");
      assertEquals(stackedModal.value.content, "second");
      assertEquals(globalModal.value.content, "base");
    });

    it("ignores empty content", () => {
      openModal("base");
      stackModal(null);
      assertFalse(stackedModal.value.isOpen);
    });
  });

  describe("closeStackedModal", () => {
    it("closes only the stacked layer and keeps its animation", () => {
      openModal("base");
      stackModal("stacked", "zoomInOut");
      closeStackedModal();

      assertFalse(stackedModal.value.isOpen);
      assertEquals(stackedModal.value.content, null);
      assertEquals(stackedModal.value.animation, "zoomInOut");
      assert(globalModal.value.isOpen);
      assertEquals(globalModal.value.content, "base");
    });

    it("is a no-op when no stacked layer is open", () => {
      openModal("base");
      const before = stackedModal.value;
      closeStackedModal();
      assertEquals(stackedModal.value, before);
      assert(globalModal.value.isOpen);
    });
  });

  describe("closeModal", () => {
    it("closes both layers", () => {
      openModal("base");
      stackModal("stacked");
      closeModal();
      assertFalse(globalModal.value.isOpen);
      assertFalse(stackedModal.value.isOpen);
    });
  });

  describe("Escape handling", () => {
    it("treats the base layer as top only when nothing is stacked", () => {
      openModal("base");
      assert(isTopModalLayer("base"));
      stackModal("stacked");
      assertFalse(isTopModalLayer("base"));
      assert(isTopModalLayer("stacked"));
    });

    it("closes only the stacked layer, then the base on a second press", () => {
      openModal("base");
      stackModal("stacked");

      assertEquals(pressKey(ESCAPE), ["stacked"]);
      assertFalse(stackedModal.value.isOpen);
      assert(globalModal.value.isOpen);
      assertEquals(globalModal.value.content, "base");

      assertEquals(pressKey(ESCAPE), ["base"]);
      assertFalse(globalModal.value.isOpen);
    });

    it("closes the base layer when it is the only one open", () => {
      openModal("base");
      assertEquals(pressKey(ESCAPE), ["base"]);
      assertFalse(globalModal.value.isOpen);
    });

    it("ignores key repeat so holding Escape cannot cascade", () => {
      openModal("base");
      stackModal("stacked");
      assertEquals(pressKey({ key: "Escape", repeat: true }), []);
      assert(stackedModal.value.isOpen);
      assert(globalModal.value.isOpen);
    });

    it("ignores other keys", () => {
      openModal("base");
      stackModal("stacked");
      assertEquals(pressKey({ key: "Enter", repeat: false }), []);
      assert(stackedModal.value.isOpen);
      assert(globalModal.value.isOpen);
    });
  });
});
