/* ===== MODAL TOOL COMPONENT ===== */
/* Tool shells: title, optional subtitle, and an optional how-to on top. */
import { InfoButton } from "$islands/button/InfoButton.tsx";
import { openModal } from "$islands/modal/states.ts";
import { ModalBase } from "$layout";
import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

/** Open a tool modal. Slides up on open and down on close. */
export function openModalTool(content: ComponentChildren) {
  openModal(content, "slideUpDown");
}

/* ===== TYPES ===== */
interface ModalToolProps {
  title: string;
  /** Optional line under the title. */
  subtitle?: string;
  /** Info modal opened from the header button, e.g. `<SRC20TransferInfo />`. */
  info?: ComponentChildren;
  children: ComponentChildren;
}

/* ===== COMPONENT ===== */
export function ModalTool(
  { title, subtitle, info, children }: ModalToolProps,
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  /* Same gap as InfoModal: padding between content and the scrollbar,
     only while the content is taller than the modal. */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const check = () => {
      setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    const watchChildren = () => {
      Array.from(el.children).forEach((child) => observer.observe(child));
    };
    watchChildren();
    const mutations = new MutationObserver(() => {
      watchChildren();
      check();
    });
    mutations.observe(el, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return (
    <ModalBase
      title={title}
      subtitle={subtitle}
      variant="primary"
      {...(info
        ? {
          headerAction: (
            <InfoButton
              modal={info}
              stack
              variant="plain"
              ariaLabel={`${title} how-to`}
            />
          ),
        }
        : {})}
    >
      {
        /* Padding is pulled back with a negative margin so hover glows
          can paint inside the clip without shifting the fields. While the
          scrollbar is showing, the right side stays inside the modal so
          12px remains to the right of the scrollbar. */
      }
      <div
        ref={scrollRef}
        class={`flex flex-col min-w-0 max-h-[80vh] gap-3 box-content p-3
          -mt-3 -mb-3 -ml-3
          overflow-x-hidden overflow-y-auto scrollbar-background-layer1
          ${isOverflowing ? "w-calc-12" : "w-full -mr-3"}`}
      >
        {children}
      </div>
    </ModalBase>
  );
}
