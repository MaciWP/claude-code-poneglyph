# Extract Function Patterns

## When to Extract

- Function exceeds 20 lines
- Code block has a comment explaining "what it does"
- Same code appears in multiple places
- Complex conditional logic

## Pattern: Extract Calculation

```typescript
// BEFORE: Inline calculation logic
async function processOrder(order: Order): Promise<OrderResult> {
  // Validate
  if (!order.items.length) {
    throw new ValidationError('Order has no items')
  }
  if (!order.customerId) {
    throw new ValidationError('Order has no customer')
  }

  // Calculate subtotal with discounts
  let subtotal = 0
  for (const item of order.items) {
    let itemTotal = item.price * item.quantity
    if (item.discount) {
      itemTotal -= item.discount
    }
    if (item.quantity >= 10) {
      itemTotal *= 0.95 // 5% bulk discount
    }
    subtotal += itemTotal
  }

  // Apply tax
  const taxRate = await getTaxRate(order.shippingAddress.state)
  const tax = subtotal * taxRate

  // Calculate shipping
  let shipping = 0
  if (subtotal < 100) {
    shipping = 10
  } else if (subtotal < 200) {
    shipping = 5
  }

  const total = subtotal + tax + shipping

  // Save and return
  const savedOrder = await db.orders.create({
    ...order,
    subtotal,
    tax,
    shipping,
    total,
  })

  return { order: savedOrder, total }
}

// AFTER: Extracted functions with single responsibility
async function processOrder(order: Order): Promise<OrderResult> {
  validateOrder(order)

  const subtotal = calculateSubtotal(order.items)
  const tax = await calculateTax(subtotal, order.shippingAddress.state)
  const shipping = calculateShipping(subtotal)
  const total = subtotal + tax + shipping

  const savedOrder = await saveOrder(order, { subtotal, tax, shipping, total })

  return { order: savedOrder, total }
}

function validateOrder(order: Order): void {
  if (!order.items.length) {
    throw new ValidationError('Order has no items')
  }
  if (!order.customerId) {
    throw new ValidationError('Order has no customer')
  }
}

function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
}

function calculateItemTotal(item: OrderItem): number {
  const baseTotal = item.price * item.quantity
  const afterDiscount = baseTotal - (item.discount ?? 0)
  const bulkMultiplier = item.quantity >= 10 ? 0.95 : 1
  return afterDiscount * bulkMultiplier
}

async function calculateTax(subtotal: number, state: string): Promise<number> {
  const taxRate = await getTaxRate(state)
  return subtotal * taxRate
}

function calculateShipping(subtotal: number): number {
  if (subtotal >= 200) return 0
  if (subtotal >= 100) return 5
  return 10
}

async function saveOrder(
  order: Order,
  totals: OrderTotals
): Promise<SavedOrder> {
  return db.orders.create({ ...order, ...totals })
}
```

## Pattern: Extract Conditional

```typescript
// BEFORE: Complex nested conditionals
function getAccessLevel(user: User, resource: Resource): AccessLevel {
  if (user.role === 'admin') {
    return 'full'
  } else if (user.role === 'moderator') {
    if (resource.type === 'post') {
      return 'full'
    } else if (resource.type === 'user') {
      return 'read'
    } else {
      return 'none'
    }
  } else if (user.role === 'user') {
    if (resource.ownerId === user.id) {
      return 'full'
    } else {
      return 'read'
    }
  }
  return 'none'
}

// AFTER: Extracted with early returns
function getAccessLevel(user: User, resource: Resource): AccessLevel {
  if (isAdmin(user)) return 'full'
  if (isModerator(user)) return getModeratorAccess(resource)
  if (isOwner(user, resource)) return 'full'
  return 'read'
}

function isAdmin(user: User): boolean {
  return user.role === 'admin'
}

function isModerator(user: User): boolean {
  return user.role === 'moderator'
}

function isOwner(user: User, resource: Resource): boolean {
  return resource.ownerId === user.id
}

function getModeratorAccess(resource: Resource): AccessLevel {
  const accessMap: Record<string, AccessLevel> = {
    post: 'full',
    user: 'read',
  }
  return accessMap[resource.type] ?? 'none'
}
```
