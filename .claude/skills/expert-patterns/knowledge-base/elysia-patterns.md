# Elysia Framework Patterns

Best practices de Elysia extraidos de documentacion oficial y repos exitosos.

## Route Definition

### Best Practice: Chained Routes

```typescript
// Good - Method chaining
const app = new Elysia()
  .get('/users', getUsers)
  .post('/users', createUser)
  .get('/users/:id', getUserById)
```

### Best Practice: Group Routes

```typescript
// Good - Grouped by prefix
const app = new Elysia()
  .group('/api/v1', app => app
    .get('/users', getUsers)
    .post('/users', createUser)
  )
```

**Source**: [Elysia Route](https://elysiajs.com/essential/route)

## Validation

### Best Practice: TypeBox Schema

```typescript
import { t } from 'elysia'

// Good - Schema validation
app.post('/users', ({ body }) => createUser(body), {
  body: t.Object({
    email: t.String({ format: 'email' }),
    password: t.String({ minLength: 8 }),
    name: t.Optional(t.String())
  })
})
```

### Best Practice: Response Schema

```typescript
// Good - Typed response
app.get('/users/:id', getUser, {
  params: t.Object({ id: t.String() }),
  response: {
    200: t.Object({
      id: t.String(),
      email: t.String()
    }),
    404: t.Object({
      error: t.String()
    })
  }
})
```

**Source**: [Elysia Validation](https://elysiajs.com/essential/validation)

## Error Handling

### Best Practice: onError Hook

```typescript
// Good - Global error handler
app.onError(({ code, error, set }) => {
  if (code === 'VALIDATION') {
    set.status = 400
    return { error: 'Validation failed', details: error.message }
  }

  if (code === 'NOT_FOUND') {
    set.status = 404
    return { error: 'Not found' }
  }

  set.status = 500
  return { error: 'Internal server error' }
})
```

### Best Practice: Custom Errors

```typescript
import { error } from 'elysia'

// Good - Typed errors
app.get('/users/:id', ({ params }) => {
  const user = findUser(params.id)
  if (!user) return error(404, { message: 'User not found' })
  return user
})
```

## Plugins

### Best Practice: Plugin Pattern

```typescript
// Good - Reusable plugin
const authPlugin = new Elysia({ name: 'auth' })
  .derive(({ headers }) => ({
    user: verifyToken(headers.authorization)
  }))
  .macro(() => ({
    requireAuth: () => ({
      beforeHandle: ({ user }) => {
        if (!user) return error(401)
      }
    })
  }))

// Usage
app.use(authPlugin)
   .get('/protected', handler, { requireAuth: true })
```

**Source**: [Elysia Plugin](https://elysiajs.com/essential/plugin)

## State & Context

### Best Practice: Derive

```typescript
// Good - Derive context
app.derive(({ headers }) => ({
  requestId: headers['x-request-id'] ?? crypto.randomUUID()
}))
```

### Best Practice: State

```typescript
// Good - Shared state
app.state('db', database)
   .get('/users', ({ store }) => store.db.query('SELECT * FROM users'))
```

## WebSocket

### Best Practice: WS Handler

```typescript
app.ws('/chat', {
  body: t.Object({ message: t.String() }),
  open(ws) {
    ws.subscribe('chat')
  },
  message(ws, { message }) {
    ws.publish('chat', { user: ws.id, message })
  },
  close(ws) {
    ws.unsubscribe('chat')
  }
})
```

**Source**: [Elysia WebSocket](https://elysiajs.com/patterns/websocket)

## Anti-Patterns

| Avoid | Use Instead | Reason |
|-------|-------------|--------|
| No validation | TypeBox schemas | Type safety, auto-docs |
| Try/catch everywhere | onError hook | Centralized |
| Inline middleware | Plugins | Reusable |
| Manual CORS | @elysiajs/cors | Standard |
| Manual auth | Plugin + derive | Composable |

## Performance Tips

| Tip | Example |
|-----|---------|
| Compile once | `new Elysia().compile()` |
| Use derive | Context computed once |
| Stream large responses | Return `new Response(stream)` |
| Static routes | Avoid dynamic params when possible |

## Sources

- [Elysia Docs](https://elysiajs.com)
- [Elysia GitHub](https://github.com/elysiajs/elysia)
- [Elysia Examples](https://github.com/elysiajs/elysia/tree/main/example)
