# OWASP Top 10 Protection

Patterns to prevent the most common web application security vulnerabilities.

## SQL Injection Prevention

```typescript
// ALWAYS use parameterized queries
import { eq, and, sql } from 'drizzle-orm'

// CORRECT: Parameterized query
async function findUser(email: string) {
  return db.select()
    .from(users)
    .where(eq(users.email, email))
}

// CORRECT: Dynamic query with safe builder
async function searchUsers(filters: { name?: string; role?: string }) {
  const conditions = []
  if (filters.name) conditions.push(eq(users.name, filters.name))
  if (filters.role) conditions.push(eq(users.role, filters.role))

  return db.select()
    .from(users)
    .where(and(...conditions))
}

// WRONG: String concatenation (SQL Injection vulnerable)
// const query = `SELECT * FROM users WHERE email = '${email}'` // NEVER DO THIS
```

## XSS Prevention

```typescript
// Server-side: Escape all user content in responses
import { escape } from 'html-escaper'

function renderUserProfile(user: User): string {
  return `
    <div class="profile">
      <h1>${escape(user.name)}</h1>
      <p>${escape(user.bio)}</p>
    </div>
  `
}

// Client-side: Use textContent, not innerHTML
// CORRECT
element.textContent = userInput

// WRONG (XSS vulnerable)
// element.innerHTML = userInput // NEVER with user input
```

## CSRF Protection

```typescript
import { Elysia } from 'elysia'
import { csrf } from 'elysia-csrf'

const app = new Elysia()
  .use(csrf({
    cookieName: 'csrf_token',
    headerName: 'x-csrf-token',
    cookieOptions: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    }
  }))
```

## Rate Limiting

```typescript
import { Elysia } from 'elysia'

interface RateLimitConfig {
  windowMs: number
  max: number
}

const rateLimits = new Map<string, { count: number; resetAt: number }>()

function rateLimit(config: RateLimitConfig) {
  return ({ request }: { request: Request }) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const key = `${ip}:${request.url}`
    const now = Date.now()

    const entry = rateLimits.get(key)
    if (!entry || entry.resetAt < now) {
      rateLimits.set(key, { count: 1, resetAt: now + config.windowMs })
      return
    }

    if (entry.count >= config.max) {
      throw new TooManyRequestsError('Rate limit exceeded')
    }

    entry.count++
  }
}

// Apply to auth endpoints
app.post('/login', ({ body }) => login(body), {
  beforeHandle: [rateLimit({ windowMs: 60000, max: 5 })]
})
```

## Quick Reference

| Vulnerability | Prevention | Pattern |
|---------------|------------|---------|
| SQL Injection | Parameterized queries | ORM/query builder, never string concat |
| XSS (Reflected) | Output encoding | `escape()`, `textContent` |
| XSS (Stored) | Input sanitization + output encoding | DOMPurify + escape |
| CSRF | Token + SameSite cookie | `elysia-csrf` plugin |
| Broken Auth | Strong passwords + MFA | argon2id + session management |
| Sensitive Data Exposure | Encryption at rest + TLS | AES-256-GCM + HTTPS |
| Rate Limiting | Per-IP/per-user limits | Rate limit middleware on auth endpoints |
| Security Misconfiguration | Security headers | `X-Content-Type-Options`, CSP, HSTS |
| Insecure Deserialization | Schema validation | Zod schema before processing |
| Insufficient Logging | Audit trail | Log auth events, never log secrets |
