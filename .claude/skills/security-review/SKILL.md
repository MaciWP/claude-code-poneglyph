---
name: security-review
description: |
  OWASP Top 10 based security audit for authentication, input handling, and vulnerability detection.
  Use when: CORS configuration, rate limiting, input sanitization, secrets in code, token storage, OWASP compliance, pre-deployment security check, auth code review.
  Keywords - security, owasp, vulnerability, injection, xss, csrf, audit, secrets, auth, CORS, rate limiting, input sanitization, token storage
type: knowledge-base
disable-model-invocation: false
argument-hint: "[file-path or module]"
effort: high
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

38 items across 6 categories: Authentication (8), Authorization (6), Input Validation (7), Data Protection (6), Headers & Configuration (6), Logging & Monitoring (5).

For the full deployment checklist, see `checklists/pre-deploy.md`.

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

## OWASP Top 10 Summary

| ID | Issue | Key Risk |
|----|-------|----------|
| A01 | Broken Access Control | Missing auth/ownership checks |
| A02 | Cryptographic Failures | Weak hashing, exposed secrets |
| A03 | Injection | SQL/command/code injection via user input |
| A04 | Insecure Design | No rate limiting, no lockout |
| A05 | Security Misconfiguration | Open CORS, missing headers |
| A06 | Vulnerable Components | Outdated deps with CVEs |
| A07 | Authentication Failures | Weak passwords, predictable tokens |
| A08 | Data Integrity Failures | No signature verification |
| A09 | Logging Failures | Sensitive data in logs |
| A10 | SSRF | User-controlled URLs to internal services |

For detailed patterns with detection methods and before/after examples, see `references/owasp-quick-ref.md`.

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

## Gotchas

| Gotcha | Why | Workaround |
|--------|-----|------------|
| Output encoding forgotten (sanitize input but render unsanitized output) | Input validation alone doesn't prevent stored XSS when data is rendered later | Sanitize at BOTH input validation AND output rendering |
| CORS `Access-Control-Allow-Origin: *` with credentials fails silently | Browsers reject wildcard origin when `credentials: true` is set | Use explicit origin, never wildcard with `credentials: true` |
| bcrypt rounds below 10 are brute-forceable on modern GPUs | Low cost factor makes hash computation too fast for attackers | Minimum 12 rounds for passwords, 10 absolute minimum |
| JWT stored in localStorage is XSS-vulnerable | Any XSS can read localStorage and exfiltrate tokens | Use httpOnly cookies for tokens, localStorage only for non-sensitive data |
| Rate limiting on proxy but not app server | Direct access to app server bypasses proxy rate limits | Apply rate limiting at application level too, not just reverse proxy |

## Scripts

| Script | Input | Output | Usage |
|--------|-------|--------|-------|
| `scripts/scan-secrets.ts` | file/dir path | JSON `{ findings, total }` | `bun .claude/skills/security-review/scripts/scan-secrets.ts <path>` |

---

**Version**: 2.0
**For**: reviewer agent
**Patterns**: Language-agnostic
