/* ===== HOW TO REGISTER BITNAME COMPONENT ===== */
import { containerBackground } from "$layout";
import { subtitleNeutral, text, titleNeutralLD } from "$text";

/* ===== COMPONENT ===== */
export const SRC101RegisterHowto = () => {
  return (
    <div class={`${containerBackground} gap-5`}>
      <div class="flex flex-col">
        <h3 class={titleNeutralLD}>HOW-TO</h3>
        <h2 class={subtitleNeutral}>REGISTER YOUR BITNAME</h2>
        <p class={text}>
          <ul class="list-disc pl-5 space-y-2">
            <li>
              Select your preferred <b>Top Level Domain</b>{" "}
              from the .btc dropdown menu. We support multiple TLDs, such as
              {" "}
              <b>.btc</b>, <b>.sats</b>, <b>.x</b>.
            </li>
            <li>
              Type in the <b>domain name</b> you want to claim.
            </li>
            <li>
              Click the <b>availability</b>{" "}
              button to check if the domain is already registered or available.
            </li>
            <li>
              If the domain name isn't claimed, you can proceed to register it.
            </li>
            <li>
              Set the desired <b>transaction fee</b>{" "}
              by adjusting the fee selector slider. We do not advise setting a
              fee lower than the <b>recommended fee</b>.
            </li>
            <li>
              An <b>estimate</b>{" "}
              of the total cost of the registration is displayed. You can view a
              breakdown of the domain registration and transaction fees, in the
              {" "}
              <b>details</b> dropdown section.
            </li>
            <li>
              Accept the <b>terms of service</b> to enable the register button.
            </li>
            <li>
              Click the <b>register button</b>{" "}
              to submit your transaction with all the provided details and
              confirm the transaction in your wallet.
            </li>
          </ul>
        </p>
        <p class={text}>
          Reducing the transaction fee may slow down the registration process.
          <br />
          All fees are shown in BTC by default. You can view the costs in USDT
          by switching the toggle.<br />
          You can check the progress of the registration by viewing your tx hash
          in a{" "}
          <a
            href="https://mempool.space/"
            target="_blank"
            rel="noopener noreferrer"
            class="animated-underline"
          >
            blockchain explorer
          </a>.
        </p>
      </div>
      {/* <ReadAllButton href="/howto/registerbitname" /> */}
    </div>
  );
};
