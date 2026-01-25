/**
 * Tests for Error Recovery & Resilience System
 *
 * Based on SPEC-016 Acceptance Criteria
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test'
import {
  ErrorClassifier,
  ErrorCategory,
} from './error-classifier'
import {
  Retry,
  calculateDelay,
  withRetry,
  withRetrySafe,
  type RetryConfig,
} from './retry'
import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  type CircuitState,
} from './circuit-breaker'
import { withFallback, withFallbackSafe, type FallbackChain } from './fallback'
import { withTimeout, withTimeoutSafe, TimeoutManager } from './timeout'
import {
  ResilienceManager,
  CircuitOpenError,
  TimeoutError,
} from './resilience-manager'

// ============ Error Classifier Tests ============

describe('ErrorClassifier', () => {
  let classifier: ErrorClassifier

  beforeEach(() => {
    classifier = new ErrorClassifier()
    classifier.resetStats()
  })

  test('classifies rate limit errors as retryable', () => {
    const error = new Error('Rate limit exceeded')
    const classified = classifier.classify(error)

    expect(classified.category).toBe(ErrorCategory.RATE_LIMIT)
    expect(classified.isRetryable).toBe(true)
    expect(classified.maxRetries).toBeGreaterThan(0)
  })

  test('classifies 429 status as rate limit', () => {
    const error = Object.assign(new Error('Too Many Requests'), { status: 429 })
    const classified = classifier.classify(error)

    expect(classified.category).toBe(ErrorCategory.RATE_LIMIT)
    expect(classified.isRetryable).toBe(true)
  })

  test('classifies timeout errors as retryable', () => {
    const error = new Error('Request timed out')
    const classified = classifier.classify(error)

    expect(classified.category).toBe(ErrorCategory.TIMEOUT)
    expect(classified.isRetryable).toBe(true)
  })

  test('classifies auth errors as not retryable', () => {
    const error = Object.assign(new Error('Unauthorized'), { status: 401 })
    const classified = classifier.classify(error)

    expect(classified.category).toBe(ErrorCategory.AUTH_ERROR)
    expect(classified.isRetryable).toBe(false)
  })

  test('classifies 400 as invalid request (not retryable)', () => {
    const error = Object.assign(new Error('Bad Request'), { status: 400 })
    const classified = classifier.classify(error)

    expect(classified.category).toBe(ErrorCategory.INVALID_REQUEST)
    expect(classified.isRetryable).toBe(false)
  })

  test('classifies network errors as retryable', () => {
    const error = new Error('ECONNRESET')
    const classified = classifier.classify(error)

    expect(classified.category).toBe(ErrorCategory.NETWORK)
    expect(classified.isRetryable).toBe(true)
  })

  test('classifies context overflow as not retryable', () => {
    const error = new Error('Context length exceeded')
    const classified = classifier.classify(error)

    expect(classified.category).toBe(ErrorCategory.CONTEXT_OVERFLOW)
    expect(classified.isRetryable).toBe(false)
  })

  test('extracts retry-after header', () => {
    const error = Object.assign(new Error('Rate limited'), {
      status: 429,
      headers: { 'retry-after': '5' },
    })
    const classified = classifier.classify(error)

    expect(classified.suggestedDelay).toBe(5000)
  })

  test('tracks classification statistics', () => {
    classifier.classify(new Error('Rate limit exceeded'))
    classifier.classify(new Error('timeout'))
    classifier.classify(Object.assign(new Error(''), { status: 401 }))

    const stats = classifier.getStats()
    expect(stats.total).toBe(3)
    expect(stats.byCategory[ErrorCategory.RATE_LIMIT]).toBe(1)
    expect(stats.byCategory[ErrorCategory.TIMEOUT]).toBe(1)
    expect(stats.byCategory[ErrorCategory.AUTH_ERROR]).toBe(1)
  })
})

// ============ Retry Tests ============

describe('Retry', () => {
  test('calculateDelay returns exponential backoff', () => {
    const config: RetryConfig = {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0,
    }

    expect(calculateDelay(0, config)).toBe(1000)
    expect(calculateDelay(1, config)).toBe(2000)
    expect(calculateDelay(2, config)).toBe(4000)
  })

  test('calculateDelay caps at maxDelayMs', () => {
    const config: RetryConfig = {
      maxAttempts: 10,
      initialDelayMs: 10000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0,
    }

    expect(calculateDelay(10, config)).toBe(30000)
  })

  test('calculateDelay uses suggested delay when provided', () => {
    const config: RetryConfig = {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0,
    }

    expect(calculateDelay(0, config, 5000)).toBe(5000)
  })

  test('withRetry succeeds on first attempt', async () => {
    const operation = mock(() => Promise.resolve('success'))

    const result = await withRetry(operation)

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  test('withRetry retries on transient error', async () => {
    let attempts = 0
    const operation = mock(() => {
      attempts++
      if (attempts < 2) {
        throw new Error('Service unavailable')
      }
      return Promise.resolve('success')
    })

    const result = await withRetry(operation, { initialDelayMs: 10 })

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  test('withRetry throws immediately on non-retryable error', async () => {
    const operation = mock(() => {
      throw Object.assign(new Error('Unauthorized'), { status: 401 })
    })

    await expect(withRetry(operation)).rejects.toThrow('Unauthorized')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  test('withRetry exhausts max attempts', async () => {
    const operation = mock(() => {
      throw new Error('Service unavailable')
    })

    await expect(
      withRetry(operation, { maxAttempts: 3, initialDelayMs: 10 })
    ).rejects.toThrow('Service unavailable')
    expect(operation).toHaveBeenCalledTimes(3)
  })

  test('withRetrySafe returns result object on success', async () => {
    const operation = () => Promise.resolve('success')

    const result = await withRetrySafe(operation)

    expect(result.success).toBe(true)
    expect(result.value).toBe('success')
    expect(result.attempts).toBe(1)
  })

  test('withRetrySafe returns result object on failure', async () => {
    const operation = () => Promise.reject(new Error('failed'))

    const result = await withRetrySafe(operation, { maxAttempts: 2, initialDelayMs: 10 })

    expect(result.success).toBe(false)
    expect(result.attempts).toBe(2)
    expect(result.errors.length).toBe(2)
  })

  test('Retry class emits retry events', async () => {
    const retry = new Retry({ initialDelayMs: 10 })
    const events: unknown[] = []
    retry.on('retry', (e) => events.push(e))

    let attempts = 0
    await retry.execute(() => {
      attempts++
      if (attempts < 2) throw new Error('Service unavailable')
      return Promise.resolve('success')
    })

    expect(events.length).toBe(1)
    expect((events[0] as { attempt: number }).attempt).toBe(1)
  })
})

// ============ Circuit Breaker Tests ============

describe('CircuitBreaker', () => {
  let circuit: CircuitBreaker

  beforeEach(() => {
    circuit = new CircuitBreaker('test', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 100,
      volumeThreshold: 1,
    })
  })

  test('starts in closed state', () => {
    expect(circuit.getState()).toBe('closed')
  })

  test('opens after failure threshold', async () => {
    const failingOp = () => Promise.reject(new Error('fail'))

    for (let i = 0; i < 3; i++) {
      try {
        await circuit.execute(failingOp)
      } catch {
        // Expected
      }
    }

    expect(circuit.getState()).toBe('open')
  })

  test('rejects calls when open', async () => {
    // Force open
    circuit.forceState('open')

    await expect(circuit.execute(() => Promise.resolve('ok'))).rejects.toThrow(
      CircuitOpenError
    )
  })

  test('transitions to half-open after timeout', async () => {
    circuit.forceState('open')
    expect(circuit.getState()).toBe('open')

    // Wait for timeout
    await new Promise((r) => setTimeout(r, 150))

    expect(circuit.getState()).toBe('half-open')
  })

  test('closes after success threshold in half-open', async () => {
    circuit.forceState('half-open')

    // Record successes
    await circuit.execute(() => Promise.resolve('ok'))
    await circuit.execute(() => Promise.resolve('ok'))

    expect(circuit.getState()).toBe('closed')
  })

  test('reopens on failure in half-open', async () => {
    circuit.forceState('half-open')

    try {
      await circuit.execute(() => Promise.reject(new Error('fail')))
    } catch {
      // Expected
    }

    expect(circuit.getState()).toBe('open')
  })

  test('emits state change events', async () => {
    const events: { from: CircuitState; to: CircuitState }[] = []
    circuit.on('state-change', (e) => events.push(e))

    // Trigger open
    for (let i = 0; i < 3; i++) {
      try {
        await circuit.execute(() => Promise.reject(new Error('fail')))
      } catch {
        // Expected
      }
    }

    expect(events.length).toBeGreaterThan(0)
    expect(events[events.length - 1].to).toBe('open')
  })

  test('getMetrics returns correct values', async () => {
    await circuit.execute(() => Promise.resolve('ok'))

    const metrics = circuit.getMetrics()
    expect(metrics.successes).toBe(1)
    expect(metrics.totalCalls).toBe(1)
    expect(metrics.state).toBe('closed')
  })
})

describe('CircuitBreakerRegistry', () => {
  test('creates circuits on demand', () => {
    const registry = new CircuitBreakerRegistry()

    const circuit1 = registry.getCircuit('test1')
    const circuit2 = registry.getCircuit('test1')

    expect(circuit1).toBe(circuit2)
  })

  test('returns all states', () => {
    const registry = new CircuitBreakerRegistry()

    registry.getCircuit('a')
    registry.getCircuit('b')

    const states = registry.getStates()
    expect(states['a']).toBe('closed')
    expect(states['b']).toBe('closed')
  })

  test('resets all circuits', () => {
    const registry = new CircuitBreakerRegistry()

    const circuit = registry.getCircuit('test')
    circuit.forceState('open')

    registry.resetAll()

    expect(circuit.getState()).toBe('closed')
  })
})

// ============ Fallback Tests ============

describe('Fallback', () => {
  test('returns primary result on success', async () => {
    const chain: FallbackChain<string> = {
      primary: () => Promise.resolve('primary'),
      fallbacks: [{ name: 'backup', operation: () => Promise.resolve('backup') }],
    }

    const result = await withFallback(chain)

    expect(result).toBe('primary')
  })

  test('uses fallback on primary failure', async () => {
    const chain: FallbackChain<string> = {
      primary: () => Promise.reject(new Error('primary failed')),
      fallbacks: [{ name: 'backup', operation: () => Promise.resolve('backup') }],
    }

    const result = await withFallback(chain)

    expect(result).toBe('backup')
  })

  test('uses degraded mode when all fail', async () => {
    const chain: FallbackChain<string> = {
      primary: () => Promise.reject(new Error('primary failed')),
      fallbacks: [
        { name: 'backup', operation: () => Promise.reject(new Error('backup failed')) },
      ],
      degraded: () => 'degraded',
    }

    const result = await withFallback(chain)

    expect(result).toBe('degraded')
  })

  test('throws when all fail and no degraded', async () => {
    const chain: FallbackChain<string> = {
      primary: () => Promise.reject(new Error('primary failed')),
      fallbacks: [
        { name: 'backup', operation: () => Promise.reject(new Error('backup failed')) },
      ],
    }

    await expect(withFallback(chain)).rejects.toThrow('primary failed')
  })

  test('respects fallback conditions', async () => {
    const chain: FallbackChain<string> = {
      primary: () => Promise.reject(new Error('rate limit')),
      fallbacks: [
        {
          name: 'conditional',
          operation: () => Promise.resolve('conditional'),
          condition: (err) => err.message.includes('auth'),
        },
        {
          name: 'unconditional',
          operation: () => Promise.resolve('unconditional'),
        },
      ],
    }

    const result = await withFallback(chain)

    expect(result).toBe('unconditional')
  })

  test('withFallbackSafe returns result object', async () => {
    const chain: FallbackChain<string> = {
      primary: () => Promise.reject(new Error('failed')),
      fallbacks: [{ name: 'backup', operation: () => Promise.resolve('backup') }],
    }

    const result = await withFallbackSafe(chain)

    expect(result.success).toBe(true)
    expect(result.usedFallback).toBe(true)
    expect(result.fallbackName).toBe('backup')
    expect(result.isDegraded).toBe(false)
  })
})

// ============ Timeout Tests ============

describe('Timeout', () => {
  test('withTimeout completes within timeout', async () => {
    const result = await withTimeout(() => Promise.resolve('ok'), 1000)

    expect(result).toBe('ok')
  })

  test('withTimeout throws on timeout', async () => {
    const slowOp = () => new Promise<string>((r) => setTimeout(() => r('slow'), 1000))

    await expect(withTimeout(slowOp, 50)).rejects.toThrow(TimeoutError)
  })

  test('withTimeoutSafe returns result object', async () => {
    const result = await withTimeoutSafe(() => Promise.resolve('ok'), 1000)

    expect(result.success).toBe(true)
    expect(result.value).toBe('ok')
    expect(result.timedOut).toBe(false)
  })

  test('withTimeoutSafe returns timeout info', async () => {
    const slowOp = () => new Promise<string>((r) => setTimeout(() => r('slow'), 1000))

    const result = await withTimeoutSafe(slowOp, 50)

    expect(result.success).toBe(false)
    expect(result.timedOut).toBe(true)
  })

  test('TimeoutManager uses operation-specific timeouts', () => {
    const manager = new TimeoutManager()

    expect(manager.getTimeout('llm-call')).toBe(60000)
    expect(manager.getTimeout('file-read')).toBe(5000)
    expect(manager.getTimeout('unknown')).toBe(30000)
  })
})

// ============ Resilience Manager Tests ============

describe('ResilienceManager', () => {
  let manager: ResilienceManager
  let registry: CircuitBreakerRegistry

  beforeEach(() => {
    registry = new CircuitBreakerRegistry()
    manager = new ResilienceManager({
      retryConfig: { initialDelayMs: 10, maxAttempts: 2 },
      circuitRegistry: registry,
    })
    manager.resetMetrics()
    manager.resetAllCircuits()
  })

  test('executeWithResilience succeeds on first attempt', async () => {
    const result = await manager.executeWithResilience(
      () => Promise.resolve('success'),
      { operationName: 'test' }
    )

    expect(result).toBe('success')
  })

  test('executeWithResilience retries on transient error', async () => {
    let attempts = 0
    const result = await manager.executeWithResilience(
      () => {
        attempts++
        if (attempts < 2) throw new Error('Service unavailable')
        return Promise.resolve('success')
      },
      { operationName: 'test' }
    )

    expect(result).toBe('success')
    expect(attempts).toBe(2)
  })

  test('executeWithResilience uses circuit breaker', async () => {
    // Open circuit manually
    const circuit = manager.getCircuit('provider:claude')
    circuit.forceState('open')

    await expect(
      manager.executeWithResilience(() => Promise.resolve('ok'), { provider: 'claude' })
    ).rejects.toThrow(CircuitOpenError)
  })

  test('executeWithResilience respects timeout', async () => {
    const slowOp = () => new Promise<string>((r) => setTimeout(() => r('slow'), 1000))

    await expect(
      manager.executeWithResilience(slowOp, { timeoutMs: 50 })
    ).rejects.toThrow(TimeoutError)
  })

  test('tracks metrics', async () => {
    await manager.executeWithResilience(() => Promise.resolve('ok'))

    const metrics = manager.getMetrics()
    expect(metrics.successfulRetries).toBe(1)
  })

  test('emits recovery events', async () => {
    const events: unknown[] = []
    manager.on('recovery', (e) => events.push(e))

    let attempts = 0
    await manager.executeWithResilience(() => {
      attempts++
      if (attempts < 2) throw new Error('Service unavailable')
      return Promise.resolve('ok')
    })

    expect(events.some((e) => (e as { type: string }).type === 'retry')).toBe(true)
  })

  test('can disable resilience', async () => {
    manager.setEnabled(false)

    // Should throw immediately without retry
    await expect(
      manager.executeWithResilience(() => Promise.reject(new Error('fail')))
    ).rejects.toThrow('fail')
  })

  test('getCircuitStates returns all states', () => {
    manager.getCircuit('provider:claude')
    manager.getCircuit('agent:builder')

    const states = manager.getCircuitStates()
    expect('provider:claude' in states).toBe(true)
    expect('agent:builder' in states).toBe(true)
  })

  test('classifyError works correctly', () => {
    const classified = manager.classifyError(new Error('Rate limit exceeded'))
    expect(classified.category).toBe(ErrorCategory.RATE_LIMIT)
    expect(classified.isRetryable).toBe(true)
  })
})

// ============ Integration Tests (BDD Scenarios from SPEC-016) ============

describe('SPEC-016 Acceptance Criteria', () => {
  test('Scenario: Retry on transient error', async () => {
    const registry = new CircuitBreakerRegistry()
    const manager = new ResilienceManager({ retryConfig: { initialDelayMs: 10, maxDelayMs: 50 }, circuitRegistry: registry })
    const events: Array<{ attempt: number; delay: number }> = []
    manager.on('recovery', (e) => {
      if ((e as { type: string }).type === 'retry') {
        events.push(e as { attempt: number; delay: number })
      }
    })

    let attempts = 0
    const result = await manager.executeWithResilience(
      () => {
        attempts++
        if (attempts < 3) {
          // Use timeout error which has short delay
          throw new Error('timeout error')
        }
        return Promise.resolve('success')
      },
      { retry: { maxAttempts: 3, initialDelayMs: 10, maxDelayMs: 50 } }
    )

    expect(result).toBe('success')
    expect(events.length).toBe(2) // Two retries before success
    expect(events[0].attempt).toBe(1)
    expect(events[1].attempt).toBe(2)
  })

  test('Scenario: Circuit breaker opens', async () => {
    const registry = new CircuitBreakerRegistry()
    const manager = new ResilienceManager({
      retryConfig: { maxAttempts: 1, initialDelayMs: 10 },
      circuitRegistry: registry,
    })

    // Configure low thresholds for testing
    const circuit = manager.getCircuit('provider:test', {
      failureThreshold: 2,
      volumeThreshold: 1,
    })

    // Cause 2 failures to open circuit
    for (let i = 0; i < 2; i++) {
      try {
        await manager.executeWithResilience(
          () => Promise.reject(new Error('Service error')),
          { provider: 'test', skipRetry: true }
        )
      } catch {
        // Expected
      }
    }

    expect(circuit.getState()).toBe('open')

    // Next call should fail immediately with CircuitOpenError
    await expect(
      manager.executeWithResilience(() => Promise.resolve('should not run'), { provider: 'test' })
    ).rejects.toThrow(CircuitOpenError)
  })

  test('Scenario: Circuit breaker recovers', async () => {
    const circuit = new CircuitBreaker('recovery-test', {
      failureThreshold: 1,
      successThreshold: 1,
      timeout: 50,
      volumeThreshold: 1,
    })

    // Open circuit
    try {
      await circuit.execute(() => Promise.reject(new Error('fail')))
    } catch {
      // Expected
    }
    expect(circuit.getState()).toBe('open')

    // Wait for timeout
    await new Promise((r) => setTimeout(r, 100))
    expect(circuit.getState()).toBe('half-open')

    // Successful probe closes circuit
    await circuit.execute(() => Promise.resolve('ok'))
    expect(circuit.getState()).toBe('closed')
  })

  test('Scenario: Fallback to simpler agent', async () => {
    const events: string[] = []

    const chain: FallbackChain<string> = {
      primary: () => Promise.reject(new Error('builder failed')),
      primaryName: 'builder',
      fallbacks: [
        { name: 'builder-simple', operation: () => Promise.resolve('simple result') },
      ],
    }

    const result = await withFallback(chain, {
      onFallback: (e) => {
        if (e.type === 'fallback') events.push(`${e.from} -> ${e.to}`)
      },
    })

    expect(result).toBe('simple result')
    expect(events).toContain('builder -> builder-simple')
  })

  test('Scenario: Timeout on tool execution', async () => {
    const registry = new CircuitBreakerRegistry()
    const manager = new ResilienceManager({ circuitRegistry: registry, retryConfig: { maxAttempts: 1 } })

    const longRunningTool = () =>
      new Promise<string>((resolve) => setTimeout(() => resolve('done'), 200))

    await expect(
      manager.executeWithResilience(longRunningTool, {
        timeoutMs: 50,
        operationName: 'tool-exec',
        skipRetry: true, // Don't retry timeouts in this test
      })
    ).rejects.toThrow(TimeoutError)
  })
})
