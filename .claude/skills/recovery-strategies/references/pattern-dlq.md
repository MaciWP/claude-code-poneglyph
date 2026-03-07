# Pattern: Dead Letter Queue (DLQ)

Handle message processing failures with retries and a dead letter queue for messages that cannot be processed.

## When to Use

- Asynchronous message/event processing
- Background job queues
- Operations that may fail transiently (network, rate limits)
- Need visibility into permanently failed messages

## Core Interfaces

```typescript
interface Message<T = unknown> {
  id: string
  payload: T
  queue: string
  createdAt: Date
  attempts: number
  lastAttempt?: Date
  error?: string
}

interface DLQEntry<T = unknown> extends Message<T> {
  movedAt: Date
  originalQueue: string
  failureReason: string
}

interface ProcessResult {
  success: boolean
  error?: Error
  shouldRetry?: boolean
}

interface QueueConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
}
```

## MessageQueue Implementation

```typescript
class MessageQueue<T> {
  private queue: Message<T>[] = []
  private dlq: DLQEntry<T>[] = []
  private processing = false

  constructor(
    private name: string,
    private config: QueueConfig = {
      maxAttempts: 5,
      baseDelayMs: 1000,
      maxDelayMs: 60000
    }
  ) {}

  async enqueue(payload: T): Promise<string> {
    const message: Message<T> = {
      id: crypto.randomUUID(),
      payload,
      queue: this.name,
      createdAt: new Date(),
      attempts: 0
    }
    this.queue.push(message)
    console.log(`[Queue:${this.name}] Enqueued message ${message.id}`)
    return message.id
  }

  async process(
    handler: (payload: T) => Promise<ProcessResult>
  ): Promise<void> {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      const message = this.queue.shift()!
      message.attempts++
      message.lastAttempt = new Date()

      console.log(`[Queue:${this.name}] Processing message ${message.id} (attempt ${message.attempts})`)

      try {
        const result = await handler(message.payload)

        if (!result.success) {
          if (result.shouldRetry !== false) {
            await this.handleFailure(message, result.error || new Error('Processing failed'))
          } else {
            await this.moveToDLQ(message, result.error?.message || 'Non-retryable failure')
          }
        } else {
          console.log(`[Queue:${this.name}] Message ${message.id} processed successfully`)
        }
      } catch (error) {
        await this.handleFailure(message, error as Error)
      }
    }

    this.processing = false
  }

  private async handleFailure(message: Message<T>, error: Error): Promise<void> {
    message.error = error.message

    if (message.attempts >= this.config.maxAttempts) {
      await this.moveToDLQ(message, `Max attempts (${this.config.maxAttempts}) exceeded: ${error.message}`)
      return
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.baseDelayMs * Math.pow(2, message.attempts - 1),
      this.config.maxDelayMs
    )

    console.log(`[Queue:${this.name}] Requeuing message ${message.id} after ${delay}ms`)

    await Bun.sleep(delay)
    this.queue.push(message)
  }

  private async moveToDLQ(message: Message<T>, reason: string): Promise<void> {
    const dlqEntry: DLQEntry<T> = {
      ...message,
      movedAt: new Date(),
      originalQueue: this.name,
      failureReason: reason
    }

    this.dlq.push(dlqEntry)
    console.log(`[Queue:${this.name}] Message ${message.id} moved to DLQ: ${reason}`)

    // In production: send alert
    await this.alertDLQEntry(dlqEntry)
  }

  private async alertDLQEntry(entry: DLQEntry<T>): Promise<void> {
    console.error({
      type: 'DLQ_ENTRY',
      queue: this.name,
      messageId: entry.id,
      attempts: entry.attempts,
      reason: entry.failureReason,
      timestamp: new Date().toISOString()
    })
  }

  async reprocessDLQ(
    messageId: string,
    handler: (payload: T) => Promise<ProcessResult>
  ): Promise<boolean> {
    const index = this.dlq.findIndex(m => m.id === messageId)
    if (index === -1) return false

    const entry = this.dlq[index]
    console.log(`[Queue:${this.name}] Reprocessing DLQ message ${messageId}`)

    try {
      const result = await handler(entry.payload)
      if (result.success) {
        this.dlq.splice(index, 1)
        console.log(`[Queue:${this.name}] DLQ message ${messageId} reprocessed successfully`)
        return true
      }
    } catch (error) {
      entry.error = (error as Error).message
      entry.attempts++
      entry.lastAttempt = new Date()
    }

    return false
  }

  getDLQStats(): { count: number; oldestEntry: Date | null } {
    return {
      count: this.dlq.length,
      oldestEntry: this.dlq.length > 0 ? this.dlq[0].movedAt : null
    }
  }

  getDLQEntries(): DLQEntry<T>[] {
    return [...this.dlq]
  }
}
```

## Usage

```typescript
const orderQueue = new MessageQueue<OrderPayload>('orders', {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000
})

// Enqueue
await orderQueue.enqueue({ orderId: 'ord-123', action: 'process' })

// Process
await orderQueue.process(async (payload) => {
  try {
    await processOrder(payload)
    return { success: true }
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      return { success: false, error, shouldRetry: false }
    }
    return { success: false, error }
  }
})
```

## Key Points

- Messages get exponential backoff between retries
- After max attempts, messages move to DLQ
- `shouldRetry: false` sends directly to DLQ (permanent failures)
- DLQ entries can be manually reprocessed
- Stats and inspection APIs for monitoring
