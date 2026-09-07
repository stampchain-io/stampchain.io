/* ===== UPLOAD IMAGE TABLE COMPONENT ===== */
import { walletSignal } from "$client/wallet/wallet.ts";
import { unicodeEscapeToEmoji } from "$lib/utils/ui/formatting/emojiUtils.ts";
import {
  abbreviateAddress,
  formatDate,
} from "$lib/utils/ui/formatting/formatUtils.ts";
import { getSRC20ImageSrc } from "$lib/utils/ui/media/imageUtils.ts";
import { walletOwnsAddress } from "$lib/utils/wallet/ownership.ts";
import { textLg } from "$text";
import type { WalletDataTypes } from "$types/base.d.ts";
import type { SRC20Row } from "$types/src20.d.ts";
import type { ImageModalProps, SRC20BalanceTableProps } from "$types/ui.d.ts";
import { useState } from "preact/hooks";

/* ===== IMAGE MODAL COMPONENT ===== */
const ImageModal = ({ imgSrc, isOpen, onClose }: ImageModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      class="fixed z-20 inset-0 bg-black bg-opacity-50 flex justify-center items-center"
    >
      <div onClick={(e) => e.stopPropagation()}>
        <img class="w-60 h-60" src={imgSrc} alt="Modal" />
      </div>
    </div>
  );
};

/* ===== COMPONENT ===== */
export const UploadImageTable = (props: SRC20BalanceTableProps) => {
  const { data } = props;

  /* ===== STATE ===== */
  const [modalImg, setModalImg] = useState<string>("");
  const [isModalOpen, setModalOpen] = useState(false);

  // PERFORMANCE OPTIMIZATION: Use wallet signal instead of polling localStorage
  // This eliminates the 1-second polling that was consuming CPU resources
  const wallet = walletSignal.value as WalletDataTypes;
  // Tokens deployed by any of the connected wallet's addresses (payment or
  // ordinals) — see lib/utils/wallet/ownership.ts.
  const ownedRows = data.filter((row) =>
    walletOwnsAddress(walletSignal.value, row.creator)
  );

  /* ===== EVENT HANDLERS ===== */
  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleImageInteraction = (imgSrc: string | undefined) => {
    if (!imgSrc) return;
    setModalImg(imgSrc);
    setModalOpen(!isModalOpen);
  };

  /* ===== RENDER ===== */
  return (
    <>
      <ImageModal
        imgSrc={modalImg}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
      {wallet
        ? (
          <div class="relative overflow-x-auto shadow-md rounded-2xl">
            <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
              <caption class="p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
                SRC20
              </caption>
              <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" class="px-6 py-3">#</th>
                  <th scope="col" class="px-6 py-3">img</th>
                  <th scope="col" class="px-6 py-3">tick</th>
                  <th scope="col" class="px-6 py-3">block</th>
                  <th scope="col" class="px-6 py-3">creator</th>
                  <th scope="col" class="px-6 py-3">max</th>
                  <th scope="col" class="px-6 py-3">lim</th>
                  <th scope="col" class="px-6 py-3">decimals</th>
                  <th scope="col" class="px-6 py-3">date</th>
                </tr>
              </thead>
              <tbody>
                {ownedRows.map(
                  // data.map(
                  (src20: SRC20Row) => {
                    const href = `/upload/${unicodeEscapeToEmoji(src20.tick)}`;
                    return (
                      <tr class="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
                        <td class="px-6 py-4 uppercase">
                          {src20.row_num}
                        </td>
                        <td class="px-6 py-4 uppercase">
                          <img
                            src={getSRC20ImageSrc({
                              ...src20,
                              deploy_tx: src20.tx_hash,
                            } as any)}
                            class="w-10 h-10"
                            onClick={() =>
                              handleImageInteraction(
                                getSRC20ImageSrc({
                                  ...src20,
                                  deploy_tx: src20.tx_hash,
                                } as any),
                              )}
                          />
                        </td>
                        <td class="px-6 py-4 uppercase">
                          <a href={href}>
                            {unicodeEscapeToEmoji(src20.tick)}
                          </a>
                        </td>
                        <td class="px-6 py-4">
                          {src20.block_index}
                        </td>
                        <td class="px-6 py-4">
                          {src20.creator
                            ? src20.creator
                            : abbreviateAddress(src20.creator)}
                        </td>
                        <td class="px-6 py-4">
                          {typeof src20.max === "number"
                            ? Number(src20.max).toLocaleString()
                            : Number(src20.max).toLocaleString()}
                        </td>
                        <td class="px-6 py-4">
                          {typeof src20.lim === "number"
                            ? Number(src20.lim).toLocaleString()
                            : Number(src20.lim).toLocaleString()}
                        </td>
                        <td class="px-6 py-4">
                          {src20.deci}
                        </td>
                        <td class="px-6 py-4 text-sm">
                          {formatDate(new Date(src20.block_time), {
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )
        : (
          <h3 class={textLg}>
            CONNECT YOUR WALLET TO SEE YOUR STAMPS
          </h3>
        )}
    </>
  );
};
