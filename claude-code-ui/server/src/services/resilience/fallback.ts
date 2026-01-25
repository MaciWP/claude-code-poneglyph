/**
 * Fallback Chain Pattern
 *
 * Provides graceful degradation when primary operations fail.
 * Based on SPEC-016: Error Recovery & Resilience
 */

import { EventEmitter } from 'events'
import { logger } from '../../logger'
import { type ClassifiedError, errorClassifier } from './error-classifier'

const log = logger.child('fallback')

/**
 * Fallback operation definition
 */
export interface FallbackOperation<T> {
  /** Name of the fallback for logging */
  name: string
  /** The operation to execute */
  operation: () => Promise<T>
  /** Optional condition to check before trying this fallback */
  condition?: (error: Error) => boolean
  /** Priority (lower = higher priority) */
  priority?: number
}

/**
 * Fallback chain configuration
 */
export interface FallbackChain<T> {
  /** Primary operation to try first */
  primary: () => Promise<T>
  /** Name of the primary operation */
  primaryName?: string
  /** List of fallback operations in priority order */
  fallbacks: FallbackOperation<T>[]
  /** Degraded mode response when all fallbacks fail */
  degraded?: () => T
  /** Degraded mode name for logging */
  degradedName?: string
}

/**
 * Fallback event types
 */
export interface FallbackEvent {
  type: 'fallback' | 'degraded' | 'success'
  from: string
  to?: string
  error?: ClassifiedError
  timestamp: number
}

/**
 * Fallback result
 */
export interface FallbackResult<T> {
  success: boolean
  value?: T
  usedFallback: boolean
  fallbackName?: string
  isDegraded: boolean
  errors: Array<{ operation: string; error: ClassifiedError }>
}

/**
 * Execute a fallback chain
 */
export async function withFallback<T>(
  chain: FallbackChain<T>,
  options: {
    onFallback?: (event: FallbackEvent) => void
    abortSignal?: AbortSignal
  } = {}
): Promise<T> {
  const { onFallback, abortSignal } = options
  const errors: Array<{ operation: string; error: Error }> = []
  const primaryName = chain.primaryName ?? 'primary'

  // Check for abort
  if (abortSignal?.aborted) {
    throw new Error('Operation aborted')
  }

  // Try primary operation
  try {
    const result = await chain.primary()
    onFallback?.({
      type: 'success',
      from: primaryName,
      timestamp: Date.now(),
    })
    return result
  } catch (primaryError) {
    const error = primaryError instanceof Error ? primaryError : new Error(String(primaryError))
    errors.push({ operation: primaryName, error })

    log.debug('Primary operation failed, trying fallbacks', {
      primary: primaryName,
      error: error.message,
      fallbackCount: chain.fallbacks.length,
    })

    // Try fallbacks in order
    const sortedFallbacks = [...chain.fallbacks].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
    )

    for (const fallback of sortedFallbacks) {
      // Check for abort
      if (abortSignal?.aborted) {
        throw new Error('Operation aborted')
      }

      // Check condition if provided
      if (fallback.condition && !fallback.condition(error)) {
        log.debug('Fallback condition not met, skipping', { fallback: fallback.name })
        continue
      }

      try {
        log.info('Trying fallback', { from: primaryName, to: fallback.name })
        onFallback?.({
          type: 'fallback',
          from: primaryName,
          to: fallback.name,
          error: errorClassifier.classify(primaryError),
          timestamp: Date.now(),
        })

        const result = await fallback.operation()
        return result
      } catch (fallbackError) {
        const fbError =
          fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError))
        errors.push({ operation: fallback.name, error: fbError })

        log.debug('Fallback failed', {
          fallback: fallback.name,
          error: fbError.message,
        })
      }
    }

    // All fallbacks failed, try degraded mode
    if (chain.degraded) {
      log.warn('All fallbacks failed, using degraded mode', {
        primary: primaryName,
        degraded: chain.degradedName ?? 'degraded',
        errorCount: errors.length,
      })

      onFallback?.({
        type: 'degraded',
        from: primaryName,
        to: chain.degradedName ?? 'degraded',
        error: errorClassifier.classify(primaryError),
        timestamp: Date.now(),
      })

      return chain.degraded()
    }

    // No degraded mode, throw original error
    throw primaryError
  }
}

/**
 * Execute a fallback chain and return result object
 */
export async function withFallbackSafe<T>(
  chain: FallbackChain<T>,
  options: {
    onFallback?: (event: FallbackEvent) => void
    abortSignal?: AbortSignal
  } = {}
): Promise<FallbackResult<T>> {
  const { onFallback, abortSignal } = options
  const errors: Array<{ operation: string; error: ClassifiedError }> = []
  const primaryName = chain.primaryName ?? 'primary'

  // Check for abort
  if (abortSignal?.aborted) {
    return {
      success: false,
      usedFallback: false,
      isDegraded: false,
      errors: [
        {
          operation: primaryName,
          error: errorClassifier.classify(new Error('Operation aborted')),
        },
      ],
    }
  }

  // Try primary operation
  try {
    const result = await chain.primary()
    onFallback?.({
      type: 'success',
      from: primaryName,
      timestamp: Date.now(),
    })
    return {
      success: true,
      value: result,
      usedFallback: false,
      isDegraded: false,
      errors: [],
    }
  } catch (primaryError) {
    errors.push({
      operation: primaryName,
      error: errorClassifier.classify(primaryError),
    })

    // Try fallbacks in order
    const sortedFallbacks = [...chain.fallbacks].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
    )

    for (const fallback of sortedFallbacks) {
      // Check for abort
      if (abortSignal?.aborted) {
        errors.push({
          operation: fallback.name,
          error: errorClassifier.classify(new Error('Operation aborted')),
        })
        return {
          success: false,
          usedFallback: false,
          isDegraded: false,
          errors,
        }
      }

      // Check condition if provided
      const error = primaryError instanceof Error ? primaryError : new Error(String(primaryError))
      if (fallback.condition && !fallback.condition(error)) {
        continue
      }

      try {
        onFallback?.({
          type: 'fallback',
          from: primaryName,
          to: fallback.name,
          error: errorClassifier.classify(primaryError),
          timestamp: Date.now(),
        })

        const result = await fallback.operation()
        return {
          success: true,
          value: result,
          usedFallback: true,
          fallbackName: fallback.name,
          isDegraded: false,
          errors,
        }
      } catch (fallbackError) {
        errors.push({
          operation: fallback.name,
          error: errorClassifier.classify(fallbackError),
        })
      }
    }

    // All fallbacks failed, try degraded mode
    if (chain.degraded) {
      onFallback?.({
        type: 'degraded',
        from: primaryName,
        to: chain.degradedName ?? 'degraded',
        error: errorClassifier.classify(primaryError),
        timestamp: Date.now(),
      })

      return {
        success: true,
        value: chain.degraded(),
        usedFallback: true,
        fallbackName: chain.degradedName ?? 'degraded',
        isDegraded: true,
        errors,
      }
    }

    // No degraded mode
    return {
      success: false,
      usedFallback: false,
      isDegraded: false,
      errors,
    }
  }
}

/**
 * Fallback class for more control and event emission
 */
export class Fallback extends EventEmitter {
  constructor() {
    super()
  }

  /**
   * Execute a fallback chain
   */
  async execute<T>(
    chain: FallbackChain<T>,
    options: { abortSignal?: AbortSignal } = {}
  ): Promise<T> {
    return withFallback(chain, {
      onFallback: (event) => this.emit('fallback', event),
      abortSignal: options.abortSignal,
    })
  }

  /**
   * Execute a fallback chain and return result object
   */
  async executeSafe<T>(
    chain: FallbackChain<T>,
    options: { abortSignal?: AbortSignal } = {}
  ): Promise<FallbackResult<T>> {
    return withFallbackSafe(chain, {
      onFallback: (event) => this.emit('fallback', event),
      abortSignal: options.abortSignal,
    })
  }
}

/**
 * Agent fallback chain configuration
 *
 * Maps complex agents to simpler fallback agents
 */
export const agentFallbackChains: Record<string, string[]> = {
  builder: ['builder-simple', 'manual-mode'],
  reviewer: ['reviewer-quick', 'skip-review'],
  planner: ['planner-simple', 'no-plan'],
  architect: ['architect-simple', 'skip-design'],
  scout: ['scout-quick', 'skip-exploration'],
}

/**
 * Provider fallback chain configuration
 */
export const providerFallbackChains: Record<string, string[]> = {
  claude: ['openai', 'gemini', 'cached'],
  openai: ['claude', 'gemini', 'cached'],
  gemini: ['claude', 'openai', 'cached'],
}

/**
 * Create a fallback chain for agent execution
 */
export function createAgentFallbackChain<T>(
  agentType: string,
  createOperation: (agent: string) => () => Promise<T>,
  degradedResult?: T
): FallbackChain<T> {
  const fallbackAgents = agentFallbackChains[agentType] ?? []

  return {
    primary: createOperation(agentType),
    primaryName: agentType,
    fallbacks: fallbackAgents.map((agent, index) => ({
      name: agent,
      operation: createOperation(agent),
      priority: index,
    })),
    degraded: degradedResult !== undefined ? () => degradedResult : undefined,
    degradedName: 'degraded-response',
  }
}

// Default singleton instance
export const fallback = new Fallback()
