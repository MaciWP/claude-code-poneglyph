---
globs:
  - "**/db/**"
  - "**/database/**"
  - "**/drizzle/**"
priority: 10
skills:
  - database-patterns
  - typescript-patterns
keywords:
  - query
  - migration
  - schema
  - transaction
---

## Database Context

Capa de acceso a datos. Optimizar queries, usar transacciones, manejar migraciones.

- Usar transacciones para operaciones multi-tabla
- Evitar N+1 queries
- Indexar columnas usadas en WHERE/JOIN
- Validar schemas de migracion antes de aplicar
