# Error Diagnosis Function

Core function for analyzing errors and generating actionable suggestions.

## Interfaces

```typescript
interface ErrorDiagnosis {
  type: string
  message: string
  code?: string
  status?: number
  stack: string[]
  context: {
    file?: string
    line?: number
    column?: number
    function?: string
    input?: unknown
  }
  suggestions: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
}
```

## diagnoseError

Analyzes an unknown error and produces a structured `ErrorDiagnosis` with context, suggestions, and severity.

```typescript
function diagnoseError(error: unknown, input?: unknown): ErrorDiagnosis {
  if (!(error instanceof Error)) {
    return {
      type: 'Unknown',
      message: String(error),
      stack: [],
      context: { input },
      suggestions: ['Convert to Error instance for better debugging'],
      severity: 'medium'
    }
  }

  const stackLines = error.stack?.split('\n').slice(1) || []
  const firstFrame = stackLines[0]?.match(/at (.+?) \((.+?):(\d+):(\d+)\)/)

  const diagnosis: ErrorDiagnosis = {
    type: error.constructor.name,
    message: error.message,
    code: (error as any).code,
    status: (error as any).status,
    stack: stackLines.slice(0, 10),
    context: {
      function: firstFrame?.[1],
      file: firstFrame?.[2],
      line: firstFrame?.[3] ? parseInt(firstFrame[3]) : undefined,
      column: firstFrame?.[4] ? parseInt(firstFrame[4]) : undefined,
      input
    },
    suggestions: [],
    severity: 'medium'
  }

  addSuggestions(diagnosis)

  return diagnosis
}
```

## addSuggestions

Enriches an `ErrorDiagnosis` with type-specific suggestions and adjusts severity.

```typescript
function addSuggestions(diagnosis: ErrorDiagnosis): void {
  const { type, message, code, status } = diagnosis

  if (type === 'TypeError' && message.includes('undefined')) {
    diagnosis.suggestions.push(
      'Use optional chaining (?.) for nested property access',
      'Add null checks before accessing properties',
      'Verify data is loaded before accessing'
    )
    diagnosis.severity = 'high'
  }

  if (type === 'SyntaxError') {
    diagnosis.suggestions.push(
      'Check for missing brackets, quotes, or semicolons',
      'Run linter to detect syntax issues',
      'Review recent code changes'
    )
    diagnosis.severity = 'critical'
  }

  if (code === 'ECONNREFUSED') {
    diagnosis.suggestions.push(
      'Verify the target service is running',
      'Check the port number is correct',
      'Verify no firewall is blocking the connection'
    )
    diagnosis.severity = 'high'
  }

  if (status === 401) {
    diagnosis.suggestions.push(
      'Check if token is expired',
      'Verify authentication credentials',
      'Refresh the auth token'
    )
  }

  if (status === 429) {
    diagnosis.suggestions.push(
      'Implement rate limiting on client side',
      'Add exponential backoff',
      'Check API rate limit headers'
    )
  }
}
```
