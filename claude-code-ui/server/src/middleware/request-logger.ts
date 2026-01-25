// =============================================================================
// REQUEST LOGGER MIDDLEWARE
// =============================================================================
// SPEC-019: Elysia middleware for AI-friendly request logging
// Provides automatic context propagation (request ID, session ID)
// =============================================================================

import { Elysia } from 'elysia'
import { aiLogger, type AILogger } from '../lib/ai-logger'
import { generateRequestId, generateCorrelationId } from '../lib/logger-bridge'

/**
 * Request context interface for type-safe access
 */
export interface RequestContext {
  requestId: string
  correlationId: string
  logger: AILogger
  startTime: number
}

/**
 * Elysia plugin that adds AI-friendly logging to all requests
 *
 * Features:
 * - Automatic request ID generation
 * - Correlation ID from headers or auto-generated
 * - Session ID extraction from query/headers
 * - Request duration tracking
 * - Structured request/response logging
 */
export const requestLoggerPlugin = new Elysia({ name: 'request-logger' })
  .derive(({ request, set }) => {
    const url = new URL(request.url)
    const startTime = Date.now()

    // Extract or generate correlation ID
    const correlationId =
      request.headers.get('x-correlation-id') ||
      request.headers.get('x-request-id') ||
      generateCorrelationId()

    // Generate unique request ID
    const requestId = generateRequestId()

    // Extract session ID from query or headers
    const sessionId =
      url.searchParams.get('sessionId') ||
      request.headers.get('x-session-id') ||
      undefined

    // Extract agent ID from headers (for multi-agent scenarios)
    const agentId = request.headers.get('x-agent-id') || undefined

    // Create request-scoped logger with context
    let logger = aiLogger
      .withRequestId(requestId)
      .withCorrelation(correlationId)
      .withContext({
        operation: `${request.method} ${url.pathname}`,
        phase: 'execute',
      })

    if (sessionId) {
      logger = logger.withSession(sessionId)
    }

    if (agentId) {
      logger = logger.withAgent(agentId)
    }

    // Log request start
    logger.info('Request started', {
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      userAgent: request.headers.get('user-agent')?.slice(0, 100),
    })

    // Add correlation ID to response headers
    set.headers['x-request-id'] = requestId
    set.headers['x-correlation-id'] = correlationId

    return {
      requestContext: {
        requestId,
        correlationId,
        logger,
        startTime,
      } as RequestContext,
    }
  })
  .onAfterHandle(({ requestContext }) => {
    if (!requestContext) return

    const duration = Date.now() - requestContext.startTime

    requestContext.logger.info('Request completed', {
      duration,
      status: 200,
    })
  })
  .onError(({ requestContext, error }) => {
    if (!requestContext) return

    const duration = Date.now() - requestContext.startTime
    const statusCode = 'status' in error ? (error as { status: number }).status : 500

    requestContext.logger.error(
      'Request failed',
      error instanceof Error ? error : new Error(String(error)),
      {
        duration,
        status: statusCode,
      }
    )
  })

/**
 * Lightweight version without full request logging
 * Only provides the logger and context for manual use
 */
export const requestContextPlugin = new Elysia({ name: 'request-context' })
  .derive(({ request, set }) => {
    const url = new URL(request.url)

    const correlationId =
      request.headers.get('x-correlation-id') ||
      generateCorrelationId()

    const requestId = generateRequestId()

    const sessionId =
      url.searchParams.get('sessionId') ||
      request.headers.get('x-session-id') ||
      undefined

    let logger = aiLogger
      .withRequestId(requestId)
      .withCorrelation(correlationId)

    if (sessionId) {
      logger = logger.withSession(sessionId)
    }

    set.headers['x-request-id'] = requestId
    set.headers['x-correlation-id'] = correlationId

    return {
      requestContext: {
        requestId,
        correlationId,
        logger,
        startTime: Date.now(),
      } as RequestContext,
    }
  })
