---
name: database-patterns
description: |
  Database patterns for SQL, transactions, query optimization, and schema design. Language and ORM agnostic.
  Use when: schema design review, connection pool configuration, migration rollback safety, deadlock investigation, index optimization, query plan analysis, N+1 detection.
  Keywords - database, sql, migration, transaction, query, orm, schema, index, deadlock, connection pool, query plan
type: knowledge-base
disable-model-invocation: false
argument-hint: "[database type, query, or file path]"
effort: medium
activation:
  keywords:
    - database
    - sql
    - migration
    - transaction
    - query
    - orm
    - schema
    - index
    - normalization
    - acid
    - isolation
for_agents: [builder, reviewer]
version: "2.0.0"
paths:
  - "**/*.sql"
  - "**/migrations/**"
  - "**/models/**"
  - "**/schema*.ts"
  - "**/schema*.py"
---

# Database Patterns Skill

Universal database patterns. Language and ORM agnostic.

## When to Use

Activate when prompt contains: database, sql, migration, transaction, query, orm, schema, index, normalization, acid, isolation.

## Schema Design

### Normalization

| Normal Form | Rule | Example |
|-------------|------|---------|
| 1NF | Atomic values | No arrays in columns |
| 2NF | No partial dependencies | Separate tables for partial key deps |
| 3NF | No transitive dependencies | Eliminate redundancy |
| BCNF | Every determinant is a candidate key | Stricter 3NF |

### When to Denormalize

| Scenario | Reason | Trade-off |
|----------|--------|-----------|
| Read-heavy reporting | Avoid expensive joins | Write complexity increases |
| Caching layer | Pre-computed aggregates | Staleness risk |
| Event sourcing | Materialized views | Eventual consistency |

### Indexes

Index columns used in WHERE, JOIN, ORDER BY. Most selective column first in composites. Avoid over-indexing (slows writes).

For detailed index types, composite ordering rules, and EXPLAIN analysis, see `references/index-strategy.md`.

### Relationships

| Type | Implementation |
|------|----------------|
| 1:1 | Foreign key with UNIQUE constraint |
| 1:N | Foreign key on child table |
| N:M | Junction table with composite PK or surrogate key |

## Schema Definition

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

## Common Queries

```sql
-- Filtered select
SELECT * FROM users WHERE status = 'active';

-- Join
SELECT u.name, p.title
FROM users u
INNER JOIN posts p ON u.id = p.author_id
WHERE p.created_at > '2024-01-01';

-- Insert returning
INSERT INTO users (email, name) VALUES ('test@example.com', 'Test') RETURNING *;

-- Upsert (ON CONFLICT)
INSERT INTO users (email, name)
VALUES ('test@example.com', 'Test')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;
```

## Migrations

Every migration needs UP and DOWN. Never edit applied migrations. Keep migrations small and use transactions.

For detailed migration workflow, rollback patterns, FK ordering rules, and dangerous operations guide, see `references/migration-safety.md`.

## Transactions

### ACID Properties

| Property | Guarantee |
|----------|-----------|
| Atomicity | All or nothing |
| Consistency | Valid state transitions only |
| Isolation | Concurrent txns don't interfere |
| Durability | Committed data survives crashes |

### Transaction SQL

```sql
BEGIN;
  INSERT INTO users (email, name) VALUES ('new@example.com', 'New User') RETURNING id;
  -- use returned id
  INSERT INTO posts (title, author_id) VALUES ('Welcome Post', <returned_id>);
COMMIT;
-- On error: ROLLBACK
```

### Transaction Pseudocode (ORM)

```pseudocode
try:
  db.beginTransaction(tx =>
    user = tx.insert("users", { email: "new@example.com", name: "New User" })
    tx.insert("posts", { title: "Welcome Post", authorId: user.id })
  )
catch error:
  // transaction already rolled back automatically
  log("Transaction failed:", error)
```

### Isolation Levels

| Level | Dirty Reads | Non-Repeatable Reads | Phantom Reads |
|-------|-------------|----------------------|---------------|
| Read Uncommitted | Possible | Possible | Possible |
| Read Committed | No | Possible | Possible |
| Repeatable Read | No | No | Possible |
| Serializable | No | No | No |

### Choosing Isolation Level

| Use Case | Recommended Level |
|----------|------------------|
| General CRUD operations | Read Committed (default in most DBs) |
| Financial transactions | Serializable |
| Report generation | Repeatable Read or Snapshot |
| High-throughput, tolerant of stale reads | Read Committed |

## Query Optimization

### N+1 Prevention

```sql
-- N+1 Problem (BAD)
SELECT * FROM users;
-- Then for EACH user:
SELECT * FROM posts WHERE author_id = <user.id>;

-- Single query with JOIN (GOOD)
SELECT u.*, p.* FROM users u LEFT JOIN posts p ON u.id = p.author_id;

-- Batch loading (GOOD)
SELECT * FROM users;
SELECT * FROM posts WHERE author_id IN (<all_user_ids>);
```

### Query Analysis

```sql
-- Analyze execution plan
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Check index usage
EXPLAIN SELECT * FROM orders WHERE user_id = 1 AND created_at > '2024-01-01';
```

### EXPLAIN Output Indicators

| Indicator | Meaning | Action |
|-----------|---------|--------|
| Seq Scan | Full table scan | Add index on filter columns |
| Index Scan | Using index | Good |
| Nested Loop | Join strategy | Check join column indexes |
| High cost/rows | Expensive query | Optimize or add indexes |

### Efficient Pagination

```sql
-- Offset pagination (BAD for large offsets)
SELECT * FROM posts ORDER BY id OFFSET 9000 LIMIT 100;

-- Cursor/keyset pagination (GOOD)
SELECT * FROM posts WHERE id > <last_seen_id> ORDER BY id LIMIT 100;
```

### Pagination Trade-offs

| Method | Pros | Cons |
|--------|------|------|
| Offset | Simple, supports "jump to page" | Slow for large offsets, inconsistent with inserts |
| Cursor/Keyset | Fast regardless of position, consistent | No "jump to page", requires sortable column |

## Connection Management

| Practice | Reason |
|----------|--------|
| Use connection pooling | Avoid connection creation overhead |
| Set pool size limits | Prevent database overload |
| Handle connection timeouts | Graceful recovery from DB restarts |
| Close connections on shutdown | Prevent resource leaks |

## Checklist for Reviewer

10 items covering schema, indexes, transactions, N+1, migrations, queries, pooling, isolation, parameterization, and FK behavior.

For the full checklist, see `checklists/schema-review.md`.

## Gotchas

| Gotcha | Why | Workaround |
|--------|-----|------------|
| FK constraint order in migrations (child table created before parent) | Database rejects FK if referenced table doesn't exist yet | Always create parent tables first, drop child tables first in rollback |
| Index on low-cardinality column (e.g., boolean, status enum) often slower than table scan | Query planner skips index when selectivity is too low | Only index columns with high selectivity (>10% unique values) |
| `SELECT *` with ORM may trigger lazy-loading of all relations | ORM interprets wildcard as "load everything including relations" | Always specify explicit column selection or use `.select()` in ORM |
| Migration rollback tested in dev but fails in prod (data-dependent) | Empty tables rollback fine; millions of rows with constraints don't | Test rollbacks with production-like data volume, not empty tables |
| Transaction isolation level too high causes deadlocks under concurrency | SERIALIZABLE and REPEATABLE READ acquire more locks | Default to READ COMMITTED, only escalate when proven necessary |
