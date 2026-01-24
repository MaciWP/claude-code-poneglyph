---
name: code-style-enforcer
description: |
  Enforces code style standards including YOLO philosophy and type hints.
  Use proactively when: writing code, reviewing code, checking style compliance.
  Keywords - style, yolo, comments, type hints, imports, naming, conventions
activation:
  keywords:
    - style
    - yolo
    - comments
    - type hints
    - imports
    - naming
    - conventions
    - formatting
for_agents: [builder, reviewer, code-quality, architect]
version: "1.0"
---

# Code Style Enforcer

Enforces code style for TypeScript/Bun projects with YOLO philosophy.

## When to Use

| Situation | Apply Skill |
|-----------|-------------|
| Writing new code | All rules |
| Reviewing PR/changes | Check compliance |
| Refactoring | Enforce patterns |
| Adding types | Type hint rules |
| Organizing imports | Import rules |

## Core Rules

### Rule #1: YOLO Philosophy

> **Code should be self-explanatory. Minimal or NO comments.**

| Comment Type | Verdict | Example |
|--------------|---------|---------|
| Obvious comments | FORBIDDEN | `// Return user` |
| Complex algorithm explanation | OK | `// Using Floyd's cycle detection` |
| Non-obvious workaround | OK | `// setTimeout(0) defers until after React state update` |
| TODO with ticket | OK | `// TODO(#123): Implement retry` |
| JSDoc for public API | OK (libraries) | `/** @param email User email */` |

### Rule #2: Type Hints Required

All parameters and return types must be typed.

| Pattern | Status |
|---------|--------|
| `function getUsers(status)` | BAD |
| `function getUsers(status: UserStatus): Promise<User[]>` | GOOD |
| `const x = []` | BAD |
| `const x: User[] = []` | GOOD |

### Rule #3: Interface > Type

| Use Case | Prefer |
|----------|--------|
| Object shapes | `interface` |
| Unions, intersections | `type` |
| Extending shapes | `interface extends` |

### Rule #4: Named Exports > Default

| Pattern | Status |
|---------|--------|
| `export default class UserService` | AVOID |
| `export class UserService` | PREFERRED |

## Quick Reference

### Import Organization Order

```typescript
// 1. Node/Bun built-ins
import { join } from 'path'

// 2. External packages
import { Elysia } from 'elysia'

// 3. Internal modules
import { UserService } from './services/user'
import type { User } from './types'
```

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserCard.tsx` |
| Utilities | camelCase | `formatDate.ts` |
| Types | types suffix | `user.types.ts` |
| Tests | test suffix | `user.test.ts` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES` |

### Async/Await (Required)

```typescript
// BAD - Callback style
fetch(url).then(r => r.json()).then(data => process(data))

// GOOD - Async/await
const response = await fetch(url)
const data = await response.json()
await process(data)
```

## Examples

### Bad Code (Multiple Violations)

```typescript
// WRONG: Multiple issues
export default function getUsers(status) {  // No types, default export
  // Get users from database  <- OBVIOUS COMMENT
  const users = db.users.filter(u => u.status === status)
  // Return filtered users   <- OBVIOUS COMMENT
  return users
}
```

### Good Code (YOLO Compliant)

```typescript
// CORRECT: Self-explanatory
export function getUsers(status: UserStatus): Promise<User[]> {
  return db.users.filter(u => u.status === status)
}
```

### Interface vs Type

```typescript
// CORRECT: Interface for object shapes
interface User {
  id: string
  email: string
  createdAt: Date
}

// CORRECT: Type for unions/intersections
type Status = 'active' | 'inactive' | 'pending'
type AdminUser = User & { role: 'admin' }
```

### Acceptable Comments

```typescript
// ACCEPTABLE: Non-obvious workaround with WHY
// Using setTimeout(0) to defer execution until after React state update
setTimeout(() => this.validate(), 0)

// ACCEPTABLE: Complex algorithm
// Floyd's cycle detection: slow pointer moves 1, fast moves 2
let slow = head, fast = head

// ACCEPTABLE: TODO with ticket reference
// TODO(#123): Implement retry logic for network failures
```

## Checklist

### Before Committing Code

- [ ] No obvious comments (YOLO)
- [ ] All functions have parameter types
- [ ] All functions have return types
- [ ] Using `interface` for object shapes
- [ ] Using named exports (not default)
- [ ] Imports organized (built-in, external, internal)
- [ ] Using async/await (not .then chains)
- [ ] File naming follows conventions

### During Code Review

- [ ] Check for YOLO violations (obvious comments)
- [ ] Verify all types are explicit
- [ ] Confirm proper export style
- [ ] Validate import organization
- [ ] Ensure async patterns are correct

## Exceptions

Comments ARE acceptable for:

| Exception | Requirement |
|-----------|-------------|
| Complex algorithms | Must explain WHY, not WHAT |
| Non-obvious workarounds | Include the reason |
| TODO/FIXME | Must have ticket reference |
| JSDoc | Only for public library APIs |

---

**Version**: 2.0.0
**Last Updated**: 2025-01-24
