/* ===== STATES ===== */
/* @baba - refactor and move to shared states file in /layout/ */
import type { GlobalModalState, SearchState } from "$types/ui.d.ts";
import { signal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useContext } from "preact/hooks";

/* ===== MODAL TYPES ===== */
export type ModalAnimation = "slideUpDown" | "slideDownUp" | "zoomInOut";

export type ModalLayer = "base" | "stacked";

export const BASE_MODAL_CONTAINER_ID = "animation-modal-container";
export const STACKED_MODAL_CONTAINER_ID = "animation-modal-container-stacked";

export interface ModalConfig {
  type: "connect" | "search" | "preview" | "filter";
  component: preact.ComponentType;
  animation?: ModalAnimation;
  props?: Record<string, unknown>;
}

export interface ModalLayerValue {
  layer: ModalLayer;
  containerId: string;
  /** Closes this layer only. Idempotent. */
  close: () => void;
}

export const DEFAULT_MODAL_ANIMATION: ModalAnimation = "slideUpDown";

const closedModal = (
  animation: ModalAnimation = "slideUpDown",
): GlobalModalState => ({
  isOpen: false,
  content: null,
  animation,
});

// Create the signal with explicit typing
export const globalModal = signal<GlobalModalState>({
  isOpen: false,
  content: null,
  animation: "slideUpDown",
});

/** One layer above the base modal. A second stack replaces this content. */
export const stackedModal = signal<GlobalModalState>({
  isOpen: false,
  content: null,
  animation: "slideUpDown",
});

export const searchState = signal<SearchState>({
  term: "",
  error: "",
  results: [],
});

/* ===== MODAL ACTIONS ===== */
export function closeStackedModal() {
  if (!stackedModal.value.isOpen) return;
  stackedModal.value = closedModal(stackedModal.value.animation);
}

export function closeModal() {
  globalModal.value = closedModal(globalModal.value.animation);
  closeStackedModal();
}

export function openModal(
  content: ComponentChildren,
  animation: ModalAnimation = "slideUpDown",
) {
  if (!content) {
    return;
  }

  // A new base modal must not render under a leftover stacked layer.
  closeStackedModal();

  globalModal.value = {
    isOpen: true,
    content,
    animation,
  };
}

/**
 * Open `content` above the current modal. Falls back to the base slot when
 * nothing is open, so callers on a normal page behave like `openModal`.
 */
export function stackModal(
  content: ComponentChildren,
  animation: ModalAnimation = "slideUpDown",
) {
  if (!content) {
    return;
  }

  if (!globalModal.value.isOpen) {
    openModal(content, animation);
    return;
  }

  stackedModal.value = {
    isOpen: true,
    content,
    animation,
  };
}

/* ===== LAYER CONTEXT ===== */
const baseModalLayer: ModalLayerValue = {
  layer: "base",
  containerId: BASE_MODAL_CONTAINER_ID,
  close: closeModal,
};

export const ModalLayerContext = createContext<ModalLayerValue>(
  baseModalLayer,
);

/** Layer the calling component is rendered in. Defaults to the base modal. */
export function useModalLayer(): ModalLayerValue {
  return useContext(ModalLayerContext);
}

/** Stacked overlay if it is mounted, otherwise the base overlay. */
export function getTopModalContainer(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(STACKED_MODAL_CONTAINER_ID) ??
    document.getElementById(BASE_MODAL_CONTAINER_ID);
}

/* ===== EXPORTS ===== */
export const modal = {
  globalModal,
  stackedModal,
  openModal,
  closeModal,
  stackModal,
  closeStackedModal,
  DEFAULT_MODAL_ANIMATION,
};

// Default export for convenience
export default modal;

/* ===== MODAL STACKS ===== */
