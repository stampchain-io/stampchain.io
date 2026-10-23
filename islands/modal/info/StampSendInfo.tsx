/* ===== STAMP SEND INFO ===== */
import { InfoModal } from "$islands/modal/info/InfoModal.tsx";
import { textSm } from "$text";

/* ===== COMPONENT ===== */
export const StampSendInfo = () => {
  return (
    <InfoModal title="HOW-TO" subtitle="SEND A STAMP">
      <div class="flex flex-col">
        <div class={textSm}>
          <ul class="list-disc pl-5 space-y-2">
            <li>
              <b>Select a stamp</b>{" "}
              from the input selector drop down list. Confirm it's the right
              stamp by checking the preview image. <br />
              Your wallet must be connected to view your stamps!
            </li>
            <li>
              Enter the <b>amount</b> of stamp editions that you want to send.
              {" "}
              <b>Maximum</b> is the amount of editions you own.
            </li>
            <li>
              Enter the <b>recipient address</b>{" "}
              to whom you wish to send the stamp(s).
            </li>
            <li>
              The <b>fee</b>{" "}
              displays the suggested transaction fee amount, which you can
              adjust with the slider.<br />
              Setting the fee too low will delay your stamp being sent, so it's
              best to not lower the fee beyond the recommended amount.<br />
              Fees are displayed in BTC by default, but you can switch to USDT
              using the <b>toggle</b>.
            </li>
            <li>
              The fee <b>estimate</b>{" "}
              displayed is based on the current fee and transaction size. You
              can review the transaction specifics and a full fee breakdown in
              the <b>details</b> section.
            </li>
            <li>
              Accept the <b>terms and conditions</b> to enable the <b>send</b>
              {" "}
              button.
            </li>
            <li>
              Hit <b>send</b>{" "}
              to submit your transaction with the provided information and sign
              the transaction with your wallet.
            </li>
          </ul>
        </div>
      </div>
    </InfoModal>
  );
};
