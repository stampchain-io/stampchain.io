/* ===== HOW TO MINT TOKEN COMPONENT ===== */
import { ReadAllButton } from "$button";
import { containerBackground } from "$layout";
import { subtitleNeutral, text, titleNeutralLD } from "$text";

/* ===== COMPONENT ===== */
export const SRC20MintHowto = () => {
  return (
    <div class={`${containerBackground} gap-5`}>
      <div class="flex flex-col">
        <h3 class={`${titleNeutralLD}`}>HOW-TO</h3>
        <h2 class={subtitleNeutral}>MINT A TOKEN</h2>
        <p class={text}>
          <ul class="list-disc pl-5 space-y-2">
            <li>
              Start typing a <b>token name</b>{" "}
              to filter and select the correct ticker.
            </li>
            <li>
              The ticker logo image and name will be shown along with the
              maximum limit per mint.
            </li>
            <li>
              Double-check that the displayed information matches the ticker you
              wish to mint.
            </li>
            <li>
              If the <b>minting progress</b>{" "}
              is near 95%, be cautious as you risk losing your funds. <br />
              When a token is minted out, and progress has reached 100%, you
              will no longer be able to mint it.
            </li>
            <li>
              <b>Fee</b>{" "}
              displays the suggested amount, which can be adjusted using the
              slider.{" "}
            </li>
            <li>
              An <b>estimate</b>{" "}
              is displayed based on the current fee and transaction size.
            </li>
            <li>
              Accept the <b>terms and conditions</b> to enable the mint button.
            </li>
            <li>
              The <b>mint button</b>{" "}
              will submit your transaction with all the provided details.
            </li>
          </ul>
        </p>
        <p class={text}>
          Reducing the fee may slow down the minting process.<br />
          Fees are shown in BTC by default, but you can switch to USDT using the
          toggle.<br />
          All related costs are listed in the <b>details</b> section.<br />
        </p>
      </div>
      <ReadAllButton href="/howto/minttoken" />
    </div>
  );
};
