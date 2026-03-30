# Migration Safety

Best practices for database migrations, rollback patterns, and FK ordering rules.

## Folder Structure

```
migrations/
  0001_initial.sql
  0002_add_posts.sql
  0003_add_user_avatar.sql
```

## Rollback Pattern

Every migration should have an UP and a DOWN:

```sql
-- UP: 0003_add_user_avatar.sql
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- DOWN: 0003_add_user_avatar_down.sql
ALTER TABLE users DROP COLUMN avatar_url;
```

## Migration Best Practices

| Practice | Reason |
|----------|--------|
| Never edit applied migrations | Already in production databases |
| Test rollbacks | Ensure DOWN works before deploying UP |
| Keep migrations small | Easier to debug failures |
| Use transactions when supported | Atomic migration application |
| Avoid data migrations in schema files | Separate schema from data transforms |

## FK Ordering Rules

| Operation | Order | Reason |
|-----------|-------|--------|
| CREATE tables | Parent first, then child | FK references must exist |
| DROP tables | Child first, then parent | Cannot drop referenced table |
| INSERT seed data | Parent first, then child | FK constraint check |
| DELETE seed data | Child first, then parent | FK constraint check |

## Safe Migration Workflow

1. **Write UP migration** with the schema change
2. **Write DOWN migration** immediately (not later)
3. **Test UP** on a copy of production data (not empty DB)
4. **Test DOWN** on the same copy to verify rollback
5. **Review** for data-dependent operations (column renames, type changes)
6. **Apply** in a maintenance window for destructive changes
7. **Monitor** for errors after application

## Dangerous Operations

| Operation | Risk | Mitigation |
|-----------|------|------------|
| DROP COLUMN | Data loss | Backup first, deprecate before dropping |
| RENAME COLUMN | App code breaks | Deploy app update first with dual-column support |
| ALTER TYPE | Lock + data loss | Create new column, migrate data, drop old |
| ADD NOT NULL | Fails on existing NULLs | Add nullable first, backfill, then add constraint |
| DROP TABLE | Data loss | Verify no references, backup first |
