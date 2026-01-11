# Project Patterns

## Error Handling

### Elysia HTTP Exceptions

```typescript
import { HTTPException } from 'elysia'

// Throw HTTP error
throw new HTTPException(400, { message: 'Invalid input' })
throw new HTTPException(404, { message: 'Not found' })
throw new HTTPException(500, { message: 'Internal error' })
```

### Try-Catch Pattern

```typescript
async function handler({ body }: Context) {
  try {
    const result = await service.process(body)
    return result
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new HTTPException(400, { message: error.message })
    }
    throw new HTTPException(500, { message: 'Processing failed' })
  }
}
```

## Service Pattern

### Class-based Services

```typescript
export class UserService {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id])
  }

  async create(data: CreateUserInput): Promise<User> {
    // validation + insert
  }
}
```

### Singleton Services

```typescript
// services/claude.ts
class ClaudeService {
  private static instance: ClaudeService

  static getInstance(): ClaudeService {
    if (!this.instance) {
      this.instance = new ClaudeService()
    }
    return this.instance
  }
}

export const claudeService = ClaudeService.getInstance()
```

## Validation Pattern

### Elysia + TypeBox

```typescript
import { t } from 'elysia'

app.post('/users', ({ body }) => {
  // body is typed and validated
  return createUser(body)
}, {
  body: t.Object({
    email: t.String({ format: 'email' }),
    name: t.String({ minLength: 1 }),
    age: t.Optional(t.Number({ minimum: 0 }))
  })
})
```

### Zod Validation

```typescript
import { z } from 'zod'

const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  age: z.number().min(0).optional()
})

function validateUser(input: unknown): User {
  return UserSchema.parse(input)
}
```

## Streaming Pattern

### Server-Sent Events

```typescript
app.get('/stream', () => {
  return new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 10; i++) {
        controller.enqueue(`data: ${JSON.stringify({ count: i })}\n\n`)
        await Bun.sleep(100)
      }
      controller.close()
    }
  })
})
```

### WebSocket Streaming

```typescript
app.ws('/ws', {
  message(ws, message) {
    const { type, ...data } = JSON.parse(message as string)

    if (type === 'execute') {
      // Start execution, stream results back
      streamExecution(data, (chunk) => {
        ws.send(JSON.stringify(chunk))
      })
    }
  }
})
```

## Configuration Pattern

### Environment-based Config

```typescript
// config/index.ts
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production']).default('development')
})

export const config = envSchema.parse(Bun.env)
```

## Testing Pattern

### Bun Test

```typescript
import { describe, test, expect, beforeEach, mock } from 'bun:test'

describe('UserService', () => {
  let service: UserService
  let mockDb: Database

  beforeEach(() => {
    mockDb = mock(() => ({
      query: mock(() => [])
    }))()
    service = new UserService(mockDb)
  })

  test('findById returns user', async () => {
    mockDb.query.mockReturnValue([{ id: '1', name: 'Test' }])

    const user = await service.findById('1')

    expect(user).toEqual({ id: '1', name: 'Test' })
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE id = ?',
      ['1']
    )
  })
})
```

## File Structure Pattern

```
feature/
├── index.ts          # Public exports
├── routes.ts         # Elysia routes
├── service.ts        # Business logic
├── repository.ts     # Data access
├── types.ts          # TypeScript types
└── service.test.ts   # Tests
```
