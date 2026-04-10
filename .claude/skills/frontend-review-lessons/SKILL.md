---
name: frontend-review-lessons
description: |
  Accumulated review lessons and common pitfalls for React/TypeScript frontends. Contains patterns
  that have caused bugs, PR rejections, or maintenance issues. Growing knowledge base.
  Use when reviewing code or before implementing to avoid known pitfalls.
activation:
  keywords:
    - frontend review
    - react review
    - typescript review
    - review lessons
    - common pitfalls
    - frontend pitfalls
    - past pr lessons
    - review checklist
    - frontend mistakes
allowed-tools: [Read, Grep, Glob]
context: fork
version: "1.0.0"
for_agents: [builder, reviewer]
---

# Frontend Review Lessons

**Learned patterns from code reviews. Check this before implementing or reviewing.**

---

## Module Boundary Violations

| Violation | Found In | Fix |
|-----------|----------|-----|
| Feature A imports internal component from Feature B | Cross-feature coupling | Move to `features/shared/` or export via `index.ts` |
| `src/lib/` importing from `features/` | Core depending on features | Move shared logic to `features/shared/` or `lib/` |
| Direct import of feature internal file | `@/features/users/utils/helper` | Import from `@/features/users` (index.ts) |
| `app/` provider importing feature internals | Tight coupling | Feature exports public API only |

### Detection

```bash
# Find cross-feature imports
grep -rn "from \"@/features/" src/features/ | grep -v "/shared/" | grep -v "index"
```

---

## Missing i18n (Hardcoded Strings)

| Pattern | Problem | Fix |
|---------|---------|-----|
| `<h1>User Profile</h1>` | Not translatable | `<h1>{t("userProfile")}</h1>` |
| `placeholder="Search..."` | English-only | `placeholder={t("common:search")}` |
| Error messages in code | Not localized | Use i18n keys for all user-facing text |
| Missing `es` locale keys | Spanish users see key names | Always add keys to both `en/` and `es/` |

---

## React Query Issues

| Issue | Problem | Fix |
|-------|---------|-----|
| Missing language in query key | Cache not invalidated on language switch | Include `i18n.language` in all query keys |
| Duplicated query across features | Two files fetching same endpoint | Consolidate in `features/shared/api/` |
| Missing `queryConfig` prop | Caller cannot customize retry, staleTime | Always accept optional `queryConfig` param |
| Using `fetch()` directly | Bypasses auth interceptor, no JWT refresh | Use `api.get()` from `@/lib/api-client` |
| Not invalidating related queries | Stale data after mutation | `queryClient.invalidateQueries({ queryKey })` |
| Hardcoded query keys | Typo risk, inconsistent | Use query key factory or match existing pattern |

---

## Missing UI States

| Missing State | Consequence | Required Pattern |
|--------------|-------------|-----------------|
| Loading state | Blank screen during fetch | Show `<Spinner />` or skeleton |
| Error state | White screen on API failure | Show error message or `<FeatureErrorBoundary>` |
| Empty state | Confusing blank table/list | Show "No results" or empty state illustration |
| Disabled state during mutation | Double submissions | Disable button with `isPending` from mutation |

### Checklist for Query Consumers

```typescript
const { data, isLoading, isError, error } = useThings();

if (isLoading) return <Spinner />;
if (isError) return <ErrorMessage error={error} />;
if (!data || data.length === 0) return <EmptyState />;

return <ThingList items={data} />;
```

---

## Form Validation Issues

| Issue | Problem | Fix |
|-------|---------|-----|
| Missing Zod schema | No runtime validation | Define schema with `z.object({...})` |
| Schema not matching API contract | Mismatched types | Import types from `@/types` (OpenAPI generated) |
| Not using `zodResolver` | Form submits invalid data | `resolver: zodResolver(schema)` |
| Missing error display | User doesn't see validation errors | `<FormMessage />` after each field |

---

## DataTable Pitfalls

| Issue | Problem | Fix |
|-------|---------|-----|
| Forking `DataTable` for customization | Maintenance divergence | Extend via props (`serverSide`, `pageCount`, callbacks) |
| Not including `tableName` | Column order not persisted | Pass `tableName` for localStorage persistence |
| Missing `getRowId` | Row selection breaks | Provide custom `getRowId` if rows lack `id` field |
| Client-side filtering on server-paginated data | Filters only current page | Use `onFilterChange` prop for server-side filtering |

---

## Error Boundary Gaps

| Scope | Missing | Fix |
|-------|---------|-----|
| New route without boundary | Unhandled errors crash app | Wrap with `<FeatureErrorBoundary>` |
| Kanban/DnD without boundary | Drag errors crash entire page | Wrap risky zone only |
| Form without error handling | Submission errors unhandled | Try/catch in `onSubmit`, show notification |

---

## Permission Checks

| Issue | Risk | Fix |
|-------|------|-----|
| Missing `PermissionGuard` | Unauthorized users see actions | Wrap with `<PermissionGuard permission="x.y">` |
| Only hiding UI, not checking API | User can bypass via devtools | Backend must also validate (defense in depth) |
| Hardcoded permission strings | Typo risk | Keep permissions as constants or check against API |

---

## Performance Lessons

| Issue | Impact | Fix |
|-------|--------|-----|
| Barrel import `@/features/shared` pulling everything | Large bundle | Import specific file: `@/features/shared/table-columns` |
| Missing `useMemo` on derived data | Re-computation on every render | Memoize expensive transformations |
| Re-rendering entire list on single item change | Slow UI | Extract list items into memoized sub-components |
| Fetching all data when only paginated page needed | Slow initial load | Use server-side pagination |

---

## Common PR Feedback

| Feedback | Frequency | Prevention |
|----------|-----------|------------|
| "Move this to `features/shared/`" | High | Check if code is used by >1 feature |
| "Add i18n keys for both `en` and `es`" | High | Never hardcode strings in JSX |
| "Missing loading/error state" | Medium | Always handle all query states |
| "Use `handleX` naming for handlers" | Medium | Follow naming convention |
| "Don't use `any`" | Medium | Use proper types from `@/types` |
| "Add `FeatureErrorBoundary`" | Low | Wrap new routes/risky zones |

---

**Version**: 1.0.0
**Note**: This file grows over time. Add new lessons as they are discovered in reviews.
