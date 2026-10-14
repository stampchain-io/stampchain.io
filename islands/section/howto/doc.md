/**
 * How-To Modules Documentation
 * ==========================
 *
 * Overview
 * --------
 * The How-To modules are short intro guides that explain how to use the stamp tooling.
 * They are based upon the How-To articles and most of the intro guide modules include a "Read More" button (via ReadAllButton) linking to the specific article, that goes more into depth on the subject.
 *
 * Module Files
 * -----------
 * Current modules in /islands/section/howto/:
 * - SRC101RegisterHowto.tsx
 * - SRC101TransferHowto.tsx
 * - SRC20DeployHowto.tsx
 * - SRC20MintHowto.tsx
 * - SRC20TransferHowto.tsx
 * - StampSendHowTo.tsx
 * - StampingHowto.tsx
 * - StampCreateClassicHowto.tsx (create/classic info modal, renders InfoModal)
 * - StampCreatePoshHowto.tsx (create/posh info modal, renders InfoModal)
 * - StampCreateRecursiveHowto.tsx (create/recursive how-to modal, renders InfoModal)
 * - StampCreateRecursiveShortcuts.tsx (create/recursive keyboard shortcuts modal, renders InfoModal)
 * - doc.md (this documentation)
 *
 * Creating a New Module
 * -------------------
 * To add a new How-To module:
 *
 * 1. Create a new .tsx file in /islands/section/howto/
 * @example
 * // NewFeatureHowto.tsx
 * import { ReadAllButton } from "$button";
 * import { containerBackground } from "$layout";
 * import { subtitleNeutral, text, titleNeutral } from "$text";
 *
 * export const NewFeatureHowto = () => {
 *   return (
 *     <div class={`${containerBackground} gap-5`}>
 *       <div class="flex flex-col">
 *         <h3 class={titleNeutral}>HOW-TO</h3>
 *         <h2 class={subtitleNeutral}>DO THE NEW FEATURE</h2>
 *         <p class={text}>
 *           <ul class="list-disc pl-5 space-y-2">
 *             <li>Add your steps here.</li>
 *           </ul>
 *         </p>
 *       </div>
 *       <ReadAllButton href="/howto/newfeature" />
 *     </div>
 *   );
 * };
 *
 * - Alternately copy the code of one of the existing guides and paste it into a new file, updating the text content and button link
 * - Export the new component from islands/section/index.ts so it can be imported via "$section"
 *
 * Create-page info modals
 * ------------------------
 * The StampCreate* modules wrap their content in `InfoModal`
 * ($islands/modal/InfoModal.tsx) with `title="HOW-TO"` and a `subtitle`, and
 * are opened through `InfoButton` ($islands/button/InfoButton.tsx):
 * - `<InfoButton modal={<StampCreateClassicHowto />} />` (help icon, default)
 * - `<InfoButton modal={<StampCreateRecursiveShortcuts />} icon="keyboard"
 *   ariaLabel="Keyboard shortcuts" />` (placed at the end of the row in
 *   CreateStampRecursiveHeader.tsx)
 * These modules are not exported via "$section"; import them by path.
 *
 * Best Practices
 * -------------
 * 1. Naming Convention
 *    - Suffix with "Howto" (e.g. SRC20MintHowto, StampingHowto)
 *    - Use CamelCase
 *    - Be descriptive (e.g., SRC20MintHowto)
 *
 * 2. Content Guidelines
 *    - Keep instructions concise
 *    - Focus on essential steps
 *    - Include a "Read More" link via `<ReadAllButton href="..." />` where the guide has a matching in-depth article
 *    - Link to the detailed article under /howto/
 *
 * Module Purpose
 * -------------
 * - Provide quick start guides
 * - Highlight key steps
 * - Direct users to detailed documentation
 * - Maintain consistent user experience
 *
 * @lastUpdated October 4, 2026
 * @author baba
 */
