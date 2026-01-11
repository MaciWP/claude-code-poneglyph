---
name: bun-best-practices
description: Patterns and best practices for Bun runtime development, including file ops, servers, testing, and spawn usage.
---

# Bun Best Practices Skill

Patterns and best practices for Bun runtime development.

## Triggers

Keywords: Bun, runtime, test, serve, file, spawn, $, shell

## Bun-Specific APIs

### 1. File Operations

```typescript
// Reading files - Bun.file() is lazy, efficient
const file = Bun.file('./config.json')
const content = await file.text()
const json = await file.json()

// Writing files
await Bun.write('./output.txt', 'Hello World')
await Bun.write('./data.json', JSON.stringify(data))

// Check existence
if (await file.exists()) {
  // file exists
}
```

### 2. HTTP Server (Elysia preferred)

```typescript
// Using Elysia (recommended)
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .get('/api/health', () => ({ status: 'ok' }))
  .post('/api/data', ({ body }) => body, {
    body: t.Object({
      name: t.String(),
    })
  })
  .listen(3000)

// Native Bun.serve (simpler cases)
Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response('Hello')
  }
})
```

### 3. Shell Commands

```typescript
// Using Bun.spawn
const proc = Bun.spawn(['ls', '-la'], {
  cwd: '/path/to/dir',
  stdout: 'pipe',
})
const output = await new Response(proc.stdout).text()

// Using $ shell (preferred for scripts)
import { $ } from 'bun'

const result = await $`ls -la`.text()
await $`git add . && git commit -m "message"`.quiet()
```

### 4. Testing

```typescript
// test file: example.test.ts
import { describe, test, expect, beforeAll, mock } from 'bun:test'

describe('MyService', () => {
  beforeAll(() => {
    // setup
  })

  test('should do something', () => {
    expect(1 + 1).toBe(2)
  })

  test('async operation', async () => {
    const result = await someAsyncFunction()
    expect(result).toBeDefined()
  })
})

// Mocking
const mockFn = mock(() => 'mocked')
mockFn() // 'mocked'
expect(mockFn).toHaveBeenCalled()
```

### 5. Environment Variables

```typescript
// Access env vars
const apiKey = Bun.env.API_KEY
const port = Number(Bun.env.PORT || 3000)

// Type-safe env (recommended)
const env = {
  apiKey: Bun.env.API_KEY ?? '',
  port: Number(Bun.env.PORT) || 3000,
  isDev: Bun.env.NODE_ENV === 'development',
} as const
```

### 6. Child Processes

```typescript
// For Claude Code CLI integration
import { spawn } from 'child_process'

const claude = spawn('claude', ['-p', prompt], {
  cwd: workDir,
  shell: true,  // Required for Windows compatibility
  env: { ...process.env },
})

claude.stdout.on('data', (data: Buffer) => {
  console.log(data.toString())
})

await new Promise((resolve) => claude.on('close', resolve))
```

## Performance Tips

1. **Use Bun.file() for file operations** - More efficient than fs module
2. **Prefer native APIs** - Bun's built-ins are optimized
3. **Use --bun flag** - Ensures Bun runtime: `bun --bun script.ts`
4. **Leverage async** - Bun handles async exceptionally well

## Common Patterns

### Configuration Loading

```typescript
interface Config {
  port: number
  apiKey: string
}

async function loadConfig(): Promise<Config> {
  const file = Bun.file('./config.json')
  if (await file.exists()) {
    return file.json()
  }
  return {
    port: Number(Bun.env.PORT) || 8080,
    apiKey: Bun.env.API_KEY ?? '',
  }
}
```

### Graceful Shutdown

```typescript
process.on('SIGINT', async () => {
  console.log('Shutting down...')
  // cleanup
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Terminating...')
  // cleanup
  process.exit(0)
})
```
