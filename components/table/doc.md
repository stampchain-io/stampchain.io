# Table System Documentation

## Overview

The Table system provides a comprehensive, scalable solution for displaying tabular data throughout the application. Built with both server-side rendered and client-side interactive components, it offers consistent styling, responsive design, infinite scroll, sticky columns, and specialized handling for different data types following the app's dark-themed glassmorphism principles.

## Architecture

### Component Hierarchy
```
┌─────────────────────────────────────────────────────┐
│  Layout System (types.ts, styles.ts)                │
│  - colGroup() column width helper                   │
│  - cellAlign() alignment helper                      │
│  - Cell styling variants (L2Detail, L2Card)          │
│  - cellStickyLeft / cellStickyLeft2 sticky columns   │
│  - ScrollContainer + EmptyState components           │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│  Server-Side Tables (components/table/)             │
│  - HoldersTable.tsx: Holders with pie chart          │
│  - explorerTable/: Unified stamps + SRC20 feed       │
│  - marketplaceTable/: Listings & sales (buy flow)    │
│  - src20DetailsTable/: Mints, Transfers (per-token)  │
│  - src20OverviewTable/: Minting/market grid tables   │
│  - stampDetailsTable/: Listings, Sales, Transfers    │
│  - walletTable/: Reserved for wallet-specific tables │
│  - Static data rendering                             │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│  Interactive Islands (islands/table/)               │
│  - DetailsTableBase: Tabbed table orchestrator      │
│  - HoldersTableBase: Infinite scroll table          │
│  - HoldersPieChart: Data visualization              │
│  - UploadImageTable: Image upload workflow          │
│  - Client-side state management                     │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│  Application Integration                            │
│  - Stamp detail pages                               │
│  - SRC20 token pages                                │
│  - Explorer / home feed & marketplace pages         │
│  - Collection views                                 │
│  - Tool interfaces                                  │
└─────────────────────────────────────────────────────┘
```

## Design Principles

### Table Types

| Type | Implementation | State | Use Case |
|------|---------------|-------|----------|
| **Server-Side** | components/table/ | Static | Pre-rendered data, SEO-friendly content |
| **Interactive** | islands/table/ | Dynamic | Paginated data, infinite scroll, tabs |

### Data Categories

| Category | Directory | Tables | Features |
|----------|-----------|--------|----------|
| **Holders** | components/table/ | HoldersTable | Balance distribution, pie chart, percentages |
| **Explorer** | explorerTable/ | ExplorerTableBase, StampOverview, SRC20Overview | Mixed stamps + SRC20 feed, sticky image/number columns |
| **Marketplace** | marketplaceTable/ | MarketplaceTableBase, StampListings, StampSales | Listings, sales, dispenser pricing, buy-now flow |
| **SRC20 Details** | src20DetailsTable/ | SRC20Mints, SRC20Transfers | Per-token mint/transfer history |
| **SRC20 Overview** | src20OverviewTable/ | SRC20Minting(Compact), SRC20Overview(Compact) | Sortable market/minting grids, progress bars |
| **Stamp Details** | stampDetailsTable/ | StampListingsAll, StampListingsOpen, StampSales, StampTransfers | Dispenser data, pricing, quantities |
| **Wallet** | walletTable/ | WalletTableBase, WalletStampOverview(Compact), WalletSRC20Overview(Compact) | Balance-tab stamp/SRC20 row view, full + compact variants |
| **Upload** | islands/table/ | UploadImageTable | File management, preview |

### Responsive Behavior

| Breakpoint | Address Format | Scroll | Layout |
|------------|---------------|--------|--------|
| **Mobile** | 4 chars (bc1q...) | Horizontal | Compact columns |
| **Tablet** | 6 chars (bc1qxy...) | Visible | Extended columns |
| **Desktop** | Full address | None | Full visibility, sticky headers/columns |

## Core Components

### Server-Side Components (`components/table/`)

- **HoldersTable.tsx**: Wrapper combining pie chart and table
  - **Purpose**: Display token holder distribution
  - **Components**: HoldersPieChart + HoldersTableBase (both consumed via the `$table` alias)
  - **Layout**: Responsive flex layout (column → row)
  - **Props** (`HoldersTableProps`): `holders?: HolderRow[]` (from `$types/wallet.d.ts`)
  - **Features**:
    - Total holder count display
    - Integrated visualization
    - Empty state handling ("NO HOLDER DATA AVAILABLE")
  - **Location**: `components/table/HoldersTable.tsx`

#### `explorerTable/` — Unified explorer feed (stamps + SRC20)

- **ExplorerTableBase.tsx**: Mixed stamps/SRC20 activity table
  - **Purpose**: Render a single combined feed of stamp and SRC20 rows (used on explorer/home pages)
  - **Columns**: IMAGE, STAMP #, TICK / CPID, TYPE, ADDRESS, AMOUNT, TX HASH, BLOCK, DATE
  - **Props**: `items: MixedItem[]`, `section?: "all" | "stamps" | "tokens"` where `MixedItem = { kind: "stamp"; item: StampRow } | { kind: "src20"; item: SRC20Row }`
  - **Features**:
    - Delegates each row to `StampOverviewRow` or `SRC20OverviewRow`
    - Contextual `EmptyState` label/icon based on `section`
  - **Location**: `components/table/explorerTable/ExplorerTableBase.tsx`

- **SRC20Overview.tsx**: SRC20-only explorer row/table
  - **Purpose**: Render SRC20 deploy/mint/transfer rows for explorer-style listings
  - **Exports**: `SRC20OverviewRow({ src20: SRC20Row })`, `SRC20OverviewTable({ src20s: SRC20Row[] })`
  - **Columns**: IMAGE, STAMP #, TICK, TYPE, ADDRESS, AMOUNT, TX HASH, BLOCK, DATE
  - **Features**:
    - Sticky IMAGE and STAMP # columns (`cellStickyLeft` / `cellStickyLeft2`)
    - Amount resolves to `max` for DEPLOY ops, `amt` otherwise
    - Emoji-aware tick rendering, row click navigates to `/src20/{tick}`
  - **Location**: `components/table/explorerTable/SRC20Overview.tsx`

- **StampOverview.tsx**: Stamp-only explorer row/table
  - **Purpose**: Render stamp rows for explorer-style listings
  - **Exports**: `StampOverviewRow({ stamp: StampRow })`, `StampOverviewTable({ stamps: StampRow[] })`
  - **Columns**: IMAGE, STAMP #, CPID, TYPE, ADDRESS, EDITIONS, TX HASH, BLOCK, DATE
  - **Features**:
    - `getStampType()` classifies CLASSIC / CURSED / POSH / RECURSIVE
    - `text/plain` stamps render via `StampTextContent`; image load failures fall back to a placeholder icon
    - Sticky IMAGE and STAMP # columns, row click navigates to `/stamp/{tx_hash}`
  - **Location**: `components/table/explorerTable/StampOverview.tsx`

#### `marketplaceTable/` — Listings & sales with buy flow

- **MarketplaceTableBase.tsx**: Listings/sales switcher
  - **Purpose**: Renders either the sales table or the listings table depending on the active marketplace tab
  - **Props**: `stamps: StampRow[]`, `isRecentSales: boolean`
  - **Location**: `components/table/marketplaceTable/MarketplaceTableBase.tsx`

- **StampListings.tsx**: Active marketplace listings with buy action
  - **Purpose**: Display stamps currently for sale with a live dispenser price and one-click buy
  - **Exports**: `StampListingsRow({ stamp: StampRow })`, `StampListingsTable({ stamps: StampRow[] })`
  - **Columns**: IMAGE, STAMP #, CPID, ARTIST, LISTED, PRICE, ACTIVITY, DISPENSER, SELLER, BUY
  - **Features**:
    - `useLowestPriceDispenser()` lazily resolves the cheapest open dispenser once the row scrolls into view
    - `ActivityLevelIndicator` for market activity
    - BUY button re-checks for a fresher dispenser (`getFreshDispenserForPurchase`) and opens `StampBuyTool`
  - **Location**: `components/table/marketplaceTable/StampListings.tsx`

- **StampSales.tsx**: Recent marketplace sales
  - **Purpose**: Display completed dispense/sale transactions
  - **Exports**: `MarketplaceSalesRow({ stamp: StampWithEnhancedSaleData })`, `MarketplaceSalesTable({ stamps: StampWithEnhancedSaleData[] })`
  - **Columns**: IMAGE, STAMP #, CPID, ARTIST, SOLD, PRICE, DISPENSER, BUYER, TX HASH, DATE
  - **Features**:
    - Relative "time ago" date formatting for recent sales, falling back to `M/D/YYYY`
  - **Location**: `components/table/marketplaceTable/StampSales.tsx`

#### `src20DetailsTable/` — Per-token SRC20 history

- **SRC20Mints.tsx**: SRC20 minting transactions
  - **Purpose**: Display minting history for a single SRC20 token
  - **Exports**: `SRC20MintsTable({ mints, isLoading }: SRC20MintsProps)`
  - **Columns**: AMOUNT, ADDRESS, DATE, TX HASH, BLOCK
  - **Features**:
    - Abbreviated addresses on mobile
    - Date formatting with block time
    - Transaction hash links
    - Block index display
  - **Location**: `components/table/src20DetailsTable/SRC20Mints.tsx`

- **SRC20Transfers.tsx**: SRC20 transfer transactions
  - **Purpose**: Display transfer history between addresses for a single token
  - **Exports**: `SRC20TransfersTable({ sends, isLoading }: SRC20TransfersProps)`
  - **Columns**: FROM, TO, AMOUNT, DATE, TX HASH
  - **Features**:
    - Dual address display (sender/receiver)
    - Transfer amount formatting
    - Transaction linking
  - **Location**: `components/table/src20DetailsTable/SRC20Transfers.tsx`

#### `src20OverviewTable/` — Sortable market/minting grids

- **SRC20Minting.tsx**: Full minting overview grid
  - **Purpose**: Sortable, image-rich grid of tokens currently minting
  - **Props** (`SRC20MintingProps`): `data: SRC20Row[]`, `timeframe?`, `onImageClick?`, `currentSort?: { filter: string; direction: "asc" | "desc" }`
  - **Columns**: TOKEN, MINTS, PROGRESS, TRENDING, HOLDERS, CREATOR, DEPLOY, MINT (button)
  - **Features**:
    - Clickable, sortable column headers that navigate via `SSRSafeUrlBuilder` (`sortBy`/`sortDirection`/`page` query params)
    - Animated progress bar per token
    - Sticky TOKEN column on mobile
    - "TRENDING" currently renders `N/A` (no data source wired up yet)
  - **Location**: `components/table/src20OverviewTable/SRC20Minting.tsx`

- **SRC20MintingCompact.tsx**: Compact minting grid
  - **Purpose**: Space-constrained variant of `SRC20Minting` for narrower containers
  - **Props** (`SRC20MintingCompactProps`): `data: SRC20Row[]`, `onImageClick?`
  - **Columns**: TOKEN, MINTS, PROGRESS, HOLDERS, MINT (button); MINTS column hides between `tablet` and `1280px`
  - **Features**:
    - Clicking MINT while already on the mint tool page updates the tool's selected tick in place instead of navigating
  - **Location**: `components/table/src20OverviewTable/SRC20MintingCompact.tsx`

- **SRC20Overview.tsx**: Full market overview grid
  - **Purpose**: Sortable grid of SRC20 tokens with market data
  - **Props**: `data: SRC20Row[]`, `fromPage?`, `timeframe?`, `onImageClick?`, `currentSort?`
  - **Columns**: TOKEN, PRICE, CHANGE, VOLUME, MARKETCAP, HOLDERS, CREATOR, DEPLOY, TRADE
  - **Features**:
    - Sortable headers (same `SSRSafeUrlBuilder` pattern as `SRC20Minting`)
    - Price shown in SATS with adaptive precision; volume/market cap shown in BTC
    - TRADE column currently renders a disabled "SOON" button (chart widget integration is commented out)
  - **Location**: `components/table/src20OverviewTable/SRC20Overview.tsx`

- **SRC20OverviewCompact.tsx**: Compact market overview grid
  - **Purpose**: Space-constrained market overview, with an optional wallet balance column
  - **Props**: `data: EnrichedSRC20Row[]`, `fromPage: "src20" | "wallet" | "stamping/src20" | "home"`, `onImageClick`
  - **Columns**: TOKEN, (BALANCE — wallet only), PRICE, CHANGE, VOLUME, MARKETCAP; MARKETCAP hides between `tablet` and `desktop`
  - **Location**: `components/table/src20OverviewTable/SRC20OverviewCompact.tsx`

#### `stampDetailsTable/` — Per-stamp dispenser & transfer history

- **StampListingsAll.tsx**: All dispenser listings for a stamp
  - **Purpose**: Comprehensive dispenser listing display (open and closed)
  - **Exports**: `StampListingsAllTable({ listings, isLoading }: StampListingsAllProps)`, `listings: Dispenser[]`
  - **Columns**: PRICE, ESCROW, GIVE, REMAIN, SOURCE, ADDRESS, STATUS
  - **Features**:
    - OPEN/CLOSED status indicator (CLOSED links to the closing transaction)
    - Full dispenser details including escrow and remaining quantities
  - **Location**: `components/table/stampDetailsTable/StampListingsAll.tsx`

- **StampListingsOpen.tsx**: Active dispensers only, with selection
  - **Purpose**: Compact list of only open dispensers, used to pick a dispenser to buy from
  - **Exports**: `StampListingsOpenTable({ dispensers, onSelectDispenser, selectedDispenser }: StampListingsOpenProps)`
  - **Columns**: PRICE, ESCROW, GIVE, REMAIN, SOURCE
  - **Features**:
    - Filters to `give_remaining > 0` and sorts by remaining quantity (descending)
    - Highlights the selected row, defaulting to the lowest-priced dispenser
    - Wraps its own `ScrollContainer` (`min-h-[72px] max-h-[220px]`)
  - **Location**: `components/table/stampDetailsTable/StampListingsOpen.tsx`

- **StampSales.tsx**: Stamp dispenser sales
  - **Purpose**: Display dispense transactions with pricing for a single stamp
  - **Exports**: `StampSalesTable({ dispenses, isLoading }: StampSalesProps)`
  - **Columns**: FROM, TO, AMOUNT, PRICE, DATE
  - **Features**:
    - Satoshi rate display (converted to BTC)
    - Quantity formatting
    - Dispenser source tracking
  - **Location**: `components/table/stampDetailsTable/StampSales.tsx`

- **StampTransfers.tsx**: Stamp transfer history
  - **Purpose**: Display stamp transfer transactions for a single stamp
  - **Exports**: `StampTransfersTable({ sends, isLoading }: StampTransfersProps)`
  - **Columns**: FROM, TO, AMOUNT, TX HASH, DATE
  - **Features**:
    - Transfer quantity display
    - Address abbreviation
    - Transaction hash links
  - **Location**: `components/table/stampDetailsTable/StampTransfers.tsx`

#### `walletTable/` — Wallet Balance row view (`cardRow`)

- **WalletTableBase.tsx**: Full/compact switcher for the wallet page's `cardRow` view mode
  - **Purpose**: Picks the right stamp/SRC20 table variant for whichever panel is rendering — mirrors `ExplorerTableBase`'s role as the family's entry point, but since the wallet page always renders stamps and tokens as two separate panels (never one merged feed), it just selects full vs. compact rather than merging/sorting `MixedItem[]`
  - **Props**: `type: "stamps" | "src20"`, `stamps?: WalletStampBalanceRow[]`, `src20s?: SRC20Row[]`, `compact?: boolean`
  - **Location**: `components/table/walletTable/WalletTableBase.tsx`

- **WalletStampOverview.tsx**: Full wallet stamp balance row/table
  - **Purpose**: Render stamps held by a wallet with market value context
  - **Exports**: `WalletStampOverviewRow({ stamp: WalletStampBalanceRow })`, `WalletStampOverviewTable({ stamps })`, plus the `WalletStampBalanceRow` type
  - **Columns**: IMAGE, STAMP #, CPID, CREATOR, FLOOR, MCAP, BALANCE, VALUE
  - **Features**:
    - BALANCE renders as `owned/issued` (same formula as `StampOverviewRow`'s SUPPLY cell)
    - VALUE prefers the balance API's precomputed `market_data.wallet_value_btc`, falling back to `floor × owned`
    - MCAP has no live per-stamp source — computed client-side as `floor × issued` (divisible-adjusted)
    - Sticky IMAGE and STAMP # columns, row click navigates to `/stamp/{tx_hash}`
  - **Location**: `components/table/walletTable/WalletStampOverview.tsx`

- **WalletStampOverviewCompact.tsx**: Compact wallet stamp balance row/table
  - **Purpose**: Space-constrained variant used in the wallet page's ALL tab split layout
  - **Exports**: `WalletStampOverviewRowCompact({ stamp })`, `WalletStampOverviewTableCompact({ stamps })`
  - **Columns**: IMAGE, STAMP #, CPID, FLOOR, BALANCE, VALUE (drops CREATOR/MCAP)
  - **Location**: `components/table/walletTable/WalletStampOverviewCompact.tsx`

- **WalletSRC20Overview.tsx**: Full wallet SRC20 balance row/table
  - **Purpose**: Render SRC20 tokens held by a wallet with market value context
  - **Exports**: `WalletSRC20OverviewRow({ src20: SRC20Row })`, `WalletSRC20OverviewTable({ src20s })`, plus shared helpers `getPrice`, `getMarketCap`, `formatPriceSats`, `formatValueBtc` (reused by the compact variant)
  - **Columns**: IMAGE, TICKER, CREATOR, SUPPLY, PRICE, CHANGE, MCAP, BALANCE, VALUE
  - **Features**:
    - SUPPLY = `max` (total mintable supply), BALANCE = `amt` (amount held)
    - PRICE/VALUE basis: `market_data.price_btc ?? floor_price_btc` (same fallback `SRC20Card` uses), VALUE = `price × balance`
    - Sticky IMAGE and TICKER columns, row click navigates to `/src20/{tick}`
  - **Location**: `components/table/walletTable/WalletSRC20Overview.tsx`

- **WalletSRC20OverviewCompact.tsx**: Compact wallet SRC20 balance row/table
  - **Purpose**: Space-constrained variant used in the wallet page's ALL tab split layout
  - **Exports**: `WalletSRC20OverviewRowCompact({ src20 })`, `WalletSRC20OverviewTableCompact({ src20s })`
  - **Columns**: IMAGE, TICKER, PRICE, CHANGE, BALANCE, VALUE (drops CREATOR/SUPPLY/MCAP)
  - **Location**: `components/table/walletTable/WalletSRC20OverviewCompact.tsx`

Wired into the wallet page via `islands/content/WalletContent.tsx`'s `BalanceTabContent`/`TokensTabContent` when `view === "cardRow"`, with `compact={section === "all"}`. Only the Balance sub-tab renders tables this way — Created/Listings/Collections still fall back to the card grid.

### Interactive Islands (`islands/table/`)

- **DetailsTableBase.tsx**: Central tabbed table orchestrator
  - **Purpose**: Manages tabbed interfaces with data fetching for stamp and SRC20 detail pages
  - **Props**:
    - `type: TableType` (`"stamps" | "src20" | "src101" | "vault"`)
    - `configs?: TabConfig[]` (`{ id, label, count? }`)
    - `cpid?: string` | `tick?: string`
    - `initialCounts?: Record<string, number>`
    - `holders?: HolderRow[]` — rendered directly for the "holders" tab (no client fetch)
    - `title?: string` — optional section heading with a count pill
    - `deployment?` — rendered via `SRC20DetailInfo` for the "info" tab
  - **Features**:
    - Tab state management via `SelectorButtons`
    - Infinite scroll pagination (`PAGE_SIZE = 16`)
    - Fetches `/api/v2/stamps/{cpid}/{dispensers|dispenses|sends}` or `/api/v2/src20/tick/{tick}?op=MINT|TRANSFER`
    - Data transformation (dispenser rate mapping onto dispenses)
    - "holders" and "info" tabs bypass fetching and render from props directly
    - Loading skeletons while fetching
  - **Location**: `islands/table/DetailsTableBase.tsx`

- **HoldersTableBase.tsx**: Interactive holders table
  - **Purpose**: Scrollable holder data with client-side pagination
  - **Props**: `holders?: HolderRow[]`
  - **Features**:
    - Infinite scroll implementation (`PAGE_SIZE = 20`)
    - Percentage calculations
    - Balance formatting
    - ScrollContainer integration
  - **Location**: `islands/table/HoldersTableBase.tsx`

- **HoldersPieChart.tsx**: Pie chart visualization
  - **Purpose**: Visual representation of holder distribution
  - **Props**: `holders?: HolderRow[]`
  - **Features**:
    - Top 5 holders display
    - "Others" category aggregation
    - Responsive sizing
    - Color-coded segments (primary fuchsia gradient)
  - **Location**: `islands/table/HoldersPieChart.tsx`

- **UploadImageTable.tsx**: Image upload workflow table
  - **Purpose**: Manage image upload and preview
  - **Props**: Custom upload props (`SRC20BalanceTableProps`)
  - **Features**:
    - File preview
    - Upload progress
    - Status indicators
  - **Location**: `islands/table/UploadImageTable.tsx`

### Barrel Export (`$table` alias)

`$table` resolves (via `deno.json`) to `islands/table/index.ts`, which re-exports only:

- `HoldersTable` (from `components/table/HoldersTable.tsx`)
- `SRC20MintsTable`, `SRC20TransfersTable` (from `src20DetailsTable/`)
- `StampListingsAllTable`, `StampListingsOpenTable`, `StampSalesTable`, `StampTransfersTable` (from `stampDetailsTable/`)
- `DetailsTableBase`, `HoldersPieChart`, `HoldersTableBase`, `UploadImageTable` (from `islands/table/`)
- The `Dispenser` type (from `$types/stamp.d.ts`)

**`explorerTable/`, `marketplaceTable/`, `src20OverviewTable/`, and `walletTable/` components are NOT re-exported through `$table`.** Import them directly by file path, e.g.:

```tsx
import { ExplorerTableBase } from "$components/table/explorerTable/ExplorerTableBase.tsx";
import { StampListingsTable } from "$components/table/marketplaceTable/StampListings.tsx";
import { SRC20Overview } from "$components/table/src20OverviewTable/SRC20Overview.tsx";
```

## Type Definitions

### Table Props (as consumed by `DetailsTableBase`)
```typescript
export type TableType = "stamps" | "src20" | "src101" | "vault";

export interface TabConfig {
  id: string;
  label: string;
  count?: number;
}

export type TabData = Record<string, any>;

// Shape destructured by islands/table/DetailsTableBase.tsx
interface DetailsTableBaseProps {
  type: TableType;
  configs?: TabConfig[];
  cpid?: string;
  tick?: string;
  initialCounts?: Record<string, number>;
  holders?: HolderRow[];
  title?: string;
  deployment?: unknown;
}
```

### Data Types
```typescript
// SRC20 Row Data (subset of fields used by table components)
export interface SRC20Row {
  tx_hash: string;
  block_index: number;
  op: string; // "deploy" | "mint" | "transfer"
  tick: string;
  creator: string;
  creator_name: string | null;
  amt?: string | bigint;
  max?: string | bigint;
  destination: string;
  block_time: Date;
  stamp?: number | null;
  deploy_img?: string;
  mint_progress?: { total_mints?: number; progress?: number };
  market_data?: {
    holder_count?: number;
    price_btc?: number;
    change_24h_percent?: number;
    volume_24h_btc?: number;
    market_cap_btc?: number;
  };
}

// Stamp Row Data (subset of fields used by table components)
export interface StampRow {
  stamp: number | null;
  cpid: string;
  ident: string; // e.g. "SRC-721", "SRC-20"
  block_index: number;
  block_time: Date;
  tx_hash: string;
  creator: string;
  creator_name: string | null;
  divisible: boolean;
  supply: number;
  stamp_mimetype?: string;
}

// Dispenser Data (from $types/stamp.d.ts / services.d.ts)
export interface Dispenser {
  tx_hash: string;
  source: string;
  origin: string;
  give_quantity: number;
  give_remaining: number;
  escrow_quantity: number;
  satoshirate: number;
  close_block_index: number | null;
}

// Holder Data (from $types/wallet.d.ts)
export interface HolderRow {
  address: string | null;
  amt?: number;
  quantity?: number;
  percentage?: number;
}
```

### Component Props
```typescript
export interface SRC20MintsProps {
  mints: SRC20Row[];
  isLoading?: boolean;
}

export interface SRC20TransfersProps {
  sends?: SRC20Row[];
  isLoading?: boolean;
}

export interface StampSalesProps {
  dispenses?: Array<{
    source: string;
    destination: string;
    dispense_quantity: number;
    satoshirate: number;
    tx_hash: string;
    block_time: number | null;
  }>;
  isLoading?: boolean;
}

export interface StampTransfersProps {
  sends?: Array<{
    source: string;
    destination: string;
    quantity: number;
    tx_hash: string;
    block_time: number | null;
  }>;
  isLoading?: boolean;
}

export interface StampListingsAllProps {
  listings: Dispenser[];
  isLoading?: boolean;
}

export interface StampListingsOpenProps {
  dispensers?: Dispenser[];
  selectedDispenser?: Dispenser;
  onSelectDispenser?: (dispenser: Dispenser) => void;
}

export interface HoldersTableProps {
  holders?: HolderRow[];
}
```

## Usage Examples

### Basic Server-Side Table (per-token SRC20 detail)
```tsx
import { SRC20MintsTable } from "$table";

export function TokenMintsSection({ mints }) {
  return (
    <SRC20MintsTable
      mints={mints}
      isLoading={false}
    />
  );
}
```

### Interactive Tabbed Table
```tsx
import DetailsTableBase from "$islands/table/DetailsTableBase.tsx";

export function TokenDetailsSection({ tick, initialData }) {
  return (
    <DetailsTableBase
      type="src20"
      title="SRC-20 ACTIVITY"
      configs={[
        { id: "mints", label: "Mints" },
        { id: "transfers", label: "Transfers" },
      ]}
      tick={tick}
      initialCounts={{ mints: 150, transfers: 89 }}
    />
  );
}
```

### Holders Table with Visualization
```tsx
import { HoldersTable } from "$table";

export function HoldersSection({ holders }) {
  return (
    <HoldersTable
      holders={holders}
    />
  );
}
```

### Explorer Feed (mixed stamps + SRC20)
```tsx
import { ExplorerTableBase } from "$components/table/explorerTable/ExplorerTableBase.tsx";

export function ExplorerFeed({ stamps, tokens }) {
  const items = [
    ...stamps.map((item) => ({ kind: "stamp" as const, item })),
    ...tokens.map((item) => ({ kind: "src20" as const, item })),
  ];

  return <ExplorerTableBase items={items} section="all" />;
}
```

### Marketplace Listings with Buy Flow
```tsx
import { MarketplaceTableBase } from "$components/table/marketplaceTable/MarketplaceTableBase.tsx";

export function MarketplaceSection({ stamps, isRecentSales }) {
  return (
    <MarketplaceTableBase
      stamps={stamps}
      isRecentSales={isRecentSales}
    />
  );
}
```

### Stamp Sales Table
```tsx
import { StampSalesTable } from "$table";

export function SalesHistory({ dispenses }) {
  return (
    <StampSalesTable
      dispenses={dispenses}
      isLoading={false}
    />
  );
}
```

### Stamp Listings (Open Only, Selectable)
```tsx
import { StampListingsOpenTable } from "$table";

export function ActiveListings({ dispensers, selected, onSelect }) {
  return (
    <StampListingsOpenTable
      dispensers={dispensers}
      selectedDispenser={selected}
      onSelectDispenser={onSelect}
    />
  );
}
```

## Style System Integration

### Container Layer Styling

All tables use consistent container layer styling from the layout system:

```tsx
// Header row
<tr class={`${container2}`}>
  {/* Headers */}
</tr>

// Data rows with hover
<tr class={`${container2} group`}>
  {/* Cells */}
</tr>
```

### Cell Styling Pattern

Two cell-style variants are used depending on table type:

- **`L2Detail`** (`cellLeftL2Detail` / `cellCenterL2Detail` / `cellRightL2Detail`): used by list-style detail tables (`src20DetailsTable/`, `stampDetailsTable/`) — tighter padding, sticky `<thead>`.
- **`L2Card`** (`cellLeftL2Card` / `cellCenterL2Card` / `cellRightL2Card`): used by card/grid-style tables (`explorerTable/`, `marketplaceTable/`, `src20OverviewTable/`) — larger rounded corners, `shadowGlowPurple` row hover glow, and support for sticky columns.

```tsx
const headers = ["COL1", "COL2", "COL3"];

headers.map((header, i) => {
  const isFirst = i === 0;
  const isLast = i === headers.length - 1;

  const cellClass = isFirst
    ? cellLeftL2Detail      // Rounded left
    : isLast
    ? cellRightL2Detail     // Rounded right
    : cellCenterL2Detail;   // Center segment

  return <th class={cellClass}>{header}</th>;
});
```

### Border-Spacing Edge Compensation

Every table uses `border-separate` with a vertical `border-spacing-y-*` (`-y-3` for card-style tables, `-y-2` for detail-style tables) to get consistent gaps between the "floating pill" rows. Because `border-spacing` in the separated-borders model applies the **full** spacing value at the table's outer edges too — not just between rows — every table also renders extra dead space above its `<thead>` and below its last `<tbody>` row equal to the spacing value itself (`12px`/`8px`), on top of whatever padding/margin surrounds the table.

Every table cancels this edge overflow with a matching negative vertical margin on the table (or its non-padded wrapper `<div>` — margin behaves identically either way since nothing sits between them):

```tsx
// Card-style tables (border-spacing-y-3 → -my-3)
<div class="overflow-x-auto tablet:overflow-x-visible scrollbar-hide -my-3">
  <table class={`w-full border-separate border-spacing-y-3 ${textXs}`}>

// Detail-style tables (border-spacing-y-2 → -my-2)
<div class="overflow-x-auto overflow-y-clip tablet:overflow-x-clip flow-root scrollbar-hide">
  <table class={`w-full -my-2 border-separate border-spacing-y-2 ${textXs}`}>
```

**Rule of thumb**: the `-my-N` magnitude must exactly match the `border-spacing-y-N` value (not half of it) — a mismatch (e.g. only compensating the top, or using half the value) leaves a visible, asymmetric gap. Page-level containers around `cardRow`/table views use a plain `pt-5` like every other view mode; they should never special-case a smaller top padding to work around this — that duplicates the fix and either leaves a residual gap or (if stacked with the table's own `-my-N`) squashes the layout. See `ExplorerContent.tsx` and `MarketplaceContent.tsx` for the canonical pattern.

### Sticky Columns

Card-style tables (explorer, marketplace, SRC20 overview) keep an image and/or primary column visible while scrolling horizontally using `cellStickyLeft` (column 0) and `cellStickyLeft2` (column 1):

```tsx
<td class={`${cellLeftL2Card} ${cellStickyLeft}`}>{/* IMAGE */}</td>
<td class={`${cellCenterL2Card} ${cellStickyLeft2}`}>{/* STAMP # */}</td>
```

### Empty States

Card-style tables render a shared `EmptyState` component instead of an inline row:

```tsx
import { EmptyState } from "$layout";

<tr>
  <td colSpan={headers.length}>
    <EmptyState label="NO TOKENS TO DISPLAY" icon="src20Tokens" />
  </td>
</tr>
```

### Column Width Management

Column widths are defined using the `colGroup()` helper:

```tsx
import { colGroup } from "$components/layout/types.ts";

<colgroup>
  {colGroup([
    { width: "min-w-[150px] w-auto" }, // FROM
    { width: "min-w-[150px] w-auto" }, // TO
    { width: "min-w-[125px] w-auto" }, // AMOUNT
    { width: "min-w-[125px] w-auto" }, // DATE
    { width: "min-w-[150px] w-auto" }, // TX HASH
  ]).map((col) => <col key={col.key} class={col.className} />)}
</colgroup>
```

### Cell Alignment

Text alignment is managed by `cellAlign()` helper:

```tsx
import { cellAlign } from "$components/layout/types.ts";

<td class={`${cellAlign(index, totalColumns)}`}>
  {/* Content */}
</td>

// Returns:
// First column: text-left
// Last column: text-right
// Others: text-center
```

### ScrollContainer Integration

Interactive tables use `ScrollContainer` for enhanced scrolling:

```tsx
import { ScrollContainer } from "$layout";

<ScrollContainer
  class="min-h-[80px] max-h-[290px] scrollbar-background-layer1"
  onScroll={handleScroll}
>
  <div class="overflow-x-auto overflow-y-clip tablet:overflow-x-clip flow-root scrollbar-hide">
    <table class={`w-full -my-2 border-separate border-spacing-y-2 ${textSm}`}>
      {/* Table content */}
    </table>
  </div>
</ScrollContainer>
```

(the `-my-2` cancels `border-spacing-y-2`'s edge overflow — see "Border-Spacing Edge Compensation" above)

**ScrollContainer Features:**
- Automatic scrollbar padding detection
- Responsive padding: 16px (desktop), 24px (mobile)
- ResizeObserver for dynamic updates
- Scroll event handling for infinite scroll
- Glassmorphism scrollbar styling

**Common Height Configurations:**
- DetailsTableBase tabs: `min-h-[72px] max-h-[296px]`
- HoldersTableBase: `min-h-[72px] max-h-[296px]`
- StampListingsOpen: `min-h-[72px] max-h-[220px]`

### Typography System

Tables use consistent typography from the text system:

```tsx
import { labelXxs, textXs, valueDarkSm } from "$text";

// Headers
<th class={labelXxs}>HEADER</th>

// Body text
<table class={textXs}>...</table>

// Values
<td class={valueDarkSm}>1,000</td>
```

## Technical Implementation

### Infinite Scroll Pattern

```typescript
const PAGE_SIZE = 16;

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  const scrollPosition = target.scrollTop + target.clientHeight;
  const scrollThreshold = target.scrollHeight - 20;

  if (scrollPosition >= scrollThreshold && hasMore && !isLoading) {
    loadMoreData();
  }
};
```

### Tab State Management

```typescript
const [selectedTab, setSelectedTab] = useState<string>(
  configs.length > 0 ? configs[0].id : ""
);
const [tabData, setTabData] = useState<TabData>({});
const [isLoading, setIsLoading] = useState(true);
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
```

### Data Fetching Flow

```
User selects tab
      ↓
fetchData() called with tabId
      ↓
setIsLoading(true)
      ↓
API request with pagination params
      ↓
Response processed
      ↓
setTabData() updates state
      ↓
setHasMore() based on response length
      ↓
setIsLoading(false)
      ↓
UI updates reactively
```

### Data Transformation Example

```typescript
// Mapping dispenser rates onto dispense data (DetailsTableBase)
const mapDispensesWithRates = (dispenses: any[], dispensers: any[]) => {
  const dispenserRates = new Map(
    dispensers?.map((d) => [d.tx_hash, d.satoshirate]) ?? []
  );

  return dispenses?.map((dispense) => ({
    ...dispense,
    satoshirate: dispenserRates.get(dispense.dispenser_tx_hash) || 0,
  })) ?? [];
};
```

### Sortable Header Navigation (src20OverviewTable)

`SRC20Minting` and `SRC20Overview` implement clickable, sortable headers that trigger a full navigation via a synthetic `<a f-partial>` click rather than client-side state, so sort changes are reflected in the URL and re-render server-side:

```typescript
const handleHeaderClick = (headerName: string) => {
  const apiSortKey = sortMapping[headerName];
  if (!apiSortKey) return;

  const isCurrentSort = currentSort?.filter === apiSortKey;
  const newDirection = isCurrentSort && currentSort.direction === "desc"
    ? "asc"
    : "desc";

  const url = SSRSafeUrlBuilder.fromCurrent()
    .setParam("sortBy", apiSortKey)
    .setParam("sortDirection", newDirection)
    .setParam("page", "1")
    .toString();

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("f-partial", "");
  link.style.display = "none";
  document.body.appendChild(link as Node);
  link.click();
  document.body.removeChild(link as Node);
};
```

### Responsive Address Formatting

```typescript
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";

// Mobile: 4 characters
<span class="tablet:hidden">{abbreviateAddress(address, 4)}</span>

// Tablet+: 6 characters (detail tables) or 5/8 characters (card/listing tables)
<span class="hidden tablet:inline">
  {abbreviateAddress(address, 6)}
</span>
```

## Performance Considerations

### Lazy Loading Strategy
- Initial page size: 16 items (`DetailsTableBase`) / 20 items (`HoldersTableBase`)
- Load more on scroll trigger
- Prevents large initial data loads
- Smooth user experience

### Responsive Rendering
- Address abbreviation reduces DOM size on mobile
- Column widths optimized per breakpoint
- Sticky headers/columns only where needed (desktop-first for headers, always-on for card-table image/index columns)
- Horizontal scroll on mobile only

### Memory Management
- Append-only data updates for smooth scrolling
- Batched state updates prevent re-renders
- Proper event handler cleanup
- Efficient data transformation with Map

### Pagination Optimization
- `PAGE_SIZE = 16` for `DetailsTableBase` (balance between requests and UX)
- `hasMore` flag prevents unnecessary requests
- Tab-specific pagination state
- Reset pagination on tab change

## Empty States and Error Handling

### Empty State Pattern (detail tables — inline row)
```tsx
{!isLoading && (!data || data.length === 0) && (
  <tr>
    <td
      colSpan={headers.length}
      class={`w-full h-[34px] ${container2}`}
    >
      <h6 class={`${valueDarkSm} text-center`}>
        NO DATA AVAILABLE
      </h6>
    </td>
  </tr>
)}
```

### Empty State Pattern (card tables — shared component)
```tsx
{!data.length && (
  <tr>
    <td colSpan={headers.length}>
      <EmptyState label="NO TOKENS TO DISPLAY" icon="src20Tokens" />
    </td>
  </tr>
)}
```

### Loading State
```tsx
{isLoading && (
  <div class="flex flex-col w-full mb-2 gap-2">
    {[...Array(6)].map((_, index) => (
      <div
        key={index}
        class="loading-skeleton running w-full rounded-2xl h-[34px]"
      />
    ))}
  </div>
)}
```

### Error Handling (404 Responses)
```typescript
if (!response.ok) {
  if (response.status === 404) {
    setTabData((prev) => ({
      ...prev,
      [operation]: isTabChange ? [] : prev[operation] || []
    }));
    setHasMore(false);
    return;
  }
  throw new Error(`HTTP error! status: ${response.status}`);
}
```

## Best Practices

### Table Type Selection
- **Server-Side**: Pre-fetched data, static display, SEO requirements
- **Interactive**: Dynamic data, pagination, user interactions
- **DetailsTableBase**: Multi-tab interfaces (stamps/src20 details) combining fetched tabs with prop-driven "holders"/"info" tabs
- **HoldersTable**: Distribution visualization with data table
- **explorerTable/ vs marketplaceTable/ vs stampDetailsTable/**: choose by context — unified feed, buy-focused marketplace, or single-item detail history, respectively

### Data Structure
- Always include `isLoading` prop for loading states on detail tables
- Provide `initialCounts` for `DetailsTableBase` tab badges
- Use proper TypeScript interfaces
- Handle null/undefined data gracefully

### Responsive Design
- Use `abbreviateAddress()` for mobile views
- Implement horizontal scroll on mobile
- Use sticky columns (`cellStickyLeft`/`cellStickyLeft2`) for image/primary-key columns on card tables
- Test all breakpoints (mobile, tablet, desktop)

### Performance
- Set appropriate `PAGE_SIZE` (16 for tabbed detail data, 20 for holders)
- Implement infinite scroll for large datasets
- Use Map for O(1) lookups in transformations
- Batch state updates when possible

### Accessibility
- Use semantic table markup (`<table>`, `<thead>`, `<tbody>`)
- Provide proper column headers
- Include ARIA labels where needed
- Ensure keyboard navigation works

## Common Patterns

### Tabbed Interface Setup
```tsx
<DetailsTableBase
  type="stamps"
  title="ACTIVITY"
  configs={[
    { id: "dispensers", label: "Listings" },
    { id: "sales", label: "Sales" },
    { id: "transfers", label: "Transfers" },
  ]}
  cpid={stampId}
  initialCounts={{ dispensers: 4, sales: 42, transfers: 18 }}
/>
```

### Data Table with Formatting
```tsx
<td class={`${cellAlign(2, 5)} ${cellCenterL2Detail}`}>
  <span class={valueDarkSm}>
    {formatNumber(amount)}
  </span>
</td>
```

### Address Display Pattern
```tsx
<a
  href={`/wallet/${address}`}
  class="link-neutral-200"
>
  <span class="tablet:hidden">{abbreviateAddress(address, 4)}</span>
  <span class="hidden tablet:inline">
    {abbreviateAddress(address, 6)}
  </span>
</a>
```

### Transaction Hash Link
```tsx
<a
  href={`https://mempool.space/tx/${txHash}`}
  target="_blank"
  rel="noopener noreferrer"
  class="link-neutral-400"
>
  {abbreviateAddress(txHash, 6)}
</a>
```

## Adding New Table Types

### Step 1: Define Data Interface
```typescript
// lib/types/ui.d.ts
export interface NewTableData {
  id: string;
  value: number;
  timestamp: number;
}

export interface NewTableProps {
  data: NewTableData[];
  isLoading?: boolean;
}
```

### Step 2: Create Table Component

Place the new component in the subdirectory matching its data category (e.g. `stampDetailsTable/`, `src20DetailsTable/`, `explorerTable/`, `marketplaceTable/`, `src20OverviewTable/`, or `walletTable/`), or in `components/table/` directly if it doesn't belong to an existing category.

```tsx
// components/table/stampDetailsTable/NewTable.tsx
import {
  cellLeftL2Detail,
  cellRightL2Detail,
  container2
} from "$layout";
import { colGroup, cellAlign } from "$components/layout/types.ts";
import { labelXxs, textXs, valueDarkSm } from "$text";

export function NewTable({ data, isLoading = false }: NewTableProps) {
  const headers = ["ID", "VALUE", "DATE"];

  return (
    // -my-2 cancels border-spacing-y-2's edge overflow (see "Border-Spacing
    // Edge Compensation" above) — keep the magnitude matched if you change
    // the spacing value.
    <div class="overflow-x-auto tablet:overflow-x-visible scrollbar-hide -my-2">
      <table class={`w-full border-separate border-spacing-y-2 ${textXs}`}>
        <colgroup>
          {colGroup([
            { width: "min-w-[150px] w-auto" },
            { width: "min-w-[125px] w-auto" },
            { width: "min-w-[125px] w-auto" }
          ]).map((col) => <col key={col.key} class={col.className} />)}
        </colgroup>

        <thead>
          <tr class={container2}>
            {headers.map((header, i) => (
              <th
                key={header}
                class={`${cellAlign(i, headers.length)} ${labelXxs}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {!isLoading && data?.map((item) => (
            <tr key={item.id} class={`${container2} group`}>
              <td class={cellLeftL2Detail}>{item.id}</td>
              <td class={`text-center ${valueDarkSm}`}>{item.value}</td>
              <td class={cellRightL2Detail}>
                {formatDate(item.timestamp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Step 3: Add to DetailsTableBase (Optional)
```tsx
// islands/table/DetailsTableBase.tsx
case "newType":
  return (
    <NewTable
      data={tabData.newData || []}
      isLoading={isLoading}
    />
  );
```

### Step 4: Export from the Barrel (Optional)

`components/table/` has no index file of its own. If the new component needs to be broadly reusable, add it to the `$table` barrel:

```tsx
// islands/table/index.ts
export * from "$components/table/stampDetailsTable/NewTable.tsx";
```

Otherwise, import it directly by file path — this is how `explorerTable/`, `marketplaceTable/`, and `src20OverviewTable/` components are currently consumed.

## Troubleshooting

### Issue: Infinite scroll not triggering
**Solution**: Check `hasMore` flag and ensure scroll threshold is appropriate. Verify `onScroll` handler is attached to ScrollContainer.

### Issue: Sticky headers/columns not working on mobile
**Solution**: Detail-table headers are intentionally sticky only within their own scroll container. Card-table sticky columns (`cellStickyLeft`/`cellStickyLeft2`) are always-on; check that the column's `colgroup` width matches and that no parent has `overflow: hidden` clipping the sticky context.

### Issue: Table not rendering data
**Solution**: Verify data prop is populated and not `undefined`. Check `isLoading` state isn't stuck on `true`. Console log data to debug.

### Issue: Addresses not abbreviating on mobile
**Solution**: Ensure you're using `abbreviateAddress()` utility and have proper responsive classes (`tablet:hidden`, `hidden tablet:inline`).

### Issue: Tab counts not updating
**Solution**: Pass `initialCounts` prop to `DetailsTableBase`. When omitted, counts are fetched automatically from the corresponding count endpoints for `stamps`/`src20`.

### Issue: Columns misaligned
**Solution**: Check `colGroup()` widths match number of columns. Verify all cells use consistent styling classes (don't mix `L2Detail` and `L2Card` variants in the same table).

## Related Components

- **Layout System**: Provides glassmorphism styles and ScrollContainer ([layout/doc.md](mdc:components/layout/doc.md))
- **Text System**: Typography styles for headers and content ([text/styles.ts](mdc:components/text/styles.ts))
- **Icon System**: Icons used in table headers and actions ([icon/doc.md](mdc:components/icon/doc.md))
- **Button System**: Buttons for pagination and actions ([button/doc.md](mdc:components/button/doc.md))

---

**Last Updated:** August 31, 2026 (documented border-spacing edge-compensation pattern)
**Author:** baba
