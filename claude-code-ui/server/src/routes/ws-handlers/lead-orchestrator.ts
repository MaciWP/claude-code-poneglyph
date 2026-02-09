import type { OrchestratorAgent } from '../../services/orchestrator-agent'
import type { SessionStore } from '../../services/sessions'
import type { ActiveProcess, WebSocketWithSend } from './types'
import { broadcastToSession } from './session-broadcast'
import { extractMemoriesFromConversation } from '../../services/memory'
import { SessionStateManager } from '../../services/session-state'
import { logger } from '../../logger'

const log = logger.child('ws-lead-orchestrator')

interface LeadOrchestratorParams {
  ws: WebSocketWithSend
  leadOrchestrator: OrchestratorAgent
  sessions: SessionStore
  prompt: string
  messages?: Array<{ role: string; content: string }>
  sessionId?: string
  workDir?: string
  requestId: string
  activeProcesses: Map<string, ActiveProcess>
  wsToRequestId: Map<unknown, string>
  maxActiveProcesses: number
  sessionStateManager?: SessionStateManager
}

/**
 * Setup event handlers for Lead Orchestrator streaming
 */
function setupLeadOrchestratorHandlers(
  ws: WebSocketWithSend,
  leadOrchestrator: OrchestratorAgent,
  sessionId?: string
) {
  const classifiedHandler = (data: { executionId: string; classification: unknown }) => {
    ws.send(
      JSON.stringify({
        type: 'orchestrator_event',
        event: 'classified',
        executionId: data.executionId,
        classification: data.classification,
      })
    )
  }

  const executingHandler = (data: { executionId: string }) => {
    ws.send(
      JSON.stringify({
        type: 'orchestrator_event',
        event: 'executing',
        executionId: data.executionId,
      })
    )
  }

  const agentToolUseHandler = (data: {
    agentId: string
    tool: string
    toolCalls: number
    toolUseId?: string
    toolInput?: unknown
  }) => {
    ws.send(
      JSON.stringify({
        type: 'tool_use',
        tool: data.tool,
        toolUseId: data.toolUseId || `agent-${data.agentId}-${data.toolCalls}`,
        toolInput: data.toolInput,
        agentId: data.agentId,
      })
    )
  }

  const agentSpawnedHandler = (data: { agentId: string; type: string }) => {
    if (sessionId) {
      broadcastToSession(sessionId, {
        type: 'agent_event',
        event: 'spawned',
        agentId: data.agentId,
        agentType: data.type,
      })
    }
  }

  const agentCompletedHandler = (data: {
    agentId: string
    success: boolean
    toolCalls: number
    durationMs: number
  }) => {
    if (sessionId) {
      broadcastToSession(sessionId, {
        type: 'agent_event',
        event: 'completed',
        agentId: data.agentId,
        success: data.success,
        toolCalls: data.toolCalls,
        durationMs: data.durationMs,
      })
    }
  }

  const completedHandler = (data: {
    executionId: string
    execution: { status: string; results?: unknown[] }
  }) => {
    ws.send(
      JSON.stringify({
        type: 'orchestrator_event',
        event: 'completed',
        executionId: data.executionId,
        status: data.execution.status,
        agentsUsed: data.execution.results?.length || 0,
      })
    )
  }

  const agentTextHandler = (data: { agentId: string; data: string }) => {
    ws.send(
      JSON.stringify({
        type: 'text',
        data: data.data,
        agentId: data.agentId,
      })
    )
  }

  const agentToolResultHandler = (data: {
    agentId: string
    tool: string
    toolUseId?: string
    toolOutput?: string
  }) => {
    ws.send(
      JSON.stringify({
        type: 'tool_result',
        tool: data.tool,
        toolUseId: data.toolUseId,
        toolOutput: data.toolOutput,
        agentId: data.agentId,
      })
    )
  }

  const learningStartedHandler = (data: { expertId: string }) => {
    ws.send(
      JSON.stringify({
        type: 'learning_event',
        event: 'started',
        expertId: data.expertId,
      })
    )
  }

  const learningCompletedHandler = (data: { expertId: string; changes: unknown[] }) => {
    ws.send(
      JSON.stringify({
        type: 'learning_event',
        event: 'completed',
        expertId: data.expertId,
        changes: data.changes,
      })
    )
  }

  const learningFailedHandler = (data: { expertId: string; error: string }) => {
    ws.send(
      JSON.stringify({
        type: 'learning_event',
        event: 'failed',
        expertId: data.expertId,
        error: data.error,
      })
    )
  }

  // Attach all handlers
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

  // Return cleanup function
  return () => {
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
  }
}

/**
 * Build prompt with conversation history and session state for orchestrator
 */
function buildPromptWithHistory(
  prompt: string,
  messages?: Array<{ role: string; content: string }>,
  sessionContext?: string
): string {
  const parts: string[] = []

  if (sessionContext) {
    parts.push(sessionContext)
    parts.push('---')
  }

  if (messages && messages.length > 0) {
    const recent = messages.slice(-10)
    parts.push('## Recent Conversation')
    for (const msg of recent) {
      const truncated = msg.content.slice(0, 500)
      const suffix = msg.content.length > 500 ? '...' : ''
      parts.push(`[${msg.role}]: ${truncated}${suffix}`)
    }
    parts.push('---')
  }

  parts.push(`## Current Request`)
  parts.push(prompt)

  return parts.join('\n')
}

/**
 * Handle Lead Orchestrator execution
 */
export async function handleLeadOrchestrator(params: LeadOrchestratorParams): Promise<void> {
  const {
    ws,
    leadOrchestrator,
    sessions,
    prompt,
    messages,
    sessionId,
    workDir,
    requestId,
    activeProcesses,
    wsToRequestId,
    maxActiveProcesses,
    sessionStateManager,
  } = params

  log.info('Using Lead Orchestrator', { sessionId, promptLength: prompt?.length })

  ws.send(JSON.stringify({ type: 'request_id', data: requestId }))

  // Check capacity limit
  if (activeProcesses.size >= maxActiveProcesses) {
    log.warn('Max active processes reached, rejecting new request', {
      current: activeProcesses.size,
      max: maxActiveProcesses,
    })
    ws.send(
      JSON.stringify({
        type: 'error',
        data: 'Server at capacity, please try again later',
      })
    )
    return
  }

  // Store abort function
  activeProcesses.set(requestId, {
    abort: () => {
      const activeExecutionId = leadOrchestrator.getActiveExecutionId()
      if (activeExecutionId) {
        leadOrchestrator.abort(activeExecutionId)
      }
    },
    sessionId,
    createdAt: Date.now(),
  })
  wsToRequestId.set(ws, requestId)

  // Setup event handlers
  const cleanupHandlers = setupLeadOrchestratorHandlers(ws, leadOrchestrator, sessionId)

  try {
    if (sessionId) {
      await sessions.addMessage(sessionId, 'user', prompt)
    }

    let sessionContext = ''
    if (sessionStateManager && sessionId) {
      sessionStateManager.getOrCreate(sessionId, workDir || '.')
      sessionContext = sessionStateManager.getContextForOrchestrator(sessionId)
    }

    const promptWithHistory = buildPromptWithHistory(prompt, messages, sessionContext)

    log.info('Calling leadOrchestrator.execute', { sessionId })
    const result = await leadOrchestrator.execute(
      promptWithHistory,
      sessionId || requestId,
      workDir
    )
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
        const memories = await extractMemoriesFromConversation(
          [
            { role: 'user', content: prompt },
            { role: 'assistant', content: result },
          ],
          { sessionId }
        )

        if (memories.length > 0) {
          log.info('Extracted memories', { count: memories.length, sessionId })
        }
      } catch (memError) {
        log.warn('Memory extraction failed', { error: String(memError) })
      }
    }
  } catch (error) {
    log.error('Lead Orchestrator failed', { error: String(error) })
    ws.send(
      JSON.stringify({
        type: 'error',
        data: error instanceof Error ? error.message : 'Orchestration failed',
      })
    )
  } finally {
    cleanupHandlers()
    activeProcesses.delete(requestId)
    wsToRequestId.delete(ws)
  }
}
