---
name: typescript-patterns
description: >
  TypeScript best practices including type safety, async/await, error handling.
  Keywords - TypeScript, async, await, Promise, error, type, interface, generic.
activation:
  keywords:
    - typescript
    - async
    - await
    - promise
    - type
    - interface
    - generic
    - error handling
---

# TypeScript Patterns Skill

Enforces TypeScript best practices and common patterns.

## Triggers

Keywords: TypeScript, async, await, Promise, error, type, interface, generic

## Rules

### 1. Type Safety

```typescript
// WRONG - Using 'any'
function process(data: any): any {
  return data.value
}

// CORRECT - Proper typing
function process<T extends { value: V }, V>(data: T): V {
  return data.value
}
```

### 2. Error Handling

```typescript
// WRONG - Untyped error
try {
  await fetch(url)
} catch (e) {
  console.log(e.message)
}

// CORRECT - Type narrowing
try {
  await fetch(url)
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message)
  }
  throw error
}
```

### 3. Async/Await

```typescript
// WRONG - Not handling rejection
async function fetchData() {
  const response = await fetch(url)
  return response.json()
}

// CORRECT - Error handling
async function fetchData(): Promise<Data> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.json() as Promise<Data>
  } catch (error) {
    throw new Error(`Fetch failed: ${error instanceof Error ? error.message : 'Unknown'}`)
  }
}
```

### 4. Parallel Operations

```typescript
// WRONG - Sequential when parallel is possible
const user = await getUser(id)
const posts = await getPosts(id)
const comments = await getComments(id)

// CORRECT - Parallel execution
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id),
])
```

### 5. Interface vs Type

```typescript
// Prefer interface for object shapes (extendable)
interface User {
  id: string
  name: string
}

// Use type for unions, intersections, primitives
type Status = 'pending' | 'success' | 'error'
type UserWithPosts = User & { posts: Post[] }
```

### 6. Null Checking

```typescript
// WRONG - Optional chaining everywhere
const name = user?.profile?.name ?? 'Unknown'

// CORRECT - Early return pattern
function getUserName(user: User | null): string {
  if (!user) return 'Unknown'
  if (!user.profile) return 'Anonymous'
  return user.profile.name
}
```

## Pattern: Result Type

For operations that can fail:

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

async function safeFetch<T>(url: string): Promise<Result<T>> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { ok: false, error: new Error(`HTTP ${response.status}`) }
    }
    const data = await response.json()
    return { ok: true, value: data as T }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error('Unknown') }
  }
}
```
