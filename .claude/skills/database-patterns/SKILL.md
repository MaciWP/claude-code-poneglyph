---
name: database-patterns
version: 1.0.0
keywords: [database, sql, drizzle, prisma, migration, transaction, query, orm, schema, index]
for_agents: [builder, reviewer]
description: Patrones de base de datos para SQL, Drizzle ORM, transacciones y optimización.
type: knowledge-base
disable-model-invocation: false
---

# Database Patterns Skill

Ejemplos adaptables a cualquier stack. Patterns son language-agnostic.

## Cuándo Usar

Activar cuando el prompt contenga: database, sql, migration, transaction, query, orm, schema, index.

## Schema Design

### Normalización

| Forma Normal | Regla | Ejemplo |
|--------------|-------|---------|
| 1NF | Valores atómicos | No arrays en columnas |
| 2NF | Sin dependencias parciales | Separar tablas |
| 3NF | Sin dependencias transitivas | Eliminar redundancia |

### Índices

```sql
-- Índice simple para búsquedas frecuentes
CREATE INDEX idx_users_email ON users(email);

-- Índice compuesto para queries con múltiples columnas
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Índice parcial para subconjuntos
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';
```

### Relaciones

| Tipo | Implementación |
|------|----------------|
| 1:1 | Foreign key con unique constraint |
| 1:N | Foreign key en tabla hija |
| N:M | Tabla intermedia (junction table) |

## ORM Patterns

### Definición de Schema (pseudocode — adapt to your ORM)

```sql
-- Schema definition (SQL — universal)
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
  author_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Type-Safe Queries (ORM pseudocode)

```sql
-- Select con filtros
SELECT * FROM users WHERE status = 'active';

-- Join
SELECT u.name, p.title
FROM users u
INNER JOIN posts p ON u.id = p.author_id
WHERE p.created_at > '2024-01-01';

-- Insert returning
INSERT INTO users (email, name) VALUES ('test@example.com', 'Test') RETURNING *;
```

## Migrations

### Estructura de Archivos

```
drizzle/
├── 0000_initial.sql
├── 0001_add_posts.sql
└── meta/
    └── _journal.json
```

### Comandos (adapt to your ORM/migration tool)

```bash
# Generar migración desde cambios en schema
<orm-cli> generate

# Aplicar migraciones pendientes
<orm-cli> migrate

# Push directo (desarrollo)
<orm-cli> push
```

### Rollback Pattern

```typescript
// migrations/0002_add_column.ts
export async function up(db: Database) {
  await db.execute(sql`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
}

export async function down(db: Database) {
  await db.execute(sql`ALTER TABLE users DROP COLUMN avatar_url`);
}
```

## Transactions

### ACID Properties

| Propiedad | Garantía |
|-----------|----------|
| Atomicity | Todo o nada |
| Consistency | Estado válido |
| Isolation | Sin interferencia |
| Durability | Persistente |

### Implementación (pseudocode — adapt to your ORM/driver)

```sql
-- Transacción básica
BEGIN;
  INSERT INTO users (email, name) VALUES ('new@example.com', 'New User') RETURNING *;
  -- use returned user.id
  INSERT INTO posts (title, author_id) VALUES ('Welcome Post', <user.id>);
COMMIT;
-- Si hay error, ROLLBACK automático
```

```
// Generic transaction pattern (any language/ORM)
try {
  db.transaction((tx) => {
    user = tx.insert(users, { email: 'new@example.com', name: 'New User' })
    tx.insert(posts, { title: 'Welcome Post', authorId: user.id })
    // If error occurs, automatic rollback
  })
} catch (error) {
  // Transaction already rolled back
  log('Transaction failed:', error)
}
```

### Isolation Levels

| Nivel | Phantom Reads | Non-Repeatable | Dirty Reads |
|-------|---------------|----------------|-------------|
| Read Uncommitted | ✓ | ✓ | ✓ |
| Read Committed | ✓ | ✓ | ✗ |
| Repeatable Read | ✓ | ✗ | ✗ |
| Serializable | ✗ | ✗ | ✗ |

## Query Optimization

### N+1 Prevention

```sql
-- N+1 Problem (BAD)
SELECT * FROM users;
-- Then for EACH user:
SELECT * FROM posts WHERE author_id = <user.id>;

-- Single Query con Join (GOOD)
SELECT * FROM users LEFT JOIN posts ON users.id = posts.author_id;

-- Batch Loading (GOOD)
SELECT * FROM users;
SELECT * FROM posts WHERE author_id IN (<all_user_ids>);
```

### Query Analysis

```sql
-- Analizar plan de ejecución
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Verificar uso de índices
EXPLAIN SELECT * FROM orders WHERE user_id = 1 AND created_at > '2024-01-01';
```

### Pagination Eficiente

```sql
-- Offset lento para páginas grandes (BAD)
SELECT * FROM posts OFFSET 9000 LIMIT 100;

-- Cursor-based / keyset pagination (GOOD)
SELECT * FROM posts WHERE id > <last_seen_id> ORDER BY id LIMIT 100;
```

## Checklist para Reviewer

- [ ] Schema normalizado apropiadamente
- [ ] Índices en columnas de búsqueda frecuente
- [ ] Transacciones para operaciones múltiples
- [ ] N+1 queries eliminados
- [ ] Migraciones con up/down
- [ ] Types/schema correctos en ORM
