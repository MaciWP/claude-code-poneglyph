---
name: code-quality
description: |
  Skill de revision para calidad de codigo y mejores practicas.
  Use when reviewing: code smells, SOLID violations, complejidad, duplicacion.
  Keywords - code quality, code smells, SOLID, complexity, duplication, refactoring, clean code
activation:
  keywords:
    - code quality
    - code smells
    - SOLID
    - complexity
    - duplication
    - refactoring
    - clean code
    - maintainability
for_agents: [reviewer]
version: "1.0"
---

# Code Quality Review

Code quality analysis patterns for TypeScript/Bun applications.

## When to Use

- General code review before merge
- Identifying code smells and anti-patterns
- Checking for SOLID principle violations
- Measuring code complexity
- Finding duplicated code
- Refactoring planning
- Technical debt assessment

## Review Checklist

### Naming (5 items)

- [ ] Functions use verbs describing action (getUserById, validateEmail)
- [ ] Variables use nouns describing content (userList, emailValidator)
- [ ] No single-letter names except loop counters (i, j, k)
- [ ] No abbreviations unless universal (id, url, api)
- [ ] Consistent naming style (camelCase functions, PascalCase types)

### Functions (6 items)

- [ ] Each function < 30 lines (ideal < 20)
- [ ] Each function < 4 parameters (use object param if more)
- [ ] Single responsibility (does one thing well)
- [ ] No side effects unless explicitly named (saveUser, updateCache)
- [ ] Early returns to reduce nesting
- [ ] Pure functions where possible (same input = same output)

### Classes/Modules (5 items)

- [ ] Each class < 200 lines
- [ ] Single responsibility (one reason to change)
- [ ] Cohesive methods (use instance state)
- [ ] Minimal public API (encapsulation)
- [ ] No God classes (doing too much)

### Files (5 items)

- [ ] Each file < 400 lines (ideal < 300)
- [ ] Single concept per file
- [ ] Imports organized (external, internal, types)
- [ ] No circular dependencies
- [ ] Related code colocated

### Error Handling (5 items)

- [ ] All async operations have try/catch
- [ ] Error types are specific (not generic Error)
- [ ] Error messages are helpful (include context)
- [ ] Errors logged with stack trace
- [ ] Errors don't expose internal details to users

### Types (5 items)

- [ ] All function parameters typed
- [ ] All return types explicit
- [ ] No `any` (use `unknown` if needed)
- [ ] Interfaces over types for object shapes
- [ ] Discriminated unions for variants

## Red Flags

| Pattern | Severity | Problem | Detection |
|---------|----------|---------|-----------|
| Function > 50 lines | High | Hard to understand/test | Count lines |
| Class > 500 lines | High | God class, too many responsibilities | Count lines |
| > 5 parameters | High | Complex interface, hard to use | Count params |
| Cyclomatic complexity > 15 | High | Too many paths, untestable | Count branches |
| Nesting depth > 4 | High | Hard to follow logic | Count indentation |
| Duplicate code blocks | High | Maintenance nightmare | Compare blocks |
| `any` type | Medium | Type safety disabled | Grep for `any` |
| Magic numbers/strings | Medium | Unclear meaning | Check literals |
| `console.log` debugging | Medium | Not production ready | Grep console |
| Commented-out code | Low | Dead code, confusing | Check comments |
| TODO without ticket | Low | Forgotten work | Grep TODO |
| Long import list > 10 | Low | File doing too much | Count imports |

## Common Issues

### Long Method (> 20 lines)

**Problem**: Function does too many things, hard to understand and test.

**Detection**: Count lines, check for multiple responsibilities.

**BEFORE**:
```typescript
// BAD: 50+ lines doing multiple things
function processOrder(order: Order) {
  // Validation (10 lines)
  if (!order.items || order.items.length === 0) {
    throw new Error('Order must have items')
  }
  if (!order.customer) {
    throw new Error('Order must have customer')
  }
  for (const item of order.items) {
    if (!item.productId || !item.quantity) {
      throw new Error('Invalid item')
    }
  }

  // Calculation (15 lines)
  let subtotal = 0
  for (const item of order.items) {
    const product = await db.products.find(item.productId)
    subtotal += product.price * item.quantity
  }
  const tax = subtotal * 0.1
  const shipping = subtotal > 100 ? 0 : 10
  const total = subtotal + tax + shipping

  // Persistence (10 lines)
  const savedOrder = await db.orders.create({
    ...order,
    subtotal,
    tax,
    shipping,
    total,
    status: 'pending'
  })

  // Notification (10 lines)
  await emailService.send({
    to: order.customer.email,
    subject: 'Order Confirmation',
    body: `Your order #${savedOrder.id} has been received`
  })

  // Logging (5 lines)
  logger.info('Order processed', { orderId: savedOrder.id })

  return savedOrder
}
```

**AFTER**:
```typescript
// GOOD: Single responsibility per function
async function processOrder(order: Order): Promise<SavedOrder> {
  validateOrder(order)
  const totals = await calculateTotals(order)
  const savedOrder = await saveOrder(order, totals)
  await notifyCustomer(savedOrder)
  return savedOrder
}

function validateOrder(order: Order): void {
  if (!order.items?.length) throw new ValidationError('Order must have items')
  if (!order.customer) throw new ValidationError('Order must have customer')
  order.items.forEach(validateItem)
}

function validateItem(item: OrderItem): void {
  if (!item.productId || !item.quantity) {
    throw new ValidationError('Invalid item')
  }
}

async function calculateTotals(order: Order): Promise<OrderTotals> {
  const subtotal = await calculateSubtotal(order.items)
  const tax = subtotal * TAX_RATE
  const shipping = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  return { subtotal, tax, shipping, total: subtotal + tax + shipping }
}
```

### Long Parameter List (> 4 params)

**Problem**: Hard to use, easy to make mistakes with order.

**Detection**: Count function parameters.

**BEFORE**:
```typescript
// BAD: 6 parameters, order matters
function createUser(
  name: string,
  email: string,
  age: number,
  role: string,
  department: string,
  isActive: boolean
) {
  // ...
}

// Easy to mix up parameters
createUser('John', 'john@example.com', 30, 'Engineering', 'admin', true) // Wrong order!
```

**AFTER**:
```typescript
// GOOD: Object parameter with named properties
interface CreateUserParams {
  name: string
  email: string
  age: number
  role: UserRole
  department: string
  isActive?: boolean // Optional with default
}

function createUser(params: CreateUserParams): User {
  const { name, email, age, role, department, isActive = true } = params
  // ...
}

// Clear and order doesn't matter
createUser({
  name: 'John',
  email: 'john@example.com',
  role: 'admin',
  department: 'Engineering',
  age: 30,
})
```

### Large Class (> 200 lines)

**Problem**: God class with too many responsibilities.

**Detection**: Count lines, check for unrelated methods.

**BEFORE**:
```typescript
// BAD: Class does everything
class UserService {
  // User CRUD (50 lines)
  createUser() {}
  updateUser() {}
  deleteUser() {}
  getUser() {}
  listUsers() {}

  // Validation (30 lines)
  validateEmail() {}
  validatePassword() {}
  validateUsername() {}

  // Email sending (40 lines)
  sendWelcomeEmail() {}
  sendPasswordResetEmail() {}
  sendNotificationEmail() {}

  // Reporting (30 lines)
  generateUserReport() {}
  exportUsersToCSV() {}

  // Authentication (50 lines)
  login() {}
  logout() {}
  refreshToken() {}
}
```

**AFTER**:
```typescript
// GOOD: Split by responsibility
class UserService {
  constructor(
    private userRepository: UserRepository,
    private validator: UserValidator,
    private emailService: EmailService
  ) {}

  async createUser(params: CreateUserParams): Promise<User> {
    this.validator.validate(params)
    const user = await this.userRepository.create(params)
    await this.emailService.sendWelcome(user)
    return user
  }

  // ... other user CRUD methods
}

class UserValidator {
  validate(params: CreateUserParams): void { /* ... */ }
  validateEmail(email: string): boolean { /* ... */ }
  validatePassword(password: string): boolean { /* ... */ }
}

class EmailService {
  sendWelcome(user: User): Promise<void> { /* ... */ }
  sendPasswordReset(user: User, token: string): Promise<void> { /* ... */ }
}

class UserReportService {
  generate(filters: ReportFilters): Promise<Report> { /* ... */ }
  exportToCSV(users: User[]): string { /* ... */ }
}
```

### Duplicated Code

**Problem**: Same logic in multiple places, maintenance nightmare.

**Detection**: Similar code blocks, copy-paste patterns.

**BEFORE**:
```typescript
// BAD: Duplicated validation logic
// In user.service.ts
function validateUserEmail(email: string): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// In signup.controller.ts
function isValidEmail(email: string): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// In contact.service.ts
function checkEmail(email: string): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
```

**AFTER**:
```typescript
// GOOD: Single source of truth
// In utils/validation.ts
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return Boolean(email) && EMAIL_REGEX.test(email)
}

// Usage everywhere
import { isValidEmail } from '@/utils/validation'

if (!isValidEmail(user.email)) {
  throw new ValidationError('Invalid email')
}
```

### Feature Envy

**Problem**: Method uses another object's data more than its own.

**Detection**: Excessive dot notation accessing other objects.

**BEFORE**:
```typescript
// BAD: OrderProcessor uses Order's internal data excessively
class OrderProcessor {
  calculateTotal(order: Order): number {
    let total = 0

    // Accessing order.customer deeply
    const discount = order.customer.loyaltyPoints > 100
      ? order.customer.membershipLevel === 'gold'
        ? 0.15
        : 0.10
      : 0

    // Accessing order.items deeply
    for (const item of order.items) {
      const itemTotal = item.product.price * item.quantity
      const itemDiscount = item.product.category.discountRate
      total += itemTotal * (1 - itemDiscount)
    }

    // Accessing order.shipping deeply
    const shippingCost = order.shipping.method === 'express'
      ? order.shipping.zone.expressRate
      : order.shipping.zone.standardRate

    return total * (1 - discount) + shippingCost
  }
}
```

**AFTER**:
```typescript
// GOOD: Move logic to where data lives
class Order {
  calculateTotal(): number {
    const subtotal = this.calculateSubtotal()
    const discount = this.customer.calculateDiscount()
    const shipping = this.shipping.calculateCost()
    return subtotal * (1 - discount) + shipping
  }

  private calculateSubtotal(): number {
    return this.items.reduce((sum, item) => sum + item.calculateTotal(), 0)
  }
}

class Customer {
  calculateDiscount(): number {
    if (this.loyaltyPoints <= 100) return 0
    return this.membershipLevel === 'gold' ? 0.15 : 0.10
  }
}

class OrderItem {
  calculateTotal(): number {
    const basePrice = this.product.price * this.quantity
    return basePrice * (1 - this.product.category.discountRate)
  }
}
```

### Deep Nesting

**Problem**: Code with > 4 levels of indentation is hard to follow.

**Detection**: Count indentation levels.

**BEFORE**:
```typescript
// BAD: Deep nesting (5 levels)
function processUsers(users: User[]) {
  if (users) {
    for (const user of users) {
      if (user.isActive) {
        if (user.email) {
          if (isValidEmail(user.email)) {
            if (user.role === 'admin') {
              // Finally doing something...
              sendAdminNotification(user)
            }
          }
        }
      }
    }
  }
}
```

**AFTER**:
```typescript
// GOOD: Early returns, extracted functions
function processUsers(users: User[]): void {
  if (!users) return

  users
    .filter(isActiveAdminWithValidEmail)
    .forEach(sendAdminNotification)
}

function isActiveAdminWithValidEmail(user: User): boolean {
  return user.isActive
    && user.email
    && isValidEmail(user.email)
    && user.role === 'admin'
}
```

### Magic Numbers/Strings

**Problem**: Literal values without context.

**Detection**: Numbers or strings that aren't self-explanatory.

**BEFORE**:
```typescript
// BAD: What do these numbers mean?
if (user.age >= 18 && user.score > 75) {
  setTimeout(callback, 86400000)
  if (status === 'A') {
    discount = 0.15
  }
}
```

**AFTER**:
```typescript
// GOOD: Named constants with meaning
const MINIMUM_AGE = 18
const PASSING_SCORE = 75
const ONE_DAY_MS = 24 * 60 * 60 * 1000

const OrderStatus = {
  ACTIVE: 'A',
  CANCELLED: 'C',
  COMPLETED: 'D',
} as const

const DISCOUNT_RATES = {
  STANDARD: 0.10,
  PREMIUM: 0.15,
  VIP: 0.20,
} as const

if (user.age >= MINIMUM_AGE && user.score > PASSING_SCORE) {
  setTimeout(callback, ONE_DAY_MS)
  if (status === OrderStatus.ACTIVE) {
    discount = DISCOUNT_RATES.PREMIUM
  }
}
```

## SOLID Violations

### Single Responsibility Violation

**Problem**: Class has multiple reasons to change.

**BEFORE**:
```typescript
// BAD: Multiple responsibilities
class UserService {
  async createUser(data: UserData): Promise<User> { /* ... */ }
  validateEmail(email: string): boolean { /* ... */ }  // Should be ValidationService
  sendWelcomeEmail(user: User): Promise<void> { /* ... */ }  // Should be EmailService
  generateUserReport(): Report { /* ... */ }  // Should be ReportService
  formatUserForAPI(user: User): APIUser { /* ... */ }  // Should be UserSerializer
}
```

**AFTER**:
```typescript
// GOOD: Single responsibility
class UserService {
  constructor(
    private validator: UserValidator,
    private emailService: EmailService,
    private repository: UserRepository
  ) {}

  async createUser(data: UserData): Promise<User> {
    this.validator.validateUserData(data)
    const user = await this.repository.create(data)
    await this.emailService.sendWelcome(user)
    return user
  }
}
```

### Open/Closed Violation

**Problem**: Must modify existing code to add new behavior.

**BEFORE**:
```typescript
// BAD: Must modify for every new payment type
function processPayment(type: string, amount: number) {
  switch (type) {
    case 'credit':
      return processCreditCard(amount)
    case 'paypal':
      return processPayPal(amount)
    case 'crypto':
      return processCrypto(amount)
    // Must add case for every new type
  }
}
```

**AFTER**:
```typescript
// GOOD: Open for extension, closed for modification
interface PaymentProcessor {
  process(amount: number): Promise<PaymentResult>
}

class CreditCardProcessor implements PaymentProcessor {
  async process(amount: number): Promise<PaymentResult> { /* ... */ }
}

class PayPalProcessor implements PaymentProcessor {
  async process(amount: number): Promise<PaymentResult> { /* ... */ }
}

// Registry pattern - add new processors without modifying existing code
const processors = new Map<string, PaymentProcessor>([
  ['credit', new CreditCardProcessor()],
  ['paypal', new PayPalProcessor()],
])

function processPayment(type: string, amount: number): Promise<PaymentResult> {
  const processor = processors.get(type)
  if (!processor) throw new Error(`Unknown payment type: ${type}`)
  return processor.process(amount)
}

// Adding new type doesn't require modifying processPayment
processors.set('crypto', new CryptoProcessor())
```

### Dependency Inversion Violation

**Problem**: High-level module depends on low-level implementation.

**BEFORE**:
```typescript
// BAD: Direct dependency on concrete implementation
class UserService {
  private db = new PostgresDatabase()  // Tight coupling
  private cache = new RedisCache()     // Can't swap implementations

  async getUser(id: string): Promise<User> {
    const cached = await this.cache.get(`user:${id}`)
    if (cached) return cached
    return this.db.query('SELECT * FROM users WHERE id = $1', [id])
  }
}
```

**AFTER**:
```typescript
// GOOD: Depend on abstractions
interface Database {
  query<T>(sql: string, params: unknown[]): Promise<T>
}

interface Cache {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
}

class UserService {
  constructor(
    private db: Database,
    private cache: Cache
  ) {}

  async getUser(id: string): Promise<User> {
    const cached = await this.cache.get<User>(`user:${id}`)
    if (cached) return cached

    const user = await this.db.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    )
    await this.cache.set(`user:${id}`, user, 3600)
    return user
  }
}

// Easy to swap implementations for testing
const userService = new UserService(
  new PostgresDatabase(),  // or MockDatabase for tests
  new RedisCache()         // or InMemoryCache for tests
)
```

## Complexity Metrics

### Cyclomatic Complexity

Count decision points: `if`, `else if`, `while`, `for`, `case`, `&&`, `||`, `?:`

| Complexity | Rating | Action |
|------------|--------|--------|
| 1-5 | Simple | OK |
| 6-10 | Moderate | Consider refactoring |
| 11-20 | Complex | Refactor required |
| > 20 | Very Complex | Split immediately |

**BEFORE** (Complexity: 12):
```typescript
function calculatePrice(product: Product, user: User): number {
  let price = product.basePrice

  if (user.isPremium) {                    // +1
    if (user.yearsActive > 5) {            // +1
      price *= 0.8
    } else if (user.yearsActive > 2) {     // +1
      price *= 0.9
    }
  }

  if (product.isOnSale) {                  // +1
    price *= 0.85
  } else if (product.isClearance) {        // +1
    price *= 0.7
  }

  if (user.hasVoucher && product.voucherEligible) {  // +2 (&&)
    price -= 10
  }

  return price > 0 ? price : 0             // +1
}
```

**AFTER** (Complexity: 3 per function):
```typescript
function calculatePrice(product: Product, user: User): number {
  const basePrice = product.basePrice
  const userDiscount = getUserDiscount(user)
  const productDiscount = getProductDiscount(product)
  const voucherDiscount = getVoucherDiscount(user, product)

  const finalPrice = basePrice * userDiscount * productDiscount - voucherDiscount
  return Math.max(0, finalPrice)
}

function getUserDiscount(user: User): number {
  if (!user.isPremium) return 1
  if (user.yearsActive > 5) return 0.8
  if (user.yearsActive > 2) return 0.9
  return 1
}

function getProductDiscount(product: Product): number {
  if (product.isOnSale) return 0.85
  if (product.isClearance) return 0.7
  return 1
}

function getVoucherDiscount(user: User, product: Product): number {
  return user.hasVoucher && product.voucherEligible ? 10 : 0
}
```

### Cognitive Complexity

Measures how hard code is to understand. Nesting increases the penalty.

**BEFORE** (High cognitive load):
```typescript
function validate(data: FormData): ValidationResult {
  const errors: string[] = []

  if (data.type === 'user') {
    if (data.email) {
      if (!isValidEmail(data.email)) {
        errors.push('Invalid email')
      }
    } else {
      errors.push('Email required')
    }
    if (data.age) {
      if (data.age < 0 || data.age > 150) {
        errors.push('Invalid age')
      }
    }
  } else if (data.type === 'company') {
    if (data.taxId) {
      if (!isValidTaxId(data.taxId)) {
        errors.push('Invalid tax ID')
      }
    } else {
      errors.push('Tax ID required')
    }
  }

  return { valid: errors.length === 0, errors }
}
```

**AFTER** (Low cognitive load):
```typescript
function validate(data: FormData): ValidationResult {
  const validator = validators[data.type]
  if (!validator) {
    return { valid: false, errors: ['Unknown type'] }
  }
  return validator(data)
}

const validators: Record<string, (data: FormData) => ValidationResult> = {
  user: validateUser,
  company: validateCompany,
}

function validateUser(data: FormData): ValidationResult {
  const errors: string[] = []

  if (!data.email) errors.push('Email required')
  else if (!isValidEmail(data.email)) errors.push('Invalid email')

  if (data.age && (data.age < 0 || data.age > 150)) {
    errors.push('Invalid age')
  }

  return { valid: errors.length === 0, errors }
}
```

## Severity Levels

| Level | Definition | Examples |
|-------|------------|----------|
| Critical | Code is broken or will fail | Unreachable code, infinite loops, null dereference |
| High | Significant maintainability issue | God class, complexity > 15, duplicate code blocks |
| Medium | Noticeable code smell | Long methods, magic numbers, deep nesting |
| Low | Minor improvement opportunity | Naming, comments, organization |

## Output Format

```markdown
## Code Quality Review: [Component]

### Code Smells
- **Long Method**: `processOrder()` (75 lines)
  - Location: `order.service.ts:45-120`
  - Complexity: Cyclomatic 18, Cognitive 22
  - Fix: Extract validation, calculation, persistence into separate functions

- **Duplicated Code**: Email validation logic
  - Locations: `user.ts:20`, `signup.ts:55`, `contact.ts:30`
  - Fix: Create shared `isValidEmail()` in `utils/validation.ts`

### SOLID Violations
- **SRP Violation**: `UserService` handles email sending
  - Location: `user.service.ts`
  - Fix: Extract to `EmailService` class

- **DIP Violation**: Direct `new PostgresDatabase()` in service
  - Location: `order.service.ts:10`
  - Fix: Inject `Database` interface via constructor

### Complexity Analysis
| Function | Cyclomatic | Cognitive | Lines | Status |
|----------|------------|-----------|-------|--------|
| `calculatePrice` | 15 | 12 | 45 | Refactor |
| `validateOrder` | 8 | 6 | 25 | Warning |
| `getUser` | 3 | 2 | 10 | OK |

### Metrics Summary
| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Max function lines | 75 | 30 | Fail |
| Max class lines | 450 | 200 | Fail |
| Max cyclomatic | 15 | 10 | Fail |
| Duplication | 12% | 5% | Fail |

### Passed Checks
- [x] Consistent naming conventions
- [x] No dead code
- [x] Imports organized
- [x] No circular dependencies
- [x] Error handling present
```

## Anti-Patterns Reference

| Anti-Pattern | Problem | Detection | Fix |
|--------------|---------|-----------|-----|
| God Class | Does everything | > 500 lines, many responsibilities | Split by responsibility |
| Spaghetti Code | No clear structure | Goto-like jumps, deep nesting | Refactor with clear flow |
| Shotgun Surgery | One change = many files | Feature touches 5+ files | Consolidate related code |
| Primitive Obsession | Primitives instead of objects | Repeated string/number patterns | Create value objects |
| Data Clumps | Same params everywhere | 3+ params repeated together | Extract parameter object |
| Switch Statements | Type checking switches | switch on type/enum | Polymorphism/strategy |
| Speculative Generality | YAGNI violation | Unused abstractions | Remove until needed |
| Dead Code | Never executed | Unreachable branches | Delete it |

---

**Version**: 1.0
**Spec**: SPEC-020
**For**: reviewer agent
