# Pattern: Saga Orchestrator

Orchestrate multi-step distributed operations with automatic compensation on failure.

## When to Use

- Cross-service transactions (payment + inventory + shipping)
- Operations where each step talks to a different service/resource
- Need structured retry + compensation logic

## Core Interfaces

```typescript
interface SagaStep<TContext> {
  name: string
  execute: (context: TContext) => Promise<TContext>
  compensate: (context: TContext) => Promise<TContext>
  retryable?: boolean
  maxRetries?: number
}

interface SagaResult<TContext> {
  success: boolean
  context: TContext
  completedSteps: string[]
  failedStep?: string
  error?: Error
}
```

## Saga Class Implementation

```typescript
class Saga<TContext extends Record<string, unknown>> {
  private steps: SagaStep<TContext>[] = []
  private onStepComplete?: (step: string, context: TContext) => void
  private onStepFail?: (step: string, error: Error) => void

  addStep(step: SagaStep<TContext>): this {
    this.steps.push(step)
    return this
  }

  onComplete(callback: (step: string, context: TContext) => void): this {
    this.onStepComplete = callback
    return this
  }

  onFail(callback: (step: string, error: Error) => void): this {
    this.onStepFail = callback
    return this
  }

  async execute(initialContext: TContext): Promise<SagaResult<TContext>> {
    let context = { ...initialContext }
    const completedSteps: SagaStep<TContext>[] = []

    try {
      for (const step of this.steps) {
        console.log(`[Saga] Executing step: ${step.name}`)

        if (step.retryable) {
          context = await this.executeWithRetry(step, context)
        } else {
          context = await step.execute(context)
        }

        completedSteps.push(step)
        this.onStepComplete?.(step.name, context)
      }

      return {
        success: true,
        context,
        completedSteps: completedSteps.map(s => s.name)
      }
    } catch (error) {
      const failedStepIndex = completedSteps.length
      const failedStep = this.steps[failedStepIndex]

      console.error(`[Saga] Failed at step: ${failedStep?.name}`)
      this.onStepFail?.(failedStep?.name || 'unknown', error as Error)

      // Compensate in reverse order
      console.log('[Saga] Starting compensation...')
      for (const step of completedSteps.reverse()) {
        try {
          console.log(`[Saga] Compensating: ${step.name}`)
          context = await step.compensate(context)
        } catch (compensateError) {
          console.error(`[Saga] CRITICAL: Compensation failed for ${step.name}`)
          await this.handleCompensationFailure(step.name, compensateError as Error, context)
        }
      }

      return {
        success: false,
        context,
        completedSteps: completedSteps.map(s => s.name),
        failedStep: failedStep?.name,
        error: error as Error
      }
    }
  }

  private async executeWithRetry<T>(
    step: SagaStep<TContext>,
    context: TContext
  ): Promise<TContext> {
    const maxRetries = step.maxRetries || 3
    let lastError: Error

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await step.execute(context)
      } catch (error) {
        lastError = error as Error
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000
          console.log(`[Saga] Retry ${attempt + 1}/${maxRetries} for ${step.name} after ${delay}ms`)
          await Bun.sleep(delay)
        }
      }
    }

    throw lastError!
  }

  private async handleCompensationFailure(
    stepName: string,
    error: Error,
    context: TContext
  ): Promise<void> {
    console.error({
      type: 'COMPENSATION_FAILURE',
      step: stepName,
      error: error.message,
      context,
      timestamp: new Date().toISOString()
    })
    // In production: send to alerting system, create incident ticket
  }
}
```

## Elysia Saga Middleware

```typescript
import { Elysia } from 'elysia'
import { Saga } from './saga'

const sagaPlugin = new Elysia({ name: 'saga' })
  .decorate('createSaga', <T extends Record<string, unknown>>() => new Saga<T>())
  .derive(({ createSaga }) => ({
    executeSaga: async <T extends Record<string, unknown>>(
      saga: Saga<T>,
      initialContext: T
    ) => {
      const result = await saga.execute(initialContext)
      if (!result.success) {
        throw new SagaExecutionError(result.failedStep!, result.error!)
      }
      return result.context
    }
  }))

class SagaExecutionError extends Error {
  constructor(
    public failedStep: string,
    public cause: Error
  ) {
    super(`Saga failed at step: ${failedStep}`)
    this.name = 'SagaExecutionError'
  }
}

// Usage in route
const app = new Elysia()
  .use(sagaPlugin)
  .post('/orders', async ({ createSaga, executeSaga, body }) => {
    const orderSaga = createSaga<OrderContext>()
      .addStep({
        name: 'Validate',
        execute: async (ctx) => ({ ...ctx, validated: true }),
        compensate: async (ctx) => ctx
      })
      .addStep({
        name: 'Create',
        execute: async (ctx) => {
          const order = await orderService.create(ctx)
          return { ...ctx, orderId: order.id }
        },
        compensate: async (ctx) => {
          if (ctx.orderId) await orderService.delete(ctx.orderId)
          return ctx
        }
      })

    const result = await executeSaga(orderSaga, {
      customerId: body.customerId,
      items: body.items
    })

    return { orderId: result.orderId }
  })
```

## Key Points

- Context flows through each step, accumulating results
- Failed steps trigger compensation in reverse order
- `retryable` steps get exponential backoff before failing
- Compensation failures are logged but don't stop other compensations
- Builder pattern (`addStep().addStep()`) for fluent configuration
