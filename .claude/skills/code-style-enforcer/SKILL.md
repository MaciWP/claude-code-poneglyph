---
name: code-style-enforcer
description: Enforces code style standards including YOLO philosophy (minimal comments) and type hints. This skill should be used when writing TypeScript/JavaScript code to ensure proper type hints, imports organization, naming conventions, and self-explanatory code without excessive comments.
activation:
  keywords:
    - style
    - yolo
    - comments
    - type hints
    - imports
    - naming
    - conventions
---

# Code Style Enforcer

Enforces code style for TypeScript/Bun projects. YOLO philosophy (minimal/NO comments), type hints required, proper imports.

**Version**: 2.0.0

---

## Core Rules: YOLO Philosophy

**#1 RULE: Code should be self-explanatory. Minimal or NO comments.**

---

## REQUIRED Patterns

### 1. NO Obvious Comments (YOLO)

```typescript
// FORBIDDEN - Obvious comments
function createUser(email: string): User {
  // Create user with email  ← OBVIOUS!
  const user = new User(email)
  // Return user  ← OBVIOUS!
  return user
}

// CORRECT - Self-explanatory
function createUser(email: string): User {
  return new User(email)
}
```

### 2. Type Hints Required

```typescript
// WRONG - No return type
function getUsers(status) {
  return db.users.filter(u => u.status === status)
}

// CORRECT - Full typing
function getUsers(status: UserStatus): Promise<User[]> {
  return db.users.filter(u => u.status === status)
}
```

### 3. Named Exports Preferred

```typescript
// WRONG - Default export
export default class UserService {}

// CORRECT - Named export
export class UserService {}
export function createUser() {}
```

### 4. Import Organization

```typescript
// CORRECT order:
// 1. Node/Bun built-ins
import { join } from 'path'

// 2. External packages
import { Elysia } from 'elysia'

// 3. Internal/local modules
import { UserService } from './services/user'
import type { User } from './types'
```

### 5. Interface vs Type

```typescript
// Prefer interface for object shapes
interface User {
  id: string
  email: string
}

// Use type for unions, intersections
type Status = 'active' | 'inactive'
type AdminUser = User & { role: 'admin' }
```

### 6. Async/Await

```typescript
// WRONG - Callback style
fetch(url).then(r => r.json()).then(data => process(data))

// CORRECT - Async/await
const response = await fetch(url)
const data = await response.json()
await process(data)
```

---

## File Naming

- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Types: `types.ts` or `*.types.ts`
- Tests: `*.test.ts`
- Constants: `SCREAMING_SNAKE_CASE`

---

## Exceptions

Comments ARE acceptable for:
- Complex algorithms that need explanation
- Non-obvious workarounds (with WHY, not WHAT)
- TODO/FIXME with ticket reference
- JSDoc for public API (libraries only)

```typescript
// ACCEPTABLE - Non-obvious workaround
// Using setTimeout(0) to defer execution until after React state update
setTimeout(() => this.validate(), 0)

// ACCEPTABLE - With ticket
// TODO(#123): Implement retry logic
```

---

**Last Updated**: 2025-12-19
