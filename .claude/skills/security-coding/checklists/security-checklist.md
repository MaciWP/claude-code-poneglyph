# Security Checklist

## Pre-Implementation

- [ ] Identify all user inputs and trust boundaries
- [ ] Define validation schemas (Zod) for every input
- [ ] Plan authentication flow (password hashing, JWT, sessions)
- [ ] Map authorization requirements (roles, ownership)
- [ ] List sensitive data that needs encryption at rest
- [ ] Verify environment variables are configured and validated

## During Implementation

### Input Handling
- [ ] All user input validated with Zod schema before processing
- [ ] Filenames sanitized (no path traversal)
- [ ] HTML output escaped for user content
- [ ] Rich HTML sanitized with DOMPurify (allowlist approach)

### Authentication
- [ ] Passwords hashed with argon2id (never md5/sha1/bcrypt)
- [ ] Failed lookups still hash to prevent timing attacks
- [ ] JWT secrets loaded from environment variables (min 32 chars)
- [ ] Access tokens expire in <= 15 minutes
- [ ] Refresh tokens expire in <= 7 days and are revocable

### Session Management
- [ ] Cookies set with httpOnly, secure, sameSite=strict
- [ ] Session revocation implemented
- [ ] Failed login attempts recorded and limited

### Authorization
- [ ] Role-based access control for every endpoint
- [ ] Resource ownership validated on every access
- [ ] Default deny (fail secure)

### Data Protection
- [ ] SQL queries use parameterized statements (never string concat)
- [ ] Sensitive data encrypted at rest with AES-256-GCM
- [ ] No secrets or sensitive data in logs or error responses
- [ ] Error messages are generic to users, detailed in logs

### OWASP
- [ ] CSRF tokens required on all state-changing requests
- [ ] Rate limiting applied to authentication endpoints
- [ ] Security headers set (CSP, HSTS, X-Frame-Options, etc.)
- [ ] Tokens use crypto.randomUUID() (never Math.random())

## Code Review

- [ ] No hardcoded secrets in source code
- [ ] No `any` types in security-critical code
- [ ] All catch blocks fail secure (default deny)
- [ ] Timing-safe comparisons for auth checks
- [ ] No sensitive data in URL parameters

## Anti-Patterns to Reject

| WRONG | CORRECT |
|-------|---------|
| `md5(password)` or `sha256(password)` | `Bun.password.hash()` with argon2id |
| `query("SELECT * WHERE id=" + id)` | Parameterized query with ORM |
| `innerHTML = userInput` | `textContent = userInput` or sanitize |
| `JWT_SECRET = "mysecret123"` | `Bun.env.JWT_SECRET` with 32+ chars |
| `console.log({ user, password })` | Never log sensitive data |
| `cookie.set({ value: token })` | Add httpOnly, secure, sameSite |
| `if (user.role === 'admin')` only | Also validate resource ownership |
| Returning full error stack to client | Generic message, log details server-side |
| Storing password in plain text | Always hash before storage |
| Using Math.random() for tokens | Use crypto.randomUUID() or crypto.randomBytes() |
