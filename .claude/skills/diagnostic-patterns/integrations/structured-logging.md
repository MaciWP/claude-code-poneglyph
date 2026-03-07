# Structured Logging

JSON-based logging with request context, severity levels, and error capture.

```typescript
interface StructuredLog {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  context: Record<string, unknown>
  error?: {
    type: string
    message: string
    stack?: string
  }
}

class Logger {
  private requestId?: string

  withRequestId(requestId: string): Logger {
    const logger = new Logger()
    logger.requestId = requestId
    return logger
  }

  error(message: string, error: Error, context: Record<string, unknown> = {}): void {
    const log: StructuredLog = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        requestId: this.requestId
      },
      error: {
        type: error.constructor.name,
        message: error.message,
        stack: error.stack
      }
    }
    console.error(JSON.stringify(log))
  }

  info(message: string, context: Record<string, unknown> = {}): void {
    const log: StructuredLog = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        requestId: this.requestId
      }
    }
    console.log(JSON.stringify(log))
  }

  debug(message: string, context: Record<string, unknown> = {}): void {
    if (process.env.DEBUG) {
      const log: StructuredLog = {
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        context: {
          ...context,
          requestId: this.requestId
        }
      }
      console.log(JSON.stringify(log))
    }
  }
}

export const logger = new Logger()
```
