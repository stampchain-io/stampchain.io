/* ===== MODAL INFO COMPONENT ===== */
/* Info / how-to guides: title, optional subtitle, scrollable content. */
import { ModalBase } from "$layout";
import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

/* ===== TYPES ===== */
interface ModalInfoProps {
  title: string;
  /** Optional line under the title. */
  subtitle?: string;
  children: ComponentChildren;
}

/* ===== COMPONENT ===== */
export const ModalInfo = ({ title, subtitle, children }: ModalInfoProps) => {
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
      className="max-w-[90vw] mobileMd:w-[420px] mobileLg:w-[480px]"
    >
      <div
        ref={scrollRef}
        class={`flex flex-col max-h-[80vh] gap-5
          overflow-y-auto scrollbar-background-layer1
           ${isOverflowing ? "-mr-3 pr-3" : ""}`}
      >
        {children}
      </div>
    </ModalBase>
  );
};
