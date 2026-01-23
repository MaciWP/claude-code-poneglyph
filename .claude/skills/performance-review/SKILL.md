---
name: performance-review
description: |
  Performance audit patterns for identifying bottlenecks and optimization opportunities.
  Use when reviewing code for performance, memory leaks, or optimization.
  Keywords: performance, memory, optimization, bottleneck, slow, leak, profiling
for_agents: [reviewer]
---

# Performance Review Patterns

Performance audit checklist for TypeScript/Bun applications.

## When to Use

- Reviewing performance-critical code
- Investigating slow endpoints
- Checking for memory leaks
- Pre-production performance audit

## Common Performance Issues

### N+1 Query Problem

**Detection:**
```typescript
// BAD: N+1 queries
const users = await db.select().from(users)
for (const user of users) {
  user.posts = await db.select().from(posts).where(eq(posts.userId, user.id))
}

// GOOD: Single query with join
const usersWithPosts = await db
  .select()
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId))
```

### Synchronous Blocking

**Detection:**
```typescript
// BAD: Blocking I/O
const data = fs.readFileSync('large-file.json')

// GOOD: Async I/O
const data = await Bun.file('large-file.json').json()
```

### Memory Leaks

**Detection:**
```typescript
// BAD: Growing array without cleanup
const cache: unknown[] = []
app.get('/data', () => {
  cache.push(generateData()) // Never cleaned
  return cache
})

// GOOD: Bounded cache
const cache = new Map<string, { data: unknown; expiry: number }>()
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of cache) {
    if (value.expiry < now) cache.delete(key)
  }
}, 60000)
```

### Unbatched Operations

**Detection:**
```typescript
// BAD: Individual inserts
for (const item of items) {
  await db.insert(products).values(item)
}

// GOOD: Batch insert
await db.insert(products).values(items)
```

## Bun-Specific Optimizations

### File Operations

```typescript
// Prefer Bun.file() - lazy, efficient
const file = Bun.file('./data.json')
const content = await file.json()

// Avoid fs module when possible
// import { readFile } from 'fs/promises'
```

### HTTP Client

```typescript
// Bun's fetch is optimized
const response = await fetch(url)

// Use streaming for large responses
const reader = response.body?.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  process(value)
}
```

### Shell Commands

```typescript
// Prefer Bun.spawn over child_process
const proc = Bun.spawn(['command', 'arg'])
await proc.exited
```

## Database Performance

### Index Usage

```typescript
// Check for missing indexes on:
// - WHERE clause columns
// - JOIN columns
// - ORDER BY columns
// - Columns with high cardinality
```

### Query Optimization

```typescript
// BAD: Select all columns
const users = await db.select().from(users)

// GOOD: Select needed columns
const users = await db.select({
  id: users.id,
  name: users.name
}).from(users)
```

### Connection Pooling

```typescript
// Ensure connection pool configured
const pool = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
})
```

## API Performance

### Response Size

```typescript
// BAD: Large unbounded response
app.get('/all-data', () => db.select().from(data))

// GOOD: Paginated response
app.get('/data', ({ query }) => {
  const page = Number(query.page) || 1
  const limit = Math.min(Number(query.limit) || 20, 100)
  return db.select().from(data).limit(limit).offset((page - 1) * limit)
})
```

### Caching

```typescript
// Add caching for expensive operations
const cache = new Map<string, { data: unknown; expiry: number }>()

async function getCachedData(key: string, fetchFn: () => Promise<unknown>) {
  const cached = cache.get(key)
  if (cached && cached.expiry > Date.now()) {
    return cached.data
  }

  const data = await fetchFn()
  cache.set(key, { data, expiry: Date.now() + 60000 })
  return data
}
```

### Compression

```typescript
import { compression } from 'elysia-compress'

app.use(compression())
```

## Memory Management

### Avoid Large Objects in Memory

```typescript
// BAD: Load entire file
const allData = await Bun.file('huge.json').json()

// GOOD: Stream processing
const stream = Bun.file('huge.json').stream()
for await (const chunk of stream) {
  processChunk(chunk)
}
```

### WeakMap for Caching

```typescript
// For object-keyed caches that should be GC'd
const metadata = new WeakMap<object, Metadata>()
```

### Clear Intervals/Timeouts

```typescript
// Always clean up on shutdown
const intervals: NodeJS.Timeout[] = []

function startBackgroundTask() {
  intervals.push(setInterval(task, 1000))
}

process.on('SIGTERM', () => {
  intervals.forEach(clearInterval)
})
```

## Performance Checklist

### Database

- [ ] No N+1 queries
- [ ] Indexes on frequently queried columns
- [ ] Batch operations used where possible
- [ ] Connection pooling configured
- [ ] Select only needed columns

### API

- [ ] Pagination on list endpoints
- [ ] Response compression enabled
- [ ] Caching for expensive operations
- [ ] Appropriate timeouts set

### Code

- [ ] No synchronous I/O in request handlers
- [ ] No memory leaks (growing collections)
- [ ] Streams used for large data
- [ ] Intervals/timeouts cleaned up

### Bun-Specific

- [ ] Using Bun.file() for file operations
- [ ] Using Bun.spawn() for commands
- [ ] Not importing unused Node.js modules

## Output Format

```markdown
## Performance Review: [Component]

### Critical Issues
- **N+1 Query**: `userService.ts:45`
  - Impact: O(n) queries instead of O(1)
  - Fix: Use JOIN or batch query

### High Impact
- **No Pagination**: `GET /api/posts` returns unbounded data
  - Impact: Memory/latency issues at scale
  - Fix: Add limit/offset pagination

### Medium Impact
- **No Caching**: Expensive computation repeated
  - File: `analytics.ts:120`
  - Fix: Add TTL cache

### Passed Checks
- ✅ Connection pooling configured
- ✅ Compression enabled
- ✅ No synchronous I/O
```

## Performance Metrics

| Metric | Target | Check |
|--------|--------|-------|
| API Response Time | < 200ms (p95) | Load test |
| Memory Growth | Stable over time | Monitor |
| DB Query Time | < 50ms | Query logs |
| Bundle Size | < 500KB | Build output |

---

**Version**: 1.0.0
**Spec**: SPEC-018
**For**: reviewer agent
