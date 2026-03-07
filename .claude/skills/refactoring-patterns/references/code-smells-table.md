# Code Smells Detection & Fixes

## Smell Catalog

| Smell | Detection | Fix | Example |
|-------|-----------|-----|---------|
| Long Method | > 20 lines | Extract Function | `calculateTotal()` |
| Large Class | > 200 lines | Extract Class | Split `UserManager` |
| Long Parameter List | > 4 params | Parameter Object | `CreateUserParams` |
| Duplicated Code | 2+ identical blocks | Extract Function | `validateEmail()` |
| Feature Envy | Uses other object's data | Move Method | Move to data owner |
| Data Clumps | Same params together | Extract Value Object | `Address`, `Money` |
| Primitive Obsession | Primitives for concepts | Value Object | `Email`, `UserId` |
| Switch Statements | Repeated type checks | Polymorphism | Strategy pattern |
| Shotgun Surgery | One change, many files | Move/Inline | Consolidate |

## Fix: Parameter Object

```typescript
// BEFORE: Long parameter list
function createUser(
  name: string,
  email: string,
  password: string,
  role: string,
  department: string,
  managerId: string | null,
  startDate: Date,
): Promise<User> {
  // ...
}

// AFTER: Parameter object
interface CreateUserParams {
  name: string
  email: string
  password: string
  role: string
  department: string
  managerId: string | null
  startDate: Date
}

function createUser(params: CreateUserParams): Promise<User> {
  const { name, email, password, role, department, managerId, startDate } = params
  // ...
}
```

## Fix: Value Object

```typescript
// BEFORE: Primitive obsession
function sendEmail(to: string, from: string): void {
  if (!to.includes('@')) throw new Error('Invalid to')
  if (!from.includes('@')) throw new Error('Invalid from')
  // ...
}

// AFTER: Value object with validation
class Email {
  private readonly value: string

  constructor(email: string) {
    if (!email.includes('@') || !email.includes('.')) {
      throw new ValidationError(`Invalid email: ${email}`)
    }
    this.value = email.toLowerCase()
  }

  toString(): string {
    return this.value
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }
}

function sendEmail(to: Email, from: Email): void {
  // Validation already done by Email class
  // ...
}
```
