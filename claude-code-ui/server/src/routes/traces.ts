import { Elysia, t } from 'elysia'
import { traceStore } from '../services/trace-store'
import { traceCollector } from '../services/trace-collector'
import { logger } from '../logger'
import { NotFoundError, toErrorResponse, getStatusCode } from '../errors'

const log = logger.child('traces-routes')

export const tracesRoutes = new Elysia({ prefix: '/api/traces' })
  .get('/stats', async ({ set }) => {
    try {
      return await traceStore.getStats()
    } catch (error) {
      log.error('Failed to get trace stats', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  })

  .get('/active', ({ set }) => {
    try {
      const active = traceCollector.getActiveTraces()
      return { traces: active }
    } catch (error) {
      log.error('Failed to get active traces', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  })

  .get('/:id', async ({ params, set }) => {
    try {
      const trace = traceCollector.getTrace(params.id)
      if (trace) return { trace }

      const recent = await traceStore.getRecent(500)
      const stored = recent.find((t) => t.id === params.id)
      if (stored) return { trace: stored }

      throw new NotFoundError('Trace', params.id)
    } catch (error) {
      log.error('Failed to get trace', { error: String(error), id: params.id })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  })

  .get(
    '/',
    async ({ query, set }) => {
      try {
        if (query.sessionId) {
          const traces = await traceStore.getBySession(query.sessionId)
          return { traces }
        }

        if (query.from && query.to) {
          const traces = await traceStore.getDateRange(query.from, query.to)
          return { traces }
        }

        const limit = Math.min(Math.max(1, Number(query.limit) || 50), 500)
        const traces = await traceStore.getRecent(limit)
        return { traces }
      } catch (error) {
        log.error('Failed to list traces', { error: String(error) })
        set.status = getStatusCode(error)
        return toErrorResponse(error)
      }
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        sessionId: t.Optional(t.String()),
      }),
    }
  )
