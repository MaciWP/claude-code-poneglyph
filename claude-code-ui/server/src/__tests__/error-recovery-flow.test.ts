import { describe, test, expect, mock, beforeEach } from 'bun:test'

/**
 * Error Recovery Flow Tests
 *
 * Tests error handling, retry logic, and error-analyzer integration
 * following patterns in .claude/skills/retry-patterns/
 */

// Types
type ErrorType = 'transient' | 'persistent' | 'fatal'

interface TaskError {
  type: ErrorType
  message: string
  retryable: boolean
  code?: string
}

interface TaskResult {
  success: boolean
  output?: string
  error?: TaskError
}

interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

interface ErrorAnalysis {
  recommendation: 'retry' | 'replan' | 'abort'
  reason: string
  suggestedAction?: string
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
}

/**
 * Calculate delay with exponential backoff
 */
function calculateBackoff(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt)
  return Math.min(delay, config.maxDelayMs)
}

/**
 * Execute task with retry logic
 */
async function executeWithRetry(
  task: () => Promise<TaskResult>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<TaskResult & { attempts: number }> {
  let lastResult: TaskResult = { success: false }
  let attempts = 0

  while (attempts < config.maxRetries) {
    attempts++
    lastResult = await task()

    if (lastResult.success) {
      return { ...lastResult, attempts }
    }

    if (!lastResult.error?.retryable) {
      return { ...lastResult, attempts }
    }

    if (attempts < config.maxRetries) {
      const delay = calculateBackoff(attempts - 1, config)
      await Bun.sleep(delay)
    }
  }

  return { ...lastResult, attempts }
}

/**
 * Analyze error and recommend action
 */
function analyzeError(error: TaskError): ErrorAnalysis {
  if (error.type === 'fatal') {
    return {
      recommendation: 'abort',
      reason: `Fatal error: ${error.message}`,
    }
  }

  if (error.type === 'transient' && error.retryable) {
    return {
      recommendation: 'retry',
      reason: 'Transient error, retry may succeed',
    }
  }

  if (error.type === 'persistent') {
    // Check for specific error codes that suggest replanning
    if (error.code === 'SCHEMA_MISMATCH' || error.code === 'DEPENDENCY_CONFLICT') {
      return {
        recommendation: 'replan',
        reason: `Persistent error requires new approach: ${error.message}`,
        suggestedAction: 'Re-analyze requirements and create new execution plan',
      }
    }

    return {
      recommendation: 'abort',
      reason: `Persistent error cannot be resolved: ${error.message}`,
    }
  }

  return {
    recommendation: 'abort',
    reason: 'Unknown error type',
  }
}

/**
 * Full error recovery flow
 */
async function executeWithErrorRecovery(
  task: () => Promise<TaskResult>,
  onReplan?: () => Promise<TaskResult>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<{
  success: boolean
  finalResult: TaskResult
  retryAttempts: number
  replanned: boolean
}> {
  // Step 1: Try with retries
  const retryResult = await executeWithRetry(task, config)

  if (retryResult.success) {
    return {
      success: true,
      finalResult: retryResult,
      retryAttempts: retryResult.attempts,
      replanned: false,
    }
  }

  // Step 2: Analyze error
  if (retryResult.error) {
    const analysis = analyzeError(retryResult.error)

    // Step 3: Handle based on recommendation
    if (analysis.recommendation === 'replan' && onReplan) {
      const replanResult = await onReplan()
      return {
        success: replanResult.success,
        finalResult: replanResult,
        retryAttempts: retryResult.attempts,
        replanned: true,
      }
    }
  }

  return {
    success: false,
    finalResult: retryResult,
    retryAttempts: retryResult.attempts,
    replanned: false,
  }
}

describe('Error Recovery Flow', () => {
  describe('Transient Error Retry', () => {
    test('should retry on transient errors', async () => {
      let attempts = 0
      const flakyTask = async (): Promise<TaskResult> => {
        attempts++
        if (attempts < 3) {
          return {
            success: false,
            error: {
              type: 'transient',
              message: 'Network timeout',
              retryable: true,
            },
          }
        }
        return { success: true, output: 'Done' }
      }

      const result = await executeWithRetry(flakyTask)

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(3)
    })

    test('should apply exponential backoff', () => {
      const config: RetryConfig = {
        maxRetries: 5,
        baseDelayMs: 100,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      }

      expect(calculateBackoff(0, config)).toBe(100)
      expect(calculateBackoff(1, config)).toBe(200)
      expect(calculateBackoff(2, config)).toBe(400)
      expect(calculateBackoff(3, config)).toBe(800)
    })

    test('should cap delay at maxDelayMs', () => {
      const config: RetryConfig = {
        maxRetries: 10,
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      }

      expect(calculateBackoff(10, config)).toBe(5000)
    })

    test('should stop retrying after maxRetries', async () => {
      let attempts = 0
      const alwaysFailTask = async (): Promise<TaskResult> => {
        attempts++
        return {
          success: false,
          error: {
            type: 'transient',
            message: 'Always fails',
            retryable: true,
          },
        }
      }

      const config: RetryConfig = {
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      }

      const result = await executeWithRetry(alwaysFailTask, config)

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(3)
      expect(attempts).toBe(3)
    })
  })

  describe('Persistent Error Analysis', () => {
    test('should trigger error-analyzer after max retries', async () => {
      const persistentTask = async (): Promise<TaskResult> => {
        return {
          success: false,
          error: {
            type: 'persistent',
            message: 'Schema mismatch',
            retryable: false,
            code: 'SCHEMA_MISMATCH',
          },
        }
      }

      const config: RetryConfig = {
        maxRetries: 1,
        baseDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      }

      const result = await executeWithRetry(persistentTask, config)
      const analysis = analyzeError(result.error!)

      expect(result.success).toBe(false)
      expect(analysis.recommendation).toBe('replan')
    })

    test('should receive structured error context', async () => {
      const error: TaskError = {
        type: 'persistent',
        message: 'Database constraint violation',
        retryable: false,
        code: 'CONSTRAINT_ERROR',
      }

      const analysis = analyzeError(error)

      expect(analysis).toHaveProperty('recommendation')
      expect(analysis).toHaveProperty('reason')
      expect(analysis.reason).toContain('Persistent error')
    })
  })

  describe('Error-Analyzer Recommendations', () => {
    test('should trigger re-plan on replan recommendation', async () => {
      const error: TaskError = {
        type: 'persistent',
        message: 'Schema mismatch',
        retryable: false,
        code: 'SCHEMA_MISMATCH',
      }

      const analysis = analyzeError(error)

      expect(analysis.recommendation).toBe('replan')
      expect(analysis.suggestedAction).toContain('Re-analyze')
    })

    test('should recommend retry for transient errors', () => {
      const error: TaskError = {
        type: 'transient',
        message: 'Connection reset',
        retryable: true,
      }

      const analysis = analyzeError(error)

      expect(analysis.recommendation).toBe('retry')
    })

    test('should abort on fatal errors', () => {
      const error: TaskError = {
        type: 'fatal',
        message: 'Critical system failure',
        retryable: false,
      }

      const analysis = analyzeError(error)

      expect(analysis.recommendation).toBe('abort')
      expect(analysis.reason).toContain('Fatal error')
    })

    test('should abort on unknown persistent errors', () => {
      const error: TaskError = {
        type: 'persistent',
        message: 'Unknown error',
        retryable: false,
        code: 'UNKNOWN',
      }

      const analysis = analyzeError(error)

      expect(analysis.recommendation).toBe('abort')
    })
  })

  describe('Full Recovery Flow', () => {
    test('should complete successfully on first try', async () => {
      const successTask = async (): Promise<TaskResult> => ({
        success: true,
        output: 'Completed',
      })

      const result = await executeWithErrorRecovery(successTask)

      expect(result.success).toBe(true)
      expect(result.retryAttempts).toBe(1)
      expect(result.replanned).toBe(false)
    })

    test('should retry and succeed on transient failure', async () => {
      let attempts = 0
      const flakyTask = async (): Promise<TaskResult> => {
        attempts++
        if (attempts < 2) {
          return {
            success: false,
            error: { type: 'transient', message: 'Timeout', retryable: true },
          }
        }
        return { success: true, output: 'Done after retry' }
      }

      const config: RetryConfig = {
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      }

      const result = await executeWithErrorRecovery(flakyTask, undefined, config)

      expect(result.success).toBe(true)
      expect(result.retryAttempts).toBe(2)
    })

    test('should trigger replan on schema mismatch', async () => {
      const failingTask = async (): Promise<TaskResult> => ({
        success: false,
        error: {
          type: 'persistent',
          message: 'Schema mismatch',
          retryable: false,
          code: 'SCHEMA_MISMATCH',
        },
      })

      const replanTask = mock(async (): Promise<TaskResult> => ({
        success: true,
        output: 'Replanned and completed',
      }))

      const config: RetryConfig = {
        maxRetries: 1,
        baseDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      }

      const result = await executeWithErrorRecovery(failingTask, replanTask, config)

      expect(result.replanned).toBe(true)
      expect(replanTask).toHaveBeenCalled()
    })

    test('should abort on fatal error without replan', async () => {
      const fatalTask = async (): Promise<TaskResult> => ({
        success: false,
        error: {
          type: 'fatal',
          message: 'Critical failure',
          retryable: false,
        },
      })

      const replanTask = mock(async (): Promise<TaskResult> => ({
        success: true,
      }))

      const result = await executeWithErrorRecovery(fatalTask, replanTask)

      expect(result.success).toBe(false)
      expect(result.replanned).toBe(false)
      expect(replanTask).not.toHaveBeenCalled()
    })
  })
})
