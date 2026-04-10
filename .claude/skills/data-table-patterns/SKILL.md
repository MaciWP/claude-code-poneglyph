---
name: data-table-patterns
description: |
  DataTable component patterns for React/TypeScript frontends: shared DataTable from data-table.tsx,
  column definitions, server-side pagination, sorting, filtering, row selection, and column ordering.
  Use when implementing tables, adding pagination, or extending DataTable features.
type: knowledge-base
disable-model-invocation: false
effort: medium
activation:
  keywords:
    - data table
    - datatable
    - pagination
    - sorting
    - filtering
    - row selection
    - column definition
    - shadcn table
    - tanstack table
    - faceted filter
for_agents: [builder, reviewer]
context: fork
version: "1.0.0"
---

# DataTable Patterns

**THE #1 RULE: Use the shared `DataTable` from `src/components/ui/data-table/data-table.tsx`. Extend via props, never fork.**

---

## Component Location

| File | Purpose |
|------|---------|
| `src/components/ui/data-table/data-table.tsx` | Main shared DataTable component |
| `src/components/ui/data-table/data-table-pagination.tsx` | Pagination controls |
| `src/components/ui/data-table/data-table-column-header.tsx` | Sortable column headers |
| `src/components/ui/data-table/data-table-faceted-filter.tsx` | Faceted filter dropdowns |
| `src/components/ui/data-table/data-table-view-options.tsx` | Column visibility toggle |
| `src/components/ui/data-table/toolbar.tsx` | Search + filters + actions bar |
| `src/components/ui/data-table/draggable-table-header.tsx` | Drag-to-reorder columns |
| `src/components/ui/data-table/row-actions.tsx` | Row action menu |

---

## Basic Usage (Client-Side)

```typescript
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table/data-table";
import type { AssetReadable } from "@/types";

const columns: ColumnDef<AssetReadable>[] = [
  {
    accessorKey: "code",
    header: "Code",
    size: 120,
  },
  {
    accessorKey: "name",
    header: "Name",
    size: 200,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function AssetList({ assets }: { assets: AssetReadable[] }) {
  return (
    <DataTable
      columns={columns}
      data={assets}
      searchPlaceholder="Search assets..."
      tableName="assets"
    />
  );
}
```

---

## Server-Side Pagination

### Key Props

| Prop | Type | Purpose |
|------|------|---------|
| `serverSide` | `boolean` | Enables server-side mode |
| `pageCount` | `number` | Total pages from API response |
| `onPaginationChange` | `(pagination) => void` | Called when page/pageSize changes |
| `onSearchChange` | `(search: string) => void` | Called when search input changes (debounced) |
| `onSortingChange` | `(sorting: SortingState) => void` | Called when column sort changes |
| `onFilterChange` | `(key, values) => void` | Called when faceted filter changes |
| `isLoading` | `boolean` | Shows loading overlay |
| `initialPageSize` | `number` | Default page size |

### Full Server-Side Example

```typescript
export function AssetsTable() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState<string | undefined>();
  const [filters, setFilters] = useState<Record<string, (number | string)[] | string | undefined>>({});

  const { data, isLoading } = useAssetsInventory({
    params: { page, limit: pageSize, search, ordering, filters },
  });
  const pageCount = data ? Math.ceil(data.count / pageSize) : 0;

  return (
    <DataTable
      columns={columns}
      currentFilters={filters}
      data={data?.results ?? []}
      isLoading={isLoading}
      pageCount={pageCount}
      serverSide
      tableName="assets-inventory"
      onFilterChange={(key, values) => setFilters((prev) => ({ ...prev, [key]: values }))}
      onPaginationChange={({ pageIndex, pageSize }) => { setPage(pageIndex + 1); setPageSize(pageSize); }}
      onSearchChange={setSearch}
      onSortingChange={(s) => setOrdering(s[0] ? (s[0].desc ? `-${s[0].id}` : s[0].id) : undefined)}
    />
  );
}
```

---

## Column Definitions

### Column Types

| Type | Usage |
|------|-------|
| `accessorKey` | Direct property access from row data |
| `accessorFn` | Custom accessor function |
| `header` | String or component for header cell |
| `cell` | Custom cell renderer |
| `size` | Column width in pixels |
| `enableSorting` | `false` to disable sorting |

### Column with Sortable Header

```typescript
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";

{
  accessorKey: "name",
  header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
  size: 200,
}
```

### Column with Custom Cell

```typescript
{
  accessorKey: "status",
  header: "Status",
  cell: ({ row }) => {
    const status = row.getValue("status") as string;
    return <Badge variant={statusVariant[status]}>{status}</Badge>;
  },
}
```

---

## Table Configuration

### Filter Config

```typescript
const tableConfig: TableOptionsConfig = {
  filterConfig: {
    status: { type: "choice" },
    asset_type: { type: "choice" },
    name: { type: "icontains" },
  },
  orderableFields: new Set(["code", "name", "created_at"]),
  getFacetedOptions: (fieldId) => {
    if (fieldId === "status") return statusOptions;
    if (fieldId === "asset_type") return typeOptions;
    return undefined;
  },
};
```

### Filter Types

| Type | Behavior |
|------|----------|
| `choice` | Multi-select dropdown (faceted filter) |
| `exact` | Exact match filter |
| `icontains` | Case-insensitive contains |

---

## Row Selection

| Prop | Type | Purpose |
|------|------|---------|
| `rowSelectionProp` | `RowSelectionState` | External selection state |
| `onRowSelectionChange` | `(updater) => void` | Selection change handler |
| `onSelectionChange` | `(selectedRows) => void` | Callback with actual row data |
| `bulkActions` | `ReactNode` | Actions shown when rows selected |

```typescript
const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

<DataTable
  bulkActions={<BulkDeleteButton selectedIds={Object.keys(rowSelection)} />}
  columns={columns}
  data={data}
  rowSelectionProp={rowSelection}
  onRowSelectionChange={setRowSelection}
/>
```

---

## Column Pinning

| Prop | Type | Purpose |
|------|------|---------|
| `pinLeft` | `string[]` | Column IDs to pin left |
| `pinRight` | `string[]` | Column IDs to pin right |

```typescript
<DataTable
  columns={columns}
  data={data}
  pinLeft={["select"]}
  pinRight={["actions"]}
/>
```

---

## Column Order Persistence

The `tableName` prop enables localStorage persistence for:

| Feature | Storage Key | Requirement |
|---------|-------------|-------------|
| Column order | `table_column_order_${tableName}` | `tableName` prop provided |
| Page size | `table_pagesize_${tableName}` | `tableName` + `serverSide` |

Users can drag-and-drop columns to reorder. Order persists across sessions.

---

## Anti-Patterns

| Anti-Pattern | Problem | Correction |
|--------------|---------|------------|
| Forking DataTable for customization | Maintenance divergence | Extend via props or `tableConfig` |
| Building custom table from scratch | Missing features (sort, filter, pin, drag) | Use shared `DataTable` |
| Client-side filtering with server-side pagination | Filters only apply to current page | Use `onFilterChange` for server-side |
| Missing `tableName` | No column order persistence | Always provide `tableName` |
| Hardcoded page size | User preference lost | Use `initialPageSize` + server-side persistence |
| Not handling empty state | Blank table confusing | DataTable shows "No results." by default |
| Missing `isLoading` on server-side | No loading indicator | Pass `isLoading` from query |

---

**Version**: 1.0.0
**Project References**: `src/components/ui/data-table/data-table.tsx` (main component), `src/hooks/use-table-column-order.ts` (persistence hook), `src/features/settings/assets-inventory/` (server-side example)
