---
name: frontend-testing-patterns
description: |
  Testing patterns for binora-frontend: Vitest + Testing Library + MSW setup, test utilities,
  component/hook/API testing, form testing, and DataTable testing.
  Use when writing tests, reviewing test coverage, or setting up test infrastructure.
allowed-tools: [Read, Grep, Glob]
context: fork
version: "1.0.0"
for_agents: [builder, reviewer]
---

# Frontend Testing Patterns

**THE #1 RULE: ALWAYS use `renderWithProviders` or `renderApp` from `src/testing/test-utils.tsx`. Never bare `render`.**

---

## Test Setup

### Available Test Utilities (`src/testing/test-utils.tsx`)

| Utility | Purpose | When to Use |
|---------|---------|-------------|
| `renderWithProviders(ui)` | Wraps with QueryClient + MemoryRouter + Theme + Sidebar | Component unit tests |
| `renderApp(ui, { user, url })` | Full app render with auth, routing, AppProvider | Integration tests |
| `createTestQueryClient()` | QueryClient with `retry: false` | Custom hook tests |
| `createApiQueryWrapper()` | Lightweight QueryClient wrapper (no router/theme) | API hook tests |
| `createApiQueryWrapperWithClient()` | Returns `{ wrapper, queryClient }` for spying | Mutation/invalidation tests |
| `waitForLoadingToFinish()` | Waits for loading indicators to disappear | After render with async data |
| `mockNotifications()` | Mocks `useNotifications` module | Testing notification calls |
| `setupApiTest()` | Clears mocks + notification mock | `beforeEach` for API tests |

### Notification Assertion Helpers

| Helper | Usage |
|--------|-------|
| `expectSuccessNotification(title, message)` | Assert success toast shown |
| `expectErrorNotification(title, message?)` | Assert error toast shown |
| `expectQueryInvalidation(spy, queryKey)` | Assert cache invalidation |
| `expectSchemaValidationSuccess(result)` | Assert Zod parse success |
| `expectSchemaValidationError(result, msg?)` | Assert Zod parse failure |

### Mock Data Factories

| Factory | Returns |
|---------|---------|
| `createMockDatacenterResponse(overrides)` | Datacenter object |
| `createMockRoomResponse(overrides)` | Room object |
| `createMockRowResponse(overrides)` | Row object |
| `createMockRackResponse(overrides)` | Rack object |

---

## Test File Structure

```
src/features/my-feature/
├── api/
│   ├── get-things.ts
│   └── __tests__/
│       └── get-things.test.ts
├── components/
│   ├── thing-list.tsx
│   └── __tests__/
│       └── thing-list.test.tsx
└── hooks/
    ├── use-thing-form.ts
    └── __tests__/
        └── use-thing-form.test.ts
```

---

## Component Testing Pattern

```typescript
import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect } from "vitest";

import { renderWithProviders } from "@/testing/test-utils";

import { ThingList } from "../thing-list";

describe("The Thing List", () => {
  it("displays items when data is provided", () => {
    const items = [{ id: "1", name: "Item 1" }, { id: "2", name: "Item 2" }];

    renderWithProviders(<ThingList items={items} />);

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
  });

  it("calls onSelect when user clicks an item", async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const items = [{ id: "1", name: "Item 1" }];

    renderWithProviders(<ThingList items={items} onSelect={handleSelect} />);

    await user.click(screen.getByText("Item 1"));

    expect(handleSelect).toHaveBeenCalledWith("1");
  });
});
```

---

## Hook Testing Pattern

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { createApiQueryWrapper } from "@/testing/test-utils";

import { useThings } from "../get-things";

describe("The useThings hook", () => {
  it("fetches things successfully", async () => {
    const wrapper = createApiQueryWrapper();

    const { result } = renderHook(() => useThings(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
  });
});
```

---

## API Mutation Testing Pattern

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  createApiQueryWrapperWithClient,
  setupApiTest,
  mockNotifications,
  expectSuccessNotification,
  expectQueryInvalidation,
} from "@/testing/test-utils";

import { useCreateThing } from "../create-thing";

mockNotifications();

describe("The useCreateThing mutation", () => {
  beforeEach(() => {
    setupApiTest();
  });

  it("invalidates queries and shows notification on success", async () => {
    const { wrapper, queryClient } = createApiQueryWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useCreateThing({ notificationMessages: { success: { title: "Created" } } }),
      { wrapper }
    );

    result.current.mutate({ name: "New Thing" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expectQueryInvalidation(invalidateSpy, ["things"]);
    expectSuccessNotification("Created", "New Thing");
  });
});
```

---

## MSW Integration

| Location | Content |
|----------|---------|
| `src/testing/mocks/handlers/` | API mock handlers per resource |
| `src/testing/mocks/db.ts` | In-memory database (MSW Data) |
| `src/testing/mocks/utils.ts` | Auth helpers, cookie setup |
| `src/testing/data-generators.ts` | Factory functions for test data |

### Adding a New Handler

```typescript
// src/testing/mocks/handlers/things.ts
import { http, HttpResponse } from "msw";

export const thingsHandlers = [
  http.get("/api/things/", () => {
    return HttpResponse.json({
      results: [{ id: "1", name: "Thing 1" }],
      count: 1,
    });
  }),
];
```

---

## Test Naming Convention

| Format | Example |
|--------|---------|
| `describe` | `"The Shopping Cart"` (noun, the subject) |
| `it` | `"applies discount for orders above 100"` (business rule) |
| Avoid | `"should return"`, `"calls function"`, `"renders correctly"` |
| Prefer | `"displays"`, `"validates"`, `"calculates"`, `"allows"` |

---

## AAA Structure

```typescript
it("calculates total with discount applied", () => {
  // Arrange
  const items = [{ price: 100 }, { price: 50 }];
  const discount = 0.1;

  // Act
  const total = calculateTotal(items, discount);

  // Assert
  expect(total).toBe(135);
});
```

Visual separation (blank lines) between Arrange, Act, Assert is mandatory.

---

## Non-Negotiable Rules

| Rule | Detail |
|------|--------|
| NEVER delete an existing test | If test fails, fix the implementation |
| NEVER modify a test to make implementation pass | Tests define expected behavior |
| NEVER mock without asking first | Mocks hide design problems |
| ALWAYS use test-utils providers | Never bare `render()` |
| ALWAYS fix root cause | Not symptoms |
| ALWAYS run full suite | Check for regressions: `yarn test` |

---

## What NOT to Test

| Skip | Test Instead |
|------|-------------|
| Internal component state | User-visible behavior |
| Implementation details | Outputs and side effects |
| Private functions | Public API that uses them |
| Third-party libraries | Your code that calls them |
| Exact CSS classes | Visual behavior or accessibility |

---

## Query Priority

Use user-centric queries (Testing Library):

| Priority | Query | When |
|----------|-------|------|
| 1 | `getByRole` | Interactive elements |
| 2 | `getByLabelText` | Form fields |
| 3 | `getByText` | Non-interactive text |
| 4 | `getByTestId` | Last resort |

---

**Version**: 1.0.0
**Project References**: `src/testing/test-utils.tsx` (all utilities), `src/testing/mocks/` (MSW handlers), `src/testing/data-generators.ts` (factories)
