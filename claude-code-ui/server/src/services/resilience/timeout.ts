/**
 * Timeout Handling
 *
 * Provides timeout wrappers for async operations.
 * Based on SPEC-016: Error Recovery & Resilience
 */

import { logger } from '../../logger'
import { TimeoutError } from './error-classifier'

const log = logger.child('timeout')

/**
 * Timeout configuration by operation type
 */
export interface TimeoutConfig {
  /** Default timeout in ms (default: 30000) */
  default: number
  /** Timeout by operation type */
  byOperation: {
    'llm-call': number
    'tool-execution': number
    'file-read': number
    'web-fetch': number
    'agent-spawn': number
    [key: string]: number
  }
}

/**
 * Default timeout configuration
 */
export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  default: 30000,
  byOperation: {
    'llm-call': 60000,
    'tool-execution': 120000,
    'file-read': 5000,
    'web-fetch': 30000,
    'agent-spawn': 300000,
  },
}

/**
 * Timeout manager
 */
export class TimeoutManager {
  private config: TimeoutConfig

  constructor(config: Partial<TimeoutConfig> = {}) {
    this.config = {
      default: config.default ?? DEFAULT_TIMEOUT_CONFIG.default,
      byOperation: {
        ...DEFAULT_TIMEOUT_CONFIG.byOperation,
        ...config.byOperation,
      },
    }
  }

  /**
   * Get timeout for an operation type
   */
  getTimeout(operationType?: string): number {
    if (operationType && operationType in this.config.byOperation) {
      return this.config.byOperation[operationType]
    }
    return this.config.default
  }

  /**
   * Execute an operation with timeout
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: {
      timeoutMs?: number
      operationType?: string
      operationName?: string
      abortSignal?: AbortSignal
    } = {}
  ): Promise<T> {
    const timeoutMs = options.timeoutMs ?? this.getTimeout(options.operationType)
    const operationName = options.operationName ?? options.operationType ?? 'operation'

    return withTimeout(operation, timeoutMs, {
      operationName,
      abortSignal: options.abortSignal,
    })
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TimeoutConfig>): void {
    if (config.default !== undefined) {
      this.config.default = config.default
    }
    if (config.byOperation) {
      this.config.byOperation = {
        ...this.config.byOperation,
        ...config.byOperation,
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): TimeoutConfig {
    return {
      default: this.config.default,
      byOperation: { ...this.config.byOperation },
    }
  }
}

/**
 * Execute an operation with timeout
 *
 * @param operation - Async operation to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param options - Additional options
 * @returns Result of the operation
 * @throws TimeoutError if operation times out
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  options: {
    operationName?: string
    abortSignal?: AbortSignal
  } = {}
): Promise<T> {
  const { operationName = 'operation', abortSignal } = options

  // If already aborted, throw immediately
  if (abortSignal?.aborted) {
    throw new TimeoutError(`${operationName} was aborted`)
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let abortHandler: (() => void) | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      log.warn('Operation timed out', { operationName, timeoutMs })
      reject(new TimeoutError(`${operationName} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    // Make timer not block process exit
    if (typeof timeoutId === 'object' && 'unref' in timeoutId) {
      timeoutId.unref()
    }

    // Handle abort signal
    if (abortSignal) {
      abortHandler = () => {
        clearTimeout(timeoutId)
        reject(new TimeoutError(`${operationName} was aborted`))
      }
      abortSignal.addEventListener('abort', abortHandler, { once: true })
    }
  })

  try {
    const result = await Promise.race([operation(), timeoutPromise])
    return result
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    if (abortSignal && abortHandler) {
      abortSignal.removeEventListener('abort', abortHandler)
    }
  }
}

/**
 * Execute an operation with timeout, returning result object
 */
export async function withTimeoutSafe<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  options: {
    operationName?: string
    abortSignal?: AbortSignal
  } = {}
): Promise<{ success: boolean; value?: T; timedOut: boolean; error?: Error }> {
  try {
    const value = await withTimeout(operation, timeoutMs, options)
    return { success: true, value, timedOut: false }
  } catch (error) {
    const isTimeout = error instanceof TimeoutError
    return {
      success: false,
      timedOut: isTimeout,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}

/**
 * Create a cancellable timeout
 */
export function createCancellableTimeout(
  callback: () => void,
  timeoutMs: number
): { cancel: () => void; promise: Promise<void> } {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let resolve: () => void

  const promise = new Promise<void>((res) => {
    resolve = res
    timeoutId = setTimeout(() => {
      callback()
      res()
    }, timeoutMs)
  })

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      resolve()
    }
  }

  return { cancel, promise }
}

/**
 * Deadline utility - creates an AbortController that aborts after timeout
 */
export function createDeadline(
  timeoutMs: number
): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController()

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  const cleanup = () => {
    clearTimeout(timeoutId)
  }

  return { controller, cleanup }
}

/**
 * Race multiple operations with individual timeouts
 */
export async function raceWithTimeouts<T>(
  operations: Array<{
    name: string
    operation: () => Promise<T>
    timeoutMs: number
  }>
): Promise<{ name: string; value: T }> {
  const wrappedOps = operations.map(({ name, operation, timeoutMs }) =>
    withTimeout(operation, timeoutMs, { operationName: name }).then((value) => ({
      name,
      value,
    }))
  )

  return Promise.race(wrappedOps)
}

// Default singleton instance
export const timeoutManager = new TimeoutManager()
