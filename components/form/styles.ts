/* ===== FORM STYLES MODULE ===== */
import { container2Hover, transitionColors } from "$layout";

/* ===== BASE STYLES ===== */
// Global sizes
const inputFieldHeight = "h-10";
const inputFieldWidth = "!w-10";

// Inner element style — applied to the actual <input>/<select>/<textarea>.
// Transparent and borderless because <input> does not support ::before pseudo-elements,
// so the gradient border must live on a wrapping <div> (see wrapper exports below).
const inputInner = `
  px-5 w-full h-full bg-transparent border-none
  focus:outline-none focus-visible:outline-none
  font-normal text-xs text-color-neutral-200
  placeholder:font-light placeholder:text-color-neutral-500 placeholder:uppercase
`;

/* ===== WRAPPER STYLES ===== */
// Applied to the <div> that wraps an <input>/<select>/<textarea>.
// The gradient border (::before pseudo-element in bg-border-container-2)
// only works on regular elements, not replaced/void elements like <input>.

export const inputFieldWrapper = `
  ${inputFieldHeight} w-full
  ${container2Hover} ${transitionColors}
  flex items-center
  focus:outline-none focus-visible:outline-none
  focus-within:bg-color-neutral-1000
`;

export const inputFieldSquareWrapper = `
  ${inputFieldHeight} ${inputFieldWidth}
  ${container2Hover} ${transitionColors}
  flex items-center justify-center
  focus-within:bg-color-neutral-1000
`;

export const inputTextareaWrapper = `
  w-full pt-3 h-auto
  ${container2Hover} ${transitionColors}
  focus-within:bg-color-neutral-1000
`;

/* ===== INNER INPUT STYLES ===== */
// Applied to the actual form element inside the wrapper.

export const inputField = inputInner;

export const inputFieldSquare = `
  ${inputInner}
  !w-full !px-0.5 text-center
`;

// Outline input - for custom wrapper implementations
export const inputFieldOutline = `
  ${inputFieldHeight} w-full
`;

// Textarea inner — no h-full (wrapper is auto-height, not fixed).
export const inputTextarea = `
  px-5 w-full h-[100px] min-h-[100px] resize-none bg-transparent border-none
  focus:outline-none focus-visible:outline-none
  font-normal text-xs text-color-neutral-200
  placeholder:font-light placeholder:text-color-neutral-500 placeholder:uppercase
`;

// Input field dropdown - define height in the component
export const inputFieldDropdown = `
absolute top-[100%] left-0 w-full z-dropdown
bg-gradient-to-b from-color-background/30 to-color-background backdrop-blur-sm
border border-t-0 border-color-border/75 rounded-b-2xl
text-color-neutral-200 text-sm font-medium uppercase leading-none
overflow-y-auto scrollbar-background-layer2 shadow-lg cursor-pointer`;

export const inputFieldDropdownHover = `
flex justify-between py-2.5 px-3
border-b-[1px] border-color-border last:border-b-0
${container2Hover} ${transitionColors} uppercase cursor-pointer`;

// Checkbox - used for both checkboxes and radiobuttons
export const inputCheckbox = (
  checked: boolean,
  canHoverSelected: boolean,
): string => `
  appearance-none
  relative
  size-4 tablet:size-3
  rounded-full
  border
  cursor-pointer
  transition-colors duration-200
  ${
  checked
    ? canHoverSelected
      ? "border-color-grey-light after:bg-color-grey-light group-hover:border-color-grey group-hover:after:bg-color-grey"
      : "border-color-grey-light after:bg-color-grey-light"
    : canHoverSelected
    ? "border-color-grey group-hover:border-color-grey-light"
    : "border-color-grey"
}
    after:content-['']
    after:block
    after:size-[12px] tablet:after:size-[8px]
    after:rounded-full
    after:absolute
    after:top-1/2 after:left-1/2
    after:-translate-x-1/2 after:-translate-y-1/2
    after:scale-0
    checked:after:scale-100
    after:transition-all
    after:duration-200
  `;

/* ===== NOT IN USE NOR UPDATED ===== */
// Input styles
export const inputNumeric = `
  ${inputField}
  [appearance:textfield]
  [&::-webkit-outer-spin-button]:appearance-none
  [&::-webkit-inner-spin-button]:appearance-none
`;
export const inputSelect = `
  ${inputField}
  appearance-none
  bg-no-repeat
  bg-[right_0.5rem_center]
  bg-[length:1.5em_1.5em]
  pr-10
`;
/* ===== ===== ===== */
/* ===== NOT IN USE NOR UPDATED ===== */
/* ===== LABEL STYLES ===== */
export const labelBase =
  "font-medium text-base text-color-neutral-200 cursor-default select-none whitespace-nowrap";
export const labelLarge =
  "font-medium text-lg text-color-neutral-200 cursor-default select-none whitespace-nowrap";

/* ===== STATE STYLES ===== */
export const stateDisabled = "opacity-50 cursor-not-allowed";
export const stateLoading = "cursor-wait opacity-75";
export const stateError = "text-xs border-red-500 focus:border-red-500";
export const stateSuccess = "text-xs border-green-500 focus:border-green-500";

/* ===== MESSAGE STYLES ===== */
export const messageError = "text-xs text-red-500 mt-2";
export const messageSuccess = "text-xs text-green-500 mt-2";
export const messageHelp = "text-xs text-color-grey-dark mt-1";
/* ===== ===== ===== */

/* ===== TYPE DEFINITIONS ===== */
export type FormStyles = {
  // Wrappers (for <div> enclosing the actual input element)
  inputFieldWrapper: string;
  inputFieldSquareWrapper: string;
  inputTextareaWrapper: string;

  // Inputs
  inputField: string;
  inputFieldOutline: string;
  inputFieldSquare: string;
  inputNumeric: string;
  inputTextarea: string;
  inputSelect: string;
  inputCheckbox: string;
  inputRadio: string;
  inputFieldDropdown: string;
  inputFieldDropdownHover: string;

  // Gradients
  // purple: string;
  // grey: string;
  // outlineGradient: string;

  // Labels - not used
  labelBase: string;
  labelLarge: string;

  // States - not used
  stateDisabled: string;
  stateLoading: string;
  stateError: string;
  stateSuccess: string;

  // Messages - not used
  messageError: string;
  messageSuccess: string;
  messageHelp: string;
};
