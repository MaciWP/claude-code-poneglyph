---
name: logging-strategy
description: "Structured logging with context, log levels, and JSON output.\n\
  Use proactively when: setting up logging, adding request tracing, debugging production.\n\
  Keywords - log, logging, logger, structured, json logs, pino, contextual logging"
type: knowledge-base
disable-model-invocation: false
activation:
  keywords:
    - log
    - logging
    - logger
    - structured
    - json logs
    - pino
    - contextual logging
for_agents: [builder]
version: "1.1"
---

# Logging Strategy

Structured logging patterns with contextual information and production-ready output. Ejemplos adaptables a cualquier stack. Patterns son language-agnostic.

## When to Use This Skill

- Setting up application logging infrastructure
- Need structured JSON logs for production
- Implementing request tracing (request ID, correlation ID)
- Adding contextual logging (user ID, tenant ID)
- Integrating with log aggregation (ELK, Datadog, CloudWatch)
- Debugging issues in production
- Adding appropriate log levels to code

## Patterns

### 1. Basic Logger - Console vs Structured

```typescript
// WRONG - Plain console.log
console.log('User logged in')
console.log('Error:', error)
console.log('Processing request for user', userId)

// CORRECT - Structured logger with context
import { logger } from './logger'

logger.info('User logged in', { userId: 123, ip: '192.168.1.1' })
logger.error('Database connection failed', { error: error.message, retryCount: 3 })
logger.debug('Processing request', { userId, action: 'update_profile' })
```

### 2. Logger Implementation (adapt to your runtime's logger)

```
// Logger interface — implement with your runtime's preferred logger
// (pino, winston, console-based, or built-in runtime logger)

LogLevel = 'debug' | 'info' | 'warn' | 'error'

LogContext = {
  requestId?: string
  userId?: number | string
  [key: string]: unknown
}

// Key principles:
// - LOG_LEVEL from environment variable (default: 'info')
// - JSON output in production (machine-readable)
// - Pretty print in development (human-readable)
// - Child loggers with base context for request scoping
// - Level filtering: only log if level >= configured level

logger = {
  debug(message, context?)   // Verbose dev info
  info(message, context?)    // Important events
  warn(message, context?)    // Potential issues
  error(message, context?)   // Errors needing investigation
  child(baseContext) -> logger  // Scoped logger with inherited context
}
```

### 3. Request Context - Middleware Pattern (framework-agnostic)

```
// WRONG - No request context in logs
handler(request):
  log('Fetching user')       // No context
  user = getUser(request.id)
  log('Found user')          // Can't trace request

// CORRECT - Request-scoped logging middleware
handler(request):
  requestId = request.headers['x-request-id'] || generateUUID()
  log = logger.child({ requestId, method: request.method, path: request.path })

  log.info('Request started')
  try:
    result = processRequest(request)
    duration = now() - startTime
    log.info('Request completed', { statusCode: 200, durationMs: duration })
    return response(result, headers: { 'x-request-id': requestId })
  catch error:
    log.error('Request failed', { error: error.message, durationMs: duration })
    throw error
```

### 4. Log Levels - When to Use Each

```typescript
// WRONG - Everything is console.log
console.log('Starting server')
console.log('Warning: rate limit approaching')
console.log('Error: database connection failed')

// CORRECT - Appropriate log levels
// DEBUG: Verbose development info, not in production
logger.debug('Cache lookup', { key: 'user:123', hit: true, ttl: 300 })

// INFO: Important events that should be logged
logger.info('Server started', { port: 8080, env: 'production' })
logger.info('User created', { userId: 456, email: 'user@example.com' })
logger.info('Order placed', { orderId: 789, total: 99.99 })

// WARN: Potential issues that need attention
logger.warn('Rate limit approaching', { current: 95, limit: 100, userId: 123 })
logger.warn('Deprecated API used', { endpoint: '/v1/users', suggestUse: '/v2/users' })

// ERROR: Errors that need investigation
logger.error('Payment failed', { orderId: 789, reason: 'Card declined' })
logger.error('Database query failed', { query: 'SELECT...', error: error.message })
```

### 5. Sensitive Data - What NOT to Log

```typescript
// WRONG - Logging sensitive data
logger.info('User login', { email, password }) // NEVER log passwords
logger.info('Payment processed', { cardNumber }) // NEVER log card numbers
logger.info('API call', { apiKey }) // NEVER log API keys
logger.info('Token issued', { token }) // NEVER log tokens

// CORRECT - Log safely
logger.info('User login', { email, passwordProvided: !!password })
logger.info('Payment processed', { cardLast4: cardNumber.slice(-4) })
logger.info('API call', { apiKeyPrefix: apiKey.slice(0, 8) + '...' })
logger.info('Token issued', { tokenId: token.split('.')[0], expiresIn: '30m' })
```

### 6. Error Logging - Include Stack Traces

```typescript
// WRONG - Losing error details
try {
  await riskyOperation()
} catch (error) {
  logger.error('Operation failed') // No details
}

// CORRECT - Full error context
try {
  await riskyOperation()
} catch (error) {
  logger.error('Operation failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    operation: 'riskyOperation',
    input: { id: 123 }, // Safe input data only
  })
  throw error // Re-throw if needed
}
```

### 7. Performance Logging

```typescript
// WRONG - No timing information
logger.info('Query completed')

// CORRECT - Include duration
const start = performance.now()
const result = await db.query(sql)
const duration = performance.now() - start

logger.info('Query completed', {
  query: sql.slice(0, 100), // Truncate long queries
  rowCount: result.length,
  durationMs: Math.round(duration * 100) / 100,
  slow: duration > 1000, // Flag slow queries
})

// Helper function
async function timed<T>(
  operation: string,
  fn: () => Promise<T>,
  log = logger
): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    log.info(`${operation} completed`, {
      durationMs: Math.round((performance.now() - start) * 100) / 100,
    })
    return result
  } catch (error) {
    log.error(`${operation} failed`, {
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    throw error
  }
}

// Usage
const users = await timed('fetchUsers', () => db.users.findMany())
```

## Checklist

- [ ] Using structured logger (not console.log)
- [ ] JSON output in production
- [ ] Pretty output in development
- [ ] Request ID included in all request logs
- [ ] Appropriate log level for each message
- [ ] No sensitive data logged (passwords, tokens, cards)
- [ ] Error stack traces included
- [ ] Performance timing for slow operations
- [ ] Child loggers for request context
- [ ] LOG_LEVEL configurable via env var
- [ ] Correlation ID for cross-service tracing
- [ ] Log rotation configured (if file logging)

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `console.log` everywhere | No structure, levels, context | Use structured logger |
| Logging passwords | Security breach | Never log secrets |
| No request ID | Cannot trace requests | Add request context |
| All logs same level | Cannot filter | Use appropriate levels |
| No timestamps | Cannot correlate | Always include timestamp |
| Logging full objects | Performance, secrets | Log specific fields |
| No error stack | Cannot debug | Include error.stack |
| String concatenation | Breaks JSON structure | Use context objects |

## Examples

### JSON Output Example (Production)

```json
{
  "timestamp": "2025-01-24T10:30:45.123Z",
  "level": "info",
  "service": "api",
  "message": "Request completed",
  "requestId": "abc-123-def-456",
  "method": "POST",
  "path": "/api/users",
  "statusCode": 201,
  "durationMs": 45.23
}
```

### Development Output Example

```
[INFO] 2025-01-24T10:30:45.123Z Request started {"requestId":"abc-123","method":"POST","path":"/api/users"}
[INFO] 2025-01-24T10:30:45.168Z Request completed {"requestId":"abc-123","statusCode":201,"durationMs":45.23}
```

---

**Version**: 1.1
**Patterns**: Language-agnostic
