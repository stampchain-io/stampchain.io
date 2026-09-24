/* ===== PREVIEW IMAGE MODAL COMPONENT ===== */
import { ModalBase } from "$components/layout/ModalBase.tsx";
import StampTextContent from "$islands/content/stampDetailContent/StampTextContent.tsx";
import { PlaceholderImage } from "$icon";
import { closeModal } from "$islands/modal/states.ts";
import { logger } from "$lib/utils/logger.ts";
import { handleImageError } from "$lib/utils/ui/media/imageUtils.ts";
import type { PreviewImageModalProps } from "$types/ui.d.ts";

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
const PreviewImageModal = ({
  src,
  contentType = "image",
}: PreviewImageModalProps) => {
  /* ===== COMPUTED VALUES ===== */
  const imageUrl = typeof src === "string" ? src : URL.createObjectURL(src);

  // Cleanup for file object URLs
  if (src instanceof File) {
    globalThis.addEventListener("unload", () => {
      URL.revokeObjectURL(imageUrl);
    });
  }

  /* ===== RENDER ===== */
  return (
    <ModalBase
      onClose={() => {
        logger.debug("ui", {
          message: "Preview image modal closing",
          component: "PreviewImageModal",
        });
        closeModal();
      }}
      title=""
      hideHeader
      className="!w-[min(calc(100vh-40px),calc(100vw-40px))] !h-[min(calc(100vh-40px),calc(100vw-40px))] mobileLg:!w-[min(calc(100vh-80px),calc(100vw-80px))] mobileLg:!h-[min(calc(100vh-80px),calc(100vw-80px))] !p-2"
    >
      <div class="flex flex-col h-full w-full stamp-container">
        {/* ===== CONTENT RENDERING ===== */}
        {contentType === "html"
          ? (
            <iframe
              width="100%"
              height="100%"
              className="w-full h-full relative rounded-2xl z-[2] overflow-hidden"
              sandbox="allow-scripts allow-same-origin"
              src={imageUrl}
              loading="lazy"
              title="Stamp Preview"
            />
          )
          : contentType === "text"
          ? (
            <div className="w-full h-full rounded-2xl aspect-square">
              <StampTextContent src={imageUrl} />
            </div>
          )
          : contentType === "audio"
          ? <PlaceholderImage variant="audio" />
          : (
            <img
              className="rounded-2xl pixelart stamp-image aspect-square"
              style={{
                imageRendering: "pixelated",
              }}
              src={imageUrl}
              onError={handleImageError}
              alt="Stamp Preview"
            />
          )}
      </div>
    </ModalBase>
  );
};

export default PreviewImageModal;
