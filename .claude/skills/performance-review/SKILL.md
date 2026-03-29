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
type: knowledge-base
disable-model-invocation: false
version: "2.0"
---

# Performance Review Patterns

Performance audit checklist. Language-agnostic patterns applicable to any stack.

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
- [ ] Weak references for object-keyed caches (when available)
- [ ] Intervals/timeouts cleared on shutdown
- [ ] Event listeners removed when not needed
- [ ] Large objects released after use
- [ ] No closure memory leaks

### Async Patterns (6 items)

- [ ] No synchronous I/O in request handlers
- [ ] Parallel execution for independent operations
- [ ] No sequential await in loops (use parallel + map)
- [ ] Proper error handling doesn't block
- [ ] Background tasks don't block response
- [ ] Streaming instead of buffering large data

### Runtime-Specific (adapt to your stack)

- [ ] Using runtime-native file APIs when available
- [ ] Using runtime-native process spawning
- [ ] Using native WebSocket support when available
- [ ] Not importing unnecessary polyfills
- [ ] Using runtime-native database drivers when appropriate

## Red Flags

| Pattern | Severity | Impact | Detection |
|---------|----------|--------|-----------|
| Query inside a loop | Critical | O(n) queries, 100x slower | Grep for queries in loops |
| Synchronous I/O in request handler | Critical | Blocks all concurrent requests | Grep for sync file/network ops |
| Collection grows without limit | High | Memory leak, OOM crash | Check growing collections |
| `SELECT *` on large tables | High | Excess memory/bandwidth | Check query columns |
| No pagination on list API | High | Unbounded memory | Check list endpoints |
| Sequential await in loop | High | Total time = sum, not max | Check async patterns |
| Missing connection pool | High | Connection exhaustion | Check DB config |
| No response compression | Medium | 3-5x larger responses | Check middleware |
| Serializing large objects | Medium | CPU spike, blocks processing | Check serialization paths |
| Missing indexes | Medium | Full table scans | Check query plans |
| Regex with backtracking | Medium | ReDoS | Check complex regex |
| Debug logging in production | Low | I/O overhead | Grep for debug log calls |

## Common Issues

### N+1 Query Problem

**Problem**: Executing N additional queries for N items.

**Impact**: O(n) queries instead of O(1), exponential slowdown.

**Detection**: Query in a loop, lazy loading in iteration.

**BEFORE** (slow):
```pseudocode
// N+1 queries — 1 for users, N for posts
users = database.query("SELECT * FROM users")
FOR EACH user IN users:
    user.posts = database.query("SELECT * FROM posts WHERE user_id = ?", [user.id])
// 101 queries for 100 users!
```

**AFTER** (fast):
```pseudocode
// Option A: Single query with JOIN
usersWithPosts = database.query(
    "SELECT * FROM users LEFT JOIN posts ON users.id = posts.user_id"
)

// Option B: Two queries with batch loading
userList = database.query("SELECT * FROM users")
userIds = userList.map(u => u.id)
allPosts = database.query("SELECT * FROM posts WHERE user_id IN (?)", [userIds])

// Group posts by userId
postsByUser = groupBy(allPosts, "userId")
FOR EACH user IN userList:
    user.posts = postsByUser[user.id] OR []
// Only 2 queries regardless of user count!
```

### Synchronous Blocking

**Problem**: Synchronous I/O blocks the main thread / event loop.

**Impact**: All concurrent requests wait, throughput drops to 1.

**Detection**: Any synchronous file, network, or database call in a request handler.

**BEFORE** (slow):
```pseudocode
// Blocks entire server while reading file
ENDPOINT GET /file:
    data = readFileSync("large-file.json")
    RETURN parseJSON(data)
```

**AFTER** (fast):
```pseudocode
// Async file read — other requests can proceed during I/O
ENDPOINT GET /file:
    data = AWAIT readFileAsync("large-file.json")
    RETURN parseJSON(data)
```

### Memory Leaks - Growing Collections

**Problem**: Collections grow without bounds.

**Impact**: Memory exhaustion, OOM crash, GC pauses.

**Detection**: Maps/dictionaries/lists without cleanup, module-level state.

**BEFORE** (leaks):
```pseudocode
// Unbounded cache — grows forever
cache = new Map()

ENDPOINT GET /data/{id}:
    IF NOT cache.has(id):
        cache.set(id, AWAIT fetchData(id))
    RETURN cache.get(id)
// Cache grows forever — no eviction!
```

**AFTER** (bounded):
```pseudocode
// LRU cache with size limit and TTL
cache = new LRUCache(
    maxEntries=1000,
    ttl=5 minutes
)

ENDPOINT GET /data/{id}:
    data = cache.get(id)
    IF data IS NULL:
        data = AWAIT fetchData(id)
        cache.set(id, data)
    RETURN data
```

### Unbatched Operations

**Problem**: Individual database operations instead of batch.

**Impact**: N round trips instead of 1, network overhead.

**Detection**: Insert/update in loop.

**BEFORE** (slow):
```pseudocode
// 1000 individual inserts
FOR EACH item IN items:
    AWAIT database.insert("products", item)
// 1000 database round trips!
```

**AFTER** (fast):
```pseudocode
// Single batch insert
AWAIT database.batchInsert("products", items)
// 1 database round trip!

// For very large batches, chunk it
BATCH_SIZE = 1000
FOR i FROM 0 TO length(items) STEP BATCH_SIZE:
    chunk = items[i : i + BATCH_SIZE]
    AWAIT database.batchInsert("products", chunk)
```

### Sequential Await in Loop

**Problem**: Awaiting sequentially when operations are independent.

**Impact**: Total time = sum of all operations instead of max.

**Detection**: Await inside for/forEach/map loop.

**BEFORE** (slow):
```pseudocode
// Sequential — takes 10 seconds for 10 items (1s each)
results = []
FOR EACH url IN urls:
    response = AWAIT httpGet(url)         // 1 second each
    results.append(response.body)
```

**AFTER** (fast):
```pseudocode
// Parallel — takes 1 second for 10 items
results = AWAIT parallelAll(
    FOR EACH url IN urls:
        httpGet(url).then(response => response.body)
)

// With concurrency limit for rate-limited APIs
results = AWAIT parallelAll(
    FOR EACH url IN urls:
        withConcurrencyLimit(5, () => httpGet(url))
)
```

### Unbounded Response Size

**Problem**: Returning all records without pagination.

**Impact**: Memory exhaustion, timeout, slow response.

**Detection**: List endpoint without LIMIT.

**BEFORE** (slow):
```pseudocode
// Returns all records — could be millions of rows
ENDPOINT GET /api/users:
    RETURN database.query("SELECT * FROM users")
```

**AFTER** (fast):
```pseudocode
// Paginated with validation
ENDPOINT GET /api/users:
    page = max(1, query.page OR 1)
    limit = clamp(query.limit OR 20, min=1, max=100)

    data, countResult = AWAIT parallel(
        database.query("SELECT * FROM users LIMIT ? OFFSET ?", [limit, (page-1)*limit]),
        database.query("SELECT count(*) FROM users")
    )

    RETURN {
        data: data,
        pagination: {
            page: page,
            limit: limit,
            total: countResult,
            pages: ceil(countResult / limit)
        }
    }
```

### Missing Indexes

**Problem**: Queries perform full table scans.

**Impact**: O(n) instead of O(log n) lookups.

**Detection**: Slow queries, high CPU during queries.

**BEFORE** (slow):
```pseudocode
// No index on email column — full table scan on every login
database.query("SELECT * FROM users WHERE email = ?", [email])
```

**AFTER** (fast):
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

Define indexes in your ORM schema alongside table definitions (syntax varies by ORM).

### Large Object Serialization

**Problem**: Serializing large objects blocks CPU.

**Impact**: Main thread blocked, all requests delayed.

**Detection**: Large objects in response, slow endpoint.

**BEFORE** (slow):
```pseudocode
// Serialize entire dataset at once — blocks CPU for large data
ENDPOINT GET /export:
    allData = AWAIT database.query("SELECT * FROM data")
    RETURN serialize(allData)  // Blocks for large datasets
```

**AFTER** (fast):
```pseudocode
// Stream large responses — process one row at a time
ENDPOINT GET /export:
    stream = createResponseStream()
    stream.write("[")
    first = true

    FOR EACH row IN database.streamQuery("SELECT * FROM data"):
        IF NOT first:
            stream.write(",")
        stream.write(serialize(row))
        first = false

    stream.write("]")
    stream.close()
    RETURN stream
```

### Missing Connection Pool

**Problem**: Creating new database connections per request.

**Impact**: Connection exhaustion, slow connection setup.

**Detection**: No pool configuration, connection errors under load.

**BEFORE** (slow):
```pseudocode
// New connection each request — expensive setup every time
ENDPOINT GET /data:
    connection = database.createConnection(connectionString)
    AWAIT connection.open()
    result = AWAIT connection.query("SELECT * FROM data")
    connection.close()
    RETURN result
```

**AFTER** (fast):
```pseudocode
// Connection pool — reuse connections across requests
pool = database.createPool(connectionString,
    maxConnections=20,
    idleTimeout=20s,
    connectTimeout=10s
)

ENDPOINT GET /data:
    RETURN AWAIT pool.query("SELECT * FROM data")
    // Connection automatically returned to pool
```

### Event Listener Leak

**Problem**: Adding event listeners without removing them.

**Impact**: Memory leak, duplicate handlers.

**Detection**: Listener added without corresponding removal.

**BEFORE** (leaks):
```pseudocode
// Listener added on every request — never removed!
ENDPOINT GET /stream:
    emitter.on("data", handleData)
    RETURN stream
```

**AFTER** (clean):
```pseudocode
// Proper cleanup when stream closes
ENDPOINT GET /stream:
    handler = (data) => handleData(data)
    emitter.on("data", handler)

    RETURN createStream(
        onClose: () => emitter.off("data", handler)
    )
```

## Runtime-Specific Optimizations

Use your runtime's native APIs when available for best performance:

| Operation | Principle | Guidance |
|-----------|-----------|----------|
| File I/O | Use native async file API | Prefer runtime-provided async readers over polyfills |
| HTTP client | Use native fetch with streaming | Use streaming body readers for large responses |
| Child processes | Use native process spawning | Use runtime-specific spawn API for subprocesses |
| WebSocket | Use native WS support | Prefer built-in WebSocket server over libraries |
| Database | Use native drivers | Use runtime-optimized database bindings |

## Severity Levels

| Level | Definition | Metric Impact | Examples |
|-------|------------|---------------|----------|
| Critical | System unusable, crashes | > 10x slowdown, OOM | Sync I/O in handlers, N+1 in loops, memory leak |
| High | Significant degradation | 3-10x slowdown | Missing pagination, no connection pool |
| Medium | Noticeable impact | 1.5-3x slowdown | Missing indexes, no compression |
| Low | Minor optimization | < 1.5x impact | Debug logging in prod, suboptimal caching |

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
- **Debug Logging**: Debug statements in production
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

**Version**: 2.0
**For**: reviewer agent
**Patterns**: Language-agnostic
