import { Elysia, t } from 'elysia'
import type { SessionStore } from '../services/sessions'
import { SessionManager, type SessionExport } from '../services/session-manager'
import { logger } from '../logger'
import { NotFoundError, ValidationError } from '../errors'

export const createSessionRoutes = (sessions: SessionStore) => {
  const log = logger.child('sessions-routes')

  // Create session manager with the store
  const sessionManager = new SessionManager(sessions)

  return new Elysia({ prefix: '/api' })
    // List sessions with metadata
    .get('/sessions', async ({ query }) => {
      const options = {
        limit: query.limit ? Number(query.limit) : undefined,
        offset: query.offset ? Number(query.offset) : undefined,
        sortBy: query.sortBy as 'updatedAt' | 'createdAt' | 'name' | undefined,
        order: query.order as 'asc' | 'desc' | undefined,
      }
      const metadata = await sessionManager.list(options)
      return {
        sessions: metadata,
        total: metadata.length,
      }
    }, {
      query: t.Object({
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        order: t.Optional(t.String()),
      })
    })

    // Create new session
    .post('/sessions', async ({ body }) => {
      const session = await sessionManager.create({
        name: body.name,
        workDir: body.workDir,
        provider: body.provider,
      })
      log.info('Session created', { id: session.id, name: session.name })
      return session
    }, {
      body: t.Object({
        name: t.Optional(t.String()),
        workDir: t.Optional(t.String()),
        provider: t.Optional(t.String()),
      })
    })

    // Get full session
    .get('/sessions/:id', async ({ params }) => {
      const session = await sessionManager.get(params.id)
      if (!session) throw new NotFoundError('Session', params.id)
      return { session }
    })

    // Update session
    .patch('/sessions/:id', async ({ params, body }) => {
      const existing = await sessionManager.get(params.id)
      if (!existing) throw new NotFoundError('Session', params.id)

      const updated = await sessionManager.update(params.id, {
        name: body.name,
      })
      log.info('Session updated', { id: params.id })
      return { session: updated }
    }, {
      body: t.Object({
        name: t.Optional(t.String()),
      })
    })

    // Delete session
    .delete('/sessions/:id', async ({ params }) => {
      await sessionManager.delete(params.id)
      log.info('Session deleted', { id: params.id })
      return { ok: true }
    })

    // Delete all sessions
    .delete('/sessions', async () => {
      const sessions = await sessionManager.list()
      for (const s of sessions) {
        await sessionManager.delete(s.id)
      }
      log.info('All sessions deleted', { count: sessions.length })
      return { ok: true, deleted: sessions.length }
    })

    // Export session
    .post('/sessions/:id/export', async ({ params }) => {
      const session = await sessionManager.get(params.id)
      if (!session) throw new NotFoundError('Session', params.id)

      const exported = await sessionManager.export(params.id)
      const filename = `session-${session.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.json`

      log.info('Session exported', { id: params.id, filename })
      return {
        data: JSON.stringify(exported, null, 2),
        filename,
      }
    })

    // Import session
    .post('/sessions/import', async ({ body }) => {
      try {
        const data: SessionExport = JSON.parse(body.data)
        const session = await sessionManager.import(data)
        log.info('Session imported', { id: session.id, name: session.name })
        return { session }
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new ValidationError('Invalid JSON format')
        }
        throw error
      }
    }, {
      body: t.Object({
        data: t.String(),
      })
    })

    // Force summarization
    .post('/sessions/:id/summarize', async ({ params }) => {
      const session = await sessionManager.get(params.id)
      if (!session) throw new NotFoundError('Session', params.id)

      const result = await sessionManager.summarize(params.id)
      log.info('Session summarized', { id: params.id, tokensSaved: result.tokensSaved })
      return {
        summary: result.summary,
        tokensSaved: result.tokensSaved,
        messagesCompacted: result.messagesCompacted,
      }
    })

    // Get session agents
    .get('/sessions/:id/agents', async ({ params }) => {
      const agents = await sessions.getPersistedAgents(params.id)
      return agents
    })
}
