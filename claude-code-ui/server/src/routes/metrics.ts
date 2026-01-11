import { Elysia, t } from 'elysia'
import { metricsStore } from '../services/metrics-store'
import { agentRegistry } from '../services/agent-registry'
import { expertStore } from '../services/expert-store'
import { logger } from '../logger'
import { toErrorResponse, getStatusCode } from '../errors'

const log = logger.child('metrics-routes')

const timeRangeSchema = t.Union([
  t.Literal('24h'),
  t.Literal('7d'),
  t.Literal('30d')
])

export const metricsRoutes = new Elysia({ prefix: '/api/metrics' })
  .get('/summary', async ({ query, set }) => {
    const timeRange = query.timeRange || '24h'
    const domain = query.domain

    try {
      const summary = await metricsStore.getSummary({ timeRange, domain })
      const agentMetrics = agentRegistry.getMetrics()

      return {
        ...summary,
        realtime: {
          activeAgents: agentMetrics.activeAgents,
          totalToolCalls: agentMetrics.totalToolCalls,
          expertiseUsageRate: agentMetrics.expertiseUsageRate
        }
      }
    } catch (error) {
      log.error('Failed to get metrics summary', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  }, {
    query: t.Object({
      timeRange: t.Optional(timeRangeSchema),
      domain: t.Optional(t.String())
    })
  })

  .get('/executions', async ({ query, set }) => {
    const timeRange = query.timeRange || '24h'
    const domain = query.domain
    const limit = query.limit || 20

    try {
      const executions = await metricsStore.getExecutions({
        timeRange,
        domain,
        limit
      })

      return { executions }
    } catch (error) {
      log.error('Failed to get executions', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  }, {
    query: t.Object({
      timeRange: t.Optional(timeRangeSchema),
      domain: t.Optional(t.String()),
      limit: t.Optional(t.Number({ default: 20, minimum: 1, maximum: 100 }))
    })
  })

  .get('/agents', async ({ set }) => {
    try {
      const metrics = agentRegistry.getMetrics()
      const agents = agentRegistry.getAllAgents()

      return {
        metrics,
        recent: agents.slice(0, 10).map(a => ({
          id: a.id,
          type: a.type,
          status: a.status,
          toolCalls: a.toolCalls || 0,
          durationMs: a.completedAt && a.startedAt
            ? a.completedAt.getTime() - a.startedAt.getTime()
            : null
        }))
      }
    } catch (error) {
      log.error('Failed to get agent metrics', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  })

  .get('/experts', async ({ set }) => {
    try {
      const experts = await expertStore.list()

      const expertMetrics = await Promise.all(
        experts.map(async (expert) => {
          const validation = await expertStore.validate(expert.id)
          return {
            ...expert,
            valid: validation.valid,
            warnings: validation.warnings.length
          }
        })
      )

      return { experts: expertMetrics }
    } catch (error) {
      log.error('Failed to get expert metrics', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  })
