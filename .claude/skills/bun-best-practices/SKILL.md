---
name: bun-best-practices
description: |
  Bun runtime patterns for Elysia, testing, file I/O, shell commands, and WebSocket.
  Use proactively when: using Bun APIs, writing Elysia routes, running tests, spawning processes.
  Keywords - bun, elysia, bun test, bun file, bun spawn, shell, websocket, runtime
activation:
  keywords:
    - bun
    - elysia
    - bun test
    - bun file
    - bun spawn
    - shell
    - websocket
    - runtime
for_agents: [builder]
version: "1.0"
---

# Bun Best Practices

Patterns and best practices for Bun runtime development with Elysia framework.

## When to Use This Skill

- Building HTTP servers with Bun/Elysia
- Reading/writing files with Bun APIs
- Running shell commands or spawning processes
- Writing tests with `bun:test`
- Implementing WebSocket connections
- Streaming responses
- Working with environment variables
- Integrating with databases (SQLite, PostgreSQL)

## Patterns

### 1. File Operations - Use Bun.file()

```typescript
// WRONG - Using Node.js fs module
import { readFile, writeFile } from 'fs/promises'
const content = await readFile('./config.json', 'utf-8')
await writeFile('./output.txt', data)

// CORRECT - Bun native file API (lazy, efficient)
const file = Bun.file('./config.json')
const content = await file.text()
const json = await file.json()

// Writing files
await Bun.write('./output.txt', 'Hello World')
await Bun.write('./data.json', JSON.stringify(data, null, 2))

// Check existence before reading
const configFile = Bun.file('./config.json')
if (await configFile.exists()) {
  const config = await configFile.json()
}
```

### 2. HTTP Server - Elysia (Recommended)

```typescript
// WRONG - Raw Bun.serve for complex apps
Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok' })
    }
    // Manual routing, validation, etc.
  },
})

// CORRECT - Elysia with type-safe validation
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .get('/api/health', () => ({ status: 'ok' }))
  .post(
    '/api/users',
    ({ body }) => {
      return { id: crypto.randomUUID(), ...body }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ format: 'email' }),
      }),
    }
  )
  .listen(3000)

console.log(`Server running at http://localhost:${app.server?.port}`)
```

### 3. Shell Commands - $ Template

```typescript
// WRONG - Using child_process spawn directly
import { spawn } from 'child_process'
const proc = spawn('git', ['status'], { shell: true })
// Complex event handling...

// CORRECT - Bun $ shell (preferred for scripts)
import { $ } from 'bun'

// Simple command
const result = await $`git status`.text()

// Quiet mode (no stdout)
await $`git add . && git commit -m "message"`.quiet()

// With error handling
try {
  const output = await $`ls -la ./src`.text()
  console.log(output)
} catch (error) {
  console.error('Command failed:', error)
}

// CORRECT - Bun.spawn for more control
const proc = Bun.spawn(['ls', '-la'], {
  cwd: '/path/to/dir',
  stdout: 'pipe',
  stderr: 'pipe',
})

const stdout = await new Response(proc.stdout).text()
const exitCode = await proc.exited
```

### 4. Testing - bun:test

```typescript
// WRONG - Using Jest with Node compatibility
import { jest } from '@jest/globals'

// CORRECT - Native bun:test
import { describe, test, expect, beforeAll, afterAll, mock, spyOn } from 'bun:test'

describe('UserService', () => {
  let service: UserService

  beforeAll(() => {
    service = new UserService()
  })

  test('should create user', async () => {
    const user = await service.create({ name: 'Test', email: 'test@example.com' })

    expect(user).toBeDefined()
    expect(user.id).toBeString()
    expect(user.name).toBe('Test')
  })

  test('should throw on invalid email', async () => {
    await expect(
      service.create({ name: 'Test', email: 'invalid' })
    ).rejects.toThrow('Invalid email')
  })
})

// Mocking
const mockFetch = mock(() => Promise.resolve(new Response('{"ok":true}')))
globalThis.fetch = mockFetch

test('calls API', async () => {
  await callApi()
  expect(mockFetch).toHaveBeenCalledTimes(1)
})
```

### 5. Environment Variables

```typescript
// WRONG - Using process.env directly without validation
const port = process.env.PORT
const apiKey = process.env.API_KEY

// CORRECT - Bun.env with type-safe config
const config = {
  port: Number(Bun.env.PORT) || 8080,
  apiKey: Bun.env.API_KEY ?? '',
  isDev: Bun.env.NODE_ENV === 'development',
  dbUrl: Bun.env.DATABASE_URL ?? 'sqlite://./dev.db',
} as const

// CORRECT - With validation (see config-validator skill)
if (!Bun.env.API_KEY) {
  console.error('Missing required API_KEY environment variable')
  process.exit(1)
}
```

### 6. WebSocket - Elysia Pattern

```typescript
// WRONG - Manual WebSocket handling
Bun.serve({
  fetch(req, server) {
    if (req.url.endsWith('/ws')) {
      server.upgrade(req)
    }
  },
  websocket: {
    message(ws, msg) { /* ... */ },
  },
})

// CORRECT - Elysia WebSocket plugin
import { Elysia } from 'elysia'

interface WsData {
  userId: string
}

const app = new Elysia()
  .ws('/ws', {
    body: t.Object({
      type: t.String(),
      payload: t.Unknown(),
    }),
    open(ws) {
      console.log('Client connected:', ws.id)
    },
    message(ws, message) {
      // Type-safe message handling
      if (message.type === 'ping') {
        ws.send({ type: 'pong', timestamp: Date.now() })
      }
    },
    close(ws) {
      console.log('Client disconnected:', ws.id)
    },
  })
  .listen(8080)
```

### 7. Streaming Responses

```typescript
// WRONG - Loading entire response in memory
app.get('/large-file', async () => {
  const content = await Bun.file('./large.txt').text()
  return content
})

// CORRECT - Streaming with ReadableStream
app.get('/stream', () => {
  return new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 10; i++) {
        controller.enqueue(`data: ${JSON.stringify({ count: i })}\n\n`)
        await Bun.sleep(100)
      }
      controller.close()
    },
  })
})

// CORRECT - Server-Sent Events
app.get('/events', ({ set }) => {
  set.headers['Content-Type'] = 'text/event-stream'
  set.headers['Cache-Control'] = 'no-cache'
  set.headers['Connection'] = 'keep-alive'

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      for (let i = 0; i < 5; i++) {
        const event = `event: update\ndata: ${JSON.stringify({ id: i })}\n\n`
        controller.enqueue(encoder.encode(event))
        await Bun.sleep(1000)
      }
      controller.close()
    },
  })
})
```

### 8. Database - SQLite Native

```typescript
// WRONG - Using better-sqlite3 (Node.js binding)
import Database from 'better-sqlite3'

// CORRECT - Bun native SQLite
import { Database } from 'bun:sqlite'

const db = new Database('app.db')
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  )
`)

// Prepared statements (recommended)
const insertUser = db.prepare('INSERT INTO users (id, name, email) VALUES (?, ?, ?)')
const getUser = db.prepare('SELECT * FROM users WHERE id = ?')

insertUser.run(crypto.randomUUID(), 'Alice', 'alice@example.com')
const user = getUser.get('user-id')

// With Drizzle ORM
import { drizzle } from 'drizzle-orm/bun-sqlite'
const orm = drizzle(db)
```

### 9. Password Hashing - Bun Native

```typescript
// WRONG - Using bcrypt (slower, external dep)
import bcrypt from 'bcrypt'
const hash = await bcrypt.hash(password, 10)

// CORRECT - Bun native (faster, Argon2id)
const hash = await Bun.password.hash(password, {
  algorithm: 'argon2id',
  memoryCost: 65536,
  timeCost: 3,
})

const isValid = await Bun.password.verify(password, hash)
```

### 10. Graceful Shutdown

```typescript
// CORRECT - Handle shutdown signals
const app = new Elysia()
  .get('/', () => 'Hello')
  .listen(8080)

const cleanup = async () => {
  console.log('Shutting down...')
  // Close database connections
  // Finish pending requests
  // Cleanup resources
  app.stop()
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
```

## Checklist

- [ ] Use `Bun.file()` instead of fs module for file operations
- [ ] Use Elysia for HTTP servers (not raw `Bun.serve` for complex apps)
- [ ] Use `$` shell template for simple commands
- [ ] Use `Bun.spawn` for complex process control
- [ ] Use `bun:test` for testing (not Jest)
- [ ] Use `Bun.env` for environment variables
- [ ] Use `bun:sqlite` for SQLite (not better-sqlite3)
- [ ] Use `Bun.password` for hashing (not bcrypt)
- [ ] Handle graceful shutdown with SIGINT/SIGTERM
- [ ] Use streaming for large responses
- [ ] Validate request bodies with Elysia `t.Object`
- [ ] Use `--bun` flag when running scripts: `bun --bun script.ts`

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `fs.readFile` | Slower than Bun native | Use `Bun.file().text()` |
| Raw `Bun.serve` | Manual routing, no validation | Use Elysia |
| `child_process.spawn` | Complex, verbose | Use `$` shell or `Bun.spawn` |
| Jest imports | Node.js overhead | Use `bun:test` |
| `process.env` without check | Undefined at runtime | Use `Bun.env` with validation |
| `bcrypt` | External dep, slower | Use `Bun.password` |
| Loading large files to memory | Memory issues | Use streaming |
| No shutdown handlers | Orphaned resources | Handle SIGINT/SIGTERM |

## Examples

### Complete Elysia Server

```typescript
// server/src/index.ts
import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'

const app = new Elysia()
  .use(cors())
  .use(swagger())
  .get('/health', () => ({ status: 'ok', timestamp: Date.now() }))
  .group('/api', (app) =>
    app
      .post(
        '/execute',
        async ({ body }) => {
          const result = await executePrompt(body.prompt)
          return { result }
        },
        {
          body: t.Object({
            prompt: t.String({ minLength: 1 }),
            options: t.Optional(
              t.Object({
                model: t.Optional(t.String()),
                maxTokens: t.Optional(t.Number()),
              })
            ),
          }),
        }
      )
      .get('/sessions', async () => {
        const sessions = await getSessions()
        return { sessions }
      })
  )
  .listen(Bun.env.PORT || 8080)

console.log(`Server running at http://localhost:${app.server?.port}`)

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...')
  app.stop()
  process.exit(0)
})

export type App = typeof app
```

### Test File Structure

```typescript
// server/src/services/user.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { UserService } from './user'

describe('UserService', () => {
  let service: UserService

  beforeEach(() => {
    service = new UserService()
  })

  test('create returns user with id', async () => {
    const user = await service.create({
      name: 'Test User',
      email: 'test@example.com',
    })

    expect(user.id).toBeString()
    expect(user.name).toBe('Test User')
    expect(user.email).toBe('test@example.com')
  })

  test('findById returns null for missing user', async () => {
    const user = await service.findById('nonexistent')
    expect(user).toBeNull()
  })
})
```

### Configuration Loading

```typescript
// server/src/config.ts
interface Config {
  port: number
  apiKey: string
  databaseUrl: string
  isDev: boolean
}

export async function loadConfig(): Promise<Config> {
  // Try loading from file first
  const configFile = Bun.file('./config.json')
  if (await configFile.exists()) {
    const fileConfig = await configFile.json()
    return {
      port: fileConfig.port ?? 8080,
      apiKey: fileConfig.apiKey ?? Bun.env.API_KEY ?? '',
      databaseUrl: fileConfig.databaseUrl ?? 'sqlite://./app.db',
      isDev: fileConfig.isDev ?? Bun.env.NODE_ENV === 'development',
    }
  }

  // Fallback to environment variables
  return {
    port: Number(Bun.env.PORT) || 8080,
    apiKey: Bun.env.API_KEY ?? '',
    databaseUrl: Bun.env.DATABASE_URL ?? 'sqlite://./app.db',
    isDev: Bun.env.NODE_ENV === 'development',
  }
}
```

---

**Version**: 1.0
**Stack**: Bun 1.x, Elysia, TypeScript
