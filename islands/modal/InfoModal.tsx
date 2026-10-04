/* ===== INFO MODAL COMPONENT ===== */
/* Info / how-to guides: title, optional subtitle, scrollable content. */
import { ModalBase } from "$layout";
import { subtitleNeutral, titleNeutral } from "$text";
import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

/* ===== SIZING ===== */
/** Modal width (same steps as the ModalBase default). */
const INFO_MODAL_WIDTH = "max-w-[85vw] mobileMd:w-[420px] mobileLg:w-[460px]";
/** Max height of the scrollable content area. */
const INFO_MODAL_MAX_HEIGHT = "max-h-[80vh]";
/**
 * Extra horizontal spacing while the content overflows: ModalBase has p-3
 * (12px), so -mr-3 = pr-1.5 (6px) + the 6px scrollbar. The content width does
 * not shift and the scrollbar stays inside the modal edge.
 */
const INFO_MODAL_SCROLL_SPACING = "-mr-3 pr-1.5";

/* ===== TYPES ===== */
interface InfoModalProps {
  title: string;
  /** Optional line under the title. */
  subtitle?: string;
  children: ComponentChildren;
}

/* ===== COMPONENT ===== */
export const InfoModal = ({ title, subtitle, children }: InfoModalProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  /* ===== OVERFLOW DETECTION ===== */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const check = () => {
      setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, []);

  /* ===== RENDER ===== */
  return (
    <ModalBase
      title={title}
      titleClass={titleNeutral}
      className={INFO_MODAL_WIDTH}
    >
      {subtitle && (
        <h4 class={`${subtitleNeutral} text-center -mt-3 mb-3`}>
          {subtitle}
        </h4>
      )}

      <div
        ref={scrollRef}
        class={`flex flex-col gap-5 overflow-y-auto scrollbar-background-layer1
          ${INFO_MODAL_MAX_HEIGHT} ${
          isOverflowing ? INFO_MODAL_SCROLL_SPACING : ""
        }`}
      >
        {children}
      </div>
    </ModalBase>
  );
};
