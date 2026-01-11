import { Elysia, t } from 'elysia'
import { expertStore } from '../services/expert-store'
import { logger } from '../logger'
import { NotFoundError, toErrorResponse, getStatusCode } from '../errors'

const log = logger.child('experts-routes')

export const expertsRoutes = new Elysia({ prefix: '/api/experts' })
  .get('/', async () => {
    try {
      const experts = await expertStore.list()
      return { experts }
    } catch (error) {
      log.error('Failed to list experts', { error: String(error) })
      return { experts: [] }
    }
  })

  .get('/:id', async ({ params, set }) => {
    try {
      const exists = await expertStore.exists(params.id)
      if (!exists) {
        throw new NotFoundError('Expert', params.id)
      }

      const expertise = await expertStore.load(params.id)
      const validation = await expertStore.validate(params.id)
      const agentPrompt = await expertStore.getAgentPrompt(params.id)

      return {
        expertise,
        validation,
        hasAgentPrompt: !!agentPrompt
      }
    } catch (error) {
      log.error('Failed to get expert', { id: params.id, error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  })

  .get('/:id/validate', async ({ params }) => {
    try {
      const validation = await expertStore.validate(params.id)
      return validation
    } catch (error) {
      log.error('Failed to validate expert', { id: params.id, error: String(error) })
      return { valid: false, errors: ['Failed to validate'], warnings: [] }
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  })

  .post('/:id/changelog', async ({ params, body, set }) => {
    try {
      await expertStore.addChangelogEntry(params.id, {
        type: body.type,
        source: body.source,
        change: body.change,
        confidence_delta: body.confidenceDelta
      })

      const expertise = await expertStore.load(params.id)
      return {
        success: true,
        newConfidence: expertise.confidence,
        newVersion: expertise.version
      }
    } catch (error) {
      log.error('Failed to add changelog entry', { id: params.id, error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      type: t.Union([
        t.Literal('learned'),
        t.Literal('corrected'),
        t.Literal('verified'),
        t.Literal('deprecated')
      ]),
      source: t.String(),
      change: t.String(),
      confidenceDelta: t.Optional(t.Number())
    })
  })
