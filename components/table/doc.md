# Table System Documentation

## Overview

The Table system provides a comprehensive, scalable solution for displaying tabular data throughout the application. Built with both server-side rendered and client-side interactive components, it offers consistent styling, responsive design, infinite scroll, and specialized handling for different data types following the app's dark-themed glassmorphism principles.

## Architecture

### Component Hierarchy
```
┌─────────────────────────────────────────────────────┐
│  Layout System (types.ts, styles.ts)                │
│  - colGroup() column width helper                   │
│  - cellAlign() alignment helper                     │
│  - Cell styling variants (L2Detail)                 │
│  - ScrollContainer component                        │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│  Server-Side Tables (components/table/)             │
│  - HoldersTable: Holders with pie chart             │
│  - SRC20 Tables: Mints, Transfers                   │
│  - Stamp Tables: Sales, Transfers, Listings         │
│  - Static data rendering                            │
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

| Category | Tables | Features |
|----------|--------|----------|
| **SRC20** | Mints, Transfers | Token transactions, recipient addresses |
| **Stamps** | Sales, Transfers, Listings | Dispenser data, pricing, quantities |
| **Holders** | Holders, Pie Chart | Balance distribution, percentages |
| **Upload** | Image Upload | File management, preview |

### Responsive Behavior

| Breakpoint | Address Format | Scroll | Layout |
|------------|---------------|--------|--------|
| **Mobile** | 4 chars (bc1q...) | Horizontal | Compact columns |
| **Tablet** | 6 chars (bc1qxy...) | Visible | Extended columns |
| **Desktop** | Full address | None | Full visibility, sticky headers |

## Core Components

### Server-Side Components (`components/table/`)

- **HoldersTable.tsx**: Wrapper combining pie chart and table
  - **Purpose**: Display token holder distribution
  - **Components**: HoldersPieChart + HoldersTableBase
  - **Layout**: Responsive flex layout (column → row)
  - **Props**: `holders: HolderData[]`
  - **Features**:
    - Total holder count display
    - Integrated visualization
    - Empty state handling
  - **Location**: `components/table/HoldersTable.tsx`

- **src20DetailsTable/SRC20Mints.tsx**: SRC20 minting transactions
  - **Purpose**: Display minting history for SRC20 tokens
  - **Columns**: AMOUNT, ADDRESS, DATE, TX HASH, BLOCK
  - **Props**: `mints: SRC20Row[]`, `isLoading?: boolean`
  - **Features**:
    - Abbreviated addresses on mobile
    - Date formatting with block time
    - Transaction hash links
    - Block index display
  - **Location**: `components/table/src20DetailsTable/SRC20Mints.tsx`

- **src20DetailsTable/SRC20Transfers.tsx**: SRC20 transfer transactions
  - **Purpose**: Display transfer history between addresses
  - **Columns**: FROM, TO, AMOUNT, DATE, TX HASH
  - **Props**: `transfers: SRC20Row[]`, `isLoading?: boolean`
  - **Features**:
    - Dual address display (sender/receiver)
    - Transfer amount formatting
    - Transaction linking

- **stampDetailsTable/StampSales.tsx**: Stamp dispenser sales
  - **Purpose**: Display dispense transactions with pricing
  - **Columns**: FROM, TO, QTY, RATE, DATE
  - **Props**: `sales: DispenseData[]`, `isLoading?: boolean`
  - **Features**:
    - Satoshi rate display
    - Quantity formatting
    - Dispenser source tracking

- **stampDetailsTable/StampTransfers.tsx**: Stamp transfer history
  - **Purpose**: Display stamp transfer transactions
  - **Columns**: FROM, TO, QTY, DATE, TX HASH
  - **Props**: `transfers: TransferData[]`, `isLoading?: boolean`
  - **Features**:
    - Transfer quantity display
    - Address abbreviation
    - Transaction hash links

- **stampDetailsTable/StampListingsAll.tsx**: All dispenser listings
  - **Purpose**: Comprehensive dispenser listing display
  - **Columns**: ADDRESS, STATUS, QTY, RATE, GIVE QTY, GIVE REMAIN
  - **Props**: `listings: DispenserData[]`, `isLoading?: boolean`
  - **Features**:
    - Status indicators (OPEN/CLOSED)
    - Full dispenser details
    - Remaining quantity tracking

- **stampDetailsTable/StampListingsOpen.tsx**: Active dispensers only
  - **Purpose**: Display only open/active dispensers
  - **Columns**: ADDRESS, QTY, RATE, GIVE QTY, GIVE REMAIN
  - **Props**: `listings: DispenserData[]`, `isLoading?: boolean`
  - **Features**:
    - Filtered to open status
    - Compact display
    - Quick access to active listings

### Interactive Islands (`islands/table/`)

- **DetailsTableBase.tsx**: Central tabbed table orchestrator
  - **Purpose**: Manages tabbed interfaces with data fetching
  - **Props**:
    - `type: "stamps" | "src20" | "src101" | "vault"`
    - `configs: TabConfig[]`
    - `cpid?: string` | `tick?: string`
    - `initialCounts?: Record<string, number>`
  - **Features**:
    - Tab state management
    - Infinite scroll pagination
    - API data fetching
    - Loading states
    - Data transformation (dispenser rate mapping)
  - **Location**: `islands/table/DetailsTableBase.tsx`

- **HoldersTableBase.tsx**: Interactive holders table
  - **Purpose**: Scrollable holder data with pagination
  - **Props**: `holders: HolderData[]`
  - **Features**:
    - Infinite scroll implementation
    - Percentage calculations
    - Balance formatting
    - ScrollContainer integration
  - **Location**: `islands/table/HoldersTableBase.tsx`

- **HoldersPieChart.tsx**: Pie chart visualization
  - **Purpose**: Visual representation of holder distribution
  - **Props**: `holders: HolderData[]`
  - **Features**:
    - Top 5 holders display
    - "Others" category aggregation
    - Responsive sizing
    - Color-coded segments

- **UploadImageTable.tsx**: Image upload workflow table
  - **Purpose**: Manage image upload and preview
  - **Props**: Custom upload props
  - **Features**:
    - File preview
    - Upload progress
    - Status indicators

## Type Definitions

### Table Props
```typescript
export interface TableProps {
  type: "stamps" | "src20" | "src101" | "vault";
  configs?: TabConfig[];
  cpid?: string;
  tick?: string;
  initialCounts?: Record<string, number>;
}

export interface TabConfig {
  id: string;
  label: string;
  endpoint: string;
  countEndpoint?: string;
}

export interface TabData {
  [key: string]: any[];
}
```

### Data Types
```typescript
// SRC20 Row Data
export interface SRC20Row {
  amt: number;
  destination?: string;
  creator?: string;
  block_time: number;
  tx_hash: string;
  block_index?: number;
}

// Dispense Data
export interface DispenseData {
  source: string;
  destination: string;
  dispense_quantity: number;
  satoshirate: number;
  block_time: number;
  tx_hash?: string;
}

// Holder Data
export interface HolderData {
  address: string;
  balance: number;
  percentage: number;
}

// Dispenser Data
export interface DispenserData {
  address: string;
  status: number;
  give_quantity: number;
  give_remaining: number;
  satoshirate: number;
  tx_hash: string;
}
```

### Component Props
```typescript
export interface SRC20MintsProps {
  mints: SRC20Row[];
  isLoading?: boolean;
}

export interface SRC20TransfersProps {
  transfers: SRC20Row[];
  isLoading?: boolean;
}

export interface StampSalesProps {
  sales: DispenseData[];
  isLoading?: boolean;
}

export interface HoldersTableProps {
  holders: HolderData[];
}
```

## Usage Examples

### Basic Server-Side Table
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
      configs={[
        {
          id: "mints",
          label: "Mints",
          endpoint: "/api/v2/src20/mints",
          countEndpoint: "/api/v2/src20/mints/count"
        },
        {
          id: "transfers",
          label: "Transfers",
          endpoint: "/api/v2/src20/transfers"
        }
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
      holders={[
        { address: "bc1q...", balance: 1000, percentage: 25.5 },
        { address: "1A1z...", balance: 750, percentage: 19.2 }
      ]}
    />
  );
}
```

### Stamp Sales Table
```tsx
import { StampSalesTable } from "$table";

export function SalesHistory({ sales }) {
  return (
    <StampSalesTable
      sales={sales}
      isLoading={false}
    />
  );
}
```

### Stamp Listings (Open Only)
```tsx
import { StampListingsOpenTable } from "$table";

export function ActiveListings({ listings }) {
  return (
    <StampListingsOpenTable
      listings={listings.filter(l => l.status === 0)}
      isLoading={false}
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

Cells use position-based styling for rounded corners:

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
  <div class="!-my-2 overflow-x-auto tablet:overflow-x-visible scrollbar-hide">
    <table class={`w-full border-separate border-spacing-y-2 ${textSm}`}>
      {/* Table content */}
    </table>
  </div>
</ScrollContainer>
```

**ScrollContainer Features:**
- Automatic scrollbar padding detection
- Responsive padding: 16px (desktop), 24px (mobile)
- ResizeObserver for dynamic updates
- Scroll event handling for infinite scroll
- Glassmorphism scrollbar styling

**Common Height Configurations:**
- DetailsTableBase tabs: `min-h-[72px] max-h-[290px]`
- HoldersTableBase: `min-h-[80px] max-h-[290px]`
- StampListingsOpen: `min-h-[76px] max-h-[244px]`

### Typography System

Tables use consistent typography from the text system:

```tsx
import { labelXs, textSm, valueDarkSm, valueSmLink } from "$text";

// Headers
<th class={labelXs}>HEADER</th>

// Body text
<table class={textSm}>...</table>

// Values
<td class={valueDarkSm}>1,000</td>

// Links
<a class={valueSmLink} href="...">bc1q...</a>
```

## Technical Implementation

### Infinite Scroll Pattern

```typescript
const PAGE_SIZE = 16;

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  const { scrollTop, scrollHeight, clientHeight } = target;

  // Trigger load 5px before bottom
  if (scrollTop + clientHeight >= scrollHeight - 5 && hasMore && !isLoading) {
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
// Mapping dispenser rates to dispense data
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

### Responsive Address Formatting

```typescript
import { abbreviateAddress } from "$lib/utils/ui/formatting/formatUtils.ts";

// Mobile: 4 characters
<span class="tablet:hidden">{abbreviateAddress(address, 4)}</span>

// Tablet: 6 characters
<span class="hidden tablet:inline desktop:hidden">
  {abbreviateAddress(address, 6)}
</span>

// Desktop: Full address
<span class="hidden desktop:inline">{address}</span>
```

## Performance Considerations

### Lazy Loading Strategy
- Initial page size: 16 items
- Load more on scroll trigger
- Prevents large initial data loads
- Smooth user experience

### Responsive Rendering
- Address abbreviation reduces DOM size on mobile
- Column widths optimized per breakpoint
- Sticky headers only on desktop
- Horizontal scroll on mobile only

### Memory Management
- Append-only data updates for smooth scrolling
- Batched state updates prevent re-renders
- Proper event handler cleanup
- Efficient data transformation with Map

### Pagination Optimization
- PAGE_SIZE = 16 (balance between requests and UX)
- hasMore flag prevents unnecessary requests
- Tab-specific pagination state
- Reset pagination on tab change

## Empty States and Error Handling

### Empty State Pattern
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

### Loading State
```tsx
{isLoading && (
  <tr>
    <td colSpan={headers.length} class="text-center py-4">
      <LoadingSpinner />
    </td>
  </tr>
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
- **DetailsTableBase**: Multi-tab interfaces with different data types
- **HoldersTable**: Distribution visualization with data table

### Data Structure
- Always include `isLoading` prop for loading states
- Provide `initialCounts` for tab badges
- Use proper TypeScript interfaces
- Handle null/undefined data gracefully

### Responsive Design
- Use `abbreviateAddress()` for mobile views
- Implement horizontal scroll on mobile
- Apply sticky headers only on desktop
- Test all breakpoints (mobile, tablet, desktop)

### Performance
- Set appropriate PAGE_SIZE (16 recommended)
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
  configs={[
    { id: "sales", label: "Sales", endpoint: "/api/sales" },
    { id: "transfers", label: "Transfers", endpoint: "/api/transfers" }
  ]}
  cpid={stampId}
  initialCounts={{ sales: 42, transfers: 18 }}
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
  href={`https://mempool.space/address/${address}`}
  target="_blank"
  rel="noopener noreferrer"
  class={valueSmLink}
>
  <span class="tablet:hidden">{abbreviateAddress(address, 4)}</span>
  <span class="hidden tablet:inline desktop:hidden">
    {abbreviateAddress(address, 6)}
  </span>
  <span class="hidden desktop:inline">{address}</span>
</a>
```

### Transaction Hash Link
```tsx
<a
  href={`https://mempool.space/tx/${txHash}`}
  target="_blank"
  rel="noopener noreferrer"
  class={valueSmLink}
>
  {abbreviateAddress(txHash, 4)}
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
```tsx
// components/table/NewTable.tsx
import {
  cellLeftL2Detail,
  cellRightL2Detail,
  container2
} from "$layout";
import { colGroup, cellAlign } from "$components/layout/types.ts";
import { labelXs, textSm, valueDarkSm } from "$text";

export function NewTable({ data, isLoading = false }: NewTableProps) {
  const headers = ["ID", "VALUE", "DATE"];

  return (
    <div class="-mt-2 overflow-x-auto tablet:overflow-x-visible scrollbar-hide">
      <table class={`w-full border-separate border-spacing-y-2 ${textSm}`}>
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
                class={`${cellAlign(i, headers.length)} ${labelXs}`}
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

### Step 4: Export from Index
```tsx
// components/table/index.ts (or appropriate index file)
export * from "./NewTable.tsx";
```

## Troubleshooting

### Issue: Infinite scroll not triggering
**Solution**: Check `hasMore` flag and ensure scroll threshold is appropriate (5px before bottom). Verify `onScroll` handler is attached to ScrollContainer.

### Issue: Sticky headers not working on mobile
**Solution**: This is intentional. Sticky headers are only applied on desktop to prevent mobile layout issues. Check responsive classes.

### Issue: Table not rendering data
**Solution**: Verify data prop is populated and not `undefined`. Check `isLoading` state isn't stuck on `true`. Console log data to debug.

### Issue: Addresses not abbreviating on mobile
**Solution**: Ensure you're using `abbreviateAddress()` utility and have proper responsive classes (`tablet:hidden`, `hidden tablet:inline`).

### Issue: Tab counts not updating
**Solution**: Pass `initialCounts` prop to DetailsTableBase. Ensure count endpoints are configured in tab config.

### Issue: Columns misaligned
**Solution**: Check `colGroup()` widths match number of columns. Verify all cells use consistent styling classes.

## Related Components

- **Layout System**: Provides glassmorphism styles and ScrollContainer ([layout/doc.md](mdc:components/layout/doc.md))
- **Text System**: Typography styles for headers and content ([text/styles.ts](mdc:components/text/styles.ts))
- **Icon System**: Icons used in table headers and actions ([icon/doc.md](mdc:components/icon/doc.md))
- **Button System**: Buttons for pagination and actions ([button/doc.md](mdc:components/button/doc.md))

---

**Last Updated:** October 6, 2025
**Author:** baba
