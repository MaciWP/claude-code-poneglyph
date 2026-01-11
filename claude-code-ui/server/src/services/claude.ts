import { query, type SDKMessage, type SDKResultMessage, type SDKAssistantMessage, type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import { logger } from '../logger'
import { CONTEXT_WINDOW_SIZE } from '../constants'
import { validateWorkDir, getSafeEnvForClaude } from '../utils/security'
import type { Message, StreamChunk } from '../../../shared/types'

const log = logger.child('claude')
import { Glob } from 'bun'
import path from 'path'

async function findRulesInDir(baseDir: string): Promise<string[]> {
  const rulesDir = path.join(baseDir, '.claude', 'rules')
  const rules: string[] = []

  try {
    const glob = new Glob('**/*.md')
    for await (const file of glob.scan({ cwd: rulesDir, absolute: false })) {
      const name = file.replace(/\.md$/, '')
      rules.push(name)
    }
  } catch {
    // No rules directory or not accessible
  }

  return rules
}

export interface ExecuteOptions {
  prompt: string
  sessionId?: string
  workDir?: string
  tools?: string[]
  resume?: string
  allowFullPC?: boolean
}

export interface CLIOptions {
  prompt: string
  messages?: Message[]  // Full conversation history for context restoration
  sessionId?: string
  sessionFilePath?: string  // Path to session file for context reference
  workDir?: string
  outputFormat?: 'json' | 'stream-json' | 'text'
  continue?: boolean
  resume?: string
  allowedTools?: string[]
  images?: string[]  // Array of image file paths
  bypassPermissions?: boolean
  thinking?: boolean
  planMode?: boolean
  orchestrate?: boolean
  allowFullPC?: boolean
  abortSignal?: AbortSignal
}

export interface ExecuteResult {
  response: string
  messages: SDKMessage[]
  sessionId: string
  toolsUsed: string[]
  tokensUsed?: number
  costUsd?: number
  mode: 'sdk' | 'cli'
}

export interface CLIResult {
  response: string
  sessionId: string
  toolsUsed: string[]
  costUsd?: number
  durationMs?: number
  mode: 'cli'
}

// StreamChunk is now imported from shared/types.ts
export type { StreamChunk } from '../../../shared/types'

interface CLIStreamEvent {
  type: string
  subtype?: string
  session_id?: string

  // For init
  cwd?: string
  model?: string
  tools?: string[]

  // For assistant/message
  message?: {
    content: Array<{
      type: string
      text?: string
      name?: string
      input?: unknown
      id?: string  // tool_use_id en tool_use blocks
      tool_use_id?: string  // tool_use_id en tool_result blocks
    }>
  }

  // For tool_use
  tool_name?: string
  tool_input?: unknown
  tool_use_id?: string

  // For tool_result
  output?: string

  // For result
  result?: string
  total_cost_usd?: number
  duration_ms?: number
  is_error?: boolean
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }

  // For control_request (permission requests from subagents)
  request_id?: string
  request?: {
    subtype?: string
    tool_name?: string
    input?: Record<string, unknown>
    tool_use_id?: string
    agent_id?: string
  }
}

function isValidCLIEvent(event: unknown): event is CLIStreamEvent {
  // Validación mínima: solo verificar que es un objeto con type string
  // Los bloques individuales se validan en processEvent con try-catch
  if (!event || typeof event !== 'object') return false
  if (!('type' in event)) return false
  const eventType = (event as { type: unknown }).type
  if (typeof eventType !== 'string') return false
  return true
}

interface CLIJsonOutput {
  type?: string
  result?: string
  session_id?: string
  tool_name?: string
  cost_usd?: number
  duration_ms?: number
}

export class ClaudeService {
  async execute(options: ExecuteOptions): Promise<ExecuteResult> {
    log.debug('SDK execute start', {
      prompt: options.prompt.slice(0, 100),
      workDir: options.workDir,
      resume: options.resume
    })

    const messages: SDKMessage[] = []
    const toolsUsed: string[] = []
    let response = ''
    let sessionId = ''
    let costUsd = 0

    try {
      log.debug('SDK query calling', { cwd: options.workDir || process.cwd(), resume: options.resume })

      const queryGenerator = query({
        prompt: options.prompt,
        options: {
          cwd: validateWorkDir(options.workDir, { allowFullPC: options.allowFullPC }),
          allowedTools: options.tools,
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
          resume: options.resume,
          env: getSafeEnvForClaude(), // Ensure SDK uses safe env if it supports it (it might use process.env by default internally, but good practice if exposed)
        },
      })

      for await (const msg of queryGenerator) {
        log.debug('SDK message', { type: msg.type, sessionId: msg.session_id })
        messages.push(msg)
        sessionId = msg.session_id || sessionId

        if (msg.type === 'assistant') {
          const assistantMsg = msg as SDKAssistantMessage
          if (!Array.isArray(assistantMsg.message?.content)) continue
          for (const block of assistantMsg.message.content) {
            if (!block || typeof block !== 'object' || !('type' in block)) continue
            if (block.type === 'text') {
              response += block.text
            } else if (block.type === 'tool_use') {
              if (!toolsUsed.includes(block.name)) {
                toolsUsed.push(block.name)
              }
            }
          }
        } else if (msg.type === 'result') {
          const resultMsg = msg as SDKResultMessage
          if (resultMsg.subtype === 'success') {
            response = resultMsg.result
            costUsd = resultMsg.total_cost_usd
          }
          log.debug('SDK result', {
            subtype: resultMsg.subtype,
            result: resultMsg.subtype === 'success' ? resultMsg.result.slice(0, 100) : undefined,
            costUsd: resultMsg.total_cost_usd
          })
        }
      }

      log.info('SDK execute success', {
        responseLength: response.length,
        messagesCount: messages.length,
        toolsUsed,
        sessionId,
        costUsd
      })

      return {
        response,
        messages,
        sessionId: sessionId || crypto.randomUUID(),
        toolsUsed,
        costUsd,
        mode: 'sdk',
      }
    } catch (error) {
      log.error('SDK execute error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      throw new Error(`Claude SDK execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async executeCLI(options: CLIOptions): Promise<CLIResult> {
    log.debug('CLI execute start', {
      prompt: options.prompt.slice(0, 100),
      workDir: options.workDir,
      resume: options.resume,
      outputFormat: options.outputFormat
    })

    const args: string[] = [
      'claude',
      '-p', options.prompt,
      '--output-format', options.outputFormat || 'json',
      '--dangerously-skip-permissions'
    ]

    if (options.resume) {
      args.push('--resume', options.resume)
    }
    if (options.continue) {
      args.push('--continue')
    }
    if (options.allowedTools && options.allowedTools.length > 0) {
      args.push('--allowedTools', options.allowedTools.join(','))
    }

    log.debug('CLI spawn', { args, cwd: options.workDir || process.cwd() })

    const proc = Bun.spawn(args, {
      cwd: validateWorkDir(options.workDir, { allowFullPC: options.allowFullPC }),
      stdout: 'pipe',
      stderr: 'pipe',
      env: getSafeEnvForClaude(),
    })

    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    const exitCode = await proc.exited

    log.debug('CLI close', { exitCode, stdoutLength: stdout.length, stderrLength: stderr.length })

    if (exitCode === 0) {
      try {
        const result = this.parseCLIOutput(stdout, options.outputFormat || 'json')
        log.info('CLI execute success', {
          responseLength: result.response.length,
          sessionId: result.sessionId,
          toolsUsed: result.toolsUsed
        })
        return result
      } catch (parseError) {
        log.warn('CLI parse error', { error: parseError instanceof Error ? parseError.message : String(parseError) })
        return {
          response: stdout,
          sessionId: options.sessionId || crypto.randomUUID(),
          toolsUsed: [],
          mode: 'cli',
        }
      }
    } else {
      log.error('CLI execute failed', { exitCode, stderr })
      throw new Error(stderr || `Claude CLI exited with code: ${exitCode}`)
    }
  }

  private parseCLIOutput(output: string, format: string): CLIResult {
    if (format === 'json') {
      const lines = output.trim().split('\n')
      let response = ''
      let sessionId = ''
      const toolsUsed: string[] = []
      let costUsd: number | undefined
      let durationMs: number | undefined

      for (const line of lines) {
        try {
          const parsed: CLIJsonOutput = JSON.parse(line)

          if (parsed.type === 'result' && parsed.result) {
            response = parsed.result
          }
          if (parsed.session_id) {
            sessionId = parsed.session_id
          }
          if (parsed.type === 'tool_use' && parsed.tool_name) {
            if (!toolsUsed.includes(parsed.tool_name)) {
              toolsUsed.push(parsed.tool_name)
            }
          }
          if (parsed.cost_usd !== undefined) {
            costUsd = parsed.cost_usd
          }
          if (parsed.duration_ms !== undefined) {
            durationMs = parsed.duration_ms
          }
        } catch {
          if (!response && line.trim()) {
            response += line + '\n'
          }
        }
      }

      return {
        response: response.trim(),
        sessionId: sessionId || crypto.randomUUID(),
        toolsUsed,
        costUsd,
        durationMs,
        mode: 'cli',
      }
    }

    return {
      response: output.trim(),
      sessionId: crypto.randomUUID(),
      toolsUsed: [],
      mode: 'cli',
    }
  }

  async *streamCLI(options: CLIOptions): AsyncGenerator<StreamChunk> {
    const { stream } = this.streamCLIWithAbort(options)
    yield* stream
  }

  streamCLIWithAbort(options: CLIOptions): {
    stream: AsyncGenerator<StreamChunk>
    abort: () => void
    sendUserAnswer: (answer: string) => void
  } {
    let proc: ReturnType<typeof Bun.spawn> | null = null
    let aborted = false
    let pendingAnswerResolver: ((answer: string) => void) | null = null

    const abort = () => {
      log.info('abort() called', { alreadyAborted: aborted, hasProc: !!proc })
      if (aborted) {
        log.debug('Already aborted, skipping')
        return
      }
      aborted = true
      if (proc) {
        const pid = proc.pid
        log.info('Killing CLI process with SIGTERM', { pid })
        try {
          proc.kill('SIGTERM')
          log.info('SIGTERM sent successfully', { pid })
        } catch (e) {
          log.warn('SIGTERM failed', { pid, error: String(e) })
        }
        setTimeout(() => {
          log.info('Sending SIGKILL after timeout', { pid })
          try {
            if (process.platform === 'win32') {
              Bun.spawn(['taskkill', '/F', '/PID', String(pid)])
            } else {
              Bun.spawn(['kill', '-9', String(pid)])
            }
            log.info('SIGKILL sent', { pid })
          } catch (e) {
            log.debug('SIGKILL failed (process may be dead)', { pid, error: String(e) })
          }
        }, 500)
      } else {
        log.warn('No process to abort (proc is null)')
      }
    }

    const sendUserAnswer = (answer: string) => {
      log.info('sendUserAnswer called', { answer: answer.slice(0, 50), hasResolver: !!pendingAnswerResolver })
      if (pendingAnswerResolver) {
        pendingAnswerResolver(answer)
        pendingAnswerResolver = null
      }
    }

    const self = this
    async function* generator(): AsyncGenerator<StreamChunk> {
      yield* self.streamCLIInternal(
        options,
        (p) => { proc = p },
        () => aborted,
        (resolver) => { pendingAnswerResolver = resolver },
        () => proc
      )
    }

    return { stream: generator(), abort, sendUserAnswer }
  }

  private async *streamCLIInternal(
    options: CLIOptions,
    setProc: (p: ReturnType<typeof Bun.spawn>) => void,
    isAborted: () => boolean,
    setAnswerResolver?: (resolver: (answer: string) => void) => void,
    getProc?: () => ReturnType<typeof Bun.spawn> | null
  ): AsyncGenerator<StreamChunk> {
    const toolIdToName = new Map<string, string>()
    const toolNameStack: string[] = []
    // Map: toolUseId -> { parentTaskId, startTime } for better correlation
    const activeTasksMap = new Map<string, { parentTaskId: string | undefined, startTime: number }>()
    // Track the "current executing context" - the Task that most recently started a tool
    let currentExecutingTaskId: string | undefined
    const hasImages = options.images && options.images.length > 0

    let promptToSend = options.prompt

    // Siempre incluir contexto de sesión si está disponible
    if (options.sessionId && options.messages && options.messages.length > 0) {
      const lastMessages = options.messages.slice(-5)
      const briefContext = lastMessages
        .map(msg => `- ${msg.role}: ${msg.content.slice(0, 100)}${msg.content.length > 100 ? '...' : ''}`)
        .join('\n')

      promptToSend = `[Session Context]
Conversation history is maintained - you can reference previous context.
${lastMessages.length > 0 ? `Last ${lastMessages.length} exchanges:\n${briefContext}` : 'Starting new conversation'}

---
Current request: ${options.prompt}`

      log.info('Including session reference', {
        sessionId: options.sessionId,
        lastMessagesCount: lastMessages.length,
        hasResume: !!options.resume
      })
    } else if (options.messages && options.messages.length > 0 && !options.resume) {
      // Fallback: incluir historial completo si no hay sessionFilePath
      const historyContext = options.messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n')
      promptToSend = `Previous conversation:\n\n${historyContext}\n\n---\n\nUser: ${options.prompt}`
      log.info('Including conversation history (fallback)', {
        messageCount: options.messages.length,
        hasResume: !!options.resume
      })
    }

    const args: string[] = [
      'claude',
      '--output-format', 'stream-json',
      '--verbose',
      '--input-format', 'stream-json',  // ALWAYS use stream-json for stdin
    ]

    if (options.planMode) {
      args.push('--permission-mode', 'plan')
    } else if (options.bypassPermissions !== false) {
      args.push('--dangerously-skip-permissions')
    }

    if (options.resume) {
      args.push('--resume', options.resume)
    }
    if (options.continue) {
      args.push('--continue')
    }

    log.debug('CLI stream start', {
      args,
      cwd: options.workDir || process.cwd(),
      imageCount: options.images?.length || 0,
      hasImages,
      modes: { bypassPermissions: options.bypassPermissions, thinking: options.thinking, planMode: options.planMode, orchestrate: options.orchestrate }
    })

    const proc = Bun.spawn(args, {
      cwd: validateWorkDir(options.workDir, { allowFullPC: options.allowFullPC }),
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: 'pipe',  // ALWAYS use stdin pipe for AskUserQuestion support
      env: getSafeEnvForClaude(),
    })

    setProc(proc)
    log.debug('CLI stream spawned', { pid: proc.pid })

    // Always send initial prompt via stdin (required for stream-json input format)
    if (proc.stdin) {
      const content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [
        { type: 'text', text: promptToSend }
      ]

      // Add images if present
      if (hasImages && options.images) {
        for (const imagePath of options.images) {
          try {
            const imageData = await Bun.file(imagePath).arrayBuffer()
            const base64 = Buffer.from(imageData).toString('base64')
            const ext = imagePath.split('.').pop()?.toLowerCase() || 'png'
            const mediaType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`

            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64
              }
            })
            log.info('CLI stream image added', { path: imagePath, mediaType, base64Length: base64.length, contentItems: content.length })
          } catch (e) {
            log.warn('CLI stream image error', { path: imagePath, error: String(e) })
          }
        }
      }

      const message = JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content
        }
      })

      log.debug('CLI stream stdin message', { messageLength: message.length })
      proc.stdin.write(message + '\n')
      proc.stdin.flush()
      // NOTE: Do NOT close stdin here - keep it open for AskUserQuestion responses
    }

    // Async Queue Logic
    const queue: StreamChunk[] = []
    let resolveSignal: (() => void) | null = null
    let activeStreams = 2 // stdout + stderr

    const push = (chunk: StreamChunk) => {
      queue.push(chunk)
      if (resolveSignal) {
        resolveSignal()
        resolveSignal = null
      }
    }

    // Helper to send user answer via stdin
    const sendAnswerToProc = (answer: string) => {
      const currentProc = getProc?.()
      if (currentProc?.stdin) {
        const answerMessage = JSON.stringify({
          type: 'user',
          message: {
            role: 'user',
            content: [{ type: 'text', text: answer }]
          }
        })
        log.info('Sending user answer to stdin', { answerLength: answer.length })
        if (typeof currentProc.stdin !== 'number') {
          currentProc.stdin.write(answerMessage + '\n')
          currentProc.stdin.flush()
        }
      }
    }

    const processEvent = async (event: CLIStreamEvent) => {
      if (event.type === 'system' && event.subtype === 'init') {
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
      } else if (event.type === 'assistant') {
        if (event.message?.content && Array.isArray(event.message.content)) {
          for (const block of event.message.content) {
            if (!block || typeof block !== 'object' || !('type' in block)) continue
            if (block.type === 'text' && block.text) {
              push({ type: 'text', data: block.text, sessionId: event.session_id })
            } else if (block.type === 'thinking' && block.text) {
              push({ type: 'thinking', data: block.text, sessionId: event.session_id })
            } else if (block.type === 'tool_use' && block.name) {
              if (block.id) {
                toolIdToName.set(block.id, block.name)
              } else {
                toolNameStack.push(block.name)
              }

              // Track Task tools for parent correlation
              const isTask = block.name === 'Task'
              if (isTask && block.id) {
                // Register this Task in the active map
                activeTasksMap.set(block.id, {
                  parentTaskId: currentExecutingTaskId,  // Nested Tasks track their parent
                  startTime: Date.now()
                })
                // This Task becomes the current executing context
                currentExecutingTaskId = block.id
                log.debug('Task registered', { taskId: block.id, parentTaskId: activeTasksMap.get(block.id)?.parentTaskId, totalActiveTasks: activeTasksMap.size })
              }

              // Determine parentToolUseId for non-Task tools
              // Use currentExecutingTaskId - this is "best effort" for parallel agents
              // Frontend will suppress agent tools from main chat regardless of accuracy
              const parentToolUseId = !isTask ? currentExecutingTaskId : undefined

              // Check if this is AskUserQuestion - needs to wait for user response
              const isAskUserQuestion = block.name === 'AskUserQuestion'

              // Log Task tools with subagent_type for debugging
              if (isTask) {
                const taskInput = block.input as { subagent_type?: string; prompt?: string }
                log.info('Task tool emitted', {
                  toolUseId: block.id,
                  parentToolUseId,
                  subagent_type: taskInput?.subagent_type || 'MISSING',
                  promptPreview: (taskInput?.prompt || '').slice(0, 50)
                })
              } else {
                log.debug('Tool use emitted', {
                  tool: block.name,
                  toolUseId: block.id,
                  parentToolUseId,
                  inputPreview: JSON.stringify(block.input).slice(0, 100)
                })
              }

              push({
                type: 'tool_use',
                data: block.name,
                tool: block.name,
                toolInput: block.input,
                toolUseId: block.id,
                parentToolUseId,
                sessionId: event.session_id,
                waitingForAnswer: isAskUserQuestion
              })

              // If AskUserQuestion, pause and wait for user answer
              if (isAskUserQuestion && setAnswerResolver) {
                log.info('AskUserQuestion detected, waiting for user answer', { toolUseId: block.id })

                // Set up resolver that will be called when user sends answer
                await new Promise<void>((resolve) => {
                  setAnswerResolver((answer: string) => {
                    sendAnswerToProc(answer)
                    resolve()
                  })
                })
                log.info('User answer received, resuming stream')
              }
            }
          }
        }
      } else if (event.type === 'user' && event.message?.content && Array.isArray(event.message.content)) {
        // Validar estructura del mensaje user antes de procesar
        const validBlocks = event.message.content.filter(
          (b): b is NonNullable<typeof b> & { type: string; tool_use_id?: string; text?: unknown } =>
            b !== null && typeof b === 'object' && typeof (b as { type?: unknown }).type === 'string'
        )

        if (validBlocks.length > 0) {
          log.debug('Processing user message with tool_results', {
            totalBlocks: event.message.content.length,
            validBlocks: validBlocks.length,
            blockTypes: validBlocks.map(b => b.type).join(',')
          })
        }

        for (const block of validBlocks) {
          try {
            if (block.type === 'tool_result') {
              let toolName: string | undefined
              const toolUseId = block.tool_use_id

              if (toolUseId && toolIdToName.has(toolUseId)) {
                toolName = toolIdToName.get(toolUseId)
                toolIdToName.delete(toolUseId)
              } else {
                toolName = toolNameStack.pop()
              }

              // Check if this is a Task tool_result
              const isTaskResult = toolUseId && activeTasksMap.has(toolUseId)

              // When a Task completes, restore parent context
              if (isTaskResult) {
                const taskInfo = activeTasksMap.get(toolUseId)!
                log.info('Task tool completed', {
                  taskId: toolUseId,
                  parentTaskId: taskInfo.parentTaskId,
                  toolName,
                  outputLength: (typeof block.text === 'string' ? block.text.length : 0)
                })

                // Restore executing context to parent Task (if any)
                if (currentExecutingTaskId === toolUseId) {
                  currentExecutingTaskId = taskInfo.parentTaskId
                }

                // Clean up
                activeTasksMap.delete(toolUseId)
              } else {
                // Safe extraction - block.text can be undefined
                const safeOutput = block.text != null
                  ? (typeof block.text === 'string' ? block.text : JSON.stringify(block.text))
                  : ''
                log.debug('Tool result emitted', {
                  tool: toolName,
                  toolUseId,
                  outputPreview: safeOutput.slice(0, 100)
                })
              }

              // Safe extraction for push - block.text can be undefined
              const toolOutput = block.text != null
                ? (typeof block.text === 'string' ? block.text : JSON.stringify(block.text))
                : ''

              push({
                type: 'tool_result',
                data: 'completed',
                toolOutput,
                tool: toolName,
                toolUseId,
                sessionId: event.session_id
              })
            }
          } catch (blockError) {
            log.warn('CLI stream block processing error', {
              error: String(blockError),
              blockType: block.type,
              toolUseId: block.tool_use_id
            })
          }
        }
      } else if (event.type === 'result') {
        log.info('CLI result event received', {
          hasResult: !!event.result,
          resultLength: event.result?.length || 0,
          costUsd: event.total_cost_usd
        })

        const usage = event.usage
        push({
          type: 'result',
          data: event.result || '',
          sessionId: event.session_id,
          costUsd: event.total_cost_usd,
          durationMs: event.duration_ms,
          usage: usage ? {
            inputTokens: usage.input_tokens || 0,
            outputTokens: usage.output_tokens || 0,
            cacheCreationTokens: usage.cache_creation_input_tokens || 0,
            cacheReadTokens: usage.cache_read_input_tokens || 0,
            totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
            contextPercent: (((usage.input_tokens || 0) + (usage.output_tokens || 0)) / CONTEXT_WINDOW_SIZE) * 100
          } : undefined
        })

        // Close stdin to signal CLI to exit (it's waiting for more input in stream-json mode)
        const currentProc = getProc?.()
        if (currentProc?.stdin && typeof currentProc.stdin !== 'number') {
          log.debug('Closing stdin after result event')
          currentProc.stdin.end()
        }
      } else if (event.type === 'control_request' && event.request?.subtype === 'can_use_tool') {
        // Permission request from CLI/subagent - auto-approve when bypassPermissions is enabled
        const requestId = event.request_id
        const toolName = event.request.tool_name
        const toolUseId = event.request.tool_use_id

        log.info('Control request received - permission needed', {
          requestId,
          toolName,
          toolUseId,
          agentId: event.request.agent_id,
          bypassPermissions: options.bypassPermissions
        })

        // Auto-approve permissions when bypassPermissions is enabled (default)
        if (options.bypassPermissions !== false) {
          const currentProc = getProc?.()
          if (currentProc?.stdin) {
            const permissionResponse = JSON.stringify({
              type: 'control_response',
              response: {
                subtype: 'success',
                request_id: requestId,
                response: { allowed: true }
              }
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
            toolName
          })
        }
      }
    }

    const streamReader = async (stream: ReadableStream, isStderr: boolean) => {
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          if (isAborted()) {
            reader.cancel()
            break
          }
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })

          if (isStderr) {
            if (chunk.trim()) {
              log.warn('CLI stderr', { text: chunk })
              // We could allow yielding stderr as text/error if needed, 
              // but for now just logging ensures we don't miss issues.
            }
          } else {
            // NDJSON Parser robusto con re-acumulación para JSON truncado
            buffer += chunk

            let newlineIdx: number
            while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, newlineIdx)
              buffer = buffer.slice(newlineIdx + 1)

              if (!line.trim()) continue

              try {
                const event: CLIStreamEvent = JSON.parse(line)
                // Validación estructural antes de procesar
                if (isValidCLIEvent(event)) {
                  log.debug('CLI stream event', { type: event.type, subtype: event.subtype })
                  await processEvent(event)
                } else {
                  log.warn('CLI stream invalid event structure', { type: (event as { type?: string }).type })
                }
              } catch (e) {
                // Si es JSON incompleto (truncado por SyntaxError), re-acumular
                if (e instanceof SyntaxError) {
                  // Re-agregar la línea al buffer SIN newline extra
                  // El próximo chunk se concatenará y esperamos completar el JSON
                  buffer = line + buffer
                  log.debug('CLI stream JSON incomplete, re-accumulating', {
                    lineLength: line.length,
                    errorMsg: e.message.slice(0, 50)
                  })
                  break
                }
                // TypeError u otros errores en processEvent - log y continuar
                log.warn('CLI stream processing error', {
                  eventType: 'unknown',
                  error: String(e).slice(0, 100),
                  linePreview: line.slice(0, 80)
                })
              }
            }
          }
        }

        // Process remaining buffer (stdout only)
        if (!isStderr && buffer.trim()) {
          try {
            const event: CLIStreamEvent = JSON.parse(buffer)
            await processEvent(event)
          } catch {
            log.debug('Failed to parse remaining buffer as JSON', { buffer: buffer.slice(0, 100) })
          }
        }

      } catch (error) {
        log.error(`CLI stream error (${isStderr ? 'stderr' : 'stdout'})`, { error: String(error) })
        push({ type: 'error', data: String(error) })
      } finally {
        activeStreams--
        if (resolveSignal) resolveSignal()
      }
    }

    // Start readers
    streamReader(proc.stdout, false)
    streamReader(proc.stderr, true)

    // Generator Loop
    while (activeStreams > 0 || queue.length > 0) {
      if (queue.length > 0) {
        yield queue.shift()!
      } else {
        await new Promise<void>(resolve => {
          resolveSignal = resolve
          // Safety check: if queue populated while setting up promise
          if (activeStreams === 0 && queue.length === 0) resolve()
          if (queue.length > 0) resolve()
        })
      }
    }

    log.debug('CLI stream loop finished')
    yield { type: 'done', data: '' }
  }

  async *stream(options: ExecuteOptions): AsyncGenerator<StreamChunk> {
    log.debug('SDK stream start', { prompt: options.prompt.slice(0, 100), resume: options.resume })
    const toolNameStack: string[] = []  // Stack para asociar tool_use con tool_result (soporta anidamiento)

    try {
      const queryGenerator = query({
        prompt: options.prompt,
        options: {
          cwd: validateWorkDir(options.workDir, { allowFullPC: options.allowFullPC }),
          allowedTools: options.tools,
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
          includePartialMessages: true,
          resume: options.resume,
          env: getSafeEnvForClaude(),
        },
      })

      for await (const msg of queryGenerator) {
        log.debug('SDK stream message', { type: msg.type })

        if (msg.type === 'system') {
          yield {
            type: 'init',
            data: '',
            sessionId: msg.session_id
          }
        } else if (msg.type === 'stream_event') {
          // Handle streaming events (partial messages)
          const streamMsg = msg as { type: 'stream_event'; session_id: string; event: { type: string; delta?: { type: string; text?: string } } }
          if (streamMsg.event?.type === 'content_block_delta' && streamMsg.event.delta?.type === 'text_delta') {
            yield {
              type: 'text',
              data: streamMsg.event.delta.text || '',
              sessionId: msg.session_id
            }
          } else if (streamMsg.event?.type === 'content_block_delta' && streamMsg.event.delta?.type === 'thinking_delta') {
            yield {
              type: 'thinking',
              data: (streamMsg.event.delta as { text?: string }).text || '',
              sessionId: msg.session_id
            }
          }
        } else if (msg.type === 'assistant') {
          const assistantMsg = msg as SDKAssistantMessage
          if (!Array.isArray(assistantMsg.message?.content)) continue
          for (const block of assistantMsg.message.content) {
            if (!block || typeof block !== 'object' || !('type' in block)) continue
            if (block.type === 'text') {
              // Skip - already handled by stream_event
            } else if (block.type === 'thinking') {
              // Skip - already handled by stream_event
            } else if (block.type === 'tool_use') {
              toolNameStack.push(block.name)  // Push para matching con tool_result
              yield {
                type: 'tool_use',
                data: block.name,
                tool: block.name,
                toolInput: block.input,
                sessionId: msg.session_id
              }
            }
          }
        } else if (msg.type === 'user') {
          // Tool results come as user messages
          const userMsg = msg as SDKUserMessage
          if (userMsg.message?.content && Array.isArray(userMsg.message.content)) {
            for (const block of userMsg.message.content) {
              if (!block || typeof block !== 'object' || !('type' in block)) continue
              if (block.type === 'tool_result') {
                yield {
                  type: 'tool_result',
                  data: 'completed',
                  toolOutput: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
                  tool: toolNameStack.pop() || undefined,  // Pop para matching con tool_use
                  sessionId: msg.session_id
                }
                // Stack se auto-vacía con pop()
              }
            }
          }
        } else if (msg.type === 'result') {
          const resultMsg = msg as SDKResultMessage
          yield {
            type: 'result',
            data: resultMsg.subtype === 'success' ? resultMsg.result : '',
            sessionId: msg.session_id,
            costUsd: resultMsg.total_cost_usd,
            durationMs: resultMsg.duration_ms
          }
        }
      }

      yield { type: 'done', data: '' }
    } catch (error) {
      log.error('SDK stream error', { error: error instanceof Error ? error.message : String(error) })
      yield {
        type: 'error',
        data: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
