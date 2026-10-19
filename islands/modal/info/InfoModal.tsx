/* ===== INFO MODAL COMPONENT ===== */
/* Info / how-to guides: title, optional subtitle, scrollable content. */
import { ModalBase } from "$layout";
import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

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
      subtitle={subtitle}
      variant="neutral"
      className="max-w-[85vw] mobileMd:w-[420px] mobileLg:w-[460px]"
    >
      <div
        ref={scrollRef}
        class={`flex flex-col max-h-[80vh] gap-5
          overflow-y-auto scrollbar-background-layer1
           ${isOverflowing ? "-mr-3 pr-1.5" : ""}`}
      >
        {children}
      </div>
    </ModalBase>
  );
};
