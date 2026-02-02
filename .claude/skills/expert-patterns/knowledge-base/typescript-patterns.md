# TypeScript Advanced Patterns

Best practices de TypeScript extraidos de documentacion oficial y Matt Pocock.

## Type Safety

### Best Practice: Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Best Practice: unknown over any

```typescript
// Good - Type-safe unknown
function parse(input: unknown): User {
  if (typeof input === 'object' && input !== null && 'name' in input) {
    return input as User
  }
  throw new Error('Invalid input')
}

// Avoid - Unsafe any
function parse(input: any): User {
  return input // No safety
}
```

**Source**: [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook)

## Utility Types

### Best Practice: Built-in Utilities

```typescript
// Partial - Make all props optional
type UpdateUser = Partial<User>

// Pick - Select specific props
type UserPreview = Pick<User, 'id' | 'name'>

// Omit - Exclude props
type CreateUser = Omit<User, 'id' | 'createdAt'>

// Record - Object type
type UserMap = Record<string, User>

// Required - Make all required
type CompleteUser = Required<User>
```

### Best Practice: Conditional Types

```typescript
// Extract function return type
type GetUserReturn = ReturnType<typeof getUser>

// Extract promise value
type UserData = Awaited<ReturnType<typeof fetchUser>>

// Extract array element
type Item = ArrayElement<typeof items>
type ArrayElement<T> = T extends (infer E)[] ? E : never
```

**Source**: [Matt Pocock](https://www.totaltypescript.com)

## Discriminated Unions

### Best Practice: Tagged Unions

```typescript
// Good - Discriminated union
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error }

function handle(result: Result<User>) {
  if (result.success) {
    console.log(result.data) // Type: User
  } else {
    console.log(result.error) // Type: Error
  }
}
```

### Best Practice: Exhaustive Checks

```typescript
type Status = 'pending' | 'active' | 'done'

function getLabel(status: Status): string {
  switch (status) {
    case 'pending': return 'Pending'
    case 'active': return 'Active'
    case 'done': return 'Done'
    default:
      const _exhaustive: never = status
      throw new Error(`Unknown status: ${_exhaustive}`)
  }
}
```

## Generics

### Best Practice: Constrained Generics

```typescript
// Good - Constrained generic
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

// Good - Default generic
function createArray<T = string>(length: number, value: T): T[] {
  return Array(length).fill(value)
}
```

### Best Practice: Generic Components

```typescript
// Good - Generic React component
interface ListProps<T> {
  items: T[]
  renderItem: (item: T) => ReactNode
  keyExtractor: (item: T) => string
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return items.map(item => (
    <div key={keyExtractor(item)}>{renderItem(item)}</div>
  ))
}
```

## Type Guards

### Best Practice: Custom Type Guards

```typescript
// Good - Type predicate
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  )
}

// Usage
if (isUser(data)) {
  console.log(data.email) // Type: User
}
```

### Best Practice: Assertion Functions

```typescript
// Good - Assertion function
function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) {
    throw new Error('Expected User')
  }
}
```

## Branded Types

### Best Practice: Nominal Typing

```typescript
// Good - Branded type for IDs
type UserId = string & { readonly brand: unique symbol }
type PostId = string & { readonly brand: unique symbol }

function createUserId(id: string): UserId {
  return id as UserId
}

function getUser(id: UserId): User { ... }

// Prevents: getUser(postId) - Type error!
```

## Anti-Patterns

| Avoid | Use Instead | Reason |
|-------|-------------|--------|
| `any` | `unknown` | Type safety |
| Type assertions | Type guards | Runtime safety |
| `as const` everywhere | Proper types | Readability |
| `!` non-null | Optional chaining | Safety |
| Enums | Union types | Tree-shaking |

## Performance Tips

| Tip | Example |
|-----|---------|
| Avoid deep inference | Explicit return types |
| Use `satisfies` | `obj satisfies Type` |
| Prefer interfaces | `interface` over `type` for objects |
| Skip lib check | `skipLibCheck: true` |

## Sources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook)
- [Matt Pocock - Total TypeScript](https://www.totaltypescript.com)
- [ts-reset](https://github.com/total-typescript/ts-reset)
