# React / TypeScript lessons (binora-frontend)

Migrated 2026-08-06 from `binora-frontend/.claude/skills/frontend-review-lessons` (v1.3.0).
The process guards of that file were promoted to `SKILL.md` (G1-G5) and are NOT repeated here.

## Frontend Review Lessons

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
| Inline object/Set/array passed as a prop (e.g. `tableConfig={{ orderableFields: new Set([...]) }}`) | New reference each render → child re-renders / react-table state churn | Wrap in `useMemo(() => ({...}), [])` with stable deps |
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

## Design Fidelity (implementing from a mockup/Figma)

When implementing UI from a provided design, replicating the *structure* is not enough — every **visible element** must be an explicit acceptance criterion.

| Pitfall | Found In | Fix |
|---------|----------|-----|
| Picker/select sets a value but never displays the selected value | Group form: `Responsible` set via search, never shown (JRV-967 #5, F2) | Show the selected/loaded value as read-back next to the picker |
| Implementing form structure but omitting a labelled field shown in the design | — | List each visible field + its displayed state (value, selected, empty, loading) as an AC |
| Status/label column shows a wrong default when the source field is absent | Group members: persisted members lacked `is_active` → all rendered "Inactive" (F1) | Distinguish `undefined` (unknown → "-") from `false` (Inactive); never assume a falsy default |

**Rule**: before coding from a design, enumerate every visible element (labels, displayed values, selected-state feedback, status badges) and make each one a checkable AC. Structure replication ≠ design fidelity.

---

## Real PR reviews

### PR #256 — JRV-967 (users) — reviewer: bdominguezbj (Belinda)

| Lesson | Comment in PR | Rule to apply |
|--------|---------------|---------------|
| Reuse the shared `RowActions` component instead of hand-rolling a new dropdown-menu actions component | `user-row-actions.tsx` rebuilt what `@/components/ui/data-table/row-actions` already does | Before writing a row-actions component, check `components/ui/data-table/row-actions` (`RowAction[]` + `RowActions`) and reuse it — the access-profile/groups columns already use it |
| Inline `tableConfig` (with `new Set([...])`) recreated on every render → new references → unnecessary react-table state updates | `access-profiles-list.tsx` passed an inline object/Set to `<DataTable tableConfig={{...}}>` | Wrap `tableConfig` (and any object/Set/array prop) in `useMemo(() => ({...}), [])` |
| Don't `import i18next` and call `i18next.t(...)` inside hooks/components | `delete-access-profile.ts` used `i18next.t(..., {ns: "settings"})` | Use `const {t} = useTranslation("settings")` inside React. Only use the `i18next` singleton in non-React modules |
| `error: any` in mutation `onError` → use the generated `ErrorResponse` type | `delete-access-profile.ts` `onError: (error: any, ...)` | `import type {ErrorResponse}` from `@/types` and type `onError: (error: ErrorResponse, ...)` |
| Keep the `select` (checkbox) column consistent across sibling tables | users table dropped `select`; access-profiles + groups still have it | If a column is dropped in one table of a feature, drop it in the sibling tables (users / access-profiles / groups) unless bulk-select is actually used |

**Meta-lesson — team preference overrides repo convention**: an internal automated review flagged `error: any` as "consistent with the repo norm" (8+ existing occurrences). The human reviewer asked for `ErrorResponse`. When existing repo convention and the team's stated preference diverge, the **team preference wins** and this knowledge base is updated. Treat `error: any` in `onError` as legacy-to-migrate, not the target.

---

## Guards — process mistakes (don't let these pass)

These are not code-pattern bugs but ways we have *introduced* problems. Check them before declaring work done.

| Guard | Why it bit us | What to do |
|-------|---------------|------------|
| **Don't infer a convention from a small sample** | Claimed "the repo writes comment-free tests" from 3 access-profile files; the real census of 145 test files showed 58% DO have comments and the dominant `it()` naming is `"should …"` (65%). The "clean" rewrite then matched neither the repo nor our own sibling tests. | Before imposing/normalizing a style, measure it across the **whole** repo (e.g. count comments / naming patterns over all `*.test.*`), not a handful of files. Match the **majority**, not your taste. |
| **Verify agent self-reports yourself** | A builder reported "eslint clean", but it had linted only the files *it* changed; re-linting the full `git diff HEAD` set surfaced `jsx-sort-props` / `import/order` warnings in stash-recovered files. | After any delegated work, re-run the gates yourself over the **whole changed set** (`git diff --name-only --diff-filter=d HEAD | … | eslint`), read the real diff — don't trust the report. |
| **Code recovered from an old stash carries old lessons** | A groups stash (pre-dates PR #256) re-introduced the exact `tableConfig`/`i18next`-in-hook/`error: any` mistakes already fixed elsewhere. | Run this lessons review against any code recovered from a stash/old branch **before** declaring it done — not after. |
| **Finish i18n consistently** | Success toasts were i18n'd but error-title toasts left hardcoded English in the same file (`"Failed to create group"`), and a dead/misleading barrel export + a wrong tooltip key (`view_assets` on a "view group" button) slipped through. | When touching notifications/labels, sweep the whole file/feature for hardcoded strings, dead exports, and copy-pasted i18n keys — not just the line under review. |

### Repo test conventions (measured, 145 files)
- **Naming**: `it("should …")` is the dominant convention (~65%). Use it. `describe("The …")` is NOT the norm (~11%) — describe with the component/function name.
- **Comments**: split (~43% none, ~57% some) — both are acceptable; comments are not required. But **never** leave test-plan codes (`T5.1`, `T5.A`) in `it()` names — no repo file does that.
- **Infra (non-negotiable)**: `renderWithProviders`/`renderApp` from `@/testing/test-utils`, MSW handlers, AAA with blank-line separation.

---

**Version**: 1.3.0
**Note**: This file grows over time. Add new lessons as they are discovered in reviews.


---

## Rescued from agent-memory (binora-frontend, 2026-08-06)

Entries rescued before that layer is archived.

### feedback_apiClient_cast

When using `apiClient.get/put/delete` with explicit return types, a double cast is required:
`return apiClient.get(url) as unknown as Promise<T>`

**Why:** `api` (Axios instance with interceptors) returns `any` at runtime (interceptor returns `response.data`), so `api.post()` assigned to `Promise<SomeType>` works. But `apiClient` is a plain object wrapping `api`/`apiAbsolute` with explicit Axios types — TypeScript sees `Promise<AxiosResponse<any>>` which is not comparable to `Promise<SomeType>`. The `as unknown as T` pattern bridges the type gap.

**How to apply:** Any call through `apiClient` (needed for absolute URLs) that returns a typed result must use this double cast. Use `api` directly (no cast needed) for relative-only endpoints.

### project_rhf_array_fields

For RHF forms with array fields (e.g., `members: GroupMemberVM[]`) or fields set by a custom picker (e.g., `responsible` set via UserSearch), use `form.setValue(field, value, {shouldDirty: true, shouldValidate: true})` — not `form.register()`.

Both flags are required: `shouldValidate` makes `isValid` flip when the constraint is satisfied; `shouldDirty` ensures `isDirty` and guard logic trigger.

Render the array from `form.watch("members")` — not local `useState` — so the table stays in sync with form state without extra synchronization.

**How to apply:** Any field that is set programmatically (not via an HTML input `register`) requires this pattern. `useForm` must have `mode: "onChange"` for `isValid` to update reactively.

### project_radix_select_tests

Radix `Select` trigger renders as `role="combobox"` (a `<button>`), while shadcn `Autocomplete` also uses `role="combobox"` (an `<input>`). When both are present in a form:

- Select trigger: `el.tagName === "BUTTON"` with `aria-autocomplete="none"`
- Autocomplete input: `el.tagName === "INPUT"` (typeable)

**To interact with a Radix Select in tests**, use:
```ts
const selectTrigger = screen.getAllByRole("combobox").find(el => el.tagName === "BUTTON") ?? fallback;
await userEvent.click(selectTrigger);
const option = await screen.findByRole("option", { name: "Option text" });
await userEvent.click(option);
```

**Why:** `getByRole("combobox", {name: /label/i})` fails because Radix Select trigger has empty accessible name. Cannot query by label regex.

**How to apply:** Any time a form mixes a Select + Autocomplete, use tagName discriminator to target the Select trigger in tests.

### project_i18next_singleton_tests

The global test setup mocks `react-i18next` so `useTranslation("ns").t("key")` returns `"ns.key"`. The `i18next` singleton is NOT mocked globally — `i18next.t(key, {ns})` returns `undefined` in tests.

**Prefer `useTranslation` inside React hooks** (useMutation hooks are React hooks — they can call `useTranslation`). This keeps tests consistent with the global mock and avoids per-file vi.mock overhead.

**Only use `i18next` singleton** in non-React contexts (module-level code, column definitions outside components like `columns.tsx`). When forced to use the singleton in a tested module, add:
```ts
vi.mock("i18next", () => ({
    default: {
        t: (key: string, options?: {ns?: string}) => `${options?.ns ?? "common"}.${key}`,
    },
}));
```

**PR #256 lesson**: `delete-access-profile.ts` used `i18next.t(...)` inside a hook — replaced with `useTranslation` in the groups rewrite. The team prefers `useTranslation` consistently.

**How to apply:** Before writing a new mutation hook that needs translations, use `const {t} = useTranslation("settings")` inside the hook. Reserve the singleton for `columns.tsx` and similar non-hook module-level code.

### project_mutation_error_typing

`MutationConfig<typeof fn>` defaults to `TError = Error`. To use a custom error type like `ErrorResponse` from `@/lib/api-client`, pass it as the second type parameter:

```ts
type UseXOptions = {
    mutationConfig?: MutationConfig<typeof xFn, ErrorResponse>;
};
```

Then in `useMutation({ onError: (error: ErrorResponse, ...) => {} })` the type is compatible.

**Why:** `error: any` in `onError` violates the team review standard (PR #256 lesson). `ErrorResponse` extends no base type, so you cannot use `MutationConfig<fn>` with `onError: (error: ErrorResponse)` without passing the TError param.

**How to apply:** Any new mutation hook with `onError` that needs to check `error.type` or `error.status` — use `MutationConfig<typeof fn, ErrorResponse>` as the option type.

### project_process_type_value_unknown

`ProcessTypeReadable` extends `Choice` but overrides `value: unknown` and `display_name: unknown`. Never compare `process.process_type.value === "asset_registration"` directly — TypeScript will reject it. Always wrap: `String(process.process_type.value)`.

**Why:** The OpenAPI contract declares the field as `unknown` despite being a string at runtime.

**How to apply:** Any time filtering or mapping on process_type values, wrap in String() before Set.has() or string comparisons.

### project_group_api_identity

Group objects have an absolute `url` field (e.g., `http://api.example.org/groups/1/`). All by-id operations (GET/PUT/DELETE) pass the raw `url` to `apiClient` which detects absolute URLs and routes to `apiAbsolute` (no baseURL), falling back to `api` (with baseURL) for relative paths.

**Why:** Groups' `url` is set by DRF serializers on the backend and is always absolute in production. Using `apiClient` instead of `api` supports both absolute and relative forms without extracting integer ids.

**How to apply:** For any resource where the `url` field is the identity (common in DRF), use `apiClient` for by-id operations. Use `api` for collection endpoints (POST to `/resource/`).
