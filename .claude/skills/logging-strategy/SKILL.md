---
name: logging-strategy
description: |
  Structured logging with context, log levels, and JSON output for Bun/Elysia apps.
  Use proactively when: setting up logging, adding request tracing, debugging production.
  Keywords - log, logging, logger, structured, json logs, pino, contextual logging
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
version: "1.0"
---

# Logging Strategy

Structured logging patterns for Bun/Elysia applications with contextual information and production-ready output.

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

### 2. Bun Native Logger (Zero Dependencies)

```typescript
// WRONG - External logging library for simple cases
import winston from 'winston' // Heavy, Node-focused

// CORRECT - Bun native logger
// logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  requestId?: string
  userId?: number
  [key: string]: unknown
}

const LOG_LEVEL = (Bun.env.LOG_LEVEL || 'info') as LogLevel
const IS_PRODUCTION = Bun.env.NODE_ENV === 'production'

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[LOG_LEVEL]
}

function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const data = { timestamp, level, message, ...context }

  if (IS_PRODUCTION) {
    // JSON for production (machine-readable)
    return JSON.stringify(data)
  }

  // Pretty print for development
  const colors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
  }
  const reset = '\x1b[0m'
  const ctx = context ? ` ${JSON.stringify(context)}` : ''
  return `${colors[level]}[${level.toUpperCase()}]${reset} ${timestamp} ${message}${ctx}`
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (shouldLog('debug')) console.log(formatLog('debug', message, context))
  },
  info: (message: string, context?: LogContext) => {
    if (shouldLog('info')) console.log(formatLog('info', message, context))
  },
  warn: (message: string, context?: LogContext) => {
    if (shouldLog('warn')) console.warn(formatLog('warn', message, context))
  },
  error: (message: string, context?: LogContext) => {
    if (shouldLog('error')) console.error(formatLog('error', message, context))
  },

  // Child logger with base context
  child: (baseContext: LogContext) => ({
    debug: (msg: string, ctx?: LogContext) => logger.debug(msg, { ...baseContext, ...ctx }),
    info: (msg: string, ctx?: LogContext) => logger.info(msg, { ...baseContext, ...ctx }),
    warn: (msg: string, ctx?: LogContext) => logger.warn(msg, { ...baseContext, ...ctx }),
    error: (msg: string, ctx?: LogContext) => logger.error(msg, { ...baseContext, ...ctx }),
  }),
}
```

### 3. Request Context - Elysia Middleware

```typescript
// WRONG - No request context in logs
app.get('/users/:id', async ({ params }) => {
  console.log('Fetching user') // No context
  const user = await getUser(params.id)
  console.log('Found user') // Can't trace request
  return user
})

// CORRECT - Request-scoped logging
import { Elysia } from 'elysia'
import { logger } from './logger'

export const loggingPlugin = new Elysia({ name: 'logging' })
  .derive(({ request }) => {
    const requestId = crypto.randomUUID()
    const startTime = performance.now()

    return {
      requestId,
      startTime,
      log: logger.child({
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
      }),
    }
  })
  .onBeforeHandle(({ log }) => {
    log.info('Request started')
  })
  .onAfterHandle(({ log, startTime, set }) => {
    const duration = performance.now() - startTime
    log.info('Request completed', {
      statusCode: set.status || 200,
      durationMs: Math.round(duration * 100) / 100,
    })
  })
  .onError(({ log, startTime, error }) => {
    const duration = performance.now() - startTime
    log.error('Request failed', {
      error: error.message,
      durationMs: Math.round(duration * 100) / 100,
    })
  })

// Usage
const app = new Elysia()
  .use(loggingPlugin)
  .get('/users/:id', ({ params, log }) => {
    log.info('Fetching user', { userId: params.id })
    // All logs include requestId automatically
    return getUser(params.id)
  })
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

### Complete Logger Implementation

```typescript
// server/src/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

interface Logger {
  debug(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, context?: LogContext): void
  child(baseContext: LogContext): Logger
}

const LOG_LEVEL = (Bun.env.LOG_LEVEL || 'info') as LogLevel
const IS_PRODUCTION = Bun.env.NODE_ENV === 'production'
const SERVICE_NAME = Bun.env.SERVICE_NAME || 'api'

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[LOG_LEVEL]
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    message,
    ...context,
  }

  if (IS_PRODUCTION) {
    return JSON.stringify(entry)
  }

  const colors: Record<LogLevel, string> = {
    debug: '\x1b[36m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
  }
  const ctx = context ? ` ${JSON.stringify(context)}` : ''
  return `${colors[level]}[${level.toUpperCase()}]\x1b[0m ${entry.timestamp} ${message}${ctx}`
}

function createLogger(baseContext: LogContext = {}): Logger {
  return {
    debug(message: string, context?: LogContext) {
      if (shouldLog('debug')) {
        console.log(createLogEntry('debug', message, { ...baseContext, ...context }))
      }
    },
    info(message: string, context?: LogContext) {
      if (shouldLog('info')) {
        console.log(createLogEntry('info', message, { ...baseContext, ...context }))
      }
    },
    warn(message: string, context?: LogContext) {
      if (shouldLog('warn')) {
        console.warn(createLogEntry('warn', message, { ...baseContext, ...context }))
      }
    },
    error(message: string, context?: LogContext) {
      if (shouldLog('error')) {
        console.error(createLogEntry('error', message, { ...baseContext, ...context }))
      }
    },
    child(childContext: LogContext): Logger {
      return createLogger({ ...baseContext, ...childContext })
    },
  }
}

export const logger = createLogger()
```

### Elysia Integration

```typescript
// server/src/middleware/logging.ts
import { Elysia } from 'elysia'
import { logger } from '../logger'

export const loggingPlugin = new Elysia({ name: 'logging' })
  .derive(({ request }) => {
    const requestId = crypto.randomUUID()
    const url = new URL(request.url)

    return {
      requestId,
      startTime: performance.now(),
      log: logger.child({
        requestId,
        method: request.method,
        path: url.pathname,
        query: url.search || undefined,
      }),
    }
  })
  .onBeforeHandle(({ log }) => {
    log.info('Request started')
  })
  .onAfterHandle(({ log, startTime, set, response }) => {
    const duration = performance.now() - startTime
    log.info('Request completed', {
      statusCode: set.status || 200,
      durationMs: Math.round(duration * 100) / 100,
    })
  })
  .onError(({ log, startTime, error, set }) => {
    const duration = performance.now() - startTime
    log.error('Request failed', {
      statusCode: set.status || 500,
      error: error.message,
      stack: error.stack,
      durationMs: Math.round(duration * 100) / 100,
    })
  })
```

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

**Version**: 1.0
**Stack**: Bun, Elysia, TypeScript
