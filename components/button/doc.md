# Button System Documentation

## Overview

The Button system provides a comprehensive set of interactive button components with consistent styling, animations, and behavior. Built with Preact and Fresh, it offers glassmorphism variants, state management, and accessibility features following the app's dark-themed design principles.

## Architecture

### Component Hierarchy
```
┌─────────────────────────────────────────────────────┐
│  Button System Core (styles.ts)                     │
│  - Style definitions and variants                   │
│  - Color palettes and CSS custom properties         │
│  - Size configurations                              │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│  Base Components (components/button/)               │
│  - Button: Standard button with variants            │
│  - ButtonIcon: Icon-only button with loading        │
│  - ButtonProcessing: Form submission button         │
│  - ToggleSwitchButton: Toggle/switch component      │
│  - ReadAllButton, ViewAllButton: Specialized        │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│  Island Components (islands/button/)                │
│  - Interactive buttons with client-side state       │
│  - FilterButton, SortButton, SearchButton           │
│  - WalletButton, ToolsButton, MenuButton            │
│  - RangeSlider, SelectorButtons, PaginationButtons  │
└─────────────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│  Hooks & Actions (buttonActions.tsx)                │
│  - useButtonActions: Active state management        │
│  - Mouse event handlers                             │
└─────────────────────────────────────────────────────┘
```

## Design Principles

### Button Variants

There are only 3 variants. `flatOutline`, `outlineFlat`, and `text` were removed as unused/redundant — use `outline` and `flat` for toggle/selected states instead (see `SelectorButtons.tsx` and `ToggleButton.tsx`).

| Variant | Visual Style | Use Case | Example |
|---------|-------------|----------|---------|
| **outline** | Transparent background, solid `1px` border, fills solid on hover | Secondary/default actions, deselected toggle state | Filter, Sort, Navigation, Cancel |
| **flat** | Solid background, transparent on hover | Primary call-to-action buttons, selected toggle state | Submit, Mint, Create, Connect Wallet |
| **custom** | No built-in styling — fully controlled via `className` | One-off custom buttons | - |

### Color Palettes

The button system uses **solid colors** driven by a single `--color-button` CSS custom property (no gradients). Each `color` value simply points that variable at a different Tailwind color token. See [Layout System Documentation](mdc:components/layout/doc.md#tailwind-color-system) for the complete Tailwind color palette.

| Color | CSS Variable Target | Usage |
|-------|---------------------|-------|
| **neutral** (default for `Button`/`ButtonProcessing`) | `var(--color-neutral-400)` | Neutral/secondary actions, default state |
| **primary** (default for `ButtonIcon`) | `var(--color-primary-400)` | Primary brand actions, emphasis, call-to-action buttons |
| **secondary** | `var(--color-secondary-400)` | Secondary emphasis, alternate accent |
| **test** | `var(--color-green)` | Testing/QA-only buttons |
| **custom** | *(empty)* | Fully controlled via `className` |

**Note:** These CSS variables are referenced in the `variant` styles (e.g. `bg-[var(--color-button)]`, `text-[var(--color-button)]`), and the `color` prop simply sets `--color-button` to the desired token via an arbitrary-value Tailwind class (e.g. `[--color-button:var(--color-neutral-400)]`).

### Size Options

| Size | Height | Padding | Font Size | Use Case |
|------|--------|---------|-----------|----------|
| **xs** | 30px | 14px | 12px | Small buttons |
| **sm** | 34px | 16px | 12px | Regular small buttons |
| **md** | 38px | 16px | 14px | Standard medium buttons (default) |
| **lg** | 42px | 16px | 14px | Large buttons |

## Core Components

### Server-Side Components (`components/button/`)

- **styles.ts**: Button style system and variants
  - **Purpose**: Centralized button styling with CSS custom properties
  - **Exports**:
    - `buttonStyles`: Complete style object with variants, colors, sizes, states
    - `button()`: Style composition function
    - `ButtonProps`: TypeScript interface for props
    - Toggle/slider specific styles: `toggleButton`, `sliderKnob`, `trackFill`
  - **Location**: `components/button/styles.ts`
  - **Features**:
    - 3 button variants (`outline`, `flat`, `custom`)
    - 5 solid colors (`neutral`, `primary`, `secondary`, `test`, `custom`) via a single `--color-button` CSS custom property
    - 5 size options (`xs`, `sm`, `md`, `lg`, `custom`)
    - State management (disabled, loading, active)

- **ButtonBase.tsx**: Core button component implementations
  - **Components**: `Button`, `ButtonIcon`, `ButtonProcessing`
  - **Purpose**: Foundational button components for the entire app
  - **Features**:
    - Support for `<a>` tag rendering with href prop
    - Fresh partial navigation support (f-partial)
    - Loading state with spinner
    - Active state animations
    - Disabled state with "SOON™" tooltip
    - Accessibility attributes (ARIA labels, roles)
  - **Location**: `components/button/ButtonBase.tsx`

- **ToggleSwitchButton.tsx**: Toggle switch UI component
  - **Purpose**: iOS-style toggle switch
  - **Props**: `isActive`, `onToggle`, `toggleButtonId`, `activeSymbol`, `inactiveSymbol`, `activeKnobClassName`, `inactiveKnobClassName`, `onClick`, `onMouseEnter`, `onMouseLeave`, `buttonRef`
  - **Features**: Smooth knob-slide animation, optional symbols inside the knob, overridable knob colors (solid, no gradients)

- **ReadAllButton.tsx**: Expandable content toggle
  - **Purpose**: Show/hide full content with smooth transitions
  - **Usage**: Long text blocks, FAQs, descriptions

- **ViewAllButton.tsx**: Navigation to full listing pages
  - **Purpose**: Link to complete collections or lists
  - **Usage**: Gallery previews, featured content sections

### Island Components (`islands/button/`)

- **FilterButton.tsx**: Content filtering control
- **SortButton.tsx**: Sorting control with dropdown
- **SearchButton.tsx**: Global search modal trigger
- **WalletButton.tsx**: Wallet connection interface
- **ToolsButton.tsx**: Tools menu dropdown
- **MenuButton.tsx**: Mobile navigation menu
- **ToggleButton.tsx**: Client-side toggle with state
- **SelectorButtons.tsx**: Multi-option pill selector (radio group); pill geometry uses CSS `calc`, no DOM measurement (see implementation notes below)
- **PaginationButtons.tsx**: Page navigation controls
- **PaginationButtonsSSRSafe.tsx**: SSR-safe pagination
- **RangeSlider.tsx**: Single value range slider
- **RangeSliderDual.tsx**: Dual handle range slider
- **SettingsButton.tsx**: Settings panel trigger
- **TrendingButton.tsx**: Icon-based toggle for sorting/filtering by trending activity, with a hover tooltip
- **ViewButton.tsx**: Icon-based control that cycles through gallery view modes (`cardVertical`/`cardSquare`/`cardRow`/`cardHorizontal`) via URL params, with a hover tooltip

### Hooks & Utilities

- **buttonActions.tsx**: Active state management hook
  - **Hook**: `useButtonActions()`
  - **Returns**: `{ isActive, activeHandlers }`
  - **Purpose**: Provides mouse down/up/leave handlers for button press animations
  - **Usage**: Creates tactile feedback on button interactions

## Type Definitions

### Button Props

`components/button/styles.ts` defines the style-composition `ButtonProps` interface (used to type the `variant`/`color`/`size`/state values consumed by the `button()` function):

```typescript
export interface ButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, "loading" | "size"> {
  variant?: "outline" | "flat" | "custom";
  color?: "neutral" | "primary" | "secondary" | "test" | "custom";
  size?: "xs" | "sm" | "md" | "lg" | "custom";
  disabled?: boolean;
  loading?: boolean;
  active?: boolean;
  fullWidth?: boolean;
  ariaLabel?: string;
  "data-type"?: string;
  "f-partial"?: string;
}
```

The actual component prop types consumed by `Button`, `ButtonIcon`, and `ButtonProcessing` (`ExtendedButtonProps`, `ExtendedIconButtonProps`, `ExtendedProcessingButtonProps`) live in `lib/types/ui.d.ts` and build on `BaseButtonProps` there, not on the `ButtonProps` above:

```typescript
export interface BaseButtonProps extends BaseComponentProps {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  disabled?: boolean;
  isActive?: boolean;
  href?: string;
  target?: string;
  type?: "button" | "submit" | "reset";
  onClick?: MouseEventHandler<HTMLElement> | ((event: JSX.TargetedEvent<HTMLButtonElement>) => void);
  onMouseEnter?: MouseEventHandler;
  onMouseLeave?: MouseEventHandler;
  onFocus?: JSX.FocusEventHandler<HTMLElement>;
  onBlur?: JSX.FocusEventHandler<HTMLElement>;
  "data-type"?: string;
  "f-partial"?: string;
  role?: string;
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
}

export type ExtendedButtonProps = BaseButtonProps & {
  "f-partial"?: string | SignalLike<string | undefined>;
  isActive?: boolean;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
  ref?: preact.RefObject<HTMLElement> | ((instance: HTMLElement | null) => void) | null;
};

export type ExtendedIconButtonProps = ExtendedButtonProps & {
  isLoading?: boolean;
  ariaLabel?: string;
};

export type ExtendedProcessingButtonProps = ExtendedButtonProps & {
  isSubmitting: boolean;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
};
```

**Note:** `isSubmitting` on `ExtendedProcessingButtonProps` is required, not optional — `ButtonProcessing` always expects callers to pass it explicitly.

`ButtonColor`, `ButtonSize`, and `ButtonVariant` are also exported as standalone types from `lib/constants/uiConstants.ts` and re-exported via `lib/types/ui.d.ts`, so they can be imported independently of the button props interfaces.

### Button Variants Type
```typescript
export interface ButtonVariants {
  base: string;
  variant: Record<"outline" | "flat" | "custom", string>;
  color: Record<"neutral" | "primary" | "secondary" | "test" | "custom", string>;
  size: Record<string, string>;
  state: {
    disabled: string;
    loading: string;
    active: string;
  };
}
```

## Usage Examples

### Basic Button
```tsx
import { Button } from "$button";

export function MyComponent() {
  return (
    <Button variant="outline" color="neutral" size="md">
      CLICK ME
    </Button>
  );
}
```

### Icon Button with Loading State
```tsx
import { ButtonIcon } from "$button";
import { useButtonActions } from "$islands/button/buttonActions.tsx";
import { Icon } from "$icon";

export function IconExample() {
  const { isActive, activeHandlers } = useButtonActions();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <ButtonIcon
      variant="outline"
      color="primary"
      size="md"
      isLoading={isLoading}
      isActive={isActive}
      {...activeHandlers}
      ariaLabel="Favorite"
    >
      <Icon name="heart" size={20} color="currentColor" />
    </ButtonIcon>
  );
}
```

### Processing Button (Form Submission)
```tsx
import { ButtonProcessing } from "$button";
import { useButtonActions } from "$islands/button/buttonActions.tsx";
import { useState } from "preact/hooks";

export function FormExample() {
  const { isActive, activeHandlers } = useButtonActions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await submitData();
    setIsSubmitting(false);
  };

  return (
    <ButtonProcessing
      variant="flat"
      color="primary"
      size="lg"
      isSubmitting={isSubmitting}
      isActive={isActive}
      {...activeHandlers}
      onClick={handleSubmit}
    >
      SUBMIT
    </ButtonProcessing>
  );
}
```

### Flat Primary Button
```tsx
import { Button } from "$button";

export function PremiumButton() {
  return (
    <Button variant="flat" color="primary" size="lg">
      CONNECT WALLET
    </Button>
  );
}
```

### Outline Button as a Link
```tsx
import { Button } from "$button";

export function LearnMoreLink() {
  return (
    <Button variant="outline" color="primary" size="sm" href="/about">
      Learn More →
    </Button>
  );
}
```

### Button as Link with Partial Navigation
```tsx
import { Button } from "$button";

export function NavButton() {
  return (
    <Button
      variant="outline"
      color="neutral"
      size="md"
      href="/stamps"
      f-partial="/stamps"  // Fresh partial navigation
    >
      VIEW STAMPS
    </Button>
  );
}
```

### Toggle Switch
```tsx
import { ToggleSwitchButton } from "$button";
import { useState } from "preact/hooks";

export function SettingsToggle() {
  const [enabled, setEnabled] = useState(false);

  return (
    <ToggleSwitchButton
      isActive={enabled}
      onToggle={() => setEnabled((prev) => !prev)}
      toggleButtonId="notifications-toggle"
    />
  );
}
```

`activeKnobClassName`/`inactiveKnobClassName` default to `bg-color-primary-400`/`bg-color-neutral-400`; pass your own solid `bg-*` class to override (see `FeeCalculatorBase.tsx` for an example).

### Range Slider
```tsx
import { RangeSlider } from "$button";
import { useState } from "preact/hooks";

export function FeeSelector() {
  const [fee, setFee] = useState(50);

  return (
    <RangeSlider
      min={1}
      max={100}
      value={fee}
      onChange={(value) => setFee(value)}
      formatValue={(value) => `${value} sat/vB`}
    />
  );
}
```

### Selector Buttons (Radio Group)

Controlled component: pass `value` and `onChange` (see [SelectorButtonsProps](mdc:lib/types/ui.d.ts)).

```tsx
import { SelectorButtons } from "$button";

export function ViewModeSelector() {
  return (
    <SelectorButtons
      options={[
        { value: "grid", label: "Grid" },
        { value: "list", label: "List" },
      ]}
      value="grid"
      onChange={(value) => console.log(value)}
      size="xs"
      color="neutral"
    />
  );
}
```

`SelectorButtons` only supports `color="neutral"` or `color="primary"` (any other value falls back to `neutral`); it reads directly from `buttonStyles.color` in `styles.ts` rather than the full `ButtonColor` union. Always pass `size="xs"`.

#### SelectorButtons implementation notes ([islands/button/SelectorButtons.tsx](mdc:islands/button/SelectorButtons.tsx))

- **Pill position**: Index-based `left`/`width` with `calc()` against the grid container (`repeat(N, 1fr)`). Do not use `offsetLeft`, `ResizeObserver`, or width transitions for the pill; that caused misalignment and flash when fonts or layout settled.
- **Vertical alignment**: Keep pill inset (`top-*` / `bottom-*` on the absolute pill) in sync with label vertical margin (`my-*`) plus container padding so hover backgrounds line up with the pill.
- **Structure**: Put cursor and `state.disabled` on the option **wrapper** `div` only; keep **label** classes for colour/background only to avoid duplication.
- **Cursor**: Native `<input type="radio">` uses `cursor: default`. Use `cursor-[inherit]` on the invisible input and on the label so `!cursor-pointer` / `!cursor-default` from the wrapper apply when the label stacks above the input.
- **Stamp overview**: [StampOverviewHeader.tsx](mdc:islands/header/StampOverviewHeader.tsx) uses five options (`all`, `classic`, `posh`, `src-721`, `cursed`) with `FrontendStampType` from [stampConstants.ts](mdc:lib/constants/stampConstants.ts); URL `type` and `FilterOptionsStamps` defaults stay aligned with that type union.

## Style System Integration

### CSS Custom Properties Pattern

The button system uses a single CSS custom property, `--color-button`, for dynamic theming. The `color` style sets the variable; the `variant` style consumes it:

```typescript
// Color sets the --color-button custom property
color: {
  primary: `
    [--color-button:var(--color-primary-400)]
  `,
  neutral: `
    [--color-button:var(--color-neutral-400)]
  `,
}

// Variant consumes --color-button
variant: {
  outline: `
    bg-transparent
    border-[0.9px] border-[var(--color-button)] rounded-full
    text-[var(--color-button)]
    hover:bg-[var(--color-button)] hover:text-color-neutral-1000
    backdrop-blur-md
  `,
  flat: `
    bg-[var(--color-button)]
    border-[0.9px] border-[var(--color-button)] rounded-full
    text-color-neutral-1000
    hover:bg-transparent hover:text-[var(--color-button)]
    backdrop-blur-md
  `,
}
```

### State Management

#### Disabled State
- Opacity reduced to 60% (`!opacity-60`)
- Cursor changes to `not-allowed`
- Shows "SOON™" tooltip on hover
- Prevents all interactions

#### Loading State
- Opacity reduced to 60% (`!opacity-60`)
- Cursor changes to `wait`
- Replaces content with spinning loader
- Disables button interactions

#### Active State
- Scales down to 95% (scale-95)
- Creates press-down effect
- Uses transform transition
- Triggered by mouse/touch events

## Technical Implementation

### Style Composition Function
```typescript
export const button = (
  variant: keyof typeof buttonStyles.variant,
  color: keyof typeof buttonStyles.color,
  size: keyof typeof buttonStyles.size,
  state?: {
    disabled?: boolean;
    loading?: boolean;
    active?: boolean;
  }
) => {
  const stateClasses = [];
  if (state?.disabled) stateClasses.push(buttonStyles.state.disabled);
  if (state?.loading) stateClasses.push(buttonStyles.state.loading);
  if (state?.active) stateClasses.push(buttonStyles.state.active);

  return `
    ${buttonStyles.base}
    ${buttonStyles.variant[variant]}
    ${buttonStyles.color[color]}
    ${buttonStyles.size[size]}
    ${stateClasses.join(" ")}
  `;
};
```

### Import and Usage Flow
```
Component Code
      ↓
Import from $button alias
      ↓
Apply variant, color, size props
      ↓
button() function composes styles
      ↓
CSS custom properties applied
      ↓
Tailwind processes at build
      ↓
Rendered with compiled CSS
```

### Toggle & Slider Knob Styles

`styles.ts` also exports a few standalone class strings for the non-`Button` toggle/slider components (all solid colors, no gradients):

```typescript
export const toggleButton = `flex items-center relative w-10 h-5 !rounded-full ...`;
export const toggleKnobBackground = "flex justify-center items-center relative w-5 h-5 ...";
export const toggleKnob =
  "w-[14px] h-[14px] rounded-full cursor-pointer group-hover:bg-color-primary-400";

export const sliderBar = `relative w-full h-5 tablet:h-4 !rounded-full ...`;
export const trackFill = `absolute top-0.5 bottom-0.5 h-[14px] tablet:h-[10px] rounded-full ...`;
export const sliderKnob = `... [&::-webkit-slider-thumb]:bg-color-neutral-400 group-hover:[&::-webkit-slider-thumb]:bg-color-primary-400 ...`;
```

`ToggleSwitchButton.tsx` uses `toggleButton`/`toggleKnob`/`toggleKnobBackground` and accepts `activeKnobClassName`/`inactiveKnobClassName` overrides (default to `bg-color-primary-400` / `bg-color-neutral-400`) if a consumer needs different knob colors (see `FeeCalculatorBase.tsx` for an example override).

## Performance Considerations

- **CSS Custom Properties**: Enables dynamic theming without JavaScript
- **Transition Optimization**: Uses `transitionColors` from layout system
- **GPU Acceleration**: Transform animations use GPU-accelerated properties
- **Lazy Loading**: Island components only hydrate when needed
- **Minimal Re-renders**: Props are memoized where appropriate
- **SSR Safe**: Server-side components render without client-side JavaScript

## Accessibility Features

- **ARIA Labels**: All buttons support `ariaLabel` prop
- **Role Attributes**: Proper role assignment for custom elements
- **Keyboard Navigation**: Full keyboard support (Enter, Space)
- **Focus Management**: Visible focus states on all interactive elements
- **Disabled State**: Properly communicated to screen readers
- **Loading State**: Screen readers announce loading status
- **Color Contrast**: All color palettes meet WCAG AA standards

## Best Practices

### Variant Selection
- **outline**: Secondary/default actions, deselected toggle state
- **flat**: Primary action buttons, call-to-action buttons, selected toggle state
- **custom**: One-off buttons fully styled via `className`

### Color Selection
- **neutral**: Default/most-used color for secondary actions
- **primary**: Optional use, to stand out (brand emphasis, primary CTAs)
- **secondary**: Alternate accent when neither neutral nor primary fits
- **test**: QA/testing-only buttons, not for production UI

### Size Selection
- `md` is the default when `size` is omitted on `Button` and `ButtonProcessing`
- `sm` for compact layouts, mobile interfaces
- `lg` for primary CTAs
- Icon buttons typically use `md` or `lg`

### State Management
- Always use `useButtonActions()` hook for active state
- Manage loading state at component level
- Disable buttons during async operations
- Provide feedback for all state changes

### Performance
- Avoid inline style objects, use className composition
- Use CSS custom properties for dynamic theming
- Leverage island architecture for interactive buttons
- Minimize JavaScript for static buttons

## Common Patterns

### Form Submit Button
```tsx
<ButtonProcessing
  variant="flat"
  color="primary"
  size="lg"
  isSubmitting={isSubmitting}
  type="submit"
>
  SUBMIT
</ButtonProcessing>
```

### Icon-Only Action
```tsx
<ButtonIcon
  variant="outline"
  color="neutral"
  size="md"
  ariaLabel="Close"
  onClick={handleClose}
>
  <Icon name="close" size={20} />
</ButtonIcon>
```

### Navigation Button with Partial
```tsx
<Button
  variant="outline"
  color="neutral"
  size="md"
  href="/collection/bitcoin-stamps"
  f-partial="/collection/bitcoin-stamps"
>
  VIEW COLLECTION
</Button>
```

### Toggle Button Group
```tsx
<div class="flex gap-2">
  <Button
    variant={selected === 'grid' ? 'flat' : 'outline'}
    color="primary"
    size="sm"
    onClick={() => setSelected('grid')}
  >
    GRID
  </Button>
  <Button
    variant={selected === 'list' ? 'flat' : 'outline'}
    color="primary"
    size="sm"
    onClick={() => setSelected('list')}
  >
    LIST
  </Button>
</div>
```

For controlled multi-option toggles like this, prefer the dedicated `SelectorButtons` or `ToggleButton` island components (they handle the pill/selection styling for you) over hand-rolling variant switching on a raw `Button`.

## Troubleshooting

### Issue: Button styles not applying
**Solution**: Ensure you're importing from `$button` alias and using valid variant/color/size combinations.

### Issue: Active state not working
**Solution**: Make sure you're spreading `{...activeHandlers}` from `useButtonActions()` hook and passing `isActive` prop.

### Issue: Loading spinner not showing
**Solution**: For `ButtonIcon`, use `isLoading` prop. For `ButtonProcessing`, use `isSubmitting` prop. Regular `Button` doesn't have built-in loading state.


### Issue: Button not clickable
**Solution**: Check if button is disabled or in loading state. Verify `IS_BROWSER` check isn't blocking interaction.

### Issue: Custom colors not working
**Solution**: When using `color="custom"`, you need to define custom properties manually via className or inline styles.

## Related Components

- **Icon System**: Used in ButtonIcon and icon-based interactions ([icon/doc.md](mdc:components/icon/doc.md))
- **Layout System**: Provides glassmorphism and shadow styles ([layout/doc.md](mdc:components/layout/doc.md))
- **Form Components**: Buttons integrate with form validation ([form/doc.md](mdc:components/form/doc.md))
- **Notification System**: Buttons trigger toast notifications ([notification/doc.md](mdc:components/notification/doc.md))

---

**Last Updated:** August 23, 2026
**Author:** baba
