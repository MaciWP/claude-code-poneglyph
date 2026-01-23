---
name: refactoring-patterns
description: |
  Safe refactoring techniques and SOLID principles.
  Use when refactoring code, extracting functions, applying SOLID, or simplifying complexity.
  Keywords: refactor, extract, SOLID, clean, simplify, decompose, rename, move
for_agents: [builder]
---

# Refactoring Patterns

Safe refactoring techniques for TypeScript codebases.

## When to Use

- Extracting functions or classes
- Applying SOLID principles
- Reducing complexity
- Improving code readability
- Removing code smells

## Extract Function

### When to Extract

- Function > 20 lines
- Repeated code blocks
- Complex conditionals
- Code with comment explaining "what"

### Pattern

```typescript
// BEFORE: Long function with inline logic
async function processOrder(order: Order) {
  // Validate order
  if (!order.items.length) throw new Error('Empty order')
  if (!order.customerId) throw new Error('No customer')

  // Calculate total
  let total = 0
  for (const item of order.items) {
    total += item.price * item.quantity
    if (item.discount) total -= item.discount
  }

  // Apply shipping
  if (total > 100) {
    // free shipping
  } else {
    total += 10
  }

  // Save
  await db.orders.insert({ ...order, total })
}

// AFTER: Extracted functions
async function processOrder(order: Order) {
  validateOrder(order)
  const subtotal = calculateSubtotal(order.items)
  const total = applyShipping(subtotal)
  await saveOrder(order, total)
}

function validateOrder(order: Order): void {
  if (!order.items.length) throw new Error('Empty order')
  if (!order.customerId) throw new Error('No customer')
}

function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) =>
    sum + item.price * item.quantity - (item.discount ?? 0), 0)
}

function applyShipping(subtotal: number): number {
  return subtotal > 100 ? subtotal : subtotal + 10
}
```

## Extract Class

### When to Extract

- Group of related functions
- Data + behavior together
- Single Responsibility violation

### Pattern

```typescript
// BEFORE: Functions operating on same data
function formatUserName(user: User) { ... }
function validateUserEmail(user: User) { ... }
function getUserDisplayName(user: User) { ... }

// AFTER: Class with cohesive behavior
class UserPresenter {
  constructor(private user: User) {}

  get displayName(): string {
    return `${this.user.firstName} ${this.user.lastName}`
  }

  get formattedEmail(): string {
    return this.user.email.toLowerCase()
  }

  isValid(): boolean {
    return this.user.email.includes('@')
  }
}
```

## SOLID Principles

### S - Single Responsibility

```typescript
// BAD: Class does too much
class UserService {
  createUser() { }
  sendEmail() { }      // Should be EmailService
  generateReport() { } // Should be ReportService
}

// GOOD: Single purpose
class UserService {
  createUser() { }
  updateUser() { }
  deleteUser() { }
}
```

### O - Open/Closed

```typescript
// BAD: Modify class for each new type
class PaymentProcessor {
  process(type: string) {
    if (type === 'card') { }
    else if (type === 'paypal') { }
    // Must modify for new types
  }
}

// GOOD: Open for extension
interface PaymentMethod {
  process(amount: number): Promise<void>
}

class CardPayment implements PaymentMethod { }
class PayPalPayment implements PaymentMethod { }
```

### L - Liskov Substitution

```typescript
// BAD: Subclass breaks contract
class Bird { fly() { } }
class Penguin extends Bird { fly() { throw new Error() } }

// GOOD: Proper hierarchy
interface Bird { move(): void }
class FlyingBird implements Bird { move() { this.fly() } }
class SwimmingBird implements Bird { move() { this.swim() } }
```

### I - Interface Segregation

```typescript
// BAD: Fat interface
interface Worker {
  work(): void
  eat(): void
  sleep(): void
}

// GOOD: Segregated interfaces
interface Workable { work(): void }
interface Eatable { eat(): void }
interface Sleepable { sleep(): void }

class Human implements Workable, Eatable, Sleepable { }
class Robot implements Workable { }
```

### D - Dependency Inversion

```typescript
// BAD: Direct dependency
class UserService {
  private db = new PostgresDB()
}

// GOOD: Depend on abstraction
interface Database { query(sql: string): Promise<any> }

class UserService {
  constructor(private db: Database) {}
}
```

## Code Smells & Fixes

| Smell | Detection | Fix |
|-------|-----------|-----|
| Long Method | > 20 lines | Extract Function |
| Large Class | > 200 lines | Extract Class |
| Long Parameter List | > 4 params | Parameter Object |
| Duplicated Code | Similar blocks | Extract Function |
| Feature Envy | Uses other class's data | Move Method |
| Data Clumps | Same params together | Extract Class |
| Primitive Obsession | Using primitives for concepts | Value Object |
| Switch Statements | Multiple type checks | Polymorphism |

### Parameter Object Pattern

```typescript
// BEFORE: Many parameters
function createUser(name: string, email: string, age: number, role: string) { }

// AFTER: Parameter object
interface CreateUserParams {
  name: string
  email: string
  age: number
  role: string
}
function createUser(params: CreateUserParams) { }
```

## Safe Refactoring Process

### Before Refactoring

1. Ensure tests exist for the code
2. Commit current state
3. Run tests - all green

### During Refactoring

1. Make ONE small change
2. Run tests
3. Commit if green
4. Repeat

### After Refactoring

1. Review all changes
2. Verify behavior unchanged
3. Update documentation if needed

## Refactoring Checklist

Before completing refactoring:

- [ ] Tests exist and pass before changes
- [ ] Each change is small and atomic
- [ ] Behavior is unchanged (same tests pass)
- [ ] No new features added during refactor
- [ ] Names are clear and descriptive
- [ ] No dead code remains
- [ ] Complexity reduced (fewer lines, simpler logic)

## Anti-Patterns

| Avoid | Instead |
|-------|---------|
| Big bang refactor | Small incremental changes |
| Refactor + new features | Separate commits |
| Refactor without tests | Add tests first |
| Over-abstracting | Abstract when needed (rule of 3) |
| Premature optimization | Refactor for clarity first |

---

**Version**: 1.0.0
**Spec**: SPEC-018
**For**: builder agent
