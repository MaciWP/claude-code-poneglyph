---
name: retry-patterns
description: |
  Retry strategies for transient failures with exponential backoff and circuit breakers.
  Use when handling retries, timeouts, transient errors, or implementing resilience.
  Keywords: retry, timeout, backoff, circuit breaker, transient, resilience, fallback
for_agents: [error-analyzer]
---

# Retry Patterns

Resilience patterns for handling transient failures.

## When to Use

- Network requests that may fail temporarily
- Database connections that timeout
- External API calls
- Any operation with transient failures

## Basic Retry

### Simple Retry with Limit

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      console.log(`Attempt ${attempt}/${maxRetries} failed:`, error.message)
    }
  }

  throw lastError!
}

// Usage
const result = await withRetry(() => fetch(url), 3)
```

## Exponential Backoff

### With Jitter

```typescript
interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  jitter: boolean
}

async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {
    maxRetries: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    jitter: true
  }
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === config.maxRetries - 1) break

      let delay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt),
        config.maxDelayMs
      )

      if (config.jitter) {
        delay = delay * (0.5 + Math.random())
      }

      console.log(`Retry ${attempt + 1} after ${delay}ms`)
      await Bun.sleep(delay)
    }
  }

  throw lastError!
}
```

### Retry Only Transient Errors

```typescript
function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const transientCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
    const transientStatus = [408, 429, 500, 502, 503, 504]

    if ('code' in error && transientCodes.includes(error.code as string)) {
      return true
    }
    if ('status' in error && transientStatus.includes(error.status as number)) {
      return true
    }
  }
  return false
}

async function withRetryOnTransient<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (!isTransientError(error)) {
        throw error // Don't retry permanent errors
      }

      await Bun.sleep(1000 * Math.pow(2, attempt))
    }
  }

  throw lastError!
}
```

## Circuit Breaker

### Implementation

```typescript
type CircuitState = 'closed' | 'open' | 'half-open'

class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failures = 0
  private lastFailure = 0
  private successesInHalfOpen = 0

  constructor(
    private readonly threshold = 5,
    private readonly resetTimeout = 30000,
    private readonly halfOpenSuccesses = 2
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open'
        this.successesInHalfOpen = 0
      } else {
        throw new Error('Circuit breaker is open')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    if (this.state === 'half-open') {
      this.successesInHalfOpen++
      if (this.successesInHalfOpen >= this.halfOpenSuccesses) {
        this.state = 'closed'
        this.failures = 0
      }
    } else {
      this.failures = 0
    }
  }

  private onFailure() {
    this.failures++
    this.lastFailure = Date.now()

    if (this.state === 'half-open' || this.failures >= this.threshold) {
      this.state = 'open'
    }
  }

  getState(): CircuitState {
    return this.state
  }
}

// Usage
const breaker = new CircuitBreaker(5, 30000)

async function callExternalApi() {
  return breaker.execute(() => fetch('https://api.example.com'))
}
```

## Timeout Pattern

### With AbortController

```typescript
async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const result = await fn()
    return result
  } finally {
    clearTimeout(timeoutId)
  }
}

// For fetch
async function fetchWithTimeout(url: string, timeoutMs = 5000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}
```

## Fallback Pattern

### With Cached Value

```typescript
interface FallbackConfig<T> {
  primary: () => Promise<T>
  fallback: () => Promise<T>
  cache?: T
}

async function withFallback<T>(config: FallbackConfig<T>): Promise<T> {
  try {
    return await config.primary()
  } catch (primaryError) {
    console.warn('Primary failed, trying fallback:', primaryError)

    try {
      return await config.fallback()
    } catch (fallbackError) {
      console.warn('Fallback failed:', fallbackError)

      if (config.cache !== undefined) {
        console.log('Using cached value')
        return config.cache
      }

      throw fallbackError
    }
  }
}

// Usage
const data = await withFallback({
  primary: () => fetchFromPrimaryApi(),
  fallback: () => fetchFromBackupApi(),
  cache: lastKnownGoodData
})
```

## Combined Resilience

### Full Implementation

```typescript
interface ResilienceConfig {
  retry: {
    maxAttempts: number
    backoffMs: number
    maxBackoffMs: number
  }
  timeout: number
  circuitBreaker: {
    threshold: number
    resetTimeoutMs: number
  }
}

class ResilientClient {
  private breaker: CircuitBreaker

  constructor(private config: ResilienceConfig) {
    this.breaker = new CircuitBreaker(
      config.circuitBreaker.threshold,
      config.circuitBreaker.resetTimeoutMs
    )
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.breaker.execute(() =>
      withExponentialBackoff(
        () => withTimeout(fn, this.config.timeout),
        {
          maxRetries: this.config.retry.maxAttempts,
          baseDelayMs: this.config.retry.backoffMs,
          maxDelayMs: this.config.retry.maxBackoffMs,
          jitter: true
        }
      )
    )
  }
}

// Usage
const client = new ResilientClient({
  retry: { maxAttempts: 3, backoffMs: 1000, maxBackoffMs: 10000 },
  timeout: 5000,
  circuitBreaker: { threshold: 5, resetTimeoutMs: 30000 }
})

const result = await client.execute(() => fetch(url))
```

## Error Classification

```typescript
enum ErrorType {
  Transient = 'transient',
  Permanent = 'permanent',
  Unknown = 'unknown'
}

function classifyError(error: unknown): ErrorType {
  if (error instanceof Error) {
    // Network errors - transient
    if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes((error as any).code)) {
      return ErrorType.Transient
    }

    // HTTP status based
    const status = (error as any).status
    if (status) {
      if ([408, 429, 500, 502, 503, 504].includes(status)) {
        return ErrorType.Transient
      }
      if ([400, 401, 403, 404, 422].includes(status)) {
        return ErrorType.Permanent
      }
    }
  }

  return ErrorType.Unknown
}
```

## Retry Decision Matrix

| Error Type | Retry? | Backoff |
|------------|--------|---------|
| Network timeout | ✅ Yes | Exponential |
| Connection refused | ✅ Yes | Exponential |
| HTTP 429 (Rate limit) | ✅ Yes | Use Retry-After header |
| HTTP 500-504 | ✅ Yes | Exponential |
| HTTP 400 (Bad request) | ❌ No | - |
| HTTP 401 (Unauthorized) | ❌ No | - |
| HTTP 404 (Not found) | ❌ No | - |
| Validation error | ❌ No | - |

## Checklist

- [ ] Retry only transient errors
- [ ] Use exponential backoff with jitter
- [ ] Set maximum retry attempts
- [ ] Implement circuit breaker for external services
- [ ] Add timeouts to all network calls
- [ ] Have fallback strategies
- [ ] Log retry attempts
- [ ] Monitor circuit breaker state

---

**Version**: 1.0.0
**Spec**: SPEC-018
**For**: error-analyzer agent
