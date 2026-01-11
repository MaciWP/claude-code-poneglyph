import { Elysia, t } from 'elysia'
import type { ClaudeService } from '../services/claude'
import type { CodexService } from '../services/codex'
import type { GeminiService } from '../services/gemini'
import type { SessionStore } from '../services/sessions'
import type { orchestrator as OrchestratorType } from '../services/orchestrator'
import { logger } from '../logger'
import { ClaudeError } from '../errors'

export const createClaudeExecuteRoutes = (
  claude: ClaudeService,
  codex: CodexService,
  gemini: GeminiService,
  sessions: SessionStore,
  orchestrator: typeof OrchestratorType
) => {
  const log = logger.child('claude-execute')

  return new Elysia({ prefix: '/api' })
    .post('/execute', async ({ body }) => {
      log.info('Execute SDK request', {
        prompt: body.prompt.slice(0, 100),
        sessionId: body.sessionId,
        workDir: body.workDir,
        resume: body.resume
      })

      try {
        const result = await claude.execute({
          prompt: body.prompt,
          sessionId: body.sessionId,
          workDir: body.workDir,
          tools: body.tools,
          resume: body.resume,
        })

        log.info('Execute SDK response', {
          responseLength: result.response.length,
          toolsUsed: result.toolsUsed,
          sessionId: result.sessionId,
          mode: result.mode
        })

        if (body.sessionId) {
          await sessions.addMessage(body.sessionId, 'user', body.prompt)
          await sessions.addMessage(body.sessionId, 'assistant', result.response)
        }

        return result
      } catch (error) {
        log.error('Execute SDK failed', {
          error: error instanceof Error ? error.message : String(error)
        })
        throw new ClaudeError(error instanceof Error ? error.message : String(error))
      }
    }, {
      body: t.Object({
        prompt: t.String(),
        sessionId: t.Optional(t.String()),
        workDir: t.Optional(t.String()),
        tools: t.Optional(t.Array(t.String())),
        resume: t.Optional(t.String()),
      })
    })

    .post('/execute-cli', async ({ body }) => {
      let promptToUse = body.prompt
      let intentMetadata = null

      if (body.orchestrate) {
        const enriched = await orchestrator.enrichPrompt(body.prompt)
        promptToUse = orchestrator.formatEnrichedPrompt(enriched)
        intentMetadata = enriched.metadata
        log.info('Orchestration enabled', {
          intent: enriched.metadata.intent.primary,
          confidence: enriched.metadata.intent.confidence,
          workflow: enriched.metadata.intent.workflow
        })
      }

      log.info('Execute CLI request', {
        prompt: body.prompt.slice(0, 100),
        sessionId: body.sessionId,
        workDir: body.workDir,
        resume: body.resume,
        orchestrate: body.orchestrate,
        provider: body.provider
      })

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
          durationMs: result.durationMs
        })

        if (body.sessionId) {
          await sessions.addMessage(body.sessionId, 'user', body.prompt)
          await sessions.addMessage(body.sessionId, 'assistant', result.response)
        }

        return result
      } catch (error) {
        log.error('Execute CLI failed', {
          error: error instanceof Error ? error.message : String(error)
        })
        throw new ClaudeError(error instanceof Error ? error.message : String(error))
      }
    }, {
      body: t.Object({
        prompt: t.String(),
        provider: t.Optional(t.Union([t.Literal('claude'), t.Literal('codex'), t.Literal('gemini')])),
        sessionId: t.Optional(t.String()),
        workDir: t.Optional(t.String()),
        outputFormat: t.Optional(t.Union([t.Literal('json'), t.Literal('stream-json'), t.Literal('text')])),
        continue: t.Optional(t.Boolean()),
        resume: t.Optional(t.String()),
        allowedTools: t.Optional(t.Array(t.String())),
        orchestrate: t.Optional(t.Boolean()),
      })
    })
}
