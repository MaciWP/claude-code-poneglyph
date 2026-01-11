import { Elysia, t } from 'elysia'
import { agentRegistry as agentRegistryType } from '../services/agent-registry'
import { NotFoundError } from '../errors'

export const createAgentRoutes = (agentRegistry: typeof agentRegistryType) => {
  return new Elysia({ prefix: '/api' })
    .get('/agents', () => ({
      agents: agentRegistry.getAllAgents(),
      metrics: agentRegistry.getMetrics()
    }))
    .get('/agents/active', () => agentRegistry.getActiveAgents())
    .get('/agents/session/:sessionId', ({ params }) =>
      agentRegistry.getSessionStats(params.sessionId)
    )
    .get('/agents/:id', ({ params }) => {
      const agent = agentRegistry.getAgent(params.id)
      if (!agent) throw new NotFoundError('Agent', params.id)
      return agent
    })
    .post('/agents/:id/complete', ({ params, body }) => {
      const agent = agentRegistry.completeAgent(params.id, body.result, {
        tokensUsed: body.tokensUsed,
        toolCalls: body.toolCalls,
        expertiseUsed: body.expertiseUsed
      })
      if (!agent) throw new NotFoundError('Agent', params.id)
      return agent
    }, {
      body: t.Object({
        result: t.String(),
        tokensUsed: t.Optional(t.Number()),
        toolCalls: t.Optional(t.Number()),
        expertiseUsed: t.Optional(t.String())
      })
    })
    .post('/agents/:id/fail', ({ params, body }) => {
      const agent = agentRegistry.failAgent(params.id, body.error)
      if (!agent) throw new NotFoundError('Agent', params.id)
      return agent
    }, {
      body: t.Object({
        error: t.String()
      })
    })
    .delete('/agents/:id', ({ params }) => {
      const deleted = agentRegistry.deleteAgent(params.id)
      if (!deleted) throw new NotFoundError('Agent', params.id)
      return { ok: true }
    })
    .delete('/agents/session/:sessionId', ({ params }) => {
      const count = agentRegistry.clearSession(params.sessionId)
      return { ok: true, deleted: count }
    })
}
