---
name: security-review
description: |
  Skill de revision para seguridad basada en OWASP Top 10.
  Use when reviewing: codigo de autenticacion, manejo de input, auditorias de seguridad.
  Keywords - security, owasp, vulnerability, injection, xss, csrf, audit, secrets, auth
activation:
  keywords:
    - security
    - owasp
    - vulnerability
    - injection
    - xss
    - csrf
    - audit
    - secrets
for_agents: [reviewer]
version: "1.0"
---

# Security Review Checklist

OWASP Top 10 based security audit for TypeScript/Bun applications.

## When to Use

- Reviewing authentication/authorization code
- Auditing user input handling
- Checking for common vulnerabilities
- Pre-deployment security review
- Code that handles sensitive data (passwords, tokens, PII)
- API endpoints exposed to public internet
- File upload or download functionality

## Review Checklist

### Authentication (8 items)

- [ ] Passwords hashed with argon2id or bcrypt (cost >= 10)
- [ ] JWT secrets from environment variables (min 256 bits)
- [ ] Session tokens are cryptographically random
- [ ] Cookies set with httpOnly, secure, sameSite=strict
- [ ] Session invalidation on logout implemented
- [ ] Password reset tokens expire (< 1 hour)
- [ ] Account lockout after 5 failed attempts
- [ ] 2FA available for sensitive accounts

### Authorization (6 items)

- [ ] Every endpoint has auth middleware
- [ ] Resource ownership verified before access
- [ ] Role checks before sensitive operations
- [ ] No direct object references (IDOR)
- [ ] Admin routes protected with additional checks
- [ ] No privilege escalation paths

### Input Validation (7 items)

- [ ] All user input validated with schema (Zod/TypeBox)
- [ ] File uploads validated (type, size, content)
- [ ] No raw SQL queries with string concatenation
- [ ] HTML output escaped/sanitized (DOMPurify)
- [ ] JSON parsing with try/catch
- [ ] URL/path traversal prevention
- [ ] Regex DoS prevention (no catastrophic backtracking)

### Data Protection (6 items)

- [ ] Sensitive data encrypted at rest (AES-256)
- [ ] No secrets in source code or logs
- [ ] .env files in .gitignore
- [ ] Database credentials secure and rotated
- [ ] PII minimized and retention policies applied
- [ ] Secure deletion of sensitive data

### Headers & Configuration (6 items)

- [ ] HTTPS enforced (HSTS header)
- [ ] CORS restricted to specific origins
- [ ] CSP header configured
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Debug mode disabled in production

### Logging & Monitoring (5 items)

- [ ] Auth events logged (login, logout, failed attempts)
- [ ] Access control failures logged
- [ ] No sensitive data in logs (passwords, tokens, PII)
- [ ] Logs protected from tampering
- [ ] Alerting on suspicious activity

## Red Flags

| Pattern | Severity | Risk | Detection |
|---------|----------|------|-----------|
| `eval(userInput)` | Critical | Code injection | Grep for `eval\(` |
| `${userInput}` in SQL | Critical | SQL injection | Check string interpolation in queries |
| `innerHTML = userInput` | Critical | XSS | Grep for `innerHTML` |
| `exec(userInput)` | Critical | Command injection | Grep for `exec\(`, `spawn\(` with variables |
| `md5(password)` or `sha1` | High | Weak hashing | Grep for `createHash\(['"]md5` |
| `JWT_SECRET = "..."` | High | Hardcoded secret | Grep for secrets in code |
| `cors({ origin: '*' })` | High | Open CORS | Check CORS config |
| `cookie without httpOnly` | High | Session hijacking | Check cookie options |
| `console.log(password)` | Medium | Data leak | Grep for sensitive vars in logs |
| `http://` URLs in prod | Medium | MitM attack | Check for hardcoded URLs |
| No rate limiting | Medium | Brute force | Check auth endpoints |
| `JSON.parse` without try | Low | DoS | Check error handling |

## Common Issues

### A01: Broken Access Control

**Problem**: Missing authorization checks allow unauthorized access.

**Detection**:
- Endpoints without auth middleware
- No ownership verification on resource access
- Role checks missing on admin operations

**BEFORE**:
```typescript
// BAD: No authorization check
app.get('/api/users/:id', async ({ params }) => {
  return db.users.findById(params.id) // Anyone can access any user
})
```

**AFTER**:
```typescript
// GOOD: Check ownership and role
app.get('/api/users/:id', async ({ params, user }) => {
  if (!user) throw new UnauthorizedError()
  if (params.id !== user.id && user.role !== 'admin') {
    throw new ForbiddenError('Cannot access other users')
  }
  return db.users.findById(params.id)
})
```

### A02: Cryptographic Failures

**Problem**: Weak hashing or exposed secrets.

**Detection**:
- md5, sha1 for passwords
- Hardcoded secrets
- Unencrypted sensitive data

**BEFORE**:
```typescript
// BAD: Weak hashing
const hash = crypto.createHash('md5').update(password).digest('hex')

// BAD: Hardcoded secret
const JWT_SECRET = 'my-secret-key'
```

**AFTER**:
```typescript
// GOOD: Strong hashing with Bun
const hash = await Bun.password.hash(password, {
  algorithm: 'argon2id',
  memoryCost: 65536,
  timeCost: 3
})

// GOOD: Environment variable
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters')
}
```

### A03: Injection

**Problem**: Untrusted data interpreted as code/commands.

**Detection**:
- String concatenation in queries
- eval() or Function() with user input
- exec/spawn with user input

**BEFORE**:
```typescript
// BAD: SQL injection
db.query(`SELECT * FROM users WHERE id = '${userId}'`)

// BAD: Command injection
exec(`git clone ${userUrl}`)

// BAD: Code injection
eval(userProvidedCode)
```

**AFTER**:
```typescript
// GOOD: Parameterized query
db.select().from(users).where(eq(users.id, userId))

// GOOD: Validated command
const safeUrl = validateGitUrl(userUrl)
if (!safeUrl.match(/^https:\/\/github\.com\/[\w-]+\/[\w-]+\.git$/)) {
  throw new Error('Invalid repository URL')
}

// GOOD: Never eval user input - use safe alternatives
const result = JSON.parse(userProvidedJson)
```

### A04: Insecure Design

**Problem**: Missing security controls at design level.

**Detection**:
- No rate limiting on auth endpoints
- No account lockout
- Insecure password reset flow

**BEFORE**:
```typescript
// BAD: No rate limiting
app.post('/api/login', async ({ body }) => {
  const user = await authenticate(body.email, body.password)
  return { token: generateToken(user) }
})
```

**AFTER**:
```typescript
// GOOD: Rate limiting + account lockout
import { rateLimit } from 'elysia-rate-limit'

app.use(rateLimit({
  max: 5,
  duration: 60000,
  key: (req) => req.body.email
}))

app.post('/api/login', async ({ body }) => {
  const attempts = await getFailedAttempts(body.email)
  if (attempts >= 5) {
    throw new TooManyRequestsError('Account locked. Try again in 15 minutes.')
  }

  const user = await authenticate(body.email, body.password)
  if (!user) {
    await incrementFailedAttempts(body.email)
    throw new UnauthorizedError('Invalid credentials')
  }

  await clearFailedAttempts(body.email)
  return { token: generateToken(user) }
})
```

### A05: Security Misconfiguration

**Problem**: Insecure default configurations.

**Detection**:
- Open CORS
- Missing security headers
- Debug mode in production

**BEFORE**:
```typescript
// BAD: Open CORS
app.use(cors({ origin: '*' }))

// BAD: No security headers
app.listen(3000)
```

**AFTER**:
```typescript
// GOOD: Restricted CORS
app.use(cors({
  origin: ['https://myapp.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}))

// GOOD: Security headers
app.use((app) => {
  app.onResponse(({ set }) => {
    set.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    set.headers['X-Frame-Options'] = 'DENY'
    set.headers['X-Content-Type-Options'] = 'nosniff'
    set.headers['Content-Security-Policy'] = "default-src 'self'"
  })
})
```

### A06: Vulnerable Components

**Problem**: Using components with known vulnerabilities.

**Detection**:
- Outdated dependencies
- Known CVEs in packages
- Missing lock file

**BEFORE**:
```json
{
  "dependencies": {
    "lodash": "4.17.15"
  }
}
```

**AFTER**:
```bash
# Regular security audits
bun audit

# Update dependencies
bun update

# Use exact versions in lock file
bun install --frozen-lockfile
```

### A07: Authentication Failures

**Problem**: Weak authentication mechanisms.

**Detection**:
- Weak password requirements
- Predictable session tokens
- Missing session invalidation

**BEFORE**:
```typescript
// BAD: Weak session
cookie.set('session', String(userId)) // Predictable

// BAD: No password requirements
if (password.length >= 4) { /* valid */ }
```

**AFTER**:
```typescript
// GOOD: Secure session
cookie.set('session', crypto.randomUUID(), {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600
})

// GOOD: Strong password requirements
const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character')
```

### A08: Data Integrity Failures

**Problem**: Trusting untrusted data without verification.

**Detection**:
- No signature verification
- Deserializing untrusted data
- Missing input validation

**BEFORE**:
```typescript
// BAD: No JWT verification
const payload = JSON.parse(atob(token.split('.')[1]))

// BAD: Trusting client data
const order = JSON.parse(body.order) // Could be manipulated
```

**AFTER**:
```typescript
// GOOD: Verify JWT signature
import { verify } from 'jsonwebtoken'
const payload = verify(token, process.env.JWT_SECRET)

// GOOD: Validate and verify
const orderSchema = z.object({
  items: z.array(itemSchema),
  total: z.number()
})
const order = orderSchema.parse(body)
// Recalculate total server-side, don't trust client
order.total = calculateTotal(order.items)
```

### A09: Logging Failures

**Problem**: Missing or insecure logging.

**Detection**:
- Sensitive data in logs
- Missing auth event logging
- Logs accessible publicly

**BEFORE**:
```typescript
// BAD: Sensitive data logged
console.log('Login attempt:', { email, password, token })

// BAD: No audit logging
await createUser(userData)
```

**AFTER**:
```typescript
// GOOD: Safe logging
logger.info('Login attempt', {
  email,
  success: false,
  ip: request.ip,
  userAgent: request.headers['user-agent']
})

// GOOD: Audit logging
await createUser(userData)
logger.audit('user.created', {
  userId: user.id,
  createdBy: currentUser.id,
  timestamp: new Date().toISOString()
})
```

### A10: SSRF (Server-Side Request Forgery)

**Problem**: Server makes requests to user-controlled URLs.

**Detection**:
- fetch() with user-provided URL
- No URL validation
- Access to internal network

**BEFORE**:
```typescript
// BAD: User-controlled URL
const data = await fetch(userProvidedUrl)

// BAD: Internal URL access possible
app.get('/proxy', async ({ query }) => {
  return fetch(query.url)
})
```

**AFTER**:
```typescript
// GOOD: Validate URL against allowlist
const ALLOWED_HOSTS = ['api.github.com', 'api.stripe.com']

app.get('/proxy', async ({ query }) => {
  const url = new URL(query.url)

  if (!ALLOWED_HOSTS.includes(url.host)) {
    throw new BadRequestError('Host not allowed')
  }

  if (url.protocol !== 'https:') {
    throw new BadRequestError('HTTPS required')
  }

  // Block internal IPs
  const ip = await dns.resolve(url.hostname)
  if (isPrivateIP(ip)) {
    throw new BadRequestError('Internal hosts not allowed')
  }

  return fetch(url.toString())
})
```

## Severity Levels

| Level | Definition | Response Time | Examples |
|-------|------------|---------------|----------|
| Critical | Active exploitation possible, immediate data breach risk | Immediate (< 4h) | SQL injection, RCE, auth bypass |
| High | Significant vulnerability, exploitation requires some effort | 24 hours | Weak hashing, open CORS with credentials, XSS |
| Medium | Limited impact or exploitation difficulty | 1 week | Missing rate limiting, info disclosure |
| Low | Minor issues, defense in depth | Next sprint | Missing security headers, verbose errors |

## Output Format

```markdown
## Security Review: [Component]

### Critical Issues
- **A03 Injection**: SQL injection in `userService.ts:45`
  - Line: `db.query(\`SELECT * FROM users WHERE id = '\${id}'\`)`
  - Fix: Use parameterized query with Drizzle ORM
  - CVSS: 9.8

### High Severity
- **A07 Auth**: Session not invalidated on logout
  - File: `auth.ts:120`
  - Fix: Clear session token on logout endpoint

### Medium Severity
- **A09 Logging**: Password logged in error handler
  - File: `error.ts:30`
  - Fix: Sanitize error objects before logging

### Low Severity
- **A06 Components**: Outdated dependency `lodash@4.17.15`
  - Fix: Run `bun update lodash`

### Passed Checks
- [x] Password hashing uses argon2id
- [x] CORS properly configured
- [x] JWT from environment variable
- [x] Input validation with Zod schemas
```

---

**Version**: 1.0
**Spec**: SPEC-020
**For**: reviewer agent
