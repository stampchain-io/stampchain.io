/* ===== WALLET SETTINGS INFO ===== */
import { ModalInfo } from "$islands/modal/info/ModalInfo.tsx";
import { textSm } from "$text";

export const WalletSettingsInfo = () => {
  return (
    <ModalInfo title="HOW-TO" subtitle="WALLET SETTINGS">
      <p class={textSm}>
        Update the profile, social links, interlinkedwallet addresses and
        website preferences shown for this address.
      </p>
      <p class={textSm}>
        Maximum avatar image size is 2MB, 500x500px.<br />
        Username must be between 1 and 25 characters and can contain letters,
        numbers, spaces, periods, hyphens, underscores, and apostrophes. Add a
        short bio description of yourself (max 100 characters).
      </p>
      <p class={textSm}>
        Website must be a valid URL.<br />
        Double check the email address is correct.<br />
        When adding social profiles, just add the username, without the @
        symbol. Enter the Bitcoin wallet address that holds STMAP tokens and
        links to your Stampmap profile.
      </p>
      <p class={textSm}>
        Add more details here...<br />
        Interlinked wallet addresses must be valid Bitcoin wallet addresses.
      </p>
      <p class={textSm}>
        Accept the Terms of Service to globally dismiss the message when
        interacting with this wallet.<br />
        <a href="/termsofservice" class={textSm}>
          Read the Terms of Service
        </a>
      </p>
    </ModalInfo>
  );
};
