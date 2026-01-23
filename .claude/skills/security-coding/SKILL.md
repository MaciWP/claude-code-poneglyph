---
name: security-coding
description: |
  Secure coding practices for authentication, validation, and data handling.
  Use when writing auth, handling user input, storing sensitive data, or encrypting.
  Keywords: security, auth, validation, sanitize, jwt, password, encrypt, hash
for_agents: [builder]
---

# Security Coding Patterns

Secure coding practices for TypeScript/Bun applications.

## When to Use

- Writing authentication/authorization code
- Handling user input
- Storing or transmitting sensitive data
- Working with passwords, tokens, or secrets

## Input Validation

### Schema Validation with Zod

```typescript
import { z } from 'zod'

const userInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special char'),
  age: z.number().int().min(13).max(120).optional(),
})

function handleInput(raw: unknown) {
  const result = userInputSchema.safeParse(raw)
  if (!result.success) {
    throw new ValidationError(result.error.flatten())
  }
  return result.data
}
```

### Sanitization

```typescript
import { escape } from 'html-escaper'

function sanitizeForHtml(input: string): string {
  return escape(input)
}

function sanitizeForSql(input: string): string {
  return input.replace(/'/g, "''")
}
```

## Authentication

### Password Hashing (Bun Native)

```typescript
async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: 'argon2id',
    memoryCost: 65536,
    timeCost: 3,
  })
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash)
}
```

### JWT Handling

```typescript
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(Bun.env.JWT_SECRET)

async function createToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret)
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    throw new UnauthorizedError('Invalid token')
  }
}
```

### Session Cookies

```typescript
import { Elysia } from 'elysia'

app.post('/login', ({ cookie, body }) => {
  cookie.session.set({
    value: sessionId,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600,
  })
})
```

## Authorization

### Role-Based Access Control

```typescript
type Role = 'user' | 'admin' | 'moderator'

interface User {
  id: string
  role: Role
}

function requireRole(...allowedRoles: Role[]) {
  return (user: User) => {
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError('Insufficient permissions')
    }
  }
}

app.get('/admin', ({ user }) => {
  requireRole('admin')(user)
  return adminDashboard()
})
```

### Resource Ownership

```typescript
function requireOwnership(userId: string, resource: { ownerId: string }) {
  if (resource.ownerId !== userId) {
    throw new ForbiddenError('Not resource owner')
  }
}
```

## Data Protection

### Environment Variables

```typescript
const config = {
  jwtSecret: Bun.env.JWT_SECRET,
  dbUrl: Bun.env.DATABASE_URL,
  apiKey: Bun.env.API_KEY,
}

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET is required')
}
```

### Encryption

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function encrypt(text: string, key: Buffer): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

function decrypt(encrypted: string, key: Buffer): string {
  const data = Buffer.from(encrypted, 'base64')
  const iv = data.subarray(0, 16)
  const tag = data.subarray(16, 32)
  const content = data.subarray(32)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(content) + decipher.final('utf8')
}
```

## Common Vulnerabilities

### SQL Injection Prevention

```typescript
import { sql } from 'drizzle-orm'

const userId = request.params.id
const user = await db.select().from(users).where(eq(users.id, userId))
```

### XSS Prevention

```typescript
import DOMPurify from 'dompurify'

function renderUserContent(html: string): string {
  return DOMPurify.sanitize(html)
}
```

### CSRF Protection

```typescript
import { csrf } from 'elysia-csrf'

app.use(csrf())
```

## Security Checklist

Before completing security-sensitive code:

- [ ] All user input validated with Zod schema
- [ ] Passwords hashed with argon2id (not md5/sha1)
- [ ] JWT secrets from environment, not hardcoded
- [ ] Cookies are httpOnly, secure, sameSite
- [ ] SQL uses parameterized queries (no string concat)
- [ ] HTML output is escaped/sanitized
- [ ] CSRF tokens on state-changing requests
- [ ] Rate limiting on auth endpoints
- [ ] No secrets in logs or error messages
- [ ] Sensitive data encrypted at rest

## Anti-Patterns

| Avoid | Instead |
|-------|---------|
| `md5(password)` | `Bun.password.hash()` with argon2id |
| `query("SELECT * FROM users WHERE id=" + id)` | Parameterized query |
| `innerHTML = userInput` | `textContent` or sanitize |
| `JWT_SECRET = "mysecret"` | `Bun.env.JWT_SECRET` |
| `console.log(user.password)` | Never log sensitive data |

---

**Version**: 1.0.0
**Spec**: SPEC-018
**For**: builder agent
