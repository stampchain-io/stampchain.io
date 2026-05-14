# Text System Documentation

## Overview

The Text system provides a comprehensive typography solution with consistent styling, gradient effects, and responsive behavior across the application. Built with composable constants and Tailwind CSS, it offers a complete range of text styles for logos, navigation, titles, headings, body text, labels, values, and specialized card layouts following the app's dark-themed design principles.

## Architecture

### Component Hierarchy
```
┌─────────────────────────────────────────────────────┐
│  Base Font Styles (styles.ts)                       │
│  - logoFont, titleFont, subtitleFont                │
│  - textFont, labelFont, valueFont                   │
│  - Global modifiers and transitions                 │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│  Gradient Overlays & Custom Classes                 │
│  - Purple gradients (LD/DL variants)                │
│  - Grey gradients (LD/DL variants)                  │
│  - Tailwind custom utilities                        │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│  Composed Text Styles                               │
│  - Logo: 4 variants with gradients                  │
│  - Navigation: 8 variants (desktop/mobile)          │
│  - Titles: 4 gradient variants                      │
│  - Headings: 6 variants with links                  │
│  - Body: 8 sizes + link variants                    │
│  - Labels: 9 variants + responsive                  │
│  - Values: 17 variants (grey/purple/dark/glow)      │
│  - Cards: 10 specialized card text styles           │
│  - Special: 3 utility styles                        │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│  Application Integration                            │
│  - Page layouts and headers                         │
│  - Navigation menus                                 │
│  - Data displays and tables                         │
│  - Card components                                  │
│  - Interactive elements                             │
└─────────────────────────────────────────────────────┘
```

## Design Principles

### Naming Convention

**Format**: `[purpose][color]/[size][modifier]`

- **Purpose**: logo, nav, title, subtitle, heading, text, label, value, card
- **Color**: Grey, Purple, Transparent, Dark
- **Direction**: LD (Light to Dark), DL (Dark to Light)
- **Size**: Xxs, Xs, Sm, (base), Lg, Xl, 2xl, 3xl, 5xl, 7xl
- **Modifier**: Link, Active, Responsive (R), Minimal, Glow, Position

**Examples**:
- `titleNeutral` = Title style with grey gradient from light to dark
- `navLinkPurpleActive` = Purple navigation link in active state
- `valueSmLink` = Small value with link hover effect
- `cardStampNumberMinimal` = Minimal card variant for stamp numbers

### Base Font Styles

```typescript
// Core typography foundations
const logoFont = "font-black italic text-3xl tracking-wide inline-block w-fit";
const titleFont = "font-black text-3xl tracking-wide inline-block w-fit";
const subtitleFont = "font-extralight text-2xl mb-2";
const textFont = "font-normal text-color-grey-light";
const labelFont = "font-light text-color-grey-semidark tracking-wide";
const valueFont = "font-medium text-color-grey-light";

// Global modifiers
const select = "select-none whitespace-nowrap";
const transitionColors = "transition-colors duration-200";
```

**Color Usage:**
- `text-color-grey-light` (#f9f2e9): Primary text color for body content and values
- `text-color-grey-semidark` (#817e78): Subdued text color for labels and secondary content
- Gradients applied via custom utilities for logos, titles, and headings

### Color System

The text system uses a comprehensive **5-step gradient color system** with dual definitions for maximum flexibility. See [Layout System Documentation](mdc:components/layout/doc.md#tailwind-color-system) for complete details.

#### Dual Definition System

Colors are defined in **two formats** within `tailwind.config.ts`:

1. **Tailwind Color Classes** - Object notation for direct use in JSX
   ```typescript
   colors: {
     color: {
       purple: {
         dark: "#43005c",
         semidark: "#610085",
         DEFAULT: "#7f00ad",
         semilight: "#9d00d6",
         light: "#BB00FF",
       }
     }
   }
   ```

2. **CSS Variables** - For gradients and dynamic styling
   ```css
   ":root": {
     "--color-purple-dark": "#43005c",
     "--color-purple-semidark": "#610085",
     "--color-purple": "#7f00ad",
     "--color-purple-semilight": "#9d00d6",
     "--color-purple-light": "#BB00FF",
   }
   ```

#### When to Use Each Format

**Use Tailwind Classes** (`color-purple-dark`) when:
- Styling directly in JSX/TSX className attributes
- Using with Tailwind utility classes (e.g., `text-color-purple-light`)
- Need IntelliSense autocomplete in editors

**Use CSS Variables** (`var(--color-purple-dark)`) when:
- Creating gradient effects (as seen in gradient classes below)
- Dynamic styling with JavaScript/TypeScript
- Using in custom CSS or inline styles

#### Color Families

```typescript
// Purple (brand color)
color-purple-dark      // #43005c
color-purple-semidark  // #610085
color-purple           // #7f00ad (DEFAULT)
color-purple-semilight // #9d00d6
color-purple-light     // #BB00FF

// Grey (neutral)
color-grey-dark        // #585552
color-grey-semidark    // #817e78
color-grey             // #a8a39d (DEFAULT)
color-grey-semilight   // #d1cbc3
color-grey-light       // #f9f2e9

// Semantic Colors (for value indicators)
color-red-semilight    // #d60000 (negative values)
color-green-semilight  // #00d600 (positive values)
```

### Gradient System

All gradients use the 5-step color system defined as CSS variables:

| Gradient | Direction | Color Steps | Usage |
|----------|-----------|------------|-------|
| **color-grey-gradientLD** | Light → Dark | `light → semilight → DEFAULT → semidark → dark` | Titles, headings, card numbers |
| **color-grey-gradientLD-hover** | Light → Dark with hover | Same + hover to `light` | Interactive headings, links |
| **color-grey-gradientDL** | Dark → Light | `dark → semidark → DEFAULT → semilight → light` | Alternative title style |
| **color-grey-gradientDL-hover** | Dark → Light with hover | Same + hover to `light` | Collection/stamp page headings |
| **color-purple-gradientLD** | Light → Dark | `light → semilight → DEFAULT → semidark → dark` | Primary titles, header logo |
| **color-purple-gradientLD-hover** | Light → Dark with hover | Same + hover to `light` | Interactive logo |
| **color-purple-gradientDL** | Dark → Light | `dark → semidark → DEFAULT → semilight → light` | Footer logo, alt variations |
| **color-purple-gradientDL-hover** | Dark → Light with hover | Same + hover to `light` | Interactive footer logo |

### Hover Effects

| Effect | Implementation | Use Case |
|--------|---------------|----------|
| **-hover suffix** | Gradient color change on hover | Interactive headings, links |
| **transitionColors** | 200ms color transition | Smooth hover animations |
| **animated-underline** | Growing underline animation | Text links |
| **cursor-pointer** | Pointer cursor on hover | Clickable elements |

## Style Categories

### Logo Styles (4 variants)

```typescript
// Footer logo - Dark to Light gradient
logoPurpleDL: "font-black italic text-3xl color-purple-gradientDL select-none"
// Colors: #43005c → #610085 → #7f00ad → #9d00d6 → #BB00FF

// Footer logo with hover - Interactive
logoPurpleDLLink: "font-black italic text-3xl color-purple-gradientDL-hover transition-colors cursor-pointer"
// Hover: Gradient → solid #BB00FF

// Alternative gradient - Light to Dark
logoPurpleLD: "font-black italic text-3xl color-purple-gradientLD select-none"
// Colors: #BB00FF → #9d00d6 → #7f00ad → #610085 → #43005c

// Header logo - Light to Dark with hover
logoPurpleLDLink: "font-black italic text-3xl color-purple-gradientLD-hover transition-colors cursor-pointer"
// Hover: Gradient → solid #BB00FF
```

### Navigation Styles (8 variants)

#### Desktop Navigation
```typescript
// Purple navigation link
navLinkPurple: "font-semibold text-color-purple-semilight text-sm group-hover:text-color-purple-light"
// Default: #9d00d6 | Hover: #BB00FF

// Active state
navLinkPurpleActive: "!text-color-purple-light hover:!text-color-purple-semilight"
// Active: #BB00FF | Hover: #9d00d6

// Sublink (dropdown menus)
navSublinkPurple: "font-light text-color-purple-semilight text-[13px] hover:text-color-purple-light"
// Default: #9d00d6 | Hover: #BB00FF

// Sublink active
navSublinkPurpleActive: "!text-color-purple-light hover:!text-color-purple-semilight"
// Active: #BB00FF | Hover: #9d00d6
```

#### Mobile Navigation
```typescript
// Grey mobile link
navLinkGrey: "font-semibold text-sm text-color-grey hover:text-color-grey-light"
// Default: #a8a39d | Hover: #f9f2e9

// Active state
navLinkGreyActive: "!text-color-grey-light hover:!text-color-grey"
// Active: #f9f2e9 | Hover: #a8a39d

// Mobile menu items with gradient
navLinkGreyLD: "font-light text-xl color-grey-gradientLD-hover tracking-wider"
// Gradient: #f9f2e9 → #d1cbc3 → #a8a39d → #817e78 → #585552 | Hover: #f9f2e9

// Active gradient link
navLinkGreyLDActive: "text-color-grey-light [background:none !important]"
// Color: #f9f2e9 (solid, no gradient)
```

#### Footer Navigation
```typescript
// Transparent text for overlay use
navLinkTransparentPurple: "font-light text-[13px] hover:text-color-purple-light"
// Hover: #BB00FF
```

### Title Styles (4 variants)

```typescript
// Grey Light to Dark (primary)
titleNeutral: "font-black text-3xl color-grey-gradientDL cursor-default"

// Grey Dark to Light (alternative)
titleNeutralDL: "font-black text-3xl color-grey-gradientLD cursor-default"

// Purple Light to Dark
titlePrimary: "font-black text-3xl color-purple-gradientLD cursor-default"

// Purple Dark to Light
titlePrimaryDL: "font-black text-3xl color-purple-gradientDL cursor-default"
```

### Subtitle Styles (2 variants)

```typescript
// Grey subtitle
subtitleNeutral: "font-extralight text-2xl text-color-grey-light mb-2"
// Color: #f9f2e9

// Purple subtitle
subtitlePrimary: "font-extralight text-2xl text-color-purple-light mb-2"
// Color: #BB00FF
```

### Heading Styles (6 variants)

```typescript
// Large grey heading (about page donate section)
headingGrey2: "font-black text-3xl mobileLg:text-4xl text-color-grey-light"
// Color: #f9f2e9

// Grey gradient heading
headingGreyLD: "font-bold text-xl color-grey-gradientLD tracking-wide"
// Gradient: #f9f2e9 → #d1cbc3 → #a8a39d → #817e78 → #585552

// Grey gradient heading with link
headingGreyLDLink: "font-bold text-lg color-grey-gradientLD-hover tracking-wide cursor-pointer"
// Gradient: #f9f2e9 → ... → #585552 | Hover: #f9f2e9 solid

// Dark to Light gradient link (collection/stamp pages)
headingGreyDLLink: "font-bold text-lg color-grey-gradientDL-hover tracking-wide cursor-pointer"
// Gradient: #585552 → ... → #f9f2e9 | Hover: #f9f2e9 solid

// Standard grey heading
headingGrey: "font-bold text-2xl text-color-grey"
// Color: #a8a39d

// Purple gradient (team banner)
headingPurpleLD: "font-black text-sm mobileMd:text-lg color-purple-gradientLD text-center"
// Gradient: #BB00FF → #9d00d6 → #7f00ad → #610085 → #43005c
```

### Body Text Styles (9 variants)

All body text uses `text-color-grey-light` (#f9f2e9) as the base color:

```typescript
// Size variants
textXxs: "font-normal text-color-grey-light text-[10px]"
textXs: "font-normal text-color-grey-light text-xs"
textSm: "font-normal text-color-grey-light text-sm"
text: "font-normal text-color-grey-light text-base"      // Default
textLg: "font-normal text-color-grey-light text-lg"
textXl: "font-normal text-color-grey-light text-xl"
text2xl: "font-normal text-color-grey-light text-2xl"

// Link variants
textSmLink: "text-sm hover:text-color-purple-light transition-colors cursor-pointer"
// Hover: #BB00FF

textLinkUnderline: "font-bold text-base text-color-grey-light animated-underline"
// Base: #f9f2e9 with underline animation
```

### Label Styles (10 variants)

Most labels use `text-color-grey-semidark` (#817e78) for subdued secondary text:

```typescript
// Size variants
labelXxs: "font-light text-color-grey-semidark tracking-wide text-[10px]"
labelXs: "font-light text-color-grey-semidark tracking-wide text-xs"
labelSm: "font-light text-color-grey-semidark tracking-wide text-sm"
label: "font-light text-color-grey-semidark tracking-wide text-base"
labelLg: "font-light text-color-grey-semidark tracking-wide text-lg"
labelXl: "font-light text-color-grey-semidark tracking-wide text-xl"

// Responsive variants
labelXsR: "text-xs tablet:text-[10px]"                  // Filter file type labels
labelXsPosition: "flex justify-end mt-1 tablet:mt-0"    // Label positioning

// Special variants
labelLightSm: "font-light text-sm text-color-grey"
// Color: #a8a39d

labelSmPurple: "font-light text-sm text-color-purple-light tracking-wide mb-0.5"
// Color: #BB00FF

// Logic-based responsive (filter labels)
// Uses text-color-grey (#a8a39d) and text-color-grey-light (#f9f2e9)
labelLogicResponsive: (checked, canHoverSelected) => string
```

### Value Styles (17 variants)

#### Grey Variants
Primary value text color is `text-color-grey-light` (#f9f2e9):

```typescript
valueXs: "font-medium text-color-grey-light text-xs"
valueSm: "font-medium text-color-grey-light text-sm"
value: "font-medium text-color-grey-light text-base"
valueLg: "font-medium text-color-grey-light text-lg"
valueXl: "font-black text-xl text-color-grey-light -mt-1"
value2xl: "font-black text-2xl text-color-grey-light -mt-1"
value3xl: "font-black text-3xl text-color-grey-light -mt-1"

// Link variant
valueSmLink: "font-medium text-sm hover:text-color-purple-light cursor-pointer"
// Hover: #BB00FF
```

#### Transparent Variants
Used in DetailsTableBase for color-agnostic layouts:

```typescript
value2xlTransparent: "font-black text-2xl -mt-1"
value3xlTransparent: "font-black text-3xl -mt-1"
```

#### Purple Variants
Using the purple color palette:

```typescript
valueSmPurple: "font-medium text-xs text-color-purple text-center"
// Color: #7f00ad

// Glow effects with purple stroke (about page header)
value2xlPurpleGlow: "font-black text-2xl text-black text-stroke-glow-small"
value5xlPurpleGlow: "font-black text-5xl text-black text-stroke-glow-small"
value7xlPurpleGlow: "font-black text-7xl text-black text-stroke-glow-large"
// Glow colors: #8800CC (inner), #AA00FF (outer stroke)
```

#### Dark Variants
Using `text-color-grey-semidark` (#817e78) for subdued values:

```typescript
valueDarkXs: "font-medium text-xs text-color-grey-semidark tracking-tighter"
valueDarkSm: "font-medium text-sm text-color-grey-semidark tracking-tighter"
valueDark: "font-semibold text-base text-color-grey-semidark"
```

#### Color Indicators
Semantic colors for value states (gains/losses):

```typescript
valuePositive: "text-color-green-semilight"      // #00d600 - Gains, positive changes
valueNegative: "text-color-red-semilight"        // #d60000 - Losses, negative changes
valueNeutral: "text-color-grey-semidark"         // #817e78 - Neutral state
```

### Card Text Styles (10 variants)

#### Standard Card Styles
Default stamp/token card text styles:

```typescript
cardHashSymbol: "font-light text-color-purple-light text-lg mobileLg:text-xl"
// Color: #BB00FF

cardStampNumber: "font-extrabold text-color-purple-light truncate text-lg mobileLg:text-xl"
// Color: #BB00FF

cardCreator: "font-semibold text-color-grey-light break-words text-center text-xs mobileMd:text-sm"
// Color: #f9f2e9

cardPrice: "font-normal text-color-grey-light text-nowrap text-xs mobileLg:text-sm"
// Color: #f9f2e9

cardMimeType: "font-normal text-color-grey text-nowrap text-xs mobileLg:text-sm"
// Color: #a8a39d

cardSupply: "font-medium text-color-grey text-right text-xs mobileLg:text-base"
// Color: #a8a39d
```

#### Minimal Card Variant
Compact card style with gradient effects:

```typescript
cardHashSymbolMinimal: "font-light text-color-grey-light group-hover:text-color-purple-light"
// Default: #f9f2e9 | Hover: #BB00FF

cardStampNumberMinimal: "font-black color-grey-gradientDL group-hover:[-webkit-text-fill-color:var(--color-purple-light)] truncate"
// Gradient: #585552 → ... → #f9f2e9 | Hover: #BB00FF solid

cardPriceMinimal: "font-normal text-color-grey truncate text-[10px] mobileMd:text-xs"
// Color: #a8a39d
```

#### Grey Gradient Card Variant
Alternative card style with grey-to-purple hover:

```typescript
cardHashSymbolGrey: "font-light text-color-grey group-hover:text-color-purple-light text-lg"
// Default: #a8a39d | Hover: #BB00FF

cardStampNumberGrey: "font-black color-grey-gradientDL group-hover:[-webkit-text-fill-color:var(--color-purple-light)] truncate"
// Gradient: #585552 → ... → #f9f2e9 | Hover: #BB00FF solid
```

### Special Styles (4 variants)

```typescript
// Gradient overlay (requires transparent text)
// Used for text overlay effects on footer links
overlayPurple: "bg-gradient-to-l from-color-purple-semilight/80 via-color-purple-semilight/90 to-color-purple-semilight tablet:bg-gradient-to-r text-transparent bg-clip-text"
// Gradient: #9d00d6 with varying opacity (80%, 90%, 100%)

// Footer tagline
tagline: "font-regular text-xs bg-gradient-to-r from-color-purple-light via-color-purple-semilight to-color-purple-semidark text-transparent bg-clip-text"
// Gradient: #BB00FF → #9d00d6 → #610085

// Footer copyright
copyright: "font-normal text-xs mobileMd:text-sm tablet:text-xs text-color-grey-dark"
// Color: #585552

// Toggle switch symbol
toggleSymbol: "font-bold text-[10px] text-black"
// Used in ToggleSwitchButton for $/BTC symbols
```

## Type Definitions

### TextStyles Type
```typescript
export type TextStyles = {
  // Overlay styles
  overlayPurple: string;

  // Logo styles (4)
  logoPurpleDL: string;
  logoPurpleDLLink: string;
  logoPurpleLD: string;
  logoPurpleLDLink: string;

  // Navigation styles (8)
  navLinkPurple: string;
  navLinkPurpleActive: string;
  navSublinkPurple: string;
  navSublinkPurpleActive: string;
  navLinkGrey: string;
  navLinkGreyLD: string;
  navLinkGreyLDActive: string;
  navLinkTransparentPurple: string;

  // Title styles (4)
  titleNeutral: string;
  titleNeutralDL: string;
  titlePrimary: string;
  titlePrimaryDL: string;

  // Subtitle styles (2)
  subtitleNeutral: string;
  subtitlePrimary: string;

  // Heading styles (6)
  headingGrey2: string;
  headingGreyLD: string;
  headingGreyLDLink: string;
  headingGreyDLLink: string;
  headingGrey: string;
  headingPurpleLD: string;

  // Body text styles (9)
  textXxs: string;
  textXs: string;
  textSm: string;
  textSmLink: string;
  text: string;
  textLg: string;
  textXl: string;
  text2xl: string;
  textLinkUnderline: string;

  // Label styles (10)
  labelXxs: string;
  labelXs: string;
  labelSm: string;
  label: string;
  labelLg: string;
  labelXl: string;
  labelXsR: string;
  labelXsPosition: string;
  labelLightSm: string;
  labelSmPurple: string;
  labelLogicResponsive: (checked: boolean, canHoverSelected: boolean) => string;

  // Value styles (17)
  valueXs: string;
  valueSm: string;
  valueSmLink: string;
  value: string;
  valueLg: string;
  valueXl: string;
  value2xl: string;
  value3xl: string;
  value2xlTransparent: string;
  value3xlTransparent: string;
  valueSmPurple: string;
  value2xlPurpleGlow: string;
  value5xlPurpleGlow: string;
  value7xlPurpleGlow: string;
  valueDarkXs: string;
  valueDarkSm: string;
  valueDark: string;
  valuePositive: string;
  valueNegative: string;
  valueNeutral: string;

  // Special styles
  tagline: string;
  copyright: string;
  toggleSymbol: string;

  // Card styles (10)
  cardHashSymbol: string;
  cardStampNumber: string;
  cardCreator: string;
  cardPrice: string;
  cardMimeType: string;
  cardSupply: string;
  cardHashSymbolMinimal: string;
  cardStampNumberMinimal: string;
  cardPriceMinimal: string;
  cardHashSymbolGrey: string;
  cardStampNumberGrey: string;
};
```

## Usage Examples

### Page Layout
```tsx
import { titleNeutral, subtitleNeutral, text } from "$text";

export function PageHeader() {
  return (
    <div class="flex flex-col gap-4">
      <h1 class={titleNeutral}>Explore Bitcoin Stamps</h1>
      <h2 class={subtitleNeutral}>Digital Artifacts on Bitcoin</h2>
      <p class={text}>
        Discover unique digital stamps permanently embedded on the Bitcoin blockchain
      </p>
    </div>
  );
}
```

### Navigation Menu
```tsx
import { navLinkPurple, navLinkPurpleActive } from "$text";

export function Navigation({ currentPath }) {
  return (
    <nav class="flex gap-6">
      <a
        href="/explore"
        class={currentPath === '/explore' ? navLinkPurpleActive : navLinkPurple}
      >
        EXPLORE
      </a>
      <a
        href="/tools"
        class={currentPath === '/tools' ? navLinkPurpleActive : navLinkPurple}
      >
        TOOLS
      </a>
    </nav>
  );
}
```

### Data Display
```tsx
import { labelSm, value2xl } from "$text";

export function StatsDisplay({ label, value }) {
  return (
    <div class="flex flex-col gap-2">
      <span class={labelSm}>{label}</span>
      <span class={value2xl}>{value}</span>
    </div>
  );
}
```

### Interactive Link
```tsx
import { headingGreyLDLink } from "$text";

export function ArticleHeading({ title, href }) {
  return (
    <a href={href}>
      <h3 class={headingGreyLDLink}>{title}</h3>
    </a>
  );
}
```

### Card Component
```tsx
import { cardHashSymbol, cardStampNumber, cardCreator } from "$text";

export function StampCard({ stamp }) {
  return (
    <div class="flex flex-col items-center gap-2">
      <div class="flex items-center gap-1">
        <span class={cardHashSymbol}>#</span>
        <span class={cardStampNumber}>{stamp.number}</span>
      </div>
      <span class={cardCreator}>{stamp.creator}</span>
    </div>
  );
}
```

### Logo with Link
```tsx
import { logoPurpleLDLink } from "$text";

export function HeaderLogo() {
  return (
    <a href="/" class={logoPurpleLDLink}>
      STAMPCHAIN
    </a>
  );
}
```

### Text with Underline Animation
```tsx
import { textLinkUnderline } from "$text";

export function ReadMoreLink({ href }) {
  return (
    <a href={href} class={textLinkUnderline}>
      Read More →
    </a>
  );
}
```

### Gradient Overlay Effect
```tsx
import { overlayPurple, navLinkTransparentPurple } from "$text";

export function FooterLinks() {
  return (
    <div class={overlayPurple}>
      <a href="/about" class={navLinkTransparentPurple}>ABOUT</a>
      <a href="/contact" class={navLinkTransparentPurple}>CONTACT</a>
    </div>
  );
}
```

### Value with Color Indicator
```tsx
import { valueLg, valuePositive, valueNegative } from "$text";

export function PriceChange({ change }) {
  const colorClass = change > 0 ? valuePositive : valueNegative;

  return (
    <span class={`${valueLg} ${colorClass}`}>
      {change > 0 ? '+' : ''}{change}%
    </span>
  );
}
```

### Responsive Label Logic
```tsx
import { labelLogicResponsive } from "$text";

export function FilterLabel({ checked, label }) {
  return (
    <span class={labelLogicResponsive(checked, true)}>
      {label}
    </span>
  );
}
```

## Technical Implementation

### Style Composition Pattern

```typescript
// Base styles are composed with modifiers using new color system
const textFont = "font-normal text-color-grey-light";  // #f9f2e9
const transitionColors = "transition-colors duration-200";

// Final composed style
export const textSmLink = `${textFont} text-sm hover:text-color-purple-light ${transitionColors} cursor-pointer`;
// Base: #f9f2e9 | Hover: #BB00FF

// Example with gradient
export const headingGreyLDLink = `font-bold text-lg color-grey-gradientLD-hover tracking-wide inline-block w-fit relative ${transitionColors} cursor-pointer`;
// Gradient: #f9f2e9 → #d1cbc3 → #a8a39d → #817e78 → #585552 | Hover: #f9f2e9 solid
```

### Gradient Implementation

Gradients are applied via Tailwind custom utilities defined in `tailwind.config.ts`, utilizing the CSS variable system for all color values:

```typescript
// In tailwind.config.ts
{
  // Grey gradient: Dark to Light
  '.color-grey-gradientDL': {
    'background':
      'linear-gradient(to right, var(--color-grey-dark), var(--color-grey-semidark), var(--color-grey), var(--color-grey-semilight), var(--color-grey-light))',
    '-webkit-background-clip': 'text',
    '-webkit-text-fill-color': 'transparent',
    'background-clip': 'text',
  },

  // Grey gradient with hover: Dark to Light → Light on hover
  '.color-grey-gradientDL-hover': {
    'background':
      'linear-gradient(to right, var(--color-grey-dark), var(--color-grey-semidark), var(--color-grey), var(--color-grey-semilight), var(--color-grey-light))',
    '-webkit-background-clip': 'text',
    '-webkit-text-fill-color': 'transparent',
    'background-clip': 'text',
    'transition': 'background 0.2s ease-in-out, -webkit-text-fill-color 0.2s ease-in-out',
    '&:hover': {
      'background': 'none',
      '-webkit-text-fill-color': 'var(--color-grey-light)',
    }
  },

  // Purple gradient: Light to Dark
  '.color-purple-gradientLD': {
    'background':
      'linear-gradient(to right, var(--color-purple-light), var(--color-purple-semilight), var(--color-purple), var(--color-purple-semidark), var(--color-purple-dark))',
    '-webkit-background-clip': 'text',
    '-webkit-text-fill-color': 'transparent',
    'background-clip': 'text',
  }
}
```

**Key Features:**
- All gradients use 5 color stops from the CSS variable system
- Hover variants transition to solid light color for emphasis
- Smooth 200ms transitions for hover effects
- Background clip creates text-only gradient effect

### Import Flow

```
Component Code
      ↓
Import from $text alias
      ↓
Apply className with imported style
      ↓
Tailwind processes at build
      ↓
CSS custom utilities applied
      ↓
Rendered with compiled styles
```

### Responsive Typography

```typescript
// Mobile-first approach with breakpoint modifiers
"text-xs mobileMd:text-sm tablet:text-base desktop:text-lg"

// Responsive font weights
"font-semibold tablet:font-normal"

// Responsive spacing
"mt-1 tablet:mt-0 -mb-5 tablet:-mb-4"
```

## SEO and Semantic HTML

### Heading Hierarchy

The text system follows SEO best practices with proper heading structure:

| Tag | Text Style | Purpose | SEO Impact |
|-----|-----------|---------|------------|
| **H1** | titleNeutral, titlePrimary | Page title | High - One per page, primary keyword |
| **H2** | subtitleNeutral, subtitlePrimary | Major sections | High - Main subtopics, secondary keywords |
| **H3** | headingGreyLD, headingGrey | Subsections | Medium - Supporting points, related keywords |
| **H4** | headingGreyLDLink, headingGreyDLLink | Minor sections | Medium - Feature titles, UI sections |
| **H5** | labelSm, labelLg, valueLg | Data labels | Low - Data displays, component headers |
| **H6** | labelXs, valueXs | Supplementary | Minimal - Footer text, misc content |

### Best Practices

1. **Heading Nesting**: Always maintain proper hierarchy (H1 → H2 → H3)
2. **One H1**: Each page should have exactly one H1 tag
3. **Descriptive Text**: Headers should accurately describe content
4. **Keyword Usage**: Include relevant keywords in H1 and H2 tags
5. **Length**: Keep headers concise (<60 characters for H1)

### Paragraph Guidelines

```typescript
// Body text styles for paragraphs
<p class={text}>        // Base paragraph text
<p class={textLg}>      // Larger paragraph text
<p class={textSm}>      // Smaller paragraph text
```

- Focus on single topics per paragraph
- Aim for 2-5 sentences per paragraph
- Uniform bottom margin for spacing
- Use `text` (base) for standard content

## Performance Considerations

### Tree Shaking
- Unused styles are removed in production build
- Import only needed styles per component
- Tailwind JIT compiler optimizes output

### CSS Optimization
- Gradients use GPU-accelerated properties
- Transitions use `transform` and `opacity` when possible
- Hardware acceleration via `will-change` where needed

### Font Loading
- System fonts prioritized for performance
- Custom fonts (Courier Prime) loaded only when needed
- Font display strategy optimized

## Best Practices

### Style Selection
1. **Use Most Specific Style**: Choose the exact style for your use case
2. **Prefer Existing Styles**: Avoid creating new styles unnecessarily
3. **Consider Responsive Needs**: Use responsive variants (`-R`) when appropriate
4. **Account for States**: Use Link/Active variants for interactive elements

### Import Strategy
```tsx
// For component usage - import specific styles
import { titleNeutral, text, labelSm } from "$text";

// For type work - import the type
import type { TextStyles } from "$text";

// Type-safe style references
const myStyle: keyof TextStyles = "titleNeutral";
```

### Composition Patterns
```tsx
// Combining with Tailwind utilities
<h1 class={`${titleNeutral} mb-4 tablet:mb-6`}>Title</h1>

// Dynamic style selection
const headingClass = isActive ? navLinkPurpleActive : navLinkPurple;

// Conditional styling
<span class={`${valueLg} ${isPositive ? valuePositive : valueNegative}`}>
```

### Maintenance
1. **Document New Styles**: Add to appropriate category
2. **Update Type Definitions**: Keep TextStyles type in sync
3. **Test Responsiveness**: Verify at all breakpoints
4. **Check Gradients**: Test in multiple browsers

## Common Patterns

### Page Title Section
```tsx
<div class="flex flex-col gap-3">
  <h1 class={titleNeutral}>Page Title</h1>
  <h2 class={subtitleNeutral}>Subtitle</h2>
</div>
```

### Data Field Display
```tsx
<div class="flex flex-col gap-1">
  <label class={labelSm}>FIELD NAME</label>
  <span class={valueLg}>Field Value</span>
</div>
```

### Navigation Link
```tsx
<a
  href="/path"
  class={isActive ? navLinkPurpleActive : navLinkPurple}
>
  LINK TEXT
</a>
```

### Card Content
```tsx
<div class="flex items-center gap-1">
  <span class={cardHashSymbol}>#</span>
  <span class={cardStampNumber}>12345</span>
</div>
```

### Interactive Heading
```tsx
<a href="/article">
  <h3 class={headingGreyLDLink}>Article Title</h3>
</a>
```

## Adding New Text Styles

### Step 1: Define the Style
```typescript
// Add to styles.ts
export const newStyleName = `${textFont} text-lg tablet:text-xl text-color-purple ${transitionColors}`;
```

### Step 2: Update Type Definition
```typescript
export type TextStyles = {
  // ... existing styles
  newStyleName: string;
};
```

### Step 3: Document the Style
Add to appropriate category in this documentation with:
- Purpose and use case
- Composition details
- Usage examples
- Any special behaviors

### Step 4: Test the Style
- Verify at all breakpoints
- Check hover/active states
- Test gradient rendering
- Validate accessibility

## Troubleshooting

### Issue: Gradient not displaying
**Solution**: Ensure you're using the correct gradient class (`color-grey-gradientDL`, `color-purple-gradientLD`, etc.). Check that Tailwind config includes custom utilities.

### Issue: Hover effect not working
**Solution**: Verify `-hover` suffix gradients are used. Check that `transitionColors` is included in the style. Ensure `cursor-pointer` is present.

### Issue: Text not responsive
**Solution**: Use responsive size variants or add breakpoint modifiers. Check mobile-first order (base size → tablet: → desktop:).

### Issue: Text truncation not working
**Solution**: Ensure parent container has defined width. Add `max-w-full` or `w-full` to parent. Verify `truncate` class is present.

### Issue: Select/copy disabled
**Solution**: The `select-none` class prevents text selection. Remove it or use conditional logic where copy is needed.

### Issue: Wrong font weight
**Solution**: Check base font style composition. Verify font-weight utilities aren't conflicting. Some styles use responsive weights.

## Related Components

- **Layout System**: Provides container styles and spacing ([layout/doc.md](mdc:components/layout/doc.md))
- **Button System**: Uses text styles for button labels ([button/doc.md](mdc:components/button/doc.md))
- **Card Components**: Specialized card text styles integrated ([card components])
- **Notification System**: Tooltip text styles defined in notification ([notification/doc.md](mdc:components/notification/doc.md))

---

**Last Updated:** October 29, 2025
**Author:** baba
