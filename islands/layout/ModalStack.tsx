import { DEFAULT_WALLET_CONNECTORS } from "$constants";
import { WalletProvider } from "$islands/layout/WalletProvider.tsx";
import { ConnectWalletModal } from "$islands/modal/ConnectWalletModal.tsx";
import { stackModal } from "$islands/modal/states.ts";

/**
 * Open the connect-wallet modal above the current modal. When nothing is
 * open it uses the base slot, so page-level callers keep the old behavior.
 * The modal underneath stays mounted.
 */
export const stackConnectWalletModal = (onConnected?: () => void) => {
  const connectors = DEFAULT_WALLET_CONNECTORS;

  const providerComponents = connectors.map((key) => (
    <WalletProvider
      key={key}
      providerKey={key}
      {...(onConnected ? { onSuccess: onConnected } : {})}
    />
  ));

  stackModal(
    <ConnectWalletModal connectors={providerComponents} />,
    "slideUpDown",
  );
};
