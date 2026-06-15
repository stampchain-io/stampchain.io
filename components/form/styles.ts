/* ===== FORM STYLES MODULE ===== */
import { container2Hover } from "$layout";

/* ===== BASE STYLES ===== */
// Global sizes
const inputFieldHeight = "h-10";
const inputFieldWidth = "!w-10";

export const inputField = `
  ${inputFieldHeight} px-5 w-full bg-transparent
  ${container2Hover}
  focus:outline-none focus-visible:outline-none focus:bg-color-neutral-1000
  font-normal text-xs text-color-neutral-200
  placeholder:font-light placeholder:text-color-neutral-500 placeholder:uppercase
`;

export const inputFieldSquare = `
  ${inputFieldHeight} ${inputFieldWidth} bg-transparent
  ${container2Hover}
  focus:outline-none focus-visible:outline-none focus:bg-color-neutral-1000
  font-normal text-xs text-color-neutral-200 text-center px-0.5
`;

export const inputTextarea = `
  px-5 pt-3 w-full h-[100px] min-h-[100px] resize-none bg-transparent
  ${container2Hover}
  focus:outline-none focus-visible:outline-none focus:bg-color-neutral-1000
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
${container2Hover} uppercase cursor-pointer`;

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
      ? "border-color-primary-400 after:bg-color-primary-400 group-hover:border-color-hover group-hover:after:bg-color-hover"
      : "border-color-primary-400 after:bg-color-primary-400"
    : canHoverSelected
    ? "border-color-neutral-500 group-hover:border-color-hover"
    : "border-color-neutral-500"
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
