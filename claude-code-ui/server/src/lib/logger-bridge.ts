// =============================================================================
// LOGGER BRIDGE
// =============================================================================
// Bridges old logger interface with new AI Logger (SPEC-019)
// Provides backward compatibility while enabling AI-friendly logging
// =============================================================================

import { aiLogger, createAILogger, type AILogger } from './ai-logger'
import type { Logger, ContextLogger } from '../logger'

/**
 * Creates a backward-compatible logger that wraps the AI Logger
 * This allows gradual migration from the old logger to the new one
 */
export function createBridgedLogger(): Logger {
  const aiLog = createAILogger()

  return {
    debug(context: string, message: string, data?: unknown): void {
      const childLogger = aiLog.child(context)
      childLogger.debug(message, data as Record<string, unknown>)
    },

    info(context: string, message: string, data?: unknown): void {
      const childLogger = aiLog.child(context)
      childLogger.info(message, data as Record<string, unknown>)
    },

    warn(context: string, message: string, data?: unknown): void {
      const childLogger = aiLog.child(context)
      childLogger.warn(message, data as Record<string, unknown>)
    },

    error(context: string, message: string, data?: unknown): void {
      const childLogger = aiLog.child(context)
      const errorData = data && typeof data === 'object' ? data as Record<string, unknown> : { data }
      const error = errorData.error instanceof Error ? errorData.error : null
      childLogger.error(message, error, errorData)
    },

    child(context: string): ContextLogger {
      const childLogger = aiLog.child(context)
      return createBridgedContextLogger(childLogger)
    },
  }
}

function createBridgedContextLogger(aiLog: AILogger): ContextLogger {
  return {
    debug(message: string, data?: unknown): void {
      aiLog.debug(message, data as Record<string, unknown>)
    },

    info(message: string, data?: unknown): void {
      aiLog.info(message, data as Record<string, unknown>)
    },

    warn(message: string, data?: unknown): void {
      aiLog.warn(message, data as Record<string, unknown>)
    },

    error(message: string, data?: unknown): void {
      const errorData = data && typeof data === 'object' ? data as Record<string, unknown> : { data }
      const error = errorData.error instanceof Error ? errorData.error : null
      aiLog.error(message, error, errorData)
    },
  }
}

/**
 * Request-scoped logger factory for Elysia middleware
 * Creates a logger with request ID and session ID context propagation
 */
export function createRequestLogger(
  requestId: string,
  sessionId?: string,
  agentId?: string
): AILogger {
  let logger = aiLogger
    .withRequestId(requestId)

  if (sessionId) {
    logger = logger.withSession(sessionId)
  }

  if (agentId) {
    logger = logger.withAgent(agentId)
  }

  return logger
}

/**
 * Correlation ID generator for distributed tracing
 */
export function generateCorrelationId(): string {
  return `corr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Request ID generator
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
