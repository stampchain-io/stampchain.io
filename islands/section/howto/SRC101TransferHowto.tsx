/* ===== HOW TO TRANSFER BITNAME COMPONENT ===== */
import { ReadAllButton } from "$button";
import { containerBackground } from "$layout";
import { subtitleNeutral, text, titleNeutralLD } from "$text";

/* ===== COMPONENT ===== */
export const SRC101TransferHowto = () => {
  return (
    <div class={`${containerBackground} gap-5`}>
      <div class="flex flex-col">
        <h3 class={titleNeutralLD}>HOW-TO</h3>
        <h2 class={subtitleNeutral}>TRANSFER A TOKEN</h2>
        <p class={text}>
          <ul class="list-disc pl-5 space-y-2">
            <li>
              The Bitcoin <b>recepient address</b>{" "}
              must start with 1 if classic, or with bc1q if SegWit.
            </li>
            <li>
              Start typing the <b>token name</b>{" "}
              to access to your list of tokens.
            </li>
            <li>
              Enter the <b>amount</b> of tokens that you want to transfer.
            </li>
            <li>
              <b>Fee</b>{" "}
              displays the suggested amount, and you can adjust it with the
              slider.
            </li>
            <li>
              A fee <b>estimate</b>{" "}
              is displayed based on the current fee and transaction size.
            </li>
            <li>
              Accept the <b>terms and conditions</b> to enable the{" "}
              <b>transfer</b> button.
            </li>
            <li>
              The <b>transfer</b>{" "}
              button will submit your transaction with all the provided
              information.
            </li>
          </ul>
        </p>
        <p class={text}>
          Reducing the fee may slow down the transfer process.<br />
          Fees are shown in BTC by default, but you can change to USDT using the
          toggle switch.<br />
          All related costs are listed in the <b>details</b> section.<br />
        </p>
      </div>
      <ReadAllButton href="/howto/transferbitname" />
    </div>
  );
};
