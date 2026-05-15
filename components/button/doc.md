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

| Variant | Visual Style | Use Case | Example |
|---------|-------------|----------|---------|
| **outline** | Semi-transparent with blur, border changes on hover | Primary interactive buttons | Filter, Sort, Navigation |
| **flat** | Gradient overlay with color blur effect | Colorful call-to-action buttons | Submit, Mint, Create |
| **flatOutline** | Gradient background, solid on selected | Toggle buttons (selected state) | Active filters, tabs |
| **outlineFlat** | Transparent, gradient on hover | Toggle buttons (deselected state) | Inactive filters, tabs |
| **text** | No background, text only | Inline links and subtle actions | Read more, View all |
| **outline** | Transparent with border | Secondary actions | Cancel, Close |
| **flat** | Solid gradient background | Legacy style (to be removed) | - |

### Color Palettes

The button system uses a 5-step gradient color system with CSS variables, providing smooth color transitions from dark to light shades. See [Layout System Documentation](mdc:components/layout/doc.md#tailwind-color-system) for the complete Tailwind color palette.

#### Grey (Default)
```css
/* 5-step gradient system */
--color-button-dark: var(--color-grey-dark)           /* #585552 */
--color-button-semidark: var(--color-grey-semidark)   /* #817e78 */
--color-button: var(--color-grey)                     /* #a8a39d */
--color-button-semilight: var(--color-grey-semilight) /* #d1cbc3 */
--color-button-light: var(--color-grey-light)         /* #f9f2e9 */
```

**Usage:** Neutral actions, default state, secondary buttons

#### Purple
```css
/* 5-step gradient system */
--color-button-dark: var(--color-purple-dark)           /* #43005c */
--color-button-semidark: var(--color-purple-semidark)   /* #610085 */
--color-button: var(--color-purple)                     /* #7f00ad */
--color-button-semilight: var(--color-purple-semilight) /* #9d00d6 */
--color-button-light: var(--color-purple-light)         /* #BB00FF */
```

**Usage:** Primary brand actions, emphasis, call-to-action buttons

**Note:** These CSS variables are defined in `tailwind.config.ts` as Tailwind color classes (e.g., `color-purple-dark`, `color-grey-light`) and referenced in button styles via the `color` prop which applies them dynamically.

### Size Options

| Size | Height | Padding | Font Size | Use Case |
|------|--------|---------|-----------|----------|
| **xxs** | 26px | 14px | 10px | Compact UI elements |
| **xs** | 30px | 14px | 12px | Small buttons |
| **sm** | 34px | 16px | 12px | Regular small buttons |
| **md** | 38px | 16px | 14px | Standard medium buttons |
| **lg** | 42px | 16px | 14px | Large buttons |
| **xl** | 46px | 20px | 16px | Extra large buttons |
| **xxl** | 50px | 24px | 18px | Hero buttons |
| **xxsR** | 26px/22px* | 14px | 10px | Responsive tiny buttons |
| **xsR** | 30px/26px* | 14px | 12px/10px* | Responsive small buttons |
| **smR** | 34px/30px* | 16px | 12px | Responsive regular buttons |
| **mdR** | 38px/34px* | 16px | 14px/12px* | Responsive medium (default) |
| **lgR** | 42px/38px* | 16px | 14px | Responsive large buttons |

*Responsive sizes: mobile/tablet

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
    - 9 button variants with glassmorphism effects
    - 2 color palettes (grey, purple) with 5-step gradients using CSS custom properties
    - 11 size options including responsive variants
    - State management (disabled, loading, active)
    - Animated gradient overlays

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
  - **Purpose**: iOS-style toggle switch with glassmorphism
  - **Props**: `checked`, `onChange`, `disabled`, `label`
  - **Features**: Smooth animations, accessible keyboard navigation

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

### Hooks & Utilities

- **buttonActions.tsx**: Active state management hook
  - **Hook**: `useButtonActions()`
  - **Returns**: `{ isActive, activeHandlers }`
  - **Purpose**: Provides mouse down/up/leave handlers for button press animations
  - **Usage**: Creates tactile feedback on button interactions

## Type Definitions

### Button Props
```typescript
export interface ButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, "loading" | "size"> {
  variant?: "text" | "outline" | "flat" | "flatOutline" |
            "outlineFlat";
  color?: "grey" | "purple" | "test" | "custom";
  size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl" |
         "xxsR" | "xsR" | "smR" | "mdR" | "lgR" | "custom";
  disabled?: boolean;
  loading?: boolean;
  active?: boolean;
  fullWidth?: boolean;
  ariaLabel?: string;
  "data-type"?: string;
  "f-partial"?: string;
}

export interface ExtendedButtonProps extends ButtonProps {
  isActive?: boolean;
  href?: string;
}

export interface ExtendedIconButtonProps extends ButtonProps {
  isLoading?: boolean;
  isActive?: boolean;
  href?: string;
}

export interface ExtendedProcessingButtonProps extends ButtonProps {
  isSubmitting?: boolean;
  isActive?: boolean;
  href?: string;
}
```

### Button Variants Type
```typescript
export interface ButtonVariants {
  base: string;
  variant: Record<string, string>;
  color: Record<string, string>;
  size: Record<string, string>;
  textSize: Record<string, string>;
  state: {
    disabled: string;
    loading: string;
    active: string;
  };
  spinner: string;
}
```

## Usage Examples

### Basic Button
```tsx
import { Button } from "$button";

export function MyComponent() {
  return (
    <Button variant="outline" color="grey" size="mdR">
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
      color="purple"
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
      color="purple"
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

### Outline Gradient Button (Animated Border)
```tsx
import { Button } from "$button";

export function PremiumButton() {
  return (
    <Button variant="flat" color="purple" size="xl">
      CONNECT WALLET
    </Button>
  );
}
```

### Text Button (Link Style)
```tsx
import { Button } from "$button";

export function TextLinkButton() {
  return (
    <Button variant="text" color="purple" size="sm" href="/about">
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
      color="grey"
      size="mdR"
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
      checked={enabled}
      onChange={(checked) => setEnabled(checked)}
      label="Enable Notifications"
    />
  );
}
```

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
      label="Transaction Fee"
      unit="sat/vB"
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
      size="smR"
      color="grey"
    />
  );
}
```

#### SelectorButtons implementation notes ([islands/button/SelectorButtons.tsx](mdc:islands/button/SelectorButtons.tsx))

- **Pill position**: Index-based `left`/`width` with `calc()` against the grid container (`repeat(N, 1fr)`). Do not use `offsetLeft`, `ResizeObserver`, or width transitions for the pill; that caused misalignment and flash when fonts or layout settled.
- **Vertical alignment**: Keep pill inset (`top-*` / `bottom-*` on the absolute pill) in sync with label vertical margin (`my-*`) plus container padding so hover backgrounds line up with the pill.
- **Structure**: Put cursor and `state.disabled` on the option **wrapper** `div` only; keep **label** classes for colour/background only to avoid duplication.
- **Cursor**: Native `<input type="radio">` uses `cursor: default`. Use `cursor-[inherit]` on the invisible input and on the label so `!cursor-pointer` / `!cursor-default` from the wrapper apply when the label stacks above the input.
- **Stamp overview**: [StampOverviewHeader.tsx](mdc:islands/header/StampOverviewHeader.tsx) uses five options (`all`, `classic`, `posh`, `src-721`, `cursed`) with `FrontendStampType` from [stampConstants.ts](mdc:lib/constants/stampConstants.ts); URL `type` and `FilterOptionsStamp` defaults stay aligned with that type union.

## Style System Integration

### CSS Custom Properties Pattern

The button system uses CSS custom properties for dynamic theming:

```typescript
// Color palette applied via className
color: {
  purple: `
    [--color-dark:#AA00FF66]
    [--color-medium:#AA00FF99]
    [--color-light:#AA00FFCC]
    [--color-border:#66009966]
    [--color-border-hover:#660099CC]
    [--color-text:#660099]
    [--color-text-hover:#8800CC]
  `
}

// Used in variant styles
variant: {
  outline: `
    border-[var(--color-border)]
    hover:border-[var(--color-border-hover)]
    text-[var(--color-text)]
    hover:text-[var(--color-text-hover)]
  `
}
```

### State Management

#### Disabled State
- Opacity reduced to 50%
- Cursor changes to `not-allowed`
- Shows "SOON™" tooltip on hover
- Prevents all interactions

#### Loading State
- Opacity reduced to 70%
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

### Gradient Animation (outlineGradient)
```css
/* Conic gradient with CSS animation */
before:bg-[conic-gradient(from_var(--angle),
  var(--color-button-dark),
  var(--color-button),
  var(--color-button-light),
  var(--color-button),
  var(--color-button-dark))]
before:[--angle:0deg]
before:animate-rotate

/* Hover state brightens all stops */
hover:before:bg-[conic-gradient(from_var(--angle),
  var(--color-button-light),
  var(--color-button-light),
  var(--color-button-light),
  var(--color-button-light),
  var(--color-button-light))]
```

### glassmorphismColor Gradient Overlay
```css
/* Multi-stop gradient creating depth */
before:bg-[linear-gradient(to_bottom_right,
  var(--color-button-dark) 0%,
  var(--color-button-dark) 20%,
  var(--color-button) 20%,
  var(--color-button) 45%,
  var(--color-button-light) 45%,
  var(--color-button-light) 52%,
  var(--color-button) 52%,
  var(--color-button) 70%,
  var(--color-button-dark) 70%,
  var(--color-button-dark) 100%)]

/* Blur and scale on hover */
before:blur-sm
hover:before:scale-105
```

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
- **outline**: Secondary buttons
- **flat**: Primary action buttons, call-to-action buttons
- **flatOutline/outlineFlat**: Toggle states, Toggle and Selector buttons
- **text**: Inline links, secondary actions

### Color Selection
- **grey**: Mainly used
- **purple**: Optional use, to stand out

### Size Selection
- Use responsive sizes (`mdR`, `lgR`) for adaptive UI
- `md` or `mdR` as default for most buttons
- `sm` for compact layouts, mobile interfaces
- `lg` or `xl` for primary CTAs
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
  color="purple"
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
  color="grey"
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
  color="grey"
  size="mdR"
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
    variant={selected === 'grid' ? 'flatOutline' : 'outlineFlat'}
    color="purple"
    size="sm"
    onClick={() => setSelected('grid')}
  >
    GRID
  </Button>
  <Button
    variant={selected === 'list' ? 'flatOutline' : 'outlineFlat'}
    color="purple"
    size="sm"
    onClick={() => setSelected('list')}
  >
    LIST
  </Button>
</div>
```

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

**Last Updated:** October 6, 2025
**Author:** baba
