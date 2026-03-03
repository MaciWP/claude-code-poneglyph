import { Elysia, t } from 'elysia'
import { qaRunner } from '../services/qa-runner'
import { qaStore } from '../services/qa-store'
import { toErrorResponse, getStatusCode } from '../errors'
import { logger } from '../logger'

const log = logger.child('qa-routes')

export const qaRoutes = new Elysia({ prefix: '/api/qa' })

  .get('/stories', async ({ set }) => {
    try {
      return await qaRunner.listStories()
    } catch (error) {
      log.error('Failed to list QA stories', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  })

  .post(
    '/run',
    async ({ body, set }) => {
      try {
        const { storyName } = body

        if (storyName === 'all') {
          const stories = await qaRunner.listStories()
          const results = []
          for (const name of stories) {
            const result = await qaRunner.runStory(name)
            results.push(result)
          }
          return results
        }

        const result = await qaRunner.runStory(storyName)
        return result
      } catch (error) {
        log.error('Failed to run QA story', { error: String(error) })
        set.status = getStatusCode(error)
        return toErrorResponse(error)
      }
    },
    {
      body: t.Object({
        storyName: t.String(),
      }),
    }
  )

  .get(
    '/results',
    async ({ query, set }) => {
      try {
        return await qaStore.getAll({
          limit: query.limit ? Number(query.limit) : undefined,
          status: query.status as QAResultStatus,
          storyName: query.storyName,
        })
      } catch (error) {
        log.error('Failed to get QA results', { error: String(error) })
        set.status = getStatusCode(error)
        return toErrorResponse(error)
      }
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
        status: t.Optional(t.String()),
        storyName: t.Optional(t.String()),
      }),
    }
  )

  .get('/results/:id', async ({ params, set }) => {
    try {
      const result = await qaStore.getById(params.id)
      if (!result) {
        set.status = 404
        return { error: 'QA run not found', code: 'NOT_FOUND' }
      }
      return result
    } catch (error) {
      log.error('Failed to get QA result', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  })

  .post('/results/:id/cancel', async ({ params, set }) => {
    try {
      qaRunner.cancel(params.id)
      await qaStore.updateRun(params.id, {
        status: 'cancelled',
        completedAt: new Date().toISOString(),
      })
      return { success: true }
    } catch (error) {
      log.error('Failed to cancel QA run', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  })

type QAResultStatus = 'running' | 'passed' | 'failed' | 'cancelled'
