# Extract Class Patterns

## When to Extract

- Group of functions operate on same data
- Data and behavior should be encapsulated
- Single Responsibility Principle violation
- Test isolation needed

## Pattern: Data + Behavior Cohesion

```typescript
// BEFORE: Functions scattered, operating on User data
interface User {
  firstName: string
  lastName: string
  email: string
  createdAt: Date
  lastLoginAt: Date | null
}

function formatUserDisplayName(user: User): string {
  return `${user.firstName} ${user.lastName}`
}

function isUserEmailVerified(user: User): boolean {
  return user.email.includes('@') && user.lastLoginAt !== null
}

function getUserAccountAge(user: User): number {
  return Date.now() - user.createdAt.getTime()
}

function isUserActive(user: User): boolean {
  if (!user.lastLoginAt) return false
  const daysSinceLogin = (Date.now() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)
  return daysSinceLogin < 30
}

// AFTER: Cohesive class
class UserPresenter {
  constructor(private readonly user: User) {}

  get displayName(): string {
    return `${this.user.firstName} ${this.user.lastName}`
  }

  get isEmailVerified(): boolean {
    return this.user.email.includes('@') && this.user.lastLoginAt !== null
  }

  get accountAgeMs(): number {
    return Date.now() - this.user.createdAt.getTime()
  }

  get isActive(): boolean {
    if (!this.user.lastLoginAt) return false
    const daysSinceLogin = this.daysSince(this.user.lastLoginAt)
    return daysSinceLogin < 30
  }

  private daysSince(date: Date): number {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  }
}

// Usage
const presenter = new UserPresenter(user)
console.log(presenter.displayName)
console.log(presenter.isActive)
```

## Pattern: Extract Service

```typescript
// BEFORE: Route handler doing too much
app.post('/orders', async ({ body, user }) => {
  // Validation
  if (!body.items?.length) throw new Error('No items')

  // Check inventory
  for (const item of body.items) {
    const stock = await db.inventory.find(item.productId)
    if (stock.quantity < item.quantity) {
      throw new Error(`Insufficient stock for ${item.productId}`)
    }
  }

  // Calculate totals
  let total = 0
  for (const item of body.items) {
    const product = await db.products.find(item.productId)
    total += product.price * item.quantity
  }

  // Create order
  const order = await db.orders.create({
    userId: user.id,
    items: body.items,
    total,
    status: 'pending',
  })

  // Update inventory
  for (const item of body.items) {
    await db.inventory.decrement(item.productId, item.quantity)
  }

  // Send notification
  await sendEmail(user.email, 'Order Confirmation', `Order ${order.id}`)

  return order
})

// AFTER: Extracted service with single responsibility
// services/order.service.ts
class OrderService {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly notificationService: NotificationService,
  ) {}

  async createOrder(userId: string, items: OrderItem[]): Promise<Order> {
    this.validateItems(items)
    await this.inventoryService.reserveStock(items)

    const total = await this.calculateTotal(items)
    const order = await this.saveOrder(userId, items, total)

    await this.inventoryService.commitReservation(items)
    await this.notificationService.sendOrderConfirmation(userId, order)

    return order
  }

  private validateItems(items: OrderItem[]): void {
    if (!items?.length) {
      throw new ValidationError('Order must have items')
    }
  }

  private async calculateTotal(items: OrderItem[]): Promise<number> {
    const prices = await Promise.all(
      items.map(async (item) => {
        const product = await db.products.find(item.productId)
        return product.price * item.quantity
      })
    )
    return prices.reduce((sum, price) => sum + price, 0)
  }

  private async saveOrder(
    userId: string,
    items: OrderItem[],
    total: number
  ): Promise<Order> {
    return db.orders.create({
      userId,
      items,
      total,
      status: 'pending',
    })
  }
}

// Route becomes thin
app.post('/orders', async ({ body, user }) => {
  return orderService.createOrder(user.id, body.items)
})
```
