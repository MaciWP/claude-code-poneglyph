---
name: database-patterns
version: 1.0.0
keywords: [database, sql, drizzle, prisma, migration, transaction, query, orm, schema, index]
for_agents: [builder, reviewer]
description: Patrones de base de datos para SQL, Drizzle ORM, transacciones y optimización.
---

# Database Patterns Skill

## Cuándo Usar

Activar cuando el prompt contenga: database, sql, drizzle, prisma, migration, transaction, query, orm, schema, index.

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

| Tipo | Implementación Drizzle |
|------|------------------------|
| 1:1 | `references()` con unique |
| 1:N | `references()` en tabla hija |
| N:M | Tabla intermedia |

## Drizzle ORM Patterns

### Definición de Schema

```typescript
import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: integer('author_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Type-Safe Queries

```typescript
import { db } from './db';
import { users, posts } from './schema';
import { eq, and, gt, desc } from 'drizzle-orm';

// Select con filtros
const activeUsers = await db
  .select()
  .from(users)
  .where(eq(users.status, 'active'));

// Join
const userPosts = await db
  .select({
    userName: users.name,
    postTitle: posts.title,
  })
  .from(users)
  .innerJoin(posts, eq(users.id, posts.authorId))
  .where(gt(posts.createdAt, new Date('2024-01-01')));

// Insert returning
const [newUser] = await db
  .insert(users)
  .values({ email: 'test@example.com', name: 'Test' })
  .returning();
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

### Comandos

```bash
# Generar migración desde cambios en schema
bun drizzle-kit generate

# Aplicar migraciones pendientes
bun drizzle-kit migrate

# Push directo (desarrollo)
bun drizzle-kit push
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

### Implementación

```typescript
import { db } from './db';

// Transacción básica
await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({ email: 'new@example.com', name: 'New User' })
    .returning();
  
  await tx.insert(posts).values({
    title: 'Welcome Post',
    authorId: user.id,
  });
  
  // Si hay error, rollback automático
});

// Con manejo de errores explícito
try {
  await db.transaction(async (tx) => {
    // operaciones...
    if (someCondition) {
      throw new Error('Rollback needed');
    }
  });
} catch (error) {
  // Transacción ya hizo rollback
  console.error('Transaction failed:', error);
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

```typescript
// ❌ N+1 Problem
const users = await db.select().from(users);
for (const user of users) {
  const posts = await db.select().from(posts).where(eq(posts.authorId, user.id));
}

// ✅ Single Query con Join
const usersWithPosts = await db
  .select()
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId));

// ✅ Batch Loading
const userIds = users.map(u => u.id);
const allPosts = await db
  .select()
  .from(posts)
  .where(inArray(posts.authorId, userIds));
```

### Query Analysis

```sql
-- Analizar plan de ejecución
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Verificar uso de índices
EXPLAIN SELECT * FROM orders WHERE user_id = 1 AND created_at > '2024-01-01';
```

### Pagination Eficiente

```typescript
// ❌ Offset lento para páginas grandes
const page10 = await db.select().from(posts).offset(9000).limit(100);

// ✅ Cursor-based (keyset pagination)
const nextPage = await db
  .select()
  .from(posts)
  .where(gt(posts.id, lastSeenId))
  .orderBy(posts.id)
  .limit(100);
```

## Checklist para Reviewer

- [ ] Schema normalizado apropiadamente
- [ ] Índices en columnas de búsqueda frecuente
- [ ] Transacciones para operaciones múltiples
- [ ] N+1 queries eliminados
- [ ] Migraciones con up/down
- [ ] Types correctos en Drizzle schema
