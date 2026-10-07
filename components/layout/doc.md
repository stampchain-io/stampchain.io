# Global Layout UI Documentation

## Overview

The app UI is inspired by Apple design principles, with dark themed multilayered glassmorphism design and large border radius for rounded containers, forms, buttons and other elements

## Architecture

### Layer Hierarchy
```
┌─────────────────────────────────────────────────────┐
│  Layer 0: Background Animation (Vanta Topology)     │
│  - Particle flow field                              │
│  - Base visual foundation                           │
└─────────────────────────────────────────────────────┘
                        ▲
┌─────────────────────────────────────────────────────┐
│  Overlay Layer: Drawers & Modals                    │
│  - container0                                       │
│  - backdrop-blur-lg                                 │
│  - Used by: FilterDrawer, Header mobile menu        │
└─────────────────────────────────────────────────────┘
                        ▲
┌─────────────────────────────────────────────────────┐
│  Layer 1: Primary Containers                        │
│  - container1 (rounded-3xl)                         │
│  - Page bodies, cards, tokens                       │
│  - Used by: Body containers, StampCards             │
└─────────────────────────────────────────────────────┘
                        ▲
┌─────────────────────────────────────────────────────┐
│  Layer 2: Nested Elements                           │
│  - container2 (rounded-2xl)                         │
│  - Child containers, detail tables                  │
│  - Used by: Nested cards, detail rows               │
└─────────────────────────────────────────────────────┘
```

## Design Principles

- Layer 0 - Base layer:
  - Background topology animation:
    - Multi-color particle system with purple/black palette on black background
    - Color palette: ["#bb00ff", "#000000", "#c219ff", "#000000", "#c933ff", "#000000", "#cf4dff", "#000000", "#d666ff"]
      - #bb00ff: bright purple (~11% chance)
      - #000000: black - appears four times (~44% chance total)
      - #c219ff: dark purple (~11% chance)
      - #c933ff: dark magenta (~11% chance)
      - #cf4dff: very dark purple (~11% chance)
      - #d666ff: light purple (~11% chance)
    - Particle count: Dynamic based on device
      - Mobile/Tablet: 750 particles
      - Desktop: 1500 particles

- Overlay layer styles:
  - Container0
    - Used for drawers background and modal (base) containers
    - Darker black background with gradient opacity
    - Background blur:
      - backdrop-blur-lg
    - Background: Linear gradient to bottom
      - bg-gradient-to-b from-color-neutral-950/80 via-color-neutral-900/90 to-color-neutral-1000
    - Note: Rounded corners, borders and shadows are applied by individual components using this overlay
      - Drawers (FilterDrawer, Header mobile menu) typically use:
        - Rounded corners (24px): rounded-3xl (applied to left or right side depending on drawer position)
        - Border: border border-color-neutral-800
        - Shadows:
          - Left drawer: shadow-[-12px_0_12px_-6px_rgba(8,7,8,0.75)]
          - Right drawer: shadow-[12px_0_12px_-6px_rgba(8,7,8,0.75)]
      - Modal containers (`ModalBase`) typically use:
        - Rounded corners (24px): rounded-3xl, border border-color-neutral-800
        - Shadow: the shared `shadow` constant — shadow-[0_4px_8px_rgba(13,11,13,0.2),inset_0_1px_0_rgba(13,11,13,0.1),inset_0_-1px_0_rgba(13,11,13,0.1),inset_0_0_1px_1px_rgba(13,11,13,0.1)]

- Layer 1:
  - Container1
    - Used for page body containers, stampcards, tokencards
    - Black background with medium opacity
    - Rounded corners (24px) and small background blur:
      - rounded-3xl backdrop-blur-sm
    - Background: Linear gradient to bottom
      - bg-gradient-to-b from-color-neutral-800/40 via-color-neutral-900/60 to-neutral-950/80
    - Border: border border-color-neutral-800
    - Shadow: not embedded in `container1` itself — composed separately via the shared `shadow` constant (outer + inner shadow) where needed, e.g. `containerCardTable` combines `container1` with `shadowGlowPurple`

- Layer 2 styles:
  - Container2
    - Used for child containers inside of parent layer 1 containers, and as the base for pills (`containerPill`, `containerPillCount`) and the icon-row container (`containerIcon`)
    - Black background with medium-high opacity, no blur
    - Rounded corners (16px):
      - rounded-2xl
    - Background: Linear gradient to bottom
      - bg-gradient-to-b from-color-neutral-800/40 via-color-neutral-900/60 to-neutral-900/80
    - Border: border border-color-neutral-700

  - Container2Hover
    - Combines `container2` with a border hover transition
    - Intended to be used with layer 2 elements (e.g. `containerCard`)
    - Adds: hover:border-color-hover + `transitionColors`

  - Container3
    - Used mainly inside cards, one level deeper than Layer 2 (rounded-xl, cursor-default, select-none)
    - Background: Linear gradient to bottom
      - bg-gradient-to-b from-color-neutral-800/80 via-color-neutral-900/90 to-color-neutral-900
    - Border: border border-color-neutral-800

### Layer Comparison

| Layer | Blur | Border Radius | Opacity | Use Case | Examples |
|-------|------|---------------|---------|----------|----------|
| **Overlay** | backdrop-blur-lg | Component-specific (24px typical) | 80-90% | Modals, Drawers | FilterDrawer, Header menu, ModalBase |
| **Layer 1** | backdrop-blur-sm | rounded-3xl (24px) | 40-80% | Primary containers | Page bodies, StampCards, TokenCards |
| **Layer 2** | none (flat) | rounded-2xl (16px) | 40-80% | Nested elements | Detail tables, nested cards, pills, cards |
| **Layer 3** | none (flat) | rounded-xl | 80-90% | Innermost card elements | Card sub-sections |

## Core Components

### Server-Side Components (`components/layout/`)

- **styles.ts**: Global layout style definitions and utilities
  - **Purpose**: Centralized style constant exports
  - **Exports**:
    - Transition utilities: `transitionColors`, `transitionTransform`, `transitionAll`
    - Shadow variants: `shadow`, `shadowL2`, `shadowGlowPurple`, `shadowGlowGrey`
    - Container layers: `container0`, `container1`, `container2`, `container2Hover`, `containerIcon`, `container3`
    - Pill styles: `containerPill`, `containerPillCount`
    - Body styles: `body`, `bodyTool`, `bodyArticle`
    - Container styles: `containerBackground`, `containerGap`, `containerDetailImage`, `containerStickyBottom`, `containerCard`, `containerCardTable`, `containerColData`, `containerColForm`, `containerRowForm`
    - Grid styles: `gridCardSm`, `gridCardMd`, `gridCardLg`, `gridCardMdSplitSm`, `gridCardMdSplitMd`, `gridCardMdSplitLg`, and helpers `gridCard()`, `gridCardWallet()`
    - Row/col styles: `rowForm`, `rowResponsiveForm`, `rowContainerBackground`, `colContainerBackground`
    - Cell styles: `cellLeftL2Card`, `cellRightL2Card`, `cellCenterL2Card`, `cellLeftL2Detail`, `cellRightL2Detail`, `cellCenterL2Detail`, `cellStickyLeft`, `cellStickyLeft2` (the older `cellLeftCard`/`cellRightCard`/`cellCenterCard` Layer-1 variants are commented out and unused — replaced by the L2 variants above)
    - Image styles: `imagePreviewTool`, `imageUploadTool`
    - Loader styles: `loaderSpinXsGrey`/`loaderSpinSmGrey`/`loaderSpinGrey`/`loaderSpinLgGrey`, `loaderSpinXsPurple`/`loaderSpinSmPurple`/`loaderSpinPurple`/`loaderSpinLgPurple`, `loaderSkeleton`
    - Alignment utilities: `alignmentClasses` (`{ left, center, right }`) and `AlignmentType` (used by `StatStyles.tsx`)
    - Type: `LayoutStyles` (see [Type Definitions](#type-definitions))
  - **Location**: `components/layout/styles.ts`
  - **Usage**: Import specific style constants to maintain consistency across components

- **ModalBase.tsx**: Base modal component with consistent styling and behavior
  - **Purpose**: Reusable modal foundation for all modal dialogs
  - **Key Features**: Container overlay styling, keyboard shortcuts (Escape), close button with delayed tooltip, animation support, responsive width
  - **Props**: `onClose`, `title`, `children`, `className`, `contentClassName`, `hideHeader`
  - **Also exports**: `handleModalClose()` — standalone helper that triggers the same close animation/timing as the in-component close handler, for callers that need to close the modal without rendering `ModalBase`'s own close button

- **ModalSearchBase.tsx**: Specialized search modal container
  - **Purpose**: Modal container specifically for search functionality
  - **Key Features**: Layer-1 container styling, responsive width, keyboard shortcuts (Escape, Ctrl/Cmd+S)
  - **Props**: `children`, `onClose`

- **ScrollContainer.tsx**: Table scroll management component
  - **Purpose**: Manages scrollbar padding for table containers
  - **Key Features**: Dynamic scrollbar padding calculation, ResizeObserver for responsive adjustments, different padding for mobile vs desktop
  - **Props**: `children`, `class`, `onScroll`

- **MetaTags.tsx**: SEO and meta information management
  - **Purpose**: Manages page metadata, OpenGraph tags, and social media cards
  - **Key Features**: Essential meta tags, favicon/manifest links (with a dark/light theme-aware SVG favicon refresh script), canonical URL + machine-readable `llms.txt` alternate link, OpenGraph tags, Twitter Card support, JSON-LD structured data (`WebSite` + `Organization`), conditional rendering
  - **Props**: `title`, `description`, `image`, `skipImage`, `skipTitle`, `skipDescription`, `skipOgMeta`, `canonicalUrl`, `ogUrl`

- **EmptyState.tsx**: Shared "no results" state component
  - **Purpose**: Reused across wallet/explorer/marketplace/stamp overview pages so the icon + copy + container styling for empty states stays in one place
  - **Key Features**: Renders one or more icons (via `Icon` from `$components/icon/IconBase.tsx`) above a label; switches between `colContainerBackground` (icon present) and `rowContainerBackground` (no icon) container styles
  - **Props**: `label`, `icon` (single `IconVariants["name"]` or an array), `className`
  - **Note**: Imports concrete modules directly (not the `$layout`/`$icon` barrels) to avoid circular re-export chains

- **PillContentCount.tsx**: Floating count badge
  - **Purpose**: Floating count badge shown above a tab/selector row, reflecting only the currently active tab/section's own count
  - **Key Features**: Positions itself absolutely (`-top-1 right-0`) using the `containerPillCount` style; callers compute the count/label/fallback locally and pass the finished node as `value` — this component only owns the pill's visual style and default position
  - **Props**: `value` (`ComponentChildren`), `class`

- **StatStyles.tsx**: Stat display components
  - **Purpose**: Shared label/value display patterns for stats (card headers, price rows, detail pages)
  - **Exports**:
    - `StatItem` — label + value pair (`labelXs` / `valueSm`), optionally alignable and wrapped in a link
    - `StatTitle` — label + larger value pair (`labelXs` / `valueXl`), optionally alignable and wrapped in a link
    - `StatPrice` — BTC price (+ optional USD price and `ActivityLevelIndicator`), alignable
  - **Key Features**: Shared `alignmentClasses` from `styles.ts`, optional `href`/`target` to render as a link, hover color transition on the value
  - **Props**: See `StatItemProps`, `StatTitleProps`, `StatPriceProps` in `$types/ui.d.ts`

- **types.ts**: Layout type definitions and constants
  - **Purpose**: TypeScript interfaces, constants and utilities for layout components
  - **Key Features**: Donate CTA data structures (`TxOutput`, `Transaction`, `DonateStampData`), SRC20 table column definitions (`MINTED_COLUMNS`, `MINTING_COLUMNS`, `TableColumn`), table/data types (`TableType`, `TabData`, `FetchResponse`), timeframe types (`SRC20ViewType`, `Timeframe`), and the `colGroup()` helper for building `<colgroup>` column metadata from column widths
  - **Usage**: Provides type safety for layout-related data structures

- **data.ts**: FAQ and content data management
  - **Purpose**: Centralized content management for FAQ sections and static data
  - **Key Features**: Comprehensive FAQ content for Bitcoin Stamps (`FAQ_CONTENT`), multi-paragraph support, organized sections, external link management
  - **Usage**: Data source for FAQ pages and informational content

- **index.ts**: Module exports and re-exports
  - **Purpose**: Central export file for all layout components and utilities
  - **Key Features**: Re-exports layout components (`MetaTags`, `styles.ts`, `types.ts`, `data.ts`, `ScrollContainer`, `ModalBase`, `ModalSearchBase`, `StatStyles`, `PillContentCount`, `EmptyState`) alongside related islands (`Footer`, `ScrollFadeRow`, `NavigatorProvider`, `FontLoader`)
  - **Usage**: Single import point (`$layout`) for all layout-related functionality
  - **Note**: `PerformanceUtils.tsx` (see below) is present in `components/layout/` but is **not** re-exported from `index.ts` — import it directly if needed

- **PerformanceUtils.tsx**: Rendering/loading performance helpers
  - **Purpose**: Small presentational utilities for improving perceived and actual page performance
  - **Exports**:
    - `OptimizedContent` — wraps children with a `content-visibility` style tuned by a `priority` level (`critical`/`high`/`medium`/`low`)
    - `LazySection` — defers rendering of below-the-fold content via `content-visibility: auto` and a `contain-intrinsic-size` placeholder
    - `CriticalResource` — renders a `<link rel="preload">` (or other `rel`) tag for a critical resource
    - `ResourceHints` — renders DNS-prefetch/preconnect `<link>` tags for `stampchain.io`, `esm.sh`, and Google Fonts
  - **Usage**: Not currently re-exported from `index.ts`; import directly from `$components/layout/PerformanceUtils.tsx` when needed

## Related Island Components

### **islands/layout/** - Client-Side Layout Components
- **BackgroundTopology.tsx**: Animated background topology lines
- **Footer.tsx**: Application footer with navigation and links
- **ScrollFadeRow.tsx**: Horizontal scroll container with edge fade
- **NavigatorProvider.tsx**: Navigation state management
- **ModalProvider.tsx**: Modal state and overlay management
- **FontLoader.tsx**: Dynamic font loading and management
- **AnimationControlsManager.tsx**: Performance optimization for animations
- **PageVisibilityManager.tsx**: Page visibility state management
- **ChartWidget.tsx**: Chart display and visualization component
- **WalletProvider.tsx**: Wallet connection and state management
- **ModalOverlay.tsx**: Modal backdrop and overlay management
- **ModalStack.tsx**: Modal stacking and z-index management
- **CollapsibleSection.tsx**: Expandable/collapsible content sections

## Type Definitions

### Layout Styles Type
```typescript
export type LayoutStyles = {
  // Base styles
  transitionColors: string;
  transitionTransform: string;
  transitionAll: string;

  shadowGlowPurple: string;
  shadowGlowGrey: string;
  shadow: string;
  shadowL2: string;

  container0: string;
  container1: string;
  container2: string;
  container2Hover: string;
  containerIcon: string;
  container3: string;
  containerPill: string;

  // Body styles
  body: string;
  bodyTool: string;
  bodyArticle: string;

  // Container styles
  containerBackground: string;
  containerGap: string;
  containerDetailImage: string;
  containerStickyBottom: string;
  containerCard: string;
  containerCardTable: string;
  containerColData: string;
  containerColForm: string;
  containerRowForm: string;

  // Row styles
  rowForm: string;
  rowResponsiveForm: string;
  rowContainerBackground: string;

  // Col styles
  colContainerBackground: string;

  // Grid styles
  gridCardSm: string;
  gridCardMd: string;
  gridCardLg: string;
  gridCardMdSplitSm: string;
  gridCardMdSplitMd: string;
  gridCardMdSplitLg: string;

  // Cell styles
  cellLeftL2Card: string;
  cellRightL2Card: string;
  cellCenterL2Card: string;
  cellLeftL2Detail: string;
  cellRightL2Detail: string;
  cellCenterL2Detail: string;
  cellStickyLeft: string;
  cellStickyLeft2: string;

  // Image styles
  imagePreviewTool: string;
  imageUploadTool: string;

  // Loader styles
  loaderSpinXsGrey: string;
  loaderSpinSmGrey: string;
  loaderSpinGrey: string;
  loaderSpinLgGrey: string;
  loaderSpinXsPurple: string;
  loaderSpinSmPurple: string;
  loaderSpinPurple: string;
  loaderSpinLgPurple: string;
  loaderSkeleton: string;
};
```

Note: `containerPillCount` is exported as a style constant but, as of this writing, is not yet included in the `LayoutStyles` type above. The `gridCard()`/`gridCardWallet()` helper functions and `alignmentClasses`/`AlignmentType` are exported separately from `styles.ts` and are also not part of this type.

### Modal Props
```typescript
interface ModalBaseProps {
  onClose?: () => void;
  title: string;
  children: ComponentChildren;
  className?: string;
  contentClassName?: string;
  hideHeader?: boolean;
}

interface ModalSearchBaseProps {
  children: ComponentChildren;
  onClose: () => void;
}
```

### Scroll Container Props
```typescript
interface ScrollContainerProps {
  children: ComponentChildren;
  class?: string;
  onScroll?: (e: Event) => void;
}
```

### Meta Tags Props
```typescript
interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  skipImage?: boolean;
  skipTitle?: boolean;
  skipDescription?: boolean;
  skipOgMeta?: boolean;
  canonicalUrl?: string;
  ogUrl?: string;
}
```

### Empty State Props
```typescript
interface EmptyStateProps {
  label: string;
  icon?: IconVariants["name"] | IconVariants["name"][];
  className?: string;
}
```

### Pill Content Count Props
```typescript
interface PillContentCountProps {
  value: ComponentChildren;
  class?: string;
}
```

### Stat Display Props
```typescript
interface StatItemProps {
  label: string | ComponentChildren;
  value: string | ComponentChildren;
  align?: "left" | "center" | "right";
  class?: string;
  valueClass?: string;
  href?: string;
  target?: "_self" | "_blank";
}

interface StatTitleProps {
  label: string | ComponentChildren;
  value: string | ComponentChildren;
  align?: "left" | "center" | "right";
  href?: string;
  target?: "_self" | "_blank";
}

interface StatPriceProps {
  priceBTC: string | number | ComponentChildren;
  priceUSD?: string | number | ComponentChildren | null;
  activityLevel?: "HOT" | "WARM" | "COOL" | "DORMANT" | "COLD" | null;
  align?: "left" | "center" | "right";
  class?: string;
}
```

## Usage Examples

### Creating a Page Layout
```tsx
import { body, containerBackground } from "$layout";

export default function StampPage() {
  return (
    <div class={body}>
      <div class={containerBackground}>
        {/* Page content */}
      </div>
    </div>
  );
}
```

### Building a Card Component
```tsx
import { cellLeftL2Card, cellRightL2Card, containerCard } from "$layout";

export function StampCard({ stamp }) {
  return (
    <div class={`${containerCard} group cursor-pointer`}>
      <div class="flex">
        <div class={cellLeftL2Card}>
          <img src={stamp.image} alt={stamp.title} />
        </div>
        <div class={cellRightL2Card}>
          <p>{stamp.title}</p>
        </div>
      </div>
    </div>
  );
}
```

### Nested Layer 2 Components
```tsx
import { container1, container2, container2Hover } from "$layout";

export function DetailContainer() {
  return (
    <div class={container1}>
      {/* Layer 1 container */}
      <div class={`${container2} ${container2Hover} group cursor-pointer`}>
        {/* Layer 2 nested element with hover effects */}
      </div>
    </div>
  );
}
```

### Modal Implementation
```tsx
import { ModalBase } from "$layout";

export function WalletModal({ onClose }) {
  return (
    <ModalBase
      title="Connect Wallet"
      onClose={onClose}
    >
      <div class="flex flex-col gap-6 p-6">
        {/* Wallet options */}
      </div>
    </ModalBase>
  );
}
```

### Search Modal Usage
```tsx
import { ModalSearchBase } from "$layout";

export function SearchModal({ onClose }) {
  return (
    <ModalSearchBase onClose={onClose}>
      <SearchComponent />
    </ModalSearchBase>
  );
}
```

### Responsive Container Usage
```tsx
import { bodyTool, bodyArticle } from "$layout";

// Tool pages
export function MintingTool() {
  return (
    <div class={bodyTool}>
      {/* Responsive tool layout (max-width: 420px on mobile) */}
    </div>
  );
}

// Article/content pages
export function AboutPage() {
  return (
    <div class={bodyArticle}>
      {/* Responsive article layout (max-width: 922px on tablet) */}
    </div>
  );
}
```

### Scroll Container Usage
```tsx
import { ScrollContainer } from "$layout";

export function DataTable() {
  return (
    <ScrollContainer class="h-96">
      <table>
        {/* Table content with managed scrollbar padding */}
      </table>
    </ScrollContainer>
  );
}
```

### Meta Tags Usage
```tsx
import { MetaTags } from "$layout";

export default function CustomPage() {
  return (
    <>
      <MetaTags
        title="Custom Page Title"
        description="Custom page description"
        skipImage={true}
      />
      {/* Page content */}
    </>
  );
}
```

### Empty State Usage
```tsx
import { EmptyState } from "$layout";

export function NoResults() {
  return <EmptyState label="No stamps found" icon="image" />;
}
```

### Pill Content Count Usage
```tsx
import { PillContentCount } from "$layout";

export function TabWithCount({ count }: { count: number }) {
  return (
    <div class="relative">
      <PillContentCount value={count} />
      {/* Tab content */}
    </div>
  );
}
```

### Stat Display Usage
```tsx
import { StatItem, StatPrice, StatTitle } from "$layout";

export function TokenStats({ token }) {
  return (
    <>
      <StatTitle label="TOKEN" value={token.tick} align="left" />
      <StatItem label="HOLDERS" value={token.holders} align="center" />
      <StatPrice
        priceBTC={token.priceBTC}
        priceUSD={token.priceUSD}
        activityLevel={token.activityLevel}
        align="right"
      />
    </>
  );
}
```

## Style System Integration

### Tailwind Color System

The application uses a comprehensive color system with dual definitions for maximum flexibility:

#### Dual Definition System

Colors are defined in **two formats** within `tailwind.config.ts`:

1. **Tailwind Color Classes** - Object notation in the `colors` section
   ```typescript
   colors: {
     color: {
       purple: {
         dark: "#A21CAF",
         semidark: "#C026D3",
         DEFAULT: "#D946EF",
         // ...
       }
     }
   }
   ```

2. **CSS Variables** - Defined in the `:root` selector
   ```css
   ":root": {
     "--color-purple-dark": "#A21CAF",
     "--color-purple-semidark": "#C026D3",
     "--color-purple": "#D946EF",
     // ...
   }
   ```

#### When to Use Each Format

**Use Tailwind Classes** (`color-purple-dark`) when:
- Styling directly in JSX/TSX className attributes
- Using with Tailwind utility classes (e.g., `text-color-purple`, `bg-color-grey-light`, `stroke-color-grey-semidark`)
- Need IntelliSense autocomplete in editors
- Static styling that doesn't change

**Use CSS Variables** (`var(--color-purple-dark)`) when:
- Dynamic styling with JavaScript/TypeScript
- Creating reusable style constants (as seen in `components/button/styles.ts`)
- Need to compute or modify colors at runtime
- Using in custom CSS or inline styles
- Button color system (maps to CSS vars for dynamic application)

**Example:**
```typescript
// Tailwind class usage
<div className="text-color-purple-light bg-color-grey-dark border-color-border">

// CSS variable usage (in button styles)
color: {
  purple: `
    [--color-button-dark:var(--color-purple-dark)]
    [--color-button-semidark:var(--color-purple-semidark)]
    [--color-button:var(--color-purple)]
  `
}
```

#### Color Families

The primary system is a numbered `neutral`/`primary`/`secondary` scale (Tailwind-style `0`–`950`/`1000` steps). Legacy named scales (`purple`, `grey`, `red`, `green`, `orange`) still exist as aliases for backward compatibility, now mapped onto the equivalent `neutral`/`primary`/`secondary` hex values instead of their own standalone hues.

```typescript
// Neutral (base greyscale, replaces most "grey"/"background"/"border" usage)
color-neutral-0     // #FFFFFF
color-neutral-50    // #FAFAFA
color-neutral-400   // #A3A3A3
color-neutral-800   // #262626
color-neutral-900   // #171717
color-neutral-950   // #0A0A0A
color-neutral-1000  // #000000

// Primary (brand color, fuchsia — replaces most "purple" usage)
color-primary-50    // #FDF4FF
color-primary-400   // #E879F9
color-primary-500   // #D946EF
color-primary-700   // #A21CAF
color-primary-950   // #4A044E

// Secondary (orange)
color-secondary-50  // #FFF7ED
color-secondary-500 // #F97316
color-secondary-950 // #431407

// Legacy aliases (kept for backward compatibility, values now derived from
// the neutral/primary/secondary scale — see inline comments in tailwind.config.ts)
color-purple-dark      // #A21CAF (primary-700)
color-purple-semidark  // #C026D3 (primary-600)
color-purple           // #D946EF (DEFAULT, primary-500)
color-purple-semilight // #E879F9 (primary-400)
color-purple-light     // #F0ABFC (primary-300)

color-grey-dark        // #404040 (neutral-700)
color-grey-semidark    // #525252 (neutral-600)
color-grey             // #737373 (DEFAULT, neutral-500)
color-grey-semilight   // #A3A3A3 (neutral-400)
color-grey-light       // #D4D4D4 (neutral-300)

color-red-dark / color-red / color-red-light       // 50-950 scale + dark/semidark/DEFAULT/semilight/light aliases
color-green-dark / color-green / color-green-light // 50-950 scale + dark/semidark/DEFAULT/semilight/light aliases
color-orange-dark / color-orange / color-orange-light // 50-950 scale + dark/semidark/DEFAULT/semilight/light aliases

// Background, border & hover
color-background       // #0A0A0A (DEFAULT, neutral-950)
color-border           // #262626 (DEFAULT, neutral-800)
color-hover            // #E879F9 (DEFAULT, primary-400)
```

**Notes:**
- Color hue definitions are calculated using HSL values with lightness decreasing by 8% for each step (grey hues are estimations)
- All colors are available as both Tailwind classes (e.g., `color-neutral-800`, `color-purple-dark`) and CSS variables (e.g., `var(--color-neutral-800)`, `var(--color-purple-dark)`)
- The dual definition ensures compatibility with both Tailwind utilities and custom CSS/style constants
- `components/layout/styles.ts` container/cell/pill styles now build directly on the numbered `color-neutral`/`color-primary` scale (e.g. `container1`, `container2`, `cellLeftL2Card`) rather than the legacy named aliases

### System Integration

The layout system integrates with the global style system through:

- **Consistent breakpoints**: mobileSm, mobileMd, mobileLg, tablet, desktop
- **Container layer variants**: container0 (overlay), container1 (base), container2 / container2Hover (L2)
- **Shadow system**: standard, L2, and glow effects
- **Transition utilities**: colors, transform, and all with consistent durations
- **Responsive design**: mobile-first approach with progressive enhancement

## Technical Implementation

### How Glassmorphism Works
1. **Background gradient**: Creates depth with multi-stop gradients
2. **Backdrop filter**: Applies blur to elements behind
3. **Border**: Semi-transparent borders enhance glass effect
4. **Shadows**: Inner and outer shadows add dimensionality

### Style Constant Pattern
```typescript
// Pattern used in styles.ts
export const container1 =
  `bg-gradient-to-b from-color-neutral-800/40 via-color-neutral-900/60 to-neutral-950/80 border border-color-neutral-800 rounded-3xl backdrop-blur-sm`;
```

### Import and Usage Flow
```
Application Component
        ↓
Import from $layout alias
        ↓
Apply style constant to className
        ↓
Tailwind processes at build time
        ↓
Rendered with compiled CSS
```

### Responsive Breakpoints
Defined in `tailwind.config.ts` (`screens`):
```typescript
{
  mobileSm: "360px",    // Small phones (custom; "mobile-568" is unused, use mobileSm)
  mobileMd: "568px",    // Medium phones
  mobileLg: "768px",    // Large phones
  tablet: "1024px",     // Tablets (same as Tailwind's 'lg')
  desktop: "1440px"     // Desktop (same as Tailwind's 'xl')
}
```

## Performance Considerations

- **Animation controls**: Automatic management of animation states
- **Page visibility**: Optimization when page is not visible
- **Font loading**: Efficient font management and loading
- **Scroll optimization**: Dynamic scrollbar padding calculation
- **Modal stacking**: Efficient modal overlay management

## Accessibility Features

- **Keyboard navigation**: Escape key support for modals
- **ARIA labels**: Proper labeling for interactive elements
- **Focus management**: Modal focus trapping and restoration
- **Screen reader support**: Semantic HTML structure and meta tags
- **Tooltip delays**: Accessible tooltip timing for close buttons

## Best Practices

### Layer Selection
- **Layer 0 (Background)**: Automatically rendered, no manual implementation needed
- **Overlay Layer**: Use for modals and drawers that sit above page content
- **Layer 1**: Primary containers for page bodies, main cards, and standalone components
- **Layer 2**: Nested elements within Layer 1 containers (detail tables, nested cards)

### Style Composition
- **Import from central location**: Always use `$layout` alias for imports
- **Combine with Tailwind**: Layout styles work seamlessly with Tailwind utility classes
- **Use group hover**: Leverage `group` and `group-hover:` for interactive cards
- **Consistent spacing**: Use predefined gap utilities (`containerGap`)

### Responsive Design
- **Mobile-first approach**: Base styles target mobile, enhance for larger screens
- **Breakpoint usage**: Use `mobileMd:`, `mobileLg:`, `tablet:`, `desktop:` prefixes
- **Container width**: Use `bodyTool` for narrow layouts, `bodyArticle` for content
- **Sticky elements**: Combine `containerStickyBottom` with backdrop blur

### Performance
- **Minimize blur usage**: backdrop-blur is GPU intensive, use sparingly
- **Leverage transitions**: Use predefined transition constants for consistency
- **Animation controls**: Let `AnimationControlsManager` handle performance optimization
- **Visibility detection**: `PageVisibilityManager` pauses animations when tab is inactive

### Accessibility
- **Semantic HTML**: Use appropriate HTML elements within layout components
- **Focus management**: Ensure keyboard navigation works in modals and drawers
- **ARIA attributes**: Add proper labels and roles to interactive elements
- **Color contrast**: Glassmorphism layers maintain sufficient contrast ratios

## Common Patterns

### Sticky Headers with Blur
```tsx
<div class="sticky top-0 z-20 bg-black/50 backdrop-blur-lg">
  {/* Header content */}
</div>
```

### Scrollable Containers
```tsx
import { ScrollContainer } from "$layout";

<ScrollContainer class="h-96">
  {/* Table or long content */}
</ScrollContainer>
```

### Hover Effects on Cards
```tsx
import { cellLeftL2Card, containerCard } from "$layout";

<div class={`${containerCard} group`}>
  <div class={cellLeftL2Card}>
    {/* Content with auto hover styles */}
  </div>
</div>
```

### Modal with Custom Width
```tsx
<ModalBase
  title="Custom Modal"
  onClose={onClose}
  className="max-w-4xl" // Override default width
>
  {/* Wide content */}
</ModalBase>
```

## Troubleshooting

### Issue: Glassmorphism not visible
**Solution**: Ensure there's contrasting content behind the element. Glassmorphism requires background content to show the blur effect.

### Issue: Shadows not appearing
**Solution**: Check z-index stacking. Elements above may be covering shadows. Ensure proper layering order.

### Issue: Rounded corners cut off content
**Solution**: Apply `overflow-hidden` to parent container or adjust padding to accommodate border radius.

### Issue: Hover effects not working
**Solution**: Verify that parent element has `group` class when using `group-hover:` utilities.

## Background Image Animation

- **background-topology.js**: Vanta Topology animation (v0.5.24)
  - **Purpose**: Animated particle flow field with purple/black color palette
  - **Key Features**:
    - Multi-color particle system with randomized colors
    - Dynamic particle count based on device type
    - Responsive flow field that reacts to window size

  - **Configuration Values**:
    - **Particle Count**:
      - Mobile/Tablet (< 768px): 750 particles
      - Desktop (≥ 768px): 1500 particles

    - **Animation Behavior**:
      - Particle movement speed: `mult(4.7)` - controls particle velocity through topology
      - Flow field strength: `mult(2.5)` - controls particle response to flow field
      - Flow evolution speed: `c += 0.01` - speed of underlying flow field changes
      - Line thickness: `strokeWeight(1)` - thickness of connecting lines
      - Line opacity: `0.05` - transparency of particle connection lines

    - **Color Palette**:
      - `["#bb00ff", "#000000", "#c219ff", "#000000", "#c933ff", "#000000", "#cf4dff", "#000000", "#d666ff"]`
      - Each particle randomly assigned one color at creation
      - Colors breakdown:
        - `#bb00ff`: bright purple (~11% chance)
        - `#000000`: black - appears four times (~44% chance total)
        - `#c219ff`: dark purple (~11% chance)
        - `#c933ff`: dark magenta (~11% chance)
        - `#cf4dff`: very dark purple (~11% chance)
        - `#d666ff`: light purple (~11% chance)

    - **Sizing**:
      - `minHeight`: 200px
      - `minWidth`: 200px
      - `scale`: 1 (desktop)
      - `scaleMobile`: 1

## Related Components

- **Button System**: Uses layout shadows and glassmorphism styles ([button/doc.md](mdc:components/button/doc.md))
- **Icon System**: Integrated in modals and interactive elements ([icon/doc.md](mdc:components/icon/doc.md))
- **Notification System**: Uses similar glassmorphism principles ([notification/doc.md](mdc:components/notification/doc.md))
- **Text Styles**: Typography system integrated with layout ([text/styles.ts](mdc:components/text/styles.ts))
- **Global Styles**: Animation keyframes and base styles ([styles.css](mdc:static/styles.css))

---

**Last Updated:** August 23, 2026
**Author:** baba
