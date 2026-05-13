/* ===== CONNECT WALLET MODAL COMPONENT ===== */
import { showConnectWalletModal } from "$client/wallet/wallet.ts";
import { ModalBase } from "$layout";
import { logger } from "$lib/utils/logger.ts";
import { subtitleNeutral } from "$text";
import type { ConnectWalletModalProps } from "$types/ui.d.ts";

/* ===== TYPES ===== */

/* ===== COMPONENT ===== */
export const ConnectWalletModal = ({
  connectors,
  onClose,
}: ConnectWalletModalProps) => {
  /* ===== EVENT HANDLERS ===== */
  const handleModalClose = () => {
    logger.debug("ui", {
      message: "Connect wallet modal closing",
      component: "ConnectWalletModal",
    });

    // First trigger the animation
    const modalContainer = document.getElementById("animation-modal-container");
    if (modalContainer) {
      modalContainer.classList.add("out");
    }

    // Then wait for animation to complete before closing
    setTimeout(() => {
      showConnectWalletModal.value = false;
      onClose?.();
    }, 600); // matches --animation-cleanup-delay from modal.css
  };

  /* ===== RENDER ===== */
  return (
    <ModalBase
      title="CONNECT"
      onClose={handleModalClose}
      className="w-[340px] min-[420px]:w-[360px] mobileMd:w-[380px] mobileLg:w-[640px]"
    >
      <h4 class={`${subtitleNeutral} text-center -mt-6 pb-3`}>
        YOUR WALLET
      </h4>

      {/* ===== WALLET PROVIDERS GRID ===== */}
      <div class="grid grid-cols-1 mobileLg:grid-cols-2 gap-5 items-center">
        {connectors}
      </div>
    </ModalBase>
  );
};
