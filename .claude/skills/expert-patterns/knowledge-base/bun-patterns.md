# Bun Runtime Patterns

Best practices del runtime Bun extraidos de documentacion oficial y repos exitosos.

## File Operations

### Best Practice: Bun.file()

```typescript
// Good - Bun native API
const file = Bun.file("path/to/file")
const text = await file.text()
const json = await file.json()

// Avoid - Node.js compat
import { readFile } from 'fs/promises'
const text = await readFile("path", "utf-8")
```

**Source**: [Bun File I/O](https://bun.sh/docs/api/file-io)

### Best Practice: Bun.write()

```typescript
// Good - Atomic write
await Bun.write("output.txt", "content")
await Bun.write("data.json", JSON.stringify(data))

// Bun.write handles: strings, Blob, ArrayBuffer, Response
```

## Shell Commands

### Best Practice: Bun.spawn / $

```typescript
import { $ } from 'bun'

// Good - Shell template
const result = await $`ls -la ${directory}`.text()

// Good - Spawn with options
const proc = Bun.spawn(["git", "status"], {
  cwd: projectDir,
  stdout: "pipe"
})
const output = await new Response(proc.stdout).text()
```

**Source**: [Bun Shell](https://bun.sh/docs/runtime/shell)

## Testing

### Best Practice: bun:test

```typescript
import { describe, it, expect, mock, beforeEach } from 'bun:test'

describe('feature', () => {
  beforeEach(() => {
    // setup
  })

  it('should work', () => {
    expect(result).toBe(expected)
  })
})
```

### Mocking

```typescript
import { mock, spyOn } from 'bun:test'

// Mock function
const mockFn = mock(() => 'mocked')

// Spy on method
const spy = spyOn(object, 'method')
```

**Source**: [Bun Test](https://bun.sh/docs/cli/test)

## Environment Variables

### Best Practice: Bun.env

```typescript
// Good - Type-safe with validation
const PORT = Number(Bun.env.PORT) || 3000
const API_KEY = Bun.env.API_KEY ?? throwError('API_KEY required')

// Good - .env loading is automatic
// Bun loads .env, .env.local, .env.production automatically
```

## HTTP Server

### Best Practice: Bun.serve

```typescript
// Good - Native Bun server
Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello")
  }
})

// For Elysia - use Elysia framework instead
```

## Anti-Patterns

| Avoid | Use Instead | Reason |
|-------|-------------|--------|
| `fs/promises` | `Bun.file()` | Native, faster |
| `child_process` | `Bun.spawn` / `$` | Simpler API |
| `dotenv` | Automatic `.env` | Built-in |
| `jest` | `bun:test` | Native, faster |
| `node:http` | `Bun.serve` | Web standard |

## Performance Tips

| Tip | Example |
|-----|---------|
| Use streaming | `Bun.file().stream()` |
| Parallel I/O | `Promise.all([Bun.file(a), Bun.file(b)])` |
| SQLite native | `bun:sqlite` instead of better-sqlite3 |

## Sources

- [Bun Docs](https://bun.sh/docs)
- [Bun GitHub](https://github.com/oven-sh/bun)
- [Bun Examples](https://github.com/oven-sh/bun/tree/main/examples)
