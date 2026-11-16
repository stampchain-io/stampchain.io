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
      <p class={textSm}>
        Username must be between 1 and 25 characters and can contain letters,
        numbers, spaces, periods, hyphens, underscores, and apostrophes.
      </p>
      <p class={textSm}>
        Website must be a valid URL.
      </p>
      <p class={textSm}>
        Email must be a valid email address.
      </p>
      <p class={textSm}>
        Telegram must be a valid Telegram username.
      </p>
      <a href="/termsofservice" class={textSm}>
        Read the Terms of Service
      </a>
    </ModalInfo>
  );
};
