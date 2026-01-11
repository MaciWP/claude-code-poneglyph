import { Elysia, t } from 'elysia'
import { learningLoop } from '../services/learning-loop'
import { logger } from '../logger'
import { toErrorResponse, getStatusCode } from '../errors'

const log = logger.child('learning-routes')

export const learningRoutes = new Elysia({ prefix: '/api/learning' })
  .get('/stats', ({ set }) => {
    try {
      const stats = learningLoop.getStats()
      return stats
    } catch (error) {
      log.error('Failed to get learning stats', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  })

  .get('/history/:expertId', ({ params, set }) => {
    try {
      const history = learningLoop.getHistory(params.expertId)
      return {
        expertId: params.expertId,
        history: history.map(trace => ({
          agentId: trace.agentId,
          agentType: trace.agentType,
          sessionId: trace.sessionId,
          success: trace.success,
          toolCalls: trace.toolCalls,
          durationMs: trace.durationMs
        }))
      }
    } catch (error) {
      log.error('Failed to get learning history', { expertId: params.expertId, error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  }, {
    params: t.Object({
      expertId: t.String()
    })
  })

  .post('/config', ({ body, set }) => {
    try {
      if (typeof body.autoLearnEnabled === 'boolean') {
        learningLoop.setAutoLearnEnabled(body.autoLearnEnabled)
      }
      return { success: true }
    } catch (error) {
      log.error('Failed to update learning config', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  }, {
    body: t.Object({
      autoLearnEnabled: t.Optional(t.Boolean())
    })
  })

  .get('/config', () => {
    const stats = learningLoop.getStats()
    return {
      autoLearnEnabled: learningLoop.isAutoLearnEnabled(),
      stats
    }
  })
