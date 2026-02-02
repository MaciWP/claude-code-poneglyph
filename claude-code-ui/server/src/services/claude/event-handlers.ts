/**
 * CLI Stream Event Handlers
 *
 * Individual event type handlers for processing CLI stream events.
 */

import { logger } from '../../logger'
import { CONTEXT_WINDOW_SIZE } from '../../constants'
import { findRulesInDir } from './rules'
import type { CLIOptions, CLIStreamEvent, ActiveTaskInfo } from './types'
import type { StreamChunk } from '@shared/types'

const log = logger.child('claude-cli-events')

// =============================================================================
// STREAM PROCESSOR STATE
// =============================================================================

/**
 * State object for tracking tool correlations during stream processing.
 */
export interface StreamProcessorState {
  toolIdToName: Map<string, string>
  toolNameStack: string[]
  activeTasksMap: Map<string, ActiveTaskInfo>
  currentExecutingTaskId: string | undefined
}

/**
 * Creates initial state for stream processing.
 */
export function createProcessorState(): StreamProcessorState {
  return {
    toolIdToName: new Map(),
    toolNameStack: [],
    activeTasksMap: new Map(),
    currentExecutingTaskId: undefined,
  }
}

// =============================================================================
// INIT EVENT HANDLER
// =============================================================================

/**
 * Process system init event.
 */
export async function handleInitEvent(
  event: CLIStreamEvent,
  options: CLIOptions,
  push: (chunk: StreamChunk) => void
): Promise<void> {
  push({
    type: 'init',
    data: event.cwd || '',
    sessionId: event.session_id,
  })
  const workDir = event.cwd || options.workDir || process.cwd()
  const rules = await findRulesInDir(workDir)
  for (const rule of rules) {
    push({
      type: 'context',
      data: rule,
      contextType: 'rule',
      name: rule,
      sessionId: event.session_id,
    })
  }
}

// =============================================================================
// ASSISTANT EVENT HANDLER
// =============================================================================

/**
 * Process assistant message event.
 */
export async function handleAssistantEvent(
  event: CLIStreamEvent,
  state: StreamProcessorState,
  push: (chunk: StreamChunk) => void,
  sendAnswerToProc: (answer: string) => void,
  setAnswerResolver?: (resolver: (answer: string) => void) => void
): Promise<void> {
  if (!event.message?.content || !Array.isArray(event.message.content)) return

  for (const block of event.message.content) {
    if (!block || typeof block !== 'object' || !('type' in block)) continue

    if (block.type === 'text' && block.text) {
      push({ type: 'text', data: block.text, sessionId: event.session_id })
    } else if (block.type === 'thinking' && block.text) {
      push({ type: 'thinking', data: block.text, sessionId: event.session_id })
    } else if (block.type === 'tool_use' && block.name) {
      await handleToolUseBlock(block, event.session_id, state, push, sendAnswerToProc, setAnswerResolver)
    }
  }
}

/**
 * Process a tool_use block within an assistant message.
 */
async function handleToolUseBlock(
  block: { type: string; name?: string; id?: string; input?: unknown },
  sessionId: string | undefined,
  state: StreamProcessorState,
  push: (chunk: StreamChunk) => void,
  sendAnswerToProc: (answer: string) => void,
  setAnswerResolver?: (resolver: (answer: string) => void) => void
): Promise<void> {
  if (!block.name) return

  if (block.id) {
    state.toolIdToName.set(block.id, block.name)
  } else {
    state.toolNameStack.push(block.name)
  }

  // Track Task tools for parent correlation
  const isTask = block.name === 'Task'
  if (isTask && block.id) {
    state.activeTasksMap.set(block.id, {
      parentTaskId: state.currentExecutingTaskId,
      startTime: Date.now(),
    })
    state.currentExecutingTaskId = block.id
    log.debug('Task registered', {
      taskId: block.id,
      parentTaskId: state.activeTasksMap.get(block.id)?.parentTaskId,
      totalActiveTasks: state.activeTasksMap.size,
    })
  }

  const parentToolUseId = !isTask ? state.currentExecutingTaskId : undefined
  const isAskUserQuestion = block.name === 'AskUserQuestion'

  // Log Task tools with subagent_type for debugging
  if (isTask) {
    const taskInput = block.input as { subagent_type?: string; prompt?: string }
    log.info('Task tool emitted', {
      toolUseId: block.id,
      parentToolUseId,
      subagent_type: taskInput?.subagent_type || 'MISSING',
      promptPreview: (taskInput?.prompt || '').slice(0, 50),
    })
  } else {
    log.debug('Tool use emitted', {
      tool: block.name,
      toolUseId: block.id,
      parentToolUseId,
      inputPreview: JSON.stringify(block.input).slice(0, 100),
    })
  }

  push({
    type: 'tool_use',
    data: block.name,
    tool: block.name,
    toolInput: block.input,
    toolUseId: block.id,
    parentToolUseId,
    sessionId,
    waitingForAnswer: isAskUserQuestion,
  })

  // If AskUserQuestion, pause and wait for user answer
  if (isAskUserQuestion && setAnswerResolver) {
    log.info('AskUserQuestion detected, waiting for user answer', { toolUseId: block.id })
    await new Promise<void>((resolve) => {
      setAnswerResolver((answer: string) => {
        sendAnswerToProc(answer)
        resolve()
      })
    })
    log.info('User answer received, resuming stream')
  }
}

// =============================================================================
// USER EVENT HANDLER (TOOL RESULTS)
// =============================================================================

/**
 * Process user message event (tool results).
 */
export function handleUserEvent(
  event: CLIStreamEvent,
  state: StreamProcessorState,
  push: (chunk: StreamChunk) => void
): void {
  if (!event.message?.content || !Array.isArray(event.message.content)) return

  const validBlocks = event.message.content.filter(
    (b): b is NonNullable<typeof b> & { type: string; tool_use_id?: string; text?: unknown } =>
      b !== null && typeof b === 'object' && typeof (b as { type?: unknown }).type === 'string'
  )

  if (validBlocks.length > 0) {
    log.debug('Processing user message with tool_results', {
      totalBlocks: event.message.content.length,
      validBlocks: validBlocks.length,
      blockTypes: validBlocks.map((b) => b.type).join(','),
    })
  }

  for (const block of validBlocks) {
    try {
      if (block.type === 'tool_result') {
        handleToolResultBlock(block, event.session_id, state, push)
      }
    } catch (blockError) {
      log.warn('CLI stream block processing error', {
        error: String(blockError),
        blockType: block.type,
        toolUseId: block.tool_use_id,
      })
    }
  }
}

/**
 * Process a tool_result block.
 */
function handleToolResultBlock(
  block: { type: string; tool_use_id?: string; text?: unknown },
  sessionId: string | undefined,
  state: StreamProcessorState,
  push: (chunk: StreamChunk) => void
): void {
  let toolName: string | undefined
  const toolUseId = block.tool_use_id

  if (toolUseId && state.toolIdToName.has(toolUseId)) {
    toolName = state.toolIdToName.get(toolUseId)
    state.toolIdToName.delete(toolUseId)
  } else {
    toolName = state.toolNameStack.pop()
  }

  const isTaskResult = toolUseId && state.activeTasksMap.has(toolUseId)

  if (isTaskResult) {
    const taskInfo = state.activeTasksMap.get(toolUseId)!
    log.info('Task tool completed', {
      taskId: toolUseId,
      parentTaskId: taskInfo.parentTaskId,
      toolName,
      outputLength: typeof block.text === 'string' ? block.text.length : 0,
    })

    if (state.currentExecutingTaskId === toolUseId) {
      state.currentExecutingTaskId = taskInfo.parentTaskId
    }
    state.activeTasksMap.delete(toolUseId)
  } else {
    const safeOutput =
      block.text != null
        ? typeof block.text === 'string'
          ? block.text
          : JSON.stringify(block.text)
        : ''
    log.debug('Tool result emitted', {
      tool: toolName,
      toolUseId,
      outputPreview: safeOutput.slice(0, 100),
    })
  }

  const toolOutput =
    block.text != null
      ? typeof block.text === 'string'
        ? block.text
        : JSON.stringify(block.text)
      : ''

  push({
    type: 'tool_result',
    data: 'completed',
    toolOutput,
    tool: toolName,
    toolUseId,
    sessionId,
  })
}

// =============================================================================
// RESULT EVENT HANDLER
// =============================================================================

/**
 * Process result event.
 */
export function handleResultEvent(
  event: CLIStreamEvent,
  push: (chunk: StreamChunk) => void,
  getProc?: () => ReturnType<typeof Bun.spawn> | null
): void {
  log.info('CLI result event received', {
    hasResult: !!event.result,
    resultLength: event.result?.length || 0,
    costUsd: event.total_cost_usd,
  })

  const usage = event.usage
  push({
    type: 'result',
    data: event.result || '',
    sessionId: event.session_id,
    costUsd: event.total_cost_usd,
    durationMs: event.duration_ms,
    usage: usage
      ? {
          inputTokens: usage.input_tokens || 0,
          outputTokens: usage.output_tokens || 0,
          cacheCreationTokens: usage.cache_creation_input_tokens || 0,
          cacheReadTokens: usage.cache_read_input_tokens || 0,
          totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
          contextPercent:
            (((usage.input_tokens || 0) + (usage.output_tokens || 0)) / CONTEXT_WINDOW_SIZE) * 100,
        }
      : undefined,
  })

  // Close stdin to signal CLI to exit
  const currentProc = getProc?.()
  if (currentProc?.stdin && typeof currentProc.stdin !== 'number') {
    log.debug('Closing stdin after result event')
    currentProc.stdin.end()
  }
}

// =============================================================================
// CONTROL REQUEST HANDLER
// =============================================================================

/**
 * Process control request event (permission requests).
 */
export function handleControlRequestEvent(
  event: CLIStreamEvent,
  options: CLIOptions,
  getProc?: () => ReturnType<typeof Bun.spawn> | null
): void {
  const requestId = event.request_id
  const toolName = event.request?.tool_name
  const toolUseId = event.request?.tool_use_id

  log.info('Control request received - permission needed', {
    requestId,
    toolName,
    toolUseId,
    agentId: event.request?.agent_id,
    bypassPermissions: options.bypassPermissions,
  })

  if (options.bypassPermissions !== false) {
    const currentProc = getProc?.()
    if (currentProc?.stdin) {
      const permissionResponse = JSON.stringify({
        type: 'control_response',
        response: {
          subtype: 'success',
          request_id: requestId,
          response: { allowed: true },
        },
      })

      log.info('Auto-approving permission request', { requestId, toolName, toolUseId })
      if (typeof currentProc.stdin !== 'number') {
        currentProc.stdin.write(permissionResponse + '\n')
        currentProc.stdin.flush()
      }
    } else {
      log.error('Cannot send permission response - stdin not available', { requestId })
    }
  } else {
    log.warn('Permission request received but bypassPermissions is disabled - tool may hang', {
      requestId,
      toolName,
    })
  }
}
