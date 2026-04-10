---
name: react-query-patterns
description: |
  React Query v5 patterns for binora-frontend: standard API hook pattern (getFoo + queryOptions + useFoo),
  query key factories, mutations with cache invalidation, pagination, and API deduplication rules.
  Use when creating API hooks, implementing data fetching, or reviewing query patterns.
allowed-tools: [Read, Grep, Glob]
context: fork
version: "1.0.0"
for_agents: [builder, reviewer, planner]
---

# React Query Patterns

**THE #1 RULE: Every API endpoint follows the 3-part pattern: `getFoo` + `getFooQueryOptions` + `useFoo`.**

---

## Standard Query Pattern

Every GET endpoint must export three things:

| Export | Purpose | Type |
|--------|---------|------|
| `getFoo` | Raw async function calling `api.get()` | `(params) => Promise<T>` |
| `getFooQueryOptions` | Query options factory with `queryKey` + `queryFn` | Uses `queryOptions()` from TanStack |
| `useFoo` | Hook wrapping `useQuery` with i18n language | Returns `UseQueryResult<T>` |

### Real Project Example (from `get-processes-paginated.ts`)

```typescript
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/api-client";
import type { QueryConfig } from "@/lib/react-query";
import type { PaginatedProcessListReadable } from "@/types";

// 1. Params type
export type GetProcessesPaginatedParams = {
  page?: number;
  limit?: number;
  language?: string;
  search?: string;
  group?: "mac" | "mnt";
  ordering?: string;
};

// 2. Raw fetch function
export const getProcessesPaginated = async (
  { page = 1, limit = 10, search, group, ordering }: GetProcessesPaginatedParams = { page: 1, limit: 10 }
): Promise<PaginatedProcessListReadable> => {
  const params: Record<string, string | number> = { page, limit };
  if (search) params.search = search;
  if (group) params.group = group;
  if (ordering) params.ordering = ordering;

  return await api.get("/processes/", { params });
};

// 3. Query options factory
export const getProcessesPaginatedQueryOptions = ({
  page = 1, limit = 10, language, search, group, ordering,
}: GetProcessesPaginatedParams = { page: 1, limit: 10 }) =>
  queryOptions({
    queryKey: ["processes-table", language, page, limit, search, group, ordering],
    queryFn: () => getProcessesPaginated({ page, limit, search, group, ordering }),
  });

// 4. Options type for the hook
export type UseProcessesPaginatedOptions = {
  params?: GetProcessesPaginatedParams;
  queryConfig?: QueryConfig<typeof getProcessesPaginatedQueryOptions>;
};

// 5. Hook with i18n language injection
export const useProcessesPaginated = (
  { params = { page: 1, limit: 10 }, queryConfig }: UseProcessesPaginatedOptions = {}
) => {
  const { i18n } = useTranslation();
  const queryParams = { ...params, language: i18n.language };

  return useQuery({
    ...getProcessesPaginatedQueryOptions(queryParams),
    ...queryConfig,
  });
};
```

---

## Query Key Rules

| Rule | Example |
|------|---------|
| Hierarchical array structure | `["processes", language, page, limit, search]` |
| Include ALL params that affect the response | `["assets", language, page, limit, search, filterKey, ordering]` |
| Language always included (for i18n) | `language: i18n.language` injected in hook |
| Use `undefined` for optional empty params | `search \|\| undefined` |
| Resource name as first element | `["processes"]`, `["assets"]`, `["users"]` |

### Key Factory Pattern

```typescript
export const processKeys = {
  all: ["processes"] as const,
  lists: () => [...processKeys.all, "list"] as const,
  list: (params: ProcessParams) => [...processKeys.lists(), params] as const,
  details: () => [...processKeys.all, "detail"] as const,
  detail: (id: string) => [...processKeys.details(), id] as const,
};
```

---

## Mutation Pattern

Mutations follow a similar structure with `useMutation` + cache invalidation + notifications.

### Real Project Example (from `create-process.ts`)

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useNotifications } from "@/components/ui/notifications";
import { api } from "@/lib/api-client";
import type { ProcessSummaryReadable } from "@/types";

// Raw mutation function
export const createProcess = ({
  data, processType,
}: { data: CreateProcessInput; processType: string }): Promise<ProcessSummaryReadable> => {
  return api.post("/processes/", payload);
};

// Mutation hook with invalidation + notifications
export const useCreateProcess = ({
  processType, notificationMessages, mutationConfig,
}: UseCreateProcessOptions) => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();

  return useMutation({
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["processes"] });
      if (notificationMessages?.success) {
        addNotification({ type: "success", ...notificationMessages.success });
      }
      mutationConfig?.onSuccess?.(data);
    },
    onError: (error) => {
      if (notificationMessages?.error) {
        addNotification({ type: "error", ...notificationMessages.error });
      }
      mutationConfig?.onError?.(error);
    },
    mutationFn: (variables) => createProcess({ data: variables.data, processType }),
  });
};
```

---

## Mutation Checklist

| Step | Detail |
|------|--------|
| Invalidate related queries on success | `queryClient.invalidateQueries({ queryKey: ["resource"] })` |
| Show success notification | Via `useNotifications().addNotification()` |
| Show error notification | In `onError` callback |
| Accept `mutationConfig` for caller overrides | `onSuccess`, `onError` callbacks |
| Types from OpenAPI | `import type { Foo } from "@/types"` |

---

## API Client Usage

| Method | Usage |
|--------|-------|
| `api.get(url, { params })` | For relative URLs (uses `baseURL`) |
| `api.post(url, data)` | POST with body |
| `api.patch(url, data)` | Partial update |
| `api.delete(url)` | Returns `{ data, status }` |
| `apiClient.get(url)` | Smart client: auto-detects absolute vs relative URL |

The `api` instance (from `src/lib/api-client.ts`):
- Automatically adds `Authorization: Bearer <token>` header
- Handles JWT refresh on 401
- Adds `Accept-Language` from i18n
- Returns `response.data` directly (not the Axios response wrapper)

---

## Config Types

From `src/lib/react-query.ts`:

```typescript
export type QueryConfig<T extends (...args: any[]) => any> = Partial<Omit<
  ReturnType<T>,
  "queryKey" | "queryFn"
>>;

export type MutationConfig<MutationFnType extends (...args: any) => Promise<any>> =
  UseMutationOptions<ApiFnReturnType<MutationFnType>, Error, Parameters<MutationFnType>[0]>;
```

---

## API Deduplication (MANDATORY)

| Step | Action |
|------|--------|
| 1 | Before creating a new query file, search `src/features/` for existing queries to the same endpoint |
| 2 | Check `features/shared/api/` for shared queries |
| 3 | Search by resource name: `Grep("useProcesses\|getProcesses", "src/features/")` |
| 4 | If single-feature: place in `features/X/api/` |
| 5 | If multi-feature: move to `features/shared/api/<resource>/` |

---

## Anti-Patterns

| Anti-Pattern | Problem | Correction |
|--------------|---------|------------|
| Missing language in query key | Cache not invalidated on language switch | Always include `language` param |
| Duplicated query across features | Maintenance burden, inconsistent cache | Consolidate in `features/shared/api/` |
| Using `fetch()` directly | Bypasses auth interceptor | Use `api.get()` from `@/lib/api-client` |
| Hardcoded query keys as strings | Typos, no autocomplete | Use query key factory pattern |
| Missing `queryConfig` param in hook | Caller cannot customize behavior | Always accept optional `queryConfig` |
| Not invalidating on mutation success | Stale data after changes | `queryClient.invalidateQueries()` |

---

**Version**: 1.0.0
**Project References**: `src/lib/api-client.ts` (API client), `src/lib/react-query.ts` (config types), `src/features/process-central/api/` (query examples), `src/features/forms/api/create-process.ts` (mutation example)
