import { Elysia, t } from 'elysia'
import type { ClaudeService } from '../services/claude'
import type { CodexService } from '../services/codex'
import type { GeminiService } from '../services/gemini'
import type { SessionStore } from '../services/sessions'
import type { orchestrator as OrchestratorType } from '../services/orchestrator'
import type { agentRegistry as AgentRegistryType } from '../services/agent-registry'
import type { OrchestratorAgent } from '../services/orchestrator-agent'
import type { SessionStateManager } from '../services/session-state'
import { logger } from '../logger'

// Import handlers from ws-handlers module
import {
  type ActiveProcess,
  type WebSocketWithSend,
  type ExecuteCliData,
  type QAWSEvent,
  WS_CONSTANTS,
  registerSessionSocket,
  unregisterSessionSocket,
  broadcastToAll,
  setupContextWindowMonitoring,
  cleanupContextWindowMonitoring,
  handleLeadOrchestrator,
  handleExecuteCli,
} from './ws-handlers'
import { qaRunner } from '../services/qa-runner'

interface WebSocketMessage {
  type: string
  data?: Record<string, unknown>
}

// State maps for active processes and WebSocket tracking
const activeProcesses = new Map<string, ActiveProcess>()
const wsToRequestId = new Map<object, string>()

// Logger for cleanup (outside createWebSocketRoutes scope)
const cleanupLog = logger.child('websocket-cleanup')

// Periodic cleanup of orphan processes
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  let cleaned = 0

  for (const [key, process] of activeProcesses) {
    if (process.createdAt && now - process.createdAt > WS_CONSTANTS.PROCESS_TTL_MS) {
      try {
        process.abort()
      } catch (error) {
        cleanupLog.debug('Process abort failed (non-critical)', { error: String(error) })
      }
      activeProcesses.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    cleanupLog.info('Cleanup: removed orphan processes', {
      cleaned,
      remaining: activeProcesses.size,
    })
  }
}, WS_CONSTANTS.CLEANUP_INTERVAL_MS)

// Allow cleanup of interval if needed
export const stopCleanupInterval = () => clearInterval(cleanupInterval)

// Broadcast QA runner events to all connected WebSocket clients (once at module init)
qaRunner.on('qa_event', (event: QAWSEvent) => {
  broadcastToAll(event)
})

/**
 * Handle abort message
 */
function handleAbort(
  ws: WebSocketWithSend,
  message: { data?: { requestId?: string } },
  log: ReturnType<typeof logger.child>
): void {
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
      ws.send(
        JSON.stringify({
          type: 'result',
          data: '?? Execution aborted by user',
          aborted: true,
        })
      )
      ws.send(JSON.stringify({ type: 'done', data: '' }))
      return
    }
  }

  // Fallback: abort most recent process
  if (activeProcesses.size > 0) {
    const keys = Array.from(activeProcesses.keys())
    const lastKey = keys[keys.length - 1]
    const activeProcess = activeProcesses.get(lastKey)
    if (activeProcess) {
      log.info('Using fallback - aborting most recent process', { requestId: lastKey })
      activeProcess.abort()
      activeProcesses.delete(lastKey)
      ws.send(
        JSON.stringify({
          type: 'result',
          data: '?? Execution aborted by user',
          aborted: true,
        })
      )
      ws.send(JSON.stringify({ type: 'done', data: '' }))
      return
    }
  }

  log.warn('No active process found to abort')
  ws.send(
    JSON.stringify({
      type: 'result',
      data: '?? No active process to abort',
      aborted: true,
    })
  )
  ws.send(JSON.stringify({ type: 'done', data: '' }))
}

/**
 * Handle user answer for AskUserQuestion
 */
function handleUserAnswer(
  message: { data?: { requestId?: string; answer?: string } },
  ws: object,
  log: ReturnType<typeof logger.child>
): void {
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
}

/**
 * Create WebSocket routes for the Elysia app
 */
export const createWebSocketRoutes = (
  claude: ClaudeService,
  codex: CodexService,
  gemini: GeminiService,
  sessions: SessionStore,
  orchestrator: typeof OrchestratorType,
  agentRegistry: typeof AgentRegistryType,
  leadOrchestrator?: OrchestratorAgent,
  sessionStateManager?: SessionStateManager
) => {
  const log = logger.child('websocket')

  return new Elysia().ws('/ws', {
    body: t.Object({
      type: t.String(),
      data: t.Optional(t.Unknown()),
    }),
    open(ws) {
      log.debug('WebSocket connected')
      setupContextWindowMonitoring(ws as unknown as WebSocketWithSend)
    },
    async message(ws, rawMessage) {
      const wsTyped = ws as unknown as WebSocketWithSend
      const message = rawMessage as unknown as WebSocketMessage

      // Handle abort request
      if (message.type === 'abort') {
        handleAbort(wsTyped, message as { data?: { requestId?: string } }, log)
        return
      }

      // Handle session registration (for Visual Mode WebSocket)
      if (message.type === 'register-session') {
        const sessionId = (message.data as { sessionId?: string } | undefined)?.sessionId
        if (sessionId) {
          registerSessionSocket(sessionId, ws)
          log.debug('Visual Mode WebSocket registered for session', { sessionId })
          wsTyped.send(JSON.stringify({ type: 'session-registered', sessionId }))
        }
        return
      }

      // Handle user answer for AskUserQuestion
      if (message.type === 'user_answer') {
        handleUserAnswer(
          message as { data?: { requestId?: string; answer?: string } },
          ws as object,
          log
        )
        return
      }

      // Handle execute-cli command
      if (message.type === 'execute-cli') {
        const data = (message.data ?? {}) as unknown as ExecuteCliData

        // Register socket for session broadcasts
        if (data.sessionId) {
          registerSessionSocket(data.sessionId, ws)
        }

        // Use Lead Orchestrator for automatic agent delegation
        if (data.leadOrchestrate && leadOrchestrator) {
          const requestId = crypto.randomUUID()
          await handleLeadOrchestrator({
            ws: wsTyped,
            leadOrchestrator,
            sessions,
            prompt: data.prompt,
            messages: data.messages,
            sessionId: data.sessionId,
            workDir: data.workDir,
            requestId,
            activeProcesses,
            wsToRequestId,
            maxActiveProcesses: WS_CONSTANTS.MAX_ACTIVE_PROCESSES,
            sessionStateManager,
          })
          return
        }

        // Standard CLI execution
        await handleExecuteCli({
          ws: wsTyped,
          data,
          sessions,
          claude,
          codex,
          gemini,
          orchestrator,
          agentRegistry,
          activeProcesses,
          wsToRequestId,
        })
      }
    },
    close(ws) {
      log.debug('WebSocket disconnected')

      // Unregister from session broadcast
      unregisterSessionSocket(ws)

      // Cleanup active process
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

      // Cleanup context window monitoring
      cleanupContextWindowMonitoring(ws)
    },
  })
}
