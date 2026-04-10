---
name: bulletproof-architecture
description: |
  Architecture rules for React/TypeScript frontends following the Bulletproof React pattern (alan2207/bulletproof-react): feature-based slicing, module boundaries, state management, route registration, and i18n integration.
  Use when creating features, reviewing imports, or deciding where code belongs.
type: knowledge-base
disable-model-invocation: false
effort: high
activation:
  keywords:
    - bulletproof
    - bulletproof react
    - feature slice
    - module boundary
    - feature-based
    - react architecture
    - vertical slice
    - cross-feature import
    - feature index
    - public api
for_agents: [builder, reviewer, planner, scout]
context: fork
version: "1.0.0"
---

# Bulletproof Architecture

**THE #1 RULE: Features are isolated vertical slices. No cross-feature imports.**

```
src/
├── app/            # Shell: router, providers, routes
├── features/       # Vertical slices (self-contained)
│   ├── [feature]/
│   │   ├── api/        # React Query hooks + fetch functions
│   │   ├── components/ # Feature-specific UI
│   │   ├── hooks/      # Feature-specific hooks
│   │   ├── types/      # Feature-specific types
│   │   └── index.ts    # Public API (only exports)
│   └── shared/     # Shared feature utilities
├── components/     # Shared UI (shadcn/ui based)
├── lib/            # Core utilities (api-client, auth, permissions)
├── hooks/          # Shared hooks (no feature deps)
├── stores/         # Zustand stores
├── types/          # Generated types from OpenAPI
└── i18n/           # Internationalization (en/es)
```

---

## Module Boundary Rules

| Source | Can Import From | Cannot Import From |
|--------|----------------|-------------------|
| `features/X/` | Self, `features/shared/`, `components/`, `lib/`, `hooks/`, `utils/`, `types/`, `stores/` | Other `features/Y/`, `app/` |
| `components/` | `lib/`, `hooks/`, `utils/`, `types/` | `features/`, `app/` |
| `lib/` | `stores/`, `types/`, external packages | `features/`, `components/`, `app/` |
| `app/` | Everything | - |
| `features/shared/` | `components/`, `lib/`, `hooks/`, `types/` | Other `features/` (except shared) |

### Import Style

| Rule | Example |
|------|---------|
| Use `@/` alias | `import { Button } from "@/components/ui/button"` |
| Import from feature `index.ts` | `import { UserProfile } from "@/features/users"` |
| Never import feature internals | `import { helper } from "@/features/users/utils/helper"` is FORBIDDEN |
| Use `import type` for types | `import type { User } from "@/types"` |

---

## Creating New Features

| Step | Action | Example |
|------|--------|---------|
| 1 | Create feature directory | `src/features/my-feature/` |
| 2 | Add subdirectories as needed | `api/`, `components/`, `hooks/`, `types/` |
| 3 | Export public API via `index.ts` | Only what others need |
| 4 | Register routes | `src/app/router.tsx` with lazy loading |
| 5 | Add i18n namespace | `src/i18n/locales/en/my-feature.json` + `es/` |

### Feature `index.ts` Pattern

```typescript
// features/users/index.ts
export { UserList } from "./components/user-list";
export { UserProfile } from "./components/user-profile";
export { useUsers } from "./api/get-users";
export type { User } from "./types";
// Internal components, utils, hooks are NOT exported
```

### Route Registration

```typescript
// src/app/router.tsx
{
  path: paths.app.myFeature.getHref(),
  lazy: async () => {
    const { MyFeatureRoute } = await import("@/features/my-feature");
    return { Component: MyFeatureRoute };
  },
}
```

---

## State Management Decision Tree

| State Type | Solution | Location |
|-----------|----------|----------|
| Server data (API responses) | React Query | `features/X/api/` |
| Global client state (user, theme) | Zustand | `src/stores/` |
| Form state | React Hook Form + Zod | Co-located with form component |
| Local component state | `useState` | Inside the component |
| URL state (filters, pagination) | React Router search params | Component or custom hook |

### Zustand Store Pattern (from project)

```typescript
import { create } from "zustand";
import type { UserReadable } from "@/types";

interface UserStore {
  user: UserReadable | null;
  setUser: (user: UserReadable | null) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

---

## i18n Integration

| Rule | Detail |
|------|--------|
| All user-facing text uses `useTranslation` | `const { t } = useTranslation("my-feature")` |
| Namespace per feature | `src/i18n/locales/en/my-feature.json` |
| Both `en` and `es` required | Always add keys to both locales |
| No hardcoded strings in JSX | Use `t("keyName")` |
| Common keys in `common` namespace | Shared labels like "save", "cancel" |

---

## Error Boundaries

| Scope | Component | When |
|-------|-----------|------|
| Global | `MainErrorFallback` in `app/provider.tsx` | Catches everything |
| Feature/Route | `FeatureErrorBoundary` | Wrap route-level components |
| Risky zones | `FeatureErrorBoundary` | Drag & drop, Kanban, complex forms |

---

## API Query Deduplication

| Rule | Detail |
|------|--------|
| Search before creating | Check `features/shared/api/` and all `features/*/api/` |
| Single feature usage | Place in that feature's `api/` |
| Multi-feature usage | Move to `features/shared/api/<resource>/` |
| Never duplicate | Do not copy-paste queries across features |

---

## Anti-Patterns

| Anti-Pattern | Problem | Correction |
|--------------|---------|------------|
| `import { helper } from "@/features/users/utils/helper"` | Importing feature internals | Import from `@/features/users` (index.ts) |
| Feature A imports from Feature B | Cross-feature dependency | Move shared code to `features/shared/` |
| Business logic in `src/lib/` that uses features | Core importing features | Move to the feature or `features/shared/` |
| Putting feature code in `src/components/` | Breaks feature isolation | Move to `features/X/components/` |
| Missing `index.ts` in feature | No controlled public API | Add `index.ts` exporting only necessary items |
| Hardcoded strings in JSX | Missing i18n | Use `t("key")` with proper namespace |
| Duplicated API query across features | Maintenance burden | Consolidate in `features/shared/api/` |

---

## Permissions

| Pattern | Usage |
|---------|-------|
| Component guard | `<PermissionGuard permission="settings.users">` |
| Hook | `const { hasPermission } = usePermissions()` |
| Key format | Dot notation: `settings.users`, `process-central.edit` |

---

**Version**: 1.0.0
**Project References**: `src/app/router.tsx` (routes), `src/app/provider.tsx` (providers), `src/stores/user.store.ts` (Zustand), `src/lib/permissions.tsx` (permissions), `src/config/paths.ts` (path config)
