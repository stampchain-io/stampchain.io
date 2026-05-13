/* ===== WALLET PROVIDER MODAL COMPONENT ===== */
import { horizonProvider } from "$client/wallet/horizon.ts";
import { leatherProvider } from "$client/wallet/leather.ts";
import { okxProvider } from "$client/wallet/okx.ts";
import { phantomProvider } from "$client/wallet/phantom.ts";
import { tapWalletProvider } from "$client/wallet/tapwallet.ts";
import { unisatProvider } from "$client/wallet/unisat.ts";
import { checkWalletAvailability } from "$client/wallet/wallet.ts";
import { xverseProvider } from "$client/wallet/xverse.ts";
import { WALLET_PROVIDERS } from "$constants";
import { closeForegroundModal, closeModal } from "$islands/modal/states.ts";
import { containerCardL2 } from "$layout";
import type { WalletProviderKey } from "$lib/constants/walletProviders.ts";
import { handleUnknownError } from "$lib/utils/errorHandling.ts";
import type { BaseToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";
import type { WalletProviderProps } from "$types/ui.d.ts";
import { useState } from "preact/hooks";

/* ===== TYPES ===== */
type AddToastFunction = (
  message: string,
  type: "error" | "warning" | "info" | "success",
) => void;

/* ===== WALLET CONNECTORS CONFIG ===== */
const walletConnectors: Record<
  WalletProviderKey,
  (addToast: AddToastFunction) => Promise<void>
> = {
  unisat: unisatProvider.connectUnisat,
  leather: leatherProvider.connectLeather,
  okx: okxProvider.connectOKX,
  tapwallet: tapWalletProvider.connectTapWallet,
  phantom: phantomProvider.connectPhantom,
  horizon: horizonProvider.connectHorizon,
  xverse: xverseProvider.connectXverse,
} as const;

/* ===== MODAL COMPONENT ===== */
export function WalletProvider(
  { providerKey, onSuccess }: WalletProviderProps,
) {
  /* ===== HOOKS ===== */
  const providerInfo = (providerKey in WALLET_PROVIDERS)
    ? WALLET_PROVIDERS[providerKey as keyof typeof WALLET_PROVIDERS]
    : { name: "Unknown", logo: "" };

  /* ===== STATE ===== */
  const [isHovered, setIsHovered] = useState(false);

  /* ===== EVENT HANDLERS ===== */
  const handleConnect = async () => {
    try {
      const connectFunction =
        walletConnectors[providerKey as WalletProviderKey];
      if (!connectFunction) {
        throw new Error(`Unsupported wallet provider: ${providerKey}`);
      }

      // Check if wallet extension is installed before attempting connection
      if (!checkWalletAvailability(providerKey)) {
        const installUrl = providerInfo.installUrl;
        if (installUrl) {
          showToast(
            `${providerInfo.name} wallet not detected.\nOpening install page...`,
            "info",
          );
          globalThis.open(installUrl, "_blank", "noopener,noreferrer");
        } else {
          showToast(
            `${providerInfo.name} wallet not detected.\nPlease install the ${providerInfo.name} extension.`,
            "error",
          );
        }
        return;
      }

      await connectFunction((message: string, type: BaseToast["type"]) => {
        // Let the toast provider handle autoDismiss defaults based on type
        showToast(message, type);
      });

      const modalContainer = document.getElementById(
        "animation-modal-container",
      );
      if (modalContainer) {
        modalContainer.classList.add("out");
      }

      if (onSuccess) {
        setTimeout(() => {
          closeForegroundModal();
          setTimeout(() => {
            if (onSuccess) onSuccess();
          }, 1);
        }, 600);
      } else {
        setTimeout(() => {
          closeModal();
        }, 600);
      }
    } catch (unknownError) {
      const error = handleUnknownError(
        unknownError,
        `Failed to connect to ${providerKey} wallet`,
      );
      // Let the toast provider handle autoDismiss defaults based on type
      showToast(error.message, "error");
      console.error(error.message);
    }
  };

  /* ===== RENDER ===== */
  return (
    <div
      onClick={handleConnect}
      role="button"
      aria-label={`Connect to ${providerInfo.name}`}
      class={`flex justify-between items-center px-6 py-4 ${containerCardL2}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ===== PROVIDER NAME ===== */}
      <h6
        class={`font-extrabold text-lg uppercase tracking-wide ${
          isHovered
            ? "text-color-purple-light"
            : "bg-gradient-to-r color-neutral-gradient"
        }`}
      >
        {providerInfo.name}
      </h6>

      {/* ===== PROVIDER LOGO ===== */}
      <img
        src={providerInfo.logo}
        alt={providerInfo.name}
        class="w-8 h-8 object-contain"
      />
    </div>
  );
}
