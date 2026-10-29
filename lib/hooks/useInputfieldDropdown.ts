import { useCallback, useEffect, useRef, useState } from "preact/hooks";

/** Matches `.dropdown-exit` in static/styles.css. */
const DEFAULT_CLOSE_DELAY_MS = 200;

type DropdownPhase = "enter" | "exit" | null;

interface DropdownState {
  isOpen: boolean;
  phase: DropdownPhase;
}

interface UseInputfieldDropdownOptions {
  closeDelayMs?: number;
}

const CLOSED: DropdownState = { isOpen: false, phase: null };

/**
 * Open, close, and outside-click handling for tool-modal dropdowns.
 *
 * `isOpen` stays true for the exit animation so the list can fade out.
 * Closing an already closed or exiting list does nothing. Starting the
 * exit animation while closed would mount the list at full opacity.
 */
export function useInputfieldDropdown<T extends HTMLElement = HTMLDivElement>(
  options: UseInputfieldDropdownOptions = {},
) {
  const closeDelayRef = useRef(DEFAULT_CLOSE_DELAY_MS);
  closeDelayRef.current = options.closeDelayMs ?? DEFAULT_CLOSE_DELAY_MS;

  const [state, setState] = useState<DropdownState>(CLOSED);
  const containerRef = useRef<T>(null);
  const isOpenRef = useRef(false);
  const isExitingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const open = useCallback(() => {
    clearCloseTimer();
    isExitingRef.current = false;
    isOpenRef.current = true;
    setState({ isOpen: true, phase: "enter" });
  }, [clearCloseTimer]);

  const close = useCallback(() => {
    if (!isOpenRef.current || isExitingRef.current) return;
    isExitingRef.current = true;
    setState({ isOpen: true, phase: "exit" });
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      isOpenRef.current = false;
      isExitingRef.current = false;
      setState(CLOSED);
    }, closeDelayRef.current);
  }, [clearCloseTimer]);

  const toggle = useCallback(() => {
    if (isOpenRef.current && !isExitingRef.current) {
      close();
      return;
    }
    open();
  }, [close, open]);

  useEffect(() => {
    if (!state.isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const container = containerRef.current;
      if (container?.contains(event.target as Node)) return;
      close();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [state.isOpen, close]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  const listClass = state.phase === "exit"
    ? "dropdown-exit pointer-events-none"
    : state.phase === "enter"
    ? "dropdown-enter"
    : "";

  return {
    isOpen: state.isOpen,
    containerRef,
    open,
    close,
    toggle,
    listClass,
  };
}
