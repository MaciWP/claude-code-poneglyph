/**
 * Retry System with Exponential Backoff
 *
 * Implements retry logic with configurable backoff and jitter.
 * Based on SPEC-016: Error Recovery & Resilience
 */

import { EventEmitter } from 'events'
import { logger } from '../../logger'
import { errorClassifier, type ClassifiedError, type ErrorClassifier } from './error-classifier'

const log = logger.child('retry')

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts: number
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs: number
  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelayMs: number
  /** Backoff multiplier (default: 2) */
  backoffMultiplier: number
  /** Jitter factor (0-1, default: 0.2 = 20%) */
  jitterFactor: number
  /** Optional timeout per attempt in milliseconds */
  attemptTimeoutMs?: number
  /** Custom retry condition (default: uses error classifier) */
  shouldRetry?: (error: unknown, attempt: number) => boolean
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
}

/**
 * Retry event types
 */
export interface RetryEvent {
  type: 'retry'
  attempt: number
  maxAttempts: number
  delay: number
  error: ClassifiedError
  operationName?: string
}

/**
 * Retry result
 */
export interface RetryResult<T> {
  success: boolean
  value?: T
  attempts: number
  totalDelayMs: number
  errors: ClassifiedError[]
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig,
  suggestedDelay?: number
): number {
  // If there's a suggested delay from the error (e.g., rate limit), use it
  if (suggestedDelay && suggestedDelay > 0) {
    return suggestedDelay
  }

  // Exponential backoff
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt)

  // Cap at maxDelayMs
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)

  // Add jitter (random variance)
  const jitterRange = cappedDelay * config.jitterFactor
  const jitter = (Math.random() * 2 - 1) * jitterRange // -jitterRange to +jitterRange

  return Math.max(0, Math.round(cappedDelay + jitter))
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute an operation with timeout
 */
async function withAttemptTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    // Ensure timer doesn't prevent process exit
    if (typeof timer === 'object' && 'unref' in timer) {
      timer.unref()
    }
  })

  return Promise.race([operation(), timeoutPromise])
}

/**
 * Retry wrapper function
 *
 * @param operation - Async operation to retry
 * @param config - Retry configuration (optional)
 * @param options - Additional options
 * @returns Result of the operation
 * @throws Last error if all retries exhausted
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  options: {
    operationName?: string
    classifier?: ErrorClassifier
    onRetry?: (event: RetryEvent) => void
    abortSignal?: AbortSignal
    provider?: string
  } = {}
): Promise<T> {
  const finalConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  const { operationName, onRetry, abortSignal, provider } = options
  const classifier = options.classifier ?? errorClassifier

  let lastError: Error | undefined
  let totalDelay = 0

  for (let attempt = 0; attempt < finalConfig.maxAttempts; attempt++) {
    // Check for abort
    if (abortSignal?.aborted) {
      throw new Error('Operation aborted')
    }

    try {
      // Execute with optional timeout
      if (finalConfig.attemptTimeoutMs) {
        return await withAttemptTimeout(operation, finalConfig.attemptTimeoutMs)
      }
      return await operation()
    } catch (error) {
      const classified = classifier.classify(error, { provider })

      // Check if we should retry
      const shouldRetry = finalConfig.shouldRetry
        ? finalConfig.shouldRetry(error, attempt)
        : classified.isRetryable

      if (!shouldRetry) {
        log.debug('Error not retryable, throwing immediately', {
          attempt: attempt + 1,
          category: classified.category,
          operationName,
        })
        throw error
      }

      // Check if we have more attempts
      if (attempt >= finalConfig.maxAttempts - 1) {
        log.warn('Retry exhausted', {
          attempts: attempt + 1,
          maxAttempts: finalConfig.maxAttempts,
          operationName,
          category: classified.category,
        })
        throw error
      }

      // Calculate delay
      const delay = calculateDelay(attempt, finalConfig, classified.suggestedDelay)
      totalDelay += delay

      // Emit retry event
      const event: RetryEvent = {
        type: 'retry',
        attempt: attempt + 1,
        maxAttempts: finalConfig.maxAttempts,
        delay,
        error: classified,
        operationName,
      }

      log.info('Retrying operation', {
        attempt: attempt + 1,
        maxAttempts: finalConfig.maxAttempts,
        delay,
        category: classified.category,
        operationName,
      })

      onRetry?.(event)

      // Wait before retry
      await sleep(delay)
      lastError = classified.originalError
    }
  }

  // Should not reach here, but just in case
  throw lastError ?? new Error('Retry failed with unknown error')
}

/**
 * Retry wrapper that returns a result object instead of throwing
 */
export async function withRetrySafe<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  options: {
    operationName?: string
    classifier?: ErrorClassifier
    onRetry?: (event: RetryEvent) => void
    abortSignal?: AbortSignal
    provider?: string
  } = {}
): Promise<RetryResult<T>> {
  const finalConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  const { operationName, onRetry, abortSignal, provider } = options
  const classifier = options.classifier ?? errorClassifier

  const errors: ClassifiedError[] = []
  let totalDelay = 0

  for (let attempt = 0; attempt < finalConfig.maxAttempts; attempt++) {
    // Check for abort
    if (abortSignal?.aborted) {
      errors.push(
        classifier.classify(new Error('Operation aborted'), { provider })
      )
      return {
        success: false,
        attempts: attempt + 1,
        totalDelayMs: totalDelay,
        errors,
      }
    }

    try {
      // Execute with optional timeout
      let result: T
      if (finalConfig.attemptTimeoutMs) {
        result = await withAttemptTimeout(operation, finalConfig.attemptTimeoutMs)
      } else {
        result = await operation()
      }

      return {
        success: true,
        value: result,
        attempts: attempt + 1,
        totalDelayMs: totalDelay,
        errors,
      }
    } catch (error) {
      const classified = classifier.classify(error, { provider })
      errors.push(classified)

      // Check if we should retry
      const shouldRetry = finalConfig.shouldRetry
        ? finalConfig.shouldRetry(error, attempt)
        : classified.isRetryable

      if (!shouldRetry || attempt >= finalConfig.maxAttempts - 1) {
        return {
          success: false,
          attempts: attempt + 1,
          totalDelayMs: totalDelay,
          errors,
        }
      }

      // Calculate delay
      const delay = calculateDelay(attempt, finalConfig, classified.suggestedDelay)
      totalDelay += delay

      // Emit retry event
      const event: RetryEvent = {
        type: 'retry',
        attempt: attempt + 1,
        maxAttempts: finalConfig.maxAttempts,
        delay,
        error: classified,
        operationName,
      }

      onRetry?.(event)

      // Wait before retry
      await sleep(delay)
    }
  }

  return {
    success: false,
    attempts: finalConfig.maxAttempts,
    totalDelayMs: totalDelay,
    errors,
  }
}

/**
 * Retry class for more control and event emission
 */
export class Retry extends EventEmitter {
  private config: RetryConfig
  private classifier: ErrorClassifier

  constructor(config: Partial<RetryConfig> = {}, classifier?: ErrorClassifier) {
    super()
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config }
    this.classifier = classifier ?? errorClassifier
  }

  /**
   * Execute operation with retry
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: {
      operationName?: string
      configOverride?: Partial<RetryConfig>
      abortSignal?: AbortSignal
      provider?: string
    } = {}
  ): Promise<T> {
    const finalConfig = { ...this.config, ...options.configOverride }

    return withRetry(operation, finalConfig, {
      operationName: options.operationName,
      classifier: this.classifier,
      onRetry: (event) => this.emit('retry', event),
      abortSignal: options.abortSignal,
      provider: options.provider,
    })
  }

  /**
   * Execute operation with retry, returning result object
   */
  async executeSafe<T>(
    operation: () => Promise<T>,
    options: {
      operationName?: string
      configOverride?: Partial<RetryConfig>
      abortSignal?: AbortSignal
      provider?: string
    } = {}
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.config, ...options.configOverride }

    return withRetrySafe(operation, finalConfig, {
      operationName: options.operationName,
      classifier: this.classifier,
      onRetry: (event) => this.emit('retry', event),
      abortSignal: options.abortSignal,
      provider: options.provider,
    })
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config }
  }
}

// Default singleton instance
export const retry = new Retry()
