# Request Tracing Middleware

Elysia plugin that assigns request IDs, injects a scoped logger, and logs request completion with timing.

```typescript
import { Elysia } from 'elysia'
import { logger } from './logger'

const tracingPlugin = new Elysia({ name: 'tracing' })
  .derive(({ request }) => {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
    const startTime = Date.now()

    return {
      requestId,
      logger: logger.withRequestId(requestId),
      timing: {
        start: startTime,
        elapsed: () => Date.now() - startTime
      }
    }
  })
  .onAfterHandle(({ requestId, timing, request, set }) => {
    logger.withRequestId(requestId).info('Request completed', {
      method: request.method,
      path: new URL(request.url).pathname,
      status: set.status,
      durationMs: timing.elapsed()
    })
  })

export { tracingPlugin }
```
