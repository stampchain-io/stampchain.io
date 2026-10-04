/* ===== PREVIEW CODE MODAL COMPONENT ===== */
import { Icon } from "$icon";
import {
  type CodeViewMode,
  ViewCodeButton,
} from "$islands/button/ViewCodeButton.tsx";
import { closeModal } from "$islands/modal/states.ts";
import { container2Icon, ModalBase } from "$layout";
import { logger } from "$lib/utils/logger.ts";
import type { PreviewCodeModalProps } from "$types/ui.d.ts";
import { useEffect, useState } from "preact/hooks";

/* ===== CONSTANTS ===== */
/** Minimum length before a whitespace-free string is treated as base64. */
const BASE64_MIN_LENGTH = 256;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

/** True for data URLs and long base64 blobs (e.g. image stamp payloads). */
function isBinaryBlob(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.startsWith("data:")) return true;
  return trimmed.length > BASE64_MIN_LENGTH && BASE64_PATTERN.test(trimmed);
}

/* ===== COMPONENT ===== */
export default function PreviewCodeModal({ src }: PreviewCodeModalProps) {
  // Formatting only makes sense for source text (html, svg, css, js, json...)
  const canFormat = !!src && !isBinaryBlob(src);

  /* ===== STATE ===== */
  const codeRaw = src ? src : "No content available";
  const [codeFormatted, setCodeFormatted] = useState("");
  const [codeView, setCodeView] = useState<CodeViewMode>("codeRaw");

  /* ===== EFFECTS ===== */
  // Effect to format the source code
  useEffect(() => {
    setCodeFormatted(formatHtmlSource(src ?? ""));
  }, [src]);

  /* ===== HELPER FUNCTIONS ===== */
  function formatHtmlSource(html: string): string {
    if (!html || typeof html !== "string") {
      return "No content available";
    }

    try {
      // Better HTML formatting approach
      const formatted = html
        .replace(/></g, ">\n<") // Add line breaks between tags
        .replace(/(<style[^>]*>)/gi, "$1\n") // Add line break after opening <style> tag
        .replace(/(<script[^>]*>)/gi, "$1\n") // Add line break after opening <script> tag
        .replace(/\{/g, " {\n") // Format CSS opening braces
        .replace(/\}/g, "\n}\n") // Format CSS closing braces
        .replace(/;/g, ";\n"); // Format CSS properties

      let indent = 0;
      let result = "";

      formatted.split("\n").forEach((line) => {
        line = line.trim();
        if (!line) return;

        // Detect different types of lines
        const isClosingTag = line.match(/^<\/\w+>$/);
        const isOpeningTag = line.match(/^<\w+[^>]*>$/) && !line.match(/\/>$/);
        const isSelfClosingTag = line.match(/\/>$/);
        const isDoctype = line.match(/^<!DOCTYPE/i);
        const isComment = line.match(/^<!--/) || line.match(/-->$/);
        const isCSSClosing = line === "}";
        const isCSSOpening = line.endsWith("{");

        // Decrease indent for closing elements BEFORE applying
        if (isClosingTag || isCSSClosing) {
          indent = Math.max(0, indent - 2);
        }

        // Apply indentation
        result += " ".repeat(indent) + line + "\n";

        // Increase indent for opening elements AFTER applying
        if (
          (isOpeningTag && !isSelfClosingTag && !isDoctype && !isComment) ||
          isCSSOpening
        ) {
          indent += 2;
        }
      });

      return result.trim();
    } catch (_error) {
      return "Error formatting content";
    }
  }

  /* ===== RENDER ===== */
  return (
    <ModalBase
      onClose={() => {
        logger.debug("ui", {
          message: "Preview code modal closing",
          component: "PreviewCodeModal",
        });
        closeModal();
      }}
      title=""
      hideHeader
      className={`!w-[calc(100vw-12px)] h-[calc(100vh-12px)]
        mobileLg:!w-[calc(100vw-20px)] mobileLg:h-[calc(100vh-20px)]
        tablet:!w-[calc(100vw-32px)] tablet:h-[calc(100vh-32px)]
        !max-w-[calc(100vw-12px)] mobileLg:!max-w-[800px]`}
      contentClassName="h-full bg-color-neutral-900 rounded-2xl"
    >
      {/* ===== VIEW TOGGLE ===== */}
      <div class="absolute top-1 right-1 z-10 flex gap-2">
        {canFormat && (
          <div
            class={`${container2Icon}`}
          >
            <ViewCodeButton mode={codeView} onChange={setCodeView} />
          </div>
        )}
        <div
          class={`${container2Icon}`}
        >
          <Icon
            type="iconButton"
            name="close"
            weight="normal"
            size="containerIcon"
            color="neutral400"
            ariaLabel="Close"
            onClick={() => closeModal()}
          />
        </div>
      </div>
      {/* ===== CODE DISPLAY ===== */}
      <div class="flex flex-col w-full h-full p-3 overflow-y-auto overflow-x-hidden scrollbar-background-layer1">
        <code class="block w-full min-w-0 whitespace-pre-wrap break-all [overflow-wrap:anywhere] text-xs text-color-neutral-200 leading-relaxed pb-3">
          {canFormat && codeView === "codeFormatted" ? codeFormatted : codeRaw}
        </code>
      </div>
    </ModalBase>
  );
}
