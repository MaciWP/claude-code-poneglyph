# Request Tracing Middleware

Framework-agnostic pattern for assigning request IDs, injecting a scoped logger, and logging request completion with timing.

```typescript
import { logger } from './logger'

interface RequestTrace {
  requestId: string
  log: ReturnType<typeof logger.withRequestId>
  timing: {
    start: number
    elapsed: () => number
  }
}

function createTrace(req: Request): RequestTrace {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
  const startTime = Date.now()

  return {
    requestId,
    log: logger.withRequestId(requestId),
    timing: {
      start: startTime,
      elapsed: () => Date.now() - startTime,
    },
  }
}

async function tracedHandler(
  req: Request,
  handler: (req: Request, trace: RequestTrace) => Promise<Response>
): Promise<Response> {
  const trace = createTrace(req)
  trace.log.info('Request started', {
    method: req.method,
    path: new URL(req.url).pathname,
  })

  try {
    const response = await handler(req, trace)
    trace.log.info('Request completed', {
      method: req.method,
      path: new URL(req.url).pathname,
      status: response.status,
      durationMs: trace.timing.elapsed(),
    })
    return response
  } catch (error) {
    trace.log.error('Request failed', {
      method: req.method,
      path: new URL(req.url).pathname,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs: trace.timing.elapsed(),
    })
    throw error
  }
}

export { createTrace, tracedHandler }
```
