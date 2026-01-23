---
name: recovery-strategies
description: |
  Error recovery and workflow rollback strategies.
  Use when handling recovery, rollback, compensation, or workflow failures.
  Keywords: recovery, rollback, compensation, saga, undo, restore, failure handling
for_agents: [error-analyzer]
---

# Recovery Strategies

Error recovery and rollback patterns for TypeScript/Bun applications.

## When to Use

- Implementing transaction rollback
- Designing saga patterns
- Handling partial failures
- Creating undo/compensation logic

## Transaction Patterns

### Database Transaction

```typescript
import { db } from './db'

async function transferFunds(fromId: string, toId: string, amount: number) {
  return db.transaction(async (tx) => {
    // Debit from source
    await tx.update(accounts)
      .set({ balance: sql`balance - ${amount}` })
      .where(eq(accounts.id, fromId))

    // Credit to destination
    await tx.update(accounts)
      .set({ balance: sql`balance + ${amount}` })
      .where(eq(accounts.id, toId))

    // If any operation fails, entire transaction rolls back
  })
}
```

### Manual Rollback

```typescript
interface RollbackAction {
  name: string
  execute: () => Promise<void>
}

async function executeWithRollback<T>(
  operations: Array<{
    name: string
    execute: () => Promise<void>
    rollback: () => Promise<void>
  }>
): Promise<void> {
  const completed: RollbackAction[] = []

  try {
    for (const op of operations) {
      console.log(`Executing: ${op.name}`)
      await op.execute()
      completed.push({ name: op.name, execute: op.rollback })
    }
  } catch (error) {
    console.error('Operation failed, rolling back...')

    // Rollback in reverse order
    for (const action of completed.reverse()) {
      try {
        console.log(`Rolling back: ${action.name}`)
        await action.execute()
      } catch (rollbackError) {
        console.error(`Rollback failed for ${action.name}:`, rollbackError)
      }
    }

    throw error
  }
}

// Usage
await executeWithRollback([
  {
    name: 'Create user',
    execute: () => createUser(userData),
    rollback: () => deleteUser(userId)
  },
  {
    name: 'Create profile',
    execute: () => createProfile(profileData),
    rollback: () => deleteProfile(profileId)
  },
  {
    name: 'Send welcome email',
    execute: () => sendEmail(userId),
    rollback: () => {} // No rollback needed
  }
])
```

## Saga Pattern

### Orchestration-Based Saga

```typescript
interface SagaStep<T> {
  name: string
  execute: (context: T) => Promise<T>
  compensate: (context: T) => Promise<T>
}

class Saga<T> {
  private steps: SagaStep<T>[] = []

  addStep(step: SagaStep<T>): this {
    this.steps.push(step)
    return this
  }

  async execute(initialContext: T): Promise<T> {
    let context = initialContext
    const executedSteps: SagaStep<T>[] = []

    try {
      for (const step of this.steps) {
        console.log(`Saga step: ${step.name}`)
        context = await step.execute(context)
        executedSteps.push(step)
      }
      return context
    } catch (error) {
      console.error('Saga failed, compensating...')

      for (const step of executedSteps.reverse()) {
        try {
          console.log(`Compensating: ${step.name}`)
          context = await step.compensate(context)
        } catch (compensateError) {
          console.error(`Compensation failed: ${step.name}`, compensateError)
        }
      }

      throw error
    }
  }
}

// Usage
interface OrderContext {
  orderId?: string
  paymentId?: string
  inventoryReserved?: boolean
}

const orderSaga = new Saga<OrderContext>()
  .addStep({
    name: 'Create Order',
    execute: async (ctx) => {
      const order = await createOrder()
      return { ...ctx, orderId: order.id }
    },
    compensate: async (ctx) => {
      if (ctx.orderId) await cancelOrder(ctx.orderId)
      return ctx
    }
  })
  .addStep({
    name: 'Process Payment',
    execute: async (ctx) => {
      const payment = await processPayment(ctx.orderId!)
      return { ...ctx, paymentId: payment.id }
    },
    compensate: async (ctx) => {
      if (ctx.paymentId) await refundPayment(ctx.paymentId)
      return ctx
    }
  })
  .addStep({
    name: 'Reserve Inventory',
    execute: async (ctx) => {
      await reserveInventory(ctx.orderId!)
      return { ...ctx, inventoryReserved: true }
    },
    compensate: async (ctx) => {
      if (ctx.inventoryReserved) await releaseInventory(ctx.orderId!)
      return ctx
    }
  })

await orderSaga.execute({})
```

## Checkpoint/Resume Pattern

```typescript
interface Checkpoint {
  id: string
  step: number
  data: unknown
  timestamp: Date
}

class ResumableWorkflow {
  private checkpoints: Map<string, Checkpoint> = new Map()

  async saveCheckpoint(workflowId: string, step: number, data: unknown) {
    const checkpoint: Checkpoint = {
      id: workflowId,
      step,
      data,
      timestamp: new Date()
    }
    this.checkpoints.set(workflowId, checkpoint)
    // Also persist to database for durability
    await db.insert(checkpoints).values(checkpoint)
  }

  async getCheckpoint(workflowId: string): Promise<Checkpoint | null> {
    return this.checkpoints.get(workflowId) ??
      await db.select().from(checkpoints).where(eq(checkpoints.id, workflowId))
  }

  async execute(workflowId: string, steps: Array<(data: unknown) => Promise<unknown>>) {
    const checkpoint = await this.getCheckpoint(workflowId)
    let currentStep = checkpoint?.step ?? 0
    let data = checkpoint?.data ?? {}

    for (let i = currentStep; i < steps.length; i++) {
      try {
        data = await steps[i](data)
        await this.saveCheckpoint(workflowId, i + 1, data)
      } catch (error) {
        console.error(`Step ${i} failed, checkpoint saved at step ${i}`)
        throw error
      }
    }

    return data
  }
}
```

## Graceful Degradation

### Feature Fallback

```typescript
interface FeatureConfig {
  primary: () => Promise<unknown>
  fallback: () => Promise<unknown>
  degraded: () => unknown
}

async function withGracefulDegradation<T>(config: FeatureConfig): Promise<T> {
  try {
    return await config.primary() as T
  } catch (primaryError) {
    console.warn('Primary failed, trying fallback:', primaryError)

    try {
      return await config.fallback() as T
    } catch (fallbackError) {
      console.warn('Fallback failed, using degraded mode:', fallbackError)
      return config.degraded() as T
    }
  }
}

// Usage
const recommendations = await withGracefulDegradation({
  primary: () => mlService.getPersonalizedRecommendations(userId),
  fallback: () => cacheService.getCachedRecommendations(userId),
  degraded: () => DEFAULT_RECOMMENDATIONS
})
```

### Circuit Breaker with Fallback

```typescript
class ResilientService {
  private breaker: CircuitBreaker
  private cache: Map<string, { data: unknown; expiry: number }> = new Map()

  async fetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Try circuit breaker
    try {
      const result = await this.breaker.execute(fetcher)
      this.cache.set(key, { data: result, expiry: Date.now() + 300000 })
      return result
    } catch (error) {
      // Fall back to cache
      const cached = this.cache.get(key)
      if (cached) {
        console.warn('Using stale cache due to error')
        return cached.data as T
      }
      throw error
    }
  }
}
```

## Dead Letter Queue

```typescript
interface FailedMessage {
  id: string
  payload: unknown
  error: string
  attempts: number
  lastAttempt: Date
  originalQueue: string
}

class DeadLetterQueue {
  private dlq: FailedMessage[] = []

  async handleFailure(
    messageId: string,
    payload: unknown,
    error: Error,
    attempts: number,
    maxAttempts: number,
    originalQueue: string
  ) {
    if (attempts >= maxAttempts) {
      // Move to DLQ
      this.dlq.push({
        id: messageId,
        payload,
        error: error.message,
        attempts,
        lastAttempt: new Date(),
        originalQueue
      })
      console.log(`Message ${messageId} moved to DLQ after ${attempts} attempts`)
    } else {
      // Requeue with exponential backoff
      const delay = Math.pow(2, attempts) * 1000
      setTimeout(() => this.requeue(messageId, payload, originalQueue), delay)
    }
  }

  async reprocess(messageId: string) {
    const message = this.dlq.find(m => m.id === messageId)
    if (message) {
      // Attempt reprocessing
      await this.requeue(message.id, message.payload, message.originalQueue)
      this.dlq = this.dlq.filter(m => m.id !== messageId)
    }
  }

  private async requeue(id: string, payload: unknown, queue: string) {
    // Requeue logic
  }
}
```

## Recovery Checklist

### Before Failure Handling

- [ ] Identify all failure points
- [ ] Define compensation actions
- [ ] Implement checkpointing for long processes
- [ ] Set up dead letter queue for messages

### During Recovery

- [ ] Log all recovery attempts
- [ ] Execute compensations in reverse order
- [ ] Handle compensation failures gracefully
- [ ] Maintain idempotency

### After Recovery

- [ ] Alert on repeated failures
- [ ] Analyze failure patterns
- [ ] Update runbooks
- [ ] Consider adding circuit breakers

## Recovery Decision Matrix

| Failure Type | Strategy |
|--------------|----------|
| Database transaction | Auto-rollback |
| API call chain | Saga with compensation |
| Long-running process | Checkpoint/resume |
| External service | Circuit breaker + cache |
| Message processing | Retry + DLQ |
| Partial update | Idempotent retry |

---

**Version**: 1.0.0
**Spec**: SPEC-018
**For**: error-analyzer agent
