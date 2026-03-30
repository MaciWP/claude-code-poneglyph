# Index Strategy

Guidelines for when and how to create database indexes.

## Index Types

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

## When to Index

| Scenario | Index Type |
|----------|-----------|
| Columns in WHERE clauses | Simple or composite |
| Columns in JOIN conditions | Simple on FK columns |
| Columns in ORDER BY | Match sort order |
| Frequently filtered subsets | Partial index |
| Queries needing all columns from index | Covering index |
| Unique constraints | Unique index |

## When NOT to Index

| Scenario | Reason |
|----------|--------|
| Low-cardinality columns (boolean, status enum) | Query planner skips index when selectivity is too low |
| Tables with very few rows | Full scan is faster than index lookup |
| Write-heavy tables with rarely queried columns | Each index slows writes |
| Columns rarely used in WHERE/JOIN/ORDER | Index maintenance cost without benefit |
| Already covered by existing composite index | Redundant index wastes space |

## Composite Index Ordering Rules

| Rule | Detail |
|------|--------|
| Most selective column first | Column with most unique values leads |
| Equality before range | `WHERE status = 'active' AND created_at > ?` -> `(status, created_at)` |
| Match query pattern | Index column order must match query filter order |
| Leftmost prefix rule | `(a, b, c)` index serves queries on `(a)`, `(a, b)`, `(a, b, c)` but NOT `(b, c)` |

## Verifying Index Usage

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

## Index Maintenance

| Practice | Reason |
|----------|--------|
| Monitor index size vs table size | Bloated indexes slow queries |
| REINDEX periodically on high-churn tables | Reclaim space from dead tuples |
| Drop unused indexes | Reduce write overhead |
| Use EXPLAIN regularly | Verify indexes are actually used |
