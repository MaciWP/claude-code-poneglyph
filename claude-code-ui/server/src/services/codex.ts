import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { logger } from '../logger'
import { validateWorkDir, getSafeEnvForCodex } from '../utils/security'
import type { Message } from '../../../shared/types'
import type { CLIOptions, CLIResult, StreamChunk } from './claude'

const log = logger.child('codex')

const DEFAULT_SANDBOX = 'workspace-write'

interface CodexStreamEvent {
  type?: string
  event?: string
  thread_id?: string
  message?: {
    content?: Array<{
      type?: string
      text?: string
      name?: string
      input?: unknown
      id?: string
      tool_use_id?: string
      output?: string
    }>
  }
  content?: unknown
  delta?: string
  text?: string
  data?: string
  error?: string
  result?: string
  output?: string
  tool_name?: string
  tool?: string
  tool_input?: unknown
  tool_use_id?: string
  session_id?: string
  conversation_id?: string
  total_cost_usd?: number
  duration_ms?: number
  usage?: {
    input_tokens?: number
    cached_input_tokens?: number
    output_tokens?: number
  }
  item?: {
    id?: string
    type?: string
    text?: string
    name?: string
    input?: unknown
    output?: string
    tool_name?: string
    tool_input?: unknown
    tool_output?: string
    tool_use_id?: string
  }
}

function buildPromptWithHistory(prompt: string, messages?: Message[]): string {
  if (!messages || messages.length === 0) return prompt
  const historyContext = messages
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n')
  return `Previous conversation:\n\n${historyContext}\n\n---\n\nUser: ${prompt}`
}

function findCodexHome(startDir: string): string | undefined {
  let current = startDir
  while (true) {
    const candidate = resolve(current, '.codex')
    if (existsSync(candidate)) return candidate
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return undefined
}

function extractSessionId(event: CodexStreamEvent): string | undefined {
  return event.session_id || event.conversation_id || event.thread_id
}

export class CodexService {
  async executeCLI(options: CLIOptions): Promise<CLIResult> {
    const toolsUsed = new Set<string>()
    let sessionId = options.sessionId || crypto.randomUUID()
    let response = ''
    let costUsd: number | undefined
    let durationMs: number | undefined

    for await (const chunk of this.streamCLI(options)) {
      if (chunk.sessionId) sessionId = chunk.sessionId
      if (chunk.type === 'tool_use' && chunk.tool) toolsUsed.add(chunk.tool)
      if (chunk.type === 'text') response += chunk.data
      if (chunk.type === 'result') {
        response = chunk.data || response
        costUsd = chunk.costUsd
        durationMs = chunk.durationMs
      }
    }

    return {
      response: response.trim(),
      sessionId,
      toolsUsed: Array.from(toolsUsed),
      costUsd,
      durationMs,
      mode: 'cli',
    }
  }

  async *streamCLI(options: CLIOptions): AsyncGenerator<StreamChunk> {
    const { stream } = this.streamCLIWithAbort(options)
    yield* stream
  }

  streamCLIWithAbort(options: CLIOptions): { stream: AsyncGenerator<StreamChunk>; abort: () => void } {
    let proc: ReturnType<typeof Bun.spawn> | null = null
    let aborted = false

    const abort = () => {
      if (aborted) return
      aborted = true
      if (proc) {
        const pid = proc.pid
        try {
          proc.kill('SIGTERM')
        } catch (e) {
          log.warn('SIGTERM failed', { pid, error: String(e) })
        }
        setTimeout(() => {
          try {
            if (process.platform === 'win32') {
              Bun.spawn(['taskkill', '/F', '/PID', String(pid)])
            } else {
              Bun.spawn(['kill', '-9', String(pid)])
            }
          } catch (e) {
            log.debug('SIGKILL failed', { pid, error: String(e) })
          }
        }, 500)
      }
    }

    const self = this
    async function* generator(): AsyncGenerator<StreamChunk> {
      yield* self.streamCLIInternal(options, (p) => { proc = p }, () => aborted)
    }

    return { stream: generator(), abort }
  }

  private async *streamCLIInternal(
    options: CLIOptions,
    setProc: (p: ReturnType<typeof Bun.spawn>) => void,
    isAborted: () => boolean
  ): AsyncGenerator<StreamChunk> {
    const toolIdToName = new Map<string, string>()
    const toolNameStack: string[] = []

    const workDir = validateWorkDir(options.workDir)
    const promptToSend = buildPromptWithHistory(options.prompt, options.messages)
    const codexHome = findCodexHome(workDir)

    const args: string[] = [
      'codex',
      'exec',
      '--json',
      '--full-auto',
      '--sandbox', DEFAULT_SANDBOX,
      '--profile', 'dev',
      '--skip-git-repo-check',
      '--cd', workDir,
      promptToSend
    ]

    if (options.images && options.images.length > 0) {
      args.splice(3, 0, ...options.images.flatMap(img => ['--image', img]))
    }

    log.debug('Codex CLI stream start', {
      argsPreview: args.slice(0, 8),
      cwd: workDir,
      imageCount: options.images?.length || 0
    })

    const proc = Bun.spawn(args, {
      cwd: workDir,
      stdout: 'pipe',
      stderr: 'pipe',
      env: getSafeEnvForCodex(codexHome),
    })

    setProc(proc)

    const queue: StreamChunk[] = []
    let resolveSignal: (() => void) | null = null
    let activeStreams = 2

    const push = (chunk: StreamChunk) => {
      queue.push(chunk)
      if (resolveSignal) {
        resolveSignal()
        resolveSignal = null
      }
    }

    const pushText = (text: string, sessionId?: string) => {
      if (!text) return
      push({ type: 'text', data: text, sessionId })
    }

    const processEvent = async (event: CodexStreamEvent) => {
      const sessionId = extractSessionId(event)
      const eventType = event.type || event.event || ''

      if (eventType === 'thread.started') {
        push({ type: 'init', data: '', sessionId })
        return
      }

      if (eventType === 'item.completed' && event.item) {
        const itemType = event.item.type || ''
        const itemText = event.item.text
        if (typeof itemText === 'string') {
          if (itemType === 'reasoning') {
            push({ type: 'thinking', data: itemText, sessionId })
          } else {
            pushText(itemText, sessionId)
          }
        }

        if (itemType === 'tool_call' || itemType === 'tool_use') {
          const name = event.item.name || event.item.tool_name
          if (name) {
            push({
              type: 'tool_use',
              data: name,
              tool: name,
              toolInput: event.item.input ?? event.item.tool_input,
              toolUseId: event.item.tool_use_id,
              sessionId
            })
          }
        }

        if (itemType === 'tool_result') {
          const toolName = event.item.name || event.item.tool_name
          push({
            type: 'tool_result',
            data: 'completed',
            toolOutput: event.item.output || event.item.tool_output || '',
            tool: toolName,
            toolUseId: event.item.tool_use_id,
            sessionId
          })
        }
        return
      }

      if (event.error) {
        push({ type: 'error', data: event.error })
        return
      }

      if (eventType.includes('delta') && typeof event.delta === 'string') {
        pushText(event.delta, sessionId)
        return
      }

      if (eventType.includes('output_text') && typeof event.text === 'string') {
        pushText(event.text, sessionId)
        return
      }

      if (typeof event.text === 'string') {
        pushText(event.text, sessionId)
        return
      }

      if (typeof event.data === 'string') {
        pushText(event.data, sessionId)
        return
      }

      const contentBlocks = event.message?.content
      if (Array.isArray(contentBlocks)) {
        for (const block of contentBlocks) {
          if (block.type === 'text' && block.text) {
            pushText(block.text, sessionId)
          } else if (block.type === 'thinking' && block.text) {
            push({ type: 'thinking', data: block.text, sessionId })
          } else if ((block.type === 'tool_use' || block.type === 'tool_call') && block.name) {
            if (block.id) {
              toolIdToName.set(block.id, block.name)
            } else {
              toolNameStack.push(block.name)
            }
            push({
              type: 'tool_use',
              data: block.name,
              tool: block.name,
              toolInput: block.input,
              toolUseId: block.id,
              sessionId
            })
          } else if (block.type === 'tool_result') {
            let toolName: string | undefined
            const toolUseId = block.tool_use_id
            if (toolUseId && toolIdToName.has(toolUseId)) {
              toolName = toolIdToName.get(toolUseId)
              toolIdToName.delete(toolUseId)
            } else {
              toolName = toolNameStack.pop()
            }
            push({
              type: 'tool_result',
              data: 'completed',
              toolOutput: typeof block.output === 'string' ? block.output : (block.text || ''),
              tool: toolName,
              toolUseId,
              sessionId
            })
          }
        }
        return
      }

      if (event.tool_name || event.tool) {
        const name = event.tool_name || event.tool
        if (name) {
          push({
            type: 'tool_use',
            data: name,
            tool: name,
            toolInput: event.tool_input,
            toolUseId: event.tool_use_id,
            sessionId
          })
          return
        }
      }

      if (event.result || event.output) {
        push({
          type: 'result',
          data: event.result || event.output || '',
          sessionId,
          costUsd: event.total_cost_usd,
          durationMs: event.duration_ms
        })
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
              log.warn('Codex CLI stderr', { text: chunk })
            }
          } else {
            buffer += chunk
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.trim()) continue
              try {
                const event: CodexStreamEvent = JSON.parse(line)
                await processEvent(event)
              } catch {
                pushText(line)
              }
            }
          }
        }

        if (!isStderr && buffer.trim()) {
          try {
            const event: CodexStreamEvent = JSON.parse(buffer)
            await processEvent(event)
          } catch {
            pushText(buffer)
          }
        }
      } catch (error) {
        log.error(`Codex CLI stream error (${isStderr ? 'stderr' : 'stdout'})`, { error: String(error) })
        push({ type: 'error', data: String(error) })
      } finally {
        activeStreams--
        if (resolveSignal) resolveSignal()
      }
    }

    streamReader(proc.stdout, false)
    streamReader(proc.stderr, true)

    while (activeStreams > 0 || queue.length > 0) {
      if (queue.length > 0) {
        yield queue.shift()!
      } else {
        await new Promise<void>(resolve => {
          resolveSignal = resolve
          if (activeStreams === 0 && queue.length === 0) resolve()
          if (queue.length > 0) resolve()
        })
      }
    }

    yield { type: 'done', data: '' }
  }
}
