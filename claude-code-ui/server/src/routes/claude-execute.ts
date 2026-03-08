import { Elysia, t } from 'elysia'
import type { ClaudeService } from '../services/claude'
import type { CodexService } from '../services/codex'
import type { GeminiService } from '../services/gemini'
import type { SessionStore } from '../services/sessions'
import type { orchestrator as OrchestratorType } from '../services/orchestrator'
import { logger } from '../logger'
import { ClaudeError } from '../errors'
import { metricsStore } from '../services/metrics-store'
import { learningLoop } from '../services/learning-loop'
import { traceCollector } from '../services/trace-collector'

export const createClaudeExecuteRoutes = (
  claude: ClaudeService,
  codex: CodexService,
  gemini: GeminiService,
  sessions: SessionStore,
  orchestrator: typeof OrchestratorType
) => {
  const log = logger.child('claude-execute')

  return new Elysia({ prefix: '/api' }).post(
    '/execute-cli',
    async ({ body }) => {
      let promptToUse = body.prompt

      if (body.orchestrate) {
        const enriched = await orchestrator.enrichPrompt(body.prompt)
        promptToUse = orchestrator.formatEnrichedPrompt(enriched)
        log.info('Orchestration enabled', {
          intent: enriched.metadata.intent.primary,
          confidence: enriched.metadata.intent.confidence,
          workflow: enriched.metadata.intent.workflow,
        })
      }

      log.info('Execute CLI request', {
        prompt: body.prompt.slice(0, 100),
        sessionId: body.sessionId,
        workDir: body.workDir,
        resume: body.resume,
        orchestrate: body.orchestrate,
        provider: body.provider,
      })

      const executionStartTime = Date.now()
      const executionId = crypto.randomUUID()

      let traceId: string | undefined
      try {
        const trace = traceCollector.startTrace(body.sessionId || executionId, body.prompt)
        traceId = trace.id
      } catch (err) {
        log.warn('Failed to start trace', { error: String(err) })
      }

      try {
        let result
        if (body.provider === 'gemini') {
          result = await gemini.execute({
            prompt: promptToUse,
            sessionId: body.sessionId,
            workDir: body.workDir,
            resume: body.resume,
          })
        } else if (body.provider === 'codex') {
          result = await codex.executeCLI({
            prompt: promptToUse,
            sessionId: body.sessionId,
            workDir: body.workDir,
            outputFormat: body.outputFormat || 'json',
            continue: body.continue,
            resume: body.resume,
            allowedTools: body.allowedTools,
          })
        } else {
          result = await claude.executeCLI({
            prompt: promptToUse,
            sessionId: body.sessionId,
            workDir: body.workDir,
            outputFormat: body.outputFormat || 'json',
            continue: body.continue,
            resume: body.resume,
            allowedTools: body.allowedTools,
          })
        }

        log.info('Execute CLI response', {
          responseLength: result.response.length,
          sessionId: result.sessionId,
          toolsUsed: result.toolsUsed,
          costUsd: result.costUsd,
          durationMs: result.durationMs,
        })

        if (body.sessionId) {
          await sessions.addMessage(body.sessionId, 'user', body.prompt)
          await sessions.addMessage(body.sessionId, 'assistant', result.response)
        }

        const durationMs = result.durationMs ?? Date.now() - executionStartTime

        metricsStore
          .record({
            id: executionId,
            timestamp: new Date().toISOString(),
            prompt: body.prompt,
            sessionId: body.sessionId || executionId,
            useOrchestrator: !!body.orchestrate,
            agentsSpawned: 0,
            totalToolCalls: result.toolsUsed?.length ?? 0,
            durationMs,
            success: true,
            expertiseUsed: false,
          })
          .catch((err) => {
            log.warn('Failed to record metrics', { error: String(err) })
          })

        learningLoop
          .processExecution({
            agentId: executionId,
            agentType: 'cli-http',
            sessionId: body.sessionId || executionId,
            prompt: body.prompt,
            output: result.response.slice(0, 2000),
            success: true,
            toolCalls: result.toolsUsed?.length ?? 0,
            durationMs,
          })
          .catch((err) => {
            log.warn('Failed to process learning', { error: String(err) })
          })

        if (traceId) {
          try {
            traceCollector.updateTrace(traceId, {
              totalCostUsd: result.costUsd ?? 0,
            })
            traceCollector.completeTrace(traceId, 'completed')
          } catch (err) {
            log.warn('Failed to complete trace', { error: String(err) })
          }
        }

        return result
      } catch (error) {
        const durationMs = Date.now() - executionStartTime

        if (traceId) {
          try {
            traceCollector.completeTrace(traceId, 'failed')
          } catch (err) {
            log.warn('Failed to complete trace on error', { error: String(err) })
          }
        }

        metricsStore
          .record({
            id: executionId,
            timestamp: new Date().toISOString(),
            prompt: body.prompt,
            sessionId: body.sessionId || executionId,
            useOrchestrator: !!body.orchestrate,
            agentsSpawned: 0,
            totalToolCalls: 0,
            durationMs,
            success: false,
            expertiseUsed: false,
          })
          .catch((err) => {
            log.warn('Failed to record failure metrics', { error: String(err) })
          })

        log.error('Execute CLI failed', {
          error: error instanceof Error ? error.message : String(error),
        })
        throw new ClaudeError(error instanceof Error ? error.message : String(error))
      }
    },
    {
      body: t.Object({
        prompt: t.String(),
        provider: t.Optional(
          t.Union([t.Literal('claude'), t.Literal('codex'), t.Literal('gemini')])
        ),
        sessionId: t.Optional(t.String()),
        workDir: t.Optional(t.String()),
        outputFormat: t.Optional(
          t.Union([t.Literal('json'), t.Literal('stream-json'), t.Literal('text')])
        ),
        continue: t.Optional(t.Boolean()),
        resume: t.Optional(t.String()),
        allowedTools: t.Optional(t.Array(t.String())),
        orchestrate: t.Optional(t.Boolean()),
      }),
    }
  )
}
