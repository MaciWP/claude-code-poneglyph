import { Elysia, t } from 'elysia'
import { PromptClassifier } from '../services/prompt-classifier'
import { AgentSpawner } from '../services/agent-spawner'
import { ParallelExecutor } from '../services/parallel-executor'
import { ExpertRouter } from '../services/expert-router'
import { ResultComparator } from '../services/result-comparator'
import { expertStore } from '../services/expert-store'
import { ClaudeService } from '../services/claude'
import { logger } from '../logger'
import { toErrorResponse, getStatusCode, NotFoundError } from '../errors'

const log = logger.child('multi-expert-routes')

const claudeService = new ClaudeService()
const classifier = new PromptClassifier({}, [])
const spawner = new AgentSpawner(claudeService)
const parallelExecutor = new ParallelExecutor(spawner)
const expertRouter = new ExpertRouter(classifier, parallelExecutor)
const comparator = new ResultComparator()

export const multiExpertRoutes = new Elysia({ prefix: '/api/multi-expert' })

  .get('/strategies', async () => {
    const strategies = await expertRouter.getAvailableStrategies()
    return { strategies }
  })

  .post('/suggest-strategy', async ({ body, set }) => {
    try {
      const suggestion = await expertRouter.suggestStrategy(body.prompt)
      return suggestion
    } catch (error) {
      log.error('Failed to suggest strategy', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  }, {
    body: t.Object({
      prompt: t.String({ minLength: 1 }),
    }),
  })

  .post('/execute', async ({ body, set }) => {
    log.info('Multi-expert execution request', {
      sessionId: body.sessionId,
      strategy: body.strategy,
      expertsRequested: body.experts,
    })

    try {
      const result = await expertRouter.route(body.prompt, body.sessionId, {
        strategy: body.strategy,
        forceExperts: body.experts,
        workDir: body.workDir,
      })

      return {
        success: true,
        executionId: result.execution.executionId,
        routingDecision: {
          strategy: result.routingDecision.strategy.name,
          selectedExperts: result.routingDecision.selectedExperts,
          reasoning: result.routingDecision.reasoning,
        },
        results: result.execution.results.map(r => ({
          expertId: r.expertId,
          success: r.success,
          confidence: r.confidence,
          toolCalls: r.toolCalls,
          durationMs: r.durationMs,
        })),
        comparison: result.comparison ? {
          similarity: result.comparison.similarity,
          keyPointsCount: result.comparison.keyPoints.length,
          conflictsCount: result.comparison.conflicts.length,
          recommendationsCount: result.comparison.recommendations.length,
        } : null,
        validation: {
          isValid: result.validation.isValid,
          score: result.validation.score,
          issuesCount: result.validation.issues.length,
        },
        output: result.finalOutput,
        metadata: result.metadata,
      }
    } catch (error) {
      log.error('Multi-expert execution failed', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  }, {
    body: t.Object({
      prompt: t.String({ minLength: 1 }),
      sessionId: t.String({ minLength: 1 }),
      strategy: t.Optional(t.Union([
        t.Literal('single'),
        t.Literal('parallel'),
        t.Literal('cascade'),
        t.Literal('consensus'),
        t.Literal('specialist'),
      ])),
      experts: t.Optional(t.Array(t.String())),
      workDir: t.Optional(t.String()),
    }),
  })

  .post('/parallel', async ({ body, set }) => {
    log.info('Parallel execution request', {
      sessionId: body.sessionId,
      experts: body.experts,
    })

    try {
      const result = await parallelExecutor.executeWithExperts(
        body.prompt,
        body.experts,
        body.sessionId,
        body.workDir
      )

      const comparison = result.results.length > 1
        ? comparator.compare(result.results)
        : null

      const validation = comparator.validate(result.results)

      return {
        success: true,
        executionId: result.executionId,
        results: result.results.map(r => ({
          expertId: r.expertId,
          agentId: r.agentId,
          success: r.success,
          confidence: r.confidence,
          toolCalls: r.toolCalls,
          durationMs: r.durationMs,
          output: r.output,
        })),
        comparison: comparison ? {
          similarity: comparison.similarity,
          confidenceWeightedScore: comparison.confidenceWeightedScore,
          keyPoints: comparison.keyPoints.slice(0, 10),
          conflicts: comparison.conflicts,
          recommendations: comparison.recommendations.slice(0, 5),
        } : null,
        validation: {
          isValid: validation.isValid,
          score: validation.score,
          issues: validation.issues,
          suggestions: validation.suggestions,
        },
        consensus: result.consensus,
        metadata: {
          totalDurationMs: result.totalDurationMs,
          successCount: result.successCount,
          failureCount: result.failureCount,
        },
      }
    } catch (error) {
      log.error('Parallel execution failed', { error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  }, {
    body: t.Object({
      prompt: t.String({ minLength: 1 }),
      experts: t.Array(t.String(), { minItems: 1 }),
      sessionId: t.String({ minLength: 1 }),
      workDir: t.Optional(t.String()),
    }),
  })

  .post('/compare', async ({ body }) => {
    const expertResults = body.results.map(r => ({
      expertId: r.expertId,
      agentId: 'manual',
      output: r.output,
      success: r.success,
      toolCalls: 0,
      durationMs: 0,
      confidence: r.confidence,
    }))

    const comparison = comparator.compare(expertResults)
    const validation = comparator.validate(expertResults)
    const consensus = comparator.buildConsensus(expertResults)

    return {
      comparison: {
        similarity: comparison.similarity,
        confidenceWeightedScore: comparison.confidenceWeightedScore,
        keyPoints: comparison.keyPoints,
        conflicts: comparison.conflicts,
        recommendations: comparison.recommendations,
      },
      validation,
      consensus: {
        achieved: consensus.achieved,
        score: consensus.score,
        agreementLevel: consensus.agreementLevel,
        conflicts: consensus.conflicts,
      },
      mergedOutput: consensus.mergedOutput,
    }
  }, {
    body: t.Object({
      results: t.Array(t.Object({
        expertId: t.String(),
        output: t.String(),
        confidence: t.Number(),
        success: t.Boolean(),
      }), { minItems: 1 }),
    }),
  })

  .get('/experts', async () => {
    const experts = await expertStore.list()
    return {
      experts: experts.map(e => ({
        id: e.id,
        domain: e.domain,
        confidence: e.confidence,
        lastUpdated: e.lastUpdated,
      })),
      count: experts.length,
    }
  })

  .get('/experts/:id/validate', async ({ params, set }) => {
    try {
      const exists = await expertStore.exists(params.id)
      if (!exists) {
        throw new NotFoundError('Expert', params.id)
      }

      const validation = await expertStore.validate(params.id)
      const expertise = await expertStore.load(params.id)

      return {
        expertId: params.id,
        domain: expertise.domain,
        confidence: expertise.confidence,
        validation,
      }
    } catch (error) {
      log.error('Failed to validate expert', { id: params.id, error: String(error) })
      set.status = getStatusCode(error)
      return toErrorResponse(error)
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
