import { Elysia, t } from 'elysia'
import {
  initMemorySystem,
  searchRelevantMemories,
  getMemorySystemStats,
  processFeedback,
  memoryStore
} from '../services/memory'
import { injectMemories, recordFeedback, warmUp } from '../services/memory/injection'
import { memoryCatcher } from '../services/memory/catcher'

export const memoryRoutes = new Elysia({ prefix: '/api' })
  .get('/memory', async () => {
    await initMemorySystem()
    const memories = await memoryStore.getAll()
    return { memories, count: memories.length }
  })
  .post('/memory/search', async ({ body }) => {
    await initMemorySystem()
    const results = await searchRelevantMemories(body.query, {
      limit: body.limit ?? 5,
      useSemanticSearch: true
    })
    return { results }
  }, {
    body: t.Object({
      query: t.String(),
      limit: t.Optional(t.Number())
    })
  })
  .post('/memory/feedback', async ({ body }) => {
    await initMemorySystem()
    await processFeedback({
      memoryId: body.memoryId,
      type: body.type as 'positive' | 'negative',
      content: body.context,
      sessionId: body.sessionId || '',
      responseId: body.memoryId,
      timestamp: new Date().toISOString()
    })
    return { ok: true }
  }, {
    body: t.Object({
      memoryId: t.String(),
      type: t.Union([t.Literal('positive'), t.Literal('negative')]),
      context: t.Optional(t.String()),
      sessionId: t.Optional(t.String())
    })
  })
  .get('/memory/stats', async () => {
    await initMemorySystem()
    return getMemorySystemStats()
  })
  .post('/memory/inject', async ({ body }) => {
    await initMemorySystem()
    const result = await injectMemories(body.query, body.sessionId, {
      maxMemories: body.maxMemories,
      minSimilarity: body.minSimilarity,
      maxTokens: body.maxTokens,
      timeout: body.timeout
    })
    return result
  }, {
    body: t.Object({
      query: t.String(),
      sessionId: t.Optional(t.String()),
      maxMemories: t.Optional(t.Number()),
      minSimilarity: t.Optional(t.Number()),
      maxTokens: t.Optional(t.Number()),
      timeout: t.Optional(t.Number())
    })
  })
  .post('/memory/injection-feedback', async ({ body }) => {
    recordFeedback(body.memoryId, body.sessionId, body.queryContext, body.isPositive)
    return { ok: true }
  }, {
    body: t.Object({
      memoryId: t.String(),
      sessionId: t.String(),
      queryContext: t.String(),
      isPositive: t.Boolean()
    })
  })
  .post('/memory/warmup', async () => {
    await warmUp()
    return { ok: true, message: 'Memory injection service warmed up' }
  })
  .get('/memory/catcher/stats', () => {
    return memoryCatcher.getStats()
  })
  .post('/memory/catcher/start', () => {
    if (memoryCatcher.isRunning()) {
      return { ok: false, message: 'Memory catcher already running' }
    }
    memoryCatcher.start()
    return { ok: true, message: 'Memory catcher started' }
  })
  .post('/memory/catcher/stop', () => {
    memoryCatcher.stop()
    return { ok: true, message: 'Memory catcher stopped' }
  })
  .post('/memory/catcher/run', async () => {
    await memoryCatcher.catchMemories()
    return { ok: true, stats: memoryCatcher.getStats() }
  })
