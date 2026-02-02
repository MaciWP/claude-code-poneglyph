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
import { logger } from '../logger'

const log = logger.child('memory-routes')

export const memoryRoutes = new Elysia({ prefix: '/api' })
  .get('/memory', async () => {
    try {
      await initMemorySystem()
      const memories = await memoryStore.getAll()
      return { memories, count: memories.length }
    } catch (error) {
      log.error('Failed to get memories', { error })
      return { error: 'Failed to get memories', details: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
  .post('/memory/search', async ({ body }) => {
    try {
      await initMemorySystem()
      const results = await searchRelevantMemories(body.query, {
        limit: body.limit ?? 5,
        useSemanticSearch: true
      })
      return { results }
    } catch (error) {
      log.error('Memory search failed', { error, query: body.query })
      return { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, {
    body: t.Object({
      query: t.String(),
      limit: t.Optional(t.Number())
    })
  })
  .post('/memory/feedback', async ({ body }) => {
    try {
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
    } catch (error) {
      log.error('Failed to process feedback', { error, memoryId: body.memoryId })
      return { error: 'Feedback processing failed', details: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, {
    body: t.Object({
      memoryId: t.String(),
      type: t.Union([t.Literal('positive'), t.Literal('negative')]),
      context: t.Optional(t.String()),
      sessionId: t.Optional(t.String())
    })
  })
  .get('/memory/stats', async () => {
    try {
      await initMemorySystem()
      return getMemorySystemStats()
    } catch (error) {
      log.error('Failed to get memory stats', { error })
      return { error: 'Failed to get stats', details: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
  .post('/memory/inject', async ({ body }) => {
    try {
      await initMemorySystem()
      const result = await injectMemories(body.query, body.sessionId, {
        maxMemories: body.maxMemories,
        minSimilarity: body.minSimilarity,
        maxTokens: body.maxTokens,
        timeout: body.timeout
      })
      return result
    } catch (error) {
      log.error('Memory injection failed', { error, query: body.query })
      return { error: 'Injection failed', details: error instanceof Error ? error.message : 'Unknown error' }
    }
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
    try {
      recordFeedback(body.memoryId, body.sessionId, body.queryContext, body.isPositive)
      return { ok: true }
    } catch (error) {
      log.error('Injection feedback failed', { error, memoryId: body.memoryId })
      return { error: 'Feedback recording failed', details: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, {
    body: t.Object({
      memoryId: t.String(),
      sessionId: t.String(),
      queryContext: t.String(),
      isPositive: t.Boolean()
    })
  })
  .post('/memory/warmup', async () => {
    try {
      await warmUp()
      return { ok: true, message: 'Memory injection service warmed up' }
    } catch (error) {
      log.error('Memory warmup failed', { error })
      return { error: 'Warmup failed', details: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
  .get('/memory/catcher/stats', () => {
    try {
      return memoryCatcher.getStats()
    } catch (error) {
      log.error('Failed to get catcher stats', { error })
      return { error: 'Failed to get catcher stats', details: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
  .post('/memory/catcher/start', () => {
    try {
      if (memoryCatcher.isRunning()) {
        return { ok: false, message: 'Memory catcher already running' }
      }
      memoryCatcher.start()
      return { ok: true, message: 'Memory catcher started' }
    } catch (error) {
      log.error('Failed to start memory catcher', { error })
      return { error: 'Failed to start catcher', details: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
  .post('/memory/catcher/stop', () => {
    try {
      memoryCatcher.stop()
      return { ok: true, message: 'Memory catcher stopped' }
    } catch (error) {
      log.error('Failed to stop memory catcher', { error })
      return { error: 'Failed to stop catcher', details: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
  .post('/memory/catcher/run', async () => {
    try {
      await memoryCatcher.catchMemories()
      return { ok: true, stats: memoryCatcher.getStats() }
    } catch (error) {
      log.error('Failed to run memory catcher', { error })
      return { error: 'Failed to run catcher', details: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
