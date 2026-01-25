---
name: api-design
version: 1.0.0
keywords: [api, rest, openapi, swagger, endpoint, pagination, versioning, elysia, route]
for_agents: [builder, reviewer, architect]
description: Diseño de APIs REST con Elysia - convenciones, OpenAPI, paginación y errores.
---

# API Design Skill

## Cuándo Usar

Activar cuando el prompt contenga: api, rest, openapi, swagger, endpoint, pagination, versioning, route.

## REST Conventions

### HTTP Methods

| Method | Uso | Idempotente | Body |
|--------|-----|-------------|------|
| GET | Leer recurso(s) | Sí | No |
| POST | Crear recurso | No | Sí |
| PUT | Reemplazar recurso | Sí | Sí |
| PATCH | Actualizar parcial | No | Sí |
| DELETE | Eliminar recurso | Sí | No |

### Status Codes

| Código | Significado | Uso |
|--------|-------------|-----|
| 200 | OK | GET exitoso, PUT/PATCH exitoso |
| 201 | Created | POST exitoso |
| 204 | No Content | DELETE exitoso |
| 400 | Bad Request | Validación fallida |
| 401 | Unauthorized | Sin autenticación |
| 403 | Forbidden | Sin permisos |
| 404 | Not Found | Recurso no existe |
| 409 | Conflict | Conflicto (ej: duplicado) |
| 422 | Unprocessable | Semánticamente inválido |
| 500 | Server Error | Error interno |

### URL Naming

```
✅ Correcto:
GET    /api/users           # Lista usuarios
GET    /api/users/:id       # Usuario específico
POST   /api/users           # Crear usuario
PUT    /api/users/:id       # Reemplazar usuario
PATCH  /api/users/:id       # Actualizar usuario
DELETE /api/users/:id       # Eliminar usuario
GET    /api/users/:id/posts # Posts del usuario

❌ Incorrecto:
GET    /api/getUsers
POST   /api/createUser
GET    /api/user/123/getPosts
DELETE /api/deleteUser/123
```

## Elysia Route Patterns

### Estructura Básica

```typescript
import { Elysia, t } from 'elysia';

const app = new Elysia()
  .get('/api/users', async () => {
    return await userService.findAll();
  })
  .get('/api/users/:id', async ({ params: { id } }) => {
    const user = await userService.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }, {
    params: t.Object({
      id: t.String()
    })
  })
  .post('/api/users', async ({ body, set }) => {
    const user = await userService.create(body);
    set.status = 201;
    return user;
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      name: t.String({ minLength: 1 })
    })
  });
```

### Validación con TypeBox

```typescript
import { t } from 'elysia';

// Schema reutilizable
const UserSchema = t.Object({
  email: t.String({ format: 'email' }),
  name: t.String({ minLength: 1, maxLength: 100 }),
  age: t.Optional(t.Number({ minimum: 0, maximum: 150 })),
});

const UserResponseSchema = t.Object({
  id: t.String(),
  email: t.String(),
  name: t.String(),
  createdAt: t.String(),
});

// Uso en endpoint
app.post('/api/users', handler, {
  body: UserSchema,
  response: {
    201: UserResponseSchema,
    400: ErrorSchema,
  }
});
```

### Grupos de Rutas

```typescript
import { Elysia } from 'elysia';

const userRoutes = new Elysia({ prefix: '/api/users' })
  .get('/', listUsers)
  .get('/:id', getUser)
  .post('/', createUser)
  .patch('/:id', updateUser)
  .delete('/:id', deleteUser);

const app = new Elysia()
  .use(userRoutes)
  .use(postRoutes);
```

## OpenAPI/Swagger

### Configuración Elysia

```typescript
import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';

const app = new Elysia()
  .use(swagger({
    documentation: {
      info: {
        title: 'My API',
        version: '1.0.0',
        description: 'API documentation'
      },
      tags: [
        { name: 'users', description: 'User operations' },
        { name: 'posts', description: 'Post operations' }
      ]
    },
    path: '/docs'
  }));
```

### Documentar Endpoints

```typescript
app.get('/api/users/:id', getUser, {
  detail: {
    summary: 'Get user by ID',
    description: 'Retrieves a single user by their unique identifier',
    tags: ['users'],
    responses: {
      200: { description: 'User found' },
      404: { description: 'User not found' }
    }
  },
  params: t.Object({
    id: t.String({ description: 'User ID' })
  }),
  response: UserResponseSchema
});
```

## Pagination

### Cursor-Based (Recomendado)

```typescript
interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

app.get('/api/posts', async ({ query }) => {
  const limit = Math.min(query.limit ?? 20, 100);
  const cursor = query.cursor;
  
  const posts = await db
    .select()
    .from(posts)
    .where(cursor ? gt(posts.id, cursor) : undefined)
    .orderBy(posts.id)
    .limit(limit + 1); // +1 para saber si hay más
  
  const hasMore = posts.length > limit;
  const data = hasMore ? posts.slice(0, -1) : posts;
  
  return {
    data,
    pagination: {
      cursor: data.length > 0 ? data[data.length - 1].id : null,
      hasMore,
      limit
    }
  };
}, {
  query: t.Object({
    cursor: t.Optional(t.String()),
    limit: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
  })
});
```

### Offset-Based

```typescript
interface OffsetPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

app.get('/api/users', async ({ query }) => {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 20, 100);
  const offset = (page - 1) * limit;
  
  const [data, [{ count }]] = await Promise.all([
    db.select().from(users).offset(offset).limit(limit),
    db.select({ count: sql`count(*)` }).from(users)
  ]);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit)
    }
  };
});
```

## Error Responses

### Formato Consistente

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Ejemplo
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "email": "Invalid email format",
      "name": "Required field"
    }
  }
}
```

### Custom Error Classes

```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }

  toJSON(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string>) {
    super('VALIDATION_ERROR', 'Validation failed', 400, details);
  }
}
```

### Error Handler Global

```typescript
app.onError(({ code, error, set }) => {
  if (error instanceof AppError) {
    set.status = error.status;
    return error.toJSON();
  }
  
  // Error de validación de Elysia
  if (code === 'VALIDATION') {
    set.status = 400;
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: error.all
      }
    };
  }
  
  // Error interno
  console.error(error);
  set.status = 500;
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  };
});
```

## Versioning

### URL Path (Recomendado)

```typescript
const v1 = new Elysia({ prefix: '/api/v1' })
  .use(userRoutesV1);

const v2 = new Elysia({ prefix: '/api/v2' })
  .use(userRoutesV2);

app.use(v1).use(v2);
```

### Header-Based

```typescript
app.get('/api/users', ({ headers }) => {
  const version = headers['api-version'] ?? '1';
  
  if (version === '2') {
    return userServiceV2.findAll();
  }
  return userServiceV1.findAll();
});
```

## Checklist para Reviewer

- [ ] URLs siguen convenciones REST (sustantivos, plural)
- [ ] Status codes apropiados para cada operación
- [ ] Validación de input con schemas TypeBox
- [ ] Respuestas de error consistentes
- [ ] Paginación implementada para listas
- [ ] OpenAPI documentation configurada
- [ ] Manejo de errores centralizado
