import { Elysia, t } from 'elysia'
import { logger, type LogLevel, type LogSource } from '../services/logger'

// =============================================================================
// LOGS ROUTES
// =============================================================================

export const logsRoutes = new Elysia({ prefix: '/api/logs' })
  // ---------------------------------------------------------------------------
  // GET /api/logs - Retrieve logs with optional filters
  // ---------------------------------------------------------------------------
  .get('/', ({ query }) => {
    try {
      const filters = {
        level: query.level as LogLevel | undefined,
        source: query.source as LogSource | undefined,
        sessionId: query.sessionId,
        agentId: query.agentId,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        offset: query.offset ? parseInt(query.offset, 10) : undefined,
      }

      const logs = logger.getLogs(filters)
      return { logs, count: logs.length }
    } catch (error) {
      return {
        error: 'Failed to retrieve logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }, {
    query: t.Object({
      level: t.Optional(t.Union([
        t.Literal('debug'),
        t.Literal('info'),
        t.Literal('warn'),
        t.Literal('error'),
      ])),
      source: t.Optional(t.Union([
        t.Literal('orchestrator'),
        t.Literal('agent'),
        t.Literal('learning'),
        t.Literal('expert'),
        t.Literal('system'),
      ])),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
      sessionId: t.Optional(t.String()),
      agentId: t.Optional(t.String()),
    }),
  })

  // ---------------------------------------------------------------------------
  // POST /api/logs/clear - Clear all logs
  // ---------------------------------------------------------------------------
  .post('/clear', ({ body, set }) => {
    try {
      if (!body.confirm) {
        set.status = 400
        return {
          error: 'Confirmation required',
          details: 'Set confirm: true to clear all logs',
        }
      }

      logger.clear()
      return { ok: true, message: 'All logs cleared' }
    } catch (error) {
      set.status = 500
      return {
        error: 'Failed to clear logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }, {
    body: t.Object({
      confirm: t.Boolean(),
    }),
  })

  // ---------------------------------------------------------------------------
  // GET /api/logs/export - Export logs as file
  // ---------------------------------------------------------------------------
  .get('/export', ({ query, set }) => {
    try {
      const format = (query.format as 'json' | 'text') || 'json'
      const content = logger.exportLogs(format)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const extension = format === 'json' ? 'json' : 'txt'
      const filename = `logs-${timestamp}.${extension}`

      set.headers['Content-Type'] = format === 'json'
        ? 'application/json'
        : 'text/plain'
      set.headers['Content-Disposition'] = `attachment; filename="${filename}"`

      return content
    } catch (error) {
      set.status = 500
      return {
        error: 'Failed to export logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }, {
    query: t.Object({
      format: t.Optional(t.Union([
        t.Literal('json'),
        t.Literal('text'),
      ])),
    }),
  })

  // ---------------------------------------------------------------------------
  // GET /api/logs/count - Get total log count
  // ---------------------------------------------------------------------------
  .get('/count', () => {
    try {
      const count = logger.getLogCount()
      return { count }
    } catch (error) {
      return {
        error: 'Failed to get log count',
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
