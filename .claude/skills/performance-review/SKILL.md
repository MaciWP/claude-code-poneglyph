---
name: performance-review
description: |
  Skill de revision para performance y optimizacion.
  Use when reviewing: codigo lento, memory leaks, queries N+1, bottlenecks.
  Keywords - performance, memory, optimization, bottleneck, slow, leak, profiling, n+1
activation:
  keywords:
    - performance
    - memory
    - optimization
    - bottleneck
    - slow
    - leak
    - profiling
    - n+1
    - latency
for_agents: [reviewer]
version: "1.0"
---

# Performance Review Patterns

Performance audit checklist for TypeScript/Bun applications.

## When to Use

- Reviewing performance-critical code
- Investigating slow endpoints (> 200ms p95)
- Checking for memory leaks
- Pre-production performance audit
- Database query optimization
- API response time analysis
- Memory usage growing over time

## Review Checklist

### Database (8 items)

- [ ] No N+1 queries (loops with individual queries)
- [ ] Indexes on WHERE, JOIN, ORDER BY columns
- [ ] Batch operations for bulk inserts/updates
- [ ] Connection pooling configured (max connections)
- [ ] Select only needed columns (no SELECT *)
- [ ] LIMIT on all list queries
- [ ] Transactions for multi-step operations
- [ ] Query execution plans analyzed for slow queries

### API Performance (7 items)

- [ ] Pagination on list endpoints (limit/offset or cursor)
- [ ] Response compression enabled (gzip/brotli)
- [ ] Caching for expensive/static operations
- [ ] Appropriate timeouts on external calls
- [ ] Streaming for large responses
- [ ] ETags for conditional requests
- [ ] Request deduplication for concurrent identical calls

### Memory Management (7 items)

- [ ] No growing collections without bounds
- [ ] Streams used for large data processing
- [ ] WeakMap/WeakSet for object-keyed caches
- [ ] Intervals/timeouts cleared on shutdown
- [ ] Event listeners removed when not needed
- [ ] Large objects nullified after use
- [ ] No closure memory leaks

### Async Patterns (6 items)

- [ ] No synchronous I/O in request handlers
- [ ] Promise.all for independent parallel operations
- [ ] No await in loops (use Promise.all + map)
- [ ] Proper error handling doesn't block
- [ ] Background tasks don't block response
- [ ] Streaming instead of buffering large data

### Bun-Specific (5 items)

- [ ] Using Bun.file() for file operations
- [ ] Using Bun.spawn() for child processes
- [ ] Using Bun.serve() WebSocket for real-time
- [ ] Not importing unused Node.js polyfills
- [ ] Using Bun's native SQLite when appropriate

## Red Flags

| Pattern | Severity | Impact | Detection |
|---------|----------|--------|-----------|
| `for...await db.query` in loop | Critical | O(n) queries, 100x slower | Grep for queries in loops |
| `readFileSync` in handler | Critical | Blocks event loop | Grep for `Sync` functions |
| `Array.push` without limit | High | Memory leak | Check growing collections |
| `SELECT *` on large tables | High | Excess memory/bandwidth | Check query columns |
| No pagination on list API | High | Unbounded memory | Check list endpoints |
| `await` in forEach/map | High | Sequential instead of parallel | Check async patterns |
| Missing connection pool | High | Connection exhaustion | Check DB config |
| No response compression | Medium | 3-5x larger responses | Check middleware |
| `JSON.stringify` large objects | Medium | CPU spike | Check serialization |
| Missing indexes | Medium | Full table scans | Check query plans |
| Regex with backtracking | Medium | ReDoS | Check complex regex |
| Console.log in production | Low | I/O overhead | Grep for console.log |

## Common Issues

### N+1 Query Problem

**Problem**: Executing N additional queries for N items.

**Impact**: O(n) queries instead of O(1), exponential slowdown.

**Detection**: Query in a loop, lazy loading in iteration.

**BEFORE**:
```typescript
// BAD: N+1 queries - 1 for users, N for posts
const users = await db.select().from(users)
for (const user of users) {
  user.posts = await db.select().from(posts).where(eq(posts.userId, user.id))
}
// 101 queries for 100 users!
```

**AFTER**:
```typescript
// GOOD: Single query with join
const usersWithPosts = await db
  .select()
  .from(users)
  .leftJoin(posts, eq(users.id, posts.userId))

// OR: Two queries with batch loading
const userList = await db.select().from(users)
const userIds = userList.map(u => u.id)
const allPosts = await db.select().from(posts).where(inArray(posts.userId, userIds))

// Group posts by userId
const postsByUser = groupBy(allPosts, 'userId')
userList.forEach(u => u.posts = postsByUser[u.id] || [])
// Only 2 queries regardless of user count!
```

### Synchronous Blocking

**Problem**: Sync I/O blocks the event loop.

**Impact**: All concurrent requests wait, throughput drops to 1.

**Detection**: Any `*Sync` function in request path.

**BEFORE**:
```typescript
// BAD: Blocks entire server
app.get('/file', () => {
  const data = fs.readFileSync('large-file.json')
  return JSON.parse(data)
})
```

**AFTER**:
```typescript
// GOOD: Async with Bun's optimized file API
app.get('/file', async () => {
  const file = Bun.file('large-file.json')
  return file.json()
})
```

### Memory Leaks - Growing Collections

**Problem**: Collections grow without bounds.

**Impact**: Memory exhaustion, OOM crash, GC pauses.

**Detection**: Arrays/Maps without cleanup, module-level state.

**BEFORE**:
```typescript
// BAD: Unbounded cache growth
const cache: Map<string, unknown> = new Map()

app.get('/data/:id', async ({ params }) => {
  if (!cache.has(params.id)) {
    cache.set(params.id, await fetchData(params.id))
  }
  return cache.get(params.id)
})
// Cache grows forever!
```

**AFTER**:
```typescript
// GOOD: LRU cache with size limit and TTL
import { LRUCache } from 'lru-cache'

const cache = new LRUCache<string, unknown>({
  max: 1000,          // Max 1000 entries
  ttl: 1000 * 60 * 5, // 5 minute TTL
})

app.get('/data/:id', async ({ params }) => {
  let data = cache.get(params.id)
  if (!data) {
    data = await fetchData(params.id)
    cache.set(params.id, data)
  }
  return data
})
```

### Unbatched Operations

**Problem**: Individual database operations instead of batch.

**Impact**: N round trips instead of 1, network overhead.

**Detection**: Insert/update in loop.

**BEFORE**:
```typescript
// BAD: 1000 individual inserts
for (const item of items) {
  await db.insert(products).values(item)
}
// 1000 database round trips!
```

**AFTER**:
```typescript
// GOOD: Single batch insert
await db.insert(products).values(items)
// 1 database round trip!

// For very large batches, chunk it
const BATCH_SIZE = 1000
for (let i = 0; i < items.length; i += BATCH_SIZE) {
  await db.insert(products).values(items.slice(i, i + BATCH_SIZE))
}
```

### Sequential Await in Loop

**Problem**: Awaiting sequentially when operations are independent.

**Impact**: Total time = sum of all operations instead of max.

**Detection**: await inside for/forEach/map.

**BEFORE**:
```typescript
// BAD: Sequential - takes 10 seconds for 10 items
const results = []
for (const url of urls) {
  const result = await fetch(url) // 1 second each
  results.push(await result.json())
}
```

**AFTER**:
```typescript
// GOOD: Parallel - takes 1 second for 10 items
const results = await Promise.all(
  urls.map(async (url) => {
    const response = await fetch(url)
    return response.json()
  })
)

// With concurrency limit for rate limiting
import pLimit from 'p-limit'
const limit = pLimit(5) // Max 5 concurrent

const results = await Promise.all(
  urls.map((url) => limit(async () => {
    const response = await fetch(url)
    return response.json()
  }))
)
```

### Unbounded Response Size

**Problem**: Returning all records without pagination.

**Impact**: Memory exhaustion, timeout, slow response.

**Detection**: List endpoint without LIMIT.

**BEFORE**:
```typescript
// BAD: Returns all records
app.get('/api/users', async () => {
  return db.select().from(users)
})
// Could return millions of rows!
```

**AFTER**:
```typescript
// GOOD: Paginated with validation
app.get('/api/users', async ({ query }) => {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(Math.max(1, Number(query.limit) || 20), 100)

  const [data, countResult] = await Promise.all([
    db.select().from(users).limit(limit).offset((page - 1) * limit),
    db.select({ count: sql`count(*)` }).from(users)
  ])

  return {
    data,
    pagination: {
      page,
      limit,
      total: countResult[0].count,
      pages: Math.ceil(countResult[0].count / limit)
    }
  }
})
```

### Missing Indexes

**Problem**: Queries perform full table scans.

**Impact**: O(n) instead of O(log n) lookups.

**Detection**: Slow queries, high CPU during queries.

**BEFORE**:
```typescript
// Missing index on email column
await db.select().from(users).where(eq(users.email, email))
// Full table scan on every login!
```

**AFTER**:
```sql
-- Add index for frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

```typescript
// In Drizzle schema
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
}))
```

### Large Object Serialization

**Problem**: JSON.stringify on large objects blocks CPU.

**Impact**: Event loop blocked, all requests delayed.

**Detection**: Large objects in response, slow endpoint.

**BEFORE**:
```typescript
// BAD: Serialize entire object graph
app.get('/export', async () => {
  const allData = await db.select().from(data)
  return JSON.stringify(allData) // Blocks for large data
})
```

**AFTER**:
```typescript
// GOOD: Stream large responses
app.get('/export', async () => {
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue('[')
      let first = true

      for await (const row of db.select().from(data).stream()) {
        if (!first) controller.enqueue(',')
        controller.enqueue(JSON.stringify(row))
        first = false
      }

      controller.enqueue(']')
      controller.close()
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### Missing Connection Pool

**Problem**: Creating new database connections per request.

**Impact**: Connection exhaustion, slow connection setup.

**Detection**: No pool configuration, connection errors under load.

**BEFORE**:
```typescript
// BAD: New connection each time
app.get('/data', async () => {
  const client = new Client(connectionString)
  await client.connect()
  const result = await client.query('SELECT * FROM data')
  await client.end()
  return result.rows
})
```

**AFTER**:
```typescript
// GOOD: Connection pool
import postgres from 'postgres'

const sql = postgres(connectionString, {
  max: 20,              // Max connections
  idle_timeout: 20,     // Close idle connections after 20s
  connect_timeout: 10,  // Connection timeout 10s
})

app.get('/data', async () => {
  return sql`SELECT * FROM data`
})
```

### Event Listener Leak

**Problem**: Adding event listeners without removing them.

**Impact**: Memory leak, duplicate handlers.

**Detection**: addEventListener without removeEventListener.

**BEFORE**:
```typescript
// BAD: Listener added on every request
app.get('/stream', ({ params }) => {
  emitter.on('data', handleData) // Never removed!
  return stream
})
```

**AFTER**:
```typescript
// GOOD: Proper cleanup
app.get('/stream', ({ params }) => {
  const handler = (data) => handleData(data)
  emitter.on('data', handler)

  // Clean up on close
  return new Response(
    new ReadableStream({
      cancel() {
        emitter.off('data', handler)
      }
    })
  )
})
```

## Bun-Specific Optimizations

### File Operations

```typescript
// GOOD: Bun's lazy file API
const file = Bun.file('./data.json')
const content = await file.json()
const text = await file.text()
const buffer = await file.arrayBuffer()

// Streaming large files
const stream = file.stream()
for await (const chunk of stream) {
  process(chunk)
}
```

### HTTP Client

```typescript
// Bun's fetch is highly optimized
const response = await fetch(url)

// Use streaming for large responses
const reader = response.body?.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  await process(value)
}
```

### Child Processes

```typescript
// GOOD: Bun.spawn is faster
const proc = Bun.spawn(['command', 'arg'], {
  stdout: 'pipe',
  stderr: 'pipe',
})

const output = await new Response(proc.stdout).text()
await proc.exited
```

### WebSocket

```typescript
// GOOD: Bun's native WebSocket support
Bun.serve({
  fetch(req, server) {
    if (server.upgrade(req)) return
    return new Response('Not a WebSocket request', { status: 400 })
  },
  websocket: {
    message(ws, message) {
      ws.send(`Echo: ${message}`)
    },
  },
})
```

## Severity Levels

| Level | Definition | Metric Impact | Examples |
|-------|------------|---------------|----------|
| Critical | System unusable, crashes | > 10x slowdown, OOM | Sync I/O, N+1 in loops, memory leak |
| High | Significant degradation | 3-10x slowdown | Missing pagination, no connection pool |
| Medium | Noticeable impact | 1.5-3x slowdown | Missing indexes, no compression |
| Low | Minor optimization | < 1.5x impact | Console.log in prod, suboptimal caching |

## Performance Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| API Response Time (p95) | < 200ms | > 500ms | > 2s |
| API Response Time (p99) | < 500ms | > 1s | > 5s |
| Memory Usage | Stable | Growing 10%/hr | Growing 50%/hr |
| DB Query Time (p95) | < 50ms | > 100ms | > 500ms |
| Error Rate | < 0.1% | > 1% | > 5% |
| Throughput | Baseline | -20% | -50% |

## Output Format

```markdown
## Performance Review: [Component]

### Critical Issues
- **N+1 Query**: `userService.ts:45`
  - Impact: 101 queries instead of 2 (50x slowdown)
  - Measured: 2.5s vs 50ms expected
  - Fix: Use JOIN or batch query

### High Impact
- **No Pagination**: `GET /api/posts` returns unbounded data
  - Impact: OOM at scale, timeout for large datasets
  - Fix: Add limit/offset with max 100

### Medium Impact
- **No Caching**: Expensive computation repeated
  - File: `analytics.ts:120`
  - Impact: 500ms repeated computation
  - Fix: Add LRU cache with 5min TTL

### Low Impact
- **Console.log**: Debug statements in production
  - Files: Multiple
  - Fix: Use proper logger with level control

### Metrics Summary
| Endpoint | p95 Latency | Status |
|----------|-------------|--------|
| GET /users | 150ms | OK |
| GET /posts | 2.5s | Critical |
| POST /order | 300ms | Warning |

### Passed Checks
- [x] Connection pooling configured
- [x] Compression enabled
- [x] No synchronous I/O
- [x] Indexes on foreign keys
```

---

**Version**: 1.0
**Spec**: SPEC-020
**For**: reviewer agent
