# OWASP Security Checklist

Checklist de seguridad basado en OWASP Top 10 2021.

## A01: Broken Access Control

### Checklist

- [ ] Deny by default (except public resources)
- [ ] Implement access control once, reuse everywhere
- [ ] Enforce record ownership
- [ ] Disable directory listing
- [ ] Log access control failures
- [ ] Rate limit API access
- [ ] Invalidate JWT on logout

### Code Pattern

```typescript
// Good - Centralized access control
const authMiddleware = (requiredRole: Role) => {
  return ({ user, set }: Context) => {
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    if (!user.roles.includes(requiredRole)) {
      set.status = 403
      return { error: 'Forbidden' }
    }
  }
}

// Usage
app.get('/admin', handler, { beforeHandle: authMiddleware('admin') })
```

## A02: Cryptographic Failures

### Checklist

- [ ] Classify data (PII, credentials, health)
- [ ] Don't store sensitive data unnecessarily
- [ ] Encrypt data at rest
- [ ] Use strong algorithms (AES-256, RSA-2048+)
- [ ] Use authenticated encryption (GCM)
- [ ] Generate keys with crypto-safe RNG
- [ ] Hash passwords with Argon2/bcrypt

### Code Pattern

```typescript
// Good - Password hashing
import { hash, verify } from '@node-rs/argon2'

async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  })
}

async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return verify(hash, password)
}
```

## A03: Injection

### Checklist

- [ ] Use parameterized queries / ORM
- [ ] Validate input (allowlist)
- [ ] Escape output for context (HTML, JS, SQL)
- [ ] Use LIMIT in queries
- [ ] Avoid dynamic queries with user input

### Code Pattern

```typescript
// Good - Parameterized query
const user = await db
  .select()
  .from(users)
  .where(eq(users.id, userId)) // Parameterized
  .limit(1)

// Avoid - String interpolation
const user = await db.query(`SELECT * FROM users WHERE id = '${userId}'`) // SQL Injection!
```

## A04: Insecure Design

### Checklist

- [ ] Use secure design patterns
- [ ] Threat model for critical flows
- [ ] Unit and integration tests for security
- [ ] Segregate tenants
- [ ] Limit resource consumption

### Code Pattern

```typescript
// Good - Rate limiting
import { rateLimit } from 'elysia-rate-limit'

app.use(rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000 // 15 min
}))
```

## A05: Security Misconfiguration

### Checklist

- [ ] Remove default accounts
- [ ] Disable unnecessary features
- [ ] Review cloud permissions
- [ ] Send security headers
- [ ] Keep dependencies updated

### Code Pattern

```typescript
// Good - Security headers
app.onAfterHandle(({ set }) => {
  set.headers['X-Content-Type-Options'] = 'nosniff'
  set.headers['X-Frame-Options'] = 'DENY'
  set.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
  set.headers['Content-Security-Policy'] = "default-src 'self'"
})
```

## A06: Vulnerable Components

### Checklist

- [ ] Remove unused dependencies
- [ ] Inventory component versions
- [ ] Monitor CVE databases
- [ ] Use `bun audit` / `npm audit`
- [ ] Pin dependencies

## A07: Auth Failures

### Checklist

- [ ] Implement MFA
- [ ] No default credentials
- [ ] Weak password checks
- [ ] Limit failed login attempts
- [ ] Secure session management
- [ ] Use high-entropy session IDs

### Code Pattern

```typescript
// Good - Secure session
const sessionId = crypto.randomUUID() // High entropy

// Good - Login rate limiting
const loginLimiter = rateLimit({
  key: (req) => req.body.email,
  max: 5,
  windowMs: 15 * 60 * 1000,
  message: 'Too many login attempts'
})
```

## A08: Data Integrity Failures

### Checklist

- [ ] Verify digital signatures
- [ ] Use trusted repos/CDNs
- [ ] Review CI/CD pipeline security
- [ ] Ensure serialization integrity

### Code Pattern

```typescript
// Good - Verify JWT signature
import { verify } from 'jsonwebtoken'

function verifyToken(token: string): Payload {
  return verify(token, process.env.JWT_SECRET!, {
    algorithms: ['HS256'] // Explicit algorithm
  })
}
```

## A09: Logging Failures

### Checklist

- [ ] Log login, access control, input validation failures
- [ ] Sufficient context in logs
- [ ] Tamper-proof log storage
- [ ] Monitor for suspicious activity
- [ ] Don't log sensitive data

### Code Pattern

```typescript
// Good - Structured logging
logger.warn({
  event: 'login_failed',
  email: maskEmail(email),
  ip: req.ip,
  reason: 'invalid_password',
  timestamp: Date.now()
})
```

## A10: SSRF

### Checklist

- [ ] Validate and sanitize input URLs
- [ ] Allowlist URL schemas (https only)
- [ ] Disable redirects or validate them
- [ ] Don't send raw responses to clients

### Code Pattern

```typescript
// Good - URL validation
function isAllowedUrl(url: string): boolean {
  const parsed = new URL(url)
  const allowedHosts = ['api.example.com', 'cdn.example.com']
  return parsed.protocol === 'https:' && allowedHosts.includes(parsed.host)
}
```

## Quick Reference

| Vulnerability | Key Mitigation |
|---------------|----------------|
| Broken Access Control | RBAC, deny by default |
| Crypto Failures | Argon2, AES-GCM |
| Injection | Parameterized queries |
| Insecure Design | Threat modeling |
| Misconfiguration | Security headers |
| Vulnerable Components | Dependency audit |
| Auth Failures | MFA, rate limiting |
| Data Integrity | Signed tokens |
| Logging Failures | Structured logging |
| SSRF | URL allowlist |

## Sources

- [OWASP Top 10](https://owasp.org/Top10/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security)
