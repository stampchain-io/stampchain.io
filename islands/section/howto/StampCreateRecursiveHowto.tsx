/* ===== HOW TO RECURSIVE STAMP COMPONENT ===== */
/* How-to guide for the recursive stamp composer. */
import { InfoModal } from "$islands/modal/InfoModal.tsx";
import { textSm } from "$text";

/* ===== COMPONENT ===== */
export const StampCreateRecursiveHowto = () => {
  return (
    <InfoModal title="HOW-TO" subtitle="CREATE A RECURSIVE STAMP">
      <div class="flex flex-col">
        <p class={textSm}>
          A recursive stamp is a small HTML file that composes existing stamps
          into new artwork. Your stamp only references the original assets, so
          it stays light and cheap to broadcast.
        </p>
        <div class={textSm}>
          <ul class="list-disc pl-5 space-y-2 mb-4.5">
            <li>
              Pick a <b>background</b>{" "}
              color to set the canvas behind your layers.
            </li>
            <li>
              Add <b>assets</b>{" "}
              by entering a stamp number, CPID or tx hash, or browse stamps with
              the search icon. Click the eye to preview an asset, then{" "}
              <b>+ ADD ASSET</b>. Recently used stamps are one click away under
              {" "}
              <b>recent</b>.
            </li>
            <li>
              Add <b>text</b>{" "}
              by choosing a font, size, color, style and alignment, then click
              {" "}
              <b>+ ADD TEXT</b>. Double-click the text on the canvas to edit it.
              Size is a percentage of the canvas height.
            </li>
            <li>
              Every asset and text is a{" "}
              <b>layer</b>. Select layers in the list or on the canvas, drag
              them to reorder, or use the arrows to move them up and down. Lock,
              hide, rename, duplicate or delete layers and group several
              together.
            </li>
            <li>
              Drag a layer on the canvas to move it, use the corner and edge
              handles to resize and the top handle to rotate. In{" "}
              <b>properties</b>{" "}
              you can enter exact position, width, height and rotation, adjust
              opacity, flip or center the layer. Smart guides and snapping help
              you align. With several layers selected, use the align and
              distribute buttons.
            </li>
            <li>
              Apply <b>filters</b>{" "}
              to the selected layer: brightness, contrast, saturation, hue
              rotate and grayscale. Reset them at any time.
            </li>
            <li>
              Zoom and pan the canvas for detail work. Undo and redo are
              supported. Right-click a layer for quick actions. Open the{" "}
              <b>keybindings</b> to view the keyboard shortcuts.
            </li>
            <li>
              Click <b>generate</b>{" "}
              to build your stamp from the canvas. The composer switches to the
              stamp preview view and shows the final result, including the file
              size of the generated HTML. Use <b>edit</b>{" "}
              to go back to the canvas. <b>Clear</b>{" "}
              empties the canvas and resets the composer.
            </li>
            <li>
              Optionally add an <b>artwork title</b>{" "}
              which is embedded in your stamp's HTML page title.
            </li>
            <li>
              Choose how the recursive layers are referenced. Using the{" "}
              <b>CPID string</b>{" "}
              (default) points to the stamp's asset ID, using the{" "}
              <b>tx hash string</b>{" "}
              points to the transaction that created the stamp. Recursive tx
              hash stamps can be rebuilt from Bitcoin blockchain data alone,
              CPID needs Stamps Indexer and API access.
            </li>
            <li>
              A random numeric CPID is auto-generated on broadcast. You can
              choose a custom CPID for your stamp if you wish.
            </li>
            <li>
              Define the amount of stamp <b>editions</b>{" "}
              you want to create. Editions are <b>locked</b>{" "}
              by default, preventing future changes to the amount of editions.
              Unlock to be able to edit the amount in the future.
            </li>
            <li>
              Bitcoin <b>transaction fees</b>{" "}
              are displayed for fast 1 block confirmation to slower one hour or
              no priority confirmations. A recommended fee is displayed based on
              the current fee and transaction size. Adjust the fee with the
              slider to your desired amount per byte, a <b>fee estimate</b>{" "}
              is displayed based on the selected fee and file size.
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
          Lowering the fee may delay your art being stamped.<br />
          Fees are displayed in BTC by default, you can switch to USDT using the
          {" "}
          <b>toggle</b>.
        </p>
      </div>
    </InfoModal>
  );
};
