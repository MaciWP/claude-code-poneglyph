---
name: code-quality
description: |
  Analyze code for quality issues (code smells, SOLID violations, complexity, duplication).
  Enforce best practices for Vue 3, TypeScript, Bun, PostgreSQL, and Redis.
  Keywords: code quality, code smells, SOLID, complexity, duplication, refactoring, clean code
for_agents: [reviewer]
---

# Code Quality Review

Code quality analysis patterns for TypeScript/Bun applications.

## When to Use

- General code review
- Identifying code smells
- Checking for SOLID violations
- Measuring code complexity
- Finding duplicated code

## Code Smells

### Long Method (> 20 lines)

```typescript
// BAD: 50+ lines doing multiple things
function processOrder(order: Order) {
  // validation (10 lines)
  // calculation (15 lines)
  // persistence (10 lines)
  // notification (10 lines)
  // logging (5 lines)
}

// GOOD: Single responsibility
function processOrder(order: Order) {
  validateOrder(order)
  const total = calculateTotal(order)
  await saveOrder(order, total)
  await notifyCustomer(order)
}
```

### Large Class (> 200 lines)

**Signs:**
- Too many methods
- Too many instance variables
- Methods that don't use `this`
- Multiple unrelated responsibilities

**Fix:** Extract classes by responsibility

### Long Parameter List (> 4 params)

```typescript
// BAD
function createUser(name: string, email: string, age: number, role: string, dept: string) {}

// GOOD
interface CreateUserParams {
  name: string
  email: string
  age: number
  role: string
  department: string
}
function createUser(params: CreateUserParams) {}
```

### Duplicated Code

**Detection:**
- Same logic in multiple places
- Copy-paste with minor changes
- Similar switch/if statements

```typescript
// BAD: Duplicated validation
function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidEmail(email: string) { // Different name, same logic
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// GOOD: Single source of truth
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
```

### Feature Envy

```typescript
// BAD: Method uses another class's data more than its own
class OrderProcessor {
  process(order: Order) {
    const discount = order.customer.loyaltyPoints > 100
      ? order.customer.discount
      : 0
    const tax = order.shipping.country === 'US'
      ? order.shipping.state.taxRate
      : 0
  }
}

// GOOD: Move logic to where data lives
class Order {
  calculateDiscount() { return this.customer.calculateDiscount() }
  calculateTax() { return this.shipping.calculateTax() }
}
```

### Dead Code

**Detection:**
- Unreachable code after return/throw
- Unused variables, functions, imports
- Commented-out code blocks

```typescript
// BAD: Dead code
function process() {
  return result
  console.log('done') // Never executes
}

// BAD: Unused import
import { never_used } from './utils'
```

## SOLID Violations

### Single Responsibility Violation

```typescript
// BAD: Class does multiple things
class UserService {
  createUser() {}
  validateEmail() {}     // Should be ValidationService
  sendWelcomeEmail() {}  // Should be EmailService
  generateReport() {}    // Should be ReportService
}
```

### Open/Closed Violation

```typescript
// BAD: Must modify for new types
function getPrice(type: string) {
  switch (type) {
    case 'basic': return 10
    case 'premium': return 20
    // Must add case for every new type
  }
}

// GOOD: Open for extension
interface PricingStrategy {
  getPrice(): number
}
const strategies: Record<string, PricingStrategy> = {}
```

### Liskov Substitution Violation

```typescript
// BAD: Subclass breaks contract
class Rectangle {
  setWidth(w: number) { this.width = w }
  setHeight(h: number) { this.height = h }
}

class Square extends Rectangle {
  setWidth(w: number) {
    this.width = w
    this.height = w // Breaks LSP
  }
}
```

### Interface Segregation Violation

```typescript
// BAD: Fat interface
interface Worker {
  work(): void
  eat(): void
  sleep(): void
}

// Robot can't eat or sleep
class Robot implements Worker {
  work() {}
  eat() { throw new Error() } // Violation
  sleep() { throw new Error() }
}
```

### Dependency Inversion Violation

```typescript
// BAD: Direct dependency on concrete class
class UserService {
  private db = new PostgresDatabase()
}

// GOOD: Depend on abstraction
class UserService {
  constructor(private db: Database) {}
}
```

## Complexity Metrics

### Cyclomatic Complexity

Count decision points (if, while, for, case, &&, ||)

```typescript
// Complexity: 5 (threshold: 10)
function calculate(a: number, b: number, c: number) {
  if (a > 0) {           // +1
    if (b > 0) {         // +1
      return a + b
    } else if (c > 0) {  // +1
      return a + c
    }
  }
  return a && b ? a : b  // +2
}
```

**Thresholds:**
| Complexity | Rating |
|------------|--------|
| 1-10 | Simple |
| 11-20 | Moderate |
| 21-50 | Complex |
| > 50 | Untestable |

### Cognitive Complexity

Measures how hard code is to understand (nesting depth matters)

```typescript
// High cognitive complexity (nested conditions)
function check(a, b, c, d) {
  if (a) {
    if (b) {
      if (c) {
        if (d) { }
      }
    }
  }
}

// Lower complexity (early returns)
function check(a, b, c, d) {
  if (!a) return
  if (!b) return
  if (!c) return
  if (!d) return
}
```

## Quality Checklist

### Naming

- [ ] Functions describe what they do (verbs)
- [ ] Variables describe what they hold (nouns)
- [ ] No abbreviations unless universal (id, url)
- [ ] Consistent naming style (camelCase)

### Functions

- [ ] < 20 lines each
- [ ] < 4 parameters
- [ ] Single responsibility
- [ ] No side effects unless explicit

### Classes

- [ ] < 200 lines
- [ ] Single responsibility
- [ ] Cohesive methods
- [ ] Minimal public API

### Files

- [ ] < 400 lines
- [ ] Single concept per file
- [ ] Imports organized
- [ ] No circular dependencies

### General

- [ ] No duplicated code
- [ ] No dead code
- [ ] No magic numbers/strings
- [ ] Error cases handled

## Output Format

```markdown
## Code Quality Review: [Component]

### Code Smells
- **Long Method**: `processOrder()` (75 lines)
  - Location: `order.ts:45-120`
  - Fix: Extract validation, calculation, persistence

- **Duplicated Code**: Email validation logic
  - Locations: `user.ts:20`, `signup.ts:55`
  - Fix: Create shared `isValidEmail()` utility

### SOLID Violations
- **SRP**: `UserService` handles email sending
  - Fix: Extract to `EmailService`

### Complexity
| Function | Cyclomatic | Cognitive | Status |
|----------|------------|-----------|--------|
| `calculate` | 15 | 12 | ⚠️ High |
| `process` | 5 | 4 | ✅ Good |

### Passed Checks
- ✅ Consistent naming
- ✅ No dead code
- ✅ Imports organized
```

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| God Class | Does everything | Split by responsibility |
| Spaghetti Code | No structure | Refactor with clear flow |
| Copy-Paste | Duplication | Extract shared function |
| Magic Numbers | Unclear meaning | Named constants |
| Deep Nesting | Hard to follow | Early returns, extract |

---

**Version**: 1.0.0
**Spec**: SPEC-018
**For**: reviewer agent
