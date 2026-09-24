# Toast Notification System Documentation

## Overview

The Toast notification system provides a user-friendly way to display temporary notifications throughout the application. Built with Preact Signals for reactive state management, it offers consistent styling, smooth animations, and flexible configuration options.

**New Feature:** The system now includes a dedicated `NotificationUpdate` component for one-time major release announcements. See [NotificationUpdate Component](#notificationupdate-component) section for details.

## Core Components

### Notification Display Components
- **ToastComponent.tsx** (`islands/Toast/`): Individual toast notification rendering component
- **ToastProvider.tsx** (`islands/Toast/`): Toast state management and lifecycle handler
- **NotificationUpdate.tsx** (`islands/Toast/`): One-time update announcement component for major releases

### Style & Signal Management
- **styles.ts** (`components/notification/`): Style definitions for notification containers and variants
- **toastSignal.ts** (`lib/utils/ui/notifications/`): Global signal for triggering toasts from anywhere in the app

### Type Definitions
- **types**: Type definitions in `lib/types/ui.d.ts` and `lib/types/utils.d.ts`

### Documentation
- **doc.md**: This documentation

## Design System Integration

The Toast notification system follows the app's dark-themed glassmorphism design principles:

### Visual Styling
- **Border radius**: `rounded-2xl`
- **Backdrop blur**: `backdrop-blur-md`
- **Shadow**: `$layout` `shadow` token
- **Padding**: `px-4 pt-3 pb-4` with a 1px border
- **Position**: `fixed top-5 inset-x-5 z-notification`; from `min-[460px]` left-aligned (`left-5 right-auto`)
- **Width**: Defined on `ToastComponent` (not the style tokens). Below 420px the toast spans `inset-x-5` (`!w-auto`). From `min-[420px]` up it caps at `max-w-[420px]` (while still spanning `inset-x-5` until 460px, at which point `left-5 right-auto` take over). Inner `notificationContainer` is `w-full` of that wrapper.
- **Colors**: Type-specific palettes (`neutral`, `green`, `orange`, `red`) with gradient backgrounds from the [Tailwind color system](mdc:components/layout/doc.md#tailwind-color-system)

Shared container classes (`notificationContainer` in `styles.ts`):

```
w-full px-4 pt-3 pb-4 border rounded-2xl backdrop-blur-md ${shadow}
```

### Style Variants

Containers use `notificationContainer*` tokens from `components/notification/styles.ts`.

#### Info (`notificationContainerInfo`)
```typescript
bg-gradient-to-br from-color-neutral-800/90 via-color-neutral-900/80 to-color-neutral-1000/90
border-color-neutral-500
```

#### Success (`notificationContainerSuccess`)
```typescript
bg-gradient-to-br from-color-green-950/90 via-color-neutral-900/80 to-color-neutral-1000/90
border-color-green-700
```

#### Warning (`notificationContainerWarning`)
```typescript
bg-gradient-to-br from-color-orange-950/90 via-color-neutral-900/80 to-color-neutral-1000/90
border-color-orange-500
```

#### Error (`notificationContainerError`)
```typescript
bg-gradient-to-br from-color-red-950/90 via-color-neutral-900/80 to-color-neutral-1000/90
border-color-red-700
```

### Type Accents

Icons and progress bars use the same accent tokens:

| Type | Icon stroke | Progress bar |
|------|-------------|--------------|
| **info** | `stroke-color-neutral-400` | `bg-color-neutral-500` |
| **success** | `stroke-color-green-700` | `bg-color-green-700` |
| **warning** | `stroke-color-orange-500` | `bg-color-orange-500` |
| **error** | `stroke-color-red-700` | `bg-color-red-700` |

Inline text overrides (gallery error/success copy, not toast layout):

- `notificationTextError`: `!text-color-red-400`
- `notificationTextSuccess`: `!text-color-green-400`

## Notification Types

The system supports **4 status message types** with distinct visual treatments:

| Type | Icon | Accent | Duration | Auto-Dismiss | Use Case |
|------|------|--------|----------|--------------|----------|
| **info** | info | `color-neutral-400` / `500` | 7000ms | ✅ Yes (default) | General information, updates |
| **success** | success | `color-green-700` | 3000ms | ✅ Yes (default) | Successful operations |
| **warning** | info | `color-orange-500` | 7000ms | ✅ Yes (default) | Warnings requiring attention |
| **error** | error | `color-red-700` | 7000ms | ✅ Yes (default) | Error messages |

`ToastProvider.getDuration()` returns `3000` for success and `7000` for every other type. `shouldAutoDismiss()` always returns `true`; pass `autoDismiss: false` as the third `showToast` argument to keep a toast until the user closes it.

### Type Characteristics

- **Info**: Neutral palette (`neutral-800` → `neutral-1000`, border `neutral-500`)
- **Success**: Green accent (`green-950` gradient, `green-700` border/icon)
- **Warning**: Orange accent (`orange-950` gradient, `orange-500` border/icon)
- **Error**: Red accent (`red-950` gradient, `red-700` border/icon)

## Integration

### Global Setup

The `ToastProvider` wraps app content in `routes/_app.tsx`. `NotificationUpdate` must sit **inside** the provider so it can call `showToast()`:

```tsx
<ToastProvider>
  <NotificationUpdate />
  <NavigatorProvider>
    {/* App content */}
  </NavigatorProvider>
</ToastProvider>
```

### Basic Usage

Import and call `showToast()` from anywhere in the application:

```tsx
import { showToast } from "$lib/utils/ui/notifications/toastSignal.ts";

// Info message (7000ms auto-dismiss)
showToast("Processing your request...", "info");

// Success message (3000ms auto-dismiss)
showToast("Transaction completed successfully!", "success");

// Warning message (7000ms auto-dismiss)
showToast("High network fees detected", "warning");

// Error message (7000ms auto-dismiss)
showToast("Failed to connect to wallet", "error");
```

### Multi-line Messages

The system supports multi-line messages. **Default toasts** render every line with `notificationBody` (regular weight, `text-color-neutral-200`):

```tsx
showToast(
  "Transaction Submitted\nTxID: abc123...\nEstimated confirmation: 10 minutes",
  "success"
);
```

The **update announcement** toast (`isUpdate: true`) is the only variant that splits lines by role. See [Message Layout Variants](#message-layout-variants).

### Manual Dismiss Override

Disable auto-dismiss for messages requiring user acknowledgment:

```tsx
// Persistent message (requires manual close)
showToast("Please review these important terms", "info", false);

// Override default behavior for any type
showToast("Custom behavior message", "success", false);
```

## Message Layout Variants

`ToastComponent` has two typography layouts, controlled by the optional `isUpdate` flag on `showToast()`.

Typography tokens (from `styles.ts`):

| Token | Color |
|-------|--------|
| `notificationHeader` | `text-color-neutral-200` |
| `notificationBody` | `text-color-neutral-200` |
| `notificationFooter` | `text-color-neutral-400` |

### Default (`isUpdate` omitted / `false`)

Used by every toast except the one-time update announcement.

- **All lines** use `notificationBody`: `font-normal text-sm text-color-neutral-200`
- An optional `body` prop (JSX/children) also uses `notificationBody`
- Remaining `\n` lines keep `whitespace-pre-line`

```tsx
showToast("Wallet connected successfully", "success");
showToast("Failed to create stamp\nCheck the fee rate and try again", "error");
```

### Update (`isUpdate: true`)

Used only by `NotificationUpdate`. Do not pass `true` from other call sites.

| Line | Style token | Classes |
|------|-------------|--------|
| **First line** | `notificationHeader` | `font-bold text-sm text-color-neutral-200 tracking-wider` |
| **Middle lines** | `notificationBody` | `font-normal text-sm text-color-neutral-200` (+ `whitespace-pre-line`) |
| **Last line** | `notificationFooter` | `font-normal text-sm text-color-neutral-400` (+ `mt-1`) |

Header and body share `text-color-neutral-200`. Footer is muted `text-color-neutral-400` so the cache/refresh note reads as secondary copy under the feature list.

```tsx
showToast(
  NOTIFICATION_UPDATE_MESSAGE,
  "info",
  false,       // autoDismiss
  undefined,   // body
  true,        // isUpdate
);
```

Example message shape:

```
Website Redesign                          ← notificationHeader
• New logo, typeface, and color palette   ← notificationBody
• Reimagined stamp cards ...
• ...

Please clear browser cache ...            ← notificationFooter
```

## Features

### Auto-Dismiss with Progress Bar

- **Visual feedback**: Animated progress bar shows remaining time
- **Type-specific durations**:
  - Success: 3000ms (quick confirmations)
  - Info/Warning/Error: 7000ms (requires more reading time)
- **Smooth animations**: Progress bar uses linear animation
- **Color-coded**: Progress bar matches notification type color

### Manual Close

- **Close button**: Always available, `absolute top-0.5 right-0.5`
- **Icon**: `Icon` `type="iconButton"` `name="close"` `weight="bold"` `size="lg"` `color="neutral400"`
- **Instant response**: Triggers `notification-exit` animation immediately, then removes the toast after 400ms
- **Accessible**: Proper ARIA labels and keyboard support

### Smooth Animations

Defined in `static/styles.css` (400ms, `cubic-bezier(0.46,0.03,0.52,0.96)`):

#### notification-enter Animation (400ms)
```css
@keyframes notification-enter {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

#### notification-exit Animation (400ms)
```css
@keyframes notification-exit {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-100%);
    opacity: 0;
  }
}
```

#### Progress Bar Animation
Track: `mt-2 w-full h-0.5 rounded-full bg-color-neutral-800`. Fill uses the type accent from [Type Accents](#type-accents).

```css
@keyframes progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
```

### State Management

The system uses **Preact Signals** for reactive state management:

1. **Global Signal**: `toastSignal` in `toastSignal.ts` acts as event bus
2. **Provider State**: `ToastProvider` maintains array of active toasts
3. **Lifecycle Management**: Automatic cleanup after animations complete
4. **Collision Prevention**: 50ms signal reset prevents rapid-fire duplicates

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────┐
│           Application Code                  │
│  (Components, Islands, Routes, etc.)        │
└────────────────┬────────────────────────────┘
                 │ showToast()
                 ▼
┌─────────────────────────────────────────────┐
│         toastSignal (Global Signal)         │
│   Preact Signal for reactive updates        │
└────────────────┬────────────────────────────┘
                 │ subscribe
                 ▼
┌─────────────────────────────────────────────┐
│           ToastProvider                     │
│  - Subscribes to toastSignal                │
│  - Manages toast array state                │
│  - Handles auto-dismiss timers              │
│  - Coordinates animations                   │
└────────────────┬────────────────────────────┘
                 │ renders multiple
                 ▼
┌─────────────────────────────────────────────┐
│         ToastComponent (x N)                │
│  - Renders individual toast UI              │
│  - Handles manual close                     │
│  - Shows progress bar                       │
│  - Applies type-specific styling            │
└─────────────────────────────────────────────┘
```

### Component Responsibilities

#### `showToast()` Function
- **Purpose**: Public API for triggering notifications
- **Parameters**: `message`, `type`, `autoDismiss?`, `body?`, `isUpdate?`
- **Behavior**: Updates global signal, clears after 50ms
- **Location**: `lib/utils/ui/notifications/toastSignal.ts`

#### `ToastProvider`
- **Purpose**: State management and lifecycle orchestration
- **Features**:
  - Subscribes to global toast signal
  - Generates unique toast IDs
  - Manages duration and auto-dismiss logic
  - Coordinates notification-exit animations
  - Cleans up completed toasts
- **Location**: `islands/Toast/ToastProvider.tsx`

#### `ToastComponent`
- **Purpose**: Individual toast UI rendering
- **Features**:
  - Type-specific icon selection
  - Color scheme application
  - Default vs `isUpdate` message layout (`notificationBody` vs header/body/footer)
  - Progress bar rendering
  - Manual close handling
- **Location**: `islands/Toast/ToastComponent.tsx`

### Type Definitions

```typescript
// Base toast structure
export interface BaseToast {
  type: "success" | "error" | "warning" | "info";
  message: string;
  autoDismiss?: boolean;
  body?: import("preact").ComponentChildren;
  /** True only for the one-time app update announcement toast. */
  isUpdate?: boolean | undefined;
}

// Internal toast with runtime state
export interface Toast extends Omit<BaseToast, "autoDismiss"> {
  id: string;
  duration: number;
  autoDismiss: boolean;
  isAnimatingOut?: boolean;
}

// Component props
export interface ToastComponentProps {
  id: string;
  message: string;
  body?: ComponentChildren;
  type: "success" | "error" | "warning" | "info";
  onClose: () => void;
  autoDismiss: boolean;
  duration: number;
  isAnimatingOut?: boolean;
  isUpdate?: boolean | undefined;
}
```

## Usage Examples

### Tool Error Messaging

```tsx
// In stamping tool
try {
  const result = await stampTransaction(data);
  showToast("Stamp created successfully!", "success");
} catch (error) {
  showToast(`Failed to create stamp\n${error.message}`, "error");
}
```

### Wallet Interactions

```tsx
// Connection status
showToast("Wallet connected successfully", "success");

// Transaction warnings
showToast(
  "High fees detected\nCurrent rate: 150 sat/vB\nConsider waiting for lower fees",
  "warning"
);
```

### Form Validation

```tsx
// Validation errors
showToast("Please fill in all required fields", "error");

// Success confirmations
showToast("Settings saved successfully", "success");
```

### Network Status

```tsx
// Connection issues
showToast(
  "Network connection lost\nRetrying...",
  "warning",
  false // Persistent until connection restored
);

// Reconnection
showToast("Connection restored", "success");
```

## Accessibility Features

- **ARIA roles**: Toast container uses `role="alert"` for screen readers
- **ARIA labels**: Icons have descriptive labels like "error notification"
- **Keyboard support**: Close button is keyboard accessible
- **Visual indicators**: Color, icon, and animation provide multiple cues
- **Readable durations**: Sufficient time to read messages (3-7 seconds)
- **Manual override**: Option to disable auto-dismiss for complex messages

## Performance Considerations

- **Efficient rendering**: Only active toasts are rendered
- **Cleanup**: Automatic removal after animations complete
- **Signal optimization**: 50ms debounce prevents rapid duplicates
- **Animation performance**: CSS animations use GPU-accelerated transforms
- **Memory management**: Completed toasts are removed from state array

## NotificationUpdate Component

The `NotificationUpdate` component provides a one-time notification system for announcing major app updates to users.

### Purpose
- Display update announcements when users visit after a major release
- Show only once per version using localStorage tracking
- Configurable message, timing, and behavior
- Uses the `isUpdate` layout: header / body / footer line styles

### Location
- **Component**: `islands/Toast/NotificationUpdate.tsx`
- **Integration**: Rendered in `routes/_app.tsx` at the app root level

### Configuration

All settings are self-contained within the component (`islands/Toast/NotificationUpdate.tsx`):

```typescript
const SHOW_NOTIFICATION = true; // feature flag
const DELAY = 2000;
const AUTO_DISMISS = false;
const TYPE = "info" as const;
const NOTIFICATION_UPDATE_VERSION = "feature-update-v3.2";

const NOTIFICATION_UPDATE_MESSAGE = `Website UI Reimagined
• New logo, typeface, and color palette
• Redesigned stamp cards with multiple view modes
• Improved Explorer page with fully featured filters
• Added Marketplace page with listings and sales
• Updated Collection and Wallet pages
• Codebase optimization and performance improvements

Please clear browser cache and refresh the page for all updates to take effect.`;
```

### How It Works

1. **Feature flag**: Exits immediately if `SHOW_NOTIFICATION` is `false`
2. **SSR-safe**: Exits if `window` is undefined
3. **Version check**: Reads `localStorage` for `NOTIFICATION_UPDATE_VERSION`
4. **One-time display**: If not shown, waits `DELAY` (2000ms) then calls `showToast(..., undefined, true)`
5. **Tracking**: Writes `"true"` to that localStorage key after showing

### Usage Example

To create a new update announcement, edit `islands/Toast/NotificationUpdate.tsx`:

```typescript
// 1. Increment the version identifier (current: feature-update-v3.2)
const NOTIFICATION_UPDATE_VERSION = "feature-update-v3.3";

// 2. Update the message: first line = header, bullets = body, last line = footer
const NOTIFICATION_UPDATE_MESSAGE = `New Features Released
• Feature 1 description
• Feature 2 description
• Bug fixes and improvements

Please clear browser cache and refresh the page for all updates to take effect.`;

// 3. Timing / behavior (optional)
const DELAY = 2000;
const AUTO_DISMISS = false;
const SHOW_NOTIFICATION = true;
```

### Implementation Details

The component uses Preact hooks for lifecycle management:

```typescript
export function NotificationUpdate() {
  useEffect(() => {
    if (!SHOW_NOTIFICATION) return;
    if (typeof window === "undefined") return;

    const hasBeenShown = localStorage.getItem(NOTIFICATION_UPDATE_VERSION);
    if (hasBeenShown) return;

    const timer = setTimeout(() => {
      showToast(
        NOTIFICATION_UPDATE_MESSAGE,
        TYPE,
        AUTO_DISMISS,
        undefined,
        true, // isUpdate — header / body / footer typography
      );
      localStorage.setItem(NOTIFICATION_UPDATE_VERSION, "true");
    }, DELAY);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
```

**Key Features:**
- **Feature flag**: `SHOW_NOTIFICATION` can disable the announcement without deleting it
- **SSR-Safe**: Checks for `window` existence before running
- **Zero Visual Footprint**: Returns `null` — pure behavior component
- **Cleanup**: Clears the delay timer on unmount
- **localStorage**: Uses the version string as the storage key

### Integration

Already wired in `routes/_app.tsx` (must stay inside `ToastProvider`):

```tsx
<ToastProvider>
  <NotificationUpdate />
  <NavigatorProvider>
    {/* ... */}
  </NavigatorProvider>
</ToastProvider>
```

### Best Practices

- **Version Naming**: Increment `NOTIFICATION_UPDATE_VERSION` for each new announcement (current: `feature-update-v3.2`)
- **Message Content**: Keep concise but informative; first line is the header, bullets are the body, last line is the muted footer
- **isUpdate**: Always pass `true` as the fifth `showToast` argument so header/footer styles apply
- **Timing**: 2-3 second delay prevents overwhelming users on page load
- **Auto-Dismiss**: Set to `false` for important announcements requiring acknowledgment
- **Frequency**: Use sparingly for major updates only, not minor bug fixes
- **Testing**: Clear localStorage to test multiple times: `localStorage.clear()` in console

## Future Enhancements

As outlined in [Issue #860](https://github.com/stampchain-io/stampchain.io/issues/860):

### Planned Improvements

1. **Global Message Strings**
   - Refactor to centralized message file for easier maintenance
   - Consistent messaging across the application
   - Easier localization support

2. **Transaction Confirmations**
   - Real-time transaction status updates
   - Confirmation notifications when transactions complete
   - Display on wallet connection if confirmations occurred while disconnected

3. **Naming Refactor**
   - Consider renaming "Toast" folders/files to "notification"
   - Improve consistency with component naming conventions

4. **Enhanced Tool Integration**
   - Move all tool error messaging to toast notifications
   - Review info messages for manual dismissal requirements
   - Standardize MARA message handling

## Related Components

- **Icon System**: Uses `$icon` for notification icons ([icon/doc.md](mdc:components/icon/doc.md))
- **Layout System**: Follows glassmorphism design principles ([layout/doc.md](mdc:components/layout/doc.md))
- **Notification Styles**: Style definitions in `components/notification/styles.ts`
- **Global Styles**: Animation keyframes in `static/styles.css`
- **Inline gallery errors**: `SRC20Deploys`, `SRC20Mints`, and `SRC20Transfers` reuse `notificationContainerError`, `notificationHeader`, `notificationBody`, and `notificationTextError` (not the toast overlay)

## Best Practices

### Message Content
- **Be concise**: First line should summarize the message (header only on `isUpdate` toasts)
- **Provide context**: Use additional lines for details; default toasts keep the same body style on every line
- **Action-oriented**: Tell users what happened and what to do next
- **Consistent tone**: Match message style to notification type

### Type Selection
- **Info**: General updates, status changes, informational content
- **Success**: Confirmations of completed actions
- **Warning**: Non-critical issues requiring attention
- **Error**: Failed operations, critical issues

### Duration Considerations
- **Success**: 3000ms is sufficient for quick confirmations
- **Others**: 7000ms allows time to read detailed messages
- **Manual dismiss**: Use `autoDismiss: false` for:
  - Complex multi-step instructions
  - Critical information requiring acknowledgment
  - Persistent status indicators

### Multiple Toasts
- The provider can hold multiple toasts in state
- Each toast has a unique ID and independent lifecycle
- All toasts use the same `fixed top-5` position, so they overlay rather than stack
- Consider user experience when triggering multiple toasts rapidly

---

**Last Updated:** August 23, 2026
**Author:** baba
