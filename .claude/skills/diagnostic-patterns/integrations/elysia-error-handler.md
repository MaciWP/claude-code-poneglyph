# Elysia Error Handler Middleware

Integrates DiagnosticService with Elysia's error handling pipeline. Produces structured diagnostic reports and returns user-friendly errors.

```typescript
import { Elysia } from 'elysia'
import { diagnosticService } from './diagnostic-service'

const errorPlugin = new Elysia({ name: 'error-diagnostics' })
  .onError(({ error, request, set }) => {
    const report = diagnosticService.diagnose(error as Error, {
      requestId: request.headers.get('x-request-id') || undefined,
      endpoint: new URL(request.url).pathname,
      method: request.method
    })

    console.error(diagnosticService.formatReport(report))

    set.status = (error as any).status || 500
    return {
      error: report.error.type,
      message: report.error.message,
      reportId: report.id
    }
  })

const app = new Elysia()
  .use(errorPlugin)
  .get('/test', () => {
    throw new Error('Test error for diagnostics')
  })
```
