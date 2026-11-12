/* ===== WALLET SETTINGS INFO ===== */
import { ModalInfo } from "$islands/modal/info/ModalInfo.tsx";
import { textSm } from "$text";

export const WalletSettingsInfo = () => {
  return (
    <ModalInfo title="HOW-TO" subtitle="WALLET SETTINGS">
      <p class={textSm}>
        Update the profile, social links, and wallet addresses shown for this
        address, and accept the terms of service.
      </p>
      <a href="/termsofservice" class={textSm}>
        Read the Terms of Service
      </a>
    </ModalInfo>
  );
};
