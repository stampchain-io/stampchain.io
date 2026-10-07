/* ===== HOW TO POSH STAMP COMPONENT ===== */
import { InfoModal } from "$islands/modal/InfoModal.tsx";
import { textSm } from "$text";

/* ===== COMPONENT ===== */
export const StampCreatePoshHowto = () => {
  return (
    <InfoModal title="HOW-TO" subtitle="CREATE A POSH STAMP">
      <div class="flex flex-col">
        <p class={textSm}>
          A posh stamp carries a <b>named asset</b>{" "}
          instead of a random numeric CPID, giving your art a unique, readable
          name on the blockchain.
        </p>
        <div class={textSm}>
          <ul class="list-disc pl-5 space-y-2 mb-4.5">
            <li>
              Drop your file on the <b>upload file canvas</b>{" "}
              or click it to select your artwork.
            </li>
            <li>
              Enter your <b>asset name</b>. This field is <b>required</b>{" "}
              and a posh stamp can't be created without it.
            </li>
            <li>
              The name must start with a letter from <b>B to Z</b>{" "}
              and can be 1 to <b>13 characters</b>{" "}
              long, letters only. No numbers, spaces or special characters.
            </li>
            <li>
              Named assets are unique. If the name is already taken, choose
              another one.
            </li>
            <li>
              Registering a named asset requires{" "}
              <b>XCP</b>. Make sure your wallet holds enough XCP before you
              stamp.
            </li>
            <li>
              Set the number of <b>editions</b> you wish to issue.
            </li>
            <li>
              Editions are <b>locked</b>{" "}
              by default, so the supply can't be changed later. Unlock them if
              you want to be able to adjust the amount in the future.
            </li>
            <li>
              Bitcoin <b>transaction fees</b>{" "}
              range from fast 1 block confirmation to slower one hour or no
              priority confirmations. A recommended fee is shown based on the
              current network fee and your transaction size.
            </li>
            <li>
              Use the <b>fee slider</b> to set your preferred transaction fee.
            </li>
            <li>
              A <b>fee estimate</b>{" "}
              is shown based on your selected transaction fee and file size.
            </li>
            <li>
              Accept the <b>terms and conditions</b> to enable the stamp button.
            </li>
            <li>
              Connect your wallet if you haven't already, then click the{" "}
              <b>stamp button</b>.{" "}
              Your transaction is prepared with all the details you provided and
              your wallet will ask you to confirm it. Sign it and it will be
              broadcast to the blockchain.
            </li>
          </ul>
        </div>
        <p class={textSm}>
          While previewing your generated stamp, use the toolbar to <b>view</b>
          {" "}
          the HTML <b>code</b>, open the stamp in{" "}
          <b>fullscreen</b>, or toggle the <b>stamp cards</b>{" "}
          mockup to see how your stamp will look on stampchain.io.
        </p>
        <p class={textSm}>
          All related costs are listed under the <b>details</b> section. <br />
          A lower fee may delay your art being stamped.<br />
          Fees are shown in BTC by default, you can switch to USDT with the{" "}
          <b>toggle</b>.
        </p>
      </div>
    </InfoModal>
  );
};
