# Pattern: Manual Rollback with Compensation

Execute a sequence of operations, and if any fails, run compensation actions in reverse order.

## When to Use

- Multi-step operations across different resources
- Operations that cannot use a single DB transaction
- Steps that have clear undo/compensate actions

## Core Interfaces

```typescript
interface Operation<T = void> {
  name: string
  execute: () => Promise<T>
  compensate: () => Promise<void>
}

interface ExecutionResult<T> {
  success: boolean
  data?: T
  failedAt?: string
  error?: Error
}
```

## Implementation

```typescript
async function executeWithRollback<T>(
  operations: Operation<T>[]
): Promise<ExecutionResult<T>> {
  const completed: Operation<T>[] = []
  let lastResult: T | undefined

  try {
    for (const op of operations) {
      console.log(`Executing: ${op.name}`)
      lastResult = await op.execute()
      completed.push(op)
    }

    return { success: true, data: lastResult }
  } catch (error) {
    console.error(`Operation failed at: ${operations[completed.length]?.name}`)
    console.error('Error:', error)

    // Rollback in reverse order
    for (const op of completed.reverse()) {
      try {
        console.log(`Compensating: ${op.name}`)
        await op.compensate()
      } catch (compensateError) {
        console.error(`CRITICAL: Compensation failed for ${op.name}:`, compensateError)
        // Log to alerting system - manual intervention needed
      }
    }

    return {
      success: false,
      failedAt: operations[completed.length]?.name,
      error: error as Error
    }
  }
}
```

## Usage Example

```typescript
async function createUserWithProfile(userData: UserData, profileData: ProfileData) {
  let userId: string | undefined
  let profileId: string | undefined

  return executeWithRollback([
    {
      name: 'Create User',
      execute: async () => {
        const user = await db.insert(users).values(userData).returning()
        userId = user[0].id
        return userId
      },
      compensate: async () => {
        if (userId) await db.delete(users).where(eq(users.id, userId))
      }
    },
    {
      name: 'Create Profile',
      execute: async () => {
        const profile = await db.insert(profiles).values({
          ...profileData,
          userId: userId!
        }).returning()
        profileId = profile[0].id
        return profileId
      },
      compensate: async () => {
        if (profileId) await db.delete(profiles).where(eq(profiles.id, profileId))
      }
    },
    {
      name: 'Send Welcome Email',
      execute: async () => {
        await emailService.sendWelcome(userId!)
      },
      compensate: async () => {
        // Email sent - no compensation needed, or could mark as cancelled
        console.log('Email already sent - no compensation available')
      }
    }
  ])
}
```

## Key Points

- Compensations execute in **reverse order** of completed operations
- Each compensation must handle its own errors (never throw)
- Some operations have no compensation (e.g., sent emails) - log and accept
- Track `completed` operations to know what needs rollback
