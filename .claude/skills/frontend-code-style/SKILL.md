---
name: frontend-code-style
description: |
  Consolidated code style standards for React/TypeScript frontends: naming, imports, formatting, function design, and component structure. Quick reference for all project conventions.
  Use when writing or reviewing any frontend code.
activation:
  keywords:
    - frontend style
    - react style
    - typescript style
    - naming convention
    - type imports
    - path alias
    - kebab-case
    - pascalcase
    - frontend formatting
    - tsx style
allowed-tools: [Read, Grep, Glob]
context: fork
version: "1.0.0"
for_agents: [builder, reviewer]
---

# Frontend Code Style

**THE #1 RULE: Code should be self-explanatory. No obvious comments (YOLO philosophy).**

**Detailed rules in**: `.claude/rules/function-design.md`, `.claude/rules/modules-organization.md`, `.claude/rules/naming-standards.md`, `.claude/rules/testing-standards.md`, `.claude/rules/tdd-cycle.md`

---

## Quick Reference Table

| Category | Convention |
|----------|-----------|
| Strings | Double quotes `"hello"` |
| Type imports | `import type { User } from "@/types"` |
| Path alias | `@/` for `src/` |
| Components | PascalCase: `UserProfile` |
| Hooks | camelCase with `use` prefix: `useAuth` |
| Functions | camelCase with verb: `calculateTotal` |
| Files | kebab-case: `user-profile.tsx` |
| Handlers | `handleX` for internal: `handleSubmit` |
| Callbacks | `onX` for props: `onSubmit` |
| Booleans | `is`/`has`/`can`/`should` prefix: `isLoading` |
| Constants | camelCase (NOT SCREAMING_SNAKE): `maxRetries` |
| Props interface | `ComponentNameProps`: `UserProfileProps` |
| Enums | PascalCase singular: `OrderStatus` |

---

## Import Order

```typescript
// 1. External packages
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

// 2. Internal (@/ alias)
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import type { User } from "@/types";

// 3. Relative (same feature)
import { UserCard } from "./user-card";
import type { UserFormData } from "../types";
```

---

## Component File Structure

```typescript
// 1. Imports (ordered as above)

// 2. Types (Props interface first)
interface UserProfileProps {
  user: User;
  onEdit: (user: User) => void;
}

// 3. Main Component (named export)
export function UserProfile({ user, onEdit }: UserProfileProps) {
  // Local state
  const [isEditing, setIsEditing] = useState(false);

  // Hooks
  const { t } = useTranslation("users");

  // Derived state
  const canEdit = usePermissions("users.edit");

  // Event handlers (handleX naming)
  function handleEdit() {
    setIsEditing(true);
  }

  // Render
  return ( ... );
}

// 4. Sub-components (if tightly coupled)
function EditButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick}>Edit</button>;
}
```

---

## Forbidden Patterns

| Pattern | Why | Alternative |
|---------|-----|-------------|
| `console.log(...)` | Noise in production | `console.warn` or `console.error` if needed |
| `for` loops | Imperative style | `map`, `filter`, `reduce`, `some`, `every` |
| `SCREAMING_SNAKE_CASE` | Not the project convention | `camelCase` for constants |
| `array.push()`, `.pop()`, `.splice()`, `.sort()`, `.reverse()` | Mutation | Spread `[...arr, item]`, `arr.filter()`, `[...arr].sort()` |
| `export default` | Hard to grep, rename | Named exports: `export function Foo` |
| `any` type | No type safety | `unknown`, generics, or proper interface |
| Obvious comments | YOLO violation | Improve naming instead |
| `I` prefix on interfaces | Redundant | `UserProps` not `IUserProps` |

---

## Function Design Rules

| Rule | Detail |
|------|--------|
| Single Responsibility | One function, one job |
| Guard clauses | Early returns for edge cases |
| Max 3 params | Group into object if more |
| No boolean flags | Separate functions/components instead |
| Pure when possible | Extract business logic into pure utilities |
| Declarative style | `items.filter().map()` not `for` loops |
| Immutable operations | Return new arrays/objects, never mutate |

### Guard Clauses Example

```typescript
// GOOD - Guard clauses, early returns
function processOrder(order: Order) {
  if (!order) return "Invalid order";
  if (order.items.length === 0) return "No items";
  if (!order.isPaid) return "Payment required";

  return shipOrder(order);
}
```

---

## React-Specific Conventions

| Convention | Detail |
|-----------|--------|
| Function components only | No class components |
| Side effects in `useEffect` or event handlers | Never in render |
| `useTranslation` for all text | Namespace per feature |
| Props sorted | Shorthand first, callbacks last |
| Composition over inheritance | Children, render props, compound components |
| No HOCs | Prefer hooks for logic reuse |

---

## Acceptable Comments

| Type | Verdict | Example |
|------|---------|---------|
| Obvious comments | FORBIDDEN | `// Return user` |
| Complex algorithm | OK | `// Floyd's cycle detection` |
| Non-obvious workaround | OK | `// eslint-disable: needed for library compat` |
| TODO with ticket | OK | `// TODO(JRV-123): Implement retry` |

---

**Version**: 1.0.0
