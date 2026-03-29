---
name: security-review
description: "Skill de revision para seguridad basada en OWASP Top 10.\nUse when reviewing: codigo de autenticacion, manejo de input, auditorias de seguridad.\nKeywords - security, owasp, vulnerability, injection, xss, csrf, audit, secrets, auth\n"
type: knowledge-base
disable-model-invocation: false
argument-hint: "[file-path or module]"
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
    - auth
for_agents: [reviewer, builder]
version: "2.0"
---

# Security Review Checklist

OWASP Top 10 based security audit. Language-agnostic patterns applicable to any stack.

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

- [ ] All user input validated with schema validation library
- [ ] File uploads validated (type, size, content)
- [ ] No raw SQL queries with string concatenation
- [ ] HTML output escaped/sanitized
- [ ] JSON parsing with error handling
- [ ] URL/path traversal prevention
- [ ] Regex DoS prevention (no catastrophic backtracking)

### Data Protection (6 items)

- [ ] Sensitive data encrypted at rest (AES-256)
- [ ] No secrets in source code or logs
- [ ] Environment files excluded from version control
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
| `eval(userInput)` | Critical | Code injection | Grep for `eval(` or equivalent |
| User input interpolated in SQL | Critical | SQL injection | Check string interpolation in queries |
| Raw user input in HTML output | Critical | XSS | Grep for unsanitized output |
| Shell exec with user input | Critical | Command injection | Grep for exec/spawn with variables |
| MD5 or SHA1 for passwords | High | Weak hashing | Grep for weak hash algorithms |
| Hardcoded secrets in source | High | Secret exposure | Grep for secrets in code |
| CORS allows all origins | High | Open CORS | Check CORS config |
| Session cookie without httpOnly | High | Session hijacking | Check cookie options |
| Sensitive data in log output | Medium | Data leak | Grep for sensitive vars in logs |
| HTTP URLs in production | Medium | MitM attack | Check for hardcoded URLs |
| No rate limiting on auth | Medium | Brute force | Check auth endpoints |
| JSON parsing without error handling | Low | DoS | Check error handling |

## Common Issues

### A01: Broken Access Control

**Problem**: Missing authorization checks allow unauthorized access.

**Detection**:
- Endpoints without auth middleware
- No ownership verification on resource access
- Role checks missing on admin operations

**BEFORE** (vulnerable):
```pseudocode
ENDPOINT GET /api/users/{id}:
    user = database.findUserById(id)
    RETURN user
    // Anyone can access any user's data — no auth check
```

**AFTER** (secure):
```pseudocode
ENDPOINT GET /api/users/{id}:
    IF currentUser IS NOT authenticated:
        THROW UnauthorizedError
    IF id != currentUser.id AND currentUser.role != "admin":
        THROW ForbiddenError("Cannot access other users")
    user = database.findUserById(id)
    RETURN user
```

### A02: Cryptographic Failures

**Problem**: Weak hashing or exposed secrets.

**Detection**:
- MD5, SHA1 used for passwords
- Hardcoded secrets in source code
- Unencrypted sensitive data

**BEFORE** (vulnerable):
```pseudocode
// Weak hashing — MD5 is trivially reversible
hash = MD5(password)

// Hardcoded secret — exposed in version control
JWT_SECRET = "my-secret-key"
```

**AFTER** (secure):
```pseudocode
// Strong hashing — use argon2id or bcrypt with cost >= 10
hash = hashPassword(password, algorithm="argon2id")

// Secret from environment variable
JWT_SECRET = environment.get("JWT_SECRET")
IF JWT_SECRET IS EMPTY OR length(JWT_SECRET) < 32:
    THROW Error("JWT_SECRET must be at least 32 characters")
```

### A03: Injection

**Problem**: Untrusted data interpreted as code/commands.

**Detection**:
- String concatenation in queries
- eval() or equivalent with user input
- Shell exec with user input

**BEFORE** (vulnerable):
```pseudocode
// SQL injection — user input interpolated into query
database.query("SELECT * FROM users WHERE id = '" + userId + "'")

// Command injection — unsanitized input passed to shell
shell.exec("git clone " + userUrl)

// Code injection — arbitrary code execution
evaluate(userProvidedCode)
```

**AFTER** (secure):
```pseudocode
// Parameterized query — input treated as data, not SQL
database.query("SELECT * FROM users WHERE id = ?", [userId])

// Validated command — allowlist pattern
IF userUrl DOES NOT MATCH pattern "^https://github.com/[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+.git$":
    THROW Error("Invalid repository URL")
safeClone(userUrl)

// Never evaluate user input — use safe alternatives like JSON parsing
result = parseJSON(userProvidedJson)
```

### A04: Insecure Design

**Problem**: Missing security controls at design level.

**Detection**:
- No rate limiting on auth endpoints
- No account lockout
- Insecure password reset flow

**BEFORE** (vulnerable):
```pseudocode
ENDPOINT POST /api/login:
    user = authenticate(body.email, body.password)
    RETURN { token: generateToken(user) }
    // No rate limiting — attacker can brute force passwords
```

**AFTER** (secure):
```pseudocode
// Apply rate limiting: max 5 attempts per minute per email
RATE_LIMIT(max=5, window="1m", keyBy=body.email)

ENDPOINT POST /api/login:
    attempts = getFailedAttempts(body.email)
    IF attempts >= 5:
        THROW TooManyRequestsError("Account locked. Try again in 15 minutes.")

    user = authenticate(body.email, body.password)
    IF user IS NULL:
        incrementFailedAttempts(body.email)
        THROW UnauthorizedError("Invalid credentials")

    clearFailedAttempts(body.email)
    RETURN { token: generateToken(user) }
```

### A05: Security Misconfiguration

**Problem**: Insecure default configurations.

**Detection**:
- Open CORS
- Missing security headers
- Debug mode in production

**BEFORE** (vulnerable):
```pseudocode
// Open CORS — any origin can make requests
setCORS(origin="*")

// No security headers — browser protections disabled
server.start(port=3000)
```

**AFTER** (secure):
```pseudocode
// Restricted CORS — only trusted origins
setCORS(
    origin=["https://myapp.com"],
    credentials=true,
    methods=["GET", "POST", "PUT", "DELETE"]
)

// Security headers via middleware or server config
setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
setHeader("X-Frame-Options", "DENY")
setHeader("X-Content-Type-Options", "nosniff")
setHeader("Content-Security-Policy", "default-src 'self'")
```

### A06: Vulnerable Components

**Problem**: Using components with known vulnerabilities.

**Detection**:
- Outdated dependencies
- Known CVEs in packages
- Missing lock file

**Fix pattern**:
```pseudocode
// Regular security audits (use your package manager's audit command)
packageManager audit

// Update dependencies
packageManager update

// Use lock files and exact versions
packageManager install --frozen-lockfile
```

### A07: Authentication Failures

**Problem**: Weak authentication mechanisms.

**Detection**:
- Weak password requirements
- Predictable session tokens
- Missing session invalidation

**BEFORE** (vulnerable):
```pseudocode
// Predictable session — user ID as token
setCookie("session", toString(userId))

// Weak password requirements
IF length(password) >= 4:
    accept()
```

**AFTER** (secure):
```pseudocode
// Cryptographically random session token
sessionToken = generateCryptoRandomUUID()
setCookie("session", sessionToken,
    httpOnly=true,
    secure=true,
    sameSite="strict",
    maxAge=3600
)

// Strong password requirements
FUNCTION validatePassword(password):
    RETURN length(password) >= 12
        AND containsUppercase(password)
        AND containsLowercase(password)
        AND containsDigit(password)
        AND containsSpecialChar(password)
```

### A08: Data Integrity Failures

**Problem**: Trusting untrusted data without verification.

**Detection**:
- No signature verification
- Deserializing untrusted data
- Missing input validation

**BEFORE** (vulnerable):
```pseudocode
// No JWT verification — just decode and trust
payload = base64Decode(token.split(".")[1])

// Trusting client-submitted total
order = parseJSON(body.order)  // Client could manipulate price
```

**AFTER** (secure):
```pseudocode
// Verify JWT signature with secret
payload = verifyJWT(token, environment.get("JWT_SECRET"))

// Validate schema, then recalculate server-side
order = validateSchema(body, orderSchema)
order.total = calculateTotal(order.items)  // Never trust client-computed values
```

### A09: Logging Failures

**Problem**: Missing or insecure logging.

**Detection**:
- Sensitive data in logs
- Missing auth event logging
- Logs accessible publicly

**BEFORE** (vulnerable):
```pseudocode
// Sensitive data in logs — password and token exposed
log("Login attempt:", { email, password, token })

// No audit trail
createUser(userData)
```

**AFTER** (secure):
```pseudocode
// Safe logging — only non-sensitive fields
logger.info("Login attempt", {
    email: email,
    success: false,
    ip: request.ip,
    userAgent: request.userAgent
})

// Audit logging for security-relevant operations
createUser(userData)
logger.audit("user.created", {
    userId: user.id,
    createdBy: currentUser.id,
    timestamp: now()
})
```

### A10: SSRF (Server-Side Request Forgery)

**Problem**: Server makes requests to user-controlled URLs.

**Detection**:
- HTTP request with user-provided URL
- No URL validation
- Access to internal network

**BEFORE** (vulnerable):
```pseudocode
// User-controlled URL — can target internal services
data = httpGet(userProvidedUrl)

ENDPOINT GET /proxy:
    RETURN httpGet(query.url)  // Can reach internal network
```

**AFTER** (secure):
```pseudocode
ALLOWED_HOSTS = ["api.github.com", "api.stripe.com"]

ENDPOINT GET /proxy:
    url = parseURL(query.url)

    IF url.host NOT IN ALLOWED_HOSTS:
        THROW BadRequestError("Host not allowed")

    IF url.protocol != "https":
        THROW BadRequestError("HTTPS required")

    // Block internal/private IP addresses
    ip = dnsResolve(url.hostname)
    IF isPrivateIP(ip):
        THROW BadRequestError("Internal hosts not allowed")

    RETURN httpGet(url)
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
  - Line: `db.query("SELECT * FROM users WHERE id = '" + id + "'")`
  - Fix: Use parameterized query or ORM
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
- **A06 Components**: Outdated dependency with known CVE
  - Fix: Update dependency to latest version

### Passed Checks
- [x] Password hashing uses argon2id
- [x] CORS properly configured
- [x] JWT from environment variable
- [x] Input validation with schema library
```

---

**Version**: 2.0
**For**: reviewer agent
**Patterns**: Language-agnostic
