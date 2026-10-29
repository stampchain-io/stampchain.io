/**
 * Tool How-To Modals
 * ==================
 *
 * Overview
 * --------
 * Short how-to copy for the stamp tools lives in modal components under
 * islands/modal/info/. Each guide wraps its steps in ModalInfo and is opened
 * from a tool modal or a page header through InfoButton.
 *
 * Long-form articles stay in components/section/howto/ and routes/howto/.
 * See components/section/howto/doc.md for that system.
 *
 * Module Files
 * -----------
 * islands/modal/info/
 * ├── ModalInfo.tsx                      # Shared shell (title, subtitle, scroll)
 * ├── SRC20DeployInfo.tsx                # Deploy a token
 * ├── SRC20MintInfo.tsx                  # Mint a token
 * ├── SRC20TransferInfo.tsx              # Transfer a token
 * ├── SRC101RegisterInfo.tsx             # Register a bitname
 * ├── StampSendInfo.tsx                  # Send a stamp
 * ├── StampCreateClassicInfo.tsx         # Create a classic stamp
 * ├── StampCreatePoshInfo.tsx            # Create a posh stamp
 * ├── StampCreateRecursiveInfo.tsx       # Create a recursive stamp
 * ├── StampCreateRecursiveShortcuts.tsx  # Recursive composer keybindings
 * └── doc.md                             # This documentation
 *
 * ModalInfo
 * ---------
 * ModalInfo renders ModalBase with variant "neutral" and a scrollable body.
 * Pass title, an optional subtitle, and the guide content as children.
 * How-to guides use title="HOW-TO". The recursive keybindings modal uses
 * title="KEYBINDINGS".
 *
 * Opening a Guide
 * --------------
 * 1. Tool modals
 * Pass the info component to ModalTool as `info`. ModalTool places an
 * InfoButton in the header. The button stacks the guide on the tool
 * (stack, variant "plain") so closing the guide returns to the tool.
 * @example
 * <ModalTool
 *   title="TRANSFER"
 *   info={<SRC20TransferInfo />}
 * >
 *   {/* tool fields *\/}
 * </ModalTool>
 *
 * Wired this way:
 * - SRC20DeployTool → SRC20DeployInfo
 * - SRC20MintTool → SRC20MintInfo
 * - SRC20TransferTool → SRC20TransferInfo
 * - SRC101RegisterTool → SRC101RegisterInfo
 * - StampSendTool → StampSendInfo
 *
 * 2. Create-stamp pages
 * CreateStampHeader picks the guide for the active type and opens it with
 * InfoButton (help icon, default pill):
 * - classic → StampCreateClassicInfo
 * - posh → StampCreatePoshInfo
 * - recursive → StampCreateRecursiveInfo
 *
 * On the recursive composer, "?" also opens StampCreateRecursiveInfo.
 *
 * 3. Recursive keybindings
 * CreateStampRecursiveHeader opens StampCreateRecursiveShortcuts with
 * InfoButton, using the keyboard icon:
 * @example
 * <InfoButton
 *   modal={<StampCreateRecursiveShortcuts />}
 *   icon="keyboard"
 *   ariaLabel="Keyboard shortcuts"
 * />
 *
 * Import each module by path from $islands/modal/info/.
 *
 * Creating a New Guide
 * -------------------
 * 1. Add a .tsx file in islands/modal/info/.
 * Suffix the name with "Info" (e.g. SRC20TransferInfo).
 * @example
 * import { ModalInfo } from "$islands/modal/info/ModalInfo.tsx";
 * import { textSm } from "$text";
 *
 * export const NewFeatureInfo = () => {
 *   return (
 *     <ModalInfo title="HOW-TO" subtitle="DO THE NEW FEATURE">
 *       <div class="flex flex-col">
 *         <div class={textSm}>
 *           <ul class="list-disc pl-5 space-y-2 mb-4.5">
 *             <li>
 *               Describe the <b>first step</b>.
 *             </li>
 *           </ul>
 *         </div>
 *         <p class={textSm}>
 *           Extra notes that sit under the list.
 *         </p>
 *       </div>
 *     </ModalInfo>
 *   );
 * };
 *
 * 2. Open it from the matching surface:
 * - A tool modal: pass `info={<NewFeatureInfo />}` to ModalTool.
 * - A page header: render `<InfoButton modal={<NewFeatureInfo />} />`.
 *
 * Content Guidelines
 * -----------------
 * - Keep the steps to what the user does on that tool.
 * - Bold the control name the step refers to.
 * - Use textSm for body copy.
 * - Put the step list first, then short notes (fees, toggles, details).
 * - Leave the in-depth walkthrough on the matching /howto/ article.
 *
 * @lastUpdated October 29, 2026
 * @author baba
 */
