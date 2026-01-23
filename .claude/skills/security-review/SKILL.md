---
name: security-review
description: |
  Security audit checklist based on OWASP Top 10.
  Use when reviewing code for security, auditing auth, or checking for vulnerabilities.
  Keywords: security, owasp, vulnerability, injection, xss, csrf, audit, secrets
for_agents: [reviewer]
---

# Security Review Checklist

OWASP Top 10 based security audit for TypeScript/Bun applications.

## When to Use

- Reviewing authentication/authorization code
- Auditing user input handling
- Checking for common vulnerabilities
- Pre-deployment security review

## OWASP Top 10 (2021)

### A01: Broken Access Control

**Check for:**
- [ ] Authorization on every endpoint
- [ ] No direct object reference (IDOR)
- [ ] Role checks before sensitive operations
- [ ] Ownership verification for resources

**Red Flags:**
```typescript
// BAD: No authorization check
app.get('/api/users/:id', async ({ params }) => {
  return db.users.findById(params.id) // Anyone can access any user
})

// GOOD: Check ownership
app.get('/api/users/:id', async ({ params, user }) => {
  if (params.id !== user.id && user.role !== 'admin') {
    throw new ForbiddenError()
  }
  return db.users.findById(params.id)
})
```

### A02: Cryptographic Failures

**Check for:**
- [ ] Passwords hashed with argon2/bcrypt (not md5/sha1)
- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enforced
- [ ] No secrets in code or logs

**Red Flags:**
```typescript
// BAD: Weak hashing
const hash = crypto.createHash('md5').update(password).digest('hex')

// GOOD: Strong hashing
const hash = await Bun.password.hash(password, { algorithm: 'argon2id' })
```

### A03: Injection

**Check for:**
- [ ] Parameterized SQL queries
- [ ] Input validated before use
- [ ] No eval() or Function() with user input
- [ ] Command injection prevention

**Red Flags:**
```typescript
// BAD: SQL injection
db.query(`SELECT * FROM users WHERE id = '${userId}'`)

// GOOD: Parameterized
db.select().from(users).where(eq(users.id, userId))

// BAD: Command injection
exec(`git clone ${userUrl}`)

// GOOD: Validate/sanitize
const safeUrl = validateGitUrl(userUrl)
```

### A04: Insecure Design

**Check for:**
- [ ] Rate limiting on sensitive endpoints
- [ ] Account lockout after failed attempts
- [ ] Secure password reset flow
- [ ] No security through obscurity

### A05: Security Misconfiguration

**Check for:**
- [ ] CORS properly configured
- [ ] Security headers set (CSP, X-Frame-Options)
- [ ] Debug mode disabled in production
- [ ] Default credentials changed

**Red Flags:**
```typescript
// BAD: Open CORS
app.use(cors({ origin: '*' }))

// GOOD: Restricted CORS
app.use(cors({ origin: ['https://myapp.com'] }))
```

### A06: Vulnerable Components

**Check for:**
- [ ] Dependencies up to date
- [ ] No known vulnerabilities (`bun audit`)
- [ ] Minimal dependencies
- [ ] Lock file committed

### A07: Authentication Failures

**Check for:**
- [ ] Strong password requirements
- [ ] Session invalidation on logout
- [ ] Secure session tokens
- [ ] 2FA available for sensitive accounts

**Red Flags:**
```typescript
// BAD: Weak session
cookie.set('session', userId) // Predictable

// GOOD: Random token
cookie.set('session', crypto.randomUUID(), {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
})
```

### A08: Data Integrity Failures

**Check for:**
- [ ] Input validation on all endpoints
- [ ] Signature verification on tokens
- [ ] Integrity checks on uploads
- [ ] No deserialization of untrusted data

### A09: Logging Failures

**Check for:**
- [ ] Auth events logged
- [ ] Access control failures logged
- [ ] No sensitive data in logs
- [ ] Logs protected from tampering

**Red Flags:**
```typescript
// BAD: Sensitive data logged
console.log('Login attempt:', { email, password })

// GOOD: Safe logging
logger.info('Login attempt', { email, success: false })
```

### A10: SSRF

**Check for:**
- [ ] URL validation before fetch
- [ ] No internal URL access
- [ ] Allowlist for external services

**Red Flags:**
```typescript
// BAD: User-controlled URL
const data = await fetch(userProvidedUrl)

// GOOD: Validate URL
const url = new URL(userProvidedUrl)
if (!allowedHosts.includes(url.host)) {
  throw new Error('Invalid host')
}
```

## Quick Security Audit

### Input Handling

- [ ] All user input validated with schema (Zod)
- [ ] File uploads validated (type, size)
- [ ] No raw SQL queries with string concatenation
- [ ] HTML output escaped/sanitized

### Authentication

- [ ] Passwords hashed with argon2id/bcrypt
- [ ] JWT secrets from environment
- [ ] Session tokens are random, not predictable
- [ ] Cookies: httpOnly, secure, sameSite

### Authorization

- [ ] Every endpoint has auth check
- [ ] Resource ownership verified
- [ ] Admin routes properly protected
- [ ] No privilege escalation paths

### Data Protection

- [ ] Sensitive data encrypted
- [ ] No secrets in source code
- [ ] .env files in .gitignore
- [ ] Database credentials secure

### Headers & Config

- [ ] HTTPS enforced
- [ ] CORS restricted
- [ ] CSP header set
- [ ] X-Frame-Options set

## Output Format

When reporting security issues:

```markdown
## Security Review: [Component]

### Critical Issues
- **A03 Injection**: SQL injection in `userService.ts:45`
  - Line: `db.query(\`SELECT * FROM users WHERE id = '\${id}'\`)`
  - Fix: Use parameterized query

### High Severity
- **A07 Auth**: Session not invalidated on logout
  - File: `auth.ts:120`
  - Fix: Clear session on logout

### Medium Severity
- **A09 Logging**: Password logged in error handler

### Low Severity
- **A06 Components**: Outdated dependency `lodash@4.17.15`

### Passed Checks
- ✅ Password hashing uses argon2id
- ✅ CORS properly configured
- ✅ JWT from environment
```

## Common Vulnerabilities Patterns

| Pattern | Risk | Detection |
|---------|------|-----------|
| `eval(userInput)` | Critical | Code injection |
| `${userInput}` in SQL | Critical | SQL injection |
| `innerHTML = userInput` | High | XSS |
| `md5(password)` | High | Weak hashing |
| `JWT_SECRET = "secret"` | High | Hardcoded secret |
| `cors({ origin: '*' })` | Medium | Open CORS |
| `console.log(password)` | Medium | Data leak |

---

**Version**: 1.0.0
**Spec**: SPEC-018
**For**: reviewer agent
