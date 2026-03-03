import { Elysia, t } from 'elysia'
import {
  startOutloop,
  getOutloopRun,
  listOutloopRuns,
  cancelOutloopRun,
} from '../services/outloop-runner'
import { toErrorResponse, getStatusCode } from '../errors'
import { logger } from '../logger'

const log = logger.child('outloop-routes')

export const outloopRoutes = new Elysia({ prefix: '/api/outloop' })

  .post(
    '/start',
    async ({ body, set }) => {
      try {
        const run = await startOutloop({
          prompt: body.prompt,
          blueprintId: body.blueprintId,
          workDir: body.workDir,
          maxRounds: body.maxRounds,
        })
        return { success: true, run }
      } catch (error) {
        log.error('Failed to start outloop run', { error: String(error) })
        set.status = getStatusCode(error)
        return toErrorResponse(error)
      }
    },
    {
      body: t.Object({
        prompt: t.String(),
        blueprintId: t.Optional(t.String()),
        workDir: t.Optional(t.String()),
        maxRounds: t.Optional(t.Number()),
      }),
    }
  )

  .get('/:id/status', ({ params, set }) => {
    try {
      const run = getOutloopRun(params.id)
      if (!run) {
        set.status = 404
        return { success: false, error: 'Run not found' }
      }
      return { success: true, run }
    } catch (error) {
      log.error('Failed to get outloop status', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  })

  .get('/runs', () => {
    const runs = listOutloopRuns()
    return { success: true, runs }
  })

  .post('/:id/cancel', ({ params, set }) => {
    try {
      const cancelled = cancelOutloopRun(params.id)
      return { success: cancelled, message: cancelled ? 'Cancelled' : 'Cannot cancel' }
    } catch (error) {
      log.error('Failed to cancel outloop run', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  })
