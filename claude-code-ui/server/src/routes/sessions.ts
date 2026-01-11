import { Elysia, t } from 'elysia'
import type { SessionStore } from '../services/sessions'
import { logger } from '../logger'
import { NotFoundError } from '../errors'

export const createSessionRoutes = (sessions: SessionStore) => {
  const log = logger.child('sessions-routes')

  return new Elysia({ prefix: '/api' })
    .get('/sessions', () => sessions.list())
    .post('/sessions', async ({ body }) => {
      const session = await sessions.create(body.name, body.workDir)
      log.info('Session created', { id: session.id, name: session.name })
      return session
    }, {
      body: t.Object({
        name: t.Optional(t.String()),
        workDir: t.Optional(t.String())
      })
    })
    .get('/sessions/:id', async ({ params }) => {
      const session = await sessions.get(params.id)
      if (!session) throw new NotFoundError('Session', params.id)
      return session
    })
    .delete('/sessions/:id', async ({ params }) => {
      await sessions.delete(params.id)
      log.info('Session deleted', { id: params.id })
      return { ok: true }
    })
    .delete('/sessions', async () => {
      const count = await sessions.deleteAll()
      log.info('All sessions deleted', { count })
      return { ok: true, deleted: count }
    })
    .get('/sessions/:id/agents', async ({ params }) => {
      const agents = await sessions.getPersistedAgents(params.id)
      return agents
    })
}
