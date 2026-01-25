/**
 * Resilience Manager
 *
 * Unified interface for error recovery and resilience patterns.
 * Combines retry, circuit breaker, fallback, and timeout strategies.
 * Based on SPEC-016: Error Recovery & Resilience
 */

import { EventEmitter } from 'events'
import { logger } from '../../logger'
import {
  ErrorClassifier,
  errorClassifier as defaultErrorClassifier,
  type ClassifiedError,
  ErrorCategory,
  RetryExhaustedError,
} from './error-classifier'
import { Retry, type RetryConfig, type RetryEvent } from './retry'
import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  circuitRegistry as defaultCircuitRegistry,
  type CircuitBreakerConfig,
  type CircuitState,
  type CircuitStateChangeEvent,
} from './circuit-breaker'
import { Fallback, type FallbackChain, type FallbackEvent } from './fallback'
import { TimeoutManager, type TimeoutConfig } from './timeout'

const log = logger.child('resilience-manager')

/**
 * Recovery event types (for UI integration with SPEC-013)
 */
export type RecoveryEvent =
  | { type: 'retry'; attempt: number; delay: number; error: ClassifiedError; operationName?: string }
  | { type: 'circuit-state-change'; circuit: string; from: CircuitState; to: CircuitState }
  | { type: 'fallback'; from: string; to: string }
  | { type: 'degraded'; reason: string }
  | { type: 'recovered'; after: number; attempts: number }
  | { type: 'failed'; error: ClassifiedError; exhausted: boolean }

/**
 * Resilience metrics
 */
export interface ResilienceMetrics {
  totalAttempts: number
  successfulRetries: number
  failedRetries: number
  circuitOpens: number
  fallbacksUsed: number
  avgRecoveryTime: number
  errorsByCategory: Record<ErrorCategory, number>
}

/**
 * Resilience options for executeWithResilience
 */
export interface ResilienceOptions {
  /** Operation name for logging */
  operationName?: string
  /** Provider name for circuit breaker */
  provider?: string
  /** Agent name for circuit breaker */
  agent?: string
  /** Retry configuration */
  retry?: Partial<RetryConfig>
  /** Circuit breaker configuration */
  circuitBreaker?: Partial<CircuitBreakerConfig>
  /** Timeout in ms */
  timeoutMs?: number
  /** Operation type for timeout */
  operationType?: string
  /** Fallback chain */
  fallbackChain?: FallbackChain<unknown>
  /** Skip circuit breaker */
  skipCircuitBreaker?: boolean
  /** Skip retry */
  skipRetry?: boolean
  /** Abort signal */
  abortSignal?: AbortSignal
}

/**
 * Resilience Manager class
 *
 * Provides unified interface for all resilience patterns
 */
export class ResilienceManager extends EventEmitter {
  private errorClassifier: ErrorClassifier
  private circuitRegistry: CircuitBreakerRegistry
  private retry: Retry
  private fallback: Fallback
  private timeoutManager: TimeoutManager

  // Metrics
  private metrics: ResilienceMetrics = {
    totalAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    circuitOpens: 0,
    fallbacksUsed: 0,
    avgRecoveryTime: 0,
    errorsByCategory: {} as Record<ErrorCategory, number>,
  }
  private recoveryTimes: number[] = []
  private enabled = true

  constructor(options: {
    errorClassifier?: ErrorClassifier
    circuitRegistry?: CircuitBreakerRegistry
    retryConfig?: Partial<RetryConfig>
    timeoutConfig?: Partial<TimeoutConfig>
  } = {}) {
    super()

    this.errorClassifier = options.errorClassifier ?? defaultErrorClassifier
    this.circuitRegistry = options.circuitRegistry ?? defaultCircuitRegistry
    this.retry = new Retry(options.retryConfig)
    this.fallback = new Fallback()
    this.timeoutManager = new TimeoutManager(options.timeoutConfig)

    // Wire up events
    this.setupEventForwarding()

    // Initialize error categories
    for (const category of Object.values(ErrorCategory)) {
      this.metrics.errorsByCategory[category] = 0
    }

    log.info('Resilience manager initialized')
  }

  /**
   * Setup event forwarding from sub-components
   */
  private setupEventForwarding(): void {
    // Retry events
    this.retry.on('retry', (event: RetryEvent) => {
      this.metrics.totalAttempts++
      this.emitRecoveryEvent({
        type: 'retry',
        attempt: event.attempt,
        delay: event.delay,
        error: event.error,
        operationName: event.operationName,
      })
    })

    // Circuit breaker events
    this.circuitRegistry.on('state-change', (event: CircuitStateChangeEvent) => {
      if (event.to === 'open') {
        this.metrics.circuitOpens++
      }
      this.emitRecoveryEvent({
        type: 'circuit-state-change',
        circuit: event.circuitName,
        from: event.from,
        to: event.to,
      })
    })

    // Fallback events
    this.fallback.on('fallback', (event: FallbackEvent) => {
      if (event.type === 'fallback') {
        this.metrics.fallbacksUsed++
        this.emitRecoveryEvent({
          type: 'fallback',
          from: event.from,
          to: event.to ?? 'unknown',
        })
      } else if (event.type === 'degraded') {
        this.emitRecoveryEvent({
          type: 'degraded',
          reason: event.error?.message ?? 'Unknown error',
        })
      }
    })
  }

  /**
   * Emit a recovery event
   */
  private emitRecoveryEvent(event: RecoveryEvent): void {
    this.emit('recovery', event)
    log.debug('Recovery event', event)
  }

  /**
   * Execute an operation with full resilience patterns
   *
   * Order: Timeout -> Circuit Breaker -> Retry -> Fallback
   */
  async executeWithResilience<T>(
    operation: () => Promise<T>,
    options: ResilienceOptions = {}
  ): Promise<T> {
    if (!this.enabled) {
      return operation()
    }

    const startTime = Date.now()
    const operationName = options.operationName ?? 'operation'

    // Get circuit breaker if applicable
    const circuitName = this.getCircuitName(options)
    const circuit = circuitName && !options.skipCircuitBreaker
      ? this.circuitRegistry.getCircuit(circuitName, options.circuitBreaker)
      : null

    // Wrap operation with timeout
    const timeoutMs = options.timeoutMs ?? this.timeoutManager.getTimeout(options.operationType)
    const timedOperation = () =>
      this.timeoutManager.execute(operation, {
        timeoutMs,
        operationName,
        abortSignal: options.abortSignal,
      })

    // Wrap with circuit breaker
    const circuitOperation = circuit
      ? () => circuit.execute(timedOperation)
      : timedOperation

    // Wrap with retry
    const retryOperation = options.skipRetry
      ? circuitOperation
      : () =>
          this.retry.execute(circuitOperation, {
            operationName,
            configOverride: options.retry,
            abortSignal: options.abortSignal,
            provider: options.provider,
          })

    try {
      // If fallback chain provided, use it
      if (options.fallbackChain) {
        const result = await this.fallback.execute(
          {
            ...options.fallbackChain,
            primary: retryOperation as () => Promise<unknown>,
            primaryName: operationName,
          },
          { abortSignal: options.abortSignal }
        )

        this.recordSuccess(startTime)
        return result as T
      }

      // Otherwise, just run the operation
      const result = await retryOperation()
      this.recordSuccess(startTime)
      return result
    } catch (error) {
      this.recordFailure(error)
      throw error
    }
  }

  /**
   * Get circuit name from options
   */
  private getCircuitName(options: ResilienceOptions): string | null {
    if (options.provider) {
      return `provider:${options.provider}`
    }
    if (options.agent) {
      return `agent:${options.agent}`
    }
    return null
  }

  /**
   * Record successful operation
   */
  private recordSuccess(startTime: number): void {
    const duration = Date.now() - startTime
    this.recoveryTimes.push(duration)

    // Keep only last 100 recovery times
    if (this.recoveryTimes.length > 100) {
      this.recoveryTimes.shift()
    }

    // Update average
    this.metrics.avgRecoveryTime =
      this.recoveryTimes.reduce((a, b) => a + b, 0) / this.recoveryTimes.length

    this.metrics.successfulRetries++
  }

  /**
   * Record failed operation
   */
  private recordFailure(error: unknown): void {
    const classified = this.errorClassifier.classify(error)
    this.metrics.failedRetries++
    this.metrics.errorsByCategory[classified.category] =
      (this.metrics.errorsByCategory[classified.category] || 0) + 1

    this.emitRecoveryEvent({
      type: 'failed',
      error: classified,
      exhausted: error instanceof RetryExhaustedError,
    })
  }

  // ==================== Circuit Breaker Methods ====================

  /**
   * Get a circuit breaker by name
   */
  getCircuit(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    return this.circuitRegistry.getCircuit(name, config)
  }

  /**
   * Get all circuit states
   */
  getCircuitStates(): Record<string, CircuitState> {
    return this.circuitRegistry.getStates()
  }

  /**
   * Reset a specific circuit
   */
  resetCircuit(name: string): boolean {
    return this.circuitRegistry.resetCircuit(name)
  }

  /**
   * Reset all circuits
   */
  resetAllCircuits(): void {
    this.circuitRegistry.resetAll()
  }

  // ==================== Configuration Methods ====================

  /**
   * Enable or disable resilience (useful for testing)
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    log.info('Resilience enabled state changed', { enabled })
  }

  /**
   * Check if resilience is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retry.updateConfig(config)
  }

  /**
   * Update timeout configuration
   */
  updateTimeoutConfig(config: Partial<TimeoutConfig>): void {
    this.timeoutManager.updateConfig(config)
  }

  // ==================== Metrics Methods ====================

  /**
   * Get resilience metrics
   */
  getMetrics(): ResilienceMetrics {
    return { ...this.metrics }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      circuitOpens: 0,
      fallbacksUsed: 0,
      avgRecoveryTime: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
    }
    this.recoveryTimes = []

    for (const category of Object.values(ErrorCategory)) {
      this.metrics.errorsByCategory[category] = 0
    }

    log.info('Resilience metrics reset')
  }

  // ==================== Convenience Methods ====================

  /**
   * Execute with retry only
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      operationName?: string
      config?: Partial<RetryConfig>
      provider?: string
      abortSignal?: AbortSignal
    } = {}
  ): Promise<T> {
    return this.retry.execute(operation, {
      operationName: options.operationName,
      configOverride: options.config,
      provider: options.provider,
      abortSignal: options.abortSignal,
    })
  }

  /**
   * Execute with circuit breaker only
   */
  async withCircuitBreaker<T>(
    circuitName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const circuit = this.circuitRegistry.getCircuit(circuitName, config)
    return circuit.execute(operation)
  }

  /**
   * Execute with timeout only
   */
  async withTimeout<T>(
    operation: () => Promise<T>,
    options: {
      timeoutMs?: number
      operationType?: string
      operationName?: string
      abortSignal?: AbortSignal
    } = {}
  ): Promise<T> {
    return this.timeoutManager.execute(operation, options)
  }

  /**
   * Execute with fallback chain
   */
  async withFallback<T>(
    chain: FallbackChain<T>,
    abortSignal?: AbortSignal
  ): Promise<T> {
    return this.fallback.execute(chain, { abortSignal })
  }

  /**
   * Classify an error
   */
  classifyError(error: unknown, context?: { provider?: string }): ClassifiedError {
    return this.errorClassifier.classify(error, context)
  }

  /**
   * Check if an error is retryable
   */
  isRetryable(error: unknown, context?: { provider?: string }): boolean {
    return this.errorClassifier.isRetryable(error, context)
  }
}

// Default singleton instance
export const resilienceManager = new ResilienceManager()

// Re-export error types for convenience
export {
  ErrorCategory,
  CircuitOpenError,
  TimeoutError,
  RetryExhaustedError,
} from './error-classifier'
