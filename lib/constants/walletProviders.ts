/* ===== WALLET PROVIDER CONSTANTS ===== */

/**
 * Supported wallet provider keys for Bitcoin wallet connections
 */
export type WalletProviderKey =
  | "unisat"
  | "leather"
  | "okx"
  | "tapwallet"
  | "phantom"
  | "horizon"
  | "xverse"
  | "wonder";

/**
 * Default wallet connectors available in the application
 */
export const DEFAULT_WALLET_CONNECTORS: WalletProviderKey[] = [
  "unisat",
  "leather",
  "okx",
  "tapwallet",
  "phantom",
  "horizon",
  "xverse",
  "wonder",
];

/**
 * Wallet provider capability identifiers
 */
export type WalletCapability =
  | "p2tr"
  | "p2wpkh"
  | "p2sh"
  | "p2pkh"
  | "psbt"
  | "message-signing"
  | "send-btc"
  | "ordinals";

/**
 * Wallet provider address type identifiers
 */
export type WalletAddressType = "payment" | "ordinals" | "stacks";

/**
 * Wallet provider configuration entry
 */
export interface WalletProviderConfig {
  name: string;
  displayName?: string;
  logo: string;
  logoPng?: string;
  installUrl?: string;
  capabilities?: WalletCapability[];
  addressTypes?: WalletAddressType[];
}

/**
 * Wallet provider configuration with display names and logo paths
 */
export const WALLET_PROVIDERS: Record<WalletProviderKey, WalletProviderConfig> =
  {
    unisat: {
      name: "Unisat",
      logo: "/img/wallet/unisat/logo_unisat.png",
      installUrl:
        "https://chromewebstore.google.com/detail/unisat-wallet/ppbibelpcjmhbdihakflkdcoccbgbkpo",
    },
    leather: {
      name: "Leather",
      logo: "/img/wallet/leather/logo_leather.svg",
      installUrl:
        "https://chromewebstore.google.com/detail/leather/ldinpeekobnhjjdofggfgjlcehhmanlj",
    },
    okx: {
      name: "OKX",
      logo: "/img/wallet/okx/logo_okx.svg",
      installUrl:
        "https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge",
    },
    tapwallet: {
      name: "Universe",
      logo: "/img/wallet/tapwallet/logo_tapwallet.png",
      installUrl:
        "https://chromewebstore.google.com/detail/universe-bitcoin-wallet/fjalkkkbjffhgdoheannkodafhemfdba",
    },
    phantom: {
      name: "Phantom",
      logo: "/img/wallet/phantom/logo_phantom.svg",
      installUrl:
        "https://chromewebstore.google.com/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa",
    },
    horizon: {
      name: "Horizon",
      logo: "/img/wallet/horizon/logo_horizon.png",
      installUrl:
        "https://chromewebstore.google.com/detail/horizon-wallet/bnmgkjlaommgappfckljlelgahnbngme",
    },
    xverse: {
      name: "Xverse",
      logo: "/img/wallet/xverse/logo_xverse.svg",
      logoPng: "/img/wallet/xverse/logo_xverse.png",
      installUrl:
        "https://chromewebstore.google.com/detail/xverse-wallet/idnnbdplmphpflfnlkomgpfbpcgelopg",
      capabilities: ["p2tr", "p2wpkh", "psbt", "message-signing", "send-btc"],
      addressTypes: ["payment", "ordinals"],
    },
    wonder: {
      name: "Wonder",
      logo: "/img/wallet/wonder/logo_wonder.svg",
      installUrl: "https://wonder-wallet.com",
      capabilities: [
        "p2tr",
        "p2wpkh",
        "p2sh",
        "p2pkh",
        "psbt",
        "message-signing",
        "send-btc",
      ],
      addressTypes: ["payment", "ordinals"],
    },
  };
