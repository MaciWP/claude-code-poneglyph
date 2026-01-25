/**
 * Error Classification System
 *
 * Classifies errors into categories to determine retry strategy.
 * Based on SPEC-016: Error Recovery & Resilience
 */

import { EventEmitter } from 'events'
import { logger } from '../../logger'

const log = logger.child('error-classifier')

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  // Transient - retry
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  NETWORK = 'network',
  SERVICE_UNAVAILABLE = 'unavailable',

  // Permanent - don't retry
  AUTH_ERROR = 'auth',
  INVALID_REQUEST = 'invalid',
  NOT_FOUND = 'not_found',
  CONTEXT_OVERFLOW = 'overflow',

  // Agent-specific
  TOOL_ERROR = 'tool_error',
  AGENT_CRASH = 'agent_crash',
  VALIDATION_FAILED = 'validation',

  // Unknown
  UNKNOWN = 'unknown',
}

/**
 * Classification result with retry information
 */
export interface ClassifiedError {
  category: ErrorCategory
  isRetryable: boolean
  suggestedDelay: number
  maxRetries: number
  message: string
  originalError: Error
  httpStatus?: number
  provider?: string
}

/**
 * Default retry configurations by category
 */
const CATEGORY_CONFIG: Record<
  ErrorCategory,
  { isRetryable: boolean; suggestedDelay: number; maxRetries: number }
> = {
  [ErrorCategory.RATE_LIMIT]: { isRetryable: true, suggestedDelay: 5000, maxRetries: 5 },
  [ErrorCategory.TIMEOUT]: { isRetryable: true, suggestedDelay: 1000, maxRetries: 3 },
  [ErrorCategory.NETWORK]: { isRetryable: true, suggestedDelay: 2000, maxRetries: 3 },
  [ErrorCategory.SERVICE_UNAVAILABLE]: { isRetryable: true, suggestedDelay: 3000, maxRetries: 3 },

  [ErrorCategory.AUTH_ERROR]: { isRetryable: false, suggestedDelay: 0, maxRetries: 0 },
  [ErrorCategory.INVALID_REQUEST]: { isRetryable: false, suggestedDelay: 0, maxRetries: 0 },
  [ErrorCategory.NOT_FOUND]: { isRetryable: false, suggestedDelay: 0, maxRetries: 0 },
  [ErrorCategory.CONTEXT_OVERFLOW]: { isRetryable: false, suggestedDelay: 0, maxRetries: 0 },

  [ErrorCategory.TOOL_ERROR]: { isRetryable: true, suggestedDelay: 1000, maxRetries: 2 },
  [ErrorCategory.AGENT_CRASH]: { isRetryable: true, suggestedDelay: 2000, maxRetries: 2 },
  [ErrorCategory.VALIDATION_FAILED]: { isRetryable: false, suggestedDelay: 0, maxRetries: 0 },

  [ErrorCategory.UNKNOWN]: { isRetryable: true, suggestedDelay: 1000, maxRetries: 1 },
}

/**
 * HTTP status code patterns
 */
const HTTP_STATUS_PATTERNS: Record<number, ErrorCategory> = {
  400: ErrorCategory.INVALID_REQUEST,
  401: ErrorCategory.AUTH_ERROR,
  403: ErrorCategory.AUTH_ERROR,
  404: ErrorCategory.NOT_FOUND,
  408: ErrorCategory.TIMEOUT,
  429: ErrorCategory.RATE_LIMIT,
  500: ErrorCategory.SERVICE_UNAVAILABLE,
  502: ErrorCategory.SERVICE_UNAVAILABLE,
  503: ErrorCategory.SERVICE_UNAVAILABLE,
  504: ErrorCategory.TIMEOUT,
}

/**
 * Error message patterns for classification
 */
interface MessagePattern {
  pattern: RegExp
  category: ErrorCategory
  provider?: string
}

const MESSAGE_PATTERNS: MessagePattern[] = [
  // Rate limiting
  { pattern: /rate.?limit/i, category: ErrorCategory.RATE_LIMIT },
  { pattern: /too many requests/i, category: ErrorCategory.RATE_LIMIT },
  { pattern: /quota exceeded/i, category: ErrorCategory.RATE_LIMIT },
  { pattern: /overloaded/i, category: ErrorCategory.RATE_LIMIT, provider: 'claude' },

  // Timeout
  { pattern: /timeout/i, category: ErrorCategory.TIMEOUT },
  { pattern: /timed? out/i, category: ErrorCategory.TIMEOUT },
  { pattern: /deadline exceeded/i, category: ErrorCategory.TIMEOUT },
  { pattern: /ETIMEDOUT/i, category: ErrorCategory.TIMEOUT },

  // Network
  { pattern: /network/i, category: ErrorCategory.NETWORK },
  { pattern: /ECONNRESET/i, category: ErrorCategory.NETWORK },
  { pattern: /ECONNREFUSED/i, category: ErrorCategory.NETWORK },
  { pattern: /ENOTFOUND/i, category: ErrorCategory.NETWORK },
  { pattern: /socket hang up/i, category: ErrorCategory.NETWORK },
  { pattern: /connection refused/i, category: ErrorCategory.NETWORK },
  { pattern: /fetch failed/i, category: ErrorCategory.NETWORK },

  // Auth
  { pattern: /unauthorized/i, category: ErrorCategory.AUTH_ERROR },
  { pattern: /authentication/i, category: ErrorCategory.AUTH_ERROR },
  { pattern: /invalid.*api.?key/i, category: ErrorCategory.AUTH_ERROR },
  { pattern: /permission denied/i, category: ErrorCategory.AUTH_ERROR },

  // Context/Token overflow
  { pattern: /context.*(length|window|limit)/i, category: ErrorCategory.CONTEXT_OVERFLOW },
  { pattern: /max.?tokens/i, category: ErrorCategory.CONTEXT_OVERFLOW },
  { pattern: /token limit/i, category: ErrorCategory.CONTEXT_OVERFLOW },
  { pattern: /too long/i, category: ErrorCategory.CONTEXT_OVERFLOW },

  // Tool errors
  { pattern: /tool.*(failed|error)/i, category: ErrorCategory.TOOL_ERROR },
  { pattern: /execution failed/i, category: ErrorCategory.TOOL_ERROR },

  // Agent crash
  { pattern: /process.*(died|crashed|killed)/i, category: ErrorCategory.AGENT_CRASH },
  { pattern: /SIGTERM|SIGKILL/i, category: ErrorCategory.AGENT_CRASH },

  // Validation
  { pattern: /validation.*(failed|error)/i, category: ErrorCategory.VALIDATION_FAILED },
  { pattern: /invalid.*(input|request|parameter)/i, category: ErrorCategory.INVALID_REQUEST },
]

/**
 * Error Classifier class
 */
export class ErrorClassifier extends EventEmitter {
  private classificationCount = 0
  private categoryStats: Map<ErrorCategory, number> = new Map()

  constructor() {
    super()
  }

  /**
   * Classify an error and return classification result
   */
  classify(error: unknown, context?: { provider?: string }): ClassifiedError {
    this.classificationCount++

    const normalizedError = this.normalizeError(error)
    const category = this.determineCategory(normalizedError, context?.provider)
    const config = CATEGORY_CONFIG[category]

    // Extract suggested delay from rate limit headers if available
    let suggestedDelay = config.suggestedDelay
    if (category === ErrorCategory.RATE_LIMIT) {
      const headerDelay = this.extractRetryAfter(error)
      if (headerDelay > 0) {
        suggestedDelay = headerDelay
      }
    }

    const classified: ClassifiedError = {
      category,
      isRetryable: config.isRetryable,
      suggestedDelay,
      maxRetries: config.maxRetries,
      message: normalizedError.message,
      originalError: normalizedError,
      httpStatus: this.extractHttpStatus(error),
      provider: context?.provider,
    }

    // Update stats
    const currentCount = this.categoryStats.get(category) || 0
    this.categoryStats.set(category, currentCount + 1)

    log.debug('Error classified', {
      category,
      isRetryable: classified.isRetryable,
      message: normalizedError.message.slice(0, 100),
      provider: context?.provider,
    })

    this.emit('classified', classified)
    return classified
  }

  /**
   * Normalize unknown error to Error instance
   */
  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error
    }
    if (typeof error === 'string') {
      return new Error(error)
    }
    if (error && typeof error === 'object') {
      const msg =
        'message' in error && typeof error.message === 'string'
          ? error.message
          : JSON.stringify(error)
      return new Error(msg)
    }
    return new Error(String(error))
  }

  /**
   * Determine error category from error and context
   */
  private determineCategory(error: Error, provider?: string): ErrorCategory {
    // Check HTTP status first
    const httpStatus = this.extractHttpStatus(error)
    if (httpStatus && HTTP_STATUS_PATTERNS[httpStatus]) {
      return HTTP_STATUS_PATTERNS[httpStatus]
    }

    // Check message patterns
    const message = error.message
    for (const { pattern, category, provider: patternProvider } of MESSAGE_PATTERNS) {
      if (pattern.test(message)) {
        // If pattern has a provider requirement, check it
        if (patternProvider && provider !== patternProvider) {
          continue
        }
        return category
      }
    }

    // Check error name
    if (error.name === 'AbortError') {
      return ErrorCategory.TIMEOUT
    }
    if (error.name === 'TypeError' && message.includes('fetch')) {
      return ErrorCategory.NETWORK
    }

    return ErrorCategory.UNKNOWN
  }

  /**
   * Extract HTTP status from error object
   */
  private extractHttpStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') return undefined

    // Direct status property
    if ('status' in error && typeof error.status === 'number') {
      return error.status
    }

    // statusCode property
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return error.statusCode
    }

    // Response object
    if ('response' in error && error.response && typeof error.response === 'object') {
      const response = error.response as Record<string, unknown>
      if ('status' in response && typeof response.status === 'number') {
        return response.status
      }
    }

    // Cause chain
    if ('cause' in error && error.cause) {
      return this.extractHttpStatus(error.cause)
    }

    return undefined
  }

  /**
   * Extract retry-after delay from headers (rate limit responses)
   */
  private extractRetryAfter(error: unknown): number {
    if (!error || typeof error !== 'object') return 0

    // Check for retry-after header
    if ('headers' in error && error.headers && typeof error.headers === 'object') {
      const headers = error.headers as Record<string, unknown>
      const retryAfter = headers['retry-after'] || headers['Retry-After']
      if (typeof retryAfter === 'string') {
        const seconds = parseInt(retryAfter, 10)
        if (!isNaN(seconds)) {
          return seconds * 1000
        }
        // Try parsing as HTTP date
        const date = new Date(retryAfter)
        if (!isNaN(date.getTime())) {
          return Math.max(0, date.getTime() - Date.now())
        }
      }
      if (typeof retryAfter === 'number') {
        return retryAfter * 1000
      }
    }

    // Check response headers
    if ('response' in error && error.response && typeof error.response === 'object') {
      return this.extractRetryAfter(error.response)
    }

    return 0
  }

  /**
   * Check if an error is retryable (convenience method)
   */
  isRetryable(error: unknown, context?: { provider?: string }): boolean {
    return this.classify(error, context).isRetryable
  }

  /**
   * Get classification statistics
   */
  getStats(): { total: number; byCategory: Record<ErrorCategory, number> } {
    const byCategory: Record<ErrorCategory, number> = {} as Record<ErrorCategory, number>
    for (const category of Object.values(ErrorCategory)) {
      byCategory[category] = this.categoryStats.get(category) || 0
    }
    return {
      total: this.classificationCount,
      byCategory,
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.classificationCount = 0
    this.categoryStats.clear()
  }
}

/**
 * Custom error types for resilience system
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export class CircuitOpenError extends Error {
  public readonly circuitName: string

  constructor(circuitName: string) {
    super(`Circuit breaker '${circuitName}' is open`)
    this.name = 'CircuitOpenError'
    this.circuitName = circuitName
  }
}

export class RetryExhaustedError extends Error {
  public readonly attempts: number
  public readonly lastError: Error

  constructor(attempts: number, lastError: Error) {
    super(`Retry exhausted after ${attempts} attempts: ${lastError.message}`)
    this.name = 'RetryExhaustedError'
    this.attempts = attempts
    this.lastError = lastError
  }
}

// Default singleton instance
export const errorClassifier = new ErrorClassifier()
