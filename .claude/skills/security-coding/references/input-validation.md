# Input Validation

Zod schemas and sanitization patterns for secure input handling.

## Schema Validation with Zod

```typescript
import { z } from 'zod'

// User registration schema
const registerSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  username: z.string()
    .min(3, 'Username too short')
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only alphanumeric and underscore'),
  age: z.number().int().min(13).max(120).optional(),
})

type RegisterInput = z.infer<typeof registerSchema>

function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.flatten()
    throw new ValidationError('Invalid input', errors)
  }
  return result.data
}

// Elysia integration
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .post('/register', ({ body }) => {
    const validated = validateInput(registerSchema, body)
    return registerUser(validated)
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 8 }),
      username: t.String({ minLength: 3, maxLength: 30 }),
      age: t.Optional(t.Number({ minimum: 13 }))
    })
  })
```

## Sanitization Functions

```typescript
import { escape } from 'html-escaper'
import DOMPurify from 'dompurify'

// Sanitize for HTML output (prevent XSS)
function sanitizeHtml(input: string): string {
  return escape(input)
}

// Sanitize rich HTML content (allow safe tags)
function sanitizeRichHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  })
}

// Sanitize filename (prevent path traversal)
function sanitizeFilename(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255)
}

// Sanitize for JSON output
function sanitizeForJson(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (typeof value === 'string') {
      return value.replace(/[<>]/g, '')
    }
    return value
  }))
}
```

## Double Validation Pattern

Use Elysia `t.Object` for request-level validation (fast reject) and Zod schemas for business-level validation (detailed errors):

```typescript
// Layer 1: Elysia rejects malformed requests
body: t.Object({
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 8 }),
})

// Layer 2: Zod validates business rules
const data = registerSchema.parse(body)
```
