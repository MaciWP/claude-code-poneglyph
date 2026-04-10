---
name: openapi-frontend-contract
description: |
  Contract-first development for React/TypeScript frontends: OpenAPI spec consumed as a submodule
  or local file, type generation with @hey-api/openapi-ts, API client integration, and type usage patterns.
  Use when creating API hooks, updating types, or debugging type mismatches.
allowed-tools: [Read, Grep, Glob]
context: fork
version: "1.0.0"
for_agents: [builder, reviewer, scout]
---

# OpenAPI Frontend Contract

**THE #1 RULE: Types come from the project's `openapi.yaml` via generation. Never hand-define types that already exist in the generated types file.**

---

## Architecture

```
openapi-contract/         # Source of truth (often a git submodule shared with backend)
├── openapi.yaml          # Single source of truth for API types
└── ...

<generated types path>/   # Auto-generated output (e.g. src/types/types.gen.ts)
└── ...                   # Re-exported via a barrel (e.g. @/types)
```

---

## Workflow

| Step | Command | When |
|------|---------|------|
| 1. Update submodule | `git submodule update --remote` | When backend updates the contract |
| 2. Generate types | `yarn openapi-ts` | After submodule update |
| 3. Use in features | `import type { FooReadable } from "<types barrel>"` | When implementing API hooks |
| 4. Commit submodule | `git add <contract-submodule> && git commit` | After verifying types work |

### Full Update Flow

```bash
# Pull latest contract (adjust path to your contract submodule)
cd <contract-submodule>
git pull origin main
cd ..

# Regenerate types
yarn openapi-ts

# Verify no type errors
yarn check-types

# Commit
git add <contract-submodule> <generated-types-path>
git commit -m "update contract submodule and regenerate types"
```

---

## Type Usage

| Rule | Example |
|------|---------|
| Always use `import type` | `import type { UserReadable } from "@/types"` |
| Import from `@/types` | Not from `@/types/types.gen` directly |
| Use generated names | `PaginatedAssetListReadable`, `ProcessSummaryReadable` |
| Paginated responses | `PaginatedFooListReadable` has `results: Foo[]` + `count: number` |

### Common Type Patterns

```typescript
// Reading a resource
import type { UserReadable } from "@/types";

// Paginated list
import type { PaginatedUserListReadable } from "@/types";

// Creating a resource (input)
import type { UserCreatable } from "@/types";

// Updating a resource
import type { UserUpdatable } from "@/types";

// Permissions
import type { PermissionsAssigned } from "@/types";
```

---

## API Client Integration

The `api` instance from `src/lib/api-client.ts`:

| Feature | Detail |
|---------|--------|
| Base URL | Auto-detected from env vars (`VITE_APP_API_URL` or `/api/`) |
| Auth | Adds `Authorization: Bearer <token>` automatically |
| JWT Refresh | Handles 401 with automatic token refresh |
| Language | Sends `Accept-Language` header from i18n |
| Response | Returns `response.data` directly (not Axios wrapper) |
| Errors | Returns `ErrorResponse` with `message`, `code`, `status` |

### Usage in API Files

```typescript
import { api } from "@/lib/api-client";
import type { PaginatedFooListReadable } from "@/types";

export const getFoos = async (params: GetFoosParams): Promise<PaginatedFooListReadable> => {
  return await api.get("/foos/", { params });
};

export const createFoo = (data: FooCreatable): Promise<FooReadable> => {
  return api.post("/foos/", data);
};

export const updateFoo = (id: string, data: FooUpdatable): Promise<FooReadable> => {
  return api.patch(`/foos/${id}/`, data);
};

export const deleteFoo = (id: string): Promise<{ data: null; status: number }> => {
  return api.delete(`/foos/${id}/`);
};
```

---

## When Types Seem Wrong

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Type doesn't exist in `@/types` | Contract not updated | Update submodule + `yarn openapi-ts` |
| Type fields don't match API response | Contract out of sync | Check `openapi.yaml`, update if needed |
| Type name changed | Backend renamed schema | Update submodule + regenerate |
| Missing optional fields | Contract uses `required` differently | Check schema in `openapi.yaml` |

### Debug Steps

```bash
# 1. Check current submodule commit
cd <contract-submodule> && git log -1

# 2. See if remote has updates
git fetch origin && git log HEAD..origin/main --oneline

# 3. Update and regenerate
git pull origin main && cd .. && yarn openapi-ts

# 4. Verify
yarn check-types
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Correction |
|--------------|---------|------------|
| `interface User { id: string; name: string; }` | Manually defining generated types | Use `import type { UserReadable } from "@/types"` |
| `as any` on API responses | Hides type mismatches | Fix the type or update contract |
| Importing from `types.gen.ts` directly | Fragile path | Import from `@/types` (barrel) |
| Not running `yarn openapi-ts` after submodule update | Stale types | Always regenerate after pull |
| Defining request body types manually | Drift from contract | Use generated `FooCreatable` types |

---

**Version**: 1.0.0
**Project References**: the project's `openapi.yaml` (contract), the project's generated types file, and the project's API client wrapper
