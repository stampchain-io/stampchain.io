# Icon System Documentation

## Overview

The Icon system provides a lightweight, versatile solution for rendering SVG icons throughout the application. Built with inline SVG paths and dynamic styling, it offers type safety, performance optimization, and consistent design integration following the app's dark-themed glassmorphism principles.

## Architecture

### Component Hierarchy
```
┌─────────────────────────────────────────────────────┐
│  Icon Paths (paths.ts)                              │
│  - 80+ SVG path definitions                         │
│  - Huge Icons set                 │
│  - Custom Stampchain icons                          │
│  - Placeholder image paths                          │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│  Icon Styles (styles.ts)                            │
│  - Style variants and color palettes                │
│  - Size definitions (8 standard + 7 responsive)     │
│  - Weight options (extraLight to bold)              │
│  - Placeholder color system                         │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│  Icon Base Components                               │
│  - Icon: Main icon component (IconBase.tsx)         │
│  - LoadingIcon: Animated loading spinner            │
│  - LogoIcon: Stampchain logo link (img-based)       │
│  - UserProfileIcon: Shared creator/artist avatar    │
│  - PlaceholderImage: Placeholder graphics           │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│  Application Integration                            │
│  - Used in buttons, headers, navigation             │
│  - Social media links                               │
│  - Status indicators                                │
│  - Interactive controls                             │
└─────────────────────────────────────────────────────┘
```

## Design Principles

### Icon Types

| Type | Behavior | Styling | Use Case |
|------|----------|---------|----------|
| **icon** | Static, non-interactive | Solid color, no hover effects | Display icons, status indicators, decorative elements |
| **iconHover** | Interactive, clickable, no pill | Color transitions on hover, cursor pointer, wrapped in `<a>` but without the pill background | Tightly-spaced controls (e.g. carets) that need hover color without the padded pill hit-area |
| **iconButton** | Interactive, clickable, pill background | Color transitions on hover, cursor pointer, hover pill background (`iconButtonPill`) | Navigation, actions, links, controls |

Both `iconHover` and `iconButton` render the `<svg>` wrapped in an `<a>` element (see [Technical Implementation](#technical-implementation)), so click/hover/ARIA semantics live on the wrapper and the clickable area matches the visible element rather than being limited to the inner `<svg>`.

### Color Palettes

Color values come from CSS variables defined in `tailwind.config.ts`, using the `neutral`/`primary` numbered scale directly (the old `grey`/`purple` legacy aliases, marked "refactor and delete" in `tailwind.config.ts`, are no longer referenced by the Icon system). Unlike older revisions, interactive icons of every color transition to a single shared `color-hover` value (`#E879F9`, aliasing `primary-400`) rather than a same-hue "light" variant. See [Layout System Documentation](mdc:components/layout/doc.md#tailwind-color-system) for the complete color palette.

Colors are listed light → dark. `fill-stroke` paths (see [Fill-Stroke Paths](#fill-stroke-paths-two-tone-icons)) are filled by complete Tailwind class literals on the parent SVG in `iconStyles` (`[&_path[class*='fill-stroke']]:fill-color-*`, plus `hover:` / `group-hover:` variants on interactive types). `IconBase.tsx`'s `renderPaths()` also copies stroke color onto the path as `fill-color-*`, but those strings are built at runtime so JIT will not emit them unless the same class appears as a literal (as it does in `styles.ts`).

#### neutral400
```css
/* Static (icon type) */
stroke: color-neutral-400 (#A3A3A3)
fill: none

/* Interactive (iconButton/iconHover type) */
stroke: color-neutral-400 → color-hover (#E879F9)
hover/group-hover: color-hover
cursor: pointer
```

#### neutral500 (Default)
```css
/* Static (icon type) */
stroke: color-neutral-500 (#737373)
fill: none

/* Interactive (iconButton/iconHover type) */
stroke: color-neutral-500 → color-hover (#E879F9)
hover/group-hover: color-hover
cursor: pointer
```

#### neutral600
```css
/* Static (icon type) */
stroke: color-neutral-600 (#525252)
fill: none

/* Interactive (iconButton/iconHover type) */
stroke: color-neutral-600 → color-hover (#E879F9)
hover/group-hover: color-hover
cursor: pointer
```

#### primary400
```css
/* Static (icon type) */
stroke: color-primary-400 (#E879F9)
fill: none

/* Interactive (iconButton/iconHover type) */
stroke: color-primary-400 → color-hover (#E879F9)
hover/group-hover: color-hover
cursor: pointer
```

#### primary500
```css
/* Static (icon type) */
stroke: color-primary-500 (#D946EF)
fill: none

/* Interactive (iconButton/iconHover type) */
stroke: color-primary-500 → color-hover (#E879F9)
hover/group-hover: color-hover
cursor: pointer
```

#### primary600
```css
/* Static (icon type) */
stroke: color-primary-600 (#C026D3)
fill: none

/* Interactive (iconButton/iconHover type) */
stroke: color-primary-600 → color-hover (#E879F9)
hover/group-hover: color-hover
cursor: pointer
```

#### Custom
- No predefined colors
- Full control via className
- Supports gradient fills
- Conditional color logic

### Size Options

| Size | Dimensions | Responsive | Use Case |
|------|-----------|------------|----------|
| **xxxs** | 12px × 12px | No | Tiny indicators, badges |
| **xxs** | 16px × 16px | No | Small UI elements |
| **xs** | 20px × 20px | No | Compact icons |
| **sm** | 24px × 24px | No | Regular small icons |
| **md** | 28px × 28px | No | Standard medium icons |
| **lg** | 32px × 32px | No | Large icons |
| **xl** | 36px × 36px | No | Extra large icons |
| **xxl** | 40px × 40px | No | Hero icons |
| **xxsR** | 16px/12px* | Yes | Responsive tiny |
| **xsR** | 20px/16px* | Yes | Responsive compact |
| **smR** | 24px/20px* | Yes | Responsive small |
| **mdR** | 28px/24px* | Yes | Responsive medium |
| **lgR** | 32px/28px* | Yes | Responsive large |
| **xlR** | 36px/32px* | Yes | Responsive XL |
| **xxlR** | 40px/36px* | Yes | Responsive XXL |
| **custom** | Custom | Manual | Full size control |

*Responsive sizes: mobile/tablet

### Weight Options

| Weight | Stroke Width | Use Case |
|--------|--------------|----------|
| **extraLight** | 0.75 | Loading icons, delicate graphics |
| **light** | 1.0 | Subtle icons, secondary elements |
| **normal** | 1.25/1.0* | Default weight, standard icons |
| **bold** | 1.25 | Emphasis, primary actions |
| **custom** | Manual | Full control via className |

*Responsive weights: mobile/tablet (only `normal` currently varies by breakpoint)

## Core Components

### Server-Side Components (`components/icon/`)

- **styles.ts**: Icon style system and variants
  - **Purpose**: Centralized icon styling with type-safe variants
  - **Exports**:
    - `iconStyles`: Complete style object with types, colors, sizes, weights
    - `IconVariants`: TypeScript interface
    - `placeholderPalette()`: Function for placeholder colors
    - `globalSvgAttributes`: Shared SVG properties
  - **Location**: `components/icon/styles.ts`
  - **Features**:
    - 2 icon types (icon, iconButton)
    - 6 color palettes with 5-step gradient system (neutral400, neutral500, neutral600, primary400, primary500, primary600) + custom
    - 15 size options (8 standard + 7 responsive)
    - 5 weight options
    - Special fill-stroke path support

- **paths.ts**: SVG path data library
  - **Purpose**: Centralized storage for all icon SVG paths
  - **Content**: 80+ icon paths from Huge Icons (Phosphor style)
  - **Categories**:
    - Social media: Twitter, Telegram, Discord, GitHub
    - UI controls: Menu, Close, Search, Filter, Sort
    - Bitcoin: Wallet, Transaction, Block, History
    - Carets: Up, Down, Left, Right, Double variants
    - Media: Play, Pause, Share, Copy
    - Status: Locked, Unlocked, Divisible, Atom
    - Notifications: Info, Error, Success
    - Placeholder: Base paths and text paths
  - **Location**: `components/icon/paths.ts`

- **IconBase.tsx**: Main icon component
  - **Component**: `Icon`
  - **Purpose**: Renders SVG icons with dynamic styling
  - **Props**: See Type Definitions section
  - **Features**:
    - iconNameMap for user-friendly icon names
    - Multi-path icon support
    - Fill-stroke path handling
    - Two-tone color accent support
    - Link/button rendering with href prop
    - ARIA accessibility attributes
    - Fresh partial navigation support
  - **Location**: `components/icon/IconBase.tsx`

- **LoadingIcon.tsx**: Animated loading spinner
  - **Purpose**: Loading state indicator with animation
  - **Features**: Rotating animation, consistent styling, extraLight weight
  - **Usage**: Loading states, async operations

- **LogoIcon.tsx**: Stampchain logo link
  - **Component**: `LogoIcon`
  - **Purpose**: Renders the Stampchain wordmark/logo as a clickable link (defaults to `/home`)
  - **Props**: `href`, `onClick`, `className`, `ariaLabel`, `"f-partial"`, `children`
  - **Implementation note**: Uses the `stampchain` icon (`type="icon"`) rather than an `<img>` tag loading an SVG asset directly, because the logo's gradient-based static SVGs (`static/img/logo/logo-duotone-gradient.svg`) break `stroke:url(#gradient)` references during Fresh island hydration. `type="icon"` is used instead of `iconButton` to avoid nesting a second `<a>` inside the wrapping link, which would break the flex layout during SSR.
  - **Location**: `components/icon/LogoIcon.tsx`

- **UserProfileIcon.tsx**: Shared creator/artist avatar icon
  - **Component**: `UserProfileIcon`
  - **Purpose**: Renders the `userCircle` icon next to a creator name/address, consolidating repeated icon+wrapper markup used across cards and detail headers
  - **Props**: `size` (default `"custom"`), `weight` (default `"custom"`), `className`, `wrapperClassName`, `link` (adds `group`/`cursor-pointer` + hover-color transition for linked creator names), `children` (creator name/address markup rendered inline next to the icon)
  - **Location**: `components/icon/UserProfileIcon.tsx`

- **PlaceholderImageIcon.tsx**: Placeholder image component
  - **Component**: `PlaceholderImage`
  - **Purpose**: Unified placeholder system for missing/special content
  - **Variants**: no-image, audio, library, error
  - **Features**:
    - Type-safe variant system
    - Color-coded palettes
    - SVG text-as-paths for labels
    - Consistent sizing and styling
  - **Location**: `components/icon/PlaceholderImageIcon.tsx`

### Additional Components

- **BadgeIcon**: Badge display component (defined in IconBase.tsx)
  - **Purpose**: Display text badges with icon styling
  - **Props**: `text`, `className`

## Type Definitions

### Icon Props
```typescript
export interface IconVariants {
  type: "icon" | "iconHover" | "iconButton";
  name: string;
  weight: "extraLight" | "light" | "normal" | "bold" | "custom";
  size: "xxxs" | "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl" |
        "xxsR" | "xsR" | "smR" | "mdR" | "lgR" | "xlR" | "xxlR" | "custom";
  color: "neutral400" | "neutral500" | "neutral600" | "primary400" | "primary500" | "primary600" | "custom";
  className?: string;
  role?: JSX.AriaRole;
  ariaLabel?: string;
  isOpen?: boolean;
  onClick?: (e: MouseEvent) => void;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  href?: string;
  target?: string;
  rel?: string;
  text?: string;
  "f-partial"?: string;
  // Two-tone accent support
  colorAccent?: string;
  colorAccentHover?: string;
}
```

### Placeholder Types
```typescript
export type PlaceholderVariant = "no-image" | "audio" | "library" | "error";

type Palette = {
  bg: string;
  stroke: string;
  fill: string;
};

export const placeholderColor: Record<"neutral" | "red" | "green" | "orange", Palette>;

export const variantColor: Record<PlaceholderVariant, keyof typeof placeholderColor>;

export function placeholderPalette(variant: PlaceholderVariant): Palette;
```

### Badge Props
```typescript
export interface BadgeVariants {
  text: string;
  className?: string;
}
```

### Global SVG Attributes
```typescript
export const globalSvgAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
} as const;
```

## Available Icons

### Icon Name Map Reference

The system includes 80+ icons mapped through `iconNameMap`:

**Social Media**
- `stampchain`, `twitter`, `telegram`, `github`, `discord`, `website`, `email`

**UI Controls**
- `menu`, `close`, `expand`, `search`, `filter`, `listAsc`, `listDesc`, `sortAsc`, `sortDesc`
- `tools`, `speedSlow`, `speedMedium`, `speedFast`

**View Mode**
- `viewCardRow`, `viewCardVertical`, `viewCardSquare`, `viewCardHorizontal`

**Carets**
- `caretUp`, `caretDown`, `caretLeft`, `caretRight`, `caretDoubleLeft`, `caretDoubleRight`

**Art Stamp & Collection / SRC-20 Token**
- `artStamp`, `artStamps`, `src20Token`, `src20Tokens`

**Stamp Specific**
- `share`, `copyLink`, `twitterImage`, `previewImage`, `previewCode`, `previewImageRaw`
- `play`, `pause`, `locked`, `unlocked`, `keyburned`, `divisible`, `recursive`, `atom`, `dispenserListings`

**Wallet**
- `view`, `hide`, `userCircle`, `collection`, `copy`, `edit`, `pencil`

**SRC-101**
- `chartUp`, `chartDown`

**Bitcoin**
- `bitcoin`, `bitcoins`, `bitcoinTx`, `bitcoinBlock`, `listings`, `version`, `send`, `receive`, `history`, `wallet`, `donate`, `explorer`

**Tools & Misc**
- `stamp`, `uploadImage`, `downloadImage`, `loading`, `refresh`, `eye`, `externallink`

**Notifications**
- `info`, `error`, `success`

## Usage Examples

### Basic Static Icon
```tsx
import { Icon } from "$icon";

export function SocialLink() {
  return (
    <Icon
      type="icon"
      name="telegram"
      weight="normal"
      size="sm"
      color="neutral400"
    />
  );
}
```

### Interactive Icon Button
```tsx
import { Icon } from "$icon";

export function CloseButton() {
  return (
    <Icon
      type="iconButton"
      name="close"
      weight="bold"
      size="md"
      color="primary400"
      onClick={() => handleClose()}
      ariaLabel="Close Dialog"
    />
  );
}
```

### Icon as Link
```tsx
import { Icon } from "$icon";

export function TwitterLink() {
  return (
    <Icon
      type="iconButton"
      name="twitter"
      weight="bold"
      size="mdR"
      color="primary400"
      href="https://twitter.com/stampchain_io"
      target="_blank"
      rel="noopener noreferrer"
      ariaLabel="Follow us on Twitter"
    />
  );
}
```

### Responsive Icon with Custom Color
```tsx
import { Icon } from "$icon";

export function CustomIcon() {
  return (
    <Icon
      type="iconButton"
      name="close"
      weight="bold"
      size="mdR"
      color="custom"
      className="stroke-red-500 hover:stroke-green-500"
      onClick={() => handleClose()}
    />
  );
}
```

### Conditional Icon (Play/Pause)
```tsx
import { Icon } from "$icon";

export function MediaControl({ isPlaying }) {
  return (
    <Icon
      type="iconButton"
      name={isPlaying ? "pause" : "play"}
      weight="bold"
      size="xxl"
      color="custom"
      className="p-6 fill-color-grey hover:fill-color-grey-light transition-all duration-300"
      onClick={() => togglePlay()}
    />
  );
}
```

### Icon with Fresh Partial Navigation
```tsx
import { Icon } from "$icon";

export function NavIcon() {
  return (
    <Icon
      type="iconButton"
      name="search"
      weight="bold"
      size="md"
      color="primary400"
      href="/search"
      f-partial="/search"
    />
  );
}
```

### Loading Icon
```tsx
import { LoadingIcon } from "$icon";

export function LoadingState() {
  return (
    <div class="flex items-center justify-center">
      <LoadingIcon />
    </div>
  );
}
```

### Logo Link
```tsx
import { LogoIcon } from "$icon";

export function HeaderLogo() {
  return (
    <LogoIcon href="/home" ariaLabel="Stampchain home">
      <span class="hidden tablet:inline">Stampchain</span>
    </LogoIcon>
  );
}
```

### Creator Avatar with Name
```tsx
import { UserProfileIcon } from "$icon";

export function CreatorLabel({ creatorName }: { creatorName: string }) {
  return (
    <UserProfileIcon link size="xs" weight="bold">
      <span class="group-hover:text-color-hover">{creatorName}</span>
    </UserProfileIcon>
  );
}
```

### Placeholder Image
```tsx
import { PlaceholderImage } from "$icon";

export function StampImage({ imageUrl }) {
  return (
    <>
      {imageUrl ? (
        <img src={imageUrl} alt="Stamp" />
      ) : (
        <PlaceholderImage variant="no-image" />
      )}
    </>
  );
}
```

### Placeholder for Audio Content
```tsx
import { PlaceholderImage } from "$icon";

export function AudioContent({ isAudio, contentUrl }) {
  return (
    <>
      {isAudio ? (
        <PlaceholderImage variant="audio" />
      ) : (
        <img src={contentUrl} alt="Content" />
      )}
    </>
  );
}
```

### Placeholder for Error State
```tsx
import { PlaceholderImage } from "$icon";

export function ErrorPlaceholder() {
  return <PlaceholderImage variant="error" />;
}
```

## PlaceholderImage Component

### Overview

The `PlaceholderImage` component provides a unified system for rendering placeholder images throughout the app, replacing legacy static SVG file approaches.

### Advantages

- ✅ **Type Safety**: TypeScript types for all variants and palettes
- ✅ **Consistency**: Matches Huge Icons and LoadingIcon styling
- ✅ **Performance**: No external file requests, direct inline rendering
- ✅ **Maintainability**: Single source of truth in code
- ✅ **Dynamic Styling**: Color-coded by variant type

### Variants & Palettes

#### no-image (Neutral Palette)
- **Use**: Default placeholder for missing/unavailable images
- **Colors**: Neutral gradient background, neutral stroke/fill

#### audio (Orange Palette)
- **Use**: Audio file placeholder
- **Colors**: Orange gradient background, orange stroke/fill

#### library (Green Palette)
- **Use**: Library/collection file placeholder
- **Colors**: Green gradient background, green stroke/fill

#### error (Red Palette)
- **Use**: Error state placeholder
- **Colors**: Red gradient background, red stroke/fill

### Color System

```typescript
export const placeholderColor = {
  neutral: {
    bg: "bg-gradient-to-br from-color-neutral-500 via-color-neutral-700 to-color-neutral-900",
    stroke: "stroke-color-neutral-500",
    fill: "fill-color-neutral-500"
  },
  red: {
    bg: "bg-gradient-to-br from-color-red-semidark/75 via-color-red-dark/75 to-black",
    stroke: "stroke-color-red-semidark",
    fill: "fill-color-red-semidark"
  },
  green: {
    bg: "bg-gradient-to-br from-color-green-semidark/75 via-color-green-dark/75 to-black",
    stroke: "stroke-color-green-semidark",
    fill: "fill-color-green-semidark"
  },
  orange: {
    bg: "bg-gradient-to-br from-color-orange-semidark/75 via-color-orange-dark/75 to-black",
    stroke: "stroke-color-orange-semidark",
    fill: "fill-color-orange-semidark"
  }
};
```

### Component Structure

The component:
1. Retrieves palette from `placeholderPalette(variant)`
2. Combines base paths (shared geometry) with variant-specific text paths
3. Applies dynamic `stroke`, `fill`, and `bg` classes
4. Renders inline SVG with `viewBox="0 0 24 24"`

### Migration from Legacy System

**Before (Legacy)**:
```tsx
import { NOT_AVAILABLE_IMAGE, AUDIO_FILE_IMAGE } from "$constants/images";

<img src={NOT_AVAILABLE_IMAGE} alt="Not available" />
<img src={AUDIO_FILE_IMAGE} alt="Audio file" />
```

**After (Current)**:
```tsx
import { PlaceholderImage } from "$icon";

<PlaceholderImage variant="no-image" />
<PlaceholderImage variant="audio" />
```

## Adding New Icons

### Step 1: Add Icon Path to paths.ts

Add the SVG path data to `components/icon/paths.ts`. Icons must be stroke-based SVG with `viewBox="0 0 24 24"`.

**Source**: Use icons from [Figma Phosphor Icon Set](https://www.figma.com/community/file/903830135544202908/phosphor-icons)

#### Single Path Icon
```typescript
export const newIcon = "M12 5L18 12L12 19L6 12L12 5Z";
```

#### Multi-Path Icon
```typescript
export const complexIcon = [
  "M12 5L18 12L12 19L6 12L12 5Z",
  "M9 9L15 15",
  "M15 9L9 15"
];
```

#### Icon with Fill-Stroke Paths
```typescript
export const mixedIcon = [
  "M12 5L18 12L12 19L6 12L12 5Z", // Regular stroke path
  {
    path: "M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z",
    style: "stroke-none fill-stroke"  // Gets fill color matching icon stroke
  }
];
```

### Step 2: Add to iconNameMap

Map the user-facing icon name to the internal path name in `IconBase.tsx`:

```typescript
const iconNameMap = {
  // ... existing mappings
  newIconName: "newIcon",      // maps name="newIconName" to newIcon path
  anotherName: "complexIcon",  // maps name="anotherName" to complexIcon path
  someName: "mixedIcon"        // maps name="someName" to mixedIcon path
};
```

### Step 3: Use the Icon

Now you can use the icon anywhere:

```tsx
<Icon
  type="iconButton"
  name="newIconName"
  weight="normal"
  size="md"
  color="primary500"
/>
```

## Technical Implementation

### Style Composition

Icons use a base style combined with type-specific, color, weight, and size styles. Both `iconHover` and `iconButton` share the `iconButton` color styles (only the wrapper markup differs):

```typescript
const isInteractive = type === "iconButton" || type === "iconHover";

const combinedClasses = `${iconStyles.base} ${iconStyles.size[size]} ${
  isInteractive
    ? iconStyles.iconButton[color]
    : iconStyles.icon[color].replace("stroke-1", "")
} ${iconStyles.weight[weight]} group ${className}`;
```

### Interactive Wrapper (`iconHover` / `iconButton`)

For `type="icon"`, the bare `<svg>` is returned and click/hover/ARIA props are applied directly to it. For `iconHover` and `iconButton`, the `<svg>` is wrapped in an `<a>` so the clickable/hoverable area matches the visible element instead of being limited to the inner `<svg>`. Only `iconButton` receives the `iconButtonPill` hover background; `iconHover` gets the same color transition without the padded pill:

```tsx
<a
  href={href}
  target={target}
  rel={rel}
  role={role || "button"}
  aria-label={ariaLabel || name}
  onClick={onClick}
  onMouseEnter={onMouseEnter}
  onMouseLeave={onMouseLeave}
  class={`inline-flex items-center group cursor-pointer ${
    type === "iconButton" ? iconButtonPill : ""
  }`}
>
  {svgElement}
</a>
```

### Two-Tone Icon Support

Icons can have accent colors on specific paths:

```typescript
// In iconNameMap, special handling for last path
if (isLast && colorAccent) {
  const accentClass = `stroke-[${colorAccent}]`;
  const accentHoverClass = colorAccentHover
    ? `group-hover:stroke-[${colorAccentHover}]`
    : "";
  return <path d={pathItem} class={`${accentClass} ${accentHoverClass}`} />;
}
```

### Fill-Stroke Path Handling

Some icons need filled elements that match the stroke color. `fill-stroke` is a
marker class, not a fill utility. The parent SVG must include complete Tailwind
literals so JIT emits CSS (SVG `fill-none` is inherited otherwise):

```typescript
// Path object — marker only
{
  path: "M12 13C12.5523 13...",
  style: "stroke-none fill-stroke"
}

// iconStyles.icon / iconStyles.iconButton — these strings must stay literal
"[&_path[class*='fill-stroke']]:fill-color-neutral-400"
"hover:[&_path[class*='fill-stroke']]:fill-color-hover"
"group-hover:[&_path[class*='fill-stroke']]:fill-color-hover"
```

### Import Flow

```
Application Component
        ↓
Import from $icon alias
        ↓
Icon component with props
        ↓
getIconPath() maps name → path
        ↓
renderPaths() creates SVG elements
        ↓
Style composition applies classes
        ↓
Rendered inline SVG
```

### SVG Global Attributes

All icons share these SVG attributes:

```typescript
{
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
}
```

## Performance Considerations

- **Inline SVG**: No external requests, immediate rendering
- **CSS-based Animations**: GPU-accelerated transforms
- **Minimal JavaScript**: Static rendering when possible
- **Type Safety**: Compile-time error checking
- **Tree-Shaking**: Only used icons included in bundle
- **Wildcard Imports**: All paths imported via single import statement

## Accessibility Features

- **ARIA Labels**: Automatic or custom labels for screen readers
- **Role Attributes**: Proper button role for interactive icons
- **Keyboard Support**: Full keyboard navigation for iconButton type
- **Focus Indicators**: Visual focus states (inherited from parent)
- **Semantic Markup**: Proper link/button elements with href
- **Alt Text**: Placeholder images include proper context

## Best Practices

### Type Selection
- Use `type="icon"` for static display icons
- Use `type="iconButton"` for all interactive icons
- Always provide `onClick` handler for iconButton type

### Color Selection
- **neutral400**: Brightest neutral, high visibility neutral elements
- **neutral500**: Default neutral icons, standard visibility
- **neutral600**: Subtle, less prominent neutral icons
- **primary400**: Brightest primary, brand actions with high emphasis
- **primary500**: Default primary icons, standard brand visibility
- **primary600**: Subtle primary, less prominent brand elements
- **custom**: Full control for special cases (gradients, conditional colors)

### Size Selection
- Use responsive sizes (`mdR`, `lgR`) for adaptive UI
- `md` or `mdR` as default for most icons
- `sm` for compact layouts, mobile
- `lg` or `xl` for prominent actions
- Match icon size to button size in buttons

### Weight Selection
- **normal**: Default weight for most icons
- **bold**: Emphasis, primary actions
- **light**: Subtle, secondary elements
- **extraLight**: Loading spinners, delicate graphics
- **custom**: Manual control when needed

### Accessibility
- Always provide meaningful `ariaLabel` for iconButton
- Use semantic `href` for links
- Include `target="_blank"` and `rel="noopener noreferrer"` for external links
- Ensure sufficient color contrast

### Performance
- Avoid inline style objects, use className
- Leverage CSS transitions for hover effects
- Use appropriate weight to minimize rendering complexity
- Consider icon caching for frequently used icons

## Common Patterns

### Social Media Link
```tsx
<Icon
  type="iconButton"
  name="twitter"
  weight="bold"
  size="mdR"
  color="primary500"
  href="https://twitter.com/stampchain_io"
  target="_blank"
  rel="noopener noreferrer"
/>
```

### Close Button
```tsx
<Icon
  type="iconButton"
  name="close"
  weight="bold"
  size="md"
  color="neutral500"
  onClick={handleClose}
  ariaLabel="Close"
/>
```

### Loading Indicator
```tsx
{isLoading && <LoadingIcon />}
```

### Status Icon
```tsx
<Icon
  type="icon"
  name={isLocked ? "locked" : "unlocked"}
  weight="normal"
  size="sm"
  color="neutral500"
/>
```

### Navigation Icon
```tsx
<Icon
  type="iconButton"
  name="caretRight"
  weight="bold"
  size="xs"
  color="primary500"
  onClick={handleNext}
/>
```

## Troubleshooting

### Issue: Icon not rendering
**Solution**: Check that icon name exists in `iconNameMap` in `IconBase.tsx`. Verify path is exported from `paths.ts`.

### Issue: Hover colors not working
**Solution**: Ensure `type="iconButton"` is used. Verify parent has `group` class if using group-hover.

### Issue: Icon size not responsive
**Solution**: Use responsive size variants (`mdR`, `lgR`) instead of static sizes (`md`, `lg`).

### Issue: Custom colors not applying
**Solution**: When using `color="custom"`, all color styling must be in `className`. No default colors are applied.

### Issue: Fill-stroke path not colored
**Solution**: Path objects need `style: "stroke-none fill-stroke"`. The matching `[&_path[class*='fill-stroke']]:fill-color-*` class must remain a complete literal on the SVG in `iconStyles` (`styles.ts`). Runtime `fill-*` strings in `IconBase` are not enough for Tailwind JIT.

### Issue: Icon too thick/thin
**Solution**: Adjust `weight` prop. Use `bold` for thicker, `light` for thinner, or `custom` with `[stroke-width:X]` in className.

## Related Components

- **Button System**: Icons integrated in ButtonIcon component ([button/doc.md](mdc:components/button/doc.md))
- **Layout System**: Icons use transition utilities from layout ([layout/doc.md](mdc:components/layout/doc.md))
- **Notification System**: Icons for toast notifications (info, error, success) ([notification/doc.md](mdc:components/notification/doc.md))

---

**Last Updated:** August 23, 2026
**Author:** baba
