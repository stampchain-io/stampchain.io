/* ===== FORM STYLES MODULE ===== */
import { container2Hover, shadowGlowPurpleSm, transitionColors } from "$layout";

/* ===== BASE STYLES ===== */
// Global sizes
const inputFieldHeight = "h-8";
const inputFieldWidth = "w-8";

export const inputField = `
  ${inputFieldHeight} px-3 w-full bg-transparent
  ${container2Hover} ${shadowGlowPurpleSm}
  focus:outline-none focus-visible:outline-none
  focus:bg-color-neutral-1000 focus:border-color-hover
  font-normal text-xs text-color-neutral-200
  placeholder:font-light placeholder:text-color-neutral-500 placeholder:uppercase
`;

export const inputFieldSquare = `
  ${inputFieldHeight} ${inputFieldWidth} px-0.5 bg-transparent
  ${container2Hover} ${shadowGlowPurpleSm}
  focus:outline-none focus-visible:outline-none
  focus:bg-color-neutral-1000 focus:border-color-hover
  font-normal text-xs text-color-neutral-200 text-center
`;

export const inputFieldGrow = "w-8 shrink-0";

/** Wider than one digit. 1.5rem matches inputField px-3, 2px the border. */
export function inputFieldGrowStyle(
  length: number,
): { width: string } | undefined {
  if (length <= 1) return undefined;
  return { width: `calc(${length}ch + 1.5rem + 2px)` };
}

/** Digits only, written back so other characters never stay visible. */
export function inputFieldGrowDigits(input: HTMLInputElement): string {
  const digits = input.value.replace(/\D/g, "");
  if (input.value !== digits) input.value = digits;
  return digits;
}

export const inputTextarea = `
  px-3 pt-2 w-full h-[76px] min-h-[76px] resize-none bg-transparent
  ${container2Hover} ${shadowGlowPurpleSm}
  focus:outline-none focus-visible:outline-none
  focus:bg-color-neutral-1000 focus:border-color-hover
  font-normal text-xs text-color-neutral-200
  placeholder:font-light placeholder:text-color-neutral-500 placeholder:uppercase
`;

// Input field dropdown - define height in the component
export const inputFieldDropdown = `
absolute top-[100%] left-0 w-full z-dropdown
bg-gradient-to-t from-color-neutral-800/40 via-color-neutral-900/60 to-neutral-900/80 backdrop-blur-sm
border border-t-0 border-color-neutral-700 rounded-b-2xl
text-color-neutral-200 text-xs font-medium uppercase leading-none
overflow-y-auto scrollbar-background-layer2 shadow-lg cursor-pointer`;

export const inputFieldDropdownHover = `
flex justify-between px-3 py-2 hover:bg-black/30
border-b-[1px] border-color-neutral-700 last:border-b-0
uppercase cursor-pointer`;

// Checkbox - used for both checkboxes and radiobuttons
export const inputCheckbox = (
  checked: boolean,
  canHoverSelected: boolean,
): string => `
  appearance-none
  relative
  size-3
  rounded-full
  border
  cursor-pointer
  ${transitionColors}
  ${
  checked
    ? canHoverSelected
      ? "border-color-primary-400 after:bg-color-primary-400 group-hover:border-color-hover group-hover:after:bg-color-hover"
      : "border-color-primary-400 after:bg-color-primary-400"
    : canHoverSelected
    ? "border-color-neutral-400 group-hover:border-color-hover"
    : "border-color-neutral-400"
}
    after:content-['']
    after:block
    after:size-[8px]
    after:rounded-full
    after:absolute
    after:top-1/2 after:left-1/2
    after:-translate-x-1/2 after:-translate-y-1/2
    after:scale-0
    checked:after:scale-100
    after:transition-all
    after:duration-500
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
/* ===== NOT IN USE OR NOT UPDATED ===== */
/* ===== STATE STYLES ===== */
export const stateDisabled = "opacity-50 cursor-not-allowed"; // used in StampingTool
export const stateLoading = "cursor-wait opacity-75";
export const stateError = "text-xs border-red-400 focus:border-red-400";
export const stateSuccess = "text-xs border-green-400 focus:border-green-400";

/* ===== MESSAGE STYLES ===== */
export const messageError = "text-xs text-red-400 mt-2";
export const messageSuccess = "text-xs text-green-400 mt-2";
export const messageHelp = "text-xs text-color-neutral-500 mt-1";
/* ===== ===== ===== */

/* ===== TYPE DEFINITIONS ===== */
export type FormStyles = {
  // Inputs
  inputField: string;
  inputFieldSquare: string;
  inputNumeric: string;
  inputTextarea: string;
  inputSelect: string;
  inputCheckbox: (
    checked: boolean,
    canHoverSelected: boolean,
  ) => string;
  inputFieldDropdown: string;
  inputFieldDropdownHover: string;

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
