/* ===== HOW TO STAMP COMPONENT ===== */
import { InfoModal } from "$islands/modal/InfoModal.tsx";
import { textSm } from "$text";

/* ===== COMPONENT ===== */
export const StampCreateClassicHowto = () => {
  return (
    <InfoModal title="HOW-TO" subtitle="CREATE A CLASSIC STAMP">
      <div class="flex flex-col">
        <p class={textSm}>
          <ul class="list-disc pl-5 space-y-2 mb-0">
            <li>
              Click or drag and drop your file in the <b>upload file canvas</b>
              {" "}
              to upload your artwork.
            </li>
            <li>
              Define the amount of stamp <b>editions</b> you want to create.
            </li>
            <li>
              Editions are <b>locked</b>{" "}
              by default, preventing future changes to the amount of editions.
              Unlock to be able to edit the amount in the future.
            </li>
            <li>
              A random numeric CPID is auto-generated on broadcast. You can
              choose a custom CPID for your stamp if you wish.
            </li>
            <li>
              Bitcoin <b>transaction fees</b>{"  "}
              are displayed for fast 1 block confirmation to slower one hour or
              no priority confirmations. A recommended fee is displayed based on
              the current fee and transaction size.
            </li>
            <li>
              Adjust the <b>transaction fee</b>{" "}
              with the slider to your desired amount per byte.
            </li>
            <li>
              A <b>fee estimate</b>{" "}
              is displayed based on the selected transaction fee and file size.
            </li>
            <li>
              Accept the <b>terms and conditions</b>{" "}
              to be able to create your stamp.
            </li>
            <li>
              Connect your wallet if you haven't already. Once connected you can
              stamp your art on the blockchain by clicking the{" "}
              <b>stamp button</b>.{" "}
              Your transaction will be submitted with all the provided details
              and your wallet will prompt you to confirm the transaction. Sign
              it and it will be broadcast to the blockchain.
            </li>
          </ul>
        </p>
        <p class={textSm}>
          While previewing your generated stamp, use the toolbar to <b>view</b>
          {" "}
          the HTML <b>code</b>, open the stamp in{" "}
          <b>fullscreen</b>, or toggle the <b>stamp cards</b>{" "}
          mockup to see how your stamp will look on stampchain.io.
        </p>
        <p class={textSm}>
          All related costs are listed under the <b>details</b> section. <br />
          Lowering the fee may delay your art being stamped.<br />
          Fees are displayed in BTC by default, you can switch to USDT using the
          {" "}
          <b>toggle</b>.
        </p>
      </div>
    </InfoModal>
  );
};
