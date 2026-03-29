---
name: database-patterns
version: 2.0.0
keywords: [database, sql, migration, transaction, query, orm, schema, index, normalization, acid, isolation]
for_agents: [builder, reviewer]
description: Database patterns for SQL, transactions, query optimization, and schema design. Language and ORM agnostic.
type: knowledge-base
disable-model-invocation: false
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

```sql
-- Simple index for frequent lookups
CREATE INDEX idx_users_email ON users(email);

-- Composite index for multi-column queries
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Partial index for subsets
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- Covering index (all columns needed by query)
CREATE INDEX idx_posts_author_cover ON posts(author_id) INCLUDE (title, created_at);
```

### Index Guidelines

| Guideline | Detail |
|-----------|--------|
| Index columns in WHERE/JOIN/ORDER BY | Frequent filter/sort targets |
| Composite index column order matters | Most selective column first |
| Avoid over-indexing | Each index slows writes |
| Use EXPLAIN to verify usage | Ensure index is actually used |

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

### Folder Structure

```
migrations/
  0001_initial.sql
  0002_add_posts.sql
  0003_add_user_avatar.sql
```

### Migration Commands

Use your ORM or migration tool CLI. Common operations:

| Operation | Description |
|-----------|-------------|
| Generate | Create migration file from schema diff |
| Migrate | Apply pending migrations |
| Rollback | Revert last migration |
| Status | Show applied/pending migrations |

### Rollback Pattern

Every migration should have an UP and a DOWN:

```sql
-- UP: 0003_add_user_avatar.sql
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- DOWN: 0003_add_user_avatar_down.sql
ALTER TABLE users DROP COLUMN avatar_url;
```

### Migration Best Practices

| Practice | Reason |
|----------|--------|
| Never edit applied migrations | Already in production databases |
| Test rollbacks | Ensure DOWN works before deploying UP |
| Keep migrations small | Easier to debug failures |
| Use transactions when supported | Atomic migration application |
| Avoid data migrations in schema files | Separate schema from data transforms |

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

- [ ] Schema normalized appropriately (3NF minimum)
- [ ] Indexes on frequently queried columns (WHERE, JOIN, ORDER BY)
- [ ] Transactions for multi-statement operations
- [ ] N+1 queries eliminated (use JOINs or batch loading)
- [ ] Migrations have UP and DOWN
- [ ] EXPLAIN used for complex queries
- [ ] Connection pooling configured
- [ ] Appropriate isolation level for use case
- [ ] No raw user input in queries (use parameterized/prepared statements)
- [ ] Foreign keys with appropriate ON DELETE behavior
