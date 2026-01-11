import { Elysia, t } from 'elysia'
import { join } from 'path'
import { unlink } from 'fs/promises'
import type { ClaudeService } from '../services/claude'
import type { CodexService } from '../services/codex'
import type { GeminiService } from '../services/gemini'
import type { SessionStore } from '../services/sessions'
import type { orchestrator as OrchestratorType } from '../services/orchestrator'
import type { agentRegistry as AgentRegistryType } from '../services/agent-registry'
import type { OrchestratorAgent } from '../services/orchestrator-agent'
import type { ExecutionEvent, TokenUsage, ContextSnapshot, PersistedAgent, ContextWindowState } from '../../../shared/types'
import { extractMemoriesFromConversation } from '../services/memory'
import { injectMemories } from '../services/memory/injection'
import { logger } from '../logger'
import { loadClaudeConfig } from './claude-config'
import { TOOL_OUTPUT_MAX_SIZE } from '../constants'
import { contextWindowMonitor } from '../services/context-window-monitor'
import { autoContinuation, shouldContinue, getContinuePrompt } from '../services/auto-continuation'
import type { ContinuationState } from '../../../shared/types'

interface ActiveProcess {
  abort: () => void
  sendUserAnswer?: (answer: string) => void
  sessionId?: string
}

const activeProcesses = new Map<string, ActiveProcess>()
const wsToRequestId = new Map<unknown, string>()
const wsContextListeners = new Map<unknown, {
  statusChanged: (state: ContextWindowState) => void
  thresholdWarning: (state: ContextWindowState) => void
  thresholdCritical: (state: ContextWindowState) => void
  compactionStarted: () => void
  compactionCompleted: (tokensSaved: number) => void
}>()

// Track WebSocket connections per session for broadcasting events to Visual Mode
const sessionSockets = new Map<string, Set<unknown>>()
const wsToSessionId = new Map<unknown, string>()

/**
 * Broadcast a message to all WebSocket connections for a session.
 * Used to sync Visual Mode (Kanban/Terminals) with agent events.
 */
function broadcastToSession(sessionId: string, message: object): void {
  const sockets = sessionSockets.get(sessionId)
  if (!sockets) return

  const payload = JSON.stringify(message)
  for (const ws of sockets) {
    try {
      (ws as { send: (data: string) => void }).send(payload)
    } catch {
      // Socket may be closed, will be cleaned up on close event
    }
  }
}

/**
 * Register a WebSocket connection for a session
 */
function registerSessionSocket(sessionId: string, ws: unknown): void {
  let sockets = sessionSockets.get(sessionId)
  if (!sockets) {
    sockets = new Set()
    sessionSockets.set(sessionId, sockets)
  }
  sockets.add(ws)
  wsToSessionId.set(ws, sessionId)
}

/**
 * Unregister a WebSocket connection from its session
 */
function unregisterSessionSocket(ws: unknown): void {
  const sessionId = wsToSessionId.get(ws)
  if (sessionId) {
    const sockets = sessionSockets.get(sessionId)
    if (sockets) {
      sockets.delete(ws)
      if (sockets.size === 0) {
        sessionSockets.delete(sessionId)
      }
    }
    wsToSessionId.delete(ws)
  }
}

export const createWebSocketRoutes = (
  claude: ClaudeService,
  codex: CodexService,
  gemini: GeminiService,
  sessions: SessionStore,
  orchestrator: typeof OrchestratorType,
  agentRegistry: typeof AgentRegistryType,
  leadOrchestrator?: OrchestratorAgent
) => {
  const log = logger.child('websocket')

  return new Elysia()
    .ws('/ws', {
      body: t.Object({
        type: t.String(),
        data: t.Any(),
      }),
      open(ws) {
        log.debug('WebSocket connected')

        const contextMonitor = contextWindowMonitor

        const statusChanged = (state: ContextWindowState) => {
          ws.send(JSON.stringify({
            type: 'context_window',
            event: 'status_changed',
            state,
          }))
        }

        const thresholdWarning = (state: ContextWindowState) => {
          ws.send(JSON.stringify({
            type: 'context_window',
            event: 'threshold_warning',
            state,
          }))
        }

        const thresholdCritical = (state: ContextWindowState) => {
          ws.send(JSON.stringify({
            type: 'context_window',
            event: 'threshold_critical',
            state,
          }))
        }

        const compactionStarted = () => {
          ws.send(JSON.stringify({
            type: 'context_window',
            event: 'compaction_started',
          }))
        }

        const compactionCompleted = (tokensSaved: number) => {
          ws.send(JSON.stringify({
            type: 'context_window',
            event: 'compaction_completed',
            tokensSaved,
          }))
        }

        contextMonitor.on('status:changed', statusChanged)
        contextMonitor.on('threshold:warning', thresholdWarning)
        contextMonitor.on('threshold:critical', thresholdCritical)
        contextMonitor.on('compaction:started', compactionStarted)
        contextMonitor.on('compaction:completed', compactionCompleted)

        wsContextListeners.set(ws, {
          statusChanged,
          thresholdWarning,
          thresholdCritical,
          compactionStarted,
          compactionCompleted,
        })

        ws.send(JSON.stringify({
          type: 'context_window',
          event: 'init',
          state: contextMonitor.getState(),
        }))
      },
      async message(ws, message) {
        if (message.type === 'abort') {
          const requestId = message.data?.requestId || wsToRequestId.get(ws)
          log.info('Received abort request from client', {
            requestId,
            fromMessage: !!message.data?.requestId,
            mapSize: activeProcesses.size,
            wsMapSize: wsToRequestId.size,
          })

          if (requestId) {
            const activeProcess = activeProcesses.get(requestId)
            if (activeProcess) {
              log.info('Found active process, calling abort()', { requestId })
              activeProcess.abort()
              activeProcesses.delete(requestId)
              wsToRequestId.delete(ws)
              log.info('Sending abort confirmation to client')
              ws.send(JSON.stringify({
                type: 'result',
                data: '⚠️ Execution aborted by user',
                aborted: true,
              }))
              ws.send(JSON.stringify({ type: 'done', data: '' }))
              return
            }
          }

          if (activeProcesses.size > 0) {
            const keys = Array.from(activeProcesses.keys())
            const lastKey = keys[keys.length - 1]
            const activeProcess = activeProcesses.get(lastKey)
            if (activeProcess) {
              log.info('Using fallback - aborting most recent process', { requestId: lastKey })
              activeProcess.abort()
              activeProcesses.delete(lastKey)
              ws.send(JSON.stringify({
                type: 'result',
                data: '⚠️ Execution aborted by user',
                aborted: true,
              }))
              ws.send(JSON.stringify({ type: 'done', data: '' }))
              return
            }
          }

          log.warn('No active process found to abort')
          ws.send(JSON.stringify({
            type: 'result',
            data: '⚠️ No active process to abort',
            aborted: true,
          }))
          ws.send(JSON.stringify({ type: 'done', data: '' }))
          return
        }

        // Handle session registration (for Visual Mode WebSocket)
        if (message.type === 'register-session') {
          const sessionId = message.data?.sessionId
          if (sessionId) {
            registerSessionSocket(sessionId, ws)
            log.debug('Visual Mode WebSocket registered for session', { sessionId })
            ws.send(JSON.stringify({ type: 'session-registered', sessionId }))
          }
          return
        }

        // Handle user answer for AskUserQuestion
        if (message.type === 'user_answer') {
          const requestId = message.data?.requestId || wsToRequestId.get(ws)
          const answer = message.data?.answer
          log.info('Received user_answer from client', { requestId, answer: answer?.slice(0, 50) })

          if (requestId && answer) {
            const activeProcess = activeProcesses.get(requestId)
            if (activeProcess?.sendUserAnswer) {
              log.info('Forwarding answer to CLI process', { requestId })
              activeProcess.sendUserAnswer(answer)
            } else {
              log.warn('No sendUserAnswer function found for request', { requestId })
            }
          }
          return
        }

        if (message.type === 'execute-cli') {
          const { prompt, messages, sessionId, workDir, resume, images, orchestrate, leadOrchestrate, thinking, planMode, bypassPermissions, allowFullPC, provider } = message.data

          // Register this socket for session broadcasts (Visual Mode support)
          if (sessionId) {
            registerSessionSocket(sessionId, ws)
          }

          // Use Lead Orchestrator for automatic agent delegation
          if (leadOrchestrate && leadOrchestrator) {
            log.info('Using Lead Orchestrator', { sessionId, promptLength: prompt?.length })

            const requestId = crypto.randomUUID()
            ws.send(JSON.stringify({ type: 'request_id', data: requestId }))

            // Store abort function for leadOrchestrator
            activeProcesses.set(requestId, {
              abort: () => {
                const activeExecutionId = leadOrchestrator.getActiveExecutionId()
                if (activeExecutionId) {
                  leadOrchestrator.abort(activeExecutionId)
                }
              },
              sessionId
            })
            wsToRequestId.set(ws, requestId)

            // Set up event listeners for streaming to frontend
            const classifiedHandler = (data: { executionId: string; classification: any }) => {
              ws.send(JSON.stringify({
                type: 'orchestrator_event',
                event: 'classified',
                executionId: data.executionId,
                classification: data.classification
              }))
            }

            const executingHandler = (data: { executionId: string }) => {
              ws.send(JSON.stringify({
                type: 'orchestrator_event',
                event: 'executing',
                executionId: data.executionId
              }))
            }

            const agentToolUseHandler = (data: { agentId: string; tool: string; toolCalls: number; toolUseId?: string; toolInput?: unknown }) => {
              // Send as tool_use chunk for frontend visibility
              ws.send(JSON.stringify({
                type: 'tool_use',
                tool: data.tool,
                toolUseId: data.toolUseId || `agent-${data.agentId}-${data.toolCalls}`,
                toolInput: data.toolInput,
                agentId: data.agentId
              }))
            }

            const agentSpawnedHandler = (data: { agentId: string; type: string }) => {
              // Broadcast to all session sockets (Visual Mode support)
              if (sessionId) {
                broadcastToSession(sessionId, {
                  type: 'agent_event',
                  event: 'spawned',
                  agentId: data.agentId,
                  agentType: data.type
                })
              }
            }

            const agentCompletedHandler = (data: { agentId: string; success: boolean; toolCalls: number; durationMs: number }) => {
              // Broadcast to all session sockets (Visual Mode support)
              if (sessionId) {
                broadcastToSession(sessionId, {
                  type: 'agent_event',
                  event: 'completed',
                  agentId: data.agentId,
                  success: data.success,
                  toolCalls: data.toolCalls,
                  durationMs: data.durationMs
                })
              }
            }

            const completedHandler = (data: { executionId: string; execution: any }) => {
              ws.send(JSON.stringify({
                type: 'orchestrator_event',
                event: 'completed',
                executionId: data.executionId,
                status: data.execution.status,
                agentsUsed: data.execution.results?.length || 0
              }))
            }

            // Agent text streaming handler
            const agentTextHandler = (data: { agentId: string; data: string }) => {
              ws.send(JSON.stringify({
                type: 'text',
                data: data.data,
                agentId: data.agentId
              }))
            }

            // Agent tool result handler
            const agentToolResultHandler = (data: { agentId: string; tool: string; toolUseId?: string; toolOutput?: string }) => {
              ws.send(JSON.stringify({
                type: 'tool_result',
                tool: data.tool,
                toolUseId: data.toolUseId,
                toolOutput: data.toolOutput,
                agentId: data.agentId
              }))
            }

            // Learning event handlers
            const learningStartedHandler = (data: { expertId: string }) => {
              ws.send(JSON.stringify({
                type: 'learning_event',
                event: 'started',
                expertId: data.expertId
              }))
            }

            const learningCompletedHandler = (data: { expertId: string; changes: unknown[] }) => {
              ws.send(JSON.stringify({
                type: 'learning_event',
                event: 'completed',
                expertId: data.expertId,
                changes: data.changes
              }))
            }

            const learningFailedHandler = (data: { expertId: string; error: string }) => {
              ws.send(JSON.stringify({
                type: 'learning_event',
                event: 'failed',
                expertId: data.expertId,
                error: data.error
              }))
            }

            leadOrchestrator.on('classified', classifiedHandler)
            leadOrchestrator.on('executing', executingHandler)
            leadOrchestrator.on('agent:tool_use', agentToolUseHandler)
            leadOrchestrator.on('agent:tool_result', agentToolResultHandler)
            leadOrchestrator.on('agent:spawned', agentSpawnedHandler)
            leadOrchestrator.on('agent:completed', agentCompletedHandler)
            leadOrchestrator.on('agent:text', agentTextHandler)
            leadOrchestrator.on('completed', completedHandler)
            leadOrchestrator.on('learning:started', learningStartedHandler)
            leadOrchestrator.on('learning:completed', learningCompletedHandler)
            leadOrchestrator.on('learning:failed', learningFailedHandler)

            try {
              if (sessionId) {
                await sessions.addMessage(sessionId, 'user', prompt)
              }

              // Incluir historial de mensajes en el prompt para el orquestador
              let promptWithHistory = prompt
              if (messages && messages.length > 0) {
                const historyContext = messages
                  .map((msg: { role: string; content: string }) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
                  .join('\n\n')
                promptWithHistory = `Previous conversation:\n\n${historyContext}\n\n---\n\nUser: ${prompt}`
                log.info('Including conversation history for orchestrator', { messageCount: messages.length })
              }

              log.info('Calling leadOrchestrator.execute', { sessionId })
              const result = await leadOrchestrator.execute(promptWithHistory, sessionId || requestId, workDir)
              log.info('leadOrchestrator.execute returned', { resultLength: result?.length })

              // Send final result
              log.info('Sending text chunk via WebSocket')
              ws.send(JSON.stringify({ type: 'text', data: result }))
              ws.send(JSON.stringify({ type: 'result', result }))
              ws.send(JSON.stringify({ type: 'done', data: '' }))
              log.info('All chunks sent')

              if (sessionId) {
                await sessions.addMessage(sessionId, 'assistant', result)

                try {
                  const memories = await extractMemoriesFromConversation([
                    { role: 'user', content: prompt },
                    { role: 'assistant', content: result }
                  ], { sessionId })

                  if (memories.length > 0) {
                    log.info('Extracted memories', { count: memories.length, sessionId })
                  }
                } catch (memError) {
                  log.warn('Memory extraction failed', { error: String(memError) })
                }
              }
            } catch (error) {
              log.error('Lead Orchestrator failed', { error: String(error) })
              ws.send(JSON.stringify({
                type: 'error',
                data: error instanceof Error ? error.message : 'Orchestration failed'
              }))
            } finally {
              leadOrchestrator.off('classified', classifiedHandler)
              leadOrchestrator.off('executing', executingHandler)
              leadOrchestrator.off('agent:tool_use', agentToolUseHandler)
              leadOrchestrator.off('agent:tool_result', agentToolResultHandler)
              leadOrchestrator.off('agent:spawned', agentSpawnedHandler)
              leadOrchestrator.off('agent:completed', agentCompletedHandler)
              leadOrchestrator.off('agent:text', agentTextHandler)
              leadOrchestrator.off('completed', completedHandler)
              leadOrchestrator.off('learning:started', learningStartedHandler)
              leadOrchestrator.off('learning:completed', learningCompletedHandler)
              leadOrchestrator.off('learning:failed', learningFailedHandler)
              activeProcesses.delete(requestId)
              wsToRequestId.delete(ws)
            }

            return
          }

          let promptToUse = prompt

          // Inyectar memorias relevantes antes de procesar
          try {
            const memoryResult = await injectMemories(prompt, sessionId)
            if (memoryResult.context && memoryResult.memories.length > 0) {
              log.info('Memories injected', {
                count: memoryResult.memories.length,
                queryTimeMs: memoryResult.metadata.queryTimeMs,
                sessionId
              })
              promptToUse = `${memoryResult.context}\n\n---\n\n${prompt}`

              // Include memory summaries for UI display
              const memorySummaries = memoryResult.memories.map(m => ({
                id: m.memory.id,
                title: m.memory.title || m.memory.content.slice(0, 50) + '...',
                type: m.memory.laneType || m.memory.type,
                similarity: Math.round(m.similarity * 100),
                confidence: Math.round(m.memory.confidence.current * 100)
              }))

              ws.send(JSON.stringify({
                type: 'context',
                contextType: 'memory',
                name: 'memory-injection',
                detail: `${memoryResult.memories.length} relevant memories injected`,
                memories: memorySummaries
              }))
            }
          } catch (memError) {
            log.warn('Memory injection failed (continuing without)', { error: String(memError) })
          }

          if (orchestrate) {
            const enriched = await orchestrator.enrichPrompt(prompt)
            promptToUse = orchestrator.formatEnrichedPrompt(enriched)
            log.info('WS Orchestration enabled', {
              intent: enriched.metadata.intent.primary,
              workflow: enriched.metadata.intent.workflow
            })

            ws.send(JSON.stringify({
              type: 'context',
              contextType: 'rule',
              name: 'orchestration-rules',
              detail: `Intent: ${enriched.metadata.intent.primary} (${Math.round(enriched.metadata.intent.confidence * 100)}%)`
            }))

            if (enriched.metadata.promptEngineerActive) {
              ws.send(JSON.stringify({
                type: 'context',
                contextType: 'skill',
                name: 'prompt-engineer',
                detail: `Auto-activated: workflow requires ${enriched.metadata.intent.workflow?.length || 0} agents`
              }))
            }

            const claudeConfig = await loadClaudeConfig()

            // Check for command matches (e.g., /docs, /commit)
            for (const command of claudeConfig.commands) {
              if (prompt.toLowerCase().includes(command.name.toLowerCase())) {
                ws.send(JSON.stringify({
                  type: 'context',
                  contextType: 'command',
                  name: command.name,
                  detail: command.description || 'Executing command'
                }))
                break
              }
            }

            // Check for skill matches by keyword triggers
            for (const skill of claudeConfig.skills) {
              if (skill.triggers?.some(t => prompt.toLowerCase().includes(t.toLowerCase()))) {
                ws.send(JSON.stringify({
                  type: 'context',
                  contextType: 'skill',
                  name: skill.name,
                  detail: `Triggered by keyword match`
                }))
                break
              }
            }

            if (enriched.systemContext.includes('Relevant Context from Memory')) {
              ws.send(JSON.stringify({
                type: 'context',
                contextType: 'memory',
                name: 'context-recall',
                detail: 'Relevant memories injected into context'
              }))
            }
          }

          log.info('WS execute CLI', {
            prompt: prompt?.slice(0, 50),
            sessionId,
            workDir,
            resume,
            imageCount: images?.length || 0,
            modes: { orchestrate, thinking, planMode, bypassPermissions },
            provider
          })

          const imageDataUrls = images?.map((img: { dataUrl: string }) => img.dataUrl) || []

          if (sessionId) {
            await sessions.addMessage(sessionId, 'user', prompt, undefined, imageDataUrls.length > 0 ? imageDataUrls : undefined)
          }

          const imagePaths: string[] = []
          if (images && Array.isArray(images)) {
            for (const img of images) {
              try {
                const base64Data = img.dataUrl.replace(/^data:image\/\w+;base64,/, '')
                const buffer = Buffer.from(base64Data, 'base64')
                const tempPath = join(import.meta.dir, `../../storage/temp/temp-${crypto.randomUUID()}.png`)
                await Bun.write(tempPath, buffer)
                imagePaths.push(tempPath)
                log.debug('Image saved', { path: tempPath })
              } catch (e) {
                log.warn('Image save failed', { error: String(e) })
              }
            }
          }

          let fullResponse = ''
          const requestId = crypto.randomUUID()
          const executionEvents: ExecutionEvent[] = []
          let lastUsage: TokenUsage | undefined
          let lastCostUsd: number | undefined

          // Track agents for persistence
          const sessionAgents: PersistedAgent[] = []

          // Track Task tool IDs to emit completion events for Kanban/Terminals
          const activeTaskTools = new Map<string, { agentId: string; agentType: string; taskTitle: string }>()

          const agentCreatedHandler = (agent: { id: string; type: string; task: string; model?: string; tools?: string[] }) => {
            // Broadcast to all session sockets (Visual Mode support)
            if (sessionId) {
              broadcastToSession(sessionId, {
                type: 'agent_event',
                data: '',
                event: 'created',
                agentId: agent.id,
                agentType: agent.type,
                task: agent.task,
              })
            }
            // Capture for persistence
            executionEvents.push({
              id: crypto.randomUUID(),
              type: 'agent_start',
              timestamp: new Date().toISOString(),
              toolUseId: agent.id,
              agentType: agent.type,
              agentTask: agent.task,
              agentModel: agent.model,
              agentTools: agent.tools,
            })
            sessionAgents.push({
              id: agent.id,
              type: agent.type,
              task: agent.task,
              status: 'pending',
              createdAt: new Date().toISOString(),
              toolUseId: agent.id,
            })
          }
          const agentStartedHandler = (agent: { id: string }) => {
            // Broadcast to all session sockets (Visual Mode support)
            if (sessionId) {
              broadcastToSession(sessionId, {
                type: 'agent_event',
                data: '',
                event: 'started',
                agentId: agent.id,
              })
            }
            // Update persisted agent
            const pa = sessionAgents.find(a => a.id === agent.id)
            if (pa) {
              pa.status = 'active'
              pa.startedAt = new Date().toISOString()
            }
          }
          const agentCompletedHandler = (agent: { id: string; result?: string; tokensUsed?: number; toolCalls?: number; durationMs?: number }) => {
            // Broadcast to all session sockets (Visual Mode support)
            if (sessionId) {
              broadcastToSession(sessionId, {
                type: 'agent_event',
                data: '',
                event: 'completed',
                agentId: agent.id,
                result: agent.result?.slice(0, 200),
              })
            }

            // Emit agent_result for token accumulation in frontend
            ws.send(JSON.stringify({
              type: 'agent_result',
              agentId: agent.id,
              success: true,
              summary: agent.result?.slice(0, 500),
              usage: agent.tokensUsed ? {
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
                totalTokens: agent.tokensUsed,
                contextPercent: 0
              } : undefined,
              toolCalls: agent.toolCalls,
              durationMs: agent.durationMs,
            }))
            // Capture for persistence
            executionEvents.push({
              id: crypto.randomUUID(),
              type: 'agent_end',
              timestamp: new Date().toISOString(),
              toolUseId: agent.id,
              agentStatus: 'completed',
            })
            // Update persisted agent
            const pa = sessionAgents.find(a => a.id === agent.id)
            if (pa) {
              pa.status = 'completed'
              pa.completedAt = new Date().toISOString()
              pa.result = agent.result?.slice(0, 1000)
              pa.tokensUsed = agent.tokensUsed
            }
          }
          const agentFailedHandler = (agent: { id: string; error?: string }) => {
            // Broadcast to all session sockets (Visual Mode support)
            if (sessionId) {
              broadcastToSession(sessionId, {
                type: 'agent_event',
                data: '',
                event: 'failed',
                agentId: agent.id,
                error: agent.error,
              })
            }
            // Capture for persistence
            executionEvents.push({
              id: crypto.randomUUID(),
              type: 'agent_end',
              timestamp: new Date().toISOString(),
              toolUseId: agent.id,
              agentStatus: 'failed',
              agentError: agent.error,
            })
            // Update persisted agent
            const pa = sessionAgents.find(a => a.id === agent.id)
            if (pa) {
              pa.status = 'failed'
              pa.completedAt = new Date().toISOString()
              pa.error = agent.error
            }
          }

          agentRegistry.on('agent:created', agentCreatedHandler)
          agentRegistry.on('agent:started', agentStartedHandler)
          agentRegistry.on('agent:completed', agentCompletedHandler)
          agentRegistry.on('agent:failed', agentFailedHandler)

          try {
            const providerName = provider || 'claude'
            const cliService = providerName === 'codex'
              ? codex
              : providerName === 'gemini'
                ? gemini
                : claude

            // Obtener la ruta del archivo de sesión para contexto
            const sessionFilePath = sessionId ? sessions.getSessionFilePath(sessionId) : undefined

            const streamResult = cliService.streamCLIWithAbort({
              prompt: promptToUse,
              messages: messages || [],
              sessionId,
              sessionFilePath,
              workDir,
              resume,
              images: imagePaths,
              thinking,
              planMode,
              bypassPermissions,
              allowFullPC,
              orchestrate,
            })
            const { stream, abort } = streamResult
            const sendUserAnswer = 'sendUserAnswer' in streamResult
              ? (streamResult as { sendUserAnswer: (answer: string) => void }).sendUserAnswer
              : undefined

            activeProcesses.set(requestId, { abort, sendUserAnswer, sessionId })
            wsToRequestId.set(ws, requestId)
            log.info('Stored abort function in activeProcesses', {
              requestId,
              mapSize: activeProcesses.size,
              wsMapSize: wsToRequestId.size,
            })

            ws.send(JSON.stringify({ type: 'request_id', data: requestId }))

            // Execution timeout (10 minutes)
            const EXECUTION_TIMEOUT_MS = 10 * 60 * 1000
            const executionTimeoutId = setTimeout(() => {
              log.warn('Execution timeout exceeded', { requestId, timeoutMs: EXECUTION_TIMEOUT_MS })
              abort()
              ws.send(JSON.stringify({
                type: 'error',
                data: '⚠️ Execution timeout exceeded (10 minutes). Process aborted.',
              }))
              ws.send(JSON.stringify({ type: 'done', data: '' }))
              activeProcesses.delete(requestId)
              wsToRequestId.delete(ws)
            }, EXECUTION_TIMEOUT_MS)

            try {
            for await (const chunk of stream) {
              if (chunk.type === 'text') {
                fullResponse += chunk.data
              }

              // Capture execution events for persistence
              if (chunk.type === 'tool_use') {
                executionEvents.push({
                  id: chunk.toolUseId || crypto.randomUUID(),
                  type: 'tool_use',
                  timestamp: new Date().toISOString(),
                  toolName: chunk.tool,
                  toolInput: chunk.toolInput,
                  toolUseId: chunk.toolUseId,
                  parentToolUseId: chunk.parentToolUseId,
                })

                // Detect Task tool usage and emit agent_event for Kanban/Terminals
                if (chunk.tool === 'Task' && chunk.toolInput) {
                  const input = chunk.toolInput as { subagent_type?: string; description?: string; prompt?: string }
                  const agentId = chunk.toolUseId || `task-${Date.now()}`
                  const agentType = input.subagent_type || 'general-purpose'
                  const taskTitle = input.description || input.prompt?.slice(0, 50) || 'Task'

                  // Store for tracking completion
                  activeTaskTools.set(agentId, { agentId, agentType, taskTitle })

                  // Broadcast to all session sockets (Visual Mode support)
                  if (sessionId) {
                    broadcastToSession(sessionId, {
                      type: 'agent_event',
                      event: 'spawned',
                      agentId,
                      agentType,
                      task: taskTitle,
                    })
                  }

                  log.debug('Task tool detected, emitting agent_event', { agentId, agentType, taskTitle })
                }
              } else if (chunk.type === 'tool_result') {
                executionEvents.push({
                  id: crypto.randomUUID(),
                  type: 'tool_result',
                  timestamp: new Date().toISOString(),
                  toolUseId: chunk.toolUseId,
                  toolOutput: typeof chunk.toolOutput === 'string'
                    ? chunk.toolOutput.slice(0, TOOL_OUTPUT_MAX_SIZE)
                    : undefined,
                  isError: chunk.toolOutput?.toString().startsWith('Error'),
                })

                // Check if this is a Task tool completion for Kanban/Terminals
                if (chunk.toolUseId && activeTaskTools.has(chunk.toolUseId)) {
                  const taskInfo = activeTaskTools.get(chunk.toolUseId)!
                  const isError = chunk.toolOutput?.toString().startsWith('Error') ||
                                  chunk.toolOutput?.toString().includes('failed') ||
                                  chunk.toolOutput?.toString().includes('FAILED')

                  // Broadcast to all session sockets (Visual Mode support)
                  if (sessionId) {
                    broadcastToSession(sessionId, {
                      type: 'agent_event',
                      event: isError ? 'failed' : 'completed',
                      agentId: taskInfo.agentId,
                      agentType: taskInfo.agentType,
                      error: isError ? chunk.toolOutput?.toString().slice(0, 200) : undefined,
                    })
                  }

                  activeTaskTools.delete(chunk.toolUseId)
                  log.debug('Task tool completed, emitting agent_event', {
                    agentId: taskInfo.agentId,
                    isError
                  })
                }
              } else if (chunk.type === 'thinking') {
                executionEvents.push({
                  id: crypto.randomUUID(),
                  type: 'thinking',
                  timestamp: new Date().toISOString(),
                  thinkingContent: typeof chunk.data === 'string' ? chunk.data : undefined,
                })
              } else if (chunk.type === 'context') {
                // Capture context events for persistence
                const ctx = chunk as { contextType?: string; name?: string; detail?: string; status?: string }
                executionEvents.push({
                  id: crypto.randomUUID(),
                  type: 'context',
                  timestamp: new Date().toISOString(),
                  contextType: ctx.contextType as ExecutionEvent['contextType'],
                  contextName: ctx.name,
                  contextDetail: ctx.detail,
                  contextStatus: ctx.status as ExecutionEvent['contextStatus'],
                })
              } else if (chunk.type === 'result') {
                lastUsage = chunk.usage
                lastCostUsd = chunk.costUsd
              }

              if (chunk.type === 'done') {
                log.info('Sending done chunk to client', { requestId })
              }

              // Send to requesting client
              ws.send(JSON.stringify(chunk))

              // Also broadcast chunks with parentToolUseId to all session sockets
              // This allows Visual Mode (Terminal Grid) to show sub-agent activity
              if (sessionId && chunk.parentToolUseId) {
                broadcastToSession(sessionId, chunk)
              }
            }
            } finally {
              clearTimeout(executionTimeoutId)
            }
            log.info('Stream loop completed', { requestId, fullResponseLength: fullResponse.length })

            // Check for auto-continuation
            const continuationCheck = shouldContinue(fullResponse)
            if (continuationCheck.should) {
              autoContinuation.recordIteration(fullResponse)
              const continuePrompt = getContinuePrompt(fullResponse)
              const contState = autoContinuation.getState()

              // Emit continuation event to client
              ws.send(JSON.stringify({
                type: 'continuation',
                event: 'iteration',
                state: {
                  isActive: contState.isActive,
                  currentIteration: contState.currentIteration,
                  maxIterations: contState.maxIterations,
                  startedAt: contState.startedAt?.toISOString() || null,
                  sessionId: contState.sessionId,
                } as ContinuationState,
              }))

              log.info('Auto-continuing', {
                iteration: contState.currentIteration,
                maxIterations: contState.maxIterations,
                reason: continuationCheck.reason,
              })

              // Delay before continuing
              await new Promise(resolve => setTimeout(resolve, 1000))

              // Re-trigger the execute with continue prompt
              // This will be handled by recursively processing
              ws.send(JSON.stringify({
                type: 'auto_continue',
                prompt: continuePrompt,
                iteration: contState.currentIteration,
              }))
            } else if (continuationCheck.reason === 'completed' || continuationCheck.reason === 'max_iterations') {
              const contState = autoContinuation.getState()
              ws.send(JSON.stringify({
                type: 'continuation',
                event: 'completed',
                state: {
                  isActive: false,
                  currentIteration: contState.currentIteration,
                  maxIterations: contState.maxIterations,
                  startedAt: contState.startedAt?.toISOString() || null,
                  sessionId: contState.sessionId,
                } as ContinuationState,
                reason: continuationCheck.reason,
              }))
            }

            activeProcesses.delete(requestId)
            wsToRequestId.delete(ws)
            log.debug('Cleaned up activeProcesses after completion', { requestId })

            if (sessionId && fullResponse) {
              // Build context snapshot from captured events
              const contextSnapshot: ContextSnapshot = {
                mcpServers: [],
                rules: [],
                skills: [],
                activeAgentIds: sessionAgents.map(a => a.id),
              }
              for (const event of executionEvents) {
                if (event.type === 'context' && event.contextName) {
                  if (event.contextType === 'mcp') contextSnapshot.mcpServers.push(event.contextName)
                  else if (event.contextType === 'rule') contextSnapshot.rules.push(event.contextName)
                  else if (event.contextType === 'skill') contextSnapshot.skills.push(event.contextName)
                }
              }

              await sessions.addMessage(sessionId, 'assistant', fullResponse, {
                executionEvents: executionEvents.length > 0 ? executionEvents : undefined,
                usage: lastUsage,
                costUsd: lastCostUsd,
                contextSnapshot: (contextSnapshot.mcpServers.length > 0 || contextSnapshot.rules.length > 0 || contextSnapshot.skills.length > 0 || contextSnapshot.activeAgentIds.length > 0) ? contextSnapshot : undefined,
              })

              // Persist agents to session
              for (const agent of sessionAgents) {
                await sessions.addAgent(sessionId, agent)
              }

              try {
                const memories = await extractMemoriesFromConversation([
                  { role: 'user', content: prompt },
                  { role: 'assistant', content: fullResponse }
                ], { sessionId })

                if (memories.length > 0) {
                  log.info('Extracted memories', { count: memories.length, sessionId })
                }
              } catch (memError) {
                log.warn('Memory extraction failed', { error: String(memError) })
              }
            }
          } catch (error) {
            log.error('WS execute CLI failed', { error: error instanceof Error ? error.message : String(error) })
            ws.send(JSON.stringify({
              type: 'error',
              data: error instanceof Error ? error.message : 'Unknown error'
            }))
          } finally {
            agentRegistry.off('agent:created', agentCreatedHandler)
            agentRegistry.off('agent:started', agentStartedHandler)
            agentRegistry.off('agent:completed', agentCompletedHandler)
            agentRegistry.off('agent:failed', agentFailedHandler)

            for (const path of imagePaths) {
              try {
                await unlink(path)
              } catch {
                // Ignore cleanup errors
              }
            }
          }
        }
      },
      close(ws) {
        log.debug('WebSocket disconnected')

        // Unregister from session broadcast
        unregisterSessionSocket(ws)

        const requestId = wsToRequestId.get(ws)
        if (requestId) {
          const activeProcess = activeProcesses.get(requestId)
          if (activeProcess) {
            log.info('Cleaning up process on WebSocket close', { requestId })
            activeProcess.abort()
            activeProcesses.delete(requestId)
          }
          wsToRequestId.delete(ws)
        }

        const contextListeners = wsContextListeners.get(ws)
        if (contextListeners) {
          const contextMonitor = contextWindowMonitor
          contextMonitor.off('status:changed', contextListeners.statusChanged)
          contextMonitor.off('threshold:warning', contextListeners.thresholdWarning)
          contextMonitor.off('threshold:critical', contextListeners.thresholdCritical)
          contextMonitor.off('compaction:started', contextListeners.compactionStarted)
          contextMonitor.off('compaction:completed', contextListeners.compactionCompleted)
          wsContextListeners.delete(ws)
        }
      },
    })
}
