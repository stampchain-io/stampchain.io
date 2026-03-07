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
│  - glassmorphismOverlay                             │
│  - backdrop-blur-lg                                 │
│  - Used by: FilterDrawer, Header mobile menu        │
└─────────────────────────────────────────────────────┘
                        ▲
┌─────────────────────────────────────────────────────┐
│  Layer 1: Primary Containers                        │
│  - glassmorphism (rounded-3xl)                      │
│  - Page bodies, cards, tokens                       │
│  - Used by: Body containers, StampCards             │
└─────────────────────────────────────────────────────┘
                        ▲
┌─────────────────────────────────────────────────────┐
│  Layer 2: Nested Elements                           │
│  - glassmorphismL2 (rounded-2xl)                    │
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
  - GlassmorphismOverlay
    - Used for drawers background and modal (base) containers
    - Darker black background with gradient opacity
    - Background blur:
      - backdrop-blur-lg
    - Background: Linear gradient to bottom
      - bg-gradient-to-b from-color-background/95 via-color-background/70 to-black/90
    - Note: Rounded corners and shadows are applied by individual components using this overlay
      - Drawers (FilterDrawer, Header mobile menu) typically use:
        - Rounded corners (24px): rounded-3xl (applied to left or right side depending on drawer position)
        - Border: border border-color-border/75
        - Shadows:
          - Left drawer: shadow-[-12px_0_12px_-6px_rgba(8,7,8,0.75)]
          - Right drawer: shadow-[12px_0_12px_-6px_rgba(8,7,8,0.75)]
      - Modal containers typically use:
        - Shadow: shadow-[0_4px_8px_rgba(13,11,13,0.2),inset_0_1px_0_rgba(13,11,13,0.1),inset_0_-1px_0_rgba(13,11,13,0.1),inset_0_0_1px_1px_rgba(13,11,13,0.1)]

- Layer 1:
  - Glassmorphism
    - Used for page body containers, stampcards, tokencards
    - Black background with medium opacity
    - Rounded corners (24px) and background blur:
      - rounded-3xl backdrop-blur
    - Background: Linear gradient to bottom right
      - bg-gradient-to-br from-[#191919]/40 via-color-background/50 to-black/60
    - Border: border border-color-border/50
    - Shadow: Outer and inner shadows:
      - shadow-[0_4px_8px_rgba(13,11,13,0.2),inset_0_1px_0_rgba(13,11,13,0.1),inset_0_-1px_0_rgba(13,11,13,0.1),inset_0_0_1px_1px_rgba(13,11,13,0.1)]

- Layer 2 styles:
  - GlassmorphismL2
    - Used for child containers inside of parent layer 1 glassmorphism containers
    - Black background with high opacity
    - Rounded corners (16px) and small background blur:
      - rounded-2xl backdrop-blur-xs
    - Background: bg-color-background/30
    - Border: border border-color-border/75
    - Shadow: Smaller outer and inner shadows:
      - shadow-[0_2px_4px_rgba(13,11,13,0.1),inset_0_1px_0_rgba(13,11,13,0.08),inset_0_-1px_0_rgba(13,11,13,0.08),inset_0_0_2px_2px_rgba(13,11,13,0.08)]

  - GlassmorphismL2Hover
    - Combines background and border hover styles
    - Intended to be used with layer 2 elements
    - Background: bg-color-background/60
    - Border: border-color-border

### Layer Comparison

| Layer | Blur | Border Radius | Opacity | Use Case | Examples |
|-------|------|---------------|---------|----------|----------|
| **Overlay** | backdrop-blur-lg | Component-specific (24px typical) | 70-95% | Modals, Drawers | FilterDrawer, Header menu |
| **Layer 1** | backdrop-blur | rounded-3xl (24px) | 50-70% | Primary containers | Page bodies, StampCards, TokenCards |
| **Layer 2** | backdrop-blur-xs | rounded-2xl (16px) | 20-30% | Nested elements | Detail tables, nested cards |

## Core Components

### Server-Side Components (`components/layout/`)

- **styles.ts**: Global layout style definitions and utilities
  - **Purpose**: Centralized style constant exports
  - **Exports**:
    - Transition utilities: `transitionColors`, `transitionTransform`, `transitionAll`
    - Shadow variants: `shadow`, `shadowL2`, `shadowGlowPurple`, `shadowGlowGrey`
    - Glassmorphism layers: `glassmorphism`, `glassmorphismOverlay`, `glassmorphismL2`, `glassmorphismL2Hover`
    - Body styles: `body`, `bodyTool`, `bodyArticle`, `gapSection`, `containerGap`, `containerGap`
    - Container styles: `containerBackground`, `containerCard`, `containerCardL2`, `containerColForm`
    - Cell styles: `cellLeftCard`, `cellRightCard`, `cellCenterCard` (+ L2 variants)
    - Loader styles: `loaderSpinPurple`, `loaderSpinGrey`, `loaderSkeleton` (+ size variants)
  - **Location**: `components/layout/styles.ts`
  - **Usage**: Import specific style constants to maintain consistency across components

- **ModalBase.tsx**: Base modal component with consistent styling and behavior
  - **Purpose**: Reusable modal foundation for all modal dialogs
  - **Key Features**: Glassmorphism overlay styling, keyboard shortcuts (Escape), close button with delayed tooltip, animation support, responsive width
  - **Props**: `onClose`, `title`, `children`, `className`, `contentClassName`, `hideHeader`

- **ModalSearchBase.tsx**: Specialized search modal container
  - **Purpose**: Modal container specifically for search functionality
  - **Key Features**: Conic gradient border animation, responsive width, keyboard shortcuts (Escape, Ctrl/Cmd+S), custom styling
  - **Props**: `children`, `onClose`

- **ScrollContainer.tsx**: Table scroll management component
  - **Purpose**: Manages scrollbar padding for table containers
  - **Key Features**: Dynamic scrollbar padding calculation, ResizeObserver for responsive adjustments, different padding for mobile vs desktop
  - **Props**: `children`, `class`, `onScroll`

- **MetaTags.tsx**: SEO and meta information management
  - **Purpose**: Manages page metadata, OpenGraph tags, and social media cards
  - **Key Features**: Essential meta tags, OpenGraph tags, Twitter Card support, conditional rendering, canonical URL management
  - **Props**: `title`, `description`, `image`, `skipImage`, `skipTitle`, `skipDescription`, `skipOgMeta`

- **types.ts**: Layout type definitions and constants
  - **Purpose**: TypeScript interfaces and constants for layout components
  - **Key Features**: Donate CTA data structures, SRC20 table column definitions, table styling constants, timeframe types
  - **Usage**: Provides type safety for layout-related data structures

- **data.ts**: FAQ and content data management
  - **Purpose**: Centralized content management for FAQ sections and static data
  - **Key Features**: Comprehensive FAQ content for Bitcoin Stamps, multi-paragraph support, organized sections, external link management
  - **Usage**: Data source for FAQ pages and informational content

- **index.ts**: Module exports and re-exports
  - **Purpose**: Central export file for all layout components and utilities
  - **Key Features**: Re-exports from layout components, islands/layout components, modal components
  - **Usage**: Single import point for all layout-related functionality

- **ChartWidget.tsx**: Chart display and visualization component
  - **Purpose**: Provides chart rendering capabilities for data visualization
  - **Key Features**: Chart widget functionality, data visualization, responsive chart display
  - **Usage**: Used for displaying charts and graphs in the application

- **WalletProvider.tsx**: Wallet connection and state management
  - **Purpose**: Manages wallet connections and wallet-related state
  - **Key Features**: Wallet connection handling, state management, wallet provider context
  - **Usage**: Provides wallet functionality across the application

- **ModalOverlay.tsx**: Modal backdrop and overlay management
  - **Purpose**: Handles modal backdrop rendering and overlay behavior
  - **Key Features**: Modal backdrop, overlay management, click handling
  - **Usage**: Used in conjunction with modal components for proper backdrop behavior

- **ModalStack.tsx**: Modal stacking and z-index management
  - **Purpose**: Manages multiple modals and their stacking order
  - **Key Features**: Modal stacking, z-index management, modal hierarchy
  - **Usage**: Ensures proper modal layering when multiple modals are open

- **CollapsibleSection.tsx**: Expandable/collapsible content sections
  - **Purpose**: Provides collapsible content sections for better content organization
  - **Key Features**: Expand/collapse functionality, smooth animations, content organization
  - **Usage**: Used for organizing content into expandable sections

## Related Island Components

### **islands/layout/** - Client-Side Layout Components
- **BackgroundTopology.tsx**: Animated background topology lines
- **Footer.tsx**: Application footer with navigation and links
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
  // Transitions
  transitionColors: string;
  transitionTransform: string;
  transitionAll: string;

  // Shadows
  shadow: string;
  shadowL2: string;
  shadowGlowPurple: string;
  shadowGlowGrey: string;

  // Glassmorphism
  glassmorphism: string;
  glassmorphismOverlay: string;
  glassmorphismL2: string;
  glassmorphismL2Hover: string;

  // Body styles
  body: string;
  bodyTool: string;
  bodyArticle: string;
  gapSection: string;

  // Container styles
  containerBackground: string;
  containerGap: string;
  containerCard: string;
  containerCardL2: string;
  containerColForm: string;
  containerRowForm: string;

  // Cell styles
  cellLeftCard: string;
  cellRightCard: string;
  cellCenterCard: string;
  cellLeftL2Card: string;
  cellRightL2Card: string;
  cellCenterL2Card: string;

  // Loader styles
  loaderSpinPurple: string;
  loaderSpinGrey: string;
  loaderSkeleton: string;
}
```

### Modal Props
```typescript
interface ModalBaseProps {
  onClose: () => void;
  title?: string;
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
}
```

## Usage Examples

### Creating a Page Layout
```tsx
import { body, containerBackground, glassmorphism } from "$layout";

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
import { containerCard, cellLeftCard, cellRightCard } from "$layout";

export function StampCard({ stamp }) {
  return (
    <div class={`${containerCard} group cursor-pointer`}>
      <div class="flex">
        <div class={cellLeftCard}>
          <img src={stamp.image} alt={stamp.title} />
        </div>
        <div class={cellRightCard}>
          <p>{stamp.title}</p>
        </div>
      </div>
    </div>
  );
}
```

### Nested Layer 2 Components
```tsx
import { glassmorphism, glassmorphismL2, glassmorphismL2Hover } from "$layout";

export function DetailContainer() {
  return (
    <div class={glassmorphism}>
      {/* Layer 1 container */}
      <div class={`${glassmorphismL2} ${glassmorphismL2Hover} group cursor-pointer`}>
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
         dark: "#43005c",
         semidark: "#610085",
         DEFAULT: "#7f00ad",
         // ...
       }
     }
   }
   ```

2. **CSS Variables** - Defined in the `:root` selector
   ```css
   ":root": {
     "--color-purple-dark": "#43005c",
     "--color-purple-semidark": "#610085",
     "--color-purple": "#7f00ad",
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

// Red (errors/warnings)
color-red-dark         // #5c0000
color-red-semidark     // #850000
color-red              // #ad0000 (DEFAULT)
color-red-semilight    // #d60000
color-red-light        // #ff0000

// Green (success)
color-green-dark       // #005c00
color-green-semidark   // #008500
color-green            // #00ad00 (DEFAULT)
color-green-semilight  // #00d600
color-green-light      // #00ff00

// Orange (warnings)
color-orange-dark      // #5c2b00
color-orange-semidark  // #853e00
color-orange           // #ad5100 (DEFAULT)
color-orange-semilight // #d66400
color-orange-light     // #ff7700

// Background & Border
color-background       // #0d0a0d
color-border           // #332f32
```

**Notes:**
- Color hue definitions are calculated using HSL values with lightness decreasing by 8% for each step (grey hues are estimations)
- All colors are available as both Tailwind classes (e.g., `color-purple-dark`) and CSS variables (e.g., `var(--color-purple-dark)`)
- The dual definition ensures compatibility with both Tailwind utilities and custom CSS/style constants

### System Integration

The layout system integrates with the global style system through:

- **Consistent breakpoints**: mobile, mobileLg, mobileMd, tablet, desktop
- **Glassmorphism variants**: overlay, base, L2 with hover states
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
export const glassmorphism = `border border-color-border/50 rounded-3xl
  bg-gradient-to-br from-[#191919]/40 via-color-background/50 to-black/60
  backdrop-blur ${shadow}`;
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
Defined in `tailwind.config.ts`:
```typescript
{
  mobile: "360px",      // Small phones
  mobileMd: "420px",    // Medium phones
  mobileLg: "640px",    // Large phones
  tablet: "768px",      // Tablets
  desktop: "1024px"     // Desktop
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
import { containerCard, cellLeftCard } from "$layout";

<div class={`${containerCard} group`}>
  <div class={cellLeftCard}>
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

**Last Updated:** October 6, 2025
**Author:** baba
