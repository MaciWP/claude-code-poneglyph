---
name: diagnostic-patterns
description: |
  Error diagnosis patterns for debugging complex issues.
  Use when analyzing errors, debugging, or investigating failures.
  Keywords: error, debug, diagnose, investigate, trace, log, stacktrace
for_agents: [error-analyzer]
---

# Diagnostic Patterns

Error diagnosis and debugging patterns for TypeScript/Bun applications.

## When to Use

- Analyzing error messages and stack traces
- Debugging complex failures
- Investigating intermittent issues
- Root cause analysis

## Error Analysis Framework

### 1. Categorize the Error

| Category | Indicators | Common Causes |
|----------|------------|---------------|
| **Syntax** | SyntaxError, Parse error | Typo, missing bracket |
| **Type** | TypeError, undefined is not | Null access, wrong type |
| **Runtime** | ReferenceError, RangeError | Logic error, boundary |
| **Network** | ECONNREFUSED, ETIMEDOUT | Service down, network |
| **Database** | Connection refused, constraint | DB issue, data integrity |
| **Auth** | 401, 403 | Token, permissions |
| **Business** | Custom error types | Application logic |

### 2. Extract Key Information

```typescript
interface ErrorDiagnosis {
  type: string
  message: string
  code?: string
  status?: number
  stack?: string[]
  context: {
    file?: string
    line?: number
    function?: string
    input?: unknown
  }
}

function diagnoseError(error: unknown): ErrorDiagnosis {
  if (error instanceof Error) {
    const stackLines = error.stack?.split('\n').slice(1) || []
    const firstFrame = stackLines[0]?.match(/at (.+) \((.+):(\d+):\d+\)/)

    return {
      type: error.constructor.name,
      message: error.message,
      code: (error as any).code,
      status: (error as any).status,
      stack: stackLines.slice(0, 5),
      context: {
        function: firstFrame?.[1],
        file: firstFrame?.[2],
        line: firstFrame?.[3] ? parseInt(firstFrame[3]) : undefined
      }
    }
  }
  return {
    type: 'Unknown',
    message: String(error),
    context: {}
  }
}
```

## Common Error Patterns

### TypeError: Cannot read property 'x' of undefined

**Diagnosis:**
```typescript
// Error
const name = user.profile.name // profile is undefined

// Investigation
console.log('user:', user)           // Check user object
console.log('profile:', user?.profile) // Check nested property

// Fix: Optional chaining + default
const name = user?.profile?.name ?? 'Unknown'
```

### ECONNREFUSED

**Diagnosis:**
```typescript
// Error: connect ECONNREFUSED 127.0.0.1:5432

// Investigation checklist:
// 1. Is the service running?
// 2. Is the port correct?
// 3. Is there a firewall?
// 4. Is the connection string correct?

// Debug
console.log('Database URL:', process.env.DATABASE_URL)
console.log('Attempting connection to:', host, port)
```

### Module not found

**Diagnosis:**
```typescript
// Error: Cannot find module './utils'

// Investigation:
// 1. Does the file exist?
// 2. Is the path correct (case-sensitive)?
// 3. Is the extension needed?
// 4. Is it in node_modules?

// Check
import { existsSync } from 'fs'
console.log('File exists:', existsSync('./utils.ts'))
```

## Debugging Strategies

### Binary Search

For intermittent issues, narrow down the cause:

```typescript
async function debugProcess(data: Data[]) {
  // Split data in half
  const mid = Math.floor(data.length / 2)
  const firstHalf = data.slice(0, mid)
  const secondHalf = data.slice(mid)

  console.log('Testing first half...')
  try {
    await process(firstHalf) // If this fails, problem is here
  } catch (e) {
    console.log('First half failed, narrowing down...')
    // Recurse on firstHalf
  }

  console.log('Testing second half...')
  // Continue narrowing
}
```

### Diff Debugging

When something that worked before fails:

```typescript
// 1. Find last working commit
// git bisect start
// git bisect bad HEAD
// git bisect good v1.0.0

// 2. Compare configurations
const currentConfig = loadConfig()
const lastWorkingConfig = loadConfig('backup')
console.log('Config diff:', diff(lastWorkingConfig, currentConfig))

// 3. Check environment differences
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('Database:', process.env.DATABASE_URL)
```

### Rubber Duck Debugging

Structured approach:

```markdown
## Problem Statement
What is the expected behavior?
What is the actual behavior?

## Reproduction Steps
1. Step one
2. Step two
3. Error occurs

## What I've Tried
- Attempt 1: [result]
- Attempt 2: [result]

## Hypotheses
1. [ ] Hypothesis A because...
2. [ ] Hypothesis B because...
```

## Logging for Diagnosis

### Structured Error Logging

```typescript
interface ErrorLog {
  timestamp: string
  level: 'error' | 'warn'
  error: {
    type: string
    message: string
    code?: string
    stack?: string
  }
  context: {
    requestId?: string
    userId?: string
    endpoint?: string
    input?: unknown
  }
  environment: {
    nodeVersion: string
    bunVersion: string
    platform: string
  }
}

function logError(error: Error, context: Record<string, unknown> = {}) {
  const log: ErrorLog = {
    timestamp: new Date().toISOString(),
    level: 'error',
    error: {
      type: error.constructor.name,
      message: error.message,
      code: (error as any).code,
      stack: error.stack
    },
    context,
    environment: {
      nodeVersion: process.version,
      bunVersion: Bun.version,
      platform: process.platform
    }
  }
  console.error(JSON.stringify(log, null, 2))
}
```

### Request Tracing

```typescript
function createRequestContext() {
  const requestId = crypto.randomUUID()

  return {
    requestId,
    log: (message: string, data?: unknown) => {
      console.log(JSON.stringify({
        requestId,
        timestamp: Date.now(),
        message,
        data
      }))
    },
    error: (error: Error, data?: unknown) => {
      logError(error, { requestId, ...data })
    }
  }
}
```

## Investigation Checklist

### Network Errors

- [ ] Is the target service running?
- [ ] Is the URL/host correct?
- [ ] Is DNS resolving correctly?
- [ ] Are there firewall rules blocking?
- [ ] Is there a proxy configured?
- [ ] Is SSL/TLS certificate valid?

### Database Errors

- [ ] Is the database server running?
- [ ] Is the connection string correct?
- [ ] Is the user/password valid?
- [ ] Is there a connection pool exhaustion?
- [ ] Is there a deadlock?
- [ ] Is the query correct?

### Application Errors

- [ ] What is the exact error message?
- [ ] What is the stack trace?
- [ ] Can it be reproduced consistently?
- [ ] What was the input that caused it?
- [ ] What changed recently?
- [ ] Does it happen in all environments?

## Output Format

```markdown
## Error Diagnosis

### Error Summary
| Field | Value |
|-------|-------|
| Type | TypeError |
| Message | Cannot read property 'name' of undefined |
| Location | `userService.ts:45` |
| Function | `getUserProfile()` |

### Root Cause Analysis
The `user.profile` object is undefined when the user has not completed
their profile setup. The code assumes profile always exists.

### Reproduction Steps
1. Create new user account
2. Call GET /api/profile before completing setup
3. Error occurs at line 45

### Recommended Fix
```typescript
// Before
const name = user.profile.name

// After
const name = user.profile?.name ?? 'Anonymous'
```

### Prevention
- Add null check for optional nested properties
- Update TypeScript types to reflect optionality
- Add integration test for new user flow
```

---

**Version**: 1.0.0
**Spec**: SPEC-018
**For**: error-analyzer agent
