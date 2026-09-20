/* ===== PREVIEW CODE MODAL COMPONENT ===== */
import { closeModal } from "$islands/modal/states.ts";
import { ModalBase } from "$layout";
import { logger } from "$lib/utils/logger.ts";
import type { PreviewCodeModalProps } from "$types/ui.d.ts";
import { useEffect, useState } from "preact/hooks";

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
export default function PreviewCodeModal({ src }: PreviewCodeModalProps) {
  /* ===== STATE ===== */
  const [formattedSrc, setFormattedSrc] = useState("");

  /* ===== EFFECTS ===== */
  // Effect to format the source code
  useEffect(() => {
    setFormattedSrc(formatHtmlSource(src ?? ""));
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
      className="w-[calc(100vw-10px)] h-[calc(100vh-10px)] mobileLg:w-[calc(100vw-20px)] mobileLg:h-[calc(100vh-20px)] tablet:w-[calc(100vw-30px)] tablet:h-[calc(100vh-30px)] max-w-[800px]"
      contentClassName="h-full bg-color-neutral-50 rounded-2xl overflow-auto scrollbar-background-layer1"
    >
      {/* ===== CODE DISPLAY ===== */}
      <div class="flex flex-col w-full h-full p-3">
        <code class="whitespace-pre-wrap text-xs text-color-neutral-600 leading-tight pb-5">
          {formattedSrc}
        </code>
      </div>
    </ModalBase>
  );
}
