# Schema Review Checklist

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
