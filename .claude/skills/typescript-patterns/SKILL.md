---
name: typescript-patterns
description: |
  TypeScript best practices for type safety, async/await, error handling, and generics.
  Use proactively when: writing TypeScript code, handling async operations, defining interfaces.
  Keywords - typescript, async, await, promise, type, interface, generic, error handling
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
for_agents: [builder]
version: "1.0"
---

# TypeScript Patterns

Enforces TypeScript best practices for type safety, async operations, and error handling in Bun/Elysia projects.

## When to Use This Skill

- Writing new TypeScript functions or modules
- Handling async operations with fetch, database, or external APIs
- Defining interfaces and types for data structures
- Implementing error handling patterns
- Refactoring JavaScript to TypeScript
- Working with generics for reusable code
- Optimizing parallel async operations

## Patterns

### 1. Type Safety - Avoid `any`

```typescript
// WRONG - Using 'any' loses type safety
function process(data: any): any {
  return data.value
}

// CORRECT - Proper typing with generics
function process<T extends { value: V }, V>(data: T): V {
  return data.value
}

// CORRECT - Explicit interface
interface UserData {
  value: string
  metadata: Record<string, unknown>
}

function processUser(data: UserData): string {
  return data.value
}
```

### 2. Error Handling - Type Narrowing

```typescript
// WRONG - Untyped error access
try {
  await fetch(url)
} catch (e) {
  console.log(e.message) // TypeScript error: 'e' is unknown
}

// CORRECT - Type narrowing with instanceof
try {
  await fetch(url)
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message)
  }
  throw error
}

// CORRECT - Custom error types
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

try {
  const response = await fetch(url)
  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}`, response.status, 'HTTP_ERROR')
  }
} catch (error) {
  if (error instanceof ApiError) {
    console.log(`API Error [${error.code}]: ${error.message}`)
  }
  throw error
}
```

### 3. Async/Await - Always Handle Rejections

```typescript
// WRONG - No error handling
async function fetchData() {
  const response = await fetch(url)
  return response.json()
}

// CORRECT - Full error handling with typed return
async function fetchData<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    return response.json() as Promise<T>
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Fetch failed: ${message}`)
  }
}
```

### 4. Parallel Operations - Use Promise.all

```typescript
// WRONG - Sequential when parallel is possible
const user = await getUser(id)
const posts = await getPosts(id)
const comments = await getComments(id)
// Total time: getUser + getPosts + getComments

// CORRECT - Parallel execution
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id),
])
// Total time: max(getUser, getPosts, getComments)

// CORRECT - With error handling for partial failures
const results = await Promise.allSettled([
  getUser(id),
  getPosts(id),
  getComments(id),
])

const user = results[0].status === 'fulfilled' ? results[0].value : null
const posts = results[1].status === 'fulfilled' ? results[1].value : []
```

### 5. Interface vs Type

```typescript
// WRONG - Using type for extensible objects
type User = {
  id: string
  name: string
}

// CORRECT - Interface for object shapes (can be extended)
interface User {
  id: string
  name: string
}

interface AdminUser extends User {
  permissions: string[]
}

// CORRECT - Type for unions, intersections, primitives
type Status = 'pending' | 'success' | 'error'
type UserWithPosts = User & { posts: Post[] }
type UserId = string | number
```

### 6. Null Checking - Early Return Pattern

```typescript
// WRONG - Excessive optional chaining
const name = user?.profile?.name ?? 'Unknown'
const city = user?.profile?.address?.city ?? 'N/A'

// CORRECT - Early return with guard clauses
function getUserDisplayName(user: User | null): string {
  if (!user) return 'Unknown'
  if (!user.profile) return 'Anonymous'
  return user.profile.name
}

// CORRECT - Type guards
function isValidUser(user: unknown): user is User {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    'name' in user
  )
}
```

### 7. Result Type Pattern

```typescript
// Pattern for operations that can fail
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
    return {
      ok: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

// Usage
const result = await safeFetch<User>('/api/user/123')
if (result.ok) {
  console.log(result.value.name)
} else {
  console.error(result.error.message)
}
```

### 8. Generics - Constrained Types

```typescript
// WRONG - Unconstrained generic
function getProperty<T>(obj: T, key: string) {
  return obj[key] // Error: cannot index T
}

// CORRECT - Constrained generic with keyof
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

// CORRECT - Generic with default
interface ApiResponse<T = unknown> {
  data: T
  status: number
  message: string
}

const response: ApiResponse<User> = await fetchUser()
const genericResponse: ApiResponse = await fetchUnknown() // T defaults to unknown
```

## Checklist

- [ ] All function parameters have explicit types
- [ ] All function return types are declared (not inferred)
- [ ] No `any` types (use `unknown` if type is truly unknown)
- [ ] All async functions have try/catch or return Result type
- [ ] Parallel operations use `Promise.all` or `Promise.allSettled`
- [ ] Interfaces used for object shapes, types for unions/primitives
- [ ] Error types are narrowed before accessing properties
- [ ] Custom error classes extend Error with proper name
- [ ] Optional values handled with early returns or guards
- [ ] Generic constraints applied where needed (`extends`)
- [ ] Strict null checks enabled in tsconfig
- [ ] No type assertions (`as`) without runtime validation

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `any` everywhere | Loses type safety | Use `unknown`, generics, or proper types |
| `error.message` without check | Runtime error if not Error | Type narrow with `instanceof Error` |
| Sequential awaits | Slow, blocks unnecessarily | `Promise.all` for independent ops |
| `as Type` assertions | Bypasses type checking | Use type guards with runtime checks |
| Optional chaining chains | Hard to debug, unclear intent | Early return pattern |
| Inferred return types | API contracts unclear | Explicit return type annotations |
| `object` type | Too broad, loses info | Use `Record<string, unknown>` or interface |
| Ignoring Promise rejections | Unhandled errors crash app | Always try/catch or .catch() |

## Examples

### Elysia Route with Full Typing

```typescript
import { Elysia, t } from 'elysia'

interface User {
  id: string
  email: string
  name: string
}

interface CreateUserBody {
  email: string
  name: string
}

const app = new Elysia()
  .post(
    '/users',
    async ({ body }): Promise<User> => {
      try {
        const user = await createUser(body)
        return user
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Failed to create user: ${error.message}`)
        }
        throw error
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        name: t.String({ minLength: 1 }),
      }),
    }
  )
```

### Service with Result Pattern

```typescript
interface UserService {
  findById(id: string): Promise<Result<User, NotFoundError>>
  create(data: CreateUserInput): Promise<Result<User, ValidationError>>
}

class UserServiceImpl implements UserService {
  async findById(id: string): Promise<Result<User, NotFoundError>> {
    const user = await db.users.findUnique({ where: { id } })
    if (!user) {
      return { ok: false, error: new NotFoundError(`User ${id} not found`) }
    }
    return { ok: true, value: user }
  }

  async create(data: CreateUserInput): Promise<Result<User, ValidationError>> {
    const validation = validateUserInput(data)
    if (!validation.ok) {
      return { ok: false, error: validation.error }
    }
    const user = await db.users.create({ data })
    return { ok: true, value: user }
  }
}
```

---

**Version**: 1.0
**Stack**: TypeScript 5.x, Bun, Elysia
