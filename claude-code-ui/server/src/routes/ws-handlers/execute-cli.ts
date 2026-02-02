import { join } from 'path'
import { unlink } from 'fs/promises'
import type { ClaudeService } from '../../services/claude'
import type { CodexService } from '../../services/codex'
import type { GeminiService } from '../../services/gemini'
import type { SessionStore } from '../../services/sessions'
import type { orchestrator as OrchestratorType } from '../../services/orchestrator'
import type { agentRegistry as AgentRegistryType } from '../../services/agent-registry'
import type { ExecutionEvent, TokenUsage, ContextSnapshot, PersistedAgent, ContinuationState } from '@shared/types'
import type { ActiveProcess, ExecuteCliData, TaskToolInfo, WebSocketWithSend } from './types'
import { WS_CONSTANTS } from './types'
import type { Message } from '@shared/types'
import { broadcastToSession, registerSessionSocket } from './session-broadcast'
import { extractMemoriesFromConversation } from '../../services/memory'
import { injectMemories } from '../../services/memory/injection'
import { loadClaudeConfig } from '../claude-config'
import { TOOL_OUTPUT_MAX_SIZE } from '../../constants'
import { autoContinuation, shouldContinue, getContinuePrompt } from '../../services/auto-continuation'
import { logger } from '../../logger'

const log = logger.child('ws-execute-cli')

/**
 * Convert simple message format to full Message type
 */
function convertToMessages(messages?: Array<{ role: string; content: string }>): Message[] | undefined {
  if (!messages || messages.length === 0) return undefined

  return messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
    timestamp: new Date().toISOString(),
  }))
}

interface ExecuteCliParams {
  ws: WebSocketWithSend
  data: ExecuteCliData
  sessions: SessionStore
  claude: ClaudeService
  codex: CodexService
  gemini: GeminiService
  orchestrator: typeof OrchestratorType
  agentRegistry: typeof AgentRegistryType
  activeProcesses: Map<string, ActiveProcess>
  wsToRequestId: Map<unknown, string>
}

/**
 * Inject memories into prompt if available
 */
async function injectMemoriesIntoPrompt(
  ws: WebSocketWithSend,
  prompt: string,
  sessionId?: string
): Promise<string> {
  try {
    const memoryResult = await injectMemories(prompt, sessionId)
    if (memoryResult.context && memoryResult.memories.length > 0) {
      log.info('Memories injected', {
        count: memoryResult.memories.length,
        queryTimeMs: memoryResult.metadata.queryTimeMs,
        sessionId
      })

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

      return `${memoryResult.context}\n\n---\n\n${prompt}`
    }
  } catch (memError) {
    log.warn('Memory injection failed (continuing without)', { error: String(memError) })
  }
  return prompt
}

/**
 * Handle orchestration enrichment
 */
async function handleOrchestration(
  ws: WebSocketWithSend,
  prompt: string,
  orchestrator: typeof OrchestratorType
): Promise<string> {
  const enriched = await orchestrator.enrichPrompt(prompt)
  const promptToUse = orchestrator.formatEnrichedPrompt(enriched)

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

  // Check for command matches
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

  return promptToUse
}

/**
 * Save images to temp files and return paths
 */
async function saveImagesToTemp(images?: Array<{ dataUrl: string }>): Promise<string[]> {
  const imagePaths: string[] = []

  if (!images || !Array.isArray(images)) {
    return imagePaths
  }

  for (const img of images) {
    try {
      const base64Data = img.dataUrl.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      const tempPath = join(import.meta.dir, `../../../storage/temp/temp-${crypto.randomUUID()}.png`)
      await Bun.write(tempPath, buffer)
      imagePaths.push(tempPath)
      log.debug('Image saved', { path: tempPath })
    } catch (e) {
      log.warn('Image save failed', { error: String(e) })
    }
  }

  return imagePaths
}

/**
 * Cleanup temp image files
 */
async function cleanupTempImages(imagePaths: string[]): Promise<void> {
  for (const path of imagePaths) {
    try {
      await unlink(path)
    } catch (error) {
      log.debug('Temp image cleanup failed (non-critical)', { path, error: String(error) })
    }
  }
}

/**
 * Setup agent registry event handlers
 */
function setupAgentRegistryHandlers(
  ws: WebSocketWithSend,
  agentRegistry: typeof AgentRegistryType,
  sessionId: string | undefined,
  executionEvents: ExecutionEvent[],
  sessionAgents: PersistedAgent[]
) {
  const agentCreatedHandler = (agent: { id: string; type: string; task: string; model?: string; tools?: string[] }) => {
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
    if (sessionId) {
      broadcastToSession(sessionId, {
        type: 'agent_event',
        data: '',
        event: 'started',
        agentId: agent.id,
      })
    }

    const pa = sessionAgents.find(a => a.id === agent.id)
    if (pa) {
      pa.status = 'active'
      pa.startedAt = new Date().toISOString()
    }
  }

  const agentCompletedHandler = (agent: { id: string; result?: string; tokensUsed?: number; toolCalls?: number; durationMs?: number }) => {
    if (sessionId) {
      broadcastToSession(sessionId, {
        type: 'agent_event',
        data: '',
        event: 'completed',
        agentId: agent.id,
        result: agent.result?.slice(0, 200),
      })
    }

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

    executionEvents.push({
      id: crypto.randomUUID(),
      type: 'agent_end',
      timestamp: new Date().toISOString(),
      toolUseId: agent.id,
      agentStatus: 'completed',
    })

    const pa = sessionAgents.find(a => a.id === agent.id)
    if (pa) {
      pa.status = 'completed'
      pa.completedAt = new Date().toISOString()
      pa.result = agent.result?.slice(0, 1000)
      pa.tokensUsed = agent.tokensUsed
    }
  }

  const agentFailedHandler = (agent: { id: string; error?: string }) => {
    if (sessionId) {
      broadcastToSession(sessionId, {
        type: 'agent_event',
        data: '',
        event: 'failed',
        agentId: agent.id,
        error: agent.error,
      })
    }

    executionEvents.push({
      id: crypto.randomUUID(),
      type: 'agent_end',
      timestamp: new Date().toISOString(),
      toolUseId: agent.id,
      agentStatus: 'failed',
      agentError: agent.error,
    })

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

  return () => {
    agentRegistry.off('agent:created', agentCreatedHandler)
    agentRegistry.off('agent:started', agentStartedHandler)
    agentRegistry.off('agent:completed', agentCompletedHandler)
    agentRegistry.off('agent:failed', agentFailedHandler)
  }
}

/**
 * Process stream chunks and capture events
 */
async function processStream(
  ws: WebSocketWithSend,
  stream: AsyncIterable<{ type: string; data?: string; tool?: string; toolUseId?: string; toolInput?: unknown; toolOutput?: unknown; parentToolUseId?: string; usage?: TokenUsage; costUsd?: number }>,
  sessionId: string | undefined,
  executionEvents: ExecutionEvent[],
  activeTaskTools: Map<string, TaskToolInfo>
): Promise<{ fullResponse: string; lastUsage?: TokenUsage; lastCostUsd?: number }> {
  let fullResponse = ''
  let lastUsage: TokenUsage | undefined
  let lastCostUsd: number | undefined

  for await (const chunk of stream) {
    if (chunk.type === 'text') {
      fullResponse += chunk.data
    }

    // Capture execution events
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

      // Detect Task tool usage for Kanban/Terminals
      if (chunk.tool === 'Task' && chunk.toolInput) {
        const input = chunk.toolInput as { subagent_type?: string; description?: string; prompt?: string }
        const agentId = chunk.toolUseId || `task-${Date.now()}`
        const agentType = input.subagent_type || 'general-purpose'
        const taskTitle = input.description || input.prompt?.slice(0, 50) || 'Task'

        activeTaskTools.set(agentId, { agentId, agentType, taskTitle })

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
      const toolOutput = typeof chunk.toolOutput === 'string'
        ? chunk.toolOutput.slice(0, TOOL_OUTPUT_MAX_SIZE)
        : undefined

      executionEvents.push({
        id: crypto.randomUUID(),
        type: 'tool_result',
        timestamp: new Date().toISOString(),
        toolUseId: chunk.toolUseId,
        toolOutput,
        isError: chunk.toolOutput?.toString().startsWith('Error'),
      })

      // Check Task tool completion for Kanban/Terminals
      if (chunk.toolUseId && activeTaskTools.has(chunk.toolUseId)) {
        const taskInfo = activeTaskTools.get(chunk.toolUseId)!
        const isError = chunk.toolOutput?.toString().startsWith('Error') ||
                        chunk.toolOutput?.toString().includes('failed') ||
                        chunk.toolOutput?.toString().includes('FAILED')

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
        log.debug('Task tool completed, emitting agent_event', { agentId: taskInfo.agentId, isError })
      }
    } else if (chunk.type === 'thinking') {
      executionEvents.push({
        id: crypto.randomUUID(),
        type: 'thinking',
        timestamp: new Date().toISOString(),
        thinkingContent: typeof chunk.data === 'string' ? chunk.data : undefined,
      })
    } else if (chunk.type === 'context') {
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

    // Send to requesting client
    ws.send(JSON.stringify(chunk))

    // Broadcast chunks with parentToolUseId for Visual Mode
    if (sessionId && chunk.parentToolUseId) {
      broadcastToSession(sessionId, chunk)
    }
  }

  return { fullResponse, lastUsage, lastCostUsd }
}

/**
 * Handle auto-continuation logic
 */
function handleAutoContinuation(
  ws: WebSocketWithSend,
  fullResponse: string
): void {
  const continuationCheck = shouldContinue(fullResponse)

  if (continuationCheck.should) {
    autoContinuation.recordIteration(fullResponse)
    const continuePrompt = getContinuePrompt(fullResponse)
    const contState = autoContinuation.getState()

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

    // Send auto_continue event after delay
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'auto_continue',
        prompt: continuePrompt,
        iteration: contState.currentIteration,
      }))
    }, 1000)
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
}

/**
 * Save session data after execution
 */
async function saveSessionData(
  sessions: SessionStore,
  sessionId: string,
  fullResponse: string,
  prompt: string,
  executionEvents: ExecutionEvent[],
  sessionAgents: PersistedAgent[],
  lastUsage?: TokenUsage,
  lastCostUsd?: number
): Promise<void> {
  // Build context snapshot
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

  // Persist agents
  for (const agent of sessionAgents) {
    await sessions.addAgent(sessionId, agent)
  }

  // Extract memories
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

/**
 * Handle CLI execution
 */
export async function handleExecuteCli(params: ExecuteCliParams): Promise<void> {
  const {
    ws,
    data,
    sessions,
    claude,
    codex,
    gemini,
    orchestrator,
    agentRegistry,
    activeProcesses,
    wsToRequestId
  } = params

  const {
    prompt,
    messages,
    sessionId,
    workDir,
    resume,
    images,
    orchestrate,
    thinking,
    planMode,
    bypassPermissions,
    allowFullPC,
    provider
  } = data

  // Register socket for session broadcasts
  if (sessionId) {
    registerSessionSocket(sessionId, ws)
  }

  let promptToUse = prompt

  // Inject memories
  promptToUse = await injectMemoriesIntoPrompt(ws, promptToUse, sessionId)

  // Handle orchestration
  if (orchestrate) {
    promptToUse = await handleOrchestration(ws, prompt, orchestrator)
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

  const requestId = crypto.randomUUID()

  // Check capacity
  if (activeProcesses.size >= WS_CONSTANTS.MAX_ACTIVE_PROCESSES) {
    log.warn('Max active processes reached, rejecting new request', {
      current: activeProcesses.size,
      max: WS_CONSTANTS.MAX_ACTIVE_PROCESSES
    })
    ws.send(JSON.stringify({
      type: 'error',
      data: 'Server at capacity, please try again later'
    }))
    return
  }

  const imageDataUrls = images?.map((img) => img.dataUrl) || []

  if (sessionId) {
    await sessions.addMessage(sessionId, 'user', prompt, undefined, imageDataUrls.length > 0 ? imageDataUrls : undefined)
  }

  const imagePaths = await saveImagesToTemp(images)

  const executionEvents: ExecutionEvent[] = []
  const sessionAgents: PersistedAgent[] = []
  const activeTaskTools = new Map<string, TaskToolInfo>()

  const cleanupAgentHandlers = setupAgentRegistryHandlers(
    ws,
    agentRegistry,
    sessionId,
    executionEvents,
    sessionAgents
  )

  try {
    const providerName = provider || 'claude'
    const cliService = providerName === 'codex'
      ? codex
      : providerName === 'gemini'
        ? gemini
        : claude

    const sessionFilePath = sessionId ? sessions.getSessionFilePath(sessionId) : undefined

    const streamResult = cliService.streamCLIWithAbort({
      prompt: promptToUse,
      messages: convertToMessages(messages),
      sessionId,
      sessionFilePath,
      workDir,
      resume: resume ? String(resume) : undefined,
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

    activeProcesses.set(requestId, { abort, sendUserAnswer, sessionId, createdAt: Date.now() })
    wsToRequestId.set(ws, requestId)

    log.info('Stored abort function in activeProcesses', {
      requestId,
      mapSize: activeProcesses.size,
      wsMapSize: wsToRequestId.size,
    })

    ws.send(JSON.stringify({ type: 'request_id', data: requestId }))

    // Execution timeout
    const executionTimeoutId = setTimeout(() => {
      log.warn('Execution timeout exceeded', { requestId, timeoutMs: WS_CONSTANTS.EXECUTION_TIMEOUT_MS })
      abort()
      ws.send(JSON.stringify({
        type: 'error',
        data: '?? Execution timeout exceeded (10 minutes). Process aborted.',
      }))
      ws.send(JSON.stringify({ type: 'done', data: '' }))
      activeProcesses.delete(requestId)
      wsToRequestId.delete(ws)
    }, WS_CONSTANTS.EXECUTION_TIMEOUT_MS)

    try {
      const { fullResponse, lastUsage, lastCostUsd } = await processStream(
        ws,
        stream as AsyncIterable<{ type: string; data?: string; tool?: string; toolUseId?: string; toolInput?: unknown; toolOutput?: unknown; parentToolUseId?: string; usage?: TokenUsage; costUsd?: number }>,
        sessionId,
        executionEvents,
        activeTaskTools
      )

      log.info('Stream loop completed', { requestId, fullResponseLength: fullResponse.length })

      // Handle auto-continuation
      handleAutoContinuation(ws, fullResponse)

      activeProcesses.delete(requestId)
      wsToRequestId.delete(ws)
      log.debug('Cleaned up activeProcesses after completion', { requestId })

      if (sessionId && fullResponse) {
        await saveSessionData(
          sessions,
          sessionId,
          fullResponse,
          prompt,
          executionEvents,
          sessionAgents,
          lastUsage,
          lastCostUsd
        )
      }
    } finally {
      clearTimeout(executionTimeoutId)
    }
  } catch (error) {
    log.error('WS execute CLI failed', { error: error instanceof Error ? error.message : String(error) })
    ws.send(JSON.stringify({
      type: 'error',
      data: error instanceof Error ? error.message : 'Unknown error'
    }))
  } finally {
    cleanupAgentHandlers()
    await cleanupTempImages(imagePaths)
  }
}
