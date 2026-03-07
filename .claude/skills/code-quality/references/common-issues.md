# Common Issues

7 code smell patterns with before/after examples.

## 1. Long Method (> 20 lines)

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

## 2. Long Parameter List (> 4 params)

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

## 3. Large Class (> 200 lines)

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

## 4. Duplicated Code

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

## 5. Feature Envy

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

## 6. Deep Nesting

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

## 7. Magic Numbers/Strings

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
